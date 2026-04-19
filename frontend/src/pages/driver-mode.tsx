import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { importLibrary } from "@/lib/google-maps";
import { useGetRide, useCompleteRide, useGetMe } from "@/lib/api-client";
import { useDriverLocation } from "@/hooks/use-driver-location";
import { MAP_DEFAULT_CENTER } from "@/lib/map-defaults";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle } from "lucide-react";

const CAR_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="18" fill="#f97316"/><text x="18" y="23" text-anchor="middle" font-size="18">🚗</text></svg>`;

export default function DriverModePage({ rideId }: { rideId: number }) {
  const [, setLocation] = useLocation();
  const { data: me } = useGetMe();
  const { data: ride } = useGetRide(rideId);
  const complete = useCompleteRide();
  const { coords, error: gpsError } = useDriverLocation(rideId);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const serviceRef = useRef<google.maps.DirectionsService | null>(null);
  const lastRouteRef = useRef(0);

  // Redirect non-drivers
  useEffect(() => {
    if (me && ride && me.id !== ride.driverId) {
      setLocation(`/rides/${rideId}`);
    }
  }, [me, ride, rideId, setLocation]);

  // Init map
  useEffect(() => {
    let cancelled = false;
    Promise.all([importLibrary("maps"), importLibrary("routes")]).then(() => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = new google.maps.Map(containerRef.current, {
        center: { lat: MAP_DEFAULT_CENTER[0], lng: MAP_DEFAULT_CENTER[1] },
        zoom: 15,
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

  // Update map when driver moves
  useEffect(() => {
    const map = mapRef.current;
    const service = serviceRef.current;
    if (!map || !service || !coords || !ride?.destinationLat || !ride?.destinationLng) return;

    const origin = new google.maps.LatLng(coords.lat, coords.lng);
    const destination = new google.maps.LatLng(ride.destinationLat, ride.destinationLng);

    if (markerRef.current) {
      markerRef.current.setPosition(origin);
    } else {
      markerRef.current = new google.maps.Marker({
        position: origin,
        map,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(CAR_ICON_SVG)}`,
          scaledSize: new google.maps.Size(36, 36),
          anchor: new google.maps.Point(18, 18),
        },
      });
    }
    map.panTo(origin);

    const now = Date.now();
    if (now - lastRouteRef.current >= 5000) {
      lastRouteRef.current = now;
      service.route(
        { origin, destination, travelMode: google.maps.TravelMode.DRIVING },
        (result, status) => {
          if (status === "OK" && result && rendererRef.current) {
            rendererRef.current.setDirections(result);
          }
        },
      );
    }
  }, [coords, ride]);

  const handleEndRide = () => {
    complete.mutate(
      { rideId },
      { onSuccess: () => setLocation(`/rides/${rideId}`) },
    );
  };

  return (
    <div className="relative w-full h-screen">
      <div ref={containerRef} className="w-full h-full" />

      {/* Top bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur px-5 py-2.5 rounded-full shadow-lg flex items-center gap-3 z-[1000]">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-sm font-semibold">Driver mode — broadcasting GPS</span>
        {ride?.passengers && (
          <span className="text-xs text-muted-foreground">· {ride.passengers.length} passenger{ride.passengers.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* GPS error */}
      {gpsError && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-full shadow flex items-center gap-2 z-[1000]">
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs">GPS unavailable: {gpsError}</span>
        </div>
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000]">
        <Button
          size="lg"
          className="rounded-full px-8 shadow-lg"
          onClick={handleEndRide}
          disabled={complete.isPending || !ride || ride.status !== "in_progress"}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {complete.isPending ? "Ending…" : "End Ride"}
        </Button>
      </div>
    </div>
  );
}
