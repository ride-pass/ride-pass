"use client";

// 시연 4단계: 앱 안 촬영 화면 + 선택 자료 두 칸 (CLAUDE.md 3절, 4-7).
// 갤러리 업로드는 없다. 촬영 버튼 → 1.5초 "AI가 읽는 중" → 금액·날짜·건수가 채워진다.
// 연출 순서: 프레임 모서리가 정산 화면에 맞춰 잠김 → 셔터 플래시 → 인식 줄이 훑으며 날짜·금액·건수에 차례로 인식 상자
// → 결과 칸이 하나씩 채워지고 인식 신뢰도를 보여 준다. 실제 OCR은 하지 않는다 (CLAUDE.md 5절: 기본은 연출).
// r-rizky: 최신 촬영이 흐려서 재촬영 요청 → 다시 찍으면 통과.
// 2026-11-21 새 디자인 기준(6절): 앱 고르기는 글자 탭 + 보라 밑줄, 선택 자료·찍는 법은 카드·아이콘 타일 없는 구분선 줄,
// 샘플 고르기는 줄 오른쪽의 작은 버튼. 흰 카드는 읽기 결과(또는 재촬영 요청) 하나.

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
import { ScanOverlay, ShutterFlash } from "@/components/capture/ScanOverlay";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { FakeIdebDocument } from "@/components/samples/FakeIdebDocument";
import { FakeSettlementScreen, type SettlementField } from "@/components/samples/FakeSettlementScreen";
import { FakeTelecomBill } from "@/components/samples/FakeTelecomBill";
import { AppHeader } from "@/components/ui/AppHeader";
import { Badge } from "@/components/ui/Badge";
import { BottomBar } from "@/components/ui/BottomBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DemoNote } from "@/components/ui/DemoNote";
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

/** 프레임 모서리가 정산 화면에 맞춰 잠기기까지 */
const LOCK_MS = 700;
/** 읽는 동안 인식 상자가 켜지는 순서와 시각 (합계가 READ_MS 안에 든다) */
const READ_STEPS: { at: number; fields: SettlementField[] }[] = [
  { at: 0, fields: ["date"] },
  { at: 450, fields: ["date", "net"] },
  { at: 900, fields: ["date", "net", "trips"] },
];
const ALL_FIELDS: SettlementField[] = ["date", "net", "trips"];

/** 화면을 떠나면 남은 타이머를 모두 지운다 */
function useScheduler() {
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);
  return useCallback((ms: number, then: () => void) => {
    timers.current.push(window.setTimeout(then, ms));
  }, []);
}

/** 0에서 target까지 숫자가 올라간다. '동작 줄이기' 설정이거나 애니메이션이 멈춰도 끝 값은 반드시 보인다 */
function useCountUp(target: number, ms = 600): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(reduce ? () => setValue(target) : tick);
    const done = window.setTimeout(() => setValue(target), ms + 100);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(done);
    };
  }, [target, ms]);
  return value;
}

export default function CapturePage() {
  const t = useT();
  const router = useRouter();
  const { riderId } = useDemo();
  const schedule = useScheduler();
  const read = useCallback((then: () => void) => schedule(READ_MS, then), [schedule]);
  const [records, setRecords] = useState<RiderRecords | null>(null);
  const [active, setActive] = useState(0);
  const [phases, setPhases] = useState<Record<string, Phase>>({});
  const [slik, setSlik] = useState<DocPhase>("idle");
  const [telecom, setTelecom] = useState<DocPhase>("idle");
  const [grid, setGrid] = useState(false);
  const [front, setFront] = useState(false);
  /** 모서리가 잠긴 촬영 id (화면이 바뀌거나 다시 찍으면 다시 잠근다) */
  const [lockedId, setLockedId] = useState<string | null>(null);
  /** 읽는 중 지금 인식 상자가 켜진 칸 */
  const [reading, setReading] = useState<SettlementField[]>([]);
  const [flashKey, setFlashKey] = useState(0);

  const load = useCallback(() => getRiderRecords(riderId).then(setRecords), [riderId]);
  useEffect(() => {
    load();
  }, [load]);

  // 가장 최근 정산일의 촬영 (두 앱을 쓰면 두 장)
  const captures = records?.captures ?? [];
  const lastDate = captures.reduce((d, c) => (c.periodDate > d ? c.periodDate : d), "");
  const today = captures.filter((c) => c.periodDate === lastDate);
  const capture: SettlementCapture | undefined = today[active];
  const phase: Phase = capture ? (phases[capture.id] ?? "aim") : "aim";

  // 겨누는 중이면 잠시 뒤 모서리가 정산 화면에 맞춰 잠긴다
  const captureId = capture?.id;
  useEffect(() => {
    if (!captureId || phase !== "aim" || lockedId === captureId) return;
    const id = window.setTimeout(() => setLockedId(captureId), LOCK_MS);
    return () => window.clearTimeout(id);
  }, [captureId, phase, lockedId]);

  if (!records) return <ScreenSkeleton />;
  const setPhase = (id: string, p: Phase) => setPhases((s) => ({ ...s, [id]: p }));
  const anyDone = today.some((c) => phases[c.id] === "done");

  const locked = capture !== undefined && lockedId === capture.id;
  const weak = capture !== undefined && capture.ocrConfidence < MIN_CONFIDENCE;

  const shoot = () => {
    if (!capture) return;
    setFlashKey((k) => k + 1);
    setPhase(capture.id, "reading");
    for (const step of READ_STEPS) schedule(step.at, () => setReading(step.fields));
    read(() => setPhase(capture.id, capture.ocrConfidence < MIN_CONFIDENCE ? "blurry" : "done"));
  };

  const retake = async () => {
    if (!capture) return;
    await retakeCapture(capture.id);
    await load();
    setLockedId(null);
    setPhase(capture.id, "aim");
  };

  const highlight: SettlementField[] = phase === "reading" ? reading : phase === "done" || phase === "blurry" ? ALL_FIELDS : [];

  const slikReport = records.slikReports.at(-1);
  const bills = records.telecomBills;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t("capture.header")} />
      <StepBar current={2} total={4} />
      <main className="flex flex-col gap-4 px-4">
        <p className="flex items-start gap-2 text-sm">
          <ImageOff className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <span>
            <span className="font-semibold">{t("capture.inAppOnlyTitle")}</span>
            <span className="text-muted"> · {t("capture.inAppOnlyBody")}</span>
          </span>
        </p>

        {today.length > 1 ? (
          <div className="flex border-b border-line" role="tablist">
            {today.map((c, i) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={i === active}
                onClick={() => setActive(i)}
                className={`-mb-px flex min-h-11 flex-1 items-center justify-center gap-1.5 border-b-2 text-sm font-semibold ${i === active ? "border-brand-purple text-brand-navy" : "border-transparent text-muted"}`}
              >
                {phases[c.id] === "done" ? <CircleCheck className="size-4" aria-hidden /> : null}
                {t(`platforms.${c.platform}`)}
              </button>
            ))}
          </div>
        ) : null}

        {/* 카메라 프레임 */}
        <div className="relative overflow-hidden rounded-3xl bg-brand-navy p-6">
          <FrameCorners locked={locked || phase !== "aim"} />
          <FrameStatus phase={phase} locked={locked} reading={reading} />
          <span className="absolute top-4 right-10 z-10 rounded-full bg-black/40 px-2 py-0.5 text-[11px] text-white">
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
            <div className="relative mt-4">
              <FakeSettlementScreen capture={capture} blurred={weak} highlight={highlight} highlightTone={weak && phase !== "reading" ? "weak" : "ok"} />
              {phase === "reading" ? <ScanOverlay /> : null}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-white/70">{t("capture.noCapture")}</p>
          )}
          {flashKey ? <ShutterFlash key={flashKey} /> : null}
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
          <Card className="flex flex-col gap-3">
            <p className="flex items-center gap-2 font-semibold text-danger">
              <CameraOff className="size-5" aria-hidden />
              {t("capture.blurryTitle")}
            </p>
            <p className="text-sm text-muted">{t("capture.blurryBody")}</p>
            <Confidence value={capture.ocrConfidence} />
            <Button onClick={retake} icon={<RefreshCw className="size-5" aria-hidden />}>
              {t("capture.retake")}
            </Button>
          </Card>
        ) : null}

        {phase === "done" && capture ? <ResultCard key={capture.id} capture={capture} /> : null}

        <section aria-labelledby="capture-optional" className="mt-4">
          <h3 id="capture-optional" className="text-base font-bold">
            {t("capture.optionalTitle")}
          </h3>
          <ul className="mt-1 flex flex-col divide-y divide-line border-b border-line">
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
          </ul>
        </section>

        <section aria-labelledby="capture-guide" className="mt-4 pb-6">
          <h3 id="capture-guide" className="flex items-center gap-2 text-base font-bold">
            <Lightbulb className="size-5 text-muted" aria-hidden />
            {t("capture.guideTitle")}
          </h3>
          <ul className="mt-1 flex flex-col divide-y divide-line">
            {(
              [
                [Sun, "guide1"],
                [Maximize, "guide2"],
                [TriangleAlert, "guide3"],
              ] as [LucideIcon, string][]
            ).map(([Icon, key]) => (
              <li key={key} className="flex gap-3 py-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
                <div>
                  <p className="text-base font-semibold">{t(`capture.${key}Title`)}</p>
                  <p className="text-sm text-muted">{t(`capture.${key}Body`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
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
    <li className="flex flex-col gap-3 py-3">
      <div className="flex items-center gap-3">
        <Icon className="size-5 shrink-0 self-start text-muted" aria-hidden />
        <div className="min-w-0 flex-1">
          {/* 섹션 제목이 이미 「선택 자료」라 줄마다 「선택」 배지는 달지 않는다 */}
          <p className="text-base leading-snug font-semibold">{title}</p>
          <p className="mt-0.5 text-sm text-muted">{available ? body : t("capture.noSample")}</p>
        </div>
        {phase === "idle" ? (
          <button
            type="button"
            disabled={!available}
            onClick={onPick}
            className="min-h-10 shrink-0 rounded-full bg-lavender px-3.5 text-sm font-semibold text-brand-purple transition active:scale-[0.98] disabled:bg-line disabled:text-brand-navy/60"
          >
            {t("capture.pickSample")}
          </button>
        ) : null}
      </div>
      {phase !== "idle" ? (
        <>
          <div className="relative">
            {preview}
            {phase === "reading" ? <ScanOverlay tone="purple" /> : null}
            {phase === "reading" ? (
              <div className="absolute inset-x-0 bottom-3 grid place-items-center text-sm font-semibold text-brand-purple">
                <span className="flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 shadow-sm" role="status">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t("capture.readingDoc")}
                </span>
              </div>
            ) : null}
          </div>
          {phase === "done" ? (
            <p className="flex items-center gap-2 text-sm font-semibold text-lime-ink motion-safe:animate-rise">
              <CircleCheck className="size-4 shrink-0" aria-hidden />
              {result}
            </p>
          ) : null}
        </>
      ) : null}
    </li>
  );
}

/** 프레임 네 모서리. 찾는 중에는 바깥쪽에서 흐리게 깜빡이고, 잠기면 정산 화면 가장자리로 모여 라임색이 된다 */
function FrameCorners({ locked }: { locked: boolean }) {
  const pos = locked ? "12px" : "4px";
  const tone = locked ? "border-brand-lime" : "border-white/40 motion-safe:animate-pulse";
  const base = `absolute size-6 transition-all duration-500 ${tone}`;
  return (
    <>
      <span className={`${base} rounded-tl-xl border-t-4 border-l-4`} style={{ top: pos, left: pos }} aria-hidden />
      <span className={`${base} rounded-tr-xl border-t-4 border-r-4`} style={{ top: pos, right: pos }} aria-hidden />
      <span className={`${base} rounded-bl-xl border-b-4 border-l-4`} style={{ bottom: pos, left: pos }} aria-hidden />
      <span className={`${base} rounded-br-xl border-r-4 border-b-4`} style={{ bottom: pos, right: pos }} aria-hidden />
    </>
  );
}

/** 프레임 왼쪽 위 상태 표시: 찾는 중 → 찾음 → (읽는 중) 날짜 → 금액 → 건수 */
function FrameStatus({ phase, locked, reading }: { phase: Phase; locked: boolean; reading: SettlementField[] }) {
  const t = useT();
  const text =
    phase === "reading"
      ? t(`capture.steps.${reading.at(-1) ?? "date"}`)
      : phase === "done"
        ? t("capture.resultBadge")
        : phase === "blurry"
          ? t("capture.blurryTitle")
          : locked
            ? t("capture.locked")
            : t("capture.searching");
  const tone = phase === "blurry" ? "bg-danger text-white" : locked || phase !== "aim" ? "bg-brand-lime text-lime-ink" : "bg-white/15 text-white";
  return (
    <span role="status" className={`absolute top-4 left-10 z-10 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors ${tone}`}>
      {phase === "reading" ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null}
      {phase === "done" || (phase === "aim" && locked) ? <CircleCheck className="size-3" aria-hidden /> : null}
      {text}
    </span>
  );
}

/** 인식 신뢰도 막대. 기준(70%) 미만이면 경고색 */
function Confidence({ value }: { value: number }) {
  const t = useT();
  const n = Math.round(value * 100);
  const low = value < MIN_CONFIDENCE;
  return (
    <div className="flex flex-col gap-1.5">
      <p className={`flex justify-between text-xs ${low ? "font-semibold text-danger" : "text-muted"}`}>
        <span>{low ? t("capture.confidenceLow", { n, min: Math.round(MIN_CONFIDENCE * 100) }) : t("capture.confidence", { n })}</span>
      </p>
      <span className="relative h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
        <span className={`absolute inset-y-0 left-0 rounded-full ${low ? "bg-danger" : "bg-brand-purple"}`} style={{ width: `${n}%` }} />
        <span className="absolute inset-y-0 w-0.5 bg-brand-navy/40" style={{ left: `${MIN_CONFIDENCE * 100}%` }} />
      </span>
    </div>
  );
}

/** 읽기 결과: 금액은 0부터 올라가고, 칸은 하나씩 나타난다 */
function ResultCard({ capture }: { capture: SettlementCapture }) {
  const t = useT();
  const { lang } = useDemo();
  const net = useCountUp(capture.ocr.netAmount);
  const rows: [string, ReactNode, string?][] = [
    [t("capture.netLabel"), formatRupiah(net), "text-base font-bold text-brand-purple tabular-nums"],
    [t("capture.dateLabel"), formatDate(capture.periodDate, lang)],
    [t("capture.tripsLabel"), t("samples.tripsValue", { n: capture.ocr.tripCount })],
  ];
  return (
    <Card className="flex flex-col gap-3 motion-safe:animate-rise">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-semibold">
          <ScanLine className="size-5 text-brand-purple" aria-hidden />
          {t("capture.resultTitle")}
        </p>
        <Badge tone="lime" icon={<CircleCheck className="size-3.5" aria-hidden />}>
          {t("capture.resultBadge")}
        </Badge>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-y border-line py-3 text-sm">
        {rows.map(([label, value, cls], i) => (
          <div key={label} className="contents">
            <dt className="text-muted motion-safe:animate-rise" style={{ animationDelay: `${i * 90}ms` }}>
              {label}
            </dt>
            <dd className={`text-right motion-safe:animate-rise ${cls ?? ""}`} style={{ animationDelay: `${i * 90}ms` }}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <Confidence value={capture.ocrConfidence} />
      <p className="flex items-start gap-2 text-xs text-muted">
        <ShieldCheck className="size-4 shrink-0 text-lime-ink" aria-hidden />
        {t("capture.matchNote")}
      </p>
    </Card>
  );
}
