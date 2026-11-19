"use client";

// 데스크톱 업무 화면에서 신청자 한 명을 누르면 오른쪽에서 열리는 상세 패널.
// 위에서부터: 신청자·상태 → 정산 vs 입금 차트와 한 줄 결론 → 사실 리포트 → (C단계) 신용도 → 승인·거절.
// 승인 여부는 렌털사가 정한다 (CLAUDE.md 1절). 기사가 공유하지 않은 항목은 "공유 안 함"으로만 보인다.

import { Check, CircleAlert, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { Badge } from "@/components/ui/Badge";
import type { ApplicantRow } from "@/credit/partnerView";
import type { Application } from "@/data/types";
import { formatDate, formatRupiah } from "@/lib/format";
import { CreditBlock, Facts, StatusBadge, pct } from "./ApplicantParts";
import { DepositChart } from "./DepositChart";

interface Props {
  row: ApplicantRow;
  name: string;
  onClose(): void;
  onDecide(app: Application, status: Application["status"]): void;
}

export function ApplicantDrawer({ row, name, onClose, onDecide }: Props) {
  const t = useT();
  const { lang } = useDemo();
  const panel = useRef<HTMLElement>(null);
  const { application, report } = row;
  const shared = report.status === "shared" ? report : null;
  const income = shared?.facts.income ?? null;
  const last = income?.vsDeposits.at(-1);

  useEffect(() => {
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, application.id]);

  return (
    <div className="fixed inset-0 z-40 hidden justify-end console:flex">
      <button type="button" aria-label={t("common.close")} onClick={onClose} className="absolute inset-0 bg-zinc-900/20 motion-safe:animate-fade-in" />
      <aside
        ref={panel}
        tabIndex={-1}
        aria-label={name}
        className="relative flex h-full w-[460px] max-w-full flex-col bg-surface shadow-2xl outline-none motion-safe:animate-drawer-in"
      >
        <header className="flex items-start gap-3 border-b border-line px-6 py-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-lavender font-bold text-brand-purple">{name.charAt(0)}</span>
          <div className="min-w-0 flex-1">
            <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold text-zinc-900">
              {name}
              <StatusBadge status={application.status} />
            </h2>
            <p className="text-sm text-zinc-500">
              {shared?.rider.area ? `${shared.rider.area} · ` : ""}
              {t("applicants.submitted", { date: formatDate(application.submittedAt, lang) })}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("common.close")} className="-mr-2 rounded-full p-2 text-zinc-500 hover:bg-zinc-100">
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
          {shared ? (
            <>
              {income && last ? (
                <section className="flex flex-col gap-3 rounded-xl bg-zinc-50 p-4">
                  <DepositChart blocks={income.vsDeposits} />
                  {income.depositMatched ? (
                    <p className="text-sm text-zinc-700">{t("applicants.chart.matched", { rate: pct(income.depositMatchRate ?? 0) })}</p>
                  ) : (
                    <p className="flex items-start gap-1.5 text-sm font-semibold text-danger">
                      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                      {t("applicants.chart.mismatch", {
                        diff: formatRupiah(Math.max(0, last.settled - last.deposited)),
                        rate: pct(income.depositMatchRate ?? 0),
                      })}
                    </p>
                  )}
                </section>
              ) : null}
              {shared.facts.warnings.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {shared.facts.warnings.map((w) => (
                    <Badge key={w} tone="danger" icon={<CircleAlert className="size-3.5" aria-hidden />}>
                      {t(`warnings.${w}`)}
                    </Badge>
                  ))}
                </div>
              ) : null}
              <Facts facts={shared.facts} />
              {shared.credit ? <CreditBlock credit={shared.credit} /> : null}
              <p className="text-xs text-zinc-500">{t("applicants.sharedUntil", { date: formatDate(shared.grant.expiresAt, lang) })}</p>
            </>
          ) : (
            <p className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600">{t("applicants.noConsent")}</p>
          )}
        </div>

        <footer className="flex flex-col gap-2 border-t border-line px-6 py-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onDecide(application, "rejected")}
              disabled={application.status !== "pending"}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-100 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-40"
            >
              <X className="size-4" aria-hidden />
              {t("applicants.reject")}
            </button>
            <button
              type="button"
              onClick={() => onDecide(application, "approved")}
              disabled={application.status !== "pending"}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-40"
            >
              <Check className="size-4" aria-hidden />
              {t("applicants.approve")}
            </button>
          </div>
          <p className="text-center text-xs text-zinc-500">{t("applicants.decisionNote")}</p>
        </footer>
      </aside>
    </div>
  );
}
