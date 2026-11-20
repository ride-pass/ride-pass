// 「추천」 화면: 내 신용 등급으로 볼 수 있는 가상 상품과 추천 3개 (2026-11-20 멘토링 뒤 추가, CLAUDE.md 2-1).
// 순수 함수만 둔다. 기사 화면은 riderView.getRiderProductView()로만 받는다.
// - 볼 수 있는 상품: 내 등급에 예시 금리가 있는 상품 + 등급과 상관없는 상품(렌털·보험)
// - 순서: 대출 → 할부 → 렌털 → 보험, 같은 종류 안에서는 예시 금리가 낮은 순 (대출이 메인)
// - 추천 3개: 위 순서의 앞 3개. 등급이 낮을수록 예시 금리가 높고 볼 수 있는 상품이 줄어든다
// 한도·승인 가능성은 만들지 않는다 (2-1).

import type { Product, ProductCategory } from "@/data/types";
import type { Grade } from "./engine";

export const CATEGORY_ORDER: ProductCategory[] = ["loan", "installment", "rental", "insurance"];
export const TOP_COUNT = 3;
const GRADES: Grade[] = ["A", "B", "C", "D", "E"];

/** 추천 이유: 같은 종류에서 예시 금리가 가장 낮음 / 내 등급으로 볼 수 있음 / 등급과 상관없음 */
export type OfferReason = "BEST_RATE_IN_CATEGORY" | "GRADE_OK" | "NO_GRADE_LIMIT";

export interface ProductOffer {
  product: Product;
  /** 내 등급의 예시 연 금리(%). 렌털·보험은 null (예시 가격을 쓴다) */
  rate: number | null;
  reason: OfferReason;
}

export interface LockedProduct {
  product: Product;
  /** 이 등급 이상이어야 볼 수 있다 */
  minGrade: Grade;
}

export interface ProductMatch {
  /** 추천 3개 (볼 수 있는 상품이 적으면 그만큼만) */
  top: ProductOffer[];
  available: ProductOffer[];
  locked: LockedProduct[];
}

const categoryRank = (p: Product) => CATEGORY_ORDER.indexOf(p.category);

/** 예시 금리가 있는 가장 낮은 등급 */
function minGradeOf(p: Product): Grade {
  const rates = p.exampleRateByGrade ?? {};
  return [...GRADES].reverse().find((g) => rates[g] !== undefined) ?? "A";
}

export function matchProducts(products: Product[], grade: Grade): ProductMatch {
  const open: { product: Product; rate: number | null }[] = [];
  const locked: LockedProduct[] = [];
  for (const product of products) {
    if (!product.exampleRateByGrade) {
      open.push({ product, rate: null });
      continue;
    }
    const rate = product.exampleRateByGrade[grade];
    if (rate === undefined) locked.push({ product, minGrade: minGradeOf(product) });
    else open.push({ product, rate });
  }

  open.sort(
    (a, b) =>
      categoryRank(a.product) - categoryRank(b.product) ||
      (a.rate ?? Infinity) - (b.rate ?? Infinity) ||
      a.product.id.localeCompare(b.product.id),
  );
  const seen = new Set<ProductCategory>();
  const available = open.map(({ product, rate }): ProductOffer => {
    if (rate === null) return { product, rate, reason: "NO_GRADE_LIMIT" };
    const first = !seen.has(product.category);
    seen.add(product.category);
    return { product, rate, reason: first ? "BEST_RATE_IN_CATEGORY" : "GRADE_OK" };
  });
  locked.sort((a, b) => categoryRank(a.product) - categoryRank(b.product) || a.product.id.localeCompare(b.product.id));

  return { top: available.slice(0, TOP_COUNT), available, locked };
}
