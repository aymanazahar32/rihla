import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useListEvents, useGetMe, isOrganizationUser } from "@/lib/api-client";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, MapPin, ArrowRight, Search, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";

const CATEGORY_COLORS: Record<string, string> = {
  Music: "bg-purple-100 text-purple-700",
  Tech: "bg-blue-100 text-blue-700",
  Food: "bg-amber-100 text-amber-700",
  Entertainment: "bg-pink-100 text-pink-700",
  Sports: "bg-emerald-100 text-emerald-700",
  Community: "bg-teal-100 text-teal-800",
  General: "bg-slate-100 text-slate-700",
};

export default function EventsPage() {
  const { data: events = [], isLoading } = useListEvents();
  const { data: me } = useGetMe();
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState<string>("all");

  const categoryOptions = useMemo(() => {
    const fromData = [...new Set(events.map((e: { category?: string }) => e.category).filter(Boolean))] as string[];
    return ["all", ...fromData.sort((a, b) => a.localeCompare(b))];
  }, [events]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((event: { name: string; description?: string; location?: string; category?: string }) => {
      if (tag !== "all" && event.category !== tag) return false;
      if (!q) return true;
      const blob = `${event.name} ${event.description ?? ""} ${event.location ?? ""} ${event.category ?? ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [events, search, tag]);

  const org = isOrganizationUser(me);

  return (
    <Layout>
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Upcoming events</h1>
            <p className="text-muted-foreground mt-1">Find rides to events your community is going to.</p>
          </div>
          {org && (
            <Button className="rounded-full shrink-0" asChild>
              <Link href="/events/new">
                <Plus className="w-4 h-4 mr-1.5" />
                Create event
              </Link>
            </Button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, location, or description…"
              className="pl-9 rounded-full"
              aria-label="Search events"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setTag(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  tag === c ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/40"
                }`}
              >
                {c === "all" ? "All tags" : c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="border-0 ring-1 ring-border/50">
              <CardContent className="p-6 h-48 animate-pulse" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 bg-muted/20">
          <CardContent className="p-10 sm:p-14 text-center space-y-4 max-w-lg mx-auto">
            <h2 className="text-xl font-semibold">{events.length === 0 ? "No events yet" : "No matches"}</h2>
            <p className="text-sm text-muted-foreground">
              {events.length === 0
                ? org
                  ? "You can publish the first event for riders and drivers to coordinate around."
                  : "Check back soon, or ask your MSA to post rides here."
                : "Try another search term or tag."}
            </p>
            {org && (
              <Button className="rounded-full" asChild>
                <Link href="/events/new">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create event
                </Link>
              </Button>
            )}
            {!org && me && (
              <p className="text-xs text-muted-foreground">
                Official groups can post events from{" "}
                <Link href="/profile" className="text-primary font-medium underline-offset-4 hover:underline">
                  Profile
                </Link>{" "}
                after switching to an organization account.
              </p>
            )}
            {!me && (
              <Button variant="secondary" className="rounded-full" asChild>
                <Link href="/login?next=%2Fevents%2Fnew">Log in to create events</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((event: any) => (
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
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 shrink-0" /> {format(parseISO(event.dateTime), "EEE, MMM d • h:mm a")}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{event.location}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {org && (
        <Link
          href="/events/new"
          className="md:hidden fixed bottom-24 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold shadow-lg ring-1 ring-primary/20"
        >
          <Plus className="w-5 h-5" />
          New event
        </Link>
      )}
    </Layout>
  );
}
