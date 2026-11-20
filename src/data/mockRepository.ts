// 커밋된 fixture JSON을 읽는 가짜 저장소 (CLAUDE.md 4-1, 4-8).
// 화면은 이 파일을 직접 import하지 않고 repository.ts만 부른다.
// 신청·동의·재촬영·알림 같은 바뀌는 상태는 메모리에만 둔다. 새로고침하면 처음으로 돌아간다.
// createMockRepository()는 상태를 따로 가진 저장소를 하나 더 만든다 (창 사이 동기화 테스트용, demoSync.test.ts).

import { DEMO_TODAY } from "@/config/demo";
import { addDays } from "@/lib/date";
import { deriveRiderActivity, deriveRiderMetrics, type RiderRecords } from "./derive";
import { riderRecordsFrom, type FixtureSet } from "./fixtureSet";
import { buildIncomeStatement } from "./statement";
import type { Repository, RiderNotice, ShareGrantInput } from "./repository";
import type { Application, SettlementCapture, ShareGrant } from "./types";

import applications from "./fixtures/applications.json";
import captures from "./fixtures/captures.json";
import deposits from "./fixtures/deposits.json";
import partners from "./fixtures/partners.json";
import products from "./fixtures/products.json";
import rentalPayments from "./fixtures/rentalPayments.json";
import retakes from "./fixtures/retakes.json";
import riders from "./fixtures/riders.json";
import shareGrants from "./fixtures/shareGrants.json";
import slikReports from "./fixtures/slikReports.json";
import telecomBills from "./fixtures/telecomBills.json";

// JSON import는 문자열 리터럴 타입이 넓어지므로 계약 타입으로 맞춘다.
// 내용이 계약과 맞는지는 scripts/seed.test.ts가 확인한다.
const fixtures = {
  riders,
  partners,
  products,
  captures,
  deposits,
  rentalPayments,
  slikReports,
  telecomBills,
  applications,
  shareGrants,
  retakes,
} as FixtureSet;

const SHARE_GRANT_DAYS = 30;

interface DemoState {
  applications: Application[];
  shareGrants: ShareGrant[];
  /** 재촬영을 마친 촬영 id */
  retakenCaptureIds: Set<string>;
  nextGrantSeq: number;
  /** 기관이 신청서를 열람·처리한 기록 (기사 앱 알림) */
  notices: RiderNotice[];
  nextNoticeSeq: number;
}

function initialState(): DemoState {
  return {
    applications: structuredClone(fixtures.applications),
    shareGrants: structuredClone(fixtures.shareGrants),
    retakenCaptureIds: new Set(),
    nextGrantSeq: 1,
    notices: [],
    nextNoticeSeq: 1,
  };
}

/** 화면이 받은 값을 고쳐도 저장소 상태가 바뀌지 않도록 복사본을 돌려준다 */
const copy = <T>(value: T): T => structuredClone(value);

export function createMockRepository(): Repository {
  let state = initialState();

  /** 기사 앱 알림 하나를 남긴다. 기준일 하루 안의 순서는 seq로 정한다 */
  function addNotice(application: Application, kind: RiderNotice["kind"]): void {
    const seq = state.nextNoticeSeq++;
    state.notices.push({
      id: `n-${seq}`,
      seq,
      riderId: application.riderId,
      partnerId: application.partnerId,
      applicationId: application.id,
      kind,
      at: DEMO_TODAY,
      read: false,
    });
  }

  function capturesOf(riderId: string): SettlementCapture[] {
    return fixtures.captures
      .filter((c) => c.riderId === riderId)
      .map((c) =>
        state.retakenCaptureIds.has(c.id)
          ? (fixtures.retakes.find((r) => r.id === c.id) ?? c)
          : c,
      );
  }

  function recordsOf(riderId: string): RiderRecords | null {
    const rider = fixtures.riders.find((r) => r.id === riderId);
    if (!rider) return null;
    return { ...riderRecordsFrom(fixtures, rider), captures: capturesOf(riderId) };
  }

  const repository: Repository = {
    async listRiders() {
      return copy(fixtures.riders);
    },

    async getRider(riderId) {
      return copy(fixtures.riders.find((r) => r.id === riderId) ?? null);
    },

    async getRiderRecords(riderId) {
      return copy(recordsOf(riderId));
    },

    async getRiderMetrics(riderId) {
      const records = recordsOf(riderId);
      return records ? deriveRiderMetrics(records, DEMO_TODAY) : null;
    },

    async getRiderActivity(riderId) {
      const records = recordsOf(riderId);
      return records ? deriveRiderActivity(records, DEMO_TODAY) : null;
    },

    async getIncomeStatement(riderId) {
      const records = recordsOf(riderId);
      return records ? buildIncomeStatement(records, DEMO_TODAY) : null;
    },

    async listProducts() {
      return copy(fixtures.products);
    },
    async listPartners() {
      return copy(fixtures.partners);
    },

    async getPartner(partnerId) {
      return copy(fixtures.partners.find((p) => p.id === partnerId) ?? null);
    },

    async listApplications(partnerId) {
      return copy(
        state.applications
          .filter((a) => a.partnerId === partnerId)
          .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt) || a.id.localeCompare(b.id)),
      );
    },

    async submitApplication(riderId, partnerId) {
      const existing = state.applications.find(
        (a) => a.riderId === riderId && a.partnerId === partnerId && a.status === "pending",
      );
      if (existing) return copy(existing);
      const application: Application = {
        id: `app-${riderId}-${partnerId}-${state.applications.length + 1}`,
        riderId,
        partnerId,
        submittedAt: DEMO_TODAY,
        status: "pending",
      };
      state.applications.push(application);
      return copy(application);
    },

    async setApplicationStatus(applicationId, status) {
      const application = state.applications.find((a) => a.id === applicationId);
      if (!application) throw new Error(`신청을 찾을 수 없음: ${applicationId}`);
      const changed = application.status !== status;
      application.status = status;
      // 승인·거절이 정해지면 기사 앱에 알린다. 결정은 기관이 하고 기사는 결과만 받는다 (CLAUDE.md 1절)
      if (changed && status !== "pending") addNotice(application, status);
      return copy(application);
    },

    async recordApplicationView(applicationId) {
      const application = state.applications.find((a) => a.id === applicationId);
      if (!application) throw new Error(`신청을 찾을 수 없음: ${applicationId}`);
      // 같은 신청서는 처음 연 한 번만 남긴다
      if (state.notices.some((n) => n.applicationId === applicationId && n.kind === "viewed")) return;
      addNotice(application, "viewed");
    },

    async listNotices(riderId) {
      return copy(state.notices.filter((n) => n.riderId === riderId).sort((a, b) => b.seq - a.seq));
    },

    async markNoticesRead(riderId) {
      for (const n of state.notices) if (n.riderId === riderId) n.read = true;
    },

    async listShareGrants(riderId) {
      return copy(state.shareGrants.filter((g) => g.riderId === riderId));
    },

    async createShareGrant(input: ShareGrantInput) {
      const grant: ShareGrant = {
        id: `sg-${input.riderId}-${input.partnerId}-${state.nextGrantSeq++}`,
        riderId: input.riderId,
        partnerId: input.partnerId,
        items: [...input.items],
        grantedAt: DEMO_TODAY,
        expiresAt: addDays(DEMO_TODAY, SHARE_GRANT_DAYS),
        revokedAt: null,
      };
      state.shareGrants.push(grant);
      return copy(grant);
    },

    async revokeShareGrant(grantId) {
      const grant = state.shareGrants.find((g) => g.id === grantId);
      if (!grant) throw new Error(`동의 기록을 찾을 수 없음: ${grantId}`);
      grant.revokedAt = DEMO_TODAY;
      return copy(grant);
    },

    async retakeCapture(captureId) {
      const retake = fixtures.retakes.find((r) => r.id === captureId);
      if (!retake) return null;
      state.retakenCaptureIds.add(captureId);
      return copy(retake);
    },

    async resetDemoState() {
      state = initialState();
    },
  };

  return repository;
}

export const mockRepository: Repository = createMockRepository();
