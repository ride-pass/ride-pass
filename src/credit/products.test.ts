import { beforeEach, describe, expect, it } from "vitest";
import { mockRepository as repo } from "@/data/mockRepository";
import type { Product } from "@/data/types";
import { matchProducts, TOP_COUNT } from "./products";
import { getRiderProductView } from "./riderView";

let products: Product[];

beforeEach(async () => {
  await repo.resetDemoState();
  products = await repo.listProducts();
});

describe("matchProducts (「추천」 화면, CLAUDE.md 2-1)", () => {
  it("등급이 낮을수록 같은 상품의 예시 금리가 높다", () => {
    for (const p of products.filter((x) => x.exampleRateByGrade)) {
      const rates = (["A", "B", "C", "D"] as const).map((g) => p.exampleRateByGrade![g]).filter((r) => r !== undefined);
      expect(rates, p.id).toEqual([...rates].sort((a, b) => a - b));
    }
    const rateOf = (grade: "A" | "D") => matchProducts(products, grade).available.find((o) => o.product.id === "prod-bank-f-micro")!.rate!;
    expect(rateOf("D")).toBeGreaterThan(rateOf("A"));
  });

  it("등급이 낮을수록 볼 수 있는 상품이 줄어든다", () => {
    const counts = (["A", "B", "C", "D", "E"] as const).map((g) => matchProducts(products, g).available.length);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    expect(counts[4]).toBeLessThan(counts[0]);
  });

  it("추천 3개는 대출부터 채우고, 같은 종류에서는 예시 금리가 낮은 순이다", () => {
    const { top } = matchProducts(products, "B");
    expect(top).toHaveLength(TOP_COUNT);
    expect(top.every((o) => o.product.category === "loan")).toBe(true);
    expect(top.map((o) => o.rate)).toEqual([...top.map((o) => o.rate)].sort((a, b) => a! - b!));
    expect(top[0].reason).toBe("BEST_RATE_IN_CATEGORY");
  });

  it("E등급: 대출·할부는 「지금은 어려운 상품」, 추천에는 렌털·보험만", () => {
    const { top, locked } = matchProducts(products, "E");
    expect(top.map((o) => o.product.category).sort()).toEqual(["insurance", "rental"]);
    expect(top.every((o) => o.reason === "NO_GRADE_LIMIT" && o.rate === null)).toBe(true);
    expect(locked.map((l) => l.product.category)).not.toContain("rental");
    expect(locked.find((l) => l.product.id === "prod-bank-c-working")?.minGrade).toBe("C");
  });

  it("한도·승인 가능성 같은 값은 만들지 않는다", () => {
    expect(JSON.stringify(matchProducts(products, "A"))).not.toMatch(/"(limit|loanLimit|maxAmount|approval\w*|approved)"/i);
  });
});

describe("getRiderProductView", () => {
  it("Budi(A등급): 추천 3개가 모두 대출", async () => {
    const view = await getRiderProductView("r-budi", "C");
    expect(view?.stage === "C" && view.status === "scored" && view.grade).toBe("A");
    expect(view?.stage === "C" && view.status === "scored" && view.top.map((o) => o.product.category)).toEqual(["loan", "loan", "loan"]);
  });

  it("Agus(D등급, 549 상한): Budi보다 예시 금리가 높고 볼 수 있는 상품이 적다", async () => {
    const budi = await getRiderProductView("r-budi", "C");
    const agus = await getRiderProductView("r-agus", "C");
    if (budi?.stage !== "C" || budi.status !== "scored" || agus?.stage !== "C" || agus.status !== "scored") throw new Error("scored 아님");
    expect(agus.grade).toBe("D");
    expect(agus.top[0].rate!).toBeGreaterThan(budi.top[0].rate!);
    expect(agus.available.length).toBeLessThan(budi.available.length);
  });

  it("평가 보류(Rizky)면 추천하지 않는다", async () => {
    const view = await getRiderProductView("r-rizky", "C");
    expect(view).toMatchObject({ stage: "C", status: "hold" });
    expect(view).not.toHaveProperty("top");
  });

  it("A단계에는 신용도가 없으므로 상품을 고르지 않는다", async () => {
    expect(await getRiderProductView("r-budi", "A")).toEqual({ stage: "A" });
  });
});
