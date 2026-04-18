import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractFullBody } from "./extract-full-body.mjs";
import { extractCoreFields } from "./extract-core-fields.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultOutputRoot = path.resolve(__dirname, "../../data/offline-exports");

const HIT_WEIGHTS = {
  subject: 5,
  creatorId: 5,
  from: 4,
  to: 3,
  platform: 3,
  fullBody: 1,
};

function csvEscape(value) {
  const raw = value == null ? "" : String(value);
  if (!/[",\n]/.test(raw)) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
}

function formatPrice(quotedPrice) {
  if (!quotedPrice) return "";
  return `${quotedPrice.currency || ""} ${quotedPrice.amount ?? ""}`.trim();
}

function normalizeKeyword(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeSubject(value) {
  return String(value || "")
    .replace(/^(re|fw|fwd)\s*:\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function extractReferenceRoot(parsedBody) {
  const references = String(parsedBody.references || "");
  const matches = references.match(/<[^>]+>/g);
  if (matches?.length) return matches[0].toLowerCase();
  if (parsedBody.inReplyTo) return String(parsedBody.inReplyTo).toLowerCase();
  if (parsedBody.messageId) return String(parsedBody.messageId).toLowerCase();
  return null;
}

function collectKeywordHits({ parsedBody, extractedFields, keywords }) {
  if (!keywords.length) {
    return { matched: true, matchedKeywords: [], hitLocations: [], hitScore: 0 };
  }

  const fields = [
    { name: "subject", value: parsedBody.subject || "" },
    { name: "from", value: parsedBody.from || "" },
    { name: "to", value: parsedBody.to || "" },
    { name: "fullBody", value: parsedBody.fullBody || "" },
    { name: "creatorId", value: extractedFields.creatorId || "" },
    { name: "platform", value: extractedFields.platform || "" },
  ];

  const matchedKeywords = new Set();
  const hitLocations = new Set();

  for (const keyword of keywords) {
    for (const field of fields) {
      if (field.value.toLowerCase().includes(keyword)) {
        matchedKeywords.add(keyword);
        hitLocations.add(field.name);
      }
    }
  }

  const locations = [...hitLocations];
  const hitScore = locations.reduce((score, location) => score + (HIT_WEIGHTS[location] || 1), 0) + matchedKeywords.size * 2;

  return {
    matched: matchedKeywords.size > 0,
    matchedKeywords: [...matchedKeywords].sort(),
    hitLocations: locations,
    hitScore,
  };
}

function buildConversationKey(item) {
  const referenceRoot = extractReferenceRoot(item.parsedBody);
  if (referenceRoot) {
    return `ref:${referenceRoot}`;
  }

  const keywordPart = item.matchedKeywords.join("|") || "all";
  const creatorPart = item.creatorId || item.parsedBody.from || "unknown";
  const subjectPart = normalizeSubject(item.subject || "");
  return `fallback:${keywordPart}::${creatorPart.toLowerCase()}::${subjectPart}`;
}

function buildThreadContext(messages) {
  const ordered = [...messages].sort((a, b) => {
    const left = a.latestReplyAt || "";
    const right = b.latestReplyAt || "";
    return left.localeCompare(right);
  });

  const timeline = ordered.map((item) => ({
    fileName: item.fileName,
    latestReplyAt: item.latestReplyAt,
    subject: item.subject,
    creatorId: item.creatorId,
    platform: item.platform,
    quotedPrice: item.quotedPrice,
    stage: item.stage,
    intent: item.intent,
    summary: item.summary,
    hitScore: item.hitScore,
  }));

  const mergedContext = ordered
    .map((item, index) => {
      return [
        `[message ${index + 1}]`,
        item.latestReplyAt ? `date: ${item.latestReplyAt}` : null,
        item.subject ? `subject: ${item.subject}` : null,
        item.creatorId ? `creator: ${item.creatorId}` : null,
        item.platform ? `platform: ${item.platform}` : null,
        item.intent ? `intent: ${item.intent}` : null,
        item.summary ? `summary: ${item.summary}` : item.snippet ? `snippet: ${item.snippet}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");

  return {
    timeline,
    mergedContext,
  };
}

function chooseCurrentStatus(group) {
  const latest = group.timeline[group.timeline.length - 1] || null;
  const latestIntent = latest?.intent || "unknown";
  const intents = Array.isArray(group.intents) ? group.intents : [...(group.intents || [])];

  if (latestIntent === "accept") return "已确认合作";
  if (latestIntent === "negotiate") return "议价中";
  if (latestIntent === "give_quote") return "已给报价";
  if (latestIntent === "ask_quote") return "待对方报价";
  if (latestIntent === "follow_up") return "待回复";
  if (latestIntent === "reject") return "已拒绝";

  if (intents.includes("accept")) return "已确认合作";
  if (intents.includes("negotiate")) return "议价中";
  if (intents.includes("give_quote")) return "已有历史报价";
  if (intents.includes("ask_quote")) return "待对方报价";
  if (intents.includes("follow_up")) return "待回复";
  if (intents.includes("reject")) return "已拒绝";
  if (group.creatorIds.length > 0) return "已识别达人，待补更多信息";
  return "待人工判断";
}

function choosePriority(group) {
  if (group.currentStatus === "已确认合作") return "high";
  if (group.currentStatus === "议价中") return "high";
  if (group.currentStatus === "已给报价" && group.creatorIds.length > 0) return "high";
  if (group.currentStatus === "待对方报价") return "medium";
  if (group.currentStatus === "待回复") return "medium";
  if (group.creatorIds.length > 0 || group.platforms.length > 0) return "medium";
  return "low";
}

function chooseNextAction(group) {
  if (group.currentStatus === "已确认合作") return "优先确认执行细节并推进交付";
  if (group.currentStatus === "议价中") return "优先查看议价条件并确认是否继续推进";
  if (group.currentStatus === "已给报价") return "优先复核当前报价并整理达人复用线索";
  if (group.currentStatus === "待对方报价") return "优先补齐报价信息并确认达人意向";
  if (group.currentStatus === "待回复") return "优先判断是否需要继续跟进";
  if (group.currentStatus === "已拒绝") return "标记为已拒绝，降低优先级";
  if (group.creatorIds.length > 0) return "优先确认达人身份并继续补报价";
  if (group.platforms.length > 0) return "先确认合作平台与关联达人";
  return "仅保留关键词命中，待人工初筛";
}

function buildLeadReviewRows(conversationGroups) {
  return conversationGroups.map((group) => ({
    priority: choosePriority(group),
    matchedKeywords: group.matchedKeywords,
    hitScoreMax: group.hitScoreMax,
    messageCount: group.messageCount,
    latestReplyAt: group.latestReplyAt,
    creatorIds: group.creatorIds,
    platforms: group.platforms,
    quotedPrices: group.quotedPrices,
    intents: group.intents,
    currentStatus: group.currentStatus,
    needsManualReview: group.manualReviewCount > 0,
    nextAction: chooseNextAction(group),
    preview: group.preview,
    conversationKey: group.conversationKey,
  }));
}

function buildConversationGroups(items) {
  const groups = new Map();

  for (const item of items) {
    const key = buildConversationKey(item);
    const existing = groups.get(key) || {
      conversationKey: key,
      matchedKeywords: new Set(),
      hitLocations: new Set(),
      subjects: new Set(),
      creatorIds: new Set(),
      platforms: new Set(),
      latestReplyAt: null,
      messageCount: 0,
      manualReviewCount: 0,
      hitScoreMax: 0,
      quotedPrices: [],
      intents: new Set(),
      files: [],
      preview: item.summary || item.snippet || "",
      messages: [],
    };

    existing.messageCount += 1;
    existing.hitScoreMax = Math.max(existing.hitScoreMax, item.hitScore || 0);
    if (item.needsManualReview) existing.manualReviewCount += 1;
    for (const keyword of item.matchedKeywords || []) existing.matchedKeywords.add(keyword);
    for (const location of item.hitLocations || []) existing.hitLocations.add(location);
    if (item.subject) existing.subjects.add(item.subject);
    if (item.creatorId) existing.creatorIds.add(item.creatorId);
    if (item.platform) existing.platforms.add(item.platform);
    if (item.quotedPrice) existing.quotedPrices.push(formatPrice(item.quotedPrice));
    if (item.intent) existing.intents.add(item.intent);
    if (item.fileName) existing.files.push(item.fileName);
    existing.messages.push(item);
    if (!existing.latestReplyAt || (item.latestReplyAt && item.latestReplyAt > existing.latestReplyAt)) {
      existing.latestReplyAt = item.latestReplyAt || existing.latestReplyAt;
    }

    groups.set(key, existing);
  }

  return [...groups.values()]
    .map((group) => {
      const threadContext = buildThreadContext(group.messages);
      const currentStatus = chooseCurrentStatus({ ...group, timeline: threadContext.timeline });
      return {
        conversationKey: group.conversationKey,
        matchedKeywords: [...group.matchedKeywords].sort(),
        hitLocations: [...group.hitLocations],
        subjects: [...group.subjects],
        creatorIds: [...group.creatorIds],
        platforms: [...group.platforms],
        latestReplyAt: group.latestReplyAt,
        messageCount: group.messageCount,
        manualReviewCount: group.manualReviewCount,
        hitScoreMax: group.hitScoreMax,
        quotedPrices: [...new Set(group.quotedPrices)].slice(0, 5),
        intents: [...group.intents],
        currentStatus,
        files: group.files.slice(0, 10),
        preview: group.preview,
        timeline: threadContext.timeline,
        mergedContext: threadContext.mergedContext,
      };
    })
    .sort((a, b) => b.hitScoreMax - a.hitScoreMax || b.messageCount - a.messageCount);
}

export async function exportHistoricalCorpus({ corpusDir, limit = 0, outputRoot = defaultOutputRoot, keywords = [] }) {
  const normalizedKeywords = keywords.map(normalizeKeyword).filter(Boolean);
  const allFiles = (await readdir(corpusDir)).filter((name) => name.endsWith(".eml")).sort();
  const files = limit > 0 ? allFiles.slice(0, limit) : allFiles;
  const runId = `offline_${Date.now()}`;
  const runDir = path.join(outputRoot, runId);
  await mkdir(runDir, { recursive: true });

  const items = [];
  const stats = {
    checked: 0,
    parsed: 0,
    failed: 0,
    matched: 0,
    filteredOut: 0,
    conversationGroups: 0,
    withPlatform: 0,
    withPrice: 0,
    withCreator: 0,
    manualReview: 0,
  };

  for (const fileName of files) {
    stats.checked += 1;
    const filePath = path.join(corpusDir, fileName);

    try {
      const raw = await readFile(filePath);
      const parsedBody = await extractFullBody(raw);
      const extractedFields = extractCoreFields(parsedBody);
      const keywordMatch = collectKeywordHits({ parsedBody, extractedFields, keywords: normalizedKeywords });

      if (!keywordMatch.matched) {
        stats.filteredOut += 1;
        continue;
      }

      stats.parsed += 1;
      stats.matched += 1;
      if (extractedFields.platform) stats.withPlatform += 1;
      if (extractedFields.quotedPrice) stats.withPrice += 1;
      if (extractedFields.creatorId) stats.withCreator += 1;
      if (extractedFields.needsManualReview) stats.manualReview += 1;

      items.push({
        fileName,
        filePath,
        matchedKeywords: keywordMatch.matchedKeywords,
        hitLocations: keywordMatch.hitLocations,
        hitScore: keywordMatch.hitScore,
        subject: parsedBody.subject,
        creatorId: extractedFields.creatorId,
        platform: extractedFields.platform,
        quotedPrice: extractedFields.quotedPrice,
        latestReplyAt: extractedFields.latestReplyAt,
        stage: extractedFields.stage,
        intent: extractedFields.intent,
        summary: extractedFields.summary,
        needsManualReview: extractedFields.needsManualReview,
        snippet: parsedBody.snippet,
        fullBody: parsedBody.fullBody,
        hasAttachments: parsedBody.hasAttachments,
        attachmentCount: parsedBody.attachmentCount,
        parsedBody: {
          messageId: parsedBody.messageId,
          inReplyTo: parsedBody.inReplyTo,
          references: parsedBody.references,
          from: parsedBody.from,
        },
      });
    } catch (error) {
      stats.failed += 1;
      items.push({
        fileName,
        filePath,
        matchedKeywords: [],
        hitLocations: [],
        hitScore: 0,
        error: error instanceof Error ? error.message : "解析失败",
        needsManualReview: true,
        parsedBody: {
          messageId: null,
          inReplyTo: null,
          references: null,
          from: null,
        },
      });
    }
  }

  const conversationGroups = buildConversationGroups(items);
  const leadReviewRows = buildLeadReviewRows(conversationGroups);
  stats.conversationGroups = conversationGroups.length;

  const jsonPath = path.join(runDir, "historical_parse_results.json");
  await writeFile(
    jsonPath,
    JSON.stringify(
      {
        runId,
        corpusDir,
        keywords: normalizedKeywords,
        stats,
        items,
        conversationGroups,
        leadReviewRows,
      },
      null,
      2,
    ),
    "utf8",
  );

  const csvRows = [
    [
      "fileName",
      "matchedKeywords",
      "hitLocations",
      "hitScore",
      "subject",
      "creatorId",
      "platform",
      "quotedPrice",
      "latestReplyAt",
      "stage",
      "intent",
      "needsManualReview",
      "hasAttachments",
      "attachmentCount",
      "summary",
      "snippet",
      "error",
    ].join(","),
    ...items.map((item) =>
      [
        csvEscape(item.fileName),
        csvEscape((item.matchedKeywords || []).join("|")),
        csvEscape((item.hitLocations || []).join("|")),
        csvEscape(item.hitScore || 0),
        csvEscape(item.subject || ""),
        csvEscape(item.creatorId || ""),
        csvEscape(item.platform || ""),
        csvEscape(formatPrice(item.quotedPrice)),
        csvEscape(item.latestReplyAt || ""),
        csvEscape(item.stage || ""),
        csvEscape(item.intent || ""),
        csvEscape(item.needsManualReview ? "true" : "false"),
        csvEscape(item.hasAttachments ? "true" : "false"),
        csvEscape(item.attachmentCount ?? ""),
        csvEscape(item.summary || ""),
        csvEscape(item.snippet || ""),
        csvEscape(item.error || ""),
      ].join(","),
    ),
  ];

  const csvPath = path.join(runDir, "historical_parse_results.csv");
  await writeFile(csvPath, csvRows.join("\n"), "utf8");

  const groupRows = [
    [
      "conversationKey",
      "matchedKeywords",
      "hitLocations",
      "hitScoreMax",
      "messageCount",
      "manualReviewCount",
      "creatorIds",
      "platforms",
      "quotedPrices",
      "intents",
      "currentStatus",
      "latestReplyAt",
      "subjects",
      "preview",
      "mergedContext",
    ].join(","),
    ...conversationGroups.map((group) =>
      [
        csvEscape(group.conversationKey),
        csvEscape(group.matchedKeywords.join("|")),
        csvEscape(group.hitLocations.join("|")),
        csvEscape(group.hitScoreMax),
        csvEscape(group.messageCount),
        csvEscape(group.manualReviewCount),
        csvEscape(group.creatorIds.join("|")),
        csvEscape(group.platforms.join("|")),
        csvEscape(group.quotedPrices.join("|")),
        csvEscape(group.intents.join("|")),
        csvEscape(group.currentStatus || ""),
        csvEscape(group.latestReplyAt || ""),
        csvEscape(group.subjects.join(" | ")),
        csvEscape(group.preview || ""),
        csvEscape(group.mergedContext || ""),
      ].join(","),
    ),
  ];

  const groupCsvPath = path.join(runDir, "historical_conversation_groups.csv");
  await writeFile(groupCsvPath, groupRows.join("\n"), "utf8");

  const leadRows = [
    [
      "priority",
      "matchedKeywords",
      "hitScoreMax",
      "messageCount",
      "latestReplyAt",
      "creatorIds",
      "platforms",
      "quotedPrices",
      "intents",
      "currentStatus",
      "needsManualReview",
      "nextAction",
      "preview",
      "conversationKey",
    ].join(","),
    ...leadReviewRows.map((row) =>
      [
        csvEscape(row.priority),
        csvEscape(row.matchedKeywords.join("|")),
        csvEscape(row.hitScoreMax),
        csvEscape(row.messageCount),
        csvEscape(row.latestReplyAt || ""),
        csvEscape(row.creatorIds.join("|")),
        csvEscape(row.platforms.join("|")),
        csvEscape(row.quotedPrices.join("|")),
        csvEscape((row.intents || []).join("|")),
        csvEscape(row.currentStatus || ""),
        csvEscape(row.needsManualReview ? "true" : "false"),
        csvEscape(row.nextAction),
        csvEscape(row.preview),
        csvEscape(row.conversationKey),
      ].join(","),
    ),
  ];

  const leadCsvPath = path.join(runDir, "historical_lead_review.csv");
  await writeFile(leadCsvPath, leadRows.join("\n"), "utf8");

  return {
    runId,
    runDir,
    jsonPath,
    csvPath,
    groupCsvPath,
    leadCsvPath,
    stats,
    keywords: normalizedKeywords,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const corpusDir = process.argv[2];
  const limit = Number(process.argv[3] || 0);
  const keywords = process.argv.slice(4);

  if (!corpusDir) {
    console.error("Usage: node src/parse/export-historical-corpus.mjs <corpusDir> [limit] [keywords...]");
    process.exit(1);
  }

  const result = await exportHistoricalCorpus({ corpusDir, limit, keywords });
  console.log(JSON.stringify(result, null, 2));
}
