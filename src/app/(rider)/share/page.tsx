"use client";

// 시연 5단계 뒷부분: 제출할 곳을 기사가 고른다 (Figma "1. Pilih Mitra").
// 신청한 렌털사 A는 3단계에서 동의를 받았다. 다른 곳을 고르면 같은 항목으로 동의를 한 번 더 확인한다.
// 승인율·심사 시간·OJK 문구는 쓰지 않는다 (CLAUDE.md 6절).
// 기관은 종류별로 묶고 대출(은행)을 맨 위에 둔다 (2026-11-20 멘토링: 대출이 메인).

import { Bike, Building2, CreditCard, Landmark, Shield, Check, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { CreditCriteria } from "@/components/credit/CreditCriteria";
import { AppHeader } from "@/components/ui/AppHeader";
import { Badge } from "@/components/ui/Badge";
import { BottomBar } from "@/components/ui/BottomBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconTile } from "@/components/ui/IconTile";
import { StepBar } from "@/components/ui/StepBar";
import { APP_NAME } from "@/config/brand";
import { DEMO_TODAY } from "@/config/demo";
import { getRiderSubmissionView, type RiderSubmissionView } from "@/credit/riderView";
import { createShareGrant, listPartners, listShareGrants, submitApplication } from "@/data/repository";
import type { Partner, PartnerType, ShareGrant } from "@/data/types";
import { isWithin } from "@/lib/date";

const TYPE_ICON: Record<PartnerType, LucideIcon> = {
  ev_rental: Bike,
  installment: CreditCard,
  bank: Landmark,
  insurance: Shield,
};

/** 묶음 순서: 대출이 먼저 */
const TYPE_ORDER: PartnerType[] = ["bank", "installment", "ev_rental", "insurance"];

const subscribeNever = () => () => {};
const readPartnerParam = () => new URLSearchParams(window.location.search).get("partner");

const active = (g: ShareGrant) => g.revokedAt === null && isWithin(DEMO_TODAY, g.grantedAt, g.expiresAt);

export default function SharePage() {
  const t = useT();
  const router = useRouter();
  const { riderId, partnerId, lang, stage } = useDemo();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [grants, setGrants] = useState<ShareGrant[]>([]);
  // 「추천」 화면에서 「이곳에 내 자료 보내기」로 오면 그 기관을 골라 둔다 (?partner=). 아니면 신청한 곳
  const fromParam = useSyncExternalStore(subscribeNever, readPartnerParam, () => null);
  const [pickedState, setPicked] = useState<Set<string> | null>(null);
  const picked = pickedState ?? new Set([fromParam ?? partnerId]);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submission, setSubmission] = useState<RiderSubmissionView | null>(null);

  useEffect(() => {
    listPartners().then(setPartners);
    listShareGrants(riderId).then(setGrants);
  }, [riderId]);

  const grantFor = (id: string) => grants.find((g) => g.partnerId === id && active(g));
  const entryGrant = grantFor(partnerId);
  // 고른 곳 모두에 신청한 곳과 같은 항목이 간다 (submit 참고)
  const items: ShareGrant["items"] = entryGrant?.items ?? ["income"];
  const itemsKey = items.join(",");

  useEffect(() => {
    getRiderSubmissionView(riderId, itemsKey.split(",") as ShareGrant["items"], stage).then(setSubmission);
  }, [riderId, itemsKey, stage]);
  const needsConsent = [...picked].filter((id) => !grantFor(id));
  const canSubmit = picked.size > 0 && (needsConsent.length === 0 || confirmed) && !busy;

  const toggle = (id: string) =>
    setPicked((s) => {
      const next = new Set(s ?? picked);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async () => {
    setBusy(true);
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

        <SendCard items={items} submission={submission} />

        {TYPE_ORDER.map((type) => {
          const group = partners.filter((p) => p.type === type);
          if (group.length === 0) return null;
          const main = type === "bank";
          return (
            <section key={type} className={`flex flex-col gap-2 ${main ? "rounded-[28px] bg-lavender p-2" : ""}`}>
              <h3 className={`flex items-center gap-2 px-2 pt-1 font-bold ${main ? "text-base" : "text-sm text-muted"}`}>
                {t(`share.groups.${type}`)}
                {main ? <Badge tone="lime">{t("share.mainGroup")}</Badge> : null}
              </h3>
              <ul className="flex flex-col gap-2">
                {group.map((p) => {
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
            </section>
          );
        })}

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

/**
 * 고른 곳에 함께 가는 내용. 자료 목록 + (C단계) 렌털사가 받는 것과 같은 신용도.
 * A단계에는 신용도를 보내지 않으므로 점수를 보여 주지 않는다 (CLAUDE.md 2-4).
 */
function SendCard({ items, submission }: { items: ShareGrant["items"]; submission: RiderSubmissionView | null }) {
  const t = useT();
  const credit = submission?.stage === "C" ? submission.credit : null;
  return (
    <Card className="flex flex-col gap-3">
      <div>
        <p className="font-semibold">{t("share.send.title")}</p>
        <p className="mt-0.5 text-xs text-muted">{t("share.send.itemsLabel")}</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {items.map((i) => (
            <li key={i} className="rounded-full bg-canvas px-2.5 py-1 text-xs font-medium">
              {t(`consent.items.${i}.title`)}
            </li>
          ))}
        </ul>
      </div>
      {submission?.stage === "A" ? <p className="text-xs leading-relaxed text-muted">{t("share.send.aNote")}</p> : null}
      {credit ? (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-brand-purple">{t("share.send.creditTitle", { app: APP_NAME })}</span>
            <Badge tone="lime">{t("credit.badge.pka_licensed_feature")}</Badge>
          </div>
          {credit.status === "scored" && submission?.stage === "C" && submission.criteria ? (
            <>
              <p className="text-2xl font-bold text-brand-navy tabular-nums">
                {credit.score} <span className="text-base font-semibold">{credit.grade} · {t(`credit.grades.${credit.grade}`)}</span>
              </p>
              <p className="text-xs text-muted">{t("share.send.sameAsPartner")}</p>
              <CreditCriteria reasons={credit.reasons} criteria={submission.criteria} grade={credit.grade} />
            </>
          ) : credit.status === "hold" ? (
            <ul className="flex flex-col gap-1 text-sm">
              <li className="font-semibold">{t("credit.holds.title")}</li>
              {credit.holds.map((h) => (
                <li key={h} className="text-muted">
                  {h === "NOT_SHARED_INCOME" || h === "NOT_SHARED_ACTIVITY" ? t(`share.send.holds.${h}`) : t(`credit.holds.${h}`)}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-[11px] leading-relaxed text-muted">{t("credit.disclaimer")}</p>
        </div>
      ) : null}
    </Card>
  );
}
