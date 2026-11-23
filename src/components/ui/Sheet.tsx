"use client";

// 아래에서 올라오는 확인 창. 제목 옆 X, 바깥, Esc, 브라우저 뒤로 가기로 닫힌다.
// 내용만큼만 열리고, 화면(노트북에서는 휴대폰 틀)의 85%를 넘으면 창 안에서 스크롤한다. 제목·X는 스크롤해도 늘 보인다.
// 휴대폰 틀 안에서는 휴대폰 화면 안에서 올라온다 (PhoneFrame 참고).
//
// 2026-11-23 고침:
// - 높이: 예전에는 내용 높이를 70dvh(브라우저 창 기준)로 잡아, 노트북에서 창이 세로로 크면 창이 휴대폰 틀보다 커져
//   제목·X가 틀 밖으로 잘리고 닫을 수 없었다. 이제 바깥 상자(fixed inset-0 = 휴대폰 틀 또는 화면) 기준 85%.
// - 뒤로 가기: 창을 열 때 같은 주소로 방문 기록을 하나 더한다. 뒤로 가기는 그 기록만 빼며 창을 닫고 화면은 그대로다.
//   X·바깥·Esc로 닫을 때도 더한 기록을 지운다(history.back → popstate → onClose). Next.js 16은 history.pushState를 지원한다.
// - 창 안 링크는 useSheetNavigate()로 이동한다: 창을 먼저 닫아 기록을 지운 뒤 이동해, 돌아왔을 때 빈 기록이 남지 않는다.
// - 그리는 곳: 휴대폰 화면(#phone-screen) 맨 위층에 portal로 붙인다. 배지처럼 sticky 머리글(z-10) 안에서 열어도
//   하단 탭 아래로 깔리지 않는다 (2026-11-23). 휴대폰 틀이 없는 화면이면 body에 붙인다.

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/components/demo/DemoProvider";

interface Props {
  open: boolean;
  onClose(): void;
  title: string;
  children: ReactNode;
}

/** 방문 기록에 남기는 표시. 값은 창마다 다른 id */
const STATE_KEY = "__sheet";

const SheetNavigate = createContext<((href: string) => void) | null>(null);

/** 창 안에서 다른 화면으로 갈 때 쓴다. 창 밖이면 null */
export function useSheetNavigate() {
  return useContext(SheetNavigate);
}

const isOurs = (id: string) => (window.history.state as Record<string, unknown> | null)?.[STATE_KEY] === id;

export function Sheet({ open, onClose, title, children }: Props) {
  const t = useT();
  const router = useRouter();
  const titleId = useId();
  const sheetId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  /** 닫은 뒤 갈 주소 (창 안 링크) */
  const pendingHref = useRef<string | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  /** X·바깥·Esc·창 안 링크: 더해 둔 기록이 있으면 뒤로 가서 지우고(popstate에서 닫힘), 없으면 바로 닫는다 */
  const requestClose = useCallback(() => {
    if (isOurs(sheetId)) {
      window.history.back();
      return;
    }
    onCloseRef.current();
    const href = pendingHref.current;
    pendingHref.current = null;
    if (href) router.push(href);
  }, [sheetId, router]);

  const navigate = useCallback(
    (href: string) => {
      pendingHref.current = href;
      requestClose();
    },
    [requestClose],
  );

  useEffect(() => {
    if (!open) return;
    // 개발 모드(StrictMode)에서 effect가 두 번 돌아도 기록은 한 번만 더한다
    if (!isOurs(sheetId)) {
      window.history.pushState({ ...(window.history.state ?? {}), [STATE_KEY]: sheetId }, "");
    }
    const onPop = () => {
      if (isOurs(sheetId)) return;
      onCloseRef.current();
      const href = pendingHref.current;
      pendingHref.current = null;
      if (href) router.push(href);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open, sheetId, router]);

  useEffect(() => {
    if (!open) return;
    // preventScroll: 창은 아래에서 올라오는 중이라 포커스 순간엔 화면 밖에 있다. 그냥 focus()하면 브라우저가 창을 보이게 하려고
    // 뒤 화면(휴대폰 틀 안쪽 스크롤)을 아래로 끌어내린다 (2026-11-20 홈 「신용도 이유」에서 발견)
    panel.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, requestClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={requestClose}
        className="absolute inset-0 bg-brand-navy/40 motion-safe:animate-fade-in"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-[85%] w-full max-w-[390px] flex-col rounded-t-3xl bg-surface px-5 pt-3 pb-8 shadow-2xl outline-none motion-safe:animate-sheet-up"
      >
        <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-line" aria-hidden />
        <div className="flex shrink-0 items-center justify-between gap-2">
          <h2 id={titleId} className="text-lg font-bold">
            {title}
          </h2>
          <button type="button" onClick={requestClose} aria-label={t("common.close")} className="-mr-2 rounded-full p-2 text-muted active:bg-lavender">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="mt-3 min-h-0 overflow-y-auto overscroll-contain">
          <SheetNavigate.Provider value={navigate}>{children}</SheetNavigate.Provider>
        </div>
      </div>
    </div>,
    document.getElementById("phone-screen") ?? document.body,
  );
}
