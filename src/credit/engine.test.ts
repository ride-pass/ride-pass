import { beforeEach, describe, expect, it } from "vitest";
import type { RiderMetrics } from "@/data/derive";
import { mockRepository as repo } from "@/data/mockRepository";
import {
  coefficientOfVariation,
  evaluateCredit,
  factorValues,
  gradeOf,
  type CreditResult,
  type ScoredCredit,
} from "./engine";

// ---- 단위 테스트용 계산값 (모든 요인 만점에 가까운 기사) ----
function metrics(over: Partial<RiderMetrics> = {}): RiderMetrics {
  return {
    monthlyNet: 6_000_000,
    avgMonthlyNet3m: 6_000_000,
    monthlyNetSeries6m: [6_000_000, 6_000_000, 6_000_000, 6_000_000, 6_000_000, 6_000_000],
    activeDays30: 26,
    consecutiveActiveMonths: 12,
    depositMatchRate: 1,
    rentalOnTimeRate: 1,
    rentalPaymentCount: 90,
    platformCount30: 1,
    avgOcrConfidence: 0.95,
    latestOcrConfidence: 0.95,
    historyDays: 180,
    editFlags: [],
    warnings: [],
    slikKolektibilitas: null,
    slikActiveFacilities: null,
    slikParseConfidence: null,
    telecomOnTimeRate: null,
    telecomBillCount: 0,
    ...over,
  };
}

const scored = (c: CreditResult): ScoredCredit => {
  if (c.status !== "scored") throw new Error(`점수가 나와야 하는데 ${c.status}`);
  return c;
};

describe("0~1 변환 (CLAUDE.md 4-5 표)", () => {
  it("상환 이력: 납부율 0.98 이상 1, 0.80 이하 0, 이력 없으면 0.5", () => {
    expect(factorValues(metrics({ rentalOnTimeRate: 0.98 })).repayment).toBe(1);
    expect(factorValues(metrics({ rentalOnTimeRate: 0.8 })).repayment).toBe(0);
    expect(factorValues(metrics({ rentalOnTimeRate: 0.89 })).repayment).toBeCloseTo(0.5, 10);
    expect(factorValues(metrics({ rentalOnTimeRate: null })).repayment).toBe(0.5);
  });

  it("상환 이력: 렌털·SLIK·통신요금 중 있는 것만 평균", () => {
    const v = (over: Partial<RiderMetrics>) => factorValues(metrics(over)).repayment;
    expect(v({ rentalOnTimeRate: 1, slikKolektibilitas: 2, slikParseConfidence: 0.95 })).toBeCloseTo(0.75, 10);
    expect(v({ rentalOnTimeRate: null, slikKolektibilitas: 3, slikParseConfidence: 0.95 })).toBe(0);
    expect(v({ rentalOnTimeRate: null, telecomOnTimeRate: 1, telecomBillCount: 6 })).toBe(1);
    // 읽은 신뢰도가 낮은 SLIK 확인서는 쓰지 않는다
    expect(v({ rentalOnTimeRate: null, slikKolektibilitas: 5, slikParseConfidence: 0.5 })).toBe(0.5);
  });

  it("소득 안정성: 변동계수 0.10 이하 1, 0.40 이상 0, 2개월 미만이면 0.5", () => {
    expect(coefficientOfVariation([100, 100])).toBe(0);
    expect(factorValues(metrics({ monthlyNetSeries6m: [90, 110] })).stability).toBe(1); // CV 0.1
    expect(factorValues(metrics({ monthlyNetSeries6m: [60, 140] })).stability).toBe(0); // CV 0.4
    expect(factorValues(metrics({ monthlyNetSeries6m: [75, 125] })).stability).toBeCloseTo(0.5, 10);
    expect(factorValues(metrics({ monthlyNetSeries6m: [100] })).stability).toBe(0.5);
  });

  it("검증된 소득: 일치율 0.95 이상 1, 0.50 이하 0, 비교할 정산 없으면 0", () => {
    expect(factorValues(metrics({ depositMatchRate: 0.95 })).verifiedIncome).toBe(1);
    expect(factorValues(metrics({ depositMatchRate: 0.5 })).verifiedIncome).toBe(0);
    expect(factorValues(metrics({ depositMatchRate: null })).verifiedIncome).toBe(0);
  });

  it("소득 수준: 200만 미만 0, 300만 0.5, 600만 이상 1", () => {
    const v = (x: number) => factorValues(metrics({ avgMonthlyNet3m: x })).incomeLevel;
    expect(v(1_999_999)).toBe(0);
    expect(v(2_500_000)).toBeCloseTo(0.25, 10);
    expect(v(3_000_000)).toBe(0.5);
    expect(v(4_500_000)).toBeCloseTo(0.75, 10);
    expect(v(6_000_000)).toBe(1);
    expect(v(9_000_000)).toBe(1);
  });

  it("활동 연속성: 0개월 0, 12개월 이상 1", () => {
    expect(factorValues(metrics({ consecutiveActiveMonths: 0 })).continuity).toBe(0);
    expect(factorValues(metrics({ consecutiveActiveMonths: 6 })).continuity).toBe(0.5);
    expect(factorValues(metrics({ consecutiveActiveMonths: 20 })).continuity).toBe(1);
  });

  it("데이터 신뢰도: 플래그 있으면 0, 평균 0.9 이상 1", () => {
    expect(factorValues(metrics({ avgOcrConfidence: 0.9 })).dataQuality).toBe(1);
    expect(factorValues(metrics({ avgOcrConfidence: 0.8 })).dataQuality).toBeCloseTo(0.5, 10);
    expect(factorValues(metrics({ editFlags: ["duplicate_image"] })).dataQuality).toBe(0);
  });
});

describe("점수·등급", () => {
  it("모든 요인 1이면 900점 A", () => {
    const c = scored(evaluateCredit(metrics()));
    expect(c.score).toBe(900);
    expect(c.grade).toBe("A");
  });

  it("등급 경계", () => {
    expect([900, 800, 799, 700, 699, 600, 599, 500, 499, 400].map(gradeOf)).toEqual(
      ["A", "A", "B", "B", "C", "C", "D", "D", "E", "E"],
    );
  });

  it("이유는 항상 3개, 개선 방법은 1개", () => {
    for (const over of [{}, { rentalOnTimeRate: null }, { depositMatchRate: 0.3 }, { consecutiveActiveMonths: 1 }]) {
      const c = scored(evaluateCredit(metrics(over)));
      expect(c.reasons).toHaveLength(3);
      expect(new Set(c.reasons.map((r) => r.code)).size).toBe(3);
      expect(c.improvement).toBeTruthy();
    }
  });
});

describe("강제 규칙", () => {
  it("입금 일치율 0.85 미만이면 549점 상한, 이유 1번은 소득 검증 필요", () => {
    const c = scored(evaluateCredit(metrics({ depositMatchRate: 0.84 })));
    expect(c.score).toBeLessThanOrEqual(549);
    expect(c.reasons[0].code).toBe("INCOME_VERIFICATION_NEEDED");
    expect(c.reasons.map((r) => r.code)).not.toContain("DEPOSIT_MISMATCH");
  });

  it("위변조 신호가 있으면 549점 상한", () => {
    const c = scored(evaluateCredit(metrics({ editFlags: ["duplicate_image"] })));
    expect(c.score).toBe(549);
    expect(c.reasons[0].code).toBe("INCOME_VERIFICATION_NEEDED");
  });

  it("SLIK 콜렉터빌리티 3 이상이면 549점 상한, 이유 1번은 금융기관 연체 기록", () => {
    const c = scored(evaluateCredit(metrics({ slikKolektibilitas: 3, slikParseConfidence: 0.95 })));
    expect(c.score).toBe(549);
    expect(c.reasons[0].code).toBe("SLIK_DELINQUENT");
  });

  it("최신 촬영 신뢰도 0.7 미만이면 평가 보류 + 재촬영", () => {
    const c = evaluateCredit(metrics({ latestOcrConfidence: 0.55 }));
    expect(c.status).toBe("hold");
    expect(c.status === "hold" && c.actions).toEqual(["RETAKE_CLEAR_PHOTO"]);
  });

  it("기록이 60일 미만이면 평가 보류", () => {
    const c = evaluateCredit(metrics({ historyDays: 59 }));
    expect(c.status === "hold" && c.holds).toEqual(["NEED_MORE_HISTORY"]);
  });
});

describe("시연 페르소나 (CLAUDE.md 4-2) — 커밋된 fixture 기준", () => {
  beforeEach(async () => {
    await repo.resetDemoState();
  });

  const credit = async (riderId: string) => evaluateCredit((await repo.getRiderMetrics(riderId))!);

  it("r-budi: 820~890 A", async () => {
    const c = scored(await credit("r-budi"));
    expect(c.score).toBeGreaterThanOrEqual(820);
    expect(c.score).toBeLessThanOrEqual(890);
    expect(c.grade).toBe("A");
    expect(c.repaymentSources).toEqual(["rental", "slik"]);
  });

  // 2026-11-23: 기사 5명 모두 상환 자료가 있게 바꿨다. Siti는 통신요금 한 번 늦음 + 렌털 2회 늦음
  it("r-siti: 720~790 B, 통신요금 한 번 늦음 → 납부일 지키기 개선 방법", async () => {
    const c = scored(await credit("r-siti"));
    expect(c.score).toBeGreaterThanOrEqual(720);
    expect(c.score).toBeLessThanOrEqual(790);
    expect(c.grade).toBe("B");
    expect(c.repaymentSources).toEqual(["rental", "telecom"]);
    expect(c.improvement).toBe("PAY_ON_TIME");
  });

  it("r-agus: 549 이하 D, 이유 1번 소득 검증 필요", async () => {
    const c = scored(await credit("r-agus"));
    expect(c.score).toBeLessThanOrEqual(549);
    expect(c.grade).toBe("D");
    expect(c.reasons[0].code).toBe("INCOME_VERIFICATION_NEEDED");
    // 통신요금은 모두 제때 냈지만 소득 검증이 안 돼 549점 상한
    expect(c.repaymentSources).toEqual(["telecom"]);
    expect(c.reasons.map((r) => r.code)).toContain("REPAY_ON_TIME");
  });

  it("r-dewi: 840~900 A, 가장 많이 올린 이유는 렌털·통신요금 정시 납부", async () => {
    const c = scored(await credit("r-dewi"));
    expect(c.score).toBeGreaterThanOrEqual(840);
    expect(c.score).toBeLessThanOrEqual(900);
    expect(c.grade).toBe("A");
    expect(c.reasons[0]).toEqual({ code: "REPAY_ON_TIME", factor: "repayment", sources: ["rental", "telecom"] });
  });

  it("r-rizky: 평가 보류 → 재촬영 후 700~790 B", async () => {
    const before = await credit("r-rizky");
    expect(before.status === "hold" && before.holds).toEqual(["NEED_RETAKE"]);

    const records = await repo.getRiderRecords("r-rizky");
    await repo.retakeCapture(records!.captures.at(-1)!.id);
    const after = scored(await credit("r-rizky"));
    expect(after.score).toBeGreaterThanOrEqual(700);
    expect(after.score).toBeLessThanOrEqual(790);
    expect(after.grade).toBe("B");
    expect(after.repaymentSources).toEqual(["telecom"]);
  });
});
