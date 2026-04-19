import { useState } from "react";
import { Link } from "wouter";
import { useListErrands } from "@/lib/api-client";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, MapPin, Clock, ArrowRight, Search } from "lucide-react";
import { format, parseISO } from "date-fns";
import { errandCategoryClass } from "@/lib/errand-category-styles";

const CATEGORIES = ["all", "Shopping", "Groceries", "Travel", "Errands"] as const;

const FILTER_ACTIVE: Record<string, string> = {
  Shopping: "bg-sky-100 text-sky-900 border-sky-300",
  Groceries: "bg-emerald-100 text-emerald-900 border-emerald-300",
  Travel: "bg-violet-100 text-violet-900 border-violet-300",
  Errands: "bg-amber-100 text-amber-950 border-amber-300",
};

export default function ErrandsPage() {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const { data: errands = [], isLoading } = useListErrands({
    ...(category !== "all" ? { category } : {}),
    ...(search ? { search } : {}),
  });

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><ShoppingBag className="w-7 h-7 text-primary" /> Errands</h1>
        <p className="text-muted-foreground mt-1">Share rides for shopping, groceries, and everyday runs.</p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search errands..." className="pl-9 rounded-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const selected = category === c;
            const base = "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors";
            const inactive = `${base} bg-background border-border hover:border-primary/40`;
            if (!selected) {
              return (
                <button key={c} type="button" onClick={() => setCategory(c)} className={inactive}>
                  {c === "all" ? "All" : c}
                </button>
              );
            }
            if (c === "all") {
              return (
                <button key={c} type="button" onClick={() => setCategory(c)} className={`${base} bg-primary text-primary-foreground border-primary`}>
                  All
                </button>
              );
            }
            return (
              <button key={c} type="button" onClick={() => setCategory(c)} className={`${base} ${FILTER_ACTIVE[c] ?? "bg-primary text-primary-foreground border-primary"}`}>
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <Card key={i} className="h-44 animate-pulse border-0 ring-1 ring-border/50" />)}
        </div>
      ) : errands.length === 0 ? (
        <Card className="border-dashed border-2 bg-muted/30 p-12 text-center text-muted-foreground">No errands match your filters.</Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {errands.map((e: any) => (
            <Link key={e.id} href={`/errands/${e.id}`}>
              <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer border-0 ring-1 ring-border/50 h-full">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <Badge className={`border-0 font-medium ${errandCategoryClass(e.category)}`}>{e.category}</Badge>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-bold leading-tight mb-2">{e.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{e.description}</p>
                  <div className="space-y-1.5 text-xs text-muted-foreground border-t pt-3">
                    <div className="flex items-center gap-2"><Clock className="w-3 h-3" /> {format(parseISO(e.scheduledTime), "EEE, MMM d • h:mm a")}</div>
                    <div className="flex items-center gap-2"><MapPin className="w-3 h-3" /> <span className="truncate">{e.location}</span></div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
