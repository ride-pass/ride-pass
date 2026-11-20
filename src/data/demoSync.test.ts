// 창 사이 동기화: 한쪽 화면에서 바꾼 상태가 다른 쪽 메모리 저장소에도 똑같이 생기는지 (demoSync.ts).

import { describe, expect, it } from "vitest";
import { withDemoSync, type SyncChannel, type SyncMessage } from "./demoSync";
import { createMockRepository } from "./mockRepository";

/** 같은 브라우저의 두 화면처럼: 한쪽이 보낸 메시지를 다른 쪽만 받는다 */
function hub() {
  const members: ((m: SyncMessage) => void)[][] = [];
  return (): SyncChannel => {
    const mine: ((m: SyncMessage) => void)[] = [];
    members.push(mine);
    return {
      post: (m) => members.filter((x) => x !== mine).forEach((x) => x.forEach((h) => h(structuredClone(m)))),
      listen: (h) => {
        mine.push(h);
        return () => mine.splice(mine.indexOf(h), 1);
      },
    };
  };
}

const settle = () => new Promise((r) => setTimeout(r, 0));

function pair() {
  const channel = hub();
  const rider = withDemoSync(createMockRepository(), channel());
  const partner = withDemoSync(createMockRepository(), channel());
  return { rider, partner };
}

describe("withDemoSync", () => {
  it("기사가 공유·신청하면 렌털사 화면 저장소에도 생긴다", async () => {
    const { rider, partner } = pair();
    await rider.repository.createShareGrant({ riderId: "r-budi", partnerId: "p-rental-d", items: ["income"] });
    const app = await rider.repository.submitApplication("r-budi", "p-rental-d");
    await settle();
    expect((await partner.repository.listApplications("p-rental-d")).map((a) => a.id)).toContain(app.id);
    expect(await partner.repository.listShareGrants("r-budi")).toEqual(await rider.repository.listShareGrants("r-budi"));
  });

  it("렌털사가 열람·승인하면 기사 앱에 알림이 순서대로 온다", async () => {
    const { rider, partner } = pair();
    let changes = 0;
    rider.onRemoteChange(() => changes++);
    await partner.repository.recordApplicationView("app-dewi-rental-a");
    await partner.repository.recordApplicationView("app-dewi-rental-a"); // 두 번 열어도 한 번만
    await partner.repository.setApplicationStatus("app-dewi-rental-a", "approved");
    await settle();
    const notices = await rider.repository.listNotices("r-dewi");
    expect(notices.map((n) => n.kind)).toEqual(["approved", "viewed"]);
    expect(notices.every((n) => !n.read && n.partnerId === "p-rental-d")).toBe(true);
    expect(notices).toEqual(await partner.repository.listNotices("r-dewi"));
    expect(changes).toBe(3);
  });

  it("같은 결과로 다시 정하면 알림을 또 만들지 않는다", async () => {
    const { partner } = pair();
    await partner.repository.setApplicationStatus("app-agus-rental-a", "rejected");
    await partner.repository.setApplicationStatus("app-agus-rental-a", "rejected");
    expect(await partner.repository.listNotices("r-agus")).toHaveLength(1);
  });

  it("읽음 처리와 처음으로 되돌리기도 반대쪽에 전한다", async () => {
    const { rider, partner } = pair();
    await partner.repository.setApplicationStatus("app-siti-rental-a", "approved");
    await settle();
    await rider.repository.markNoticesRead("r-siti");
    await settle();
    expect((await partner.repository.listNotices("r-siti"))[0].read).toBe(true);
    await rider.repository.resetDemoState();
    await settle();
    expect(await partner.repository.listNotices("r-siti")).toEqual([]);
    expect((await partner.repository.listApplications("p-rental-d")).find((a) => a.id === "app-siti-rental-a")?.status).toBe("pending");
  });

  it("채널이 없으면(서버·테스트) 저장소를 그대로 쓴다", () => {
    const base = createMockRepository();
    expect(withDemoSync(base, null).repository).toBe(base);
  });
});
