"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, BarChart3, BrainCircuit, Gauge, Leaf, PackageSearch, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { label: "Dashboard", href: "/dashboard/vendor/smart-stock", icon: Gauge },
  { label: "Inventory", href: "/dashboard/vendor/smart-stock/inventory", icon: PackageSearch },
  { label: "Forecast", href: "/dashboard/vendor/smart-stock/forecast", icon: TrendingUp },
  { label: "Alerts", href: "/dashboard/vendor/smart-stock/alerts", icon: AlertTriangle },
  { label: "Analytics", href: "/dashboard/vendor/smart-stock/analytics", icon: BarChart3 },
  { label: "AI Advisor", href: "/dashboard/vendor/smart-stock/advisor", icon: BrainCircuit },
  { label: "Impact", href: "/dashboard/vendor/smart-stock/impact", icon: Leaf },
];

export function SmartStockNavigation() {
  const pathname = usePathname();
  return <nav aria-label="Smart Stock navigation" className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"><div className="flex min-w-max gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">{items.map(item => { const active = pathname === item.href; return <Link key={item.href} href={item.href} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold transition sm:px-4", active ? "bg-slate-950 text-white shadow-sm dark:bg-emerald-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white")}><item.icon className="size-3.5" />{item.label}</Link>; })}</div></nav>;
}

export function SmartStockModuleShell({ children }: { children: React.ReactNode }) {
  return <div className="space-y-6"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-emerald-600 text-white shadow-[0_8px_22px_rgba(22,163,74,.2)]"><PackageSearch className="size-[18px]" /></span><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-emerald-600 dark:text-emerald-400">AI-powered waste prevention</p><p className="text-sm font-semibold text-slate-900 dark:text-white">EcoLoop Smart Stock</p></div><span className="ml-auto hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-400 sm:block">Forecast updated 8 min ago</span></div><SmartStockNavigation />{children}</div>;
}
