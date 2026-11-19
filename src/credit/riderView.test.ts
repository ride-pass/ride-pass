import { beforeEach, describe, expect, it } from "vitest";
import { mockRepository as repo } from "@/data/mockRepository";
import { getRiderCreditView, markOf } from "./riderView";

beforeEach(async () => {
  await repo.resetDemoState();
});

/** 결과 안에 400~900 사이 숫자가 하나라도 있는가 */
function containsScoreLikeNumber(value: unknown): boolean {
  return JSON.stringify(value)
    .match(/-?\d+(\.\d+)?/g)!
    .some((n) => Number(n) >= 400 && Number(n) <= 900);
}

describe("getRiderCreditView (CLAUDE.md 2-4)", () => {
  it("✓/△/✗ 경계: 0.7 이상 충족, 0.4 이상 보통", () => {
    expect([1, 0.7, 0.69, 0.4, 0.39, 0].map(markOf)).toEqual(
      ["met", "met", "partial", "partial", "unmet", "unmet"],
    );
  });

  it("A단계: 신용 준비도 5개 요인만, 점수·등급·숫자 없음", async () => {
    for (const id of ["r-budi", "r-siti", "r-agus", "r-dewi"]) {
      const view = await getRiderCreditView(id, "A");
      expect(view?.status).toBe("readiness");
      expect(view).not.toHaveProperty("score");
      expect(view).not.toHaveProperty("grade");
      expect(view).not.toHaveProperty("reasons");
      expect(containsScoreLikeNumber(view)).toBe(false);
      if (view?.status === "readiness") {
        expect(view.factors.map((f) => f.id)).toEqual([
          "repayment", "stability", "verifiedIncome", "incomeLevel", "continuity",
        ]);
        expect(view.totalCount).toBe(5);
      }
    }
  });

  it("A단계 Budi: 5개 중 4개 충족 (활동 연속성 보통)", async () => {
    const view = await getRiderCreditView("r-budi", "A");
    expect(view?.status === "readiness" && view.metCount).toBe(4);
  });

  it("C단계: 점수·등급·이유 3개·배지", async () => {
    const view = await getRiderCreditView("r-dewi", "C");
    expect(view?.status).toBe("scored");
    if (view?.status === "scored") {
      expect(view.score).toBeGreaterThanOrEqual(840);
      expect(view.reasons).toHaveLength(3);
      expect(view.badge).toBe("pka_licensed_feature");
    }
  });

  it("평가 보류는 두 단계 모두 같고 점수가 없다 (r-rizky)", async () => {
    for (const stage of ["A", "C"] as const) {
      const view = await getRiderCreditView("r-rizky", stage);
      expect(view).toEqual({ stage, status: "hold", holds: ["NEED_RETAKE"], actions: ["RETAKE_CLEAR_PHOTO"] });
    }
  });

  it("없는 기사는 null", async () => {
    expect(await getRiderCreditView("r-nobody")).toBeNull();
  });
});
