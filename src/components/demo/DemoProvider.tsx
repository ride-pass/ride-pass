"use client";

// 시연 상태: 지금 시연 중인 기사, 언어, 허가 단계, 진입한 기관 (CLAUDE.md 4-8).
// 메모리에만 둔다. 새로고침하면 처음으로 돌아간다.

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { LICENSE_STAGE, type LicenseStage } from "@/config/licenseStage";
import { resetDemoState } from "@/data/repository";
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
  /** 신청·동의·재촬영 상태까지 처음으로 */
  reset(): Promise<void>;
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

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(initial);
  const patch = useCallback((p: Partial<DemoState>) => setState((s) => ({ ...s, ...p })), []);
  const panelEnabled = useSyncExternalStore(subscribeNever, readDemoFlag, () => false);

  const value = useMemo<DemoContextValue>(
    () => ({
      ...state,
      panelEnabled,
      setRiderId: (riderId) => patch({ riderId }),
      setLang: (lang) => patch({ lang }),
      setStage: (stage) => patch({ stage }),
      setPartnerId: (partnerId) => patch({ partnerId }),
      setPhone: (phone) => patch({ phone }),
      reset: async () => {
        await resetDemoState();
        setState(initial);
      },
    }),
    [state, patch, panelEnabled],
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
