"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart3, Check, Recycle, ShieldCheck } from "lucide-react";
import { LanguageSelector } from "@/components/i18n/language-selector";
import { Logo } from "@/components/logo";

export function AuthShell({ children, mode }: { children: ReactNode; mode: "login" | "signup" }) {
  const highlights = [
    { icon: Recycle, value: "72%", label: "Recovered" },
    { icon: BarChart3, value: "850 kg", label: "Tracked today" },
    { icon: ShieldCheck, value: "100%", label: "Verified partners" },
  ];

  return (
    <main className="min-h-screen bg-[#F8FAFC] lg:grid lg:grid-cols-[.92fr_1.08fr]">
      <section className="flex min-h-screen flex-col px-4 py-5 sm:px-10 sm:py-6 lg:px-14">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="w-fit"><Logo /></Link>
          <LanguageSelector />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 items-center py-8 sm:py-12">{children}</div>
        <p className="text-center text-[10px] text-slate-400">© 2026 EcoLoop · Smart Circular Waste Management</p>
      </section>
      <aside className="relative hidden overflow-hidden bg-[#EDF6F0] lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div className="noise" />
        <div className="relative z-10 flex items-center justify-between">
          <span className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-[10px] font-semibold text-emerald-700">Trusted civic-tech infrastructure</span>
          <span className="text-[10px] font-semibold text-slate-500">Bengaluru · India</span>
        </div>
        <div className="relative z-10 mt-10 overflow-hidden rounded-[2rem] border border-white bg-white p-2 shadow-[0_24px_70px_rgba(22,101,52,.13)]">
          <Image src="/ecoloop-circular-market.webp" alt="EcoLoop connects a market vendor, collection vehicle, and recycling facility" width={1728} height={960} className="aspect-[1.42/1] w-full rounded-[1.55rem] object-cover" priority />
          <div className="grid grid-cols-3 gap-2 p-2 pt-4">
            {highlights.map((item) => <div key={item.label} className="rounded-xl bg-slate-50 p-3"><item.icon className="size-4 text-emerald-600" /><p className="mt-3 text-sm font-semibold text-slate-900">{item.value}</p><p className="mt-1 text-[9px] text-slate-400">{item.label}</p></div>)}
          </div>
        </div>
        <div className="relative z-10 mt-8">
          <p className="max-w-xl text-2xl font-semibold leading-tight tracking-[-.04em] text-slate-950">{mode === "login" ? "Welcome back to cleaner, smarter markets." : "One platform. Every participant in the loop."}</p>
          <div className="mt-5 flex flex-wrap gap-4 text-[10px] font-medium text-slate-500">
            {["Role-aware workspace", "Live waste traceability", "Verified recovery data"].map((text) => <span key={text} className="flex items-center gap-1.5"><Check className="size-3.5 text-emerald-600" />{text}</span>)}
          </div>
        </div>
      </aside>
    </main>
  );
}
