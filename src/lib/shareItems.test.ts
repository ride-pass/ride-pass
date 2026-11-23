import { describe, expect, it } from "vitest";
import type { ShareGrant } from "@/data/types";
import { ALL_SHARE_ITEMS, defaultShareItems, hasShareData, isActiveGrant, type ShareData } from "./shareItems";

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

/** 모든 자료가 있는 기사 */
const full: ShareData = { hasBankAccount: true, rentalPaymentCount: 90, slikKolektibilitas: 1, telecomBillCount: 6 };

describe("defaultShareItems", () => {
  it("렌털 신청 때 동의한 항목이 있으면 그대로", () => {
    expect(defaultShareItems(full, grant())).toEqual(["income", "activity"]);
  });

  it("동의가 없으면(홈에서 시작) 올린 자료 전부: 수입 명세서만 보내 평가 보류가 되지 않게", () => {
    expect(defaultShareItems(full, null)).toEqual([...ALL_SHARE_ITEMS]);
    expect(defaultShareItems(full, null)).toContain("activity");
  });

  it("입금 계좌가 없는 기사는 계좌 확인을 뺀다", () => {
    expect(defaultShareItems({ ...full, hasBankAccount: false }, null)).not.toContain("bank_account");
  });

  // 2026-11-23: Budi는 통신요금 기록이 없는데 「통신요금 납부 기록」이 보내는 항목에 나왔다
  it("자료가 없는 항목은 동의했어도 보내지 않는다", () => {
    const budi: ShareData = { ...full, telecomBillCount: 0 };
    expect(defaultShareItems(budi, grant({ items: [...ALL_SHARE_ITEMS] }))).toEqual([
      "income", "activity", "rental_history", "bank_account", "slik_report",
    ]);
    const agus: ShareData = { ...full, rentalPaymentCount: 0, slikKolektibilitas: null };
    expect(defaultShareItems(agus, null)).toEqual(["income", "activity", "bank_account", "telecom_bills"]);
  });

  it("자료를 아직 못 읽었으면 거르지 않는다", () => {
    expect(defaultShareItems(null, null)).toEqual([...ALL_SHARE_ITEMS]);
  });
});

describe("hasShareData", () => {
  it("수입 명세서·활동 기록은 늘 있다", () => {
    const none: ShareData = { hasBankAccount: false, rentalPaymentCount: 0, slikKolektibilitas: null, telecomBillCount: 0 };
    expect(ALL_SHARE_ITEMS.filter((i) => hasShareData(i, none))).toEqual(["income", "activity"]);
  });
});

describe("isActiveGrant", () => {
  it("철회했거나 기간이 지나면 유효하지 않다", () => {
    expect(isActiveGrant(grant())).toBe(true);
    expect(isActiveGrant(grant({ revokedAt: "2026-11-19" }))).toBe(false);
    expect(isActiveGrant(grant({ grantedAt: "2026-09-01", expiresAt: "2026-10-01" }))).toBe(false);
  });
});
