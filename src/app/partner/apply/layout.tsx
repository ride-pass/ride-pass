// 시연 1단계: 기사가 휴대폰으로 여는 가상 렌털사 신청 화면. 기사 앱과 같은 휴대폰 틀에 그린다.

import type { ReactNode } from "react";
import { PhoneFrame } from "@/components/shell/PhoneFrame";

export default function ApplyLayout({ children }: { children: ReactNode }) {
  return <PhoneFrame>{children}</PhoneFrame>;
}
