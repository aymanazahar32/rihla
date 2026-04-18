import { Link } from "wouter";
import { useGetMyRides, useGetMyRequests } from "@/lib/api-client";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CarFront, MapPin, Clock, Users, ArrowRight, Navigation } from "lucide-react";
import { format, parseISO } from "date-fns";
import { LiveMap } from "@/components/LiveMap";

function initials(n: string) {
  return n.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
}

export default function MyRidesPage() {
  const { data, isLoading } = useGetMyRides();
  const { data: requests = [] } = useGetMyRequests();

  const driving = data?.drivingRides ?? [];
  const passenger = data?.passengerRides ?? [];

  const liveRide = [...driving, ...passenger].find((r: any) => r.status === "in_progress")
    || [...driving, ...passenger].find((r: any) => r.status === "scheduled");

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My rides</h1>
        <p className="text-muted-foreground mt-1">Track your active rides and trip history.</p>
      </div>

      {liveRide && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Navigation className="w-5 h-5 text-primary" /> Live tracking</h2>
            <Link href={`/rides/${liveRide.id}`}><Button variant="ghost" size="sm">View ride <ArrowRight className="w-3 h-3 ml-1" /></Button></Link>
          </div>
          <LiveMap rideId={liveRide.id} />
          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            <RideMini ride={liveRide} />
          </div>
        </section>
      )}

      <Tabs defaultValue="driving">
        <TabsList className="mb-4">
          <TabsTrigger value="driving">Driving ({driving.length})</TabsTrigger>
          <TabsTrigger value="riding">Riding ({passenger.length})</TabsTrigger>
          <TabsTrigger value="requests">My requests ({requests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="driving">
          <RideList rides={driving} emptyText="You haven't created any rides yet." isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="riding">
          <RideList rides={passenger} emptyText="You haven't joined any rides yet." isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="requests">
          {requests.length === 0 ? (
            <Card className="border-dashed border-2 bg-muted/30 p-12 text-center text-muted-foreground">No open requests.</Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {requests.map((rr: any) => (
                <Card key={rr.id} className="border-0 ring-1 ring-border/50">
                  <CardContent className="p-4">
                    <Badge variant="secondary" className="mb-2 text-[10px] uppercase">{rr.contextType}{rr.prayerName ? ` · ${rr.prayerName}` : ""}</Badge>
                    <div className="font-medium text-sm">{rr.pickupLocation}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {format(parseISO(rr.desiredTime), "MMM d, h:mm a")}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Layout>
  );
}

function RideList({ rides, emptyText, isLoading }: { rides: any[]; emptyText: string; isLoading: boolean }) {
  if (isLoading) return <div className="grid sm:grid-cols-2 gap-3">{[...Array(2)].map((_, i) => <Card key={i} className="h-32 animate-pulse border-0 ring-1 ring-border/50" />)}</div>;
  if (rides.length === 0) return <Card className="border-dashed border-2 bg-muted/30 p-12 text-center text-muted-foreground">{emptyText}</Card>;
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {rides.map((r) => <RideMini key={r.id} ride={r} />)}
    </div>
  );
}

function RideMini({ ride }: { ride: any }) {
  const dest = ride.event?.name || ride.masjid?.name || ride.errand?.title || "Trip";
  return (
    <Link href={`/rides/${ride.id}`}>
      <Card className="hover:shadow-md transition cursor-pointer border-0 ring-1 ring-border/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="w-10 h-10"><AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials(ride.driver?.name ?? "?")}</AvatarFallback></Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold truncate">{dest}</span>
                <Badge variant={ride.status === "in_progress" ? "default" : "secondary"} className="text-[10px] capitalize">{ride.status.replace("_", " ")}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {ride.departureLocation}</div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(parseISO(ride.departureTime), "MMM d, h:mm a")}</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {ride.seatsAvailable}/{ride.seatsTotal}</span>
              </div>
            </div>
            <CarFront className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
