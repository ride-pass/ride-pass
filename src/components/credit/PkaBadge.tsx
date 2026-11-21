"use client";

// 신용도 옆에 반드시 붙는 「PKA 인가 후 제공 기능」 배지 (CLAUDE.md 2-4).
// 모양은 한 곳에서만 정한다: 연보라 바탕 + 보라 글자의 작은 알약 (6절).

import { useT } from "@/components/demo/DemoProvider";
import { Badge } from "@/components/ui/Badge";

export function PkaBadge() {
  const t = useT();
  return <Badge tone="lavender">{t("credit.badge.pka_licensed_feature")}</Badge>;
}
