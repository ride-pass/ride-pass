import { describe, expect, it } from "vitest";
import type { Rider } from "@/data/types";
import { formatPhoneInput, isValidPhone, riderIdForPhone } from "./demoLogin";

const riders = [
  { id: "r-budi", phoneMasked: "+62 812-0000-0101" },
  { id: "r-rizky", phoneMasked: "+62 812-0000-0105" },
] as Rider[];

describe("demoLogin", () => {
  it("번호 끝 4자리로 시연 인물을 고르고, 없으면 Budi", () => {
    expect(riderIdForPhone("812-0000-0105", riders)).toBe("r-rizky");
    expect(riderIdForPhone("81299990101", riders)).toBe("r-budi");
    expect(riderIdForPhone("812-3456-7890", riders)).toBe("r-budi");
    expect(riderIdForPhone("", riders)).toBe("r-budi");
  });

  it("입력 중 하이픈을 넣는다", () => {
    expect(formatPhoneInput("81200000101")).toBe("812-0000-0101");
    expect(formatPhoneInput("8120")).toBe("812-0");
  });

  it("9~12자리만 통과", () => {
    expect(isValidPhone("812-0000-0101")).toBe(true);
    expect(isValidPhone("81200")).toBe(false);
  });
});
