import type { LucideIcon } from "lucide-react";

export type DashboardRole = "vendor" | "recycler" | "admin";
export type NavItem = { label: string; href: string; icon: LucideIcon };
export type Metric = { label: string; value: string; change: string; tone?: "green" | "blue" | "amber" | "violet"; icon: LucideIcon };
export type RoleProfile = { role: DashboardRole; name: string; organization: string; shortRole: string; initials: string };
export type Status = "Pending" | "Assigned" | "In transit" | "Completed" | "Available" | "Accepted" | "Active" | "Delayed";

export type StockRisk = "Low" | "Medium" | "High";
export type StockProduct = {
  id: string;
  name: string;
  stock: number;
  unit: "kg" | "crate";
  expiry: string;
  price: number;
  forecast: number;
  risk: StockRisk;
};
