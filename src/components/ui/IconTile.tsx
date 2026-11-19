import type { ReactNode } from "react";

/** 연보라 바탕 아이콘 타일 (Figma 공통) */
export function IconTile({ children, size = "md" }: { children: ReactNode; size?: "md" | "lg" }) {
  const box = size === "lg" ? "size-16 rounded-3xl" : "size-12 rounded-2xl";
  return <span className={`grid shrink-0 place-items-center bg-lavender text-brand-purple ${box}`}>{children}</span>;
}
