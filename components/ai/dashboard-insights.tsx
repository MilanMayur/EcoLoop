"use client";

import { Lightbulb, Sparkles } from "lucide-react";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { aiService } from "@/services/ai.service";
import type { DashboardAnalytics } from "@/types/mvp";
import type { DashboardRole } from "@/types/dashboard";

export function DashboardAIInsights({ role, data }: { role: DashboardRole; data: DashboardAnalytics }) {
  const resource = useAsyncResource(() => aiService.generateRecommendations(role, { metrics: data.metrics.map(({ label, value, change }) => ({ label, value, change })), wasteTrend: data.wasteTrend, wasteCategories: data.wasteCategories, recentRequests: data.recentRequests.slice(0, 6), markets: data.markets.slice(0, 6) }), `ai-dashboard-${role}`);
  return <section className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-500/10 sm:rounded-2xl sm:p-5"><div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300"><Sparkles className="size-4" /> Today’s AI Insights</div>{resource.loading ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{[0, 1].map((item) => <div key={item} className="h-10 animate-pulse rounded-xl bg-white/70 dark:bg-slate-900/50" />)}</div> : resource.error || !resource.data ? <p className="mt-3 text-[10px] text-emerald-800/70 dark:text-emerald-300/70">AI insights are temporarily unavailable. Live dashboard data is unaffected.</p> : <><div className="mt-3 grid gap-2 sm:grid-cols-2">{resource.data.insights.slice(0, 4).map((insight) => <div key={insight} className="flex gap-2 rounded-xl bg-white/80 px-3 py-2.5 text-[11px] leading-4 text-slate-600 dark:bg-slate-900/60 dark:text-slate-300"><Lightbulb className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />{insight}</div>)}</div><p className="mt-3 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">Priority: {resource.data.priorityAction}</p></>}</section>;
}
