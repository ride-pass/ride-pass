"use client";

// 가상 서류 위에 비스듬히 까는 "SAMPLE · CONTOH" 워터마크 (CLAUDE.md 4-7, 2026-11-23).
// 서류 일부만 캡처해 발표 자료나 다른 곳에 옮겨도 진짜 서류로 보이지 않게 한다 (인니 형법 UU 1/2023 391조 문서 위조 취지).
// 부모는 relative + overflow-hidden이어야 한다. 읽기 도구에는 숨긴다(위쪽 「가상 예시」 띠가 같은 뜻을 전한다).

import { useT } from "@/components/demo/DemoProvider";

const ROWS = 6;

export function SampleWatermark() {
  const t = useT();
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden select-none">
      <div className="flex -rotate-[24deg] flex-col items-center gap-14">
        {Array.from({ length: ROWS }, (_, i) => (
          <span key={i} className="text-2xl font-black tracking-[0.3em] whitespace-nowrap text-danger/15">
            {t("samples.watermark")}
          </span>
        ))}
      </div>
    </div>
  );
}
