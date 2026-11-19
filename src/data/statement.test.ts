import { beforeEach, describe, expect, it } from "vitest";
import { mockRepository as repo } from "./mockRepository";
import { buildIncomeStatement } from "./statement";

beforeEach(async () => {
  await repo.resetDemoState();
});

const statementOf = async (id: string) => buildIncomeStatement((await repo.getRiderRecords(id))!);

describe("수입 명세서", () => {
  it("합계는 derive의 월 순수입과 같고, 총매출 − 수수료 = 순수입", async () => {
    for (const id of ["r-budi", "r-siti", "r-agus", "r-dewi", "r-rizky"]) {
      const s = await statementOf(id);
      const m = (await repo.getRiderMetrics(id))!;
      expect(s.totals.net).toBe(m.monthlyNet);
      expect(s.totals.gross - s.totals.fee).toBe(s.totals.net);
      expect(s.periodStart).toBe("2026-10-21");
      expect(s.periodEnd).toBe("2026-11-19");
    }
  });

  it("Budi: 두 앱 내역, 입금 일치, 렌털 88/90, 발급번호", async () => {
    const s = await statementOf("r-budi");
    expect(s.lines.map((l) => l.platform)).toEqual(["ride_app_a", "delivery_app_b"]);
    expect(s.platformCount).toBe(2);
    expect(s.depositMatched).toBe(true);
    expect(s.rental).toEqual({ onTime: 88, total: 90 });
    expect(s.issueNo).toBe("TC-20261119-BUDI-01");
  });

  it("Agus: 입금 불일치로 표시", async () => {
    const s = await statementOf("r-agus");
    expect(s.depositMatched).toBe(false);
    expect(s.rental).toBeNull();
  });
});
