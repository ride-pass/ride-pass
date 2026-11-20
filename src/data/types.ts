// CLAUDE.md 4-3 데이터 모델 (계약). 필드를 바꾸려면 CLAUDE.md 4-3을 먼저 고친다.

export type PlatformId = "ride_app_a" | "delivery_app_b" | "ride_app_c";
export type PartnerType = "ev_rental" | "installment" | "bank" | "insurance";

export interface Rider {
  id: string;                 // "r-budi"
  displayName: string;        // "Budi Santoso" (가상)
  phoneMasked: string;        // "+62 812-0000-0101"
  area: string;               // "Jakarta Selatan"
  avatarKey: string;          // 일러스트 아바타 키
  platforms: PlatformId[];
  firstActiveDate: string;    // "2026-03-19" (ISO, DEMO_TODAY 기준으로 생성)
  hasBankAccount: boolean;
}

// 기사가 찍은 정산 화면 한 장 = 한 기록
export interface SettlementCapture {
  id: string;
  riderId: string;
  platform: PlatformId;
  imagePath: string;          // public/samples/... (가짜 정산 화면)
  periodDate: string;         // 정산 대상 날짜
  ocr: {
    grossAmount: number;      // 총 매출 (Rp, 정수)
    platformFee: number;      // 수수료 (Rp)
    netAmount: number;        // 순수입 = gross - fee
    tripCount: number;
    rating?: number;          // 4.0~5.0
  };
  ocrConfidence: number;      // 0~1. 0.7 미만이면 재촬영 요청
  editFlags: string[];        // 위변조 의심 신호. 예: "duplicate_image", "amount_mismatch"
}

// 은행·전자지갑 입금 한 건
export interface Deposit {
  id: string;
  riderId: string;
  date: string;
  amount: number;
  source: "bank_c" | "wallet_x";
  counterpartyLabel: string;  // "호출 앱 A 정산" 같은 가상 표기
}

// 렌털사 일할 납부 한 건
export interface RentalPayment {
  id: string;
  riderId: string;
  partnerId: string;
  dueDate: string;
  paidDate: string | null;    // null = 미납
  amount: number;             // 예: 55000
}

export interface Partner {
  id: string;                 // "p-rental-d"
  nameKo: string;             // "렌털사 D (전기 오토바이)"
  nameId: string;             // "Mitra Rental D"
  type: PartnerType;
}

// 기사가 직접 올린 SLIK 확인서(iDeb) 한 건. 원본은 가상 샘플 PDF
export interface SlikReport {
  id: string;
  riderId: string;
  reportDate: string;         // 확인서 발급일
  uploadedAt: string;
  filePath: string;           // public/samples/ideb-*.pdf (가상)
  worstKolektibilitas: 1 | 2 | 3 | 4 | 5; // 1 = 정상, 2 = 1~90일 연체, 5 = 180일 초과 연체
  activeFacilities: number;   // 현재 남은 대출·할부 건수
  parseConfidence: number;    // 0~1. 0.7 미만이면 다시 올리기 요청
}

// 통신요금(후불 요금제) 월 납부 한 건
export interface TelecomBill {
  id: string;
  riderId: string;
  providerLabel: string;      // "통신사 F" (가상)
  month: string;              // "2026-10"
  dueDate: string;
  paidDate: string | null;
  amount: number;
}

// 기사가 "이곳에 보여 주겠다"고 동의한 기록
export interface ShareGrant {
  id: string;
  riderId: string;
  partnerId: string;
  items: ("income" | "activity" | "rental_history" | "bank_account" | "slik_report" | "telecom_bills")[];
  grantedAt: string;
  expiresAt: string;          // grantedAt + 30일
  revokedAt: string | null;
}

// 렌털사에 들어온 신청 한 건
export interface Application {
  id: string;
  riderId: string;
  partnerId: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";  // 렌털사가 바꾼다
}

// 「추천」 화면의 가상 상품 (2026-11-20 멘토링 뒤 추가, CLAUDE.md 2-1).
// 이름·설명은 i18n products.<id>. 금리·요금은 모두 예시이고, 실제 금리와 승인은 금융사가 정한다.
export type ProductCategory = "loan" | "installment" | "rental" | "insurance";
export type ProductGrade = "A" | "B" | "C" | "D" | "E";

export interface Product {
  id: string;                 // "prod-bank-a-working"
  partnerId: string;
  category: ProductCategory;
  termMonths: [number, number] | null;  // 기간 (렌털·보험은 null)
  /** 등급별 예시 연 금리(%). 없는 등급은 「지금은 어려운 상품」. 등급이 낮을수록 높다 */
  exampleRateByGrade: Partial<Record<ProductGrade, number>> | null;
  /** 금리 대신 보여 주는 예시 가격 (렌털: 하루, 보험: 월). 등급과 상관없다 */
  examplePrice: { amount: number; per: "day" | "month" } | null;
}
