"use client";

// 공유 완료 (Figma "4. 공유 완료"). 날짜는 기준일 기준, "OJK 규정 준수" 문구는 쓰지 않는다 (CLAUDE.md 6절).
// 보낸 곳마다 "다음에 일어날 일" 3단계(보냄 → 기관 확인 → 결과 알림)를 보여 준다. 기관이 열람·승인·거절하면
// (시연 조작판 「보낸 곳 결과 보내기」 등) dataVersion이 올라 바로 바뀐다. 승인 여부는 기관이 정하고 기사는 결과만 받는다 (1절).

import { CheckCircle2, Circle, CircleCheck, CircleX, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { Badge } from "@/components/ui/Badge";
import { BottomBar } from "@/components/ui/BottomBar";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DEMO_TODAY } from "@/config/demo";
import { listApplications, listNotices, listPartners, listShareGrants, type RiderNotice } from "@/data/repository";
import type { Application, Partner, ShareGrant } from "@/data/types";
import { formatDate } from "@/lib/format";

export default function ShareDonePage() {
  const t = useT();
  const { riderId, lang, dataVersion } = useDemo();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [grants, setGrants] = useState<ShareGrant[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [notices, setNotices] = useState<RiderNotice[]>([]);

  useEffect(() => {
    (async () => {
      const ps = await listPartners();
      const [gs, all, ns] = await Promise.all([
        listShareGrants(riderId),
        Promise.all(ps.map((p) => listApplications(p.id))),
        listNotices(riderId),
      ]);
      setPartners(ps);
      setGrants(gs.filter((g) => g.revokedAt === null && g.grantedAt === DEMO_TODAY));
      setApps(all.flat().filter((a) => a.riderId === riderId));
      setNotices(ns);
    })();
    // dataVersion: 기관이 열람·승인하면(조작판) 다시 읽는다
  }, [riderId, dataVersion]);

  const sent = new Set(new URLSearchParams(typeof window === "undefined" ? "" : window.location.search).get("to")?.split(",") ?? []);
  const shown = grants.filter((g) => sent.size === 0 || sent.has(g.partnerId));
  const name = (id: string) => {
    const p = partners.find((x) => x.id === id);
    return p ? (lang === "ko" ? p.nameKo : p.nameId) : id;
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex gap-1.5 px-4 pt-4" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-1.5 flex-1 rounded-full bg-brand-lime" />
        ))}
      </div>
      <main className="flex flex-col items-center gap-4 px-4 pt-8">
        <span className="grid size-24 place-items-center rounded-full bg-brand-purple text-brand-lime">
          <CheckCircle2 className="size-12" aria-hidden />
        </span>
        <h1 className="text-center text-2xl font-bold">{t("done.title")}</h1>
        <Badge tone="lavender" icon={<RotateCcw className="size-3.5" aria-hidden />}>
          {t("done.revocable")}
        </Badge>

        {shown.map((g) => (
          <Card key={g.id} className="flex w-full flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted">{t("done.to")}</p>
                <p className="text-lg font-bold">{name(g.partnerId)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">{t("done.shareId")}</p>
                <p className="font-mono text-xs font-semibold text-brand-purple">{g.id}</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-2xl bg-canvas p-3">
                <dt className="text-xs text-muted">{t("done.sentAt")}</dt>
                <dd className="font-semibold">{formatDate(g.grantedAt, lang)}</dd>
              </div>
              <div className="rounded-2xl bg-canvas p-3">
                <dt className="text-xs text-muted">{t("done.until")}</dt>
                <dd className="font-semibold">{formatDate(g.expiresAt, lang)}</dd>
              </div>
            </dl>
            <div>
              <p className="text-xs text-muted">{t("done.items")}</p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {g.items.map((item) => (
                  <li key={item}>
                    <Badge tone="neutral">{t(`consent.items.${item}.title`)}</Badge>
                  </li>
                ))}
              </ul>
            </div>
            <NextSteps
              partner={name(g.partnerId)}
              sentAt={formatDate(g.grantedAt, lang)}
              viewed={notices.find((n) => n.kind === "viewed" && n.partnerId === g.partnerId)}
              app={apps.find((a) => a.partnerId === g.partnerId)}
            />
          </Card>
        ))}
        {shown.length === 0 ? <p className="text-center text-sm text-muted">{t("done.decision")}</p> : null}
      </main>
      <BottomBar>
        <ButtonLink href="/credit">{t("done.toCredit")}</ButtonLink>
        <ButtonLink href="/home" variant="secondary">
          {t("done.toHome")}
        </ButtonLink>
      </BottomBar>
    </div>
  );
}

type StepState = "done" | "waiting" | "rejected";

/** 보냄 → 기관 확인 → 결과 알림. 다 끝난 단계는 체크, 기다리는 단계는 빈 원 */
function NextSteps({ partner, sentAt, viewed, app }: { partner: string; sentAt: string; viewed?: RiderNotice; app?: Application }) {
  const t = useT();
  const { lang } = useDemo();
  const decided = app && app.status !== "pending" ? app.status : null;
  const steps: { title: string; body: string; state: StepState }[] = [
    { title: t("done.next.sent"), body: sentAt, state: "done" },
    {
      title: t("done.next.viewed", { partner }),
      body: viewed ? t("done.next.viewedDone", { date: formatDate(viewed.at, lang) }) : t("done.next.viewedWait"),
      state: viewed || decided ? "done" : "waiting",
    },
    {
      title: t("done.next.result"),
      body: decided === "approved" ? t("done.next.approved") : decided === "rejected" ? t("done.next.rejected") : t("done.next.resultWait"),
      state: decided === "approved" ? "done" : decided === "rejected" ? "rejected" : "waiting",
    },
  ];
  const ICON = { done: CircleCheck, waiting: Circle, rejected: CircleX } as const;
  const COLOR = { done: "text-brand-purple", waiting: "text-line", rejected: "text-danger" } as const;
  return (
    <section className="border-t border-line pt-3">
      <h2 className="text-xs text-muted">{t("done.next.title")}</h2>
      <ol className="mt-2 flex flex-col">
        {steps.map((step, i) => {
          const Icon = ICON[step.state];
          return (
            <li key={step.title} className="relative flex gap-3 pb-3 last:pb-0">
              {/* 단계 사이 세로 줄 */}
              {i < steps.length - 1 ? <span className="absolute top-6 bottom-0 left-[9px] w-0.5 bg-line" aria-hidden /> : null}
              <Icon className={`relative size-5 shrink-0 bg-surface ${COLOR[step.state]}`} aria-hidden />
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${step.state === "waiting" ? "text-muted" : ""}`}>{step.title}</span>
                <span className="block text-xs text-muted">{step.body}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
