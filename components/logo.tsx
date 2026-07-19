import Image from "next/image";

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="EcoLoop home">
      <Image src="/Logo.png" alt="" width={36} height={36} className="size-9 rounded-xl object-cover shadow-[0_6px_18px_rgba(22,163,74,.18)]" />
      <span className={`text-[1.08rem] font-bold tracking-[-0.03em] ${inverse ? "text-white" : "text-slate-950"}`}>
        Eco<span className={inverse ? "text-emerald-400" : "text-emerald-600"}>Loop</span>
      </span>
    </span>
  );
}
