// 홈 화면 활동 지도·월별 막대 계산 (derive.ts의 deriveRiderActivity).
// 같은 원본에서 나온 숫자는 화면끼리 어긋나지 않아야 한다 (CLAUDE.md 4-1 원칙 2).

import { describe, expect, it } from "vitest";
import { DEMO_TODAY } from "@/config/demo";
import { ACTIVITY_MAP_DAYS, MONTH_BAR_COUNT, deriveRiderActivity, deriveRiderMetrics } from "./derive";
import { mockRepository } from "./mockRepository";

const RIDERS = ["r-budi", "r-siti", "r-agus", "r-dewi", "r-rizky"];

describe("deriveRiderActivity", () => {
  for (const id of RIDERS) {
    it(`${id}: 계산값이 4-4 계산값과 맞는다`, async () => {
      const records = (await mockRepository.getRiderRecords(id))!;
      const activity = deriveRiderActivity(records, DEMO_TODAY);
      const metrics = deriveRiderMetrics(records, DEMO_TODAY);

      expect(activity.daily).toHaveLength(ACTIVITY_MAP_DAYS);
      expect(activity.daily.at(-1)!.date).toBe(DEMO_TODAY);
      expect(activity.months).toHaveLength(MONTH_BAR_COUNT);

      // 마지막 30일 구간 = 최근 30일 순수입
      expect(activity.months.at(-1)!.net).toBe(metrics.monthlyNet);
      // 첫 활동일 이후로만 이뤄진 구간 = 신용도 엔진이 쓰는 6개월 월별 순수입
      expect(activity.months.filter((m) => !m.partial).map((m) => m.net)).toEqual(metrics.monthlyNetSeries6m);
      // 최근 30일 활동일 = 지도의 마지막 30칸 중 일한 날
      expect(activity.daily.slice(-30).filter((d) => d.net > 0)).toHaveLength(metrics.activeDays30);
      // 지도의 하루 합 = 같은 기간 정산 순수입 합
      const start = activity.daily[0].date;
      const total = records.captures
        .filter((c) => c.periodDate >= start && c.periodDate <= DEMO_TODAY)
        .reduce((a, c) => a + c.ocr.netAmount, 0);
      expect(activity.daily.reduce((a, d) => a + d.net, 0)).toBe(total);
    });
  }

  it("첫 활동일 이전 날은 시작 전으로 표시한다 (Siti, 4개월)", async () => {
    const records = (await mockRepository.getRiderRecords("r-siti"))!;
    const { daily } = deriveRiderActivity(records, DEMO_TODAY);
    const first = records.rider.firstActiveDate;
    expect(daily.filter((d) => d.beforeStart).every((d) => d.date < first && d.net === 0)).toBe(true);
    expect(daily.some((d) => d.beforeStart)).toBe(true);
  });
});
