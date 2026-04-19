# Rihla — Carpool App (Muslim Hackathon)

## What this is

A Muslim-community carpool platform — think Uber for the ummah. The core problem: many community members lack cars and can't get to masjids, MSA events, or community errands. The app matches riders to drivers for these specific contexts.

**Hackathon context:** Moving fast. Favor speed and correctness over abstraction and polish. Don't over-engineer. Don't add features that weren't asked for.

---

## Architecture Overview

**Frontend-only SPA** — no backend server. All data lives in Supabase (Postgres + Auth + Realtime).

```
nerds/
  frontend/
    src/
      pages/        # One file per route
      components/   # Shared UI (LiveMap, RideThread, MapPicker, etc.)
      hooks/        # Custom hooks (use-driver-location, use-toast, etc.)
      lib/          # Core utilities (api-client, supabase, google-maps, gender-visibility)
    supabase-schema.sql   # Run in Supabase SQL Editor to set up / reset DB
    .env                  # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_GOOGLE_MAPS_API_KEY
```

---

## Tech Stack

| Layer | Library |
|-------|---------|
| UI framework | React 18 + TypeScript |
| Build | Vite 5 |
| Router | **Wouter** (NOT React Router) |
| Server state | TanStack React Query v5 |
| Database/Auth | Supabase JS v2 |
| Realtime | Supabase Realtime (`postgres_changes`) |
| Maps | Google Maps JS API via `@googlemaps/js-api-loader` v2 |
| Styling | Tailwind CSS v4 + shadcn/ui + Radix UI |
| Forms | react-hook-form + zod |
| Icons | lucide-react |

---

## User Roles

Three distinct user types set during profile setup:

- **Rider** — Books seats on published rides. Needs gender, age, university, student ID.
- **Driver** — Publishes rides, has live GPS mode. Needs car details, license info, background check.
- **Organization** — Posts events (MSA, masjid, community orgs). Organization name only.

---

## Database Tables (Supabase)

| Table | Purpose |
|-------|---------|
| `profiles` | All users — stores role, gender, car info, verification flags |
| `rides` | Published carpool offers by drivers |
| `ride_participants` | Join table: which riders are on which ride |
| `ride_messages` | Chat between driver and passengers on a ride |
| `ride_requests` | "I need a ride" posts from riders |
| `ride_request_messages` | Chat on a ride request |
| `events` | Community events (created by orgs) |
| `masjids` | Masjid locations + prayer times (seeded) |
| `errands` | Community errands like grocery runs (seeded) |

**Ride contexts:** Every ride links to exactly one of: `event`, `masjid`, or `errand` (set via `context_type`).

**Ride lifecycle:** `scheduled` → `in_progress` → `completed`

**Live tracking columns on `rides`:** `current_lat`, `current_lng`, `destination_lat`, `destination_lng`, `eta_minutes`, `progress_percent`

**Realtime:** `rides` table has `REPLICA IDENTITY FULL` enabled. The `supabase_realtime` publication includes `rides`. If you reset the schema, re-run these two lines in SQL Editor:
```sql
alter table rides replica identity full;
alter publication supabase_realtime add table rides;
```

---

## Key Routes

| Route | Page | Guard |
|-------|------|-------|
| `/` | HomePage | None |
| `/login` | AuthPage | None |
| `/profile-setup` | ProfileSetupPage | SessionGuard |
| `/profile` | ProfilePage | SessionGuard + CompleteProfileGuard |
| `/events` | EventsPage | None |
| `/events/:eventId` | EventDetailPage | None |
| `/events/new` | EventCreatePage | SessionGuard + CompleteProfileGuard |
| `/salah` | SalahPage | None |
| `/salah/:masjidId` | MasjidDetailPage | None |
| `/errands` | ErrandsPage | None |
| `/errands/:errandId` | ErrandDetailPage | None |
| `/rides/new` | RideCreatePage | SessionGuard + CompleteProfileGuard |
| `/rides/:rideId` | RideDetailPage | None |
| `/rides/:rideId/drive` | DriverModePage | SessionGuard + CompleteProfileGuard |
| `/requests/new` | RequestCreatePage | SessionGuard + CompleteProfileGuard |
| `/my-rides` | MyRidesPage | SessionGuard + CompleteProfileGuard |

**Routing rules:**
- Wouter is first-match — more specific routes must come before less specific ones (e.g., `/rides/:id/drive` before `/rides/:id`)
- Use `useLocation()` from wouter for navigation, not `window.location`
- Route params are strings — always `parseInt()` for numeric IDs

---

## API Client Patterns (`src/lib/api-client.ts`)

All data access goes through this file. Pattern is consistent:

```typescript
// Query
export const useGetRide = (id: number) =>
  useQuery({
    queryKey: getGetRideQueryKey(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("rides").select(...).eq("id", id).single();
      if (error) throw error;
      return normalizeRide(data);  // snake_case → camelCase
    },
  });

// Mutation
export const useJoinRide = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { rideId: number }) => {
      const { error } = await supabase.from("ride_participants").insert(...);
      if (error) throw { error: error.message };
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: getGetRideQueryKey(vars.rideId) }),
  });
};
```

**Rules:**
- All mutations that touch driver-owned rows must include `.eq("driver_id", user.id)` — get the user via `supabase.auth.getUser()` (do NOT use `getCurrentUserId` — it is not exported)
- Throw errors as `{ error: string }`, not raw Error objects
- Always invalidate relevant query keys in `onSuccess`
- Normalizer functions (e.g., `normalizeRide`) convert DB snake_case to camelCase — add new fields there if you add columns
- Exported query key helpers: `getGetRideQueryKey(id)`, `getGetMyRidesQueryKey()`, `getListBookableRidesQueryKey()`, etc. — use these, don't inline arrays

---

## Google Maps Integration

**Loader:** `src/lib/google-maps.ts` — singleton using `@googlemaps/js-api-loader` v2 functional API:
```typescript
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
setOptions({ key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY, version: "weekly" });
export { importLibrary };
```

**Usage pattern:**
```typescript
Promise.all([importLibrary("maps"), importLibrary("routes")]).then(() => {
  const map = new google.maps.Map(containerRef.current, { ... });
});
```

**Critical API notes (v2 vs v1):**
- Use `key` not `apiKey` in `setOptions`
- Do NOT pass `"routes"` as a library in `setOptions` — it is loaded via `importLibrary("routes")` separately
- No `Loader` class in v2 — `setOptions` + `importLibrary` only

**Default center:** `MAP_DEFAULT_CENTER` and `MAP_DEFAULT_ZOOM` are in `src/lib/map-defaults.ts` — use these, not hardcoded coordinates.

**APIs required (all enabled under same key):** Maps JavaScript API, Places API, Geocoding API, Directions API

---

## Supabase Realtime (LiveMap)

`LiveMap.tsx` subscribes to live driver location updates using Supabase Realtime:

```typescript
const channel = supabase
  .channel(`ride-loc-${rideId}`)
  .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rides", filter: `id=eq.${rideId}` },
    (payload) => setLoc(toRideLoc(payload.new)),
  )
  .subscribe((status) => {
    if (status === "SUBSCRIBED") {
      // Initial fetch goes here — subscribe-before-fetch pattern to avoid race condition
    }
  });
```

**Important:** Always use the subscribe-before-fetch pattern. Do not fetch first and subscribe second — you'll miss updates that arrive between the two.

---

## Gender Visibility Policy

This is a core feature, not optional. The Muslim community has gender-segregated ride preferences.

- Riders cannot see or book opposite-gender driver rides
- Drivers cannot see opposite-gender passenger details
- Logged-out users and organizations see everyone
- Opposite-gender display names are redacted to `"Member"`

All gender checks go through `src/lib/gender-visibility.ts`:
- `maySeePersonByGender(viewer, targetGender)` — returns boolean
- `displayNameForGenderPolicy(viewer, userId, name, gender)` — returns display name or "Member"

Do not bypass or remove this logic. Add it to any new pages that display user info.

---

## Auth Flow

1. Register with `.edu` email (validated) + password → profile auto-created with `profile_completed: false`
2. Redirect to `/profile-setup` → choose role → fill details → `profile_completed: true`
3. `SessionGuard` checks auth, redirects to `/login?next=<current-path>` if unauthenticated
4. `CompleteProfileGuard` checks `profile_completed`, redirects to `/profile-setup` if false
5. `useGetMe()` is the single source of truth for the current user — 30s stale time

---

## Driver GPS Flow

When a driver starts a ride:
1. `ride-detail.tsx` → "Start Ride" button → calls `useStartRide()` → navigates to `/rides/:id/drive`
2. `driver-mode.tsx` → full-screen Google Map + `useDriverLocation` hook
3. `use-driver-location.ts` → `navigator.geolocation.watchPosition` → writes `current_lat/lng` to Supabase every 3s (throttled with `lastWriteRef`)
4. Riders subscribed via Realtime receive updates in `LiveMap.tsx`

Rider `LiveMap` has two phases:
- **Pickup** (`scheduled`): routes driver → rider's current GPS, shows ETA. Skip if `isDriver=true` prop passed.
- **In-trip** (`in_progress`): routes driver → destination, shows ETA + progress %.

---

## Adding New Features — Checklist

- [ ] New DB column → add to `supabase-schema.sql`, add to relevant `.select()` in `api-client.ts`, add to normalizer function
- [ ] New page → create in `pages/`, add route in `App.tsx` (before catch-all, specific before general), wrap in guards if needed
- [ ] New mutation → add to `api-client.ts` with `driver_id` filter if driver-owned, invalidate relevant query keys
- [ ] User info displayed → apply gender visibility policy
- [ ] New realtime subscription → use subscribe-before-fetch pattern

---

## Running Locally

```bash
cd nerds/frontend
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
```

**After schema changes:** Run the updated SQL in Supabase SQL Editor → Settings → API for connection details.

---

## Environment Variables

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GOOGLE_MAPS_API_KEY=
```

All prefixed `VITE_` — required by Vite to expose to the browser.
