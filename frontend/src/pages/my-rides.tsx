import { Link } from "wouter";
import { format } from "date-fns";
import { useGetMyRides, useGetMe } from "@/lib/api-client";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, CarFront, User, ArrowRight, ShieldCheck, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MyRidesPage() {
  const { data: myRides, isLoading } = useGetMyRides();
  const { data: user } = useGetMe();

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto w-full">
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">My Rides</h1>
            <p className="text-muted-foreground">Manage your upcoming trips and carpools.</p>
          </div>
          {user?.role === 'driver' && (
            <Link href="/events">
              <Button className="rounded-full shadow-sm">Offer a New Ride</Button>
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="w-full h-40 rounded-2xl" />
            <Skeleton className="w-full h-40 rounded-2xl" />
          </div>
        ) : !myRides ? (
          <div>Failed to load rides.</div>
        ) : (
          <Tabs defaultValue={user?.role === 'driver' ? "driving" : "riding"} className="w-full">
            <TabsList className="w-full max-w-md grid grid-cols-2 mb-8 h-12 rounded-xl bg-muted/50 p-1">
              <TabsTrigger value="riding" className="rounded-lg font-medium text-base data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Riding ({myRides.passengerRides.length})
              </TabsTrigger>
              <TabsTrigger value="driving" className="rounded-lg font-medium text-base data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Driving ({myRides.drivingRides.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="driving" className="space-y-4">
              {myRides.drivingRides.length === 0 ? (
                <EmptyState
                  title="You aren't driving to any events"
                  description="Offer a ride to help fellow attendees get there and share the cost."
                  actionLabel="Browse Events"
                  actionUrl="/events"
                  icon={<CarFront className="w-8 h-8 text-muted-foreground" />}
                />
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {myRides.drivingRides.map((ride: any) => (
                    <RideCard key={ride.id} ride={ride} type="driving" />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="riding" className="space-y-4">
              {myRides.passengerRides.length === 0 ? (
                <EmptyState
                  title="You haven't joined any rides"
                  description="Find an event you're attending and hop in a carpool."
                  actionLabel="Find a Ride"
                  actionUrl="/events"
                  icon={<User className="w-8 h-8 text-muted-foreground" />}
                />
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {myRides.passengerRides.map((ride: any) => (
                    <RideCard key={ride.id} ride={ride} type="riding" />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
}

function EmptyState({ title, description, actionLabel, actionUrl, icon }: {
  title: string; description: string; actionLabel: string; actionUrl: string; icon: React.ReactNode;
}) {
  return (
    <div className="text-center py-16 px-4 rounded-3xl border-2 border-dashed border-muted bg-muted/10">
      <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">{description}</p>
      <Link href={actionUrl}>
        <Button variant="outline" className="rounded-full">{actionLabel}</Button>
      </Link>
    </div>
  );
}

function RideCard({ ride, type }: { ride: any; type: "driving" | "riding" }) {
  const isPast = new Date(ride.departureTime) < new Date();

  return (
    <Link href={`/rides/${ride.id}`}>
      <Card className={`group overflow-hidden cursor-pointer transition-all hover:shadow-md border-0 shadow-sm ${isPast ? 'opacity-60' : ''}`}>
        <div className={`h-2 w-full ${type === 'driving' ? 'bg-primary' : 'bg-accent'}`} />
        <CardContent className="p-0 flex flex-col sm:flex-row">
          <div className="p-6 bg-muted/20 border-b sm:border-b-0 sm:border-r flex flex-col justify-center sm:w-48 shrink-0">
            <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">
              {format(new Date(ride.departureTime), "MMM d")}
            </div>
            <div className="text-2xl font-bold">
              {format(new Date(ride.departureTime), "h:mm a")}
            </div>
            {isPast && <Badge variant="outline" className="mt-2 w-fit bg-background">Past</Badge>}
          </div>

          <div className="p-6 flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs bg-secondary/10 text-secondary-foreground border-0">
                {type === 'driving' ? 'Driver' : 'Passenger'}
              </Badge>
              <span className="font-semibold text-lg line-clamp-1">{ride.event.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <MapPin className="w-4 h-4 text-primary/60 shrink-0" />
              <span className="truncate">From: {ride.departureLocation}</span>
            </div>
          </div>

          <div className="p-6 flex sm:flex-col items-center justify-between sm:justify-center border-t sm:border-t-0 sm:border-l gap-4 sm:w-48 shrink-0 bg-background">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-foreground font-medium">
                {type === 'driving' ? (
                  <><Users className="w-4 h-4 text-primary" /> {ride.passengers.length} Riders</>
                ) : (
                  <><CarFront className="w-4 h-4 text-primary" /> {ride.driver.name}</>
                )}
              </div>
              {type === 'driving' && (
                <div className="text-xs text-muted-foreground mt-1">{ride.seatsAvailable} seats left</div>
              )}
            </div>
            <Button variant="ghost" className="rounded-full group-hover:bg-primary group-hover:text-primary-foreground hidden sm:flex">View</Button>
            <ArrowRight className="w-5 h-5 text-muted-foreground sm:hidden" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
