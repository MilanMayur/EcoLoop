import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import type { DashboardRole } from "@/types/dashboard";

const roles: DashboardRole[] = ["vendor", "recycler", "admin"];

export default async function RoleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!roles.includes(role as DashboardRole)) notFound();
  return <DashboardShell role={role as DashboardRole}>{children}</DashboardShell>;
}
