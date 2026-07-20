import { adminExtraMetrics, metrics } from "@/data/dashboard";
import { stockProducts } from "@/data/smart-stock";
import type { DashboardRole } from "@/types/dashboard";
import type {
  DashboardAnalytics,
  PickupJob,
  PickupRequest,
  SmartStockAnalytics,
  WasteCategoryPoint,
  WasteTrendPoint,
} from "@/types/mvp";
import {
  mockDelay,
  optionalSupabase,
  relativeTime,
  requireUser,
  throwDatabaseError,
} from "@/services/supabase.data";
import { ServiceError } from "@/services/service-error";

type AnalyticsPickup = {
  id: string;
  reference_code: string;
  vendor_name: string;
  location: string;
  waste_type: string;
  fill_level: PickupRequest["fillLevel"];
  actual_weight: number | string | null;
  image_url: string | null;
  completion_image_url: string | null;
  facility: string | null;
  notes: string | null;
  priority: string;
  status: string;
  recycler_id: string | null;
  market_id: string | null;
  created_at: string;
  completed_at: string | null;
  assigned_driver_id: string | null;
  assigned_vehicle: string | null;
  estimated_arrival: string | null;
  route_stop_order: number | null;
};

type RecoveryRow = {
  pickup_id: string;
  recovered_weight: number | string;
};

const fallbackInventoryDemand = [
  { day: "Mon", inventory: 132, demand: 118 },
  { day: "Tue", inventory: 148, demand: 126 },
  { day: "Wed", inventory: 139, demand: 122 },
  { day: "Thu", inventory: 158, demand: 131 },
  { day: "Fri", inventory: 151, demand: 136 },
  { day: "Sat", inventory: 172, demand: 154 },
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

const colors = ["#16A34A", "#3B82F6", "#8B5CF6", "#F59E0B", "#0F766E"];

const requestFromRow = (row: AnalyticsPickup): PickupRequest => ({
  id: row.reference_code,
  waste: `${row.waste_type} waste`,
  fillLevel: row.fill_level,
  weight: row.fill_level,
  actualWeight:
    row.actual_weight === null ? undefined : Number(row.actual_weight),
  imageUrl: row.image_url ?? undefined,
  completionImageUrl: row.completion_image_url ?? undefined,
  facility: row.facility ?? undefined,
  notes: row.notes ?? undefined,
  recycler: row.recycler_id
    ? "Verified recycling partner"
    : "Matching in progress",
  status: row.status
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" "),
  time: relativeTime(row.created_at),
  eta:
    row.status === "accepted"
      ? "18 min"
      : row.status === "in_transit"
        ? "6 min"
        : "—",
});

const jobFromRow = (row: AnalyticsPickup): PickupJob => ({
  id: row.reference_code,
  vendor: row.vendor_name || "EcoLoop vendor",
  location: row.location || "Market location",
  waste: `${row.waste_type} waste`,
  fillLevel: row.fill_level,
  weight: row.fill_level,
  actualWeight:
    row.actual_weight === null ? undefined : Number(row.actual_weight),
  imageUrl: row.image_url ?? undefined,
  completionImageUrl: row.completion_image_url ?? undefined,
  facility: row.facility ?? undefined,
  notes: row.notes ?? undefined,
  createdTime: relativeTime(row.created_at),
  distance: "Nearby",
  priority: row.priority,
  status: (
    {
      pending: "Batching",
      assigned: "Assigned",
      accepted: "Accepted",
      in_transit: "In transit",
      arrived: "Arrived",
      collected: "Collected",
      completed: "Completed",
    } as Record<string, PickupJob["status"]>
  )[row.status],
  assignedVehicle: row.assigned_vehicle ?? undefined,
  estimatedArrival: row.estimated_arrival ?? undefined,
  routeStopOrder: row.route_stop_order ?? undefined,
});

const chartsFromRows = (rows: AnalyticsPickup[]) => {
  const monthFormatter = new Intl.DateTimeFormat("en", { month: "short" });
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: monthFormatter.format(date),
      collected: 0,
      recycled: 0,
    };
  });
  const categoryTotals = new Map<string, number>();
  for (const row of rows) {
    if (row.status !== "completed") continue;
    const weight = Number(row.actual_weight ?? 0);
    if (!Number.isFinite(weight) || weight <= 0) continue;
    const date = new Date(row.completed_at ?? row.created_at);
    const month = months.find(
      (item) => item.key === `${date.getFullYear()}-${date.getMonth()}`,
    );
    if (month) {
      month.collected += weight;
      month.recycled += weight;
    }
    categoryTotals.set(
      row.waste_type,
      (categoryTotals.get(row.waste_type) ?? 0) + weight,
    );
  }
  const total =
    [...categoryTotals.values()].reduce((sum, value) => sum + value, 0) || 1;
  return {
    wasteTrend: months.map(({ label, collected, recycled }) => ({
      month: label,
      collected: Math.round(collected),
      recycled: Math.round(recycled),
    })) as WasteTrendPoint[],
    wasteCategories: [...categoryTotals.entries()].map(
      ([name, value], index) => ({
        name,
        value: Math.round((value / total) * 100),
        color: colors[index % colors.length],
      }),
    ) as WasteCategoryPoint[],
  };
};

const pickupSelect =
  "id, reference_code, vendor_name, location, waste_type, fill_level, actual_weight, image_url, completion_image_url, facility, notes, priority, status, recycler_id, market_id, created_at, completed_at, assigned_driver_id, assigned_vehicle, estimated_arrival, route_stop_order";

type ReportFormat = "PDF" | "CSV" | "dashboard";

const reportSlug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "ecoloop-report";
const csvCell = (value: string | number) =>
  `"${String(value).replace(/"/g, '""')}"`;
const pdfText = (value: string | number) =>
  String(value)
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/([\\()])/g, "\\$1");

const createPdf = (lines: string[]) => {
  const content = lines
    .slice(0, 31)
    .map((line, index) => {
      const fontSize = index === 0 ? 18 : index === 1 ? 10 : 11;
      const y = 744 - index * 22;
      return `BT /F1 ${fontSize} Tf 48 ${y} Td (${pdfText(line)}) Tj ET`;
    })
    .join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([body], { type: "application/pdf" });
};

export const analyticsService = {
  async getDashboard(role: DashboardRole): Promise<DashboardAnalytics> {
    const supabase = optionalSupabase();
    if (!supabase) {
      throw new ServiceError(
        "Supabase is not configured. Dashboard data cannot be loaded.",
        503,
      );
    }
    await requireUser(supabase);
    const [
      { data: pickupData, error: pickupError },
      { data: recoveryData, error: recoveryError },
      { data: driverData, error: driverError },
    ] = await Promise.all([
      supabase
        .from("pickup_requests")
        .select(pickupSelect)
        .order("created_at", { ascending: false }),
      supabase.from("waste_recoveries").select("pickup_id, recovered_weight"),
      supabase
        .from("drivers")
        .select("capacity_kg, current_load, status, is_available"),
    ]);
    throwDatabaseError(
      pickupError,
      "Dashboard pickup data could not be loaded.",
    );
    throwDatabaseError(
      recoveryError,
      "Waste recovery data could not be loaded.",
    );
    throwDatabaseError(driverError, "Driver activity could not be loaded.");
    const rows = pickupData as AnalyticsPickup[];
    const charts = chartsFromRows(rows);
    const today = new Date().toISOString().slice(0, 10);
    const completed = rows.filter((row) => row.status === "completed");
    const pending = rows.filter((row) => row.status === "pending");
    const completedToday = completed.filter((row) =>
      row.completed_at?.startsWith(today),
    );
    const active = rows.filter((row) =>
      ["assigned", "accepted", "in_transit", "arrived", "collected"].includes(
        row.status,
      ),
    );
    const totalActualWeight = completed.reduce(
      (sum, row) => sum + Number(row.actual_weight ?? 0),
      0,
    );
    const recoveredByPickup = new Map(
      (recoveryData as RecoveryRow[]).map((row) => [
        row.pickup_id,
        Number(row.recovered_weight),
      ]),
    );
    const totalRecoveredWeight = completed.reduce(
      (sum, row) => sum + (recoveredByPickup.get(row.id) ?? 0),
      0,
    );
    const recyclingRate =
      totalActualWeight > 0
        ? Math.min(
            100,
            Math.round((totalRecoveredWeight / totalActualWeight) * 100),
          )
        : 0;
    const metricChanges =
      role === "admin"
        ? [
            "Awaiting assignment",
            "Recorded today",
            "Based on measured weight",
            "Currently active",
          ]
        : role === "recycler"
          ? [
              "Across assigned drivers",
              "Recorded today",
              "Based on assigned capacity",
              "Based on measured weight",
            ]
          : role === "driver"
            ? [
                "Assigned to your route",
                "Next route position",
                "Recorded today",
                "Current assigned load",
              ]
            : [
                "Created today",
                "Awaiting collection",
                "All completed pickups",
                "Based on measured weight",
              ];
    const dynamicMetrics = metrics[role].map((metric, index) => {
      let value = metric.value;
      if (role === "vendor")
        value = [
          String(rows.filter((row) => row.created_at.startsWith(today)).length),
          String(pending.length),
          String(completed.length),
          `${recyclingRate}%`,
        ][index];
      if (role === "recycler") {
        const fleetCapacity = (driverData ?? []).reduce(
          (sum, driver) => sum + Number(driver.capacity_kg ?? 0),
          0,
        );
        const fleetLoad = (driverData ?? []).reduce(
          (sum, driver) => sum + Number(driver.current_load ?? 0),
          0,
        );
        value = [
          String(active.length),
          String(completedToday.length),
          `${fleetCapacity > 0 ? Math.round((fleetLoad / fleetCapacity) * 100) : 0}%`,
          `${Math.round(totalActualWeight * 0.25)} kg`,
        ][index];
      }
      if (role === "driver") {
        const driver = driverData?.[0];
        const loadPercent = driver
          ? Math.round(
              (Number(driver.current_load ?? 0) /
                Math.max(1, Number(driver.capacity_kg ?? 1))) *
                100,
            )
          : 0;
        const nextStop = active
          .map((row) => row.route_stop_order)
          .filter((value): value is number => value !== null)
          .sort((a, b) => a - b)[0];
        value = [
          String(active.length),
          nextStop ? `#${nextStop}` : "—",
          String(completedToday.length),
          `${loadPercent}%`,
        ][index];
      }
      if (role === "admin")
        value = [
          String(pending.length),
          String(completedToday.length),
          `${recyclingRate}%`,
          String(
            (driverData ?? []).filter(
              (driver) =>
                driver.status !== "Disabled" && driver.status !== "Offline",
            ).length,
          ),
        ][index];
      return { ...metric, value, change: metricChanges[index] };
    });
    const markets = role === "admin" ? await this.getMarkets() : [];
    const collectedToday = completedToday.reduce(
      (sum, row) => sum + Number(row.actual_weight ?? 0),
      0,
    );
    const activeMarkets = markets.filter(
      (market) =>
        !["offline", "inactive"].includes(String(market.status).toLowerCase()),
    ).length;
    const extraValues = [
      `${Math.round(collectedToday)} kg`,
      `${recyclingRate}%`,
      String(markets.reduce((sum, market) => sum + market.vendors, 0)),
      `${activeMarkets} / ${markets.length}`,
    ];
    const extraMetrics =
      role === "admin"
        ? adminExtraMetrics.map((metric, index) => ({
            ...metric,
            value: extraValues[index],
          }))
        : [];
    const visibleJobs =
      role === "vendor"
        ? []
        : role === "recycler" || role === "driver"
          ? active
          : rows;
    return {
      role,
      metrics: dynamicMetrics,
      extraMetrics,
      wasteTrend: charts.wasteTrend,
      wasteCategories: charts.wasteCategories,
      recentRequests: rows.slice(0, 8).map(requestFromRow),
      jobs: visibleJobs.slice(0, 8).map(jobFromRow),
      markets,
    };
  },

  async getCharts() {
    const supabase = optionalSupabase();
    if (!supabase)
      throw new ServiceError(
        "Supabase is not configured. Chart data cannot be loaded.",
        503,
      );
    await requireUser(supabase);
    const { data, error } = await supabase
      .from("pickup_requests")
      .select(pickupSelect)
      .order("created_at");
    throwDatabaseError(error, "Chart data could not be loaded.");
    return chartsFromRows(data as AnalyticsPickup[]);
  },

  async getSmartStockAnalytics(): Promise<SmartStockAnalytics> {
    const supabase = optionalSupabase();
    if (!supabase) {
      await mockDelay();
      return {
        inventoryDemand: fallbackInventoryDemand,
        monthlyImpact: fallbackMonthlyImpact,
        topWaste: stockProducts
          .filter((item) => item.stock > item.forecast)
          .slice(0, 6)
          .map((item) => ({
            product: item.name,
            potential: item.stock - item.forecast,
          })),
      };
    }
    const user = await requireUser(supabase);
    const { data, error } = await supabase
      .from("inventory_items")
      .select("name, stock, forecast, price, updated_at")
      .eq("vendor_id", user.id);
    throwDatabaseError(error, "Smart Stock analytics could not be loaded.");
    const products = data ?? [];
    const totalStock = products.reduce(
      (sum, item) => sum + Number(item.stock),
      0,
    );
    const totalDemand = products.reduce(
      (sum, item) => sum + Number(item.forecast),
      0,
    );
    const inventoryDemand = [
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ].map((day, index) => ({
      day,
      inventory: Math.round(totalStock * (0.9 + index * 0.02)),
      demand: Math.round(totalDemand * (0.92 + index * 0.015)),
    }));
    const prevented = products.reduce(
      (sum, item) =>
        sum + Math.max(0, Number(item.stock) - Number(item.forecast)),
      0,
    );
    const savings = products.reduce(
      (sum, item) =>
        sum +
        Math.max(0, Number(item.stock) - Number(item.forecast)) *
          Number(item.price),
      0,
    );
    const monthlyImpact = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"].map(
      (month, index) => ({
        month,
        waste: Math.max(0, Math.round(prevented * (1.3 - index * 0.1))),
        prevented: Math.round(prevented * (0.5 + index * 0.1)),
        savings: Math.round(savings * (0.55 + index * 0.09)),
        accuracy: Math.min(96, 82 + index * 2),
      }),
    );
    return {
      inventoryDemand,
      monthlyImpact,
      topWaste: products
        .map((item) => ({
          product: item.name,
          potential: Math.max(0, Number(item.stock) - Number(item.forecast)),
        }))
        .sort((a, b) => b.potential - a.potential)
        .slice(0, 6),
    };
  },

  async getMarkets() {
    const supabase = optionalSupabase();
    if (!supabase)
      throw new ServiceError(
        "Supabase is not configured. Market data cannot be loaded.",
        503,
      );
    await requireUser(supabase);
    const [
      { data: marketRows, error: marketError },
      { data: pickupRows, error: pickupError },
      { data: vendorRows, error: vendorError },
      { data: recoveryRows, error: recoveryError },
    ] = await Promise.all([
      supabase.from("markets").select("id, name, ward, status").order("name"),
      supabase
        .from("pickup_requests")
        .select("id, market_id, status, actual_weight, completed_at"),
      supabase.from("profiles").select("market_id").eq("role", "vendor"),
      supabase.from("waste_recoveries").select("pickup_id, recovered_weight"),
    ]);
    throwDatabaseError(marketError, "Market data could not be loaded.");
    throwDatabaseError(pickupError, "Market pickup data could not be loaded.");
    throwDatabaseError(vendorError, "Market vendor data could not be loaded.");
    throwDatabaseError(
      recoveryError,
      "Market recovery data could not be loaded.",
    );
    const recoveredByPickup = new Map(
      (recoveryRows as RecoveryRow[]).map((row) => [
        row.pickup_id,
        Number(row.recovered_weight),
      ]),
    );
    return (marketRows ?? []).map((market) => {
      const pickups = (pickupRows ?? []).filter(
        (row) => row.market_id === market.id,
      );
      const today = new Date().toISOString().slice(0, 10);
      const completed = pickups.filter(
        (row) =>
          row.status === "completed" && row.completed_at?.startsWith(today),
      );
      const actualWeight = completed.reduce(
        (sum, row) => sum + Number(row.actual_weight ?? 0),
        0,
      );
      const recoveredWeight = completed.reduce(
        (sum, row) => sum + (recoveredByPickup.get(row.id) ?? 0),
        0,
      );
      return {
        market: market.name,
        requests: pickups.length,
        collected: `${Math.round(actualWeight)} kg`,
        rate: `${actualWeight > 0 ? Math.min(100, Math.round((recoveredWeight / actualWeight) * 100)) : 0}%`,
        status: market.status,
        ward: market.ward ?? 0,
        vendors: (vendorRows ?? []).filter((row) => row.market_id === market.id)
          .length,
      };
    });
  },

  async getPartners() {
    const supabase = optionalSupabase();
    if (!supabase)
      throw new ServiceError(
        "Supabase is not configured. Recycler partner data cannot be loaded.",
        503,
      );
    await requireUser(supabase);
    const [
      { data: profiles, error: profileError },
      { data: drivers, error: driverError },
      { data: pickups, error: pickupError },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, organization_name")
        .eq("role", "recycler")
        .eq("is_active", true),
      supabase.from("drivers").select("partner_id"),
      supabase.from("pickup_requests").select("recycler_id, status"),
    ]);
    throwDatabaseError(profileError, "Recycler profiles could not be loaded.");
    throwDatabaseError(driverError, "Recycler drivers could not be loaded.");
    throwDatabaseError(pickupError, "Recycler jobs could not be loaded.");
    return (profiles ?? []).map((profile) => {
      const jobs = (pickups ?? []).filter(
        (row) => row.recycler_id === profile.id,
      );
      const completed = jobs.filter((row) => row.status === "completed").length;
      return {
        name: profile.organization_name || "Recycling partner",
        category: "Verified waste recovery",
        trucks: (drivers ?? []).filter(
          (driver) => driver.partner_id === profile.id,
        ).length,
        jobs: jobs.length,
        rate: `${jobs.length ? Math.round((completed / jobs.length) * 100) : 0}%`,
      };
    });
  },

  async generateReport(
    format: ReportFormat,
    title = "EcoLoop Circularity Report",
  ) {
    const [charts, markets, partners] = await Promise.all([
      this.getCharts(),
      this.getMarkets(),
      this.getPartners(),
    ]);
    const generatedAt = new Date();
    const totalCollected = charts.wasteTrend.reduce(
      (sum, point) => sum + point.collected,
      0,
    );
    const totalRecycled = charts.wasteTrend.reduce(
      (sum, point) => sum + point.recycled,
      0,
    );
    const extension = format === "CSV" ? "csv" : "pdf";
    const filename = `${reportSlug(title)}-${generatedAt.toISOString().slice(0, 10)}.${extension}`;

    if (format === "CSV") {
      const rows: Array<Array<string | number>> = [
        [title],
        ["Generated at", generatedAt.toISOString()],
        ["Total collected (kg)", totalCollected],
        ["Total recycled (kg)", totalRecycled],
        [],
        ["Monthly waste trend"],
        ["Month", "Collected (kg)", "Recycled (kg)"],
        ...charts.wasteTrend.map((point) => [
          point.month,
          point.collected,
          point.recycled,
        ]),
        [],
        ["Material distribution"],
        ["Material", "Share (%)"],
        ...charts.wasteCategories.map((point) => [point.name, point.value]),
        [],
        ["Connected markets"],
        [
          "Market",
          "Ward",
          "Requests",
          "Collected",
          "Recycling rate",
          "Active vendors",
          "Status",
        ],
        ...markets.map((market) => [
          market.market,
          market.ward,
          market.requests,
          market.collected,
          market.rate,
          market.vendors,
          market.status,
        ]),
        [],
        ["Approved recycling partners"],
        ["Partner", "Vehicles", "Jobs", "Completion rate"],
        ...partners.map((partner) => [
          partner.name,
          partner.trucks,
          partner.jobs,
          partner.rate,
        ]),
      ];
      const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
      return {
        success: true as const,
        format,
        filename,
        blob: new Blob([csv], { type: "text/csv;charset=utf-8" }),
      };
    }

    const lines = [
      title,
      `Generated ${generatedAt.toLocaleString("en-IN")}`,
      `Total collected: ${totalCollected} kg`,
      `Total recycled: ${totalRecycled} kg`,
      `Connected markets: ${markets.length}`,
      `Approved recycling partners: ${partners.length}`,
      "",
      "Monthly waste trend",
      ...charts.wasteTrend.map(
        (point) =>
          `${point.month}: ${point.collected} kg collected, ${point.recycled} kg recycled`,
      ),
      "",
      "Material distribution",
      ...(charts.wasteCategories.length
        ? charts.wasteCategories.map(
            (point) => `${point.name}: ${point.value}%`,
          )
        : ["No completed pickup measurements recorded yet."]),
    ];
    return { success: true as const, format, filename, blob: createPdf(lines) };
  },
};
