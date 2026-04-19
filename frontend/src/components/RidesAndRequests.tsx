import { useMemo } from "react";
import { Link } from "wouter";
import { useListRides, useListRideRequests, useGetMe, canUserOfferRides } from "@/lib/api-client";
import { maySeePersonByGender, displayNameForGenderPolicy } from "@/lib/gender-visibility";
import { useToast } from "@/hooks/use-toast";
import { RequestMessageThread } from "@/components/RequestMessageThread";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CarFront, MapPin, Clock, Users, HandHelping, ShieldCheck, ArrowRight, Plus } from "lucide-react";
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

export function RidesAndRequests({ contextType, contextId, prayerName, contextLabel, rideCreateHref, requestCreateHref }: Props) {
  const { data: me } = useGetMe();
  const { toast } = useToast();
  const { data: rides = [], isLoading: ridesLoading } = useListRides({ contextType, contextId, ...(prayerName ? { prayerName } : {}) });
  const { data: requests = [], isLoading: reqLoading } = useListRideRequests({ contextType, contextId, ...(prayerName ? { prayerName } : {}) });
  const canDrive = canUserOfferRides(me);
  const viewer = me ? { id: me.id, gender: me.gender, userType: me.userType } : null;
  const rideNext = encodeURIComponent(rideCreateHref);
  const reqNext = encodeURIComponent(requestCreateHref);

  const visibleRides = useMemo(
    () => rides.filter((r: { driver?: { gender?: string | null } }) => maySeePersonByGender(viewer, r.driver?.gender)),
    [rides, viewer]
  );
  const visibleRequests = useMemo(
    () =>
      requests.filter((rr: { requester?: { gender?: string | null } }) =>
        maySeePersonByGender(viewer, rr.requester?.gender)
      ),
    [requests, viewer]
  );

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Driver offers */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2"><CarFront className="w-5 h-5 text-primary" /> Driver offers</h3>
            <p className="text-xs text-muted-foreground">Riders going to {contextLabel}</p>
          </div>
          {!me ? (
            <Link href={`/login?next=${rideNext}`}>
              <Button size="sm" className="rounded-full">
                <Plus className="w-4 h-4 mr-1" /> Offer ride
              </Button>
            </Link>
          ) : (
            <Link href={canDrive ? rideCreateHref : "/profile"}>
              <Button
                size="sm"
                variant={canDrive ? "default" : "secondary"}
                className="rounded-full"
                onClick={() => {
                  if (!canDrive) {
                    toast({
                      title: "Verified drivers only",
                      description: "Open Profile to complete driver verification before offering rides.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Plus className="w-4 h-4 mr-1" /> Offer ride
              </Button>
            </Link>
          )}
        </div>
        <div className="space-y-3">
          {ridesLoading ? <SkeletonRow /> : visibleRides.length === 0 ? (
            <EmptyCard label={`No drivers offering rides to ${contextLabel} yet.`} />
          ) : (
            visibleRides.map((r: any) => (
              <Link key={r.id} href={`/rides/${r.id}`}>
                <Card className="hover:shadow-md transition-all cursor-pointer border-0 ring-1 ring-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10"><AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials(r.driver?.name ?? "?")}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold truncate">{r.driver?.name}</span>
                          {r.driver?.idVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
                          {r.incentiveLabel && <Badge variant="secondary" className="text-[10px] py-0 px-2">{r.incentiveLabel}</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> from {r.departureLocation}</div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(parseISO(r.departureTime), "MMM d, h:mm a")}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {r.seatsAvailable}/{r.seatsTotal} open</span>
                        </div>
                        <div className="text-[11px] text-primary font-medium mt-2">Open to view &amp; book a seat →</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* Rider requests */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2"><HandHelping className="w-5 h-5 text-amber-600" /> Rider requests</h3>
            <p className="text-xs text-muted-foreground">People looking for a ride</p>
          </div>
          {!me ? (
            <Link href={`/login?next=${reqNext}`}>
              <Button size="sm" variant="secondary" className="rounded-full">
                <Plus className="w-4 h-4 mr-1" /> Request ride
              </Button>
            </Link>
          ) : (
            <Link href={requestCreateHref}>
              <Button size="sm" variant="secondary" className="rounded-full">
                <Plus className="w-4 h-4 mr-1" /> Request ride
              </Button>
            </Link>
          )}
        </div>
        <div className="space-y-3">
          {reqLoading ? <SkeletonRow /> : visibleRequests.length === 0 ? (
            <EmptyCard label="No open requests yet — be the first to ask!" />
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
                      <Avatar className="w-10 h-10"><AvatarFallback className="bg-amber-100 text-amber-700 font-semibold">{initials(requesterLabel)}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold truncate">{requesterLabel}</span>
                          {rr.requester?.idVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> pickup at {rr.pickupLocation}</div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(parseISO(rr.desiredTime), "MMM d, h:mm a")}</span>
                        </div>
                        {rr.notes && <div className="text-xs text-muted-foreground mt-2 italic">"{rr.notes}"</div>}
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
        </div>
      </section>
    </div>
  );
}

function SkeletonRow() {
  return (
    <>
      <Card className="border-0 ring-1 ring-border/50"><CardContent className="p-4 h-24 animate-pulse" /></Card>
      <Card className="border-0 ring-1 ring-border/50"><CardContent className="p-4 h-24 animate-pulse" /></Card>
    </>
  );
}

function EmptyCard({ label }: { label: string }) {
  return (
    <Card className="border-dashed border-2 bg-muted/30">
      <CardContent className="p-6 text-center text-sm text-muted-foreground">{label}</CardContent>
    </Card>
  );
}
