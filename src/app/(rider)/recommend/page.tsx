"use client";

// 추천 상품 (하단 탭 「추천」, 2026-11-20 멘토링 뒤 추가). 토스 대출 찾기처럼 내 등급으로 볼 수 있는 상품을 보여 준다.
// 위에서부터: 내 신용도·볼 수 있는 상품 수 → 추천 3개 → 종류별 전체 상품(대출 먼저) → 지금은 어려운 상품.
// CLAUDE.md 2-1: 모두 가상 상품, 금리는 등급별 "예시 금리"만. 한도·승인 가능성·"저금리"는 쓰지 않는다.
// 버튼은 「이곳에 내 자료 보내기」뿐이다(제출할 곳 고르기로 간다). 대출을 이 앱에서 바로 신청시키지 않는다.

import { Bike, ChevronRight, CreditCard, Landmark, Lock, Shield, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { AppHeader } from "@/components/ui/AppHeader";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconTile } from "@/components/ui/IconTile";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import { TabBar } from "@/components/ui/TabBar";
import { getRiderProductView, type LockedProduct, type ProductOffer, type RiderProductView } from "@/credit/riderView";
import { getRider, listPartners } from "@/data/repository";
import type { Partner, ProductCategory, Product } from "@/data/types";
import { formatRupiah } from "@/lib/format";

const CATEGORIES: ProductCategory[] = ["loan", "installment", "rental", "insurance"];

const CATEGORY_ICON: Record<ProductCategory, LucideIcon> = {
  loan: Landmark,
  installment: CreditCard,
  rental: Bike,
  insurance: Shield,
};

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
                <span className="rounded-lg bg-brand-lime px-2 py-0.5 text-[11px] font-semibold text-lime-ink">
                  {t("credit.badge.pka_licensed_feature")}
                </span>
              </div>
              <p className="text-sm text-white/80">
                {t("recommend.myCredit", { score: view.score, grade: view.grade, gradeName: t(`credit.grades.${view.grade}`) })}
              </p>
              <p className="text-xl leading-snug font-bold">{t("recommend.summary", { n: view.available.length })}</p>
              <p className="text-[11px] leading-relaxed text-white/70">{t("credit.disclaimer")}</p>
            </Card>

            <section className="flex flex-col gap-2">
              <div className="px-1">
                <h2 className="text-lg font-bold">{t("recommend.topTitle", { name: firstName })}</h2>
                <p className="text-xs text-muted">{t("recommend.topBody")}</p>
              </div>
              <ol className="flex flex-col gap-2">
                {view.top.map((offer, i) => (
                  <TopCard key={offer.product.id} rank={i + 1} offer={offer} grade={view.grade} partner={partnerName(offer.product.partnerId)} />
                ))}
              </ol>
            </section>

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

function useProductText(product: Product) {
  const t = useT();
  return { name: t(`products.${product.id}.name`), desc: t(`products.${product.id}.desc`) };
}

/** 예시 금리 또는 예시 가격 한 줄 */
function PriceText({ offer, big = false }: { offer: ProductOffer; big?: boolean }) {
  const t = useT();
  const { product, rate } = offer;
  const label = rate !== null ? t("recommend.exampleRate") : t(`recommend.priceLabel.${product.examplePrice?.per ?? "day"}`);
  const value =
    rate !== null
      ? t("recommend.rate", { r: rate })
      : product.examplePrice
        ? t(`recommend.price.${product.examplePrice.per}`, { amount: formatRupiah(product.examplePrice.amount) })
        : "";
  return (
    <span className="flex flex-col items-end text-right">
      <span className="text-[11px] text-muted">{label}</span>
      <span className={`font-bold whitespace-nowrap text-brand-purple tabular-nums ${big ? "text-lg" : "text-sm"}`}>{value}</span>
    </span>
  );
}

function TopCard({ rank, offer, grade, partner }: { rank: number; offer: ProductOffer; grade: string; partner: string }) {
  const t = useT();
  const { name } = useProductText(offer.product);
  const term = offer.product.termMonths;
  return (
    <li>
      <Card className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-navy text-sm font-bold text-white">{rank}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted">
              {partner} · {t(`recommend.categories.${offer.product.category}`)}
            </span>
            <span className="block font-bold">{name}</span>
            {term ? <span className="block text-xs text-muted">{t("recommend.term", { min: term[0], max: term[1] })}</span> : null}
          </span>
          <PriceText offer={offer} big />
        </div>
        <p className="rounded-xl bg-canvas px-3 py-2 text-xs">
          {t(`recommend.reasons.${offer.reason}`, { g: grade, category: t(`recommend.categories.${offer.product.category}`) })}
        </p>
        <ButtonLink href={`/share?partner=${offer.product.partnerId}`} variant="secondary">
          {t("recommend.send")}
        </ButtonLink>
      </Card>
    </li>
  );
}

function OfferRow({ offer, partner }: { offer: ProductOffer; partner: string }) {
  const { name, desc } = useProductText(offer.product);
  const Icon = CATEGORY_ICON[offer.product.category];
  return (
    <li>
      <Link href={`/share?partner=${offer.product.partnerId}`} className="flex items-center gap-3 py-3 active:opacity-70">
        <IconTile>
          <Icon className="size-5" aria-hidden />
        </IconTile>
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted">{partner}</span>
          <span className="block text-sm font-semibold">{name}</span>
          <span className="block text-xs text-muted">{desc}</span>
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
      <IconTile>
        <Lock className="size-5" aria-hidden />
      </IconTile>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted">{partner}</span>
        <span className="block text-sm font-semibold">{name}</span>
      </span>
      <span className="shrink-0 text-xs font-semibold text-muted">{t("recommend.lockedGrade", { g: locked.minGrade })}</span>
    </li>
  );
}
