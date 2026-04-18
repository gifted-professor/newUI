export function SectionHeading({
  title,
  subtitle,
  align = "left",
}: {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}) {
  const textAlign = align === "center" ? "text-center" : "text-left";
  const container = align === "center" ? "mx-auto max-w-3xl" : "max-w-3xl";

  return (
    <div className={`${container} ${textAlign}`.trim()}>
      <h2 className="text-balance font-display text-[32px] font-semibold leading-[1.05] tracking-[-0.03em] text-text-0 md:text-[36px] md:leading-[44px]">
        {title}
      </h2>
      {subtitle ? <p className="mt-4 text-base leading-7 text-text-1 md:text-lg">{subtitle}</p> : null}
    </div>
  );
}
