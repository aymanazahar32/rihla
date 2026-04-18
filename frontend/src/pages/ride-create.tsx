import { useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateRide, useListEvents, useGetMe } from "@/lib/api-client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CarFront, MapPin, Calendar, Users, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const rideSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  departureLocation: z.string().min(3, "Departure location is required"),
  departureTime: z.string().min(1, "Departure time is required"),
  seatsTotal: z.coerce.number().min(1, "Must have at least 1 seat").max(8, "Cannot exceed 8 seats"),
  notes: z.string().optional(),
});

export default function RideCreatePage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const eventIdParam = urlParams.get("eventId");

  const { toast } = useToast();
  const { data: user, isLoading: isUserLoading } = useGetMe();
  const { data: events, isLoading: isEventsLoading } = useListEvents();
  const createRide = useCreateRide();

  useEffect(() => {
    if (!isUserLoading && user && user.role !== 'driver') {
      toast({ title: "Access Denied", description: "Only drivers can create rides.", variant: "destructive" });
      setLocation("/events");
    }
  }, [user, isUserLoading, setLocation, toast]);

  const form = useForm<z.infer<typeof rideSchema>>({
    resolver: zodResolver(rideSchema),
    defaultValues: {
      eventId: eventIdParam || "",
      departureLocation: "",
      departureTime: "",
      seatsTotal: 3,
      notes: "",
    },
  });

  const onSubmit = (data: z.infer<typeof rideSchema>) => {
    const formattedData = {
      ...data,
      eventId: Number(data.eventId),
      departureTime: new Date(data.departureTime).toISOString()
    };

    createRide.mutate(
      { data: formattedData },
      {
        onSuccess: (newRide: any) => {
          toast({ title: "Ride Created!", description: "Your ride has been successfully listed." });
          setLocation(`/rides/${newRide.id}`);
        },
        onError: (error: any) => {
          toast({ title: "Error creating ride", description: error.error || "Please try again later.", variant: "destructive" });
        }
      }
    );
  };

  if (isUserLoading || isEventsLoading) {
    return <Layout><div className="flex justify-center p-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div></Layout>;
  }

  if (!user || user.role !== 'driver') return null;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Link href={eventIdParam ? `/events/${eventIdParam}` : "/events"} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Link>

        <Card className="border-0 shadow-xl overflow-hidden bg-card/50 backdrop-blur">
          <div className="bg-primary/10 p-6 md:p-8 flex items-center gap-4 border-b">
            <div className="bg-primary/20 p-3 rounded-2xl">
              <CarFront className="w-8 h-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl md:text-3xl font-bold">Offer a Ride</CardTitle>
              <CardDescription className="text-base mt-1">Help fellow fans get to the event.</CardDescription>
            </div>
          </div>

          <CardContent className="p-6 md:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="eventId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Which event are you driving to?</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 bg-background">
                            <SelectValue placeholder="Select an event" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {events?.map((event: any) => (
                            <SelectItem key={event.id} value={event.id.toString()}>
                              {event.name} • {new Date(event.dateTime).toLocaleDateString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="departureLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">Departure Location</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                            <Input placeholder="e.g. Downtown Cafe, Main St" className="pl-10 h-12 bg-background" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="departureTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">Departure Time</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                            <Input type="datetime-local" className="pl-10 h-12 bg-background" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="seatsTotal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Available Seats</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Users className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                          <Input type="number" min={1} max={8} className="pl-10 h-12 bg-background w-full md:w-1/3" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Notes for Passengers <span className="text-muted-foreground text-sm font-normal">(Optional)</span></FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g. Can fit small bags, no smoking, listening to pop music"
                          className="resize-none h-24 bg-background"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4 border-t flex items-center justify-end gap-4">
                  <Link href={eventIdParam ? `/events/${eventIdParam}` : "/events"}>
                    <Button variant="ghost" type="button" className="h-12 px-6">Cancel</Button>
                  </Link>
                  <Button type="submit" className="h-12 px-8 rounded-full shadow-md text-base" disabled={createRide.isPending}>
                    {createRide.isPending ? "Creating..." : "Create Ride Listing"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
