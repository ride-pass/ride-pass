"use client";

// 시연 2단계: +62 휴대폰 번호 입력 (CLAUDE.md 3절). 플랫폼 이름·Google 로그인은 넣지 않는다 (6절).

import { ArrowRight, Lightbulb } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { APP_NAME, LOGO_HEIGHT, LOGO_PATH, LOGO_WIDTH } from "@/config/brand";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { AppHeader } from "@/components/ui/AppHeader";
import { BottomBar } from "@/components/ui/BottomBar";
import { Button } from "@/components/ui/Button";
import { DemoNote } from "@/components/ui/DemoNote";
import { IconTile } from "@/components/ui/IconTile";
import { formatPhoneInput, isValidPhone } from "@/lib/demoLogin";

export default function LoginPage() {
  const t = useT();
  const router = useRouter();
  const { phone, setPhone } = useDemo();

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t("login.header")} />
      <main className="flex flex-col gap-6 px-4 pt-2">
        <Image src={LOGO_PATH} alt={APP_NAME} width={LOGO_WIDTH} height={LOGO_HEIGHT} priority className="h-auto w-40" />
        <div>
          <h2 className="text-2xl font-bold">{t("login.title")}</h2>
          <p className="mt-2 text-base text-muted">{t("login.body")}</p>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold">{t("login.phoneLabel")}</span>
          <span className="flex gap-2">
            <span className="grid place-items-center rounded-2xl bg-surface px-4 text-base font-semibold ring-1 ring-line">
              +62
            </span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder={t("login.placeholder")}
              value={phone}
              onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
              className="min-w-0 flex-1 rounded-2xl bg-surface px-4 py-4 text-lg ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-purple"
            />
          </span>
        </label>

        <div className="flex gap-3 rounded-2xl bg-lavender p-4">
          <IconTile>
            <Lightbulb className="size-5" aria-hidden />
          </IconTile>
          <div>
            <p className="text-sm font-semibold text-brand-purple">{t("login.infoTitle")}</p>
            <p className="mt-1 text-sm text-muted">{t("login.infoBody")}</p>
          </div>
        </div>
      </main>

      <BottomBar>
        <Button
          disabled={!isValidPhone(phone)}
          onClick={() => router.push("/login/verify")}
          icon={<ArrowRight className="size-5" aria-hidden />}
        >
          {t("login.submit")}
        </Button>
        <DemoNote>{t("login.demo")}</DemoNote>
      </BottomBar>
    </div>
  );
}
