import { Container } from "@/components/shared/container";
import { PrimaryCTAButton } from "@/components/shared/primary-cta-button";
import { heroContent } from "@/lib/content";

export function HeroSection({ onCtaClick }: { onCtaClick: () => void }) {
  return (
    <section className="section-padding pb-10 md:pb-14">
      <Container>
        <div className="section-shell grid-noise relative isolate overflow-hidden px-6 py-14 sm:px-8 md:px-12 md:py-20">
          <div className="pointer-events-none absolute inset-0 opacity-80" style={{ background: "var(--section-glow)" }} />
          <div className="pointer-events-none absolute -left-10 top-16 h-40 w-40 rounded-full blur-3xl" style={{ background: "rgba(110, 99, 255, 0.2)" }} />
          <div className="pointer-events-none absolute -right-10 bottom-12 h-44 w-44 rounded-full blur-3xl" style={{ background: "rgba(56, 189, 248, 0.15)" }} />
          <div className="pointer-events-none absolute right-6 top-10 hidden w-[320px] rotate-6 rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-4 shadow-soft lg:block">
            <div className="flex items-center gap-2 text-xs text-text-2">
              <span className="h-2 w-2 rounded-full" style={{ background: "rgba(251, 113, 133, 0.8)" }} />
              混乱回信片段
            </div>
            <div className="mt-4 space-y-3 text-sm text-text-1">
              <div className="rounded-2xl border border-white/8 bg-black/20 p-3">"TikTok 700, whitelist extra, maybe bundle story?"</div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-3">"美区和 LATAM 不同价，长期合作可以谈。"</div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-3">"Need confirm exclusivity / raw footage / usage rights."</div>
            </div>
          </div>
          <div className="relative z-10 mx-auto max-w-[840px] text-center">
            <div className="eyebrow justify-center">{heroContent.eyebrow}</div>
            <h1 className="text-balance mt-6 font-display text-[42px] font-bold leading-[1.02] tracking-[-0.04em] text-text-0 sm:text-[52px] md:text-[64px] md:leading-[72px]">
              {heroContent.title}
            </h1>
            <p className="mx-auto mt-6 max-w-[680px] text-balance text-lg leading-8 text-text-1 md:text-xl md:leading-[30px]">
              {heroContent.subtitle}
            </p>
            <div className="mt-10 flex justify-center">
              <PrimaryCTAButton onClick={onCtaClick} className="min-h-14 w-full max-w-[360px] text-base sm:w-auto sm:min-w-[320px]">
                {heroContent.cta}
              </PrimaryCTAButton>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm text-text-2">
              {heroContent.microTrust.map((item, index) => (
                <div key={item} className="flex items-center gap-3">
                  {index > 0 ? <span className="hidden h-1 w-1 rounded-full bg-white/25 sm:inline-block" /> : null}
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-8 left-8 hidden max-w-[280px] rounded-[24px] border border-white/10 bg-[rgba(17,19,26,0.85)] p-4 lg:block">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-0">After</p>
            <div className="mt-3 space-y-3 text-sm text-text-1">
              <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                <span>底线报价</span>
                <span className="font-semibold text-green-0">$620</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                <span>高意向打分</span>
                <span className="font-semibold text-cyan-0">88 / 100</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                <span>同步飞书</span>
                <span className="font-semibold text-brand-1">已结构化</span>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
