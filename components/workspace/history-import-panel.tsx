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

type ResultView = "leads" | "creators" | "review";
type ConfidenceLabel = "high" | "medium" | "low";

type LeadReviewRow = {
  priority: string;
  matchedKeywords: string[];
  hitScoreMax?: number;
  messageCount?: number;
  latestReplyAt?: string | null;
  currentStatus: string;
  creatorIds: string[];
  platforms?: string[];
  quotedPrices: string[];
  intents?: string[];
  needsManualReview?: boolean;
  nextAction: string;
  preview: string;
  conversationKey?: string;
};

type CreatorProfileRow = {
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
  confidenceLabel: ConfidenceLabel;
  needsReview: boolean;
  reviewReasons: string[];
  conversationKeys?: string[];
  files?: string[];
  preview: string;
};

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
      creatorProfiles?: number;
    };
    items?: Array<{
      fileName: string;
      error?: string;
    }>;
    leadReviewRows: LeadReviewRow[];
    creatorProfiles?: CreatorProfileRow[];
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

function normalizeCreatorKey(value: string) {
  return String(value || "").trim().replace(/^@/, "").toLowerCase();
}

function clampConfidence(value: number) {
  return Math.max(0.1, Math.min(0.98, Number(value.toFixed(2))));
}

function chooseConfidenceLabel(confidence: number): ConfidenceLabel {
  if (confidence >= 0.78) return "high";
  if (confidence >= 0.55) return "medium";
  return "low";
}

function scoreLeadRow(row: LeadReviewRow, creatorId: string | null) {
  let score = 0.24;
  if (creatorId) score += 0.3;
  if (row.platforms?.length) score += 0.18;
  if (row.quotedPrices?.length) score += 0.16;
  if ((row.messageCount || 0) > 1) score += 0.08;
  if ((row.creatorIds || []).length > 1) score -= 0.12;
  if (row.needsManualReview) score -= 0.08;
  return clampConfidence(score);
}

function buildReviewReasons(row: LeadReviewRow, creatorId: string | null) {
  const reasons: string[] = [];
  if (!creatorId) reasons.push("缺达人ID");
  if (!row.platforms?.length) reasons.push("缺平台");
  if (!row.quotedPrices?.length) reasons.push("缺报价");
  if ((row.creatorIds || []).length > 1) reasons.push("多达人候选");
  if (row.needsManualReview) reasons.push("邮件需复核");
  return reasons;
}

function buildClientCreatorProfilesFromLeadRows(rows: LeadReviewRow[]): CreatorProfileRow[] {
  const profiles = new Map<string, any>();

  rows.forEach((row, index) => {
    const creatorIds = row.creatorIds?.length ? row.creatorIds : [null];
    for (const creatorId of creatorIds) {
      const normalizedCreator = creatorId ? normalizeCreatorKey(creatorId) : "";
      const primaryPlatform = row.platforms?.[0] || "unknown";
      const creatorKey = normalizedCreator ? `${primaryPlatform.toLowerCase()}:${normalizedCreator}` : `review:${row.conversationKey || index}`;
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
        confidenceScores: [] as number[],
        reviewReasons: new Set<string>(),
        conversationKeys: new Set<string>(),
        preview: row.preview || "",
      };

      for (const platform of row.platforms || []) existing.platforms.add(platform);
      for (const keyword of row.matchedKeywords || []) existing.matchedKeywords.add(keyword);
      for (const price of row.quotedPrices || []) existing.quotedPrices.add(price);
      for (const reason of buildReviewReasons(row, creatorId)) existing.reviewReasons.add(reason);
      if (row.conversationKey) existing.conversationKeys.add(row.conversationKey);

      existing.conversationCount += 1;
      existing.messageCount += row.messageCount || 0;
      existing.confidenceScores.push(scoreLeadRow(row, creatorId));
      if (!existing.latestReplyAt || (row.latestReplyAt && row.latestReplyAt > existing.latestReplyAt)) {
        existing.latestReplyAt = row.latestReplyAt || existing.latestReplyAt;
        existing.currentStatus = row.currentStatus || existing.currentStatus;
        existing.preview = row.preview || existing.preview;
      } else if (!existing.currentStatus) {
        existing.currentStatus = row.currentStatus || "";
      }

      profiles.set(creatorKey, existing);
    }
  });

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
        preview: profile.preview,
      };
    })
    .sort((a, b) => Number(Boolean(b.primaryCreatorId)) - Number(Boolean(a.primaryCreatorId)) || b.confidence - a.confidence || b.messageCount - a.messageCount);
}

function joinText(values: string[] | undefined, fallback = "-") {
  return values?.length ? values.join(" / ") : fallback;
}

function confidenceTone(label: ConfidenceLabel) {
  if (label === "high") return "border-[rgba(52,211,153,0.22)] bg-[rgba(52,211,153,0.08)] text-[#9af2c5]";
  if (label === "medium") return "border-[rgba(251,191,36,0.22)] bg-[rgba(251,191,36,0.08)] text-[#f8d98a]";
  return "border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.08)] text-[#fca5a5]";
}

function CreatorFact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[14px] border border-white/[0.06] bg-white/[0.025] px-3 py-3">
      <div className="text-[11px] uppercase tracking-[0.14em] text-text-2">{label}</div>
      <div className="mt-2 break-words text-sm font-semibold text-text-0">{value}</div>
    </div>
  );
}

function CreatorDetailCard({ profile, onClose }: { profile: CreatorProfileRow | null; onClose: () => void }) {
  if (!profile) {
    return (
      <div className="rounded-[18px] border border-dashed border-white/[0.1] bg-white/[0.02] px-5 py-6 text-sm leading-6 text-text-2">
        从左侧选择一个达人后，这里会展示报价、状态、证据邮件和复核原因。
      </div>
    );
  }

  const evidenceFiles = profile.files?.slice(0, 6) ?? [];
  const conversations = profile.conversationKeys?.slice(0, 5) ?? [];

  return (
    <aside className="rounded-[18px] border border-white/[0.08] bg-white/[0.035] p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-white/[0.08] bg-white/[0.06] text-sm font-semibold text-text-0">
              {(profile.displayName || "?").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-text-0">{profile.displayName || "待确认达人"}</div>
              <div className="mt-1 truncate text-xs text-text-2">{profile.primaryCreatorId || profile.creatorKey}</div>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-8 rounded-[10px] border border-white/[0.08] bg-white/[0.04] px-3 text-xs text-text-2 transition hover:bg-white/[0.08] hover:text-text-0"
        >
          关闭
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {profile.platforms.map((platform) => (
          <span key={platform} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[11px] text-text-2">
            {platform}
          </span>
        ))}
        <span className={`rounded-full border px-2 py-0.5 text-[11px] ${confidenceTone(profile.confidenceLabel)}`}>
          置信度 {Math.round(profile.confidence * 100)}%
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <CreatorFact label="状态" value={profile.currentStatus || "待人工判断"} />
        <CreatorFact label="报价" value={joinText(profile.quotedPrices, "暂无报价")} />
        <CreatorFact label="关键词" value={joinText(profile.matchedKeywords, "无关键词")} />
        <CreatorFact label="最近回复" value={profile.latestReplyAt || "暂无时间"} />
        <CreatorFact label="会话" value={profile.conversationCount} />
        <CreatorFact label="邮件" value={profile.messageCount} />
      </div>

      {profile.reviewReasons.length ? (
        <div className="mt-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-text-2">复核原因</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {profile.reviewReasons.map((reason) => (
              <span key={reason} className="rounded-full border border-[rgba(248,113,113,0.18)] bg-[rgba(248,113,113,0.07)] px-2 py-0.5 text-[11px] text-[#fca5a5]">
                {reason}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {profile.preview ? (
        <div className="mt-4 rounded-[14px] border border-white/[0.06] bg-black/10 px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.14em] text-text-2">邮件摘录</div>
          <div className="mt-2 max-h-32 overflow-auto text-xs leading-5 text-text-1">{profile.preview}</div>
        </div>
      ) : null}

      {conversations.length || evidenceFiles.length ? (
        <div className="mt-4 space-y-3">
          {conversations.length ? (
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-text-2">会话证据</div>
              <div className="mt-2 space-y-1">
                {conversations.map((conversation) => (
                  <div key={conversation} className="truncate rounded-[10px] bg-white/[0.03] px-2 py-1 text-xs text-text-2">
                    {conversation}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {evidenceFiles.length ? (
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-text-2">原始邮件文件</div>
              <div className="mt-2 space-y-1">
                {evidenceFiles.map((file) => (
                  <div key={file} className="truncate rounded-[10px] bg-white/[0.03] px-2 py-1 text-xs text-text-2">
                    {file}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}

function CreatorProfileList({
  rows,
  showReasons,
  emptyLabel,
  selectedKey,
  onSelect,
}: {
  rows: CreatorProfileRow[];
  showReasons?: boolean;
  emptyLabel: string;
  selectedKey?: string | null;
  onSelect: (profile: CreatorProfileRow) => void;
}) {
  if (!rows.length) {
    return (
      <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.02] px-4 py-5 text-sm text-text-2">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((profile) => (
        <button
          key={profile.creatorKey}
          type="button"
          onClick={() => onSelect(profile)}
          className={`w-full rounded-[16px] border px-4 py-3 text-left transition hover:border-white/[0.16] hover:bg-white/[0.045] ${
            selectedKey === profile.creatorKey ? "border-white/[0.18] bg-white/[0.06]" : "border-white/[0.06] bg-white/[0.02]"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="max-w-full truncate text-sm font-semibold text-text-0">{profile.displayName || "待确认达人"}</div>
                {profile.platforms.slice(0, 3).map((platform) => (
                  <span key={platform} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[11px] text-text-2">
                    {platform}
                  </span>
                ))}
                <span className={`rounded-full border px-2 py-0.5 text-[11px] ${confidenceTone(profile.confidenceLabel)}`}>
                  {Math.round(profile.confidence * 100)}%
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-2">
                <span>{profile.currentStatus || "待人工判断"}</span>
                <span>{joinText(profile.matchedKeywords, "无关键词")}</span>
                <span>{joinText(profile.quotedPrices, "暂无报价")}</span>
                {profile.latestReplyAt ? <span>{profile.latestReplyAt}</span> : null}
              </div>
            </div>
            <div className="grid min-w-[172px] grid-cols-2 gap-2 text-right text-xs">
              <div>
                <div className="text-text-2">会话</div>
                <div className="mt-1 font-semibold text-text-0">{profile.conversationCount}</div>
              </div>
              <div>
                <div className="text-text-2">邮件</div>
                <div className="mt-1 font-semibold text-text-0">{profile.messageCount}</div>
              </div>
              <div className="col-span-2 text-[11px] text-text-2">点击查看达人卡片</div>
            </div>
          </div>
          {profile.preview ? <div className="mt-3 max-h-10 overflow-hidden text-xs leading-5 text-text-1">{profile.preview}</div> : null}
          {showReasons && profile.reviewReasons.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.reviewReasons.map((reason) => (
                <span key={reason} className="rounded-full border border-[rgba(248,113,113,0.18)] bg-[rgba(248,113,113,0.07)] px-2 py-0.5 text-[11px] text-[#fca5a5]">
                  {reason}
                </span>
              ))}
            </div>
          ) : null}
        </button>
      ))}
    </div>
  );
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
  const [activeResultView, setActiveResultView] = useState<ResultView>("leads");
  const [selectedCreatorKey, setSelectedCreatorKey] = useState<string | null>(null);

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

  useEffect(() => {
    setSelectedCreatorKey(null);
  }, [latest?.id, activeResultView]);

  const leadRows = useMemo(() => latest?.result?.leadReviewRows ?? [], [latest]);
  const previewRows = useMemo(() => leadRows.slice(0, 50), [leadRows]);
  const creatorProfiles = useMemo(() => {
    const serverProfiles = latest?.result?.creatorProfiles ?? [];
    return serverProfiles.length ? serverProfiles : buildClientCreatorProfilesFromLeadRows(leadRows);
  }, [latest, leadRows]);
  const creatorRows = useMemo(() => creatorProfiles.filter((profile) => profile.primaryCreatorId).slice(0, 80), [creatorProfiles]);
  const reviewRows = useMemo(() => creatorProfiles.filter((profile) => profile.needsReview).slice(0, 80), [creatorProfiles]);
  const selectedCreatorProfile = useMemo(
    () => creatorProfiles.find((profile) => profile.creatorKey === selectedCreatorKey) ?? null,
    [creatorProfiles, selectedCreatorKey],
  );
  const totalCreatorRows = creatorProfiles.filter((profile) => profile.primaryCreatorId).length;
  const totalReviewRows = creatorProfiles.filter((profile) => profile.needsReview).length;
  const hasCompletedWithoutHits = Boolean(latest?.status === "completed" && latest.result && latest.result.stats.checked > 0 && latest.result.stats.parsed > 0 && latest.result.stats.failed === 0 && latest.result.stats.matched === 0);
  const failedItemCount = latest?.result?.items?.filter((item) => item.error).length ?? 0;
  const totalLeadRows = leadRows.length;
  const creatorProfileCount = latest?.result?.stats.creatorProfiles ?? creatorProfiles.length;
  const checkedLimitLabel = latest?.limit ? `上限 ${latest.limit}` : "不限制";
  const resultTabs: Array<{ key: ResultView; label: string; count: number }> = [
    { key: "leads", label: "会话线索", count: totalLeadRows },
    { key: "creators", label: "达人库", count: totalCreatorRows || creatorProfileCount },
    { key: "review", label: "待复核", count: totalReviewRows },
  ];

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
                <div className="rounded-[16px] bg-white/[0.03] px-4 py-4"><div className="text-[11px] uppercase tracking-[0.16em] text-text-2">会话数</div><div className="mt-2 text-2xl font-semibold text-text-0">{latest.result.stats.conversationGroups}</div><div className="mt-1 text-xs text-text-2">线索 {totalLeadRows}</div></div>
                <div className="rounded-[16px] bg-white/[0.03] px-4 py-4"><div className="text-[11px] uppercase tracking-[0.16em] text-text-2">达人库</div><div className="mt-2 text-2xl font-semibold text-text-0">{creatorProfileCount}</div><div className="mt-1 text-xs text-text-2">待复核 {totalReviewRows} · 原线索复核 {latest.result.stats.manualReview}</div></div>
              </div>

              <div className="flex flex-wrap gap-2 rounded-[16px] bg-white/[0.03] p-1">
                {resultTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveResultView(tab.key)}
                    className={`inline-flex h-9 items-center justify-center rounded-[12px] px-3 text-sm transition ${
                      activeResultView === tab.key
                        ? "bg-white/[0.12] font-semibold text-text-0"
                        : "text-text-2 hover:bg-white/[0.06] hover:text-text-0"
                    }`}
                  >
                    {tab.label}
                    <span className="ml-2 rounded-full bg-black/20 px-2 py-0.5 text-[11px]">{tab.count}</span>
                  </button>
                ))}
              </div>

              {activeResultView === "leads" ? (
                <>
                  <div className="rounded-[16px] bg-white/[0.03] px-4 py-3 text-sm text-text-1">
                    线索预览：显示 {previewRows.length} / {totalLeadRows}
                  </div>

                  <div className="space-y-3">
                    {previewRows.map((row, index) => (
                      <div key={row.conversationKey || index} className="rounded-[16px] border border-white/[0.06] bg-white/[0.02] px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-text-2">
                          <span>{row.priority}</span>
                          <span>·</span>
                          <span>{row.currentStatus}</span>
                          <span>·</span>
                          <span>{joinText(row.matchedKeywords)}</span>
                          {row.platforms?.length ? (
                            <>
                              <span>·</span>
                              <span>{joinText(row.platforms)}</span>
                            </>
                          ) : null}
                        </div>
                        <div className="mt-2 text-sm font-medium text-text-0">{joinText(row.creatorIds, "待确认达人")}</div>
                        <div className="mt-2 text-sm text-text-1">{row.preview}</div>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-2">
                          <span>{row.nextAction}</span>
                          {row.quotedPrices?.length ? <span>{joinText(row.quotedPrices)}</span> : null}
                          {row.messageCount ? <span>{row.messageCount} 封</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              {activeResultView === "creators" ? (
                <>
                  <div className="rounded-[16px] bg-white/[0.03] px-4 py-3 text-sm text-text-1">
                    达人库：显示 {creatorRows.length} / {totalCreatorRows || creatorProfileCount}
                  </div>
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
                    <CreatorProfileList
                      rows={creatorRows}
                      selectedKey={selectedCreatorKey}
                      onSelect={(profile) => setSelectedCreatorKey(profile.creatorKey)}
                      emptyLabel="当前结果还没有足够信息聚合成达人；可以放宽关键词或扫更多邮件。"
                    />
                    <div className="lg:sticky lg:top-5 lg:self-start">
                      <CreatorDetailCard profile={selectedCreatorProfile} onClose={() => setSelectedCreatorKey(null)} />
                    </div>
                  </div>
                </>
              ) : null}

              {activeResultView === "review" ? (
                <>
                  <div className="rounded-[16px] bg-white/[0.03] px-4 py-3 text-sm text-text-1">
                    待复核：显示 {reviewRows.length} / {totalReviewRows}
                  </div>
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
                    <CreatorProfileList
                      rows={reviewRows}
                      showReasons
                      selectedKey={selectedCreatorKey}
                      onSelect={(profile) => setSelectedCreatorKey(profile.creatorKey)}
                      emptyLabel="这一批没有需要人工补判断的达人线索。"
                    />
                    <div className="lg:sticky lg:top-5 lg:self-start">
                      <CreatorDetailCard profile={selectedCreatorProfile} onClose={() => setSelectedCreatorKey(null)} />
                    </div>
                  </div>
                </>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
