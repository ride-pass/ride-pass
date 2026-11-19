"use client";

// 시연 5단계: 수입 명세서 (급여명세서 형식) (CLAUDE.md 3절).
// 기간, 월 순수입, 총매출·수수료·순수입 내역, 활동일, 사용 앱 수, 입금 일치 여부, 렌털 납부 이력, 발급번호·QR.
// 화면에서도 종이 서류처럼 보이게 한 장(sheet)으로 그리고, 「인쇄 · PDF로 저장」으로 그 한 장만 인쇄한다.
// 서류 안에 "시연용 가상 자료" 표시를 반드시 남긴다. 인쇄본이 실제 증명서로 오해받지 않게 한다.
// "급여명세서 발급"이라고 쓰지 않는다 (2-2): 고용 관계가 아니라 기사 본인 자료로 만든 수입 명세서다.

import { CircleCheck, Printer, TriangleAlert } from "lucide-react";
import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { AppHeader } from "@/components/ui/AppHeader";
import { BottomBar } from "@/components/ui/BottomBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { DemoNote } from "@/components/ui/DemoNote";
import { QrCode } from "@/components/ui/QrCode";
import { StepBar } from "@/components/ui/StepBar";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import { APP_NAME, LOGO_HEIGHT, LOGO_PATH, LOGO_WIDTH } from "@/config/brand";
import { getIncomeStatement, getRider } from "@/data/repository";
import type { IncomeStatement } from "@/data/statement";
import type { Rider } from "@/data/types";
import { formatDate, formatRupiah } from "@/lib/format";

export default function IncomeStatementPage() {
  const t = useT();
  const { riderId, lang } = useDemo();
  const [s, setS] = useState<IncomeStatement | null>(null);
  const [rider, setRider] = useState<Rider | null>(null);

  useEffect(() => {
    getIncomeStatement(riderId).then(setS);
    getRider(riderId).then(setRider);
  }, [riderId]);

  if (!s || !rider) return <ScreenSkeleton />;
  const date = (iso: string) => formatDate(iso, lang);

  return (
    <div className="flex flex-1 flex-col">
      <div className="print:hidden">
        <AppHeader title={t("statement.header")} />
        <StepBar current={3} total={4} />
      </div>
      <main className="flex flex-col gap-3 px-4 pb-2 print:p-0">
        <article className="flex flex-col gap-5 rounded-lg bg-surface px-5 py-6 text-sm shadow-[0_1px_3px_rgb(0_0_0/0.08)] ring-1 ring-line print:gap-2.5 print:rounded-none print:p-0 print:text-[12px] print:shadow-none print:ring-0">
          {/* 머리: 발행 서비스와 발급번호 */}
          <header className="flex items-start justify-between gap-3 border-b-2 border-brand-navy pb-3">
            <Image src={LOGO_PATH} alt={APP_NAME} width={LOGO_WIDTH} height={LOGO_HEIGHT} className="h-auto w-24" />
            <span className="text-right text-[11px] text-muted">
              {t("statement.issueNo")}
              <span className="block font-mono text-xs font-semibold text-brand-navy">{s.issueNo}</span>
            </span>
          </header>

          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold">{t("statement.docType")}</h2>
            <p className="text-xs text-muted">{t("statement.period", { start: date(s.periodStart), end: date(s.periodEnd) })}</p>
            <p className="mt-1 w-fit rounded-md bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger">{t("statement.demoStamp")}</p>
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            <Row label={t("statement.infoName")}>{s.riderName}</Row>
            <Row label={t("statement.infoArea")}>{rider.area}</Row>
            <Row label={t("statement.infoApps")}>{s.lines.map((l) => t(`platforms.${l.platform}`)).join(", ")}</Row>
            <Row label={t("statement.issuedAt")}>{date(s.issuedAt)}</Row>
          </dl>

          {/* 핵심 숫자 */}
          <div className="flex items-end justify-between gap-3 rounded-md bg-lavender px-4 py-3 print:py-2">
            <span className="text-xs font-semibold text-brand-purple">{t("statement.monthlyNet")}</span>
            <span className="text-2xl font-bold whitespace-nowrap text-brand-purple tabular-nums">{formatRupiah(s.totals.net)}</span>
          </div>

          {/* 앱별 내역: 급여명세서의 지급·공제 표처럼 */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-muted">{t("statement.breakdownTitle")}</h3>
            <table className="w-full text-sm">
              <tbody>
                {s.lines.map((l) => (
                  <PlatformRows key={l.platform} name={t(`platforms.${l.platform}`)} sub={t("statement.daysTrips", { days: l.days, trips: l.trips })} gross={l.gross} fee={l.fee} net={l.net} />
                ))}
                <tr className="border-t-2 border-brand-navy">
                  <td className="pt-2 text-muted">{t("statement.colGross")}</td>
                  <td className="pt-2 text-right tabular-nums">{formatRupiah(s.totals.gross)}</td>
                </tr>
                <tr>
                  <td className="text-muted">{t("statement.colFee")}</td>
                  <td className="text-right tabular-nums">−{formatRupiah(s.totals.fee)}</td>
                </tr>
                <tr>
                  <td className="pt-1 font-bold">{t("statement.totalNet")}</td>
                  <td className="pt-1 text-right text-base font-bold whitespace-nowrap tabular-nums">{formatRupiah(s.totals.net)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* 확인 항목 */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-muted">{t("statement.checksTitle")}</h3>
            <ul className="flex flex-col divide-y divide-line rounded-md ring-1 ring-line">
              <Check ok label={t("statement.activeDays")} value={t("statement.activeDaysValue", { n: s.activeDays })} />
              <Check ok label={t("statement.platforms")} value={t("statement.platformsValue", { n: s.platformCount })} />
              <Check ok label={t("statement.avg3mLabel")} value={formatRupiah(s.avgMonthlyNet3m)} />
              <Check
                ok={s.depositMatched}
                label={t("statement.deposit")}
                value={s.depositMatched ? t("statement.depositMatched") : t("statement.depositMismatch")}
              />
              <Check
                ok={s.rental !== null}
                neutral={s.rental === null}
                label={t("statement.rental")}
                value={s.rental ? t("statement.rentalValue", { onTime: s.rental.onTime, total: s.rental.total }) : t("statement.rentalNone")}
              />
            </ul>
          </section>

          {/* 발급 표식 */}
          <footer className="flex items-center gap-4 border-t border-line pt-4 print:break-inside-avoid print:pt-2.5 print:[&_[role=img]]:size-20">
            <QrCode value={`TRAILCRED-DEMO:${s.issueNo}`} label={t("statement.qrLabel")} />
            <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-muted">
              {t("statement.basis", { app: APP_NAME })}
              <span className="mt-1 block">{t("statement.demo")}</span>
            </p>
          </footer>
        </article>

        <Button variant="secondary" onClick={() => window.print()} icon={<Printer className="size-5" aria-hidden />} className="print:hidden">
          {t("statement.print")}
        </Button>
      </main>

      <div className="print:hidden">
        <BottomBar>
          <ButtonLink href="/share">{t("statement.next")}</ButtonLink>
          <DemoNote>{t("statement.demo")}</DemoNote>
        </BottomBar>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </>
  );
}

function PlatformRows({ name, sub, gross, fee, net }: { name: string; sub: string; gross: number; fee: number; net: number }) {
  const t = useT();
  return (
    <>
      <tr className="border-t border-line first:border-t-0">
        <td className="pt-2 font-semibold">{name}</td>
        <td className="pt-2 text-right text-xs text-muted">{sub}</td>
      </tr>
      <tr>
        <td className="pl-3 text-muted">{t("statement.colGross")}</td>
        <td className="text-right tabular-nums">{formatRupiah(gross)}</td>
      </tr>
      <tr>
        <td className="pl-3 text-muted">{t("statement.colFee")}</td>
        <td className="text-right tabular-nums">−{formatRupiah(fee)}</td>
      </tr>
      <tr>
        <td className="pb-2 pl-3 text-muted">{t("statement.colNet")}</td>
        <td className="pb-2 text-right font-semibold tabular-nums">{formatRupiah(net)}</td>
      </tr>
    </>
  );
}

function Check({ ok, neutral, label, value }: { ok: boolean; neutral?: boolean; label: string; value: string }) {
  const Icon = ok ? CircleCheck : TriangleAlert;
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2">
      <span className="text-muted">{label}</span>
      <span className={`flex items-center gap-1.5 text-right font-medium ${ok || neutral ? "" : "text-danger"}`}>
        {neutral ? null : <Icon className={`size-4 shrink-0 ${ok ? "text-lime-ink" : "text-danger"}`} aria-hidden />}
        {value}
      </span>
    </li>
  );
}
