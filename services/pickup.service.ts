import { availableJobs, vendorRequests } from "@/data/dashboard";
import type { PickupInput, PickupJob, PickupRequest, VehicleSummary } from "@/types/mvp";
import { ServiceError } from "@/services/service-error";
import { mockDelay, optionalSupabase, relativeTime, requireUser, throwDatabaseError } from "@/services/supabase.data";

type PickupRow = {
  id: string;
  reference_code: string;
  vendor_name: string;
  location: string;
  waste_type: string;
  estimated_weight: number | string;
  collected_weight: number | string | null;
  priority: string;
  status: "pending" | "assigned" | "accepted" | "in_transit" | "completed" | "cancelled";
  recycler_id: string | null;
  facility: string | null;
  created_at: string;
};

type VehicleRow = {
  id: string;
  driver: string;
  capacity_kg: number | string;
  load_percent: number | null;
  status: string;
};

let requestStore: PickupRequest[] = vendorRequests.map((item) => ({ ...item }));
let availableStore: PickupJob[] = availableJobs.map((item) => ({ ...item, status: "Available" }));
let acceptedStore: PickupJob[] = [
  { ...availableJobs[0], status: "In transit" },
  { ...availableJobs[1], status: "Accepted" },
];

const vehicleStore: VehicleSummary[] = [
  { id: "KA-51-AB-4821", driver: "Suresh Kumar", capacity: "1.2 t", load: "68%", status: "Active" },
  { id: "KA-05-MN-9204", driver: "Imran Pasha", capacity: "850 kg", load: "42%", status: "Active" },
  { id: "KA-51-HG-1178", driver: "Manoj R", capacity: "1.5 t", load: "—", status: "Maintenance" },
];

const statusLabel = (status: PickupRow["status"]) => ({
  pending: "Pending",
  assigned: "Assigned",
  accepted: "Accepted",
  in_transit: "In transit",
  completed: "Completed",
  cancelled: "Cancelled",
})[status];

const requestFromRow = (row: PickupRow): PickupRequest => ({
  id: row.reference_code,
  waste: `${row.waste_type} waste`,
  weight: `${Number(row.collected_weight ?? row.estimated_weight)} kg`,
  recycler: row.recycler_id ? "Verified recycling partner" : "Matching in progress",
  status: statusLabel(row.status),
  time: relativeTime(row.created_at),
  eta: row.status === "accepted" ? "18 min" : row.status === "in_transit" ? "6 min" : "—",
});

const jobFromRow = (row: PickupRow): PickupJob => ({
  id: row.reference_code,
  vendor: row.vendor_name || "EcoLoop vendor",
  location: row.location || "Market location",
  waste: `${row.waste_type} waste`,
  weight: `${Number(row.collected_weight ?? row.estimated_weight)} kg`,
  distance: "Nearby",
  priority: row.priority,
  status: row.status === "pending" ? "Available" : statusLabel(row.status) as PickupJob["status"],
});

const pickupSelect = "id, reference_code, vendor_name, location, waste_type, estimated_weight, collected_weight, priority, status, recycler_id, facility, created_at";

export const pickupService = {
  async getRequests() {
    const supabase = optionalSupabase();
    if (!supabase) { await mockDelay(); return requestStore.map((item) => ({ ...item })); }
    await requireUser(supabase);
    const { data, error } = await supabase.from("pickup_requests").select(pickupSelect).order("created_at", { ascending: false });
    throwDatabaseError(error, "Pickup requests could not be loaded.");
    return (data as PickupRow[]).map(requestFromRow);
  },

  async createPickup(payload: PickupInput) {
    const supabase = optionalSupabase();
    if (!supabase) {
      await mockDelay();
      const request: PickupRequest = { id: `ECO-${2058 + requestStore.length}`, waste: `${payload.wasteType} waste`, weight: `${payload.weight} kg`, recycler: "Matching in progress", status: "Pending", time: "Today, just now", eta: "—" };
      requestStore = [request, ...requestStore];
      return request;
    }

    const user = await requireUser(supabase);
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, organization_name, market_id")
      .eq("id", user.id)
      .single();
    throwDatabaseError(profileError, "Your vendor profile could not be loaded.");
    if (!profile) throw new ServiceError("Your vendor profile could not be loaded.", 404);

    const { data, error } = await supabase.from("pickup_requests").insert({
      vendor_id: user.id,
      market_id: profile.market_id,
      vendor_name: profile.full_name,
      location: profile.organization_name,
      waste_type: payload.wasteType,
      estimated_weight: payload.weight,
      priority: payload.priority,
      notes: payload.notes || null,
    }).select(pickupSelect).single();
    throwDatabaseError(error, "The pickup request could not be created.");
    return requestFromRow(data as PickupRow);
  },

  async getAvailableJobs() {
    const supabase = optionalSupabase();
    if (!supabase) { await mockDelay(); return availableStore.map((item) => ({ ...item })); }
    await requireUser(supabase);
    const { data, error } = await supabase.from("pickup_requests").select(pickupSelect).eq("status", "pending").order("created_at");
    throwDatabaseError(error, "Available pickups could not be loaded.");
    return (data as PickupRow[]).map(jobFromRow);
  },

  async getAcceptedJobs() {
    const supabase = optionalSupabase();
    if (!supabase) { await mockDelay(); return acceptedStore.map((item) => ({ ...item })); }
    const user = await requireUser(supabase);
    const { data, error } = await supabase.from("pickup_requests").select(pickupSelect)
      .eq("recycler_id", user.id).in("status", ["accepted", "in_transit"]).order("accepted_at", { ascending: false });
    throwDatabaseError(error, "Accepted pickups could not be loaded.");
    return (data as PickupRow[]).map(jobFromRow);
  },

  async acceptJob(jobId: string) {
    const supabase = optionalSupabase();
    if (!supabase) {
      await mockDelay();
      const job = availableStore.find((item) => item.id === jobId);
      if (!job) throw new ServiceError("This pickup is no longer available.", 404);
      const accepted: PickupJob = { ...job, status: "Accepted" };
      availableStore = availableStore.filter((item) => item.id !== jobId);
      acceptedStore = [accepted, ...acceptedStore.filter((item) => item.id !== jobId)];
      return accepted;
    }
    await requireUser(supabase);
    const { data: row, error: lookupError } = await supabase.from("pickup_requests").select("id").eq("reference_code", jobId).single();
    throwDatabaseError(lookupError, "This pickup is no longer available.");
    if (!row) throw new ServiceError("This pickup is no longer available.", 404);
    const { data, error } = await supabase.rpc("accept_pickup", { p_pickup_id: row.id });
    throwDatabaseError(error, "This pickup could not be accepted.");
    return jobFromRow(data as PickupRow);
  },

  async updateStatus(jobId: string, status: PickupJob["status"]) {
    const supabase = optionalSupabase();
    if (!supabase) {
      await mockDelay();
      const job = acceptedStore.find((item) => item.id === jobId);
      if (!job) throw new ServiceError("Pickup job not found.", 404);
      const updated = { ...job, status };
      acceptedStore = acceptedStore.map((item) => item.id === jobId ? updated : item);
      return updated;
    }
    await requireUser(supabase);
    const { data: row, error: lookupError } = await supabase.from("pickup_requests").select("id").eq("reference_code", jobId).single();
    throwDatabaseError(lookupError, "Pickup job not found.");
    if (!row) throw new ServiceError("Pickup job not found.", 404);
    const dbStatus = status === "In transit" ? "in_transit" : status?.toLowerCase();
    const { data, error } = await supabase.rpc("update_pickup_status", { p_pickup_id: row.id, p_status: dbStatus });
    throwDatabaseError(error, "Pickup status could not be updated.");
    return jobFromRow(data as PickupRow);
  },

  async completePickup(jobId: string, payload: { weight: number; facility: string; notes?: string }) {
    const supabase = optionalSupabase();
    if (!supabase) {
      await mockDelay();
      const job = acceptedStore.find((item) => item.id === jobId);
      if (!job) throw new ServiceError("Pickup job not found.", 404);
      acceptedStore = acceptedStore.map((item) => item.id === jobId ? { ...item, status: "Completed" } : item);
      return { ...job, status: "Completed" as const, collectedWeight: payload.weight, facility: payload.facility };
    }
    await requireUser(supabase);
    const { data: row, error: lookupError } = await supabase.from("pickup_requests").select("id").eq("reference_code", jobId).single();
    throwDatabaseError(lookupError, "Pickup job not found.");
    if (!row) throw new ServiceError("Pickup job not found.", 404);
    const { data, error } = await supabase.rpc("update_pickup_status", {
      p_pickup_id: row.id,
      p_status: "completed",
      p_collected_weight: payload.weight,
      p_facility: payload.facility,
      p_notes: payload.notes || null,
    });
    throwDatabaseError(error, "Pickup completion could not be recorded.");
    return { ...jobFromRow(data as PickupRow), collectedWeight: payload.weight, facility: payload.facility };
  },

  async getHistory() {
    const supabase = optionalSupabase();
    if (!supabase) { await mockDelay(); return acceptedStore.filter((item) => item.status === "Completed").concat(availableJobs.map((item) => ({ ...item, status: "Completed" as const }))); }
    await requireUser(supabase);
    const { data, error } = await supabase.from("pickup_requests").select(pickupSelect).eq("status", "completed").order("completed_at", { ascending: false });
    throwDatabaseError(error, "Pickup history could not be loaded.");
    return (data as PickupRow[]).map(jobFromRow);
  },

  async getVehicles() {
    const supabase = optionalSupabase();
    if (!supabase) { await mockDelay(); return vehicleStore.map((item) => ({ ...item })); }
    await requireUser(supabase);
    const { data, error } = await supabase.from("vehicles").select("id, driver, capacity_kg, load_percent, status").order("id");
    throwDatabaseError(error, "Vehicle data could not be loaded.");
    return (data as VehicleRow[]).map((row) => ({
      id: row.id,
      driver: row.driver,
      capacity: Number(row.capacity_kg) >= 1000 ? `${(Number(row.capacity_kg) / 1000).toFixed(1)} t` : `${Number(row.capacity_kg)} kg`,
      load: row.load_percent === null ? "—" : `${row.load_percent}%`,
      status: row.status,
    }));
  },
};
