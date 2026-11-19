"use client";

// 30일 단위 순수입 막대 6개 (오래된 구간 → 최근 구간). 최근 구간만 보라로 칠하고 금액을 단다.
// 첫 활동일 이전 날이 섞인 구간은 회색으로 그린다. 신용도 엔진도 그 구간은 평균·안정성 계산에서 뺀다 (derive.ts).

import { useDemo, useT } from "@/components/demo/DemoProvider";
import type { MonthBlockNet } from "@/data/derive";
import { formatRupiah, formatRupiahCompact, formatShortDate } from "@/lib/format";

const BAR_AREA_PX = 96;

export function MonthBars({ months }: { months: MonthBlockNet[] }) {
  const t = useT();
  const { lang } = useDemo();
  const max = Math.max(...months.map((m) => m.net), 1);
  const latest = months.length - 1;

  return (
    <div className="flex flex-col gap-2">
      <ol className="grid grid-cols-6 items-end gap-2" style={{ height: BAR_AREA_PX + 20 }}>
        {months.map((m, i) => {
          const h = Math.max(4, Math.round((m.net / max) * BAR_AREA_PX));
          const color = i === latest ? "bg-brand-purple" : m.partial ? "bg-line" : "bg-lavender-strong";
          return (
            <li
              key={m.end}
              className="flex h-full flex-col items-center justify-end gap-1"
              aria-label={t("home.months.aria", {
                from: formatShortDate(m.start, lang),
                to: formatShortDate(m.end, lang),
                amount: formatRupiah(m.net),
              })}
            >
              {i === latest ? (
                <span className="text-[11px] font-bold whitespace-nowrap text-brand-purple tabular-nums">
                  {formatRupiahCompact(m.net, lang)}
                </span>
              ) : null}
              <span className={`w-full rounded-md ${color}`} style={{ height: h }} />
            </li>
          );
        })}
      </ol>
      <ol className="grid grid-cols-6 gap-2 text-center text-[11px] text-muted tabular-nums" aria-hidden>
        {months.map((m) => (
          <li key={m.end}>~{formatShortDate(m.end, lang)}</li>
        ))}
      </ol>
      {months.some((m) => m.partial) ? <p className="text-[11px] text-muted">{t("home.months.partialNote")}</p> : null}
    </div>
  );
}
