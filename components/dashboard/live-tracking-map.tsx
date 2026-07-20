"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";

type Point = { latitude: number; longitude: number };

export function LiveTrackingMap({
  driver,
  destination,
}: {
  driver?: Point;
  destination?: Point;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const markers = useRef<LayerGroup | null>(null);

  useEffect(() => {
    let active = true;

    const renderMap = async () => {
      if (!container.current) return;
      const leaflet = await import("leaflet");
      if (!active || !container.current) return;

      if (!map.current) {
        map.current = leaflet.map(container.current, {
          zoomControl: true,
          attributionControl: true,
        });
        leaflet
          .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          })
          .addTo(map.current);
        markers.current = leaflet.layerGroup().addTo(map.current);
      }

      markers.current?.clearLayers();
      const points: Array<[number, number]> = [];
      if (driver) {
        const point: [number, number] = [driver.latitude, driver.longitude];
        points.push(point);
        leaflet
          .circleMarker(point, {
            radius: 9,
            color: "#ffffff",
            weight: 3,
            fillColor: "#16a34a",
            fillOpacity: 1,
          })
          .bindTooltip("Driver", { permanent: false })
          .addTo(markers.current!);
      }
      if (destination) {
        const point: [number, number] = [
          destination.latitude,
          destination.longitude,
        ];
        points.push(point);
        leaflet
          .circleMarker(point, {
            radius: 8,
            color: "#ffffff",
            weight: 3,
            fillColor: "#2563eb",
            fillOpacity: 1,
          })
          .bindTooltip("Pickup", { permanent: false })
          .addTo(markers.current!);
      }
      if (driver && destination) {
        leaflet
          .polyline(
            [
              [driver.latitude, driver.longitude],
              [destination.latitude, destination.longitude],
            ],
            { color: "#16a34a", weight: 3, dashArray: "7 8" },
          )
          .addTo(markers.current!);
      }

      if (points.length > 1) {
        map.current.fitBounds(leaflet.latLngBounds(points), {
          padding: [36, 36],
          maxZoom: 16,
        });
      } else if (points[0]) {
        map.current.setView(points[0], 15);
      } else {
        map.current.setView([12.800494, 77.713615], 13);
      }
      window.setTimeout(() => map.current?.invalidateSize(), 0);
    };

    void renderMap();
    return () => {
      active = false;
    };
  }, [destination, driver]);

  useEffect(
    () => () => {
      map.current?.remove();
      map.current = null;
      markers.current = null;
    },
    [],
  );

  return (
    <div
      ref={container}
      className="h-64 w-full bg-slate-100 sm:h-80 dark:bg-slate-950"
      aria-label="Live driver tracking map"
    />
  );
}
