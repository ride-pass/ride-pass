"use client";

// 시연 1단계: 가상 렌털사 A의 신청 화면. 여기서 링크를 눌러 기사 앱으로 들어간다 (CLAUDE.md 3절).
// 렌털사 화면이라 기사 앱과 다른 모양(흰 바탕·회색)으로 그린다.

import { Bike, Check, FileText, IdCard, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { ENTRY_PARTNER_ID, useDemo, useT } from "@/components/demo/DemoProvider";
import { LangToggle } from "@/components/demo/LangToggle";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { DemoNote } from "@/components/ui/DemoNote";
import { APP_NAME } from "@/config/brand";
import { getPartner, listApplications, listShareGrants } from "@/data/repository";
import type { Application, Partner } from "@/data/types";

export default function PartnerApplyPage() {
  const t = useT();
  const { lang, setPartnerId, riderId, dataVersion } = useDemo();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    getPartner(ENTRY_PARTNER_ID).then(setPartner);
  }, []);

  // 기사가 이미 수입 명세서를 냈으면 신청서에 "제출 완료"와 렌털사 처리 상태를 보여 준다 (1단계 ↔ 7단계 연결)
  useEffect(() => {
    listApplications(ENTRY_PARTNER_ID).then((apps) => setApplication(apps.find((a) => a.riderId === riderId) ?? null));
    listShareGrants(riderId).then((gs) =>
      setShared(gs.some((g) => g.partnerId === ENTRY_PARTNER_ID && g.revokedAt === null)),
    );
  }, [riderId, dataVersion]);
  const submitted = Boolean(application && shared);

  const partnerName = partner ? (lang === "ko" ? partner.nameKo : partner.nameId) : "";

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <div className="bg-zinc-800 px-4 py-2 text-center text-xs font-medium text-zinc-200">
        {t("apply.demoLabel")}
      </div>
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="flex items-center gap-2 font-bold text-zinc-800">
          <Bike className="size-5" aria-hidden />
          {partnerName}
        </span>
        <LangToggle />
      </header>

      <main className="flex flex-1 flex-col gap-5 px-4 py-6">
        <div>
          <p className="text-sm text-zinc-500">{t("apply.progress")}</p>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900">{t("apply.title")}</h1>
        </div>

        <section className="rounded-2xl border border-line p-4">
          <h2 className="text-sm font-semibold text-zinc-500">{t("apply.applicantTitle")}</h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-zinc-500">{t("apply.nameLabel")}</dt>
            <dd className="text-right text-zinc-800">{t("apply.filled")}</dd>
            <dt className="text-zinc-500">{t("apply.phoneLabel")}</dt>
            <dd className="text-right text-zinc-800">{t("apply.filled")}</dd>
          </dl>
        </section>

        <section className="rounded-2xl border border-line p-4">
          <h2 className="text-sm font-semibold text-zinc-500">{t("apply.docsTitle")}</h2>
          <ul className="mt-3 flex flex-col gap-3">
            <li className="flex items-center gap-3">
              <IdCard className="size-5 text-zinc-500" aria-hidden />
              <span className="flex-1 text-sm text-zinc-800">{t("apply.docId")}</span>
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <Check className="size-3.5" aria-hidden />
                {t("apply.docIdStatus")}
              </span>
            </li>
            <li className="flex items-center gap-3">
              <FileText className="size-5 text-brand-purple" aria-hidden />
              <span className="flex-1 text-sm font-semibold text-zinc-900">{t("apply.docIncome")}</span>
              {submitted ? (
                <Badge tone="lime">{t("apply.docIncomeSubmitted", { app: APP_NAME })}</Badge>
              ) : (
                <Badge tone="danger">{t("apply.docIncomeStatus")}</Badge>
              )}
            </li>
          </ul>
          <p className="mt-4 rounded-xl bg-zinc-50 p-3 text-sm leading-relaxed text-zinc-600">
            {submitted && application
              ? t("apply.reviewStatus", { status: t(`applicants.status.${application.status}`) })
              : t("apply.incomeHint")}
          </p>
        </section>

        <div className="mt-auto flex flex-col gap-3">
          {submitted ? (
            <ButtonLink href="/history" variant="secondary">
              {t("apply.openHistory", { app: APP_NAME })}
            </ButtonLink>
          ) : (
            <ButtonLink href="/onboarding" onClick={() => setPartnerId(ENTRY_PARTNER_ID)}>
              {t("apply.cta", { app: APP_NAME })}
            </ButtonLink>
          )}
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-zinc-500">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {t("apply.notice", { app: APP_NAME })}
          </p>
          <DemoNote>{t("common.demoOnly")}</DemoNote>
        </div>
      </main>
    </div>
  );
}
