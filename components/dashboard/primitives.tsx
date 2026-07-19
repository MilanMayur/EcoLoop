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
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end sm:gap-5">
      <div>{eyebrow && <p className="text-[10px] font-bold uppercase tracking-[.12em] text-emerald-600 dark:text-emerald-400 sm:text-[11px] sm:tracking-[.14em]">{eyebrow}</p>}<h1 className="mt-1 text-xl font-semibold tracking-[-.04em] text-slate-950 dark:text-white sm:mt-1.5 sm:text-3xl">{title}</h1><p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400 sm:mt-2 sm:text-sm sm:leading-6">{description}</p></div>
      {action && <div className="w-full sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">{action}</div>}
    </div>
  );
}

export function MetricCard({ metric, index = 0 }: { metric: Metric; index?: number }) {
  const tone = metric.tone ?? "green";
  const positive = metric.change.startsWith("+");
  const negative = metric.change.startsWith("−") || metric.change.startsWith("-");
  return (
    <Reveal delay={index * .05} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-[0_8px_28px_rgba(15,23,42,.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(15,23,42,.07)] dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl sm:p-5">
      <div className="flex items-start justify-between"><span className={cn("grid size-9 place-items-center rounded-lg sm:size-10 sm:rounded-xl", tones[tone])}><metric.icon className="size-4 sm:size-[18px]" /></span><MoreHorizontal className="size-4 text-slate-300 dark:text-slate-600" /></div>
      <p className="mt-4 text-xl font-semibold tracking-[-.04em] text-slate-950 dark:text-white sm:mt-6 sm:text-2xl">{metric.value}</p><p className="mt-1 text-[11px] font-medium leading-4 text-slate-600 dark:text-slate-300 sm:text-sm">{metric.label}</p>
      <div className={cn("mt-3 flex items-center gap-1 text-[9px] font-medium sm:mt-4 sm:gap-1.5 sm:text-[11px]", positive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500")}>
        {positive ? <ArrowUpRight className="size-3.5" /> : negative ? <ArrowDownRight className="size-3.5" /> : null}{metric.change}
      </div>
    </Reveal>
  );
}

export function Panel({ children, className, title, subtitle, action }: { children: ReactNode; className?: string; title?: string; subtitle?: string; action?: ReactNode }) {
  return <section className={cn("min-w-0 rounded-xl border border-slate-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,.035)] dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl", className)}>{(title || action) && <div className="flex flex-col items-start justify-between gap-2 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800 sm:flex-row sm:items-center sm:gap-3 sm:px-6 sm:py-4"><div className="min-w-0"><h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>{subtitle && <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs sm:leading-5">{subtitle}</p>}</div>{action && <div className="w-full shrink-0 sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">{action}</div>}</div>}{children}</section>;
}

export function StatusBadge({ status }: { status: string }) {
  const style = status === "Completed" || status === "Healthy" || status === "Active" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-400" : status === "In transit" || status === "Assigned" || status === "Accepted" ? "bg-blue-50 text-blue-700 ring-blue-600/15 dark:bg-blue-500/10 dark:text-blue-400" : status === "Attention" || status === "High" || status === "Delayed" ? "bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-500/10 dark:text-amber-400" : "bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-slate-800 dark:text-slate-300";
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset", style)}><span className="size-1.5 rounded-full bg-current opacity-70" />{status}</span>;
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="flex flex-col items-center px-6 py-16 text-center"><span className="grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800">{icon}</span><h3 className="mt-5 text-sm font-semibold text-slate-900 dark:text-white">{title}</h3><p className="mt-2 max-w-sm text-xs leading-5 text-slate-500">{description}</p>{action && <div className="mt-6">{action}</div>}</div>;
}
