"use client";

// 추천 상품 화면(/recommend)과 상품 보내기 화면(/recommend/send)이 같이 쓰는 조각.
// 금리·요금은 모두 "예시"로만 보여 준다 (CLAUDE.md 2-1).

import { Bike, CreditCard, Landmark, Shield, type LucideIcon } from "lucide-react";
import { useT } from "@/components/demo/DemoProvider";
import type { ProductOffer } from "@/credit/riderView";
import type { Product, ProductCategory } from "@/data/types";
import { formatRupiah } from "@/lib/format";

export const CATEGORY_ICON: Record<ProductCategory, LucideIcon> = {
  loan: Landmark,
  installment: CreditCard,
  rental: Bike,
  insurance: Shield,
};

export function useProductText(product: Product) {
  const t = useT();
  return { name: t(`products.${product.id}.name`), desc: t(`products.${product.id}.desc`) };
}

/** 예시 금리 또는 예시 가격 한 줄 */
export function PriceText({ offer, big = false }: { offer: ProductOffer; big?: boolean }) {
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
      <span className="text-xs text-muted">{label}</span>
      {/* 보라는 1위 카드의 큰 금리 한 곳만 (데이터 한 곳, CLAUDE.md 6절). 목록의 금리는 남색 */}
      <span className={`font-bold whitespace-nowrap tabular-nums ${big ? "text-2xl text-brand-purple" : "text-base text-brand-navy"}`}>{value}</span>
    </span>
  );
}
