import { supabase } from "@/lib/supabase";

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_DISTANCE_KM = 8;
const MAX_TIME_DELTA_MIN = 90;
export const MATCH_THRESHOLD = 0.65;

// ── Haversine ─────────────────────────────────────────────────────────────────

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface RideForMatch {
  id: number;
  departureLat: number | null;
  departureLng: number | null;
  departureTime: string;
  seatsAvailable: number;
  seatsTotal: number;
  driverGender?: string | null;
}

interface RequestForMatch {
  id: number;
  pickupLat: number | null;
  pickupLng: number | null;
  desiredTime: string;
  requesterGender?: string | null;
}

// ── Scorer ────────────────────────────────────────────────────────────────────

export function scoreMatch(ride: RideForMatch, request: RequestForMatch): number {
  if (!ride.departureLat || !ride.departureLng || !request.pickupLat || !request.pickupLng) return 0;
  if (ride.seatsAvailable <= 0) return 0;

  // Gender must match if both are set
  if (ride.driverGender && request.requesterGender && ride.driverGender !== request.requesterGender) return 0;

  const distKm = haversineKm(ride.departureLat, ride.departureLng, request.pickupLat, request.pickupLng);
  if (distKm > MAX_DISTANCE_KM) return 0;

  const timeDeltaMin = Math.abs(
    (new Date(ride.departureTime).getTime() - new Date(request.desiredTime).getTime()) / 60_000
  );
  if (timeDeltaMin > MAX_TIME_DELTA_MIN) return 0;

  const proximityScore = 1 - distKm / MAX_DISTANCE_KM;
  const timeScore = 1 - timeDeltaMin / MAX_TIME_DELTA_MIN;
  const seatScore = ride.seatsAvailable / Math.max(ride.seatsTotal, 1);

  return 0.5 * proximityScore + 0.35 * timeScore + 0.15 * seatScore;
}

// ── Human-readable score label ────────────────────────────────────────────────

export function scoreLabel(score: number): string {
  if (score >= 0.9) return "Excellent";
  if (score >= 0.8) return "Great";
  if (score >= 0.7) return "Good";
  return "Fair";
}

export function scoreColor(score: number): string {
  if (score >= 0.85) return "text-emerald-600";
  if (score >= 0.7) return "text-amber-600";
  return "text-orange-500";
}

// ── Main matching function ────────────────────────────────────────────────────

export async function runMatchingForContext(
  contextType: string,
  contextId: number,
  prayerName?: string | null
): Promise<void> {
  // Fetch open rides
  let ridesQ = supabase
    .from("rides")
    .select("id, departure_lat, departure_lng, departure_time, seats_available, seats_total, driver:profiles!driver_id(gender)")
    .eq("context_type", contextType)
    .eq("status", "scheduled")
    .gt("seats_available", 0);

  if (contextType === "event") ridesQ = ridesQ.eq("event_id", contextId);
  else if (contextType === "masjid") ridesQ = ridesQ.eq("masjid_id", contextId);
  else if (contextType === "errand") ridesQ = ridesQ.eq("errand_id", contextId);
  if (prayerName) ridesQ = ridesQ.eq("prayer_name", prayerName);

  // Fetch pending requests
  let reqsQ = supabase
    .from("ride_requests")
    .select("id, pickup_lat, pickup_lng, desired_time, requester:profiles!requester_id(gender)")
    .eq("context_type", contextType)
    .eq("status", "pending");

  if (contextType === "event") reqsQ = reqsQ.eq("event_id", contextId);
  else if (contextType === "masjid") reqsQ = reqsQ.eq("masjid_id", contextId);
  else if (contextType === "errand") reqsQ = reqsQ.eq("errand_id", contextId);
  if (prayerName) reqsQ = reqsQ.eq("prayer_name", prayerName);

  const [{ data: rides }, { data: requests }] = await Promise.all([ridesQ, reqsQ]);
  if (!rides?.length || !requests?.length) return;

  // Load existing matches to skip already-computed pairs
  const { data: existing } = await supabase
    .from("ride_matches")
    .select("ride_id, request_id")
    .in("ride_id", rides.map((r) => r.id));

  const seen = new Set((existing ?? []).map((m) => `${m.ride_id}:${m.request_id}`));

  // Score all pairs
  const toInsert: { ride_id: number; request_id: number; score: number }[] = [];

  for (const ride of rides) {
    const dr = ride as any;
    const rideForMatch: RideForMatch = {
      id: ride.id,
      departureLat: ride.departure_lat,
      departureLng: ride.departure_lng,
      departureTime: ride.departure_time,
      seatsAvailable: ride.seats_available,
      seatsTotal: ride.seats_total,
      driverGender: dr.driver?.gender ?? null,
    };

    for (const req of requests) {
      const rq = req as any;
      if (seen.has(`${ride.id}:${req.id}`)) continue;

      const reqForMatch: RequestForMatch = {
        id: req.id,
        pickupLat: req.pickup_lat,
        pickupLng: req.pickup_lng,
        desiredTime: req.desired_time,
        requesterGender: rq.requester?.gender ?? null,
      };

      const score = scoreMatch(rideForMatch, reqForMatch);
      if (score >= MATCH_THRESHOLD) {
        toInsert.push({ ride_id: ride.id, request_id: req.id, score });
      }
    }
  }

  if (toInsert.length > 0) {
    await supabase
      .from("ride_matches")
      .upsert(toInsert, { onConflict: "ride_id,request_id", ignoreDuplicates: true });
  }
}
