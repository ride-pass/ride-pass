"use client";

// 30일 단위 순수입: 가로 막대 목록 (최근 구간이 맨 위). 한 줄 = 기간 · 막대 · 금액 (2026-11-21, 세로 막대 6개는 높이가 거의 같아 읽을 게 없었다).
// 금액을 줄마다 다 보여 주고, 막대는 0부터 그린다. 금액 칸 폭을 고정해 줄마다 막대 자리가 같다.
// 가장 많은 구간이 막대 끝까지 찬다. 막대 시작점은 0이 아니라 '가장 적은 구간 × 0.9'라 구간끼리 차이가 보인다(시작 전이 섞인 구간은 짧게) (2026-11-22).
// 최근 구간에는 지난 30일 대비 증감(%)을 숫자로 단다.

import { useDemo, useT } from "@/components/demo/DemoProvider";
import type { MonthBlockNet } from "@/data/derive";
import { formatRupiah, formatShortDate } from "@/lib/format";

/** 막대 시작점 = 가장 적은 구간 × 이 값 */
const FLOOR_RATIO = 0.9;
/** 지난 30일보다 이만큼 넘게 줄면 경고색 */
const DROP_WARN = -0.1;

export function MonthBars({ months }: { months: MonthBlockNet[] }) {
  const t = useT();
  const { lang } = useDemo();
  const max = Math.max(...months.map((m) => m.net), 1);
  const latest = months.length - 1;
  const full = months.filter((m) => !m.partial);
  const low = full.length ? Math.min(...full.map((m) => m.net)) : null;
  const high = full.length ? Math.max(...full.map((m) => m.net)) : null;
  const floor = low !== null ? low * FLOOR_RATIO : 0;
  const widthOf = (net: number) => Math.min(100, Math.max(2, ((net - floor) / Math.max(max - floor, 1)) * 100));
  // 활동을 시작하기 전이라 금액이 0인 구간은 줄을 만들지 않는다
  const rows = months.map((m, i) => ({ m, i })).filter(({ m }) => !(m.partial && m.net === 0)).reverse();
  // 최근 구간 vs 바로 앞 구간. 앞 구간이 활동 시작 전이 섞였거나 0이면 비교하지 않는다
  const prev = months[latest - 1];
  const change = prev && !prev.partial && prev.net > 0 ? (months[latest].net - prev.net) / prev.net : null;

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
              aria-label={
                t("home.months.aria", {
                  from: formatShortDate(m.start, lang),
                  to: formatShortDate(m.end, lang),
                  amount: formatRupiah(m.net),
                }) + (isLatest && change !== null ? `. ${t(change >= 0 ? "home.months.upAria" : "home.months.downAria", { p: Math.abs(Math.round(change * 100)) })}` : "")
              }
            >
              <span className={`text-xs whitespace-nowrap tabular-nums ${isLatest ? "font-semibold text-brand-navy" : "text-muted"}`} aria-hidden>
                {formatShortDate(m.start, lang)} – {formatShortDate(m.end, lang)}
              </span>
              <span className="h-2 overflow-hidden rounded-full bg-line" aria-hidden>
                <span className={`block h-full rounded-full ${fill}`} style={{ width: `${widthOf(m.net)}%` }} />
              </span>
              <span className="flex flex-col items-end" aria-hidden>
                <span className={`text-sm whitespace-nowrap tabular-nums ${isLatest ? "font-bold text-brand-purple" : m.partial ? "text-muted" : ""}`}>
                  {formatRupiah(m.net)}
                </span>
                {isLatest && change !== null ? (
                  <span
                    title={t(change >= 0 ? "home.months.upAria" : "home.months.downAria", { p: Math.abs(Math.round(change * 100)) })}
                    className={`text-[11px] font-semibold whitespace-nowrap tabular-nums ${change <= DROP_WARN ? "text-danger" : "text-muted"}`}
                  >
                    {t("home.months.change", { arrow: change >= 0 ? "▲" : "▼", p: Math.abs(Math.round(change * 100)) })}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
      {months.some((m) => m.partial) ? <p className="text-[11px] text-muted">{t("home.months.partialNote")}</p> : null}
    </div>
  );
}
