import type {
  FillLevel,
  PickupCompletionInput,
  PickupInput,
  PickupJob,
  PickupRequest,
  PickupTimelineItem,
} from "@/types/mvp";
import { ServiceError } from "@/services/service-error";
import { optionalSupabase, relativeTime, requireUser, throwDatabaseError } from "@/services/supabase.data";
import { isWithinOperatingHours } from "@/lib/operating-hours";

const PICKUP_IMAGE_BUCKET = "pickup-images";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

type PickupStatus = "pending" | "assigned" | "accepted" | "in_transit" | "arrived" | "collected" | "completed" | "cancelled";

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
  assigned_driver_id: string | null;
  assigned_vehicle: string | null;
  assignment_time: string | null;
  estimated_arrival: string | null;
  route_stop_order: number | null;
  vendor_latitude: number | null;
  vendor_longitude: number | null;
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

const requirePickupClient = () => {
  const supabase = optionalSupabase();
  if (!supabase) throw new ServiceError("Supabase is not configured. Pickup data cannot be loaded.", 503);
  return supabase;
};

const statusLabel = (status: PickupStatus) => ({
  pending: "Pending",
  assigned: "Assigned",
  accepted: "Accepted",
  in_transit: "In transit",
  arrived: "Arrived",
  collected: "Collected",
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
  recycler: row.assigned_driver_id
    ? "Assigned driver"
    : row.recycler_id
      ? "Verified recycling partner"
      : isWithinOperatingHours()
        ? "Batching nearby requests"
        : "Queued for the 6:00 AM shift",
  status: statusLabel(row.status),
  time: relativeTime(row.created_at),
  eta: row.estimated_arrival
    ? new Intl.DateTimeFormat("en-IN", {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(row.estimated_arrival))
    : row.status === "pending"
      ? isWithinOperatingHours()
        ? "Matching shortly"
        : "After 6:00 AM"
      : "—",
  assignedVehicle: row.assigned_vehicle ?? undefined,
  assignedDriverId: row.assigned_driver_id ?? undefined,
  estimatedArrival: row.estimated_arrival ?? undefined,
  routeStopOrder: row.route_stop_order ?? undefined,
  vendorLatitude: row.vendor_latitude ?? undefined,
  vendorLongitude: row.vendor_longitude ?? undefined,
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
  status: row.status === "pending" ? "Batching" : statusLabel(row.status) as PickupJob["status"],
  assignedVehicle: row.assigned_vehicle ?? undefined,
  assignedDriverId: row.assigned_driver_id ?? undefined,
  estimatedArrival: row.estimated_arrival ?? undefined,
  routeStopOrder: row.route_stop_order ?? undefined,
  vendorLatitude: row.vendor_latitude ?? undefined,
  vendorLongitude: row.vendor_longitude ?? undefined,
});

const pickupSelect = "id, reference_code, vendor_name, location, waste_type, fill_level, actual_weight, priority, notes, image_url, completion_image_url, facility, status, recycler_id, created_at, assigned_driver_id, assigned_vehicle, assignment_time, estimated_arrival, route_stop_order, vendor_latitude, vendor_longitude";

const pickupId = async (referenceCode: string) => {
  const supabase = requirePickupClient();
  const { data, error } = await supabase.from("pickup_requests").select("id").eq("reference_code", referenceCode).single();
  throwDatabaseError(error, "Pickup job not found.");
  if (!data) throw new ServiceError("Pickup job not found.", 404);
  return data.id;
};

export const pickupService = {
  subscribeToRequests(onChange: () => void) {
    const supabase = requirePickupClient();
    const channel = supabase
      .channel(`pickup-requests:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pickup_requests" },
        onChange,
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  },

  async uploadPickupImage(file: File, purpose: "pickup" | "completion" = "pickup") {
    if (!IMAGE_TYPES.includes(file.type)) throw new ServiceError("Use a JPG, PNG, or WEBP image.", 400);
    if (file.size > MAX_IMAGE_SIZE) throw new ServiceError("The image must be 5 MB or smaller.", 400);
    const supabase = requirePickupClient();
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
    const supabase = requirePickupClient();
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
    const supabase = requirePickupClient();
    const user = await requireUser(supabase);
    const { data: profile, error: profileError } = await supabase.from("profiles")
      .select("full_name, organization_name, phone, market_id").eq("id", user.id).single();
    throwDatabaseError(profileError, "Your vendor profile could not be loaded.");
    if (!profile) throw new ServiceError("Your vendor profile could not be loaded.", 404);

    const { data, error } = await supabase.from("pickup_requests").insert({
      vendor_id: user.id,
      market_id: profile.market_id,
      vendor_name: profile.full_name,
      location: profile.organization_name,
      vendor_phone: profile.phone,
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
    const supabase = requirePickupClient();
    await requireUser(supabase);
    const { data, error } = await supabase.from("pickup_requests").select(pickupSelect).eq("status", "pending").order("created_at");
    throwDatabaseError(error, "Available pickups could not be loaded.");
    return (data as PickupRow[]).map(jobFromRow);
  },

  async getAcceptedJobs() {
    const supabase = requirePickupClient();
    const user = await requireUser(supabase);
    const { data, error } = await supabase.from("pickup_requests").select(pickupSelect)
      .eq("recycler_id", user.id).in("status", ["accepted", "in_transit"]).order("accepted_at", { ascending: false });
    throwDatabaseError(error, "Accepted pickups could not be loaded.");
    return (data as PickupRow[]).map(jobFromRow);
  },

  async acceptPickup(referenceCode: string) {
    void referenceCode;
    throw new ServiceError("Pickup jobs are assigned automatically to eligible drivers after the batching window.", 409);
  },

  async startPickup(referenceCode: string) {
    const supabase = requirePickupClient();
    await requireUser(supabase);
    const id = await pickupId(referenceCode);
    const { data, error } = await supabase.rpc("update_pickup_status", { p_pickup_id: id, p_status: "in_transit" });
    throwDatabaseError(error, "Pickup status could not be updated.");
    return jobFromRow(data as PickupRow);
  },

  async completePickup(referenceCode: string, payload: PickupCompletionInput) {
    const supabase = requirePickupClient();
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
    const supabase = requirePickupClient();
    await requireUser(supabase);
    const { data, error } = await supabase.from("pickup_requests").select(pickupSelect).eq("status", "completed").order("completed_at", { ascending: false });
    throwDatabaseError(error, "Pickup history could not be loaded.");
    return (data as PickupRow[]).map(jobFromRow);
  },

  async getVehicles() {
    const supabase = requirePickupClient();
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
