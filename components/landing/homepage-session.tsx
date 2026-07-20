"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ArrowRight, LayoutDashboard, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authService, type CurrentProfile } from "@/services/auth.service";
import type { DashboardRole } from "@/types/dashboard";

export type HomepageAccount = Pick<CurrentProfile, "email" | "name" | "organization" | "role">;

const HomepageAccountContext = createContext<HomepageAccount | null | undefined>(undefined);

export const isHomepageRole = (value: unknown): value is DashboardRole =>
  value === "vendor" || value === "recycler" || value === "driver" || value === "admin";

export const homepageAccountLinks = (role: DashboardRole) => ({
  dashboard: `/dashboard/${role}`,
  profile: role === "admin" ? "/dashboard/admin/settings" : `/dashboard/${role}/profile`,
});

export function HomepageSessionProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<HomepageAccount | null | undefined>(undefined);

  useEffect(() => {
    let active = true;

    const loadAccount = async () => {
      try {
        const session = await authService.getSession();
        if (!active) return;
        if (!session) {
          setAccount(null);
          return;
        }

        try {
          const profile = await authService.getCurrentProfile();
          if (active) setAccount({ name: profile.name, organization: profile.organization, email: profile.email, role: profile.role });
        } catch {
          if (!active) return;
          const metadata = session.user.user_metadata;
          setAccount({
            name: String(metadata?.full_name ?? session.user.email?.split("@")[0] ?? "Account"),
            organization: String(metadata?.organization_name ?? metadata?.company ?? ""),
            email: String(session.user.email ?? ""),
            role: isHomepageRole(metadata?.role) ? metadata.role : null,
          });
        }
      } catch {
        if (active) setAccount(null);
      }
    };

    void loadAccount();
    let subscription: ReturnType<typeof authService.onAuthStateChange> | undefined;
    try {
      subscription = authService.onAuthStateChange((_event, session) => {
        if (!active) return;
        if (!session) {
          setAccount(null);
          return;
        }
        window.setTimeout(() => void loadAccount(), 0);
      });
    } catch {
      window.setTimeout(() => {
        if (active) setAccount(null);
      }, 0);
    }

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  return <HomepageAccountContext.Provider value={account}>{children}</HomepageAccountContext.Provider>;
}

export function useHomepageAccount() {
  return useContext(HomepageAccountContext);
}

function LoadingActions() {
  return <div className="h-13 w-52 animate-pulse rounded-full bg-slate-200/70" aria-label="Loading account actions" />;
}

export function HomepageHeroActions() {
  const account = useHomepageAccount();
  if (account === undefined) return <LoadingActions />;

  if (account && isHomepageRole(account.role)) {
    return <Button asChild size="lg"><Link href={homepageAccountLinks(account.role).dashboard}><LayoutDashboard className="size-4" /> Explore dashboard</Link></Button>;
  }

  return (
    <>
      <Button asChild size="lg"><Link href="/signup">Get started <ArrowRight className="size-4" /></Link></Button>
      <Button asChild size="lg" variant="outline"><Link href="/dashboard/vendor"><span className="grid size-6 place-items-center rounded-full bg-slate-950 text-white"><PackageOpen className="size-3" /></span> Explore dashboard</Link></Button>
    </>
  );
}

export function HomepageContactActions() {
  const account = useHomepageAccount();
  if (account === undefined) return <LoadingActions />;

  if (account && isHomepageRole(account.role)) {
    return <Button asChild size="lg"><Link href={homepageAccountLinks(account.role).dashboard}><LayoutDashboard className="size-4" /> Explore dashboard</Link></Button>;
  }

  return (
    <>
      <Button asChild size="lg"><Link href="/signup">Get started <ArrowRight className="size-4" /></Link></Button>
      <Button asChild size="lg" variant="outline"><a href="mailto:hello@ecoloop.city">Request a demo</a></Button>
    </>
  );
}
