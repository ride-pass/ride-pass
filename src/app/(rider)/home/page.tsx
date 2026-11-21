"use client";

// 기사 앱 홈. 기사가 매일 열어 보는 화면이다. 2026-11-21 새 디자인 기준(CLAUDE.md 6절)으로 다시 짰다.
// 위에서부터 크림 바탕 위에 바로: 순수입(40px 숫자 + 명세서 버튼) → 신용도 카드(이 화면의 유일한 흰 카드) →
// 일한 흔적(180일 근무 달력, 늘 펼침) → 30일 단위 순수입 → 최근 활동.
// 390×844 첫 화면 아래쪽에 「일한 흔적」 제목과 달력 윗부분이 보이도록 위쪽 여백을 조인다.
// 신용도 자리는 getRiderCreditView()가 정한다. A: 신용 준비도 5개 중 ○개, C: 신용도 + 「PKA 인가 후 제공 기능」 배지
// + 가장 큰 이유 한 줄(누르면 「평가 기준 보기」 창) + 시연용 가설 모델 표기 (2-4, 8절).
// "안전 운행 점수", 「맞춤 제휴 혜택」 상품 카드, "소액 대출"·"보험 할인"·"오토바이 할부" 타일은 넣지 않는다.
// 바로 가기 타일은 하단 탭·각 카드의 링크와 겹쳐서 뺐다.

import { Bell, ChevronRight, CircleCheck, Info, TriangleAlert } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { LangToggle } from "@/components/demo/LangToggle";
import { ActivityMap } from "@/components/home/ActivityMap";
import { MonthBars } from "@/components/home/MonthBars";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import { TabBar } from "@/components/ui/TabBar";
import { APP_NAME, LOGO_HEIGHT, LOGO_PATH, LOGO_WIDTH } from "@/config/brand";
import { CriteriaSheet, ReasonText } from "@/components/credit/CreditCriteria";
import { PkaBadge } from "@/components/credit/PkaBadge";
import { getRiderCreditView, type RiderCreditView } from "@/credit/riderView";
import type { RiderActivity, RiderMetrics } from "@/data/derive";
import {
  getIncomeStatement,
  getRider,
  getRiderActivity,
  getRiderMetrics,
  getRiderRecords,
  listApplications,
  listNotices,
  listPartners,
  listShareGrants,
} from "@/data/repository";
import type { IncomeStatement } from "@/data/statement";
import type { Application, Partner, Rider, SettlementCapture, ShareGrant } from "@/data/types";
import { formatDate, formatRupiah } from "@/lib/format";

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
  const [unread, setUnread] = useState(0);
  const [criteriaOpen, setCriteriaOpen] = useState(false);

  useEffect(() => {
    getRider(riderId).then(setRider);
    getRiderMetrics(riderId).then(setMetrics);
    getRiderActivity(riderId).then(setActivity);
    getIncomeStatement(riderId).then(setStatement);
    getRiderCreditView(riderId, stage).then(setCredit);
    listNotices(riderId).then((ns) => setUnread(ns.filter((n) => !n.read).length));
    (async () => {
      const [records, partners, grants] = await Promise.all([getRiderRecords(riderId), listPartners(), listShareGrants(riderId)]);
      const apps = (await Promise.all(partners.map((p) => listApplications(p.id)))).flat().filter((a) => a.riderId === riderId);
      setFeed({ captures: records?.captures ?? [], applications: apps, grants, partners });
    })();
    // dataVersion: 조작판 초기화·재촬영·신청 상태 변경 뒤 다시 읽는다
  }, [riderId, stage, dataVersion]);

  const feedItems = useFeedItems(feed);
  if (!rider || !metrics || !activity || !statement || !credit || !feed) return <ScreenSkeleton />;
  const matched = metrics.depositMatchRate !== null && metrics.depositMatchRate >= 0.85;

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-4 pt-3">
        <Image src={LOGO_PATH} alt={APP_NAME} width={LOGO_WIDTH} height={LOGO_HEIGHT} priority className="h-auto w-24" />
        <div className="flex items-center gap-1">
          <Link
            href="/notifications"
            aria-label={unread ? t("notices.bellUnread", { n: unread }) : t("notices.title")}
            className="relative grid size-10 place-items-center rounded-full active:bg-line"
          >
            <Bell className="size-5" aria-hidden />
            {unread ? (
              <span className="absolute top-0.5 right-0.5 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[11px] leading-4 font-bold text-white tabular-nums">
                {unread}
              </span>
            ) : null}
          </Link>
          <LangToggle />
        </div>
      </header>

      <main className="flex flex-col px-4 pt-3 pb-10">
        <h1 className="text-2xl leading-tight font-bold tracking-[-0.01em]">{t("home.hello", { name: rider.displayName.split(" ")[0] })}</h1>
        <p className="mt-0.5 truncate text-sm text-muted">
          {rider.area} · {rider.platforms.map((p) => t(`platforms.${p}`)).join(", ")}
        </p>

        {/* 순수입: 카드 없이 바탕 위에. 숫자 하나가 이 화면에서 가장 크다 */}
        <section aria-labelledby="home-income" className="mt-5">
          <h2 id="home-income" className="text-sm text-muted">
            {t("home.monthlyNet")}
          </h2>
          {/* 입금 내역과 차이가 크면 정산 화면 금액은 아직 검증 전이라 회색으로 낮추고, 경고 줄을 굵게 둔다 (4-4 경고 규칙) */}
          <p className={`mt-1 text-figure font-bold whitespace-nowrap tabular-nums ${matched ? "" : "text-muted"}`}>{formatRupiah(metrics.monthlyNet)}</p>
          <p className={`mt-2 flex items-center gap-1 text-sm ${matched ? "font-medium text-lime-ink" : "font-semibold text-danger"}`}>
            {matched ? <CircleCheck className="size-4" aria-hidden /> : <TriangleAlert className="size-4" aria-hidden />}
            {matched ? t("home.depositMatched") : t("home.depositMismatch")}
          </p>
          {/* 인니어처럼 버튼 글자가 길면 발급번호 아래로 내려간다 (발급번호는 자르지 않는다) */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <span className="font-mono text-xs whitespace-nowrap text-muted">{statement.issueNo}</span>
            <Link
              href="/certificate"
              className="ml-auto inline-flex min-h-11 shrink-0 items-center rounded-full bg-brand-purple px-5 text-sm font-semibold text-white transition active:scale-[0.98]"
            >
              {t("home.viewStatement")}
            </Link>
          </div>
        </section>

        {credit.status === "hold" ? (
          <section className="mt-5 flex flex-col gap-2 rounded-3xl bg-surface p-4">
            <h2 className="flex items-center gap-1.5 font-bold">
              <Info className="size-5 text-danger" aria-hidden />
              {t("credit.holds.title")}
            </h2>
            <p className="text-sm text-muted">{credit.holds.map((h) => t(`credit.holds.${h}`)).join(" · ")}</p>
            <ButtonLink href="/capture">{t("creditPage.goRetake")}</ButtonLink>
          </section>
        ) : (
          <CreditCard view={credit} onReason={() => setCriteriaOpen(true)} />
        )}
        {credit.status === "scored" ? (
          <CriteriaSheet open={criteriaOpen} onClose={() => setCriteriaOpen(false)} reasons={credit.reasons} criteria={credit.criteria} grade={credit.grade} />
        ) : null}

        {/* 일한 흔적: 이 앱만의 데이터. 접지 않고 늘 펼쳐 둔다 */}
        <section aria-labelledby="home-trail" className="mt-7">
          <h2 id="home-trail" className="text-base font-bold">
            {t("home.trail.title")}
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {t("home.trail.summary", { n: activity.activeDays })} · {t("home.trail.streak", { m: metrics.consecutiveActiveMonths })}
          </p>
          <div className="mt-3">
            <ActivityMap daily={activity.daily} />
          </div>
        </section>

        <section aria-labelledby="home-months" className="mt-8 border-t border-line pt-6">
          <h2 id="home-months" className="text-base font-bold">
            {t("home.months.title")}
          </h2>
          <p className="mt-0.5 text-sm text-muted">{t("home.months.avg", { amount: formatRupiah(metrics.avgMonthlyNet3m) })}</p>
          <div className="mt-4">
            <MonthBars months={activity.months} />
          </div>
        </section>

        <section aria-labelledby="home-feed" className="mt-8 border-t border-line pt-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="home-feed" className="text-base font-bold">
              {t("home.feed.title")}
            </h2>
            <Link href="/history" className="text-sm font-semibold text-muted active:opacity-70">
              {t("home.feed.viewAll")}
            </Link>
          </div>
          <FeedList items={feedItems} />
        </section>
      </main>
      <TabBar />
    </div>
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

/** 최근 활동 (최근 것부터 FEED_LIMIT개). 피드를 아직 못 읽었으면 빈 목록 */
function useFeedItems(feed: Feed | null): FeedItem[] {
  const t = useT();
  const { lang } = useDemo();
  if (!feed) return [];
  const name = (id: string) => {
    const p = feed.partners.find((x) => x.id === id);
    return p ? (lang === "ko" ? p.nameKo : p.nameId) : id;
  };

  return [
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
}

function FeedList({ items }: { items: FeedItem[] }) {
  const t = useT();
  const { lang } = useDemo();
  if (items.length === 0) return <p className="mt-3 text-sm text-muted">{t("home.feed.empty")}</p>;
  return (
    <ul className="mt-1 flex flex-col divide-y divide-line">
      {items.map((item) => (
        <li key={item.key} className="flex items-center justify-between gap-3 py-3">
          <span className="min-w-0">
            <span className="line-clamp-2 block text-sm font-medium">{item.title}</span>
            <span className="mt-0.5 block text-xs text-muted">{formatDate(item.date, lang)}</span>
          </span>
          <span className="shrink-0 whitespace-nowrap">{item.right}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * 신용도 카드: 이 화면의 유일한 흰 카드. 단계별 표시는 riderView가 정한다 (2-4).
 * 위: 「내 신용 ›」(내 신용 화면으로) + PKA 배지 / 가운데: 점수 40px + 작은 원형 표시 / 아래: 가장 큰 이유 한 줄 + 시연용 표기
 */
function CreditCard({ view, onReason }: { view: Exclude<RiderCreditView, { status: "hold" }>; onReason: () => void }) {
  const t = useT();
  const ratio = view.status === "readiness" ? view.metCount / view.totalCount : (view.score - 400) / 500;
  const top = view.status === "scored" ? view.reasons[0] : undefined;
  return (
    <section aria-labelledby="home-credit" className="mt-5 rounded-3xl bg-surface px-4 pt-3 pb-3">
      <div className="flex items-center justify-between gap-2">
        <Link href="/credit" id="home-credit" className="-ml-1 flex min-h-9 items-center gap-0.5 rounded-lg px-1 text-sm text-muted active:opacity-70">
          {view.status === "readiness" ? t("credit.readiness.title") : t("tabs.credit")}
          <ChevronRight className="size-4" aria-hidden />
        </Link>
        {view.status === "scored" ? <PkaBadge /> : null}
      </div>
      {/* 점수를 눌러도 내 신용 화면으로 간다. 탭 순서는 위 「내 신용 ›」 링크 하나만 */}
      <Link href="/credit" tabIndex={-1} className="mt-1 flex items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="flex items-baseline gap-1.5 tabular-nums">
            {view.status === "readiness" ? (
              <>
                <span className="text-figure font-bold">{view.metCount}</span>
                <span className="text-base text-muted">/ {view.totalCount}</span>
              </>
            ) : (
              <>
                <span className="text-figure font-bold">{view.score}</span>
                <span className="text-base text-muted">/ 900</span>
              </>
            )}
          </span>
          {view.status === "scored" ? (
            <span className="mt-1.5 block text-sm font-semibold">
              {view.grade} · {t(`credit.grades.${view.grade}`)}
            </span>
          ) : null}
        </span>
        <Ring ratio={ratio} />
      </Link>
      {top ? (
        <button
          type="button"
          onClick={onReason}
          className="mt-3 flex w-full items-center gap-3 border-t border-line pt-2.5 text-left active:opacity-70"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted">{t("credit.criteria.topReason")}</span>
            <span className="block text-sm font-semibold">
              <ReasonText reason={top} />
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
        </button>
      ) : null}
      {view.status === "scored" ? <p className="mt-2 text-[11px] leading-snug text-muted">{t("credit.disclaimer")}</p> : null}
    </section>
  );
}

/** 작은 원형 표시. 채운 만큼만 보라 (데이터 한 곳), 나머지는 무채색 */
function Ring({ ratio }: { ratio: number }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  const v = Math.min(1, Math.max(0, ratio));
  return (
    <svg viewBox="0 0 56 56" className="size-14 shrink-0 -rotate-90" aria-hidden>
      <circle cx="28" cy="28" r={r} fill="none" strokeWidth="6" className="stroke-line" />
      <circle cx="28" cy="28" r={r} fill="none" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${c * v} ${c}`} className="stroke-brand-purple" />
    </svg>
  );
}
