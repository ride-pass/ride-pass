// 시연 7단계: 렌털사 직원이 업무용 화면(노트북)에서 보는 화면. 휴대폰 틀 없이 화면 전체 폭을 쓴다.
// 폭별 구성(카드 목록 / 표 + 상세 패널 / 사이드바)은 page.tsx 위쪽 설명을 본다.

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";

export default function ApplicantsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50">
      <ToastProvider>{children}</ToastProvider>
    </div>
  );
}
