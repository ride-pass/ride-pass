import { describe, expect, it } from "vitest";
import { buildKurChecklist, KUR_MAX_ANNUAL_REVENUE, kurSummary } from "./kur";
import { mockRepository as repo } from "./mockRepository";

const checklist = async (id: string) => buildKurChecklist((await repo.getRiderMetrics(id))!);
const status = (items: Awaited<ReturnType<typeof checklist>>, id: string) => items.find((i) => i.id === id)?.status;

describe("KUR 체크리스트 (CLAUDE.md 4-2 장면)", () => {
  it("Budi: 앱으로 확인한 조건 4개 모두 충족 (SLIK 콜렉터빌리티 1)", async () => {
    const items = await checklist("r-budi");
    expect(kurSummary(items)).toEqual({ met: 4, total: 4 });
    expect(status(items, "slik")).toBe("met");
    expect(status(items, "businessSize")).toBe("met");
  });

  it("Siti: 활동 6개월 연속 미충족 (4개월), SLIK은 올리면 확인", async () => {
    const items = await checklist("r-siti");
    expect(status(items, "activeMonths")).toBe("unmet");
    expect(items.find((i) => i.id === "activeMonths")?.vars).toEqual({ months: 4, min: 6 });
    expect(status(items, "slik")).toBe("needs_upload");
  });

  it("서류와 다른 대출 여부는 앱이 판단하지 않는다", async () => {
    const items = await checklist("r-budi");
    expect(items.filter((i) => i.group === "document").every((i) => i.status === "prepare")).toBe(true);
    expect(items.filter((i) => i.group === "bank").every((i) => i.status === "check_with_bank")).toBe(true);
  });

  it("SLIK 연체·부실 기록이 있으면 미충족 (Permenko 1/2026 제14조 1항)", async () => {
    const m = (await repo.getRiderMetrics("r-budi"))!;
    for (const kol of [2, 3, 5] as const) {
      expect(status(buildKurChecklist({ ...m, slikKolektibilitas: kol }), "slik")).toBe("unmet");
    }
    expect(status(buildKurChecklist({ ...m, slikKolektibilitas: 2, slikParseConfidence: 0.5 }), "slik")).toBe("needs_upload");
  });

  it("사업 규모: 연매출 상한을 넘으면 미충족, 정산 기록이 없으면 확인 불가", async () => {
    const m = (await repo.getRiderMetrics("r-budi"))!;
    expect(status(buildKurChecklist({ ...m, avgMonthlyNet3m: KUR_MAX_ANNUAL_REVENUE / 12 }), "businessSize")).toBe("met");
    expect(status(buildKurChecklist({ ...m, avgMonthlyNet3m: KUR_MAX_ANNUAL_REVENUE / 12 + 1 }), "businessSize")).toBe("unmet");
    expect(status(buildKurChecklist({ ...m, avgMonthlyNet3m: 0 }), "businessSize")).toBe("unmet");
  });

  it("국적·나이, 직업 제한은 은행이 확인한다", async () => {
    const items = await checklist("r-budi");
    expect(items.filter((i) => i.group === "bank").map((i) => i.id)).toEqual([
      "citizenAge",
      "notCivilServant",
      "noOtherLoan",
      "bpjs",
    ]);
  });

  it("금리·한도 같은 숫자를 담지 않는다", async () => {
    const items = await checklist("r-dewi");
    expect(JSON.stringify(items)).not.toMatch(/rate|limit|plafon|bunga/i);
  });
});
