"use client";

// 아래에서 올라오는 확인 창. 바깥을 누르거나 Esc를 누르면 닫힌다.
// 휴대폰 틀 안에서는 휴대폰 화면 안에서 올라온다 (PhoneFrame 참고).

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
    panel.current?.focus();
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
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" aria-hidden />
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
