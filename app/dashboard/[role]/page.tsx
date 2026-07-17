import { notFound } from "next/navigation";
import { RoleOverview } from "@/components/dashboard/role-overview";
import type { DashboardRole } from "@/types/dashboard";

const roles: DashboardRole[] = ["vendor", "recycler", "admin"];

export default async function DashboardPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!roles.includes(role as DashboardRole)) notFound();
  return <RoleOverview role={role as DashboardRole} />;
}
