"use client";

// 시연 5단계: 수입 명세서 (급여명세서 형식) (CLAUDE.md 3절).
// 기간, 월 순수입, 총매출·수수료·순수입 내역, 활동일, 사용 앱 수, 입금 일치 여부, 렌털 납부 이력, 발급번호·QR.

import { CalendarCheck, CircleCheck, Layers, ReceiptText, TriangleAlert } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { AppHeader } from "@/components/ui/AppHeader";
import { Badge } from "@/components/ui/Badge";
import { BottomBar } from "@/components/ui/BottomBar";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DemoNote } from "@/components/ui/DemoNote";
import { QrCode } from "@/components/ui/QrCode";
import { StepBar } from "@/components/ui/StepBar";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import { APP_NAME } from "@/config/brand";
import { getIncomeStatement } from "@/data/repository";
import type { IncomeStatement } from "@/data/statement";
import { formatDate, formatRupiah } from "@/lib/format";

export default function IncomeStatementPage() {
  const t = useT();
  const { riderId, lang } = useDemo();
  const [s, setS] = useState<IncomeStatement | null>(null);

  useEffect(() => {
    getIncomeStatement(riderId).then(setS);
  }, [riderId]);

  if (!s) return <ScreenSkeleton />;
  const date = (iso: string) => formatDate(iso, lang);

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t("statement.header")} />
      <StepBar current={3} total={4} />
      <main className="flex flex-col gap-4 px-4">
        <Card tone="purple" className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-white/70">{t("statement.docType")}</p>
              <p className="text-lg font-bold">{s.riderName}</p>
              <p className="mt-1 text-xs text-white/70">
                {t("statement.period", { start: date(s.periodStart), end: date(s.periodEnd) })}
              </p>
            </div>
            <Badge tone="lime" icon={<CircleCheck className="size-3.5" aria-hidden />}>
              {t("statement.issued")}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-white/80">{t("statement.monthlyNet")}</p>
            <p className="text-3xl font-bold">{formatRupiah(s.totals.net)}</p>
            <p className="mt-1 text-xs text-white/70">
              {t("statement.avg3m", { amount: formatRupiah(s.avgMonthlyNet3m) })}
            </p>
          </div>
        </Card>

        <Card className="flex flex-col gap-3">
          <p className="flex items-center gap-2 font-semibold">
            <ReceiptText className="size-5 text-brand-purple" aria-hidden />
            {t("statement.breakdownTitle")}
          </p>
          <ul className="flex flex-col divide-y divide-line">
            {s.lines.map((l) => (
              <li key={l.platform} className="flex flex-col gap-1 py-3 first:pt-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">{t(`platforms.${l.platform}`)}</span>
                  <span className="font-bold whitespace-nowrap tabular-nums">{formatRupiah(l.net)}</span>
                </div>
                <div className="flex justify-between gap-3 text-xs text-muted">
                  <span>{t("statement.daysTrips", { days: l.days, trips: l.trips })}</span>
                  <span className="text-right tabular-nums">
                    {t("statement.colGross")} {formatRupiah(l.gross)} · {t("statement.colFee")} −{formatRupiah(l.fee)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-1 rounded-2xl bg-canvas p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-bold">{t("statement.totalNet")}</span>
              <span className="text-lg font-bold whitespace-nowrap text-brand-purple tabular-nums">{formatRupiah(s.totals.net)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted">
              <span>{t("statement.colGross")}</span>
              <span className="tabular-nums">{formatRupiah(s.totals.gross)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted">
              <span>{t("statement.colFee")}</span>
              <span className="tabular-nums">−{formatRupiah(s.totals.fee)}</span>
            </div>
          </div>
        </Card>

        <Card className="grid grid-cols-2 gap-3">
          <Fact icon={<CalendarCheck className="size-5" aria-hidden />} label={t("statement.activeDays")} value={t("statement.activeDaysValue", { n: s.activeDays })} />
          <Fact icon={<Layers className="size-5" aria-hidden />} label={t("statement.platforms")} value={t("statement.platformsValue", { n: s.platformCount })} />
          <Fact
            icon={s.depositMatched ? <CircleCheck className="size-5" aria-hidden /> : <TriangleAlert className="size-5 text-danger" aria-hidden />}
            label={t("statement.deposit")}
            value={s.depositMatched ? t("statement.depositMatched") : t("statement.depositMismatch")}
            danger={!s.depositMatched}
          />
          <Fact
            icon={<CircleCheck className="size-5" aria-hidden />}
            label={t("statement.rental")}
            value={s.rental ? t("statement.rentalValue", { onTime: s.rental.onTime, total: s.rental.total }) : t("statement.rentalNone")}
          />
        </Card>

        <Card className="flex items-center gap-4">
          <QrCode value={`TRAILCRED-DEMO:${s.issueNo}`} label={t("statement.qrLabel")} />
          <dl className="min-w-0 flex-1 text-sm">
            <dt className="text-xs text-muted">{t("statement.issueNo")}</dt>
            <dd className="font-mono font-semibold break-all">{s.issueNo}</dd>
            <dt className="mt-2 text-xs text-muted">{t("statement.issuedAt")}</dt>
            <dd>{date(s.issuedAt)}</dd>
          </dl>
        </Card>

        <p className="px-1 text-xs leading-relaxed text-muted">{t("statement.basis", { app: APP_NAME })}</p>
      </main>

      <BottomBar>
        <ButtonLink href="/share">{t("statement.next")}</ButtonLink>
        <DemoNote>{t("statement.demo")}</DemoNote>
      </BottomBar>
    </div>
  );
}

function Fact({ icon, label, value, danger }: { icon: ReactNode; label: string; value: string; danger?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 rounded-2xl p-3 ${danger ? "bg-danger-soft" : "bg-canvas"}`}>
      <span className="text-brand-purple">{icon}</span>
      <span className="text-xs text-muted">{label}</span>
      <span className={`text-sm font-semibold ${danger ? "text-danger" : ""}`}>{value}</span>
    </div>
  );
}
