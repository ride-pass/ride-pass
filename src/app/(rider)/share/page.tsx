"use client";

// 시연 5단계 뒷부분: 제출할 곳을 기사가 고른다 (Figma "1. Pilih Mitra").
// 신청한 렌털사 A는 3단계에서 동의를 받았다. 다른 곳을 고르면 같은 항목으로 동의를 한 번 더 확인한다.
// 승인율·심사 시간·OJK 문구는 쓰지 않는다 (CLAUDE.md 6절).

import { Bike, Building2, CreditCard, Landmark, Shield, Check, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { AppHeader } from "@/components/ui/AppHeader";
import { Badge } from "@/components/ui/Badge";
import { BottomBar } from "@/components/ui/BottomBar";
import { Button } from "@/components/ui/Button";
import { IconTile } from "@/components/ui/IconTile";
import { StepBar } from "@/components/ui/StepBar";
import { DEMO_TODAY } from "@/config/demo";
import { createShareGrant, listPartners, listShareGrants, submitApplication } from "@/data/repository";
import type { Partner, PartnerType, ShareGrant } from "@/data/types";
import { isWithin } from "@/lib/date";

const TYPE_ICON: Record<PartnerType, LucideIcon> = {
  ev_rental: Bike,
  installment: CreditCard,
  bank: Landmark,
  insurance: Shield,
};

const active = (g: ShareGrant) => g.revokedAt === null && isWithin(DEMO_TODAY, g.grantedAt, g.expiresAt);

export default function SharePage() {
  const t = useT();
  const router = useRouter();
  const { riderId, partnerId, lang } = useDemo();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [grants, setGrants] = useState<ShareGrant[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set([partnerId]));
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listPartners().then(setPartners);
    listShareGrants(riderId).then(setGrants);
  }, [riderId]);

  const grantFor = (id: string) => grants.find((g) => g.partnerId === id && active(g));
  const entryGrant = grantFor(partnerId);
  const needsConsent = [...picked].filter((id) => !grantFor(id));
  const canSubmit = picked.size > 0 && (needsConsent.length === 0 || confirmed) && !busy;

  const toggle = (id: string) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async () => {
    setBusy(true);
    const items = entryGrant?.items ?? ["income"];
    for (const id of picked) {
      if (!grantFor(id)) await createShareGrant({ riderId, partnerId: id, items });
      await submitApplication(riderId, id);
    }
    router.push(`/share/done?to=${[...picked].join(",")}`);
  };

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t("share.header")} />
      <StepBar current={4} total={4} />
      <main className="flex flex-col gap-4 px-4">
        <div>
          <Badge tone="lavender">{t("share.step")}</Badge>
          <h2 className="mt-3 text-2xl font-bold">{t("share.title")}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">{t("share.body")}</p>
        </div>

        <ul className="flex flex-col gap-2">
          {partners.map((p) => {
            const Icon = TYPE_ICON[p.type] ?? Building2;
            const on = picked.has(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(p.id)}
                  className={`flex w-full items-center gap-3 rounded-3xl bg-surface p-4 text-left ring-2 transition ${on ? "ring-brand-purple" : "ring-transparent"}`}
                >
                  <IconTile>
                    <Icon className="size-5" aria-hidden />
                  </IconTile>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-semibold">
                      {lang === "ko" ? p.nameKo : p.nameId}
                      {p.id === partnerId ? <Badge tone="lime">{t("share.applied")}</Badge> : null}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">{t(`share.types.${p.type}`)}</span>
                    {grantFor(p.id) ? <span className="mt-1 block text-xs text-brand-purple">{t("share.consented")}</span> : null}
                  </span>
                  <span className={`grid size-7 shrink-0 place-items-center rounded-full ${on ? "bg-brand-purple text-white" : "bg-line"}`}>
                    {on ? <Check className="size-4" strokeWidth={3} aria-hidden /> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {needsConsent.length > 0 ? (
          <label className="flex items-start gap-3 rounded-2xl bg-lavender p-4">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 size-5 accent-brand-purple"
            />
            <span className="text-sm">
              {t("share.extraConsent", {
                names: partners
                  .filter((p) => needsConsent.includes(p.id))
                  .map((p) => (lang === "ko" ? p.nameKo : p.nameId))
                  .join(", "),
              })}
            </span>
          </label>
        ) : null}

        <p className="px-1 text-center text-sm text-muted">{t("share.onlyPicked")}</p>
      </main>

      <BottomBar>
        <Button disabled={!canSubmit} onClick={submit}>
          {t("share.submit", { n: picked.size })}
        </Button>
      </BottomBar>
    </div>
  );
}
