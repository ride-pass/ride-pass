"use client";

// 임시 화면: 5단계(수입 명세서)는 다음 PR(feat/income-statement)에서 만든다.

import { useT } from "@/components/demo/DemoProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";

export default function CertificatePlaceholderPage() {
  const t = useT();
  return <ComingSoon title={t("placeholder.statementTitle")} body={t("placeholder.statementBody")} />;
}
