"use client";

import { BrainCircuit, CheckCircle2, Sparkles } from "lucide-react";
import { Reveal } from "@/components/motion";
import { InventoryAIAnalysisCard } from "@/components/ai/inventory-analysis";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { inventoryService } from "@/services/inventory.service";
import { pickupService } from "@/services/pickup.service";
import { aiService } from "@/services/ai.service";
import { deriveSmartScore } from "@/lib/ai-score";

const labels = {
  inventoryEfficiency: "Inventory efficiency",
  wasteReduction: "Waste reduction",
  timelyPickups: "Timely pickups",
  recyclingParticipation: "Recycling participation",
  sustainability: "Sustainability",
};

export function EcoLoopAIScore() {
  const resource = useAsyncResource(async () => {
    const [inventory, pickups] = await Promise.all([inventoryService.getInventory(), pickupService.getRequests()]);
    return aiService.generateSmartScore(deriveSmartScore(inventory, pickups));
  }, "ecoloop-smart-score");
  const radius = 62;
  const circumference = 2 * Math.PI * radius;

  if (resource.loading) return <><div className="h-44 animate-pulse rounded-xl bg-slate-950 sm:h-80 sm:rounded-[1.75rem]" /><InventoryAIAnalysisCard /></>;
  if (resource.error || !resource.data) return <><div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs sm:rounded-2xl sm:p-5 text-amber-800">Smart Score is unavailable until inventory and pickup data can be loaded.</div><InventoryAIAnalysisCard /></>;

  const result = resource.data;
  const scores = Object.entries(result.metrics) as Array<[keyof typeof result.metrics, number]>;
  return <><Reveal className="relative overflow-hidden rounded-xl bg-slate-950 p-3 text-white shadow-[0_20px_55px_rgba(15,23,42,.15)] sm:rounded-[1.75rem] sm:p-8"><div className="noise" /><div className="relative grid gap-3 sm:gap-8 lg:grid-cols-[.7fr_1.3fr] lg:items-center"><div className="flex flex-col items-center border-b border-slate-800 pb-3 text-center sm:pb-8 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8"><div className="flex items-center gap-2 text-xs font-semibold text-emerald-400"><BrainCircuit className="size-4" /> EcoLoop Smart Score</div><div className="relative mt-2 size-24 sm:mt-5 sm:size-40"><svg className="size-full -rotate-90" viewBox="0 0 152 152" aria-label={`EcoLoop Smart Score ${result.score} out of 100`}><circle cx="76" cy="76" r={radius} fill="none" stroke="#1E293B" strokeWidth="12" /><circle cx="76" cy="76" r={radius} fill="none" stroke="#22C55E" strokeWidth="12" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1-result.score/100)} /></svg><div className="absolute inset-0 grid place-items-center"><div><p className="text-2xl font-semibold tracking-[-.06em] sm:text-4xl">{result.score}</p><p className="text-[10px] font-semibold text-slate-400">out of 100</p></div></div></div><span className="mt-2 inline-flex items-center gap-1.5 sm:mt-5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[10px] font-semibold text-emerald-400"><CheckCircle2 className="size-3.5" /> {result.status}</span></div><div><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">Deterministic score breakdown</p><h2 className="mt-1 text-sm font-semibold tracking-[-.035em] sm:mt-2 sm:text-xl">Measured from your EcoLoop activity.</h2></div><span className="hidden size-10 place-items-center rounded-xl bg-white/5 text-emerald-400 sm:grid"><Sparkles className="size-[18px]" /></span></div><div className="mt-3 grid gap-2 sm:mt-6 sm:grid-cols-2 sm:gap-4">{scores.map(([key, value]) => <div key={key}><div className="flex items-center justify-between text-[11px]"><span className="font-medium text-slate-300">{labels[key]}</span><span className="font-semibold text-white">{Math.round(value)}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${value}%` }} /></div></div>)}</div><div className="mt-3 grid gap-1.5 border-t border-slate-800 pt-3 sm:mt-6 sm:grid-cols-2 sm:pt-5">{result.explanation.slice(0, 2).map((item) => <p key={item} className="text-[10px] leading-4 text-slate-400">{item}</p>)}</div>{result.recommendations[0] && <p className="mt-3 rounded-lg bg-emerald-500/10 px-2.5 py-2 text-[10px] leading-4 text-emerald-300">To improve: {result.recommendations[0]}</p>}</div></div></Reveal><InventoryAIAnalysisCard /></>;
}
