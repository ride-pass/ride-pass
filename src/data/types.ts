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
  id: string;                 // "p-rental-a"
  nameKo: string;             // "렌털사 A (전기 오토바이)"
  nameId: string;             // "Mitra Rental A"
  type: PartnerType;
}

// 기사가 "이곳에 보여 주겠다"고 동의한 기록
export interface ShareGrant {
  id: string;
  riderId: string;
  partnerId: string;
  items: ("income" | "activity" | "rental_history" | "bank_account")[];
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
