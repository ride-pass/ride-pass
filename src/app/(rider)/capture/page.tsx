"use client";

// 시연 4단계: 앱 안 촬영 화면 + 선택 자료 두 칸 (CLAUDE.md 3절, 4-7).
// 갤러리 업로드는 없다. 촬영 버튼 → 1.5초 "AI가 읽는 중" → 금액·날짜·건수가 채워진다.
// r-rizky: 최신 촬영이 흐려서 재촬영 요청 → 다시 찍으면 통과.

import {
  Camera,
  CameraOff,
  CircleCheck,
  FileText,
  Grid3x3,
  Lightbulb,
  Loader2,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sun,
  TriangleAlert,
  Maximize,
  ImageOff,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { FakeIdebDocument } from "@/components/samples/FakeIdebDocument";
import { FakeSettlementScreen } from "@/components/samples/FakeSettlementScreen";
import { FakeTelecomBill } from "@/components/samples/FakeTelecomBill";
import { AppHeader } from "@/components/ui/AppHeader";
import { Badge } from "@/components/ui/Badge";
import { BottomBar } from "@/components/ui/BottomBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DemoNote } from "@/components/ui/DemoNote";
import { IconTile } from "@/components/ui/IconTile";
import { StepBar } from "@/components/ui/StepBar";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import type { RiderRecords } from "@/data/derive";
import { getRiderRecords, retakeCapture } from "@/data/repository";
import type { SettlementCapture } from "@/data/types";
import { formatDate, formatRupiah } from "@/lib/format";

/** 읽는 중 연출 시간 (CLAUDE.md 4-7) */
const READ_MS = 1500;
/** 이 값 미만이면 재촬영 요청 (4-3) */
const MIN_CONFIDENCE = 0.7;

type Phase = "aim" | "reading" | "blurry" | "done";
type DocPhase = "idle" | "reading" | "done";

function useReader() {
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);
  return useCallback((then: () => void) => {
    timers.current.push(window.setTimeout(then, READ_MS));
  }, []);
}

export default function CapturePage() {
  const t = useT();
  const router = useRouter();
  const { riderId, lang } = useDemo();
  const read = useReader();
  const [records, setRecords] = useState<RiderRecords | null>(null);
  const [active, setActive] = useState(0);
  const [phases, setPhases] = useState<Record<string, Phase>>({});
  const [slik, setSlik] = useState<DocPhase>("idle");
  const [telecom, setTelecom] = useState<DocPhase>("idle");
  const [grid, setGrid] = useState(false);
  const [front, setFront] = useState(false);

  const load = useCallback(() => getRiderRecords(riderId).then(setRecords), [riderId]);
  useEffect(() => {
    load();
  }, [load]);

  if (!records) return <ScreenSkeleton />;

  // 가장 최근 정산일의 촬영 (두 앱을 쓰면 두 장)
  const lastDate = records.captures.reduce((d, c) => (c.periodDate > d ? c.periodDate : d), "");
  const today = records.captures.filter((c) => c.periodDate === lastDate);
  const capture: SettlementCapture | undefined = today[active];
  const phase: Phase = capture ? (phases[capture.id] ?? "aim") : "aim";
  const setPhase = (id: string, p: Phase) => setPhases((s) => ({ ...s, [id]: p }));
  const anyDone = today.some((c) => phases[c.id] === "done");

  const shoot = () => {
    if (!capture) return;
    setPhase(capture.id, "reading");
    read(() => setPhase(capture.id, capture.ocrConfidence < MIN_CONFIDENCE ? "blurry" : "done"));
  };

  const retake = async () => {
    if (!capture) return;
    await retakeCapture(capture.id);
    await load();
    setPhase(capture.id, "aim");
  };

  const slikReport = records.slikReports.at(-1);
  const bills = records.telecomBills;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t("capture.header")} />
      <StepBar current={2} total={4} />
      <main className="flex flex-col gap-4 px-4">
        <p className="flex items-start gap-3 rounded-2xl bg-surface p-4 text-sm ring-1 ring-line">
          <ImageOff className="mt-0.5 size-5 shrink-0 text-brand-purple" aria-hidden />
          <span>
            <span className="font-semibold">{t("capture.inAppOnlyTitle")}</span>
            <span className="mt-0.5 block text-muted">{t("capture.inAppOnlyBody")}</span>
          </span>
        </p>

        {today.length > 1 ? (
          <div className="flex gap-2" role="tablist">
            {today.map((c, i) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={i === active}
                onClick={() => setActive(i)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold ${i === active ? "bg-brand-purple text-white" : "bg-surface text-muted ring-1 ring-line"}`}
              >
                {phases[c.id] === "done" ? <CircleCheck className="size-4" aria-hidden /> : null}
                {t(`platforms.${c.platform}`)}
              </button>
            ))}
          </div>
        ) : null}

        {/* 카메라 프레임 */}
        <div className="relative overflow-hidden rounded-3xl bg-brand-navy p-6">
          <span className="absolute top-3 left-3 size-6 rounded-tl-xl border-t-4 border-l-4 border-brand-lime" />
          <span className="absolute top-3 right-3 size-6 rounded-tr-xl border-t-4 border-r-4 border-brand-lime" />
          <span className="absolute bottom-3 left-3 size-6 rounded-bl-xl border-b-4 border-l-4 border-brand-lime" />
          <span className="absolute right-3 bottom-3 size-6 rounded-br-xl border-r-4 border-b-4 border-brand-lime" />
          <span className="absolute top-4 right-10 z-10 rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-white">
            {front ? t("capture.frontCam") : t("capture.backCam")}
          </span>
          {grid ? (
            <div className="pointer-events-none absolute inset-6 z-10 grid grid-cols-3 grid-rows-3" aria-hidden>
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i} className="border border-white/30" />
              ))}
            </div>
          ) : null}
          {capture ? (
            <FakeSettlementScreen capture={capture} blurred={capture.ocrConfidence < MIN_CONFIDENCE} />
          ) : (
            <p className="py-10 text-center text-sm text-white/70">{t("capture.noCapture")}</p>
          )}
          {phase === "reading" ? (
            <div className="absolute inset-0 grid place-items-center bg-brand-navy/70 text-white">
              <span className="flex flex-col items-center gap-2 text-sm font-semibold">
                <ScanLine className="size-10 animate-pulse text-brand-lime" aria-hidden />
                {t("capture.reading")}
              </span>
            </div>
          ) : null}
          <p className="mt-4 text-center text-xs text-white/80">{t("capture.frameHint")}</p>
        </div>

        <div className="flex items-center justify-around">
          <button
            type="button"
            aria-pressed={grid}
            onClick={() => setGrid((g) => !g)}
            className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1 text-xs ${grid ? "text-brand-purple" : "text-muted"}`}
          >
            <Grid3x3 className="size-5" aria-hidden />
            {t("capture.grid")}
          </button>
          <button
            type="button"
            onClick={shoot}
            disabled={!capture || phase === "reading" || phase === "done" || phase === "blurry"}
            aria-label={t("capture.shoot")}
            className="grid size-20 place-items-center rounded-full bg-brand-purple text-white ring-8 ring-brand-lime/60 disabled:opacity-40"
          >
            {phase === "reading" ? <Loader2 className="size-8 animate-spin" aria-hidden /> : <Camera className="size-8" aria-hidden />}
          </button>
          <button
            type="button"
            onClick={() => setFront((f) => !f)}
            className="flex flex-col items-center gap-1 rounded-xl px-3 py-1 text-xs text-muted"
          >
            <RefreshCw className="size-5" aria-hidden />
            {t("capture.flip")}
          </button>
        </div>

        {phase === "blurry" && capture ? (
          <Card className="flex flex-col gap-3 ring-2 ring-danger">
            <p className="flex items-center gap-2 font-semibold text-danger">
              <CameraOff className="size-5" aria-hidden />
              {t("capture.blurryTitle")}
            </p>
            <p className="text-sm text-muted">{t("capture.blurryBody")}</p>
            <Button onClick={retake} icon={<RefreshCw className="size-5" aria-hidden />}>
              {t("capture.retake")}
            </Button>
          </Card>
        ) : null}

        {phase === "done" && capture ? (
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 font-semibold">
                <ScanLine className="size-5 text-brand-purple" aria-hidden />
                {t("capture.resultTitle")}
              </p>
              <Badge tone="lime" icon={<CircleCheck className="size-3.5" aria-hidden />}>
                {t("capture.resultBadge")}
              </Badge>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl bg-canvas p-4 text-sm">
              <dt className="text-muted">{t("capture.netLabel")}</dt>
              <dd className="text-right text-base font-bold text-brand-purple">{formatRupiah(capture.ocr.netAmount)}</dd>
              <dt className="text-muted">{t("capture.dateLabel")}</dt>
              <dd className="text-right">{formatDate(capture.periodDate, lang)}</dd>
              <dt className="text-muted">{t("capture.tripsLabel")}</dt>
              <dd className="text-right">{t("samples.tripsValue", { n: capture.ocr.tripCount })}</dd>
            </dl>
            <p className="flex items-start gap-2 text-xs text-muted">
              <ShieldCheck className="size-4 shrink-0 text-lime-ink" aria-hidden />
              {t("capture.matchNote")}
            </p>
          </Card>
        ) : null}

        <section className="flex flex-col gap-2">
          <h3 className="px-1 text-sm font-semibold text-muted">{t("capture.optionalTitle")}</h3>
          <OptionalDoc
            icon={FileText}
            title={t("capture.slikTitle")}
            body={t("capture.slikBody")}
            available={Boolean(slikReport)}
            phase={slik}
            onPick={() => {
              setSlik("reading");
              read(() => setSlik("done"));
            }}
            preview={slikReport ? <FakeIdebDocument report={slikReport} rider={records.rider} /> : null}
            result={
              slikReport
                ? t("capture.slikResult", {
                    kol: slikReport.worstKolektibilitas,
                    label: t(`kolektibilitas.${slikReport.worstKolektibilitas}`),
                    n: slikReport.activeFacilities,
                  })
                : ""
            }
          />
          <OptionalDoc
            icon={Smartphone}
            title={t("capture.telecomTitle")}
            body={t("capture.telecomBody")}
            available={bills.length > 0}
            phase={telecom}
            onPick={() => {
              setTelecom("reading");
              read(() => setTelecom("done"));
            }}
            preview={bills.length ? <FakeTelecomBill bills={bills} /> : null}
            result={t("capture.telecomResult", {
              n: bills.length,
              onTime: bills.filter((b) => b.paidDate !== null && b.paidDate <= b.dueDate).length,
            })}
          />
        </section>

        <Card className="flex flex-col gap-3">
          <p className="flex items-center gap-2 font-semibold">
            <Lightbulb className="size-5 text-brand-purple" aria-hidden />
            {t("capture.guideTitle")}
          </p>
          {(
            [
              [Sun, "guide1"],
              [Maximize, "guide2"],
              [TriangleAlert, "guide3"],
            ] as [LucideIcon, string][]
          ).map(([Icon, key]) => (
            <div key={key} className="flex gap-3">
              <IconTile>
                <Icon className="size-5" aria-hidden />
              </IconTile>
              <div>
                <p className="text-sm font-semibold">{t(`capture.${key}Title`)}</p>
                <p className="text-sm text-muted">{t(`capture.${key}Body`)}</p>
              </div>
            </div>
          ))}
        </Card>
      </main>

      <BottomBar>
        <Button disabled={!anyDone} onClick={() => router.push("/certificate")}>
          {t("capture.next")}
        </Button>
        <DemoNote>{t("capture.demo")}</DemoNote>
      </BottomBar>
    </div>
  );
}

function OptionalDoc(props: {
  icon: LucideIcon;
  title: string;
  body: string;
  available: boolean;
  phase: DocPhase;
  onPick(): void;
  preview: ReactNode;
  result: string;
}) {
  const t = useT();
  const { icon: Icon, title, body, available, phase, onPick, preview, result } = props;
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <IconTile>
          <Icon className="size-5" aria-hidden />
        </IconTile>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-semibold">
            {title}
            <Badge tone="neutral">{t("capture.optional")}</Badge>
          </p>
          <p className="mt-0.5 text-sm text-muted">{available ? body : t("capture.noSample")}</p>
        </div>
      </div>
      {phase === "idle" ? (
        <Button variant="secondary" disabled={!available} onClick={onPick}>
          {t("capture.pickSample")}
        </Button>
      ) : (
        <>
          <div className="relative">
            {preview}
            {phase === "reading" ? (
              <div className="absolute inset-0 grid place-items-center rounded-2xl bg-surface/80 text-sm font-semibold text-brand-purple">
                <span className="flex items-center gap-2">
                  <Loader2 className="size-5 animate-spin" aria-hidden />
                  {t("capture.readingDoc")}
                </span>
              </div>
            ) : null}
          </div>
          {phase === "done" ? (
            <p className="flex items-center gap-2 rounded-xl bg-lavender p-3 text-sm font-semibold text-brand-purple">
              <CircleCheck className="size-4 shrink-0" aria-hidden />
              {result}
            </p>
          ) : null}
        </>
      )}
    </Card>
  );
}
