import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useNearbyMasjids, useMasjidCarpoolCounts, useAladhanTimings, useUpsertMasjid } from "@/lib/api-client";
import { useMode } from "@/lib/ModeContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Moon, MapPin, ArrowRight, Sun, Sunset, Sunrise, CarFront, HandHelping, Loader2 } from "lucide-react";

// Simple distance calculation (in miles approx)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const PRAYERS = [
  { key: "fajr", label: "Fajr", icon: Moon, color: "bg-blue-100 text-blue-700" },
  { key: "dhuhr", label: "Dhuhr", icon: Sun, color: "bg-amber-100 text-amber-700" },
  { key: "asr", label: "Asr", icon: Sun, color: "bg-orange-100 text-orange-700" },
  { key: "maghrib", label: "Maghrib", icon: Sunset, color: "bg-red-100 text-red-700" },
  { key: "isha", label: "Isha", icon: Moon, color: "bg-indigo-100 text-indigo-700" },
];

export default function SalahPage() {
  const { mode } = useMode();
  const [, setLocationPath] = useLocation();
  const upsertMasjid = useUpsertMasjid();
  const [upsertingId, setUpsertingId] = useState<string | null>(null);

  const { location, loading: locationLoading, error: locationError } = useGeolocation();
  const { data: masjids = [], isLoading: masjidsLoading } = useNearbyMasjids(location?.lat, location?.lng);
  const { data: counts = {}, isLoading: countsLoading } = useMasjidCarpoolCounts();
  const { data: timings, isLoading: timingsLoading } = useAladhanTimings(location?.lat, location?.lng);

  const sortedMasjids = useMemo(() => {
    return [...masjids].map(m => {
      const distance = location && m.lat && m.lng ? getDistance(location.lat, location.lng, m.lat, m.lng) : 999;
      return { ...m, distance };
    }).sort((a, b) => a.distance - b.distance);
  }, [masjids, location]);

  const handleMasjidClick = async (m: typeof sortedMasjids[0], prayerKey?: string) => {
    // We must ensure the masjid exists in the DB before navigating to ride creation
    let dbId = m.id;
    if (dbId === -1 && m.googlePlaceId) {
      setUpsertingId(m.googlePlaceId);
      try {
        dbId = await upsertMasjid.mutateAsync({
          googlePlaceId: m.googlePlaceId,
          name: m.name,
          address: m.address,
          lat: m.lat,
          lng: m.lng,
          imageUrl: m.imageUrl
        });
      } catch (err) {
        console.error("Failed to save masjid", err);
        setUpsertingId(null);
        return;
      }
      setUpsertingId(null);
    }
    
    // Default navigation
    let url = `/salah/${dbId}`;
    
    // If they clicked a specific prayer, go straight to the offer/request flow
    if (prayerKey) {
      url = mode === "riding" ? `/requests/new?context=masjid&id=${dbId}&prayer=${prayerKey}` : `/rides/new?context=masjid&id=${dbId}&prayer=${prayerKey}`;
    }
    
    setLocationPath(url);
  };

  const isLoading = countsLoading || locationLoading || timingsLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Salah</h1>
        <p className="text-muted-foreground mt-1">Find a ride to prayer</p>
      </div>

      {!location && !locationLoading && (
        <div className="mb-6 p-4 bg-amber-50 text-amber-800 rounded-lg text-sm flex gap-3">
          <MapPin className="w-5 h-5 shrink-0" />
          <p>Please allow location access to discover masjids near you and see live Adhan times.</p>
        </div>
      )}

      {timings && (
        <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-xl">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> 
            Today's Adhan Times
          </h2>
          <div className="flex justify-between text-center overflow-x-auto pb-1 gap-4">
            {PRAYERS.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.key} className="shrink-0 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 ${p.color}`}><Icon className="w-4 h-4" /></div>
                  <div className="text-[10px] font-medium uppercase tracking-wider">{p.label}</div>
                  <div className="text-xs font-semibold">{timings[p.label as keyof typeof timings]}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {masjidsLoading ? (
        <div className="space-y-4">
          <div className="h-32 bg-muted animate-pulse rounded-xl"></div>
          <div className="h-32 bg-muted animate-pulse rounded-xl"></div>
        </div>
      ) : sortedMasjids.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No masjids found nearby.</p>
        </div>
      ) : (
        <div className="space-y-4 pb-20">
          {sortedMasjids.map((m) => {
            const relevantCount = mode === "riding" ? (counts[m.id]?.rides || 0) : (counts[m.id]?.requests || 0);
            const countLabel = mode === "riding" ? `${relevantCount} driver${relevantCount !== 1 ? 's' : ''} offering` : `${relevantCount} rider${relevantCount !== 1 ? 's' : ''} requesting`;
            
            const isUpserting = upsertingId === m.googlePlaceId;

            return (
              <Card key={m.googlePlaceId || m.id} className={`overflow-hidden border-border/50 hover:border-primary/50 transition-colors shadow-sm cursor-pointer ${isUpserting ? 'opacity-70 pointer-events-none' : ''}`} onClick={() => handleMasjidClick(m)}>
                <CardContent className="p-5 flex-1 flex flex-col relative">
                  {isUpserting && (
                     <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
                       <Loader2 className="w-6 h-6 animate-spin text-primary" />
                     </div>
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold leading-tight line-clamp-1">{m.name}</h3>
                      <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" /> 
                        <span className="truncate">{m.distance !== 999 ? `${m.distance.toFixed(1)} mi away` : m.address}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                  </div>
                  
                  <div className="mb-4 mt-auto">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${relevantCount > 0 ? (mode === "riding" ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-700") : "bg-muted text-muted-foreground"}`}>
                      {mode === "riding" ? <CarFront className="w-3.5 h-3.5" /> : <HandHelping className="w-3.5 h-3.5" />}
                      {countLabel}
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2 pt-4 border-t">
                    {PRAYERS.map((p) => {
                      const Icon = p.icon;
                      return (
                        <div 
                          key={p.key} 
                          className="text-center group cursor-pointer hover:bg-muted/50 rounded-lg p-1 transition-colors relative z-20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMasjidClick(m, p.key);
                          }}
                        >
                          <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center ${p.color} group-hover:ring-2 ring-primary/20 transition-all`}><Icon className="w-4 h-4" /></div>
                          <div className="text-[10px] font-medium mt-1">{p.label}</div>
                          <div className="text-[10px] text-muted-foreground">{timings ? timings[p.label as keyof typeof timings] : '--:--'}</div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </Layout>
  );
}
