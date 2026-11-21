"use client";

// 30일 단위 순수입: 가로 막대 목록 (최근 구간이 맨 위). 한 줄 = 기간 · 막대 · 금액 (2026-11-21, 세로 막대 6개는 높이가 거의 같아 읽을 게 없었다).
// 금액을 줄마다 다 보여 주고, 막대는 0부터 그린다(가장 많은 구간 = 끝까지). 금액 칸 폭을 고정해 줄마다 막대 자리가 같다. 최근 구간만 보라, 지난 구간은 무채색 (CLAUDE.md 6-6).
// 첫 활동일 이전 날이 섞인 구간은 옅게 그린다. 신용도 엔진도 그 구간은 평균·안정성 계산에서 뺀다 (derive.ts).

import { useDemo, useT } from "@/components/demo/DemoProvider";
import type { MonthBlockNet } from "@/data/derive";
import { formatRupiah, formatShortDate } from "@/lib/format";

export function MonthBars({ months }: { months: MonthBlockNet[] }) {
  const t = useT();
  const { lang } = useDemo();
  const max = Math.max(...months.map((m) => m.net), 1);
  const latest = months.length - 1;
  const full = months.filter((m) => !m.partial);
  const low = full.length ? Math.min(...full.map((m) => m.net)) : null;
  const high = full.length ? Math.max(...full.map((m) => m.net)) : null;
  // 활동을 시작하기 전이라 금액이 0인 구간은 줄을 만들지 않는다
  const rows = months.map((m, i) => ({ m, i })).filter(({ m }) => !(m.partial && m.net === 0)).reverse();

  return (
    <div className="flex flex-col gap-3">
      {low !== null && high !== null && full.length > 1 ? (
        <p className="text-xs text-muted tabular-nums">{t("home.months.spread", { min: formatRupiah(low), max: formatRupiah(high) })}</p>
      ) : null}
      <ol className="flex flex-col divide-y divide-line">
        {rows.map(({ m, i }) => {
          const isLatest = i === latest;
          const fill = isLatest ? "bg-brand-purple" : m.partial ? "bg-line" : "bg-line-strong";
          return (
            <li
              key={m.end}
              className="grid grid-cols-[5.5rem_1fr_6.75rem] items-center gap-3 py-2.5"
              aria-label={t("home.months.aria", {
                from: formatShortDate(m.start, lang),
                to: formatShortDate(m.end, lang),
                amount: formatRupiah(m.net),
              })}
            >
              <span className={`text-xs whitespace-nowrap tabular-nums ${isLatest ? "font-semibold text-brand-navy" : "text-muted"}`} aria-hidden>
                {formatShortDate(m.start, lang)} – {formatShortDate(m.end, lang)}
              </span>
              <span className="h-2 overflow-hidden rounded-full bg-line" aria-hidden>
                <span className={`block h-full rounded-full ${fill}`} style={{ width: `${Math.max(2, (m.net / max) * 100)}%` }} />
              </span>
              <span className={`text-right text-sm whitespace-nowrap tabular-nums ${isLatest ? "font-bold text-brand-purple" : m.partial ? "text-muted" : ""}`} aria-hidden>
                {formatRupiah(m.net)}
              </span>
            </li>
          );
        })}
      </ol>
      {months.some((m) => m.partial) ? <p className="text-[11px] text-muted">{t("home.months.partialNote")}</p> : null}
    </div>
  );
}
