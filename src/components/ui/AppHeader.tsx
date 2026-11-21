"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useT } from "@/components/demo/DemoProvider";

interface Props {
  title: string;
  /** true면 브라우저 뒤로가기, 문자열이면 그 주소로 */
  back?: boolean | string;
  right?: ReactNode;
  /** 하단 탭 화면(내 신용·추천·마이)의 큰 제목: 24px, 위에 붙지 않고 바탕 위에 바로 놓인다 (CLAUDE.md 6절) */
  large?: boolean;
}

export function AppHeader({ title, back = true, right, large = false }: Props) {
  const router = useRouter();
  const t = useT();
  const backButton = back ? (
    <button
      type="button"
      aria-label={t("common.back")}
      onClick={() => (typeof back === "string" ? router.push(back) : router.back())}
      className="-ml-2 grid size-10 shrink-0 place-items-center rounded-full active:bg-line"
    >
      <ArrowLeft className="size-6" aria-hidden />
    </button>
  ) : null;

  if (large) {
    return (
      <header className="flex min-h-14 flex-wrap items-center gap-x-2 gap-y-1 px-4 pt-5 pb-1">
        {backButton}
        <h1 className="min-w-0 flex-1 text-2xl leading-tight font-bold tracking-[-0.01em]">{title}</h1>
        {right}
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 bg-canvas px-4">
      {backButton}
      <h1 className="flex-1 truncate text-lg font-bold">{title}</h1>
      {right}
    </header>
  );
}
