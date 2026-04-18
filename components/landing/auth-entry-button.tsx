import Link from "next/link";
import { signInWithGoogle } from "@/app/actions";

export function AuthEntryButton({ isAuthenticated }: { isAuthenticated: boolean }) {
  if (isAuthenticated) {
    return (
      <Link
        href="/workspace"
        className="inline-flex h-11 items-center justify-center rounded-[16px] border border-white/10 bg-white/5 px-4 text-xs font-medium text-text-0 transition duration-200 hover:border-white/20 hover:bg-white/10 sm:h-12 sm:px-5 sm:text-sm"
      >
        进入工作台
      </Link>
    );
  }

  return (
    <form action={signInWithGoogle}>
      <button
        type="submit"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] border border-white/10 bg-white/5 px-4 text-xs font-medium text-text-0 transition duration-200 hover:border-white/20 hover:bg-white/10 sm:h-12 sm:px-5 sm:text-sm"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.3-2 3.1l3.2 2.5c1.9-1.7 2.9-4.3 2.9-7.3 0-.7-.1-1.4-.2-2.1H12Z" />
          <path fill="#4285F4" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.2-2.5c-.9.6-2 1-3.5 1-2.7 0-5-1.8-5.8-4.3H2.9v2.6A10 10 0 0 0 12 22Z" />
          <path fill="#FBBC05" d="M6.2 13.8A6 6 0 0 1 5.9 12c0-.6.1-1.2.3-1.8V7.6H2.9A10 10 0 0 0 2 12c0 1.6.4 3.1.9 4.4l3.3-2.6Z" />
          <path fill="#34A853" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 12 2 10 10 0 0 0 2.9 7.6l3.3 2.6C7 7.7 9.3 5.9 12 5.9Z" />
        </svg>
        Google 登录
      </button>
    </form>
  );
}
