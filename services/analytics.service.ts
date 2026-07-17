import { adminExtraMetrics, availableJobs, marketStatus, metrics, vendorRequests } from "@/data/dashboard";
import { stockProducts } from "@/data/smart-stock";
import type { DashboardRole } from "@/types/dashboard";
import type { DashboardAnalytics, MarketSummary, RecyclerPartner, SmartStockAnalytics } from "@/types/mvp";
import { serviceRequest } from "@/services/http.service";

const wasteTrend = [
  { month: "Feb", collected: 420, recycled: 280 }, { month: "Mar", collected: 510, recycled: 360 },
  { month: "Apr", collected: 460, recycled: 350 }, { month: "May", collected: 620, recycled: 470 },
  { month: "Jun", collected: 710, recycled: 520 }, { month: "Jul", collected: 850, recycled: 612 },
];

const wasteCategories = [
  { name: "Wet", value: 46, color: "#16A34A" }, { name: "Dry", value: 24, color: "#3B82F6" },
  { name: "Plastic", value: 18, color: "#8B5CF6" }, { name: "Metal", value: 12, color: "#F59E0B" },
];

const inventoryDemand = [
  { day: "Mon", inventory: 132, demand: 118 }, { day: "Tue", inventory: 148, demand: 126 },
  { day: "Wed", inventory: 139, demand: 122 }, { day: "Thu", inventory: 158, demand: 131 },
  { day: "Fri", inventory: 151, demand: 136 }, { day: "Sat", inventory: 172, demand: 154 },
  { day: "Sun", inventory: 145, demand: 118 },
];

const monthlyImpact = [
  { month: "Feb", waste: 94, prevented: 42, savings: 8200, accuracy: 84 },
  { month: "Mar", waste: 86, prevented: 58, savings: 10800, accuracy: 87 },
  { month: "Apr", waste: 72, prevented: 74, savings: 12600, accuracy: 89 },
  { month: "May", waste: 61, prevented: 96, savings: 14900, accuracy: 91 },
  { month: "Jun", waste: 54, prevented: 112, savings: 16800, accuracy: 93 },
  { month: "Jul", waste: 47, prevented: 138, savings: 18400, accuracy: 94 },
];

const markets: MarketSummary[] = marketStatus.concat([
  { market: "Singasandra Market", requests: 9, collected: "142 kg", rate: "67%", status: "Healthy" },
  { market: "Electronic City Market", requests: 14, collected: "218 kg", rate: "74%", status: "Healthy" },
]).map((item, index) => ({ ...item, ward: 187 + index, vendors: 42 - index * 3 }));

const partners: RecyclerPartner[] = [
  { name: "GreenCycle Pvt Ltd", category: "Wet, dry, plastic", trucks: 6, jobs: 128, rate: "98%" },
  { name: "ReForm India", category: "Plastic, packaging", trucks: 4, jobs: 84, rate: "96%" },
  { name: "EcoMetals Co.", category: "Metal, e-waste", trucks: 3, jobs: 61, rate: "94%" },
];

export const analyticsService = {
  getDashboard(role: DashboardRole) {
    return serviceRequest<DashboardAnalytics>(`/analytics/dashboard?role=${role}`, { method: "GET" }, () => ({ role, metrics: metrics[role], extraMetrics: role === "admin" ? adminExtraMetrics : [], wasteTrend, wasteCategories, recentRequests: vendorRequests, jobs: availableJobs, markets }));
  },
  getCharts() {
    return serviceRequest("/analytics/charts", { method: "GET" }, () => ({ wasteTrend, wasteCategories }));
  },
  getSmartStockAnalytics() {
    return serviceRequest<SmartStockAnalytics>("/analytics/smart-stock", { method: "GET" }, () => ({
      inventoryDemand,
      monthlyImpact,
      topWaste: stockProducts.filter((item) => item.stock > item.forecast).slice(0, 6).map((item) => ({ product: item.name, potential: item.stock - item.forecast })),
    }));
  },
  getMarkets() {
    return serviceRequest("/analytics/markets", { method: "GET" }, () => markets.map((item) => ({ ...item })));
  },
  getPartners() {
    return serviceRequest("/analytics/partners", { method: "GET" }, () => partners.map((item) => ({ ...item })));
  },
  generateReport(format: "PDF" | "CSV" | "dashboard") {
    return serviceRequest("/analytics/reports", { method: "POST", body: { format } }, () => ({ success: true as const, format, filename: `ecoloop-report-${new Date().toISOString().slice(0, 10)}.${format === "CSV" ? "csv" : "pdf"}` }));
  },
};
