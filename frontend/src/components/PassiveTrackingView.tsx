import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { importLibrary } from "@/lib/google-maps";
import { supabase } from "@/lib/supabase";
import { haversineKm } from "@/lib/matching";
import { MAP_DEFAULT_CENTER } from "@/lib/map-defaults";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RideChat } from "@/components/RideChat";
import { CarFront, Clock, ArrowRight, Navigation, CheckCircle2 } from "lucide-react";

// ── Icons ─────────────────────────────────────────────────────────────────────

const CAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <circle cx="20" cy="20" r="20" fill="#f97316" opacity="0.95"/>
  <text x="20" y="26" text-anchor="middle" font-size="20">🚗</text>
</svg>`;

const YOU_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
  <circle cx="18" cy="18" r="18" fill="#3b82f6" opacity="0.95"/>
  <text x="18" y="24" text-anchor="middle" font-size="18">📍</text>
</svg>`;

// ── Types ─────────────────────────────────────────────────────────────────────

interface RideLoc {
  status: string;
  currentLat: number | null;
  currentLng: number | null;
  etaMinutes: number;
  progressPercent: number;
}

interface Props {
  ride: any;
  currentUserId?: string;
  currentUserName?: string;
}

function initials(n: string) {
  return n.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PassiveTrackingView({ ride, currentUserId, currentUserName }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const carMarkerRef = useRef<google.maps.Marker | null>(null);
  const youMarkerRef = useRef<google.maps.Marker | null>(null);
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const serviceRef = useRef<google.maps.DirectionsService | null>(null);
  const lastRouteRef = useRef(0);
  const riderPosRef = useRef<{ lat: number; lng: number } | null>(null);

  const [loc, setLoc] = useState<RideLoc | null>(null);
  const [pickupEta, setPickupEta] = useState<string | null>(null);
  const [driverDist, setDriverDist] = useState<string | null>(null);
  const [isArriving, setIsArriving] = useState(false);

  const driver = ride?.driver;
  const dest = ride?.event?.name ?? ride?.masjid?.name ?? ride?.errand?.title ?? "your destination";

  // Subscribe to ride location via Realtime
  useEffect(() => {
    if (!ride?.id) return;
    const cols = "status,current_lat,current_lng,eta_minutes,progress_percent";

    const channel = supabase
      .channel(`passive-track-${ride.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rides", filter: `id=eq.${ride.id}` },
        (payload) => {
          const d = payload.new as any;
          setLoc({
            status: d.status,
            currentLat: d.current_lat ?? null,
            currentLng: d.current_lng ?? null,
            etaMinutes: d.eta_minutes ?? 0,
            progressPercent: d.progress_percent ?? 0,
          });
        }
      )
      .subscribe((s) => {
        if (s === "SUBSCRIBED") {
          supabase.from("rides").select(cols).eq("id", ride.id).single().then(({ data }) => {
            if (data) {
              setLoc({
                status: (data as any).status,
                currentLat: (data as any).current_lat ?? null,
                currentLng: (data as any).current_lng ?? null,
                etaMinutes: (data as any).eta_minutes ?? 0,
                progressPercent: (data as any).progress_percent ?? 0,
              });
            }
          });
        }
      });

    return () => { void supabase.removeChannel(channel); };
  }, [ride?.id]);

  // Get rider's current location once
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => { riderPosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // Init map
  useEffect(() => {
    let cancelled = false;
    Promise.all([importLibrary("maps"), importLibrary("routes")]).then(() => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = new google.maps.Map(containerRef.current, {
        center: { lat: MAP_DEFAULT_CENTER[0], lng: MAP_DEFAULT_CENTER[1] },
        zoom: 14,
        zoomControl: false,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        gestureHandling: "greedy",
      });
      mapRef.current = map;
      serviceRef.current = new google.maps.DirectionsService();
      rendererRef.current = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: { strokeColor: "#f97316", strokeWeight: 5, strokeOpacity: 0.85 },
      });
      rendererRef.current.setMap(map);

      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 },
      );
    });
    return () => { cancelled = true; };
  }, []);

  // Update map + proximity on each loc change
  useEffect(() => {
    const map = mapRef.current;
    const service = serviceRef.current;
    const renderer = rendererRef.current;
    if (!map || !service || !renderer || !loc?.currentLat || !loc.currentLng) return;

    const driverPos = new google.maps.LatLng(loc.currentLat, loc.currentLng);

    // Move car marker
    if (carMarkerRef.current) {
      carMarkerRef.current.setPosition(driverPos);
    } else {
      carMarkerRef.current = new google.maps.Marker({
        position: driverPos, map, zIndex: 999,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(CAR_SVG)}`,
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 20),
        },
      });
    }

    // Place/update rider's "You" pin
    const riderPos = riderPosRef.current;
    if (riderPos) {
      const rLatLng = new google.maps.LatLng(riderPos.lat, riderPos.lng);
      if (youMarkerRef.current) {
        youMarkerRef.current.setPosition(rLatLng);
      } else {
        youMarkerRef.current = new google.maps.Marker({
          position: rLatLng, map, zIndex: 998,
          title: "You",
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(YOU_SVG)}`,
            scaledSize: new google.maps.Size(36, 36),
            anchor: new google.maps.Point(18, 18),
          },
        });
      }

      // Proximity check — arriving if < 150m
      const distKm = haversineKm(loc.currentLat, loc.currentLng, riderPos.lat, riderPos.lng);
      setIsArriving(distKm < 0.15);
      setDriverDist(distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`);
    }

    // Throttle route calls to every 5s
    const now = Date.now();
    if (now - lastRouteRef.current < 5000) return;
    lastRouteRef.current = now;

    if (riderPos && loc.status !== "in_progress") {
      // Pre-pickup: route driver → rider
      const rLatLng = new google.maps.LatLng(riderPos.lat, riderPos.lng);
      service.route(
        { origin: driverPos, destination: rLatLng, travelMode: google.maps.TravelMode.DRIVING },
        (result, status) => {
          if (status === "OK" && result && rendererRef.current) {
            rendererRef.current.setDirections(result);
            const leg = result.routes[0]?.legs[0];
            setPickupEta(leg?.duration?.text ?? null);
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(driverPos);
            bounds.extend(rLatLng);
            map.fitBounds(bounds, 60);
          }
        }
      );
    } else if (ride?.destinationLat && ride?.destinationLng) {
      // Post-pickup: route driver → destination
      const destPos = new google.maps.LatLng(ride.destinationLat, ride.destinationLng);
      service.route(
        { origin: driverPos, destination: destPos, travelMode: google.maps.TravelMode.DRIVING },
        (result, status) => {
          if (status === "OK" && result && rendererRef.current) {
            rendererRef.current.setDirections(result);
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(driverPos);
            bounds.extend(destPos);
            map.fitBounds(bounds, 60);
          }
        }
      );
    } else {
      map.panTo(driverPos);
      map.setZoom(14);
    }
  }, [loc, ride]);

  // ── Status labels ─────────────────────────────────────────────────────────

  const statusConfig = (() => {
    if (!loc || !loc.currentLat) {
      return { color: "bg-amber-100 text-amber-700", dot: "bg-amber-400", label: "Waiting for driver to start…" };
    }
    if (loc.status === "completed") {
      return { color: "bg-gray-100 text-gray-600", dot: "bg-gray-400", label: "Ride completed" };
    }
    if (isArriving) {
      return { color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500 animate-ping", label: "Your driver is arriving!" };
    }
    if (loc.status === "in_progress") {
      return { color: "bg-blue-100 text-blue-700", dot: "bg-blue-500 animate-pulse", label: `En route to ${dest}` };
    }
    return { color: "bg-orange-100 text-orange-700", dot: "bg-orange-500 animate-pulse", label: "Driver is on the way" };
  })();

  return (
    <div className="flex flex-col gap-0 rounded-2xl overflow-hidden ring-2 ring-border/40 shadow-lg">
      {/* Map — full bleed */}
      <div className="relative" style={{ height: "clamp(220px, 38vh, 400px)" }}>
        <div ref={containerRef} className="w-full h-full" />

        {/* Floating status pill on map */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-[1000] pointer-events-none">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md backdrop-blur ${statusConfig.color}`}>
            <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
            {statusConfig.label}
          </div>
          {loc?.status === "in_progress" && loc.progressPercent > 0 && (
            <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-semibold shadow">
              {loc.progressPercent}% there
            </div>
          )}
        </div>

        {/* Chat button — bottom-right corner of map */}
        {currentUserId && currentUserName && (
          <div className="absolute bottom-3 right-3 z-[1001]">
            <RideChat rideId={ride.id} currentUserId={currentUserId} currentUserName={currentUserName} />
          </div>
        )}

        {/* Arriving pulse overlay */}
        {isArriving && (
          <div className="absolute inset-0 pointer-events-none z-[999]">
            <div className="absolute inset-0 border-4 border-emerald-400 rounded-2xl animate-pulse opacity-60" />
          </div>
        )}
      </div>

      {/* Driver info card */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-t border-border/30">
        <Avatar className="w-11 h-11 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
            {initials(driver?.name ?? "?")}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">{driver?.name ?? "Your driver"}</div>
          <div className="text-xs text-muted-foreground">
            {[driver?.carColor, driver?.carMake, driver?.carModel].filter(Boolean).join(" ") || "Vehicle info not set"}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {driverDist && (
              <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
                <Navigation className="w-2.5 h-2.5" /> {driverDist} away
              </Badge>
            )}
            {pickupEta && !isArriving && (
              <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" /> {pickupEta} to pickup
              </Badge>
            )}
            {loc?.etaMinutes > 0 && loc.status === "in_progress" && (
              <Badge className="bg-blue-100 text-blue-700 text-[10px] flex items-center gap-1">
                <CarFront className="w-2.5 h-2.5" /> {loc.etaMinutes} min to destination
              </Badge>
            )}
            {isArriving && (
              <Badge className="bg-emerald-100 text-emerald-700 text-[10px] animate-pulse">
                <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Driver here!
              </Badge>
            )}
          </div>
        </div>

        <Link href={`/rides/${ride.id}`}>
          <Button size="sm" variant="outline" className="rounded-full shrink-0">
            Details <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
