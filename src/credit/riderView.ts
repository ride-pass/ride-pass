// 기사 화면용 신용 정보 (CLAUDE.md 2-4, 4-5). 기사 화면은 이 파일의 getRiderCreditView()만 쓴다.
// A단계: 신용 준비도(요인별 ✓/△/✗)와 개선 방법만. 숫자 점수·등급은 결과에 아예 넣지 않는다.
// C단계: 신용도·등급·이유·개선 방법 + 「PKA 인가 후 제공 기능」 배지.

import { LICENSE_STAGE, type LicenseStage } from "@/config/licenseStage";
import { getRiderMetrics } from "@/data/repository";
import {
  evaluateCredit,
  type ActionCode,
  type FactorId,
  type FactorResult,
  type Grade,
  type HoldCode,
  type Reason,
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
  /** 화면에 「PKA 인가 후 제공 기능」 배지와 "시연용 가설 모델" 표기를 붙인다 */
  badge: "pka_licensed_feature";
}

export type RiderCreditView = RiderCreditHold | RiderCreditReadiness | RiderCreditScore;

export function markOf(value: number): ReadinessMark {
  if (value >= 0.7) return "met";
  if (value >= 0.4) return "partial";
  return "unmet";
}

function readiness(factors: FactorResult[]): ReadinessFactor[] {
  return READINESS_FACTORS.map((id) => ({
    id,
    mark: markOf(factors.find((f) => f.id === id)!.value),
  }));
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

  const factors = readiness(credit.factors);
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
    badge: "pka_licensed_feature",
  };
}
