import { beforeEach, describe, expect, it } from "vitest";
import { mockRepository as repo } from "./mockRepository";

beforeEach(async () => {
  await repo.resetDemoState();
});

describe("mockRepository 읽기", () => {
  it("기사 5명과 기관 4곳", async () => {
    expect((await repo.listRiders()).map((r) => r.id)).toEqual([
      "r-budi", "r-siti", "r-agus", "r-dewi", "r-rizky",
    ]);
    expect(await repo.listPartners()).toHaveLength(5);
    expect(await repo.getRider("r-nobody")).toBeNull();
    expect(await repo.getRiderMetrics("r-nobody")).toBeNull();
  });

  it("기사 기록은 그 기사 것만 돌려준다", async () => {
    const records = await repo.getRiderRecords("r-dewi");
    expect(records?.captures.every((c) => c.riderId === "r-dewi")).toBe(true);
    expect(records?.rentalPayments).toHaveLength(90);
  });

  it("SLIK 확인서는 Budi만, 통신요금은 Dewi만", async () => {
    expect((await repo.getRiderMetrics("r-budi"))?.slikKolektibilitas).toBe(1);
    expect((await repo.getRiderMetrics("r-dewi"))?.telecomOnTimeRate).toBe(1);
    expect((await repo.getRiderRecords("r-dewi"))?.telecomBills).toHaveLength(6);
    expect((await repo.getRiderMetrics("r-siti"))?.slikKolektibilitas).toBeNull();
  });

  it("계산값은 derive에서 온다", async () => {
    const m = await repo.getRiderMetrics("r-agus");
    expect(m?.warnings).toContain("amount_mismatch");
  });

  it("돌려준 값을 고쳐도 저장소는 바뀌지 않는다", async () => {
    const riders = await repo.listRiders();
    riders[0].displayName = "changed";
    expect((await repo.getRider("r-budi"))?.displayName).toBe("Budi Santoso");
  });
});

describe("mockRepository 신청", () => {
  it("처음에는 Budi를 뺀 4명이 렌털사 D에 대기 중", async () => {
    const apps = await repo.listApplications("p-rental-d");
    expect(apps.map((a) => a.riderId).sort()).toEqual(["r-agus", "r-dewi", "r-rizky", "r-siti"]);
    expect(apps.every((a) => a.status === "pending")).toBe(true);
  });

  it("Budi가 제출하면 맨 앞에 들어오고, 다시 제출해도 하나만 있다", async () => {
    const first = await repo.submitApplication("r-budi", "p-rental-d");
    const again = await repo.submitApplication("r-budi", "p-rental-d");
    expect(again.id).toBe(first.id);
    const apps = await repo.listApplications("p-rental-d");
    expect(apps[0].riderId).toBe("r-budi");
    expect(apps[0].submittedAt).toBe("2026-11-19");
    expect(apps).toHaveLength(5);
  });

  it("렌털사가 승인하고, 초기화하면 처음으로 돌아간다", async () => {
    const app = await repo.submitApplication("r-budi", "p-rental-d");
    expect((await repo.setApplicationStatus(app.id, "approved")).status).toBe("approved");
    await repo.resetDemoState();
    expect(await repo.listApplications("p-rental-d")).toHaveLength(4);
  });
});

describe("mockRepository 동의", () => {
  it("동의 기간은 오늘부터 30일, 철회하면 철회일이 남는다", async () => {
    const grant = await repo.createShareGrant({
      riderId: "r-budi",
      partnerId: "p-rental-d",
      items: ["income", "activity"],
    });
    expect(grant.grantedAt).toBe("2026-11-19");
    expect(grant.expiresAt).toBe("2026-12-19");
    const revoked = await repo.revokeShareGrant(grant.id);
    expect(revoked.revokedAt).toBe("2026-11-19");
    expect(await repo.listShareGrants("r-budi")).toHaveLength(1);
  });
});

describe("mockRepository 재촬영 (r-rizky)", () => {
  it("재촬영 전에는 최신 촬영이 흐리고, 재촬영 후에는 기준을 넘는다", async () => {
    const before = await repo.getRiderMetrics("r-rizky");
    expect(before?.latestOcrConfidence).toBe(0.55);

    const records = await repo.getRiderRecords("r-rizky");
    const latest = records!.captures.at(-1)!;
    const retake = await repo.retakeCapture(latest.id);
    expect(retake?.ocrConfidence).toBeGreaterThanOrEqual(0.7);
    expect(retake?.ocr).toEqual(latest.ocr);

    expect((await repo.getRiderMetrics("r-rizky"))?.latestOcrConfidence).toBe(0.96);
    await repo.resetDemoState();
    expect((await repo.getRiderMetrics("r-rizky"))?.latestOcrConfidence).toBe(0.55);
  });

  it("다시 찍을 기록이 없는 촬영은 null", async () => {
    expect(await repo.retakeCapture("c-budi-20261118-a")).toBeNull();
  });
});
