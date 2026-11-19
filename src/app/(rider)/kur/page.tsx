"use client";

// 시연 8단계: KUR(정부 소상공인 대출) 신청 조건 체크리스트 (CLAUDE.md 3절).
// 충족 여부만 보여 준다. 금리·한도 숫자, 신청 버튼, 승인 여부는 보여 주지 않는다 (2-1). 신청과 승인은 은행이 한다.

import { CircleCheck, CircleHelp, CircleX, FileText, Landmark, TriangleAlert, Upload, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { AppHeader } from "@/components/ui/AppHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TabBar } from "@/components/ui/TabBar";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import { buildKurChecklist, kurSummary, type KurGroup, type KurItem, type KurStatus } from "@/data/kur";
import { getRiderMetrics, getRiderRecords } from "@/data/repository";

const STATUS: Record<KurStatus, { icon: LucideIcon; color: string }> = {
  met: { icon: CircleCheck, color: "text-lime-ink" },
  partial: { icon: TriangleAlert, color: "text-brand-purple" },
  unmet: { icon: CircleX, color: "text-danger" },
  needs_upload: { icon: Upload, color: "text-brand-purple" },
  check_with_bank: { icon: Landmark, color: "text-muted" },
  prepare: { icon: FileText, color: "text-muted" },
};

const GROUPS: KurGroup[] = ["auto", "bank", "document"];

export default function KurPage() {
  const t = useT();
  const { riderId, dataVersion } = useDemo();
  const [items, setItems] = useState<KurItem[] | null>(null);
  const [hasSlikSample, setHasSlikSample] = useState(false);

  useEffect(() => {
    getRiderMetrics(riderId).then((m) => setItems(m ? buildKurChecklist(m) : []));
    // 가상 SLIK 샘플이 있는 인물만 "올리러 가기"를 보여 준다 (없는 인물은 눌러도 올릴 게 없다)
    getRiderRecords(riderId).then((r) => setHasSlikSample(Boolean(r?.slikReports.length)));
    // dataVersion: 조작판 초기화 뒤 다시 읽는다
  }, [riderId, dataVersion]);

  if (!items) return <ScreenSkeleton />;
  const summary = kurSummary(items);
  const needsUpload = items.some((i) => i.status === "needs_upload");

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t("kur.header")} back="/home" />
      <main className="flex flex-col gap-4 px-4 pt-2 pb-6">
        <Card tone="purple" className="flex flex-col gap-2">
          <p className="text-sm text-white/80">{t("kur.subtitle")}</p>
          <p className="text-2xl font-bold">{t("kur.summary", { met: summary.met, total: summary.total })}</p>
          <p className="text-xs leading-relaxed text-white/70">{t("kur.bankDecides")}</p>
        </Card>

        {GROUPS.map((group) => (
          <Card key={group} className="flex flex-col gap-3">
            <div>
              <p className="font-semibold">{t(`kur.groups.${group}.title`)}</p>
              <p className="mt-0.5 text-xs text-muted">{t(`kur.groups.${group}.body`)}</p>
            </div>
            <ul className="flex flex-col gap-2">
              {items
                .filter((i) => i.group === group)
                .map((item) => {
                  const s = STATUS[item.status];
                  const Icon = s.icon;
                  return (
                    <li key={item.id} className="flex gap-3 rounded-2xl bg-canvas p-3">
                      <Icon className={`mt-0.5 size-5 shrink-0 ${s.color}`} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{t(`kur.items.${item.id}.title`)}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted">
                          {group === "auto"
                            ? t(`kur.items.${item.id}.${item.status}`, item.vars)
                            : t(`kur.items.${item.id}.body`)}
                        </p>
                      </div>
                      <span className={`shrink-0 text-xs font-semibold ${s.color}`}>{t(`kur.status.${item.status}`)}</span>
                    </li>
                  );
                })}
            </ul>
          </Card>
        ))}

        {needsUpload && hasSlikSample ? (
          <ButtonLink href="/capture" variant="secondary" icon={<Upload className="size-5" aria-hidden />}>
            {t("kur.toUpload")}
          </ButtonLink>
        ) : null}
        <p className="flex gap-2 px-1 text-xs leading-relaxed text-muted">
          <CircleHelp className="size-4 shrink-0" aria-hidden />
          {t("kur.sourceNote")}
        </p>
      </main>
      <TabBar />
    </div>
  );
}
