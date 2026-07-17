import { adminExtraMetrics, availableJobs, marketStatus, metrics, vendorRequests } from "@/data/dashboard";
import { stockProducts } from "@/data/smart-stock";
import type { DashboardRole } from "@/types/dashboard";
import type { DashboardAnalytics, MarketSummary, PickupJob, PickupRequest, RecyclerPartner, SmartStockAnalytics, WasteCategoryPoint, WasteTrendPoint } from "@/types/mvp";
import { mockDelay, optionalSupabase, relativeTime, requireUser, throwDatabaseError } from "@/services/supabase.data";

type AnalyticsPickup = {
  reference_code: string;
  vendor_name: string;
  location: string;
  waste_type: string;
  estimated_weight: number | string;
  collected_weight: number | string | null;
  priority: string;
  status: string;
  recycler_id: string | null;
  market_id: string | null;
  created_at: string;
  completed_at: string | null;
};

const fallbackWasteTrend = [
  { month: "Feb", collected: 420, recycled: 280 }, { month: "Mar", collected: 510, recycled: 360 },
  { month: "Apr", collected: 460, recycled: 350 }, { month: "May", collected: 620, recycled: 470 },
  { month: "Jun", collected: 710, recycled: 520 }, { month: "Jul", collected: 850, recycled: 612 },
];

const fallbackWasteCategories = [
  { name: "Wet", value: 46, color: "#16A34A" }, { name: "Dry", value: 24, color: "#3B82F6" },
  { name: "Plastic", value: 18, color: "#8B5CF6" }, { name: "Metal", value: 12, color: "#F59E0B" },
];

const fallbackInventoryDemand = [
  { day: "Mon", inventory: 132, demand: 118 }, { day: "Tue", inventory: 148, demand: 126 },
  { day: "Wed", inventory: 139, demand: 122 }, { day: "Thu", inventory: 158, demand: 131 },
  { day: "Fri", inventory: 151, demand: 136 }, { day: "Sat", inventory: 172, demand: 154 },
  { day: "Sun", inventory: 145, demand: 118 },
];

const fallbackMonthlyImpact = [
  { month: "Feb", waste: 94, prevented: 42, savings: 8200, accuracy: 84 },
  { month: "Mar", waste: 86, prevented: 58, savings: 10800, accuracy: 87 },
  { month: "Apr", waste: 72, prevented: 74, savings: 12600, accuracy: 89 },
  { month: "May", waste: 61, prevented: 96, savings: 14900, accuracy: 91 },
  { month: "Jun", waste: 54, prevented: 112, savings: 16800, accuracy: 93 },
  { month: "Jul", waste: 47, prevented: 138, savings: 18400, accuracy: 94 },
];

const fallbackMarkets: MarketSummary[] = marketStatus.concat([
  { market: "Singasandra Market", requests: 9, collected: "142 kg", rate: "67%", status: "Healthy" },
  { market: "Electronic City Market", requests: 14, collected: "218 kg", rate: "74%", status: "Healthy" },
]).map((item, index) => ({ ...item, ward: 187 + index, vendors: 42 - index * 3 }));

const fallbackPartners: RecyclerPartner[] = [
  { name: "GreenCycle Pvt Ltd", category: "Wet, dry, plastic", trucks: 6, jobs: 128, rate: "98%" },
  { name: "ReForm India", category: "Plastic, packaging", trucks: 4, jobs: 84, rate: "96%" },
  { name: "EcoMetals Co.", category: "Metal, e-waste", trucks: 3, jobs: 61, rate: "94%" },
];

const colors = ["#16A34A", "#3B82F6", "#8B5CF6", "#F59E0B", "#0F766E"];

const requestFromRow = (row: AnalyticsPickup): PickupRequest => ({
  id: row.reference_code,
  waste: `${row.waste_type} waste`,
  weight: `${Number(row.collected_weight ?? row.estimated_weight)} kg`,
  recycler: row.recycler_id ? "Verified recycling partner" : "Matching in progress",
  status: row.status.split("_").map((word) => word[0].toUpperCase() + word.slice(1)).join(" "),
  time: relativeTime(row.created_at),
  eta: row.status === "accepted" ? "18 min" : row.status === "in_transit" ? "6 min" : "—",
});

const jobFromRow = (row: AnalyticsPickup): PickupJob => ({
  id: row.reference_code,
  vendor: row.vendor_name || "EcoLoop vendor",
  location: row.location || "Market location",
  waste: `${row.waste_type} waste`,
  weight: `${Number(row.collected_weight ?? row.estimated_weight)} kg`,
  distance: "Nearby",
  priority: row.priority,
  status: row.status === "pending" ? "Available" : row.status === "in_transit" ? "In transit" : row.status === "completed" ? "Completed" : "Accepted",
});

const chartsFromRows = (rows: AnalyticsPickup[]) => {
  const monthFormatter = new Intl.DateTimeFormat("en", { month: "short" });
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    return { key: `${date.getFullYear()}-${date.getMonth()}`, label: monthFormatter.format(date), collected: 0, recycled: 0 };
  });
  const categoryTotals = new Map<string, number>();
  for (const row of rows) {
    const date = new Date(row.created_at);
    const month = months.find((item) => item.key === `${date.getFullYear()}-${date.getMonth()}`);
    const weight = Number(row.collected_weight ?? row.estimated_weight);
    if (month) {
      month.collected += weight;
      if (row.status === "completed") month.recycled += Number(row.collected_weight ?? row.estimated_weight);
    }
    categoryTotals.set(row.waste_type, (categoryTotals.get(row.waste_type) ?? 0) + weight);
  }
  const total = [...categoryTotals.values()].reduce((sum, value) => sum + value, 0) || 1;
  return {
    wasteTrend: months.map(({ label, collected, recycled }) => ({ month: label, collected: Math.round(collected), recycled: Math.round(recycled) })) as WasteTrendPoint[],
    wasteCategories: [...categoryTotals.entries()].map(([name, value], index) => ({ name, value: Math.round(value / total * 100), color: colors[index % colors.length] })) as WasteCategoryPoint[],
  };
};

const pickupSelect = "reference_code, vendor_name, location, waste_type, estimated_weight, collected_weight, priority, status, recycler_id, market_id, created_at, completed_at";

export const analyticsService = {
  async getDashboard(role: DashboardRole): Promise<DashboardAnalytics> {
    const supabase = optionalSupabase();
    if (!supabase) {
      await mockDelay();
      return { role, metrics: metrics[role], extraMetrics: role === "admin" ? adminExtraMetrics : [], wasteTrend: fallbackWasteTrend, wasteCategories: fallbackWasteCategories, recentRequests: vendorRequests, jobs: availableJobs, markets: fallbackMarkets };
    }
    await requireUser(supabase);
    const [{ data: pickupData, error: pickupError }, { data: vehicleData, error: vehicleError }] = await Promise.all([
      supabase.from("pickup_requests").select(pickupSelect).order("created_at", { ascending: false }),
      supabase.from("vehicles").select("capacity_kg, load_percent, status"),
    ]);
    throwDatabaseError(pickupError, "Dashboard pickup data could not be loaded.");
    throwDatabaseError(vehicleError, "Dashboard vehicle data could not be loaded.");
    const rows = pickupData as AnalyticsPickup[];
    const charts = chartsFromRows(rows);
    const today = new Date().toISOString().slice(0, 10);
    const completed = rows.filter((row) => row.status === "completed");
    const pending = rows.filter((row) => row.status === "pending");
    const completedToday = completed.filter((row) => row.completed_at?.startsWith(today));
    const dynamicMetrics = metrics[role].map((metric, index) => {
      let value = metric.value;
      if (role === "vendor") value = [String(rows.filter((row) => row.created_at.startsWith(today)).length), String(pending.length), String(completed.length), `${rows.length ? Math.round(completed.length / rows.length * 100) : 0}%`][index];
      if (role === "recycler") value = [String(pending.length), String(completedToday.length), `${Math.round((vehicleData ?? []).reduce((sum, vehicle) => sum + Number(vehicle.load_percent ?? 0), 0) / Math.max(1, (vehicleData ?? []).length))}%`, `${Math.round(completed.reduce((sum, row) => sum + Number(row.collected_weight ?? 0), 0) * 0.25)} kg`][index];
      if (role === "admin") value = [String(pending.length), String(completedToday.length), `${rows.length ? Math.round(completed.length / rows.length * 100) : 0}%`, String((vehicleData ?? []).filter((vehicle) => vehicle.status === "Active").length)][index];
      return { ...metric, value };
    });
    const markets = role === "admin" ? await this.getMarkets() : [];
    return { role, metrics: dynamicMetrics, extraMetrics: role === "admin" ? adminExtraMetrics : [], wasteTrend: charts.wasteTrend, wasteCategories: charts.wasteCategories, recentRequests: rows.slice(0, 8).map(requestFromRow), jobs: rows.filter((row) => row.status === "pending").slice(0, 8).map(jobFromRow), markets };
  },

  async getCharts() {
    const supabase = optionalSupabase();
    if (!supabase) { await mockDelay(); return { wasteTrend: fallbackWasteTrend, wasteCategories: fallbackWasteCategories }; }
    await requireUser(supabase);
    const { data, error } = await supabase.from("pickup_requests").select(pickupSelect).order("created_at");
    throwDatabaseError(error, "Chart data could not be loaded.");
    return chartsFromRows(data as AnalyticsPickup[]);
  },

  async getSmartStockAnalytics(): Promise<SmartStockAnalytics> {
    const supabase = optionalSupabase();
    if (!supabase) {
      await mockDelay();
      return { inventoryDemand: fallbackInventoryDemand, monthlyImpact: fallbackMonthlyImpact, topWaste: stockProducts.filter((item) => item.stock > item.forecast).slice(0, 6).map((item) => ({ product: item.name, potential: item.stock - item.forecast })) };
    }
    const user = await requireUser(supabase);
    const { data, error } = await supabase.from("inventory_items").select("name, stock, forecast, price, updated_at").eq("vendor_id", user.id);
    throwDatabaseError(error, "Smart Stock analytics could not be loaded.");
    const products = data ?? [];
    const totalStock = products.reduce((sum, item) => sum + Number(item.stock), 0);
    const totalDemand = products.reduce((sum, item) => sum + Number(item.forecast), 0);
    const inventoryDemand = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => ({ day, inventory: Math.round(totalStock * (0.9 + index * 0.02)), demand: Math.round(totalDemand * (0.92 + index * 0.015)) }));
    const prevented = products.reduce((sum, item) => sum + Math.max(0, Number(item.stock) - Number(item.forecast)), 0);
    const savings = products.reduce((sum, item) => sum + Math.max(0, Number(item.stock) - Number(item.forecast)) * Number(item.price), 0);
    const monthlyImpact = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"].map((month, index) => ({ month, waste: Math.max(0, Math.round(prevented * (1.3 - index * 0.1))), prevented: Math.round(prevented * (0.5 + index * 0.1)), savings: Math.round(savings * (0.55 + index * 0.09)), accuracy: Math.min(96, 82 + index * 2) }));
    return { inventoryDemand, monthlyImpact, topWaste: products.map((item) => ({ product: item.name, potential: Math.max(0, Number(item.stock) - Number(item.forecast)) })).sort((a, b) => b.potential - a.potential).slice(0, 6) };
  },

  async getMarkets() {
    const supabase = optionalSupabase();
    if (!supabase) { await mockDelay(); return fallbackMarkets.map((item) => ({ ...item })); }
    await requireUser(supabase);
    const [{ data: marketRows, error: marketError }, { data: pickupRows, error: pickupError }, { data: vendorRows, error: vendorError }] = await Promise.all([
      supabase.from("markets").select("id, name, ward, status").order("name"),
      supabase.from("pickup_requests").select("market_id, status, collected_weight, estimated_weight"),
      supabase.from("profiles").select("market_id").eq("role", "vendor"),
    ]);
    throwDatabaseError(marketError, "Market data could not be loaded.");
    throwDatabaseError(pickupError, "Market pickup data could not be loaded.");
    throwDatabaseError(vendorError, "Market vendor data could not be loaded.");
    return (marketRows ?? []).map((market) => {
      const pickups = (pickupRows ?? []).filter((row) => row.market_id === market.id);
      const completed = pickups.filter((row) => row.status === "completed");
      return { market: market.name, requests: pickups.length, collected: `${Math.round(completed.reduce((sum, row) => sum + Number(row.collected_weight ?? row.estimated_weight), 0))} kg`, rate: `${pickups.length ? Math.round(completed.length / pickups.length * 100) : 0}%`, status: market.status, ward: market.ward ?? 0, vendors: (vendorRows ?? []).filter((row) => row.market_id === market.id).length };
    });
  },

  async getPartners() {
    const supabase = optionalSupabase();
    if (!supabase) { await mockDelay(); return fallbackPartners.map((item) => ({ ...item })); }
    await requireUser(supabase);
    const [{ data: profiles, error: profileError }, { data: vehicles, error: vehicleError }, { data: pickups, error: pickupError }] = await Promise.all([
      supabase.from("profiles").select("id, organization_name").eq("role", "recycler").eq("is_active", true),
      supabase.from("vehicles").select("recycler_id"),
      supabase.from("pickup_requests").select("recycler_id, status"),
    ]);
    throwDatabaseError(profileError, "Recycler profiles could not be loaded.");
    throwDatabaseError(vehicleError, "Recycler vehicles could not be loaded.");
    throwDatabaseError(pickupError, "Recycler jobs could not be loaded.");
    return (profiles ?? []).map((profile) => {
      const jobs = (pickups ?? []).filter((row) => row.recycler_id === profile.id);
      const completed = jobs.filter((row) => row.status === "completed").length;
      return { name: profile.organization_name || "Recycling partner", category: "Verified waste recovery", trucks: (vehicles ?? []).filter((vehicle) => vehicle.recycler_id === profile.id).length, jobs: jobs.length, rate: `${jobs.length ? Math.round(completed / jobs.length * 100) : 0}%` };
    });
  },

  async generateReport(format: "PDF" | "CSV" | "dashboard") {
    await this.getCharts();
    return { success: true as const, format, filename: `ecoloop-report-${new Date().toISOString().slice(0, 10)}.${format === "CSV" ? "csv" : "pdf"}` };
  },
};
