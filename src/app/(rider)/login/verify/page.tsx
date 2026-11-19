"use client";

// 시연 2단계: 인증번호 4자리 (더미, 아무 번호나 통과). 번호 끝자리로 시연 인물을 정한다.

import { ArrowRight, Delete, ShieldCheck, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { AppHeader } from "@/components/ui/AppHeader";
import { Button } from "@/components/ui/Button";
import { DemoNote } from "@/components/ui/DemoNote";
import { IconTile } from "@/components/ui/IconTile";
import { APP_NAME } from "@/config/brand";
import { listRiders } from "@/data/repository";
import { riderIdForPhone } from "@/lib/demoLogin";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

export default function VerifyPage() {
  const t = useT();
  const router = useRouter();
  const { phone, setRiderId } = useDemo();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const press = (key: string) => {
    if (key === "del") setCode((c) => c.slice(0, -1));
    else if (key) setCode((c) => (c.length < 4 ? c + key : c));
  };

  const submit = async () => {
    setBusy(true);
    setRiderId(riderIdForPhone(phone, await listRiders()));
    router.push("/consent");
  };

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t("verify.header")} />
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

        <Button disabled={code.length < 4 || busy} onClick={submit} icon={<ArrowRight className="size-5" aria-hidden />}>
          {t("verify.submit")}
        </Button>

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
