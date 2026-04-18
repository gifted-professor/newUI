import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchMailboxMessages } from "../adapters/imap-adapter.mjs";
import { appendLog } from "../logs/logger.mjs";
import { extractFullBody } from "../parse/extract-full-body.mjs";
import { extractCoreFields } from "../parse/extract-core-fields.mjs";
import { buildMessageKey, getKnownMessageKeys, recordIndexedMessages } from "../storage/message-index.mjs";
import { readState, updateState } from "../store/state-store.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runsDir = path.resolve(__dirname, "../../data/runs");

function sanitizeSegment(value) {
  return String(value || "unknown")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

async function markJob(runId, mutator) {
  await updateState((state) => {
    const job = state.jobs.find((item) => item.jobId === runId);
    if (!job) return;
    mutator(job, state);
  });
}

async function failJob(runId, message) {
  await updateState((state) => {
    const job = state.jobs.find((item) => item.jobId === runId);
    if (job) {
      job.status = "failed";
    }
    state.metrics.activeJobs = Math.max(0, state.metrics.activeJobs - 1);
  });
  await appendLog("error", message);
}

async function persistArtifacts(runId, accountEmail, messages) {
  const runDir = path.join(runsDir, runId);
  await mkdir(runDir, { recursive: true });

  const manifest = [];

  for (const message of messages) {
    const baseName = `${String(manifest.length + 1).padStart(3, "0")}_${sanitizeSegment(message.scopeName)}_${message.uid}`;
    const fileName = `${baseName}.eml`;
    const filePath = path.join(runDir, fileName);
    await writeFile(filePath, message.source);
    const parsedBody = await extractFullBody(message.source);
    const extractedFields = extractCoreFields(parsedBody);
    const parsedPath = path.join(runDir, `${baseName}.parsed.json`);
    await writeFile(parsedPath, JSON.stringify({ ...parsedBody, extractedFields }, null, 2), "utf8");

    manifest.push({
      key: buildMessageKey({
        accountEmail,
        remoteId: message.remoteId,
        uid: message.uid,
      }),
      uid: message.uid,
      scopeId: message.scopeId,
      scopeName: message.scopeName,
      remoteId: message.remoteId,
      subject: message.subject,
      from: message.from,
      date: message.date,
      size: message.size,
      savedAt: new Date().toISOString(),
      fileName,
      filePath,
      parsedPath,
      snippet: parsedBody.snippet,
      hasAttachments: parsedBody.hasAttachments,
      attachmentCount: parsedBody.attachmentCount,
      extractedFields,
    });
  }

  const manifestPath = path.join(runDir, "manifest.json");
  await writeFile(manifestPath, JSON.stringify({ runId, items: manifest }, null, 2), "utf8");

  await recordIndexedMessages(
    manifest.map((item) => ({
      key: item.key,
      runId,
      fileName: item.fileName,
      remoteId: item.remoteId,
      uid: item.uid,
      savedAt: item.savedAt,
    })),
  );

  return { runDir, manifestPath, items: manifest };
}

export async function startParseRun({ limit = 50 } = {}) {
  const state = await readState();

  if (!state.mailbox.connected || !state.mailbox.accountEmail) {
    throw new Error("请先连接本地邮箱后再启动同步。");
  }

  if (state.mailbox.authMode === "oauth" || state.mailbox.provider === "gmail") {
    throw new Error("Gmail 真实抓取尚未接入，请先使用 IMAP 邮箱完成本地同步。");
  }

  if (!state.mailbox.hasSecret || !state.mailbox.secret) {
    throw new Error("当前本地连接器未保存 IMAP 授权码，无法执行真实抓取。");
  }

  const selectedScopes = state.mailbox.availableScopes.filter(
    (item) => state.mailbox.selectedScopeIds.includes(item.id) && item.selectable !== false,
  );

  if (!selectedScopes.length) {
    throw new Error("请先选择至少一个抓取范围后再启动同步。");
  }

  const runId = `run_${Date.now()}`;
  const effectiveLimit = Math.max(1, Math.min(limit, state.mailbox.maxEmailsPerRun || 50));

  await updateState((nextState) => {
    nextState.jobs.unshift({
      jobId: runId,
      status: "running",
      total: effectiveLimit,
      processed: 0,
      success: 0,
      skipped: 0,
      failed: 0,
      createdAt: new Date().toISOString(),
    });
    nextState.metrics.activeJobs += 1;
  });

  queueMicrotask(async () => {
    try {
      const knownMessageKeys = await getKnownMessageKeys();
      await appendLog("info", `本地同步 ${runId} 已启动，准备扫描 ${selectedScopes.length} 个范围。`);
      for (const scope of selectedScopes) {
        await appendLog("info", `扫描范围：${scope.displayName}`);
      }

      const result = await fetchMailboxMessages({
        email: state.mailbox.accountEmail,
        secret: state.mailbox.secret,
        scopes: selectedScopes,
        onlyUnread: state.mailbox.onlyUnread,
        maxEmailsPerRun: effectiveLimit,
        existingMessageKeys: knownMessageKeys,
      });

      await markJob(runId, (job) => {
        job.processed = result.scannedCount;
        job.success = result.fetchedCount;
        job.skipped = result.duplicateCount;
        job.failed = result.failedCount;
      });

      if (!result.messages.length) {
        await updateState((nextState) => {
          const job = nextState.jobs.find((item) => item.jobId === runId);
          if (job) {
            job.status = "success";
            job.failed = result.failedCount;
            job.skipped = result.duplicateCount;
          }
          nextState.metrics.activeJobs = Math.max(0, nextState.metrics.activeJobs - 1);
          nextState.mailbox.lastSyncAt = new Date().toISOString();
          nextState.mailbox.lastRun = {
            runId,
            runDir: null,
            manifestPath: null,
            savedCount: 0,
            skippedCount: result.duplicateCount,
            failedCount: result.failedCount,
            savedAt: new Date().toISOString(),
          };
        });
        await appendLog("info", `本地同步 ${runId} 已完成，没有发现需要新增保存的邮件。`);
        if (result.duplicateCount) {
          await appendLog("info", `本轮跳过 ${result.duplicateCount} 封重复邮件。`);
        }
        if (result.failedCount) {
          await appendLog("error", `本轮有 ${result.failedCount} 封邮件抓取失败。`);
          for (const failure of result.failures.slice(0, 20)) {
            await appendLog("error", `抓取失败 · ${failure.scopeName} · UID ${failure.uid} · ${failure.reason}`);
          }
          if (result.failures.length > 20) {
            await appendLog("error", `其余 ${result.failures.length - 20} 封抓取失败已省略，请缩小抓取范围后重试。`);
          }
        }
        return;
      }

      const artifacts = await persistArtifacts(runId, state.mailbox.accountEmail, result.messages);

      await updateState((nextState) => {
        const job = nextState.jobs.find((item) => item.jobId === runId);
        if (job) {
          job.status = "success";
          job.processed = result.scannedCount;
          job.success = artifacts.items.length;
          job.skipped = result.duplicateCount;
          job.failed = result.failedCount;
        }
        nextState.metrics.pendingEmails = Math.max(0, nextState.metrics.pendingEmails - artifacts.items.length);
        nextState.metrics.activeJobs = Math.max(0, nextState.metrics.activeJobs - 1);
        nextState.mailbox.lastSyncAt = new Date().toISOString();
        nextState.mailbox.lastRun = {
          runId,
          runDir: artifacts.runDir,
          manifestPath: artifacts.manifestPath,
          savedCount: artifacts.items.length,
          skippedCount: result.duplicateCount,
          failedCount: result.failedCount,
          savedAt: new Date().toISOString(),
        };
      });

      await appendLog("success", `本地同步 ${runId} 已完成，保存 ${artifacts.items.length} 封 EML 到本地。`);
      if (result.duplicateCount) {
        await appendLog("info", `本轮跳过 ${result.duplicateCount} 封重复邮件。`);
      }
      if (result.failedCount) {
        await appendLog("error", `本轮有 ${result.failedCount} 封邮件抓取失败。`);
        for (const failure of result.failures.slice(0, 20)) {
          await appendLog("error", `抓取失败 · ${failure.scopeName} · UID ${failure.uid} · ${failure.reason}`);
        }
        if (result.failures.length > 20) {
          await appendLog("error", `其余 ${result.failures.length - 20} 封抓取失败已省略，请缩小抓取范围后重试。`);
        }
      }
      await appendLog("info", `运行目录：${artifacts.runDir}`);
    } catch (error) {
      await failJob(runId, error instanceof Error ? error.message : "本地同步失败。");
    }
  });

  return { runId, status: "started" };
}

export async function listJobs() {
  const state = await readState();
  return state.jobs;
}

export async function getJob(jobId) {
  const state = await readState();
  return state.jobs.find((item) => item.jobId === jobId) ?? null;
}
