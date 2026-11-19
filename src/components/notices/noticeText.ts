// 기사 앱 알림 한 건의 문구. 토스트·알림함·홈이 같은 문구를 쓴다.

import type { RiderNotice } from "@/data/repository";
import type { Partner } from "@/data/types";
import type { Lang } from "@/i18n/lang";
import type { TranslateVars } from "@/i18n/translate";

type T = (key: string, vars?: TranslateVars) => string;

export function partnerName(partners: Partner[], id: string, lang: Lang): string {
  const p = partners.find((x) => x.id === id);
  return p ? (lang === "ko" ? p.nameKo : p.nameId) : id;
}

export function noticeText(t: T, notice: RiderNotice, partners: Partner[], lang: Lang): string {
  return t(`notices.${notice.kind}`, { partner: partnerName(partners, notice.partnerId, lang) });
}
