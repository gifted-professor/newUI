"use client";

import { useEffect, useState } from "react";
import { AuthEntryButton } from "@/components/landing/auth-entry-button";
import { Container } from "@/components/shared/container";
import { PrimaryCTAButton } from "@/components/shared/primary-cta-button";
import { heroContent } from "@/lib/content";

export function TopBar({ onCtaClick, isAuthenticated }: { onCtaClick: () => void; isAuthenticated: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <Container className="pt-4">
        <div
          className={[
            "flex items-center justify-between rounded-[24px] px-4 py-3 transition duration-200 md:px-5",
            scrolled
              ? "border border-line bg-[rgba(10,11,16,0.82)] shadow-soft backdrop-blur-xl"
              : "border border-transparent bg-transparent",
          ].join(" ")}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-semibold text-white">
              EM
            </div>
            <div>
              <p className="font-display text-sm font-semibold tracking-[-0.02em] text-text-0">海外网红邮件解析</p>
              <p className="hidden text-xs text-text-2 sm:block">把混乱邮件直接变成可报价表</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <AuthEntryButton isAuthenticated={isAuthenticated} />
            <PrimaryCTAButton onClick={onCtaClick} className="h-11 px-4 text-xs sm:h-12 sm:px-5 sm:text-sm">
              <span className="sm:hidden">免费获取额度</span>
              <span className="hidden sm:inline">{heroContent.cta}</span>
            </PrimaryCTAButton>
          </div>
        </div>
      </Container>
    </header>
  );
}
