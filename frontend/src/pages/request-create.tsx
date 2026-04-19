import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useCreateRideRequest, useGetMasjid, useAladhanTimings } from "@/lib/api-client";
import { parseMasjidTimeToDate, toDatetimeLocalValue } from "@/lib/prayer-time";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatetimeLocalInput } from "@/components/DatetimeLocalInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, HandHelping } from "lucide-react";
import { MapPicker } from "@/components/MapPicker";

export default function RequestCreatePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createReq = useCreateRideRequest();

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const contextType = (params.get("contextType") as "event" | "masjid" | "errand") || "event";
  const contextId = parseInt(params.get("contextId") || "0", 10);
  const prayerName = params.get("prayerName") || undefined;

  const [pickupLocation, setPickupLocation] = useState("");
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [desiredTime, setDesiredTime] = useState("");
  const [notes, setNotes] = useState("");
  const prefilledPrayerTime = useRef(false);

  const { location } = useGeolocation();
  const { data: timings } = useAladhanTimings(location?.lat, location?.lng);

  useEffect(() => {
    prefilledPrayerTime.current = false;
  }, [contextType, contextId, prayerName]);

  useEffect(() => {
    if (contextType !== "masjid" || !prayerName || !timings || prefilledPrayerTime.current) return;
    const apiPrayerKey = prayerName.charAt(0).toUpperCase() + prayerName.slice(1);
    const timeStr = timings[apiPrayerKey as keyof typeof timings];
    if (!timeStr) return;
    const parsed = parseMasjidTimeToDate(timeStr);
    if (!parsed) return;
    setDesiredTime(toDatetimeLocalValue(parsed));
    prefilledPrayerTime.current = true;
  }, [contextType, prayerName, timings]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createReq.mutate(
      { data: { contextType, contextId, ...(prayerName ? { prayerName } : {}), pickupLocation, pickupLat, pickupLng, desiredTime: new Date(desiredTime).toISOString(), notes } },
      {
        onSuccess: () => {
          toast({ title: "Request posted!", description: "Drivers will see your request." });
          window.history.back();
        },
        onError: (err: any) => toast({ title: "Failed", description: err?.error || "Could not post request", variant: "destructive" }),
      }
    );
  };

  return (
    <Layout>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => window.history.back()}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
      <div className="max-w-2xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><HandHelping className="w-7 h-7 text-amber-600" /> Request a ride</h1>
          <p className="text-muted-foreground mt-1">Let drivers know you need a lift.</p>
        </div>

        <Card className="border-0 ring-1 ring-border/40">
          <CardContent className="p-8">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>Pickup location</Label>
                <MapPicker
                  value={pickupLocation}
                  onChange={(addr, lat, lng) => {
                    setPickupLocation(addr);
                    setPickupLat(lat);
                    setPickupLng(lng);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Desired pickup time</Label>
                <DatetimeLocalInput value={desiredTime} onChange={(e) => setDesiredTime(e.target.value)} required />
                {contextType === "masjid" && prayerName && timings && (
                  <p className="text-xs text-muted-foreground">
                    Pre-filled with exact <span className="font-medium text-foreground">{prayerName}</span> Adhan time for your location — adjust if needed.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Have a backpack, flexible by 10 min" />
              </div>
              <Button type="submit" size="lg" className="w-full rounded-full" disabled={createReq.isPending}>
                {createReq.isPending ? "Posting..." : "Post request"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
