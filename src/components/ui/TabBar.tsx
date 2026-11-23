"use client";

// 기사 앱 하단 탭 (Figma 하단 탭. 「혜택」은 「제출 이력」으로 바꿈, CLAUDE.md 6절).
// 「추천」(가상 상품 추천)은 「마이」 바로 옆. KUR 체크리스트는 「마이」 안으로 옮겼다. /kur에 있을 때도 「마이」 탭이 켜진다.

import { CircleUser, ClipboardList, Gauge, House, Sparkles, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/demo/DemoProvider";

const TABS: { href: string; key: string; icon: LucideIcon; also?: string[] }[] = [
  { href: "/home", key: "home", icon: House },
  { href: "/history", key: "history", icon: ClipboardList },
  { href: "/credit", key: "credit", icon: Gauge },
  { href: "/recommend", key: "recommend", icon: Sparkles },
  { href: "/my", key: "my", icon: CircleUser, also: ["/kur"] },
];

export function TabBar() {
  const t = useT();
  const pathname = usePathname();
  return (
    <nav data-bottom-dock className="sticky bottom-0 z-20 mt-auto grid grid-cols-5 border-t border-line bg-surface pb-2" aria-label={t("tabs.label")}>
      {TABS.map(({ href, key, icon: Icon, also }) => {
        const active = pathname === href || Boolean(also?.includes(pathname));
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
