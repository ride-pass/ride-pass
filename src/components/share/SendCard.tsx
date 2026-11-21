"use client";

// 「함께 보내는 내용」 카드: 보내는 자료 목록 + (C단계) 받는 기관이 보는 것과 같은 신용도 (sharedCredit, CLAUDE.md 4-5).
// 「제출할 곳 고르기」(/share)와 추천 상품 보내기(/recommend/send)가 같이 쓴다.

import { useT } from "@/components/demo/DemoProvider";
import { CreditCriteria } from "@/components/credit/CreditCriteria";
import { PkaBadge } from "@/components/credit/PkaBadge";
import { Card } from "@/components/ui/Card";
import { APP_NAME } from "@/config/brand";
import type { RiderSubmissionView } from "@/credit/riderView";
import type { ShareGrant } from "@/data/types";

/**
 * 고른 곳에 함께 가는 내용. 자료 목록 + (C단계) 렌털사가 받는 것과 같은 신용도.
 * A단계에는 신용도를 보내지 않으므로 점수를 보여 주지 않는다 (CLAUDE.md 2-4).
 */
export function SendCard({ items, submission }: { items: ShareGrant["items"]; submission: RiderSubmissionView | null }) {
  const t = useT();
  const credit = submission?.stage === "C" ? submission.credit : null;
  return (
    <Card className="flex flex-col gap-3">
      <div>
        <p className="font-semibold">{t("share.send.title")}</p>
        <p className="mt-0.5 text-xs text-muted">{t("share.send.itemsLabel")}</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {items.map((i) => (
            <li key={i} className="rounded-full bg-canvas px-2.5 py-1 text-xs font-medium">
              {t(`consent.items.${i}.title`)}
            </li>
          ))}
        </ul>
      </div>
      {submission?.stage === "A" ? <p className="text-xs leading-relaxed text-muted">{t("share.send.aNote")}</p> : null}
      {credit ? (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-brand-purple">{t("share.send.creditTitle", { app: APP_NAME })}</span>
            <PkaBadge />
          </div>
          {credit.status === "scored" && submission?.stage === "C" && submission.criteria ? (
            <>
              <p className="text-2xl font-bold text-brand-navy tabular-nums">
                {credit.score} <span className="text-base font-semibold">{credit.grade} · {t(`credit.grades.${credit.grade}`)}</span>
              </p>
              <p className="text-xs text-muted">{t("share.send.sameAsPartner")}</p>
              <CreditCriteria reasons={credit.reasons} criteria={submission.criteria} grade={credit.grade} />
            </>
          ) : credit.status === "hold" ? (
            <ul className="flex flex-col gap-1 text-sm">
              <li className="font-semibold">{t("credit.holds.title")}</li>
              {credit.holds.map((h) => (
                <li key={h} className="text-muted">
                  {h === "NOT_SHARED_INCOME" || h === "NOT_SHARED_ACTIVITY" ? t(`share.send.holds.${h}`) : t(`credit.holds.${h}`)}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-[11px] leading-relaxed text-muted">{t("credit.disclaimer")}</p>
        </div>
      ) : null}
    </Card>
  );
}
