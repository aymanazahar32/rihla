import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  useListRides, useListRideRequests, useGetMe,
  useCreateRide, useCreateRideRequest, canUserOfferRides,
} from "@/lib/api-client";
import { maySeePersonByGender, displayNameForGenderPolicy } from "@/lib/gender-visibility";
import { useToast } from "@/hooks/use-toast";
import { RequestMessageThread } from "@/components/RequestMessageThread";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatetimeLocalInput } from "@/components/DatetimeLocalInput";
import { CarFront, MapPin, Clock, Users, HandHelping, ShieldCheck, ArrowRight, X } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Props {
  contextType: "event" | "masjid" | "errand";
  contextId: number;
  prayerName?: string;
  contextLabel: string;
  rideCreateHref: string;
  requestCreateHref: string;
}

function initials(n: string) {
  return n.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
}

function defaultDatetime() {
  const d = new Date();
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function InlineRideForm({ contextType, contextId, prayerName, onDone, onPosted }: {
  contextType: string; contextId: number; prayerName?: string; onDone: () => void; onPosted: () => Promise<unknown>;
}) {
  const { toast } = useToast();
  const createRide = useCreateRide();
  const [departureLocation, setDepartureLocation] = useState("");
  const [departureTime, setDepartureTime] = useState(defaultDatetime());
  const [seats, setSeats] = useState(3);
  const [notes, setNotes] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!departureLocation.trim() || !departureTime) return;
    createRide.mutate(
      {
        data: {
          contextType, contextId,
          ...(prayerName ? { prayerName } : {}),
          departureLocation: departureLocation.trim(),
          departureLat: null, departureLng: null,
          departureTime: new Date(departureTime).toISOString(),
          seatsTotal: seats, notes,
        },
      },
      {
        onSuccess: async () => { await onPosted(); toast({ title: "Ride posted!" }); onDone(); },
        onError: (err: any) => toast({ title: "Failed", description: err?.error ?? "Could not post ride", variant: "destructive" }),
      }
    );
  };

  return (
    <Card className="border-0 ring-2 ring-primary/30 bg-primary/5">
      <CardContent className="p-4">
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Departure location</Label>
            <Input
              placeholder="e.g. Mason Pond Parking Deck, GMU"
              value={departureLocation}
              onChange={(e) => setDepartureLocation(e.target.value)}
              required
              className="text-sm h-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Departure time</Label>
              <DatetimeLocalInput value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Seats</Label>
              <Input type="number" min={1} max={8} value={seats} onChange={(e) => setSeats(Number(e.target.value))} required className="text-sm h-9" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea placeholder="e.g. Leaving 5 min early" value={notes} onChange={(e) => setNotes(e.target.value)} className="text-sm min-h-[60px]" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="flex-1 rounded-full" disabled={createRide.isPending}>
              {createRide.isPending ? "Posting…" : "Post ride"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onDone} className="rounded-full px-3">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function InlineRequestForm({ contextType, contextId, prayerName, onDone, onPosted }: {
  contextType: string; contextId: number; prayerName?: string; onDone: () => void; onPosted: () => Promise<unknown>;
}) {
  const { toast } = useToast();
  const createReq = useCreateRideRequest();
  const [pickupLocation, setPickupLocation] = useState("");
  const [desiredTime, setDesiredTime] = useState(defaultDatetime());
  const [notes, setNotes] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupLocation.trim() || !desiredTime) return;
    createReq.mutate(
      {
        data: {
          contextType, contextId,
          ...(prayerName ? { prayerName } : {}),
          pickupLocation: pickupLocation.trim(),
          pickupLat: null, pickupLng: null,
          desiredTime: new Date(desiredTime).toISOString(),
          notes,
        },
      },
      {
        onSuccess: async () => { await onPosted(); toast({ title: "Request posted!" }); onDone(); },
        onError: (err: any) => toast({ title: "Failed", description: err?.error ?? "Could not post request", variant: "destructive" }),
      }
    );
  };

  return (
    <Card className="border-0 ring-2 ring-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
      <CardContent className="p-4">
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Pickup location</Label>
            <Input
              placeholder="e.g. University Dr & Main St"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              required
              className="text-sm h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Desired pickup time</Label>
            <DatetimeLocalInput value={desiredTime} onChange={(e) => setDesiredTime(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea placeholder="e.g. Have a backpack, flexible by 10 min" value={notes} onChange={(e) => setNotes(e.target.value)} className="text-sm min-h-[60px]" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="secondary" className="flex-1 rounded-full" disabled={createReq.isPending}>
              {createReq.isPending ? "Posting…" : "Submit request"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onDone} className="rounded-full px-3">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function RidesAndRequests({ contextType, contextId, prayerName, contextLabel, rideCreateHref, requestCreateHref }: Props) {
  const { data: me } = useGetMe();
  const { toast } = useToast();
  const { data: rides = [], isLoading: ridesLoading, refetch: refetchRides } = useListRides({ contextType, contextId, ...(prayerName ? { prayerName } : {}) });
  const { data: requests = [], isLoading: reqLoading, refetch: refetchRequests } = useListRideRequests({ contextType, contextId, ...(prayerName ? { prayerName } : {}) });
  const canDrive = canUserOfferRides(me);
  const viewer = me ? { id: me.id, gender: me.gender, userType: me.userType } : null;
  const rideNext = encodeURIComponent(rideCreateHref);
  const reqNext = encodeURIComponent(requestCreateHref);

  const [showRideForm, setShowRideForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);

  const visibleRides = useMemo(
    () => rides.filter((r: any) => maySeePersonByGender(viewer, r.driver?.gender)),
    [rides, viewer]
  );
  const visibleRequests = useMemo(
    () => requests.filter((rr: any) => maySeePersonByGender(viewer, rr.requester?.gender)),
    [requests, viewer]
  );

  return (
    <div className="w-full space-y-6">
      <div className="grid md:grid-cols-2 gap-6">

        {/* Driver offers */}
        <section className="space-y-3">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <CarFront className="w-4 h-4 text-primary" /> Driver offers
          </h3>

          {/* Host CTA */}
          {!me ? (
            <Link href={`/login?next=${rideNext}`}>
              <Button size="sm" className="w-full rounded-full">
                <CarFront className="w-3.5 h-3.5 mr-1.5" /> Host a ride share
              </Button>
            </Link>
          ) : canDrive ? (
            <Button
              size="sm"
              className="w-full rounded-full"
              onClick={() => { setShowRideForm((v) => !v); setShowRequestForm(false); }}
            >
              <CarFront className="w-3.5 h-3.5 mr-1.5" />
              {showRideForm ? "Cancel" : "Host a ride share"}
            </Button>
          ) : (
            <Link href="/profile">
              <Button size="sm" variant="secondary" className="w-full rounded-full"
                onClick={() => toast({ title: "Verified drivers only", description: "Complete driver verification in Profile.", variant: "destructive" })}>
                <CarFront className="w-3.5 h-3.5 mr-1.5" /> Host a ride share
              </Button>
            </Link>
          )}

          {/* Inline ride form */}
          {showRideForm && me && canDrive && (
            <InlineRideForm
              contextType={contextType}
              contextId={contextId}
              prayerName={prayerName}
              onDone={() => setShowRideForm(false)}
              onPosted={() => refetchRides()}
            />
          )}

          {/* Ride list */}
          {ridesLoading ? <SkeletonRow /> : visibleRides.length === 0 ? (
            <EmptyCard label={`No drivers yet for ${contextLabel}.`} />
          ) : (
            visibleRides.map((r: any) => (
              <Link key={r.id} href={`/rides/${r.id}`}>
                <Card className="hover:shadow-md transition-all cursor-pointer border-0 ring-1 ring-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-9 h-9 shrink-0"><AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">{initials(r.driver?.name ?? "?")}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{r.driver?.name}</span>
                          {r.driver?.idVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                          {r.incentiveLabel && <Badge variant="secondary" className="text-[10px] py-0 px-2">{r.incentiveLabel}</Badge>}
                        </div>
                        {r.departureLocation && (
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" /> {r.departureLocation}</div>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(parseISO(r.departureTime), "MMM d, h:mm a")}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {r.seatsAvailable}/{r.seatsTotal}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </section>

        {/* Rider requests */}
        <section className="space-y-3">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <HandHelping className="w-4 h-4 text-amber-600" /> Rider requests
          </h3>

          {/* Request CTA */}
          {!me ? (
            <Link href={`/login?next=${reqNext}`}>
              <Button size="sm" variant="outline" className="w-full rounded-full">
                <HandHelping className="w-3.5 h-3.5 mr-1.5" /> Request a ride
              </Button>
            </Link>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="w-full rounded-full"
              onClick={() => { setShowRequestForm((v) => !v); setShowRideForm(false); }}
            >
              <HandHelping className="w-3.5 h-3.5 mr-1.5" />
              {showRequestForm ? "Cancel" : "Request a ride"}
            </Button>
          )}

          {/* Inline request form */}
          {showRequestForm && me && (
            <InlineRequestForm
              contextType={contextType}
              contextId={contextId}
              prayerName={prayerName}
              onDone={() => setShowRequestForm(false)}
              onPosted={() => refetchRequests()}
            />
          )}

          {/* Request list */}
          {reqLoading ? <SkeletonRow /> : visibleRequests.length === 0 ? (
            <EmptyCard label="No ride requests yet." />
          ) : (
            visibleRequests.map((rr: any) => {
              const requesterId = rr.requesterId ?? rr.requester?.id;
              const showReqChat = !!(me?.id && requesterId && (me.id === requesterId || canDrive));
              const requesterLabel = requesterId
                ? displayNameForGenderPolicy(viewer, requesterId, rr.requester?.name ?? "?", rr.requester?.gender)
                : rr.requester?.name ?? "?";
              return (
                <Card key={rr.id} className="border-0 ring-1 ring-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-9 h-9 shrink-0"><AvatarFallback className="bg-amber-100 text-amber-700 font-semibold text-xs">{initials(requesterLabel)}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{requesterLabel}</span>
                          {rr.requester?.idVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                        </div>
                        {rr.pickupLocation && (
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" /> {rr.pickupLocation}</div>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(parseISO(rr.desiredTime), "MMM d, h:mm a")}</span>
                        </div>
                        {rr.notes && <div className="text-xs text-muted-foreground mt-1.5 italic">"{rr.notes}"</div>}
                        {showReqChat && requesterId && me && (
                          <RequestMessageThread
                            rideRequestId={rr.id}
                            currentUserId={me.id}
                            requesterId={requesterId}
                            requesterName={requesterLabel}
                          />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </section>

      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <>
      <Card className="border-0 ring-1 ring-border/50"><CardContent className="p-4 h-20 animate-pulse" /></Card>
      <Card className="border-0 ring-1 ring-border/50"><CardContent className="p-4 h-20 animate-pulse" /></Card>
    </>
  );
}

function EmptyCard({ label }: { label: string }) {
  return (
    <Card className="border-dashed border-2 bg-muted/30">
      <CardContent className="p-5 text-center text-sm text-muted-foreground">{label}</CardContent>
    </Card>
  );
}
