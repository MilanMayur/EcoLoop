"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [["Home", "#top"], ["Smart Stock", "#smart-stock"], ["Zero Waste", "#zero-waste"], ["Smart Market", "#smart-market"], ["Impact", "#impact"], ["Contact", "#contact"]];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-300", scrolled && "border-b border-slate-200/70 bg-white/90 shadow-[0_8px_30px_rgba(15,23,42,.04)] backdrop-blur-xl")}>
      <div className="mx-auto flex h-20 max-w-[1200px] items-center justify-between px-5 sm:px-8">
        <a href="#top" onClick={() => setOpen(false)}><Logo /></a>
        <nav className="hidden items-center gap-5 lg:flex xl:gap-7" aria-label="Main navigation">
          {links.map(([label, href]) => <a className="text-xs font-medium text-slate-600 transition-colors hover:text-slate-950 xl:text-sm" href={href} key={href}>{label}</a>)}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="ghost" size="sm"><a href="/login">Login</a></Button>
          <Button asChild size="sm"><a href="#contact">Request a demo</a></Button>
        </div>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</Button>
      </div>
      <div id="mobile-menu" className={cn("overflow-hidden border-t border-slate-100 bg-white transition-[max-height,opacity] duration-300 lg:hidden", open ? "max-h-96 opacity-100" : "max-h-0 opacity-0")}>
        <nav className="mx-auto flex max-w-[1200px] flex-col gap-1 px-5 py-4" aria-label="Mobile navigation">
          {links.map(([label, href]) => <a className="rounded-xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50" href={href} key={href} onClick={() => setOpen(false)}>{label}</a>)}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button asChild variant="outline"><a href="/login" onClick={() => setOpen(false)}>Login</a></Button>
            <Button asChild><a href="#contact" onClick={() => setOpen(false)}>Request demo</a></Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
