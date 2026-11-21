"use client";

// 「일한 흔적」 활동 지도: 최근 180일 동안 정산 기록이 있는 날을 칸으로 찍는다.
// 한 열 = 한 주(월요일 위 → 일요일 아래). 일한 날을 기사 자신의 순수입 기준 하위·중간·상위 1/3로 나눠 진하게 칠한다.
// 점수가 아니라 정산 기록이라는 사실만 보여 준다 (A단계에서도 보여 줄 수 있다, CLAUDE.md 2-4).
// 칸을 누르면 그날 기록이 아래 줄에 나온다. 처음에는 기준일(오늘)이 골라져 있다.

import { useMemo, useState } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import type { DailyActivity } from "@/data/derive";
import { dayOfWeek } from "@/lib/date";
import { formatMonth, formatRupiah, formatShortDate } from "@/lib/format";

type Level = "before" | "rest" | 1 | 2 | 3;

// 쉰 날은 크림 바탕에서도 칸이 보이게 line-strong, 활동 시작 전은 한 단계 옅게 (CLAUDE.md 6절: 390px에서 흐릿하지 않게)
const CELL: Record<string, string> = {
  before: "bg-line",
  rest: "bg-line-strong",
  1: "bg-brand-purple/35",
  2: "bg-brand-purple/65",
  3: "bg-brand-purple",
};

/** 일한 날 순수입의 1/3, 2/3 지점. 이 값 이하면 한 단계 옅게 칠한다 */
function tertiles(values: number[]): [number, number] {
  if (values.length === 0) return [0, 0];
  const s = [...values].sort((a, b) => a - b);
  return [s[Math.floor((s.length - 1) / 3)], s[Math.floor(((s.length - 1) * 2) / 3)]];
}

function levelOf(day: DailyActivity, [low, mid]: [number, number]): Level {
  if (day.beforeStart) return "before";
  if (day.net <= 0) return "rest";
  if (day.net <= low) return 1;
  if (day.net <= mid) return 2;
  return 3;
}

export function ActivityMap({ daily }: { daily: DailyActivity[] }) {
  const t = useT();
  const { lang } = useDemo();
  const [picked, setPicked] = useState(daily.length - 1);

  const { cells, columns, monthLabels, lead } = useMemo(() => {
    const cuts = tertiles(daily.filter((d) => d.net > 0).map((d) => d.net));
    // 첫 칸을 그 주의 요일 자리에 맞춘다 (월요일 = 0)
    const lead = (dayOfWeek(daily[0].date) + 6) % 7;
    const columns = Math.ceil((lead + daily.length) / 7);
    const cells = daily.map((d, i) => ({ day: d, index: i, level: levelOf(d, cuts), col: Math.floor((lead + i) / 7) }));
    // 달이 바뀌는 첫 열 위에 달 이름
    const monthLabels: { col: number; date: string }[] = [];
    for (const c of cells) {
      if (c.day.date.endsWith("-01") || c.index === 0) {
        const col = c.index === 0 ? 0 : c.col;
        if (!monthLabels.some((m) => m.col === col)) monthLabels.push({ col, date: c.day.date });
      }
    }
    // 첫 열 이름과 바로 다음 달 이름이 붙으면 첫 열 이름을 뺀다
    if (monthLabels.length > 1 && monthLabels[1].col - monthLabels[0].col < 3) monthLabels.shift();
    return { cells, columns, monthLabels, lead };
  }, [daily]);

  const day = daily[picked];
  const activeDays = daily.filter((d) => d.net > 0).length;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-4 text-[11px] text-muted" aria-hidden>
        {monthLabels.map((m) => (
          <span key={m.date} className="absolute top-0" style={{ left: `${(m.col / columns) * 100}%` }}>
            {formatMonth(m.date, lang)}
          </span>
        ))}
      </div>
      <div
        role="img"
        aria-label={t("home.trail.aria", { n: activeDays, d: daily.length })}
        className="grid grid-flow-col grid-rows-7 gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        onClick={(e) => {
          const i = (e.target as HTMLElement).dataset.index;
          if (i !== undefined) setPicked(Number(i));
        }}
      >
        {Array.from({ length: lead }, (_, i) => (
          <span key={`lead-${i}`} aria-hidden />
        ))}
        {cells.map((c) => (
          <span
            key={c.day.date}
            data-index={c.index}
            aria-hidden
            className={`aspect-square cursor-pointer rounded-[2px] ${CELL[String(c.level)]} ${c.index === picked ? "outline-2 outline-offset-1 outline-brand-navy" : ""}`}
          />
        ))}
      </div>
      {/* 글자가 길면(인니어) 범례가 다음 줄로 내려간다. 그날 기록은 자르지 않는다 */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
        <p className="font-semibold tabular-nums" aria-live="polite">
          {day.net > 0
            ? t("home.trail.dayDetail", { date: formatShortDate(day.date, lang), net: formatRupiah(day.net), trips: day.trips })
            : t(day.beforeStart ? "home.trail.dayBefore" : "home.trail.dayOff", { date: formatShortDate(day.date, lang) })}
        </p>
        <span className="ml-auto flex shrink-0 items-center gap-1 text-muted" aria-hidden>
          {t("home.trail.less")}
          {(["rest", 1, 2, 3] as const).map((l) => (
            <span key={l} className={`size-2.5 rounded-[2px] ${CELL[String(l)]}`} />
          ))}
          {t("home.trail.more")}
        </span>
      </div>
    </div>
  );
}
