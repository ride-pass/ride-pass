import type { ComponentProps } from "react";

export function Card({ className = "", ...props }: ComponentProps<"section">) {
  return <section className={`rounded-3xl bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] ${className}`} {...props} />;
}
