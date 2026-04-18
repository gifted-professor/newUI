import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { signOutAction } from "@/app/actions";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-bg-0 px-5 py-8 text-text-0 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1120px]">
        <div className="section-shell px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="eyebrow">账户中心</p>
              <h1 className="mt-5 font-display text-[36px] font-semibold tracking-[-0.03em] text-text-0 sm:text-[44px]">
                欢迎回来，{session.user.name || session.user.email || "团队成员"}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-text-1">
                这里是账户与集成中心，负责查看登录状态、连接关系和配置入口；真正的邮件解析工作统一放到工作台处理。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/workspace"
                className="inline-flex h-11 items-center justify-center rounded-[16px] bg-brand-0 px-5 text-sm font-semibold text-white transition hover:brightness-110"
                style={{ boxShadow: "var(--glow-brand)" }}
              >
                返回工作台
              </Link>
              <Link
                href="/"
                className="inline-flex h-11 items-center justify-center rounded-[16px] border border-white/10 bg-white/5 px-5 text-sm font-medium text-text-0 transition hover:border-white/20 hover:bg-white/10"
              >
                返回官网
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-[16px] border border-white/10 bg-white/5 px-5 text-sm font-medium text-text-0 transition hover:border-white/20 hover:bg-white/10"
                >
                  退出登录
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <div className="surface-card p-6">
            <p className="text-sm uppercase tracking-[0.18em] text-text-2">当前账号</p>
            <p className="mt-4 text-lg font-semibold text-text-0">{session.user.email}</p>
            <p className="mt-2 text-sm leading-6 text-text-1">主登录身份已就绪，可继续承接邮箱连接与权限管理。</p>
          </div>
          <div className="surface-card p-6">
            <p className="text-sm uppercase tracking-[0.18em] text-text-2">集成状态</p>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-text-1">
              <li>1. Google 登录已接通</li>
              <li>2. Gmail / Outlook 待继续接入</li>
              <li>3. 飞书写回可作为下一步配置</li>
            </ul>
          </div>
          <div className="surface-card p-6">
            <p className="text-sm uppercase tracking-[0.18em] text-text-2">当前状态</p>
            <p
              className="mt-4 inline-flex rounded-full px-3 py-1 text-sm font-semibold text-green-0"
              style={{ background: "rgba(52, 211, 153, 0.15)" }}
            >
              Account Center Ready
            </p>
            <p className="mt-3 text-sm leading-6 text-text-1">工作台和账户中心职责已经拆开，这里只负责账号与集成入口。</p>
          </div>
        </div>
      </div>
    </main>
  );
}
