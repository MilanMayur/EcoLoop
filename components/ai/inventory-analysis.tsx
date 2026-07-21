"use client";

import { AlertTriangle, BrainCircuit, IndianRupee, Sparkles } from "lucide-react";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { aiService } from "@/services/ai.service";
import { inventoryService } from "@/services/inventory.service";
import { pickupService } from "@/services/pickup.service";

export function InventoryAIAnalysisCard() {
  const resource = useAsyncResource(async () => {
    const [inventory, pickups] = await Promise.all([inventoryService.getInventory(), pickupService.getRequests()]);
    return aiService.analyzeInventory({ inventory, previousPickups: pickups.slice(0, 20).map(({ waste, fillLevel, actualWeight, status, time }) => ({ waste, fillLevel, actualWeight, status, time })) });
  }, "ai-inventory-analysis");
  if (resource.loading) return <div className="h-28 animate-pulse rounded-xl bg-slate-900 sm:h-44 sm:rounded-2xl" />;
  if (resource.error || !resource.data) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] sm:rounded-2xl sm:p-4 text-amber-800">AI inventory analysis is temporarily unavailable. Smart Stock data remains available.</div>;
  const analysis = resource.data;
  return <section className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white sm:p-6 sm:rounded-2xl"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-xs font-semibold text-emerald-400"><BrainCircuit className="size-4" /> AI inventory analysis</div><span className="rounded-full bg-white/5 px-2.5 py-1 text-[9px] text-slate-300">{analysis.confidence ? `${Math.round(analysis.confidence)}% confidence` : "Data fallback"}</span></div><p className="mt-2 text-xs font-semibold leading-4 sm:mt-3 sm:text-sm sm:leading-5">{analysis.summary}</p><div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:mt-4 sm:gap-2"><div className="rounded-lg bg-white/5 p-2 sm:rounded-xl sm:p-3"><p className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-slate-400"><AlertTriangle className="size-3" /> Priority</p><p className="mt-1 text-xs font-semibold">{analysis.priority}</p></div><div className="rounded-lg bg-white/5 p-2 sm:rounded-xl sm:p-3"><p className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-slate-400"><IndianRupee className="size-3" /> Estimated savings</p><p className="mt-1 text-xs font-semibold">₹{analysis.estimatedSavings.toLocaleString("en-IN")}</p></div></div><div className="mt-2.5 space-y-1 sm:mt-4 sm:space-y-2">{analysis.purchaseRecommendations.slice(0, 3).map((item) => <p key={item} className="flex gap-2 text-[11px] leading-4 text-slate-300"><Sparkles className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />{item}</p>)}</div></section>;
}
