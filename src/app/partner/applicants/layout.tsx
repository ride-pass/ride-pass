// 시연 7단계: 렌털사 직원이 업무용 화면(노트북)에서 보는 화면. 휴대폰 틀 없이 화면 전체 폭을 쓴다.
// 데스크톱 업무 화면 구성(사이드바·표·상세 패널)은 feat/partner-console에서 만든다.

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";

export default function ApplicantsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-zinc-50">
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">
        <ToastProvider>{children}</ToastProvider>
      </div>
    </div>
  );
}
