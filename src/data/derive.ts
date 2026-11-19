// CLAUDE.md 4-4: 요약 숫자는 fixture에 저장하지 않고 원본 기록에서 항상 계산한다.
// 순수 함수만 둔다 (입력 → 출력, 부수효과 없음).

import { DEMO_TODAY } from "@/config/demo";
import { addDays, diffDays, isWithin, type IsoDate } from "@/lib/date";
import type {
  Deposit,
  PlatformId,
  RentalPayment,
  Rider,
  SettlementCapture,
  SlikReport,
  TelecomBill,
} from "./types";

/** "한 달" = 기준일부터 거꾸로 끊은 30일 단위 */
export const MONTH_DAYS = 30;
/** 이 일수 이상 정산 기록이 없으면 연속 활동이 끊긴 것으로 본다 */
export const ACTIVITY_GAP_DAYS = 15;
/** 입금 일치율이 이 값 미만이면 amount_mismatch 경고 */
export const DEPOSIT_MISMATCH_THRESHOLD = 0.85;
/** 입금은 정산 다음 날 들어온다 */
export const DEPOSIT_LAG_DAYS = 1;
/** 통신요금 정시 납부율을 보는 기간: 최근 6개월 (30일 단위) */
export const TELECOM_WINDOW_DAYS = MONTH_DAYS * 6;

export interface RiderRecords {
  rider: Rider;
  captures: SettlementCapture[];
  deposits: Deposit[];
  rentalPayments: RentalPayment[];
  slikReports: SlikReport[];
  telecomBills: TelecomBill[];
}

export interface RiderMetrics {
  /** 최근 30일 순수입 합 (Rp) */
  monthlyNet: number;
  /** 최근 3개월 월평균 순수입 (Rp, 정수 반올림). 온전히 활동한 달만 평균 낸다 */
  avgMonthlyNet3m: number;
  /** 최근 6개월 월별 순수입 (오래된 달 → 최근 달). 온전히 활동한 달만 담는다 */
  monthlyNetSeries6m: number[];
  /** 최근 30일 중 정산 기록이 있는 날 수 */
  activeDays30: number;
  /** 15일 이상 공백 없이 이어진 활동 개월 수 */
  consecutiveActiveMonths: number;
  /** 정산 순수입 대비 입금 합 (0~1). 비교할 정산이 없으면 null */
  depositMatchRate: number | null;
  /** 정시 납부 비율 (0~1). 납부 이력이 없으면 null */
  rentalOnTimeRate: number | null;
  /** 기준일까지 납기가 지난 렌털 납부 건수 */
  rentalPaymentCount: number;
  /** 최근 30일 정산 기록의 앱 종류 수 */
  platformCount30: number;
  /** 모든 촬영의 평균 OCR 신뢰도. 촬영이 없으면 null */
  avgOcrConfidence: number | null;
  /** 가장 최근 촬영의 OCR 신뢰도. 촬영이 없으면 null */
  latestOcrConfidence: number | null;
  /** 첫 정산 기록부터 기준일까지 일수 (양 끝 포함). 기록이 없으면 0 */
  historyDays: number;
  /** 모든 촬영의 위변조 의심 신호 (중복 제거) */
  editFlags: string[];
  /** 렌털사 화면에 띄울 경고 코드. amount_mismatch가 있으면 맨 앞 */
  warnings: string[];
  /** 가장 최근 SLIK 확인서의 최악 콜렉터빌리티 (1~5). 확인서가 없으면 null */
  slikKolektibilitas: SlikReport["worstKolektibilitas"] | null;
  /** 가장 최근 SLIK 확인서의 남은 대출·할부 건수. 확인서가 없으면 null */
  slikActiveFacilities: number | null;
  /** 가장 최근 SLIK 확인서를 읽은 신뢰도. 확인서가 없으면 null */
  slikParseConfidence: number | null;
  /** 최근 6개월 통신요금 정시 납부율 (0~1). 기록이 없으면 null */
  telecomOnTimeRate: number | null;
  /** 최근 6개월 통신요금 납부 건수 */
  telecomBillCount: number;
}

interface DayRange {
  start: IsoDate;
  end: IsoDate;
}

/** k번째 30일 구간 (k = 0이면 기준일을 끝으로 하는 최근 30일) */
function monthBlock(today: IsoDate, k: number): DayRange {
  const end = addDays(today, -MONTH_DAYS * k);
  return { start: addDays(end, -(MONTH_DAYS - 1)), end };
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function netInRange(captures: SettlementCapture[], range: DayRange): number {
  return sum(
    captures
      .filter((c) => isWithin(c.periodDate, range.start, range.end))
      .map((c) => c.ocr.netAmount),
  );
}

/**
 * 최근 n개월 월별 순수입 (오래된 달 → 최근 달).
 * 첫 활동일 이전이 섞인 달은 빼서, 활동 기간이 짧은 기사가 0원 달 때문에 불리해지지 않게 한다.
 */
function fullMonthSeries(
  captures: SettlementCapture[],
  firstActiveDate: IsoDate,
  today: IsoDate,
  months: number,
): number[] {
  const series: number[] = [];
  for (let k = months - 1; k >= 0; k--) {
    const block = monthBlock(today, k);
    if (block.start < firstActiveDate) continue;
    series.push(netInRange(captures, block));
  }
  return series;
}

function consecutiveMonths(
  captures: SettlementCapture[],
  firstActiveDate: IsoDate,
  today: IsoDate,
): number {
  const days = unique(captures.map((c) => c.periodDate)).sort();
  if (days.length === 0) return 0;

  // 마지막 기록 이후 지금까지 공백이 길면 활동이 끊긴 상태
  if (diffDays(days[days.length - 1], today) - 1 >= ACTIVITY_GAP_DAYS) return 0;

  // 가장 최근의 긴 공백 다음 날부터 센다. 공백이 없으면 첫 활동일부터.
  // 기록이 없는 앞부분(시드 생성 기간 이전)은 공백으로 보지 않는다.
  let start = firstActiveDate;
  for (let i = days.length - 1; i > 0; i--) {
    if (diffDays(days[i - 1], days[i]) - 1 >= ACTIVITY_GAP_DAYS) {
      start = days[i];
      break;
    }
  }
  return Math.max(0, Math.floor(diffDays(start, today) / MONTH_DAYS));
}

/**
 * 최근 30일 정산(오늘 제외)과, 하루 밀린 같은 길이 기간의 입금을 비교한다.
 * 오늘 정산분의 입금은 아직 들어오지 않았기 때문이다.
 */
function depositMatch(
  captures: SettlementCapture[],
  deposits: Deposit[],
  today: IsoDate,
): number | null {
  const settleEnd = addDays(today, -DEPOSIT_LAG_DAYS);
  const settleRange = { start: addDays(settleEnd, -(MONTH_DAYS - 1)), end: settleEnd };
  const settled = netInRange(captures, settleRange);
  if (settled <= 0) return null;

  const depositRange = {
    start: addDays(settleRange.start, DEPOSIT_LAG_DAYS),
    end: addDays(settleRange.end, DEPOSIT_LAG_DAYS),
  };
  const deposited = sum(
    deposits
      .filter((d) => isWithin(d.date, depositRange.start, depositRange.end))
      .map((d) => d.amount),
  );
  return Math.min(1, deposited / settled);
}

function latestSlik(reports: SlikReport[]): SlikReport | undefined {
  return [...reports].sort(
    (a, b) =>
      a.reportDate.localeCompare(b.reportDate) ||
      a.uploadedAt.localeCompare(b.uploadedAt) ||
      a.id.localeCompare(b.id),
  ).at(-1);
}

function latestCapture(captures: SettlementCapture[]): SettlementCapture | undefined {
  return [...captures].sort((a, b) =>
    a.periodDate === b.periodDate
      ? a.id.localeCompare(b.id)
      : a.periodDate.localeCompare(b.periodDate),
  ).at(-1);
}

export function deriveRiderMetrics(
  records: RiderRecords,
  today: IsoDate = DEMO_TODAY,
): RiderMetrics {
  const { rider } = records;
  // 기준일 이후 기록은 아직 없는 것으로 본다
  const captures = records.captures.filter((c) => c.periodDate <= today);
  const deposits = records.deposits.filter((d) => d.date <= today);
  const rentals = records.rentalPayments.filter((p) => p.dueDate <= today);
  const slik = latestSlik(records.slikReports.filter((r) => r.reportDate <= today));
  const telecomStart = addDays(today, -(TELECOM_WINDOW_DAYS - 1));
  const telecom = records.telecomBills.filter((b) => isWithin(b.dueDate, telecomStart, today));
  const telecomOnTime = telecom.filter((b) => b.paidDate !== null && b.paidDate <= b.dueDate);

  const last30 = monthBlock(today, 0);
  const captures30 = captures.filter((c) => isWithin(c.periodDate, last30.start, last30.end));

  const series3m = fullMonthSeries(captures, rider.firstActiveDate, today, 3);
  const onTime = rentals.filter((p) => p.paidDate !== null && p.paidDate <= p.dueDate);
  const latest = latestCapture(captures);
  const firstRecord = captures.map((c) => c.periodDate).sort()[0];

  const depositMatchRate = depositMatch(captures, deposits, today);
  const editFlags = unique(captures.flatMap((c) => c.editFlags));
  const mismatch =
    depositMatchRate !== null && depositMatchRate < DEPOSIT_MISMATCH_THRESHOLD;

  return {
    monthlyNet: sum(captures30.map((c) => c.ocr.netAmount)),
    avgMonthlyNet3m: series3m.length ? Math.round(sum(series3m) / series3m.length) : 0,
    monthlyNetSeries6m: fullMonthSeries(captures, rider.firstActiveDate, today, 6),
    activeDays30: unique(captures30.map((c) => c.periodDate)).length,
    consecutiveActiveMonths: consecutiveMonths(captures, rider.firstActiveDate, today),
    depositMatchRate,
    rentalOnTimeRate: rentals.length ? onTime.length / rentals.length : null,
    rentalPaymentCount: rentals.length,
    platformCount30: unique<PlatformId>(captures30.map((c) => c.platform)).length,
    avgOcrConfidence: captures.length
      ? sum(captures.map((c) => c.ocrConfidence)) / captures.length
      : null,
    latestOcrConfidence: latest?.ocrConfidence ?? null,
    historyDays: firstRecord ? diffDays(firstRecord, today) + 1 : 0,
    editFlags,
    warnings: unique([...(mismatch ? ["amount_mismatch"] : []), ...editFlags]),
    slikKolektibilitas: slik?.worstKolektibilitas ?? null,
    slikActiveFacilities: slik?.activeFacilities ?? null,
    slikParseConfidence: slik?.parseConfidence ?? null,
    telecomOnTimeRate: telecom.length ? telecomOnTime.length / telecom.length : null,
    telecomBillCount: telecom.length,
  };
}
