import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  highlighted = false,
}: {
  children: ReactNode;
  className?: string;
  highlighted?: boolean;
}) {
  return <div className={`${highlighted ? "surface-card-strong" : "surface-card"} ${className}`.trim()}>{children}</div>;
}
