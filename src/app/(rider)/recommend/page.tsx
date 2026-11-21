"use client";

// 추천 상품 (하단 탭 「추천」, 2026-11-20 멘토링 뒤 추가). 토스 대출 찾기처럼 내 등급으로 볼 수 있는 상품을 보여 준다.
// 위에서부터: 내 신용도·볼 수 있는 상품 수 → 추천 3개 → 종류별 전체 상품(대출 먼저) → 지금은 어려운 상품.
// CLAUDE.md 2-1: 모두 가상 상품, 금리는 등급별 "예시 금리"만. 한도·승인 가능성·"저금리"는 쓰지 않는다.
// 버튼은 「이곳에 내 자료 보내기」뿐이다(/recommend/send: 그 기관 한 곳에만 동의하고 보낸다). 대출을 이 앱에서 바로 신청시키지 않는다.

import { ArrowRight, ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { AppHeader } from "@/components/ui/AppHeader";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import { TabBar } from "@/components/ui/TabBar";
import { getRiderProductView, type LockedProduct, type ProductOffer, type RiderProductView } from "@/credit/riderView";
import { getRider, listPartners } from "@/data/repository";
import { CATEGORY_ICON, PriceText, useProductText } from "@/components/recommend/ProductParts";
import type { Partner, ProductCategory } from "@/data/types";

const CATEGORIES: ProductCategory[] = ["loan", "installment", "rental", "insurance"];


export default function RecommendPage() {
  const t = useT();
  const { riderId, stage, lang, dataVersion } = useDemo();
  const [view, setView] = useState<RiderProductView | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [firstName, setFirstName] = useState("");
  const [category, setCategory] = useState<ProductCategory>("loan");

  useEffect(() => {
    getRiderProductView(riderId, stage).then(setView);
    listPartners().then(setPartners);
    getRider(riderId).then((r) => setFirstName(r?.displayName.split(" ")[0] ?? ""));
    // dataVersion: 조작판 초기화·재촬영 뒤 다시 읽는다
  }, [riderId, stage, dataVersion]);

  if (!view) return <ScreenSkeleton />;
  const partnerName = (id: string) => {
    const p = partners.find((x) => x.id === id);
    return p ? (lang === "ko" ? p.nameKo : p.nameId) : id;
  };

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t("recommend.title")} back={false} right={<Badge tone="lavender">{t("recommend.badge")}</Badge>} />
      <main className="flex flex-col gap-4 px-4 pt-2 pb-6">
        {view.stage === "A" ? <Card className="text-sm text-muted">{t("recommend.notAvailable")}</Card> : null}

        {view.stage === "C" && view.status === "hold" ? (
          <Card className="flex flex-col gap-2 ring-2 ring-danger">
            <p className="font-semibold">{t("credit.holds.title")}</p>
            <p className="text-sm text-muted">{view.holds.map((h) => t(`credit.holds.${h}`)).join(" · ")}</p>
            <p className="text-sm">{t("recommend.hold")}</p>
            <ButtonLink href="/capture">{t("creditPage.goRetake")}</ButtonLink>
          </Card>
        ) : null}

        {view.stage === "C" && view.status === "scored" ? (
          <>
            <Card tone="purple" className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="lime">{t("credit.badge.pka_licensed_feature")}</Badge>
              </div>
              <p className="text-sm text-white/80">
                {t("recommend.myCredit", { score: view.score, grade: view.grade, gradeName: t(`credit.grades.${view.grade}`) })}
              </p>
              <p className="text-xl leading-snug font-bold">{t("recommend.summary", { n: view.available.length })}</p>
              <p className="text-[11px] leading-relaxed text-white/70">{t("credit.disclaimer")}</p>
            </Card>

            {/* 추천 3개는 카드 3장이 아니라 한 장 안의 순위 목록. 줄마다 「이곳에 내 자료 보내기」 하나 (2-1) */}
            <Card className="flex flex-col gap-1">
              <h2 className="text-lg font-bold">{t("recommend.topTitle", { name: firstName })}</h2>
              <p className="text-sm text-muted">{t("recommend.topBody")}</p>
              <ol className="mt-2 flex flex-col divide-y divide-line">
                {view.top.map((offer, i) => (
                  <TopRow key={offer.product.id} rank={i + 1} offer={offer} grade={view.grade} partner={partnerName(offer.product.partnerId)} />
                ))}
              </ol>
            </Card>

            <Card className="flex flex-col gap-3">
              <h2 className="font-bold">{t("recommend.allTitle")}</h2>
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1" role="tablist">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="tab"
                    aria-selected={category === c}
                    onClick={() => setCategory(c)}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${category === c ? "bg-brand-navy text-white" : "bg-canvas text-muted"}`}
                  >
                    {t(`recommend.categories.${c}`)}
                  </button>
                ))}
              </div>
              <ul className="flex flex-col divide-y divide-line">
                {view.available
                  .filter((o) => o.product.category === category)
                  .map((o) => (
                    <OfferRow key={o.product.id} offer={o} partner={partnerName(o.product.partnerId)} />
                  ))}
              </ul>
              {view.available.every((o) => o.product.category !== category) ? (
                <p className="py-2 text-sm text-muted">{t("recommend.empty")}</p>
              ) : null}
            </Card>

            {view.locked.length ? (
              <Card className="flex flex-col gap-2">
                <h2 className="font-bold">{t("recommend.lockedTitle")}</h2>
                <ul className="flex flex-col divide-y divide-line">
                  {view.locked.map((l) => (
                    <LockedRow key={l.product.id} locked={l} partner={partnerName(l.product.partnerId)} />
                  ))}
                </ul>
                <Link href="/credit" className="flex items-start gap-2 rounded-2xl bg-lavender p-3 text-sm active:bg-lavender-strong">
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-brand-purple">{t("recommend.lockedHow")}</span>
                    {t(`credit.actions.${view.improvement}`)}
                  </span>
                  <ChevronRight className="mt-2 size-4 shrink-0 text-muted" aria-hidden />
                </Link>
              </Card>
            ) : null}

            <p className="px-1 text-xs leading-relaxed text-muted">{t("recommend.disclaimer")}</p>
          </>
        ) : null}
      </main>
      <TabBar />
    </div>
  );
}

function TopRow({ rank, offer, grade, partner }: { rank: number; offer: ProductOffer; grade: string; partner: string }) {
  const t = useT();
  const { name } = useProductText(offer.product);
  const term = offer.product.termMonths;
  return (
    <li className="flex items-start gap-3 py-4">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-navy text-sm font-bold text-white tabular-nums">{rank}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start gap-3">
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted">
              {partner} · {t(`recommend.categories.${offer.product.category}`)}
            </span>
            <span className="block text-base font-bold">{name}</span>
            {term ? <span className="block text-xs text-muted">{t("recommend.term", { min: term[0], max: term[1] })}</span> : null}
          </span>
          <PriceText offer={offer} big />
        </div>
        <p className="text-sm text-muted">
          {t(`recommend.reasons.${offer.reason}`, { g: grade, category: t(`recommend.categories.${offer.product.category}`) })}
        </p>
        <Link
          href={`/recommend/send?product=${offer.product.id}`}
          className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-2xl bg-lavender px-4 text-sm font-semibold text-brand-purple transition active:scale-[0.98] active:bg-lavender-strong"
        >
          {t("recommend.send")}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </li>
  );
}

function OfferRow({ offer, partner }: { offer: ProductOffer; partner: string }) {
  const { name, desc } = useProductText(offer.product);
  const Icon = CATEGORY_ICON[offer.product.category];
  return (
    <li>
      <Link href={`/recommend/send?product=${offer.product.id}`} className="flex items-center gap-3 py-3 active:opacity-70">
        <Icon className="size-5 shrink-0 self-start text-muted" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted">{partner}</span>
          <span className="block text-base font-semibold">{name}</span>
          <span className="block text-sm text-muted">{desc}</span>
        </span>
        <PriceText offer={offer} />
      </Link>
    </li>
  );
}

function LockedRow({ locked, partner }: { locked: LockedProduct; partner: string }) {
  const t = useT();
  const { name } = useProductText(locked.product);
  return (
    <li className="flex items-center gap-3 py-3 opacity-60">
      <Lock className="size-5 shrink-0 text-muted" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted">{partner}</span>
        <span className="block text-base font-semibold">{name}</span>
      </span>
      <span className="shrink-0 text-sm font-semibold text-muted">{t("recommend.lockedGrade", { g: locked.minGrade })}</span>
    </li>
  );
}
