import type { DashboardRole, Metric, StockProduct } from "@/types/dashboard";

export type ServiceErrorCode = "NETWORK" | "VALIDATION" | "NOT_FOUND" | "UNKNOWN";

export type FillLevel = "25%" | "50%" | "75%" | "100% (Full)" | "Overflowing";
export type PickupTimelineItem = { status: string; time: string; note?: string };

export type PickupRequest = {
  id: string;
  waste: string;
  fillLevel: FillLevel;
  /** Legacy overview display alias; contains the bin fill level, never an estimated weight. */
  weight?: string;
  actualWeight?: number;
  imageUrl?: string;
  completionImageUrl?: string;
  facility?: string;
  notes?: string;
  timeline?: PickupTimelineItem[];
  recycler: string;
  status: string;
  time: string;
  eta: string;
};

export type PickupJob = {
  id: string;
  vendor: string;
  location: string;
  waste: string;
  fillLevel: FillLevel;
  /** Legacy overview display alias; contains the bin fill level, never an estimated weight. */
  weight?: string;
  actualWeight?: number;
  imageUrl?: string;
  completionImageUrl?: string;
  facility?: string;
  notes?: string;
  createdTime: string;
  distance: string;
  priority: string;
  status?: "Available" | "Accepted" | "In transit" | "Completed";
};

export type PickupInput = {
  wasteType: string;
  fillLevel: FillLevel;
  priority: string;
  notes?: string;
  imageUrl?: string;
};

export type PickupCompletionInput = {
  actualWeight: number;
  facility: string;
  notes?: string;
  completionImageUrl?: string;
};

export type InventoryInput = Omit<StockProduct, "id" | "forecast" | "risk">;

export type WasteTrendPoint = { month: string; collected: number; recycled: number };
export type WasteCategoryPoint = { name: string; value: number; color: string };
export type InventoryDemandPoint = { day: string; inventory: number; demand: number };
export type StockImpactPoint = { month: string; waste: number; prevented: number; savings: number; accuracy: number };
export type TopWastePoint = { product: string; potential: number };

export type DashboardAnalytics = {
  role: DashboardRole;
  metrics: Metric[];
  extraMetrics: Array<{ label: string; value: string; icon: Metric["icon"] }>;
  wasteTrend: WasteTrendPoint[];
  wasteCategories: WasteCategoryPoint[];
  recentRequests: PickupRequest[];
  jobs: PickupJob[];
  markets: MarketSummary[];
};

export type SmartStockAnalytics = {
  inventoryDemand: InventoryDemandPoint[];
  monthlyImpact: StockImpactPoint[];
  topWaste: TopWastePoint[];
};

export type AppNotification = {
  id: string;
  role: DashboardRole;
  title: string;
  message: string;
  time: string;
  read: boolean;
};

export type MarketSummary = {
  market: string;
  requests: number;
  collected: string;
  rate: string;
  status: string;
  ward: number;
  vendors: number;
};

export type RecyclerPartner = {
  name: string;
  category: string;
  trucks: number;
  jobs: number;
  rate: string;
};

export type VehicleSummary = {
  id: string;
  driver: string;
  capacity: string;
  load: string;
  status: string;
};
