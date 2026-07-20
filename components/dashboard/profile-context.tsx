"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CurrentProfile } from "@/services/auth.service";

const DashboardProfileContext = createContext<CurrentProfile | null>(null);

export function DashboardProfileProvider({ profile, children }: { profile: CurrentProfile | null; children: ReactNode }) {
  return <DashboardProfileContext.Provider value={profile}>{children}</DashboardProfileContext.Provider>;
}

export function useDashboardProfile() {
  return useContext(DashboardProfileContext);
}
