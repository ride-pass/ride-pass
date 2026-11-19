"use client";

// 알림함: 내 자료를 보여 준 기관이 열람했거나 신청을 처리한 기록.
// 결정은 기관이 하고 기사는 결과만 받는다 (CLAUDE.md 1절). 상품 권유·금리·한도 문구는 넣지 않는다 (2-1).
// 열면 지금까지 온 알림을 읽음으로 바꾼다. 화면에서는 방금까지 안 읽었던 것에 점을 남겨 둔다.

import { CircleCheck, CircleX, Eye, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { noticeText } from "@/components/notices/noticeText";
import { AppHeader } from "@/components/ui/AppHeader";
import { Card } from "@/components/ui/Card";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import { listNotices, listPartners, markNoticesRead, type RiderNotice } from "@/data/repository";
import type { Partner } from "@/data/types";
import { formatDate } from "@/lib/format";

const ICON: Record<RiderNotice["kind"], LucideIcon> = {
  viewed: Eye,
  approved: CircleCheck,
  rejected: CircleX,
};

export default function NotificationsPage() {
  const t = useT();
  const { riderId, lang, dataVersion } = useDemo();
  const [notices, setNotices] = useState<RiderNotice[] | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [ns, ps] = await Promise.all([listNotices(riderId), listPartners()]);
      if (cancelled) return;
      setNotices(ns);
      setPartners(ps);
      if (ns.some((n) => !n.read)) await markNoticesRead(riderId);
    })();
    return () => {
      cancelled = true;
    };
  }, [riderId, dataVersion]);

  if (!notices) return <ScreenSkeleton />;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t("notices.title")} back="/home" />
      <main className="flex flex-col gap-3 px-4 pt-2 pb-6">
        {notices.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">{t("notices.empty")}</p>
          </Card>
        ) : (
          <Card className="flex flex-col py-2">
            <ul className="flex flex-col divide-y divide-line">
              {notices.map((n) => {
                const Icon = ICON[n.kind];
                return (
                  <li key={n.id}>
                    <Link href="/history" className="flex items-start gap-3 py-3">
                      <Icon
                        className={`mt-0.5 size-5 shrink-0 ${n.kind === "approved" ? "text-brand-purple" : n.kind === "rejected" ? "text-danger" : "text-muted"}`}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{noticeText(t, n, partners, lang)}</span>
                        <span className="block text-xs text-muted">{formatDate(n.at, lang)}</span>
                      </span>
                      {n.read ? null : <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-purple" aria-label={t("notices.unread")} />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </main>
    </div>
  );
}
