import type { ComponentProps } from "react";

/** 둥근 카드. 바탕색은 tone으로 바꾼다 (className에 bg-*를 넣으면 기본 바탕과 겹쳐 어느 쪽이 이길지 정해지지 않는다)
 *  그림자 없이 흰 카드와 크림 바탕의 색 차이로만 나눈다. 그림자는 떠 있는 것(바텀시트·토스트)에만 쓴다.
 *  둥글기: 카드 24px(3xl) → 카드 안 블록·버튼 16px(2xl) → 칩·배지 full */
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
  return <section className={`rounded-3xl p-5 ${TONE[tone]} ${className}`} {...props} />;
}
