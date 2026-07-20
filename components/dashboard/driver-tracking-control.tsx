"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LocateFixed, MapPinOff, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackingService } from "@/services/tracking.service";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "ecoloop-driver-live-tracking";
const MIN_UPDATE_INTERVAL_MS = 10_000;
const MIN_MOVEMENT_METRES = 25;

type LastSent = {
  latitude: number;
  longitude: number;
  at: number;
};

const distanceMetres = (a: LastSent, latitude: number, longitude: number) => {
  const radians = (value: number) => (value * Math.PI) / 180;
  const latDelta = radians(latitude - a.latitude);
  const lngDelta = radians(longitude - a.longitude);
  const originLat = radians(a.latitude);
  const targetLat = radians(latitude);
  const value =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(originLat) *
      Math.cos(targetLat) *
      Math.sin(lngDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

export function DriverTrackingControl() {
  const watchId = useRef<number | null>(null);
  const lastSent = useRef<LastSent | null>(null);
  const sending = useRef(false);
  const startingRef = useRef(false);
  const [tracking, setTracking] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState<string>();

  const stop = useCallback(() => {
    if (watchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    watchId.current = null;
    lastSent.current = null;
    localStorage.removeItem(STORAGE_KEY);
    startingRef.current = false;
    setTracking(false);
    setStarting(false);
  }, []);

  const start = useCallback(() => {
    if (watchId.current !== null || startingRef.current) return;
    if (!navigator.geolocation) {
      setError("Location tracking is not supported on this device.");
      return;
    }
    startingRef.current = true;
    setStarting(true);
    setError("");
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        const previous = lastSent.current;
        const elapsed = previous ? now - previous.at : Infinity;
        const moved = previous
          ? distanceMetres(
              previous,
              position.coords.latitude,
              position.coords.longitude,
            )
          : Infinity;
        if (
          sending.current ||
          (elapsed < MIN_UPDATE_INTERVAL_MS && moved < MIN_MOVEMENT_METRES)
        ) {
          return;
        }

        sending.current = true;
        void trackingService
          .updateLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyM: position.coords.accuracy,
            speedMps: position.coords.speed ?? undefined,
            headingDegrees: position.coords.heading ?? undefined,
          })
          .then((location) => {
            lastSent.current = {
              latitude: location.latitude,
              longitude: location.longitude,
              at: Date.now(),
            };
            localStorage.setItem(STORAGE_KEY, "on");
            setTracking(true);
            startingRef.current = false;
            setStarting(false);
            setError("");
            setLastUpdate(location.recordedAt);
          })
          .catch((reason: unknown) => {
            setError(
              reason instanceof Error
                ? reason.message
                : "Live location could not be shared.",
            );
            stop();
          })
          .finally(() => {
            sending.current = false;
          });
      },
      (reason) => {
        setError(
          reason.code === reason.PERMISSION_DENIED
            ? "Allow location access to start live tracking."
            : "Your current location could not be determined.",
        );
        stop();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5_000,
        timeout: 15_000,
      },
    );
  }, [stop]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localStorage.getItem(STORAGE_KEY) === "on") start();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      stop();
    };
  }, [start, stop]);

  useEffect(() => {
    const startTracking = () => start();
    const stopTracking = () => stop();
    window.addEventListener("ecoloop:start-live-tracking", startTracking);
    window.addEventListener("ecoloop:stop-live-tracking", stopTracking);
    return () => {
      window.removeEventListener("ecoloop:start-live-tracking", startTracking);
      window.removeEventListener("ecoloop:stop-live-tracking", stopTracking);
    };
  }, [start, stop]);

  const label = tracking
    ? "Live"
    : starting
      ? "Starting"
      : "Start tracking";
  const title = error
    ? error
    : tracking
      ? `Live tracking active${lastUpdate ? ` · updated ${new Date(lastUpdate).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : ""}. Tap to stop.`
      : "Share live GPS while collecting. Tracking works while EcoLoop remains open.";

  return (
    <Button
      type="button"
      variant={tracking ? "default" : "outline"}
      size="sm"
      disabled={starting}
      onClick={tracking ? stop : start}
      title={title}
      aria-label={title}
      className={cn(
        "h-9 shrink-0 gap-1.5 px-2.5",
        error && "border-rose-200 text-rose-600",
      )}
    >
      {error ? (
        <MapPinOff className="size-4" />
      ) : tracking ? (
        <Radio className="size-4 animate-pulse" />
      ) : (
        <LocateFixed className="size-4" />
      )}
      <span className="hidden text-[10px] font-semibold sm:inline">{label}</span>
      <span className="sr-only">{error}</span>
    </Button>
  );
}
