"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Clock3, ExternalLink, LocateFixed, Radio, Truck } from "lucide-react";
import { Panel } from "@/components/dashboard/primitives";
import { trackingService } from "@/services/tracking.service";
import type { DriverLocation } from "@/types/mvp";
import { cn } from "@/lib/utils";

const LiveTrackingMap = dynamic(
  () =>
    import("@/components/dashboard/live-tracking-map").then(
      (module) => module.LiveTrackingMap,
    ),
  {
    ssr: false,
    loading: () => <div className="h-52 animate-pulse bg-slate-100 sm:h-80 dark:bg-slate-950" />,
  },
);

const activeStatuses = new Set([
  "Assigned",
  "Accepted",
  "In transit",
  "Arrived",
  "Collected",
]);

const ageLabel = (recordedAt: string, now: number) => {
  const seconds = Math.max(
    0,
    Math.floor((now - new Date(recordedAt).getTime()) / 1000),
  );
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ago`;
};

const distanceBetween = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) => {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

export function LivePickupTracking({
  driverId,
  status,
  destinationLatitude,
  destinationLongitude,
  compact = false,
}: {
  driverId?: string;
  status?: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
  compact?: boolean;
}) {
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [loading, setLoading] = useState(Boolean(driverId));
  const [error, setError] = useState("");
  const [clock, setClock] = useState(() => Date.now());
  const isActive = Boolean(driverId && status && activeStatuses.has(status));

  useEffect(() => {
    if (!driverId || !isActive) {
      return;
    }
    let active = true;
    const resetTimer = window.setTimeout(() => {
      if (active) {
        setLoading(true);
        setError("");
        setLocation(null);
      }
    }, 0);
    trackingService
      .getDriverLocation(driverId)
      .then((value) => {
        if (active) setLocation(value);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Live location could not be loaded.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const unsubscribe = trackingService.subscribeToDriver(driverId, (value) => {
      if (active) {
        setLocation(value);
        setError("");
        setLoading(false);
      }
    });
    return () => {
      active = false;
      window.clearTimeout(resetTimer);
      unsubscribe();
    };
  }, [driverId, isActive]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const destination = useMemo(
    () =>
      destinationLatitude !== undefined && destinationLongitude !== undefined
        ? { latitude: destinationLatitude, longitude: destinationLongitude }
        : undefined,
    [destinationLatitude, destinationLongitude],
  );
  const stale = location
    ? clock - new Date(location.recordedAt).getTime() > 60_000
    : true;
  const navigationUrl = destination
    ? `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`
    : undefined;
  const distanceKm =
    location && destination ? distanceBetween(location, destination) : undefined;
  const estimatedMinutes =
    distanceKm !== undefined
      ? Math.max(
          1,
          Math.round(
            (distanceKm * 1000) /
              Math.max(location?.speedMps && location.speedMps > 2 ? location.speedMps : 6, 1) /
              60,
          ),
        )
      : undefined;

  if (!isActive) return null;

  return (
    <Panel
      title="Live pickup tracking"
      subtitle="Foreground GPS updates from the assigned driver"
      action={
        navigationUrl ? (
          <a
            href={navigationUrl}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-10 items-center gap-1.5 text-[10px] font-semibold text-emerald-600"
          >
            Open directions <ExternalLink className="size-3.5" />
          </a>
        ) : undefined
      }
    >
      {loading ? (
        <div className="h-52 animate-pulse bg-slate-100 sm:h-80 dark:bg-slate-950" />
      ) : error ? (
        <div className="p-4 text-center text-xs sm:p-5 text-rose-600">{error}</div>
      ) : (
        <div className={cn("grid", !compact && "xl:grid-cols-[1fr_16rem]")}>
          <LiveTrackingMap
            driver={
              location
                ? {
                    latitude: location.latitude,
                    longitude: location.longitude,
                  }
                : undefined
            }
            destination={destination}
          />
          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3 dark:border-slate-800 xl:grid-cols-1 xl:border-l xl:border-t-0 xl:p-4">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold">
                <Radio className={cn("size-3.5", stale ? "text-amber-500" : "animate-pulse text-emerald-500")} />
                {location ? (stale ? "Location delayed" : "Driver live") : "Waiting for driver GPS"}
              </p>
              <p className="mt-1 text-[9px] text-slate-400">
                {location ? `Updated ${ageLabel(location.recordedAt, clock)}` : "The driver must start live tracking."}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold">
                <LocateFixed className="size-3.5 text-blue-500" /> GPS accuracy
              </p>
              <p className="mt-1 text-[9px] text-slate-400">
                {location?.accuracyM !== undefined
                  ? `Within ${Math.round(location.accuracyM)} metres`
                  : "Not reported"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold">
                <Truck className="size-3.5 text-emerald-500" /> Vehicle speed
              </p>
              <p className="mt-1 text-[9px] text-slate-400">
                {location?.speedMps !== undefined
                  ? `${Math.round(location.speedMps * 3.6)} km/h`
                  : "Not reported"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold">
                <Clock3 className="size-3.5 text-violet-500" /> Approx. arrival
              </p>
              <p className="mt-1 text-[9px] text-slate-400">
                {estimatedMinutes !== undefined && distanceKm !== undefined
                  ? `${estimatedMinutes} min · ${distanceKm.toFixed(1)} km direct`
                  : "Waiting for driver and destination."}
              </p>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
