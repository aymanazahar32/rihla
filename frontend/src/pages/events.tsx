import { Link } from "wouter";
import { useListEvents, useGetMe } from "@/lib/api-client";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { format, parseISO } from "date-fns";

const CATEGORY_COLORS: Record<string, string> = {
  Music: "bg-purple-100 text-purple-700",
  Tech: "bg-blue-100 text-blue-700",
  Food: "bg-amber-100 text-amber-700",
  Entertainment: "bg-pink-100 text-pink-700",
  Sports: "bg-emerald-100 text-emerald-700",
};

export default function EventsPage() {
  const { data: events = [], isLoading } = useListEvents();
  const { data: me } = useGetMe();

  return (
    <Layout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upcoming events</h1>
          <p className="text-muted-foreground mt-1">Find rides to events your community is going to.</p>
        </div>
        {me?.userType === "organization" && (
          <Button className="rounded-full shrink-0" asChild>
            <Link href="/events/new">Create event</Link>
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <Card key={i} className="border-0 ring-1 ring-border/50"><CardContent className="p-6 h-48 animate-pulse" /></Card>)}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((event: any) => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer border-0 ring-1 ring-border/50 h-full">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <Badge className={`${CATEGORY_COLORS[event.category] || "bg-gray-100 text-gray-700"} border-0 font-medium`}>{event.category}</Badge>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold leading-tight mb-2">{event.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{event.description}</p>
                  <div className="space-y-1.5 text-sm text-muted-foreground border-t pt-4">
                    <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> {format(parseISO(event.dateTime), "EEE, MMM d • h:mm a")}</div>
                    <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> <span className="truncate">{event.location}</span></div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
