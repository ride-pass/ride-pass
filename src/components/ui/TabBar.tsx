"use client";

// 기사 앱 하단 탭 (Figma 하단 탭. 「혜택」은 「제출 이력」으로 바꿈, CLAUDE.md 6절).

import { ClipboardList, Gauge, House, ListChecks, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/demo/DemoProvider";

const TABS: { href: string; key: string; icon: LucideIcon }[] = [
  { href: "/home", key: "home", icon: House },
  { href: "/history", key: "history", icon: ClipboardList },
  { href: "/credit", key: "credit", icon: Gauge },
  { href: "/kur", key: "kur", icon: ListChecks },
];

export function TabBar() {
  const t = useT();
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-20 mt-auto grid grid-cols-4 border-t border-line bg-surface/95 pb-2 backdrop-blur" aria-label={t("tabs.label")}>
      {TABS.map(({ href, key, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-1 pt-2.5 pb-1 text-[11px] font-semibold ${active ? "text-brand-purple" : "text-muted"}`}
          >
            <Icon className="size-5" aria-hidden />
            {t(`tabs.${key}`)}
          </Link>
        );
      })}
    </nav>
  );
}
