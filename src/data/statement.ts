// 수입 명세서 (급여명세서 형식) 계산 (CLAUDE.md 3절 5단계).
// 원본 기록에서 계산만 한다. fixture에 요약 숫자를 저장하지 않는다 (4-1).
// "급여명세서 발급"이라고 쓰지 않는다. 고용 관계가 아니라 기사 본인 자료로 만든 수입 명세서다 (2-2).

import { DEMO_TODAY } from "@/config/demo";
import { addDays, isWithin, type IsoDate } from "@/lib/date";
import { deriveRiderMetrics, DEPOSIT_MISMATCH_THRESHOLD, MONTH_DAYS, type RiderRecords } from "./derive";
import type { PlatformId } from "./types";

export interface PlatformLine {
  platform: PlatformId;
  gross: number;
  fee: number;
  net: number;
  days: number;
  trips: number;
}

export interface IncomeStatement {
  issueNo: string;
  issuedAt: IsoDate;
  riderId: string;
  riderName: string;
  periodStart: IsoDate;
  periodEnd: IsoDate;
  /** 앱별 내역 (순수입 큰 순) */
  lines: PlatformLine[];
  totals: { gross: number; fee: number; net: number; trips: number };
  activeDays: number;
  platformCount: number;
  avgMonthlyNet3m: number;
  depositMatchRate: number | null;
  depositMatched: boolean;
  rental: { onTime: number; total: number } | null;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function buildIncomeStatement(records: RiderRecords, today: IsoDate = DEMO_TODAY): IncomeStatement {
  const m = deriveRiderMetrics(records, today);
  const periodEnd = today;
  const periodStart = addDays(today, -(MONTH_DAYS - 1));
  const recent = records.captures.filter((c) => isWithin(c.periodDate, periodStart, periodEnd));

  const byPlatform = new Map<PlatformId, typeof recent>();
  for (const c of recent) byPlatform.set(c.platform, [...(byPlatform.get(c.platform) ?? []), c]);
  const lines: PlatformLine[] = [...byPlatform.entries()]
    .map(([platform, cs]) => ({
      platform,
      gross: sum(cs.map((c) => c.ocr.grossAmount)),
      fee: sum(cs.map((c) => c.ocr.platformFee)),
      net: sum(cs.map((c) => c.ocr.netAmount)),
      days: new Set(cs.map((c) => c.periodDate)).size,
      trips: sum(cs.map((c) => c.ocr.tripCount)),
    }))
    .sort((a, b) => b.net - a.net);

  const rentals = records.rentalPayments.filter((p) => p.dueDate <= today);
  const short = records.rider.id.replace(/^r-/, "").toUpperCase();

  return {
    issueNo: `TC-${today.replaceAll("-", "")}-${short}-01`,
    issuedAt: today,
    riderId: records.rider.id,
    riderName: records.rider.displayName,
    periodStart,
    periodEnd,
    lines,
    totals: {
      gross: sum(lines.map((l) => l.gross)),
      fee: sum(lines.map((l) => l.fee)),
      net: sum(lines.map((l) => l.net)),
      trips: sum(lines.map((l) => l.trips)),
    },
    activeDays: m.activeDays30,
    platformCount: m.platformCount30,
    avgMonthlyNet3m: m.avgMonthlyNet3m,
    depositMatchRate: m.depositMatchRate,
    depositMatched: m.depositMatchRate !== null && m.depositMatchRate >= DEPOSIT_MISMATCH_THRESHOLD,
    rental: rentals.length
      ? {
          onTime: rentals.filter((p) => p.paidDate !== null && p.paidDate <= p.dueDate).length,
          total: rentals.length,
        }
      : null,
  };
}
