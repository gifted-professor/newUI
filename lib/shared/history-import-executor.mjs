import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { extractFullBody } from "../server/historical-parse/extract-full-body.ts";
import { extractCoreFields } from "../server/historical-parse/extract-core-fields.ts";
import { buildConversationGroups, buildCreatorProfiles, buildLeadReviewRows, collectKeywordHits } from "../server/historical-parse/build-review-results.ts";

class FatalHistoryImportError extends Error {}

function readPositiveIntegerEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function formatBytes(bytes) {
  return `${Math.round(bytes / 1024 / 1024)}MB`;
}

function getImportLimits(limit) {
  const maxFiles = readPositiveIntegerEnv("HISTORY_IMPORT_MAX_FILES", 10000);
  const maxFileBytes = readPositiveIntegerEnv("HISTORY_IMPORT_MAX_FILE_BYTES", 25 * 1024 * 1024);
  const maxTotalBytes = readPositiveIntegerEnv("HISTORY_IMPORT_MAX_TOTAL_BYTES", 2 * 1024 * 1024 * 1024);
  const maxDepth = readPositiveIntegerEnv("HISTORY_IMPORT_MAX_DEPTH", 12);
  const effectiveLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0;

  if (effectiveLimit > maxFiles) {
    throw new Error(`数量上限不能超过 ${maxFiles}。`);
  }

  return { effectiveLimit, maxFiles, maxFileBytes, maxTotalBytes, maxDepth };
}

async function listEmlFiles(rootPath, options, baseRoot = rootPath, files = [], depth = 0) {
  if (depth > options.maxDepth) {
    throw new Error(`目录层级超过 ${options.maxDepth}，请缩小扫描目录。`);
  }

  const entries = (await readdir(rootPath, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (options.limit > 0 && files.length >= options.limit) break;
    if (entry.name === ".DS_Store") continue;

    const entryPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      await listEmlFiles(entryPath, options, baseRoot, files, depth + 1);
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".eml")) {
      if (files.length >= options.maxFiles) {
        throw new Error(`本地目录 EML 数量超过 ${options.maxFiles}，请设置数量上限或缩小目录。`);
      }
      files.push({
        fileName: path.relative(baseRoot, entryPath),
        filePath: entryPath,
      });
    }
  }

  return files.sort((a, b) => a.fileName.localeCompare(b.fileName));
}

export async function executeHistoryImport({ corpusPath, keywords = [], limit = 0 }) {
  const limits = getImportLimits(limit);
  const files = await listEmlFiles(corpusPath, { limit: limits.effectiveLimit, maxFiles: limits.maxFiles, maxDepth: limits.maxDepth });

  const items = [];
  let totalReadBytes = 0;
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
    creatorProfiles: 0,
  };

  for (const file of files) {
    stats.checked += 1;
    const filePath = file.filePath;
    try {
      const fileInfo = await stat(filePath);
      if (!fileInfo.isFile()) {
        throw new Error("不是有效的 EML 文件。");
      }
      if (fileInfo.size > limits.maxFileBytes) {
        throw new Error(`单封 EML 文件超过 ${formatBytes(limits.maxFileBytes)}。`);
      }
      if (totalReadBytes + fileInfo.size > limits.maxTotalBytes) {
        throw new FatalHistoryImportError(`本地目录读取体积超过 ${formatBytes(limits.maxTotalBytes)}，请设置更小的数量上限。`);
      }
      totalReadBytes += fileInfo.size;
      const raw = await readFile(filePath);
      const parsedBody = await extractFullBody(raw);
      const extractedFields = extractCoreFields(parsedBody);
      const keywordMatch = collectKeywordHits({ parsedBody, extractedFields, keywords });
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
        fileName: file.fileName,
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
      if (error instanceof FatalHistoryImportError) {
        throw error;
      }
      stats.failed += 1;
      items.push({
        fileName: file.fileName,
        filePath,
        error: error instanceof Error ? error.message : "解析失败",
        needsManualReview: true,
        matchedKeywords: [],
        hitLocations: [],
        hitScore: 0,
        parsedBody: { messageId: null, inReplyTo: null, references: null, from: null },
      });
    }
  }

  const conversationGroups = buildConversationGroups(items);
  const leadReviewRows = buildLeadReviewRows(conversationGroups);
  const creatorProfiles = buildCreatorProfiles(conversationGroups);
  stats.conversationGroups = conversationGroups.length;
  stats.creatorProfiles = creatorProfiles.length;

  return {
    stats,
    items,
    conversationGroups,
    leadReviewRows,
    creatorProfiles,
  };
}
