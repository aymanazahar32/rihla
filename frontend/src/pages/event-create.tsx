import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCreateEvent, useGetMe } from "@/lib/api-client";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatetimeLocalInput } from "@/components/DatetimeLocalInput";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function EventCreatePage() {
  const { data: me, isLoading: meLoading } = useGetMe();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const create = useCreateEvent();
  const [name, setName] = useState("");
  const [location, setLocationStr] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [category, setCategory] = useState("General");
  const [description, setDescription] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim() || !dateTime) {
      toast({ title: "Fill name, location, and date/time", variant: "destructive" });
      return;
    }
    create.mutate(
      {
        name: name.trim(),
        location: location.trim(),
        dateTime: new Date(dateTime).toISOString(),
        category: category.trim() || "General",
        description: description.trim() || undefined,
      },
      {
        onSuccess: (ev) => {
          toast({ title: "Event published" });
          setLocation(`/events/${ev.id}`);
        },
        onError: (err: unknown) => {
          const e = err as { error?: string };
          toast({ title: "Could not create event", description: e?.error, variant: "destructive" });
        },
      }
    );
  };

  if (meLoading) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto h-48 animate-pulse rounded-xl bg-muted" />
      </Layout>
    );
  }

  if (!me || me.userType !== "organization") {
    return (
      <Layout>
        <div className="max-w-xl mx-auto space-y-4 py-12">
          <h1 className="text-2xl font-bold">Organization only</h1>
          <p className="text-muted-foreground text-sm">Creating events is limited to accounts registered as an organization.</p>
          <Button variant="secondary" className="rounded-full" asChild>
            <Link href="/profile">Back to profile</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => window.history.back()}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Button>
      <div className="max-w-xl mx-auto w-full">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Create event</h1>
        <p className="text-sm text-muted-foreground mb-8">Organization accounts can add campus or community events with location and details.</p>
        <Card className="border-0 ring-1 ring-border/40">
          <CardContent className="p-8">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="ev-name">Event name</Label>
                <Input id="ev-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. MSA welcome dinner" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-loc">Location</Label>
                <Input id="ev-loc" value={location} onChange={(e) => setLocationStr(e.target.value)} required placeholder="Full address or venue" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-when">Date &amp; time</Label>
                <DatetimeLocalInput id="ev-when" value={dateTime} onChange={(e) => setDateTime(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-cat">Category</Label>
                <Input id="ev-cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="General" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-desc">Description</Label>
                <Textarea id="ev-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="What to expect, parking, dress code…" />
              </div>
              <Button type="submit" className="w-full rounded-full" size="lg" disabled={create.isPending}>
                {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Publish event
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
