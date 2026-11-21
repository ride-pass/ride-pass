"use client";

// 시연 6단계: 내 신용 상태 (CLAUDE.md 3절, 2-4). 2026-11-21 새 디자인 기준(6절)으로 다시 짰다:
// 카드 없이 크림 바탕 위에 점수 → 400~900 등급 눈금 → 이유 → 요인 표(구분선) → 개선 방법(유일한 강조 블록) → KUR 줄.
// 신용 정보는 getRiderCreditView()에서만 받는다. 엔진을 직접 import하지 않는다 (eslint로 막음).
// A단계: 신용 준비도(✓/△/✗)와 개선 방법만, 숫자 점수 없음. C단계: 신용도·등급·이유 + 「PKA 인가 후 제공 기능」 배지.

import { CameraOff, ChevronRight, CircleCheck, CircleX, Info, Lightbulb, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { AppHeader } from "@/components/ui/AppHeader";
import { ButtonLink } from "@/components/ui/Button";
import { TabBar } from "@/components/ui/TabBar";
import { CreditCriteria } from "@/components/credit/CreditCriteria";
import { PkaBadge } from "@/components/credit/PkaBadge";
import { getRiderCreditView, type ReadinessFactor, type ReadinessMark, type RiderCreditView } from "@/credit/riderView";

export default function CreditPage() {
  const t = useT();
  const { riderId, stage, dataVersion } = useDemo();
  const [view, setView] = useState<RiderCreditView | null>(null);

  useEffect(() => {
    getRiderCreditView(riderId, stage).then(setView);
    // dataVersion: 조작판 초기화(재촬영 취소 등) 뒤 다시 읽는다
  }, [riderId, stage, dataVersion]);

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t("creditPage.header")} back="/home" large />
      <main className="flex flex-col px-4 pt-3 pb-10">
        {view?.status === "hold" ? <HoldView view={view} /> : null}
        {view?.status === "readiness" ? (
          <>
            {/* 숫자 점수 대신 충족한 요인 수. 칸 하나 = 요인 하나 (✓ 보라, △ 연보라, ✗ 회색) */}
            <section className="flex flex-col">
              <p className="text-sm text-muted">{t("credit.readiness.title")}</p>
              <p className="mt-1 flex items-baseline gap-1.5 tabular-nums">
                <span className="text-figure font-bold">{view.metCount}</span>
                <span className="text-base text-muted">/ {view.totalCount}</span>
              </p>
              <p className="mt-2 text-base font-semibold">{t("credit.readiness.summary", { met: view.metCount })}</p>
              <span className="mt-4 grid grid-cols-5 gap-1" aria-hidden>
                {view.factors.map((f) => (
                  <span
                    key={f.id}
                    className={`h-1.5 rounded-full ${f.mark === "met" ? "bg-brand-purple" : f.mark === "partial" ? "bg-lavender-strong" : "bg-line-strong"}`}
                  />
                ))}
              </span>
              <p className="mt-3 text-xs leading-relaxed text-muted">{t("creditPage.aNote")}</p>
            </section>
            <FactorList factors={view.factors} />
            <Improvement action={view.improvement} />
          </>
        ) : null}
        {view?.status === "scored" ? (
          <>
            <section aria-label={t("tabs.credit")} className="flex flex-col">
              <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
                <p className="flex items-baseline gap-1.5 tabular-nums">
                  <span className="text-figure font-bold">{view.score}</span>
                  <span className="text-base text-muted">/ 900</span>
                </p>
                <PkaBadge />
              </div>
              <p className="mt-2 text-base font-semibold">
                {view.grade} · {t(`credit.grades.${view.grade}`)}
              </p>
              <GradeScale score={view.score} grade={view.grade} />
              <p className="mt-3 text-[11px] leading-relaxed text-muted">{t("credit.disclaimer")}</p>
            </section>
            <section aria-labelledby="credit-reasons" className="mt-8 border-t border-line pt-6">
              <h2 id="credit-reasons" className="text-base font-bold">
                {t("creditPage.reasonsTitle")}
              </h2>
              {/* 이유 3개·요인 6개·규칙·등급표는 「평가 기준 보기」 창에서 (CLAUDE.md 8절) */}
              <div className="mt-3">
                <CreditCriteria reasons={view.reasons} criteria={view.criteria} grade={view.grade} />
              </div>
            </section>
            <FactorList factors={view.factors} />
            <Improvement action={view.improvement} />
          </>
        ) : null}
        {view ? (
          <Link
            href="/kur"
            className="mt-6 flex min-h-14 items-center justify-between gap-3 border-y border-line text-base font-semibold active:opacity-70"
          >
            {t("creditPage.toKur")}
            <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
          </Link>
        ) : null}
      </main>
      <TabBar />
    </div>
  );
}

/** 400~900 눈금. 등급 구간 다섯 칸 위에 내 점수 자리를 보라 점 하나로 찍는다 (데이터 한 곳) */
const BANDS = ["E", "D", "C", "B", "A"] as const;

function GradeScale({ score, grade }: { score: number; grade: string }) {
  const pos = Math.min(1, Math.max(0, (score - 400) / 500)) * 100;
  return (
    <div className="mt-5" aria-hidden>
      <div className="relative">
        <div className="grid grid-cols-5 gap-0.5">
          {BANDS.map((b) => (
            <span key={b} className={`h-1.5 ${b === grade ? "bg-brand-navy" : "bg-line-strong"} first:rounded-l-full last:rounded-r-full`} />
          ))}
        </div>
        <span
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-canvas bg-brand-purple"
          style={{ left: `${pos}%` }}
        />
      </div>
      <div className="mt-2 grid grid-cols-5 text-center text-xs tabular-nums">
        {BANDS.map((b) => (
          <span key={b} className={b === grade ? "font-bold text-brand-navy" : "text-muted"}>
            {b}
          </span>
        ))}
      </div>
      <div className="mt-0.5 flex justify-between text-[11px] text-muted tabular-nums">
        <span>400</span>
        <span>900</span>
      </div>
    </div>
  );
}

/** 충족한 요인은 무채색, 보통·부족만 색을 쓴다 */
const MARK: Record<ReadinessMark, { bars: number; icon: typeof CircleCheck; text: string; bar: string }> = {
  met: { bars: 3, icon: CircleCheck, text: "text-muted", bar: "bg-brand-navy" },
  partial: { bars: 2, icon: TriangleAlert, text: "text-brand-purple", bar: "bg-brand-purple" },
  unmet: { bars: 1, icon: CircleX, text: "text-danger", bar: "bg-danger" },
};

function FactorList({ factors }: { factors: ReadinessFactor[] }) {
  const t = useT();
  return (
    <section aria-labelledby="credit-factors" className="mt-8 border-t border-line pt-6">
      <h2 id="credit-factors" className="text-base font-bold">
        {t("creditPage.factorsTitle")}
      </h2>
      <ul className="mt-2 flex flex-col divide-y divide-line">
        {factors.map((f) => {
          const m = MARK[f.mark];
          const Icon = m.icon;
          return (
            <li key={f.id} className="flex min-h-12 items-center gap-3 py-2 text-sm">
              <span className="min-w-0 flex-1 font-medium">{t(`credit.factors.${f.id}`)}</span>
              <span className="grid w-14 shrink-0 grid-cols-3 gap-0.5" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span key={i} className={`h-1 rounded-full ${i < m.bars ? m.bar : "bg-line-strong"}`} />
                ))}
              </span>
              <span className={`flex w-16 shrink-0 items-center justify-end gap-1 text-xs font-semibold ${m.text}`}>
                <Icon className="size-3.5" aria-hidden />
                {t(`credit.marks.${f.mark}`)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** 이 화면에서 유일한 강조 블록: 지금 할 수 있는 한 가지 */
function Improvement({ action }: { action: string }) {
  const t = useT();
  return (
    <section className="mt-6 flex gap-3 rounded-3xl bg-lavender p-4">
      <Lightbulb className="mt-0.5 size-5 shrink-0 text-brand-purple" aria-hidden />
      <div>
        <h2 className="text-sm font-semibold text-brand-purple">{t("creditPage.improveTitle")}</h2>
        <p className="mt-1 text-base leading-snug font-medium">{t(`credit.actions.${action}`)}</p>
      </div>
    </section>
  );
}

function HoldView({ view }: { view: Extract<RiderCreditView, { status: "hold" }> }) {
  const t = useT();
  const retake = view.holds.includes("NEED_RETAKE");
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-base font-bold">
        <Info className="size-5 text-danger" aria-hidden />
        {t("credit.holds.title")}
      </h2>
      <ul className="flex flex-col gap-1 text-sm text-muted">
        {view.holds.map((h) => (
          <li key={h}>{t(`credit.holds.${h}`)}</li>
        ))}
      </ul>
      {view.actions.map((a) => (
        <p key={a} className="rounded-3xl bg-lavender p-4 text-base font-medium">
          {t(`credit.actions.${a}`)}
        </p>
      ))}
      {retake ? (
        <ButtonLink href="/capture" icon={<CameraOff className="size-5" aria-hidden />}>
          {t("creditPage.goRetake")}
        </ButtonLink>
      ) : null}
    </section>
  );
}
