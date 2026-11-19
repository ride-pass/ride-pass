"use client";

// 「정산 vs 입금」 30일 구간 막대 (렌털사 상세 패널). 회색 = 기사가 찍은 정산 화면의 순수입, 보라 = 실제로 들어온 입금.
// 두 막대가 벌어지면 정산·입금 불일치 경고의 근거가 바로 보인다 (Agus). 기사가 수입을 공유했을 때만 그린다.

import { useDemo, useT } from "@/components/demo/DemoProvider";
import type { SettlementDepositBlock } from "@/data/derive";
import { formatRupiah, formatRupiahCompact, formatShortDate } from "@/lib/format";

const AREA_PX = 112;

export function DepositChart({ blocks }: { blocks: SettlementDepositBlock[] }) {
  const t = useT();
  const { lang } = useDemo();
  const max = Math.max(...blocks.flatMap((b) => [b.settled, b.deposited]), 1);
  const h = (v: number) => Math.max(v > 0 ? 3 : 0, Math.round((v / max) * AREA_PX));

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-zinc-900">{t("applicants.chart.title")}</span>
        <span className="flex items-center gap-3 text-xs text-zinc-500" aria-hidden>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-sm bg-zinc-300" />
            {t("applicants.chart.settled")}
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-sm bg-brand-purple" />
            {t("applicants.chart.deposited")}
          </span>
        </span>
      </figcaption>
      <ol className="grid items-end gap-3" style={{ gridTemplateColumns: `repeat(${blocks.length}, minmax(0, 1fr))`, height: AREA_PX + 16 }}>
        {blocks.map((b, i) => (
          <li
            key={b.end}
            className="flex h-full flex-col justify-end gap-1"
            aria-label={t("applicants.chart.aria", {
              from: formatShortDate(b.start, lang),
              to: formatShortDate(b.end, lang),
              settled: formatRupiah(b.settled),
              deposited: formatRupiah(b.deposited),
            })}
          >
            {i === blocks.length - 1 ? (
              <span className="text-center text-[11px] font-semibold whitespace-nowrap text-brand-purple tabular-nums">
                {formatRupiahCompact(b.deposited, lang)}
              </span>
            ) : null}
            <span className="flex items-end gap-0.5">
              <span className="flex-1 rounded-t bg-zinc-300" style={{ height: h(b.settled) }} />
              <span className="flex-1 rounded-t bg-brand-purple" style={{ height: h(b.deposited) }} />
            </span>
          </li>
        ))}
      </ol>
      <ol className="grid gap-3 text-center text-[11px] text-zinc-500 tabular-nums" style={{ gridTemplateColumns: `repeat(${blocks.length}, minmax(0, 1fr))` }} aria-hidden>
        {blocks.map((b) => (
          <li key={b.end}>~{formatShortDate(b.end, lang)}</li>
        ))}
      </ol>
    </figure>
  );
}
