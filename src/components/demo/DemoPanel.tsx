"use client";

// 시연 조작판 (CLAUDE.md 4-8). 주소 뒤에 ?demo=1을 붙이면 화면 구석에 열린다.
// 페르소나 바꾸기, 처음 상태로, 시연 단계로 바로 가기. 허가 단계는 C(PKA 인가 후)로 고정이라 바꾸는 버튼이 없다 (2-4).

import { ChevronDown, Columns2, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createShareGrant, listRiders, listShareGrants, submitApplication } from "@/data/repository";
import type { Rider } from "@/data/types";
import { ENTRY_PARTNER_ID, useDemo, useT } from "./DemoProvider";

export const DEMO_STEPS: { step: number; href: string }[] = [
  { step: 1, href: "/partner/apply" },
  { step: 2, href: "/login" },
  { step: 3, href: "/consent" },
  { step: 4, href: "/capture" },
  { step: 5, href: "/certificate" },
  { step: 6, href: "/credit" },
  { step: 7, href: "/partner/applicants" },
  { step: 8, href: "/kur" },
];

/** 분할 보기 화면 주소. 왼쪽 기사 폰, 오른쪽 렌털사 화면 */
export const SPLIT_PATH = "/demo/split";

export function DemoPanel() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const demo = useDemo();
  const inSplit = pathname === SPLIT_PATH;
  const [open, setOpen] = useState(false);
  const [riders, setRiders] = useState<Rider[]>([]);

  useEffect(() => {
    listRiders().then(setRiders);
  }, []);

  /** 7단계로 바로 갈 때: 지금 기사가 렌털사 A에 아직 안 냈으면 공유·신청을 넣어 둔다 */
  const ensureSubmitted = async () => {
    const grants = await listShareGrants(demo.riderId);
    const has = grants.some((g) => g.partnerId === ENTRY_PARTNER_ID && g.revokedAt === null);
    if (!has) {
      await createShareGrant({
        riderId: demo.riderId,
        partnerId: ENTRY_PARTNER_ID,
        items: ["income", "activity", "rental_history", "slik_report", "telecom_bills"],
      });
    }
    await submitApplication(demo.riderId, ENTRY_PARTNER_ID);
    demo.bumpData();
  };

  // 분할 보기에서는 이 화면을 떠나지 않고 해당 쪽 iframe만 옮긴다 (7단계는 렌털사 쪽, 나머지는 기사 폰)
  const go = async (step: number, href: string) => {
    if (step === 7) await ensureSubmitted();
    if (inSplit) demo.navigateFrame(step === 7 ? "partner" : "rider", href);
    else router.push(href);
  };

  const reset = async () => {
    await demo.reset();
    if (inSplit) {
      demo.navigateFrame("rider", "/partner/apply");
      demo.navigateFrame("partner", "/partner/applicants");
    } else router.push("/partner/apply");
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-28 z-50 flex items-center gap-1.5 print:hidden rounded-full bg-brand-navy px-3 py-2 text-xs font-semibold text-white shadow-lg"
      >
        <SlidersHorizontal className="size-4" aria-hidden />
        {t("demo.open")}
      </button>
    );
  }

  return (
    <aside
      aria-label={t("demo.title")}
      className="fixed right-4 bottom-28 z-50 w-72 print:hidden rounded-3xl bg-brand-navy p-4 text-sm text-white shadow-2xl"
    >
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 font-bold">
          <SlidersHorizontal className="size-4" aria-hidden />
          {t("demo.title")}
        </p>
        <button type="button" onClick={() => setOpen(false)} aria-label={t("demo.close")} className="rounded-full p-1 hover:bg-white/10">
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <p className="mt-3 text-xs text-white/60">{t("demo.persona")}</p>
      <label className="relative mt-1 block">
        <select
          value={demo.riderId}
          onChange={(e) => demo.setRiderId(e.target.value)}
          className="w-full appearance-none rounded-xl bg-white/10 px-3 py-2 pr-8"
        >
          {riders.map((r) => (
            <option key={r.id} value={r.id} className="text-brand-navy">
              {r.displayName} · {t(`demo.scenes.${r.id}`)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-2.5 right-2 size-4" aria-hidden />
      </label>

      <p className="mt-3 text-xs text-white/60">{t("demo.jump")}</p>
      <div className="mt-1 grid grid-cols-4 gap-1">
        {DEMO_STEPS.map(({ step, href }) => (
          <button
            key={step}
            type="button"
            onClick={() => go(step, href)}
            title={t(`demo.steps.${step}`)}
            className="rounded-lg bg-white/10 py-1.5 text-xs font-semibold hover:bg-white/20"
          >
            {step}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => router.push(inSplit ? "/home" : SPLIT_PATH)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/10 py-2 text-xs font-semibold hover:bg-white/20"
      >
        <Columns2 className="size-3.5" aria-hidden />
        {inSplit ? t("demo.splitExit") : t("demo.split")}
      </button>

      <button
        type="button"
        onClick={reset}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/10 py-2 text-xs font-semibold hover:bg-white/20"
      >
        <RotateCcw className="size-3.5" aria-hidden />
        {t("demo.reset")}
      </button>
    </aside>
  );
}
