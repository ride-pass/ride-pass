"use client";

// 신용도 옆에 반드시 붙는 「PKA 인가 후 제공 기능」 배지 (CLAUDE.md 2-4).
// 모양은 한 곳에서만 정한다: 연보라 바탕 + 보라 글자의 작은 알약 (6절).
// 2026-11-23: 심사위원이 PKA를 모르므로 누르면 한두 문장 설명 창이 열린다 (InfoBadge). 배지 문구는 그대로다.

import { useT } from "@/components/demo/DemoProvider";
import { InfoBadge } from "@/components/ui/InfoBadge";
import { APP_NAME } from "@/config/brand";

export function PkaBadge() {
  const t = useT();
  return (
    <InfoBadge
      label={t("credit.badge.pka_licensed_feature")}
      body={[t("credit.badgeInfo.body1"), t("credit.badgeInfo.body2", { app: APP_NAME })]}
    />
  );
}
