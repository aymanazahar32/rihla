import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { importLibrary } from "@/lib/google-maps";
import { useGetRide, useCompleteRide, useGetMe } from "@/lib/api-client";
import { useDriverLocation } from "@/hooks/use-driver-location";
import { haversineKm } from "@/lib/matching";
import { supabase } from "@/lib/supabase";
import { MAP_DEFAULT_CENTER } from "@/lib/map-defaults";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RideChat } from "@/components/RideChat";
import { useRideNotifications } from "@/lib/useRideNotifications";
import {
  CheckCircle2, AlertCircle, Navigation, Users,
  ChevronUp, ChevronDown, ArrowRight, ArrowLeft, ArrowUp, Clock
} from "lucide-react";
import { format, parseISO } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AcceptedRequest {
  id: number;
  pickupLat: number | null;
  pickupLng: number | null;
  pickupLocation: string;
  desiredTime: string;
  requester: { id: string; name: string } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <circle cx="20" cy="20" r="20" fill="#f97316" opacity="0.9"/>
  <text x="20" y="26" text-anchor="middle" font-size="20">🚗</text>
</svg>`;

const PICKUP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="16" fill="#f59e0b" opacity="0.9"/>
  <text x="16" y="21" text-anchor="middle" font-size="16">👤</text>
</svg>`;

const DONE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
  <circle cx="14" cy="14" r="14" fill="#10b981" opacity="0.9"/>
  <text x="14" y="19" text-anchor="middle" font-size="14">✓</text>
</svg>`;

function initials(n: string) {
  return n.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
}

function turnIcon(maneuver: string | undefined) {
  if (!maneuver) return <ArrowUp className="w-5 h-5" />;
  if (maneuver.includes("left")) return <ArrowLeft className="w-5 h-5" />;
  if (maneuver.includes("right")) return <ArrowRight className="w-5 h-5" />;
  return <ArrowUp className="w-5 h-5" />;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DriverModePage({ rideId }: { rideId: number }) {
  const [, setLocation] = useLocation();
  const { data: me } = useGetMe();
  const { data: ride } = useGetRide(rideId);
  const complete = useCompleteRide();
  const { coords, error: gpsError } = useDriverLocation(rideId);

  // Map refs
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const carMarkerRef = useRef<google.maps.Marker | null>(null);
  const pickupMarkersRef = useRef<Map<number, google.maps.Marker>>(new Map());
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const serviceRef = useRef<google.maps.DirectionsService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const lastRouteRef = useRef(0);
  const destRef = useRef<{ lat: number; lng: number } | null>(null);

  // Chat message notifications for driver when app is backgrounded
  useRideNotifications({ userId: me?.id, rideId: ride?.id ?? null, userName: me?.name });

  // UI state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pickedUp, setPickedUp] = useState<Set<number>>(new Set());
  const [instruction, setInstruction] = useState("Calculating route…");
  const [distToNext, setDistToNext] = useState("");
  const [etaLabel, setEtaLabel] = useState("");
  const [nearbyPickupId, setNearbyPickupId] = useState<number | null>(null);
  const [acceptedRequests, setAcceptedRequests] = useState<AcceptedRequest[]>([]);

  // Redirect non-drivers
  useEffect(() => {
    if (me && ride && me.id !== ride.driverId) setLocation(`/rides/${rideId}`);
  }, [me, ride, rideId, setLocation]);

  // Fetch accepted requests for this ride's context (driver's pickups)
  useEffect(() => {
    if (!ride || !me) return;
    const fetch = async () => {
      let q = supabase
        .from("ride_requests")
        .select("id, pickup_lat, pickup_lng, pickup_location, desired_time, requester:profiles!requester_id(id, name)")
        .eq("accepted_by", me.id)
        .eq("context_type", ride.contextType)
        .eq("status", "accepted");

      if (ride.contextType === "event" && ride.eventId) q = q.eq("event_id", ride.eventId);
      else if (ride.contextType === "masjid" && ride.masjidId) q = q.eq("masjid_id", ride.masjidId);
      else if (ride.contextType === "errand" && ride.errandId) q = q.eq("errand_id", ride.errandId);
      if (ride.prayerName) q = q.eq("prayer_name", ride.prayerName);

      const { data } = await q;
      if (data) {
        setAcceptedRequests(data.map((r: any) => ({
          id: r.id,
          pickupLat: r.pickup_lat,
          pickupLng: r.pickup_lng,
          pickupLocation: r.pickup_location,
          desiredTime: r.desired_time,
          requester: r.requester ?? null,
        })));
      }
    };
    void fetch();
  }, [ride, me]);

  // Init map
  useEffect(() => {
    let cancelled = false;
    Promise.all([importLibrary("maps"), importLibrary("routes"), importLibrary("geocoding")]).then(() => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = new google.maps.Map(containerRef.current, {
        center: { lat: MAP_DEFAULT_CENTER[0], lng: MAP_DEFAULT_CENTER[1] },
        zoom: 15,
        zoomControl: false,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        gestureHandling: "greedy",
      });
      mapRef.current = map;
      serviceRef.current = new google.maps.DirectionsService();
      geocoderRef.current = new google.maps.Geocoder();
      rendererRef.current = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: { strokeColor: "#3b82f6", strokeWeight: 6, strokeOpacity: 0.85 },
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

  // Resolve destination from ride context (geocode address if no lat/lng stored)
  useEffect(() => {
    if (!ride || destRef.current) return;
    if (ride.destinationLat && ride.destinationLng) {
      destRef.current = { lat: ride.destinationLat, lng: ride.destinationLng };
      return;
    }
    const address = ride.event?.location ?? ride.masjid?.name ?? ride.errand?.title;
    if (!address || !geocoderRef.current) return;
    geocoderRef.current.geocode({ address }, (results, status) => {
      if (status === "OK" && results?.[0]?.geometry?.location) {
        const lat = results[0].geometry.location.lat();
        const lng = results[0].geometry.location.lng();
        destRef.current = { lat, lng };
        supabase.from("rides").update({ destination_lat: lat, destination_lng: lng }).eq("id", rideId);
      }
    });
  }, [ride, rideId]);

  // Update pickup markers when accepted requests change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !acceptedRequests.length) return;

    acceptedRequests.forEach((req) => {
      if (!req.pickupLat || !req.pickupLng) return;
      const pos = { lat: req.pickupLat, lng: req.pickupLng };
      const isDone = pickedUp.has(req.id);

      if (pickupMarkersRef.current.has(req.id)) {
        const m = pickupMarkersRef.current.get(req.id)!;
        m.setIcon({
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(isDone ? DONE_SVG : PICKUP_SVG)}`,
          scaledSize: new google.maps.Size(isDone ? 28 : 32, isDone ? 28 : 32),
          anchor: new google.maps.Point(isDone ? 14 : 16, isDone ? 14 : 16),
        });
      } else {
        const marker = new google.maps.Marker({
          position: pos,
          map,
          title: req.requester?.name ?? "Pickup",
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(PICKUP_SVG)}`,
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 16),
          },
        });
        pickupMarkersRef.current.set(req.id, marker);
      }
    });
  }, [acceptedRequests, pickedUp]);

  // Recalculate route and update HUD on every GPS tick
  const recalcRoute = useCallback(() => {
    const map = mapRef.current;
    const service = serviceRef.current;
    if (!map || !service || !coords || !destRef.current) return;

    const origin = new google.maps.LatLng(coords.lat, coords.lng);
    const dest = new google.maps.LatLng(destRef.current.lat, destRef.current.lng);

    // Pending pickup waypoints sorted by proximity
    const pendingWaypoints = acceptedRequests
      .filter((r) => !pickedUp.has(r.id) && r.pickupLat && r.pickupLng)
      .sort((a, b) =>
        haversineKm(coords.lat, coords.lng, a.pickupLat!, a.pickupLng!) -
        haversineKm(coords.lat, coords.lng, b.pickupLat!, b.pickupLng!)
      )
      .map((r) => ({
        location: new google.maps.LatLng(r.pickupLat!, r.pickupLng!),
        stopover: true,
      }));

    service.route(
      { origin, destination: dest, waypoints: pendingWaypoints, travelMode: google.maps.TravelMode.DRIVING },
      (result, status) => {
        if (status !== "OK" || !result || !rendererRef.current) return;
        rendererRef.current.setDirections(result);

        // Extract first step instruction
        const leg = result.routes[0]?.legs[0];
        const step = leg?.steps[0];
        if (step) {
          const text = step.instructions.replace(/<[^>]+>/g, "");
          setInstruction(text);
          setDistToNext(step.distance?.text ?? "");
        }

        // ETA from all legs
        const totalSecs = result.routes[0]?.legs.reduce((sum, l) => sum + (l.duration?.value ?? 0), 0) ?? 0;
        const mins = Math.round(totalSecs / 60);
        setEtaLabel(mins <= 1 ? "< 1 min" : `${mins} min`);

        // Write progress + ETA to DB
        const totalDist = result.routes[0]?.legs.reduce((sum, l) => sum + (l.distance?.value ?? 0), 0) ?? 0;
        const progressPct = totalDist > 0 ? Math.max(0, Math.min(100, 100 - Math.round((totalDist / 5000) * 100))) : 0;
        supabase.from("rides").update({ eta_minutes: mins, progress_percent: progressPct }).eq("id", rideId);
      }
    );
  }, [coords, acceptedRequests, pickedUp, rideId]);

  // Move car marker + geofence check + periodic route recalc
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !coords) return;

    const pos = { lat: coords.lat, lng: coords.lng };

    if (carMarkerRef.current) {
      carMarkerRef.current.setPosition(pos);
    } else {
      carMarkerRef.current = new google.maps.Marker({
        position: pos, map,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(CAR_SVG)}`,
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 20),
        },
        zIndex: 999,
      });
    }
    map.panTo(pos);

    // Geofencing — check proximity to each pending pickup
    const nearby = acceptedRequests.find((r) =>
      !pickedUp.has(r.id) && r.pickupLat && r.pickupLng &&
      haversineKm(coords.lat, coords.lng, r.pickupLat, r.pickupLng) < 0.1
    );
    setNearbyPickupId(nearby?.id ?? null);

    // Recalc route at most every 5s
    const now = Date.now();
    if (now - lastRouteRef.current >= 5000) {
      lastRouteRef.current = now;
      recalcRoute();
    }
  }, [coords, acceptedRequests, pickedUp, recalcRoute]);

  const markPickedUp = (reqId: number) => {
    setPickedUp((prev) => new Set([...prev, reqId]));
    setNearbyPickupId(null);
  };

  const pendingCount = acceptedRequests.filter((r) => !pickedUp.has(r.id)).length;
  const allAboard = acceptedRequests.length > 0 && pendingCount === 0;

  const handleEndRide = () => {
    complete.mutate({ rideId }, { onSuccess: () => setLocation(`/rides/${rideId}`) });
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Map */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* ── Top status bar ─────────────────────────────────────────────── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2">
        <div className="bg-white/95 backdrop-blur px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Navigation className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Drive mode</span>
          {acceptedRequests.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              <Users className="w-3 h-3 mr-1" />
              {pickedUp.size}/{acceptedRequests.length} aboard
            </Badge>
          )}
          {allAboard && (
            <Badge className="bg-emerald-500 text-white text-[10px]">All aboard!</Badge>
          )}
        </div>
      </div>

      {/* ── GPS error ──────────────────────────────────────────────────── */}
      {gpsError && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-full shadow flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs">GPS: {gpsError}</span>
        </div>
      )}

      {/* ── Turn-by-turn HUD ───────────────────────────────────────────── */}
      <div className="absolute top-16 left-4 right-4 z-[1000]">
        <div className="bg-gray-900/92 backdrop-blur text-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl">
          <div className="bg-blue-500 p-2 rounded-xl shrink-0">
            {turnIcon(undefined)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{instruction}</p>
            {distToNext && <p className="text-xs text-white/60 mt-0.5">{distToNext}</p>}
          </div>
          {etaLabel && (
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 text-xs text-white/60">
                <Clock className="w-3 h-3" /> ETA
              </div>
              <div className="text-sm font-bold text-blue-400">{etaLabel}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Nearby pickup prompt ───────────────────────────────────────── */}
      {nearbyPickupId !== null && (() => {
        const req = acceptedRequests.find((r) => r.id === nearbyPickupId);
        if (!req) return null;
        return (
          <div className="absolute top-36 left-4 right-4 z-[1000] animate-bounce-once">
            <div className="bg-amber-500 text-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl">
              <div className="text-2xl">📍</div>
              <div className="flex-1">
                <p className="text-sm font-bold">Arriving at {req.requester?.name ?? "pickup"}</p>
                <p className="text-xs opacity-80 truncate">{req.pickupLocation}</p>
              </div>
              <Button
                size="sm"
                className="rounded-full bg-white text-amber-600 hover:bg-white/90 shrink-0"
                onClick={() => markPickedUp(req.id)}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" /> Picked up
              </Button>
            </div>
          </div>
        );
      })()}

      {/* Chat button — floating above drawer */}
      {me && ride && (
        <div className="absolute bottom-20 right-4 z-[1001]">
          <RideChat rideId={ride.id} currentUserId={me.id} currentUserName={me.name} />
        </div>
      )}

      {/* ── Bottom drawer ──────────────────────────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-[1000] transition-transform duration-300"
        style={{ transform: drawerOpen ? "translateY(0)" : "translateY(calc(100% - 72px))" }}
      >
        <div className="bg-white rounded-t-3xl shadow-2xl">
          {/* Handle */}
          <button
            className="w-full flex flex-col items-center py-3 gap-1"
            onClick={() => setDrawerOpen((o) => !o)}
          >
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              {drawerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              {acceptedRequests.length === 0
                ? "No pickups — head to destination"
                : pendingCount === 0
                ? "All passengers aboard!"
                : `${pendingCount} pickup${pendingCount !== 1 ? "s" : ""} remaining`}
            </div>
          </button>

          {/* Passenger list */}
          <div className="px-4 pb-4 space-y-2 max-h-64 overflow-y-auto">
            {acceptedRequests.map((req) => {
              const done = pickedUp.has(req.id);
              return (
                <div
                  key={req.id}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${done ? "bg-emerald-50 opacity-60" : "bg-muted/40"}`}
                >
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarFallback className={`text-xs font-bold ${done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {initials(req.requester?.name ?? "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm flex items-center gap-2">
                      {req.requester?.name ?? "Passenger"}
                      {done && <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0">Aboard</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{req.pickupLocation}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {format(parseISO(req.desiredTime), "h:mm a")}
                    </div>
                  </div>
                  {!done && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full text-xs h-7 shrink-0"
                      onClick={() => markPickedUp(req.id)}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Picked up
                    </Button>
                  )}
                </div>
              );
            })}

            {/* End ride */}
            <Button
              size="lg"
              variant="destructive"
              className="w-full rounded-full mt-2"
              onClick={handleEndRide}
              disabled={complete.isPending || !ride || ride.status !== "in_progress"}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {complete.isPending ? "Ending ride…" : "End ride"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
