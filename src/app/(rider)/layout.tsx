"use client";

// 기사 앱 화면 묶음. 다른 화면으로 넘어가면 맨 위에서 시작한다
// (앞 화면의 스크롤 위치가 남아 긴 화면 중간부터 보이는 일을 막는다).

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export default function RiderLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return <>{children}</>;
}
