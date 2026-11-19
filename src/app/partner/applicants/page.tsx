"use client";

// 임시 화면: 7단계(렌털사 확인 화면)는 feat/partner-applicants에서 만든다.

import { useT } from "@/components/demo/DemoProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";

export default function ApplicantsPlaceholderPage() {
  const t = useT();
  return <ComingSoon title={t("placeholder.applicantsTitle")} body={t("placeholder.applicantsBody")} />;
}
