// KUR(정부 소상공인 대출) 신청 준비 체크리스트 (CLAUDE.md 3절 8단계).
// 조건을 충족하는지 체크만 한다. 금리·한도·승인 여부는 다루지 않는다 (2-1). 신청과 승인은 은행이 한다.
// 근거: 은행·언론의 KUR 2026 안내 (Permenko Perekonomian 1/2026 반영본). 공식 원문 확인 전 — 멘토 확인 필요.

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

/** 사업(활동)을 이어 온 최소 개월 수 */
export const KUR_MIN_ACTIVE_MONTHS = 6;
const MIN_SLIK_CONFIDENCE = 0.7;

function slikStatus(m: RiderMetrics): KurStatus {
  if (m.slikKolektibilitas === null) return "needs_upload";
  if (m.slikParseConfidence !== null && m.slikParseConfidence < MIN_SLIK_CONFIDENCE) return "needs_upload";
  if (m.slikKolektibilitas === 1) return "met";
  if (m.slikKolektibilitas === 2) return "partial";
  return "unmet";
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
    { id: "slik", group: "auto", status: slikStatus(m), vars: m.slikKolektibilitas ? { kol: m.slikKolektibilitas } : undefined },
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
