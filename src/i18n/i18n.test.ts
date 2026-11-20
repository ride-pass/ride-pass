import { describe, expect, it } from "vitest";
import id from "./id.json";
import ko from "./ko.json";

type Tree = { [key: string]: string | Tree };

function keys(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([k, v]) =>
    k.startsWith("_") ? [] : typeof v === "string" ? [`${prefix}${k}`] : keys(v, `${prefix}${k}.`),
  );
}

// 엔진이 돌려주는 코드마다 문구가 있어야 한다 (CLAUDE.md 4-5 "설명 없는 점수는 만들지 않는다")
const REQUIRED = {
  "credit.reasons": [
    "INCOME_VERIFICATION_NEEDED", "SLIK_DELINQUENT", "REPAY_ON_TIME", "REPAY_LATE", "REPAY_NO_HISTORY",
    "INCOME_STABLE", "INCOME_VOLATILE", "DEPOSIT_MATCHED", "DEPOSIT_MISMATCH", "INCOME_HIGH",
    "INCOME_LOW", "LONG_HISTORY", "SHORT_HISTORY", "DATA_RELIABLE", "DATA_UNRELIABLE",
    "REPAY_NOT_SHARED", // 렌털사 화면 전용 (partnerView)
  ],
  "credit.actions": [
    "ADD_REPAYMENT_RECORDS", "PAY_ON_TIME", "KEEP_STEADY_INCOME", "UPLOAD_BANK_STATEMENT",
    "ADD_ALL_APP_SETTLEMENTS", "KEEP_ACTIVE", "RETAKE_CLEAR_PHOTO", "KEEP_UPLOADING",
  ],
  "credit.holds": ["NEED_RETAKE", "NEED_MORE_HISTORY", "NOT_SHARED_INCOME", "NOT_SHARED_ACTIVITY"],
  "credit.grades": ["A", "B", "C", "D", "E"],
  "credit.factors": ["repayment", "stability", "verifiedIncome", "incomeLevel", "continuity", "dataQuality"],
  // 「추천」 화면 (credit/products.ts, fixtures/products.json)
  "recommend.reasons": ["BEST_RATE_IN_CATEGORY", "GRADE_OK", "NO_GRADE_LIMIT"],
  "recommend.categories": ["loan", "installment", "rental", "insurance"],
  products: [
    "prod-bank-a-working.name", "prod-bank-b-micro.name", "prod-installment-c-multi.name",
    "prod-installment-c-moto.name", "prod-rental-d-ev.name", "prod-insurance-e-accident.name",
  ],
};

describe("i18n", () => {
  it("한국어와 인니어의 키가 같다", () => {
    expect(keys(id as Tree).sort()).toEqual(keys(ko as Tree).sort());
  });

  it("엔진 코드마다 문구가 있다", () => {
    const all = new Set(keys(ko as Tree));
    for (const [prefix, codes] of Object.entries(REQUIRED)) {
      for (const code of codes) expect(all, `${prefix}.${code}`).toContain(`${prefix}.${code}`);
    }
  });

  it("쓰지 않는 말이 없다 (CLAUDE.md 2-2)", () => {
    const text = JSON.stringify(ko);
    for (const banned of ["신용점수", "승인 보장", "승인율", "저금리", "예상 한도", "OJK 인증", "자동 동기화", "금융 평판 점수"]) {
      expect(text, banned).not.toContain(banned);
    }
  });
});
