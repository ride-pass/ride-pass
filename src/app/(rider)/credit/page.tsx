"use client";

// 시연 6단계: 내 신용 상태 (CLAUDE.md 3절, 2-4).
// 신용 정보는 getRiderCreditView()에서만 받는다. 엔진을 직접 import하지 않는다 (eslint로 막음).
// A단계: 신용 준비도(✓/△/✗)와 개선 방법만, 숫자 점수 없음. C단계: 신용도·등급·이유 + 「PKA 인가 후 제공 기능」 배지.

import { BadgeCheck, CameraOff, CircleCheck, CircleX, ClipboardList, Info, Lightbulb, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { AppHeader } from "@/components/ui/AppHeader";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TabBar } from "@/components/ui/TabBar";
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
      <AppHeader title={t("creditPage.header")} back="/home" />
      <main className="flex flex-col gap-4 px-4 pt-2 pb-6">
        {view?.status === "hold" ? <HoldView view={view} /> : null}
        {view?.status === "readiness" ? (
          <>
            {/* 숫자 점수 대신 충족한 요인 수. 칸 하나 = 요인 하나 (✓ 보라, △ 연보라, ✗ 회색) */}
            <Card className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-brand-purple">{t("credit.readiness.title")}</p>
              <p className="flex items-baseline gap-1.5 tabular-nums">
                <span className="text-[44px] leading-none font-bold text-brand-purple">{view.metCount}</span>
                <span className="text-xl font-bold text-muted">/ {view.totalCount}</span>
              </p>
              <p className="text-base font-semibold">{t("credit.readiness.summary", { met: view.metCount })}</p>
              <span className="grid grid-cols-5 gap-1" aria-hidden>
                {view.factors.map((f) => (
                  <span
                    key={f.id}
                    className={`h-2 rounded-full ${f.mark === "met" ? "bg-brand-purple" : f.mark === "partial" ? "bg-lavender-strong" : "bg-line"}`}
                  />
                ))}
              </span>
              <p className="text-xs leading-relaxed text-muted">{t("creditPage.aNote")}</p>
            </Card>
            <FactorList factors={view.factors} />
            <Improvement action={view.improvement} />
          </>
        ) : null}
        {view?.status === "scored" ? (
          <>
            <Card tone="purple" className="flex flex-col items-center gap-3 text-center">
              <Badge tone="lime">{t("credit.badge.pka_licensed_feature")}</Badge>
              <ScoreGauge score={view.score} />
              <p className="text-lg font-bold">
                {view.grade} · {t(`credit.grades.${view.grade}`)}
              </p>
              <p className="text-[11px] leading-relaxed text-white/70">{t("credit.disclaimer")}</p>
            </Card>
            <Card className="flex flex-col gap-3">
              <p className="flex items-center gap-2 font-semibold">
                <ClipboardList className="size-5 text-brand-purple" aria-hidden />
                {t("creditPage.reasonsTitle")}
              </p>
              <ol className="flex flex-col gap-2">
                {view.reasons.map((r, i) => (
                  <li key={r.code} className="flex gap-3 rounded-2xl bg-canvas p-3 text-sm">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-purple text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span>
                      {t(`credit.reasons.${r.code}`)}
                      {r.sources?.length ? (
                        <span className="block text-xs text-muted">
                          {r.sources.map((s) => t(`credit.repaymentSources.${s}`)).join(" · ")}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
            <FactorList factors={view.factors} />
            <Improvement action={view.improvement} />
          </>
        ) : null}
        {view ? (
          <ButtonLink href="/kur" variant="secondary">
            {t("creditPage.toKur")}
          </ButtonLink>
        ) : null}
      </main>
      <TabBar />
    </div>
  );
}

const MARK: Record<ReadinessMark, { bars: number; icon: typeof CircleCheck; color: string }> = {
  met: { bars: 3, icon: CircleCheck, color: "text-lime-ink" },
  partial: { bars: 2, icon: TriangleAlert, color: "text-brand-purple" },
  unmet: { bars: 1, icon: CircleX, color: "text-danger" },
};

function FactorList({ factors }: { factors: ReadinessFactor[] }) {
  const t = useT();
  return (
    <Card className="flex flex-col gap-3">
      <p className="flex items-center gap-2 font-semibold">
        <BadgeCheck className="size-5 text-brand-purple" aria-hidden />
        {t("creditPage.factorsTitle")}
      </p>
      <ul className="flex flex-col gap-3">
        {factors.map((f) => {
          const m = MARK[f.mark];
          const Icon = m.icon;
          return (
            <li key={f.id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{t(`credit.factors.${f.id}`)}</span>
                <span className={`flex items-center gap-1 text-xs font-semibold ${m.color}`}>
                  <Icon className="size-4" aria-hidden />
                  {t(`credit.marks.${f.mark}`)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span key={i} className={`h-2 rounded-full ${i < m.bars ? "bg-brand-purple" : "bg-line"}`} />
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Improvement({ action }: { action: string }) {
  const t = useT();
  return (
    <Card tone="lavender" className="flex gap-3">
      <Lightbulb className="size-5 shrink-0 text-brand-purple" aria-hidden />
      <div>
        <p className="text-sm font-semibold text-brand-purple">{t("creditPage.improveTitle")}</p>
        <p className="mt-1 text-sm">{t(`credit.actions.${action}`)}</p>
      </div>
    </Card>
  );
}

function HoldView({ view }: { view: Extract<RiderCreditView, { status: "hold" }> }) {
  const t = useT();
  const retake = view.holds.includes("NEED_RETAKE");
  return (
    <Card className="flex flex-col gap-3 ring-2 ring-danger">
      <p className="flex items-center gap-2 text-lg font-bold">
        <Info className="size-5 text-danger" aria-hidden />
        {t("credit.holds.title")}
      </p>
      <ul className="flex flex-col gap-1 text-sm text-muted">
        {view.holds.map((h) => (
          <li key={h}>{t(`credit.holds.${h}`)}</li>
        ))}
      </ul>
      {view.actions.map((a) => (
        <p key={a} className="rounded-2xl bg-lavender p-3 text-sm font-medium">
          {t(`credit.actions.${a}`)}
        </p>
      ))}
      {retake ? (
        <ButtonLink href="/capture" icon={<CameraOff className="size-5" aria-hidden />}>
          {t("creditPage.goRetake")}
        </ButtonLink>
      ) : null}
    </Card>
  );
}

/** 400~900 원형 게이지 (Figma 홈의 원형 게이지 자리) */
function ScoreGauge({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const ratio = Math.min(1, Math.max(0, (score - 400) / 500));
  return (
    <div className="relative size-36">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-white/20" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${c * ratio} ${c}`}
          className="stroke-brand-lime"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center">
        <span className="text-4xl font-bold">{score}</span>
      </span>
    </div>
  );
}
