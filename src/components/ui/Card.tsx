import type { ComponentProps } from "react";

/** 둥근 카드. 바탕색은 tone으로 바꾼다 (className에 bg-*를 넣으면 기본 바탕과 겹쳐 어느 쪽이 이길지 정해지지 않는다) */
const TONE = {
  surface: "bg-surface",
  lavender: "bg-lavender",
  purple: "bg-brand-purple text-white",
} as const;

export function Card({
  className = "",
  tone = "surface",
  ...props
}: ComponentProps<"section"> & { tone?: keyof typeof TONE }) {
  return <section className={`rounded-3xl p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] ${TONE[tone]} ${className}`} {...props} />;
}
