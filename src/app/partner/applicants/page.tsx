"use client";

// 시연 7단계: 렌털사 확인 화면 (CLAUDE.md 3절, 2-4). 렌털사 직원이 업무용 노트북에서 쓰는 화면이다.
// A단계: 신청자별 사실 리포트와 위변조 경고만. 점수·등급은 보여 주지 않는다.
// C단계: 여기에 신용도 400~900·등급·이유 3개 + 「PKA 인가 후 제공 기능」 배지 + "시연용 가설 모델" 표기 (상세 패널).
// 기사가 이 렌털사에 동의한 항목만 보인다. 승인 버튼은 렌털사가 누른다.
//
// 화면 폭별 구성
// - 900px 미만: 신청자 카드 목록, 누르면 카드가 펼쳐진다 (휴대폰·좁은 창)
// - 900px 이상(console): 신청자 표, 행을 누르면 오른쪽에서 상세 패널이 열린다 (분할 보기의 오른쪽 화면도 여기)
// - 1280px 이상(xl): 왼쪽에 렌털사 사이드바가 붙는다

import { Bike, ChevronDown, CircleAlert, FileSignature, Settings, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ENTRY_PARTNER_ID, useDemo, useT } from "@/components/demo/DemoProvider";
import { LangToggle } from "@/components/demo/LangToggle";
import { ApplicantDrawer } from "@/components/partner/ApplicantDrawer";
import { CreditBlock, CreditChip, Facts, StatusBadge, pct } from "@/components/partner/ApplicantParts";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { listApplicantReports, type ApplicantRow } from "@/credit/partnerView";
import { getPartner, listRiders, recordApplicationView, setApplicationStatus } from "@/data/repository";
import type { Application, Partner, Rider } from "@/data/types";
import { formatDate, formatRupiah } from "@/lib/format";

type Filter = "all" | "pending" | "warning" | "decided";
const FILTERS: Filter[] = ["all", "pending", "warning", "decided"];

const hasWarning = (r: ApplicantRow) => r.report.status === "shared" && r.report.facts.warnings.length > 0;

const MATCHES: Record<Filter, (r: ApplicantRow) => boolean> = {
  all: () => true,
  pending: (r) => r.application.status === "pending",
  warning: hasWarning,
  decided: (r) => r.application.status !== "pending",
};

export default function ApplicantsPage() {
  const t = useT();
  const { stage, lang, dataVersion } = useDemo();
  const toast = useToast();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [rows, setRows] = useState<ApplicantRow[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  // dataVersion: 조작판이 신청을 넣거나 초기화하면, 분할 보기에서 기사가 신청하면 다시 읽는다
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

  const riderName = (id: string) => riders.find((r) => r.id === id)?.displayName ?? id;

  const decide = async (app: Application, status: Application["status"]) => {
    await setApplicationStatus(app.id, status);
    await load();
    toast(t(status === "approved" ? "applicants.approvedToast" : "applicants.rejectedToast", { name: riderName(app.riderId) }), "success");
  };

  /** 신청서를 연다(닫는다). 기사가 공유한 자료가 보이면 열람 기록을 남긴다 (기사 앱 제출 이력·알림에 보인다) */
  const toggle = (row: ApplicantRow) => {
    const id = row.application.id;
    if (open === id) return setOpen(null);
    setOpen(id);
    if (row.report.status === "shared") recordApplicationView(id);
  };
  const close = useCallback(() => setOpen(null), []);

  const pending = rows.filter(MATCHES.pending).length;
  const warned = rows.filter(hasWarning);
  const visible = rows.filter(MATCHES[filter]);
  const openRow = rows.find((r) => r.application.id === open) ?? null;
  const partnerName = partner ? (lang === "ko" ? partner.nameKo : partner.nameId) : "";

  return (
    <div className="flex min-h-dvh flex-1">
      <Sidebar partnerName={partnerName} pending={pending} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* 1280px 미만: 사이드바 대신 위쪽 머리 */}
        <div className="bg-zinc-800 px-4 py-2 text-center text-xs font-medium text-zinc-200 xl:hidden">{t("applicants.demoLabel")}</div>
        <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 console:px-8 xl:hidden">
          <span className="flex items-center gap-2 font-bold text-zinc-800">
            <Bike className="size-5" aria-hidden />
            {partnerName}
          </span>
          <LangToggle />
        </header>

        <main className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-5 console:max-w-none console:gap-4 console:px-8 console:py-7">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{t("applicants.title")}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {t("applicants.summaryPending", { n: rows.length, p: pending, w: warned.length })}
              {warned.length ? (
                <span className="font-semibold text-danger">
                  {" · "}
                  {t("applicants.findingWarn", { names: warned.map((r) => riderName(r.application.riderId)).join(", ") })}
                </span>
              ) : null}
            </p>
          </div>
          <p className="rounded-xl bg-surface px-3 py-2 text-xs text-zinc-600 ring-1 ring-line">
            {stage === "A" ? t("applicants.stageA") : t("applicants.stageC")}
          </p>

          <div className="flex gap-1.5 overflow-x-auto" role="group" aria-label={t("applicants.filterLabel")}>
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${filter === f ? "bg-zinc-900 text-white" : "bg-surface text-zinc-600 ring-1 ring-line hover:bg-zinc-100"}`}
              >
                {t(`applicants.filters.${f}`)} <span className="tabular-nums opacity-70">{rows.filter(MATCHES[f]).length}</span>
              </button>
            ))}
          </div>

          {visible.length === 0 ? <p className="rounded-xl bg-surface p-4 text-sm text-zinc-500 ring-1 ring-line">{t("applicants.empty")}</p> : null}

          <CardList rows={visible} open={open} onToggle={toggle} onDecide={decide} riderName={riderName} />
          <ApplicantTable rows={visible} open={open} onOpen={toggle} riderName={riderName} />
        </main>
      </div>

      {openRow ? <ApplicantDrawer row={openRow} name={riderName(openRow.application.riderId)} onClose={close} onDecide={decide} /> : null}
    </div>
  );
}

/** 1280px 이상에서만 보이는 렌털사 사이드바. 동작하지 않는 메뉴는 "준비 중"으로 둔다 (CLAUDE.md 3절) */
function Sidebar({ partnerName, pending }: { partnerName: string; pending: number }) {
  const t = useT();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-line bg-zinc-100/60 px-3 py-5 xl:flex">
      <div className="flex items-center gap-2.5 px-2">
        <span className="grid size-9 place-items-center rounded-xl bg-zinc-900 text-white">
          <Bike className="size-5" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-zinc-900">{partnerName}</span>
          <span className="block text-[11px] text-zinc-500">{t("applicants.demoLabel")}</span>
        </span>
      </div>
      <nav className="flex flex-col gap-0.5 text-sm" aria-label={t("applicants.navLabel")}>
        <span aria-current="page" className="flex items-center gap-2.5 rounded-lg bg-zinc-200/80 px-2.5 py-2 font-semibold text-zinc-900">
          <Users className="size-4" aria-hidden />
          <span className="flex-1">{t("applicants.nav.applicants")}</span>
          {pending ? <span className="text-xs text-zinc-500 tabular-nums">{t("applicants.nav.pendingCount", { n: pending })}</span> : null}
        </span>
        {(
          [
            ["contracts", FileSignature],
            ["settings", Settings],
          ] as const
        ).map(([key, Icon]) => (
          <span key={key} aria-disabled="true" className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-zinc-400">
            <Icon className="size-4" aria-hidden />
            <span className="flex-1">{t(`applicants.nav.${key}`)}</span>
            <span className="text-[11px]">{t("common.comingSoon")}</span>
          </span>
        ))}
      </nav>
      <div className="mt-auto px-2">
        <LangToggle />
      </div>
    </aside>
  );
}

interface ListProps {
  rows: ApplicantRow[];
  open: string | null;
  riderName(id: string): string;
}

/** 900px 이상: 신청자 표. 숫자는 오른쪽 정렬, 행을 누르면 상세 패널 */
function ApplicantTable({ rows, open, onOpen, riderName }: ListProps & { onOpen(row: ApplicantRow): void }) {
  const t = useT();
  const { lang } = useDemo();
  if (rows.length === 0) return null;
  const dash = <span className="text-zinc-400">—</span>;
  return (
    <div className="hidden overflow-hidden rounded-xl bg-surface ring-1 ring-line console:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-zinc-500">
            <th className="px-4 py-2.5 font-medium">{t("applicants.cols.applicant")}</th>
            <th className="px-3 py-2.5 font-medium">{t("applicants.cols.submitted")}</th>
            <th className="px-3 py-2.5 text-right font-medium">{t("applicants.facts.income")}</th>
            <th className="px-3 py-2.5 text-right font-medium">{t("applicants.facts.deposit")}</th>
            <th className="px-3 py-2.5 text-right font-medium">{t("applicants.cols.activeDays")}</th>
            <th className="px-3 py-2.5 font-medium">{t("applicants.cols.warnings")}</th>
            <th className="px-4 py-2.5 font-medium">{t("applicants.cols.status")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => {
            const { application, report } = row;
            const shared = report.status === "shared" ? report : null;
            const income = shared?.facts.income ?? null;
            const name = riderName(application.riderId);
            return (
              <tr
                key={application.id}
                onClick={() => onOpen(row)}
                className={`cursor-pointer transition hover:bg-zinc-50 ${open === application.id ? "bg-lavender/50" : ""}`}
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(row);
                    }}
                    className="flex items-center gap-3 text-left"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-lavender text-sm font-bold text-brand-purple">{name.charAt(0)}</span>
                    <span>
                      <span className="block font-semibold whitespace-nowrap text-zinc-900">{name}</span>
                      <span className="block text-xs whitespace-nowrap text-zinc-500">{shared?.rider.area ?? t("applicants.notShared")}</span>
                    </span>
                  </button>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-zinc-600">{formatDate(application.submittedAt, lang)}</td>
                <td className="px-3 py-3 text-right font-medium whitespace-nowrap text-zinc-900 tabular-nums">{income ? formatRupiah(income.monthlyNet) : dash}</td>
                <td className={`px-3 py-3 text-right whitespace-nowrap tabular-nums ${income && !income.depositMatched ? "font-semibold text-danger" : "text-zinc-700"}`}>
                  {income ? pct(income.depositMatchRate ?? 0) : dash}
                </td>
                <td className="px-3 py-3 text-right whitespace-nowrap text-zinc-700 tabular-nums">
                  {shared?.facts.activity ? t("applicants.cols.activeDaysValue", { n: shared.facts.activity.activeDays30 }) : dash}
                </td>
                <td className="px-3 py-3">
                  {shared?.facts.warnings.length ? (
                    <span className="flex flex-wrap gap-1">
                      {shared.facts.warnings.map((w) => (
                        <Badge key={w} tone="danger" icon={<CircleAlert className="size-3.5" aria-hidden />}>
                          {t(`warnings.${w}`)}
                        </Badge>
                      ))}
                    </span>
                  ) : (
                    dash
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={application.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** 900px 미만: 신청자 카드 목록. 누르면 그 자리에서 펼쳐진다 */
function CardList({
  rows,
  open,
  onToggle,
  onDecide,
  riderName,
}: ListProps & { onToggle(row: ApplicantRow): void; onDecide(app: Application, status: Application["status"]): void }) {
  const t = useT();
  const { lang } = useDemo();
  return (
    <div className="flex flex-col gap-3 console:hidden">
      {rows.map((row) => {
        const { application, report } = row;
        const expanded = open === application.id;
        const shared = report.status === "shared" ? report : null;
        return (
          <article key={application.id} className="overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
            <button type="button" aria-expanded={expanded} onClick={() => onToggle(row)} className="flex w-full items-center gap-3 p-4 text-left">
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
                    <p className="text-xs text-zinc-500">{t("applicants.sharedUntil", { date: formatDate(shared.grant.expiresAt, lang) })}</p>
                  </>
                ) : (
                  <p className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">{t("applicants.noConsent")}</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onDecide(application, "rejected")}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-100 py-3 text-sm font-semibold text-zinc-700 disabled:opacity-40"
                    disabled={application.status !== "pending"}
                  >
                    {t("applicants.reject")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDecide(application, "approved")}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white disabled:opacity-40"
                    disabled={application.status !== "pending"}
                  >
                    {t("applicants.approve")}
                  </button>
                </div>
                <p className="text-center text-xs text-zinc-500">{t("applicants.decisionNote")}</p>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
