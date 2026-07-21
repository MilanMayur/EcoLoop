import type { DashboardRole, Metric, StockProduct } from "@/types/dashboard";
import type { WasteType } from "@/lib/waste-taxonomy";

export type ServiceErrorCode =
  | "NETWORK"
  | "VALIDATION"
  | "NOT_FOUND"
  | "UNKNOWN";

export type FillLevel = "75%" | "100% (Full)" | "Overflowing";
export type PickupTimelineItem = {
  status: string;
  time: string;
  note?: string;
};

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
  assignedDriver?: string;
  assignedDriverId?: string;
  assignedVehicle?: string;
  assignmentTime?: string;
  estimatedArrival?: string;
  estimatedTravelMinutes?: number;
  routeStopOrder?: number;
  distanceKm?: number;
  vendorLatitude?: number;
  vendorLongitude?: number;
  cancellationReason?: string;
  cancelledByRole?: DashboardRole;
  cancelledAt?: string;
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
  status?:
    | "Batching"
    | "Assigned"
    | "Accepted"
    | "In transit"
    | "Arrived"
    | "Collected"
    | "Completed"
    | "Cancelled";
  assignedDriver?: string;
  assignedDriverId?: string;
  assignedVehicle?: string;
  assignmentTime?: string;
  estimatedArrival?: string;
  estimatedTravelMinutes?: number;
  routeStopOrder?: number;
  distanceKm?: number;
  vendorPhone?: string;
  vendorLatitude?: number;
  vendorLongitude?: number;
  cancellationReason?: string;
  cancelledByRole?: DashboardRole;
  cancelledAt?: string;
};

export type PickupInput = {
  wasteType: WasteType;
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

export type PickupCollectionInput = {
  actualWeight: number;
  notes?: string;
  collectionImageUrl?: string;
};

export type VehicleUnloadInput = {
  facility: string;
  notes?: string;
  imageUrl?: string;
};

export type VehicleUnload = {
  id: string;
  driverId: string;
  facility: string;
  totalWeightKg: number;
  createdAt: string;
};

export type InventoryInput = Omit<StockProduct, "id" | "forecast" | "risk">;

export type WasteTrendPoint = {
  month: string;
  collected: number;
  recycled: number;
};
export type WasteCategoryPoint = { name: string; value: number; color: string };
export type InventoryDemandPoint = {
  day: string;
  inventory: number;
  demand: number;
};
export type StockImpactPoint = {
  month: string;
  waste: number;
  prevented: number;
  savings: number;
  accuracy: number;
};
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

export type DriverStatus =
  | "Available"
  | "Assigned"
  | "On route"
  | "On break"
  | "Offline"
  | "Disabled"
  | "Maintenance";

export type Driver = {
  id: string;
  partnerId: string;
  userId?: string;
  name: string;
  email?: string;
  phone: string;
  vehicleNumber: string;
  vehicleType: string;
  capacityKg: number;
  currentLoadKg: number;
  reservedLoadKg: number;
  status: DriverStatus;
  latitude?: number;
  longitude?: number;
  isAvailable: boolean;
  compatibleWasteTypes: WasteType[];
  lastLocationAt?: string;
  breakReason?: string;
  breakNotes?: string;
  breakStartedAt?: string;
  breakExpectedEndAt?: string;
  createdAt: string;
};

export type DriverBreakInput = {
  reason: string;
  durationMinutes: number;
  notes?: string;
};

export type DriverLocation = {
  driverId: string;
  latitude: number;
  longitude: number;
  accuracyM?: number;
  speedMps?: number;
  headingDegrees?: number;
  recordedAt: string;
};

export type DriverInput = {
  name: string;
  email: string;
  phone: string;
  vehicleNumber: string;
  vehicleType: string;
  capacityKg: number;
  compatibleWasteTypes: WasteType[];
};

export type DriverPerformance = {
  driverId: string;
  name: string;
  totalAssignments: number;
  completedJobs: number;
  averageResponseMinutes?: number;
  averageCollectionMinutes?: number;
  completionRate: number;
  distanceCoveredKm: number;
  vehicleUtilization: number;
  wasteCollectedKg: number;
};

export type FleetOverview = {
  totalDrivers: number;
  availableDrivers: number;
  activeJobs: number;
  totalCapacityKg: number;
  currentLoadKg: number;
  reservedLoadKg: number;
  batchingWindowSeconds: number;
  operatingNow: boolean;
  operatingHoursLabel: string;
};
