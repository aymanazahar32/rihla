import { useParams, Link } from "wouter";
import { format } from "date-fns";
import {
  useGetEvent,
  getGetEventQueryKey,
  useGetEventSummary,
  getGetEventSummaryQueryKey,
  useListRides,
  getListRidesQueryKey,
  useGetMe
} from "@/lib/api-client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Calendar, Users, CarFront, Info, UsersRound, Plus, ArrowLeft } from "lucide-react";

export default function EventDetailPage() {
  const params = useParams();
  const eventId = Number(params.eventId);

  const { data: user } = useGetMe();

  const { data: event, isLoading: isEventLoading } = useGetEvent(eventId, {
    query: { enabled: !!eventId, queryKey: getGetEventQueryKey(eventId) }
  });

  const { data: summary, isLoading: isSummaryLoading } = useGetEventSummary(eventId, {
    query: { enabled: !!eventId, queryKey: getGetEventSummaryQueryKey(eventId) }
  });

  const { data: rides, isLoading: isRidesLoading } = useListRides({ eventId }, {
    query: { enabled: !!eventId, queryKey: getListRidesQueryKey({ eventId }) }
  });

  const isDriver = user?.role === 'driver';

  if (isEventLoading || isSummaryLoading || isRidesLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="w-24 h-8" />
          <div className="bg-muted h-64 rounded-3xl w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-20 w-full" />
            </div>
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold">Event not found</h2>
          <Link href="/events" className="text-primary hover:underline mt-4 inline-block">
            Back to events
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Link href="/events" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to events
        </Link>

        <div className="relative rounded-3xl overflow-hidden bg-muted aspect-[21/9] md:aspect-[3/1]">
          {event.imageUrl ? (
            <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
              <Calendar className="w-24 h-24 text-primary/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white">
            <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 mb-4">{event.category}</Badge>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2 text-white">{event.name}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-white/90 text-sm md:text-base">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 shrink-0 text-secondary" />
                <span>{format(new Date(event.dateTime), "EEEE, MMMM d, yyyy • h:mm a")}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 shrink-0 text-secondary" />
                <span>{event.location}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Info className="w-6 h-6 text-primary" /> About this event
              </h2>
              <p className="text-muted-foreground leading-relaxed">{event.description}</p>
            </section>

            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <CarFront className="w-6 h-6 text-primary" /> Available Rides
                </h2>
                {isDriver && (
                  <Link href={`/rides/new?eventId=${event.id}`}>
                    <Button className="rounded-full shadow-md bg-secondary text-secondary-foreground hover:bg-secondary/90 w-full sm:w-auto">
                      <Plus className="w-4 h-4 mr-2" /> Offer a Ride
                    </Button>
                  </Link>
                )}
              </div>

              {!rides || rides.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-3xl border-2 border-dashed border-muted bg-muted/10">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <CarFront className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold">No rides available yet</h3>
                  <p className="text-muted-foreground mt-1">
                    {isDriver ? "Be the first to offer a ride!" : "Check back later or become a driver."}
                  </p>
                  {isDriver && (
                    <Link href={`/rides/new?eventId=${event.id}`} className="mt-4 inline-block">
                      <Button variant="outline">Offer a Ride</Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {rides.map((ride: any, i: number) => (
                    <Link key={ride.id} href={`/rides/${ride.id}`}>
                      <Card className="hover:border-primary/50 transition-colors cursor-pointer animate-in fade-in slide-in-from-bottom-2 border shadow-sm group" style={{ animationDelay: `${i * 50}ms` }}>
                        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0 shadow-sm border border-primary/20">
                              {ride.driver.name.charAt(0)}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-lg">{ride.driver.name}</h4>
                                {ride.incentiveLabel && (
                                  <Badge className="bg-secondary/20 text-secondary-foreground hover:bg-secondary/30 border-0">{ride.incentiveLabel}</Badge>
                                )}
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="w-4 h-4 text-primary/70" />
                                  <span className="truncate max-w-[200px]">{ride.departureLocation}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-4 h-4 text-primary/70" />
                                  <span>{format(new Date(ride.departureTime), "MMM d, h:mm a")}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-border/50">
                            <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1 rounded-full text-sm font-medium">
                              <Users className="w-4 h-4 text-primary" />
                              <span className={ride.seatsAvailable === 0 ? "text-destructive" : ""}>
                                {ride.seatsAvailable} / {ride.seatsTotal} seats
                              </span>
                            </div>
                            <Button variant="ghost" className="group-hover:bg-primary group-hover:text-primary-foreground rounded-full px-6 transition-all hidden sm:flex">
                              Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <Card className="bg-primary/5 border-primary/10 shadow-sm sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UsersRound className="w-5 h-5 text-primary" /> Community Stats
                </CardTitle>
                <CardDescription>Event carpooling overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {summary && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-background rounded-2xl p-4 text-center shadow-sm">
                      <div className="text-3xl font-bold text-primary mb-1">{summary.totalRides}</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Rides</div>
                    </div>
                    <div className="bg-background rounded-2xl p-4 text-center shadow-sm">
                      <div className="text-3xl font-bold text-secondary mb-1">{summary.availableSeats}</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Open Seats</div>
                    </div>
                    <div className="bg-background rounded-2xl p-4 text-center shadow-sm">
                      <div className="text-3xl font-bold text-accent-foreground mb-1">{summary.totalPassengers}</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Riders</div>
                    </div>
                    <div className="bg-background rounded-2xl p-4 text-center shadow-sm">
                      <div className="text-3xl font-bold text-foreground mb-1">{summary.ridesWithSpace}</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Rides Available</div>
                    </div>
                  </div>
                )}

                <div className="bg-primary/10 p-4 rounded-2xl">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <CarFront className="w-4 h-4 text-primary" /> Why Carpool?
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Save on parking and gas costs</li>
                    <li>• Reduce traffic congestion at the venue</li>
                    <li>• Meet fellow fans before the event</li>
                    <li>• Lower your carbon footprint</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
