import { availableJobs, vendorRequests } from "@/data/dashboard";
import type {
  FillLevel,
  PickupCompletionInput,
  PickupInput,
  PickupJob,
  PickupRequest,
  PickupTimelineItem,
  VehicleSummary,
} from "@/types/mvp";
import { ServiceError } from "@/services/service-error";
import { mockDelay, optionalSupabase, relativeTime, requireUser, throwDatabaseError } from "@/services/supabase.data";

const PICKUP_IMAGE_BUCKET = "pickup-images";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

type PickupStatus = "pending" | "assigned" | "accepted" | "in_transit" | "completed" | "cancelled";

type PickupRow = {
  id: string;
  reference_code: string;
  vendor_name: string;
  location: string;
  waste_type: string;
  fill_level: FillLevel;
  actual_weight: number | string | null;
  priority: string;
  notes: string | null;
  image_url: string | null;
  completion_image_url: string | null;
  facility: string | null;
  status: PickupStatus;
  recycler_id: string | null;
  created_at: string;
};

type HistoryRow = {
  pickup_id: string;
  status: PickupStatus;
  note: string | null;
  created_at: string;
};

type VehicleRow = {
  id: string;
  driver: string;
  capacity_kg: number | string;
  load_percent: number | null;
  status: string;
};

let requestStore: PickupRequest[] = vendorRequests.map((item) => ({ ...item, weight: item.fillLevel }));
let availableStore: PickupJob[] = availableJobs.map((item) => ({ ...item, weight: item.fillLevel, status: "Available" }));
let acceptedStore: PickupJob[] = [
  { ...availableJobs[0], status: "In transit" },
  { ...availableJobs[1], status: "Accepted" },
];

const vehicleStore: VehicleSummary[] = [
  { id: "KA-51-AB-4821", driver: "Suresh Kumar", capacity: "1.2 t", load: "68%", status: "Active" },
  { id: "KA-05-MN-9204", driver: "Imran Pasha", capacity: "850 kg", load: "42%", status: "Active" },
  { id: "KA-51-HG-1178", driver: "Manoj R", capacity: "1.5 t", load: "—", status: "Maintenance" },
];

const statusLabel = (status: PickupStatus) => ({
  pending: "Pending",
  assigned: "Assigned",
  accepted: "Accepted",
  in_transit: "In transit",
  completed: "Completed",
  cancelled: "Cancelled",
})[status];

const timelineFor = (row: PickupRow, history: HistoryRow[] = []): PickupTimelineItem[] => [
  { status: "Created", time: relativeTime(row.created_at) },
  ...history.map((item) => ({ status: statusLabel(item.status), time: relativeTime(item.created_at), note: item.note ?? undefined })),
];

const requestFromRow = (row: PickupRow, history: HistoryRow[] = []): PickupRequest => ({
  id: row.reference_code,
  waste: `${row.waste_type} waste`,
  fillLevel: row.fill_level,
  weight: row.fill_level,
  actualWeight: row.actual_weight === null ? undefined : Number(row.actual_weight),
  imageUrl: row.image_url ?? undefined,
  completionImageUrl: row.completion_image_url ?? undefined,
  facility: row.facility ?? undefined,
  notes: row.notes ?? undefined,
  timeline: timelineFor(row, history),
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
  fillLevel: row.fill_level,
  weight: row.fill_level,
  actualWeight: row.actual_weight === null ? undefined : Number(row.actual_weight),
  imageUrl: row.image_url ?? undefined,
  completionImageUrl: row.completion_image_url ?? undefined,
  facility: row.facility ?? undefined,
  notes: row.notes ?? undefined,
  createdTime: relativeTime(row.created_at),
  distance: "Nearby",
  priority: row.priority,
  status: row.status === "pending" ? "Available" : statusLabel(row.status) as PickupJob["status"],
});

const pickupSelect = "id, reference_code, vendor_name, location, waste_type, fill_level, actual_weight, priority, notes, image_url, completion_image_url, facility, status, recycler_id, created_at";

const pickupId = async (referenceCode: string) => {
  const supabase = optionalSupabase();
  if (!supabase) return referenceCode;
  const { data, error } = await supabase.from("pickup_requests").select("id").eq("reference_code", referenceCode).single();
  throwDatabaseError(error, "Pickup job not found.");
  if (!data) throw new ServiceError("Pickup job not found.", 404);
  return data.id;
};

export const pickupService = {
  async uploadPickupImage(file: File, purpose: "pickup" | "completion" = "pickup") {
    if (!IMAGE_TYPES.includes(file.type)) throw new ServiceError("Use a JPG, PNG, or WEBP image.", 400);
    if (file.size > MAX_IMAGE_SIZE) throw new ServiceError("The image must be 5 MB or smaller.", 400);
    const supabase = optionalSupabase();
    if (!supabase) return URL.createObjectURL(file);
    const user = await requireUser(supabase);
    const extension = file.name.split(".").pop()?.toLowerCase() || file.type.split("/")[1] || "jpg";
    const path = `${user.id}/${purpose}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from(PICKUP_IMAGE_BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });
    if (error) throw new ServiceError(error.message || "The pickup photo could not be uploaded.", 500);
    const { data } = supabase.storage.from(PICKUP_IMAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },

  async getRequests() {
    const supabase = optionalSupabase();
    if (!supabase) { await mockDelay(); return requestStore.map((item) => ({ ...item })); }
    await requireUser(supabase);
    const { data, error } = await supabase.from("pickup_requests").select(pickupSelect).order("created_at", { ascending: false });
    throwDatabaseError(error, "Pickup requests could not be loaded.");
    const rows = data as PickupRow[];
    if (!rows.length) return [];
    const { data: historyData, error: historyError } = await supabase.from("pickup_status_history")
      .select("pickup_id, status, note, created_at").in("pickup_id", rows.map((row) => row.id)).order("created_at");
    throwDatabaseError(historyError, "Pickup status history could not be loaded.");
    const histories = (historyData as HistoryRow[]).reduce<Record<string, HistoryRow[]>>((result, item) => {
      result[item.pickup_id] = [...(result[item.pickup_id] ?? []), item];
      return result;
    }, {});
    return rows.map((row) => requestFromRow(row, histories[row.id]));
  },

  async createPickup(payload: PickupInput) {
    const supabase = optionalSupabase();
    if (!supabase) {
      await mockDelay();
      const request: PickupRequest = {
        id: `ECO-${2058 + requestStore.length}`,
        waste: `${payload.wasteType} waste`,
        fillLevel: payload.fillLevel,
        weight: payload.fillLevel,
        imageUrl: payload.imageUrl,
        notes: payload.notes,
        recycler: "Matching in progress",
        status: "Pending",
        time: "Today, just now",
        eta: "—",
        timeline: [{ status: "Created", time: "just now" }],
      };
      requestStore = [request, ...requestStore];
      return request;
    }

    const user = await requireUser(supabase);
    const { data: profile, error: profileError } = await supabase.from("profiles")
      .select("full_name, organization_name, market_id").eq("id", user.id).single();
    throwDatabaseError(profileError, "Your vendor profile could not be loaded.");
    if (!profile) throw new ServiceError("Your vendor profile could not be loaded.", 404);

    const { data, error } = await supabase.from("pickup_requests").insert({
      vendor_id: user.id,
      market_id: profile.market_id,
      vendor_name: profile.full_name,
      location: profile.organization_name,
      waste_type: payload.wasteType,
      fill_level: payload.fillLevel,
      priority: payload.priority,
      notes: payload.notes || null,
      image_url: payload.imageUrl || null,
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

  async acceptPickup(referenceCode: string) {
    const supabase = optionalSupabase();
    if (!supabase) {
      await mockDelay();
      const job = availableStore.find((item) => item.id === referenceCode);
      if (!job) throw new ServiceError("This pickup is no longer available.", 404);
      const accepted: PickupJob = { ...job, status: "Accepted" };
      availableStore = availableStore.filter((item) => item.id !== referenceCode);
      acceptedStore = [accepted, ...acceptedStore.filter((item) => item.id !== referenceCode)];
      return accepted;
    }
    await requireUser(supabase);
    const id = await pickupId(referenceCode);
    const { data, error } = await supabase.rpc("accept_pickup", { p_pickup_id: id });
    throwDatabaseError(error, "This pickup could not be accepted.");
    return jobFromRow(data as PickupRow);
  },

  async startPickup(referenceCode: string) {
    const supabase = optionalSupabase();
    if (!supabase) {
      await mockDelay();
      const job = acceptedStore.find((item) => item.id === referenceCode);
      if (!job) throw new ServiceError("Pickup job not found.", 404);
      const updated: PickupJob = { ...job, status: "In transit" };
      acceptedStore = acceptedStore.map((item) => item.id === referenceCode ? updated : item);
      return updated;
    }
    await requireUser(supabase);
    const id = await pickupId(referenceCode);
    const { data, error } = await supabase.rpc("update_pickup_status", { p_pickup_id: id, p_status: "in_transit" });
    throwDatabaseError(error, "Pickup status could not be updated.");
    return jobFromRow(data as PickupRow);
  },

  async completePickup(referenceCode: string, payload: PickupCompletionInput) {
    const supabase = optionalSupabase();
    if (!supabase) {
      await mockDelay();
      const job = acceptedStore.find((item) => item.id === referenceCode);
      if (!job) throw new ServiceError("Pickup job not found.", 404);
      const completed: PickupJob = { ...job, status: "Completed", actualWeight: payload.actualWeight, facility: payload.facility, completionImageUrl: payload.completionImageUrl };
      acceptedStore = acceptedStore.map((item) => item.id === referenceCode ? completed : item);
      return completed;
    }
    await requireUser(supabase);
    const id = await pickupId(referenceCode);
    const { data, error } = await supabase.rpc("update_pickup_status", {
      p_pickup_id: id,
      p_status: "completed",
      p_actual_weight: payload.actualWeight,
      p_facility: payload.facility,
      p_completion_notes: payload.notes || null,
      p_completion_image_url: payload.completionImageUrl || null,
    });
    throwDatabaseError(error, "Pickup completion could not be recorded.");
    return jobFromRow(data as PickupRow);
  },

  async getHistory() {
    const supabase = optionalSupabase();
    if (!supabase) {
      await mockDelay();
      return acceptedStore.filter((item) => item.status === "Completed").concat(availableJobs.map((item) => ({ ...item, status: "Completed" as const, actualWeight: 42 })));
    }
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

  async acceptJob(referenceCode: string) {
    return this.acceptPickup(referenceCode);
  },

  async updateStatus(referenceCode: string, status: PickupJob["status"]) {
    if (status !== "In transit") throw new ServiceError("Use the dedicated pickup workflow action.", 400);
    return this.startPickup(referenceCode);
  },
};
