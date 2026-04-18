import { Link } from "wouter";
import { useListMasjids } from "@/lib/api-client";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Moon, MapPin, ArrowRight, Sun, Sunset, Sunrise } from "lucide-react";

const PRAYERS = [
  { key: "fajr", label: "Fajr", icon: Sunrise, color: "text-indigo-600 bg-indigo-50" },
  { key: "dhuhr", label: "Dhuhr", icon: Sun, color: "text-amber-600 bg-amber-50" },
  { key: "asr", label: "Asr", icon: Sun, color: "text-orange-600 bg-orange-50" },
  { key: "maghrib", label: "Maghrib", icon: Sunset, color: "text-rose-600 bg-rose-50" },
  { key: "isha", label: "Isha", icon: Moon, color: "text-violet-600 bg-violet-50" },
];

export default function SalahPage() {
  const { data: masjids = [], isLoading } = useListMasjids();

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Moon className="w-7 h-7 text-primary" /> Salah rides</h1>
        <p className="text-muted-foreground mt-1">Carpool to your local masjid for daily prayer.</p>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-5">
          {[...Array(4)].map((_, i) => <Card key={i} className="h-64 animate-pulse border-0 ring-1 ring-border/50" />)}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {masjids.map((m: any) => (
            <Link key={m.id} href={`/salah/${m.id}`}>
              <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden border-0 ring-1 ring-border/50 h-full">
                {m.imageUrl && <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${m.imageUrl})` }} />}
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold leading-tight">{m.name}</h3>
                      <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3.5 h-3.5" /> {m.address}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground mt-1" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{m.description}</p>
                  <div className="grid grid-cols-5 gap-2">
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
                  {m.jumuah && <Badge variant="secondary" className="mt-3 text-[10px]">Jumuah {m.jumuah}</Badge>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
