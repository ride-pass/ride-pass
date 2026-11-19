"use client";

// 시연 2단계: 인증번호 4자리 (더미, 아무 번호나 통과). 번호 끝자리로 시연 인물을 정한다.
// 실제 앱처럼: 잠시 뒤 가상 인증 문자가 위에 뜨고 「자동 입력」을 누르면 채워진다. 4자리가 차면 저절로 넘어간다.
// 다시 받기는 60초 뒤에 켜진다. 문자는 실제로 보내지 않는다 (CLAUDE.md 5절: 로그인·인증번호는 가짜).

import { ArrowRight, Delete, Loader2, MessageSquare, RotateCw, ShieldCheck, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { AppHeader } from "@/components/ui/AppHeader";
import { Button } from "@/components/ui/Button";
import { DemoNote } from "@/components/ui/DemoNote";
import { IconTile } from "@/components/ui/IconTile";
import { APP_NAME } from "@/config/brand";
import { DEMO_OTP } from "@/config/demo";
import { listRiders } from "@/data/repository";
import { riderIdForPhone } from "@/lib/demoLogin";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;
/** 다시 받기까지 기다리는 초 */
const RESEND_SEC = 60;
/** 가상 인증 문자가 뜨기까지 */
const SMS_DELAY_MS = 1200;
/** 4자리가 찬 뒤 넘어가기까지 (마지막 숫자가 보이도록) */
const AUTO_SUBMIT_MS = 400;

export default function VerifyPage() {
  const t = useT();
  const router = useRouter();
  const { phone, setRiderId } = useDemo();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(RESEND_SEC);
  /** 가상 인증 문자를 받은 횟수 (다시 받기마다 1씩). 0이면 아직 안 옴 */
  const [smsCount, setSmsCount] = useState(0);
  const [smsShown, setSmsShown] = useState(false);
  /** 처음 0, 다시 받기를 누를 때마다 1씩. 바뀌면 가상 인증 문자를 다시 보낸다 */
  const [round, setRound] = useState(0);

  const press = (key: string) => {
    if (busy) return;
    if (key === "del") setCode((c) => c.slice(0, -1));
    else if (key) setCode((c) => (c.length < 4 ? c + key : c));
  };

  const submit = useCallback(async () => {
    setBusy(true);
    setRiderId(riderIdForPhone(phone, await listRiders()));
    router.push("/consent");
  }, [phone, router, setRiderId]);

  // 다시 받기까지 1초씩 줄어든다
  useEffect(() => {
    if (left <= 0) return;
    const id = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [left]);

  // 처음과 다시 받을 때마다 잠시 뒤 가상 인증 문자가 뜬다
  useEffect(() => {
    const id = window.setTimeout(() => {
      setSmsShown(true);
      setSmsCount((n) => n + 1);
    }, SMS_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [round]);

  // 4자리가 차면 저절로 넘어간다
  useEffect(() => {
    if (code.length < 4 || busy) return;
    const id = window.setTimeout(submit, AUTO_SUBMIT_MS);
    return () => window.clearTimeout(id);
  }, [code, busy, submit]);

  const resend = () => {
    setCode("");
    setSmsShown(false);
    setLeft(RESEND_SEC);
    setRound((r) => r + 1);
  };

  const autofill = () => {
    setSmsShown(false);
    setCode(DEMO_OTP);
  };

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t("verify.header")} />
      {smsShown ? (
        <div className="fixed inset-x-0 top-3 z-30 mx-auto w-full max-w-[390px] px-3 md:top-12">
          <div role="status" className="flex items-start gap-3 rounded-2xl bg-surface p-3 shadow-xl ring-1 ring-line motion-safe:animate-toast-in">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-lime-ink text-white">
              <MessageSquare className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 text-sm">
              <span className="flex justify-between text-xs text-muted">
                <span className="font-semibold">{t("verify.smsApp")}</span>
                <span>{t("verify.smsNow")}</span>
              </span>
              <span className="block">{t("verify.smsBody", { app: APP_NAME, code: DEMO_OTP })}</span>
              <span className="block text-[11px] text-muted">{t("verify.smsDemo")}</span>
            </span>
            <button type="button" onClick={autofill} className="self-center rounded-full bg-brand-purple px-3 py-1.5 text-xs font-bold whitespace-nowrap text-white active:scale-95">
              {t("verify.smsFill")}
            </button>
          </div>
        </div>
      ) : null}
      <main className="flex flex-1 flex-col items-center gap-5 px-4 pt-2 pb-6">
        <IconTile size="lg">
          <ShieldCheck className="size-8" aria-hidden />
        </IconTile>
        <div className="text-center">
          <h2 className="text-2xl font-bold">{t("verify.title")}</h2>
          <p className="mt-2 text-[15px] text-muted">{t("verify.body")}</p>
        </div>
        <p className="flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm font-semibold ring-1 ring-line">
          <Smartphone className="size-4 text-brand-purple" aria-hidden />
          +62 {phone || "—"}
          <Link href="/login" className="text-brand-purple">
            {t("verify.change")}
          </Link>
        </p>

        <div className="flex gap-3" aria-label={t("verify.title")}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`grid h-16 w-14 place-items-center rounded-2xl bg-surface text-2xl font-semibold ring-1 ${i === code.length ? "ring-2 ring-brand-purple" : "ring-line"}`}
            >
              {code[i] ?? ""}
            </span>
          ))}
        </div>

        <Button
          disabled={code.length < 4 || busy}
          onClick={submit}
          icon={busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <ArrowRight className="size-5" aria-hidden />}
        >
          {busy ? t("verify.checking") : t("verify.submit")}
        </Button>
        <button
          type="button"
          onClick={resend}
          disabled={left > 0}
          className="-mt-2 flex items-center gap-1.5 text-sm font-semibold text-brand-purple disabled:text-muted"
        >
          <RotateCw className="size-4" aria-hidden />
          {left > 0 ? t("verify.resendIn", { time: `0:${String(left).padStart(2, "0")}` }) : t("verify.resend")}
        </button>
        <span className="sr-only" aria-live="polite">
          {smsCount > 0 ? t("verify.smsArrived") : ""}
        </span>

        <div className="grid w-full grid-cols-3 gap-2 rounded-3xl bg-line/60 p-2">
          {KEYS.map((key, i) =>
            key ? (
              <button
                key={i}
                type="button"
                onClick={() => press(key)}
                aria-label={key === "del" ? t("verify.delete") : key}
                className="grid h-12 place-items-center rounded-xl bg-surface text-xl font-medium active:bg-lavender"
              >
                {key === "del" ? <Delete className="size-5" aria-hidden /> : key}
              </button>
            ) : (
              <span key={i} />
            ),
          )}
        </div>

        <p className="flex gap-2 rounded-2xl bg-surface p-3 text-xs leading-relaxed text-muted ring-1 ring-line">
          <ShieldCheck className="size-4 shrink-0 text-lime-ink" aria-hidden />
          {t("verify.warning", { app: APP_NAME })}
        </p>
        <DemoNote>{t("verify.demo")}</DemoNote>
      </main>
    </div>
  );
}
