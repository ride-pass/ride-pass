"use client";

// 시연 5단계 뒷부분: 제출할 곳을 기사가 고른다 (Figma "1. Pilih Mitra").
// 렌털 신청 흐름으로 들어왔으면 렌털사 D는 3단계에서 동의를 받았다(「신청한 곳」 배지). 홈에서 시작했으면 배지가 없다. 다른 곳을 고르면 같은 항목으로 동의를 한 번 더 확인한다.
// 승인율·심사 시간·OJK 문구는 쓰지 않는다 (CLAUDE.md 6절).
// 기관은 종류별로 묶고 대출(은행)을 맨 위에 둔다 (2026-11-20 멘토링: 대출이 메인). 이름 알파벳도 위에서부터 A → E.
// 2026-11-21 새 디자인 기준(6절): 흰 카드는 「함께 보내는 내용」 하나. 기관은 묶음 제목 아래 아이콘 타일 없는 구분선 줄,
// 고르면 오른쪽 원이 보라 체크로 바뀐다(컨트롤의 켜진 상태).

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { SendCard } from "@/components/share/SendCard";
import { AppHeader } from "@/components/ui/AppHeader";
import { Badge } from "@/components/ui/Badge";
import { BottomBar } from "@/components/ui/BottomBar";
import { Button } from "@/components/ui/Button";
import { StepBar } from "@/components/ui/StepBar";
import { getRiderSubmissionView, type RiderSubmissionView } from "@/credit/riderView";
import { createShareGrant, getRider, listPartners, listShareGrants, submitApplication } from "@/data/repository";
import type { Partner, PartnerType, Rider, ShareGrant } from "@/data/types";
import { defaultShareItems, isActiveGrant } from "@/lib/shareItems";

/** 묶음 순서: 대출이 먼저 */
const TYPE_ORDER: PartnerType[] = ["bank", "installment", "ev_rental", "insurance"];


export default function SharePage() {
  const t = useT();
  const router = useRouter();
  const { riderId, partnerId, lang, stage } = useDemo();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [grants, setGrants] = useState<ShareGrant[]>([]);
  // 처음에는 아무 곳도 고르지 않는다(신청한 곳에는 배지만). 「추천」에서 보낼 때는 이 화면이 아니라 /recommend/send를 쓴다
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submission, setSubmission] = useState<RiderSubmissionView | null>(null);
  const [rider, setRider] = useState<Rider | null>(null);

  useEffect(() => {
    listPartners().then(setPartners);
    listShareGrants(riderId).then(setGrants);
    getRider(riderId).then(setRider);
  }, [riderId]);

  const grantFor = (id: string) => grants.find((g) => g.partnerId === id && isActiveGrant(g));
  /** 렌털 신청 흐름(3단계 동의)으로 들어왔을 때만 있다. 홈에서 시작했으면 없다 */
  const entryGrant = grantFor(partnerId);
  // 고른 곳 모두에 같은 항목이 간다 (submit 참고). 렌털 동의가 없으면 올린 자료 전부 (lib/shareItems.ts)
  const items: ShareGrant["items"] = defaultShareItems(rider, entryGrant);
  const itemsKey = items.join(",");

  useEffect(() => {
    getRiderSubmissionView(riderId, itemsKey.split(",") as ShareGrant["items"], stage).then(setSubmission);
  }, [riderId, itemsKey, stage]);
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
    for (const id of picked) {
      if (!grantFor(id)) await createShareGrant({ riderId, partnerId: id, items });
      await submitApplication(riderId, id);
    }
    router.push(`/share/done?to=${[...picked].join(",")}`);
  };

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t("share.header")} />
      <StepBar current={4} total={4} label={t("share.step")} />
      <main className="flex flex-col px-4 pb-6">
        <h2 className="text-2xl leading-tight font-bold">{t("share.title")}</h2>
        <p className="mt-2 text-base leading-relaxed text-muted">{t("share.body")}</p>

        <div className="mt-6">
          <SendCard items={items} submission={submission} />
        </div>

        {TYPE_ORDER.map((type) => {
          const group = partners.filter((p) => p.type === type).sort((a, b) => a.nameKo.localeCompare(b.nameKo));
          if (group.length === 0) return null;
          const main = type === "bank";
          return (
            <section key={type} aria-labelledby={`share-${type}`} className={main ? "mt-8" : "mt-6"}>
              <h3 id={`share-${type}`} className="flex items-center gap-2 text-base font-bold">
                {t(`share.groups.${type}`)}
                {main ? <Badge tone="lavender">{t("share.mainGroup")}</Badge> : null}
              </h3>
              <ul className="mt-1 flex flex-col divide-y divide-line border-b border-line">
                {group.map((p) => {
                  const on = picked.has(p.id);
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(p.id)}
                        className="flex min-h-16 w-full items-center gap-3 py-3 text-left active:opacity-70"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2 text-base font-semibold">
                            {lang === "ko" ? p.nameKo : p.nameId}
                            {p.id === partnerId && entryGrant ? <Badge tone="neutral">{t("share.applied")}</Badge> : null}
                          </span>
                          <span className="mt-0.5 block text-sm text-muted">{t(`share.types.${p.type}`)}</span>
                          {grantFor(p.id) ? <span className="mt-0.5 block text-xs text-brand-purple">{t("share.consented")}</span> : null}
                        </span>
                        <span
                          className={`grid size-7 shrink-0 place-items-center rounded-full transition ${on ? "bg-brand-purple text-white" : "ring-2 ring-line-strong ring-inset"}`}
                        >
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
          <label className="mt-6 flex min-h-14 cursor-pointer items-start gap-3 border-y border-line py-4">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-brand-purple"
            />
            <span className="text-base font-medium">
              {t("share.extraConsent", {
                names: partners
                  .filter((p) => needsConsent.includes(p.id))
                  .map((p) => (lang === "ko" ? p.nameKo : p.nameId))
                  .join(", "),
              })}
            </span>
          </label>
        ) : null}

        <p className="mt-4 text-sm text-muted">{t("share.onlyPicked")}</p>
      </main>

      <BottomBar>
        <Button disabled={!canSubmit} onClick={submit}>
          {picked.size ? t("share.submit", { n: picked.size }) : t("share.pickFirst")}
        </Button>
      </BottomBar>
    </div>
  );
}
