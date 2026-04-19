import { useMemo } from "react";
import { Link } from "wouter";
import { useGetEvent, useListRides, useGetMe } from "@/lib/api-client";
import { maySeePersonByGender, displayNameForGenderPolicy } from "@/lib/gender-visibility";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, MapPin, ArrowLeft, Users, ArrowRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { RidesAndRequests } from "@/components/RidesAndRequests";

export default function EventDetailPage({ eventId }: { eventId: number }) {
  const { data: event, isLoading } = useGetEvent(eventId);
  const { data: me } = useGetMe();
  const { data: eventRides = [] } = useListRides(
    { contextType: "event", contextId: eventId },
    { query: { enabled: !!event } }
  );
  const viewer = me ? { id: me.id, gender: me.gender, userType: me.userType } : null;
  const bookableRides = useMemo(
    () =>
      eventRides.filter(
        (r: { status: string; seatsAvailable: number; driver?: { gender?: string | null } }) =>
          r.status === "scheduled" && r.seatsAvailable > 0 && maySeePersonByGender(viewer, r.driver?.gender)
      ),
    [eventRides, viewer]
  );

  if (isLoading) return <Layout><div className="h-64 animate-pulse bg-muted rounded-xl" /></Layout>;
  if (!event) return <Layout><div className="text-center py-16 text-muted-foreground">Event not found.</div></Layout>;

  return (
    <Layout>
      <Link href="/events"><Button variant="ghost" size="sm" className="mb-4 -ml-2"><ArrowLeft className="w-4 h-4 mr-1" /> Back to events</Button></Link>
      <div className="mb-8">
        <Badge className="mb-3 bg-primary/10 text-primary border-0">{event.category}</Badge>
        <h1 className="text-4xl font-bold tracking-tight">{event.name}</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">{event.description}</p>
        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {format(parseISO(event.dateTime), "EEEE, MMM d • h:mm a")}</div>
          <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {event.location}</div>
        </div>
      </div>

      {bookableRides.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">Open seats for this event</h2>
          <p className="text-sm text-muted-foreground mb-4">Book a verified driver offer — chat with the driver on the ride page before or after you join.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {bookableRides.map((r: { id: number; departureLocation: string; departureTime: string; seatsAvailable: number; seatsTotal: number; driver?: { id?: string; name?: string; gender?: string | null } }) => {
              const driverLabel =
                r.driver?.id && r.driver?.name
                  ? displayNameForGenderPolicy(viewer, r.driver.id, r.driver.name, r.driver.gender)
                  : r.driver?.name ?? "Driver";
              return (
              <Link key={r.id} href={`/rides/${r.id}`}>
                <Card className="h-full border-0 ring-1 ring-primary/20 hover:ring-primary/40 transition-all cursor-pointer bg-primary/[0.03]">
                  <CardContent className="p-4 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{driverLabel}</div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.departureLocation}</div>
                      <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                        <Calendar className="w-3 h-3 shrink-0" />
                        {format(parseISO(r.departureTime), "EEE, MMM d · h:mm a")}
                      </div>
                      <div className="text-xs font-medium text-primary mt-2 flex items-center gap-1">
                        <Users className="w-3 h-3" /> {r.seatsAvailable}/{r.seatsTotal} seats left
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  </CardContent>
                </Card>
              </Link>
            );
            })}
          </div>
        </section>
      )}

      <RidesAndRequests
        contextType="event"
        contextId={event.id}
        contextLabel={event.name}
        rideCreateHref={`/rides/new?contextType=event&contextId=${event.id}`}
        requestCreateHref={`/requests/new?contextType=event&contextId=${event.id}`}
      />
    </Layout>
  );
}
