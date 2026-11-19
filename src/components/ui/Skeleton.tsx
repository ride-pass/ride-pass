"use client";

// 데이터를 읽는 동안 보여 주는 자리 표시. 빈 화면이 깜빡이지 않게 한다.

import { useT } from "@/components/demo/DemoProvider";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`rounded-2xl bg-line/70 motion-safe:animate-pulse ${className}`} />;
}

/** 화면 하나 분량: 제목 줄 + 큰 카드 + 작은 카드 두 개 */
export function ScreenSkeleton() {
  const t = useT();
  return (
    <div role="status" aria-busy="true" className="flex flex-1 flex-col gap-4 px-4 pt-4">
      <span className="sr-only">{t("common.loading")}</span>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-44 rounded-3xl" />
      <Skeleton className="h-24 rounded-3xl" />
      <Skeleton className="h-24 rounded-3xl" />
    </div>
  );
}
