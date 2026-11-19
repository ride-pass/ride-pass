"use client";

// 시연 상태: 지금 시연 중인 기사, 언어, 허가 단계, 진입한 기관 (CLAUDE.md 4-8).
// 메모리에만 둔다. 새로고침하면 처음으로 돌아간다.
// 분할 보기(/demo/split)에서는 기사 폰·렌털사 화면 iframe끼리 언어·허가 단계·시연 인물과 저장소 변경을 맞춘다 (data/demoSync.ts).

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { LICENSE_STAGE, type LicenseStage } from "@/config/licenseStage";
import { browserChannel, type DemoStatePatch, type FrameRole } from "@/data/demoSync";
import { onRemoteDataChange, resetDemoState } from "@/data/repository";
import type { Lang } from "@/i18n/lang";
import { translate, type TranslateVars } from "@/i18n/translate";
import { DEFAULT_RIDER_ID } from "@/lib/demoLogin";
import { DemoPanel } from "./DemoPanel";

export const ENTRY_PARTNER_ID = "p-rental-a";

interface DemoState {
  riderId: string;
  lang: Lang;
  stage: LicenseStage;
  /** 기사가 들어온 신청 화면의 기관 (3단계 동의 대상) */
  partnerId: string;
  /** 로그인 화면에서 입력한 번호 (국가번호 뒤) */
  phone: string;
}

interface DemoContextValue extends DemoState {
  setRiderId(id: string): void;
  setLang(lang: Lang): void;
  setStage(stage: LicenseStage): void;
  setPartnerId(id: string): void;
  setPhone(phone: string): void;
  /** 주소에 ?demo=1이 있으면 true. 새로고침 전까지 유지 */
  panelEnabled: boolean;
  /** 조작판이 저장소 데이터를 바꿀 때마다 1씩 오른다. 화면은 이 값이 바뀌면 다시 읽는다 */
  dataVersion: number;
  bumpData(): void;
  /** 신청·동의·재촬영 상태까지 처음으로 */
  reset(): Promise<void>;
  /** 분할 보기 안의 iframe이면 어느 쪽인지. 아니면 null */
  frameRole: FrameRole | null;
  /** 분할 보기 화면에서 한쪽 iframe을 다른 주소로 보낸다 */
  navigateFrame(target: FrameRole, href: string): void;
}

const initial: DemoState = {
  riderId: DEFAULT_RIDER_ID,
  lang: "ko",
  stage: LICENSE_STAGE,
  partnerId: ENTRY_PARTNER_ID,
  phone: "",
};

const DemoContext = createContext<DemoContextValue | null>(null);

// 주소에 ?demo=1이 한 번이라도 있었으면 새로고침 전까지 조작판을 켜 둔다 (CLAUDE.md 4-8)
let demoFlag = false;
function readDemoFlag(): boolean {
  if (!demoFlag) demoFlag = new URLSearchParams(window.location.search).get("demo") === "1";
  return demoFlag;
}
const subscribeNever = () => () => {};

// 분할 보기 iframe은 주소의 ?frame=rider|partner로 자기 자리를 안다. 화면을 옮겨도 새로고침 전까지 유지
let frameFlag: FrameRole | null | undefined;
function readFrameRole(): FrameRole | null {
  if (frameFlag === undefined) {
    const v = new URLSearchParams(window.location.search).get("frame");
    frameFlag = v === "rider" || v === "partner" ? v : null;
  }
  return frameFlag;
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<DemoState>(initial);
  const patch = useCallback((p: Partial<DemoState>) => setState((s) => ({ ...s, ...p })), []);
  const panelEnabled = useSyncExternalStore(subscribeNever, readDemoFlag, () => false);
  const frameRole = useSyncExternalStore(subscribeNever, readFrameRole, () => null);
  const [dataVersion, setDataVersion] = useState(0);

  // 다른 화면(분할 보기의 반대쪽)에서 온 변경을 받는다
  useEffect(() => {
    const offData = onRemoteDataChange(() => setDataVersion((v) => v + 1));
    const offMessages = browserChannel()?.listen((m) => {
      if (m.type === "demo") patch(m.patch);
      if (m.type === "demo-reset") {
        setState(initial);
        setDataVersion((v) => v + 1);
      }
      if (m.type === "nav" && m.target === readFrameRole()) router.push(m.href);
    });
    return () => {
      offData();
      offMessages?.();
    };
  }, [patch, router]);

  /** 언어·단계·인물을 바꾸고 다른 화면에도 알린다 */
  const share = useCallback(
    (p: DemoStatePatch) => {
      patch(p);
      browserChannel()?.post({ type: "demo", patch: p });
    },
    [patch],
  );

  const value = useMemo<DemoContextValue>(
    () => ({
      ...state,
      panelEnabled,
      frameRole,
      dataVersion,
      bumpData: () => setDataVersion((v) => v + 1),
      setRiderId: (riderId) => share({ riderId }),
      setLang: (lang) => share({ lang }),
      setStage: (stage) => share({ stage }),
      setPartnerId: (partnerId) => patch({ partnerId }),
      setPhone: (phone) => patch({ phone }),
      navigateFrame: (target, href) => browserChannel()?.post({ type: "nav", target, href }),
      reset: async () => {
        await resetDemoState();
        setState(initial);
        setDataVersion((v) => v + 1);
        browserChannel()?.post({ type: "demo-reset" });
      },
    }),
    [state, patch, share, panelEnabled, frameRole, dataVersion],
  );

  return (
    <DemoContext.Provider value={value}>
      {children}
      {panelEnabled ? <DemoPanel /> : null}
    </DemoContext.Provider>
  );
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo는 DemoProvider 안에서만 쓴다");
  return ctx;
}

/** 지금 언어로 문구를 꺼내는 함수 */
export function useT() {
  const { lang } = useDemo();
  return useCallback((key: string, vars?: TranslateVars) => translate(lang, key, vars), [lang]);
}
