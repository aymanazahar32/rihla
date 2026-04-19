import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { useMode } from "@/lib/ModeContext";
import { Calendar, Moon, ShoppingBag, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const { mode, setMode } = useMode();

  return (
    <Layout>
      <div className="flex flex-col h-full max-w-lg mx-auto pb-10 pt-4">
        {/* Top Toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center rounded-full border p-1 bg-muted/40 shadow-sm">
            <button
              onClick={() => setMode("riding")}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200",
                mode === "riding" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Riding
            </button>
            <button
              onClick={() => setMode("driving")}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200",
                mode === "driving" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Driving
            </button>
          </div>
        </div>

        {/* 4 Main Blocks */}
        <div className="flex-1 flex flex-col gap-5">
          
          {/* Salah Block - Most highlighted */}
          <Link href="/salah" className="group">
            <Card className="border-0 bg-gradient-to-br from-indigo-600 via-primary to-indigo-800 text-white overflow-hidden relative min-h-[160px] flex items-center hover:scale-[1.02] transition-transform duration-300 shadow-xl shadow-primary/20">
              <div className="absolute -right-4 -top-4 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-30 transition-opacity">
                <Moon className="w-24 h-24" />
              </div>
              <CardContent className="p-8 relative z-10 w-full flex items-center justify-between">
                <div>
                  <h2 className="text-4xl font-extrabold tracking-tight">Salah</h2>
                  <p className="text-white/80 mt-2 font-medium">Masjids & Prayers</p>
                </div>
                <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm shadow-inner">
                  <Moon className="w-7 h-7 text-white" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Events Block */}
          <Link href="/events" className="group">
            <Card className="border-0 bg-card ring-1 ring-border/50 hover:ring-primary/30 min-h-[120px] flex items-center hover:shadow-lg transition-all shadow-sm">
              <CardContent className="p-6 flex items-center justify-between w-full">
                <div>
                  <h2 className="text-2xl font-bold">Events</h2>
                  <p className="text-muted-foreground mt-1 text-sm">Campus & MSA</p>
                </div>
                <div className="bg-orange-500/10 p-4 rounded-2xl text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300">
                  <Calendar className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Errands Block */}
          <Link href="/errands" className="group">
            <Card className="border-0 bg-card ring-1 ring-border/50 hover:ring-primary/30 min-h-[120px] flex items-center hover:shadow-lg transition-all shadow-sm">
              <CardContent className="p-6 flex items-center justify-between w-full">
                <div>
                  <h2 className="text-2xl font-bold">Errands</h2>
                  <p className="text-muted-foreground mt-1 text-sm">Groceries & Airports</p>
                </div>
                <div className="bg-emerald-500/10 p-4 rounded-2xl text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                  <ShoppingBag className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Other Block */}
          <button className="group text-left w-full cursor-not-allowed opacity-80">
            <Card className="border-0 bg-muted/40 ring-1 ring-border/50 min-h-[120px] flex items-center">
              <CardContent className="p-6 flex items-center justify-between w-full">
                <div>
                  <h2 className="text-2xl font-bold text-muted-foreground">Other</h2>
                  <p className="text-muted-foreground/70 mt-1 text-sm">Coming soon</p>
                </div>
                <div className="bg-slate-500/10 p-4 rounded-2xl text-slate-500">
                  <MapPin className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </button>

        </div>
      </div>
    </Layout>
  );
}
