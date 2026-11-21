import { describe, expect, it } from "vitest";
import { createMockRepository } from "@/data/mockRepository";
import type { Application } from "@/data/types";
import { creationSeq, newestFirst } from "./applicationOrder";

const app = (id: string, submittedAt: string): Application => ({ id, riderId: "r-budi", partnerId: "p", submittedAt, status: "pending" });

describe("신청 순서", () => {
  it("id 끝 순번을 읽고, 없으면 0", () => {
    expect(creationSeq("app-r-budi-p-bank-b-6")).toBe(6);
    expect(creationSeq("app-siti-rental-a")).toBe(0);
  });

  it("날짜가 늦은 신청이 먼저, 같은 날이면 나중에 만든 신청이 먼저", () => {
    const sorted = [
      app("app-r-budi-p-bank-a-5", "2026-11-19"),
      app("app-siti-rental-a", "2026-11-15"),
      app("app-r-budi-p-bank-b-6", "2026-11-19"),
    ].sort(newestFirst);
    expect(sorted.map((a) => a.id)).toEqual(["app-r-budi-p-bank-b-6", "app-r-budi-p-bank-a-5", "app-siti-rental-a"]);
  });

  it("같은 날 은행 A → 은행 B 순으로 보내면 은행 B가 가장 최근이다 (조작판 승인 연출)", async () => {
    const repo = createMockRepository();
    await repo.submitApplication("r-budi", "p-bank-a");
    await repo.submitApplication("r-budi", "p-bank-b");
    const apps = [...(await repo.listApplications("p-bank-a")), ...(await repo.listApplications("p-bank-b"))].sort(newestFirst);
    expect(apps[0].partnerId).toBe("p-bank-b");
  });
});
