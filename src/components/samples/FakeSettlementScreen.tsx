"use client";

// 가상 앱의 정산 화면 (CLAUDE.md 4-7). 실제 앱 화면을 캡처해서 쓰지 않는다.
// "호출 앱 A" 같은 가상 브랜드로 SettlementCapture 한 건을 그린다. blurred면 흐리게 (r-rizky 장면).
// highlight: 촬영 화면의 "AI가 읽는 중" 연출에서 지금 읽고 있는 칸(날짜·금액·건수)에 인식 상자를 그린다.

import { Star } from "lucide-react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import type { PlatformId, SettlementCapture } from "@/data/types";
import { formatDate, formatRupiah } from "@/lib/format";

const APP_BG: Record<PlatformId, string> = {
  ride_app_a: "bg-platform-a",
  delivery_app_b: "bg-platform-b",
  ride_app_c: "bg-platform-c",
};

export type SettlementField = "date" | "net" | "trips";

interface Props {
  capture: SettlementCapture;
  blurred?: boolean;
  /** 인식 상자를 그릴 칸 */
  highlight?: SettlementField[];
  /** 인식 상자 색: ok = 라임(읽음), weak = 경고(흐려서 못 읽음) */
  highlightTone?: "ok" | "weak";
}

export function FakeSettlementScreen({ capture, blurred = false, highlight = [], highlightTone = "ok" }: Props) {
  const box = (field: SettlementField) =>
    highlight.includes(field)
      ? `rounded-md outline-2 outline-offset-2 transition-[outline-color] ${highlightTone === "ok" ? "outline-brand-lime" : "outline-danger"}`
      : "outline-0";
  const t = useT();
  const { lang } = useDemo();
  const { ocr } = capture;
  return (
    <div className={`overflow-hidden rounded-2xl bg-surface text-brand-navy shadow-lg transition ${blurred ? "blur-[3px] saturate-50" : ""}`}>
      <div className={`${APP_BG[capture.platform]} px-4 py-3 text-white`}>
        <p className="text-xs opacity-80">{t("samples.fakeLabel")}</p>
        <p className="text-base font-bold">{t(`platforms.${capture.platform}`)}</p>
      </div>
      <div className="px-4 py-3">
        <p className={`w-fit text-xs text-muted ${box("date")}`}>
          {t("samples.settlementOf")} · {formatDate(capture.periodDate, lang)}
        </p>
        <p className={`mt-1 w-fit text-2xl font-bold ${box("net")}`}>{formatRupiah(ocr.netAmount)}</p>
        <dl className="mt-3 grid grid-cols-2 gap-y-1 text-xs">
          <dt className="text-muted">{t("samples.gross")}</dt>
          <dd className="text-right">{formatRupiah(ocr.grossAmount)}</dd>
          <dt className="text-muted">{t("samples.fee")}</dt>
          <dd className="text-right">−{formatRupiah(ocr.platformFee)}</dd>
          <dt className="text-muted">{t("samples.trips")}</dt>
          <dd className={`justify-self-end ${box("trips")}`}>{t("samples.tripsValue", { n: ocr.tripCount })}</dd>
          {ocr.rating !== undefined ? (
            <>
              <dt className="text-muted">{t("samples.rating")}</dt>
              <dd className="flex items-center justify-end gap-1">
                <Star className="size-3 fill-current" aria-hidden />
                {ocr.rating.toFixed(1)}
              </dd>
            </>
          ) : null}
        </dl>
      </div>
    </div>
  );
}
