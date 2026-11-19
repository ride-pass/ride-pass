import type { ReactNode } from "react";

/** 화면 아래에 붙는 버튼 영역 */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 mt-auto flex flex-col gap-2 bg-gradient-to-t from-canvas via-canvas to-canvas/0 px-4 pt-6 pb-6">
      {children}
    </div>
  );
}
