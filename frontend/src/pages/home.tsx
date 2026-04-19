import { Link, useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { useMode } from "@/lib/ModeContext";
import { Calendar, Moon, ShoppingBag, MapPin, Sparkles, Mic, MicOff, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useListMasjids, useGetMe, useGetMyRequests, useGetMyRides, useListEvents, useListErrands } from "@/lib/api-client";
import { HomeMap } from "@/components/HomeMap";
import { MatchBanner } from "@/components/MatchBanner";
import { PassiveTrackingView } from "@/components/PassiveTrackingView";
import { RideRatingModal } from "@/components/RideRatingModal";
import { useRideNotifications, requestNotificationPermission } from "@/lib/useRideNotifications";
import { parseRideIntent } from "@/lib/parse-ride-intent";
import { useNLPrefill } from "@/lib/NLPrefillContext";

export default function HomePage() {
  const { mode, setMode } = useMode();
  const { data: masjids = [], isLoading: masjidsLoading } = useListMasjids();
  const { data: me } = useGetMe();
  const { data: myRequests = [] } = useGetMyRequests();
  const { data: myRides } = useGetMyRides();
  const [, setLocation] = useLocation();
  const [ratingRide, setRatingRide] = useState<any>(null);
  const prevStatusRef = useRef<Record<string, string>>({});

  const { setPrefill } = useNLPrefill();
  const { data: events = [] } = useListEvents();
  const { data: errands = [] } = useListErrands();

  const [nlText, setNlText] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [nlError, setNlError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const resolveContext = (
    contextType: "masjid" | "event" | "errand" | undefined,
    hint: string | null
  ): number | undefined => {
    if (!contextType || !hint) return undefined;
    const h = hint.toLowerCase();
    if (contextType === "masjid") {
      const match = (masjids as any[]).find(
        (m) => m.name.toLowerCase().includes(h) || h.includes(m.name.toLowerCase())
      );
      return match?.id;
    }
    if (contextType === "event") {
      const match = (events as any[]).find(
        (e) => e.name.toLowerCase().includes(h) || h.includes(e.name.toLowerCase())
      );
      return match?.id;
    }
    if (contextType === "errand") {
      const match = (errands as any[]).find(
        (e) => e.title.toLowerCase().includes(h) || h.includes(e.title.toLowerCase())
      );
      return match?.id;
    }
    return undefined;
  };

  const handleNLSubmit = async () => {
    if (!nlText.trim()) return;
    setNlLoading(true);
    setNlError(null);
    try {
      const { parsed, contextHint } = await parseRideIntent(nlText.trim());
      const contextId = resolveContext(parsed.contextType, contextHint);
      setPrefill({ ...parsed, contextId });

      const params = new URLSearchParams();
      if (parsed.contextType) params.set("contextType", parsed.contextType);
      if (contextId) params.set("contextId", String(contextId));
      if (parsed.prayerName) params.set("prayerName", parsed.prayerName);

      const path = parsed.intent === "offer" ? "/rides/new" : "/requests/new";
      setLocation(`${path}?${params.toString()}`);
    } catch {
      setNlError("Couldn't parse that — try rephrasing.");
    } finally {
      setNlLoading(false);
    }
  };

  const toggleMic = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setNlError("Speech recognition not supported in this browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (event: any) => {
      setNlText(event.results[0][0].transcript);
      setIsListening(false);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  };

  const hasPendingRequest = myRequests.some((r: any) => r.status === "pending");
  const hasActiveRide = (myRides?.drivingRides ?? []).some((r: any) => r.status === "scheduled" || r.status === "in_progress");
  const inProgressRide = (myRides?.passengerRides ?? []).find((r: any) => r.status === "in_progress") ?? null;
  const showMatchBanner = !!me && !inProgressRide && (hasPendingRequest || (me.userType === "driver" && hasActiveRide));

  // Request notification permission once user is logged in
  useEffect(() => {
    if (me) requestNotificationPermission();
  }, [!!me]);

  // Live notifications: matches, driver arrival, chat messages
  useRideNotifications({
    userId: me?.id,
    rideId: inProgressRide?.id ?? null,
    userName: me?.name,
  });

  // Detect when a passenger ride flips to "completed" → show rating modal
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
        {/* Top Toggle */}
        <div className="flex justify-center">
          <div className="inline-flex items-center rounded-full border p-1 bg-muted/40 shadow-sm">
            <button
              onClick={() => setMode("riding")}
              className={cn(
                "px-8 py-2.5 rounded-full text-sm font-semibold transition-all duration-200",
                mode === "riding" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Riding
            </button>
            <button
              onClick={() => setMode("driving")}
              className={cn(
                "px-8 py-2.5 rounded-full text-sm font-semibold transition-all duration-200",
                mode === "driving" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Driving
            </button>
          </div>
        </div>

        {/* NL Input Bar */}
        <div className="flex-shrink-0 space-y-1.5">
          <div className="flex items-center gap-2 rounded-2xl bg-card ring-1 ring-border/50 px-4 py-3 shadow-sm focus-within:ring-primary/50 transition-shadow">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder={
                mode === "driving"
                  ? "e.g. Going to Jumu'ah at ICA, leaving UTA, 3 seats"
                  : "e.g. Need a ride to the MSA halal dinner Friday"
              }
              value={nlText}
              onChange={(e) => setNlText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNLSubmit()}
              disabled={nlLoading}
            />
            <button
              onClick={toggleMic}
              className={`shrink-0 p-1.5 rounded-xl transition-colors ${
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
              onClick={handleNLSubmit}
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

        {/* Match Banner — shown when user has pending requests or active rides */}
        {showMatchBanner && (
          <div className="flex-shrink-0">
            <MatchBanner />
          </div>
        )}

        {/* Community Map — scales with viewport */}
        <div className="rounded-2xl overflow-hidden ring-1 ring-border/40 flex-shrink-0" style={{ height: showMatchBanner ? "clamp(180px, 28vh, 360px)" : "clamp(300px, 45vh, 600px)" }}>
          {masjidsLoading ? (
            <div className="w-full h-full bg-muted animate-pulse" />
          ) : (
            <HomeMap
              masjids={masjids}
              onMasjidClick={(id) => setLocation(`/salah/${id}`)}
              height="100%"
            />
          )}
        </div>

        {/* 4 Main Blocks — grow to fill remaining height */}
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
      </div>
    </Layout>
  );
}
