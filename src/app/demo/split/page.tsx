"use client";

// 시연 조작판의 「분할 보기」: 노트북 한 화면에 왼쪽 기사 휴대폰, 오른쪽 렌털사 직원 화면을 나란히 띄운다.
// 두 화면은 iframe이라 메모리가 따로지만, data/demoSync.ts가 변경 내용을 서로 전해 같은 상태를 유지한다.
// 오른쪽에서 승인을 누르면 왼쪽 휴대폰에 바로 알림이 뜬다. 새로고침하면 둘 다 처음으로 돌아간다 (CLAUDE.md 4-8).
// 조작판은 이 화면에만 뜨고(?demo=1), 시연 단계로 바로 가기는 해당 쪽 iframe만 옮긴다.
// 처음 열면 왼쪽은 기사 홈, 오른쪽은 렌털사 신청자 목록이다.

import { useT } from "@/components/demo/DemoProvider";
import { StatusBar } from "@/components/shell/StatusBar";

export default function SplitPage() {
  const t = useT();
  return (
    <div className="flex h-dvh gap-6 bg-zinc-200 p-6">
      <section className="flex shrink-0 flex-col items-center gap-2">
        <h1 className="text-xs font-semibold text-zinc-600">{t("demo.splitRider")}</h1>
        <div className="flex h-[min(844px,calc(100dvh-5rem))] w-[390px] flex-col overflow-hidden rounded-[48px] bg-canvas shadow-2xl ring-[10px] ring-brand-navy">
          <StatusBar />
          {/* 기사 폰은 홈에서 시작한다. 시연 1단계(렌털 신청 화면)는 조작판 「시연 단계로 바로 가기」 1로 간다 */}
          <iframe src="/home?frame=rider" title={t("demo.splitRider")} className="min-h-0 w-full flex-1" />
        </div>
      </section>
      <section className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 className="text-xs font-semibold text-zinc-600">{t("demo.splitPartner")}</h2>
        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl bg-zinc-50 shadow-xl ring-1 ring-line">
          <iframe src="/partner/applicants?frame=partner" title={t("demo.splitPartner")} className="size-full" />
        </div>
      </section>
    </div>
  );
}
