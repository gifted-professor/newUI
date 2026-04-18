import { Container } from "@/components/shared/container";
import { Card } from "@/components/shared/card";
import { SectionHeading } from "@/components/shared/section-heading";
import { trustCards } from "@/lib/content";

function TrustIcon({ accent }: { accent: "cyan" | "green" | "brand" }) {
  const stroke = accent === "cyan" ? "var(--cyan-0)" : accent === "green" ? "var(--green-0)" : "var(--brand-1)";

  if (accent === "cyan") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3 5 6v5c0 5 3.4 8.4 7 10 3.6-1.6 7-5 7-10V6l-7-3Z" />
        <path d="M9.5 12.5 11.2 14l3.5-4" />
      </svg>
    );
  }

  if (accent === "green") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7h7l2 3h9" />
        <path d="M3 12h8l2 3h8" />
        <path d="M3 17h7l2-3h9" />
        <path d="M18 7v10" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M18 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M11 8h2l2 2v4" />
      <path d="M8.5 10.5 11 8" />
      <path d="m13 14 2 2.2" />
    </svg>
  );
}

export function TrustSection() {
  return (
    <section className="section-padding pt-8 md:pt-10">
      <Container>
        <div className="section-shell px-6 py-8 sm:px-8 md:px-10 md:py-10">
          <SectionHeading title="老板最怕的，我们先挡住" />
          <div className="mt-8 grid gap-4 md:grid-cols-3 md:gap-5">
            {trustCards.map((card) => (
              <Card key={card.title} className="p-6 md:p-7">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                  <TrustIcon accent={card.accent} />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-text-0">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-text-1">{card.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
