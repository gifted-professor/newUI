"use client";

import { useMemo, useState } from "react";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { beforeEmails, afterRows } from "@/lib/content";

function ScorePill({ score }: { score: string }) {
  const numeric = Number(score);
  const color = numeric >= 85 ? "bg-green-0/15 text-green-0" : numeric >= 75 ? "bg-cyan-0/15 text-cyan-0" : "bg-amber-0/15 text-amber-0";

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{score}</span>;
}

export function BeforeAfterProof() {
  const [mobileView, setMobileView] = useState<"after" | "before">("after");

  const beforePanel = useMemo(
    () => (
      <div className="surface-card h-full rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-text-2">
          <span>Before</span>
          <span>讨价还价邮件线程</span>
        </div>
        <div className="mt-4 space-y-3">
          {beforeEmails.map((email) => (
            <div key={email.subject} className="rounded-[20px] border border-white/8 bg-[rgba(8,9,14,0.66)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-0">{email.from}</p>
                  <p className="mt-1 text-xs text-text-2">{email.subject}</p>
                </div>
                <span
                  className={[
                    "mt-1 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold",
                    email.accent === "red" ? "bg-red-0/15 text-red-0" : "bg-amber-0/15 text-amber-0",
                  ].join(" ")}
                >
                  messy
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-1">{email.body}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-text-2">
                <span className="rounded-full border border-white/8 px-2 py-1">多币种</span>
                <span className="rounded-full border border-white/8 px-2 py-1">多条件报价</span>
                <span className="rounded-full border border-white/8 px-2 py-1">不可直接跟进</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    [],
  );

  const afterPanel = useMemo(
    () => (
      <div className="surface-card h-full rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-text-2">
          <span>After</span>
          <span>飞书多维表格</span>
        </div>
        <div className="mt-4 overflow-hidden rounded-[20px] border border-white/8 bg-[rgba(7,9,14,0.68)]">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_0.9fr_1.8fr] gap-3 border-b border-white/8 px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-text-2">
            <span>博主</span>
            <span>粉丝量</span>
            <span>首报</span>
            <span>底线</span>
            <span>意向分</span>
            <span>摘要</span>
          </div>
          <div className="divide-y divide-white/8">
            {afterRows.map((row, index) => (
              <div key={row.handle} className="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-[1.4fr_1fr_1fr_1fr_0.9fr_1.8fr] md:items-center">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{ background: index % 2 === 0 ? "linear-gradient(135deg, rgba(56,189,248,0.45), rgba(110,99,255,0.5))" : "linear-gradient(135deg, rgba(52,211,153,0.35), rgba(56,189,248,0.35))" }}
                  >
                    {row.name.slice(0, 1)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-0">{row.name}</p>
                    <p className="text-xs text-text-2">{row.handle}</p>
                  </div>
                </div>
                <p className="text-sm font-medium text-text-1 md:text-text-0">{row.followers}</p>
                <p className="text-sm text-text-1">{row.quote}</p>
                <p className="text-sm font-semibold text-green-0">{row.floor}</p>
                <div>
                  <ScorePill score={row.score} />
                </div>
                <p className="text-sm leading-6 text-text-1">{row.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    [],
  );

  return (
    <section className="section-padding pt-8 md:pt-10">
      <Container>
        <div className="section-shell px-6 py-8 sm:px-8 md:px-10 md:py-10">
          <SectionHeading
            title="从回信地狱，到可报价表"
            subtitle="你买的不是软件，是把混乱变成秩序的能力。"
          />
          <div className="mt-8 flex justify-center md:hidden">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setMobileView("before")}
                className={[
                  "rounded-full px-4 py-2 text-sm transition",
                  mobileView === "before" ? "bg-white/10 text-text-0" : "text-text-2",
                ].join(" ")}
              >
                Before
              </button>
              <button
                type="button"
                onClick={() => setMobileView("after")}
                className={[
                  "rounded-full px-4 py-2 text-sm transition",
                  mobileView === "after" ? "bg-white/10 text-text-0" : "text-text-2",
                ].join(" ")}
              >
                After
              </button>
            </div>
          </div>
          <div className="mt-8 hidden grid-cols-[0.45fr_0.55fr] gap-5 lg:grid">
            {beforePanel}
            {afterPanel}
          </div>
          <div className="mt-8 lg:hidden">{mobileView === "before" ? beforePanel : afterPanel}</div>
        </div>
      </Container>
    </section>
  );
}
