"use client";

// 내 신용 「요인별 상태」에서 요인을 누르면 여는 근거 자료 창 (2026-11-23, 상환 이력만 있던 창을 다섯 요인으로 넓힘).
// 순서: 이 요인을 무엇으로 계산하는지 한 줄 → 반영된 내용(사실) → 근거 서류(가상, 눌러서 펼침) → 이 요인을 올리려면(개선 방법).
// - 근거 서류는 기사가 올린 자료다: 정산 화면 촬영본, 입금 내역, 렌털 납부·SLIK 확인서·통신요금. 본인 자료 열람(UU PDP 7조 취지).
// - 서류는 모두 가상 예시다. 「가상 예시」 띠 + 워터마크 (CLAUDE.md 4-7). 내려받기·공유 버튼은 두지 않는다.
// - SLIK 확인서는 기사가 직접 받아 올린 파일이다. 앱이 OJK에서 조회했다고 쓰지 않는다 (2-2).
// - 신용 계산은 하지 않는다. repository의 원본 기록과 사실 계산(derive)만 쓴다. 개선 방법은 riderView가 준다.
// - 「이렇게 하면 좋아집니다」 블록을 없애고 개선 방법을 이 창 맨 아래로 옮겼다 (2-4·4-5의 개선 방법 표시는 그대로 지킨다).

import { Banknote, Bike, ChevronDown, FileText, Lightbulb, Smartphone } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { FakeDepositStatement } from "@/components/samples/FakeDepositStatement";
import { FakeIdebDocument } from "@/components/samples/FakeIdebDocument";
import { FakeRentalStatement } from "@/components/samples/FakeRentalStatement";
import { FakeSettlementScreen } from "@/components/samples/FakeSettlementScreen";
import { FakeTelecomBill } from "@/components/samples/FakeTelecomBill";
import { ButtonLink } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { ReadinessFactor, ReadinessFactorId } from "@/credit/riderView";
import { deriveSettlementVsDeposits, type RiderActivity, type RiderMetrics, type RiderRecords } from "@/data/derive";
import { getIncomeStatement, getRiderActivity, getRiderMetrics, getRiderRecords, listPartners } from "@/data/repository";
import type { IncomeStatement } from "@/data/statement";
import type { Partner, SettlementCapture } from "@/data/types";
import type { Lang } from "@/i18n/lang";
import { DEMO_TODAY } from "@/config/demo";
import { formatDate, formatRupiah, formatShortDate } from "@/lib/format";

type T = ReturnType<typeof useT>;

interface Data {
  records: RiderRecords;
  partners: Partner[];
  metrics: RiderMetrics;
  activity: RiderActivity;
  statement: IncomeStatement;
}

interface Fact {
  label: string;
  value: string;
  /** 계산에서 빠지는 줄 (첫 활동 전이 섞인 구간) */
  muted?: boolean;
  tone?: "ok" | "danger";
}

interface Doc {
  id: string;
  icon: typeof FileText;
  title: string;
  meta: string;
  result?: string;
  body: ReactNode;
}

interface Content {
  facts: Fact[];
  docs: Doc[];
  /** 서류 목록 아래에 두는 링크 (예: 수입 명세서 보기) */
  link?: { href: string; label: string };
  slikNote?: boolean;
}

interface Props {
  /** 연 요인. null이면 닫힘 */
  factor: ReadinessFactorId | null;
  /** 개선 방법. 평가 보류 화면처럼 요인 상태가 없으면 undefined → 개선 방법 칸을 그리지 않는다 */
  tip?: ReadinessFactor["tip"];
  onClose(): void;
}

export function FactorDocsSheet({ factor, tip, onClose }: Props) {
  const t = useT();
  const { riderId, lang, dataVersion } = useDemo();
  const [data, setData] = useState<Data | null>(null);
  // 펼친 서류 (기사·요인별). 다른 기사·요인이면 첫 서류를 펼친다. "" = 모두 접음
  const [expanded, setExpanded] = useState<{ key: string; id: string } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [records, partners, metrics, activity, statement] = await Promise.all([
        getRiderRecords(riderId),
        listPartners(),
        getRiderMetrics(riderId),
        getRiderActivity(riderId),
        getIncomeStatement(riderId),
      ]);
      if (alive && records && metrics && activity && statement) setData({ records, partners, metrics, activity, statement });
    })();
    return () => {
      alive = false;
    };
  }, [riderId, dataVersion]);

  const content = factor && data && data.records.rider.id === riderId ? buildContent(factor, data, t, lang) : null;
  const key = `${riderId}:${factor}`;
  const shown = expanded?.key === key ? expanded.id : (content?.docs[0]?.id ?? null);

  return (
    <Sheet open={factor !== null} onClose={onClose} title={factor ? t(`creditPage.docs.titles.${factor}`) : ""}>
      {factor && content ? (
        <div className="flex flex-col pb-2">
          <p className="text-sm text-muted">{t(`creditPage.docs.about.${factor}`)}</p>

          {content.facts.length ? (
            <section className="mt-4">
              <h3 className="text-sm font-semibold">{t("creditPage.docs.factsTitle")}</h3>
              <dl className="mt-1 divide-y divide-line border-y border-line">
                {content.facts.map((f, i) => (
                  <div key={i} className={`flex items-baseline justify-between gap-3 py-2 text-sm ${f.muted ? "text-muted" : ""}`}>
                    <dt className="min-w-0">{f.label}</dt>
                    <dd
                      className={`shrink-0 text-right font-semibold tabular-nums ${f.tone === "danger" ? "text-danger" : f.tone === "ok" ? "text-lime-ink" : ""}`}
                    >
                      {f.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <section className="mt-5">
            <h3 className="text-sm font-semibold">{t("creditPage.docs.docsTitle")}</h3>
            {content.docs.length === 0 ? (
              <p className="mt-1 text-sm text-muted">{t("creditPage.docs.empty")}</p>
            ) : (
              <ul className="mt-1 flex flex-col divide-y divide-line border-y border-line">
                {content.docs.map((d) => {
                  const isOpen = shown === d.id;
                  const Icon = d.icon;
                  return (
                    <li key={d.id}>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setExpanded({ key, id: isOpen ? "" : d.id })}
                        className="flex min-h-14 w-full items-center gap-3 py-2.5 text-left active:opacity-70"
                      >
                        <Icon className="size-5 shrink-0 text-muted" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{d.title}</span>
                          <span className="block text-xs text-muted">{d.meta}</span>
                          {d.result ? <span className="mt-0.5 block text-xs font-medium">{d.result}</span> : null}
                        </span>
                        <ChevronDown className={`size-5 shrink-0 text-muted transition ${isOpen ? "rotate-180" : ""}`} aria-hidden />
                      </button>
                      {isOpen ? <div className="pb-4">{d.body}</div> : null}
                    </li>
                  );
                })}
              </ul>
            )}
            {content.link ? (
              <ButtonLink href={content.link.href} variant="secondary" className="mt-3">
                {content.link.label}
              </ButtonLink>
            ) : null}
          </section>

          {tip !== undefined ? (
            <section className="mt-5 flex gap-3 rounded-3xl bg-lavender p-4">
              <Lightbulb className="mt-0.5 size-5 shrink-0 text-brand-purple" aria-hidden />
              <div>
                <h3 className="text-sm font-semibold text-brand-purple">{t("creditPage.docs.tipTitle")}</h3>
                <p className="mt-1 text-sm leading-snug font-medium">{tip ? t(`credit.actions.${tip}`) : t("creditPage.docs.tipMet")}</p>
              </div>
            </section>
          ) : null}

          <p className="mt-4 text-[11px] leading-relaxed text-muted">
            {t("creditPage.docs.note")}
            {content.slikNote ? ` ${t("creditPage.docs.slikNote")}` : ""}
          </p>
        </div>
      ) : null}
    </Sheet>
  );
}

// ---- 요인별 내용 ----

function buildContent(factor: ReadinessFactorId, data: Data, t: T, lang: Lang): Content {
  switch (factor) {
    case "repayment":
      return repaymentContent(data, t, lang);
    case "stability":
      return stabilityContent(data, t, lang);
    case "verifiedIncome":
      return verifiedIncomeContent(data, t, lang);
    case "incomeLevel":
      return incomeLevelContent(data, t, lang);
    case "continuity":
      return continuityContent(data, t, lang);
  }
}

/** 기준일까지의 정산 기록 (날짜 순) */
function capturesUntilToday(records: RiderRecords): SettlementCapture[] {
  return records.captures.filter((c) => c.periodDate <= DEMO_TODAY).sort((a, b) => a.periodDate.localeCompare(b.periodDate) || a.id.localeCompare(b.id));
}

/** 흐려서 읽지 못한 촬영본 (r-rizky 재촬영 전). 촬영 화면과 같은 기준 */
const UNREADABLE = 0.7;

function settlementDoc(id: string, capture: SettlementCapture, title: string, t: T, lang: Lang): Doc {
  const blurred = capture.ocrConfidence < UNREADABLE;
  return {
    id,
    icon: Smartphone,
    title,
    meta: `${t(`platforms.${capture.platform}`)} · ${formatDate(capture.periodDate, lang)}`,
    result: blurred
      ? t("creditPage.docs.settlementBlurry")
      : t("creditPage.docs.settlementResult", { net: formatRupiah(capture.ocr.netAmount), n: capture.ocr.tripCount }),
    body: <FakeSettlementScreen capture={capture} watermark blurred={blurred} />,
  };
}

function repaymentContent({ records, partners }: Data, t: T, lang: Lang): Content {
  const docs: Doc[] = [];
  const facts: Fact[] = [];

  // 렌털 납부: 렌털사마다 한 장
  for (const partnerId of [...new Set(records.rentalPayments.map((p) => p.partnerId))]) {
    const payments = records.rentalPayments.filter((p) => p.partnerId === partnerId);
    const partner = partners.find((p) => p.id === partnerId);
    const name = partner ? (lang === "ko" ? partner.nameKo : partner.nameId) : partnerId;
    const onTime = payments.filter((p) => p.paidDate !== null && p.paidDate <= p.dueDate).length;
    facts.push({ label: t("creditPage.docs.rental"), value: t("statement.rentalValue", { total: payments.length, onTime }), tone: onTime === payments.length ? "ok" : undefined });
    docs.push({
      id: `rental-${partnerId}`,
      icon: Bike,
      title: t("creditPage.docs.rental"),
      meta: t("creditPage.docs.rentalMeta", { partner: name, n: payments.length }),
      body: <FakeRentalStatement payments={payments} partnerName={name} />,
    });
  }

  // SLIK 확인서: 가장 최근 한 장 (4-4)
  const slik = [...records.slikReports].sort((a, b) => b.reportDate.localeCompare(a.reportDate))[0];
  if (slik) {
    facts.push({
      label: t("creditPage.docs.slik"),
      value: t("creditPage.docs.slikValue", { kol: slik.worstKolektibilitas, label: t(`kolektibilitas.${slik.worstKolektibilitas}`) }),
      tone: slik.worstKolektibilitas === 1 ? "ok" : "danger",
    });
    docs.push({
      id: `slik-${slik.id}`,
      icon: FileText,
      title: t("creditPage.docs.slik"),
      meta: t("creditPage.docs.slikMeta", { issued: formatDate(slik.reportDate, lang), uploaded: formatDate(slik.uploadedAt, lang) }),
      body: <FakeIdebDocument report={slik} rider={records.rider} />,
    });
  }

  // 통신요금 납부 내역
  const bills = [...records.telecomBills].sort((a, b) => a.month.localeCompare(b.month));
  if (bills.length) {
    const onTime = bills.filter((b) => b.paidDate !== null && b.paidDate <= b.dueDate).length;
    facts.push({
      label: t("creditPage.docs.telecom"),
      value: t("capture.telecomResult", { n: bills.length, onTime }),
      tone: onTime === bills.length ? "ok" : undefined,
    });
    docs.push({
      id: "telecom",
      icon: Smartphone,
      title: t("creditPage.docs.telecom"),
      meta: t("creditPage.docs.telecomMeta", { provider: t("samples.telecomProvider"), from: bills[0].month, to: bills[bills.length - 1].month }),
      body: <FakeTelecomBill bills={bills} />,
    });
  }
  return { facts, docs, slikNote: Boolean(slik) };
}

function stabilityContent({ records, activity }: Data, t: T, lang: Lang): Content {
  // 홈 「30일 단위 순수입」과 같은 6구간. 첫 활동 전이 섞인 구간은 계산에서 빠진다 (fullMonthSeries와 같은 기준)
  const facts: Fact[] = activity.months.map((b) => ({
    label: b.partial
      ? t("creditPage.docs.periodPartial", { from: formatShortDate(b.start, lang), to: formatShortDate(b.end, lang) })
      : t("creditPage.docs.period", { from: formatShortDate(b.start, lang), to: formatShortDate(b.end, lang) }),
    value: formatRupiah(b.net),
    muted: b.partial,
  }));
  const captures = capturesUntilToday(records);
  const latest = captures.at(-1);
  const docs = latest ? [settlementDoc(`settle-${latest.id}`, latest, t("creditPage.docs.latestCapture"), t, lang)] : [];
  return { facts, docs };
}

function verifiedIncomeContent({ records, metrics }: Data, t: T, lang: Lang): Content {
  const block = deriveSettlementVsDeposits(records).at(-1);
  const rate = metrics.depositMatchRate;
  const facts: Fact[] = block
    ? [
        { label: t("creditPage.docs.settled"), value: formatRupiah(block.settled) },
        { label: t("creditPage.docs.deposited"), value: formatRupiah(block.deposited) },
        {
          label: t("creditPage.docs.matchRate"),
          value: rate === null ? "—" : `${Math.round(rate * 100)}%`,
          tone: rate !== null && rate >= 0.85 ? "ok" : "danger",
        },
      ]
    : [];
  const docs: Doc[] = [];
  const deposits = records.deposits.filter((d) => d.date <= DEMO_TODAY);
  if (deposits.length) {
    docs.push({
      id: "deposits",
      icon: Banknote,
      title: t("creditPage.docs.deposit"),
      meta: t("creditPage.docs.depositMeta", { source: t(`samples.depositSource.${deposits[0].source}`), n: deposits.length }),
      body: <FakeDepositStatement deposits={deposits} />,
    });
  }
  const latest = capturesUntilToday(records).at(-1);
  if (latest) docs.push(settlementDoc(`settle-${latest.id}`, latest, t("creditPage.docs.latestCapture"), t, lang));
  return { facts, docs };
}

function incomeLevelContent({ records, metrics, statement }: Data, t: T, lang: Lang): Content {
  const facts: Fact[] = [
    { label: t("creditPage.docs.avg3m"), value: formatRupiah(metrics.avgMonthlyNet3m) },
    { label: t("home.monthlyNet"), value: formatRupiah(metrics.monthlyNet) },
    ...statement.lines.map((l) => ({ label: t("creditPage.docs.appNet", { app: t(`platforms.${l.platform}`) }), value: formatRupiah(l.net) })),
  ];
  // 앱마다 가장 최근 정산 화면 한 장
  const captures = capturesUntilToday(records);
  const docs = statement.lines
    .map((l) => captures.filter((c) => c.platform === l.platform).at(-1))
    .filter((c): c is SettlementCapture => Boolean(c))
    .map((c) => settlementDoc(`settle-${c.id}`, c, t("creditPage.docs.appCapture", { app: t(`platforms.${c.platform}`) }), t, lang));
  return { facts, docs, link: { href: "/certificate", label: t("home.viewStatement") } };
}

function continuityContent({ records, metrics }: Data, t: T, lang: Lang): Content {
  const captures = capturesUntilToday(records);
  const first = captures[0];
  const latest = captures.at(-1);
  // 달력 달마다 정산 기록이 있는 날 수 (첫 기록 달 → 이번 달)
  const days = [...new Set(captures.map((c) => c.periodDate))];
  const months = [...new Set(days.map((d) => d.slice(0, 7)))].sort();
  const facts: Fact[] = [
    ...(first ? [{ label: t("creditPage.docs.firstRecord"), value: formatDate(first.periodDate, lang) }] : []),
    { label: t("creditPage.docs.streak"), value: t("creditPage.docs.streakValue", { m: metrics.consecutiveActiveMonths }) },
    ...months.map((m) => ({
      label: m, // 다른 가상 서류(렌털·통신요금)와 같은 "2026-11" 표기. 해를 넘어도 헷갈리지 않는다
      value: t("creditPage.docs.monthDays", { n: days.filter((d) => d.startsWith(m)).length }),
    })),
  ];
  const docs: Doc[] = [];
  if (first) docs.push(settlementDoc(`first-${first.id}`, first, t("creditPage.docs.firstCapture"), t, lang));
  if (latest && latest.id !== first?.id) docs.push(settlementDoc(`latest-${latest.id}`, latest, t("creditPage.docs.latestCapture"), t, lang));
  return { facts, docs };
}
