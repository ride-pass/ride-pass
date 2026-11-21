"use client";

// 시연 3단계: 무엇을, 누구에게, 얼마 동안 보여 주는지 한 화면에서 확인한다 (CLAUDE.md 3절).
// Figma "2. Atur Izin"(항목 선택)과 "3. Persetujuan"(동의)을 한 화면으로 합쳤다.
// "거절해도 렌털 신청은 그대로 진행됩니다" 문구가 반드시 있어야 한다.
// 2026-11-21 새 디자인 기준(6절): 흰 카드는 「누구에게·무엇에·며칠」 한 장, 항목은 아이콘 타일 없는 구분선 줄 + 토글,
// 약속 세 줄만 연보라 블록, 동의 체크는 구분선 줄.

import { BadgeCheck, Lock, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { AppHeader } from "@/components/ui/AppHeader";
import { Badge } from "@/components/ui/Badge";
import { BottomBar } from "@/components/ui/BottomBar";
import { Button } from "@/components/ui/Button";
import { StepBar } from "@/components/ui/StepBar";
import { Toggle } from "@/components/ui/Toggle";
import { DEMO_TODAY } from "@/config/demo";
import { createShareGrant, getPartner, getRider } from "@/data/repository";
import type { Partner, Rider, ShareGrant } from "@/data/types";
import { addDays } from "@/lib/date";
import { formatDate } from "@/lib/format";

type ShareItem = ShareGrant["items"][number];

const ITEMS: { id: ShareItem; required?: boolean }[] = [
  { id: "income", required: true },
  { id: "activity" },
  { id: "rental_history" },
  { id: "bank_account" },
  { id: "slik_report" },
  { id: "telecom_bills" },
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
      <StepBar current={1} total={4} label={t("consent.step")} />
      <main className="flex flex-col px-4 pb-6">
        <h2 className="text-2xl leading-tight font-bold">{t("consent.title")}</h2>
        <p className="mt-2 text-base leading-relaxed text-muted">{t("consent.body")}</p>

        {/* 이 화면의 유일한 흰 카드: 누구에게 · 무엇에 · 며칠 */}
        <section className="mt-6 rounded-3xl bg-surface p-4">
          <p className="text-xs text-muted">{t("consent.toWhom")}</p>
          <p className="mt-0.5 text-lg leading-snug font-bold">{partnerName}</p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-line pt-3 text-sm">
            <dt className="text-muted">{t("consent.purposeLabel")}</dt>
            <dd className="font-medium">{t("consent.purpose")}</dd>
            <dt className="text-muted">{t("consent.periodLabel")}</dt>
            <dd className="font-medium">{t("consent.period", { days: SHARE_DAYS, until })}</dd>
          </dl>
        </section>

        <section aria-labelledby="consent-items" className="mt-8">
          <div className="flex items-baseline justify-between gap-3">
            <h3 id="consent-items" className="text-base font-bold">
              {t("consent.itemsTitle")}
            </h3>
            <p className="text-sm text-muted tabular-nums">{t("consent.count", { n: items.length })}</p>
          </div>
          <ul className="mt-1 flex flex-col divide-y divide-line border-b border-line">
            {ITEMS.map(({ id, required }) => {
              const can = available(id);
              return (
                <li key={id} className="flex min-h-16 items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-base font-semibold">
                      {t(`consent.items.${id}.title`)}
                      {required ? <Badge tone="lavender">{t("consent.required")}</Badge> : null}
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
                </li>
              );
            })}
          </ul>
        </section>

        {/* 약속 세 줄: 이 화면의 유일한 강조 블록. "거절해도 렌털 신청은 그대로 진행됩니다"가 반드시 들어간다 (3절) */}
        <section className="mt-6 flex flex-col gap-3 rounded-3xl bg-lavender p-4">
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
        </section>

        <label className="mt-4 flex min-h-14 cursor-pointer items-start gap-3 border-y border-line py-4">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-brand-purple"
          />
          <span className="text-base font-medium">{t("consent.confirm", { partner: partnerName })}</span>
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
