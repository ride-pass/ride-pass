import { describe, expect, it } from "vitest";
import { formatDate, formatRupiah } from "./format";

describe("formatRupiah", () => {
  it.each([
    [0, "Rp 0"],
    [999, "Rp 999"],
    [1000, "Rp 1.000"],
    [55000, "Rp 55.000"],
    [1250000, "Rp 1.250.000"],
    [5200000, "Rp 5.200.000"],
    [1234567890, "Rp 1.234.567.890"],
  ])("%d → %s", (amount, expected) => {
    expect(formatRupiah(amount)).toBe(expected);
  });

  it("정수로 반올림한다", () => {
    expect(formatRupiah(5199999.6)).toBe("Rp 5.200.000");
  });

  it("음수는 앞에 - 를 붙인다", () => {
    expect(formatRupiah(-55000)).toBe("-Rp 55.000");
  });

  it("숫자가 아니면 오류", () => {
    expect(() => formatRupiah(NaN)).toThrow();
  });
});

describe("formatDate", () => {
  it("한국어", () => {
    expect(formatDate("2026-11-19", "ko")).toBe("2026년 11월 19일");
    expect(formatDate("2026-05-05", "ko")).toBe("2026년 5월 5일");
  });

  it("인도네시아어 (월 약어는 인니어)", () => {
    expect(formatDate("2026-11-19", "id")).toBe("19 Nov 2026");
    expect(formatDate("2026-05-05", "id")).toBe("5 Mei 2026");
    expect(formatDate("2026-08-17", "id")).toBe("17 Agu 2026");
    expect(formatDate("2026-10-01", "id")).toBe("1 Okt 2026");
    expect(formatDate("2026-12-31", "id")).toBe("31 Des 2026");
  });

  it("잘못된 날짜는 오류", () => {
    expect(() => formatDate("2026-13-01", "ko")).toThrow();
    expect(() => formatDate("2026-02-30", "ko")).toThrow();
    expect(() => formatDate("19/11/2026", "ko")).toThrow();
  });
});
