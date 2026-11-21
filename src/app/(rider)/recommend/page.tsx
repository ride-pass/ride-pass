"use client";

// 추천 상품 (하단 탭 「추천」, 2026-11-20 멘토링 뒤 추가). 토스 대출 찾기처럼 내 등급으로 볼 수 있는 상품을 보여 준다.
// 위에서부터: 내 신용도·볼 수 있는 상품 수 → 추천 3개 → 종류별 전체 상품(대출 먼저) → 지금은 어려운 상품.
// 2026-11-21 새 디자인 기준(6절): 1위만 흰 카드 + 보라 버튼, 2·3위는 줄 전체를 누르는 구분선 줄(오른쪽 끝 ›),
// 종류는 글자 탭 + 보라 밑줄. 나머지는 카드 없이 크림 바탕 위에 구분선으로 나눈다.
// CLAUDE.md 2-1: 모두 가상 상품, 금리는 등급별 "예시 금리"만. 한도·승인 가능성·"저금리"는 쓰지 않는다.
// 버튼은 「이곳에 내 자료 보내기」뿐이다(/recommend/send: 그 기관 한 곳에만 동의하고 보낸다). 대출을 이 앱에서 바로 신청시키지 않는다.

import { ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { AppHeader } from "@/components/ui/AppHeader";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import { TabBar } from "@/components/ui/TabBar";
import { PkaBadge } from "@/components/credit/PkaBadge";
import { getRiderProductView, type LockedProduct, type ProductOffer, type RiderProductView } from "@/credit/riderView";
import { getRider, listPartners } from "@/data/repository";
import { PriceText, useProductText } from "@/components/recommend/ProductParts";
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
      <AppHeader title={t("recommend.title")} back={false} large right={<Badge tone="lavender">{t("recommend.badge")}</Badge>} />
      <main className="flex flex-col px-4 pt-3 pb-10">
        {view.stage === "A" ? <p className="text-sm text-muted">{t("recommend.notAvailable")}</p> : null}

        {view.stage === "C" && view.status === "hold" ? (
          <section className="flex flex-col gap-2 rounded-3xl bg-surface p-4">
            <h2 className="font-bold">{t("credit.holds.title")}</h2>
            <p className="text-sm text-muted">{view.holds.map((h) => t(`credit.holds.${h}`)).join(" · ")}</p>
            <p className="text-sm">{t("recommend.hold")}</p>
            <ButtonLink href="/capture">{t("creditPage.goRetake")}</ButtonLink>
          </section>
        ) : null}

        {view.stage === "C" && view.status === "scored" ? (
          <>
            {/* 요약: 카드 없이 한 문장 + 내 신용도 + PKA 배지·시연용 표기 (2-4) */}
            <section className="flex flex-col">
              <p className="text-lg leading-snug font-bold">{t("recommend.summary", { n: view.available.length })}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <span className="text-sm text-muted">
                  {t("recommend.myCredit", { score: view.score, grade: view.grade, gradeName: t(`credit.grades.${view.grade}`) })}
                </span>
                <PkaBadge />
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">{t("credit.disclaimer")}</p>
            </section>

            <section aria-labelledby="rec-top" className="mt-8 border-t border-line pt-6">
              <h2 id="rec-top" className="text-base font-bold">
                {t("recommend.topTitle", { name: firstName })}
              </h2>
              <p className="mt-0.5 text-sm text-muted">{t("recommend.topBody")}</p>
              <ol className="mt-4 flex flex-col">
                {view.top.map((offer, i) =>
                  i === 0 ? (
                    <TopPick key={offer.product.id} offer={offer} grade={view.grade} partner={partnerName(offer.product.partnerId)} />
                  ) : (
                    <TopRow key={offer.product.id} rank={i + 1} offer={offer} partner={partnerName(offer.product.partnerId)} />
                  ),
                )}
              </ol>
            </section>

            <section aria-labelledby="rec-all" className="mt-8 border-t border-line pt-6">
              <h2 id="rec-all" className="text-base font-bold">
                {t("recommend.allTitle")}
              </h2>
              {/* 글자 탭: 고른 탭만 보라 밑줄 2px (켜진 탭 = 보라를 쓰는 곳, 6절) */}
              <div className="mt-3 flex gap-5 overflow-x-auto border-b border-line" role="tablist">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="tab"
                    aria-selected={category === c}
                    onClick={() => setCategory(c)}
                    className={`-mb-px min-h-11 shrink-0 border-b-2 text-sm font-semibold ${category === c ? "border-brand-purple text-brand-navy" : "border-transparent text-muted"}`}
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
                <p className="py-4 text-sm text-muted">{t("recommend.empty")}</p>
              ) : null}
            </section>

            {view.locked.length ? (
              <section aria-labelledby="rec-locked" className="mt-8 border-t border-line pt-6">
                <h2 id="rec-locked" className="text-base font-bold">
                  {t("recommend.lockedTitle")}
                </h2>
                <ul className="mt-1 flex flex-col divide-y divide-line">
                  {view.locked.map((l) => (
                    <LockedRow key={l.product.id} locked={l} partner={partnerName(l.product.partnerId)} />
                  ))}
                </ul>
                <Link href="/credit" className="mt-3 flex items-center gap-3 rounded-3xl bg-lavender p-4 text-base font-medium active:bg-lavender-strong">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-brand-purple">{t("recommend.lockedHow")}</span>
                    {t(`credit.actions.${view.improvement}`)}
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-brand-purple" aria-hidden />
                </Link>
              </section>
            ) : null}

            <p className="mt-8 text-xs leading-relaxed text-muted">{t("recommend.disclaimer")}</p>
          </>
        ) : null}
      </main>
      <TabBar />
    </div>
  );
}

/** 추천 1위: 이 화면의 유일한 흰 카드. 예시 금리가 데이터 한 곳(보라), 버튼도 하나 */
function TopPick({ offer, grade, partner }: { offer: ProductOffer; grade: string; partner: string }) {
  const t = useT();
  const { name } = useProductText(offer.product);
  const term = offer.product.termMonths;
  return (
    <li className="flex flex-col rounded-3xl bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted">
            1 · {partner} · {t(`recommend.categories.${offer.product.category}`)}
          </span>
          <span className="mt-1 block text-lg leading-snug font-bold">{name}</span>
          {term ? <span className="mt-0.5 block text-xs text-muted">{t("recommend.term", { min: term[0], max: term[1] })}</span> : null}
        </span>
        <PriceText offer={offer} big />
      </div>
      <p className="mt-3 text-sm text-muted">
        {t(`recommend.reasons.${offer.reason}`, { g: grade, category: t(`recommend.categories.${offer.product.category}`) })}
      </p>
      <ButtonLink href={`/recommend/send?product=${offer.product.id}`} className="mt-4">
        {t("recommend.send")}
      </ButtonLink>
    </li>
  );
}

/** 추천 2·3위: 줄 전체가 보내기 화면으로 가는 링크. 누를 수 있다는 표시로 오른쪽 끝에 › */
function TopRow({ rank, offer, partner }: { rank: number; offer: ProductOffer; partner: string }) {
  const t = useT();
  const { name } = useProductText(offer.product);
  const term = offer.product.termMonths;
  return (
    <li className="border-b border-line">
      <Link href={`/recommend/send?product=${offer.product.id}`} className="flex min-h-16 items-center gap-3 py-3.5 active:opacity-70">
        <span className="w-4 shrink-0 self-start pt-0.5 text-sm font-semibold text-muted tabular-nums">{rank}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted">
            {partner} · {t(`recommend.categories.${offer.product.category}`)}
          </span>
          <span className="block text-base font-semibold">{name}</span>
          {term ? <span className="block text-xs text-muted">{t("recommend.term", { min: term[0], max: term[1] })}</span> : null}
        </span>
        <PriceText offer={offer} />
        <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
      </Link>
    </li>
  );
}

function OfferRow({ offer, partner }: { offer: ProductOffer; partner: string }) {
  const { name, desc } = useProductText(offer.product);
  return (
    <li>
      <Link href={`/recommend/send?product=${offer.product.id}`} className="flex min-h-16 items-center gap-3 py-3.5 active:opacity-70">
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted">{partner}</span>
          <span className="block text-base font-semibold">{name}</span>
          <span className="block text-sm text-muted">{desc}</span>
        </span>
        <PriceText offer={offer} />
        <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
      </Link>
    </li>
  );
}

function LockedRow({ locked, partner }: { locked: LockedProduct; partner: string }) {
  const t = useT();
  const { name } = useProductText(locked.product);
  return (
    <li className="flex min-h-14 items-center gap-3 py-3 text-muted">
      <Lock className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-xs">{partner}</span>
        <span className="block text-base font-semibold">{name}</span>
      </span>
      <span className="shrink-0 text-sm font-semibold">{t("recommend.lockedGrade", { g: locked.minGrade })}</span>
    </li>
  );
}
