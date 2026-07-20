import type { RealtimeChannel } from "@supabase/supabase-js";
import type { DriverLocation } from "@/types/mvp";
import { ServiceError } from "@/services/service-error";
import {
  optionalSupabase,
  requireUser,
} from "@/services/supabase.data";

type DriverLocationRow = {
  driver_id: string;
  latitude: number;
  longitude: number;
  accuracy_m: number | string | null;
  speed_mps: number | string | null;
  heading_degrees: number | string | null;
  recorded_at: string;
};

export type LocationUpdate = {
  latitude: number;
  longitude: number;
  accuracyM?: number;
  speedMps?: number;
  headingDegrees?: number;
};

const select =
  "driver_id, latitude, longitude, accuracy_m, speed_mps, heading_degrees, recorded_at";

const client = () => {
  const supabase = optionalSupabase();
  if (!supabase) {
    throw new ServiceError(
      "Supabase is not configured. Live tracking is unavailable.",
      503,
    );
  }
  return supabase;
};

const fromRow = (row: DriverLocationRow): DriverLocation => ({
  driverId: row.driver_id,
  latitude: Number(row.latitude),
  longitude: Number(row.longitude),
  accuracyM: row.accuracy_m === null ? undefined : Number(row.accuracy_m),
  speedMps: row.speed_mps === null ? undefined : Number(row.speed_mps),
  headingDegrees:
    row.heading_degrees === null ? undefined : Number(row.heading_degrees),
  recordedAt: row.recorded_at,
});

const trackingError = (message: string) =>
  message.includes("driver_locations") ||
  message.includes("update_driver_live_location")
    ? "Live tracking is not configured in Supabase. Run the latest tracking migration."
    : message;

export const trackingService = {
  async getDriverLocation(driverId: string) {
    const supabase = client();
    await requireUser(supabase);
    const { data, error } = await supabase
      .from("driver_locations")
      .select(select)
      .eq("driver_id", driverId)
      .maybeSingle();
    if (error) {
      throw new ServiceError(trackingError(error.message), 500);
    }
    return data ? fromRow(data as DriverLocationRow) : null;
  },

  async updateLocation(update: LocationUpdate) {
    const supabase = client();
    await requireUser(supabase);
    const { data, error } = await supabase.rpc("update_driver_live_location", {
      p_latitude: update.latitude,
      p_longitude: update.longitude,
      p_accuracy_m: update.accuracyM ?? null,
      p_speed_mps: update.speedMps ?? null,
      p_heading_degrees: update.headingDegrees ?? null,
    });
    if (error) {
      throw new ServiceError(trackingError(error.message), 500);
    }
    return fromRow(data as DriverLocationRow);
  },

  subscribeToDriver(
    driverId: string,
    onLocation: (location: DriverLocation) => void,
  ) {
    const supabase = client();
    let channel: RealtimeChannel | null = supabase
      .channel(`driver-location:${driverId}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_locations",
          filter: `driver_id=eq.${driverId}`,
        },
        (payload) => {
          if (payload.new && Object.keys(payload.new).length) {
            onLocation(fromRow(payload.new as DriverLocationRow));
          }
        },
      )
      .subscribe();

    return () => {
      if (channel) void supabase.removeChannel(channel);
      channel = null;
    };
  },
};
