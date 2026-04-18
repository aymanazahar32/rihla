import { Link } from "wouter";
import { format } from "date-fns";
import { useListEvents, useGetMe } from "@/lib/api-client";
import { MapPin, Calendar, ArrowRight, Search, Music, Trophy, GraduationCap } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Layout } from "@/components/Layout";

const categoryIcons: Record<string, React.ReactNode> = {
  Music: <Music className="w-4 h-4" />,
  Sports: <Trophy className="w-4 h-4" />,
  Education: <GraduationCap className="w-4 h-4" />,
};

export default function EventsPage() {
  const { data: events, isLoading } = useListEvents();
  const { data: user } = useGetMe();
  const [search, setSearch] = useState("");

  const filteredEvents = events?.filter((event: any) =>
    event.name.toLowerCase().includes(search.toLowerCase()) ||
    event.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-primary/5 p-6 md:p-8 rounded-3xl relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="z-10 space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Where to next{user ? `, ${user.name.split(' ')[0]}` : ''}?
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl">
              Find your event, hop in a ride, and start the fun early.
            </p>
          </div>

          <div className="relative w-full md:w-80 z-10">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search events or locations..."
              className="pl-10 py-6 rounded-2xl bg-background/80 backdrop-blur border-primary/20 shadow-sm text-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Upcoming Events</h2>
            <Badge variant="outline" className="px-3 py-1 bg-background">{filteredEvents?.length || 0} events</Badge>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden border-0 shadow-sm">
                  <Skeleton className="h-48 w-full rounded-none" />
                  <CardContent className="p-5 space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredEvents?.length === 0 ? (
            <div className="text-center py-20 px-4 rounded-3xl border-2 border-dashed border-muted bg-muted/20">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No events found</h3>
              <p className="text-muted-foreground mt-1">Try adjusting your search terms.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents?.map((event: any, index: number) => (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <Card className="group h-full overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-card flex flex-col" style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="relative h-48 w-full bg-muted overflow-hidden">
                      {event.imageUrl ? (
                        <img
                          src={event.imageUrl}
                          alt={event.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                          {categoryIcons[event.category] || <Calendar className="w-12 h-12 text-primary/40" />}
                        </div>
                      )}
                      <div className="absolute top-4 left-4">
                        <Badge className="bg-background/90 backdrop-blur text-foreground hover:bg-background shadow-sm px-3 py-1 flex items-center gap-1.5 border-0">
                          {categoryIcons[event.category] && <span className="text-primary">{categoryIcons[event.category]}</span>}
                          {event.category}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-5 flex-1 flex flex-col">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-xl line-clamp-1 group-hover:text-primary transition-colors">{event.name}</h3>
                      </div>

                      <div className="space-y-2 mt-auto text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary/70 shrink-0" />
                          <span>{format(new Date(event.dateTime), "EEE, MMM d • h:mm a")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary/70 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="p-5 pt-0 mt-auto border-t border-border/50 bg-muted/10">
                      <div className="flex items-center justify-between w-full pt-4">
                        <span className="text-sm font-medium text-primary group-hover:underline flex items-center gap-1">
                          View rides <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
