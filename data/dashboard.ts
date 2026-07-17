import {
  BarChart3, Building2, CircleUserRound, ClipboardList, FileBarChart, History,
  LayoutDashboard, MapPinned, Recycle, Settings, Store, Truck, UsersRound,
  Warehouse, Waypoints,
} from "lucide-react";
import type { DashboardRole, Metric, NavItem, RoleProfile } from "@/types/dashboard";

export const roleProfiles: Record<DashboardRole, RoleProfile> = {
  vendor: { role: "vendor", name: "Anita Rao", organization: "Fresh Veg Stall 18", shortRole: "Vendor", initials: "AR" },
  recycler: { role: "recycler", name: "Rohan Mehta", organization: "GreenCycle Pvt Ltd", shortRole: "Recycling Partner", initials: "RM" },
  admin: { role: "admin", name: "Priya Nair", organization: "BBMP · Bommanahalli Zone", shortRole: "BBMP Officer", initials: "PN" },
};

export const roleLabels: Record<DashboardRole, string> = {
  vendor: "Vendor workspace",
  recycler: "Recycler workspace",
  admin: "BBMP operations",
};

export const navigation: Record<DashboardRole, NavItem[]> = {
  vendor: [
    { label: "Dashboard", href: "/dashboard/vendor", icon: LayoutDashboard },
    { label: "Request pickup", href: "/dashboard/vendor/request-pickup", icon: Truck },
    { label: "My requests", href: "/dashboard/vendor/requests", icon: ClipboardList },
    { label: "History", href: "/dashboard/vendor/history", icon: History },
    { label: "Analytics", href: "/dashboard/vendor/analytics", icon: BarChart3 },
    { label: "Profile", href: "/dashboard/vendor/profile", icon: CircleUserRound },
  ],
  recycler: [
    { label: "Dashboard", href: "/dashboard/recycler", icon: LayoutDashboard },
    { label: "Available jobs", href: "/dashboard/recycler/jobs", icon: MapPinned },
    { label: "Accepted jobs", href: "/dashboard/recycler/accepted", icon: ClipboardList },
    { label: "History", href: "/dashboard/recycler/history", icon: History },
    { label: "Vehicles", href: "/dashboard/recycler/vehicles", icon: Truck },
    { label: "Analytics", href: "/dashboard/recycler/analytics", icon: BarChart3 },
    { label: "Profile", href: "/dashboard/recycler/profile", icon: CircleUserRound },
  ],
  admin: [
    { label: "Overview", href: "/dashboard/admin", icon: LayoutDashboard },
    { label: "Markets", href: "/dashboard/admin/markets", icon: Store },
    { label: "Pickup requests", href: "/dashboard/admin/requests", icon: ClipboardList },
    { label: "Recycling partners", href: "/dashboard/admin/partners", icon: Recycle },
    { label: "Analytics", href: "/dashboard/admin/analytics", icon: BarChart3 },
    { label: "Reports", href: "/dashboard/admin/reports", icon: FileBarChart },
    { label: "Settings", href: "/dashboard/admin/settings", icon: Settings },
  ],
};

export const metrics: Record<DashboardRole, Metric[]> = {
  vendor: [
    { label: "Today's requests", value: "4", change: "+1 from yesterday", icon: ClipboardList },
    { label: "Pending pickups", value: "2", change: "Next ETA 11:40 AM", tone: "amber", icon: Truck },
    { label: "Completed pickups", value: "58", change: "+12% this month", tone: "blue", icon: Recycle },
    { label: "Recycling score", value: "92%", change: "Top 8% in market", tone: "violet", icon: BarChart3 },
  ],
  recycler: [
    { label: "Available pickups", value: "12", change: "4 within 3 km", icon: MapPinned },
    { label: "Today's collections", value: "7", change: "3 remaining", tone: "blue", icon: ClipboardList },
    { label: "Vehicle capacity", value: "68%", change: "1.2 t available", tone: "amber", icon: Truck },
    { label: "Carbon saved", value: "210 kg", change: "+18% this week", tone: "violet", icon: Recycle },
  ],
  admin: [
    { label: "Pending requests", value: "12", change: "−8% vs yesterday", tone: "amber", icon: ClipboardList },
    { label: "Completed today", value: "58", change: "98% on schedule", tone: "blue", icon: Truck },
    { label: "Recycling rate", value: "72%", change: "+4.2% this month", icon: Recycle },
    { label: "Active trucks", value: "18", change: "Across 6 markets", tone: "violet", icon: Waypoints },
  ],
};

export const vendorRequests = [
  { id: "ECO-2048", waste: "Wet waste", weight: "42 kg", recycler: "GreenCycle Pvt Ltd", status: "Assigned", time: "Today, 11:30 AM", eta: "18 min" },
  { id: "ECO-2041", waste: "Plastic", weight: "18 kg", recycler: "ReForm India", status: "In transit", time: "Today, 9:45 AM", eta: "6 min" },
  { id: "ECO-2029", waste: "Dry waste", weight: "35 kg", recycler: "GreenCycle Pvt Ltd", status: "Completed", time: "Yesterday, 4:20 PM", eta: "—" },
  { id: "ECO-2018", waste: "Metal", weight: "12 kg", recycler: "EcoMetals Co.", status: "Completed", time: "16 Jul, 2:10 PM", eta: "—" },
];

export const availableJobs = [
  { id: "ECO-2054", vendor: "Lakshmi Flower Mart", location: "Chandapura Market · Gate 2", waste: "Wet waste", weight: "64 kg", distance: "1.2 km", priority: "High" },
  { id: "ECO-2051", vendor: "Fresh Veg Stall 18", location: "Chandapura Market · Block C", waste: "Plastic", weight: "28 kg", distance: "2.4 km", priority: "Normal" },
  { id: "ECO-2049", vendor: "Sri Ganesh Stores", location: "Bommanahalli Market", waste: "Dry waste", weight: "51 kg", distance: "3.8 km", priority: "Normal" },
];

export const marketStatus = [
  { market: "Chandapura Market", requests: 24, collected: "438 kg", rate: "78%", status: "Healthy" },
  { market: "Bommanahalli Market", requests: 18, collected: "312 kg", rate: "71%", status: "Healthy" },
  { market: "Madiwala Market", requests: 16, collected: "264 kg", rate: "64%", status: "Attention" },
  { market: "Begur Market", requests: 11, collected: "186 kg", rate: "69%", status: "Healthy" },
];

export const monthlyWaste = [
  { month: "Feb", collected: 420, recycled: 280 }, { month: "Mar", collected: 510, recycled: 360 },
  { month: "Apr", collected: 460, recycled: 350 }, { month: "May", collected: 620, recycled: 470 },
  { month: "Jun", collected: 710, recycled: 520 }, { month: "Jul", collected: 850, recycled: 612 },
];

export const wasteCategories = [
  { name: "Wet", value: 46, color: "#16A34A" }, { name: "Dry", value: 24, color: "#3B82F6" },
  { name: "Plastic", value: 18, color: "#8B5CF6" }, { name: "Metal", value: 12, color: "#F59E0B" },
];

export const adminExtraMetrics = [
  { label: "Total waste today", value: "850 kg", icon: Warehouse },
  { label: "Landfill reduction", value: "38%", icon: Recycle },
  { label: "Active vendors", value: "186", icon: UsersRound },
  { label: "Markets online", value: "6 / 6", icon: Building2 },
];
