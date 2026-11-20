"use client";

// 마이페이지 (2026-11-20 멘토링 뒤 추가). 하단 탭 「마이」.
// 내 정보, 내 자료(수입 명세서·자료 올리기), KUR 신청 준비, 알림·언어를 한곳에 모은다.
// KUR 체크리스트(시연 8단계)는 하단 탭에서 빠지고 여기서 들어간다.

import { Bell, ChevronRight, FileText, Globe, ListChecks, Upload, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { LangToggle } from "@/components/demo/LangToggle";
import { AppHeader } from "@/components/ui/AppHeader";
import { Card } from "@/components/ui/Card";
import { IconTile } from "@/components/ui/IconTile";
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
      <AppHeader title={t("my.title")} back={false} />
      <main className="flex flex-col gap-4 px-4 pt-2 pb-6">
        <Card className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-lavender text-xl font-bold text-brand-purple">
            {rider.displayName.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="text-lg font-bold">{rider.displayName}</p>
            <p className="text-sm text-muted tabular-nums">{rider.phoneMasked}</p>
            <p className="text-sm text-muted">
              {rider.area} · {rider.platforms.map((p) => t(`platforms.${p}`)).join(", ")}
            </p>
          </div>
        </Card>

        {/* KUR 신청 준비: 충족 요약만 보여 주고 체크리스트 화면으로 들어간다. 금리·한도 숫자는 넣지 않는다 (2-1) */}
        <Link href="/kur" className="block transition active:scale-[0.99]">
          <Card tone="lavender" className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <ListChecks className="size-6 shrink-0 text-brand-purple" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-bold">{t("kur.header")}</p>
                <p className="text-xs text-muted">{t("kur.subtitle")}</p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
            </div>
            <div className="flex items-center gap-3">
              <p className="flex shrink-0 items-baseline gap-1 whitespace-nowrap tabular-nums">
                <span className="text-3xl leading-none font-bold text-brand-purple">{kur.met}</span>
                <span className="text-base font-bold text-muted">/ {kur.total}</span>
              </p>
              <p className="min-w-0 text-sm font-semibold">{t("kur.summary", { met: kur.met, total: kur.total })}</p>
            </div>
          </Card>
        </Link>

        <Card className="flex flex-col gap-1">
          <h2 className="font-bold">{t("my.docs")}</h2>
          <ul className="flex flex-col divide-y divide-line">
            <Row href="/certificate" icon={FileText} title={t("my.statement")} sub={issueNo ?? undefined} />
            <Row href="/capture" icon={Upload} title={t("my.upload")} sub={t("my.uploadBody")} />
          </ul>
        </Card>

        <Card className="flex flex-col gap-1">
          <h2 className="font-bold">{t("my.settings")}</h2>
          <ul className="flex flex-col divide-y divide-line">
            <Row
              href="/notifications"
              icon={Bell}
              title={t("notices.title")}
              right={unread ? <span className="rounded-full bg-danger px-2 py-0.5 text-[11px] font-bold text-white tabular-nums">{unread}</span> : null}
            />
            <li className="flex items-center gap-3 py-3">
              <IconTile>
                <Globe className="size-5" aria-hidden />
              </IconTile>
              <span className="flex-1 text-sm font-medium">{t("my.language")}</span>
              <LangToggle />
            </li>
          </ul>
        </Card>
      </main>
      <TabBar />
    </div>
  );
}

function Row({ href, icon: Icon, title, sub, right }: { href: string; icon: LucideIcon; title: string; sub?: string; right?: ReactNode }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 py-3 active:opacity-70">
        <IconTile>
          <Icon className="size-5" aria-hidden />
        </IconTile>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{title}</span>
          {sub ? <span className="block truncate text-xs text-muted">{sub}</span> : null}
        </span>
        {right}
        <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
      </Link>
    </li>
  );
}
