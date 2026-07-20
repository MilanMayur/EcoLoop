"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation } from "@/data/dashboard";
import { cn } from "@/lib/utils";
import type { DashboardRole } from "@/types/dashboard";
import { useLanguage } from "@/components/i18n/language-provider";

const mobileLabels: Record<DashboardRole, string[]> = {
  vendor: ["Dashboard", "Smart Stock", "Request pickup", "Analytics", "Profile"],
  recycler: ["Dashboard", "Assignment queue", "Assigned jobs", "Drivers", "Profile"],
  driver: ["Dashboard", "Today's jobs", "Current route", "Completed jobs", "Profile"],
  admin: ["Overview", "Markets", "Pickup requests", "Analytics", "Settings"],
};

export function MobileBottomNavigation({ role, onNavigate }: { role: DashboardRole; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const items = mobileLabels[role]
    .map((label) => navigation[role].find((item) => item.label === label))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <nav
      aria-label={`${role} primary mobile navigation`}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_rgba(15,23,42,.08)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 lg:hidden"
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== `/dashboard/${role}` && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[9px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                active ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200",
              )}
            >
              {active && <span className="absolute top-0 h-0.5 w-7 rounded-full bg-emerald-500" aria-hidden="true" />}
              <item.icon className={cn("size-[19px]", active && "stroke-[2.4]")} aria-hidden="true" />
              <span className="max-w-full truncate">{t(item.label)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
