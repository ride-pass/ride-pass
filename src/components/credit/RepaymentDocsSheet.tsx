"use client";

// 내 신용 「요인별 상태」의 「상환 이력」을 누르면 여는 창 (2026-11-23).
// 기사가 올린 상환 자료(렌털 납부 내역·SLIK 확인서·통신요금 납부 내역)를 다시 본다. 본인 자료 열람(UU PDP 7조 취지).
// - 서류는 모두 가상 예시다. 「가상 예시」 띠 + 워터마크를 붙인다 (CLAUDE.md 4-7).
// - 내려받기·공유 버튼은 두지 않는다. 화면에 그리기만 한다.
// - SLIK 확인서는 기사가 직접 받아 올린 파일이다. 앱이 OJK에서 조회했다고 쓰지 않는다 (2-2).
// - 신용 계산은 하지 않는다. 원본 기록만 repository에서 읽는다.

import { Bike, ChevronDown, FileText, Smartphone } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { FakeIdebDocument } from "@/components/samples/FakeIdebDocument";
import { FakeRentalStatement } from "@/components/samples/FakeRentalStatement";
import { FakeTelecomBill } from "@/components/samples/FakeTelecomBill";
import { ButtonLink } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { RiderRecords } from "@/data/derive";
import { getRiderRecords, listPartners } from "@/data/repository";
import type { Partner } from "@/data/types";
import type { Lang } from "@/i18n/lang";
import { formatDate } from "@/lib/format";

interface Doc {
  id: string;
  icon: typeof FileText;
  title: string;
  meta: string;
  result: string;
  body: ReactNode;
}

export function RepaymentDocsSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const t = useT();
  const { riderId, lang, dataVersion } = useDemo();
  const [records, setRecords] = useState<RiderRecords | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  // 기사별로 펼친 서류. 기록이 없거나 다른 기사 것이면 첫 서류를 펼친다 ("" = 모두 접음)
  const [expanded, setExpanded] = useState<{ riderId: string; id: string } | null>(null);

  useEffect(() => {
    getRiderRecords(riderId).then(setRecords);
    listPartners().then(setPartners);
  }, [riderId, dataVersion]);

  const docs = records ? collectDocs(records, partners, lang, t) : [];
  const shown = expanded?.riderId === riderId ? expanded.id : (docs[0]?.id ?? null);

  return (
    <Sheet open={open} onClose={onClose} title={t("creditPage.docs.title")}>
      {!records ? null : docs.length === 0 ? (
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-sm text-muted">{t("creditPage.docs.empty")}</p>
          <p className="rounded-3xl bg-lavender p-4 text-base font-medium">{t("credit.actions.ADD_REPAYMENT_RECORDS")}</p>
          <ButtonLink href="/capture">{t("creditPage.docs.goUpload")}</ButtonLink>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">{t("creditPage.docs.intro", { n: docs.length })}</p>
          <ul className="mt-2 flex flex-col divide-y divide-line border-y border-line">
            {docs.map((d) => {
              const isOpen = shown === d.id;
              const Icon = d.icon;
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setExpanded({ riderId, id: isOpen ? "" : d.id })}
                    className="flex min-h-14 w-full items-center gap-3 py-2.5 text-left active:opacity-70"
                  >
                    <Icon className="size-5 shrink-0 text-muted" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{d.title}</span>
                      <span className="block text-xs text-muted">{d.meta}</span>
                      <span className="mt-0.5 block text-xs font-medium">{d.result}</span>
                    </span>
                    <ChevronDown className={`size-5 shrink-0 text-muted transition ${isOpen ? "rotate-180" : ""}`} aria-hidden />
                  </button>
                  {isOpen ? <div className="pb-4">{d.body}</div> : null}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 pb-2 text-[11px] leading-relaxed text-muted">{t("creditPage.docs.note")}</p>
        </>
      )}
    </Sheet>
  );
}

function collectDocs(records: RiderRecords, partners: Partner[], lang: Lang, t: ReturnType<typeof useT>): Doc[] {
  const docs: Doc[] = [];
  const date = (d: string) => formatDate(d, lang);

  // 렌털 납부: 렌털사마다 한 장
  for (const partnerId of [...new Set(records.rentalPayments.map((p) => p.partnerId))]) {
    const payments = records.rentalPayments.filter((p) => p.partnerId === partnerId);
    const partner = partners.find((p) => p.id === partnerId);
    const name = partner ? (lang === "ko" ? partner.nameKo : partner.nameId) : partnerId;
    const onTime = payments.filter((p) => p.paidDate !== null && p.paidDate <= p.dueDate).length;
    docs.push({
      id: `rental-${partnerId}`,
      icon: Bike,
      title: t("creditPage.docs.rental"),
      meta: t("creditPage.docs.rentalMeta", { partner: name, n: payments.length }),
      result: t("statement.rentalValue", { total: payments.length, onTime }),
      body: <FakeRentalStatement payments={payments} partnerName={name} />,
    });
  }

  // SLIK 확인서: 가장 최근 한 장 (4-4)
  const slik = [...records.slikReports].sort((a, b) => b.reportDate.localeCompare(a.reportDate))[0];
  if (slik) {
    docs.push({
      id: `slik-${slik.id}`,
      icon: FileText,
      title: t("creditPage.docs.slik"),
      meta: t("creditPage.docs.slikMeta", { issued: date(slik.reportDate), uploaded: date(slik.uploadedAt) }),
      result: t("capture.slikResult", {
        kol: slik.worstKolektibilitas,
        label: t(`kolektibilitas.${slik.worstKolektibilitas}`),
        n: slik.activeFacilities,
      }),
      body: <FakeIdebDocument report={slik} rider={records.rider} />,
    });
  }

  // 통신요금 납부 내역
  const bills = [...records.telecomBills].sort((a, b) => a.month.localeCompare(b.month));
  if (bills.length) {
    docs.push({
      id: "telecom",
      icon: Smartphone,
      title: t("creditPage.docs.telecom"),
      meta: t("creditPage.docs.telecomMeta", { provider: t("samples.telecomProvider"), from: bills[0].month, to: bills[bills.length - 1].month }),
      result: t("capture.telecomResult", {
        n: bills.length,
        onTime: bills.filter((b) => b.paidDate !== null && b.paidDate <= b.dueDate).length,
      }),
      body: <FakeTelecomBill bills={bills} />,
    });
  }
  return docs;
}
