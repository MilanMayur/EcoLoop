import type {
  Driver,
  DriverInput,
  DriverPerformance,
  FleetOverview,
  PickupCompletionInput,
  PickupJob,
} from "@/types/mvp";
import { ServiceError } from "@/services/service-error";
import {
  optionalSupabase,
  relativeTime,
  requireUser,
  throwDatabaseError,
} from "@/services/supabase.data";

type DriverRow = {
  id: string;
  partner_id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string;
  vehicle_number: string;
  vehicle_type: string;
  capacity_kg: number | string;
  current_load: number | string;
  status: Driver["status"];
  current_latitude: number | null;
  current_longitude: number | null;
  is_available: boolean;
  compatible_waste_types: string[] | null;
  last_location_at: string | null;
  created_at: string;
};

type DriverJobRow = {
  id: string;
  reference_code: string;
  vendor_name: string;
  location: string;
  waste_type: string;
  fill_level: PickupJob["fillLevel"];
  actual_weight: number | string | null;
  priority: string;
  notes: string | null;
  image_url: string | null;
  completion_image_url: string | null;
  facility: string | null;
  status: string;
  created_at: string;
  assigned_vehicle: string | null;
  estimated_arrival: string | null;
  route_stop_order: number | null;
  assignment_time: string | null;
  vendor_latitude: number | null;
  vendor_longitude: number | null;
  vendor_phone: string | null;
  assigned_driver: { name: string } | Array<{ name: string }> | null;
  pickup_assignments: Array<{
    distance_km: number | string | null;
    released_at: string | null;
    assigned_at: string;
  }> | null;
};

const driverSelect =
  "id, partner_id, user_id, name, email, phone, vehicle_number, vehicle_type, capacity_kg, current_load, status, current_latitude, current_longitude, is_available, compatible_waste_types, last_location_at, created_at";
const jobSelect =
  "id, reference_code, vendor_name, location, waste_type, fill_level, actual_weight, priority, notes, image_url, completion_image_url, facility, status, created_at, assigned_vehicle, assignment_time, estimated_arrival, route_stop_order, vendor_latitude, vendor_longitude, vendor_phone, assigned_driver:drivers!pickup_requests_assigned_driver_id_fkey(name), pickup_assignments(distance_km, released_at, assigned_at)";
const jobSelectWithoutAssignmentHistory =
  "id, reference_code, vendor_name, location, waste_type, fill_level, actual_weight, priority, notes, image_url, completion_image_url, facility, status, created_at, assigned_vehicle, assignment_time, estimated_arrival, route_stop_order, vendor_latitude, vendor_longitude, vendor_phone, assigned_driver:drivers!pickup_requests_assigned_driver_id_fkey(name)";

const client = () => {
  const supabase = optionalSupabase();
  if (!supabase)
    throw new ServiceError(
      "Supabase is not configured. Driver data cannot be loaded.",
      503,
    );
  return supabase;
};

const fromRow = (row: DriverRow): Driver => ({
  id: row.id,
  partnerId: row.partner_id,
  userId: row.user_id ?? undefined,
  name: row.name,
  email: row.email ?? undefined,
  phone: row.phone,
  vehicleNumber: row.vehicle_number,
  vehicleType: row.vehicle_type,
  capacityKg: Number(row.capacity_kg),
  currentLoadKg: Number(row.current_load),
  status: row.status,
  latitude: row.current_latitude ?? undefined,
  longitude: row.current_longitude ?? undefined,
  isAvailable: row.is_available,
  compatibleWasteTypes: row.compatible_waste_types ?? [],
  lastLocationAt: row.last_location_at ?? undefined,
  createdAt: row.created_at,
});

const jobFromRow = (row: DriverJobRow): PickupJob => {
  const assignment =
    row.pickup_assignments?.find((item) => item.released_at === null) ??
    row.pickup_assignments?.[0];
  const travelMinutes =
    row.assignment_time && row.estimated_arrival
      ? Math.max(
          0,
          Math.round(
            (new Date(row.estimated_arrival).getTime() -
              new Date(row.assignment_time).getTime()) /
              60_000,
          ),
        )
      : undefined;
  return {
    id: row.reference_code,
    vendor: row.vendor_name || "EcoLoop vendor",
    location: row.location || "Market location",
    waste: `${row.waste_type} waste`,
    fillLevel: row.fill_level,
    weight: row.fill_level,
    actualWeight:
      row.actual_weight === null ? undefined : Number(row.actual_weight),
    priority: row.priority,
    notes: row.notes ?? undefined,
    imageUrl: row.image_url ?? undefined,
    completionImageUrl: row.completion_image_url ?? undefined,
    facility: row.facility ?? undefined,
    createdTime: relativeTime(row.created_at),
    distance: "Route stop",
    status: (
      {
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
    assignmentTime: row.assignment_time ?? undefined,
    estimatedTravelMinutes: travelMinutes,
    distanceKm:
      assignment?.distance_km === null || assignment?.distance_km === undefined
        ? undefined
        : Number(assignment.distance_km),
    routeStopOrder: row.route_stop_order ?? undefined,
    vendorLatitude: row.vendor_latitude ?? undefined,
    vendorLongitude: row.vendor_longitude ?? undefined,
    vendorPhone: row.vendor_phone ?? undefined,
    assignedDriver: Array.isArray(row.assigned_driver)
      ? row.assigned_driver[0]?.name
      : row.assigned_driver?.name,
  };
};

const pickupId = async (referenceCode: string) => {
  const supabase = client();
  const { data, error } = await supabase
    .from("pickup_requests")
    .select("id")
    .eq("reference_code", referenceCode)
    .single();
  throwDatabaseError(error, "Assigned pickup not found.");
  if (!data) throw new ServiceError("Assigned pickup not found.", 404);
  return data.id as string;
};

export const driverService = {
  async getDrivers() {
    const supabase = client();
    await requireUser(supabase);
    const { data, error } = await supabase
      .from("drivers")
      .select(driverSelect)
      .order("created_at");
    throwDatabaseError(error, "Drivers could not be loaded.");
    return (data as DriverRow[]).map(fromRow);
  },

  async inviteDriver(payload: DriverInput) {
    const supabase = client();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token)
      throw new ServiceError(
        "Please sign in again before inviting a driver.",
        401,
      );
    const response = await fetch("/api/drivers/invite", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as {
      driver?: DriverRow;
      error?: string;
    };
    if (!response.ok || !result.driver)
      throw new ServiceError(
        result.error || "The driver invitation could not be sent.",
        response.status,
      );
    return fromRow(result.driver);
  },

  async updateDriver(id: string, payload: Omit<DriverInput, "email">) {
    const supabase = client();
    await requireUser(supabase);
    const { data, error } = await supabase
      .from("drivers")
      .update({
        name: payload.name,
        phone: payload.phone,
        vehicle_number: payload.vehicleNumber,
        vehicle_type: payload.vehicleType,
        capacity_kg: payload.capacityKg,
        compatible_waste_types: payload.compatibleWasteTypes,
      })
      .eq("id", id)
      .select(driverSelect)
      .single();
    throwDatabaseError(error, "The driver could not be updated.");
    return fromRow(data as DriverRow);
  },

  async disableDriver(id: string) {
    const supabase = client();
    await requireUser(supabase);
    const { data, error } = await supabase
      .from("drivers")
      .update({
        status: "Disabled",
        is_available: false,
        disabled_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(driverSelect)
      .single();
    throwDatabaseError(error, "The driver could not be disabled.");
    return fromRow(data as DriverRow);
  },

  async getFleetOverview(): Promise<FleetOverview> {
    const supabase = client();
    const drivers = await this.getDrivers();
    const [{ count: activeJobs, error }, { data: config }] = await Promise.all([
      supabase
        .from("pickup_requests")
        .select("id", { count: "exact", head: true })
        .in("status", [
          "assigned",
          "accepted",
          "in_transit",
          "arrived",
          "collected",
        ]),
      supabase
        .from("smart_assignment_config")
        .select("batching_window_seconds")
        .eq("id", true)
        .single(),
    ]);
    throwDatabaseError(error, "Fleet activity could not be loaded.");
    return {
      totalDrivers: drivers.length,
      availableDrivers: drivers.filter((item) => item.isAvailable).length,
      activeJobs: activeJobs ?? 0,
      totalCapacityKg: drivers.reduce((sum, item) => sum + item.capacityKg, 0),
      currentLoadKg: drivers.reduce((sum, item) => sum + item.currentLoadKg, 0),
      batchingWindowSeconds: Number(config?.batching_window_seconds ?? 30),
    };
  },

  async updateBatchingWindow(seconds: number) {
    if (!Number.isInteger(seconds) || seconds < 30 || seconds > 60) {
      throw new ServiceError(
        "The batching window must be between 30 and 60 seconds.",
        400,
      );
    }
    const supabase = client();
    const user = await requireUser(supabase);
    const { error } = await supabase
      .from("smart_assignment_config")
      .update({
        batching_window_seconds: seconds,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    throwDatabaseError(error, "The batching window could not be updated.");
    return seconds;
  },

  async getPerformance() {
    const supabase = client();
    await requireUser(supabase);
    const { data, error } = await supabase
      .from("driver_performance")
      .select(
        "driver_id, name, total_assignments, completed_jobs, average_response_minutes, average_collection_minutes, completion_rate, distance_covered_km, vehicle_utilization, waste_collected_kg",
      );
    throwDatabaseError(error, "Driver performance could not be loaded.");
    return (data ?? []).map(
      (row): DriverPerformance => ({
        driverId: String(row.driver_id),
        name: String(row.name),
        totalAssignments: Number(row.total_assignments),
        completedJobs: Number(row.completed_jobs),
        averageResponseMinutes:
          row.average_response_minutes === null
            ? undefined
            : Number(row.average_response_minutes),
        averageCollectionMinutes:
          row.average_collection_minutes === null
            ? undefined
            : Number(row.average_collection_minutes),
        completionRate: Number(row.completion_rate ?? 0),
        distanceCoveredKm: Number(row.distance_covered_km ?? 0),
        vehicleUtilization: Number(row.vehicle_utilization ?? 0),
        wasteCollectedKg: Number(row.waste_collected_kg ?? 0),
      }),
    );
  },

  async getAssignedJobs(scope: "driver" | "partner" = "driver") {
    const supabase = client();
    const user = await requireUser(supabase);
    const buildQuery = (select: string) => {
      let query = supabase
        .from("pickup_requests")
        .select(select)
        .in("status", [
          "assigned",
          "accepted",
          "in_transit",
          "arrived",
          "collected",
        ])
        .order("route_stop_order");
      if (scope === "partner") query = query.eq("recycler_id", user.id);
      return query;
    };
    let { data, error } = await buildQuery(jobSelect);
    // Supabase can briefly retain a stale relationship cache after the driver
    // migration. The core assignment card does not depend on that nested data.
    if (
      error &&
      (error.code === "PGRST200" ||
        error.code === "PGRST201" ||
        error.code === "PGRST204")
    ) {
      ({ data, error } = await buildQuery(jobSelectWithoutAssignmentHistory));
    }
    throwDatabaseError(error, "Assigned jobs could not be loaded.");
    return (data as unknown as DriverJobRow[]).map(jobFromRow);
  },

  async getCompletedJobs() {
    const supabase = client();
    await requireUser(supabase);
    const { data, error } = await supabase
      .from("pickup_requests")
      .select(jobSelect)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(100);
    throwDatabaseError(error, "Completed jobs could not be loaded.");
    return (data as DriverJobRow[]).map(jobFromRow);
  },

  async processReadyBatches() {
    const supabase = client();
    await requireUser(supabase);
    const { data, error } = await supabase.rpc("process_pickup_batches");
    throwDatabaseError(error, "The assignment queue could not be processed.");
    return Number(data ?? 0);
  },

  async updateLocation(latitude: number, longitude: number) {
    const supabase = client();
    await requireUser(supabase);
    const { data, error } = await supabase.rpc("update_driver_location", {
      p_latitude: latitude,
      p_longitude: longitude,
    });
    throwDatabaseError(error, "Driver location could not be updated.");
    return fromRow(data as DriverRow);
  },

  async updatePickupStatus(
    referenceCode: string,
    status: "accepted" | "in_transit" | "arrived" | "collected",
  ) {
    const supabase = client();
    await requireUser(supabase);
    const id = await pickupId(referenceCode);
    const { data, error } = await supabase.rpc("driver_update_pickup_status", {
      p_pickup_id: id,
      p_status: status,
    });
    throwDatabaseError(error, "Pickup status could not be updated.");
    return jobFromRow(data as DriverJobRow);
  },

  acceptAssignment(referenceCode: string) {
    return this.updatePickupStatus(referenceCode, "accepted");
  },
  startJourney(referenceCode: string) {
    return this.updatePickupStatus(referenceCode, "in_transit");
  },
  markArrived(referenceCode: string) {
    return this.updatePickupStatus(referenceCode, "arrived");
  },
  collectWaste(referenceCode: string) {
    return this.updatePickupStatus(referenceCode, "collected");
  },

  async completePickup(referenceCode: string, payload: PickupCompletionInput) {
    const supabase = client();
    await requireUser(supabase);
    const id = await pickupId(referenceCode);
    const { data, error } = await supabase.rpc("driver_update_pickup_status", {
      p_pickup_id: id,
      p_status: "completed",
      p_actual_weight: payload.actualWeight,
      p_facility: payload.facility,
      p_completion_notes: payload.notes || null,
      p_completion_image_url: payload.completionImageUrl || null,
    });
    throwDatabaseError(error, "Pickup completion could not be recorded.");
    return jobFromRow(data as DriverJobRow);
  },
};
