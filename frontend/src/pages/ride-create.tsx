import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useCreateRide } from "@/lib/api-client";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CarFront } from "lucide-react";

export default function RideCreatePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createRide = useCreateRide();

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const contextType = (params.get("contextType") as "event" | "masjid" | "errand") || "event";
  const contextId = parseInt(params.get("contextId") || "0", 10);
  const prayerName = params.get("prayerName") || undefined;

  const [departureLocation, setDepartureLocation] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [seatsTotal, setSeatsTotal] = useState(3);
  const [notes, setNotes] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contextId) { toast({ title: "Missing context", variant: "destructive" }); return; }
    createRide.mutate(
      { data: { contextType, contextId, ...(prayerName ? { prayerName } : {}), departureLocation, departureTime: new Date(departureTime).toISOString(), seatsTotal, notes } },
      {
        onSuccess: (ride) => {
          toast({ title: "Ride created!", description: "Your ride is now visible to riders." });
          setLocation(`/rides/${ride.id}`);
        },
        onError: (err: any) => toast({ title: "Failed", description: err?.error || "Could not create ride", variant: "destructive" }),
      }
    );
  };

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
              <div className="space-y-2">
                <Label>Departure location</Label>
                <Input value={departureLocation} onChange={(e) => setDepartureLocation(e.target.value)} placeholder="e.g. Main campus, Lot B" required />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Departure time</Label>
                  <Input type="datetime-local" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} required />
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
