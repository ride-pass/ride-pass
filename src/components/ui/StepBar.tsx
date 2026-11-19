/** 단계 표시줄 (Figma: 상단 4칸 막대) */
export function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1.5 px-4 pb-3" aria-label={`${current} / ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 flex-1 rounded-full ${i < current ? "bg-brand-purple" : "bg-line"}`}
        />
      ))}
    </div>
  );
}
