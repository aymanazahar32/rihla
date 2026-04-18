import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

function normalizeEvent(e: any) {
  return {
    id: e.id,
    name: e.name,
    location: e.location,
    dateTime: e.date_time,
    category: e.category,
    description: e.description,
    imageUrl: e.image_url,
  };
}

function normalizeRide(r: any) {
  return {
    id: r.id,
    eventId: r.event_id,
    driverId: r.driver_id,
    departureLocation: r.departure_location,
    departureTime: r.departure_time,
    seatsTotal: r.seats_total,
    seatsAvailable: r.seats_available,
    notes: r.notes,
    incentiveLabel: r.incentive_label,
    createdAt: r.created_at,
    driver: r.driver
      ? { id: r.driver.id, name: r.driver.name, createdAt: r.driver.created_at }
      : undefined,
    event: r.event
      ? { id: r.event.id, name: r.event.name, location: r.event.location, dateTime: r.event.date_time }
      : undefined,
    passengers: (r.ride_participants ?? []).map((p: any) => ({
      id: p.profiles.id,
      name: p.profiles.name,
    })),
  };
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const getGetMeQueryKey = () => ["/auth/me"] as const;
export const getGetEventQueryKey = (id: number) => ["/events", id] as const;
export const getGetEventSummaryQueryKey = (id: number) => ["/events", id, "summary"] as const;
export const getListRidesQueryKey = (params?: { eventId?: number }) => ["/rides", params] as const;
export const getGetRideQueryKey = (id: number) => ["/rides", id] as const;

// ── Auth ──────────────────────────────────────────────────────────────────────

export const useGetMe = () =>
  useQuery({
    queryKey: getGetMeQueryKey(),
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) throw error ?? new Error("Not authenticated");
      return {
        id: user.id,
        email: user.email ?? "",
        name: (user.user_metadata?.name as string) || user.email?.split("@")[0] || "User",
        role: (user.user_metadata?.role as string) || "passenger",
      };
    },
    retry: false,
  });

export const useLogin = () =>
  useMutation({
    mutationFn: async (vars: { data: { email: string; password: string } }) => {
      const { data, error } = await supabase.auth.signInWithPassword(vars.data);
      if (error) throw { error: error.message };
      return data.user;
    },
  });

export const useRegister = () =>
  useMutation({
    mutationFn: async (vars: { data: { name: string; email: string; password: string; role: string } }) => {
      const { data, error } = await supabase.auth.signUp({
        email: vars.data.email,
        password: vars.data.password,
        options: { data: { name: vars.data.name, role: vars.data.role } },
      });
      if (error) throw { error: error.message };
      if (!data.user) throw { error: "Sign up failed" };

      // Create profile row so other queries can join on it
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        name: vars.data.name,
        role: vars.data.role,
      });
      if (profileError) throw { error: profileError.message };

      return data.user;
    },
  });

export const useLogout = () =>
  useMutation({ mutationFn: () => supabase.auth.signOut() });

export type RegisterBodyRole = "driver" | "passenger";

// ── Events ────────────────────────────────────────────────────────────────────

export const useListEvents = () =>
  useQuery({
    queryKey: ["/events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("date_time", { ascending: true });
      if (error) throw error;
      return data.map(normalizeEvent);
    },
  });

export const useGetEvent = (id: number, options?: { query?: Record<string, unknown> }) =>
  useQuery({
    queryKey: getGetEventQueryKey(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return normalizeEvent(data);
    },
    ...options?.query,
  });

export const useGetEventSummary = (id: number, options?: { query?: Record<string, unknown> }) =>
  useQuery({
    queryKey: getGetEventSummaryQueryKey(id),
    queryFn: async () => {
      const { data: rides, error } = await supabase
        .from("rides")
        .select("seats_total, seats_available")
        .eq("event_id", id);
      if (error) throw error;

      const totalRides = rides.length;
      const availableSeats = rides.reduce((sum, r) => sum + r.seats_available, 0);
      const ridesWithSpace = rides.filter(r => r.seats_available > 0).length;
      const totalPassengers = rides.reduce(
        (sum, r) => sum + (r.seats_total - r.seats_available),
        0
      );

      return { totalRides, availableSeats, ridesWithSpace, totalPassengers };
    },
    ...options?.query,
  });

// ── Rides ─────────────────────────────────────────────────────────────────────

export const useListRides = (
  params: { eventId?: number },
  options?: { query?: Record<string, unknown> }
) =>
  useQuery({
    queryKey: getListRidesQueryKey(params),
    queryFn: async () => {
      const query = supabase
        .from("rides")
        .select(`
          *,
          driver:profiles!driver_id(id, name, created_at),
          event:events(id, name, location, date_time),
          ride_participants(profiles(id, name))
        `)
        .order("departure_time", { ascending: true });

      if (params.eventId) query.eq("event_id", params.eventId);

      const { data, error } = await query;
      if (error) throw error;
      return data.map(normalizeRide);
    },
    ...options?.query,
  });

export const useGetRide = (id: number, options?: { query?: Record<string, unknown> }) =>
  useQuery({
    queryKey: getGetRideQueryKey(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select(`
          *,
          driver:profiles!driver_id(id, name, created_at),
          event:events(id, name, location, date_time),
          ride_participants(profiles(id, name))
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return normalizeRide(data);
    },
    ...options?.query,
  });

export const useCreateRide = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { data: Record<string, unknown> }) => {
      const userId = await getCurrentUserId();
      const d = vars.data as any;
      const { data, error } = await supabase
        .from("rides")
        .insert({
          event_id: d.eventId,
          driver_id: userId,
          departure_location: d.departureLocation,
          departure_time: d.departureTime,
          seats_total: d.seatsTotal,
          seats_available: d.seatsTotal,
          notes: d.notes || null,
          incentive_label: d.incentiveLabel || null,
        })
        .select()
        .single();
      if (error) throw { error: error.message };
      return { id: data.id };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/rides"] }),
  });
};

export const useJoinRide = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { rideId: number }) => {
      const userId = await getCurrentUserId();

      const { error: joinError } = await supabase
        .from("ride_participants")
        .insert({ ride_id: vars.rideId, user_id: userId });
      if (joinError) throw { error: joinError.message };

      const { error: seatError } = await supabase.rpc("decrement_seat", {
        ride_id: vars.rideId,
      });
      if (seatError) throw { error: seatError.message };
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: getGetRideQueryKey(vars.rideId) }),
  });
};

export const useLeaveRide = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { rideId: number }) => {
      const userId = await getCurrentUserId();

      const { error: leaveError } = await supabase
        .from("ride_participants")
        .delete()
        .eq("ride_id", vars.rideId)
        .eq("user_id", userId);
      if (leaveError) throw { error: leaveError.message };

      const { error: seatError } = await supabase.rpc("increment_seat", {
        ride_id: vars.rideId,
      });
      if (seatError) throw { error: seatError.message };
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: getGetRideQueryKey(vars.rideId) }),
  });
};

export const useDeleteRide = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { rideId: number }) => {
      const { error } = await supabase.from("rides").delete().eq("id", vars.rideId);
      if (error) throw { error: error.message };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/rides"] }),
  });
};

export const useGetMyRides = () =>
  useQuery({
    queryKey: ["/rides/my"],
    queryFn: async () => {
      const userId = await getCurrentUserId();

      const [drivingRes, participantRes] = await Promise.all([
        supabase
          .from("rides")
          .select(`
            *,
            event:events(id, name, location, date_time),
            ride_participants(profiles(id, name))
          `)
          .eq("driver_id", userId)
          .order("departure_time", { ascending: true }),

        supabase
          .from("ride_participants")
          .select(`
            ride:rides(
              *,
              driver:profiles!driver_id(id, name, created_at),
              event:events(id, name, location, date_time),
              ride_participants(profiles(id, name))
            )
          `)
          .eq("user_id", userId),
      ]);

      if (drivingRes.error) throw drivingRes.error;
      if (participantRes.error) throw participantRes.error;

      return {
        drivingRides: drivingRes.data.map(normalizeRide),
        passengerRides: participantRes.data
          .map((p: any) => p.ride)
          .filter(Boolean)
          .map(normalizeRide),
      };
    },
  });
