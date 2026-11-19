import { describe, expect, it } from "vitest";
import { addDays, dayOfWeek, diffDays, isWithin } from "./date";

describe("date", () => {
  it("addDays: 달·해를 넘긴다", () => {
    expect(addDays("2026-11-19", 1)).toBe("2026-11-20");
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-11-19", -180)).toBe("2026-05-23");
  });

  it("diffDays", () => {
    expect(diffDays("2026-11-19", "2026-11-19")).toBe(0);
    expect(diffDays("2026-03-19", "2026-11-19")).toBe(245);
    expect(diffDays("2026-11-19", "2026-11-18")).toBe(-1);
  });

  it("isWithin: 양 끝 포함", () => {
    expect(isWithin("2026-10-21", "2026-10-21", "2026-11-19")).toBe(true);
    expect(isWithin("2026-11-19", "2026-10-21", "2026-11-19")).toBe(true);
    expect(isWithin("2026-10-20", "2026-10-21", "2026-11-19")).toBe(false);
  });

  it("dayOfWeek: 2026-11-19는 목요일", () => {
    expect(dayOfWeek("2026-11-19")).toBe(4);
    expect(dayOfWeek("2026-11-22")).toBe(0);
  });
});
