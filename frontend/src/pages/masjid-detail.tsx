import { useState } from "react";
import { Link } from "wouter";
import { useGetMasjid } from "@/lib/api-client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Sunrise, Sun, Sunset, Moon } from "lucide-react";
import { RidesAndRequests } from "@/components/RidesAndRequests";

const PRAYERS = [
  { key: "fajr", label: "Fajr", icon: Sunrise },
  { key: "dhuhr", label: "Dhuhr", icon: Sun },
  { key: "asr", label: "Asr", icon: Sun },
  { key: "maghrib", label: "Maghrib", icon: Sunset },
  { key: "isha", label: "Isha", icon: Moon },
];

export default function MasjidDetailPage({ masjidId }: { masjidId: number }) {
  const { data: masjid, isLoading } = useGetMasjid(masjidId);
  const [activePrayer, setActivePrayer] = useState<string>("dhuhr");

  if (isLoading) return <Layout><div className="h-64 animate-pulse bg-muted rounded-xl" /></Layout>;
  if (!masjid) return <Layout><div className="text-center py-16 text-muted-foreground">Masjid not found.</div></Layout>;

  return (
    <Layout>
      <Link href="/salah"><Button variant="ghost" size="sm" className="mb-4 -ml-2"><ArrowLeft className="w-4 h-4 mr-1" /> Back to masjids</Button></Link>

      <div className="mb-6">
        <h1 className="text-4xl font-bold tracking-tight">{masjid.name}</h1>
        <div className="text-muted-foreground mt-2 flex items-center gap-2 text-sm"><MapPin className="w-4 h-4" /> {masjid.address}</div>
        <p className="text-muted-foreground mt-3 max-w-2xl">{masjid.description}</p>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pick a prayer to see rides</h3>
        <div className="flex flex-wrap gap-2">
          {PRAYERS.map((p) => {
            const Icon = p.icon;
            const active = activePrayer === p.key;
            return (
              <button key={p.key} onClick={() => setActivePrayer(p.key)} className={`flex items-center gap-2 px-4 py-2.5 rounded-full border-2 transition-all ${active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                <Icon className={`w-4 h-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <div className="text-left">
                  <div className={`text-sm font-semibold ${active ? "text-primary" : ""}`}>{p.label}</div>
                  <div className="text-[10px] text-muted-foreground">{(masjid as any)[p.key]}</div>
                </div>
              </button>
            );
          })}
          {masjid.jumuah && (
            <button onClick={() => setActivePrayer("jumuah")} className={`flex items-center gap-2 px-4 py-2.5 rounded-full border-2 transition-all ${activePrayer === "jumuah" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
              <Badge variant="secondary" className="text-[10px]">Jumuah {masjid.jumuah}</Badge>
            </button>
          )}
        </div>
      </div>

      <RidesAndRequests
        contextType="masjid"
        contextId={masjid.id}
        prayerName={activePrayer}
        contextLabel={`${masjid.name} for ${activePrayer.charAt(0).toUpperCase() + activePrayer.slice(1)}`}
        rideCreateHref={`/rides/new?contextType=masjid&contextId=${masjid.id}&prayerName=${activePrayer}`}
        requestCreateHref={`/requests/new?contextType=masjid&contextId=${masjid.id}&prayerName=${activePrayer}`}
      />
    </Layout>
  );
}
