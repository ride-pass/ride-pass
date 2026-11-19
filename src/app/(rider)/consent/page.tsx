"use client";

// 임시 화면: 3단계(동의)는 다음 PR(feat/consent-capture)에서 만든다. 깨진 화면 대신 "준비 중"을 보여 준다.

import { Construction } from "lucide-react";
import { useT } from "@/components/demo/DemoProvider";
import { AppHeader } from "@/components/ui/AppHeader";
import { Badge } from "@/components/ui/Badge";

export default function ConsentPlaceholderPage() {
  const t = useT();
  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t("placeholder.consentTitle")} />
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        <Construction className="size-12 text-brand-purple" aria-hidden />
        <Badge tone="neutral">{t("common.comingSoon")}</Badge>
        <p className="text-sm text-muted">{t("placeholder.consentBody")}</p>
      </main>
    </div>
  );
}
