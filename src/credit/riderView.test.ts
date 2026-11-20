import { beforeEach, describe, expect, it } from "vitest";
import { mockRepository as repo } from "@/data/mockRepository";
import { getApplicantReport } from "./partnerView";
import { getRiderCreditView, getRiderSubmissionView, markOf } from "./riderView";

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

describe("「평가 기준 보기」 데이터 (CLAUDE.md 4-5)", () => {
  it("C단계: 요인 6개와 반영 비율(합 100), 이유 3개", async () => {
    const view = await getRiderCreditView("r-budi", "C");
    if (view?.status !== "scored") throw new Error("점수가 있어야 한다");
    expect(view.criteria.map((c) => c.id)).toEqual([
      "repayment", "stability", "verifiedIncome", "incomeLevel", "continuity", "dataQuality",
    ]);
    expect(view.criteria.reduce((a, c) => a + c.weight, 0)).toBe(100);
    expect(view.reasons).toHaveLength(3);
  });

  it("A단계 결과에는 평가 기준(반영 비율)도 넣지 않는다", async () => {
    const view = await getRiderCreditView("r-budi", "A");
    expect(view).not.toHaveProperty("criteria");
  });
});

describe("getRiderSubmissionView: 「제출할 곳 고르기」에서 함께 가는 신용도", () => {
  const PARTNER = "p-rental-a";

  it("A단계: 신용도를 보내지 않는다", async () => {
    const view = await getRiderSubmissionView("r-budi", ["income", "activity", "slik_report"], "A");
    expect(view).toEqual({ stage: "A" }); // 숫자가 하나도 없다
  });

  it("C단계: 렌털사 화면이 받는 점수와 같다 (동의 항목별)", async () => {
    const cases: Parameters<typeof repo.createShareGrant>[0]["items"][] = [
      ["income", "activity", "rental_history", "slik_report", "telecom_bills"],
      ["income", "activity"],
      ["income", "slik_report"],
    ];
    for (const items of cases) {
      await repo.resetDemoState();
      await repo.createShareGrant({ riderId: "r-budi", partnerId: PARTNER, items });
      const rider = await getRiderSubmissionView("r-budi", items, "C");
      const partner = await getApplicantReport(PARTNER, "r-budi", "C");
      if (rider?.stage !== "C" || partner?.status !== "shared") throw new Error("C단계 결과가 있어야 한다");
      expect(rider.credit).toEqual(partner.credit);
    }
  });

  it("C단계: 점수가 있으면 평가 기준 6개, 보류면 없음", async () => {
    const scored = await getRiderSubmissionView("r-budi", ["income", "activity"], "C");
    expect(scored?.stage === "C" && scored.criteria?.length).toBe(6);
    const held = await getRiderSubmissionView("r-budi", ["income"], "C");
    expect(held).toEqual({ stage: "C", credit: { status: "hold", holds: ["NOT_SHARED_ACTIVITY"] }, criteria: null });
  });

  it("없는 기사는 null", async () => {
    expect(await getRiderSubmissionView("r-nobody", ["income"], "C")).toBeNull();
  });
});
