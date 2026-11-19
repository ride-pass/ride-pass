// 기사 앱 화면 묶음. 휴대폰 틀(노트북에서는 휴대폰 모양) 안에 그린다.
// 화면이 바뀌면 맨 위에서 시작하는 처리도 PhoneFrame이 한다.

import type { ReactNode } from "react";
import { PhoneFrame } from "@/components/shell/PhoneFrame";

export default function RiderLayout({ children }: { children: ReactNode }) {
  return <PhoneFrame>{children}</PhoneFrame>;
}
