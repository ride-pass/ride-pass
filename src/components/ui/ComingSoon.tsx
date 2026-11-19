"use client";

// 아직 만들지 않은 화면. 깨진 화면 대신 "준비 중"을 보여 준다 (CLAUDE.md 3절).

import { Construction } from "lucide-react";
import { useT } from "@/components/demo/DemoProvider";
import { AppHeader } from "./AppHeader";
import { Badge } from "./Badge";

export function ComingSoon({ title, body }: { title: string; body: string }) {
  const t = useT();
  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={title} />
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        <Construction className="size-12 text-brand-purple" aria-hidden />
        <Badge tone="neutral">{t("common.comingSoon")}</Badge>
        <p className="text-sm text-muted">{body}</p>
      </main>
    </div>
  );
}
