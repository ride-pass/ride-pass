import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/date";
import { deriveRiderMetrics, type RiderRecords } from "./derive";
import type {
  Deposit,
  PlatformId,
  RentalPayment,
  Rider,
  SettlementCapture,
  SlikReport,
  TelecomBill,
} from "./types";

const TODAY = "2026-11-19";

// ---- 테스트용 가짜 기록 만들기 (fixture 아님) ----

function rider(firstActiveDate: string): Rider {
  return {
    id: "r-test",
    displayName: "Test Rider",
    phoneMasked: "+62 812-0000-0199",
    area: "Jakarta Selatan",
    avatarKey: "test",
    platforms: ["ride_app_a"],
    firstActiveDate,
    hasBankAccount: true,
  };
}

let seq = 0;
function capture(
  periodDate: string,
  netAmount: number,
  opts: { platform?: PlatformId; ocrConfidence?: number; editFlags?: string[] } = {},
): SettlementCapture {
  return {
    id: `c-${String(++seq).padStart(4, "0")}`,
    riderId: "r-test",
    platform: opts.platform ?? "ride_app_a",
    imagePath: "/samples/test.png",
    periodDate,
    ocr: { grossAmount: netAmount, platformFee: 0, netAmount, tripCount: 10 },
    ocrConfidence: opts.ocrConfidence ?? 0.95,
    editFlags: opts.editFlags ?? [],
  };
}

function deposit(date: string, amount: number): Deposit {
  return {
    id: `d-${++seq}`,
    riderId: "r-test",
    date,
    amount,
    source: "bank_c",
    counterpartyLabel: "호출 앱 A 정산",
  };
}

function rental(dueDate: string, paidDate: string | null): RentalPayment {
  return {
    id: `p-${++seq}`,
    riderId: "r-test",
    partnerId: "p-rental-d",
    dueDate,
    paidDate,
    amount: 55000,
  };
}

/** 기준일에서 거꾸로 n일 전 (0 = 오늘) */
const ago = (n: number) => addDays(TODAY, -n);

/** fromAgo일 전부터 toAgo일 전까지 매일 같은 금액 정산 */
function dailyCaptures(fromAgo: number, toAgo: number, net: number): SettlementCapture[] {
  const out: SettlementCapture[] = [];
  for (let n = fromAgo; n >= toAgo; n--) out.push(capture(ago(n), net));
  return out;
}

function records(partial: Partial<RiderRecords> & { firstActiveDate?: string }): RiderRecords {
  return {
    rider: rider(partial.firstActiveDate ?? ago(400)),
    captures: partial.captures ?? [],
    deposits: partial.deposits ?? [],
    rentalPayments: partial.rentalPayments ?? [],
    slikReports: partial.slikReports ?? [],
    telecomBills: partial.telecomBills ?? [],
  };
}

function slik(
  reportDate: string,
  worstKolektibilitas: SlikReport["worstKolektibilitas"],
  activeFacilities = 1,
): SlikReport {
  return {
    id: `s-${++seq}`,
    riderId: "r-test",
    reportDate,
    uploadedAt: reportDate,
    filePath: "/samples/ideb-test.pdf",
    worstKolektibilitas,
    activeFacilities,
    parseConfidence: 0.95,
  };
}

function bill(dueDate: string, paidDate: string | null): TelecomBill {
  return {
    id: `t-${++seq}`,
    riderId: "r-test",
    providerLabel: "통신사 F",
    month: dueDate.slice(0, 7),
    dueDate,
    paidDate,
    amount: 75000,
  };
}

const derive = (r: RiderRecords) => deriveRiderMetrics(r, TODAY);

// ---- 테스트 ----

describe("월 순수입 · 활동일 · 사용 앱 수 (최근 30일)", () => {
  it("30일 경계: 29일 전은 포함, 30일 전과 미래는 제외", () => {
    const m = derive(
      records({
        captures: [
          capture(ago(30), 1000),
          capture(ago(29), 200),
          capture(TODAY, 30),
          capture(addDays(TODAY, 1), 4000),
        ],
      }),
    );
    expect(m.monthlyNet).toBe(230);
    expect(m.activeDays30).toBe(2);
  });

  it("같은 날 두 앱 정산은 활동일 1일, 앱 2개", () => {
    const m = derive(
      records({
        captures: [
          capture(ago(1), 100, { platform: "ride_app_a" }),
          capture(ago(1), 100, { platform: "delivery_app_b" }),
          capture(ago(40), 100, { platform: "ride_app_c" }),
        ],
      }),
    );
    expect(m.activeDays30).toBe(1);
    expect(m.platformCount30).toBe(2);
  });
});

describe("월별 순수입 (30일 단위)", () => {
  it("3개월 평균과 6개월 추이 (오래된 달 → 최근 달)", () => {
    const captures = [
      ...dailyCaptures(179, 90, 100), // 4~6번째 달: 하루 100
      ...dailyCaptures(89, 0, 200), // 최근 3개월: 하루 200
    ];
    const m = derive(records({ captures }));
    expect(m.monthlyNetSeries6m).toEqual([3000, 3000, 3000, 6000, 6000, 6000]);
    expect(m.avgMonthlyNet3m).toBe(6000);
  });

  it("첫 활동일 이전이 섞인 달은 빼고 계산한다", () => {
    // 활동 70일: 최근 2개 달만 온전하다
    const m = derive(
      records({ firstActiveDate: ago(69), captures: dailyCaptures(69, 0, 100) }),
    );
    expect(m.monthlyNetSeries6m).toEqual([3000, 3000]);
    expect(m.avgMonthlyNet3m).toBe(3000);
  });
});

describe("연속 활동 개월", () => {
  it("공백이 없으면 첫 활동일부터 센다 (기록 없는 앞부분은 공백 아님)", () => {
    // 첫 활동일은 245일 전이지만 기록은 최근 180일만 있다
    const m = derive(
      records({ firstActiveDate: "2026-03-19", captures: dailyCaptures(179, 0, 100) }),
    );
    expect(m.consecutiveActiveMonths).toBe(8); // floor(245 / 30)
  });

  it("15일 공백이 있으면 공백 뒤부터 다시 센다", () => {
    const captures = [
      ...dailyCaptures(179, 116, 100),
      // 115~101일 전: 15일 공백
      ...dailyCaptures(100, 0, 100),
    ];
    const m = derive(records({ firstActiveDate: ago(179), captures }));
    expect(m.consecutiveActiveMonths).toBe(3); // floor(100 / 30)
  });

  it("14일 공백은 끊긴 것으로 보지 않는다", () => {
    const captures = [...dailyCaptures(179, 115, 100), ...dailyCaptures(100, 0, 100)];
    const m = derive(records({ firstActiveDate: ago(179), captures }));
    expect(m.consecutiveActiveMonths).toBe(5); // floor(179 / 30)
  });

  it("마지막 기록 뒤로 15일 이상 쉬고 있으면 0", () => {
    const m = derive(
      records({ firstActiveDate: ago(179), captures: dailyCaptures(179, 16, 100) }),
    );
    expect(m.consecutiveActiveMonths).toBe(0);
  });

  it("기록이 없으면 0", () => {
    expect(derive(records({})).consecutiveActiveMonths).toBe(0);
  });
});

describe("입금 일치율", () => {
  it("정산이 다음 날 같은 금액으로 들어오면 1 (오늘 정산분은 비교하지 않음)", () => {
    const captures = dailyCaptures(40, 0, 100000);
    const deposits = captures.map((c) => deposit(addDays(c.periodDate, 1), c.ocr.netAmount));
    const m = derive(records({ captures, deposits }));
    expect(m.depositMatchRate).toBe(1);
    expect(m.warnings).toEqual([]);
  });

  it("입금이 정산의 45%면 0.45와 amount_mismatch 경고", () => {
    const captures = dailyCaptures(40, 0, 100000);
    const deposits = captures.map((c) => deposit(addDays(c.periodDate, 1), 45000));
    const m = derive(records({ captures, deposits }));
    expect(m.depositMatchRate).toBeCloseTo(0.45, 10);
    expect(m.warnings).toEqual(["amount_mismatch"]);
  });

  it("입금이 정산보다 많아도 1을 넘지 않는다", () => {
    const captures = dailyCaptures(40, 0, 100);
    const deposits = captures.map((c) => deposit(addDays(c.periodDate, 1), 500));
    expect(derive(records({ captures, deposits })).depositMatchRate).toBe(1);
  });

  it("비교할 정산이 없으면 null, 경고 없음", () => {
    const m = derive(records({ captures: [capture(TODAY, 100)] }));
    expect(m.depositMatchRate).toBeNull();
    expect(m.warnings).toEqual([]);
  });
});

describe("렌털 정시 납부율", () => {
  it("이력이 없으면 null", () => {
    const m = derive(records({}));
    expect(m.rentalOnTimeRate).toBeNull();
    expect(m.rentalPaymentCount).toBe(0);
  });

  it("하루 늦음과 미납은 정시가 아니다. 납기가 미래인 건은 세지 않는다", () => {
    const rentalPayments = [
      ...Array.from({ length: 7 }, (_, i) => rental(ago(i + 3), ago(i + 3))),
      rental(ago(20), ago(19)), // 하루 늦음
      rental(ago(21), ago(20)), // 하루 늦음
      rental(ago(2), null), // 미납
      rental(addDays(TODAY, 1), null), // 아직 납기 전
    ];
    const m = derive(records({ rentalPayments }));
    expect(m.rentalPaymentCount).toBe(10);
    expect(m.rentalOnTimeRate).toBeCloseTo(0.7, 10);
  });
});

describe("OCR 신뢰도 · 기록 일수 · 위변조 신호", () => {
  it("평균과 최신 촬영의 신뢰도", () => {
    const m = derive(
      records({
        captures: [
          capture(ago(2), 100, { ocrConfidence: 0.95 }),
          capture(ago(1), 100, { ocrConfidence: 0.95 }),
          capture(TODAY, 100, { ocrConfidence: 0.55 }),
        ],
      }),
    );
    expect(m.avgOcrConfidence).toBeCloseTo(0.8166, 3);
    expect(m.latestOcrConfidence).toBe(0.55);
  });

  it("기록 일수는 첫 정산부터 기준일까지 (양 끝 포함)", () => {
    expect(derive(records({ captures: [capture(ago(59), 100)] })).historyDays).toBe(60);
    expect(derive(records({})).historyDays).toBe(0);
  });

  it("editFlags는 중복 없이 경고에 들어가고, amount_mismatch가 맨 앞", () => {
    const captures = [
      ...dailyCaptures(40, 2, 100000),
      capture(ago(1), 100000, { editFlags: ["duplicate_image"] }),
      capture(TODAY, 100000, { editFlags: ["duplicate_image"] }),
    ];
    const deposits = captures.map((c) => deposit(addDays(c.periodDate, 1), 10000));
    const m = derive(records({ captures, deposits }));
    expect(m.editFlags).toEqual(["duplicate_image"]);
    expect(m.warnings).toEqual(["amount_mismatch", "duplicate_image"]);
  });

  it("촬영이 없으면 신뢰도는 null", () => {
    const m = derive(records({}));
    expect(m.avgOcrConfidence).toBeNull();
    expect(m.latestOcrConfidence).toBeNull();
  });
});

describe("SLIK 확인서", () => {
  it("없으면 null", () => {
    const m = derive(records({}));
    expect(m.slikKolektibilitas).toBeNull();
    expect(m.slikActiveFacilities).toBeNull();
    expect(m.slikParseConfidence).toBeNull();
  });

  it("가장 최근 발급분을 쓴다. 기준일 이후 발급분은 무시한다", () => {
    const m = derive(
      records({
        slikReports: [slik(ago(60), 3, 2), slik(ago(7), 1, 1), slik(addDays(TODAY, 1), 5, 4)],
      }),
    );
    expect(m.slikKolektibilitas).toBe(1);
    expect(m.slikActiveFacilities).toBe(1);
    expect(m.slikParseConfidence).toBe(0.95);
  });
});

describe("통신요금 정시 납부율 (최근 6개월)", () => {
  it("없으면 null", () => {
    const m = derive(records({}));
    expect(m.telecomOnTimeRate).toBeNull();
    expect(m.telecomBillCount).toBe(0);
  });

  it("6개월(180일) 안의 납기만 세고, 늦음·미납은 정시가 아니다", () => {
    const m = derive(
      records({
        telecomBills: [
          bill(ago(10), ago(10)),
          bill(ago(40), ago(41)),
          bill(ago(70), ago(68)), // 이틀 늦음
          bill(ago(100), null), // 미납
          bill(ago(179), ago(179)),
          bill(ago(180), ago(180)), // 기간 밖
          bill(addDays(TODAY, 5), null), // 아직 납기 전
        ],
      }),
    );
    expect(m.telecomBillCount).toBe(5);
    expect(m.telecomOnTimeRate).toBeCloseTo(3 / 5, 10);
  });
});
