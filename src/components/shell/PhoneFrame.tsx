"use client";

// 기사가 휴대폰으로 보는 화면의 틀 (기사 앱, 가상 렌털사 신청 화면).
// - 768px 미만(휴대폰): 지금처럼 390px 폭 화면을 그대로 쓴다. 브라우저 창이 스크롤된다.
// - 768px 이상(노트북 시연): 390px 폭 휴대폰 모양 안에 띄우고, 휴대폰 화면 안쪽만 스크롤된다.
//   틀에 transform을 줘서 안쪽의 fixed 요소(바텀시트·토스트)가 브라우저 창이 아니라 휴대폰 화면에 붙는다.
// 다른 화면으로 넘어가면 맨 위에서 시작하고, 새 화면은 짧게 밀려 들어온다.

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { StatusBar } from "./StatusBar";

export function PhoneFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    scroller.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="md:flex md:min-h-dvh md:items-center md:justify-center md:py-8">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[390px] flex-col bg-canvas md:h-[min(844px,calc(100dvh-4rem))] md:min-h-0 md:w-[390px] md:max-w-none md:transform-gpu md:overflow-hidden md:rounded-[48px] md:shadow-2xl md:ring-[10px] md:ring-brand-navy">
        <StatusBar />
        <div ref={scroller} className="flex flex-1 flex-col md:min-h-0 md:overflow-y-auto md:overscroll-contain md:[scrollbar-width:none]">
          <ToastProvider>
            <div key={pathname} className="flex flex-1 flex-col motion-safe:animate-screen-in">
              {children}
            </div>
          </ToastProvider>
        </div>
      </div>
    </div>
  );
}
