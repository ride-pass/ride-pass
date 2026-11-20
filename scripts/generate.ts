// 시연용 더미 데이터 생성 (CLAUDE.md 4-2, 4-6). 부수효과 없이 FixtureSet만 돌려준다.
// 모든 기사·기관·앱은 가상이다. 실제 플랫폼·금융사 이름을 넣지 않는다 (CLAUDE.md 2-3).

import { DEMO_TODAY, SEED } from "@/config/demo";
import type { FixtureSet } from "@/data/fixtureSet";
import type {
  Application,
  Deposit,
  Partner,
  Product,
  PlatformId,
  RentalPayment,
  Rider,
  SettlementCapture,
  ShareGrant,
  SlikReport,
  TelecomBill,
} from "@/data/types";
import { addDays, dayOfWeek, parseIsoDate, type IsoDate } from "@/lib/date";
import { createRandom, type Random } from "./random";

/** 생성 기간: 기준일 포함 지난 180일 */
export const SEED_DAYS = 180;
/** 수수료율: 총액의 8% (배달 앱도 같게 둔다) */
export const FEE_RATE = 0.08;
/** 일일 정산 흔들기: ±20% */
const DAILY_JITTER = 0.2;
/** 렌털 일할 납부액과 기간 */
export const RENTAL_DAILY_AMOUNT = 55_000;
export const RENTAL_DAYS = 90;
/** 이 일수 동안 쉬는 날 1일 → 30일 중 평균 활동일 = 30 × 6/7 */
const WORK_DAYS_PER_30 = (30 * 6) / 7;
/** 건당 평균 총액 (건수 계산용, 가정값) */
const FARE_PER_TRIP: Record<PlatformId, number> = {
  ride_app_a: 18_000,
  ride_app_c: 17_000,
  delivery_app_b: 14_000,
};
/** 입금 표기 (가상 앱 이름) */
const COUNTERPARTY_LABEL: Record<PlatformId, string> = {
  ride_app_a: "호출 앱 A 정산",
  delivery_app_b: "배달 앱 B 정산",
  ride_app_c: "호출 앱 C 정산",
};
const PLATFORM_SHORT: Record<PlatformId, string> = {
  ride_app_a: "a",
  delivery_app_b: "b",
  ride_app_c: "c",
};

export const RENTAL_PARTNER_ID = "p-rental-d";
/** 통신요금: 가상 통신사, 월 납부액, 기간 (CLAUDE.md 4-6) */
export const TELECOM_PROVIDER_LABEL = "통신사 F";
export const TELECOM_MONTHLY_AMOUNT = 75_000;
export const TELECOM_MONTHS = 6;
const TELECOM_DUE_DAY = 15;

export const PARTNERS: Partner[] = [
  // 이름의 알파벳은 「제출할 곳 고르기」에서 위에서부터 보이는 순서다: 대출 → 할부 → 렌털 → 보험 (2026-11-20)
  // TODO: 원어민 검수 (nameId)
  { id: "p-bank-a", nameKo: "은행 A", nameId: "Bank A", type: "bank" },
  { id: "p-bank-b", nameKo: "은행 B", nameId: "Bank B", type: "bank" },
  { id: "p-installment-c", nameKo: "할부사 C", nameId: "Mitra Cicilan C", type: "installment" },
  { id: "p-rental-d", nameKo: "렌털사 D (전기 오토바이)", nameId: "Mitra Rental D", type: "ev_rental" },
  { id: "p-insurance-e", nameKo: "보험사 E", nameId: "Asuransi E", type: "insurance" },
];

/**
 * 「추천」 화면의 가상 상품 (2026-11-20 멘토링 뒤 추가, CLAUDE.md 2-1). 금리·요금은 모두 예시다.
 * 대출이 셋은 있어야 추천 3개가 대출로 채워진다. 등급이 낮을수록 예시 금리가 높고, 받는 등급이 줄어든다.
 */
export const PRODUCTS: Product[] = [
  { id: "prod-bank-a-working", partnerId: "p-bank-a", category: "loan", termMonths: [6, 24], exampleRateByGrade: { A: 14, B: 17, C: 21 }, examplePrice: null },
  { id: "prod-bank-b-micro", partnerId: "p-bank-b", category: "loan", termMonths: [3, 12], exampleRateByGrade: { A: 16, B: 19, C: 23, D: 27 }, examplePrice: null },
  { id: "prod-installment-c-multi", partnerId: "p-installment-c", category: "loan", termMonths: [6, 24], exampleRateByGrade: { A: 22, B: 25, C: 29, D: 34 }, examplePrice: null },
  { id: "prod-installment-c-moto", partnerId: "p-installment-c", category: "installment", termMonths: [12, 36], exampleRateByGrade: { A: 18, B: 21, C: 25, D: 30 }, examplePrice: null },
  { id: "prod-rental-d-ev", partnerId: "p-rental-d", category: "rental", termMonths: null, exampleRateByGrade: null, examplePrice: { amount: 55_000, per: "day" } },
  { id: "prod-insurance-e-accident", partnerId: "p-insurance-e", category: "insurance", termMonths: null, exampleRateByGrade: null, examplePrice: { amount: 25_000, per: "month" } },
];

export interface PersonaSpec {
  rider: Rider;
  /** 앱별 몫 (합 1). 일하는 날마다 모든 앱에서 정산을 받는다 */
  platformShares: Partial<Record<PlatformId, number>>;
  /** 최근 30일 순수입 목표값 (Rp) */
  monthlyNetTarget: number;
  /** 매주 쉬는 요일 (0 = 일요일) */
  restWeekday: number;
  /** 입금액 / 정산 순수입. r-agus만 0.45 */
  depositRatio: number;
  depositSource: Deposit["source"];
  /** 렌털 납부 이력: 전부 정시 / 2회 하루 늦음 / 없음 */
  rental: "all_on_time" | "two_late" | null;
  /** 최신 촬영 1장을 흐리게 (OCR 신뢰도 0.55) */
  blurLatest: boolean;
  /** SLIK 확인서 (r-budi만). 발급일은 기준일 며칠 전인지 */
  slik: { worstKolektibilitas: SlikReport["worstKolektibilitas"]; activeFacilities: number; daysAgo: number } | null;
  /** 통신요금 최근 6개월 전부 정시 (r-dewi만) */
  telecomOnTime: boolean;
  /** 처음부터 렌털사 D에 들어 있는 신청의 제출일. null이면 시연 중 기사가 직접 제출한다 */
  applicationDate: IsoDate | null;
}

export const PERSONAS: PersonaSpec[] = [
  {
    rider: {
      id: "r-budi",
      displayName: "Budi Santoso",
      phoneMasked: "+62 812-0000-0101",
      area: "Jakarta Selatan",
      avatarKey: "avatar-budi",
      platforms: ["ride_app_a", "delivery_app_b"],
      firstActiveDate: "2026-03-19",
      hasBankAccount: true,
    },
    platformShares: { ride_app_a: 0.6, delivery_app_b: 0.4 },
    monthlyNetTarget: 5_200_000,
    restWeekday: 0,
    depositRatio: 1,
    depositSource: "bank_c",
    rental: "two_late",
    blurLatest: false,
    slik: { worstKolektibilitas: 1, activeFacilities: 1, daysAgo: 7 },
    telecomOnTime: false,
    applicationDate: null,
  },
  {
    rider: {
      id: "r-siti",
      displayName: "Siti Rahayu",
      phoneMasked: "+62 812-0000-0102",
      area: "Jakarta Timur",
      avatarKey: "avatar-siti",
      platforms: ["delivery_app_b"],
      firstActiveDate: "2026-07-19",
      hasBankAccount: false,
    },
    platformShares: { delivery_app_b: 1 },
    monthlyNetTarget: 3_400_000,
    restWeekday: 5,
    depositRatio: 1,
    depositSource: "wallet_x",
    rental: null,
    blurLatest: false,
    slik: null,
    telecomOnTime: false,
    applicationDate: "2026-11-15",
  },
  {
    rider: {
      id: "r-agus",
      displayName: "Agus Pratama",
      phoneMasked: "+62 812-0000-0103",
      area: "Depok",
      avatarKey: "avatar-agus",
      platforms: ["ride_app_a"],
      firstActiveDate: "2026-04-19",
      hasBankAccount: true,
    },
    platformShares: { ride_app_a: 1 },
    monthlyNetTarget: 6_800_000,
    restWeekday: 1,
    depositRatio: 0.45,
    depositSource: "bank_c",
    rental: null,
    blurLatest: false,
    slik: null,
    telecomOnTime: false,
    applicationDate: "2026-11-16",
  },
  {
    rider: {
      id: "r-dewi",
      displayName: "Dewi Lestari",
      phoneMasked: "+62 812-0000-0104",
      area: "Tangerang Selatan",
      avatarKey: "avatar-dewi",
      platforms: ["ride_app_a", "ride_app_c"],
      firstActiveDate: "2025-12-19",
      hasBankAccount: true,
    },
    platformShares: { ride_app_a: 0.6, ride_app_c: 0.4 },
    monthlyNetTarget: 4_600_000,
    restWeekday: 3,
    depositRatio: 1,
    depositSource: "bank_c",
    rental: "all_on_time",
    blurLatest: false,
    slik: null,
    telecomOnTime: true,
    applicationDate: "2026-11-17",
  },
  {
    rider: {
      id: "r-rizky",
      displayName: "Rizky Hidayat",
      phoneMasked: "+62 812-0000-0105",
      area: "Bekasi",
      avatarKey: "avatar-rizky",
      platforms: ["delivery_app_b"],
      firstActiveDate: "2026-05-19",
      hasBankAccount: true,
    },
    platformShares: { delivery_app_b: 1 },
    monthlyNetTarget: 2_800_000,
    restWeekday: 2,
    depositRatio: 1,
    depositSource: "bank_c",
    rental: null,
    blurLatest: true,
    slik: null,
    telecomOnTime: false,
    applicationDate: "2026-11-18",
  },
];

const round100 = (n: number) => Math.round(n / 100) * 100;
const round2 = (n: number) => Math.round(n * 100) / 100;
const compact = (iso: IsoDate) => iso.replaceAll("-", "");
const shortId = (riderId: string) => riderId.replace(/^r-/, "");

function generateCaptures(p: PersonaSpec, rng: Random, today: IsoDate): SettlementCapture[] {
  const out: SettlementCapture[] = [];
  const windowStart = addDays(today, -(SEED_DAYS - 1));
  const start = p.rider.firstActiveDate > windowStart ? p.rider.firstActiveDate : windowStart;
  const dailyBase = p.monthlyNetTarget / WORK_DAYS_PER_30;

  for (let d = start; d <= today; d = addDays(d, 1)) {
    if (dayOfWeek(d) === p.restWeekday) continue;
    const dayNet = dailyBase * rng.range(1 - DAILY_JITTER, 1 + DAILY_JITTER);

    for (const platform of p.rider.platforms) {
      const share = p.platformShares[platform] ?? 0;
      // 순수입을 먼저 정하고 총액·수수료를 거꾸로 맞춘다
      const gross = round100((dayNet * share) / (1 - FEE_RATE));
      const fee = round100(gross * FEE_RATE);
      out.push({
        id: `c-${shortId(p.rider.id)}-${compact(d)}-${PLATFORM_SHORT[platform]}`,
        riderId: p.rider.id,
        platform,
        imagePath: `/samples/${platform}.png`,
        periodDate: d,
        ocr: {
          grossAmount: gross,
          platformFee: fee,
          netAmount: gross - fee,
          tripCount: Math.max(1, Math.round(gross / FARE_PER_TRIP[platform])),
          rating: Math.round(rng.range(4.6, 5.0) * 10) / 10,
        },
        ocrConfidence: round2(rng.range(0.92, 0.99)),
        editFlags: [],
      });
    }
  }
  return out;
}

function generateDeposits(
  p: PersonaSpec,
  captures: SettlementCapture[],
  rng: Random,
  today: IsoDate,
): Deposit[] {
  const out: Deposit[] = [];
  for (const c of captures) {
    const date = addDays(c.periodDate, 1); // 다음 날 입금
    if (date > today) continue;
    const amount =
      p.depositRatio === 1
        ? c.ocr.netAmount
        : round100(c.ocr.netAmount * p.depositRatio * rng.range(0.9, 1.1));
    out.push({
      id: c.id.replace(/^c-/, "d-"),
      riderId: p.rider.id,
      date,
      amount,
      source: p.depositSource,
      counterpartyLabel: COUNTERPARTY_LABEL[c.platform],
    });
  }
  return out;
}

function generateRentalPayments(p: PersonaSpec, rng: Random, today: IsoDate): RentalPayment[] {
  if (!p.rental) return [];
  const dueDates = Array.from({ length: RENTAL_DAYS }, (_, i) =>
    addDays(today, -(RENTAL_DAYS - 1) + i),
  );
  const late = new Set<number>();
  if (p.rental === "two_late") {
    // 오늘 납기분이 늦으면 납부일이 미래가 되므로 마지막 10일은 고르지 않는다
    while (late.size < 2) late.add(rng.int(0, RENTAL_DAYS - 11));
  }
  return dueDates.map((dueDate, i) => ({
    id: `rp-${shortId(p.rider.id)}-${compact(dueDate)}`,
    riderId: p.rider.id,
    partnerId: RENTAL_PARTNER_ID,
    dueDate,
    paidDate: late.has(i) ? addDays(dueDate, 1) : dueDate,
    amount: RENTAL_DAILY_AMOUNT,
  }));
}

function generateSlikReports(p: PersonaSpec, rng: Random, today: IsoDate): SlikReport[] {
  if (!p.slik) return [];
  const reportDate = addDays(today, -p.slik.daysAgo);
  return [
    {
      id: `slik-${shortId(p.rider.id)}-${compact(reportDate)}`,
      riderId: p.rider.id,
      reportDate,
      uploadedAt: today,
      filePath: `/samples/ideb-${shortId(p.rider.id)}.pdf`,
      worstKolektibilitas: p.slik.worstKolektibilitas,
      activeFacilities: p.slik.activeFacilities,
      parseConfidence: round2(rng.range(0.92, 0.99)),
    },
  ];
}

function generateTelecomBills(p: PersonaSpec, rng: Random, today: IsoDate): TelecomBill[] {
  if (!p.telecomOnTime) return [];
  const { year, month } = parseIsoDate(today);
  const out: TelecomBill[] = [];
  // 이번 달 납기가 기준일 이후면 지난달까지 센다
  const latestOffset = TELECOM_DUE_DAY <= parseIsoDate(today).day ? 0 : 1;
  for (let i = TELECOM_MONTHS - 1 + latestOffset; i >= latestOffset; i--) {
    const m0 = year * 12 + (month - 1) - i;
    const ym = `${Math.floor(m0 / 12)}-${String((m0 % 12) + 1).padStart(2, "0")}`;
    const dueDate = `${ym}-${String(TELECOM_DUE_DAY).padStart(2, "0")}`;
    out.push({
      id: `tb-${shortId(p.rider.id)}-${ym}`,
      riderId: p.rider.id,
      providerLabel: TELECOM_PROVIDER_LABEL,
      month: ym,
      dueDate,
      paidDate: addDays(dueDate, -rng.int(0, 3)), // 납기일이나 그 며칠 전에 낸다
      amount: TELECOM_MONTHLY_AMOUNT,
    });
  }
  return out;
}

export function generateFixtures(today: IsoDate = DEMO_TODAY): FixtureSet {
  const fx: FixtureSet = {
    riders: [],
    partners: PARTNERS,
    products: PRODUCTS,
    captures: [],
    deposits: [],
    rentalPayments: [],
    slikReports: [],
    telecomBills: [],
    applications: [],
    shareGrants: [],
    retakes: [],
  };

  PERSONAS.forEach((p, index) => {
    // 기사마다 따로 돌리는 난수: 한 사람 설정을 고쳐도 다른 사람 데이터는 그대로다
    const rng = createRandom(SEED + index);
    const captures = generateCaptures(p, rng, today);

    if (p.blurLatest) {
      const latest = captures[captures.length - 1];
      fx.retakes.push({ ...latest, ocrConfidence: 0.96 });
      latest.ocrConfidence = 0.55;
    }

    fx.riders.push(p.rider);
    fx.captures.push(...captures);
    fx.deposits.push(...generateDeposits(p, captures, rng, today));
    fx.rentalPayments.push(...generateRentalPayments(p, rng, today));
    fx.slikReports.push(...generateSlikReports(p, rng, today));
    fx.telecomBills.push(...generateTelecomBills(p, rng, today));

    if (p.applicationDate) {
      const application: Application = {
        id: `app-${shortId(p.rider.id)}-rental-a`,
        riderId: p.rider.id,
        partnerId: RENTAL_PARTNER_ID,
        submittedAt: p.applicationDate,
        status: "pending",
      };
      const grant: ShareGrant = {
        id: `sg-${shortId(p.rider.id)}-rental-a`,
        riderId: p.rider.id,
        partnerId: RENTAL_PARTNER_ID,
        items: [
          "income",
          "activity",
          "rental_history",
          ...(p.rider.hasBankAccount ? (["bank_account"] as const) : []),
          ...(p.slik ? (["slik_report"] as const) : []),
          ...(p.telecomOnTime ? (["telecom_bills"] as const) : []),
        ],
        grantedAt: p.applicationDate,
        expiresAt: addDays(p.applicationDate, 30),
        revokedAt: null,
      };
      fx.applications.push(application);
      fx.shareGrants.push(grant);
    }
  });

  return fx;
}
