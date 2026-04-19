import { Link, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { useMode } from "@/lib/ModeContext";
import { Calendar, Moon, ShoppingBag, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useListMasjids } from "@/lib/api-client";
import { HomeMap } from "@/components/HomeMap";

export default function HomePage() {
  const { mode, setMode } = useMode();
  const { data: masjids = [], isLoading: masjidsLoading } = useListMasjids();
  const [, setLocation] = useLocation();

  return (
    <Layout>
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

        {/* Community Map — scales with viewport */}
        <div className="rounded-2xl overflow-hidden ring-1 ring-border/40 flex-shrink-0" style={{ height: "clamp(300px, 45vh, 600px)" }}>
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
