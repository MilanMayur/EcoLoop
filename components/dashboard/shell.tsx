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
import { authService, type CurrentProfile } from "@/services/auth.service";
import { LanguageSelector } from "@/components/i18n/language-selector";
import { useLanguage } from "@/components/i18n/language-provider";
import { MobileBottomNavigation } from "@/components/dashboard/mobile-navigation";
import { AICopilot } from "@/components/ai/copilot";
import { DashboardProfileProvider } from "@/components/dashboard/profile-context";
import { DriverTrackingControl } from "@/components/dashboard/driver-tracking-control";
import { HelpCentreModal } from "@/components/dashboard/help-centre-modal";

export function DashboardShell({ role, children }: { role: DashboardRole; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setLocale, t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dark, setDark] = useState(false);
  const [account, setAccount] = useState<CurrentProfile | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const fallbackProfile = roleProfiles[role];
  const accountDisplayName = account
    ? role === "recycler"
      ? account.organization || account.name
      : account.name || account.organization
    : "";
  const profile = account ? {
    ...fallbackProfile,
    name: accountDisplayName || fallbackProfile.name,
    organization: account.organization || fallbackProfile.organization,
    initials: (accountDisplayName || fallbackProfile.name).split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
  } : fallbackProfile;
  const notifications = useNotifications(role);
  const searchResults = search.trim() ? navigation[role].filter((item) => item.label.toLowerCase().includes(search.trim().toLowerCase())) : [];
  const currentPage = [...navigation[role]]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || (item.href !== `/dashboard/${role}` && pathname.startsWith(`${item.href}/`)));
  const profileHref = navigation[role][navigation[role].length - 1].href;

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

  const closeMobileLayers = () => {
    setMobileOpen(false);
    setNotificationOpen(false);
    setProfileOpen(false);
  };

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
      <div className="flex h-16 shrink-0 items-center justify-between px-5 sm:h-20">
        <Link href="/" onClick={closeMobileLayers}><Logo inverse={dark} /></Link>
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X className="size-5" /></Button>
      </div>
      <div className="mx-4 mb-4 shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-400">{t("Current workspace")}</p>
        <div className="mt-2 flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-lg bg-emerald-600 text-[9px] font-bold text-white">{profile.initials}</span>
          <div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{profile.organization}</p><p className="mt-0.5 text-[10px] text-slate-400">{t(roleLabels[role])}</p></div>
        </div>
      </div>
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3" aria-label={`${profile.shortRole} dashboard navigation`}>
        <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[.16em] text-slate-400">Workspace</p>
        {navigation[role].map((item) => {
          const active = pathname === item.href || (item.href !== `/dashboard/${role}` && pathname.startsWith(`${item.href}/`));
          return (
            <Link key={item.href} href={item.href} onClick={closeMobileLayers} aria-current={active ? "page" : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all", active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white")}>
              <item.icon className="size-[17px]" /><span>{t(item.label)}</span>{active && <span className="ml-auto size-1.5 rounded-full bg-emerald-500" />}
            </Link>
          );
        })}
      </nav>
      <div className="m-4 mt-0 shrink-0 rounded-2xl bg-slate-950 p-4 text-white dark:bg-emerald-950">
        <span className="grid size-8 place-items-center rounded-lg bg-white/10"><HelpCircle className="size-4 text-emerald-400" /></span>
        <p className="mt-4 text-xs font-semibold">Need a hand?</p><p className="mt-1 text-[10px] leading-4 text-slate-400">Talk to EcoLoop support or view the help centre.</p>
        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            setHelpOpen(true);
          }}
          className="mt-3 min-h-10 rounded-lg text-[10px] font-semibold text-emerald-400 transition hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          {t("Open Help Centre")}
        </button>
      </div>
    </div>
  );

  return (
    <DashboardProfileProvider profile={account}>
    <div className="min-h-screen bg-[#F6F8FA] text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:block">{sidebar}</aside>
      <button type="button" aria-label="Close navigation" className={cn("fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm transition-opacity lg:hidden", mobileOpen ? "opacity-100" : "pointer-events-none opacity-0")} onClick={() => setMobileOpen(false)} />
      <aside className={cn("fixed inset-y-0 left-0 z-50 w-[min(18rem,calc(100vw-2rem))] border-r border-slate-200 bg-white shadow-2xl transition-transform dark:border-slate-800 dark:bg-slate-950 lg:hidden", mobileOpen ? "translate-x-0" : "-translate-x-full")}>{sidebar}</aside>

      {(notificationOpen || profileOpen) && <button type="button" aria-label="Close open panel" className="fixed inset-0 z-20 bg-slate-950/20 backdrop-blur-[1px] sm:hidden" onClick={() => { setNotificationOpen(false); setProfileOpen(false); }} />}

      <div className="lg:pl-64">
        <header className="pointer-events-auto sticky top-0 z-[70] isolate flex h-16 items-center gap-1 border-b border-slate-200/80 bg-white/90 px-2 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 sm:h-20 sm:gap-3 sm:px-6 lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="size-5" /></Button>
          <div className="flex min-w-0 flex-1 items-center gap-2 px-1 sm:hidden">
            <Link href="/" className="shrink-0" aria-label="EcoLoop home"><Logo iconOnly compact /></Link>
            <div className="min-w-0"><p className="truncate text-[10px] font-bold uppercase tracking-[.12em] text-emerald-600">EcoLoop</p><p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{t(currentPage?.label ?? roleLabels[role])}</p></div>
          </div>
          <div className="relative hidden max-w-sm flex-1 sm:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input aria-label="Search dashboard" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search workspace pages…" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-xs outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-800 dark:bg-slate-900" />
            {search.trim() && <div className="absolute left-0 right-0 top-12 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900">{searchResults.length ? searchResults.map((item) => <Link key={item.href} href={item.href} onClick={() => setSearch("")} className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"><item.icon className="size-3.5 text-emerald-600" />{item.label}</Link>) : <p className="px-3 py-4 text-center text-[10px] text-slate-400">No workspace page found.</p>}</div>}
          </div>

          <div className="ml-auto flex items-center gap-0.5 sm:gap-1.5">
            {role === "driver" && <DriverTrackingControl />}
            <LanguageSelector persistToProfile className="hidden max-w-[8.5rem] sm:inline-flex" />
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex" onClick={toggleDark} aria-label={dark ? "Use light mode" : "Use dark mode"}>{dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}</Button>

            <div className="relative">
              <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${notifications.unread ? `, ${notifications.unread} unread` : ""}`} aria-expanded={notificationOpen} onClick={() => { setNotificationOpen(!notificationOpen); setProfileOpen(false); }}>
                <Bell className="size-[18px]" />
                {notifications.unread > 0 && <span className="absolute right-1.5 top-1 grid min-w-4 place-items-center rounded-full border-2 border-white bg-emerald-500 px-0.5 text-[8px] font-bold leading-3 text-white dark:border-slate-950">{notifications.unread}</span>}
              </Button>
              {notificationOpen && (
                <div className="fixed inset-x-3 top-[calc(4rem+env(safe-area-inset-top))] z-[90] max-h-[calc(100dvh-5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-12 sm:w-[min(22rem,calc(100vw-2rem))] sm:shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                    <div><p className="text-xs font-semibold">Notifications</p><p className="mt-1 text-[9px] text-slate-400">{notifications.unread} unread update{notifications.unread === 1 ? "" : "s"}</p></div>
                    <div className="flex items-center gap-1"><button type="button" disabled={!notifications.unread} onClick={() => notifications.markAllAsRead()} className="min-h-11 px-2 text-[9px] font-semibold text-emerald-600 disabled:text-slate-300">Mark all read</button><Button type="button" variant="ghost" size="icon" className="sm:hidden" onClick={() => setNotificationOpen(false)} aria-label="Close notifications"><X className="size-4" /></Button></div>
                  </div>
                  <div className="max-h-[52dvh] overflow-y-auto sm:max-h-80">{notifications.loading ? <p className="animate-pulse px-4 py-8 text-center text-[10px] text-slate-400">Loading notifications…</p> : notifications.error ? <p className="bg-rose-50 px-4 py-4 text-[10px] text-rose-600">Notifications are temporarily unavailable.</p> : notifications.data?.length ? notifications.data.map((item) => <button type="button" key={item.id} onClick={() => notifications.markAsRead(item.id)} className="flex min-h-14 w-full gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"><span className={`mt-1 size-2 shrink-0 rounded-full ${item.read ? "bg-slate-200 dark:bg-slate-700" : "bg-emerald-500"}`} /><span><span className="block text-xs font-semibold">{item.title}</span><span className="mt-1 block text-[10px] leading-4 text-slate-500">{item.message}</span><span className="mt-1.5 block text-[9px] text-slate-400">{item.time}</span></span></button>) : <p className="px-4 py-8 text-center text-[10px] text-slate-400">You’re all caught up.</p>}</div>
                </div>
              )}
            </div>

            <LanguageSelector compact persistToProfile className="border-0 bg-transparent shadow-none sm:hidden" />

            <div className="relative">
              <button type="button" onClick={() => { setProfileOpen(!profileOpen); setNotificationOpen(false); }} className="flex size-11 items-center justify-center rounded-xl transition hover:bg-slate-50 dark:hover:bg-slate-900 sm:w-auto sm:gap-2 sm:p-1.5 sm:pr-2" aria-label="Open profile menu" aria-expanded={profileOpen}>
                <span className="grid size-8 place-items-center rounded-lg bg-emerald-600 text-[10px] font-bold text-white">{profile.initials}</span>
                <span className="hidden text-left md:block"><span className="block text-xs font-semibold text-slate-800 dark:text-white">{profile.name}</span><span className="block text-[9px] text-slate-400">{profile.shortRole}</span></span><ChevronDown className="hidden size-3.5 text-slate-400 md:block" />
              </button>
              {profileOpen && (
                <div className="fixed inset-x-3 top-[calc(4rem+env(safe-area-inset-top))] z-[90] rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-12 sm:w-64 sm:shadow-xl">
                  <div className="flex items-center gap-3 border-b border-slate-100 px-3 py-3 dark:border-slate-800"><span className="grid size-10 place-items-center rounded-xl bg-emerald-600 text-xs font-bold text-white">{profile.initials}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{profile.name}</p><p className="mt-1 truncate text-[10px] text-slate-400">{profile.organization}</p></div><Button type="button" variant="ghost" size="icon" className="sm:hidden" onClick={() => setProfileOpen(false)} aria-label="Close profile menu"><X className="size-4" /></Button></div>
                  <Link href={profileHref} onClick={closeMobileLayers} className="mt-1 flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">View profile and settings</Link>
                  <button type="button" onClick={toggleDark} className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 sm:hidden">{dark ? <Sun className="size-4" /> : <Moon className="size-4" />}{dark ? "Use light mode" : "Use dark mode"}</button>
                  <button type="button" onClick={logout} className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"><LogOut className="size-3.5" /> Log out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-3 pb-24 pt-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      <MobileBottomNavigation role={role} onNavigate={closeMobileLayers} />
      <AICopilot role={role} />
      <HelpCentreModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
    </DashboardProfileProvider>
  );
}
