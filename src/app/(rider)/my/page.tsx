"use client";

// 마이페이지 (2026-11-20 멘토링 뒤 추가). 하단 탭 「마이」.
// 내 정보, 내 자료(수입 명세서·자료 올리기), KUR 신청 준비, 알림·언어를 한곳에 모은다.
// KUR 체크리스트(시연 8단계)는 하단 탭에서 빠지고 여기서 들어간다.
// 2026-11-21 새 디자인 기준(6절): 프로필은 카드 없이, KUR 신청 준비만 흰 카드, 내 자료·설정은 설정 앱처럼 구분선 줄.

import { Bell, ChevronRight, FileText, Globe, Upload, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { LangToggle } from "@/components/demo/LangToggle";
import { AppHeader } from "@/components/ui/AppHeader";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import { TabBar } from "@/components/ui/TabBar";
import { buildKurChecklist, kurSummary } from "@/data/kur";
import { getIncomeStatement, getRider, getRiderMetrics, listNotices } from "@/data/repository";
import type { Rider } from "@/data/types";

export default function MyPage() {
  const t = useT();
  const { riderId, dataVersion } = useDemo();
  const [rider, setRider] = useState<Rider | null>(null);
  const [issueNo, setIssueNo] = useState<string | null>(null);
  const [kur, setKur] = useState<{ met: number; total: number } | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    getRider(riderId).then(setRider);
    getIncomeStatement(riderId).then((s) => setIssueNo(s?.issueNo ?? null));
    getRiderMetrics(riderId).then((m) => setKur(m ? kurSummary(buildKurChecklist(m)) : { met: 0, total: 0 }));
    listNotices(riderId).then((ns) => setUnread(ns.filter((n) => !n.read).length));
    // dataVersion: 조작판 초기화·재촬영 뒤 다시 읽는다
  }, [riderId, dataVersion]);

  if (!rider || !kur) return <ScreenSkeleton />;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t("my.title")} back={false} large />
      <main className="flex flex-col px-4 pt-3 pb-10">
        <section className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-lavender text-lg font-bold text-brand-purple">
            {rider.displayName.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="text-lg leading-tight font-bold">{rider.displayName}</p>
            <p className="mt-0.5 text-sm text-muted tabular-nums">{rider.phoneMasked}</p>
            <p className="text-sm text-muted">
              {rider.area} · {rider.platforms.map((p) => t(`platforms.${p}`)).join(", ")}
            </p>
          </div>
        </section>

        {/* KUR 신청 준비: 이 화면의 유일한 흰 카드. 충족 요약만 보여 주고 체크리스트 화면으로 들어간다. 금리·한도 숫자는 넣지 않는다 (2-1) */}
        <Link href="/kur" aria-labelledby="my-kur" className="mt-6 flex flex-col rounded-3xl bg-surface p-4 transition active:scale-[0.99]">
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span id="my-kur" className="block text-base font-bold">
                {t("kur.header")}
              </span>
              <span className="mt-0.5 block text-sm text-muted">{t("kur.subtitle")}</span>
            </span>
            <ChevronRight className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
          </span>
          <span className="mt-4 flex items-baseline gap-1.5 tabular-nums">
            <span className="text-figure font-bold">{kur.met}</span>
            <span className="text-base text-muted">/ {kur.total}</span>
          </span>
          <span className="mt-3 grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(kur.total, 1)}, minmax(0, 1fr))` }} aria-hidden>
            {Array.from({ length: kur.total }, (_, i) => (
              <span key={i} className={`h-1.5 rounded-full ${i < kur.met ? "bg-brand-purple" : "bg-line-strong"}`} />
            ))}
          </span>
          <span className="mt-2 block text-sm font-medium">{t("kur.summary", { met: kur.met, total: kur.total })}</span>
        </Link>

        <section aria-labelledby="my-docs" className="mt-8">
          <h2 id="my-docs" className="text-sm font-semibold text-muted">
            {t("my.docs")}
          </h2>
          <ul className="mt-1 flex flex-col divide-y divide-line border-b border-line">
            <Row href="/certificate" icon={FileText} title={t("my.statement")} sub={issueNo ?? undefined} />
            <Row href="/capture" icon={Upload} title={t("my.upload")} sub={t("my.uploadBody")} />
          </ul>
        </section>

        <section aria-labelledby="my-settings" className="mt-8">
          <h2 id="my-settings" className="text-sm font-semibold text-muted">
            {t("my.settings")}
          </h2>
          <ul className="mt-1 flex flex-col divide-y divide-line border-b border-line">
            <Row
              href="/notifications"
              icon={Bell}
              title={t("notices.title")}
              right={unread ? <span className="rounded-full bg-danger px-2 py-0.5 text-[11px] font-bold text-white tabular-nums">{unread}</span> : null}
            />
            <li className="flex min-h-14 items-center gap-3 py-2">
              <Globe className="size-5 shrink-0 text-muted" aria-hidden />
              <span className="flex-1 text-base font-medium">{t("my.language")}</span>
              <LangToggle />
            </li>
          </ul>
        </section>
      </main>
      <TabBar />
    </div>
  );
}

function Row({ href, icon: Icon, title, sub, right }: { href: string; icon: LucideIcon; title: string; sub?: string; right?: ReactNode }) {
  return (
    <li>
      <Link href={href} className="flex min-h-14 items-center gap-3 py-2.5 active:opacity-70">
        <Icon className="size-5 shrink-0 text-muted" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-medium">{title}</span>
          {sub ? <span className="block truncate text-xs text-muted">{sub}</span> : null}
        </span>
        {right}
        <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
      </Link>
    </li>
  );
}
