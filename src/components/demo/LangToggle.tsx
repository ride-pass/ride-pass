"use client";

import { useDemo } from "./DemoProvider";
import type { Lang } from "@/i18n/lang";

const LANGS: { id: Lang; label: string }[] = [
  { id: "ko", label: "KO" },
  { id: "id", label: "ID" },
];

/** 한국어 ↔ 인도네시아어 (Figma 온보딩의 KO/EN 자리). 켜진 쪽은 흰색: 보라는 주요 버튼·켜진 탭·데이터에만 쓴다 (CLAUDE.md 6절) */
export function LangToggle() {
  const { lang, setLang } = useDemo();
  return (
    <div className="inline-flex rounded-full bg-line p-1" role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          aria-pressed={lang === l.id}
          onClick={() => setLang(l.id)}
          className={`rounded-full px-3 py-1 text-xs font-bold ${lang === l.id ? "bg-surface text-brand-navy" : "text-muted"}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
