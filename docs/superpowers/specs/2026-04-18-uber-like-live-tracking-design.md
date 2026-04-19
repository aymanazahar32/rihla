# Uber-Like Live Tracking Design

## Context
The app currently has a `LiveMap` component that polls Supabase every 2 seconds for ride location data, but there is no mechanism for drivers to broadcast their GPS. This design adds a full-screen driver GPS mode, real-time rider tracking powered by Supabase Realtime, and two distinct rider map phases (pickup and in-trip) — mirroring the core Uber tracking experience.

## Approach
Supabase Realtime subscription on the `rides` row replaces polling. The driver's browser writes `current_lat/lng` to Supabase every 3 seconds via `watchPosition`. Riders receive instant updates the moment the driver writes. The rider's own pickup location is read from their local GPS — never sent to the server.

---

## 1. Data Flow

- **Driver → Supabase**: `navigator.geolocation.watchPosition` runs on the driver's device. Every 3 seconds, a Supabase update writes `current_lat` and `current_lng` to the `rides` row.
- **Supabase → Riders**: Riders subscribe to the `rides` row via `supabase.channel().on('postgres_changes', ...)`. Position updates arrive instantly — no polling.
- **Rider pickup location**: Read from `navigator.geolocation` locally in the rider's browser. Used only for route calculation (driver → rider). Never persisted.
- **No new database columns required.** `current_lat`, `current_lng`, `destination_lat`, `destination_lng`, `eta_minutes`, `progress_percent` already exist on the `rides` table.

---

## 2. Driver Full-Screen Mode

**New page**: `frontend/src/pages/driver-mode.tsx` at route `/rides/:id/drive`

- Only accessible to the driver of that ride (redirect others away)
- Full-screen Google Map centered on driver's current GPS
- Route drawn from driver's position → `destination_lat/lng` (the event/masjid/errand location)
- Bottom overlay: passenger count, "End Ride" button
- On mount: start `watchPosition`, write `current_lat/lng` every 3s via new `useUpdateDriverLocation` mutation
- On "End Ride": call existing `useCompleteRide`, stop broadcasting, navigate back to ride detail
- On unmount/tab close: `watchPosition` cleanup stops broadcasting automatically

**New hook**: `frontend/src/hooks/use-driver-location.ts`
- Wraps `navigator.geolocation.watchPosition`
- Throttles Supabase writes to every 3 seconds
- Returns `{ lat, lng, error, isLocating }`

**New mutation in `api-client.ts`**: `useUpdateDriverLocation`
- Updates `current_lat`, `current_lng` on the `rides` row (driver only)

**Update `ride-detail.tsx`**:
- Driver's "Start Ride" button navigates to `/rides/:id/drive` after starting

---

## 3. Rider LiveMap — Two Phases

**Update `frontend/src/components/LiveMap.tsx`**:

Replace `useGetRideLocation` polling with a Supabase Realtime subscription.

### Pickup Phase
Condition: ride `status === "scheduled"` OR driver's `current_lat` is null/near departure point.

- Map shows driver's car icon at `current_lat/lng`
- Rider's own GPS read via `navigator.geolocation.getCurrentPosition` (one-time, not continuous)
- Route drawn from driver → rider's current position using Google Maps Directions
- Overlay: "Driver is X min away" (ETA from directions result)
- Blue "My Location" dot shown via `map.setOptions({ myLocationButton: true })`

### In-Trip Phase
Condition: ride `status === "in_progress"` and `current_lat` is set.

- Map shows driver's car icon at `current_lat/lng`
- Route drawn from driver → `destination_lat/lng`
- Existing ETA/progress/status overlay unchanged

### Phase detection
```
if (status === "in_progress" && current_lat exists) → in-trip phase
else if (current_lat exists) → pickup phase
else → show loading skeleton (driver hasn't started broadcasting yet)
```

### Rider GPS unavailable fallback
If the rider denies location permission or GPS is unavailable during pickup phase, skip the driver → rider route and instead show only the driver's position on the map with no ETA overlay.

---

## 4. Files Changed

| File | Change |
|------|--------|
| `frontend/src/pages/driver-mode.tsx` | New — full-screen driver GPS page |
| `frontend/src/hooks/use-driver-location.ts` | New — watchPosition + throttled Supabase writes |
| `frontend/src/components/LiveMap.tsx` | Replace polling with Realtime, add pickup/in-trip phases |
| `frontend/src/lib/api-client.ts` | Add `useUpdateDriverLocation` mutation |
| `frontend/src/pages/ride-detail.tsx` | Driver "Start Ride" navigates to driver-mode |
| `frontend/src/App.tsx` | Add `/rides/:id/drive` route |

---

## 5. Verification

1. Driver opens a ride, clicks "Start Ride" → lands on full-screen driver-mode page, map centers on their GPS
2. Driver moves — rider's LiveMap updates within ~3 seconds without page refresh
3. During pickup phase, rider sees route from driver's location to their own current position with ETA
4. Once ride is `in_progress`, rider's map switches to driver → destination route
5. Driver taps "End Ride" → ride completes, broadcasting stops, driver navigates back to ride detail
6. Opening `/rides/:id/drive` as a non-driver redirects to ride detail
