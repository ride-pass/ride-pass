"use client";

// 시연 3단계: 무엇을, 누구에게, 얼마 동안 보여 주는지 한 화면에서 확인한다 (CLAUDE.md 3절).
// Figma "2. Atur Izin"(항목 선택)과 "3. Persetujuan"(동의)을 한 화면으로 합쳤다.
// "거절해도 렌털 신청은 그대로 진행됩니다" 문구가 반드시 있어야 한다.

import {
  BadgeCheck,
  CalendarClock,
  FileText,
  Landmark,
  Lock,
  ReceiptText,
  RotateCcw,
  Smartphone,
  Bike,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { AppHeader } from "@/components/ui/AppHeader";
import { Badge } from "@/components/ui/Badge";
import { BottomBar } from "@/components/ui/BottomBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconTile } from "@/components/ui/IconTile";
import { StepBar } from "@/components/ui/StepBar";
import { Toggle } from "@/components/ui/Toggle";
import { DEMO_TODAY } from "@/config/demo";
import { createShareGrant, getPartner, getRider } from "@/data/repository";
import type { Partner, Rider, ShareGrant } from "@/data/types";
import { addDays } from "@/lib/date";
import { formatDate } from "@/lib/format";

type ShareItem = ShareGrant["items"][number];

const ITEMS: { id: ShareItem; icon: LucideIcon; required?: boolean }[] = [
  { id: "income", icon: ReceiptText, required: true },
  { id: "activity", icon: Bike },
  { id: "rental_history", icon: CalendarClock },
  { id: "bank_account", icon: Landmark },
  { id: "slik_report", icon: FileText },
  { id: "telecom_bills", icon: Smartphone },
];

const SHARE_DAYS = 30; // mockRepository.createShareGrant와 같은 기간

export default function ConsentPage() {
  const t = useT();
  const router = useRouter();
  const { riderId, partnerId, lang } = useDemo();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [rider, setRider] = useState<Rider | null>(null);
  const [selected, setSelected] = useState<Set<ShareItem>>(new Set(ITEMS.map((i) => i.id)));
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPartner(partnerId).then(setPartner);
    getRider(riderId).then(setRider);
  }, [partnerId, riderId]);

  const available = (id: ShareItem) => id !== "bank_account" || rider?.hasBankAccount !== false;
  const toggle = (id: ShareItem, on: boolean) =>
    setSelected((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const items = ITEMS.filter((i) => available(i.id) && selected.has(i.id)).map((i) => i.id);
  const partnerName = partner ? (lang === "ko" ? partner.nameKo : partner.nameId) : "";
  const until = formatDate(addDays(DEMO_TODAY, SHARE_DAYS), lang);

  const agree = async () => {
    setBusy(true);
    await createShareGrant({ riderId, partnerId, items });
    router.push("/capture");
  };

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t("consent.header")} />
      <StepBar current={1} total={4} />
      <main className="flex flex-col gap-4 px-4">
        <div>
          <Badge tone="lavender">{t("consent.step")}</Badge>
          <h2 className="mt-3 text-2xl font-bold">{t("consent.title")}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">{t("consent.body")}</p>
        </div>

        <Card className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <IconTile>
              <Building2 className="size-6" aria-hidden />
            </IconTile>
            <div className="min-w-0">
              <p className="text-xs text-muted">{t("consent.toWhom")}</p>
              <p className="truncate text-lg font-bold">{partnerName}</p>
            </div>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl bg-canvas p-4 text-sm">
            <dt className="text-muted">{t("consent.purposeLabel")}</dt>
            <dd className="font-medium">{t("consent.purpose")}</dd>
            <dt className="text-muted">{t("consent.periodLabel")}</dt>
            <dd className="font-medium">{t("consent.period", { days: SHARE_DAYS, until })}</dd>
          </dl>
        </Card>

        <section className="flex flex-col gap-2">
          <h3 className="px-1 text-sm font-semibold text-muted">{t("consent.itemsTitle")}</h3>
          {ITEMS.map(({ id, icon: Icon, required }) => {
            const can = available(id);
            return (
              <Card key={id} className="flex items-center gap-3 p-4">
                <IconTile>
                  <Icon className="size-5" aria-hidden />
                </IconTile>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold">
                    {t(`consent.items.${id}.title`)}
                    {required ? <Badge tone="lime">{t("consent.required")}</Badge> : null}
                  </p>
                  <p className="mt-0.5 text-sm leading-snug text-muted">
                    {can ? t(`consent.items.${id}.body`) : t("consent.notAvailable")}
                  </p>
                </div>
                <Toggle
                  checked={can && selected.has(id)}
                  disabled={required || !can}
                  onChange={(on) => toggle(id, on)}
                  label={t(`consent.items.${id}.title`)}
                />
              </Card>
            );
          })}
          <p className="px-1 text-center text-sm text-muted">{t("consent.count", { n: items.length })}</p>
        </section>

        <Card className="flex flex-col gap-3 bg-lavender">
          <p className="flex items-start gap-2 text-sm">
            <BadgeCheck className="mt-0.5 size-4 shrink-0 text-brand-purple" aria-hidden />
            {t("consent.promiseOnly")}
          </p>
          <p className="flex items-start gap-2 text-sm">
            <RotateCcw className="mt-0.5 size-4 shrink-0 text-brand-purple" aria-hidden />
            {t("consent.promiseRevoke")}
          </p>
          <p className="flex items-start gap-2 text-sm font-semibold">
            <Lock className="mt-0.5 size-4 shrink-0 text-brand-purple" aria-hidden />
            {t("consent.declineOk")}
          </p>
        </Card>

        <label className="flex items-start gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 size-5 accent-brand-purple"
          />
          <span className="text-sm font-medium">{t("consent.confirm", { partner: partnerName })}</span>
        </label>
      </main>

      <BottomBar>
        <Button disabled={!confirmed || busy} onClick={agree}>
          {t("consent.agree")}
        </Button>
        <Button variant="secondary" onClick={() => router.push("/consent/declined")}>
          {t("consent.decline")}
        </Button>
      </BottomBar>
    </div>
  );
}
