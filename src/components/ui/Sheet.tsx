"use client";

// 아래에서 올라오는 확인 창. 제목 옆 X, 바깥, Esc로 닫힌다.
// 내용만큼만 열리고, 화면의 70%를 넘으면 창 안에서 스크롤한다.
// 휴대폰 틀 안에서는 휴대폰 화면 안에서 올라온다 (PhoneFrame 참고).

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { useT } from "@/components/demo/DemoProvider";

interface Props {
  open: boolean;
  onClose(): void;
  title: string;
  children: ReactNode;
}

export function Sheet({ open, onClose, title, children }: Props) {
  const t = useT();
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // preventScroll: 창은 아래에서 올라오는 중이라 포커스 순간엔 화면 밖에 있다. 그냥 focus()하면 브라우저가 창을 보이게 하려고
    // 뒤 화면(휴대폰 틀 안쪽 스크롤)을 아래로 끌어내린다 (2026-11-20 홈 「신용도 이유」에서 발견)
    panel.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={onClose}
        className="absolute inset-0 bg-brand-navy/40 motion-safe:animate-fade-in"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-full max-w-[390px] rounded-t-3xl bg-surface px-5 pt-3 pb-8 shadow-2xl outline-none motion-safe:animate-sheet-up"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" aria-hidden />
        <div className="flex items-center justify-between gap-2">
          <h2 id={titleId} className="text-lg font-bold">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label={t("common.close")} className="-mr-2 rounded-full p-2 text-muted active:bg-lavender">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="mt-3 max-h-[70dvh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
