// 기사 화면용 신용 정보 (CLAUDE.md 2-4, 4-5). 기사 화면은 이 파일의 getRiderCreditView()만 쓴다.
// A단계: 신용 준비도(요인별 ✓/△/✗)와 개선 방법만. 숫자 점수·등급은 결과에 아예 넣지 않는다.
// C단계: 신용도·등급·이유·개선 방법 + 「PKA 인가 후 제공 기능」 배지 + 「평가 기준 보기」에 쓰는 요인 6개.
// getRiderSubmissionView(): 「제출할 곳 고르기」에서 기관에 함께 가는 신용도. 렌털사 화면과 같은 계산(sharedCredit)이다.
// getRiderProductView(): 「추천」 화면. 내 신용 등급으로 볼 수 있는 가상 상품과 추천 3개 (products.ts, CLAUDE.md 2-1).

import { LICENSE_STAGE, type LicenseStage } from "@/config/licenseStage";
import { getRiderMetrics, listProducts } from "@/data/repository";
import { matchProducts, type ProductMatch } from "./products";
import { sharedCreditResult, type ShareItem, type SharedCredit, type SharedReason } from "./sharedCredit";

/** 기사 화면은 sharedCredit.ts를 직접 import하지 않으므로 필요한 타입만 여기서 내보낸다 */
export type { SharedCredit, SharedReason };
export type { LockedProduct, OfferReason, ProductMatch, ProductOffer } from "./products";
import {
  actionFor,
  evaluateCredit,
  type ActionCode,
  type FactorId,
  type FactorResult,
  type Grade,
  type HoldCode,
  type Reason,
  type RepaymentSource,
} from "./engine";

/** 신용 준비도에 보여 주는 요인 5개. 데이터 신뢰도는 재촬영 안내(평가 보류)로 따로 다룬다 */
export const READINESS_FACTORS = [
  "repayment",
  "stability",
  "verifiedIncome",
  "incomeLevel",
  "continuity",
] as const satisfies readonly FactorId[];

export type ReadinessFactorId = (typeof READINESS_FACTORS)[number];

/** ✓ 0.7 이상, △ 0.4 이상, ✗ 0.4 미만 */
export type ReadinessMark = "met" | "partial" | "unmet";

export interface ReadinessFactor {
  id: ReadinessFactorId;
  mark: ReadinessMark;
  /** 이 요인을 올리는 방법 (요인별 근거 자료 창 맨 아래). 이미 충분하면(✓) null */
  tip: ActionCode | null;
  /** 충분하지 않은 요인 중 가장 많이 깎인 요인 하나: 「먼저 채우면 좋아요」 표시 (2026-11-23) */
  focus: boolean;
}

export interface RiderCreditHold {
  stage: LicenseStage;
  status: "hold";
  holds: HoldCode[];
  actions: ActionCode[];
}

export interface RiderCreditReadiness {
  stage: "A";
  status: "readiness";
  factors: ReadinessFactor[];
  metCount: number;
  totalCount: number;
  improvement: ActionCode;
}

export interface RiderCreditScore {
  stage: "C";
  status: "scored";
  score: number;
  grade: Grade;
  reasons: Reason[];
  improvement: ActionCode;
  factors: ReadinessFactor[];
  /** 「평가 기준 보기」에 보여 줄 요인 6개 */
  criteria: CriteriaFactor[];
  /** 화면에 「PKA 인가 후 제공 기능」 배지와 "시연용 가설 모델" 표기를 붙인다 */
  badge: "pka_licensed_feature";
}

export type RiderCreditView = RiderCreditHold | RiderCreditReadiness | RiderCreditScore;

/** 「평가 기준 보기」: 요인 6개와 반영 비율(합 100), 내 상태 */
export interface CriteriaFactor {
  id: FactorId;
  weight: number;
  mark: ReadinessMark;
}

/** 「제출할 곳 고르기」에서 함께 보내는 신용도. A단계에는 신용도가 없다 */
export type RiderSubmissionView =
  | { stage: "A" }
  | { stage: "C"; credit: SharedCredit; criteria: CriteriaFactor[] | null };

export function markOf(value: number): ReadinessMark {
  if (value >= 0.7) return "met";
  if (value >= 0.4) return "partial";
  return "unmet";
}

function criteriaOf(factors: FactorResult[]): CriteriaFactor[] {
  return factors.map((f) => ({ id: f.id, weight: f.weight, mark: markOf(f.value) }));
}

function readiness(factors: FactorResult[], sources: RepaymentSource[]): ReadinessFactor[] {
  const rows = READINESS_FACTORS.map((id) => factors.find((f) => f.id === id)!);
  const lost = (f: FactorResult) => f.weight * (1 - f.value);
  // pickImprovement와 같은 기준(잃은 점수가 큰 순). 모두 충분하면 표시하지 않는다
  const focus = rows
    .filter((f) => markOf(f.value) !== "met")
    .sort((a, b) => lost(b) - lost(a) || b.weight - a.weight)[0]?.id;
  return rows.map((f) => {
    const mark = markOf(f.value);
    return { id: f.id as ReadinessFactorId, mark, tip: mark === "met" ? null : actionFor(f.id, sources), focus: f.id === focus };
  });
}

/** 기사가 없으면 null */
export async function getRiderCreditView(
  riderId: string,
  stage: LicenseStage = LICENSE_STAGE,
): Promise<RiderCreditView | null> {
  const metrics = await getRiderMetrics(riderId);
  if (!metrics) return null;
  const credit = evaluateCredit(metrics);

  if (credit.status === "hold") {
    return { stage, status: "hold", holds: credit.holds, actions: credit.actions };
  }

  const factors = readiness(credit.factors, credit.repaymentSources);
  if (stage === "A") {
    return {
      stage: "A",
      status: "readiness",
      factors,
      metCount: factors.filter((f) => f.mark === "met").length,
      totalCount: factors.length,
      improvement: credit.improvement,
    };
  }
  return {
    stage: "C",
    status: "scored",
    score: credit.score,
    grade: credit.grade,
    reasons: credit.reasons,
    improvement: credit.improvement,
    factors,
    criteria: criteriaOf(credit.factors),
    badge: "pka_licensed_feature",
  };
}

/**
 * 「제출할 곳 고르기」: 고른 기관들에 함께 가는 신용도. 기사가 동의한 항목(items)만으로 계산한다.
 * 렌털사 화면(partnerView)과 같은 함수로 계산하므로 두 화면의 점수는 항상 같다. 기사가 없으면 null
 */
export async function getRiderSubmissionView(
  riderId: string,
  items: ShareItem[],
  stage: LicenseStage = LICENSE_STAGE,
): Promise<RiderSubmissionView | null> {
  const metrics = await getRiderMetrics(riderId);
  if (!metrics) return null;
  if (stage === "A") return { stage: "A" };
  const { credit, factors } = sharedCreditResult(metrics, items);
  return { stage: "C", credit, criteria: credit.status === "scored" ? criteriaOf(factors) : null };
}

/** 「추천」 화면. 신용도가 있는 C단계에서만 상품을 고른다. 평가 보류면 추천하지 않는다 */
export type RiderProductView =
  | { stage: "A" }
  | { stage: "C"; status: "hold"; holds: HoldCode[] }
  | ({
      stage: "C";
      status: "scored";
      score: number;
      grade: Grade;
      improvement: ActionCode;
      badge: "pka_licensed_feature";
    } & ProductMatch);

/** 기사가 없으면 null */
export async function getRiderProductView(
  riderId: string,
  stage: LicenseStage = LICENSE_STAGE,
): Promise<RiderProductView | null> {
  const metrics = await getRiderMetrics(riderId);
  if (!metrics) return null;
  if (stage === "A") return { stage: "A" };
  const credit = evaluateCredit(metrics);
  if (credit.status === "hold") return { stage: "C", status: "hold", holds: credit.holds };
  return {
    stage: "C",
    status: "scored",
    score: credit.score,
    grade: credit.grade,
    improvement: credit.improvement,
    badge: "pka_licensed_feature",
    ...matchProducts(await listProducts(), credit.grade),
  };
}
