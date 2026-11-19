"use client";

// 렌털사 확인 화면의 공통 조각: 신청 상태 배지, 신용도(C단계), 사실 리포트 표.
// 휴대폰 목록과 데스크톱 업무 화면(표 + 상세 패널)이 같이 쓴다.
// 신용도는 C단계에서만 오고, 옆에 「PKA 인가 후 제공 기능」 배지와 "시연용 가설 모델" 표기를 붙인다 (CLAUDE.md 2-4, 4-5).

import { Clock } from "lucide-react";
import { useT } from "@/components/demo/DemoProvider";
import { Badge } from "@/components/ui/Badge";
import type { FactReport, PartnerCredit } from "@/credit/partnerView";
import type { Application } from "@/data/types";
import { formatRupiah } from "@/lib/format";

export const pct = (x: number) => `${Math.round(x * 100)}%`;

export function StatusBadge({ status }: { status: Application["status"] }) {
  const t = useT();
  const tone = status === "approved" ? "lime" : status === "rejected" ? "neutral" : "lavender";
  return (
    <Badge tone={tone} icon={status === "pending" ? <Clock className="size-3" aria-hidden /> : undefined}>
      {t(`applicants.status.${status}`)}
    </Badge>
  );
}

export function CreditChip({ credit }: { credit: PartnerCredit }) {
  const t = useT();
  if (credit.status === "hold") return <Badge tone="neutral">{t("credit.holds.title")}</Badge>;
  return (
    <span className="flex flex-col items-end">
      <span className="text-lg leading-none font-bold text-zinc-900">{credit.score}</span>
      <span className="text-xs text-zinc-500">{credit.grade}</span>
    </span>
  );
}

export function CreditBlock({ credit }: { credit: PartnerCredit }) {
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

export function Facts({ facts }: { facts: FactReport }) {
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
