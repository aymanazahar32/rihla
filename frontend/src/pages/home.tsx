import { Link, useLocation } from "wouter";
import { useCallback, useEffect, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Moon, ShoppingBag, MapPin, Sparkles, Mic, MicOff, ArrowRight } from "lucide-react";
import { useListMasjids, useGetMe, useGetMyRequests, useGetMyRides } from "@/lib/api-client";
import { HomeMap } from "@/components/HomeMap";
import { MatchBanner } from "@/components/MatchBanner";
import { PassiveTrackingView } from "@/components/PassiveTrackingView";
import { RideRatingModal } from "@/components/RideRatingModal";
import { useRideNotifications, requestNotificationPermission } from "@/lib/useRideNotifications";
import { useNLParser } from "@/lib/useNLParser";
import { useGeolocation } from "@/hooks/useGeolocation";

export default function HomePage() {
  const { data: masjids = [], isLoading: masjidsLoading } = useListMasjids();
  const { data: me } = useGetMe();
  const { data: myRequests = [] } = useGetMyRequests();
  const { data: myRides } = useGetMyRides();
  const [, setLocation] = useLocation();
  const [ratingRide, setRatingRide] = useState<any>(null);
  const prevStatusRef = useRef<Record<string, string>>({});
  const { location: userLocation, loading: locationLoading } = useGeolocation();

  const { nlText, setNlText, nlLoading, nlError, setNlError, isListening, toggleMic, handleNLSubmit } = useNLParser();

  const hasPendingRequest = myRequests.some((r: any) => r.status === "pending");
  const hasActiveRide = (myRides?.drivingRides ?? []).some((r: any) => r.status === "scheduled" || r.status === "in_progress");
  const inProgressRide = (myRides?.passengerRides ?? []).find((r: any) => r.status === "in_progress") ?? null;
  const showMatchBanner = !!me && !inProgressRide && (hasPendingRequest || (me.userType === "driver" && hasActiveRide));

  const displayName = me?.name ?? "Guest";

  const handleMasjidClick = useCallback(
    (id: number) => setLocation(`/salah/${id}`),
    [setLocation]
  );

  useEffect(() => {
    if (me) requestNotificationPermission();
  }, [me]);

  useRideNotifications({
    userId: me?.id,
    rideId: inProgressRide?.id ?? null,
    userName: me?.name,
  });

  useEffect(() => {
    const rides: any[] = myRides?.passengerRides ?? [];
    for (const ride of rides) {
      const prev = prevStatusRef.current[ride.id];
      if (prev && prev !== "completed" && ride.status === "completed") {
        setRatingRide(ride);
      }
      prevStatusRef.current[ride.id] = ride.status;
    }
  }, [myRides?.passengerRides]);

  return (
    <Layout>
      {ratingRide && me && (
        <RideRatingModal
          ride={ratingRide}
          currentUserId={me.id}
          onDone={() => setRatingRide(null)}
        />
      )}
      <div className="flex flex-col h-full w-full gap-4">

        {/* Greeting */}
        <div className="flex-shrink-0">
          <h1 className="text-2xl font-bold">Assalamualaikum, {displayName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Are you ready for your journey?</p>
        </div>

        {/* NL Input Bar */}
        <div className="flex-shrink-0 space-y-1.5">
          <div className="flex items-center gap-2 rounded-2xl bg-card ring-1 ring-border/50 px-4 py-3 shadow-sm focus-within:ring-primary/50 transition-shadow">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="e.g. Going to ADAMS Center for Isha tonight — need a ride or offering?"
              value={nlText}
              onChange={(e) => { setNlText(e.target.value); if (nlError) setNlError(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleNLSubmit()}
              disabled={nlLoading}
            />
            <button
              onClick={toggleMic}
              disabled={nlLoading}
              className={`shrink-0 p-1.5 rounded-xl transition-colors disabled:opacity-40 ${
                isListening
                  ? "text-red-500 bg-red-500/10"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={isListening ? "Stop listening" : "Speak"}
              type="button"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              onClick={() => handleNLSubmit()}
              disabled={nlLoading || !nlText.trim()}
              className="shrink-0 p-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
              type="button"
            >
              {nlLoading ? (
                <span className="w-4 h-4 block border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </div>
          {nlError && <p className="text-xs text-destructive px-2">{nlError}</p>}
        </div>

        {/* Passive tracking — shown when rider has an in-progress ride */}
        {inProgressRide && (
          <div className="flex-shrink-0">
            <PassiveTrackingView
              ride={inProgressRide}
              currentUserId={me?.id}
              currentUserName={me?.name}
            />
          </div>
        )}

        {/* Match Banner */}
        {showMatchBanner && (
          <div className="flex-shrink-0">
            <MatchBanner />
          </div>
        )}

        {/* 4 Main Blocks */}
        <div className="flex-1 flex flex-col gap-3 min-h-0">

          {/* Salah Block */}
          <Link href="/salah" className="group flex-1 flex min-h-0">
            <Card className="w-full border-0 bg-gradient-to-br from-indigo-600 via-primary to-indigo-800 text-white overflow-hidden relative flex items-center hover:scale-[1.01] transition-transform duration-300 shadow-xl shadow-primary/20">
              <div className="absolute -right-4 -top-4 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-30 transition-opacity">
                <Moon className="w-24 h-24" />
              </div>
              <CardContent className="p-6 relative z-10 w-full flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight">Salah</h2>
                  <p className="text-white/80 mt-1 font-medium text-sm">Masjids & Prayers</p>
                </div>
                <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm shadow-inner">
                  <Moon className="w-7 h-7 text-white" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Events + Errands side by side */}
          <div className="flex gap-3 flex-1 min-h-0">
            <Link href="/events" className="group flex-1 flex min-h-0">
              <Card className="w-full border-0 bg-card ring-1 ring-border/50 hover:ring-primary/30 flex items-center hover:shadow-lg transition-all shadow-sm">
                <CardContent className="p-5 flex flex-col justify-between h-full w-full gap-3">
                  <div className="bg-orange-500/10 p-3 rounded-2xl text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300 self-start">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Events</h2>
                    <p className="text-muted-foreground mt-0.5 text-xs">Campus & MSA</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/errands" className="group flex-1 flex min-h-0">
              <Card className="w-full border-0 bg-card ring-1 ring-border/50 hover:ring-primary/30 flex items-center hover:shadow-lg transition-all shadow-sm">
                <CardContent className="p-5 flex flex-col justify-between h-full w-full gap-3">
                  <div className="bg-emerald-500/10 p-3 rounded-2xl text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300 self-start">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Errands</h2>
                    <p className="text-muted-foreground mt-0.5 text-xs">Groceries & Airports</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Other Block */}
          <button className="group text-left w-full cursor-not-allowed opacity-60 flex-shrink-0">
            <Card className="border-0 bg-muted/40 ring-1 ring-border/50">
              <CardContent className="p-5 flex items-center justify-between w-full">
                <div>
                  <h2 className="text-lg font-bold text-muted-foreground">Other</h2>
                  <p className="text-muted-foreground/70 mt-0.5 text-xs">Coming soon</p>
                </div>
                <div className="bg-slate-500/10 p-3 rounded-2xl text-slate-500">
                  <MapPin className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </button>
        </div>

        {/* Community Map — bottom of page */}
        <div className="rounded-2xl overflow-hidden ring-1 ring-border/40 flex-shrink-0" style={{ height: "clamp(300px, 45vh, 600px)" }}>
          {masjidsLoading ? (
            <div className="w-full h-full bg-muted animate-pulse" />
          ) : (
            <HomeMap
              masjids={masjids}
              onMasjidClick={handleMasjidClick}
              userLocation={locationLoading ? undefined : userLocation}
              height="100%"
            />
          )}
        </div>

      </div>
    </Layout>
  );
}
