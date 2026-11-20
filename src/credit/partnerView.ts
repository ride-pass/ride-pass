// 렌털사·금융사 화면용 신청자 정보 (CLAUDE.md 2-4, 4-5).
// A단계: 사실 리포트와 경고만. 점수·등급은 결과에 아예 넣지 않는다.
// C단계: 사실 리포트 + 신용도·등급·이유 3개 + 「PKA 인가 후 제공 기능」 배지.
// 기사가 이 기관에 동의한 항목만 보여 준다 ("내가 고른 곳에만 보여 줍니다").
// 신용도도 동의한 항목만으로 계산한다. 공유하지 않은 상환 자료는 "자료 없음"으로 지우고,
// 수입 명세서나 활동 기록을 공유하지 않았으면 점수를 내지 않고 보류한다.
// 기사 화면 코드는 이 파일을 import하지 않는다 (eslint로 막음).

import { DEMO_TODAY } from "@/config/demo";
import { LICENSE_STAGE, type LicenseStage } from "@/config/licenseStage";
import { deriveSettlementVsDeposits, type RiderMetrics, type SettlementDepositBlock } from "@/data/derive";
import { getRider, getRiderMetrics, getRiderRecords, listApplications, listShareGrants } from "@/data/repository";
import type { Application, Rider, ShareGrant } from "@/data/types";
import { isWithin } from "@/lib/date";
import { evaluateCredit, repaymentSources, type Grade, type HoldCode, type Reason, type ReasonCode } from "./engine";

type ShareItem = ShareGrant["items"][number];

/** 렌털사 화면에만 있는 보류: 점수를 내는 데 꼭 필요한 항목을 기사가 공유하지 않았다 */
export type PartnerHoldCode = HoldCode | "NOT_SHARED_INCOME" | "NOT_SHARED_ACTIVITY";

/** 렌털사 화면에만 있는 이유: 상환 자료는 있지만 이 기관에 공유하지 않아 중립으로 반영했다 */
export type PartnerReason = Omit<Reason, "code"> & { code: ReasonCode | "REPAY_NOT_SHARED" };

/** 기사가 이 항목을 공유하지 않았으면 null */
export interface FactReport {
  income: {
    monthlyNet: number;
    avgMonthlyNet3m: number;
    depositMatchRate: number | null;
    depositMatched: boolean;
    /** 30일 구간별 정산 vs 입금 (대조 차트). 오래된 구간 → 최근 구간 */
    vsDeposits: SettlementDepositBlock[];
  } | null;
  activity: {
    activeDays30: number;
    platformCount30: number;
    consecutiveActiveMonths: number;
  } | null;
  rental: { onTimeRate: number; paymentCount: number } | null | "none";
  slik: { kolektibilitas: number; activeFacilities: number } | null | "none";
  telecom: { onTimeRate: number; billCount: number } | null | "none";
  /** 위변조 의심·정산·입금 불일치 경고 (income을 공유했을 때만) */
  warnings: string[];
}

export type PartnerCredit =
  | { status: "scored"; score: number; grade: Grade; reasons: PartnerReason[]; badge: "pka_licensed_feature" }
  | { status: "hold"; holds: PartnerHoldCode[] };

export type ApplicantReport =
  | { status: "no_consent"; riderId: string }
  | {
      status: "shared";
      stage: LicenseStage;
      rider: Pick<Rider, "id" | "displayName" | "area" | "avatarKey">;
      grant: Pick<ShareGrant, "id" | "items" | "grantedAt" | "expiresAt">;
      facts: FactReport;
      /** C단계에서만 들어 있다 */
      credit?: PartnerCredit;
    };

const MATCHED_THRESHOLD = 0.85;

export function activeGrant(
  grants: ShareGrant[],
  partnerId: string,
  today: string = DEMO_TODAY,
): ShareGrant | null {
  return (
    grants
      .filter(
        (g) =>
          g.partnerId === partnerId &&
          g.revokedAt === null &&
          isWithin(today, g.grantedAt, g.expiresAt),
      )
      .sort((a, b) => b.grantedAt.localeCompare(a.grantedAt))[0] ?? null
  );
}

export function factReport(m: RiderMetrics, items: ShareItem[], vsDeposits: SettlementDepositBlock[] = []): FactReport {
  const has = (item: ShareItem) => items.includes(item);
  const optional = <T>(item: ShareItem, present: boolean, value: () => T): T | null | "none" =>
    !has(item) ? null : present ? value() : "none";

  return {
    income: has("income")
      ? {
          monthlyNet: m.monthlyNet,
          avgMonthlyNet3m: m.avgMonthlyNet3m,
          depositMatchRate: m.depositMatchRate,
          depositMatched: m.depositMatchRate !== null && m.depositMatchRate >= MATCHED_THRESHOLD,
          vsDeposits,
        }
      : null,
    activity: has("activity")
      ? {
          activeDays30: m.activeDays30,
          platformCount30: m.platformCount30,
          consecutiveActiveMonths: m.consecutiveActiveMonths,
        }
      : null,
    rental: optional("rental_history", m.rentalOnTimeRate !== null, () => ({
      onTimeRate: m.rentalOnTimeRate!,
      paymentCount: m.rentalPaymentCount,
    })),
    slik: optional("slik_report", m.slikKolektibilitas !== null, () => ({
      kolektibilitas: m.slikKolektibilitas!,
      activeFacilities: m.slikActiveFacilities ?? 0,
    })),
    telecom: optional("telecom_bills", m.telecomOnTimeRate !== null, () => ({
      onTimeRate: m.telecomOnTimeRate!,
      billCount: m.telecomBillCount,
    })),
    warnings: has("income") ? m.warnings : [],
  };
}

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

/** 동의한 항목만으로 계산한 렌털사용 신용도 */
export function partnerCredit(m: RiderMetrics, items: ShareItem[]): PartnerCredit {
  const shareHolds: PartnerHoldCode[] = [];
  if (!items.includes("income")) shareHolds.push("NOT_SHARED_INCOME");
  if (!items.includes("activity")) shareHolds.push("NOT_SHARED_ACTIVITY");

  const shared = sharedMetrics(m, items);
  const credit = evaluateCredit(shared);
  if (shareHolds.length || credit.status === "hold") {
    return { status: "hold", holds: [...shareHolds, ...(credit.status === "hold" ? credit.holds : [])] };
  }

  // 상환 자료가 있는데 공유하지 않아 중립이 됐으면 "이력 없음"이 아니라 "공유된 이력 없음"으로 쓴다
  const hiddenRepayment = repaymentSources(shared).length === 0 && repaymentSources(m).length > 0;
  const reasons: PartnerReason[] = credit.reasons.map((r) =>
    hiddenRepayment && r.code === "REPAY_NO_HISTORY" ? { ...r, code: "REPAY_NOT_SHARED" } : r,
  );
  return { status: "scored", score: credit.score, grade: credit.grade, reasons, badge: "pka_licensed_feature" };
}

/** 신청자 한 명의 리포트. 이 기관에 유효한 동의가 없으면 no_consent */
export async function getApplicantReport(
  partnerId: string,
  riderId: string,
  stage: LicenseStage = LICENSE_STAGE,
): Promise<ApplicantReport | null> {
  const [rider, metrics, grants, records] = await Promise.all([
    getRider(riderId),
    getRiderMetrics(riderId),
    listShareGrants(riderId),
    getRiderRecords(riderId),
  ]);
  if (!rider || !metrics || !records) return null;
  const grant = activeGrant(grants, partnerId);
  if (!grant) return { status: "no_consent", riderId };

  const report: ApplicantReport = {
    status: "shared",
    stage,
    rider: {
      id: rider.id,
      displayName: rider.displayName,
      area: rider.area,
      avatarKey: rider.avatarKey,
    },
    grant: {
      id: grant.id,
      items: grant.items,
      grantedAt: grant.grantedAt,
      expiresAt: grant.expiresAt,
    },
    facts: factReport(metrics, grant.items, deriveSettlementVsDeposits(records, DEMO_TODAY)),
  };

  if (stage === "C") report.credit = partnerCredit(metrics, grant.items);
  return report;
}

export interface ApplicantRow {
  application: Application;
  report: ApplicantReport;
}

/** 렌털사 신청자 목록 (최근 제출 순) */
export async function listApplicantReports(
  partnerId: string,
  stage: LicenseStage = LICENSE_STAGE,
): Promise<ApplicantRow[]> {
  const applications = await listApplications(partnerId);
  const rows = await Promise.all(
    applications.map(async (application) => ({
      application,
      report: await getApplicantReport(partnerId, application.riderId, stage),
    })),
  );
  return rows.filter((r): r is ApplicantRow => r.report !== null);
}
