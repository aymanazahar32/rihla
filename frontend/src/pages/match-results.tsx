import { useMemo } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CarFront, HandHelping, Clock, MapPin, Users } from "lucide-react";
import { useListRides, useListRideRequests, useGetMe } from "@/lib/api-client";
import { maySeePersonByGender } from "@/lib/gender-visibility";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function isNearTime(isoA: string, isoB: string | null) {
  if (!isoB) return true;
  return Math.abs(new Date(isoA).getTime() - new Date(isoB).getTime()) <= TWO_HOURS_MS;
}

export default function MatchResultsPage() {
  const [, setLocation] = useLocation();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  const contextType = params.get("contextType") as "masjid" | "event" | "errand" | null;
  const contextId = parseInt(params.get("contextId") || "0", 10);
  const prayerName = params.get("prayerName") || undefined;
  const timeISO = params.get("timeISO") || null;

  const { data: me } = useGetMe();
  const viewer = me ? { id: me.id, gender: me.gender ?? null, userType: me.userType } : null;

  const { data: rides = [], isLoading: ridesLoading } = useListRides(
    { contextType: contextType ?? undefined, contextId: contextId || undefined, prayerName },
    { query: { enabled: contextId > 0 } }
  );

  const { data: requests = [], isLoading: requestsLoading } = useListRideRequests(
    { contextType: contextType ?? undefined, contextId: contextId || undefined, prayerName },
    { query: { enabled: contextId > 0 } }
  );

  const matchingRides = (rides as any[]).filter(
    (r) =>
      r.status === "scheduled" &&
      r.seatsAvailable > 0 &&
      isNearTime(r.departureTime, timeISO) &&
      maySeePersonByGender(viewer, r.driver?.gender)
  );

  const matchingRequests = (requests as any[]).filter(
    (r) =>
      r.status === "pending" &&
      isNearTime(r.desiredTime, timeISO) &&
      maySeePersonByGender(viewer, r.requester?.gender)
  );

  const destinationLabel =
    prayerName
      ? prayerName
      : contextType === "masjid"
      ? "the masjid"
      : contextType === "event"
      ? "the event"
      : contextType === "errand"
      ? "the errand"
      : "this destination";

  const contextParams = new URLSearchParams();
  if (contextType) contextParams.set("contextType", contextType);
  if (contextId) contextParams.set("contextId", String(contextId));
  if (prayerName) contextParams.set("prayerName", prayerName);
  const offerUrl = `/rides/new?${contextParams.toString()}`;
  const requestUrl = `/requests/new?${contextParams.toString()}`;

  const isLoading = ridesLoading || requestsLoading;

  return (
    <Layout>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => window.history.back()}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Button>

      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Rides to {destinationLabel}</h1>
          <p className="text-muted-foreground text-sm mt-1">Join an existing ride or post your own.</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Available rides */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <CarFront className="w-4 h-4" /> Available rides ({matchingRides.length})
              </h2>
              {matchingRides.length > 0 ? (
                matchingRides.map((ride: any) => (
                  <Card key={ride.id} className="border-0 ring-1 ring-border/50 hover:ring-primary/30 transition-all cursor-pointer" onClick={() => setLocation(`/rides/${ride.id}`)}>
                    <CardContent className="p-5 flex items-center justify-between gap-4">
                      <div className="space-y-1.5 min-w-0">
                        <p className="font-semibold truncate">{ride.driver?.name ?? "Driver"}</p>
                        {ride.driver?.carMake && (
                          <p className="text-xs text-muted-foreground">{ride.driver.carColor} {ride.driver.carMake} {ride.driver.carModel}</p>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(ride.departureTime)}</span>
                          {ride.departureLocation && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ride.departureLocation}</span>}
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{ride.seatsAvailable} seat{ride.seatsAvailable !== 1 ? "s" : ""} left</span>
                        </div>
                      </div>
                      <Button size="sm" className="shrink-0 rounded-full" onClick={(e) => { e.stopPropagation(); setLocation(`/rides/${ride.id}`); }}>
                        Join
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-1">No rides posted yet.</p>
              )}
            </section>

            {/* Pending requests */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <HandHelping className="w-4 h-4" /> Riders waiting ({matchingRequests.length})
              </h2>
              {matchingRequests.length > 0 ? (
                matchingRequests.map((req: any) => (
                  <Card key={req.id} className="border-0 ring-1 ring-border/50">
                    <CardContent className="p-5 space-y-1.5">
                      <p className="font-semibold">{req.requester?.name ?? "Rider"}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(req.desiredTime)}</span>
                        {req.pickupLocation && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{req.pickupLocation}</span>}
                      </div>
                      {req.notes && <p className="text-xs text-muted-foreground italic">"{req.notes}"</p>}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-2 px-1">No ride requests yet.</p>
              )}
            </section>

            {/* Dual CTAs */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="outline"
                className="rounded-full flex items-center gap-2"
                onClick={() => setLocation(offerUrl)}
              >
                <CarFront className="w-4 h-4" /> I'm driving
              </Button>
              <Button
                className="rounded-full flex items-center gap-2"
                onClick={() => setLocation(requestUrl)}
              >
                <HandHelping className="w-4 h-4" /> I need a ride
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
