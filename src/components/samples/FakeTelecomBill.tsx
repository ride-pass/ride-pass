"use client";

// 가상 통신요금 납부 내역 (CLAUDE.md 4-7). 실제 통신사 로고·서식을 쓰지 않는다.

import { Check, X } from "lucide-react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import type { TelecomBill } from "@/data/types";
import { formatDate, formatRupiah } from "@/lib/format";

export function FakeTelecomBill({ bills }: { bills: TelecomBill[] }) {
  const t = useT();
  const { lang } = useDemo();
  return (
    <div className="rounded-2xl bg-surface p-4 text-xs text-brand-navy shadow ring-1 ring-line">
      <p className="mb-2 rounded bg-danger-soft px-2 py-1 text-center font-semibold text-danger">
        {t("samples.fakeLabel")}
      </p>
      <p className="text-sm font-bold">{t("samples.telecomTitle", { provider: bills[0]?.providerLabel ?? "" })}</p>
      <ul className="mt-2 divide-y divide-line">
        {bills.map((b) => {
          const onTime = b.paidDate !== null && b.paidDate <= b.dueDate;
          return (
            <li key={b.id} className="flex items-center justify-between py-1.5">
              <span>{b.month}</span>
              <span className="text-muted">{formatRupiah(b.amount)}</span>
              <span className="flex items-center gap-1">
                {onTime ? <Check className="size-3.5 text-lime-ink" aria-hidden /> : <X className="size-3.5 text-danger" aria-hidden />}
                {b.paidDate ? formatDate(b.paidDate, lang) : t("samples.unpaid")}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
