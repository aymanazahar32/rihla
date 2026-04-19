import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useCreateRide, useGetMe, useGetMasjid, canUserOfferRides } from "@/lib/api-client";
import { masjidPrayerField, parseMasjidTimeToDate, toDatetimeLocalValue } from "@/lib/prayer-time";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatetimeLocalInput } from "@/components/DatetimeLocalInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CarFront, Sparkles, AlertTriangle } from "lucide-react";
import { useNLPrefill } from "@/lib/NLPrefillContext";
import { MapPicker } from "@/components/MapPicker";

export default function RideCreatePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createRide = useCreateRide();
  const { data: me, isLoading: meLoading } = useGetMe();

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const contextType = (params.get("contextType") as "event" | "masjid" | "errand") || "event";
  const contextId = parseInt(params.get("contextId") || "0", 10);
  const prayerName = params.get("prayerName") || undefined;

  const [departureLocation, setDepartureLocation] = useState("");
  const [departureLat, setDepartureLat] = useState<number | null>(null);
  const [departureLng, setDepartureLng] = useState<number | null>(null);
  const [departureTime, setDepartureTime] = useState("");
  const [seatsTotal, setSeatsTotal] = useState(3);
  const [notes, setNotes] = useState("");

  const { consume } = useNLPrefill();
  const [aiPrefilled, setAiPrefilled] = useState(false);
  const [lowConfidenceFields, setLowConfidenceFields] = useState<string[]>([]);

  useEffect(() => {
    const p = consume();
    if (!p || p.intent !== "offer") return;
    if (p.departureLocation) setDepartureLocation(p.departureLocation);
    if (p.seats) setSeatsTotal(p.seats);
    if (p.notes) setNotes(p.notes);
    if (p.departureTimeISO) {
      const d = new Date(p.departureTimeISO);
      if (!isNaN(d.getTime())) setDepartureTime(toDatetimeLocalValue(d));
    }
    const low = Object.entries(p.confidence)
      .filter(([, v]) => v < 0.75)
      .map(([k]) => k);
    setLowConfidenceFields(low);
    setAiPrefilled(true);
  // Run once on mount to consume and clear NL prefill state
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const prefilledPrayerTime = useRef(false);

  const { data: masjid } = useGetMasjid(contextId, {
    query: { enabled: contextType === "masjid" && contextId > 0 },
  });

  useEffect(() => {
    prefilledPrayerTime.current = false;
  }, [contextType, contextId, prayerName]);

  useEffect(() => {
    if (contextType !== "masjid" || !masjid || !prayerName || prefilledPrayerTime.current) return;
    const field = masjidPrayerField(prayerName);
    if (!field) return;
    const raw = (masjid as Record<string, string | undefined>)[field];
    if (!raw) return;
    const parsed = parseMasjidTimeToDate(raw);
    if (!parsed) return;
    setDepartureTime(toDatetimeLocalValue(parsed));
    prefilledPrayerTime.current = true;
  }, [contextType, masjid, prayerName]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contextId) { toast({ title: "Missing context", variant: "destructive" }); return; }
    createRide.mutate(
      { data: { contextType, contextId, ...(prayerName ? { prayerName } : {}), departureLocation, departureLat, departureLng, departureTime: new Date(departureTime).toISOString(), seatsTotal, notes } },
      {
        onSuccess: (ride) => {
          toast({ title: "Ride created!", description: "Your ride is now visible to riders." });
          setLocation(`/rides/${ride.id}`);
        },
        onError: (err: any) => toast({ title: "Failed", description: err?.error || "Could not create ride", variant: "destructive" }),
      }
    );
  };

  if (meLoading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto h-40 animate-pulse rounded-xl bg-muted" />
      </Layout>
    );
  }

  if (!me) {
    return (
      <Layout>
        <p className="text-center text-muted-foreground py-12">Sign in to offer a ride.</p>
      </Layout>
    );
  }

  if (!canUserOfferRides(me)) {
    return (
      <Layout>
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => setLocation("/profile")}><ArrowLeft className="w-4 h-4 mr-1" /> Profile</Button>
        <div className="max-w-xl mx-auto text-center py-12 space-y-4">
          <h1 className="text-2xl font-bold">Verified drivers only</h1>
          <p className="text-muted-foreground">Complete ID verification and the driver history check under Profile before offering rides.</p>
          <Button className="rounded-full" onClick={() => setLocation("/profile")}>Open profile</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => window.history.back()}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
      <div className="max-w-2xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><CarFront className="w-7 h-7 text-primary" /> Offer a ride</h1>
          <p className="text-muted-foreground mt-1">Share your seats with the community.</p>
        </div>

        <Card className="border-0 ring-1 ring-border/40">
          <CardContent className="p-8">
            <form onSubmit={onSubmit} className="space-y-5">
              {!contextId && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>No destination matched. Go back and select a masjid, event, or errand from its detail page to link this ride.</span>
                </div>
              )}
              {aiPrefilled && (
                <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-sm text-primary font-medium">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  Auto-filled by AI
                  {lowConfidenceFields.length > 0 && (
                    <span className="ml-auto text-amber-600 text-xs font-normal">
                      Double-check: {lowConfidenceFields.join(", ")}
                    </span>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label>Departure location</Label>
                <MapPicker
                  value={departureLocation}
                  onChange={(address, lat, lng) => {
                    setDepartureLocation(address);
                    setDepartureLat(lat);
                    setDepartureLng(lng);
                  }}
                  height="220px"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Departure time</Label>
                  <DatetimeLocalInput value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} required />
                  {contextType === "masjid" && prayerName && masjid && (
                    <p className="text-xs text-muted-foreground">
                      Defaults to today&apos;s <span className="font-medium text-foreground">{prayerName}</span> iqama time from the masjid timetable — change if you leave earlier or another day.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Seats available</Label>
                  <Input type="number" min={1} max={8} value={seatsTotal} onChange={(e) => setSeatsTotal(parseInt(e.target.value))} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Leaving 5 min early, no large bags" />
              </div>
              <Button type="submit" size="lg" className="w-full rounded-full" disabled={createRide.isPending}>
                {createRide.isPending ? "Creating..." : "Publish ride"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
