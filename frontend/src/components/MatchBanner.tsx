import { useGetMe, useGetMyMatches, useUpdateMatchStatus, useJoinRide, useAcceptRideRequest } from "@/lib/api-client";
import { haversineKm, scoreLabel } from "@/lib/matching";
import { MatchScoreGauge } from "@/components/MatchScoreGauge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CarFront, MapPin, Clock, Loader2, Sparkles, X, Check } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

function initials(n: string) {
  return n.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
}

function distLabel(aLat?: number | null, aLng?: number | null, bLat?: number | null, bLng?: number | null) {
  if (!aLat || !aLng || !bLat || !bLng) return null;
  const d = haversineKm(aLat, aLng, bLat, bLng);
  return d < 1 ? `${Math.round(d * 1000)} m away` : `${d.toFixed(1)} km away`;
}

export function MatchBanner() {
  const { data: me } = useGetMe();
  const { data: matches = [], isLoading } = useGetMyMatches();
  const updateMatch = useUpdateMatchStatus();
  const joinRide = useJoinRide();
  const acceptRequest = useAcceptRideRequest();
  const { toast } = useToast();
  const qc = useQueryClient();

  if (!me || isLoading) return null;
  if (matches.length === 0) return <SearchingBanner />;

  const isDriver = me.userType === "driver";

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["/ride-matches/my"] });
    qc.invalidateQueries({ queryKey: ["/ride-requests"] });
    qc.invalidateQueries({ queryKey: ["/rides"] });
  };

  if (isDriver) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold">Riders looking for a lift near you</span>
          <Badge variant="secondary" className="ml-auto text-[10px]">{matches.length} match{matches.length !== 1 ? "es" : ""}</Badge>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {matches.map((m: any) => {
            const req = m.request;
            const ride = m.ride;
            const dist = distLabel(ride?.departure_lat, ride?.departure_lng, req?.pickup_lat, req?.pickup_lng);
            return (
              <Card key={m.id} className="border-0 ring-1 ring-amber-200 bg-amber-50/40">
                <CardContent className="p-3 flex items-center gap-3">
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarFallback className="bg-amber-100 text-amber-700 text-xs font-bold">
                      {initials(req?.requester?.name ?? "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{req?.requester?.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {req?.pickup_location}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {req?.desired_time ? format(parseISO(req.desired_time), "h:mm a") : "—"}
                      {dist && <span>· {dist}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <MatchScoreGauge score={m.score} size={52} />
                    <span className="text-[10px] text-muted-foreground">{scoreLabel(m.score)}</span>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button
                      size="sm"
                      className="h-7 text-xs rounded-full px-3"
                      disabled={acceptRequest.isPending}
                      onClick={() =>
                        acceptRequest.mutate(
                          { requestId: req.id },
                          {
                            onSuccess: () => {
                              updateMatch.mutate({ matchId: m.id, status: "accepted" });
                              refresh();
                              toast({ title: "Request accepted!", description: `You'll pick up ${req?.requester?.name}.` });
                            },
                            onError: (e: any) => toast({ title: "Failed", description: e?.error, variant: "destructive" }),
                          }
                        )
                      }
                    >
                      <Check className="w-3 h-3 mr-1" /> Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs rounded-full px-3 text-muted-foreground"
                      onClick={() => updateMatch.mutate({ matchId: m.id, status: "dismissed" }, { onSuccess: refresh })}
                    >
                      <X className="w-3 h-3 mr-1" /> Pass
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Rider view — show top match as a prominent card
  const top = matches[0] as any;
  const ride = top.ride;
  const driver = ride?.driver;
  const reqData = top.request as any;
  const dist = distLabel(reqData?.pickup_lat, reqData?.pickup_lng, ride?.departure_lat, ride?.departure_lng);
  const destination = ride?.event?.name ?? ride?.masjid?.name ?? ride?.errand?.title ?? "Trip";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="w-4 h-4 text-emerald-500" />
        <span className="text-sm font-semibold text-emerald-700">Match found!</span>
        {matches.length > 1 && (
          <Badge variant="secondary" className="ml-auto text-[10px]">{matches.length} options</Badge>
        )}
      </div>

      <Card className="border-0 ring-2 ring-emerald-300 bg-gradient-to-br from-emerald-50 to-white shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="w-12 h-12 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {initials(driver?.name ?? "?")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-base">{driver?.name}</div>
              <div className="text-xs text-muted-foreground">{driver?.car_color} {driver?.car_make} {driver?.car_model}</div>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {destination}</span>
                {dist && <span>· {dist}</span>}
                {ride?.departure_time && (
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(parseISO(ride.departure_time), "h:mm a")}</span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <MatchScoreGauge score={top.score} size={64} />
              <span className="text-[10px] text-muted-foreground font-medium">{scoreLabel(top.score)}</span>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              className="flex-1 rounded-full bg-emerald-600 hover:bg-emerald-700"
              disabled={joinRide.isPending}
              onClick={() =>
                joinRide.mutate(
                  { rideId: ride.id },
                  {
                    onSuccess: () => {
                      updateMatch.mutate({ matchId: top.id, status: "accepted" });
                      refresh();
                      toast({ title: "Ride joined!", description: `${driver?.name} will pick you up.` });
                    },
                    onError: (e: any) => toast({ title: "Failed", description: e?.error, variant: "destructive" }),
                  }
                )
              }
            >
              <CarFront className="w-4 h-4 mr-2" /> Accept ride
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => updateMatch.mutate({ matchId: top.id, status: "dismissed" }, { onSuccess: refresh })}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {matches.length > 1 && (
        <p className="text-xs text-muted-foreground text-center">{matches.length - 1} more option{matches.length - 1 !== 1 ? "s" : ""} available in your context pages</p>
      )}
    </div>
  );
}

function SearchingBanner() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 ring-1 ring-border/40">
      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
      <div>
        <p className="text-sm font-medium">Finding your best match…</p>
        <p className="text-xs text-muted-foreground">We'll notify you as soon as a driver posts a matching ride.</p>
      </div>
    </div>
  );
}
