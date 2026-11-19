// 시연용 로그인: 아무 번호나 통과하고, 번호 끝 4자리로 시연 인물을 고른다 (CLAUDE.md 3절 2단계).
// +62 812-0000-0101 → r-budi … 0105 → r-rizky. 맞는 사람이 없으면 기본 시연 인물(r-budi).

import type { Rider } from "@/data/types";

export const DEFAULT_RIDER_ID = "r-budi";

export const digitsOnly = (value: string) => value.replace(/\D/g, "");

/** 인도네시아 휴대폰 번호(국가번호 뒤)는 9~12자리 */
export function isValidPhone(local: string): boolean {
  const d = digitsOnly(local).replace(/^0/, "");
  return d.length >= 9 && d.length <= 12;
}

/** "8120000 0101" → "812-0000-0101" (입력 중 보기 좋게) */
export function formatPhoneInput(value: string): string {
  const d = digitsOnly(value).slice(0, 12);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export function riderIdForPhone(local: string, riders: Rider[]): string {
  const last4 = digitsOnly(local).slice(-4);
  const match = riders.find((r) => digitsOnly(r.phoneMasked).endsWith(last4));
  return last4.length === 4 && match ? match.id : DEFAULT_RIDER_ID;
}
