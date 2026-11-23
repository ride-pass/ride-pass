// 기관에 보내는 자료의 기본값 (「제출할 곳 고르기」 /share 와 추천 상품 보내기 /recommend/send 가 같이 쓴다).
// - 렌털 신청 흐름(시연 3단계 동의)에서 동의한 항목이 있으면 그 항목을 그대로 보낸다.
// - 없으면(홈에서 시작한 경우) 동의 화면의 기본값처럼 올린 자료 전부를 보낸다. 입금 계좌가 없는 기사는 계좌 확인을 뺀다.
// 수입 명세서 하나만 보내면 활동 기록이 없어 신용도가 "평가 보류"가 된다 (sharedCredit, CLAUDE.md 4-5).
// - 2026-11-23: 기사에게 자료가 없는 항목(예: Budi의 통신요금)은 고르지도, 보내지도 않는다 (hasShareData).

import { DEMO_TODAY } from "@/config/demo";
import type { RiderMetrics } from "@/data/derive";
import type { Rider, ShareGrant } from "@/data/types";
import { isWithin } from "./date";

export type ShareItem = ShareGrant["items"][number];

/** 동의 화면(consent)과 같은 순서 */
export const ALL_SHARE_ITEMS: readonly ShareItem[] = ["income", "activity", "rental_history", "bank_account", "slik_report", "telecom_bills"];

/** 철회하지 않았고 기준일이 기간 안이면 유효한 동의 */
export function isActiveGrant(g: ShareGrant, today: string = DEMO_TODAY): boolean {
  return g.revokedAt === null && isWithin(today, g.grantedAt, g.expiresAt);
}

/** 항목마다 기사에게 실제 자료가 있는지 판단하는 데 필요한 값 */
export interface ShareData {
  hasBankAccount: boolean;
  rentalPaymentCount: number;
  slikKolektibilitas: number | null;
  telecomBillCount: number;
}

export function shareDataOf(
  rider: Pick<Rider, "hasBankAccount">,
  metrics: Pick<RiderMetrics, "rentalPaymentCount" | "slikKolektibilitas" | "telecomBillCount">,
): ShareData {
  return {
    hasBankAccount: rider.hasBankAccount,
    rentalPaymentCount: metrics.rentalPaymentCount,
    slikKolektibilitas: metrics.slikKolektibilitas,
    telecomBillCount: metrics.telecomBillCount,
  };
}

/** 이 항목을 보낼 자료가 있는가. 수입 명세서·활동 기록은 정산 기록에서 나오므로 늘 있다 */
export function hasShareData(item: ShareItem, d: ShareData): boolean {
  switch (item) {
    case "income":
    case "activity":
      return true;
    case "bank_account":
      return d.hasBankAccount;
    case "rental_history":
      return d.rentalPaymentCount > 0;
    case "slik_report":
      return d.slikKolektibilitas !== null;
    case "telecom_bills":
      return d.telecomBillCount > 0;
  }
}

/** 보낼 항목: 렌털 신청 때 동의한 항목(없으면 전부) 중 자료가 있는 것만. 자료를 아직 못 읽었으면(null) 거르지 않는다 */
export function defaultShareItems(data: ShareData | null, entryGrant: ShareGrant | null | undefined): ShareItem[] {
  const base = entryGrant ? entryGrant.items : ALL_SHARE_ITEMS;
  return data ? base.filter((i) => hasShareData(i, data)) : [...base];
}
