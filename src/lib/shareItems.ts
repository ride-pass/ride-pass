// 기관에 보내는 자료의 기본값 (「제출할 곳 고르기」 /share 와 추천 상품 보내기 /recommend/send 가 같이 쓴다).
// - 렌털 신청 흐름(시연 3단계 동의)에서 동의한 항목이 있으면 그 항목을 그대로 보낸다.
// - 없으면(홈에서 시작한 경우) 동의 화면의 기본값처럼 올린 자료 전부를 보낸다. 입금 계좌가 없는 기사는 계좌 확인을 뺀다.
// 수입 명세서 하나만 보내면 활동 기록이 없어 신용도가 "평가 보류"가 된다 (sharedCredit, CLAUDE.md 4-5).

import { DEMO_TODAY } from "@/config/demo";
import type { Rider, ShareGrant } from "@/data/types";
import { isWithin } from "./date";

export type ShareItem = ShareGrant["items"][number];

/** 동의 화면(consent)과 같은 순서 */
export const ALL_SHARE_ITEMS: readonly ShareItem[] = ["income", "activity", "rental_history", "bank_account", "slik_report", "telecom_bills"];

/** 철회하지 않았고 기준일이 기간 안이면 유효한 동의 */
export function isActiveGrant(g: ShareGrant, today: string = DEMO_TODAY): boolean {
  return g.revokedAt === null && isWithin(today, g.grantedAt, g.expiresAt);
}

export function defaultShareItems(rider: Pick<Rider, "hasBankAccount"> | null, entryGrant: ShareGrant | null | undefined): ShareItem[] {
  if (entryGrant) return entryGrant.items;
  return ALL_SHARE_ITEMS.filter((i) => i !== "bank_account" || rider?.hasBankAccount !== false);
}
