import { Link } from "wouter";
import { useGetEvent } from "@/lib/api-client";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, ArrowLeft } from "lucide-react";
import { format, parseISO } from "date-fns";
import { RidesAndRequests } from "@/components/RidesAndRequests";

export default function EventDetailPage({ eventId }: { eventId: number }) {
  const { data: event, isLoading } = useGetEvent(eventId);

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
