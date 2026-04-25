"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/shared/card";
import {
  createHistoryImportForProvider,
  getHistoryImportForProvider,
  listHistoryImportsForProvider,
  uploadHistoryImportZipForProvider,
} from "@/lib/history-import-client";
import { resolveHistoryImportProviderName, type HistoryImportProviderName } from "@/lib/history-import-provider";

type HistoryImportItem = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  keywords: string[];
  corpusPath: string;
  limit: number;
  result: null | {
    stats: {
      checked: number;
      parsed: number;
      failed: number;
      matched: number;
      filteredOut: number;
      conversationGroups: number;
      withPlatform: number;
      withPrice: number;
      withCreator: number;
      manualReview: number;
    };
    items?: Array<{
      fileName: string;
      error?: string;
    }>;
    leadReviewRows: Array<{
      priority: string;
      matchedKeywords: string[];
      currentStatus: string;
      creatorIds: string[];
      quotedPrices: string[];
      nextAction: string;
      preview: string;
    }>;
  };
  artifacts?: {
    fileCount: number;
    sampleFiles: string[];
  };
  error?: string;
};

function parseLimitInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (!/^\d+$/.test(trimmed)) {
    throw new Error("数量上限请输入正整数；留空表示不限制。");
  }

  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error("数量上限请输入正整数；留空表示不限制。");
  }
  return parsed;
}

export function HistoryImportPanel() {
  const [imports, setImports] = useState<HistoryImportItem[]>([]);
  const [keywords, setKeywords] = useState("miniso skg duet");
  const [state, setState] = useState("");
  const [providerName, setProviderName] = useState<HistoryImportProviderName>("web");
  const [itemProviders, setItemProviders] = useState<Record<string, HistoryImportProviderName>>({});
  const [file, setFile] = useState<File | null>(null);
  const [localDirectoryPath, setLocalDirectoryPath] = useState(
    "/Volumes/GPFS/Users/a1234/Desktop/shared-mailbox-sync-export-20260415-113707/data/raw/partnerships_amagency.biz-b7630055",
  );
  const [localLimit, setLocalLimit] = useState("300");

  async function refresh() {
    const provider = await resolveHistoryImportProviderName();
    setProviderName(provider);
    const items = await listHistoryImportsForProvider(provider);
    setImports(items);
    setItemProviders((prev) => {
      const next = { ...prev };
      for (const item of items) next[item.id] = provider;
      return next;
    });
  }

  useEffect(() => {
    refresh().catch(() => null);
  }, []);

  useEffect(() => {
    const running = imports.find((item) => item.status === "running" || item.status === "created");
    if (!running) return;
    const provider = itemProviders[running.id] ?? providerName;
    const timer = window.setInterval(async () => {
      try {
        const latest = await getHistoryImportForProvider(provider, running.id);
        setImports((prev) => [latest, ...prev.filter((item) => item.id !== latest.id)]);
        setItemProviders((prev) => ({ ...prev, [latest.id]: provider }));
      } catch (error) {
        setState(error instanceof Error ? error.message : "刷新任务状态失败。");
      }
    }, 1500);
    return () => window.clearInterval(timer);
  }, [imports, itemProviders, providerName]);

  async function handleCreate() {
    try {
      if (!file) {
        setState("请先选择 ZIP 文件。");
        return;
      }
      setState("正在创建历史解析任务...");
      const provider = await resolveHistoryImportProviderName();
      setProviderName(provider);
      const parsedKeywords = keywords.split(/\s+/).filter(Boolean);
      const item = await createHistoryImportForProvider(provider, {
        keywords: parsedKeywords,
      });
      setItemProviders((prev) => ({ ...prev, [item.id]: provider }));
      const uploaded = await uploadHistoryImportZipForProvider(provider, item.id, file, { keywords: parsedKeywords });
      const latest = uploaded?.item ?? (await getHistoryImportForProvider(provider, item.id));
      setImports((prev) => [latest, ...prev.filter((entry) => entry.id !== latest.id)]);
      setItemProviders((prev) => ({ ...prev, [latest.id]: provider }));
      setState(`任务 ${item.id} 已创建并开始解析。`);
    } catch (error) {
      setState(error instanceof Error ? error.message : "创建任务失败。");
    }
  }

  async function handleCreateFromDirectory() {
    try {
      const provider = await resolveHistoryImportProviderName();
      setProviderName(provider);
      if (provider !== "local") {
        setState("请先启动本地连接器，再扫描本地目录。");
        return;
      }

      const corpusPath = localDirectoryPath.trim();
      if (!corpusPath) {
        setState("请先填写本地邮件目录路径。");
        return;
      }

      setState("正在创建本地目录解析任务...");
      const parsedKeywords = keywords.split(/\s+/).filter(Boolean);
      const parsedLimit = parseLimitInput(localLimit);
      const item = await createHistoryImportForProvider(provider, {
        corpusPath,
        keywords: parsedKeywords,
        limit: parsedLimit,
      });
      setImports((prev) => [item, ...prev.filter((entry) => entry.id !== item.id)]);
      setItemProviders((prev) => ({ ...prev, [item.id]: provider }));
      setState(`任务 ${item.id} 已创建，正在本地扫描目录。`);
    } catch (error) {
      setState(error instanceof Error ? error.message : "创建本地目录任务失败。");
    }
  }

  const latest = imports[0] ?? null;
  const previewRows = useMemo(() => latest?.result?.leadReviewRows?.slice(0, 50) ?? [], [latest]);
  const hasCompletedWithoutHits = Boolean(latest?.status === "completed" && latest.result && latest.result.stats.checked > 0 && latest.result.stats.parsed > 0 && latest.result.stats.failed === 0 && latest.result.stats.matched === 0);
  const failedItemCount = latest?.result?.items?.filter((item) => item.error).length ?? 0;
  const totalLeadRows = latest?.result?.leadReviewRows?.length ?? 0;
  const checkedLimitLabel = latest?.limit ? `上限 ${latest.limit}` : "不限制";

  return (
    <Card className="mt-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[56ch]">
          <p className="text-[11px] uppercase tracking-[0.16em] text-text-2">历史邮件解析</p>
          <h3 className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-text-0">本地目录 / ZIP 批量解析</h3>
          <p className="mt-3 text-sm leading-7 text-text-1">本地连接器在线时可直接扫描本地 EML 目录；小样本仍可上传 ZIP。当前优先走{providerName === "local" ? "本地连接器解析" : "网页 fallback 解析"}。</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-text-2">Prototype</div>
      </div>

      <div className="mt-5 grid gap-3">
        <input
          value={localDirectoryPath}
          onChange={(event) => setLocalDirectoryPath(event.target.value)}
          placeholder="本地 EML 目录路径"
          className="h-12 w-full rounded-[16px] border border-white/10 bg-white/[0.04] px-4 text-sm text-text-0 placeholder:text-text-2"
        />
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
          <input
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
            placeholder="关键词，用空格分隔；留空表示全部"
            className="h-12 w-full rounded-[16px] border border-white/10 bg-white/[0.04] px-4 text-sm text-text-0 placeholder:text-text-2"
          />
          <input
            value={localLimit}
            onChange={(event) => setLocalLimit(event.target.value)}
            placeholder="数量上限"
            className="h-12 w-full rounded-[16px] border border-white/10 bg-white/[0.04] px-4 text-sm text-text-0 placeholder:text-text-2"
          />
        </div>
        <input
          type="file"
          accept=".zip"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="h-12 w-full rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-text-0 file:mr-4 file:border-0 file:bg-transparent file:text-sm file:font-medium"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleCreateFromDirectory}
          className="inline-flex h-10 items-center justify-center rounded-[14px] bg-brand-0 px-4 text-sm font-semibold text-white transition hover:brightness-110"
          style={{ boxShadow: "var(--glow-brand)" }}
        >
          扫描本地目录
        </button>
        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex h-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/5 px-4 text-sm font-medium text-text-0 transition hover:border-white/20 hover:bg-white/10"
        >
          上传并创建历史解析任务
        </button>
        <button
          type="button"
          onClick={() => refresh().catch(() => null)}
          className="inline-flex h-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/5 px-4 text-sm font-medium text-text-0 transition hover:border-white/20 hover:bg-white/10"
        >
          刷新任务列表
        </button>
      </div>

      {state ? <div className="mt-3 text-xs text-text-2">{state}</div> : null}

      {latest ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-[16px] bg-white/[0.03] px-4 py-3 text-sm text-text-1">
            最新任务：{latest.id} · {latest.status}
          </div>
          {latest.status === "failed" && latest.error ? (
            <div className="rounded-[16px] border border-[rgba(248,113,113,0.18)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-sm text-[#fca5a5]">
              任务失败：{latest.error}
            </div>
          ) : null}
          {latest.result ? (
            <>
              {hasCompletedWithoutHits ? (
                <div className="rounded-[16px] border border-[rgba(52,211,153,0.18)] bg-[rgba(52,211,153,0.08)] px-4 py-3 text-sm text-[#b9f5d6]">
                  已检查 {latest.result.stats.checked} 封邮件，解析成功，但当前关键词没有命中结果。未命中 {latest.result.stats.filteredOut} 封。
                </div>
              ) : null}
              {failedItemCount > 0 ? (
                <div className="rounded-[16px] border border-[rgba(248,113,113,0.18)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-sm text-[#fca5a5]">
                  本次有 {failedItemCount} 封邮件解析失败，请优先检查原始 EML 内容。
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[16px] bg-white/[0.03] px-4 py-4"><div className="text-[11px] uppercase tracking-[0.16em] text-text-2">检查邮件</div><div className="mt-2 text-2xl font-semibold text-text-0">{latest.result.stats.checked}</div><div className="mt-1 text-xs text-text-2">{checkedLimitLabel}{latest.artifacts?.fileCount ? ` · 目录 ${latest.artifacts.fileCount}` : ""} · 成功 {latest.result.stats.parsed} · 失败 {latest.result.stats.failed}</div></div>
                <div className="rounded-[16px] bg-white/[0.03] px-4 py-4"><div className="text-[11px] uppercase tracking-[0.16em] text-text-2">关键词命中</div><div className="mt-2 text-2xl font-semibold text-text-0">{latest.result.stats.matched}</div><div className="mt-1 text-xs text-text-2">过滤 {latest.result.stats.filteredOut}</div></div>
                <div className="rounded-[16px] bg-white/[0.03] px-4 py-4"><div className="text-[11px] uppercase tracking-[0.16em] text-text-2">会话数</div><div className="mt-2 text-2xl font-semibold text-text-0">{latest.result.stats.conversationGroups}</div></div>
                <div className="rounded-[16px] bg-white/[0.03] px-4 py-4"><div className="text-[11px] uppercase tracking-[0.16em] text-text-2">待人工复核</div><div className="mt-2 text-2xl font-semibold text-text-0">{latest.result.stats.manualReview}</div></div>
              </div>

              <div className="rounded-[16px] bg-white/[0.03] px-4 py-3 text-sm text-text-1">
                线索预览：显示 {previewRows.length} / {totalLeadRows}
              </div>

              <div className="space-y-3">
                {previewRows.map((row, index) => (
                  <div key={index} className="rounded-[16px] border border-white/[0.06] bg-white/[0.02] px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-text-2">
                      <span>{row.priority}</span>
                      <span>·</span>
                      <span>{row.currentStatus}</span>
                      <span>·</span>
                      <span>{row.matchedKeywords.join(" / ")}</span>
                    </div>
                    <div className="mt-2 text-sm font-medium text-text-0">{row.creatorIds.join(" / ") || "待确认达人"}</div>
                    <div className="mt-2 text-sm text-text-1">{row.preview}</div>
                    <div className="mt-2 text-xs text-text-2">{row.nextAction}</div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
