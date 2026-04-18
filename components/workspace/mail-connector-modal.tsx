"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { mailProviders } from "@/lib/mail-provider-content";
import type { SavedMailConfig } from "@/types/mail-connector";

type ProviderKey = (typeof mailProviders)[number]["key"];

type ConnectorState =
  | { status: "idle"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string }
  | { status: "loading"; message: string };

const LOCAL_CONNECTOR_BASE = process.env.NEXT_PUBLIC_LOCAL_CONNECTOR_BASE || "http://127.0.0.1:48721/v1";

export function MailConnectorModal({
  open,
  onClose,
  savedConfig,
}: {
  open: boolean;
  onClose: () => void;
  savedConfig?: SavedMailConfig | null;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [providerKey, setProviderKey] = useState<ProviderKey | "">(savedConfig?.providerKey as ProviderKey | "" ?? "");
  const [email, setEmail] = useState(savedConfig?.email ?? "");
  const [secret, setSecret] = useState("");
  const [nickname, setNickname] = useState(savedConfig?.nickname ?? "");
  const [state, setState] = useState<ConnectorState>({ status: "idle", message: savedConfig?.connected ? "当前邮箱配置已保存，可重新测试或更新。" : "选择邮箱服务商后，再决定使用官方授权还是授权码连接。" });

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const raf = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(raf);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const provider = useMemo(() => mailProviders.find((item) => item.key === providerKey) ?? null, [providerKey]);

  async function postConnector(action: "test" | "save") {
    try {
      setState({ status: "loading", message: action === "test" ? "正在测试连接..." : "正在保存配置..." });

      const response = await fetch(`${LOCAL_CONNECTOR_BASE}/mail/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: providerKey,
          authMode: provider?.mode === "oauth" ? "oauth" : "app_password",
          email,
          nickname,
          secret,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result?.error?.message || "连接失败，请稍后再试。");
      }

      setState({ status: "success", message: action === "test" ? "本地连接器测试通过。" : "本地连接器已保存连接配置，页面即将刷新。" });
      if (action === "save") {
        window.location.reload();
      }
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "操作失败，请稍后再试。" });
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
        className="surface-card relative z-10 w-full max-w-[760px] overflow-hidden rounded-[24px] border border-white/10"
      >
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4 sm:px-6">
          <div>
            <p id={titleId} className="font-display text-xl font-semibold text-text-0">
              连接收件邮箱
            </p>
            <p id={descriptionId} className="mt-1 text-sm text-text-2">
              先选邮箱服务商。Gmail 用官方授权，其它邮箱用 IMAP 授权码 / App Password。
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

        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="px-5 py-5 sm:px-6">
            <label className="mb-2 block text-sm font-medium text-text-0">邮箱服务商</label>
            <select
              value={providerKey}
              onChange={(event) => {
                setProviderKey(event.target.value as ProviderKey | "");
                setState({ status: "idle", message: "已切换邮箱类型，请继续完成连接。" });
              }}
              className="h-12 w-full rounded-[16px] border border-white/10 bg-white/[0.04] px-4 text-sm text-text-0"
            >
              <option value="">请选择邮箱类型</option>
              {mailProviders.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>

            {provider?.mode === "oauth" ? (
              <div className="mt-6 rounded-[18px] border border-white/8 bg-white/[0.03] p-5">
                <p className="text-sm font-semibold text-text-0">Gmail 官方授权</p>
                <p className="mt-3 text-sm leading-7 text-text-1">{provider.hint}</p>
                <Link
                  href="/api/mail-connect/google"
                  className="mt-5 inline-flex h-11 items-center justify-center rounded-[16px] bg-brand-0 px-5 text-sm font-semibold text-white transition hover:brightness-110"
                  style={{ boxShadow: "var(--glow-brand)" }}
                >
                  使用 Google 官方授权连接 Gmail
                </Link>
              </div>
            ) : provider?.mode === "imap" ? (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-text-0">邮箱地址</label>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="请输入邮箱地址"
                    className="h-12 w-full rounded-[16px] border border-white/10 bg-white/[0.04] px-4 text-sm text-text-0 placeholder:text-text-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-text-0">昵称（选填）</label>
                  <input
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    placeholder="给这个邮箱起个备注名"
                    className="h-12 w-full rounded-[16px] border border-white/10 bg-white/[0.04] px-4 text-sm text-text-0 placeholder:text-text-2"
                  />
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-text-0">
                    <span>IMAP 授权码 / App Password</span>
                    {provider.helpUrl ? (
                      <Link href={provider.helpUrl} target="_blank" rel="noreferrer" className="text-cyan-0 transition hover:text-text-0">
                        获取教程
                      </Link>
                    ) : null}
                  </div>
                  <input
                    value={secret}
                    onChange={(event) => setSecret(event.target.value)}
                    placeholder="请输入 IMAP 授权码或 App Password"
                    className="h-12 w-full rounded-[16px] border border-white/10 bg-white/[0.04] px-4 text-sm text-text-0 placeholder:text-text-2"
                  />
                  <p className="mt-2 text-xs text-text-2">我们不会索要邮箱登录密码，只使用授权码读取邮件。</p>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => postConnector("test")}
                    disabled={state.status === "loading"}
                    className="inline-flex h-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/5 px-4 text-sm font-medium text-text-0 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    测试连接
                  </button>
                  <button
                    type="button"
                    onClick={() => postConnector("save")}
                    disabled={state.status === "loading"}
                    className="inline-flex h-10 items-center justify-center rounded-[14px] bg-brand-0 px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ boxShadow: "var(--glow-brand)" }}
                  >
                    确认连接
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-[18px] border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm leading-7 text-text-2">
                先选择邮箱服务商，系统再决定用官方授权还是 IMAP 授权码方式连接。
              </div>
            )}
          </div>

          <div className="border-t border-white/8 bg-[rgba(255,255,255,0.02)] px-5 py-5 sm:px-6 lg:border-l lg:border-t-0">
            <p className="text-[11px] uppercase tracking-[0.16em] text-text-2">接入说明</p>
            <div className="mt-4 rounded-[18px] border border-white/8 bg-[rgba(255,255,255,0.02)] p-4">
              <p className="text-sm font-semibold text-text-0">当前连接方式</p>
              <p className="mt-3 text-sm leading-7 text-text-1">{provider ? provider.hint : "未选择服务商"}</p>
            </div>
            <div className="mt-4 rounded-[18px] border border-white/8 bg-[rgba(255,255,255,0.02)] p-4">
              <p className="text-sm font-semibold text-text-0">为什么要分开？</p>
              <p className="mt-3 text-sm leading-7 text-text-1">产品登录只负责进入系统；邮箱连接是授权系统去读邮件。这两件事必须分开，才能少拿用户信息、少增加阻力。</p>
            </div>
            <div
              className={[
                "mt-4 rounded-[18px] border px-4 py-3 text-sm leading-6",
                state.status === "success"
                  ? "text-green-0"
                  : state.status === "error"
                    ? "text-[rgba(255,183,198,0.96)]"
                    : "text-text-2",
              ].join(" ")}
              style={
                state.status === "success"
                  ? { border: "1px solid rgba(52, 211, 153, 0.2)", background: "rgba(52, 211, 153, 0.1)" }
                  : state.status === "error"
                    ? { border: "1px solid rgba(251,113,133,0.24)", background: "rgba(251,113,133,0.1)" }
                    : { border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }
              }
            >
              {state.message}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
