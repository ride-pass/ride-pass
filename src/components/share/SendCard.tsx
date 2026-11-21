"use client";

// 「함께 보내는 내용」 카드: 보내는 자료 목록 + (C단계) 받는 기관이 보는 것과 같은 신용도 (sharedCredit, CLAUDE.md 4-5).
// 「제출할 곳 고르기」(/share)와 추천 상품 보내기(/recommend/send)가 같이 쓴다. 두 화면의 유일한 흰 카드다.
// 점수는 홈·내 신용과 같은 모양(40px 「865 / 900」 + 등급 줄 + PKA 배지)으로 그린다 (CLAUDE.md 6-4).

import { useT } from "@/components/demo/DemoProvider";
import { CreditCriteria } from "@/components/credit/CreditCriteria";
import { PkaBadge } from "@/components/credit/PkaBadge";
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
    <section className="flex flex-col gap-3 rounded-3xl bg-surface p-4">
      <div>
        <h3 className="text-base font-bold">{t("share.send.title")}</h3>
        <p className="mt-0.5 text-xs text-muted">{t("share.send.itemsLabel")}</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {items.map((i) => (
            <li key={i} className="rounded-full bg-canvas px-3 py-1 text-sm font-medium">
              {t(`consent.items.${i}.title`)}
            </li>
          ))}
        </ul>
      </div>
      {submission?.stage === "A" ? <p className="text-xs leading-relaxed text-muted">{t("share.send.aNote")}</p> : null}
      {credit ? (
        <div className="flex flex-col gap-1 border-t border-line pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-muted">{t("share.send.creditTitle", { app: APP_NAME })}</span>
            <PkaBadge />
          </div>
          {credit.status === "scored" && submission?.stage === "C" && submission.criteria ? (
            <>
              <p className="mt-1 flex items-baseline gap-1.5 tabular-nums">
                <span className="text-figure font-bold">{credit.score}</span>
                <span className="text-base text-muted">/ 900</span>
              </p>
              <p className="mt-1 text-sm font-semibold">
                {credit.grade} · {t(`credit.grades.${credit.grade}`)}
              </p>
              <p className="text-xs text-muted">{t("share.send.sameAsPartner")}</p>
              <div className="mt-3 border-t border-line pt-3">
                <CreditCriteria reasons={credit.reasons} criteria={submission.criteria} grade={credit.grade} />
              </div>
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
    </section>
  );
}
