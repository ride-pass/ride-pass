"use client";

// 누르면 한두 문장 설명 창이 열리는 배지 (2026-11-23).
// 「PKA 인가 후 제공 기능」·「중개 제휴 후 제공 기능」처럼 처음 보는 사람이 모르는 용어를 배지 문구는 그대로 두고 풀어 준다.
// 모양은 Badge(연보라 알약)와 같고, 누를 수 있다는 표시로 작은 i 아이콘만 붙인다 (CLAUDE.md 6-1: 모양만 바꿀 수 있고 빼지 않는다).

import { Info } from "lucide-react";
import { useState } from "react";
import { Sheet } from "./Sheet";

interface Props {
  label: string;
  /** 설명 창 문단 */
  body: string[];
}

export function InfoBadge({ label, body }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-1 rounded-full bg-lavender px-2.5 py-1 text-xs font-semibold text-brand-purple active:opacity-70"
      >
        {label}
        <Info className="size-3.5" aria-hidden />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <div className="flex flex-col gap-2 pb-2 text-sm leading-relaxed">
          {body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </Sheet>
    </>
  );
}
