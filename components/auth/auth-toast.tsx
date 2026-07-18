"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function AuthToast({ message, tone = "success", onClose }: { message: string; tone?: "success" | "error"; onClose: () => void }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("fixed bottom-5 right-5 z-[80] flex max-w-sm items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-2xl", tone === "error" ? "border-rose-200" : "border-emerald-200")}>
      <span className={cn("grid size-8 place-items-center rounded-full", tone === "error" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700")}>
        {tone === "error" ? <X className="size-4" /> : <Check className="size-4" />}
      </span>
      <p className="text-xs font-medium text-slate-700">{message}</p>
      <button type="button" onClick={onClose} className="ml-2 text-slate-400" aria-label="Close message"><X className="size-3.5" /></button>
    </div>
  );
}
