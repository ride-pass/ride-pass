import { describe, expect, it } from "vitest";
import type { ShareGrant } from "@/data/types";
import { ALL_SHARE_ITEMS, defaultShareItems, isActiveGrant } from "./shareItems";

const grant = (over: Partial<ShareGrant> = {}): ShareGrant => ({
  id: "g",
  riderId: "r-budi",
  partnerId: "p-rental-d",
  items: ["income", "activity"],
  grantedAt: "2026-11-19",
  expiresAt: "2026-12-19",
  revokedAt: null,
  ...over,
});

describe("defaultShareItems", () => {
  it("렌털 신청 때 동의한 항목이 있으면 그대로", () => {
    expect(defaultShareItems({ hasBankAccount: true }, grant())).toEqual(["income", "activity"]);
  });

  it("동의가 없으면(홈에서 시작) 올린 자료 전부: 수입 명세서만 보내 평가 보류가 되지 않게", () => {
    expect(defaultShareItems({ hasBankAccount: true }, null)).toEqual([...ALL_SHARE_ITEMS]);
    expect(defaultShareItems({ hasBankAccount: true }, null)).toContain("activity");
  });

  it("입금 계좌가 없는 기사는 계좌 확인을 뺀다", () => {
    expect(defaultShareItems({ hasBankAccount: false }, null)).not.toContain("bank_account");
  });
});

describe("isActiveGrant", () => {
  it("철회했거나 기간이 지나면 유효하지 않다", () => {
    expect(isActiveGrant(grant())).toBe(true);
    expect(isActiveGrant(grant({ revokedAt: "2026-11-19" }))).toBe(false);
    expect(isActiveGrant(grant({ grantedAt: "2026-09-01", expiresAt: "2026-10-01" }))).toBe(false);
  });
});
