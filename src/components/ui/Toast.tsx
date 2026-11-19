"use client";

// 화면 위쪽에 잠깐 뜨는 알림. 휴대폰 틀 안에서는 휴대폰 화면 위쪽에 붙는다 (PhoneFrame 참고).
// 사용: const toast = useToast(); toast(t("..."), "success");

import { CircleCheck } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type Tone = "default" | "success";
type ShowToast = (message: string, tone?: Tone) => void;

const ToastContext = createContext<ShowToast>(() => {});
const VISIBLE_MS = 3200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; message: string; tone: Tone }[]>([]);
  const nextId = useRef(0);

  const show = useCallback<ShowToast>((message, tone = "default") => {
    const id = ++nextId.current;
    setItems((xs) => [...xs, { id, message, tone }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), VISIBLE_MS);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-3 z-50 print:hidden mx-auto flex w-full max-w-[390px] flex-col gap-2 px-4 md:top-12"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className="flex items-center gap-2 rounded-2xl bg-brand-navy px-4 py-3 text-sm font-semibold text-white shadow-lg motion-safe:animate-toast-in"
          >
            {item.tone === "success" ? <CircleCheck className="size-4 shrink-0 text-brand-lime" aria-hidden /> : null}
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  return useContext(ToastContext);
}
