"use client";

// 임시 화면: 8단계(KUR 체크리스트)는 공식 조건을 확인한 뒤 feat/kur-checklist에서 만든다.

import { useT } from "@/components/demo/DemoProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";

export default function KurPlaceholderPage() {
  const t = useT();
  return <ComingSoon title={t("placeholder.kurTitle")} body={t("placeholder.kurBody")} />;
}
