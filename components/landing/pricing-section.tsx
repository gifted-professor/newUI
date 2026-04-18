import { Container } from "@/components/shared/container";
import { Card } from "@/components/shared/card";
import { PrimaryCTAButton } from "@/components/shared/primary-cta-button";
import { SectionHeading } from "@/components/shared/section-heading";
import { heroContent, pricingCards, pricingFootnote } from "@/lib/content";

export function PricingSection({ onCtaClick }: { onCtaClick: () => void }) {
  return (
    <section className="section-padding pt-8">
      <Container>
        <div className="section-shell px-6 py-8 sm:px-8 md:px-10 md:py-10">
          <SectionHeading title="先免费跑通，再按水电表付费" />
          <div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-5">
            {pricingCards.map((card) => (
              <Card
                key={card.name}
                highlighted={card.highlighted}
                className={[
                  "flex h-full flex-col p-6 md:p-7",
                  card.highlighted ? "order-1 md:order-none" : "order-2 md:order-none",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-text-2">{card.name}</p>
                    <p className="mt-5 font-display text-[40px] font-bold leading-none tracking-[-0.04em] text-text-0 md:text-[44px]">
                      {card.price}
                    </p>
                  </div>
                  {card.highlighted ? (
                    <span
                      className="rounded-full px-3 py-1 text-xs font-semibold text-brand-1"
                      style={{ border: "1px solid rgba(138, 127, 255, 0.2)", background: "rgba(110, 99, 255, 0.1)" }}
                    >
                      默认选择
                    </span>
                  ) : null}
                </div>
                <div className="mt-8 space-y-3 text-sm leading-7 text-text-1">
                  <p>{card.detail}</p>
                  <p>{card.note}</p>
                </div>
                <PrimaryCTAButton onClick={onCtaClick} className="mt-8 h-12 w-full text-sm">
                  {heroContent.cta}
                </PrimaryCTAButton>
              </Card>
            ))}
          </div>
          <div
            className="mt-4 rounded-[20px] px-5 py-4 text-sm leading-6 text-amber-0"
            style={{ border: "1px solid rgba(251, 191, 36, 0.2)", background: "rgba(251, 191, 36, 0.08)" }}
          >
            {pricingFootnote}
          </div>
        </div>
      </Container>
    </section>
  );
}
