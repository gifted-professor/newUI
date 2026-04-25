import { createServer } from "node:http";
import { appendLog } from "./logs/logger.mjs";
import { getScopesForProvider, normalizeProvider } from "./adapters/provider-registry.mjs";
import { connectImapMailbox } from "./adapters/imap-adapter.mjs";
import { parseMultipartFormData } from "./host/parse-form-data.mjs";
import { applyCorsHeaders, isAuthorized, isOriginAllowed, parseJsonBody, sendJson } from "./host/json-response.mjs";
import { listImportArtifacts, runHistoryImportTask } from "./runtime/history-import-runner.mjs";
import { getJob, listJobs, startParseRun } from "./runtime/parse-runner.mjs";
import { createHistoryImport, getHistoryImport, isSafeHistoryImportId, listHistoryImports, updateHistoryImport } from "./storage/history-import-store.mjs";
import { saveUploadedZipAndExtract } from "./storage/history-import-upload.mjs";
import { resolveAllowedCorpusPath } from "./storage/local-import-paths.mjs";
import { readState, updateState } from "./store/state-store.mjs";

const PORT = process.env.LOCAL_CONNECTOR_PORT || 48721;
const HOST = process.env.LOCAL_CONNECTOR_HOST || "127.0.0.1";

function notFound(res) {
  sendJson(res, 404, {
    ok: false,
    error: { code: "NOT_FOUND", message: "未找到对应接口。" },
  });
}

const server = createServer(async (req, res) => {
  if (!req.url || !req.method) {
    return notFound(res);
  }

  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

  if (!isOriginAllowed(req)) {
    return sendJson(res, 403, {
      ok: false,
      error: { code: "FORBIDDEN_ORIGIN", message: "不允许的来源。" },
    });
  }

  applyCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    return sendJson(res, 200, { ok: true });
  }

  if (!isAuthorized(req, url.pathname)) {
    return sendJson(res, 401, {
      ok: false,
      error: { code: "UNAUTHORIZED", message: "本地连接器授权失败。" },
    });
  }

  try {
    if (req.method === "GET" && url.pathname === "/v1/health") {
      return sendJson(res, 200, {
        ok: true,
        data: {
          name: "mail-local-connector",
          version: "0.1.0",
          status: "ready",
        },
      });
    }

    if (req.method === "GET" && url.pathname === "/v1/status") {
      const state = await readState();
      return sendJson(res, 200, {
        ok: true,
        data: {
          mailbox: {
            connected: state.mailbox.connected,
            provider: state.mailbox.provider,
            accountEmail: state.mailbox.accountEmail,
            selectedScopeCount: state.mailbox.selectedScopeIds.length,
            lastSyncAt: state.mailbox.lastSyncAt,
          },
          feishu: {
            connected: state.feishu.connected,
            lastSyncAt: state.feishu.savedAt,
          },
          metrics: state.metrics,
          runtime: {
            lastRunAt: state.jobs[0]?.createdAt ?? null,
            lastRunStatus: state.jobs[0]?.status ?? "idle",
          },
        },
      });
    }

    if (req.method === "POST" && url.pathname === "/v1/mail/connect") {
      const body = await parseJsonBody(req);
      const provider = normalizeProvider(body.provider);
      const authMode = body.authMode === "oauth" ? "oauth" : "app_password";
      const accountEmail = typeof body.email === "string" && body.email ? body.email.trim() : provider === "gmail" ? "team@gmail.com" : null;

      if (provider !== "gmail" && !accountEmail) {
        return sendJson(res, 400, {
          ok: false,
          error: { code: "INVALID_INPUT", message: "邮箱地址不能为空。" },
        });
      }

      if (provider === "gmail") {
        await updateState((state) => {
          state.mailbox.connected = true;
          state.mailbox.provider = provider;
          state.mailbox.authMode = authMode;
          state.mailbox.accountEmail = accountEmail;
          state.mailbox.nickname = body.nickname || null;
          state.mailbox.hasSecret = false;
          state.mailbox.secret = null;
          state.mailbox.availableScopes = getScopesForProvider(provider);
          state.mailbox.selectedScopeIds = state.mailbox.availableScopes.filter((item) => item.defaultEnabled).map((item) => item.id);
        });
        await appendLog("success", "Gmail 收件箱授权状态已记录，待下一阶段接入真实拉信能力。");

        return sendJson(res, 200, {
          ok: true,
          data: {
            provider,
            authMode,
            accountEmail,
            connected: true,
            mode: "oauth-placeholder",
          },
        });
      }

      const secret = typeof body.secret === "string" ? body.secret.trim() : "";
      if (!secret) {
        return sendJson(res, 400, {
          ok: false,
          error: { code: "INVALID_INPUT", message: "IMAP 授权码不能为空。" },
        });
      }

      const result = await connectImapMailbox({ email: accountEmail, secret });

      await updateState((state) => {
        state.mailbox.connected = true;
        state.mailbox.provider = provider;
        state.mailbox.authMode = authMode;
        state.mailbox.accountEmail = result.accountEmail;
        state.mailbox.nickname = body.nickname || null;
        state.mailbox.hasSecret = true;
        state.mailbox.secret = secret;
        state.mailbox.availableScopes = result.scopes;
        state.mailbox.selectedScopeIds = result.scopes.filter((item) => item.defaultEnabled).map((item) => item.id);
      });
      await appendLog("success", `已真实连接 ${provider} 邮箱，并获取 ${result.scopes.length} 个可抓取范围。`);

      return sendJson(res, 200, {
        ok: true,
        data: {
          provider,
          authMode,
          accountEmail: result.accountEmail,
          connected: true,
          scopesCount: result.scopes.length,
          connectionMeta: result.connectionMeta,
        },
      });
    }

    if (req.method === "GET" && url.pathname === "/v1/mail/scopes") {
      const state = await readState();
      return sendJson(res, 200, {
        ok: true,
        data: {
          provider: state.mailbox.provider,
          accountEmail: state.mailbox.accountEmail,
          items: state.mailbox.availableScopes,
        },
      });
    }

    if (req.method === "POST" && url.pathname === "/v1/mail/scopes") {
      const body = await parseJsonBody(req);
      const scopes = Array.isArray(body.scopes) ? body.scopes : [];
      await updateState((state) => {
        state.mailbox.includeSent = body.includeSent ?? state.mailbox.includeSent;
        state.mailbox.excludeSystemFolders = body.excludeSystemFolders ?? state.mailbox.excludeSystemFolders;
        state.mailbox.onlyUnread = body.onlyUnread ?? state.mailbox.onlyUnread;
        state.mailbox.maxEmailsPerRun = body.maxEmailsPerRun ?? state.mailbox.maxEmailsPerRun;
        state.mailbox.uploadPolicy = body.uploadPolicy ?? state.mailbox.uploadPolicy;
        state.mailbox.selectedScopeIds = scopes.filter((item) => item.enabled).map((item) => item.id);
      });
      await appendLog("info", `抓取范围已保存，共选择 ${scopes.filter((item) => item.enabled).length} 个范围。`);
      return sendJson(res, 200, { ok: true, data: { message: "抓取范围已保存。" } });
    }

    if (req.method === "POST" && url.pathname === "/v1/feishu/connect") {
      const body = await parseJsonBody(req);
      if (typeof body.webhookUrl !== "string" || !body.webhookUrl.trim()) {
        return sendJson(res, 400, {
          ok: false,
          error: { code: "INVALID_INPUT", message: "飞书 Webhook 不能为空。" },
        });
      }
      await updateState((state) => {
        state.feishu.connected = true;
        state.feishu.webhookUrl = body.webhookUrl.trim();
        state.feishu.savedAt = new Date().toISOString();
      });
      await appendLog("success", "飞书 Webhook 已保存，后续结果可写回飞书。");
      return sendJson(res, 200, { ok: true, data: { message: "飞书配置已保存。" } });
    }

    if (req.method === "POST" && url.pathname === "/v1/parse/run") {
      const body = await parseJsonBody(req);
      const result = await startParseRun({ limit: body.limit ?? 50 });
      return sendJson(res, 200, { ok: true, data: result });
    }

    if (req.method === "GET" && url.pathname === "/v1/history-imports") {
      const items = await listHistoryImports();
      return sendJson(res, 200, { ok: true, data: { items } });
    }

    if (req.method === "POST" && url.pathname === "/v1/history-imports") {
      const body = await parseJsonBody(req);
      let corpusPath = "";

      if (typeof body.corpusPath === "string" && body.corpusPath.trim()) {
        try {
          corpusPath = await resolveAllowedCorpusPath(body.corpusPath);
        } catch (error) {
          return sendJson(res, 400, {
            ok: false,
            error: { code: "INVALID_INPUT", message: error instanceof Error ? error.message : "本地目录不可用。" },
          });
        }
      }

      let item;
      try {
        item = await createHistoryImport({
          id: typeof body.id === "string" ? body.id : undefined,
          corpusPath,
          keywords: Array.isArray(body.keywords) ? body.keywords.filter((entry) => typeof entry === "string") : [],
          limit: typeof body.limit === "number" ? body.limit : 0,
        });
      } catch (error) {
        return sendJson(res, 400, {
          ok: false,
          error: { code: "INVALID_INPUT", message: error instanceof Error ? error.message : "历史解析任务创建失败。" },
        });
      }

      if (corpusPath) {
        queueMicrotask(() => {
          runHistoryImportTask({ id: item.id, corpusPath, keywords: item.keywords, limit: item.limit }).catch(() => null);
        });
      }

      return sendJson(res, 200, { ok: true, data: item });
    }

    if (req.method === "GET" && url.pathname.startsWith("/v1/history-imports/")) {
      const importId = url.pathname.replace("/v1/history-imports/", "");
      const item = await getHistoryImport(importId);
      if (!item) {
        return sendJson(res, 404, {
          ok: false,
          error: { code: "NOT_FOUND", message: "历史解析任务不存在。" },
        });
      }
      const artifacts = await listImportArtifacts(importId);
      return sendJson(res, 200, { ok: true, data: { ...item, artifacts } });
    }

    if (req.method === "POST" && url.pathname.startsWith("/v1/history-imports/") && url.pathname.endsWith("/upload")) {
      const importId = url.pathname.replace("/v1/history-imports/", "").replace("/upload", "");
      if (!isSafeHistoryImportId(importId)) {
        return sendJson(res, 400, {
          ok: false,
          error: { code: "INVALID_INPUT", message: "历史解析任务 ID 不合法。" },
        });
      }
      const formData = await parseMultipartFormData(req);
      const file = formData.getFile("file");
      if (!file) {
        return sendJson(res, 400, {
          ok: false,
          error: { code: "INVALID_INPUT", message: "请上传 ZIP 文件。" },
        });
      }

      const keywordsValue = formData.get("keywords");
      const limitValue = formData.get("limit");
      const parsedKeywords = typeof keywordsValue === "string"
        ? (() => {
            try {
              const value = JSON.parse(keywordsValue);
              return Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : [];
            } catch {
              return [];
            }
          })()
        : [];
      const parsedLimit = typeof limitValue === "string" ? Number(limitValue) || 0 : 0;

      let item = await getHistoryImport(importId);
      if (!item) {
        item = await createHistoryImport({ id: importId, corpusPath: "", keywords: parsedKeywords, limit: parsedLimit });
      }

      let saved;
      try {
        saved = await saveUploadedZipAndExtract(importId, file);
      } catch (error) {
        return sendJson(res, 400, {
          ok: false,
          error: { code: "INVALID_UPLOAD", message: error instanceof Error ? error.message : "上传文件无效。" },
        });
      }
      const effectiveKeywords = parsedKeywords.length ? parsedKeywords : item.keywords;
      const effectiveLimit = parsedLimit > 0 ? parsedLimit : item.limit;
      const latest = await updateHistoryImport(importId, {
        corpusPath: saved.extractedDir,
        status: "created",
        keywords: effectiveKeywords,
        limit: effectiveLimit,
      });

      queueMicrotask(() => {
        runHistoryImportTask({ id: importId, corpusPath: saved.extractedDir, keywords: effectiveKeywords, limit: effectiveLimit }).catch(() => null);
      });

      return sendJson(res, 200, { ok: true, data: { id: importId, extractedDir: saved.extractedDir, item: latest } });
    }

    if (req.method === "GET" && url.pathname === "/v1/logs") {
      const limit = Number(url.searchParams.get("limit") || 50);
      const state = await readState();
      return sendJson(res, 200, {
        ok: true,
        data: {
          items: state.logs.slice(0, limit),
        },
      });
    }

    if (req.method === "GET" && url.pathname.startsWith("/v1/jobs/")) {
      const jobId = url.pathname.replace("/v1/jobs/", "");
      const job = await getJob(jobId);
      if (!job) {
        return sendJson(res, 404, {
          ok: false,
          error: { code: "NOT_FOUND", message: "任务不存在。" },
        });
      }
      return sendJson(res, 200, { ok: true, data: job });
    }

    if (req.method === "GET" && url.pathname === "/v1/jobs") {
      const jobs = await listJobs();
      return sendJson(res, 200, { ok: true, data: { items: jobs } });
    }

    return notFound(res);
  } catch (error) {
    await appendLog("error", error instanceof Error ? error.message : "本地连接器内部错误。");
    return sendJson(res, 500, {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "本地连接器内部错误。",
      },
    });
  }
});

server.listen(PORT, HOST, async () => {
  await appendLog("info", `本地连接器已启动： http://${HOST}:${PORT}/v1/health`);
  if (!process.env.LOCAL_CONNECTOR_TOKEN) {
    await appendLog("info", "LOCAL_CONNECTOR_TOKEN 未配置，仅依赖 loopback 与 Origin 限制。");
  }
  console.log(`local-connector listening on http://${HOST}:${PORT}`);
});
