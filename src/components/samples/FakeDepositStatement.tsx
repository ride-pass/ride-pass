"use client";

// 가상 입금 내역 (은행 계좌·전자지갑) (CLAUDE.md 4-7, 2026-11-23). 실제 은행·전자지갑 로고·서식을 쓰지 않는다.
// 계좌번호는 가린 형태로도 넣지 않는다 (2-3). 위쪽 「가상 예시」 띠 + 워터마크.
// 입금 상대 이름은 데이터(counterpartyLabel)가 한국어뿐이라 언어별 공통 문구 「앱 정산 입금」으로 보여 준다.

import { useDemo, useT } from "@/components/demo/DemoProvider";
import type { Deposit } from "@/data/types";
import { formatDate, formatRupiah } from "@/lib/format";
import { SampleWatermark } from "./SampleWatermark";

/** 서류에 그릴 최근 입금 줄 수 */
const ROWS = 8;

export function FakeDepositStatement({ deposits }: { deposits: Deposit[] }) {
  const t = useT();
  const { lang } = useDemo();
  const recent = [...deposits].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, ROWS);
  if (recent.length === 0) return null;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface p-4 text-xs text-brand-navy shadow">
      <SampleWatermark />
      <p className="mb-2 rounded bg-danger-soft px-2 py-1 text-center font-semibold text-danger">{t("samples.fakeLabel")}</p>
      <p className="text-sm font-bold">{t("samples.depositTitle", { source: t(`samples.depositSource.${recent[0].source}`) })}</p>
      <p className="mt-0.5 text-muted">{t("samples.depositRecent", { n: recent.length })}</p>
      <ul className="mt-2 divide-y divide-line">
        {recent.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 py-1.5">
            <span className="min-w-0">
              <span className="block">{formatDate(d.date, lang)}</span>
              <span className="block text-muted">{t("samples.depositFrom")}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums">+{formatRupiah(d.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
