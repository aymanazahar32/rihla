import { Link } from "wouter";
import { useGetMyRides, useGetMyRequests, useGetMe } from "@/lib/api-client";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CarFront, MapPin, Clock, Users, ArrowRight,
  Navigation, Star, CheckCircle2, Loader2, ShieldCheck
} from "lucide-react";
import { format, parseISO } from "date-fns";

function initials(n: string) {
  return n.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
}

function StarRow({ stars }: { stars: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className="w-3 h-3"
          fill={s <= stars ? "#f59e0b" : "none"}
          stroke={s <= stars ? "#f59e0b" : "#d1d5db"}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

function useMyRatings(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-ratings", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("ride_ratings")
        .select("ride_id, stars, comment")
        .eq("rater_id", userId!);
      return (data ?? []) as Array<{ ride_id: number; stars: number; comment: string | null }>;
    },
  });
}

function useReceivedRatings(userId: string | undefined) {
  return useQuery({
    queryKey: ["received-ratings", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("ride_ratings")
        .select("stars, comment, rater:profiles!rater_id(name)")
        .eq("rated_id", userId!);
      return (data ?? []) as Array<{ stars: number; comment: string | null; rater: { name: string } | null }>;
    },
  });
}

export default function MyRidesPage() {
  const { data: me } = useGetMe();
  const { data, isLoading } = useGetMyRides();
  const { data: requests = [] } = useGetMyRequests();
  const { data: myRatings = [] } = useMyRatings(me?.id);
  const { data: receivedRatings = [] } = useReceivedRatings(me?.id);

  const driving: any[] = data?.drivingRides ?? [];
  const passenger: any[] = data?.passengerRides ?? [];

  const avgRating = receivedRatings.length
    ? receivedRatings.reduce((s, r) => s + r.stars, 0) / receivedRatings.length
    : null;

  const ratingByRide = Object.fromEntries(myRatings.map((r) => [r.ride_id, r]));

  const liveRide = [...driving, ...passenger].find((r: any) => r.status === "in_progress")
    ?? [...driving, ...passenger].find((r: any) => r.status === "scheduled");

  return (
    <Layout>
      <div className="max-w-2xl mx-auto w-full space-y-6 pb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">My Rides</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your history, requests &amp; rating</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            value={driving.length + passenger.length}
            label="Total rides"
            color="text-primary"
          />
          <StatCard
            value={driving.filter((r) => r.status === "completed").length}
            label="Trips given"
            color="text-emerald-600"
          />
          <div className="rounded-2xl ring-1 ring-border/50 bg-card p-4 text-center flex flex-col items-center justify-center gap-0.5">
            {avgRating !== null ? (
              <>
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-extrabold text-amber-500">{avgRating.toFixed(1)}</span>
                  <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
                </div>
                <span className="text-[11px] text-muted-foreground">{receivedRatings.length} rating{receivedRatings.length !== 1 ? "s" : ""}</span>
              </>
            ) : (
              <>
                <span className="text-2xl font-extrabold text-muted-foreground/40">—</span>
                <span className="text-[11px] text-muted-foreground">No ratings yet</span>
              </>
            )}
          </div>
        </div>

        {/* Active ride highlight */}
        {liveRide && (
          <Card className={`border-0 ring-2 shadow-md ${liveRide.status === "in_progress" ? "ring-amber-300 bg-amber-50/40" : "ring-blue-200 bg-blue-50/30"}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${liveRide.status === "in_progress" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}`}>
                {liveRide.status === "in_progress"
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <Clock className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">
                  {liveRide.status === "in_progress" ? "Ride in progress" : "Upcoming ride"}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {liveRide.event?.name ?? liveRide.masjid?.name ?? liveRide.errand?.title ?? "Trip"}
                  {liveRide.departureTime && ` · ${format(parseISO(liveRide.departureTime), "h:mm a")}`}
                </div>
              </div>
              <Link href={`/rides/${liveRide.id}`}>
                <Button size="sm" variant="outline" className="rounded-full shrink-0">
                  View <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Received ratings showcase */}
        {receivedRatings.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">Reviews received</p>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {receivedRatings.slice(0, 5).map((r, i) => (
                <div key={i} className="flex items-start gap-3 bg-muted/40 rounded-xl px-3 py-2.5">
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                      {initials(r.rater?.name ?? "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{r.rater?.name}</span>
                      <StarRow stars={r.stars} />
                    </div>
                    {r.comment && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">"{r.comment}"</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="driving">
          <TabsList className="w-full">
            <TabsTrigger value="driving" className="flex-1">Driving ({driving.length})</TabsTrigger>
            <TabsTrigger value="riding" className="flex-1">Riding ({passenger.length})</TabsTrigger>
            <TabsTrigger value="requests" className="flex-1">Requests ({requests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="driving" className="space-y-2 mt-3">
            {isLoading
              ? [1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
              : driving.length === 0
                ? <Empty text="You haven't offered any rides yet." />
                : driving.map((r) => <RideCard key={r.id} ride={r} role="driver" rating={ratingByRide[r.id]} />)}
          </TabsContent>

          <TabsContent value="riding" className="space-y-2 mt-3">
            {isLoading
              ? [1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
              : passenger.length === 0
                ? <Empty text="You haven't joined any rides yet." />
                : passenger.map((r) => <RideCard key={r.id} ride={r} role="passenger" rating={ratingByRide[r.id]} />)}
          </TabsContent>

          <TabsContent value="requests" className="space-y-2 mt-3">
            {requests.length === 0
              ? <Empty text="No open ride requests." />
              : requests.map((rr: any) => (
                <Card key={rr.id} className="border-0 ring-1 ring-border/40">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {rr.contextType}{rr.prayerName ? ` · ${rr.prayerName}` : ""}
                      </Badge>
                      <Badge variant={rr.status === "accepted" ? "default" : "secondary"} className="text-[10px] capitalize">
                        {rr.status}
                      </Badge>
                    </div>
                    <div className="font-medium text-sm">{rr.pickupLocation}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {rr.desiredTime ? format(parseISO(rr.desiredTime), "MMM d, h:mm a") : "—"}
                    </div>
                    {rr.acceptedDriver && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" />
                        Accepted by {rr.acceptedDriver.name}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="rounded-2xl ring-1 ring-border/50 bg-card p-4 text-center">
      <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center rounded-2xl ring-1 ring-dashed ring-border/60 bg-muted/20">
      <CarFront className="w-8 h-8 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function RideCard({ ride, role, rating }: { ride: any; role: "driver" | "passenger"; rating?: { stars: number; comment: string | null } }) {
  const dest = ride.event?.name ?? ride.masjid?.name ?? ride.errand?.title ?? "Trip";
  const isDriver = role === "driver";

  return (
    <Link href={`/rides/${ride.id}`}>
      <Card className="border-0 ring-1 ring-border/40 hover:ring-primary/30 hover:shadow-md transition-all cursor-pointer">
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${isDriver ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-600"}`}>
            {isDriver ? <Navigation className="w-5 h-5" /> : <CarFront className="w-5 h-5" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm truncate">{dest}</span>
              <Badge
                variant="secondary"
                className={`text-[10px] capitalize ${
                  ride.status === "in_progress" ? "bg-amber-100 text-amber-700" :
                  ride.status === "completed"   ? "bg-emerald-100 text-emerald-700" :
                  ride.status === "scheduled"   ? "bg-blue-100 text-blue-700" : ""
                }`}
              >
                {ride.status.replace("_", " ")}
              </Badge>
            </div>

            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              {ride.departureLocation && (
                <span className="flex items-center gap-1 truncate max-w-[140px]">
                  <MapPin className="w-3 h-3 shrink-0" />{ride.departureLocation}
                </span>
              )}
              {ride.departureTime && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />{format(parseISO(ride.departureTime), "MMM d, h:mm a")}
                </span>
              )}
              {isDriver && ride.seatsAvailable !== undefined && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />{ride.seatsAvailable}/{ride.seatsTotal}
                </span>
              )}
            </div>

            {rating && (
              <div className="flex items-center gap-2 mt-1.5">
                <StarRow stars={rating.stars} />
                {rating.comment && (
                  <span className="text-[11px] text-muted-foreground truncate">"{rating.comment}"</span>
                )}
              </div>
            )}
          </div>

          {!rating && ride.status === "completed" && !isDriver && (
            <span className="text-[10px] text-primary shrink-0 font-medium">Rate →</span>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
