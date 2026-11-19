import { beforeEach, describe, expect, it } from "vitest";
import { mockRepository as repo } from "@/data/mockRepository";
import { getApplicantReport, listApplicantReports } from "./partnerView";

const PARTNER = "p-rental-a";

beforeEach(async () => {
  await repo.resetDemoState();
});

describe("partnerView (CLAUDE.md 2-4)", () => {
  it("A단계: 사실 리포트와 경고만, 점수·등급 없음", async () => {
    const rows = await listApplicantReports(PARTNER, "A");
    expect(rows).toHaveLength(4);
    for (const { report } of rows) {
      expect(report.status).toBe("shared");
      expect(report).not.toHaveProperty("credit");
      expect(JSON.stringify(report)).not.toMatch(/"(score|grade)"/);
    }
  });

  it("A단계 Agus: 정산·입금 불일치 경고", async () => {
    const report = await getApplicantReport(PARTNER, "r-agus", "A");
    expect(report?.status === "shared" && report.facts.warnings).toContain("amount_mismatch");
    expect(report?.status === "shared" && report.facts.income?.depositMatched).toBe(false);
  });

  it("C단계: 사실 리포트 + 신용도·등급·이유 3개·배지", async () => {
    const report = await getApplicantReport(PARTNER, "r-dewi", "C");
    expect(report?.status).toBe("shared");
    if (report?.status === "shared" && report.credit?.status === "scored") {
      expect(report.credit.grade).toBe("A");
      expect(report.credit.reasons).toHaveLength(3);
      expect(report.credit.badge).toBe("pka_licensed_feature");
      expect(report.facts.telecom).toEqual({ onTimeRate: 1, billCount: 6 });
    } else {
      throw new Error("C단계 점수가 있어야 한다");
    }
  });

  it("C단계 Rizky: 평가 보류", async () => {
    const report = await getApplicantReport(PARTNER, "r-rizky", "C");
    expect(report?.status === "shared" && report.credit).toEqual({ status: "hold", holds: ["NEED_RETAKE"] });
  });

  it("동의가 없으면 아무것도 보이지 않는다 (Budi는 아직 동의 전)", async () => {
    expect(await getApplicantReport(PARTNER, "r-budi", "C")).toEqual({ status: "no_consent", riderId: "r-budi" });
  });

  it("동의한 항목만 보인다. 철회하면 다시 안 보인다", async () => {
    const grant = await repo.createShareGrant({
      riderId: "r-budi",
      partnerId: PARTNER,
      items: ["income", "slik_report"],
    });
    const report = await getApplicantReport(PARTNER, "r-budi", "A");
    if (report?.status !== "shared") throw new Error("동의 후에는 보여야 한다");
    expect(report.facts.income?.depositMatched).toBe(true);
    expect(report.facts.slik).toEqual({ kolektibilitas: 1, activeFacilities: 1 });
    expect(report.facts.activity).toBeNull();
    expect(report.facts.rental).toBeNull();

    await repo.revokeShareGrant(grant.id);
    expect((await getApplicantReport(PARTNER, "r-budi", "A"))?.status).toBe("no_consent");
  });

  it("공유했지만 자료가 없으면 none (Siti 렌털 이력)", async () => {
    const report = await getApplicantReport(PARTNER, "r-siti", "A");
    expect(report?.status === "shared" && report.facts.rental).toBe("none");
  });
});
