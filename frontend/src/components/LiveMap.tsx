import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useGetRideLocation, getGetRideLocationQueryKey } from "@/lib/api-client";

interface Props {
  rideId: number;
  height?: string;
}

const carIcon = L.divIcon({
  className: "",
  html: `<div style="background:#f97316;color:white;border-radius:9999px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(249,115,22,.5);border:3px solid white;font-size:18px;">🚗</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="background:#10b981;color:white;border-radius:9999px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(16,185,129,.4);border:3px solid white;font-size:14px;">📍</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export function LiveMap({ rideId, height = "360px" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const carMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  const { data: loc } = useGetRideLocation(rideId, {
    query: { refetchInterval: 2000, queryKey: getGetRideLocationQueryKey(rideId) },
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false }).setView([40.72, -74.0], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      carMarkerRef.current = null;
      polylineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loc) return;

    const start: L.LatLngExpression = [loc.currentLat, loc.currentLng];
    const dest: L.LatLngExpression = [loc.destinationLat, loc.destinationLng];

    if (!polylineRef.current) {
      polylineRef.current = L.polyline([start, dest], { color: "#f97316", weight: 5, opacity: 0.7, dashArray: "8 8" }).addTo(map);
      L.marker(dest, { icon: pinIcon }).addTo(map).bindPopup("Destination");
      map.fitBounds(L.latLngBounds([start, dest]).pad(0.3));
    } else {
      polylineRef.current.setLatLngs([start, dest]);
    }

    if (!carMarkerRef.current) {
      carMarkerRef.current = L.marker(start, { icon: carIcon }).addTo(map);
    } else {
      carMarkerRef.current.setLatLng(start);
    }
  }, [loc]);

  return (
    <div className="rounded-2xl overflow-hidden ring-1 ring-border/40 relative">
      <div ref={containerRef} style={{ height, width: "100%" }} />
      {loc && (
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur px-4 py-2.5 rounded-full shadow-lg flex items-center gap-3 z-[1000]">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${loc.status === "in_progress" ? "bg-emerald-500 animate-pulse" : loc.status === "completed" ? "bg-gray-400" : "bg-amber-500"}`} />
            <span className="text-xs font-semibold capitalize">{loc.status.replace("_", " ")}</span>
          </div>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs font-medium">ETA {loc.etaMinutes}m</span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs font-medium">{loc.progressPercent}%</span>
        </div>
      )}
    </div>
  );
}
