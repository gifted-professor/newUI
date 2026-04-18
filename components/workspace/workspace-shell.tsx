import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/actions";
import { Container } from "@/components/shared/container";

export function WorkspaceShell({
  title,
  label,
  headerMetric,
  children,
}: {
  title: string;
  label: string;
  headerMetric?: {
    label: string;
    value: string;
  };
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-bg-0 px-5 py-5 text-text-0 sm:px-8 lg:px-10">
      <Container className="max-w-[1320px]">
        <header className="sticky top-4 z-20 mb-4">
          <div className="surface-card px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-semibold text-white">
                  EM
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-base font-semibold tracking-[-0.03em] text-text-0">海外网红邮件解析</p>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-text-2">
                      {label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-2">{title} · Connect · Parse · Structure · Sync</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                {headerMetric ? (
                  <div className="inline-flex h-10 items-center gap-3 rounded-[14px] border border-white/10 bg-white/[0.04] px-4 text-sm text-text-1">
                    <span className="text-[11px] uppercase tracking-[0.16em] text-text-2">{headerMetric.label}</span>
                    <span className="font-semibold text-text-0">{headerMetric.value}</span>
                  </div>
                ) : null}
                <Link
                  href="/dashboard"
                  className="inline-flex h-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/5 px-4 text-sm font-medium text-text-0 transition hover:border-white/20 hover:bg-white/10"
                >
                  账户中心
                </Link>
                <Link
                  href="/"
                  className="inline-flex h-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/5 px-4 text-sm font-medium text-text-0 transition hover:border-white/20 hover:bg-white/10"
                >
                  官网
                </Link>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="inline-flex h-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/5 px-4 text-sm font-medium text-text-0 transition hover:border-white/20 hover:bg-white/10"
                  >
                    退出
                  </button>
                </form>
              </div>
            </div>
          </div>
        </header>
        {children}
      </Container>
    </main>
  );
}
