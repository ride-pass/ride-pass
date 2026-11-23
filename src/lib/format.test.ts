import { describe, expect, it } from "vitest";
import { formatDate, formatMonth, formatRupiah, formatRupiah100, formatRupiahCompact, formatShortDate } from "./format";

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

describe("formatMonth · formatShortDate", () => {
  it("한국어", () => {
    expect(formatMonth("2026-11-19", "ko")).toBe("11월");
    expect(formatShortDate("2026-11-19", "ko")).toBe("11.19");
    expect(formatShortDate("2026-06-03", "ko")).toBe("6.3");
  });
  it("인니어", () => {
    expect(formatMonth("2026-08-01", "id")).toBe("Agu");
    expect(formatShortDate("2026-11-19", "id")).toBe("19/11");
  });
});

describe("formatRupiahCompact", () => {
  it("한국어는 만 단위", () => {
    expect(formatRupiahCompact(5_503_000, "ko")).toBe("550만");
    expect(formatRupiahCompact(12_345_000, "ko")).toBe("1,235만");
  });
  it("인니어는 juta(백만) 단위, 소수점은 쉼표", () => {
    expect(formatRupiahCompact(5_503_000, "id")).toBe("5,5 jt");
    expect(formatRupiahCompact(2_800_000, "id")).toBe("2,8 jt");
  });
});

describe("formatRupiah100", () => {
  it("100루피아 단위로 반올림", () => {
    expect(formatRupiah100(5_190_567)).toBe("Rp 5.190.600");
    expect(formatRupiah100(5_190_549)).toBe("Rp 5.190.500");
  });
});
