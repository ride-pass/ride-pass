// 화면이 부르는 유일한 데이터 창구 (CLAUDE.md 4-1).
// 지금은 fixture를 읽는 mockRepository를 쓴다. 실제 API로 바꿀 때는 이 파일의 구현 연결만 바꾼다 (4-10).
// 모든 함수는 비동기다. 나중에 네트워크 호출로 바뀌어도 화면 코드는 그대로다.

import { browserChannel, withDemoSync } from "./demoSync";
import type { RiderActivity, RiderMetrics, RiderRecords } from "./derive";
import { mockRepository } from "./mockRepository";
import type { IncomeStatement } from "./statement";
import type {
  Application,
  Partner,
  Product,
  Rider,
  SettlementCapture,
  ShareGrant,
} from "./types";

/**
 * 기사 앱 알림: 기관이 신청서를 열람했거나 승인·거절했다.
 * 원본 기록(4-3 계약)이 아니라 시연 중에 생기는 상태라 types.ts가 아니라 여기에 둔다. 메모리에만 있다.
 */
export interface RiderNotice {
  id: string;
  /** 생긴 순서 (1부터). 같은 날 안의 순서를 정한다 */
  seq: number;
  riderId: string;
  partnerId: string;
  applicationId: string;
  kind: "viewed" | "approved" | "rejected";
  /** 생긴 날 (시연에서는 항상 DEMO_TODAY) */
  at: string;
  read: boolean;
}

export interface ShareGrantInput {
  riderId: string;
  partnerId: string;
  items: ShareGrant["items"];
}

export interface Repository {
  listRiders(): Promise<Rider[]>;
  getRider(riderId: string): Promise<Rider | null>;
  /** 기사 원본 기록 (정산 촬영·입금·렌털 납부). 재촬영한 기록은 바뀐 값으로 */
  getRiderRecords(riderId: string): Promise<RiderRecords | null>;
  /** 4-4 계산값. 기준일은 DEMO_TODAY */
  getRiderMetrics(riderId: string): Promise<RiderMetrics | null>;
  /** 홈 화면의 활동 지도(최근 180일)와 30일 단위 월별 순수입 6개. 기준일은 DEMO_TODAY */
  getRiderActivity(riderId: string): Promise<RiderActivity | null>;
  /** 수입 명세서 (최근 30일, 급여명세서 형식) */
  getIncomeStatement(riderId: string): Promise<IncomeStatement | null>;

  listPartners(): Promise<Partner[]>;
  getPartner(partnerId: string): Promise<Partner | null>;
  /** 「추천」 화면의 가상 상품 */
  listProducts(): Promise<Product[]>;

  /** 기관에 들어온 신청 (최근 제출 순) */
  listApplications(partnerId: string): Promise<Application[]>;
  /** 기사가 신청을 제출한다. 같은 곳에 대기 중인 신청이 있으면 그것을 돌려준다 */
  submitApplication(riderId: string, partnerId: string): Promise<Application>;
  /** 렌털사가 승인·거절한다. 결과가 바뀌면 기사 앱 알림이 생긴다 */
  setApplicationStatus(applicationId: string, status: Application["status"]): Promise<Application>;
  /** 기관이 신청서(공유된 자료)를 열었다. 같은 신청서는 처음 한 번만 알림이 생긴다 */
  recordApplicationView(applicationId: string): Promise<void>;
  /** 기사 앱 알림 (최근 것 먼저) */
  listNotices(riderId: string): Promise<RiderNotice[]>;
  markNoticesRead(riderId: string): Promise<void>;

  listShareGrants(riderId: string): Promise<ShareGrant[]>;
  /** 기사의 동의 기록. 기간은 오늘부터 30일 */
  createShareGrant(input: ShareGrantInput): Promise<ShareGrant>;
  revokeShareGrant(grantId: string): Promise<ShareGrant>;

  /** 흐린 촬영을 다시 찍는다. 다시 찍을 기록이 없으면 null */
  retakeCapture(captureId: string): Promise<SettlementCapture | null>;

  /** 신청·동의·재촬영 상태를 처음으로 되돌린다 (시연 조작판) */
  resetDemoState(): Promise<void>;
}

// 분할 보기(기사 폰 + 렌털사 화면)에서 두 화면의 메모리 상태를 맞춘다 (demoSync.ts). 실제 API로 바꾸면 빼도 된다.
const synced = withDemoSync(mockRepository, browserChannel());

export const repository: Repository = synced.repository;

/** 다른 화면(분할 보기의 반대쪽)이 상태를 바꿨을 때 부른다. DemoProvider가 듣고 화면을 다시 읽게 한다 */
export const onRemoteDataChange = synced.onRemoteChange;

export const {
  listRiders,
  getRider,
  getRiderRecords,
  getRiderMetrics,
  getRiderActivity,
  getIncomeStatement,
  listPartners,
  getPartner,
  listProducts,
  listApplications,
  submitApplication,
  setApplicationStatus,
  recordApplicationView,
  listNotices,
  markNoticesRead,
  listShareGrants,
  createShareGrant,
  revokeShareGrant,
  retakeCapture,
  resetDemoState,
} = repository;
