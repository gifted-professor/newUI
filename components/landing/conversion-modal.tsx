"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { PrimaryCTAButton } from "@/components/shared/primary-cta-button";

type TabKey = "qr" | "wechat";

type LeadState =
  | { status: "idle"; message: string }
  | { status: "submitting"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

function getDefaultTab() {
  if (typeof window === "undefined") return "qr" as TabKey;
  return window.matchMedia("(max-width: 767px)").matches ? "wechat" : "qr";
}

export function ConversionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId();
  const descriptionId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("qr");
  const [wechatId, setWechatId] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [leadState, setLeadState] = useState<LeadState>({ status: "idle", message: "提交后我们会尽快联系你。" });

  useEffect(() => {
    if (!open) return;

    const nextTab = getDefaultTab();
    setActiveTab(nextTab);
    setLeadState({ status: "idle", message: "提交后我们会尽快联系你。" });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const raf = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !modalRef.current) return;

      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(raf);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const canSubmit = useMemo(() => wechatId.trim().length >= 2, [wechatId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      setLeadState({ status: "error", message: "请先填写可联系到的微信号。" });
      return;
    }

    try {
      setLeadState({ status: "submitting", message: "正在提交，请稍候。" });

      const response = await fetch("/api/lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wechatId: wechatId.trim(),
          name: name.trim(),
          company: company.trim(),
          source: "landing-modal",
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || "提交失败，请稍后再试。");
      }

      setLeadState({ status: "success", message: data.message || "提交成功，我们会尽快联系你。" });
      setWechatId("");
      setName("");
      setCompany("");
    } catch (error) {
      setLeadState({
        status: "error",
        message: error instanceof Error ? error.message : "提交失败，请稍后再试。",
      });
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="关闭弹窗"
        className="absolute inset-0 bg-[rgba(5,7,12,0.72)] backdrop-blur-md"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="surface-card relative z-10 w-full max-w-[480px] overflow-hidden rounded-[24px] border border-white/10"
      >
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4 sm:px-6">
          <div>
            <p id={titleId} className="font-display text-xl font-semibold text-text-0">
              免费获取 200 封邮件解析额度
            </p>
            <p id={descriptionId} className="mt-1 text-sm text-text-2">
              扫码直连或留下微信号，先把邮件解析跑通。
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-text-1 transition hover:border-white/20 hover:text-text-0"
          >
            ×
          </button>
        </div>

        <div className="px-5 pb-6 pt-5 sm:px-6">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("qr")}
              className={[
                "rounded-full px-4 py-2 text-sm transition",
                activeTab === "qr" ? "bg-white/10 text-text-0" : "text-text-2",
              ].join(" ")}
            >
              扫码登录
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("wechat")}
              className={[
                "rounded-full px-4 py-2 text-sm transition",
                activeTab === "wechat" ? "bg-white/10 text-text-0" : "text-text-2",
              ].join(" ")}
            >
              留微信号
            </button>
          </div>

          {activeTab === "qr" ? (
            <div className="mt-5 rounded-[24px] border border-white/8 bg-[rgba(10,12,18,0.7)] p-5 text-center">
              <div className="mx-auto w-full max-w-[260px] overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] p-3">
                <Image src="/qr-placeholder.svg" alt="扫码登录二维码示意" width={260} height={260} className="h-auto w-full rounded-[20px]" priority />
              </div>
              <p className="mt-4 text-sm font-medium text-text-0">扫码后可直接体验 200 封邮件解析额度</p>
              <p className="mt-2 text-sm leading-6 text-text-2">适合已经准备好立刻跑通流程的团队。授权后无需提供邮箱原密码。</p>
            </div>
          ) : (
            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="wechat-id" className="mb-2 block text-sm font-medium text-text-0">
                  微信号
                </label>
                <input
                  id="wechat-id"
                  name="wechatId"
                  value={wechatId}
                  onChange={(event) => setWechatId(event.target.value)}
                  placeholder="填写可联系到你的微信号"
                  className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-text-0 placeholder:text-text-2"
                  autoComplete="off"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="mb-2 block text-sm font-medium text-text-0">
                    姓名（选填）
                  </label>
                  <input
                    id="name"
                    name="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="怎么称呼你"
                    className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-text-0 placeholder:text-text-2"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label htmlFor="company" className="mb-2 block text-sm font-medium text-text-0">
                    公司（选填）
                  </label>
                  <input
                    id="company"
                    name="company"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                    placeholder="团队 / 品牌名"
                    className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-text-0 placeholder:text-text-2"
                    autoComplete="off"
                  />
                </div>
              </div>
              <div
                className={[
                  "rounded-[18px] border px-4 py-3 text-sm leading-6",
                  leadState.status === "success"
                    ? "text-green-0"
                    : leadState.status === "error"
                      ? "border-[rgba(251,113,133,0.24)] bg-[rgba(251,113,133,0.1)] text-[rgba(255,183,198,0.96)]"
                      : "border-white/8 bg-white/[0.03] text-text-2",
                ].join(" ")}
                style={
                  leadState.status === "success"
                    ? { border: "1px solid rgba(52, 211, 153, 0.2)", background: "rgba(52, 211, 153, 0.1)" }
                    : undefined
                }
              >
                {leadState.message}
              </div>
              <PrimaryCTAButton type="submit" disabled={leadState.status === "submitting"} className="h-12 w-full text-sm disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none">
                {leadState.status === "submitting" ? "提交中..." : "提交微信号，获取额度"}
              </PrimaryCTAButton>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
