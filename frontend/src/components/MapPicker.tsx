import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { LocateFixed, MapPin, Loader2 } from "lucide-react";

const PIN_ICON = L.divIcon({
  className: "",
  html: `<div style="width:32px;height:32px;transform:translate(-50%,-100%);">
    <svg viewBox="0 0 24 24" width="32" height="32" fill="hsl(var(--primary))" stroke="white" stroke-width="1.5">
      <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/>
      <circle cx="12" cy="9" r="2.5" fill="white"/>
    </svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

interface Props {
  value: string;
  onChange: (address: string, lat: number, lng: number) => void;
  height?: string;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=0`,
      { headers: { "Accept-Language": "en" } },
    );
    const json = await res.json();
    return json.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

export function MapPicker({ value, onChange, height = "260px" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);

  const setPoint = async (lat: number, lng: number) => {
    if (!mapRef.current) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon: PIN_ICON }).addTo(mapRef.current);
    }
    mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), 15));
    setResolving(true);
    const addr = await reverseGeocode(lat, lng);
    setResolving(false);
    onChange(addr, lat, lng);
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false }).setView([40.7128, -74.006], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => {
      void setPoint(e.latlng.lat, e.latlng.lng);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating(false);
        await setPoint(pos.coords.latitude, pos.coords.longitude);
      },
      () => { setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" /> Tap the map to drop a pin, or use your current location.
        </p>
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={useCurrentLocation} disabled={locating}>
          {locating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5 mr-1" />}
          Use current location
        </Button>
      </div>
      <div ref={containerRef} className="w-full rounded-xl overflow-hidden ring-1 ring-border/50" style={{ height }} />
      <div className="text-sm rounded-lg bg-muted/50 px-3 py-2 min-h-[2.5rem] flex items-center">
        {resolving ? (
          <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Looking up address…</span>
        ) : value ? (
          <span className="text-foreground">{value}</span>
        ) : (
          <span className="text-muted-foreground">No pickup location selected yet.</span>
        )}
      </div>
    </div>
  );
}
