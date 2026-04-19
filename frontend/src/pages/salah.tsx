import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useListMasjids, useNearbyMasjids,
  useMasjidCarpoolCounts, useAladhanTimings, useUpsertMasjid,
} from "@/lib/api-client";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, ArrowRight, Moon, Sun, Sunset, Sunrise, Star, Loader2 } from "lucide-react";

const PRAYERS = [
  { key: "fajr",    label: "Fajr",    timingKey: "Fajr",    dbKey: "fajr",    Icon: Moon,    bg: "bg-indigo-100", text: "text-indigo-700",  dot: "bg-indigo-400" },
  { key: "dhuhr",   label: "Dhuhr",   timingKey: "Dhuhr",   dbKey: "dhuhr",   Icon: Sun,     bg: "bg-amber-100",  text: "text-amber-700",   dot: "bg-amber-400" },
  { key: "asr",     label: "Asr",     timingKey: "Asr",     dbKey: "asr",     Icon: Sunrise, bg: "bg-orange-100", text: "text-orange-700",  dot: "bg-orange-400" },
  { key: "maghrib", label: "Maghrib", timingKey: "Maghrib", dbKey: "maghrib", Icon: Sunset,  bg: "bg-rose-100",   text: "text-rose-700",    dot: "bg-rose-400" },
  { key: "isha",    label: "Isha",    timingKey: "Isha",    dbKey: "isha",    Icon: Star,    bg: "bg-violet-100", text: "text-violet-700",  dot: "bg-violet-400" },
];

export default function SalahPage() {
  const [, navigate] = useLocation();
  const { location } = useGeolocation();
  const upsertMasjid = useUpsertMasjid();

  // Use real nearby masjids when location is available; fall back to seeded DB list
  const { data: nearbyMasjids = [], isLoading: nearbyLoading } = useNearbyMasjids(
    location?.lat, location?.lng,
  );
  const { data: dbMasjids = [], isLoading: dbLoading } = useListMasjids();

  const masjids = location ? nearbyMasjids : dbMasjids;
  const isLoading = location ? nearbyLoading : dbLoading;

  const { data: counts = {} } = useMasjidCarpoolCounts();
  const { data: timings } = useAladhanTimings(location?.lat, location?.lng);

  // Track which card is mid-upsert so we can show a spinner
  const [upsertingId, setUpsertingId] = useState<string | null>(null);

  // Ensure a masjid has a real DB id — upsert if needed, returns the id
  const ensureDbId = async (m: any): Promise<number | null> => {
    if (m.id !== -1) return m.id as number;
    if (!m.googlePlaceId) return null;
    try {
      setUpsertingId(m.googlePlaceId);
      const id = await upsertMasjid.mutateAsync({
        googlePlaceId: m.googlePlaceId,
        name: m.name,
        address: m.address,
        lat: m.lat,
        lng: m.lng,
        imageUrl: m.imageUrl ?? null,
      });
      return id;
    } catch (err) {
      console.error("[ensureDbId] upsert failed", err);
      return null;
    } finally {
      setUpsertingId(null);
    }
  };

  const handleCardClick = async (m: any) => {
    const id = await ensureDbId(m);
    if (id) navigate(`/salah/${id}`);
  };

  const handlePrayerClick = async (m: any, label: string) => {
    const id = await ensureDbId(m);
    if (id) navigate(`/match?contextType=masjid&contextId=${id}&prayerName=${label}`);
  };

  const handleJumuahClick = async (m: any) => {
    const id = await ensureDbId(m);
    if (id) navigate(`/match?contextType=masjid&contextId=${id}&prayerName=Jumu%27ah`);
  };

  // Distance in miles for nearby results (Google Places doesn't return distance directly)
  const masjidsWithDist = useMemo(() => {
    return (masjids as any[]).map((m) => {
      if (!location || !m.lat || !m.lng) return { ...m, distMi: null };
      const R = 3959;
      const dLat = (m.lat - location.lat) * Math.PI / 180;
      const dLng = (m.lng - location.lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(location.lat * Math.PI / 180) * Math.cos(m.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      const distMi = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return { ...m, distMi };
    });
  }, [masjids, location]);

  return (
    <Layout>
      <div className="mb-5">
        <h1 className="text-3xl font-extrabold tracking-tight">Salah</h1>
        <p className="text-muted-foreground mt-1 text-sm">Find a ride to prayer near you</p>
      </div>

      {/* Live prayer times banner (from Aladhan, based on user GPS) */}
      {timings && (
        <div className="mb-5 rounded-2xl bg-gradient-to-br from-primary/8 to-indigo-50/60 ring-1 ring-primary/15 p-4">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Today's Prayer Times</p>
          <div className="grid grid-cols-5 gap-2">
            {PRAYERS.map(({ key, label, timingKey, Icon, bg, text }) => (
              <div key={key} className="flex flex-col items-center gap-1">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
                  <Icon className={`w-4 h-4 ${text}`} />
                </div>
                <span className="text-[10px] font-semibold text-foreground">{label}</span>
                <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
                  {timings[timingKey as keyof typeof timings] ?? "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!location && (
        <div className="mb-4 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 ring-1 ring-amber-200 text-sm text-amber-800">
          <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
          Allow location access to find masjids near you and see live prayer times.
        </div>
      )}

      {/* Masjid list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : masjidsWithDist.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MapPin className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No masjids found nearby</p>
        </div>
      ) : (
        <div className="space-y-3 pb-24">
          {masjidsWithDist.map((m: any) => {
            const isUpserting = upsertingId === m.googlePlaceId;

            return (
              <div
                key={m.googlePlaceId ?? m.id}
                className={`block cursor-pointer ${isUpserting ? "pointer-events-none opacity-60" : ""}`}
                onClick={() => handleCardClick(m)}
              >
                <Card className="border-0 ring-1 ring-border/50 hover:ring-primary/40 hover:shadow-md transition-all overflow-hidden relative">
                  {/* Upsert loading overlay */}
                  {isUpserting && (
                    <div className="absolute inset-0 z-20 bg-background/60 backdrop-blur-[2px] flex items-center justify-center rounded-2xl">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  )}

                  {/* Masjid image banner */}
                  {m.imageUrl && (
                    <div className="h-28 bg-cover bg-center" style={{ backgroundImage: `url(${m.imageUrl})` }} />
                  )}

                  <CardContent className="p-0">
                    {/* Header */}
                    <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-bold text-base leading-tight truncate">{m.name}</h3>
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">
                            {m.distMi !== null ? `${m.distMi.toFixed(1)} mi away` : m.address}
                          </span>
                        </div>
                        {m.description && (
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{m.description}</p>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    </div>

                    {/* Prayer grid */}
                    <div className="grid grid-cols-5 border-t border-border/40">
                      {PRAYERS.map(({ key, label, timingKey, dbKey, Icon, bg, text, dot }) => {
                        const prayerRides = (counts as any)[m.id]?.byPrayer?.[label]?.rides ?? 0;
                        const prayerTime = timings
                          ? (timings[timingKey as keyof typeof timings] ?? m[dbKey] ?? "—")
                          : (m[dbKey] ?? "—");
                        return (
                          <button
                            key={key}
                            className="flex flex-col items-center gap-0.5 py-3 px-1 hover:bg-muted/60 active:bg-muted transition-colors relative group"
                            onClick={(e) => { e.stopPropagation(); handlePrayerClick(m, label); }}
                          >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${bg} group-hover:scale-110 transition-transform`}>
                              <Icon className={`w-3.5 h-3.5 ${text}`} />
                            </div>
                            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
                            <span className="text-[10px] font-bold tabular-nums">{prayerTime}</span>
                            {prayerRides > 0 ? (
                              <span className={`text-[9px] font-bold ${text}`}>{prayerRides} ride{prayerRides !== 1 ? "s" : ""}</span>
                            ) : (
                              <span className="text-[9px] text-muted-foreground/50">tap</span>
                            )}
                            <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full ${dot} opacity-0 group-hover:opacity-100 transition-opacity`} />
                          </button>
                        );
                      })}
                    </div>

                    {/* Jumu'ah */}
                    {m.jumuah && (
                      <div className="px-4 pb-3 pt-2 border-t border-border/30 flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Jumu'ah</span>
                        <Badge variant="secondary" className="text-[11px] font-bold bg-emerald-100 text-emerald-700 border-0">
                          {m.jumuah}
                        </Badge>
                        <button
                          className="ml-auto text-[10px] text-primary font-semibold hover:underline"
                          onClick={(e) => { e.stopPropagation(); handleJumuahClick(m); }}
                        >
                          View rides →
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
