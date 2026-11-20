"use client";

// 신용도 옆 "가장 큰 이유" 한 줄 + 「평가 기준 보기」 창 (CLAUDE.md 4-5, 8절).
// 점수 옆에는 이유 하나를 늘 보여 주고, 이유 3개·요인 6개와 반영 비율·먼저 적용하는 규칙·등급표는 창에서 본다.
// 기사 화면 전용. 홈은 토글 목록의 한 줄에서 CriteriaSheet만 직접 연다.
// 신용 정보 타입은 riderView에서만 가져온다 (2-4).

import { ChevronRight, CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { useId, useState } from "react";
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

export function ReasonText({ reason }: { reason: SharedReason }) {
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

      <CriteriaSheet open={open} onClose={() => setOpen(false)} reasons={reasons} criteria={criteria} grade={grade} />
    </div>
  );
}

/**
 * 「평가 기준 보기」 창. 한 번에 한 묶음만 보이게 탭 3개로 나눈다 (2026-11-20: 한 창에 다 쌓으면 화면을 덮고 내리기 불편했다).
 * 이유(처음 열림) · 반영 비율(요인 6개 한 줄씩) · 등급(등급표 + 먼저 적용하는 규칙 + 가설 모델 표기)
 */
export function CriteriaSheet({ open, onClose, reasons, criteria, grade }: Props & { open: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Sheet open={open} onClose={onClose} title={t("credit.criteria.title")}>
      {/* Sheet는 닫히면 내용을 지우므로, 다시 열면 늘 「이유」 탭부터 보인다 */}
      <CriteriaTabs reasons={reasons} criteria={criteria} grade={grade} />
    </Sheet>
  );
}

const TABS = ["reasons", "factors", "grades"] as const;
type Tab = (typeof TABS)[number];

function CriteriaTabs({ reasons, criteria, grade }: Props) {
  const t = useT();
  const [tab, setTab] = useState<Tab>("reasons");
  const baseId = useId();
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label={t("credit.criteria.title")} className="grid grid-cols-3 gap-1 rounded-2xl bg-canvas p-1">
        {TABS.map((id) => (
          <button
            key={id}
            id={`${baseId}-${id}-tab`}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`${baseId}-${id}`}
            onClick={() => setTab(id)}
            className={`rounded-xl px-2 py-2 text-sm font-semibold transition ${tab === id ? "bg-surface text-brand-navy shadow-sm" : "text-muted"}`}
          >
            {t(`credit.criteria.tabs.${id}`)}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${baseId}-${tab}`} aria-labelledby={`${baseId}-${tab}-tab`} className="flex flex-col gap-3">
        {tab === "reasons" ? (
          <ol className="flex flex-col gap-2">
            {reasons.map((r, i) => (
              <li key={r.code} className="flex gap-3 rounded-2xl bg-canvas p-3 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-purple text-xs font-bold text-white">{i + 1}</span>
                <span>
                  <ReasonText reason={r} />
                </span>
              </li>
            ))}
          </ol>
        ) : null}

        {tab === "factors" ? (
          <>
            <p className="text-xs leading-relaxed text-muted">{t("credit.criteria.factorsBody")}</p>
            <ul className="flex flex-col divide-y divide-line">
              {criteria.map((f) => {
                const m = MARK[f.mark];
                const Icon = m.icon;
                return (
                  <li key={f.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                    <span className="font-medium">{t(`credit.factors.${f.id}`)}</span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-muted tabular-nums">{t("credit.criteria.weight", { w: f.weight })}</span>
                      <span className={`flex w-16 items-center justify-end gap-1 text-xs font-semibold ${m.color}`}>
                        <Icon className="size-3.5" aria-hidden />
                        {t(`credit.marks.${f.mark}`)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}

        {tab === "grades" ? (
          <>
            <ul className="flex flex-col overflow-hidden rounded-2xl ring-1 ring-line">
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
            <div>
              <h3 className="text-sm font-semibold">{t("credit.criteria.rulesTitle")}</h3>
              <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5 text-xs leading-relaxed text-muted">
                <li>{t("credit.criteria.rules.cap")}</li>
                <li>{t("credit.criteria.rules.hold")}</li>
              </ul>
            </div>
          </>
        ) : null}

        <p className="text-[11px] leading-relaxed text-muted">{t("credit.disclaimer")}</p>
      </div>
    </div>
  );
}
