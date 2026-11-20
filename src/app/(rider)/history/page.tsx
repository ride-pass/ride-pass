"use client";

// 제출 이력 (Figma 하단 탭 「혜택」 → 「제출 이력」, CLAUDE.md 6절).
// 어디에 무엇을 언제까지 보여 줬는지, 렌털사가 어떻게 처리했는지 보고, 언제든 철회한다.
// 철회하면 그 기관 화면에서 바로 자료가 보이지 않는다 (partnerView가 유효한 동의만 본다).

import { Building2, Eye, RotateCcw, ShieldOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { AppHeader } from "@/components/ui/AppHeader";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconTile } from "@/components/ui/IconTile";
import { Sheet } from "@/components/ui/Sheet";
import { TabBar } from "@/components/ui/TabBar";
import { useToast } from "@/components/ui/Toast";
import { DEMO_TODAY } from "@/config/demo";
import { listApplications, listNotices, listPartners, listShareGrants, revokeShareGrant, type RiderNotice } from "@/data/repository";
import type { Application, Partner, ShareGrant } from "@/data/types";
import { diffDays } from "@/lib/date";
import { formatDate } from "@/lib/format";

type GrantState = "active" | "revoked" | "expired";

function grantState(g: ShareGrant): GrantState {
  if (g.revokedAt) return "revoked";
  if (g.expiresAt < DEMO_TODAY) return "expired";
  return "active";
}

export default function HistoryPage() {
  const t = useT();
  const { riderId, lang, dataVersion, bumpData } = useDemo();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [grants, setGrants] = useState<ShareGrant[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [notices, setNotices] = useState<RiderNotice[]>([]);
  const [confirming, setConfirming] = useState<ShareGrant | null>(null);
  const toast = useToast();

  const load = useCallback(
    () =>
      listPartners().then(async (ps) => {
        const [gs, all, ns] = await Promise.all([
          listShareGrants(riderId),
          Promise.all(ps.map((p) => listApplications(p.id))),
          listNotices(riderId),
        ]);
        setPartners(ps);
        setNotices(ns);
        setGrants(gs.sort((a, b) => b.grantedAt.localeCompare(a.grantedAt)));
        setApps(all.flat().filter((a) => a.riderId === riderId));
      }),
    // dataVersion: 철회·조작판 변경 뒤 다시 읽는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [riderId, dataVersion],
  );

  useEffect(() => {
    load();
  }, [load]);

  const name = (id: string) => {
    const p = partners.find((x) => x.id === id);
    return p ? (lang === "ko" ? p.nameKo : p.nameId) : id;
  };

  const revoke = async (g: ShareGrant) => {
    await revokeShareGrant(g.id);
    setConfirming(null);
    bumpData();
    toast(t("history.revokedToast", { partner: name(g.partnerId) }), "success");
  };

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t("history.header")} back="/home" />
      <main className="flex flex-col gap-3 px-4 pt-2 pb-6">
        <p className="text-sm text-muted">{t("history.body")}</p>
        {grants.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted">{t("history.empty")}</p>
            {/* 렌털 신청 동의(/consent)가 아니라 기사가 직접 고르는 제출 화면으로 간다 */}
            <ButtonLink href="/share">{t("history.startShare")}</ButtonLink>
          </Card>
        ) : null}
        {grants.map((g) => {
          const state = grantState(g);
          const app = apps.find((a) => a.partnerId === g.partnerId);
          return (
            <Card key={g.id} className={`flex flex-col gap-3 ${state === "active" ? "" : "opacity-70"}`}>
              <div className="flex items-start gap-3">
                <IconTile>
                  <Building2 className="size-5" aria-hidden />
                </IconTile>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{name(g.partnerId)}</p>
                  <p className="text-xs text-muted">
                    {t("history.period", { from: formatDate(g.grantedAt, lang), to: formatDate(g.expiresAt, lang) })}
                    {state === "active" ? ` · ${t("history.daysLeft", { n: diffDays(DEMO_TODAY, g.expiresAt) })}` : ""}
                  </p>
                </div>
                <Badge tone={state === "active" ? "lime" : "neutral"}>{t(`history.state.${state}`)}</Badge>
              </div>
              {/* 기관이 내 자료를 열람했는지 (열람 기록은 기관이 신청서를 펼칠 때 남는다) */}
              {(() => {
                const viewed = notices.find((n) => n.kind === "viewed" && n.partnerId === g.partnerId);
                return (
                  <p className="flex items-center gap-2 text-sm text-muted">
                    <Eye className="size-4 shrink-0" aria-hidden />
                    {viewed ? t("history.viewed", { date: formatDate(viewed.at, lang) }) : t("history.notViewed")}
                  </p>
                );
              })()}
              {app ? (
                <p className="rounded-xl bg-canvas px-3 py-2 text-sm">
                  {t("history.appStatus")} <span className="font-semibold">{t(`applicants.status.${app.status}`)}</span>
                </p>
              ) : null}
              <ul className="flex flex-wrap gap-1.5">
                {g.items.map((item) => (
                  <li key={item}>
                    <Badge tone="neutral">{t(`consent.items.${item}.title`)}</Badge>
                  </li>
                ))}
              </ul>
              {state === "revoked" ? (
                <p className="flex items-center gap-2 text-sm text-muted">
                  <ShieldOff className="size-4" aria-hidden />
                  {t("history.revokedNote", { date: formatDate(g.revokedAt!, lang) })}
                </p>
              ) : null}
              {state === "active" ? (
                <Button variant="secondary" onClick={() => setConfirming(g)} icon={<RotateCcw className="size-4" aria-hidden />}>
                  {t("history.revokeStart")}
                </Button>
              ) : null}
            </Card>
          );
        })}
      </main>
      <Sheet open={confirming !== null} onClose={() => setConfirming(null)} title={t("history.revokeStart")}>
        {confirming ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm">{t("history.confirm", { partner: name(confirming.partnerId) })}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setConfirming(null)}>
                {t("history.cancel")}
              </Button>
              <Button variant="danger" onClick={() => revoke(confirming)}>
                {t("history.revoke")}
              </Button>
            </div>
          </div>
        ) : null}
      </Sheet>
      <TabBar />
    </div>
  );
}
