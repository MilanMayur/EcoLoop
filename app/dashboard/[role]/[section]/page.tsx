import { notFound } from "next/navigation";
import { RoleSection } from "@/components/dashboard/role-section";
import type { DashboardRole } from "@/types/dashboard";

const roles: DashboardRole[] = ["vendor", "recycler", "driver", "admin"];

export default async function DashboardSectionPage({ params }: { params: Promise<{ role: string; section: string }> }) {
  const { role, section } = await params;
  if (!roles.includes(role as DashboardRole)) notFound();
  return <RoleSection role={role as DashboardRole} section={section} />;
}
