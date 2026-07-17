import { Leaf } from "lucide-react";

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="EcoLoop home">
      <span className="grid size-9 place-items-center rounded-xl bg-emerald-600 text-white shadow-[0_6px_18px_rgba(22,163,74,.22)]">
        <Leaf className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />
      </span>
      <span className={`text-[1.08rem] font-bold tracking-[-0.03em] ${inverse ? "text-white" : "text-slate-950"}`}>
        Eco<span className={inverse ? "text-emerald-400" : "text-emerald-600"}>Loop</span>
      </span>
    </span>
  );
}
