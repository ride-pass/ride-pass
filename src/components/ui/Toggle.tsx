"use client";

import { Check } from "lucide-react";

interface Props {
  checked: boolean;
  onChange(next: boolean): void;
  label: string;
  disabled?: boolean;
}

/** 켜기·끄기 스위치 (Figma: 보라 바탕 + 라임 체크) */
export function Toggle({ checked, onChange, label, disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-14 shrink-0 rounded-full transition ${checked ? "bg-brand-purple" : "bg-line"} disabled:opacity-50`}
    >
      <span
        className={`absolute top-1 grid size-6 place-items-center rounded-full transition-all ${checked ? "left-7 bg-brand-lime" : "left-1 bg-surface"}`}
      >
        {checked ? <Check className="size-4 text-lime-ink" strokeWidth={3} aria-hidden /> : null}
      </span>
    </button>
  );
}
