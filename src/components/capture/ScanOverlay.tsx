"use client";

// 문서 위를 위에서 아래로 한 번 훑는 인식 줄 (촬영 화면의 "AI가 읽는 중" 연출, CLAUDE.md 4-7).
// 부모는 relative + overflow-hidden이어야 한다. '동작 줄이기' 설정이면 줄이 움직이지 않고 옅은 막만 남는다.

export function ScanOverlay({ tone = "lime" }: { tone?: "lime" | "purple" }) {
  const line = tone === "lime" ? "bg-brand-lime" : "bg-brand-purple";
  const band = tone === "lime" ? "bg-brand-lime/15" : "bg-brand-purple/10";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      <div className="absolute inset-0 motion-safe:animate-scan">
        <div className={`h-10 -translate-y-full ${band}`} />
        <div className={`h-0.5 -translate-y-10 ${line}`} />
      </div>
    </div>
  );
}

/** 셔터를 누른 순간의 흰 플래시. key를 바꿔 다시 그리면 한 번 더 번쩍인다 */
export function ShutterFlash() {
  return <div aria-hidden className="pointer-events-none absolute inset-0 z-20 bg-white opacity-0 motion-safe:animate-flash" />;
}
