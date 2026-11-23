"use client";

// 시연 2단계 앞부분: 온보딩 3장. 문구는 CLAUDE.md 6절 표대로 Figma에서 바꾼다.
// 사진 대신 아이콘 일러스트를 쓴다 (실존 인물 사진 금지, 2-3).
// 2026-11-23: 처음 보는 사람이 "일한 기록 → 신용도"를 바로 읽도록 1장 칩은 슬로건(brand.ts SLOGAN), 3장은 신용도·대출까지 말한다.

import { ArrowRight, Bike, FileCheck2, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { LangToggle } from "@/components/demo/LangToggle";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SLOGAN } from "@/config/brand";

const SLIDES: { key: string; art: ReactNode }[] = [
  { key: "slide1", art: <Bike className="size-24" strokeWidth={1.5} aria-hidden /> },
  { key: "slide2", art: <Lock className="size-24" strokeWidth={1.5} aria-hidden /> },
  { key: "slide3", art: <FileCheck2 className="size-24" strokeWidth={1.5} aria-hidden /> },
];

export default function OnboardingPage() {
  const t = useT();
  const { lang } = useDemo();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  return (
    <div className="flex flex-1 flex-col px-4 pt-4 pb-6">
      <div className="flex items-center justify-between">
        <LangToggle />
        <Link href="/login" className="text-sm text-muted">
          {t("common.skip")}
        </Link>
      </div>

      <div className="mt-8 grid aspect-square place-items-center rounded-[40px] bg-lavender text-brand-purple">
        <span className="relative grid size-44 place-items-center rounded-full bg-surface">
          {slide.art}
          <span className="absolute -top-1 -right-1 grid size-10 place-items-center rounded-full bg-brand-lime text-lime-ink">
            <Sparkles className="size-5" aria-hidden />
          </span>
        </span>
      </div>

      <div className="mt-6 flex justify-center gap-2" aria-hidden>
        {SLIDES.map((s, i) => (
          <span key={s.key} className={`h-2 rounded-full transition-all ${i === index ? "w-8 bg-brand-purple" : "w-2 bg-lavender-strong"}`} />
        ))}
      </div>

      <div className="mt-6 flex flex-col items-center gap-3 text-center">
        <Badge tone="lime">{slide.key === "slide1" ? SLOGAN[lang] : t(`onboarding.${slide.key}Chip`)}</Badge>
        <h1 className="text-2xl leading-snug font-bold">{t(`onboarding.${slide.key}Title`)}</h1>
        <p className="text-base leading-relaxed text-muted">{t(`onboarding.${slide.key}Body`)}</p>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-8">
        {last ? (
          <ButtonLink href="/login" icon={<ArrowRight className="size-5" aria-hidden />}>
            {t("common.start")}
          </ButtonLink>
        ) : (
          <Button onClick={() => setIndex(index + 1)} icon={<ArrowRight className="size-5" aria-hidden />}>
            {t("common.next")}
          </Button>
        )}
        {index > 0 ? (
          <Button variant="ghost" onClick={() => setIndex(index - 1)}>
            {t("common.prev")}
          </Button>
        ) : (
          <p className="py-3 text-center text-sm text-muted">
            {t("onboarding.haveAccount")}{" "}
            <Link href="/login" className="font-semibold text-brand-purple underline underline-offset-4">
              {t("onboarding.login")}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
