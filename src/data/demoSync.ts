// 시연 화면 사이 상태 맞추기 (조작판 「분할 보기」: 왼쪽 기사 폰 + 오른쪽 렌털사 화면).
// 같은 브라우저의 다른 창·iframe끼리 BroadcastChannel로 "무엇을 바꿨는지"만 보낸다.
// 받은 쪽은 같은 변경을 같은 순서로 자기 메모리 저장소에 다시 적용한다. 가짜 저장소는 같은 입력이면 같은 결과를 낸다.
// localStorage 같은 브라우저 저장소는 쓰지 않는다. 새로고침하면 처음으로 돌아간다 (CLAUDE.md 4-8).

import type { LicenseStage } from "@/config/licenseStage";
import type { Lang } from "@/i18n/lang";
import type { Repository } from "./repository";

/** 저장소 상태를 바꾸는 함수. 이것만 다른 화면에 전한다 */
export const SYNCED_MUTATIONS = [
  "submitApplication",
  "setApplicationStatus",
  "recordApplicationView",
  "markNoticesRead",
  "createShareGrant",
  "revokeShareGrant",
  "retakeCapture",
  "resetDemoState",
] as const satisfies readonly (keyof Repository)[];

type Mutation = (typeof SYNCED_MUTATIONS)[number];

/** 분할 보기에서 어느 쪽 화면인지 (주소의 ?frame=) */
export type FrameRole = "rider" | "partner";

export interface DemoStatePatch {
  riderId?: string;
  lang?: Lang;
  stage?: LicenseStage;
}

export type SyncMessage =
  | { type: "repo"; op: Mutation; args: unknown[] }
  | { type: "demo"; patch: DemoStatePatch }
  | { type: "demo-reset" }
  | { type: "nav"; target: FrameRole; href: string };

export interface SyncChannel {
  post(message: SyncMessage): void;
  listen(handler: (message: SyncMessage) => void): () => void;
}

const CHANNEL_NAME = "trailcred-demo";
let browser: SyncChannel | null | undefined;

/** 브라우저에서만 만든다 (서버 렌더링·테스트에서는 null). 한 화면에 하나만 둔다: 보낸 쪽 자신은 받지 않는다 */
export function browserChannel(): SyncChannel | null {
  if (browser !== undefined) return browser;
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return (browser = null);
  const ch = new BroadcastChannel(CHANNEL_NAME);
  browser = {
    post: (message) => ch.postMessage(message),
    listen: (handler) => {
      const h = (e: MessageEvent<SyncMessage>) => handler(e.data);
      ch.addEventListener("message", h);
      return () => ch.removeEventListener("message", h);
    },
  };
  return browser;
}

export interface SyncedRepository {
  repository: Repository;
  /** 다른 화면에서 온 변경을 적용한 뒤 부른다. 화면은 이때 다시 읽는다 */
  onRemoteChange(handler: () => void): () => void;
}

/**
 * base 저장소를 감싼다. 상태를 바꾸는 함수는 실행 뒤 channel로 알리고,
 * 다른 화면에서 온 변경은 받은 순서대로 base에 적용한다 (알리지 않는다: 메아리 방지).
 */
export function withDemoSync(base: Repository, channel: SyncChannel | null): SyncedRepository {
  if (!channel) return { repository: base, onRemoteChange: () => () => {} };

  const handlers = new Set<() => void>();
  let queue: Promise<unknown> = Promise.resolve();

  channel.listen((message) => {
    if (message.type !== "repo") return;
    const run = base[message.op] as (...args: unknown[]) => Promise<unknown>;
    queue = queue
      .then(() => run(...message.args))
      .then(() => handlers.forEach((h) => h()))
      .catch(() => {});
  });

  const repository: Repository = { ...base };
  for (const op of SYNCED_MUTATIONS) {
    const run = base[op] as (...args: unknown[]) => Promise<unknown>;
    (repository as unknown as Record<Mutation, (...args: unknown[]) => Promise<unknown>>)[op] = async (...args: unknown[]) => {
      // 다른 화면에서 온 변경이 먼저 끝나야 순서가 같아진다
      await queue;
      const result = await run(...args);
      channel.post({ type: "repo", op, args });
      return result;
    };
  }

  return {
    repository,
    onRemoteChange: (handler) => {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
  };
}
