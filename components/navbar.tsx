"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, CircleUserRound, LayoutDashboard, LogOut, Menu, Settings, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/i18n/language-selector";
import { homepageAccountLinks, homepageDashboardRole, useHomepageAccount } from "@/components/landing/homepage-session";
import { cn } from "@/lib/utils";
import { authService } from "@/services/auth.service";

const links = [["Home", "#top"], ["Smart Stock", "#smart-stock"], ["Zero Waste", "#zero-waste"], ["Smart Market", "#smart-market"], ["Impact", "#impact"], ["Contact", "#contact"]];

export function Navbar() {
  const router = useRouter();
  const account = useHomepageAccount();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const accountMenu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!accountOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!accountMenu.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [accountOpen]);

  const logout = async () => {
    setSigningOut(true);
    try {
      await authService.logout();
    } finally {
      setAccountOpen(false);
      setSigningOut(false);
      router.push("/login");
      router.refresh();
    }
  };

  const resolvedRole = account ? homepageDashboardRole(account) : null;
  const destinations = resolvedRole ? homepageAccountLinks(resolvedRole) : null;
  const displayName = resolvedRole === "recycler"
    ? account?.organization.trim() || account?.name.trim() || account?.email.split("@")[0] || "Account"
    : account?.name.trim() || account?.organization.trim() || account?.email.split("@")[0] || "Account";

  return (
    <header className={cn("pointer-events-auto fixed inset-x-0 top-0 z-[100] isolate transition-all duration-300", scrolled && "border-b border-slate-200/70 bg-white/90 shadow-[0_8px_30px_rgba(15,23,42,.04)] backdrop-blur-xl")}>
      <div className="mx-auto flex h-20 max-w-[1200px] items-center justify-between px-5 sm:px-8">
        <a href="#top" onClick={() => setOpen(false)}><Logo /></a>
        <nav className="hidden items-center gap-5 lg:flex xl:gap-7" aria-label="Main navigation">
          {links.map(([label, href]) => <a className="text-xs font-medium text-slate-600 transition-colors hover:text-slate-950 xl:text-sm" href={href} key={href}>{label}</a>)}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSelector className="h-9" />
          {account === undefined ? (
            <span className="h-9 w-24 animate-pulse rounded-lg bg-slate-200/70" aria-label="Loading account" />
          ) : account ? (
            <div className="relative" ref={accountMenu}>
              <Button variant="ghost" size="sm" aria-haspopup="menu" aria-expanded={accountOpen} onClick={() => setAccountOpen((current) => !current)}>
                <CircleUserRound className="size-4" />
                <span className="max-w-32 truncate">{displayName}</span>
                <ChevronDown className={cn("size-3.5 transition-transform", accountOpen && "rotate-180")} />
              </Button>
              {accountOpen && (
                <div role="menu" aria-label="Account menu" className="absolute right-0 top-[calc(100%+.55rem)] w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_48px_rgba(15,23,42,.14)]">
                  <div className="border-b border-slate-100 px-3 py-2.5">
                    <p className="truncate text-xs font-semibold text-slate-900">{displayName}</p>
                    <p className="mt-1 truncate text-[10px] text-slate-400">{account.email}</p>
                  </div>
                  {destinations && (
                    <div className="py-1.5">
                      <Link role="menuitem" href={destinations.dashboard} onClick={() => setAccountOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-950"><LayoutDashboard className="size-4 text-slate-400" /> Dashboard</Link>
                      <Link role="menuitem" href={destinations.profile} onClick={() => setAccountOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-950">{resolvedRole === "admin" ? <Settings className="size-4 text-slate-400" /> : <CircleUserRound className="size-4 text-slate-400" />}{resolvedRole === "admin" ? "Settings" : "Profile"}</Link>
                    </div>
                  )}
                  <button role="menuitem" type="button" disabled={signingOut} onClick={() => void logout()} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"><LogOut className="size-4" /> {signingOut ? "Signing out…" : "Sign out"}</button>
                </div>
              )}
            </div>
          ) : (
            <Button asChild variant="ghost" size="sm"><Link href="/login">Login</Link></Button>
          )}
          {resolvedRole !== "admin" && <Button asChild size="sm"><a href="#contact">Request a demo</a></Button>}
        </div>
        <Button variant="ghost" size="icon" className="relative z-10 lg:hidden" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</Button>
      </div>
      <div id="mobile-menu" className={cn("overflow-hidden border-t border-slate-100 bg-white transition-[max-height,opacity] duration-300 lg:hidden", open ? "pointer-events-auto max-h-[calc(100dvh-5rem)] overflow-y-auto opacity-100" : "pointer-events-none max-h-0 opacity-0")}>
        <nav className="mx-auto flex max-w-[1200px] flex-col gap-1 px-5 py-4" aria-label="Mobile navigation">
          {links.map(([label, href]) => <a className="rounded-xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50" href={href} key={href} onClick={() => setOpen(false)}>{label}</a>)}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {account === undefined ? <span className="h-10 animate-pulse rounded-lg bg-slate-100" aria-label="Loading account" /> : account && destinations ? <Button asChild variant="outline"><Link href={destinations.dashboard} onClick={() => setOpen(false)} className="truncate"><CircleUserRound className="size-4" /> {displayName}</Link></Button> : <Button asChild variant="outline"><Link href="/login" onClick={() => setOpen(false)}>Login</Link></Button>}
            {account && destinations ? <Button asChild><Link href={destinations.profile} onClick={() => setOpen(false)}>{resolvedRole === "admin" ? "Settings" : "Profile"}</Link></Button> : <Button asChild><a href="#contact" onClick={() => setOpen(false)}>Request demo</a></Button>}
          </div>
          {account && <Button variant="ghost" className="mt-2 w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700" disabled={signingOut} onClick={() => void logout()}><LogOut className="size-4" /> {signingOut ? "Signing out…" : "Sign out"}</Button>}
          <LanguageSelector className="mt-3 w-full justify-center" />
        </nav>
      </div>
    </header>
  );
}
