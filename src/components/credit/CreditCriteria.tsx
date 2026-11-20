"use client";

// 신용도 옆 "가장 큰 이유" 한 줄 + 「평가 기준 보기」 창 (CLAUDE.md 4-5, 8절).
// 점수 옆에는 이유 하나를 늘 보여 주고, 이유 3개·요인 6개와 반영 비율·먼저 적용하는 규칙·등급표는 창에서 본다.
// 기사 화면 전용. 렌털사 화면은 판단 근거라 이유 3개를 바로 보여 준다 (ApplicantParts).
// 신용 정보 타입은 riderView에서만 가져온다 (2-4).

import { ChevronRight, CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useT } from "@/components/demo/DemoProvider";
import { Sheet } from "@/components/ui/Sheet";
import type { CriteriaFactor, ReadinessMark, SharedReason } from "@/credit/riderView";

const MARK: Record<ReadinessMark, { icon: typeof CircleCheck; color: string }> = {
  met: { icon: CircleCheck, color: "text-lime-ink" },
  partial: { icon: TriangleAlert, color: "text-brand-purple" },
  unmet: { icon: CircleX, color: "text-danger" },
};

/** 등급표 (CLAUDE.md 4-5) */
const GRADES = [
  { grade: "A", from: 800, to: 900 },
  { grade: "B", from: 700, to: 799 },
  { grade: "C", from: 600, to: 699 },
  { grade: "D", from: 500, to: 599 },
  { grade: "E", from: 400, to: 499 },
] as const;

interface Props {
  /** 엔진이 고른 이유 3개. 첫 번째가 가장 큰 이유다 */
  reasons: SharedReason[];
  criteria: CriteriaFactor[];
  /** 지금 등급 (등급표에서 표시) */
  grade?: string;
}

function ReasonText({ reason }: { reason: SharedReason }) {
  const t = useT();
  return (
    <>
      {t(`credit.reasons.${reason.code}`)}
      {reason.sources?.length ? (
        <span className="block text-xs text-muted">
          {reason.sources.map((s) => t(`credit.repaymentSources.${s}`)).join(" · ")}
        </span>
      ) : null}
    </>
  );
}

/** 가장 큰 이유 한 줄과 「평가 기준 보기」 버튼. 버튼을 누르면 아래에서 창이 올라온다 */
export function CreditCriteria({ reasons, criteria, grade }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const top = reasons[0];

  return (
    <div className="flex flex-col gap-2">
      {top ? (
        <div className="rounded-2xl bg-canvas p-3 text-sm">
          <p className="text-xs font-semibold text-muted">{t("credit.criteria.topReason")}</p>
          <p className="mt-0.5 font-medium">
            <ReasonText reason={top} />
          </p>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-semibold text-brand-purple ring-1 ring-line transition active:scale-[0.99]"
      >
        {t("credit.criteria.open")}
        <ChevronRight className="size-4" aria-hidden />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={t("credit.criteria.title")}>
        <div className="flex max-h-[62dvh] flex-col gap-5 overflow-y-auto pr-1">
          <section>
            <h3 className="text-sm font-semibold">{t("credit.criteria.reasonsTitle")}</h3>
            <ol className="mt-2 flex flex-col gap-2">
              {reasons.map((r, i) => (
                <li key={r.code} className="flex gap-3 rounded-2xl bg-canvas p-3 text-sm">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-purple text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span>
                    <ReasonText reason={r} />
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h3 className="text-sm font-semibold">{t("credit.criteria.factorsTitle")}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">{t("credit.criteria.factorsBody")}</p>
            <ul className="mt-2 flex flex-col gap-2.5">
              {criteria.map((f) => {
                const m = MARK[f.mark];
                const Icon = m.icon;
                return (
                  <li key={f.id} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium">{t(`credit.factors.${f.id}`)}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-muted tabular-nums">{t("credit.criteria.weight", { w: f.weight })}</span>
                        <span className={`flex items-center gap-1 text-xs font-semibold ${m.color}`}>
                          <Icon className="size-3.5" aria-hidden />
                          {t(`credit.marks.${f.mark}`)}
                        </span>
                      </span>
                    </div>
                    {/* 막대 길이 = 반영 비율 (가장 큰 25를 기준으로) */}
                    <span className="h-1.5 rounded-full bg-line" aria-hidden>
                      <span className="block h-full rounded-full bg-brand-purple" style={{ width: `${(f.weight / 25) * 100}%` }} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-semibold">{t("credit.criteria.rulesTitle")}</h3>
            <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed">
              <li>{t("credit.criteria.rules.cap")}</li>
              <li>{t("credit.criteria.rules.hold")}</li>
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-semibold">{t("credit.criteria.gradesTitle")}</h3>
            <ul className="mt-2 flex flex-col overflow-hidden rounded-2xl ring-1 ring-line">
              {GRADES.map((g) => (
                <li
                  key={g.grade}
                  className={`flex items-center justify-between px-3 py-2 text-sm ${g.grade === grade ? "bg-lavender font-semibold" : ""}`}
                >
                  <span>
                    {g.grade} · {t(`credit.grades.${g.grade}`)}
                  </span>
                  <span className="text-muted tabular-nums">{t("credit.criteria.gradeRange", { from: g.from, to: g.to })}</span>
                </li>
              ))}
            </ul>
          </section>

          <p className="text-[11px] leading-relaxed text-muted">{t("credit.disclaimer")}</p>
        </div>
      </Sheet>
    </div>
  );
}
