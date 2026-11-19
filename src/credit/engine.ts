// 신용도 엔진 (CLAUDE.md 4-5). 순수 함수만 둔다 (입력 → 출력, 부수효과 없음).
// 가중치는 가설이다. 데이터에 맞춰 고치지 않는다 (4-6). 고칠 때는 CLAUDE.md 4-5를 먼저 고친다.
// 화면 코드는 이 파일을 직접 import하지 않는다. 기사 화면은 riderView, 렌털사 화면은 partnerView만 쓴다 (2-4).

import type { RiderMetrics } from "@/data/derive";

export type FactorId =
  | "repayment"
  | "stability"
  | "verifiedIncome"
  | "incomeLevel"
  | "continuity"
  | "dataQuality";

/** 요인별 가중치 (합 100) */
export const FACTOR_WEIGHTS: Record<FactorId, number> = {
  repayment: 25,
  stability: 20,
  verifiedIncome: 20,
  incomeLevel: 15,
  continuity: 15,
  dataQuality: 5,
};

export const FACTOR_IDS = Object.keys(FACTOR_WEIGHTS) as FactorId[];

export const SCORE_MIN = 400;
export const SCORE_MAX = 900;
/** 강제 상한 (소득 검증 필요, 금융기관 연체 기록) */
export const SCORE_CAP = 549;
/** 이 일수 미만이면 평가 보류 */
export const MIN_HISTORY_DAYS = 60;
/** 최신 촬영·SLIK 확인서 신뢰도가 이 값 미만이면 다시 올리기 */
export const MIN_CONFIDENCE = 0.7;
/** 입금 일치율이 이 값 미만이면 상한 */
export const DEPOSIT_CAP_THRESHOLD = 0.85;

export type Grade = "A" | "B" | "C" | "D" | "E";

export type RepaymentSource = "rental" | "slik" | "telecom";

export type ReasonCode =
  // 강제 상한
  | "INCOME_VERIFICATION_NEEDED"
  | "SLIK_DELINQUENT"
  // 요인별 (올린 쪽 / 깎은 쪽)
  | "REPAY_ON_TIME"
  | "REPAY_LATE"
  | "REPAY_NO_HISTORY"
  | "INCOME_STABLE"
  | "INCOME_VOLATILE"
  | "DEPOSIT_MATCHED"
  | "DEPOSIT_MISMATCH"
  | "INCOME_HIGH"
  | "INCOME_LOW"
  | "LONG_HISTORY"
  | "SHORT_HISTORY"
  | "DATA_RELIABLE"
  | "DATA_UNRELIABLE";

export type ActionCode =
  | "ADD_REPAYMENT_RECORDS"
  | "PAY_ON_TIME"
  | "KEEP_STEADY_INCOME"
  | "UPLOAD_BANK_STATEMENT"
  | "ADD_ALL_APP_SETTLEMENTS"
  | "KEEP_ACTIVE"
  | "RETAKE_CLEAR_PHOTO"
  | "KEEP_UPLOADING";

export type HoldCode = "NEED_RETAKE" | "NEED_MORE_HISTORY";

export interface FactorResult {
  id: FactorId;
  /** 0~1 */
  value: number;
  weight: number;
  /** 중립(0.5) 대비 점수에 준 영향 = 가중치 × (값 − 0.5). 양수면 올림, 음수면 깎음 */
  impact: number;
}

export interface Reason {
  code: ReasonCode;
  factor: FactorId | null;
  /** 상환 이력 이유일 때 근거가 된 자료 */
  sources?: RepaymentSource[];
}

export interface ScoredCredit {
  status: "scored";
  score: number;
  grade: Grade;
  /** 항상 3개 */
  reasons: Reason[];
  improvement: ActionCode;
  factors: FactorResult[];
  /** 강제 상한이 걸렸으면 그 이유 */
  caps: ("INCOME_VERIFICATION_NEEDED" | "SLIK_DELINQUENT")[];
  repaymentSources: RepaymentSource[];
}

export interface HeldCredit {
  status: "hold";
  holds: HoldCode[];
  /** 기사가 할 일 */
  actions: ActionCode[];
  factors: FactorResult[];
  repaymentSources: RepaymentSource[];
}

export type CreditResult = ScoredCredit | HeldCredit;

// ---- 0~1 변환 ----

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** x0에서 0, x1에서 1, 사이는 직선 (x0 > x1이면 거꾸로) */
function linear(x: number, x0: number, x1: number): number {
  return clamp01((x - x0) / (x1 - x0));
}

/** 정시 납부율: 0.80 이하 0, 0.98 이상 1 */
const onTimeRateValue = (rate: number) => linear(rate, 0.8, 0.98);

/** SLIK 콜렉터빌리티: 1 = 1, 2 = 0.5, 3 이상 = 0 */
function slikValue(kol: number): number {
  if (kol <= 1) return 1;
  if (kol === 2) return 0.5;
  return 0;
}

/** SLIK 확인서를 점수에 쓸 수 있는가 (읽은 신뢰도가 충분한가) */
function usableSlik(m: RiderMetrics): number | null {
  if (m.slikKolektibilitas === null) return null;
  if (m.slikParseConfidence !== null && m.slikParseConfidence < MIN_CONFIDENCE) return null;
  return m.slikKolektibilitas;
}

export function repaymentSources(m: RiderMetrics): RepaymentSource[] {
  const out: RepaymentSource[] = [];
  if (m.rentalOnTimeRate !== null) out.push("rental");
  if (usableSlik(m) !== null) out.push("slik");
  if (m.telecomOnTimeRate !== null) out.push("telecom");
  return out;
}

function repaymentValue(m: RiderMetrics): number {
  const values: number[] = [];
  if (m.rentalOnTimeRate !== null) values.push(onTimeRateValue(m.rentalOnTimeRate));
  const kol = usableSlik(m);
  if (kol !== null) values.push(slikValue(kol));
  if (m.telecomOnTimeRate !== null) values.push(onTimeRateValue(m.telecomOnTimeRate));
  if (values.length === 0) return 0.5; // 이력 없음 = 중립
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** 변동계수 (모집단 표준편차 ÷ 평균) */
export function coefficientOfVariation(series: number[]): number | null {
  if (series.length < 2) return null;
  const mean = series.reduce((a, b) => a + b, 0) / series.length;
  if (mean <= 0) return null;
  const variance = series.reduce((a, x) => a + (x - mean) ** 2, 0) / series.length;
  return Math.sqrt(variance) / mean;
}

function stabilityValue(m: RiderMetrics): number {
  const cv = coefficientOfVariation(m.monthlyNetSeries6m);
  if (cv === null) return m.monthlyNetSeries6m.length < 2 ? 0.5 : 0;
  return 1 - linear(cv, 0.1, 0.4);
}

function verifiedIncomeValue(m: RiderMetrics): number {
  return m.depositMatchRate === null ? 0 : linear(m.depositMatchRate, 0.5, 0.95);
}

function incomeLevelValue(m: RiderMetrics): number {
  const x = m.avgMonthlyNet3m;
  if (x < 2_000_000) return 0;
  if (x < 3_000_000) return 0.5 * linear(x, 2_000_000, 3_000_000);
  return 0.5 + 0.5 * linear(x, 3_000_000, 6_000_000);
}

function continuityValue(m: RiderMetrics): number {
  return clamp01(m.consecutiveActiveMonths / 12);
}

function dataQualityValue(m: RiderMetrics): number {
  if (m.editFlags.length > 0 || m.avgOcrConfidence === null) return 0;
  return linear(m.avgOcrConfidence, MIN_CONFIDENCE, 0.9);
}

export function factorValues(m: RiderMetrics): Record<FactorId, number> {
  return {
    repayment: repaymentValue(m),
    stability: stabilityValue(m),
    verifiedIncome: verifiedIncomeValue(m),
    incomeLevel: incomeLevelValue(m),
    continuity: continuityValue(m),
    dataQuality: dataQualityValue(m),
  };
}

export function gradeOf(score: number): Grade {
  if (score >= 800) return "A";
  if (score >= 700) return "B";
  if (score >= 600) return "C";
  if (score >= 500) return "D";
  return "E";
}

// ---- 이유·개선 방법 ----

const POSITIVE: Record<FactorId, ReasonCode> = {
  repayment: "REPAY_ON_TIME",
  stability: "INCOME_STABLE",
  verifiedIncome: "DEPOSIT_MATCHED",
  incomeLevel: "INCOME_HIGH",
  continuity: "LONG_HISTORY",
  dataQuality: "DATA_RELIABLE",
};

const NEGATIVE: Record<FactorId, ReasonCode> = {
  repayment: "REPAY_LATE",
  stability: "INCOME_VOLATILE",
  verifiedIncome: "DEPOSIT_MISMATCH",
  incomeLevel: "INCOME_LOW",
  continuity: "SHORT_HISTORY",
  dataQuality: "DATA_UNRELIABLE",
};

function factorReason(f: FactorResult, sources: RepaymentSource[]): Reason {
  if (f.id === "repayment" && sources.length === 0) {
    return { code: "REPAY_NO_HISTORY", factor: "repayment" };
  }
  const code = f.impact >= 0 ? POSITIVE[f.id] : NEGATIVE[f.id];
  return f.id === "repayment" ? { code, factor: f.id, sources } : { code, factor: f.id };
}

/**
 * 이유 3개: 강제 상한 이유 → 가장 많이 올린 요인 → 가장 많이 깎은 요인
 * → (상환 이력이 없으면) 상환 이력 없음 → 남은 요인 중 영향이 큰 순.
 * 상한 이유와 같은 내용의 요인 이유는 겹쳐 쓰지 않는다.
 */
function pickReasons(
  factors: FactorResult[],
  caps: ScoredCredit["caps"],
  sources: RepaymentSource[],
): Reason[] {
  const reasons: Reason[] = caps.map((code) => ({ code, factor: null }));
  const used = new Set<FactorId>();
  if (caps.includes("INCOME_VERIFICATION_NEEDED")) used.add("verifiedIncome");
  if (caps.includes("SLIK_DELINQUENT")) used.add("repayment");

  const add = (f: FactorResult | undefined) => {
    if (!f || used.has(f.id) || reasons.length >= 3) return;
    used.add(f.id);
    reasons.push(factorReason(f, sources));
  };

  const byImpact = [...factors].sort((a, b) => b.impact - a.impact || b.weight - a.weight);
  add(byImpact.find((f) => f.impact > 0 && !used.has(f.id)));
  add([...byImpact].reverse().find((f) => f.impact < 0 && !used.has(f.id)));
  if (sources.length === 0) add(factors.find((f) => f.id === "repayment"));
  const byMagnitude = [...factors].sort(
    (a, b) => Math.abs(b.impact) - Math.abs(a.impact) || b.weight - a.weight,
  );
  for (const f of byMagnitude) add(f);
  return reasons;
}

const ACTION: Record<FactorId, ActionCode> = {
  repayment: "PAY_ON_TIME",
  stability: "KEEP_STEADY_INCOME",
  verifiedIncome: "UPLOAD_BANK_STATEMENT",
  incomeLevel: "ADD_ALL_APP_SETTLEMENTS",
  continuity: "KEEP_ACTIVE",
  dataQuality: "RETAKE_CLEAR_PHOTO",
};

/** 가장 많은 점수를 잃은 요인(가중치 × (1 − 값)) 하나에 대한 행동 */
export function pickImprovement(
  factors: FactorResult[],
  sources: RepaymentSource[],
): ActionCode {
  const worst = [...factors].sort(
    (a, b) => b.weight * (1 - b.value) - a.weight * (1 - a.value) || b.weight - a.weight,
  )[0];
  if (worst.id === "repayment" && sources.length === 0) return "ADD_REPAYMENT_RECORDS";
  return ACTION[worst.id];
}

// ---- 계산 ----

export function evaluateCredit(m: RiderMetrics): CreditResult {
  const values = factorValues(m);
  const factors: FactorResult[] = FACTOR_IDS.map((id) => ({
    id,
    value: values[id],
    weight: FACTOR_WEIGHTS[id],
    impact: FACTOR_WEIGHTS[id] * (values[id] - 0.5),
  }));
  const sources = repaymentSources(m);

  const holds: HoldCode[] = [];
  if (m.latestOcrConfidence === null || m.latestOcrConfidence < MIN_CONFIDENCE) {
    holds.push("NEED_RETAKE");
  }
  if (m.historyDays < MIN_HISTORY_DAYS) holds.push("NEED_MORE_HISTORY");
  if (holds.length) {
    const actions = holds.map((h): ActionCode =>
      h === "NEED_RETAKE" ? "RETAKE_CLEAR_PHOTO" : "KEEP_UPLOADING",
    );
    return { status: "hold", holds, actions, factors, repaymentSources: sources };
  }

  const weighted = factors.reduce((a, f) => a + (f.weight / 100) * f.value, 0);
  let score = Math.round(SCORE_MIN + (SCORE_MAX - SCORE_MIN) * weighted);

  const caps: ScoredCredit["caps"] = [];
  const mismatch =
    m.depositMatchRate !== null && m.depositMatchRate < DEPOSIT_CAP_THRESHOLD;
  if (m.editFlags.length > 0 || mismatch) caps.push("INCOME_VERIFICATION_NEEDED");
  const kol = usableSlik(m);
  if (kol !== null && kol >= 3) caps.push("SLIK_DELINQUENT");
  if (caps.length) score = Math.min(score, SCORE_CAP);

  return {
    status: "scored",
    score,
    grade: gradeOf(score),
    reasons: pickReasons(factors, caps, sources),
    improvement: pickImprovement(factors, sources),
    factors,
    caps,
    repaymentSources: sources,
  };
}
