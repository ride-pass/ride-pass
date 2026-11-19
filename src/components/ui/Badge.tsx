import type { ReactNode } from "react";

type Tone = "lime" | "lavender" | "danger" | "neutral";

const TONE: Record<Tone, string> = {
  lime: "bg-brand-lime text-lime-ink",
  lavender: "bg-lavender text-brand-purple",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-line text-muted",
};

export function Badge({ tone = "lavender", icon, children }: { tone?: Tone; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[tone]}`}>
      {icon}
      {children}
    </span>
  );
}
