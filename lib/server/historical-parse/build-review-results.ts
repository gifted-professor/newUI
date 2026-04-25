export type ParsedItem = {
  fileName: string;
  matchedKeywords: string[];
  hitLocations: string[];
  hitScore: number;
  subject: string;
  creatorId: string | null;
  platform: string | null;
  quotedPrice: { amount: number; currency: string; raw: string } | null;
  latestReplyAt: string | null;
  stage: string;
  intent: string;
  summary: string;
  needsManualReview: boolean;
  snippet: string;
  parsedBody: { messageId: string | null; inReplyTo: string | null; references: string | null; from: string | null };
};

export type CreatorProfile = {
  creatorKey: string;
  displayName: string;
  primaryCreatorId: string | null;
  platforms: string[];
  matchedKeywords: string[];
  quotedPrices: string[];
  currentStatus: string;
  latestReplyAt: string | null;
  conversationCount: number;
  messageCount: number;
  confidence: number;
  confidenceLabel: "high" | "medium" | "low";
  needsReview: boolean;
  reviewReasons: string[];
  conversationKeys: string[];
  files: string[];
  preview: string;
};

const HIT_WEIGHTS: Record<string, number> = { subject: 5, creatorId: 5, from: 4, to: 3, platform: 3, fullBody: 1 };

export function formatPrice(quotedPrice: ParsedItem["quotedPrice"]) {
  if (!quotedPrice) return "";
  return `${quotedPrice.currency || ""} ${quotedPrice.amount ?? ""}`.trim();
}

function normalizeKeyword(value: string) {
  return String(value || "").trim().toLowerCase();
}

function normalizeCreatorKey(value: string) {
  return String(value || "").trim().replace(/^@/, "").toLowerCase();
}

function normalizeSubject(value: string) {
  return String(value || "").replace(/^(re|fw|fwd)\s*:\s*/gi, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function extractReferenceRoot(parsedBody: ParsedItem["parsedBody"]) {
  const references = String(parsedBody.references || "");
  const matches = references.match(/<[^>]+>/g);
  if (matches?.length) return matches[0].toLowerCase();
  if (parsedBody.inReplyTo) return String(parsedBody.inReplyTo).toLowerCase();
  if (parsedBody.messageId) return String(parsedBody.messageId).toLowerCase();
  return null;
}

export function collectKeywordHits({ parsedBody, extractedFields, keywords }: { parsedBody: { subject?: string; from?: string; to?: string; fullBody?: string }; extractedFields: { creatorId?: string | null; platform?: string | null }; keywords: string[] }) {
  const normalizedKeywords = keywords.map(normalizeKeyword).filter(Boolean);
  if (!normalizedKeywords.length) return { matched: true, matchedKeywords: [], hitLocations: [], hitScore: 0 };
  const fields = [
    { name: "subject", value: parsedBody.subject || "" },
    { name: "from", value: parsedBody.from || "" },
    { name: "to", value: parsedBody.to || "" },
    { name: "fullBody", value: parsedBody.fullBody || "" },
    { name: "creatorId", value: extractedFields.creatorId || "" },
    { name: "platform", value: extractedFields.platform || "" },
  ];
  const matchedKeywords = new Set<string>();
  const hitLocations = new Set<string>();
  for (const keyword of normalizedKeywords) {
    for (const field of fields) {
      if (field.value.toLowerCase().includes(keyword)) {
        matchedKeywords.add(keyword);
        hitLocations.add(field.name);
      }
    }
  }
  const locations = [...hitLocations];
  const hitScore = locations.reduce((score, location) => score + (HIT_WEIGHTS[location] || 1), 0) + matchedKeywords.size * 2;
  return { matched: matchedKeywords.size > 0, matchedKeywords: [...matchedKeywords].sort(), hitLocations: locations, hitScore };
}

function buildConversationKey(item: ParsedItem) {
  const referenceRoot = extractReferenceRoot(item.parsedBody);
  if (referenceRoot) return `ref:${referenceRoot}`;
  const keywordPart = item.matchedKeywords.join("|") || "all";
  const creatorPart = item.creatorId || item.parsedBody.from || "unknown";
  const subjectPart = normalizeSubject(item.subject || "");
  return `fallback:${keywordPart}::${creatorPart.toLowerCase()}::${subjectPart}`;
}

function buildThreadContext(messages: ParsedItem[]) {
  const ordered = [...messages].sort((a, b) => String(a.latestReplyAt || "").localeCompare(String(b.latestReplyAt || "")));
  const timeline = ordered.map((item) => ({ fileName: item.fileName, latestReplyAt: item.latestReplyAt, subject: item.subject, creatorId: item.creatorId, platform: item.platform, quotedPrice: item.quotedPrice, stage: item.stage, intent: item.intent, summary: item.summary, hitScore: item.hitScore }));
  const mergedContext = ordered.map((item, index) => [`[message ${index + 1}]`, item.latestReplyAt ? `date: ${item.latestReplyAt}` : null, item.subject ? `subject: ${item.subject}` : null, item.creatorId ? `creator: ${item.creatorId}` : null, item.platform ? `platform: ${item.platform}` : null, item.intent ? `intent: ${item.intent}` : null, item.summary ? `summary: ${item.summary}` : item.snippet ? `snippet: ${item.snippet}` : null].filter(Boolean).join("\n")).join("\n\n---\n\n");
  return { timeline, mergedContext };
}

function chooseCurrentStatus(group: any) {
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

function choosePriority(group: any) {
  if (group.currentStatus === "已确认合作") return "high";
  if (group.currentStatus === "议价中") return "high";
  if (group.currentStatus === "已给报价" && group.creatorIds.length > 0) return "high";
  if (group.currentStatus === "待对方报价") return "medium";
  if (group.currentStatus === "待回复") return "medium";
  if (group.creatorIds.length > 0 || group.platforms.length > 0) return "medium";
  return "low";
}

function chooseNextAction(group: any) {
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

export function buildConversationGroups(items: ParsedItem[]) {
  const groups = new Map<string, any>();
  for (const item of items) {
    const key = buildConversationKey(item);
    const existing = groups.get(key) || { conversationKey: key, matchedKeywords: new Set<string>(), hitLocations: new Set<string>(), subjects: new Set<string>(), creatorIds: new Set<string>(), platforms: new Set<string>(), latestReplyAt: null, messageCount: 0, manualReviewCount: 0, hitScoreMax: 0, quotedPrices: [], intents: new Set<string>(), files: [], preview: item.summary || item.snippet || "", messages: [] as ParsedItem[] };
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
    if (!existing.latestReplyAt || (item.latestReplyAt && item.latestReplyAt > existing.latestReplyAt)) existing.latestReplyAt = item.latestReplyAt || existing.latestReplyAt;
    groups.set(key, existing);
  }
  return [...groups.values()].map((group) => {
    const threadContext = buildThreadContext(group.messages);
    const currentStatus = chooseCurrentStatus({ ...group, timeline: threadContext.timeline });
    return { conversationKey: group.conversationKey, matchedKeywords: [...group.matchedKeywords].sort(), hitLocations: [...group.hitLocations], subjects: [...group.subjects], creatorIds: [...group.creatorIds], platforms: [...group.platforms], latestReplyAt: group.latestReplyAt, messageCount: group.messageCount, manualReviewCount: group.manualReviewCount, hitScoreMax: group.hitScoreMax, quotedPrices: [...new Set(group.quotedPrices)].slice(0, 5), intents: [...group.intents], currentStatus, files: group.files.slice(0, 10), preview: group.preview, timeline: threadContext.timeline, mergedContext: threadContext.mergedContext };
  }).sort((a, b) => b.hitScoreMax - a.hitScoreMax || b.messageCount - a.messageCount);
}

export function buildLeadReviewRows(conversationGroups: ReturnType<typeof buildConversationGroups>) {
  return conversationGroups.map((group) => ({ priority: choosePriority(group), matchedKeywords: group.matchedKeywords, hitScoreMax: group.hitScoreMax, messageCount: group.messageCount, latestReplyAt: group.latestReplyAt, creatorIds: group.creatorIds, platforms: group.platforms, quotedPrices: group.quotedPrices, intents: group.intents, currentStatus: group.currentStatus, needsManualReview: group.manualReviewCount > 0, nextAction: chooseNextAction(group), preview: group.preview, conversationKey: group.conversationKey }));
}

function clampConfidence(value: number) {
  return Math.max(0.1, Math.min(0.98, Number(value.toFixed(2))));
}

function chooseConfidenceLabel(confidence: number): CreatorProfile["confidenceLabel"] {
  if (confidence >= 0.78) return "high";
  if (confidence >= 0.55) return "medium";
  return "low";
}

function pickLatestStatus(current: string, candidate: string, currentAt: string | null, candidateAt: string | null) {
  if (!current) return candidate;
  if (!candidate) return current;
  if (!currentAt) return candidate;
  if (!candidateAt) return current;
  return candidateAt >= currentAt ? candidate : current;
}

function buildReviewReasons(group: any, creatorId: string | null) {
  const reasons: string[] = [];
  if (!creatorId) reasons.push("缺达人ID");
  if (!group.platforms?.length) reasons.push("缺平台");
  if (!group.quotedPrices?.length) reasons.push("缺报价");
  if ((group.creatorIds || []).length > 1) reasons.push("多达人候选");
  if ((group.manualReviewCount || 0) > 0) reasons.push("邮件需复核");
  return reasons;
}

function scoreCreatorGroup(group: any, creatorId: string | null) {
  let score = 0.28;
  if (creatorId) score += 0.28;
  if (group.platforms?.length) score += 0.18;
  if (group.quotedPrices?.length) score += 0.16;
  if ((group.messageCount || 0) > 1) score += 0.08;
  if ((group.creatorIds || []).length > 1) score -= 0.14;
  if ((group.manualReviewCount || 0) > 0) score -= 0.08;
  return clampConfidence(score);
}

export function buildCreatorProfiles(conversationGroups: ReturnType<typeof buildConversationGroups>): CreatorProfile[] {
  const profiles = new Map<string, any>();

  for (const group of conversationGroups as any[]) {
    const creatorIds = group.creatorIds?.length ? group.creatorIds : [null];
    for (const creatorId of creatorIds) {
      const normalizedCreator = creatorId ? normalizeCreatorKey(creatorId) : "";
      const primaryPlatform = group.platforms?.[0] || "unknown";
      const creatorKey = normalizedCreator
        ? `${String(primaryPlatform).toLowerCase()}:${normalizedCreator}`
        : `review:${group.conversationKey}`;
      const existing = profiles.get(creatorKey) || {
        creatorKey,
        displayName: creatorId || "待确认达人",
        primaryCreatorId: creatorId,
        platforms: new Set<string>(),
        matchedKeywords: new Set<string>(),
        quotedPrices: new Set<string>(),
        currentStatus: "",
        latestReplyAt: null,
        conversationCount: 0,
        messageCount: 0,
        confidenceScores: [],
        reviewReasons: new Set<string>(),
        conversationKeys: new Set<string>(),
        files: new Set<string>(),
        preview: group.preview || "",
      };

      for (const platform of group.platforms || []) existing.platforms.add(platform);
      for (const keyword of group.matchedKeywords || []) existing.matchedKeywords.add(keyword);
      for (const price of group.quotedPrices || []) existing.quotedPrices.add(price);
      for (const reason of buildReviewReasons(group, creatorId)) existing.reviewReasons.add(reason);
      for (const file of group.files || []) existing.files.add(file);

      existing.conversationCount += 1;
      existing.messageCount += group.messageCount || 0;
      existing.conversationKeys.add(group.conversationKey);
      existing.confidenceScores.push(scoreCreatorGroup(group, creatorId));
      existing.currentStatus = pickLatestStatus(existing.currentStatus, group.currentStatus, existing.latestReplyAt, group.latestReplyAt);
      if (!existing.latestReplyAt || (group.latestReplyAt && group.latestReplyAt > existing.latestReplyAt)) {
        existing.latestReplyAt = group.latestReplyAt || existing.latestReplyAt;
        existing.preview = group.preview || existing.preview;
      }

      profiles.set(creatorKey, existing);
    }
  }

  return [...profiles.values()]
    .map((profile) => {
      const averageConfidence = profile.confidenceScores.length
        ? profile.confidenceScores.reduce((sum: number, item: number) => sum + item, 0) / profile.confidenceScores.length
        : 0.1;
      const confidence = clampConfidence(averageConfidence + Math.min(0.12, Math.max(0, profile.conversationCount - 1) * 0.03));
      const reviewReasons = [...profile.reviewReasons];
      if (confidence < 0.55) reviewReasons.push("低置信度");
      return {
        creatorKey: profile.creatorKey,
        displayName: profile.displayName,
        primaryCreatorId: profile.primaryCreatorId,
        platforms: [...profile.platforms].sort(),
        matchedKeywords: [...profile.matchedKeywords].sort(),
        quotedPrices: [...profile.quotedPrices].slice(0, 5),
        currentStatus: profile.currentStatus || "待人工判断",
        latestReplyAt: profile.latestReplyAt,
        conversationCount: profile.conversationCount,
        messageCount: profile.messageCount,
        confidence,
        confidenceLabel: chooseConfidenceLabel(confidence),
        needsReview: reviewReasons.length > 0,
        reviewReasons: [...new Set(reviewReasons)],
        conversationKeys: [...profile.conversationKeys],
        files: [...profile.files].slice(0, 10),
        preview: profile.preview,
      } satisfies CreatorProfile;
    })
    .sort((a, b) => Number(b.primaryCreatorId != null) - Number(a.primaryCreatorId != null) || b.confidence - a.confidence || b.messageCount - a.messageCount);
}
