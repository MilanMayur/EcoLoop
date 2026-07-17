import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, MoreHorizontal } from "lucide-react";
import { Reveal } from "@/components/motion";
import { cn } from "@/lib/utils";
import type { Metric } from "@/types/dashboard";

const tones = {
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  violet: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
};

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>{eyebrow && <p className="text-[11px] font-bold uppercase tracking-[.14em] text-emerald-600 dark:text-emerald-400">{eyebrow}</p>}<h1 className="mt-1.5 text-2xl font-semibold tracking-[-.04em] text-slate-950 dark:text-white sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p></div>
      {action}
    </div>
  );
}

export function MetricCard({ metric, index = 0 }: { metric: Metric; index?: number }) {
  const tone = metric.tone ?? "green";
  const up = !metric.change.startsWith("−");
  return (
    <Reveal delay={index * .05} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(15,23,42,.07)] dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between"><span className={cn("grid size-10 place-items-center rounded-xl", tones[tone])}><metric.icon className="size-[18px]" /></span><MoreHorizontal className="size-4 text-slate-300 dark:text-slate-600" /></div>
      <p className="mt-6 text-2xl font-semibold tracking-[-.04em] text-slate-950 dark:text-white">{metric.value}</p><p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">{metric.label}</p>
      <div className={cn("mt-4 flex items-center gap-1.5 text-[11px] font-medium", up ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500")}>
        {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}{metric.change}
      </div>
    </Reveal>
  );
}

export function Panel({ children, className, title, subtitle, action }: { children: ReactNode; className?: string; title?: string; subtitle?: string; action?: ReactNode }) {
  return <section className={cn("min-w-0 rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,.035)] dark:border-slate-800 dark:bg-slate-900", className)}>{(title || action) && <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6"><div><h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>{subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}</div>{action}</div>}{children}</section>;
}

export function StatusBadge({ status }: { status: string }) {
  const style = status === "Completed" || status === "Healthy" || status === "Active" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-400" : status === "In transit" || status === "Assigned" || status === "Accepted" ? "bg-blue-50 text-blue-700 ring-blue-600/15 dark:bg-blue-500/10 dark:text-blue-400" : status === "Attention" || status === "High" || status === "Delayed" ? "bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-500/10 dark:text-amber-400" : "bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-slate-800 dark:text-slate-300";
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset", style)}><span className="size-1.5 rounded-full bg-current opacity-70" />{status}</span>;
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="flex flex-col items-center px-6 py-16 text-center"><span className="grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800">{icon}</span><h3 className="mt-5 text-sm font-semibold text-slate-900 dark:text-white">{title}</h3><p className="mt-2 max-w-sm text-xs leading-5 text-slate-500">{description}</p>{action && <div className="mt-6">{action}</div>}</div>;
}
