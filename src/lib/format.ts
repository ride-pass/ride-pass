// 통화·날짜 표시는 이 파일의 함수로만 한다 (CLAUDE.md 4-9).
// 서버와 브라우저에서 결과가 달라지지 않도록 Intl을 쓰지 않고 직접 만든다.

import type { Lang } from "@/i18n/lang";
import { parseIsoDate, type IsoDate } from "./date";

/** 인도네시아식 루피아 표기. 1250000 → "Rp 1.250.000" (정수로 반올림) */
export function formatRupiah(amount: number): string {
  if (!Number.isFinite(amount)) throw new Error(`금액이 숫자가 아님: ${amount}`);
  const rounded = Math.round(amount);
  const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${rounded < 0 ? "-" : ""}Rp ${digits}`;
}

// 인도네시아어 월 약어
// TODO: 원어민 검수
const ID_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
] as const;

/** ko: "2026년 11월 19일", id: "19 Nov 2026" */
export function formatDate(iso: IsoDate, lang: Lang): string {
  const { year, month, day } = parseIsoDate(iso);
  if (lang === "ko") return `${year}년 ${month}월 ${day}일`;
  return `${day} ${ID_MONTHS[month - 1]} ${year}`;
}
