import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { appendLog } from "../logs/logger.mjs";
import { getHistoryImport, updateHistoryImport } from "../storage/history-import-store.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const executorModuleUrl = pathToFileURL(path.join(repoRoot, "lib/shared/history-import-executor.mjs")).href;

async function writeCsvArtifacts(importId, leadReviewRows, conversationGroups) {
  const item = await getHistoryImport(importId);
  if (!item?.corpusPath) return null;

  const outputDir = path.dirname(item.corpusPath);
  const leadCsvPath = path.join(outputDir, "historical_lead_review.csv");
  const conversationCsvPath = path.join(outputDir, "historical_conversation_groups.csv");

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
        row.priority,
        (row.matchedKeywords || []).join("|"),
        row.hitScoreMax ?? "",
        row.messageCount ?? "",
        row.latestReplyAt || "",
        (row.creatorIds || []).join("|"),
        (row.platforms || []).join("|"),
        (row.quotedPrices || []).join("|"),
        (row.intents || []).join("|"),
        row.currentStatus || "",
        row.needsManualReview ? "true" : "false",
        row.nextAction || "",
        row.preview || "",
        row.conversationKey || "",
      ]
        .map((value) => {
          const raw = value == null ? "" : String(value);
          return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
        })
        .join(","),
    ),
  ];

  const conversationRows = [
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
        group.conversationKey,
        (group.matchedKeywords || []).join("|"),
        (group.hitLocations || []).join("|"),
        group.hitScoreMax ?? "",
        group.messageCount ?? "",
        group.manualReviewCount ?? "",
        (group.creatorIds || []).join("|"),
        (group.platforms || []).join("|"),
        (group.quotedPrices || []).join("|"),
        (group.intents || []).join("|"),
        group.currentStatus || "",
        group.latestReplyAt || "",
        (group.subjects || []).join(" | "),
        group.preview || "",
        group.mergedContext || "",
      ]
        .map((value) => {
          const raw = value == null ? "" : String(value);
          return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
        })
        .join(","),
    ),
  ];

  await writeFile(leadCsvPath, leadRows.join("\n"), "utf8");
  await writeFile(conversationCsvPath, conversationRows.join("\n"), "utf8");
  return { leadCsvPath, conversationCsvPath };
}

export async function runHistoryImportTask({ id, corpusPath, keywords, limit = 0 }) {
  await updateHistoryImport(id, { status: "running", error: undefined });
  await appendLog("info", `历史解析 ${id} 已启动，正在扫描本地 ZIP 语料。`);

  try {
    const { executeHistoryImport } = await import(executorModuleUrl);
    const result = await executeHistoryImport({ corpusPath, keywords, limit });
    const artifacts = await writeCsvArtifacts(id, result.leadReviewRows, result.conversationGroups);

    await updateHistoryImport(id, {
      status: "completed",
      result,
      exportArtifacts: artifacts,
    });

    await appendLog(
      "success",
      `历史解析 ${id} 已完成，检查 ${result.stats.checked} 封，命中 ${result.stats.matched} 封，会话 ${result.stats.conversationGroups} 个。`,
    );
    return result;
  } catch (error) {
    await updateHistoryImport(id, {
      status: "failed",
      error: error instanceof Error ? error.message : "历史解析任务失败",
    });
    await appendLog("error", `历史解析 ${id} 失败：${error instanceof Error ? error.message : "历史解析任务失败"}`);
    throw error;
  }
}

export async function listImportArtifacts(importId) {
  const item = await getHistoryImport(importId);
  if (!item?.corpusPath) {
    return { fileCount: 0, sampleFiles: [] };
  }
  const files = (await readdir(item.corpusPath)).filter((name) => name.endsWith(".eml")).sort();
  return {
    fileCount: files.length,
    sampleFiles: files.slice(0, 5),
  };
}
