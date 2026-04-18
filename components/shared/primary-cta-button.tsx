import type { ButtonHTMLAttributes, ReactNode } from "react";

export function PrimaryCTAButton({
  children,
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; className?: string }) {
  return (
    <button
      type={type}
      className={[
        "inline-flex items-center justify-center rounded-md px-7 py-4 text-sm font-semibold text-white",
        "transition duration-200 ease-out hover:-translate-y-0.5 hover:brightness-105 active:translate-y-px",
        "shadow-brand",
        className,
      ].join(" ")}
      style={{ background: "var(--cta-gradient)" }}
      {...props}
    >
      {children}
    </button>
  );
}
