import { footerText } from "@/lib/content";
import { Container } from "@/components/shared/container";

export function Footer() {
  return (
    <footer className="pb-12 pt-6">
      <Container>
        <div className="section-shell px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-sm font-semibold tracking-[-0.02em] text-text-0">海外网红邮件解析</p>
              <p className="mt-2 text-sm leading-6 text-text-1">{footerText}</p>
            </div>
            <p className="text-xs text-text-2">仅保留必要页面信息，不做冗余营销堆叠。</p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
