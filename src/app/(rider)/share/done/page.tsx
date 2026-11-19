"use client";

// 공유 완료 (Figma "4. 공유 완료"). 날짜는 기준일 기준, "OJK 규정 준수" 문구는 쓰지 않는다 (CLAUDE.md 6절).

import { CheckCircle2, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { Badge } from "@/components/ui/Badge";
import { BottomBar } from "@/components/ui/BottomBar";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DEMO_TODAY } from "@/config/demo";
import { listPartners, listShareGrants } from "@/data/repository";
import type { Partner, ShareGrant } from "@/data/types";
import { formatDate } from "@/lib/format";

export default function ShareDonePage() {
  const t = useT();
  const { riderId, lang } = useDemo();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [grants, setGrants] = useState<ShareGrant[]>([]);

  useEffect(() => {
    listPartners().then(setPartners);
    listShareGrants(riderId).then((gs) => setGrants(gs.filter((g) => g.revokedAt === null && g.grantedAt === DEMO_TODAY)));
  }, [riderId]);

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
        <span className="grid size-24 place-items-center rounded-full bg-brand-purple text-brand-lime shadow-lg">
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
          </Card>
        ))}
        <p className="text-center text-sm text-muted">{t("done.decision")}</p>
      </main>
      <BottomBar>
        <ButtonLink href="/credit">{t("done.toCredit")}</ButtonLink>
        <ButtonLink href="/partner/apply" variant="secondary">
          {t("done.backToStart")}
        </ButtonLink>
      </BottomBar>
    </div>
  );
}
