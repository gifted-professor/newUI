import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { extractFullBody } from "../server/historical-parse/extract-full-body.ts";
import { extractCoreFields } from "../server/historical-parse/extract-core-fields.ts";
import { buildConversationGroups, buildLeadReviewRows, collectKeywordHits } from "../server/historical-parse/build-review-results.ts";

export async function executeHistoryImport({ corpusPath, keywords = [], limit = 0 }) {
  const allFiles = (await readdir(corpusPath)).filter((name) => name.endsWith(".eml")).sort();
  const files = limit > 0 ? allFiles.slice(0, limit) : allFiles;

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
    const filePath = path.join(corpusPath, fileName);
    try {
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
  stats.conversationGroups = conversationGroups.length;

  return {
    stats,
    items,
    conversationGroups,
    leadReviewRows,
  };
}
