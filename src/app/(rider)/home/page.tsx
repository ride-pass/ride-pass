"use client";

// 기사 앱 홈 (Figma "RidePass 홈", CLAUDE.md 6절 표대로 바꿈). 기사가 매일 열어 보는 화면이다.
// 위에서부터: 수입 명세서 배너(원형 게이지) → (평가 보류) → 접고 펴는 목록 한 장.
// 목록(팀원 스케치·2026-11-20): 근무 이력(활동 지도) · 순수입(30일 단위 막대) · 최근 활동 · 신용도 이유(「평가 기준 보기」 창).
// 줄마다 요약 한 줄을 늘 보여 주고, 누르면 그 자리에서 펼친다. 한 번에 하나만 열린다.
// 「다음 할 일」 카드는 2026-11-20 멘토링 뒤 뺐다. 개선 방법은 「내 신용」 화면에 있다.
// 원형 게이지 자리는 getRiderCreditView()가 정한다. A: 신용 준비도 5개 중 ○개, C: 신용도 + 「PKA 인가 후 제공 기능」 배지.
// "안전 운행 점수", 「맞춤 제휴 혜택」 상품 카드, "소액 대출"·"보험 할인"·"오토바이 할부" 타일은 넣지 않는다.
// 바로 가기 타일은 하단 탭·각 카드의 링크와 겹쳐서 뺐다.

import { Bell, CalendarDays, ChartColumn, ChevronRight, ClipboardCheck, History, TriangleAlert, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
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
import { CriteriaSheet } from "@/components/credit/CreditCriteria";
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
  const [openRow, setOpenRow] = useState<RowId | null>(null);
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const toggleRow = (id: RowId) => setOpenRow((cur) => (cur === id ? null : id));

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
      <header className="flex items-center justify-between px-4 pt-4">
        <Image src={LOGO_PATH} alt={APP_NAME} width={LOGO_WIDTH} height={LOGO_HEIGHT} priority className="h-auto w-28" />
        <div className="flex items-center gap-2">
          <Link
            href="/notifications"
            aria-label={unread ? t("notices.bellUnread", { n: unread }) : t("notices.title")}
            className="relative grid size-9 place-items-center rounded-full active:bg-lavender"
          >
            <Bell className="size-5" aria-hidden />
            {unread ? (
              <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[11px] leading-4 font-bold text-white tabular-nums">
                {unread}
              </span>
            ) : null}
          </Link>
          <LangToggle />
        </div>
      </header>
      <main className="flex flex-col gap-4 px-4 pt-4 pb-6">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-full bg-lavender text-lg font-bold text-brand-purple">
            {rider.displayName.charAt(0)}
          </span>
          <div>
            <h1 className="text-lg font-bold">{t("home.hello", { name: rider.displayName.split(" ")[0] })}</h1>
            <p className="text-sm text-muted">
              {rider.area} · {rider.platforms.map((p) => t(`platforms.${p}`)).join(", ")}
            </p>
          </div>
        </div>

        <Card tone="purple" className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-white/70">{t("home.monthlyNet")}</p>
              <p className="mt-1 text-2xl leading-tight font-bold whitespace-nowrap tabular-nums">{formatRupiah(metrics.monthlyNet)}</p>
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
          {credit.status === "scored" ? <p className="-mt-2 text-[11px] leading-relaxed text-white/60">{t("credit.disclaimer")}</p> : null}
        </Card>

        {credit.status === "hold" ? (
          <Card className="flex flex-col gap-2 ring-2 ring-danger">
            <p className="font-semibold">{t("credit.holds.title")}</p>
            <p className="text-sm text-muted">{credit.holds.map((h) => t(`credit.holds.${h}`)).join(" · ")}</p>
            <ButtonLink href="/capture">{t("creditPage.goRetake")}</ButtonLink>
          </Card>
        ) : null}

        <Card className="flex flex-col px-2 py-2">
          <h2 className="px-3 pt-2 pb-1 text-sm font-semibold text-muted">{t("home.rows.title")}</h2>
          <ToggleRow
            id="trail"
            open={openRow === "trail"}
            onToggle={toggleRow}
            icon={CalendarDays}
            title={t("home.rows.trail.title")}
            sub={t("home.rows.trail.sub", { n: activity.activeDays, m: metrics.consecutiveActiveMonths })}
          >
            <ActivityMap daily={activity.daily} />
          </ToggleRow>
          <ToggleRow
            id="income"
            open={openRow === "income"}
            onToggle={toggleRow}
            icon={ChartColumn}
            title={t("home.rows.income.title")}
            sub={t("home.months.avg", { amount: formatRupiah(metrics.avgMonthlyNet3m) })}
          >
            <MonthBars months={activity.months} />
          </ToggleRow>
          <ToggleRow
            id="feed"
            open={openRow === "feed"}
            onToggle={toggleRow}
            icon={History}
            title={t("home.rows.feed.title")}
            sub={feedItems[0]?.title ?? t("home.feed.empty")}
          >
            <FeedList items={feedItems} />
          </ToggleRow>
          {/* 점수 옆 가장 큰 이유 한 줄은 늘 보이고, 누르면 「평가 기준 보기」 창이 열린다 (CLAUDE.md 8절) */}
          {credit.status === "scored" ? (
            <>
              <RowButton
                icon={ClipboardCheck}
                title={t("home.rows.reason.title")}
                sub={credit.reasons[0] ? t(`credit.reasons.${credit.reasons[0].code}`) : ""}
                onClick={() => setCriteriaOpen(true)}
              />
              <CriteriaSheet
                open={criteriaOpen}
                onClose={() => setCriteriaOpen(false)}
                reasons={credit.reasons}
                criteria={credit.criteria}
                grade={credit.grade}
              />
            </>
          ) : null}
        </Card>
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
  return (
    <div className="flex flex-col">
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
      <Link href="/history" className="self-end pt-1 text-xs font-semibold text-brand-purple">
        {t("home.feed.viewAll")}
      </Link>
    </div>
  );
}

type RowId = "trail" | "income" | "feed";

/** 목록 한 줄의 겉모양: 왼쪽 회색 아이콘, 굵은 제목 + 요약 한 줄, 오른쪽 화살표 (팀원 스케치·네이버 목록).
 *  아이콘은 연보라 타일 없이 그대로 둔다 — 줄마다 같은 타일이 반복되면 아이콘이 내용보다 먼저 보인다 */
function RowFace({ icon: Icon, title, sub, chevron }: { icon: LucideIcon; title: string; sub: string; chevron: ReactNode }) {
  return (
    <>
      <Icon className="mt-0.5 size-5 shrink-0 self-start text-muted" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{sub}</span>
      </span>
      {chevron}
    </>
  );
}

/** 누르면 그 자리에서 펼쳐지는 줄 */
function ToggleRow({
  id,
  open,
  onToggle,
  icon,
  title,
  sub,
  children,
}: {
  id: RowId;
  open: boolean;
  onToggle: (id: RowId) => void;
  icon: LucideIcon;
  title: string;
  sub: string;
  children: ReactNode;
}) {
  const panelId = `home-row-${id}`;
  return (
    <div className={`rounded-2xl transition-colors ${open ? "bg-canvas" : ""}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onToggle(id)}
        className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left active:bg-canvas"
      >
        <RowFace
          icon={icon}
          title={title}
          sub={sub}
          chevron={<ChevronRight className={`size-5 shrink-0 text-muted transition-transform ${open ? "rotate-90" : ""}`} aria-hidden />}
        />
      </button>
      {open ? (
        <div id={panelId} className="px-3 pb-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** 펼치지 않고 창을 여는 줄 */
function RowButton({ icon, title, sub, onClick }: { icon: LucideIcon; title: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left active:bg-canvas">
      <RowFace icon={icon} title={title} sub={sub} chevron={<ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />} />
    </button>
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
        <span className="rounded-full bg-brand-lime px-2.5 py-1 text-[11px] leading-tight font-semibold text-balance text-lime-ink">
          {t("credit.badge.pka_licensed_feature")}
        </span>
      ) : null}
    </Link>
  );
}
