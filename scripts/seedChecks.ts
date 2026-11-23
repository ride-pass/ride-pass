// 생성된 더미 데이터가 CLAUDE.md 4-2 페르소나 표와 맞는지 확인한다 (4-6 생성 후 검증).
// 범위를 벗어나면 데이터를 고친다. 계산 규칙(derive)이나 엔진을 데이터에 맞춰 고치지 않는다.

import { DEMO_TODAY } from "@/config/demo";
import { evaluateCredit, type Grade } from "@/credit/engine";
import { deriveRiderMetrics, DEPOSIT_MISMATCH_THRESHOLD, MONTH_DAYS } from "@/data/derive";
import { riderRecordsFrom, type FixtureSet } from "@/data/fixtureSet";
import { addDays, isWithin, type IsoDate } from "@/lib/date";

const TOLERANCE = 0.1;

/** 4-2 표의 예상 신용도. hold = 재촬영 전에는 평가 보류여야 한다 (그 뒤 범위는 재촬영 후 기준) */
export const CREDIT_EXPECTATIONS: Record<string, { min: number; max: number; grade: Grade; holdFirst?: boolean }> = {
  "r-budi": { min: 820, max: 890, grade: "A" },
  "r-siti": { min: 720, max: 790, grade: "B" },
  "r-agus": { min: 500, max: 549, grade: "D" },
  "r-dewi": { min: 840, max: 900, grade: "A" },
  "r-rizky": { min: 700, max: 790, grade: "B", holdFirst: true },
};

interface Expectation {
  /** 최근 30일 정산 순수입 목표 */
  monthlyNet: number;
  /** 최근 30일 입금 합 목표 (r-agus만) */
  monthlyDeposit?: number;
  /** 4-2 표의 활동 기간 (개월) */
  activeMonths: number;
  depositMismatch: boolean;
  /** 정시 납부율. null = 이력 없음 */
  rentalOnTimeRate: number | null;
  /** 최신 촬영 OCR 신뢰도가 재촬영 기준(0.7) 미만이어야 하는가 */
  blurredLatest: boolean;
  /** SLIK 콜렉터빌리티. null = 확인서 없음 */
  slikKolektibilitas: 1 | 2 | 3 | 4 | 5 | null;
  /** 통신요금 정시 납부율과 건수. null = 기록 없음 */
  telecom: { onTimeRate: number; count: number } | null;
}

export const EXPECTATIONS: Record<string, Expectation> = {
  "r-budi": { monthlyNet: 5_200_000, activeMonths: 8, depositMismatch: false, rentalOnTimeRate: 88 / 90, blurredLatest: false, slikKolektibilitas: 1, telecom: null },
  "r-siti": { monthlyNet: 3_400_000, activeMonths: 4, depositMismatch: false, rentalOnTimeRate: 88 / 90, blurredLatest: false, slikKolektibilitas: null, telecom: { onTimeRate: 5 / 6, count: 6 } },
  "r-agus": { monthlyNet: 6_800_000, monthlyDeposit: 3_100_000, activeMonths: 7, depositMismatch: true, rentalOnTimeRate: null, blurredLatest: false, slikKolektibilitas: null, telecom: { onTimeRate: 1, count: 6 } },
  "r-dewi": { monthlyNet: 4_600_000, activeMonths: 11, depositMismatch: false, rentalOnTimeRate: 1, blurredLatest: false, slikKolektibilitas: null, telecom: { onTimeRate: 1, count: 6 } },
  "r-rizky": { monthlyNet: 2_800_000, activeMonths: 6, depositMismatch: false, rentalOnTimeRate: null, blurredLatest: true, slikKolektibilitas: null, telecom: { onTimeRate: 5 / 6, count: 6 } },
};

const within = (actual: number, target: number) =>
  Math.abs(actual - target) <= target * TOLERANCE;

function duplicateIds(items: { id: string }[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const { id } of items) (seen.has(id) ? dup : seen).add(id);
  return [...dup];
}

/** 문제 목록을 돌려준다. 빈 배열이면 통과 */
export function checkFixtures(fx: FixtureSet, today: IsoDate = DEMO_TODAY): string[] {
  const problems: string[] = [];

  for (const key of Object.keys(fx) as (keyof FixtureSet)[]) {
    if (key === "retakes") continue; // 재촬영 기록은 원래 촬영과 id가 같다
    const dup = duplicateIds(fx[key]);
    if (dup.length) problems.push(`${key}: 중복 id ${dup.slice(0, 3).join(", ")}`);
  }

  const riderIds = fx.riders.map((r) => r.id).sort();
  const expectedIds = Object.keys(EXPECTATIONS).sort();
  if (riderIds.join() !== expectedIds.join()) {
    problems.push(`기사 목록이 페르소나 표와 다르다: ${riderIds.join(", ")}`);
  }

  for (const rider of fx.riders) {
    const exp = EXPECTATIONS[rider.id];
    if (!exp) continue;
    const records = riderRecordsFrom(fx, rider);
    const m = deriveRiderMetrics(records, today);
    const tag = `${rider.id}:`;

    if (!within(m.monthlyNet, exp.monthlyNet)) {
      problems.push(`${tag} 월 순수입 ${m.monthlyNet}이 목표 ${exp.monthlyNet} ±10% 밖`);
    }
    if (exp.monthlyDeposit !== undefined) {
      const start = addDays(today, -(MONTH_DAYS - 1));
      const deposited = records.deposits
        .filter((d) => isWithin(d.date, start, today))
        .reduce((a, d) => a + d.amount, 0);
      if (!within(deposited, exp.monthlyDeposit)) {
        problems.push(`${tag} 월 입금 ${deposited}이 목표 ${exp.monthlyDeposit} ±10% 밖`);
      }
    }
    if (m.consecutiveActiveMonths !== exp.activeMonths) {
      problems.push(`${tag} 연속 활동 ${m.consecutiveActiveMonths}개월 ≠ ${exp.activeMonths}개월`);
    }
    const rate = m.depositMatchRate;
    if (exp.depositMismatch) {
      if (rate === null || rate >= DEPOSIT_MISMATCH_THRESHOLD) {
        problems.push(`${tag} 입금 불일치여야 하는데 일치율 ${rate}`);
      }
    } else if (rate === null || rate < 0.95) {
      problems.push(`${tag} 입금 일치율 ${rate}이 0.95 미만`);
    }
    if (exp.rentalOnTimeRate === null) {
      if (m.rentalOnTimeRate !== null) problems.push(`${tag} 렌털 이력이 없어야 한다`);
    } else if (m.rentalOnTimeRate === null || Math.abs(m.rentalOnTimeRate - exp.rentalOnTimeRate) > 1e-9) {
      problems.push(`${tag} 정시 납부율 ${m.rentalOnTimeRate} ≠ ${exp.rentalOnTimeRate}`);
    }
    const blurred = m.latestOcrConfidence !== null && m.latestOcrConfidence < 0.7;
    if (blurred !== exp.blurredLatest) {
      problems.push(`${tag} 최신 촬영 OCR 신뢰도 ${m.latestOcrConfidence}`);
    }
    if (m.slikKolektibilitas !== exp.slikKolektibilitas) {
      problems.push(`${tag} SLIK 콜렉터빌리티 ${m.slikKolektibilitas} ≠ ${exp.slikKolektibilitas}`);
    }
    if (exp.telecom === null) {
      if (m.telecomOnTimeRate !== null) problems.push(`${tag} 통신요금 기록이 없어야 한다`);
    } else if (m.telecomOnTimeRate !== exp.telecom.onTimeRate || m.telecomBillCount !== exp.telecom.count) {
      problems.push(`${tag} 통신요금 ${m.telecomBillCount}건 정시율 ${m.telecomOnTimeRate}`);
    }
    if (m.historyDays < 60) problems.push(`${tag} 기록이 ${m.historyDays}일로 60일 미만`);
    if (m.editFlags.length) problems.push(`${tag} 위변조 신호가 없어야 한다: ${m.editFlags.join(", ")}`);
  }

  // 4-6 생성 후 검증 (2): 엔진이 낸 신용도가 4-2 표의 예상 범위와 등급에 드는가
  for (const rider of fx.riders) {
    const exp = CREDIT_EXPECTATIONS[rider.id];
    if (!exp) continue;
    const tag = `${rider.id}:`;
    const records = riderRecordsFrom(fx, rider);
    const before = evaluateCredit(deriveRiderMetrics(records, today));
    if (exp.holdFirst && before.status !== "hold") {
      problems.push(`${tag} 재촬영 전에는 평가 보류여야 한다`);
    }
    const retaken = {
      ...records,
      captures: records.captures.map((c) => fx.retakes.find((r) => r.id === c.id) ?? c),
    };
    const credit = exp.holdFirst ? evaluateCredit(deriveRiderMetrics(retaken, today)) : before;
    if (credit.status !== "scored") {
      problems.push(`${tag} 신용도가 나오지 않았다 (${credit.holds.join(", ")})`);
    } else if (credit.score < exp.min || credit.score > exp.max || credit.grade !== exp.grade) {
      problems.push(
        `${tag} 신용도 ${credit.score}(${credit.grade})가 예상 ${exp.min}~${exp.max}(${exp.grade}) 밖`,
      );
    }
  }

  for (const retake of fx.retakes) {
    const original = fx.captures.find((c) => c.id === retake.id);
    if (!original) problems.push(`retakes: 원래 촬영이 없다 ${retake.id}`);
    else if (retake.ocrConfidence < 0.7) problems.push(`retakes: 재촬영 신뢰도가 낮다 ${retake.id}`);
  }

  return problems;
}
