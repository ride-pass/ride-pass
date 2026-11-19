"use client";

// 기사 앱 홈 (Figma "RidePass 홈", CLAUDE.md 6절 표대로 바꿈). 기사가 매일 열어 보는 화면이다.
// 위에서부터: 수입 명세서 카드 → (평가 보류 / C단계 이유) → 다음 할 일 → 「일한 흔적」 활동 지도 → 30일 단위 순수입 → 최근 활동.
// 원형 게이지 자리는 getRiderCreditView()가 정한다. A: 신용 준비도 5개 중 ○개, C: 신용도 + 「PKA 인가 후 제공 기능」 배지.
// "안전 운행 점수", 「맞춤 제휴 혜택」 상품 카드, "소액 대출"·"보험 할인"·"오토바이 할부" 타일은 넣지 않는다.
// 바로 가기 타일은 하단 탭·각 카드의 링크와 겹쳐서 뺐다.

import { ChevronRight, Lightbulb, TriangleAlert } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { LangToggle } from "@/components/demo/LangToggle";
import { ActivityMap } from "@/components/home/ActivityMap";
import { MonthBars } from "@/components/home/MonthBars";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import { TabBar } from "@/components/ui/TabBar";
import { APP_NAME, LOGO_HEIGHT, LOGO_PATH, LOGO_WIDTH } from "@/config/brand";
import { getRiderCreditView, type RiderCreditHold, type RiderCreditView } from "@/credit/riderView";
import type { RiderActivity, RiderMetrics } from "@/data/derive";
import {
  getIncomeStatement,
  getRider,
  getRiderActivity,
  getRiderMetrics,
  getRiderRecords,
  listApplications,
  listPartners,
  listShareGrants,
} from "@/data/repository";
import type { IncomeStatement } from "@/data/statement";
import type { Application, Partner, Rider, SettlementCapture, ShareGrant } from "@/data/types";
import { formatDate, formatRupiah } from "@/lib/format";

type ActionCode = RiderCreditHold["actions"][number];

/** 개선 방법마다 기사가 바로 할 수 있는 화면. 없으면 문구만 보여 준다 */
const ACTION_HREF: Partial<Record<ActionCode, string>> = {
  RETAKE_CLEAR_PHOTO: "/capture",
  ADD_REPAYMENT_RECORDS: "/capture",
  ADD_ALL_APP_SETTLEMENTS: "/capture",
  KEEP_UPLOADING: "/capture",
};

const FEED_LIMIT = 4;

interface Feed {
  captures: SettlementCapture[];
  applications: Application[];
  grants: ShareGrant[];
  partners: Partner[];
}

export default function HomePage() {
  const t = useT();
  const { riderId, stage, dataVersion } = useDemo();
  const [rider, setRider] = useState<Rider | null>(null);
  const [metrics, setMetrics] = useState<RiderMetrics | null>(null);
  const [activity, setActivity] = useState<RiderActivity | null>(null);
  const [statement, setStatement] = useState<IncomeStatement | null>(null);
  const [credit, setCredit] = useState<RiderCreditView | null>(null);
  const [feed, setFeed] = useState<Feed | null>(null);

  useEffect(() => {
    getRider(riderId).then(setRider);
    getRiderMetrics(riderId).then(setMetrics);
    getRiderActivity(riderId).then(setActivity);
    getIncomeStatement(riderId).then(setStatement);
    getRiderCreditView(riderId, stage).then(setCredit);
    (async () => {
      const [records, partners, grants] = await Promise.all([getRiderRecords(riderId), listPartners(), listShareGrants(riderId)]);
      const apps = (await Promise.all(partners.map((p) => listApplications(p.id)))).flat().filter((a) => a.riderId === riderId);
      setFeed({ captures: records?.captures ?? [], applications: apps, grants, partners });
    })();
    // dataVersion: 조작판 초기화·재촬영·신청 상태 변경 뒤 다시 읽는다
  }, [riderId, stage, dataVersion]);

  if (!rider || !metrics || !activity || !statement || !credit || !feed) return <ScreenSkeleton />;
  const matched = metrics.depositMatchRate !== null && metrics.depositMatchRate >= 0.85;
  const nextAction: ActionCode | null = credit.status === "hold" ? null : credit.improvement;

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-4 pt-4">
        <Image src={LOGO_PATH} alt={APP_NAME} width={LOGO_WIDTH} height={LOGO_HEIGHT} priority className="h-auto w-28" />
        <LangToggle />
      </header>
      <main className="flex flex-col gap-4 px-4 pt-4 pb-6">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-full bg-lavender text-lg font-bold text-brand-purple">
            {rider.displayName.charAt(0)}
          </span>
          <div>
            <p className="text-lg font-bold">{t("home.hello", { name: rider.displayName.split(" ")[0] })}</p>
            <p className="text-sm text-muted">
              {rider.area} · {rider.platforms.map((p) => t(`platforms.${p}`)).join(", ")}
            </p>
          </div>
        </div>

        <Card tone="purple" className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-white/70">{t("home.monthlyNet")}</p>
              <p className="mt-1 text-[26px] leading-tight font-bold whitespace-nowrap tabular-nums">{formatRupiah(metrics.monthlyNet)}</p>
              <p className={`mt-1 flex items-center gap-1 text-xs ${matched ? "text-brand-lime" : "text-white"}`}>
                {matched ? null : <TriangleAlert className="size-3.5" aria-hidden />}
                {matched ? t("home.depositMatched") : t("home.depositMismatch")}
              </p>
            </div>
            <CreditBadge view={credit} />
          </div>
          {/* 인니어처럼 버튼 글자가 길면 발급번호 아래로 내려간다 (발급번호는 자르지 않는다) */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-[11px] whitespace-nowrap">{statement.issueNo}</span>
            <Link href="/certificate" className="shrink-0 rounded-2xl bg-brand-lime px-4 py-2.5 text-center text-sm font-bold text-lime-ink transition active:scale-[0.98]">
              {t("home.viewStatement")}
            </Link>
          </div>
        </Card>

        {credit.status === "hold" ? (
          <Card className="flex flex-col gap-2 ring-2 ring-danger">
            <p className="font-semibold">{t("credit.holds.title")}</p>
            <p className="text-sm text-muted">{credit.holds.map((h) => t(`credit.holds.${h}`)).join(" · ")}</p>
            <ButtonLink href="/capture">{t("creditPage.goRetake")}</ButtonLink>
          </Card>
        ) : null}

        {credit.status === "scored" ? (
          <Card className="flex flex-col gap-2">
            <p className="text-sm font-semibold">{t("creditPage.reasonsTitle")}</p>
            <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
              {credit.reasons.map((r) => (
                <li key={r.code}>{t(`credit.reasons.${r.code}`)}</li>
              ))}
            </ol>
            <p className="text-[11px] text-muted">{t("credit.disclaimer")}</p>
          </Card>
        ) : null}

        {nextAction ? <NextAction code={nextAction} /> : null}

        <Card className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-bold">{t("home.trail.title")}</h2>
            {metrics.consecutiveActiveMonths > 0 ? (
              <span className="text-xs font-semibold text-brand-purple">{t("home.trail.streak", { m: metrics.consecutiveActiveMonths })}</span>
            ) : null}
          </div>
          <p className="-mt-2 text-sm text-muted">{t("home.trail.summary", { n: activity.activeDays })}</p>
          <ActivityMap daily={activity.daily} />
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex flex-col">
            <h2 className="font-bold">{t("home.months.title")}</h2>
            <p className="text-sm text-muted tabular-nums">{t("home.months.avg", { amount: formatRupiah(metrics.avgMonthlyNet3m) })}</p>
          </div>
          <MonthBars months={activity.months} />
        </Card>

        <FeedCard feed={feed} />
      </main>
      <TabBar />
    </div>
  );
}

function NextAction({ code }: { code: ActionCode }) {
  const t = useT();
  const href = ACTION_HREF[code];
  const body = (
    <>
      <Lightbulb className="mt-0.5 size-5 shrink-0 text-brand-purple" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-brand-purple">{t("home.next.title")}</span>
        <span className="block text-sm">{t(`credit.actions.${code}`)}</span>
      </span>
      {href ? <ChevronRight className="mt-2 size-5 shrink-0 text-muted" aria-hidden /> : null}
    </>
  );
  const cls = "flex items-start gap-3 rounded-3xl bg-lavender p-4";
  return href ? (
    <Link href={href} className={`${cls} transition active:scale-[0.99] active:bg-lavender-strong`}>
      {body}
    </Link>
  ) : (
    <section className={cls}>{body}</section>
  );
}

interface FeedItem {
  key: string;
  date: string;
  /** 같은 날이면 신청 → 공유 → 정산 순 */
  rank: number;
  title: string;
  right?: React.ReactNode;
}

function FeedCard({ feed }: { feed: Feed }) {
  const t = useT();
  const { lang } = useDemo();
  const name = (id: string) => {
    const p = feed.partners.find((x) => x.id === id);
    return p ? (lang === "ko" ? p.nameKo : p.nameId) : id;
  };

  const items: FeedItem[] = [
    ...feed.applications.map((a) => ({
      key: a.id,
      date: a.submittedAt,
      rank: 0,
      title: t("home.feed.application", { partner: name(a.partnerId) }),
      right: <Badge tone={a.status === "approved" ? "lime" : a.status === "rejected" ? "danger" : "neutral"}>{t(`applicants.status.${a.status}`)}</Badge>,
    })),
    ...feed.grants.flatMap((g) => [
      { key: g.id, date: g.grantedAt, rank: 1, title: t("home.feed.grant", { partner: name(g.partnerId) }) },
      ...(g.revokedAt ? [{ key: `${g.id}-revoked`, date: g.revokedAt, rank: 1, title: t("home.feed.revoked", { partner: name(g.partnerId) }) }] : []),
    ]),
    // 정산은 날짜별로 묶어 최근 이틀만 넣는다 (매일 기록이 있어 신청·공유 소식이 밀려나지 않게)
    ...[...new Set(feed.captures.map((c) => c.periodDate))].sort().slice(-2).map((date) => {
      const day = feed.captures.filter((c) => c.periodDate === date);
      return {
        key: `capture-${date}`,
        date,
        rank: 2,
        title: t("home.feed.capture", { app: [...new Set(day.map((c) => t(`platforms.${c.platform}`)))].join(" · ") }),
        right: <span className="text-sm font-semibold tabular-nums">{formatRupiah(day.reduce((a, c) => a + c.ocr.netAmount, 0))}</span>,
      };
    }),
  ]
    .sort((a, b) => b.date.localeCompare(a.date) || a.rank - b.rank || a.key.localeCompare(b.key))
    .slice(0, FEED_LIMIT);

  return (
    <Card className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold">{t("home.feed.title")}</h2>
        <Link href="/history" className="text-xs font-semibold text-brand-purple">
          {t("home.feed.viewAll")}
        </Link>
      </div>
      {items.length === 0 ? <p className="py-2 text-sm text-muted">{t("home.feed.empty")}</p> : null}
      <ul className="flex flex-col divide-y divide-line">
        {items.map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-3 py-3">
            <span className="min-w-0">
              <span className="line-clamp-2 block text-sm font-medium">{item.title}</span>
              <span className="block text-xs text-muted">{formatDate(item.date, lang)}</span>
            </span>
            <span className="shrink-0 whitespace-nowrap">{item.right}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Figma 홈의 원형 게이지 자리. 단계별 표시는 riderView가 정한다 */
function CreditBadge({ view }: { view: RiderCreditView }) {
  const t = useT();
  const r = 30;
  const c = 2 * Math.PI * r;
  const ratio =
    view.status === "readiness" ? view.metCount / view.totalCount : view.status === "scored" ? (view.score - 400) / 500 : 0;
  return (
    <Link href="/credit" className="flex w-24 shrink-0 flex-col items-center gap-1 text-center" aria-label={t("tabs.credit")}>
      <span className="relative size-20">
        <svg viewBox="0 0 72 72" className="size-full -rotate-90" aria-hidden>
          <circle cx="36" cy="36" r={r} fill="none" strokeWidth="7" className="stroke-white/20" />
          <circle cx="36" cy="36" r={r} fill="none" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${c * ratio} ${c}`} className="stroke-brand-lime" />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-center leading-tight font-bold">
          {view.status === "readiness" ? (
            <span className="text-lg">
              {view.metCount}/{view.totalCount}
            </span>
          ) : view.status === "scored" ? (
            <span className="text-xl">{view.score}</span>
          ) : (
            <span className="text-[11px]">{t("credit.holds.title")}</span>
          )}
        </span>
      </span>
      <span className="text-[11px] text-white/80">
        {view.status === "readiness" ? t("credit.readiness.title") : view.status === "scored" ? `${view.grade} · ${t(`credit.grades.${view.grade}`)}` : ""}
      </span>
      {/* 신용도 옆 「PKA 인가 후 제공 기능」 배지 (CLAUDE.md 2-4). 게이지 칸 폭 안에서 두 줄로 접힌다 */}
      {view.status === "scored" ? (
        <span className="rounded-lg bg-brand-lime px-2 py-0.5 text-[11px] leading-tight font-semibold text-lime-ink">
          {t("credit.badge.pka_licensed_feature")}
        </span>
      ) : null}
    </Link>
  );
}
