import { useEffect, useRef, useState } from "react";
import { importLibrary } from "@/lib/google-maps";
import { supabase } from "@/lib/supabase";
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from "@/lib/map-defaults";

interface RideLoc {
  status: string;
  currentLat: number;
  currentLng: number;
  destinationLat: number;
  destinationLng: number;
  etaMinutes: number;
  progressPercent: number;
}

interface Props {
  rideId: number;
  height?: string;
  isDriver?: boolean;
}

const CAR_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="18" fill="#f97316"/><text x="18" y="23" text-anchor="middle" font-size="18">🚗</text></svg>`;

function toRideLoc(d: Record<string, unknown>): RideLoc | null {
  if (d.current_lat == null || d.current_lng == null) return null;
  return {
    status: d.status as string,
    currentLat: d.current_lat as number,
    currentLng: d.current_lng as number,
    destinationLat: d.destination_lat as number,
    destinationLng: d.destination_lng as number,
    etaMinutes: (d.eta_minutes as number) ?? 0,
    progressPercent: (d.progress_percent as number) ?? 0,
  };
}

export function LiveMap({ rideId, height = "360px", isDriver = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const carMarkerRef = useRef<google.maps.Marker | null>(null);
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const serviceRef = useRef<google.maps.DirectionsService | null>(null);
  const lastRouteRef = useRef(0);
  const prevStatusRef = useRef<string | null>(null);
  const [loc, setLoc] = useState<RideLoc | null>(null);
  const [pickupEta, setPickupEta] = useState<string | null>(null);

  // Initial fetch + Realtime subscription
  useEffect(() => {
    const cols = "status,current_lat,current_lng,destination_lat,destination_lng,eta_minutes,progress_percent";

    const channel = supabase
      .channel(`ride-loc-${rideId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rides", filter: `id=eq.${rideId}` },
        (payload) => { setLoc(toRideLoc(payload.new as Record<string, unknown>)); },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          supabase.from("rides").select(cols).eq("id", rideId).single()
            .then(({ data }) => { if (data) setLoc(toRideLoc(data as Record<string, unknown>)); });
        }
      });

    return () => { void supabase.removeChannel(channel); };
  }, [rideId]);

  // Init map
  useEffect(() => {
    let cancelled = false;
    Promise.all([importLibrary("maps"), importLibrary("routes")]).then(() => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = new google.maps.Map(containerRef.current, {
        center: { lat: MAP_DEFAULT_CENTER[0], lng: MAP_DEFAULT_CENTER[1] },
        zoom: MAP_DEFAULT_ZOOM,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });
      mapRef.current = map;
      serviceRef.current = new google.maps.DirectionsService();
      rendererRef.current = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: { strokeColor: "#f97316", strokeWeight: 5, strokeOpacity: 0.8 },
      });
      rendererRef.current.setMap(map);

      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          map.setZoom(14);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 },
      );
    });
    return () => { cancelled = true; };
  }, []);

  // Update map when loc changes
  useEffect(() => {
    const map = mapRef.current;
    const service = serviceRef.current;
    const renderer = rendererRef.current;
    if (!map || !service || !renderer || !loc) return;

    const driverPos = new google.maps.LatLng(loc.currentLat, loc.currentLng);

    // Update car marker
    if (carMarkerRef.current) {
      carMarkerRef.current.setPosition(driverPos);
    } else {
      carMarkerRef.current = new google.maps.Marker({
        position: driverPos,
        map,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(CAR_ICON_SVG)}`,
          scaledSize: new google.maps.Size(36, 36),
          anchor: new google.maps.Point(18, 18),
        },
      });
    }

    if (loc.status !== prevStatusRef.current) {
      lastRouteRef.current = 0;
      prevStatusRef.current = loc.status;
    }

    const now = Date.now();
    if (now - lastRouteRef.current < 5000) return;
    lastRouteRef.current = now;

    if (loc.status === "in_progress") {
      // In-trip: route driver → destination
      const destination = new google.maps.LatLng(loc.destinationLat, loc.destinationLng);
      service.route(
        { origin: driverPos, destination, travelMode: google.maps.TravelMode.DRIVING },
        (result, status) => {
          if (status === "OK" && result && rendererRef.current) {
            rendererRef.current.setDirections(result);
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(driverPos);
            bounds.extend(destination);
            map.fitBounds(bounds, 60);
          }
        },
      );
    } else if (!isDriver) {
      // Pickup: try rider's GPS → route driver → rider
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          const riderPos = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
          service.route(
            { origin: driverPos, destination: riderPos, travelMode: google.maps.TravelMode.DRIVING },
            (result, status) => {
              if (status === "OK" && result && rendererRef.current) {
                rendererRef.current.setDirections(result);
                const leg = result.routes[0]?.legs[0];
                setPickupEta(leg?.duration?.text ?? null);
                const bounds = new google.maps.LatLngBounds();
                bounds.extend(driverPos);
                bounds.extend(riderPos);
                map.fitBounds(bounds, 60);
              }
            },
          );
        },
        () => {
          // Rider GPS unavailable — just center on driver
          map.panTo(driverPos);
          map.setZoom(14);
        },
      );
    } else {
      // Driver viewing their own ride in scheduled state — just center on their position
      map.panTo(driverPos);
      map.setZoom(14);
    }
  }, [loc]);

  return (
    <div className="rounded-2xl overflow-hidden ring-1 ring-border/40 relative">
      <div ref={containerRef} style={{ height, width: "100%" }} />

      {loc?.status === "in_progress" && (
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur px-4 py-2.5 rounded-full shadow-lg flex items-center gap-3 z-[1000]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold">In progress</span>
          </div>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs font-medium">ETA {loc.etaMinutes}m</span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs font-medium">{loc.progressPercent}%</span>
        </div>
      )}

      {loc && loc.status === "scheduled" && (
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur px-4 py-2.5 rounded-full shadow-lg flex items-center gap-3 z-[1000]">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-semibold">Driver on the way</span>
          {pickupEta && (
            <>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs font-medium">{pickupEta} away</span>
            </>
          )}
        </div>
      )}

      {loc?.status === "completed" && (
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 z-[1000]">
          <div className="w-2 h-2 rounded-full bg-gray-400" />
          <span className="text-xs font-semibold">Ride completed</span>
        </div>
      )}

      {!loc && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-[1000]">
          <span className="text-xs text-muted-foreground">Waiting for driver to start…</span>
        </div>
      )}
    </div>
  );
}
