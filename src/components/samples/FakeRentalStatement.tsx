"use client";

// 가상 렌털 납부 내역 (CLAUDE.md 4-7, 2026-11-23). 실제 렌털사 로고·서식을 쓰지 않는다. 위쪽 「가상 예시」 띠 + 워터마크.
// 하루 단위 납부 90건을 다 그리지 않고, 달별 요약과 제때 내지 못한 날만 보여 준다.

import { Check, X } from "lucide-react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import type { RentalPayment } from "@/data/types";
import { formatDate, formatRupiah } from "@/lib/format";
import { SampleWatermark } from "./SampleWatermark";

const onTime = (p: RentalPayment) => p.paidDate !== null && p.paidDate <= p.dueDate;

export function FakeRentalStatement({ payments, partnerName }: { payments: RentalPayment[]; partnerName: string }) {
  const t = useT();
  const { lang } = useDemo();
  const sorted = [...payments].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  if (sorted.length === 0) return null;
  const months = [...new Set(sorted.map((p) => p.dueDate.slice(0, 7)))].map((month) => {
    const inMonth = sorted.filter((p) => p.dueDate.startsWith(month));
    return { month, total: inMonth.length, onTime: inMonth.filter(onTime).length };
  });
  const late = sorted.filter((p) => !onTime(p));

  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface p-4 text-xs text-brand-navy shadow">
      <SampleWatermark />
      <p className="mb-2 rounded bg-danger-soft px-2 py-1 text-center font-semibold text-danger">{t("samples.fakeLabel")}</p>
      <p className="text-sm font-bold">{t("samples.rentalTitle", { partner: partnerName })}</p>
      <p className="mt-0.5 text-muted">
        {formatDate(sorted[0].dueDate, lang)} ~ {formatDate(sorted[sorted.length - 1].dueDate, lang)} ·{" "}
        {t("samples.rentalDaily", { amount: formatRupiah(sorted[0].amount) })}
      </p>
      <ul className="mt-2 divide-y divide-line">
        {months.map((m) => (
          <li key={m.month} className="flex items-center justify-between py-1.5">
            <span>{m.month}</span>
            <span className="flex items-center gap-1">
              {m.onTime === m.total ? <Check className="size-3.5 text-lime-ink" aria-hidden /> : <X className="size-3.5 text-danger" aria-hidden />}
              {t("samples.rentalMonthValue", { total: m.total, onTime: m.onTime })}
            </span>
          </li>
        ))}
      </ul>
      {late.length ? (
        <>
          <p className="mt-3 font-semibold">{t("samples.rentalLateTitle")}</p>
          <ul className="mt-1 divide-y divide-line">
            {late.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-1.5">
                <span className="text-muted">{t("samples.rentalDue", { date: formatDate(p.dueDate, lang) })}</span>
                <span className="flex items-center gap-1">
                  <X className="size-3.5 text-danger" aria-hidden />
                  {p.paidDate ? t("samples.rentalPaidOn", { date: formatDate(p.paidDate, lang) }) : t("samples.unpaid")}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-3 flex items-center gap-1 font-semibold">
          <Check className="size-3.5 text-lime-ink" aria-hidden />
          {t("samples.rentalAllOnTime")}
        </p>
      )}
    </div>
  );
}
