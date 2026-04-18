"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/shared/card";
import { HistoryImportPanel } from "@/components/workspace/history-import-panel";
import { MailConnectorModal } from "@/components/workspace/mail-connector-modal";
import { listHistoryImports } from "@/lib/history-import-client";
import { resolveHistoryImportProviderName } from "@/lib/history-import-provider";
import {
  fetchConnectorJobs,
  fetchConnectorLogs,
  fetchConnectorScopes,
  fetchConnectorStatus,
  saveConnectorScopes,
  startConnectorRun,
} from "@/lib/local-connector";
import { feishuSetup, workspaceMetrics } from "@/lib/workspace-content";
import type { SavedMailConfig } from "@/types/mail-connector";

type ConnectorStatus = {
  mailbox?: {
    connected: boolean;
    provider: string | null;
    accountEmail: string | null;
    selectedScopeCount: number;
    lastSyncAt: string | null;
  };
  feishu?: {
    connected: boolean;
    lastSyncAt: string | null;
  };
  metrics?: {
    pendingEmails: number;
    syncedRows: number;
    remainingCredits: number;
    activeJobs: number;
  };
  runtime?: {
    lastRunAt: string | null;
    lastRunStatus: string | null;
  };
} | null;

type ConnectorLogItem = {
  ts: string;
  level: string;
  message: string;
};

type ConnectorJobItem = {
  jobId: string;
  status: string;
  total: number;
  processed: number;
  success: number;
  skipped: number;
  failed: number;
  createdAt: string;
};

type HistoryImportItem = {
  id: string;
  status: string;
  updatedAt: string;
  error?: string;
  result: null | {
    stats: {
      checked: number;
      matched: number;
      conversationGroups: number;
      manualReview: number;
    };
  };
};

type ScopeItem = {
  id: string;
  kind: string;
  remoteId: string;
  displayName: string;
  recommended: boolean;
  defaultEnabled: boolean;
  selectable: boolean;
  system: boolean;
};

type ActivePanel = "mailbox" | "feishu";

function PanelMetric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-[18px] bg-white/[0.03] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-text-2">{label}</p>
      <p className="mt-2 font-display text-[22px] font-semibold tracking-[-0.03em] text-text-0">{value}</p>
      <p className="mt-1 text-xs leading-5 text-text-2">{hint}</p>
    </div>
  );
}

function CompactStatPill({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="inline-flex min-w-[220px] items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2.5">
      <span className="text-[11px] uppercase tracking-[0.16em] text-text-2">{label}</span>
      <span className="text-base font-semibold text-text-0">{value}</span>
      <span className="min-w-0 truncate text-xs text-text-2">{hint}</span>
    </div>
  );
}

function ScopeBadge({ text, tone = "default" }: { text: string; tone?: "default" | "recommended" }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]",
        tone === "recommended"
          ? "border-[rgba(138,127,255,0.22)] bg-[rgba(110,99,255,0.12)] text-[#cbc5ff]"
          : "border-white/8 bg-white/[0.04] text-text-2",
      ].join(" ")}
    >
      {text}
    </span>
  );
}

function ScopeRow({
  scope,
  checked,
  helper,
  onChange,
}: {
  scope: ScopeItem;
  checked: boolean;
  helper: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-[12px] px-1 py-2 transition hover:bg-white/[0.025]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-white/15 bg-transparent"
        style={{ accentColor: "var(--brand-0)" }}
      />
      <div className="min-w-0 flex flex-1 items-center gap-2">
        <span className="truncate text-sm font-medium text-text-0">{scope.displayName}</span>
        <ScopeBadge text={scope.kind} />
        {scope.recommended ? <ScopeBadge text="推荐" tone="recommended" /> : null}
        <span className="min-w-0 truncate text-xs text-text-2">{helper}</span>
      </div>
    </label>
  );
}

function SegmentedControl({
  activePanel,
  onChange,
}: {
  activePanel: ActivePanel;
  onChange: (value: ActivePanel) => void;
}) {
  const items: Array<{ id: ActivePanel; label: string }> = [
    { id: "mailbox", label: "收件箱配置" },
    { id: "feishu", label: "飞书配置" },
  ];

  return (
    <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
      {items.map((item) => {
        const active = item.id === activePanel;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={[
              "inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition",
              active ? "border border-white/10 bg-white/[0.08] text-text-0" : "text-text-2 hover:text-text-0",
            ].join(" ")}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function LogPanel({
  logs,
  latestJob,
  latestImport,
  historyImportProvider,
  loading,
}: {
  logs: ConnectorLogItem[];
  latestJob: ConnectorJobItem | null;
  latestImport: HistoryImportItem | null;
  historyImportProvider: "local" | "web";
  loading: boolean;
}) {
  return (
    <Card className="p-4 sm:p-5 xl:sticky xl:top-24">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-text-2">实时运行日志</p>
          <h3 className="mt-2 text-base font-semibold text-text-0">防弹玻璃：只展示机器在干活</h3>
          <p className="mt-2 text-sm leading-6 text-text-2">右侧固定保留，切换配置时不打断机器正在做的事情。</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-text-2">
          {loading ? "同步中" : logs.length ? `最近 ${Math.min(logs.length, 6)} 条` : "等待运行"}
        </div>
      </div>
      {latestJob || latestImport ? (
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-text-2">
          {latestJob ? (
            <>
              <div className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
                本地任务：{latestJob.status}
              </div>
              <div className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
                处理 {latestJob.processed}/{latestJob.total}
              </div>
              <div className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
                成功 {latestJob.success} · 跳过 {latestJob.skipped} · 失败 {latestJob.failed}
              </div>
            </>
          ) : null}
          {latestImport ? (
            <>
              <div className="inline-flex items-center rounded-full border border-[rgba(138,127,255,0.22)] bg-[rgba(110,99,255,0.12)] px-3 py-1.5 text-[#cbc5ff]">
                历史解析：{latestImport.status} · {historyImportProvider === "local" ? "本地连接器" : "网页 fallback"}
              </div>
              {latestImport.result?.stats ? (
                <div className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
                  检查 {latestImport.result.stats.checked} · 命中 {latestImport.result.stats.matched} · 会话 {latestImport.result.stats.conversationGroups}
                </div>
              ) : null}
              {latestImport.error ? (
                <div className="inline-flex items-center rounded-full border border-[rgba(248,113,113,0.18)] bg-[rgba(248,113,113,0.08)] px-3 py-1.5 text-[#fca5a5]">
                  {latestImport.error}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
      <div className="mt-4 overflow-hidden rounded-[18px] border border-white/[0.06] bg-[rgba(7,9,14,0.72)]">
        <div className="border-b border-white/[0.06] px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-text-2">
          Local connector runtime log
        </div>
        <div className="max-h-[560px] overflow-y-auto px-4 py-2 font-mono text-sm leading-6 text-text-1 xl:min-h-[560px]">
          {logs.length ? (
            logs.map((item, index) => (
              <div key={`${item.ts}-${index}`} className={index === 0 ? "flex gap-3 py-3" : "flex gap-3 border-t border-white/[0.06] py-3"}>
                <span
                  className="mt-2 inline-block h-2 w-2 rounded-full"
                  style={{
                    background:
                      item.level === "error"
                        ? "#f87171"
                        : item.level === "success"
                          ? "var(--green-0)"
                          : "rgba(255,255,255,0.28)",
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-text-2">{new Date(item.ts).toLocaleString()}</div>
                  <div>{item.message}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-sm text-text-2">本地连接器尚未产生运行日志。</div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function WorkspaceOverview({
  email,
  mailboxConfig,
}: {
  email?: string | null;
  mailboxConfig?: SavedMailConfig | null;
}) {
  const [activePanel, setActivePanel] = useState<ActivePanel>("mailbox");
  const [isConnectorOpen, setIsConnectorOpen] = useState(false);
  const [webhook, setWebhook] = useState(mailboxConfig?.feishuWebhookUrl ?? "");
  const [feishuState, setFeishuState] = useState(mailboxConfig?.feishuWebhookUrl ? "Webhook 已保存。" : "");
  const [connectorStatus, setConnectorStatus] = useState<ConnectorStatus>(null);
  const [connectorLogs, setConnectorLogs] = useState<ConnectorLogItem[]>([]);
  const [connectorJobs, setConnectorJobs] = useState<ConnectorJobItem[]>([]);
  const [historyImports, setHistoryImports] = useState<HistoryImportItem[]>([]);
  const [historyImportProvider, setHistoryImportProvider] = useState<"local" | "web">("web");
  const [runState, setRunState] = useState<string>("");
  const [availableScopes, setAvailableScopes] = useState<ScopeItem[]>([]);
  const [selectedScopeIds, setSelectedScopeIds] = useState<string[]>([]);
  const [scopeState, setScopeState] = useState("");

  useEffect(() => {
    async function loadConnectorStatus() {
      try {
        const provider = await resolveHistoryImportProviderName();
        setHistoryImportProvider(provider);
        const [status, logs, jobs, imports] = await Promise.all([
          fetchConnectorStatus(),
          fetchConnectorLogs(50),
          fetchConnectorJobs(),
          listHistoryImports(),
        ]);
        setConnectorStatus(status);
        setConnectorLogs(logs);
        setConnectorJobs(jobs);
        setHistoryImports(imports);
      } catch {
        setConnectorStatus(null);
      }
    }

    loadConnectorStatus();
  }, []);

  useEffect(() => {
    async function loadScopes() {
      if (!connectorStatus?.mailbox?.connected) return;
      try {
        const data = await fetchConnectorScopes();
        const items = (data?.items ?? []) as ScopeItem[];
        setAvailableScopes(items);
        const defaultSelected = items.filter((item) => item.defaultEnabled).map((item) => item.id);
        setSelectedScopeIds(defaultSelected);
        setScopeState(items.length ? "" : "当前邮箱未返回可用范围。");
      } catch (error) {
        setScopeState(error instanceof Error ? error.message : "获取抓取范围失败。");
      }
    }

    loadScopes();
  }, [connectorStatus?.mailbox?.connected]);

  useEffect(() => {
    const runningJob = connectorJobs.find((item) => item.status === "running");
    const runningImport = historyImports.find((item) => item.status === "running" || item.status === "created");
    if (!runningJob && !runningImport) return;

    const timer = window.setInterval(async () => {
      try {
        const provider = await resolveHistoryImportProviderName();
        setHistoryImportProvider(provider);
        const [status, logs, jobs, imports] = await Promise.all([
          fetchConnectorStatus(),
          fetchConnectorLogs(50),
          fetchConnectorJobs(),
          listHistoryImports(),
        ]);
        setConnectorStatus(status);
        setConnectorLogs(logs);
        setConnectorJobs(jobs);
        setHistoryImports(imports);
      } catch {
        // ignore transient polling failures
      }
    }, 1500);

    return () => window.clearInterval(timer);
  }, [connectorJobs, historyImports]);

  async function handleCopyTemplate() {
    const template = ["达人ID", "平台", "当前网红报价", "最后一封邮件回复时间", "邮件进度", "AI 阶段摘要"].join("\t");

    await navigator.clipboard.writeText(template);
    setFeishuState("飞书模板字段已复制，去飞书粘贴后即可继续连接。");
  }

  async function postWebhook(action: "test" | "save") {
    try {
      setFeishuState(action === "test" ? "正在测试 Webhook..." : "正在保存 Webhook...");
      const response = await fetch("/api/workspace-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, webhook }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || "操作失败，请稍后再试。");
      }

      setFeishuState(data.message || "操作成功。");
      if (action === "save") {
        window.location.reload();
      }
    } catch (error) {
      setFeishuState(error instanceof Error ? error.message : "操作失败，请稍后再试。");
    }
  }

  async function handleSaveScopes() {
    try {
      await saveConnectorScopes({
        includeSent: true,
        excludeSystemFolders: true,
        onlyUnread: false,
        maxEmailsPerRun: 50,
        uploadPolicy: "selected-and-related-thread",
        scopes: availableScopes.map((item) => ({ id: item.id, enabled: selectedScopeIds.includes(item.id) })),
      });
      setScopeState(`已保存 ${selectedScopeIds.length} 个范围。`);
      const status = await fetchConnectorStatus();
      setConnectorStatus(status);
    } catch (error) {
      setScopeState(error instanceof Error ? error.message : "抓取范围保存失败。");
    }
  }

  async function handleStartRun() {
    try {
      setRunState("正在启动本地同步...");
      const result = await startConnectorRun();
      setRunState(result?.runId ? `已启动 ${result.runId}` : "本地同步已启动。");
      const [status, logs, jobs, imports] = await Promise.all([
        fetchConnectorStatus(),
        fetchConnectorLogs(50),
        fetchConnectorJobs(),
        listHistoryImports(),
      ]);
      setConnectorStatus(status);
      setConnectorLogs(logs);
      setConnectorJobs(jobs);
      setHistoryImports(imports);
    } catch (error) {
      setRunState(error instanceof Error ? error.message : "启动本地同步失败。");
    }
  }

  const connectorMailbox = connectorStatus?.mailbox;
  const latestJob = connectorJobs[0] ?? null;
  const latestImport = historyImports[0] ?? null;
  const isJobRunning = connectorJobs.some((item) => item.status === "running");
  const inboxStatus = connectorMailbox?.connected
    ? `已连接 · ${connectorMailbox.accountEmail}`
    : mailboxConfig?.connected
      ? `网页已保存 · ${mailboxConfig.email}`
      : "未连接";
  const inboxDetail = connectorMailbox?.connected
    ? `本地连接器：${connectorMailbox.provider} · 已选择 ${connectorMailbox.selectedScopeCount} 个抓取范围`
    : mailboxConfig?.connected
      ? "网页侧已保存配置，但本地连接器尚未握手。"
      : "连接收件箱后，系统才会开始实时抓取和解析邮件。";
  const feishuSaved = Boolean(mailboxConfig?.feishuWebhookUrl);
  const feishuSavedDetail = feishuSaved
    ? `已保存：${mailboxConfig?.feishuWebhookUrl?.slice(0, 36)}...`
    : "尚未保存 Webhook，完成后线索才能自动写入飞书。";

  const recommendedScopes = availableScopes.filter((scope) => scope.recommended && scope.selectable);
  const optionalScopes = availableScopes.filter((scope) => !scope.recommended && scope.selectable);
  const pendingMetric = {
    ...workspaceMetrics[0],
    value: connectorStatus?.metrics?.pendingEmails != null ? `${connectorStatus.metrics.pendingEmails} 封` : workspaceMetrics[0].value,
  };
  const syncedMetric = {
    ...workspaceMetrics[1],
    value: connectorStatus?.metrics?.syncedRows != null ? `${connectorStatus.metrics.syncedRows} 条` : workspaceMetrics[1].value,
  };
  const queueMetric = {
    ...workspaceMetrics[3],
    value: connectorStatus?.metrics?.activeJobs != null ? `${String(connectorStatus.metrics.activeJobs).padStart(2, "0")} 条` : workspaceMetrics[3].value,
    hint: isJobRunning && latestJob ? `进行中：${latestJob.processed}/${latestJob.total}` : workspaceMetrics[3].hint,
  };

  return (
    <>
      <div className="grid gap-4 pb-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] xl:items-start">
        <Card className="p-5 sm:p-6">
          <SegmentedControl activePanel={activePanel} onChange={setActivePanel} />

          {activePanel === "mailbox" ? (
            <div className="mt-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-[56ch]">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-text-2">收件箱配置</p>
                  <h3 className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-text-0">连接收件箱</h3>
                </div>
                <span
                  className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium"
                  style={{
                    background: connectorMailbox?.connected ? "rgba(52, 211, 153, 0.12)" : "rgba(255,255,255,0.04)",
                    borderColor: connectorMailbox?.connected ? "rgba(52, 211, 153, 0.18)" : "rgba(255,255,255,0.08)",
                    color: connectorMailbox?.connected ? "var(--green-0)" : "var(--text-1)",
                  }}
                >
                  {connectorMailbox?.connected ? "本地连接器已在线" : "等待连接收件箱"}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-sm text-text-1">
                  {inboxStatus}
                </div>
                <div className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-sm text-text-1">
                  {inboxDetail}
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <CompactStatPill label={pendingMetric.label} value={pendingMetric.value} hint={pendingMetric.hint} />
                <CompactStatPill label={queueMetric.label} value={queueMetric.value} hint={queueMetric.hint} />
              </div>

              {!connectorMailbox?.connected ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setIsConnectorOpen(true)}
                    className="inline-flex h-11 items-center justify-center rounded-[16px] bg-brand-0 px-5 text-sm font-semibold text-white transition hover:brightness-110"
                    style={{ boxShadow: "var(--glow-brand)" }}
                  >
                    点击弹窗授权连接
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {scopeState ? <div className="rounded-[16px] bg-white/[0.03] px-4 py-2.5 text-sm leading-6 text-text-1">{scopeState}</div> : null}

                  {recommendedScopes.length > 0 ? (
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-[11px] uppercase tracking-[0.16em] text-text-2">推荐范围</span>
                        <ScopeBadge text="默认优先" tone="recommended" />
                      </div>
                      <div className="overflow-hidden rounded-[14px] bg-white/[0.02] px-3 py-0.5">
                        {recommendedScopes.map((scope, index) => (
                          <div key={scope.id} className={index === 0 ? "" : "border-t border-white/[0.06]"}>
                            <ScopeRow
                              scope={scope}
                              checked={selectedScopeIds.includes(scope.id)}
                              helper="建议开启"
                              onChange={(checked) => {
                                setSelectedScopeIds((prev) =>
                                  checked ? [...new Set([...prev, scope.id])] : prev.filter((id) => id !== scope.id),
                                );
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {optionalScopes.length > 0 ? (
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-[11px] uppercase tracking-[0.16em] text-text-2">其他范围</span>
                        <ScopeBadge text="按需勾选" />
                      </div>
                      <div className="max-h-[220px] overflow-y-auto rounded-[14px] bg-white/[0.02] px-3 py-0.5">
                        {optionalScopes.map((scope, index) => (
                          <div key={scope.id} className={index === 0 ? "" : "border-t border-white/[0.06]"}>
                            <ScopeRow
                              scope={scope}
                              checked={selectedScopeIds.includes(scope.id)}
                              helper={scope.remoteId}
                              onChange={(checked) => {
                                setSelectedScopeIds((prev) =>
                                  checked ? [...new Set([...prev, scope.id])] : prev.filter((id) => id !== scope.id),
                                );
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveScopes}
                      className="inline-flex h-10 items-center justify-center rounded-[14px] bg-brand-0 px-4 text-sm font-semibold text-white transition hover:brightness-110"
                      style={{ boxShadow: "var(--glow-brand)" }}
                    >
                      保存抓取范围
                    </button>
                    <button
                      type="button"
                      onClick={handleStartRun}
                      disabled={isJobRunning}
                      className="inline-flex h-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/5 px-4 text-sm font-medium text-text-0 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isJobRunning ? "本地同步进行中" : "开始本地同步"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConnectorOpen(true)}
                      className="inline-flex h-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/5 px-4 text-sm font-medium text-text-0 transition hover:border-white/20 hover:bg-white/10"
                    >
                      重新连接邮箱
                    </button>
                  </div>
                  {runState ? <div className="text-xs text-text-2">{runState}</div> : null}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-[56ch]">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-text-2">飞书配置</p>
                  <h3 className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-text-0">连接飞书模板</h3>
                </div>
                <span
                  className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium"
                  style={{
                    background: feishuSaved ? "rgba(52, 211, 153, 0.12)" : "rgba(255,255,255,0.04)",
                    borderColor: feishuSaved ? "rgba(52, 211, 153, 0.18)" : "rgba(255,255,255,0.08)",
                    color: feishuSaved ? "var(--green-0)" : "var(--text-1)",
                  }}
                >
                  {feishuSaved ? "Webhook 已保存" : "等待填写 Webhook"}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-sm text-text-1">
                  {feishuSaved ? "已连接飞书模板" : "等待填写 Webhook"}
                </div>
                {feishuSaved ? (
                  <div className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-sm text-text-1">
                    {feishuSavedDetail}
                  </div>
                ) : null}
                <div className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-text-1">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-text-2">{syncedMetric.label}</span>
                  <span className="ml-3 font-semibold text-text-0">{syncedMetric.value}</span>
                  <span className="ml-3 text-xs text-text-2">{syncedMetric.hint}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleCopyTemplate}
                  className="inline-flex h-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/5 px-4 text-sm font-medium text-text-0 transition hover:border-white/20 hover:bg-white/10"
                >
                  {feishuSetup.buttonLabel}
                </button>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text-0">{feishuSetup.webhookLabel}</label>
                <input
                  value={webhook}
                  onChange={(event) => setWebhook(event.target.value)}
                  placeholder={feishuSetup.webhookPlaceholder}
                  className="h-12 w-full rounded-[16px] border border-white/10 bg-white/[0.04] px-4 text-sm text-text-0 placeholder:text-text-2"
                />
                <p className="mt-2 text-xs text-text-2">复制模板后再填写 Webhook。</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => postWebhook("test")}
                  className="inline-flex h-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/5 px-4 text-sm font-medium text-text-0 transition hover:border-white/20 hover:bg-white/10"
                >
                  测试 Webhook
                </button>
                <button
                  type="button"
                  onClick={() => postWebhook("save")}
                  className="inline-flex h-10 items-center justify-center rounded-[14px] bg-brand-0 px-4 text-sm font-semibold text-white transition hover:brightness-110"
                  style={{ boxShadow: "var(--glow-brand)" }}
                >
                  保存 Webhook
                </button>
              </div>

              {feishuState ? <div className="rounded-[16px] bg-white/[0.03] px-4 py-2.5 text-sm leading-6 text-text-1">{feishuState}</div> : null}
            </div>
          )}
        </Card>

        <LogPanel
          logs={connectorLogs}
          latestJob={latestJob}
          latestImport={latestImport}
          historyImportProvider={historyImportProvider}
          loading={isJobRunning || latestImport?.status === "running" || latestImport?.status === "created"}
        />
      </div>

      <HistoryImportPanel />
      <MailConnectorModal open={isConnectorOpen} onClose={() => setIsConnectorOpen(false)} savedConfig={mailboxConfig} />
    </>
  );
}
