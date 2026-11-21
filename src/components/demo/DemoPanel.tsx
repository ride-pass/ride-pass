"use client";

// 시연 조작판 (CLAUDE.md 4-8). 주소 뒤에 ?demo=1을 붙이면 화면 구석에 열린다.
// 페르소나 바꾸기, 처음 상태로, 시연 단계로 바로 가기, 보낸 곳 결과 보내기. 허가 단계는 C(PKA 인가 후)로 고정이라 바꾸는 버튼이 없다 (2-4).
// 렌털사 직원 화면은 2026-11-20에 뺐다. 기관이 신청서를 열고 승인하는 장면은 「보낸 곳 결과 보내기」 버튼이 대신한다.

import { BadgeCheck, ChevronDown, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { listApplications, listPartners, listRiders, listShareGrants, recordApplicationView, setApplicationStatus } from "@/data/repository";
import type { Rider } from "@/data/types";
import { newestFirst } from "@/lib/applicationOrder";
import { isActiveGrant } from "@/lib/shareItems";
import { useDemo, useT } from "./DemoProvider";

export const DEMO_STEPS: { step: number; href: string }[] = [
  { step: 1, href: "/partner/apply" },
  { step: 2, href: "/login" },
  { step: 3, href: "/consent" },
  { step: 4, href: "/capture" },
  { step: 5, href: "/certificate" },
  { step: 6, href: "/credit" },
  { step: 7, href: "/recommend" },
  { step: 8, href: "/kur" },
];

export function DemoPanel() {
  const t = useT();
  const router = useRouter();
  const demo = useDemo();
  const [open, setOpen] = useState(false);
  const [riders, setRiders] = useState<Rider[]>([]);
  const dock = useBottomDock(open);

  useEffect(() => {
    listRiders().then(setRiders);
  }, []);

  const go = (href: string) => router.push(href);

  const reset = async () => {
    await demo.reset();
    // 링크 첫 화면과 같은 홈에서 다시 시작한다
    router.push("/home");
  };

  /**
   * 기관 쪽 연출: 지금 기사의 가장 최근 대기 중 신청을 기관이 열어 보고 승인한다. 기사 앱에 알림이 두 개 생긴다.
   * 기사가 철회한 곳(유효한 동의가 없는 곳)은 자료를 볼 수 없으므로 고르지 않는다.
   */
  const [approveNote, setApproveNote] = useState<"done" | "none" | null>(null);
  const approveLatest = async () => {
    const [partners, grants] = await Promise.all([listPartners(), listShareGrants(demo.riderId)]);
    const canSee = new Set(grants.filter((g) => isActiveGrant(g)).map((g) => g.partnerId));
    const apps = (await Promise.all(partners.map((p) => listApplications(p.id))))
      .flat()
      .filter((a) => a.riderId === demo.riderId && a.status === "pending" && canSee.has(a.partnerId))
      // 같은 날 신청은 나중에 만든 것이 먼저 (lib/applicationOrder.ts)
      .sort(newestFirst);
    const latest = apps[0];
    if (!latest) {
      setApproveNote("none");
      return;
    }
    await recordApplicationView(latest.id);
    await setApplicationStatus(latest.id, "approved");
    demo.bumpData();
    setApproveNote("done");
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={dock === null ? undefined : { bottom: dock }}
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
            onClick={() => go(href)}
            title={t(`demo.steps.${step}`)}
            className="rounded-lg bg-white/10 py-1.5 text-xs font-semibold hover:bg-white/20"
          >
            {step}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={approveLatest}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/10 py-2 text-xs font-semibold hover:bg-white/20"
      >
        <BadgeCheck className="size-3.5" aria-hidden />
        {t("demo.approve")}
      </button>
      {approveNote ? <p className="mt-1 text-center text-[11px] text-white/70">{t(`demo.approveNote.${approveNote}`)}</p> : null}

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

/**
 * 휴대폰 폭(768px 미만)에서 접힌 조작판 버튼이 화면 아래 버튼 영역(BottomBar·하단 탭)을 가리지 않게,
 * data-bottom-dock이 붙은 영역의 위쪽 12px 위에 띄운다. 노트북에서는 휴대폰 틀 밖에 있으므로 원래 자리(bottom-28)를 쓴다.
 * 화면마다 데이터를 읽은 뒤에 버튼 영역이 그려지므로, 화면이 바뀌거나 DOM이 바뀔 때마다 다시 잰다.
 */
function useBottomDock(open: boolean): number | null {
  const pathname = usePathname();
  const [dock, setDock] = useState<number | null>(null);
  useEffect(() => {
    if (open) return;
    const narrow = window.matchMedia("(max-width: 767px)");
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!narrow.matches) {
          setDock(null);
          return;
        }
        // 보이는 영역 중 화면 아래 가장자리에 닿아 있는 것만 잰다.
        // Next가 숨겨 둔 이전 화면(높이 0)과 아직 화면 밖에 있는 영역은 빼야 버튼이 위로 튀지 않는다
        const covered = [...document.querySelectorAll<HTMLElement>("[data-bottom-dock]")]
          .map((el) => el.getBoundingClientRect())
          // 아래 여백(시연용 표기 등)을 두고 끝나는 영역도 잡도록 화면 아래 64px 안에서 끝나면 닿은 것으로 본다
          .filter((r) => r.height > 0 && r.top < window.innerHeight && r.bottom >= window.innerHeight - 64)
          .reduce((m, r) => Math.max(m, window.innerHeight - r.top), 0);
        setDock(Math.max(16, Math.round(covered) + 12));
      });
    };
    measure();
    const mo = new MutationObserver(measure);
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    narrow.addEventListener("change", measure);
    return () => {
      cancelAnimationFrame(frame);
      mo.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
      narrow.removeEventListener("change", measure);
    };
  }, [pathname, open]);
  return dock;
}
