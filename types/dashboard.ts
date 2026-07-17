import type { LucideIcon } from "lucide-react";

export type DashboardRole = "vendor" | "recycler" | "admin";
export type NavItem = { label: string; href: string; icon: LucideIcon };
export type Metric = { label: string; value: string; change: string; tone?: "green" | "blue" | "amber" | "violet"; icon: LucideIcon };
export type RoleProfile = { role: DashboardRole; name: string; organization: string; shortRole: string; initials: string };
export type Status = "Pending" | "Assigned" | "In transit" | "Completed" | "Available" | "Accepted" | "Active" | "Delayed";
