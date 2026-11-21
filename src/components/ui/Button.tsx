import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT: Record<Variant, string> = {
  primary: "bg-brand-purple text-white active:brightness-95 disabled:bg-lavender-strong disabled:text-brand-navy/70",
  secondary: "bg-lavender text-brand-purple active:bg-lavender-strong disabled:text-muted",
  ghost: "bg-transparent text-muted underline-offset-4 hover:underline",
  danger: "bg-danger text-white active:brightness-95",
};

const BASE =
  "inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-base font-semibold transition duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100";

interface Common {
  variant?: Variant;
  icon?: ReactNode;
  className?: string;
}

export function Button({
  variant = "primary",
  icon,
  className = "",
  children,
  ...props
}: Common & ComponentProps<"button">) {
  return (
    <button type="button" className={`${BASE} ${VARIANT[variant]} ${className}`} {...props}>
      {children}
      {icon}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  icon,
  className = "",
  children,
  ...props
}: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={`${BASE} ${VARIANT[variant]} ${className}`} {...props}>
      {children}
      {icon}
    </Link>
  );
}
