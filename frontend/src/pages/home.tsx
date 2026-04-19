import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ReactNode } from "react";
import { Calendar, Moon, ShoppingBag, MapPin, Sparkles, Users } from "lucide-react";

export default function HomePage() {
  return (
    <Layout>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-background to-secondary/25 ring-1 ring-border/50 px-6 py-16 md:px-14 md:py-20 mb-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/20 mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Arlington &amp; UTA demo
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Carpool with confidence — <span className="text-primary">prayer, campus, errands.</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            Rihla connects verified students for rides to local masjids, UTA events, and shared errands around Arlington, TX.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/events">
              <Button size="lg" className="rounded-full">Book a seat</Button>
            </Link>
            <Link href="/rides/new">
              <Button size="lg" variant="secondary" className="rounded-full">Offer a ride</Button>
            </Link>
            <Link href="/salah">
              <Button size="lg" variant="outline" className="rounded-full bg-background/60">Salah rides</Button>
            </Link>
            <Link href="/events">
              <Button size="lg" variant="outline" className="rounded-full bg-background/60">Campus events</Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <FeatureCard
          href="/salah"
          icon={<Moon className="w-6 h-6" />}
          title="Salah & masjids"
          desc="See Arlington masjids and rides aligned with prayer times."
        />
        <FeatureCard
          href="/events"
          icon={<Calendar className="w-6 h-6" />}
          title="Events"
          desc="MSA nights, awareness week, and sports — share a ride there."
        />
        <FeatureCard
          href="/errands"
          icon={<ShoppingBag className="w-6 h-6" />}
          title="Errands"
          desc="Groceries, airport runs, and group trips near campus."
        />
      </div>

      <Card className="border-0 ring-1 ring-border/40 bg-muted/20">
        <CardContent className="p-8 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Users className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Need a seat or offering one?</h2>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Riders book open seats on published rides. Only verified drivers can post offers — check your profile to apply as a driver.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/my-rides">
              <Button variant="secondary" className="rounded-full"><MapPin className="w-4 h-4 mr-2" /> My rides</Button>
            </Link>
            <Link href="/profile">
              <Button variant="outline" className="rounded-full">Profile</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}

function FeatureCard({ href, icon, title, desc }: { href: string; icon: ReactNode; title: string; desc: string }) {
  return (
    <Link href={href}>
      <Card className="h-full border-0 ring-1 ring-border/50 hover:ring-primary/30 hover:shadow-md transition-all cursor-pointer bg-card">
        <CardContent className="p-6">
          <div className="inline-flex p-3 rounded-xl bg-primary/10 text-primary mb-4">{icon}</div>
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{desc}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
