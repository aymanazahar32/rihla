import { useParams, Link, useLocation } from "wouter";
import { format } from "date-fns";
import {
  useGetRide,
  getGetRideQueryKey,
  useJoinRide,
  useLeaveRide,
  useDeleteRide,
  useGetMe,
} from "@/lib/api-client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Calendar, Users, CarFront, User, ArrowLeft, Trash2, ShieldCheck, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function RideDetailPage() {
  const params = useParams();
  const rideId = Number(params.rideId);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useGetMe();

  const { data: ride, isLoading } = useGetRide(rideId, {
    query: { enabled: !!rideId, queryKey: getGetRideQueryKey(rideId) }
  });

  const joinRide = useJoinRide();
  const leaveRide = useLeaveRide();
  const deleteRide = useDeleteRide();

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6 max-w-4xl mx-auto w-full">
          <Skeleton className="w-24 h-8" />
          <Skeleton className="h-48 w-full rounded-3xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <Skeleton className="h-64 w-full rounded-3xl" />
            </div>
            <Skeleton className="h-64 w-full rounded-3xl" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!ride) {
    return (
      <Layout>
        <div className="text-center py-20 max-w-md mx-auto">
          <div className="bg-muted w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6">
            <CarFront className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Ride not found</h2>
          <p className="text-muted-foreground mb-6">This ride may have been cancelled or removed by the driver.</p>
          <Link href="/events"><Button>Browse Events</Button></Link>
        </div>
      </Layout>
    );
  }

  const isDriver = user?.id === ride.driverId;
  const isPassenger = ride.passengers.some((p: any) => p.id === user?.id);
  const isFull = ride.seatsAvailable === 0;

  const handleJoin = () => {
    joinRide.mutate({ rideId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetRideQueryKey(rideId) });
        toast({ title: "Joined!", description: "You are now a passenger for this ride." });
      },
      onError: (err: any) => toast({ title: "Failed to join", description: err.error, variant: "destructive" })
    });
  };

  const handleLeave = () => {
    leaveRide.mutate({ rideId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetRideQueryKey(rideId) });
        toast({ title: "Left ride", description: "You are no longer a passenger." });
      },
      onError: (err: any) => toast({ title: "Failed to leave", description: err.error, variant: "destructive" })
    });
  };

  const handleDelete = () => {
    deleteRide.mutate({ rideId }, {
      onSuccess: () => {
        toast({ title: "Ride Cancelled", description: "Your ride has been successfully removed." });
        setLocation(`/events/${ride.eventId}`);
      },
      onError: (err: any) => toast({ title: "Failed to cancel", description: err.error, variant: "destructive" })
    });
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Link href={`/events/${ride.eventId}`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to event
        </Link>

        <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-6 justify-between md:items-center relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-2 z-10">
            <Badge className="bg-background text-foreground border-0 shadow-sm mb-2 hover:bg-background">Event Bound</Badge>
            <h1 className="text-2xl md:text-3xl font-bold">{ride.event.name}</h1>
            <div className="flex items-center gap-4 text-muted-foreground text-sm">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {ride.event.location}</span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {format(new Date(ride.event.dateTime), "MMM d, yyyy")}</span>
            </div>
          </div>

          <div className="z-10 bg-background/80 backdrop-blur p-4 rounded-2xl border shadow-sm flex items-center justify-between gap-6 shrink-0">
            <div>
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Status</div>
              {isDriver ? (
                <div className="font-bold text-primary flex items-center gap-1.5"><CarFront className="w-4 h-4" /> Driving</div>
              ) : isPassenger ? (
                <div className="font-bold text-accent-foreground flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Riding</div>
              ) : isFull ? (
                <div className="font-bold text-destructive">Full</div>
              ) : (
                <div className="font-bold text-secondary-foreground flex items-center gap-1.5">{ride.seatsAvailable} Seats Open</div>
              )}
            </div>

            {isDriver ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="rounded-full shadow-sm">
                    <Trash2 className="w-4 h-4 mr-2" /> Cancel Ride
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will cancel the ride and notify all passengers. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Ride</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Yes, cancel ride</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : isPassenger ? (
              <Button variant="outline" onClick={handleLeave} disabled={leaveRide.isPending} className="rounded-full">
                {leaveRide.isPending ? "Leaving..." : "Leave Ride"}
              </Button>
            ) : user?.role === 'passenger' ? (
              <Button onClick={handleJoin} disabled={isFull || joinRide.isPending} className="rounded-full shadow-md px-6 bg-secondary text-secondary-foreground hover:bg-secondary/90">
                {joinRide.isPending ? "Joining..." : isFull ? "Ride Full" : "Join Ride"}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card className="border-0 shadow-md overflow-hidden">
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle className="text-xl flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" /> Logistics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative">
                  <div className="hidden sm:block absolute left-1/2 top-4 bottom-4 w-px bg-border/50 -translate-x-1/2" />

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Departure</div>
                    <div className="font-semibold text-lg">{ride.departureLocation}</div>
                    <div className="text-muted-foreground">{format(new Date(ride.departureTime), "EEEE, MMM d, yyyy")}</div>
                    <div className="text-primary font-medium">{format(new Date(ride.departureTime), "h:mm a")}</div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Arrival</div>
                    <div className="font-semibold text-lg">{ride.event.location}</div>
                    <div className="text-muted-foreground">For {ride.event.name}</div>
                    <Link href={`/events/${ride.event.id}`} className="text-sm text-primary hover:underline block mt-1">
                      View event details
                    </Link>
                  </div>
                </div>

                {ride.notes && (
                  <div className="bg-accent/30 p-4 rounded-xl mt-4">
                    <div className="flex items-center gap-2 font-medium text-accent-foreground mb-2">
                      <MessageSquare className="w-4 h-4" /> Driver Notes
                    </div>
                    <p className="text-sm text-foreground/80">{ride.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" /> Passengers
                  </CardTitle>
                  <Badge variant="outline" className="bg-background">
                    {ride.passengers.length} / {ride.seatsTotal}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {ride.passengers.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No passengers yet. Be the first to join!
                  </div>
                ) : (
                  <div className="divide-y">
                    {ride.passengers.map((p: any) => (
                      <div key={p.id} className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground font-bold flex items-center justify-center">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {p.name}
                            {p.id === user?.id && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">You</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground">Joined {format(new Date(ride.createdAt), "MMM d")}</div>
                        </div>
                      </div>
                    ))}
                    {ride.seatsAvailable > 0 && (
                      <div className="p-4 flex items-center gap-4 opacity-50 bg-muted/20">
                        <div className="w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="font-medium text-muted-foreground">Empty Seat</div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-0 shadow-sm bg-card overflow-hidden">
              <div className="h-24 bg-primary/10 relative">
                {ride.incentiveLabel && (
                  <Badge className="absolute top-4 right-4 bg-secondary text-secondary-foreground hover:bg-secondary border-0 shadow-sm">
                    {ride.incentiveLabel}
                  </Badge>
                )}
              </div>
              <div className="px-6 pb-6 pt-0 relative">
                <div className="w-20 h-20 rounded-full bg-background border-4 border-background -mt-10 mx-auto shadow-sm flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-primary/20 text-primary text-2xl font-bold flex items-center justify-center">
                    {ride.driver.name.charAt(0)}
                  </div>
                </div>
                <div className="text-center mt-4">
                  <h3 className="font-bold text-xl">{ride.driver.name}</h3>
                  <p className="text-muted-foreground text-sm flex items-center justify-center gap-1 mt-1">
                    <CarFront className="w-3 h-3" /> Verified Driver
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Member since</span>
                    <span className="font-medium">{format(new Date(ride.driver.createdAt), "yyyy")}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Seats</span>
                    <span className="font-medium">{ride.seatsTotal}</span>
                  </div>
                </div>
              </div>
            </Card>

            <div className="bg-secondary/10 p-4 rounded-2xl flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">Community Trust</p>
                <p className="text-muted-foreground">This ride is restricted to verified members of the RideShare community.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
