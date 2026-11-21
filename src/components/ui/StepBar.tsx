/**
 * 단계 표시줄 (Figma: 상단 4칸 막대).
 * label을 주면 막대 오른쪽 아래에 작은 글자로 단다. 제목 위 알약(eyebrow) 대신 여기에 둔다 (CLAUDE.md 6절).
 */
export function StepBar({ current, total, label }: { current: number; total: number; label?: string }) {
  return (
    <div className="px-4 pb-3">
      <div className="flex gap-1.5" aria-hidden={label ? true : undefined} aria-label={label ? undefined : `${current} / ${total}`}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < current ? "bg-brand-purple" : "bg-line"}`} />
        ))}
      </div>
      {label ? (
        <p className="mt-1.5 text-right text-xs text-muted">
          {label}
        </p>
      ) : null}
    </div>
  );
}
