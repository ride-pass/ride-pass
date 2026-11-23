"use client";

// 가상 SLIK 확인서(iDeb) (CLAUDE.md 4-7). OJK 로고·실제 서식을 쓰지 않는다. 위쪽에 "가상 예시"를 표시하고 워터마크를 깐다.

import { useDemo, useT } from "@/components/demo/DemoProvider";
import type { Rider, SlikReport } from "@/data/types";
import { formatDate } from "@/lib/format";
import { SampleWatermark } from "./SampleWatermark";

export function FakeIdebDocument({ report, rider }: { report: SlikReport; rider: Rider }) {
  const t = useT();
  const { lang } = useDemo();
  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface p-4 font-mono text-xs text-brand-navy shadow">
      <SampleWatermark />
      <p className="mb-2 rounded bg-danger-soft px-2 py-1 text-center font-sans font-semibold text-danger">
        {t("samples.fakeLabel")}
      </p>
      <p className="font-sans text-sm font-bold">{t("samples.idebTitle")}</p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-muted">{t("samples.idebName")}</dt>
        <dd>{rider.displayName}</dd>
        <dt className="text-muted">{t("samples.idebDate")}</dt>
        <dd>{formatDate(report.reportDate, lang)}</dd>
        <dt className="text-muted">{t("samples.idebFacilities")}</dt>
        <dd>{report.activeFacilities}</dd>
        <dt className="text-muted">{t("samples.idebWorst")}</dt>
        <dd>
          {report.worstKolektibilitas} · {t(`kolektibilitas.${report.worstKolektibilitas}`)}
        </dd>
      </dl>
    </div>
  );
}
