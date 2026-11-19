// 노트북 시연용 휴대폰 틀의 상태 표시줄. 실제 휴대폰(768px 미만)에서는 그리지 않는다.
// 시각은 시연 기준값으로 고정한다 (CLAUDE.md 4-1: 화면에서 현재 시각을 쓰지 않는다).

import { BatteryFull, Signal, Wifi } from "lucide-react";
import { DEMO_CLOCK } from "@/config/demo";

export function StatusBar() {
  return (
    <div aria-hidden className="hidden h-11 shrink-0 items-center justify-between px-8 text-sm font-semibold md:flex">
      <span className="tabular-nums">{DEMO_CLOCK}</span>
      <span className="flex items-center gap-1.5">
        <Signal className="size-4" />
        <Wifi className="size-4" />
        <BatteryFull className="size-5" />
      </span>
    </div>
  );
}
