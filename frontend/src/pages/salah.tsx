import { useMemo } from "react";
import { Link } from "wouter";
import { useListMasjids, useMasjidCarpoolCounts } from "@/lib/api-client";
import { useMode } from "@/lib/ModeContext";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Moon, MapPin, ArrowRight, Sun, Sunset, Sunrise, CarFront, HandHelping } from "lucide-react";

// Mock user location (e.g. UTA Campus)
const USER_LOC = { lat: 32.7292, lng: -97.1152 };

// Simple distance calculation (in miles approx)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8; // Radius of earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const PRAYERS = [
  { key: "fajr", label: "Fajr", icon: Sunrise, color: "text-indigo-600 bg-indigo-50" },
  { key: "dhuhr", label: "Dhuhr", icon: Sun, color: "text-amber-600 bg-amber-50" },
  { key: "asr", label: "Asr", icon: Sun, color: "text-orange-600 bg-orange-50" },
  { key: "maghrib", label: "Maghrib", icon: Sunset, color: "text-rose-600 bg-rose-50" },
  { key: "isha", label: "Isha", icon: Moon, color: "text-violet-600 bg-violet-50" },
];

export default function SalahPage() {
  const { mode } = useMode();
  const { data: masjids = [], isLoading: masjidsLoading } = useListMasjids();
  const { data: counts = {}, isLoading: countsLoading } = useMasjidCarpoolCounts();

  const sortedMasjids = useMemo(() => {
    return [...masjids].map(m => {
      const distance = m.lat && m.lng ? getDistance(USER_LOC.lat, USER_LOC.lng, m.lat, m.lng) : 999;
      return { ...m, distance };
    }).sort((a, b) => a.distance - b.distance);
  }, [masjids]);

  const isLoading = masjidsLoading || countsLoading;

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Moon className="w-7 h-7 text-primary" /> Salah rides</h1>
        <p className="text-muted-foreground mt-1">
          {mode === "riding" ? "Find drivers going to your local masjid." : "Offer rides to people heading to the masjid."}
        </p>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-5">
          {[...Array(4)].map((_, i) => <Card key={i} className="h-64 animate-pulse border-0 ring-1 ring-border/50" />)}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {sortedMasjids.map((m: any) => {
            const mCounts = counts[m.id] || { rides: 0, requests: 0 };
            const relevantCount = mode === "riding" ? mCounts.rides : mCounts.requests;
            const countLabel = mode === "riding" ? (relevantCount === 1 ? "1 ride available" : `${relevantCount} rides available`) : (relevantCount === 1 ? "1 request waiting" : `${relevantCount} requests waiting`);

            return (
              <Link key={m.id} href={`/salah/${m.id}`}>
                <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden border-0 ring-1 ring-border/50 h-full flex flex-col">
                  {m.imageUrl && <div className="h-32 bg-cover bg-center shrink-0" style={{ backgroundImage: `url(${m.imageUrl})` }} />}
                  <CardContent className="p-5 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold leading-tight">{m.name}</h3>
                        <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5" /> 
                          {m.distance !== 999 ? `${m.distance.toFixed(1)} mi away` : m.address}
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
                          <div key={p.key} className="text-center">
                            <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center ${p.color}`}><Icon className="w-4 h-4" /></div>
                            <div className="text-[10px] font-medium mt-1">{p.label}</div>
                            <div className="text-[10px] text-muted-foreground">{m[p.key]}</div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </Layout>
  );
}
