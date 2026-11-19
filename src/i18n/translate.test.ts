import { describe, expect, it } from "vitest";
import { translate } from "./translate";

describe("translate", () => {
  it("점 경로로 꺼내고 {변수}를 바꾼다", () => {
    expect(translate("ko", "credit.readiness.summary", { met: 4 })).toBe("신용 준비도: 5개 요인 중 4개 충족");
    expect(translate("id", "credit.grades.A")).toBe("Sangat Baik");
  });

  it("없는 키는 키를 그대로 돌려준다", () => {
    expect(translate("ko", "nope.missing")).toBe("nope.missing");
  });

  it("값이 없는 변수는 그대로 둔다", () => {
    expect(translate("ko", "credit.readiness.summary")).toContain("{met}");
  });
});
