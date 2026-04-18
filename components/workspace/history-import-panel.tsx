"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/shared/card";
import { createHistoryImport, getHistoryImport, listHistoryImports, uploadHistoryImportZip } from "@/lib/history-import-client";
import { resolveHistoryImportProviderName } from "@/lib/history-import-provider";

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
};

export function HistoryImportPanel() {
  const [imports, setImports] = useState<HistoryImportItem[]>([]);
  const [keywords, setKeywords] = useState("miniso skg duet");
  const [state, setState] = useState("");
  const [providerName, setProviderName] = useState<"local" | "web">("web");
  const [file, setFile] = useState<File | null>(null);

  async function refresh() {
    const items = await listHistoryImports();
    setImports(items);
  }

  useEffect(() => {
    resolveHistoryImportProviderName().then(setProviderName).catch(() => setProviderName("web"));
    refresh().catch(() => null);
  }, []);

  useEffect(() => {
    const running = imports.find((item) => item.status === "running" || item.status === "created");
    if (!running) return;
    const timer = window.setInterval(async () => {
      const latest = await getHistoryImport(running.id);
      setImports((prev) => [latest, ...prev.filter((item) => item.id !== latest.id)]);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [imports]);

  async function handleCreate() {
    try {
      if (!file) {
        setState("请先选择 ZIP 文件。");
        return;
      }
      setState("正在创建历史解析任务...");
      const parsedKeywords = keywords.split(/\s+/).filter(Boolean);
      const item = await createHistoryImport({
        keywords: parsedKeywords,
      });
      const uploaded = await uploadHistoryImportZip(item.id, file, { keywords: parsedKeywords });
      const latest = uploaded?.item ?? (await getHistoryImport(item.id));
      setImports((prev) => [latest, ...prev.filter((entry) => entry.id !== latest.id)]);
      setState(`任务 ${item.id} 已创建并开始解析。`);
    } catch (error) {
      setState(error instanceof Error ? error.message : "创建任务失败。");
    }
  }

  const latest = imports[0] ?? null;
  const topRows = useMemo(() => latest?.result?.leadReviewRows?.slice(0, 5) ?? [], [latest]);
  const hasCompletedWithoutHits = Boolean(latest?.status === "completed" && latest.result && latest.result.stats.checked > 0 && latest.result.stats.matched === 0);
  const failedItemCount = latest?.result?.items?.filter((item) => item.error).length ?? 0;

  return (
    <Card className="mt-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[56ch]">
          <p className="text-[11px] uppercase tracking-[0.16em] text-text-2">历史邮件解析</p>
          <h3 className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-text-0">上传 ZIP 批量解析</h3>
          <p className="mt-3 text-sm leading-7 text-text-1">上传历史 EML ZIP，输入关键词，在线查看 lead review / currentStatus。当前优先走{providerName === "local" ? "本地连接器解析" : "网页 fallback 解析"}，先验证完整闭环。</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-text-2">Prototype</div>
      </div>

      <div className="mt-5 grid gap-3">
        <input
          type="file"
          accept=".zip"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="h-12 w-full rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-text-0 file:mr-4 file:border-0 file:bg-transparent file:text-sm file:font-medium"
        />
        <input
          value={keywords}
          onChange={(event) => setKeywords(event.target.value)}
          placeholder="关键词，用空格分隔"
          className="h-12 w-full rounded-[16px] border border-white/10 bg-white/[0.04] px-4 text-sm text-text-0 placeholder:text-text-2"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex h-10 items-center justify-center rounded-[14px] bg-brand-0 px-4 text-sm font-semibold text-white transition hover:brightness-110"
          style={{ boxShadow: "var(--glow-brand)" }}
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
                <div className="rounded-[16px] bg-white/[0.03] px-4 py-4"><div className="text-[11px] uppercase tracking-[0.16em] text-text-2">检查邮件</div><div className="mt-2 text-2xl font-semibold text-text-0">{latest.result.stats.checked}</div></div>
                <div className="rounded-[16px] bg-white/[0.03] px-4 py-4"><div className="text-[11px] uppercase tracking-[0.16em] text-text-2">关键词命中</div><div className="mt-2 text-2xl font-semibold text-text-0">{latest.result.stats.matched}</div><div className="mt-1 text-xs text-text-2">过滤 {latest.result.stats.filteredOut}</div></div>
                <div className="rounded-[16px] bg-white/[0.03] px-4 py-4"><div className="text-[11px] uppercase tracking-[0.16em] text-text-2">会话数</div><div className="mt-2 text-2xl font-semibold text-text-0">{latest.result.stats.conversationGroups}</div></div>
                <div className="rounded-[16px] bg-white/[0.03] px-4 py-4"><div className="text-[11px] uppercase tracking-[0.16em] text-text-2">待人工复核</div><div className="mt-2 text-2xl font-semibold text-text-0">{latest.result.stats.manualReview}</div></div>
              </div>

              <div className="space-y-3">
                {topRows.map((row, index) => (
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
