import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft, CarFront, HandHelping, Clock, MapPin,
  Users, Sparkles, Navigation, Plus, Loader2
} from "lucide-react";
import { useListRides, useListRideRequests, useGetMe } from "@/lib/api-client";
import { maySeePersonByGender } from "@/lib/gender-visibility";
import { haversineKm } from "@/lib/matching";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function initials(n: string) {
  return n.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
}

function isNearTime(isoA: string, isoB: string | null) {
  if (!isoB) return true;
  return Math.abs(new Date(isoA).getTime() - new Date(isoB).getTime()) <= TWO_HOURS_MS;
}

function distLabel(km: number | null) {
  if (km === null) return null;
  return km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`;
}

export default function MatchResultsPage() {
  const [, setLocation] = useLocation();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  const contextType = params.get("contextType") as "masjid" | "event" | "errand" | null;
  const contextId = parseInt(params.get("contextId") || "0", 10);
  const prayerName = params.get("prayerName") || undefined;
  const timeISO = params.get("timeISO") || null;

  const { data: me } = useGetMe();
  const viewer = me ? { id: me.id, gender: (me as any).gender ?? null, userType: me.userType } : null;

  // User's current GPS position for distance scoring
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setUserPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }, []);

  const { data: rides = [], isLoading: ridesLoading } = useListRides(
    { contextType: contextType ?? undefined, contextId: contextId || undefined, prayerName },
    { query: { enabled: contextId > 0 } }
  );

  const { data: requests = [], isLoading: requestsLoading } = useListRideRequests(
    { contextType: contextType ?? undefined, contextId: contextId || undefined, prayerName },
    { query: { enabled: contextId > 0 } }
  );

  // Filter + score rides by proximity to user
  const scoredRides = useMemo(() => {
    return (rides as any[])
      .filter(
        (r) =>
          r.status === "scheduled" &&
          r.seatsAvailable > 0 &&
          isNearTime(r.departureTime, timeISO) &&
          maySeePersonByGender(viewer, r.driver?.gender)
      )
      .map((r) => {
        const dist =
          userPos && r.departureLat && r.departureLng
            ? haversineKm(userPos.lat, userPos.lng, r.departureLat, r.departureLng)
            : null;
        return { ...r, dist };
      })
      .sort((a, b) => {
        if (a.dist === null && b.dist === null) return 0;
        if (a.dist === null) return 1;
        if (b.dist === null) return -1;
        return a.dist - b.dist;
      });
  }, [rides, userPos, timeISO, viewer]);

  const matchingRequests = (requests as any[]).filter(
    (r) =>
      r.status === "pending" &&
      isNearTime(r.desiredTime, timeISO) &&
      maySeePersonByGender(viewer, r.requester?.gender)
  );

  const destinationLabel =
    prayerName ? prayerName
    : contextType === "masjid" ? "the masjid"
    : contextType === "event" ? "the event"
    : contextType === "errand" ? "the errand"
    : "this destination";

  const contextParams = new URLSearchParams();
  if (contextType) contextParams.set("contextType", contextType);
  if (contextId) contextParams.set("contextId", String(contextId));
  if (prayerName) contextParams.set("prayerName", prayerName);
  const offerUrl = `/rides/new?${contextParams.toString()}`;
  const requestUrl = `/requests/new?${contextParams.toString()}`;

  const isLoading = ridesLoading || requestsLoading;
  const bestRide = scoredRides[0] ?? null;
  const otherRides = scoredRides.slice(1);

  return (
    <Layout>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => window.history.back()}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Button>

      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rides to {destinationLabel}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {userPos ? "Sorted by distance from your location." : "Join an existing ride or post your own."}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* ── Best match ──────────────────────────────────── */}
            {bestRide ? (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold">Best match</span>
                  {bestRide.dist !== null && (
                    <Badge variant="secondary" className="text-[10px] ml-auto">
                      <Navigation className="w-2.5 h-2.5 mr-1" />
                      {distLabel(bestRide.dist)}
                    </Badge>
                  )}
                </div>

                <Card
                  className="border-0 ring-2 ring-primary/40 bg-gradient-to-br from-primary/5 to-white shadow-md cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => setLocation(`/rides/${bestRide.id}`)}
                >
                  <CardContent className="p-5 flex items-center gap-4">
                    <Avatar className="w-12 h-12 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {initials(bestRide.driver?.name ?? "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-bold">{bestRide.driver?.name ?? "Driver"}</p>
                      {bestRide.driver?.carMake && (
                        <p className="text-xs text-muted-foreground">
                          {[bestRide.driver.carColor, bestRide.driver.carMake, bestRide.driver.carModel].filter(Boolean).join(" ")}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />{formatTime(bestRide.departureTime)}
                        </span>
                        {bestRide.departureLocation && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{bestRide.departureLocation}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />{bestRide.seatsAvailable} seat{bestRide.seatsAvailable !== 1 ? "s" : ""} left
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="shrink-0 rounded-full bg-primary"
                      onClick={(e) => { e.stopPropagation(); setLocation(`/rides/${bestRide.id}`); }}
                    >
                      Join
                    </Button>
                  </CardContent>
                </Card>
              </section>
            ) : (
              /* ── No rides empty state ── */
              <Card className="border-0 ring-1 ring-dashed ring-border/60 bg-muted/20">
                <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                  <CarFront className="w-10 h-10 text-muted-foreground/30" />
                  <div>
                    <p className="font-semibold">No rides available yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Be the first to offer a ride to {destinationLabel}, or post a request and get matched when a driver shows up.
                    </p>
                  </div>
                  <div className="flex gap-3 flex-wrap justify-center">
                    <Button className="rounded-full gap-2" onClick={() => setLocation(offerUrl)}>
                      <Plus className="w-4 h-4" /> Offer a ride
                    </Button>
                    <Button variant="outline" className="rounded-full gap-2" onClick={() => setLocation(requestUrl)}>
                      <HandHelping className="w-4 h-4" /> Request a ride
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Other rides ─────────────────────────────────── */}
            {otherRides.length > 0 && (
              <section className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">
                  More options
                </p>
                {otherRides.map((ride: any) => (
                  <Card
                    key={ride.id}
                    className="border-0 ring-1 ring-border/40 hover:ring-primary/30 cursor-pointer transition-all"
                    onClick={() => setLocation(`/rides/${ride.id}`)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <Avatar className="w-9 h-9 shrink-0">
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">
                          {initials(ride.driver?.name ?? "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{ride.driver?.name ?? "Driver"}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(ride.departureTime)}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{ride.seatsAvailable} left</span>
                          {ride.dist !== null && (
                            <span className="flex items-center gap-1"><Navigation className="w-3 h-3" />{distLabel(ride.dist)}</span>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="shrink-0 rounded-full" onClick={(e) => { e.stopPropagation(); setLocation(`/rides/${ride.id}`); }}>
                        Join
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </section>
            )}

            {/* ── Waiting riders (for drivers to see) ─────────── */}
            {matchingRequests.length > 0 && (
              <section className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1 flex items-center gap-2">
                  <HandHelping className="w-3.5 h-3.5" /> Riders waiting ({matchingRequests.length})
                </p>
                {matchingRequests.map((req: any) => (
                  <Card key={req.id} className="border-0 ring-1 ring-border/40">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Avatar className="w-9 h-9 shrink-0">
                        <AvatarFallback className="bg-amber-100 text-amber-700 text-xs font-bold">
                          {initials(req.requester?.name ?? "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{req.requester?.name ?? "Rider"}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(req.desiredTime)}</span>
                          {req.pickupLocation && <span className="flex items-center gap-1 truncate max-w-[160px]"><MapPin className="w-3 h-3 shrink-0" />{req.pickupLocation}</span>}
                        </div>
                        {req.notes && <p className="text-[11px] text-muted-foreground italic mt-0.5">"{req.notes}"</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </section>
            )}

            {/* ── Always-visible dual CTAs ─────────────────────── */}
            {scoredRides.length > 0 && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button variant="outline" className="rounded-full gap-2" onClick={() => setLocation(offerUrl)}>
                  <CarFront className="w-4 h-4" /> I'm driving
                </Button>
                <Button className="rounded-full gap-2" onClick={() => setLocation(requestUrl)}>
                  <HandHelping className="w-4 h-4" /> I need a ride
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
