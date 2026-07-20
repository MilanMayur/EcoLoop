"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aiService } from "@/services/ai.service";
import type { ChatMessage } from "@/types/ai";
import type { DashboardRole } from "@/types/dashboard";
import { cn } from "@/lib/utils";
import { analyticsService } from "@/services/analytics.service";
import { inventoryService } from "@/services/inventory.service";

const starters = ["How can I reduce waste?", "Why is my Smart Score low?", "Show inventory risks"];

export function AICopilot({ role }: { role: DashboardRole }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [suggestions, setSuggestions] = useState(starters);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: "Hi, I’m EcoLoop Copilot. Ask me about inventory risk, pickups, sustainability, or your Smart Score." }]);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  const typeReply = (reply: string) => new Promise<void>((resolve) => {
    let index = 0;
    setMessages((current) => [...current, { role: "assistant", content: "" }]);
    timer.current = window.setInterval(() => {
      index = Math.min(reply.length, index + 4);
      setMessages((current) => current.map((item, itemIndex) => itemIndex === current.length - 1 ? { ...item, content: reply.slice(0, index) } : item));
      if (index >= reply.length && timer.current) { window.clearInterval(timer.current); timer.current = null; resolve(); }
    }, 18);
  });

  const ask = async (question: string) => {
    const message = question.trim();
    if (!message || thinking) return;
    const history = messages.slice(-8);
    setMessages((current) => [...current, { role: "user", content: message }]);
    setInput("");
    setThinking(true);
    try {
      const dashboard = await analyticsService.getDashboard(role).catch(() => null);
      const inventory = role === "vendor" ? await inventoryService.getInventory().catch(() => []) : [];
      const context = { metrics: dashboard?.metrics.map(({ label, value, change }) => ({ label, value, change })) ?? [], recentRequests: dashboard?.recentRequests.slice(0, 8) ?? [], wasteTrend: dashboard?.wasteTrend ?? [], inventory };
      const result = await aiService.chatAssistant(role, message, history, context);
      setSuggestions(result.suggestedActions.length ? result.suggestedActions.slice(0, 3) : starters);
      await typeReply(result.reply);
    } catch (error) {
      await typeReply(error instanceof Error ? error.message : "EcoLoop AI is temporarily unavailable.");
    } finally { setThinking(false); }
  };

  return <>
    {open && <section role="dialog" aria-label="EcoLoop AI Copilot" className="fixed inset-x-3 bottom-[calc(9rem+env(safe-area-inset-bottom))] z-[60] flex max-h-[68dvh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:inset-x-auto sm:bottom-24 sm:right-6 sm:h-[32rem] sm:w-[23rem]">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800"><span className="grid size-9 place-items-center rounded-xl bg-slate-950 text-emerald-400 dark:bg-emerald-600 dark:text-white"><Sparkles className="size-4" /></span><div className="min-w-0 flex-1"><h2 className="text-xs font-semibold">EcoLoop Copilot</h2><p className="mt-0.5 text-[9px] text-slate-400">Grounded in your EcoLoop workflow</p></div><Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Close AI Copilot"><X className="size-4" /></Button></div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}><p className={cn("max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[11px] leading-5", message.role === "user" ? "rounded-tr-sm bg-emerald-600 text-white" : "rounded-tl-sm bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200")}>{message.content || "…"}</p></div>)}{thinking && !messages.at(-1)?.content && <p className="text-[10px] text-slate-400">Thinking…</p>}</div>
      <div className="border-t border-slate-100 p-3 dark:border-slate-800"><div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">{suggestions.map((suggestion) => <button type="button" key={suggestion} disabled={thinking} onClick={() => void ask(suggestion)} className="shrink-0 rounded-full border border-slate-200 px-2.5 py-1.5 text-[9px] text-slate-500 hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700">{suggestion}</button>)}</div><form onSubmit={(event) => { event.preventDefault(); void ask(input); }} className="flex gap-2"><input value={input} onChange={(event) => setInput(event.target.value)} maxLength={800} placeholder="Ask EcoLoop…" aria-label="Ask EcoLoop Copilot" className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-950" /><Button type="submit" size="icon" disabled={thinking || !input.trim()} aria-label="Send to EcoLoop Copilot"><Send className="size-4" /></Button></form></div>
    </section>}
    <button type="button" onClick={() => setOpen((current) => !current)} aria-label={open ? "Close EcoLoop AI Copilot" : "Open EcoLoop AI Copilot"} aria-expanded={open} className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-3 z-[60] grid size-12 place-items-center rounded-full bg-slate-950 text-emerald-400 shadow-[0_14px_36px_rgba(15,23,42,.3)] transition hover:-translate-y-0.5 dark:bg-emerald-600 dark:text-white sm:bottom-6 sm:right-6 sm:size-14">{open ? <X className="size-5" /> : <Bot className="size-5 sm:size-6" />}</button>
  </>;
}
