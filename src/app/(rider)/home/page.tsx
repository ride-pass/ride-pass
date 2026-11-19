"use client";

// 기사 앱 홈 (Figma "RidePass 홈", CLAUDE.md 6절 표대로 바꿈).
// 원형 게이지 자리는 getRiderCreditView()가 정한다. A: 신용 준비도 5개 중 ○개, C: 신용도 + 「PKA 인가 후 제공 기능」 배지.
// "안전 운행 점수", 「맞춤 제휴 혜택」 상품 카드, "소액 대출"·"보험 할인"·"오토바이 할부" 타일은 넣지 않는다.

import { Camera, ClipboardList, FileText, Gauge, ListChecks, Send, TriangleAlert, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { LangToggle } from "@/components/demo/LangToggle";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TabBar } from "@/components/ui/TabBar";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import { APP_NAME, LOGO_HEIGHT, LOGO_PATH, LOGO_WIDTH } from "@/config/brand";
import { getRiderCreditView, type RiderCreditView } from "@/credit/riderView";
import type { RiderMetrics } from "@/data/derive";
import { getIncomeStatement, getRider, getRiderMetrics } from "@/data/repository";
import type { IncomeStatement } from "@/data/statement";
import type { Rider } from "@/data/types";
import { formatRupiah } from "@/lib/format";

const TILES: { href: string; key: string; icon: LucideIcon }[] = [
  { href: "/capture", key: "capture", icon: Camera },
  { href: "/certificate", key: "statement", icon: FileText },
  { href: "/share", key: "share", icon: Send },
  { href: "/history", key: "history", icon: ClipboardList },
  { href: "/credit", key: "credit", icon: Gauge },
  { href: "/kur", key: "kur", icon: ListChecks },
];

export default function HomePage() {
  const t = useT();
  const { riderId, stage, dataVersion } = useDemo();
  const [rider, setRider] = useState<Rider | null>(null);
  const [metrics, setMetrics] = useState<RiderMetrics | null>(null);
  const [statement, setStatement] = useState<IncomeStatement | null>(null);
  const [credit, setCredit] = useState<RiderCreditView | null>(null);

  useEffect(() => {
    getRider(riderId).then(setRider);
    getRiderMetrics(riderId).then(setMetrics);
    getIncomeStatement(riderId).then(setStatement);
    getRiderCreditView(riderId, stage).then(setCredit);
    // dataVersion: 조작판 초기화·재촬영 뒤 다시 읽는다
  }, [riderId, stage, dataVersion]);

  if (!rider || !metrics || !statement || !credit) return <ScreenSkeleton />;
  const matched = metrics.depositMatchRate !== null && metrics.depositMatchRate >= 0.85;

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

        <Card tone="purple" className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <CreditBadge view={credit} />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/70">{t("home.monthlyNet")}</p>
              <p className="text-2xl font-bold">{formatRupiah(metrics.monthlyNet)}</p>
              <p className={`mt-1 flex items-center gap-1 text-xs ${matched ? "text-brand-lime" : "text-white"}`}>
                {matched ? null : <TriangleAlert className="size-3.5" aria-hidden />}
                {matched ? t("home.depositMatched") : t("home.depositMismatch")}
              </p>
            </div>
          </div>
          {/* 인니어처럼 버튼 글자가 길면 발급번호 아래로 내려간다 (발급번호는 자르지 않는다) */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-[11px] whitespace-nowrap">{statement.issueNo}</span>
            <Link href="/certificate" className="shrink-0 rounded-2xl bg-brand-lime px-4 py-2.5 text-center text-sm font-bold text-lime-ink">
              {t("home.viewStatement")}
            </Link>
          </div>
        </Card>

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

        <section>
          <h2 className="mb-2 px-1 font-bold">{t("home.servicesTitle")}</h2>
          <div className="grid grid-cols-3 gap-2">
            {TILES.map(({ href, key, icon: Icon }) => (
              <Link key={key} href={href} className="flex flex-col items-center gap-2 rounded-2xl bg-lavender px-2 py-4 text-center text-xs font-semibold text-brand-navy active:bg-lavender-strong">
                <span className="grid size-10 place-items-center rounded-xl bg-surface text-brand-purple">
                  <Icon className="size-5" aria-hidden />
                </span>
                {t(`home.tiles.${key}`)}
              </Link>
            ))}
          </div>
        </section>

        {credit.status === "hold" ? (
          <Card className="flex flex-col gap-2 ring-2 ring-danger">
            <p className="font-semibold">{t("credit.holds.title")}</p>
            <p className="text-sm text-muted">{credit.holds.map((h) => t(`credit.holds.${h}`)).join(" · ")}</p>
            <ButtonLink href="/capture">{t("creditPage.goRetake")}</ButtonLink>
          </Card>
        ) : null}
      </main>
      <TabBar />
    </div>
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
    <Link href="/credit" className="flex shrink-0 flex-col items-center gap-1" aria-label={t("tabs.credit")}>
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
      {view.status === "scored" ? <Badge tone="lime">{t("credit.badge.pka_licensed_feature")}</Badge> : null}
    </Link>
  );
}
