import { useGetRide, useJoinRide, useLeaveRide, useDeleteRide, useStartRide, useCompleteRide, useGetMe, getGetRideQueryKey, getGetMyRidesQueryKey } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CarFront, MapPin, Clock, Users, ArrowLeft, Trash2, ShieldCheck, Play, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { LiveMap } from "@/components/LiveMap";

function initials(n: string) {
  return n.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
}

export default function RideDetailPage({ rideId }: { rideId: number }) {
  const { data: ride, isLoading } = useGetRide(rideId);
  const { data: me } = useGetMe();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const join = useJoinRide();
  const leave = useLeaveRide();
  const del = useDeleteRide();
  const start = useStartRide();
  const complete = useCompleteRide();

  if (isLoading) return <Layout><div className="h-64 animate-pulse bg-muted rounded-xl" /></Layout>;
  if (!ride) return <Layout><div className="text-center py-16 text-muted-foreground">Ride not found.</div></Layout>;

  const isDriver = me?.id === ride.driverId;
  const isPassenger = ride.passengers?.some((p: any) => p.id === me?.id);
  const dest = ride.event?.name || ride.masjid?.name || ride.errand?.title || "Trip";
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getGetRideQueryKey(rideId) });
    queryClient.invalidateQueries({ queryKey: getGetMyRidesQueryKey() });
  };

  return (
    <Layout>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => window.history.back()}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 ring-1 ring-border/40">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Badge variant="secondary" className="mb-2 text-[10px] uppercase">{ride.contextType}{ride.prayerName ? ` · ${ride.prayerName}` : ""}</Badge>
                  <h1 className="text-3xl font-bold tracking-tight">{dest}</h1>
                </div>
                <Badge className={ride.status === "in_progress" ? "bg-emerald-100 text-emerald-700" : ride.status === "completed" ? "bg-gray-100 text-gray-700" : "bg-amber-100 text-amber-700"}>{ride.status.replace("_", " ")}</Badge>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" /><div><div className="text-muted-foreground text-xs">Departure</div><div className="font-medium">{ride.departureLocation}</div></div></div>
                <div className="flex items-start gap-2"><Clock className="w-4 h-4 mt-0.5 text-muted-foreground" /><div><div className="text-muted-foreground text-xs">Time</div><div className="font-medium">{format(parseISO(ride.departureTime), "EEE, MMM d • h:mm a")}</div></div></div>
                <div className="flex items-start gap-2"><Users className="w-4 h-4 mt-0.5 text-muted-foreground" /><div><div className="text-muted-foreground text-xs">Seats</div><div className="font-medium">{ride.seatsAvailable} of {ride.seatsTotal} available</div></div></div>
                {ride.incentiveLabel && <div className="flex items-start gap-2"><CarFront className="w-4 h-4 mt-0.5 text-muted-foreground" /><div><div className="text-muted-foreground text-xs">Incentive</div><div className="font-medium">{ride.incentiveLabel}</div></div></div>}
              </div>
              {ride.notes && <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm italic text-muted-foreground">"{ride.notes}"</div>}
            </CardContent>
          </Card>

          <div>
            <h2 className="text-lg font-semibold mb-3">Logistics & live tracking</h2>
            <LiveMap rideId={ride.id} height="380px" />
          </div>
        </div>

        <div className="space-y-4">
          <Card className="border-0 ring-1 ring-border/40">
            <CardContent className="p-5">
              <div className="text-xs text-muted-foreground uppercase font-semibold mb-3">Driver</div>
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12"><AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials(ride.driver?.name ?? "?")}</AvatarFallback></Avatar>
                <div>
                  <div className="font-semibold flex items-center gap-1">{ride.driver?.name} {ride.driver?.idVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}</div>
                  <div className="text-xs text-muted-foreground">{ride.driver?.carColor} {ride.driver?.carMake} {ride.driver?.carModel}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 ring-1 ring-border/40">
            <CardContent className="p-5">
              <div className="text-xs text-muted-foreground uppercase font-semibold mb-3">Passengers ({ride.passengers?.length ?? 0})</div>
              {(!ride.passengers || ride.passengers.length === 0) ? (
                <div className="text-sm text-muted-foreground">No passengers yet.</div>
              ) : (
                <div className="space-y-2">
                  {ride.passengers.map((p: any) => (
                    <div key={p.id} className="flex items-center gap-2 text-sm">
                      <Avatar className="w-7 h-7"><AvatarFallback className="bg-muted text-xs">{initials(p.name)}</AvatarFallback></Avatar>
                      <span>{p.name}</span>
                      {p.idVerified && <ShieldCheck className="w-3 h-3 text-emerald-500" />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 ring-1 ring-border/40">
            <CardContent className="p-5 space-y-2">
              {isDriver ? (
                <>
                  {ride.status === "scheduled" && (
                    <Button className="w-full rounded-full" onClick={() => start.mutate({ rideId }, { onSuccess: () => { refresh(); toast({ title: "Ride started" }); } })}>
                      <Play className="w-4 h-4 mr-2" /> Start ride
                    </Button>
                  )}
                  {ride.status === "in_progress" && (
                    <Button className="w-full rounded-full" onClick={() => complete.mutate({ rideId }, { onSuccess: () => { refresh(); toast({ title: "Ride completed" }); } })}>
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Complete ride
                    </Button>
                  )}
                  <Button variant="destructive" className="w-full rounded-full" onClick={() => del.mutate({ rideId }, { onSuccess: () => { toast({ title: "Ride deleted" }); setLocation("/my-rides"); } })}>
                    <Trash2 className="w-4 h-4 mr-2" /> Delete ride
                  </Button>
                </>
              ) : isPassenger ? (
                <Button variant="outline" className="w-full rounded-full" onClick={() => leave.mutate({ rideId }, { onSuccess: () => { refresh(); toast({ title: "Left ride" }); } })}>
                  Leave ride
                </Button>
              ) : (
                <Button className="w-full rounded-full" disabled={ride.seatsAvailable <= 0} onClick={() => join.mutate({ rideId }, { onSuccess: () => { refresh(); toast({ title: "Joined!" }); } })}>
                  {ride.seatsAvailable <= 0 ? "Full" : "Join this ride"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
