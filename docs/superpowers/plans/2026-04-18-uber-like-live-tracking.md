# Uber-Like Live Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add driver GPS broadcasting, Supabase Realtime rider updates, and an Uber-like full-screen driver mode with pickup-phase and in-trip rider views.

**Architecture:** The driver's browser writes `current_lat/lng` to Supabase every 3 seconds via `watchPosition`. Riders subscribe to the `rides` row via Supabase Realtime for instant updates. The LiveMap shows two phases: pickup (driver → rider's GPS location) and in-trip (driver → destination).

**Tech Stack:** React, TypeScript, Supabase (`@supabase/supabase-js` Realtime), Google Maps JS API (`@googlemaps/js-api-loader` v2), wouter, TanStack Query

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/src/hooks/use-driver-location.ts` | Create | `watchPosition` + throttled Supabase writes |
| `frontend/src/pages/driver-mode.tsx` | Create | Full-screen driver GPS page |
| `frontend/src/App.tsx` | Modify | Add `/rides/:rideId/drive` route |
| `frontend/src/pages/ride-detail.tsx` | Modify | "Start Ride" navigates to driver-mode |
| `frontend/src/components/LiveMap.tsx` | Modify | Replace polling with Realtime, add phases |

---

## Task 1: Create `use-driver-location.ts` hook

**Files:**
- Create: `frontend/src/hooks/use-driver-location.ts`

- [ ] **Step 1: Create the hook**

```ts
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUserId } from "@/lib/api-client";

export function useDriverLocation(rideId: number) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastWriteRef = useRef(0);

  useEffect(() => {
    let watchId: number;

    const start = async () => {
      const userId = await getCurrentUserId().catch(() => null);
      if (!userId) return;

      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoords({ lat, lng });

          const now = Date.now();
          if (now - lastWriteRef.current >= 3000) {
            lastWriteRef.current = now;
            await supabase
              .from("rides")
              .update({ current_lat: lat, current_lng: lng })
              .eq("id", rideId)
              .eq("driver_id", userId);
          }
        },
        (err) => setError(err.message),
        { enableHighAccuracy: true, timeout: 15000 },
      );
    };

    void start();
    return () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    };
  }, [rideId]);

  return { coords, error };
}
```

- [ ] **Step 2: Verify build**

```bash
cd nerds/frontend && npm run build 2>&1 | grep -E "error|✓"
```
Expected: `✓ built in`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/use-driver-location.ts
git commit -m "feat: add useDriverLocation hook with throttled GPS writes"
```

---

## Task 2: Create `driver-mode.tsx`

**Files:**
- Create: `frontend/src/pages/driver-mode.tsx`

The driver full-screen page: initialises Google Maps, tracks the driver via `useDriverLocation`, draws the route to destination, and has an "End Ride" button.

- [ ] **Step 1: Create the page**

```tsx
import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { importLibrary } from "@/lib/google-maps";
import { useGetRide, useCompleteRide, useGetMe } from "@/lib/api-client";
import { useDriverLocation } from "@/hooks/use-driver-location";
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
        center: { lat: 32.7357, lng: -97.1081 },
        zoom: 15,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });
      mapRef.current = map;
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
    const renderer = rendererRef.current;
    if (!map || !coords || !ride?.destinationLat || !ride?.destinationLng) return;

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

    new google.maps.DirectionsService().route(
      { origin, destination, travelMode: google.maps.TravelMode.DRIVING },
      (result, status) => {
        if (status === "OK" && result) renderer!.setDirections(result);
      },
    );
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
          disabled={complete.isPending}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {complete.isPending ? "Ending…" : "End Ride"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd nerds/frontend && npm run build 2>&1 | grep -E "error|✓"
```
Expected: `✓ built in`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/driver-mode.tsx
git commit -m "feat: add full-screen driver GPS mode page"
```

---

## Task 3: Add `/rides/:rideId/drive` route to App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Import DriverModePage**

At the top of `frontend/src/App.tsx`, add the import after the existing ride imports:

```ts
import DriverModePage from "@/pages/driver-mode";
```

- [ ] **Step 2: Add the route**

In the `Router` function, add the driver-mode route **before** the existing `/rides/:rideId` route (line 101) so wouter matches it first:

```tsx
<Route path="/rides/:rideId/drive">
  {(p) => (
    <SessionGuard>
      <CompleteProfileGuard>
        <DriverModePage rideId={parseInt(p.rideId)} />
      </CompleteProfileGuard>
    </SessionGuard>
  )}
</Route>
<Route path="/rides/:rideId">{(p) => <RideDetailPage rideId={parseInt(p.rideId)} />}</Route>
```

- [ ] **Step 3: Verify build**

```bash
cd nerds/frontend && npm run build 2>&1 | grep -E "error|✓"
```
Expected: `✓ built in`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: add /rides/:rideId/drive route"
```

---

## Task 4: Update "Start Ride" button in ride-detail.tsx

**Files:**
- Modify: `frontend/src/pages/ride-detail.tsx`

Currently "Start Ride" calls `start.mutate` and stays on the page. Change it to navigate to driver-mode after starting.

- [ ] **Step 1: Update the Start Ride button**

Find the existing Start Ride button (around line 173):

```tsx
{ride.status === "scheduled" && (
  <Button className="w-full rounded-full" onClick={() => start.mutate({ rideId }, { onSuccess: () => { refresh(); toast({ title: "Ride started" }); } })}>
    <Play className="w-4 h-4 mr-2" /> Start ride
  </Button>
)}
```

Replace with:

```tsx
{ride.status === "scheduled" && (
  <Button className="w-full rounded-full" onClick={() => start.mutate({ rideId }, { onSuccess: () => setLocation(`/rides/${rideId}/drive`) })}>
    <Play className="w-4 h-4 mr-2" /> Start ride
  </Button>
)}
{ride.status === "in_progress" && isDriver && (
  <Button variant="outline" className="w-full rounded-full" onClick={() => setLocation(`/rides/${rideId}/drive`)}>
    <Play className="w-4 h-4 mr-2" /> Return to driver mode
  </Button>
)}
```

- [ ] **Step 2: Verify build**

```bash
cd nerds/frontend && npm run build 2>&1 | grep -E "error|✓"
```
Expected: `✓ built in`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ride-detail.tsx
git commit -m "feat: start ride navigates to driver mode"
```

---

## Task 5: Upgrade LiveMap with Realtime + pickup/in-trip phases

**Files:**
- Modify: `frontend/src/components/LiveMap.tsx`

Replace `useGetRideLocation` polling with a Supabase Realtime subscription. Add pickup phase (driver → rider) and in-trip phase (driver → destination). Add a "Driver is X min away" overlay during pickup.

- [ ] **Step 1: Rewrite LiveMap.tsx**

```tsx
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
}

const CAR_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="18" fill="#f97316"/><text x="18" y="23" text-anchor="middle" font-size="18">🚗</text></svg>`;

function toRideLoc(d: Record<string, unknown>): RideLoc | null {
  if (!d.current_lat) return null;
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

export function LiveMap({ rideId, height = "360px" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const carMarkerRef = useRef<google.maps.Marker | null>(null);
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const serviceRef = useRef<google.maps.DirectionsService | null>(null);
  const [loc, setLoc] = useState<RideLoc | null>(null);
  const [pickupEta, setPickupEta] = useState<string | null>(null);

  // Initial fetch + Realtime subscription
  useEffect(() => {
    const cols = "status,current_lat,current_lng,destination_lat,destination_lng,eta_minutes,progress_percent";

    supabase
      .from("rides")
      .select(cols)
      .eq("id", rideId)
      .single()
      .then(({ data }) => { if (data) setLoc(toRideLoc(data as Record<string, unknown>)); });

    const channel = supabase
      .channel(`ride-loc-${rideId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rides", filter: `id=eq.${rideId}` },
        (payload) => {
          setLoc(toRideLoc(payload.new as Record<string, unknown>));
        },
      )
      .subscribe();

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

    if (loc.status === "in_progress") {
      // In-trip: route driver → destination
      const destination = new google.maps.LatLng(loc.destinationLat, loc.destinationLng);
      service.route(
        { origin: driverPos, destination, travelMode: google.maps.TravelMode.DRIVING },
        (result, status) => {
          if (status === "OK" && result) {
            renderer.setDirections(result);
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(driverPos);
            bounds.extend(destination);
            map.fitBounds(bounds, 60);
          }
        },
      );
    } else {
      // Pickup: try rider's GPS → route driver → rider
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          const riderPos = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
          service.route(
            { origin: driverPos, destination: riderPos, travelMode: google.maps.TravelMode.DRIVING },
            (result, status) => {
              if (status === "OK" && result) {
                renderer.setDirections(result);
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

      {loc && loc.status !== "in_progress" && (
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

      {!loc && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-[1000]">
          <span className="text-xs text-muted-foreground">Waiting for driver to start…</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd nerds/frontend && npm run build 2>&1 | grep -E "error|✓"
```
Expected: `✓ built in`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/LiveMap.tsx
git commit -m "feat: LiveMap Realtime subscription + pickup and in-trip phases"
```

---

## End-to-End Verification

- [ ] Run `npm run dev` in `nerds/frontend`
- [ ] As the driver, open a scheduled ride → click "Start Ride" → lands on `/rides/:id/drive` full-screen map
- [ ] Driver's position broadcasts: open Supabase dashboard → `rides` table → `current_lat/lng` updates every ~3 seconds
- [ ] As a rider on the same ride in another browser tab, open `/rides/:id` → LiveMap shows "Driver on the way" overlay and a route from driver to your location
- [ ] Once driver reaches rider and the in-trip view kicks in (status `in_progress`), LiveMap shows route to destination with ETA/progress overlay
- [ ] Driver clicks "End Ride" → ride status becomes `completed` → LiveMap shows completed state → driver redirects to ride detail
- [ ] Opening `/rides/:id/drive` as a non-driver redirects to `/rides/:id`
