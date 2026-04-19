import { useEffect, useRef } from "react";
import { importLibrary } from "@/lib/google-maps";
import { useGetRideLocation, getGetRideLocationQueryKey } from "@/lib/api-client";

interface Props {
  rideId: number;
  height?: string;
}

const CAR_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="18" fill="#f97316"/><text x="18" y="23" text-anchor="middle" font-size="18">🚗</text></svg>`;

export function LiveMap({ rideId, height = "360px" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const carMarkerRef = useRef<google.maps.Marker | null>(null);
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const serviceRef = useRef<google.maps.DirectionsService | null>(null);

  const { data: loc } = useGetRideLocation(rideId, {
    query: { refetchInterval: 2000, queryKey: getGetRideLocationQueryKey(rideId) },
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      importLibrary("maps"),
      importLibrary("routes"),
    ]).then(() => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = new google.maps.Map(containerRef.current, {
        center: { lat: 40.72, lng: -74.0 },
        zoom: 13,
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
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const service = serviceRef.current;
    const renderer = rendererRef.current;
    if (!map || !service || !renderer || !loc) return;

    const origin = new google.maps.LatLng(loc.currentLat, loc.currentLng);
    const destination = new google.maps.LatLng(loc.destinationLat, loc.destinationLng);

    if (carMarkerRef.current) {
      carMarkerRef.current.setPosition(origin);
    } else {
      carMarkerRef.current = new google.maps.Marker({
        position: origin,
        map,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(CAR_ICON_SVG)}`,
          scaledSize: new google.maps.Size(36, 36),
          anchor: new google.maps.Point(18, 18),
        },
      });
    }

    service.route(
      { origin, destination, travelMode: google.maps.TravelMode.DRIVING },
      (result, status) => {
        if (status === "OK" && result) {
          renderer.setDirections(result);
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(origin);
          bounds.extend(destination);
          map.fitBounds(bounds, 60);
        }
      },
    );
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
