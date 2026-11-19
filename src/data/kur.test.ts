import { describe, expect, it } from "vitest";
import { buildKurChecklist, kurSummary } from "./kur";
import { mockRepository as repo } from "./mockRepository";

const checklist = async (id: string) => buildKurChecklist((await repo.getRiderMetrics(id))!);
const status = (items: Awaited<ReturnType<typeof checklist>>, id: string) => items.find((i) => i.id === id)?.status;

describe("KUR 체크리스트 (CLAUDE.md 4-2 장면)", () => {
  it("Budi: 앱으로 확인한 조건 3개 모두 충족 (SLIK 콜렉터빌리티 1)", async () => {
    const items = await checklist("r-budi");
    expect(kurSummary(items)).toEqual({ met: 3, total: 3 });
    expect(status(items, "slik")).toBe("met");
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

  it("금리·한도 같은 숫자를 담지 않는다", async () => {
    const items = await checklist("r-dewi");
    expect(JSON.stringify(items)).not.toMatch(/rate|limit|plafon|bunga/i);
  });
});
