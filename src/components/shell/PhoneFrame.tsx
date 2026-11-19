"use client";

// 기사가 휴대폰으로 보는 화면의 틀 (기사 앱, 가상 렌털사 신청 화면).
// - 768px 미만(휴대폰): 지금처럼 390px 폭 화면을 그대로 쓴다. 브라우저 창이 스크롤된다.
// - 768px 이상(노트북 시연): 390px 폭 휴대폰 모양 안에 띄우고, 휴대폰 화면 안쪽만 스크롤된다.
//   틀에 transform을 줘서 안쪽의 fixed 요소(바텀시트·토스트)가 브라우저 창이 아니라 휴대폰 화면에 붙는다.
// 다른 화면으로 넘어가면 맨 위에서 시작하고, 새 화면은 짧게 밀려 들어온다.
// 인쇄할 때(수입 명세서 「인쇄 · PDF로 저장」)는 휴대폰 모양을 풀어 내용만 종이 폭으로 나온다.

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { StatusBar } from "./StatusBar";

/** watchers: 화면이 바뀌어도 다시 만들지 않는 보이지 않는 요소 (예: 새 알림 토스트) */
export function PhoneFrame({ children, watchers }: { children: ReactNode; watchers?: ReactNode }) {
  const pathname = usePathname();
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    scroller.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="md:flex md:min-h-dvh md:items-center md:justify-center md:py-8 print:block print:p-0">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[390px] flex-col bg-canvas md:h-[min(844px,calc(100dvh-4rem))] md:min-h-0 md:w-[390px] md:max-w-none md:transform-gpu md:overflow-hidden md:rounded-[48px] md:shadow-2xl md:ring-[10px] md:ring-brand-navy print:h-auto print:min-h-0 print:w-full print:max-w-none print:transform-none print:overflow-visible print:rounded-none print:bg-surface print:shadow-none print:ring-0">
        <StatusBar />
        <div ref={scroller} className="flex flex-1 flex-col md:min-h-0 md:overflow-y-auto md:overscroll-contain md:[scrollbar-width:none] print:overflow-visible">
          <ToastProvider>
            {watchers}
            <div key={pathname} className="flex flex-1 flex-col motion-safe:animate-screen-in">
              {children}
            </div>
          </ToastProvider>
        </div>
      </div>
    </div>
  );
}
