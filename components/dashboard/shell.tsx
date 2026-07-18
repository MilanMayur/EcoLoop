"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, ChevronDown, HelpCircle, LogOut, Menu, Moon, Search, Sun, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { navigation, roleLabels, roleProfiles } from "@/data/dashboard";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";
import type { DashboardRole } from "@/types/dashboard";
import { authService } from "@/services/auth.service";
import type { CurrentProfile } from "@/services/auth.service";
import { LanguageSelector } from "@/components/i18n/language-selector";
import { useLanguage } from "@/components/i18n/language-provider";

export function DashboardShell({ role, children }: { role: DashboardRole; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setLocale, t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dark, setDark] = useState(false);
  const [account, setAccount] = useState<CurrentProfile | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const fallbackProfile = roleProfiles[role];
  const profile = account ? {
    ...fallbackProfile,
    name: account.name || fallbackProfile.name,
    organization: account.organization || fallbackProfile.organization,
    initials: (account.name || fallbackProfile.name).split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
  } : fallbackProfile;
  const notifications = useNotifications(role);
  const searchResults = search.trim() ? navigation[role].filter((item) => item.label.toLowerCase().includes(search.trim().toLowerCase())) : [];

  useEffect(() => {
    const saved = localStorage.getItem("ecoloop-theme");
    const active = saved === "dark";
    document.documentElement.classList.toggle("dark", active);
    const frame = requestAnimationFrame(() => setDark(active));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let active = true;
    const protectRoute = async () => {
      try {
        const session = await authService.getSession();
        if (!active) return;
        if (!session) {
          setSessionReady(false);
          router.replace("/login");
          return;
        }
        const current = await authService.getCurrentProfile();
        if (!active) return;
        if (!current.isActive || current.approvalStatus !== "approved" || !current.role) {
          await authService.logout();
          router.replace("/login");
          return;
        }
        if (current.role !== role) {
          router.replace(`/dashboard/${current.role}`);
          return;
        }
        setAccount(current);
        setLocale(current.preferredLanguage);
        setSessionReady(true);
      } catch {
        if (active) {
          setSessionReady(false);
          router.replace("/login");
        }
      }
    };

    void protectRoute();
    let subscription: ReturnType<typeof authService.onAuthStateChange> | undefined;
    try {
      subscription = authService.onAuthStateChange((event, session) => {
        if (!active) return;
        if (event === "SIGNED_OUT" || !session) {
          setSessionReady(false);
          router.replace("/login");
        } else if (event === "USER_UPDATED") {
          void protectRoute();
        }
      });
    } catch {
      router.replace("/login");
    }
    return () => { active = false; subscription?.unsubscribe(); };
  }, [role, router, setLocale]);

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("ecoloop-theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  if (!sessionReady) {
    return <div className="grid min-h-screen place-items-center bg-[#F6F8FA] text-xs font-medium text-slate-500 dark:bg-slate-950 dark:text-slate-400">Loading workspace…</div>;
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-center justify-between px-5"><Link href="/"><Logo inverse={dark} /></Link><Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X className="size-5" /></Button></div>
      <div className="mx-4 mb-5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-900"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-400">{t("Current workspace")}</p><div className="mt-2 flex items-center gap-2.5"><span className="grid size-7 place-items-center rounded-lg bg-emerald-600 text-[9px] font-bold text-white">{profile.initials}</span><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{profile.organization}</p><p className="mt-0.5 text-[10px] text-slate-400">{t(roleLabels[role])}</p></div></div></div>
      <nav className="flex-1 space-y-1 px-3" aria-label={`${profile.shortRole} dashboard navigation`}>
        <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[.16em] text-slate-400">Workspace</p>
        {navigation[role].map((item) => {
          const exact = pathname === item.href;
          const active = exact || (item.href !== `/dashboard/${role}` && pathname.startsWith(`${item.href}/`));
          return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all", active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white")}><item.icon className="size-[17px]" /><span>{t(item.label)}</span>{active && <span className="ml-auto size-1.5 rounded-full bg-emerald-500" />}</Link>;
        })}
      </nav>
      <div className="m-4 rounded-2xl bg-slate-950 p-4 text-white dark:bg-emerald-950"><span className="grid size-8 place-items-center rounded-lg bg-white/10"><HelpCircle className="size-4 text-emerald-400" /></span><p className="mt-4 text-xs font-semibold">Need a hand?</p><p className="mt-1 text-[10px] leading-4 text-slate-400">Talk to EcoLoop support or view the help centre.</p><button disabled title="Coming Soon" className="mt-3 cursor-not-allowed text-[10px] font-semibold text-slate-500">Help centre · Coming Soon</button></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:block">{sidebar}</aside>
      <div className={cn("fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm transition-opacity lg:hidden", mobileOpen ? "opacity-100" : "pointer-events-none opacity-0")} onClick={() => setMobileOpen(false)} aria-hidden="true" />
      <aside className={cn("fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white shadow-2xl transition-transform dark:border-slate-800 dark:bg-slate-950 lg:hidden", mobileOpen ? "translate-x-0" : "-translate-x-full")}>{sidebar}</aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 sm:px-6 lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="size-5" /></Button>
          <div className="relative hidden max-w-sm flex-1 sm:block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input aria-label="Search dashboard" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search workspace pages…" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-xs outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-800 dark:bg-slate-900" />{search.trim() && <div className="absolute left-0 right-0 top-12 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900">{searchResults.length ? searchResults.map((item) => <Link key={item.href} href={item.href} onClick={() => setSearch("")} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"><item.icon className="size-3.5 text-emerald-600" />{item.label}</Link>) : <p className="px-3 py-4 text-center text-[10px] text-slate-400">No workspace page found.</p>}</div>}</div>
          <div className="ml-auto flex items-center gap-1.5">
            <LanguageSelector persistToProfile className="max-w-[8.5rem]" />
            <Button variant="ghost" size="icon" onClick={toggleDark} aria-label={dark ? "Use light mode" : "Use dark mode"}>{dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}</Button>
            <div className="relative">
              <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${notifications.unread ? `, ${notifications.unread} unread` : ""}`} aria-expanded={notificationOpen} onClick={() => { setNotificationOpen(!notificationOpen); setProfileOpen(false); }}><Bell className="size-[18px]" />{notifications.unread > 0 && <span className="absolute right-1.5 top-1 grid min-w-4 place-items-center rounded-full border-2 border-white bg-emerald-500 px-0.5 text-[8px] font-bold leading-3 text-white dark:border-slate-950">{notifications.unread}</span>}</Button>
              {notificationOpen && <div className="absolute right-0 top-12 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800"><div><p className="text-xs font-semibold">Notifications</p><p className="mt-1 text-[9px] text-slate-400">{notifications.unread} unread update{notifications.unread === 1 ? "" : "s"}</p></div><button type="button" disabled={!notifications.unread} onClick={() => notifications.markAllAsRead()} className="text-[9px] font-semibold text-emerald-600 disabled:text-slate-300">Mark all read</button></div><div className="max-h-80 overflow-y-auto">{notifications.loading ? <p className="animate-pulse px-4 py-8 text-center text-[10px] text-slate-400">Loading notifications…</p> : notifications.error ? <p className="bg-rose-50 px-4 py-4 text-[10px] text-rose-600">Notifications are temporarily unavailable.</p> : notifications.data?.length ? notifications.data.map((item) => <button type="button" key={item.id} onClick={() => notifications.markAsRead(item.id)} className="flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"><span className={`mt-1 size-2 shrink-0 rounded-full ${item.read ? "bg-slate-200 dark:bg-slate-700" : "bg-emerald-500"}`} /><span><span className="block text-xs font-semibold">{item.title}</span><span className="mt-1 block text-[10px] leading-4 text-slate-500">{item.message}</span><span className="mt-1.5 block text-[9px] text-slate-400">{item.time}</span></span></button>) : <p className="px-4 py-8 text-center text-[10px] text-slate-400">You’re all caught up.</p>}</div></div>}
            </div>
            <div className="relative ml-1">
              <button onClick={() => { setProfileOpen(!profileOpen); setNotificationOpen(false); }} className="flex items-center gap-2 rounded-xl p-1.5 pr-2 transition hover:bg-slate-50 dark:hover:bg-slate-900" aria-expanded={profileOpen}><span className="grid size-8 place-items-center rounded-lg bg-emerald-600 text-[10px] font-bold text-white">{profile.initials}</span><span className="hidden text-left md:block"><span className="block text-xs font-semibold text-slate-800 dark:text-white">{profile.name}</span><span className="block text-[9px] text-slate-400">{profile.shortRole}</span></span><ChevronDown className="hidden size-3.5 text-slate-400 md:block" /></button>
              {profileOpen && <div className="absolute right-0 top-12 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900"><div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800"><p className="text-xs font-semibold">{profile.name}</p><p className="mt-1 text-[10px] text-slate-400">{profile.organization}</p></div><button type="button" onClick={logout} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"><LogOut className="size-3.5" /> Log out</button></div>}
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
