// CLAUDE.md 4-4: 요약 숫자는 fixture에 저장하지 않고 원본 기록에서 항상 계산한다.
// 순수 함수만 둔다 (입력 → 출력, 부수효과 없음).

import { DEMO_TODAY } from "@/config/demo";
import { addDays, dayOfWeek, diffDays, isWithin, type IsoDate } from "@/lib/date";
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

// ---- 홈 화면의 「일한 흔적」 활동 지도와 월별 순수입 막대 ----

/** 활동 지도에 그리는 기간: 기준일까지 최대 180일 */
export const ACTIVITY_MAP_DAYS = 180;

/**
 * 활동 지도의 첫날: 180일 전 날짜에서 가장 가까운 다음 월요일.
 * 지도는 한 열 = 한 주(월요일 위 → 일요일 아래)라, 첫날이 월요일이 아니면 첫 열에 칸 몇 개만 아래에 붙어 깨져 보인다 (2026-11-21).
 * 그래서 그리는 날 수는 174~180일이다.
 */
export function activityMapStart(today: IsoDate): IsoDate {
  const earliest = addDays(today, -(ACTIVITY_MAP_DAYS - 1));
  const toMonday = (8 - dayOfWeek(earliest)) % 7; // dayOfWeek: 0 = 일요일, 1 = 월요일
  return addDays(earliest, toMonday);
}
/** 월별 순수입 막대 개수 (30일 단위) */
export const MONTH_BAR_COUNT = 6;

export interface DailyActivity {
  date: IsoDate;
  /** 그날 정산 순수입 합 (Rp). 기록이 없으면 0 */
  net: number;
  /** 그날 완료 건수 합 */
  trips: number;
  /** 첫 활동일 이전이면 true (활동 지도에서 "아직 시작 전"으로 그린다) */
  beforeStart: boolean;
}

export interface MonthBlockNet {
  /** 30일 구간의 첫날과 마지막 날 (양 끝 포함) */
  start: IsoDate;
  end: IsoDate;
  net: number;
  /** 첫 활동일 이전이 섞인 구간. 평균·안정성 계산에서 빠지는 달이다 (fullMonthSeries와 같은 기준) */
  partial: boolean;
}

export interface RiderActivity {
  /** 오래된 날(월요일) → 기준일, 174~180개 (activityMapStart) */
  daily: DailyActivity[];
  /** 정산 기록이 있는 날 수 (daily 기간 안) */
  activeDays: number;
  /** 오래된 구간 → 최근 구간, MONTH_BAR_COUNT개. 마지막 구간의 net은 monthlyNet과 같다 */
  months: MonthBlockNet[];
}

export function deriveRiderActivity(
  records: RiderRecords,
  today: IsoDate = DEMO_TODAY,
): RiderActivity {
  const captures = records.captures.filter((c) => c.periodDate <= today);
  const byDate = new Map<IsoDate, { net: number; trips: number }>();
  for (const c of captures) {
    const day = byDate.get(c.periodDate) ?? { net: 0, trips: 0 };
    day.net += c.ocr.netAmount;
    day.trips += c.ocr.tripCount;
    byDate.set(c.periodDate, day);
  }

  const daily: DailyActivity[] = [];
  for (let date = activityMapStart(today); date <= today; date = addDays(date, 1)) {
    const day = byDate.get(date);
    daily.push({
      date,
      net: day?.net ?? 0,
      trips: day?.trips ?? 0,
      beforeStart: date < records.rider.firstActiveDate,
    });
  }

  const months: MonthBlockNet[] = [];
  for (let k = MONTH_BAR_COUNT - 1; k >= 0; k--) {
    const block = monthBlock(today, k);
    months.push({ ...block, net: netInRange(captures, block), partial: block.start < records.rider.firstActiveDate });
  }

  return { daily, activeDays: daily.filter((d) => d.net > 0).length, months };
}

// ---- 렌털사 화면의 「정산 vs 입금」 대조 차트 ----

export interface SettlementDepositBlock {
  /** 정산 기간 (30일, 양 끝 포함). 입금은 이 기간을 DEPOSIT_LAG_DAYS만큼 민 기간에서 센다 */
  start: IsoDate;
  end: IsoDate;
  settled: number;
  deposited: number;
}

/**
 * 30일 구간별 정산 순수입과 입금 합 (오래된 구간 → 최근 구간).
 * depositMatch()와 같은 기준: 정산은 오늘을 빼고(입금이 아직 안 들어옴), 입금은 하루 민 기간.
 * 그래서 마지막 구간의 입금 ÷ 정산(1로 자름)은 입금 일치율과 같다.
 */
export function deriveSettlementVsDeposits(
  records: RiderRecords,
  today: IsoDate = DEMO_TODAY,
  months: number = MONTH_BAR_COUNT,
): SettlementDepositBlock[] {
  const captures = records.captures.filter((c) => c.periodDate <= today);
  const deposits = records.deposits.filter((d) => d.date <= today);
  const settleToday = addDays(today, -DEPOSIT_LAG_DAYS);
  const blocks: SettlementDepositBlock[] = [];
  for (let k = months - 1; k >= 0; k--) {
    const block = monthBlock(settleToday, k);
    if (block.end < records.rider.firstActiveDate) continue;
    const depStart = addDays(block.start, DEPOSIT_LAG_DAYS);
    const depEnd = addDays(block.end, DEPOSIT_LAG_DAYS);
    blocks.push({
      ...block,
      settled: netInRange(captures, block),
      deposited: sum(deposits.filter((d) => isWithin(d.date, depStart, depEnd)).map((d) => d.amount)),
    });
  }
  return blocks;
}
