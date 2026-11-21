"use client";

// 30일 단위 순수입: 가로 막대 목록 (최근 구간이 맨 위). 한 줄 = 기간 · 막대 · 금액 (2026-11-21, 세로 막대 6개는 높이가 거의 같아 읽을 게 없었다).
// 금액을 줄마다 다 보여 주고, 막대는 0부터 그린다. 금액 칸 폭을 고정해 줄마다 막대 자리가 같다.
// 막대 끝은 모든 기사가 같은 눈금(SCALE_MAX)이다. 기사마다 자기 최고 금액을 끝으로 잡으면 월 270만인 사람과 700만인 사람의 막대가 똑같이 꽉 찼다 (2026-11-22).
// 한 사람의 구간끼리는 차이가 작아 막대로 잘 안 보이므로, 최근 구간에 지난 30일 대비 증감(%)을 숫자로 단다. 0이 아닌 곳에서 막대를 시작해 차이를 부풀리지 않는다. 최근 구간만 보라, 지난 구간은 무채색 (CLAUDE.md 6-6).
// 첫 활동일 이전 날이 섞인 구간은 옅게 그린다. 신용도 엔진도 그 구간은 평균·안정성 계산에서 뺀다 (derive.ts).

import { useDemo, useT } from "@/components/demo/DemoProvider";
import type { MonthBlockNet } from "@/data/derive";
import { formatRupiah, formatShortDate } from "@/lib/format";

/** 모든 기사가 같이 쓰는 막대 끝 금액 (Rp). 시연 인물 중 가장 많은 30일 순수입(약 713만)이 들어간다. 이보다 많은 사람은 자기 최고 금액이 끝이 된다 */
const SCALE_MAX = 8_000_000;
/** 지난 30일보다 이만큼 넘게 줄면 경고색 */
const DROP_WARN = -0.1;

export function MonthBars({ months }: { months: MonthBlockNet[] }) {
  const t = useT();
  const { lang } = useDemo();
  const max = Math.max(SCALE_MAX, ...months.map((m) => m.net));
  const latest = months.length - 1;
  const full = months.filter((m) => !m.partial);
  const low = full.length ? Math.min(...full.map((m) => m.net)) : null;
  const high = full.length ? Math.max(...full.map((m) => m.net)) : null;
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
                <span className={`block h-full rounded-full ${fill}`} style={{ width: `${Math.max(2, (m.net / max) * 100)}%` }} />
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
