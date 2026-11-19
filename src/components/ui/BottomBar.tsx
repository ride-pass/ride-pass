import type { ReactNode } from "react";

/** 화면 아래에 붙는 버튼 영역. 반투명·그라데이션 없이 단색 바탕과 얇은 윗선으로 내용과 나눈다 */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 mt-auto flex flex-col gap-2 border-t border-line/70 bg-canvas px-4 pt-3 pb-5">
      {children}
    </div>
  );
}
