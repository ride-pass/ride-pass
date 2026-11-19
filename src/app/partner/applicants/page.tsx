"use client";

// 시연 7단계: 렌털사 확인 화면 (CLAUDE.md 3절, 2-4).
// A단계: 신청자별 사실 리포트와 위변조 경고만. 점수·등급은 보여 주지 않는다.
// C단계: 여기에 신용도 400~900·등급·이유 3개 + 「PKA 인가 후 제공 기능」 배지 + "시연용 가설 모델" 표기.
// 기사가 이 렌털사에 동의한 항목만 보인다. 승인 버튼은 렌털사가 누른다.

import { Bike, Check, ChevronDown, CircleAlert, Clock, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ENTRY_PARTNER_ID, useDemo, useT } from "@/components/demo/DemoProvider";
import { LangToggle } from "@/components/demo/LangToggle";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { listApplicantReports, type ApplicantRow, type FactReport, type PartnerCredit } from "@/credit/partnerView";
import { getPartner, listRiders, recordApplicationView, setApplicationStatus } from "@/data/repository";
import type { Application, Partner, Rider } from "@/data/types";
import { formatDate, formatRupiah } from "@/lib/format";

const pct = (x: number) => `${Math.round(x * 100)}%`;

export default function ApplicantsPage() {
  const t = useT();
  const { stage, lang, dataVersion } = useDemo();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [rows, setRows] = useState<ApplicantRow[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  // dataVersion: 조작판이 신청을 넣거나 초기화하면 다시 읽는다
  const load = useCallback(
    () => listApplicantReports(ENTRY_PARTNER_ID, stage).then(setRows),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stage, dataVersion],
  );
  useEffect(() => {
    getPartner(ENTRY_PARTNER_ID).then(setPartner);
    listRiders().then(setRiders);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const toast = useToast();

  const decide = async (app: Application, status: Application["status"]) => {
    await setApplicationStatus(app.id, status);
    await load();
    toast(t(status === "approved" ? "applicants.approvedToast" : "applicants.rejectedToast", { name: riderName(app.riderId) }), "success");
  };

  /** 신청서를 펼친다. 기사가 공유한 자료가 보이면 열람 기록을 남긴다 (기사 앱 제출 이력·알림에 보인다) */
  const toggle = (row: ApplicantRow) => {
    const id = row.application.id;
    if (open === id) return setOpen(null);
    setOpen(id);
    if (row.report.status === "shared") recordApplicationView(id);
  };

  const warnings = rows.filter((r) => r.report.status === "shared" && r.report.facts.warnings.length > 0).length;
  const riderName = (id: string) => riders.find((r) => r.id === id)?.displayName ?? id;

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <div className="bg-zinc-800 px-4 py-2 text-center text-xs font-medium text-zinc-200">{t("applicants.demoLabel")}</div>
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
        <span className="flex items-center gap-2 font-bold text-zinc-800">
          <Bike className="size-5" aria-hidden />
          {partner ? (lang === "ko" ? partner.nameKo : partner.nameId) : ""}
        </span>
        <LangToggle />
      </header>

      <main className="flex flex-col gap-3 px-4 py-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{t("applicants.title")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("applicants.summary", { n: rows.length, w: warnings })}</p>
        </div>
        <p className="rounded-xl bg-surface px-3 py-2 text-xs text-zinc-600 ring-1 ring-line">
          {stage === "A" ? t("applicants.stageA") : t("applicants.stageC")}
        </p>

        {rows.map(({ application, report }) => {
          const expanded = open === application.id;
          const shared = report.status === "shared" ? report : null;
          return (
            <article key={application.id} className="overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => toggle({ application, report })}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lavender font-bold text-brand-purple">
                  {riderName(application.riderId).charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5 font-semibold text-zinc-900">
                    {riderName(application.riderId)}
                    <StatusBadge status={application.status} />
                  </span>
                  <span className="block text-xs text-zinc-500">
                    {shared?.rider.area ?? ""} · {t("applicants.submitted", { date: formatDate(application.submittedAt, lang) })}
                  </span>
                  {shared?.facts.warnings.length ? (
                    <span className="mt-1.5 flex flex-wrap gap-1">
                      {shared.facts.warnings.map((w) => (
                        <Badge key={w} tone="danger" icon={<CircleAlert className="size-3.5" aria-hidden />}>
                          {t(`warnings.${w}`)}
                        </Badge>
                      ))}
                    </span>
                  ) : null}
                </span>
                {shared?.credit ? <CreditChip credit={shared.credit} /> : null}
                <ChevronDown className={`size-5 shrink-0 text-zinc-400 transition ${expanded ? "rotate-180" : ""}`} aria-hidden />
              </button>

              {expanded ? (
                <div className="flex flex-col gap-3 border-t border-line p-4">
                  {shared ? (
                    <>
                      <Facts facts={shared.facts} />
                      {shared.credit ? <CreditBlock credit={shared.credit} /> : null}
                      <p className="text-xs text-zinc-500">
                        {t("applicants.sharedUntil", { date: formatDate(shared.grant.expiresAt, lang) })}
                      </p>
                    </>
                  ) : (
                    <p className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">{t("applicants.noConsent")}</p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => decide(application, "rejected")}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-100 py-3 text-sm font-semibold text-zinc-700 disabled:opacity-40"
                      disabled={application.status !== "pending"}
                    >
                      <X className="size-4" aria-hidden />
                      {t("applicants.reject")}
                    </button>
                    <button
                      type="button"
                      onClick={() => decide(application, "approved")}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white disabled:opacity-40"
                      disabled={application.status !== "pending"}
                    >
                      <Check className="size-4" aria-hidden />
                      {t("applicants.approve")}
                    </button>
                  </div>
                  <p className="text-center text-xs text-zinc-500">{t("applicants.decisionNote")}</p>
                </div>
              ) : null}
            </article>
          );
        })}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: Application["status"] }) {
  const t = useT();
  const tone = status === "approved" ? "lime" : status === "rejected" ? "neutral" : "lavender";
  return (
    <Badge tone={tone} icon={status === "pending" ? <Clock className="size-3" aria-hidden /> : undefined}>
      {t(`applicants.status.${status}`)}
    </Badge>
  );
}

function CreditChip({ credit }: { credit: PartnerCredit }) {
  const t = useT();
  if (credit.status === "hold") return <Badge tone="neutral">{t("credit.holds.title")}</Badge>;
  return (
    <span className="flex flex-col items-end">
      <span className="text-lg leading-none font-bold text-zinc-900">{credit.score}</span>
      <span className="text-xs text-zinc-500">{credit.grade}</span>
    </span>
  );
}

function CreditBlock({ credit }: { credit: PartnerCredit }) {
  const t = useT();
  return (
    <section className="flex flex-col gap-2 rounded-xl bg-lavender p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-brand-purple">{t("applicants.creditTitle")}</span>
        <Badge tone="lime">{t("credit.badge.pka_licensed_feature")}</Badge>
      </div>
      {credit.status === "hold" ? (
        <p className="text-sm">
          {credit.holds.map((h) => t(`credit.holds.${h}`)).join(" · ")}
        </p>
      ) : (
        <>
          <p className="text-2xl font-bold text-brand-navy">
            {credit.score} <span className="text-base font-semibold">{credit.grade} · {t(`credit.grades.${credit.grade}`)}</span>
          </p>
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
            {credit.reasons.map((r) => (
              <li key={r.code}>{t(`credit.reasons.${r.code}`)}</li>
            ))}
          </ol>
        </>
      )}
      <p className="text-[11px] leading-relaxed text-muted">{t("credit.disclaimer")}</p>
    </section>
  );
}

function Facts({ facts }: { facts: FactReport }) {
  const t = useT();
  const notShared = t("applicants.notShared");
  const none = t("applicants.none");
  const rows: [string, string, boolean?][] = [
    [
      t("applicants.facts.income"),
      facts.income
        ? t("applicants.facts.incomeValue", { net: formatRupiah(facts.income.monthlyNet), avg: formatRupiah(facts.income.avgMonthlyNet3m) })
        : notShared,
    ],
    [
      t("applicants.facts.deposit"),
      facts.income
        ? facts.income.depositMatched
          ? t("applicants.facts.depositOk", { rate: pct(facts.income.depositMatchRate ?? 0) })
          : t("applicants.facts.depositBad", { rate: pct(facts.income.depositMatchRate ?? 0) })
        : notShared,
      facts.income ? !facts.income.depositMatched : false,
    ],
    [
      t("applicants.facts.activity"),
      facts.activity
        ? t("applicants.facts.activityValue", {
            days: facts.activity.activeDays30,
            apps: facts.activity.platformCount30,
            months: facts.activity.consecutiveActiveMonths,
          })
        : notShared,
    ],
    [
      t("applicants.facts.rental"),
      facts.rental === null ? notShared : facts.rental === "none" ? none : t("applicants.facts.rateValue", { rate: pct(facts.rental.onTimeRate), n: facts.rental.paymentCount }),
    ],
    [
      t("applicants.facts.slik"),
      facts.slik === null
        ? notShared
        : facts.slik === "none"
          ? none
          : t("applicants.facts.slikValue", {
              kol: facts.slik.kolektibilitas,
              label: t(`kolektibilitas.${facts.slik.kolektibilitas}`),
              n: facts.slik.activeFacilities,
            }),
    ],
    [
      t("applicants.facts.telecom"),
      facts.telecom === null ? notShared : facts.telecom === "none" ? none : t("applicants.facts.telecomValue", { rate: pct(facts.telecom.onTimeRate), n: facts.telecom.billCount }),
    ],
  ];
  return (
    <section>
      <p className="mb-2 text-xs font-semibold text-zinc-500">{t("applicants.factsTitle")}</p>
      <dl className="flex flex-col divide-y divide-line rounded-xl bg-zinc-50 px-3 text-sm">
        {rows.map(([label, value, bad]) => (
          <div key={label} className="flex justify-between gap-3 py-2">
            <dt className="shrink-0 text-zinc-500">{label}</dt>
            <dd className={`text-right font-medium ${bad ? "text-danger" : "text-zinc-900"}`}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
