import { beforeEach, describe, expect, it } from "vitest";
import { mockRepository as repo } from "@/data/mockRepository";
import { getRiderMetrics } from "@/data/repository";
import { evaluateCredit } from "./engine";
import { getApplicantReport, listApplicantReports, partnerCredit, sharedMetrics } from "./partnerView";

const PARTNER = "p-rental-d";

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

describe("partnerView C단계 신용도는 동의한 항목만으로 계산한다", () => {
  const scored = (report: Awaited<ReturnType<typeof getApplicantReport>>) => {
    if (report?.status !== "shared" || report.credit?.status !== "scored") throw new Error("점수가 있어야 한다");
    return report.credit;
  };

  it("시연 데이터의 동의 기록 그대로면 점수가 바뀌지 않는다", async () => {
    const rows = await listApplicantReports(PARTNER, "C");
    const byId = Object.fromEntries(
      rows.map(({ report }) => [
        report.status === "shared" ? report.rider.id : report.riderId,
        report.status === "shared" ? report.credit : null,
      ]),
    );
    expect(byId["r-siti"]).toMatchObject({ status: "scored", score: 755, grade: "B" });
    expect(byId["r-agus"]).toMatchObject({ status: "scored", score: 549, grade: "D" });
    expect(byId["r-dewi"]).toMatchObject({ status: "scored", score: 876, grade: "A" });
    expect(byId["r-rizky"]).toEqual({ status: "hold", holds: ["NEED_RETAKE"] });
  });

  it("SLIK 확인서를 공유하지 않으면 점수에 넣지 않는다 (Budi)", async () => {
    const metrics = (await getRiderMetrics("r-budi"))!;
    await repo.createShareGrant({
      riderId: "r-budi",
      partnerId: PARTNER,
      items: ["income", "activity", "rental_history"],
    });
    const credit = scored(await getApplicantReport(PARTNER, "r-budi", "C"));
    const withoutSlik = evaluateCredit({ ...metrics, slikKolektibilitas: null, slikActiveFacilities: null, slikParseConfidence: null });
    if (withoutSlik.status !== "scored") throw new Error("점수가 있어야 한다");
    expect(credit.score).toBe(withoutSlik.score);
    for (const r of credit.reasons) expect(r.sources ?? []).not.toContain("slik");
  });

  it("상환 자료를 하나도 공유하지 않으면 '공유된 상환 이력 없음'으로 쓴다 (Budi)", async () => {
    await repo.createShareGrant({ riderId: "r-budi", partnerId: PARTNER, items: ["income", "activity"] });
    const codes = scored(await getApplicantReport(PARTNER, "r-budi", "C")).reasons.map((r) => r.code);
    expect(codes).toContain("REPAY_NOT_SHARED");
    expect(codes).not.toContain("REPAY_NO_HISTORY");
  });

  it("정말 상환 이력이 없으면 원래 문구 그대로 (Siti)", async () => {
    const codes = scored(await getApplicantReport(PARTNER, "r-siti", "C")).reasons.map((r) => r.code);
    expect(codes).toContain("REPAY_NO_HISTORY");
    expect(codes).not.toContain("REPAY_NOT_SHARED");
  });

  it("활동 기록을 공유하지 않으면 점수 대신 보류", async () => {
    await repo.createShareGrant({ riderId: "r-budi", partnerId: PARTNER, items: ["income", "slik_report"] });
    const report = await getApplicantReport(PARTNER, "r-budi", "C");
    expect(report?.status === "shared" && report.credit).toEqual({ status: "hold", holds: ["NOT_SHARED_ACTIVITY"] });
  });

  it("수입 명세서를 공유하지 않으면 보류, 엔진 보류와 함께 보여 준다", async () => {
    const metrics = (await getRiderMetrics("r-rizky"))!;
    expect(partnerCredit(metrics, ["activity"])).toEqual({
      status: "hold",
      holds: ["NOT_SHARED_INCOME", "NEED_RETAKE"],
    });
  });

  it("A단계는 여전히 점수를 계산해 넣지 않는다", async () => {
    await repo.createShareGrant({ riderId: "r-budi", partnerId: PARTNER, items: ["income", "activity"] });
    expect(await getApplicantReport(PARTNER, "r-budi", "A")).not.toHaveProperty("credit");
  });

  it("공유하지 않은 상환 자료만 지우고 나머지는 그대로 둔다", async () => {
    const metrics = (await getRiderMetrics("r-dewi"))!;
    const m = sharedMetrics(metrics, ["income", "activity", "telecom_bills"]);
    expect(m.rentalOnTimeRate).toBeNull();
    expect(m.rentalPaymentCount).toBe(0);
    expect(m.telecomOnTimeRate).toBe(metrics.telecomOnTimeRate);
    expect(m.monthlyNet).toBe(metrics.monthlyNet);
    expect(metrics.rentalOnTimeRate).not.toBeNull(); // 원본은 건드리지 않는다
  });
});
