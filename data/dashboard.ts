import {
  BarChart3,
  Building2,
  CircleUserRound,
  ClipboardList,
  FileBarChart,
  History,
  LayoutDashboard,
  LifeBuoy,
  MapPinned,
  Navigation,
  PackageOpen,
  Recycle,
  Settings,
  Store,
  Truck,
  UserRoundCog,
  UsersRound,
  Warehouse,
  Waypoints,
} from "lucide-react";
import type {
  DashboardRole,
  Metric,
  NavItem,
  RoleProfile,
} from "@/types/dashboard";

export const roleProfiles: Record<DashboardRole, RoleProfile> = {
  vendor: {
    role: "vendor",
    name: "Vendor account",
    organization: "EcoLoop",
    shortRole: "Vendor",
    initials: "VA",
  },
  recycler: {
    role: "recycler",
    name: "Recycler account",
    organization: "EcoLoop",
    shortRole: "Recycling Partner",
    initials: "RA",
  },
  driver: {
    role: "driver",
    name: "Driver account",
    organization: "EcoLoop fleet",
    shortRole: "Driver",
    initials: "DA",
  },
  admin: {
    role: "admin",
    name: "BBMP account",
    organization: "EcoLoop",
    shortRole: "BBMP Officer",
    initials: "BA",
  },
};

export const roleLabels: Record<DashboardRole, string> = {
  vendor: "Vendor workspace",
  recycler: "Recycler workspace",
  driver: "Driver route",
  admin: "BBMP operations",
};

export const navigation: Record<DashboardRole, NavItem[]> = {
  vendor: [
    { label: "Dashboard", href: "/dashboard/vendor", icon: LayoutDashboard },
    {
      label: "Smart Stock",
      href: "/dashboard/vendor/smart-stock",
      icon: PackageOpen,
    },
    {
      label: "Request pickup",
      href: "/dashboard/vendor/request-pickup",
      icon: Truck,
    },
    {
      label: "My requests",
      href: "/dashboard/vendor/requests",
      icon: ClipboardList,
    },
    { label: "History", href: "/dashboard/vendor/history", icon: History },
    {
      label: "Analytics",
      href: "/dashboard/vendor/analytics",
      icon: BarChart3,
    },
    {
      label: "Profile",
      href: "/dashboard/vendor/profile",
      icon: CircleUserRound,
    },
  ],
  recycler: [
    { label: "Dashboard", href: "/dashboard/recycler", icon: LayoutDashboard },
    {
      label: "Assignment queue",
      href: "/dashboard/recycler/jobs",
      icon: MapPinned,
    },
    {
      label: "Assigned jobs",
      href: "/dashboard/recycler/accepted",
      icon: ClipboardList,
    },
    {
      label: "Drivers",
      href: "/dashboard/recycler/drivers",
      icon: UserRoundCog,
    },
    { label: "History", href: "/dashboard/recycler/history", icon: History },
    {
      label: "Fleet overview",
      href: "/dashboard/recycler/vehicles",
      icon: Truck,
    },
    {
      label: "Analytics",
      href: "/dashboard/recycler/analytics",
      icon: BarChart3,
    },
    {
      label: "Profile",
      href: "/dashboard/recycler/profile",
      icon: CircleUserRound,
    },
  ],
  driver: [
    { label: "Dashboard", href: "/dashboard/driver", icon: LayoutDashboard },
    {
      label: "Today's jobs",
      href: "/dashboard/driver/jobs",
      icon: ClipboardList,
    },
    {
      label: "Current route",
      href: "/dashboard/driver/route",
      icon: Navigation,
    },
    {
      label: "Completed jobs",
      href: "/dashboard/driver/history",
      icon: History,
    },
    {
      label: "Profile",
      href: "/dashboard/driver/profile",
      icon: CircleUserRound,
    },
  ],
  admin: [
    { label: "Overview", href: "/dashboard/admin", icon: LayoutDashboard },
    { label: "Markets", href: "/dashboard/admin/markets", icon: Store },
    {
      label: "Pickup requests",
      href: "/dashboard/admin/requests",
      icon: ClipboardList,
    },
    {
      label: "Recycling partners",
      href: "/dashboard/admin/partners",
      icon: Recycle,
    },
    { label: "Analytics", href: "/dashboard/admin/analytics", icon: BarChart3 },
    { label: "Reports", href: "/dashboard/admin/reports", icon: FileBarChart },
    { label: "Support requests", href: "/dashboard/admin/support", icon: LifeBuoy },
    { label: "Settings", href: "/dashboard/admin/settings", icon: Settings },
  ],
};

export const metrics: Record<DashboardRole, Metric[]> = {
  vendor: [
    {
      label: "Today's requests",
      value: "0",
      change: "No data yet",
      icon: ClipboardList,
    },
    {
      label: "Pending pickups",
      value: "0",
      change: "No data yet",
      tone: "amber",
      icon: Truck,
    },
    {
      label: "Completed pickups",
      value: "0",
      change: "No data yet",
      tone: "blue",
      icon: Recycle,
    },
    {
      label: "Recycling score",
      value: "0%",
      change: "No measured data yet",
      tone: "violet",
      icon: BarChart3,
    },
  ],
  recycler: [
    {
      label: "Active assignments",
      value: "0",
      change: "No data yet",
      icon: MapPinned,
    },
    {
      label: "Today's collections",
      value: "0",
      change: "No data yet",
      tone: "blue",
      icon: ClipboardList,
    },
    {
      label: "Fleet utilization",
      value: "0%",
      change: "No driver data yet",
      tone: "amber",
      icon: Truck,
    },
    {
      label: "Carbon saved",
      value: "0 kg",
      change: "No measured data yet",
      tone: "violet",
      icon: Recycle,
    },
  ],
  driver: [
    {
      label: "Today's jobs",
      value: "0",
      change: "No assignments yet",
      icon: ClipboardList,
    },
    {
      label: "Current stop",
      value: "—",
      change: "No active route",
      tone: "blue",
      icon: Navigation,
    },
    {
      label: "Completed today",
      value: "0",
      change: "No completed pickups",
      tone: "green",
      icon: Recycle,
    },
    {
      label: "Vehicle load",
      value: "0%",
      change: "Vehicle ready",
      tone: "amber",
      icon: Truck,
    },
  ],
  admin: [
    {
      label: "Pending requests",
      value: "0",
      change: "No data yet",
      tone: "amber",
      icon: ClipboardList,
    },
    {
      label: "Completed today",
      value: "0",
      change: "No data yet",
      tone: "blue",
      icon: Truck,
    },
    {
      label: "Recycling rate",
      value: "0%",
      change: "No measured data yet",
      icon: Recycle,
    },
    {
      label: "Active trucks",
      value: "0",
      change: "No vehicle data yet",
      tone: "violet",
      icon: Waypoints,
    },
  ],
};

export const adminExtraMetrics = [
  { label: "Total waste today", value: "0 kg", icon: Warehouse },
  { label: "Landfill reduction", value: "0%", icon: Recycle },
  { label: "Active vendors", value: "0", icon: UsersRound },
  { label: "Markets online", value: "0 / 0", icon: Building2 },
];
