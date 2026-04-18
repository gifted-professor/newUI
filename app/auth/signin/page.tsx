import Link from "next/link";
import { signInWithGoogle } from "@/app/actions";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-bg-0 px-5 py-8 text-text-0 sm:px-8 lg:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-[560px] items-center justify-center">
        <div className="section-shell w-full px-6 py-8 sm:px-8">
          <p className="eyebrow">Google 登录入口</p>
          <h1 className="mt-5 font-display text-[36px] font-semibold tracking-[-0.03em] text-text-0">
            进入海外网红邮件解析工作台
          </h1>
          <p className="mt-4 text-base leading-7 text-text-1">
            使用你的 Google 账号登录。登录成功后会直接进入工作台入口页。
          </p>

          <form action={signInWithGoogle} className="mt-8">
            <button
              type="submit"
              className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-[16px] border border-white/10 bg-white/5 px-5 text-sm font-medium text-text-0 transition duration-200 hover:border-white/20 hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.3-2 3.1l3.2 2.5c1.9-1.7 2.9-4.3 2.9-7.3 0-.7-.1-1.4-.2-2.1H12Z" />
                <path fill="#4285F4" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.2-2.5c-.9.6-2 1-3.5 1-2.7 0-5-1.8-5.8-4.3H2.9v2.6A10 10 0 0 0 12 22Z" />
                <path fill="#FBBC05" d="M6.2 13.8A6 6 0 0 1 5.9 12c0-.6.1-1.2.3-1.8V7.6H2.9A10 10 0 0 0 2 12c0 1.6.4 3.1.9 4.4l3.3-2.6Z" />
                <path fill="#34A853" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 12 2 10 10 0 0 0 2.9 7.6l3.3 2.6C7 7.7 9.3 5.9 12 5.9Z" />
              </svg>
              使用 Google 登录
            </button>
          </form>

          <div className="mt-8 rounded-[20px] border border-white/8 bg-white/[0.03] px-5 py-4 text-sm leading-6 text-text-2">
            需要配置环境变量：AUTH_SECRET、AUTH_GOOGLE_ID、AUTH_GOOGLE_SECRET
          </div>

          <Link href="/" className="mt-6 inline-flex text-sm text-text-1 transition hover:text-text-0">
            返回首页
          </Link>
        </div>
      </div>
    </main>
  );
}
