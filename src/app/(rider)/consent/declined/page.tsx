"use client";

// 동의하지 않았을 때. 거절해도 렌털 신청은 그대로 진행된다 (CLAUDE.md 3절 3단계).

import { CircleCheck } from "lucide-react";
import { useT } from "@/components/demo/DemoProvider";
import { AppHeader } from "@/components/ui/AppHeader";
import { BottomBar } from "@/components/ui/BottomBar";
import { ButtonLink } from "@/components/ui/Button";

export default function ConsentDeclinedPage() {
  const t = useT();
  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t("consent.header")} />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <CircleCheck className="size-14 text-brand-purple" aria-hidden />
        <h2 className="text-xl font-bold">{t("consent.declinedTitle")}</h2>
        <p className="text-[15px] leading-relaxed text-muted">{t("consent.declinedBody")}</p>
      </main>
      <BottomBar>
        <ButtonLink href="/partner/apply">{t("consent.backToApply")}</ButtonLink>
        <ButtonLink href="/consent" variant="secondary">
          {t("consent.reconsider")}
        </ButtonLink>
      </BottomBar>
    </div>
  );
}
