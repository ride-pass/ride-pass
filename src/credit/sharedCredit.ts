// 기사가 한 기관에 공유한 항목만으로 낸 신용도 (CLAUDE.md 4-5).
// 렌털사 화면(partnerView)과 기사의 「제출할 곳 고르기」 화면(riderView)이 같은 계산을 쓴다.
// 그래야 기사가 제출 전에 본 점수와 렌털사가 받는 점수가 항상 같다.
// 공유하지 않은 상환 자료는 "자료 없음"으로 지우고, 수입 명세서나 활동 기록을 공유하지 않았으면 점수를 내지 않고 보류한다.

import type { RiderMetrics } from "@/data/derive";
import type { ShareGrant } from "@/data/types";
import {
  evaluateCredit,
  repaymentSources,
  type FactorResult,
  type Grade,
  type HoldCode,
  type Reason,
  type ReasonCode,
} from "./engine";

export type ShareItem = ShareGrant["items"][number];

/** 공유 항목 때문에 생기는 보류: 점수를 내는 데 꼭 필요한 항목을 기사가 공유하지 않았다 */
export type SharedHoldCode = HoldCode | "NOT_SHARED_INCOME" | "NOT_SHARED_ACTIVITY";

/** 상환 자료는 있지만 이 기관에 공유하지 않아 중립으로 반영했을 때의 이유 */
export type SharedReason = Omit<Reason, "code"> & { code: ReasonCode | "REPAY_NOT_SHARED" };

export type SharedCredit =
  | { status: "scored"; score: number; grade: Grade; reasons: SharedReason[]; badge: "pka_licensed_feature" }
  | { status: "hold"; holds: SharedHoldCode[] };

/** 공유하지 않은 상환 자료(렌털 납부·SLIK 확인서·통신요금)를 "자료 없음"으로 지운 복사본 */
export function sharedMetrics(m: RiderMetrics, items: ShareItem[]): RiderMetrics {
  const out = { ...m };
  if (!items.includes("rental_history")) {
    out.rentalOnTimeRate = null;
    out.rentalPaymentCount = 0;
  }
  if (!items.includes("slik_report")) {
    out.slikKolektibilitas = null;
    out.slikActiveFacilities = null;
    out.slikParseConfidence = null;
  }
  if (!items.includes("telecom_bills")) {
    out.telecomOnTimeRate = null;
    out.telecomBillCount = 0;
  }
  return out;
}

/** 공유한 항목만으로 계산한 신용도와, 그 계산에 쓴 요인값 */
export function sharedCreditResult(
  m: RiderMetrics,
  items: ShareItem[],
): { credit: SharedCredit; factors: FactorResult[] } {
  const shareHolds: SharedHoldCode[] = [];
  if (!items.includes("income")) shareHolds.push("NOT_SHARED_INCOME");
  if (!items.includes("activity")) shareHolds.push("NOT_SHARED_ACTIVITY");

  const shared = sharedMetrics(m, items);
  const result = evaluateCredit(shared);
  if (shareHolds.length || result.status === "hold") {
    return {
      credit: { status: "hold", holds: [...shareHolds, ...(result.status === "hold" ? result.holds : [])] },
      factors: result.factors,
    };
  }

  // 상환 자료가 있는데 공유하지 않아 중립이 됐으면 "이력 없음"이 아니라 "공유된 이력 없음"으로 쓴다
  const hiddenRepayment = repaymentSources(shared).length === 0 && repaymentSources(m).length > 0;
  const reasons: SharedReason[] = result.reasons.map((r) =>
    hiddenRepayment && r.code === "REPAY_NO_HISTORY" ? { ...r, code: "REPAY_NOT_SHARED" } : r,
  );
  return {
    credit: { status: "scored", score: result.score, grade: result.grade, reasons, badge: "pka_licensed_feature" },
    factors: result.factors,
  };
}

/** 공유한 항목만으로 계산한 신용도 */
export function sharedCredit(m: RiderMetrics, items: ShareItem[]): SharedCredit {
  return sharedCreditResult(m, items).credit;
}
