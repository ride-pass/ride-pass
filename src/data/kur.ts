// KUR(정부 소상공인 대출) 신청 준비 체크리스트 (CLAUDE.md 3절 8단계).
// 조건을 충족하는지 체크만 한다. 금리·한도·승인 여부는 다루지 않는다 (2-1). 신청과 승인은 은행이 한다.
// 근거: Permenko Perekonomian 1/2026 (2026-01-13 시행) 조항과 은행(BNI) 안내. 팀 조사 문서
// 「인니 KUR 기준 + 자격 확인 데이터」(이지호, 2026-11-20) 기준. 오토바이 기사용 세부 규칙(장관령)은
// 2026-12-31까지 발표 예정이라 그때 다시 맞춘다. 대출 금액 기준선(NPWP·BPJS)은 한도 숫자라 화면에 넣지 않는다 (3절 8단계).

import type { RiderMetrics } from "./derive";

/** 앱 자료로 자동 확인 / 은행이 확인 / 기사가 직접 준비하는 서류 */
export type KurGroup = "auto" | "bank" | "document";
export type KurStatus = "met" | "partial" | "unmet" | "needs_upload" | "check_with_bank" | "prepare";

export interface KurItem {
  id: string;
  group: KurGroup;
  status: KurStatus;
  /** 문구에 넣을 값 (예: 지금 활동 개월) */
  vars?: Record<string, number>;
}

/** 사업(활동)을 이어 온 최소 개월 수 (제27·34·41·48조 1항 a) */
export const KUR_MIN_ACTIVE_MONTHS = 6;
/** 사업 규모 상한: 연매출 Rp48억 (제3조 2항). 화면에는 숫자를 쓰지 않는다 */
export const KUR_MAX_ANNUAL_REVENUE = 4_800_000_000;
const MIN_SLIK_CONFIDENCE = 0.7;

/** 연체·부실 기록이 있으면 안 된다 (제14조 1항). 콜렉터빌리티 2(1~90일 연체)부터 미충족 */
function slikStatus(m: RiderMetrics): KurStatus {
  if (m.slikKolektibilitas === null) return "needs_upload";
  if (m.slikParseConfidence !== null && m.slikParseConfidence < MIN_SLIK_CONFIDENCE) return "needs_upload";
  return m.slikKolektibilitas === 1 ? "met" : "unmet";
}

/** 최근 3개월 월평균 순수입 × 12로 연 수입을 어림한다. 정산 기록이 없으면 확인할 수 없다 */
function revenueStatus(m: RiderMetrics): KurStatus {
  if (m.avgMonthlyNet3m <= 0) return "unmet";
  return m.avgMonthlyNet3m * 12 <= KUR_MAX_ANNUAL_REVENUE ? "met" : "unmet";
}

export function buildKurChecklist(m: RiderMetrics): KurItem[] {
  return [
    {
      id: "activeMonths",
      group: "auto",
      status: m.consecutiveActiveMonths >= KUR_MIN_ACTIVE_MONTHS ? "met" : "unmet",
      vars: { months: m.consecutiveActiveMonths, min: KUR_MIN_ACTIVE_MONTHS },
    },
    { id: "incomeProof", group: "auto", status: m.monthlyNet > 0 ? "met" : "unmet" },
    { id: "businessSize", group: "auto", status: revenueStatus(m) },
    { id: "slik", group: "auto", status: slikStatus(m), vars: m.slikKolektibilitas ? { kol: m.slikKolektibilitas } : undefined },
    { id: "citizenAge", group: "bank", status: "check_with_bank" },
    { id: "notCivilServant", group: "bank", status: "check_with_bank" },
    { id: "noOtherLoan", group: "bank", status: "check_with_bank" },
    { id: "bpjs", group: "bank", status: "check_with_bank" },
    { id: "ektp", group: "document", status: "prepare" },
    { id: "kk", group: "document", status: "prepare" },
    { id: "nib", group: "document", status: "prepare" },
    { id: "npwp", group: "document", status: "prepare" },
  ];
}

/** 앱으로 확인한 조건 중 충족한 개수 */
export function kurSummary(items: KurItem[]): { met: number; total: number } {
  const auto = items.filter((i) => i.group === "auto");
  return { met: auto.filter((i) => i.status === "met").length, total: auto.length };
}
