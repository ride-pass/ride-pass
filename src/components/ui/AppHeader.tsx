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
}

export function AppHeader({ title, back = true, right }: Props) {
  const router = useRouter();
  const t = useT();
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 bg-canvas px-4">
      {back ? (
        <button
          type="button"
          aria-label={t("common.back")}
          onClick={() => (typeof back === "string" ? router.push(back) : router.back())}
          className="-ml-2 rounded-full p-2 active:bg-lavender"
        >
          <ArrowLeft className="size-6" aria-hidden />
        </button>
      ) : null}
      <h1 className="flex-1 truncate text-lg font-bold">{title}</h1>
      {right}
    </header>
  );
}
