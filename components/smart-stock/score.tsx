import { BrainCircuit, CheckCircle2, Sparkles } from "lucide-react";
import { Reveal } from "@/components/motion";

const scores = [
  { label: "Inventory planning", value: 82 },
  { label: "Demand forecast accuracy", value: 91 },
  { label: "Waste prevention", value: 76 },
  { label: "Sustainability", value: 95 },
];

export function EcoLoopAIScore() {
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  return <Reveal className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-[0_20px_55px_rgba(15,23,42,.15)] sm:p-8"><div className="noise" /><div className="relative grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:items-center"><div className="flex flex-col items-center border-b border-slate-800 pb-8 text-center lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8"><div className="flex items-center gap-2 text-xs font-semibold text-emerald-400"><BrainCircuit className="size-4" /> EcoLoop Smart Score</div><div className="relative mt-5 size-40"><svg className="size-full -rotate-90" viewBox="0 0 152 152" aria-label="EcoLoop Smart Score 87 out of 100"><circle cx="76" cy="76" r={radius} fill="none" stroke="#1E293B" strokeWidth="12" /><circle cx="76" cy="76" r={radius} fill="none" stroke="#22C55E" strokeWidth="12" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * .13} /></svg><div className="absolute inset-0 grid place-items-center"><div><p className="text-4xl font-semibold tracking-[-.06em]">87</p><p className="text-[10px] font-semibold text-slate-400">out of 100</p></div></div></div><span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[10px] font-semibold text-emerald-400"><CheckCircle2 className="size-3.5" /> Excellent inventory planning</span></div><div><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">Score breakdown</p><h2 className="mt-2 text-xl font-semibold tracking-[-.035em]">Your stock is working smarter.</h2></div><span className="hidden size-10 place-items-center rounded-xl bg-white/5 text-emerald-400 sm:grid"><Sparkles className="size-[18px]" /></span></div><div className="mt-7 grid gap-5 sm:grid-cols-2">{scores.map(item => <div key={item.label}><div className="flex items-center justify-between text-[11px]"><span className="font-medium text-slate-300">{item.label}</span><span className="font-semibold text-white">{item.value}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${item.value}%` }} /></div></div>)}</div></div></div></Reveal>;
}
