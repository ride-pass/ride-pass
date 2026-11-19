"use client";

// 가상 앱의 정산 화면 (CLAUDE.md 4-7). 실제 앱 화면을 캡처해서 쓰지 않는다.
// "호출 앱 A" 같은 가상 브랜드로 SettlementCapture 한 건을 그린다. blurred면 흐리게 (r-rizky 장면).

import { Star } from "lucide-react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import type { PlatformId, SettlementCapture } from "@/data/types";
import { formatDate, formatRupiah } from "@/lib/format";

const APP_BG: Record<PlatformId, string> = {
  ride_app_a: "bg-platform-a",
  delivery_app_b: "bg-platform-b",
  ride_app_c: "bg-platform-c",
};

export function FakeSettlementScreen({ capture, blurred = false }: { capture: SettlementCapture; blurred?: boolean }) {
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
        <p className="text-xs text-muted">
          {t("samples.settlementOf")} · {formatDate(capture.periodDate, lang)}
        </p>
        <p className="mt-1 text-2xl font-bold">{formatRupiah(ocr.netAmount)}</p>
        <dl className="mt-3 grid grid-cols-2 gap-y-1 text-xs">
          <dt className="text-muted">{t("samples.gross")}</dt>
          <dd className="text-right">{formatRupiah(ocr.grossAmount)}</dd>
          <dt className="text-muted">{t("samples.fee")}</dt>
          <dd className="text-right">−{formatRupiah(ocr.platformFee)}</dd>
          <dt className="text-muted">{t("samples.trips")}</dt>
          <dd className="text-right">{t("samples.tripsValue", { n: ocr.tripCount })}</dd>
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
