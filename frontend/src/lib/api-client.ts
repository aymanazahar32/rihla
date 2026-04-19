import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

function normalizeEvent(event: any) {
  return {
    id: event.id,
    name: event.name,
    location: event.location,
    dateTime: event.date_time,
    category: event.category,
    description: event.description,
    imageUrl: event.image_url,
  };
}

function normalizeRide(ride: any) {
  return {
    id: ride.id,
    eventId: ride.event_id,
    masjidId: ride.masjid_id,
    errandId: ride.errand_id,
    contextType: ride.context_type,
    prayerName: ride.prayer_name,
    driverId: ride.driver_id,
    departureLocation: ride.departure_location,
    departureTime: ride.departure_time,
    seatsTotal: ride.seats_total,
    seatsAvailable: ride.seats_available,
    notes: ride.notes,
    incentiveLabel: ride.incentive_label,
    status: ride.status ?? "scheduled",
    currentLat: ride.current_lat,
    currentLng: ride.current_lng,
    destinationLat: ride.destination_lat,
    destinationLng: ride.destination_lng,
    etaMinutes: ride.eta_minutes,
    progressPercent: ride.progress_percent,
    createdAt: ride.created_at,
    driver: ride.driver
      ? {
          id: ride.driver.id,
          name: ride.driver.name,
          idVerified: ride.driver.id_verified,
          carMake: ride.driver.car_make,
          carModel: ride.driver.car_model,
          carColor: ride.driver.car_color,
          createdAt: ride.driver.created_at,
        }
      : undefined,
    event: ride.event
      ? {
          id: ride.event.id,
          name: ride.event.name,
          location: ride.event.location,
          dateTime: ride.event.date_time,
        }
      : undefined,
    masjid: ride.masjid ? { id: ride.masjid.id, name: ride.masjid.name } : undefined,
    errand: ride.errand ? { id: ride.errand.id, title: ride.errand.title } : undefined,
    passengers: (ride.ride_participants ?? []).map((participant: any) => ({
      id: participant.profiles.id,
      name: participant.profiles.name,
      idVerified: participant.profiles.id_verified,
    })),
  };
}

function normalizeMasjid(masjid: any) {
  return {
    id: masjid.id,
    name: masjid.name,
    address: masjid.address,
    description: masjid.description,
    imageUrl: masjid.image_url,
    fajr: masjid.fajr,
    dhuhr: masjid.dhuhr,
    asr: masjid.asr,
    maghrib: masjid.maghrib,
    isha: masjid.isha,
    jumuah: masjid.jumuah,
  };
}

function normalizeErrand(errand: any) {
  return {
    id: errand.id,
    title: errand.title,
    description: errand.description,
    category: errand.category,
    location: errand.location,
    scheduledTime: errand.scheduled_time,
  };
}

function normalizeRideRequest(rideRequest: any) {
  return {
    id: rideRequest.id,
    contextType: rideRequest.context_type,
    prayerName: rideRequest.prayer_name,
    pickupLocation: rideRequest.pickup_location,
    desiredTime: rideRequest.desired_time,
    notes: rideRequest.notes,
    requester: rideRequest.requester
      ? {
          id: rideRequest.requester.id,
          name: rideRequest.requester.name,
          idVerified: rideRequest.requester.id_verified,
        }
      : undefined,
  };
}

export const getGetMeQueryKey = () => ["/auth/me"] as const;
export const getGetEventQueryKey = (id: number) => ["/events", id] as const;
export const getGetEventSummaryQueryKey = (id: number) => ["/events", id, "summary"] as const;
export const getListRidesQueryKey = (params?: object) => ["/rides", params] as const;
export const getGetRideQueryKey = (id: number) => ["/rides", id] as const;
export const getGetMyRidesQueryKey = () => ["/rides/my"] as const;
export const getGetRideLocationQueryKey = (id: number) => ["/rides", id, "location"] as const;

export const useGetMe = () =>
  useQuery({
    queryKey: getGetMeQueryKey(),
    queryFn: async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) throw error ?? new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, user_type, id_verified, driver_history_checked, profile_completed, car_make, car_model, car_color")
        .eq("id", user.id)
        .single();

      return {
        id: user.id,
        email: user.email ?? "",
        name: profile?.name || (user.user_metadata?.name as string) || user.email?.split("@")[0] || "User",
        userType: profile?.user_type ?? null,
        idVerified: profile?.id_verified ?? false,
        driverHistoryChecked: profile?.driver_history_checked ?? false,
        profileCompleted: profile?.profile_completed ?? false,
        carMake: profile?.car_make ?? null,
        carModel: profile?.car_model ?? null,
        carColor: profile?.car_color ?? null,
      };
    },
    retry: false,
  });

export const useLogin = () =>
  useMutation({
    mutationFn: async (vars: { data: { email: string; password: string } }) => {
      const { data, error } = await supabase.auth.signInWithPassword(vars.data);
      if (error) throw { error: error.message };

      const { data: profile } = await supabase
        .from("profiles")
        .select("profile_completed")
        .eq("id", data.user.id)
        .single();

      return { user: { id: data.user.id, profileCompleted: profile?.profile_completed ?? false } };
    },
  });

export const useRegister = () =>
  useMutation({
    mutationFn: async (vars: { data: { name: string; email: string; password: string } }) => {
      const { data, error } = await supabase.auth.signUp({
        email: vars.data.email,
        password: vars.data.password,
        options: { data: { name: vars.data.name } },
      });
      if (error) throw { error: error.message };
      if (!data.user) throw { error: "Sign up failed" };

      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        name: vars.data.name,
        profile_completed: false,
      });
      if (profileError && profileError.code !== "23505") throw { error: profileError.message };

      return data.user;
    },
  });

export const useLogout = () =>
  useMutation({
    mutationFn: () => supabase.auth.signOut(),
  });

export const useSetupRiderProfile = () =>
  useMutation({
    mutationFn: async (vars: { data: { gender: string; age: number; university: string; studentIdNumber: string } }) => {
      const userId = await getCurrentUserId();
      const data = vars.data;
      const { error } = await supabase
        .from("profiles")
        .update({
          user_type: "rider",
          gender: data.gender,
          age: data.age,
          university: data.university,
          student_id_number: data.studentIdNumber,
        })
        .eq("id", userId);
      if (error) throw { error: error.message };
    },
  });

export const useSetupDriverProfile = () =>
  useMutation({
    mutationFn: async (vars: { data: { gender: string; age: number; university: string; studentIdNumber: string; licensePlate: string; vinNumber: string; driversLicenseNumber: string; carMake: string; carModel: string; carColor: string } }) => {
      const userId = await getCurrentUserId();
      const data = vars.data;
      const { error } = await supabase
        .from("profiles")
        .update({
          user_type: "driver",
          gender: data.gender,
          age: data.age,
          university: data.university,
          student_id_number: data.studentIdNumber,
          license_plate: data.licensePlate,
          vin_number: data.vinNumber,
          drivers_license_number: data.driversLicenseNumber,
          car_make: data.carMake,
          car_model: data.carModel,
          car_color: data.carColor,
        })
        .eq("id", userId);
      if (error) throw { error: error.message };
    },
  });

export const useSetupOrgProfile = () =>
  useMutation({
    mutationFn: async (vars: { data: { organizationName: string } }) => {
      const userId = await getCurrentUserId();
      const { error } = await supabase
        .from("profiles")
        .update({
          user_type: "organization",
          organization_name: vars.data.organizationName,
          profile_completed: true,
        })
        .eq("id", userId);
      if (error) throw { error: error.message };
    },
  });

export const useVerifyId = () =>
  useMutation({
    mutationFn: async () => {
      const userId = await getCurrentUserId();
      const { error } = await supabase.from("profiles").update({ id_verified: true }).eq("id", userId);
      if (error) throw { error: error.message };
    },
  });

export const useRunDriverCheck = () =>
  useMutation({
    mutationFn: async () => {
      const userId = await getCurrentUserId();
      const { error } = await supabase
        .from("profiles")
        .update({
          driver_history_checked: true,
          profile_completed: true,
        })
        .eq("id", userId);
      if (error) throw { error: error.message };
    },
  });

export const useCompleteProfile = () =>
  useMutation({
    mutationFn: async () => {
      const userId = await getCurrentUserId();
      const { error } = await supabase.from("profiles").update({ profile_completed: true }).eq("id", userId);
      if (error) throw { error: error.message };
    },
  });

export const useListEvents = () =>
  useQuery({
    queryKey: ["/events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").order("date_time", { ascending: true });
      if (error) throw error;
      return data.map(normalizeEvent);
    },
  });

export const useGetEvent = (id: number, options?: { query?: Record<string, unknown> }) =>
  useQuery({
    queryKey: getGetEventQueryKey(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
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
      const availableSeats = rides.reduce((sum, ride) => sum + ride.seats_available, 0);
      const ridesWithSpace = rides.filter((ride) => ride.seats_available > 0).length;
      const totalPassengers = rides.reduce((sum, ride) => sum + (ride.seats_total - ride.seats_available), 0);
      return { totalRides, availableSeats, ridesWithSpace, totalPassengers };
    },
    ...options?.query,
  });

export const useListMasjids = () =>
  useQuery({
    queryKey: ["/masjids"],
    queryFn: async () => {
      const { data, error } = await supabase.from("masjids").select("*").order("name");
      if (error) throw error;
      return data.map(normalizeMasjid);
    },
  });

export const useGetMasjid = (id: number, options?: { query?: Record<string, unknown> }) =>
  useQuery({
    queryKey: ["/masjids", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("masjids").select("*").eq("id", id).single();
      if (error) throw error;
      return normalizeMasjid(data);
    },
    ...options?.query,
  });

export const useListErrands = (params?: { category?: string; search?: string }) =>
  useQuery({
    queryKey: ["/errands", params],
    queryFn: async () => {
      let query = supabase.from("errands").select("*").order("scheduled_time", { ascending: true });
      if (params?.category) query = query.eq("category", params.category);
      if (params?.search) query = query.ilike("title", `%${params.search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data.map(normalizeErrand);
    },
  });

export const useGetErrand = (id: number, options?: { query?: Record<string, unknown> }) =>
  useQuery({
    queryKey: ["/errands", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("errands").select("*").eq("id", id).single();
      if (error) throw error;
      return normalizeErrand(data);
    },
    ...options?.query,
  });

const RIDE_SELECT = `
  *,
  driver:profiles!driver_id(id, name, id_verified, car_make, car_model, car_color, created_at),
  event:events(id, name, location, date_time),
  masjid:masjids(id, name),
  errand:errands(id, title),
  ride_participants(profiles(id, name, id_verified))
`;

export const useListRides = (
  params: { contextType?: string; contextId?: number; prayerName?: string; eventId?: number },
  options?: { query?: Record<string, unknown> }
) =>
  useQuery({
    queryKey: getListRidesQueryKey(params),
    queryFn: async () => {
      let query = supabase.from("rides").select(RIDE_SELECT).order("departure_time", { ascending: true });

      if (params.contextType) query = query.eq("context_type", params.contextType);
      if (params.contextId) {
        if (params.contextType === "event") query = query.eq("event_id", params.contextId);
        else if (params.contextType === "masjid") query = query.eq("masjid_id", params.contextId);
        else if (params.contextType === "errand") query = query.eq("errand_id", params.contextId);
      }
      if (params.eventId) query = query.eq("event_id", params.eventId);
      if (params.prayerName) query = query.eq("prayer_name", params.prayerName);

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
      const { data, error } = await supabase.from("rides").select(RIDE_SELECT).eq("id", id).single();
      if (error) throw error;
      return normalizeRide(data);
    },
    ...options?.query,
  });

export const useGetRideLocation = (id: number, options?: { query?: Record<string, unknown> }) =>
  useQuery({
    queryKey: getGetRideLocationQueryKey(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select("status, current_lat, current_lng, destination_lat, destination_lng, eta_minutes, progress_percent")
        .eq("id", id)
        .single();
      if (error) throw error;
      if (!data.current_lat) return null;
      return {
        status: data.status,
        currentLat: data.current_lat,
        currentLng: data.current_lng,
        destinationLat: data.destination_lat,
        destinationLng: data.destination_lng,
        etaMinutes: data.eta_minutes ?? 0,
        progressPercent: data.progress_percent ?? 0,
      };
    },
    ...options?.query,
  });

export const useCreateRide = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { data: Record<string, unknown> }) => {
      const userId = await getCurrentUserId();
      const data = vars.data as any;
      const { data: createdRide, error } = await supabase
        .from("rides")
        .insert({
          context_type: data.contextType,
          event_id: data.contextType === "event" ? data.contextId : null,
          masjid_id: data.contextType === "masjid" ? data.contextId : null,
          errand_id: data.contextType === "errand" ? data.contextId : null,
          prayer_name: data.prayerName || null,
          driver_id: userId,
          departure_location: data.departureLocation,
          departure_time: data.departureTime,
          seats_total: data.seatsTotal,
          seats_available: data.seatsTotal,
          notes: data.notes || null,
          incentive_label: data.incentiveLabel || null,
          status: "scheduled",
        })
        .select()
        .single();
      if (error) throw { error: error.message };
      return { id: createdRide.id };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/rides"] }),
  });
};

export const useJoinRide = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { rideId: number }) => {
      const userId = await getCurrentUserId();
      const { error: joinError } = await supabase.from("ride_participants").insert({ ride_id: vars.rideId, user_id: userId });
      if (joinError) throw { error: joinError.message };
      const { error: seatError } = await supabase.rpc("decrement_seat", { ride_id: vars.rideId });
      if (seatError) throw { error: seatError.message };
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: getGetRideQueryKey(vars.rideId) }),
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
      const { error: seatError } = await supabase.rpc("increment_seat", { ride_id: vars.rideId });
      if (seatError) throw { error: seatError.message };
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: getGetRideQueryKey(vars.rideId) }),
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

export const useStartRide = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { rideId: number }) => {
      const { error } = await supabase.from("rides").update({ status: "in_progress" }).eq("id", vars.rideId);
      if (error) throw { error: error.message };
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: getGetRideQueryKey(vars.rideId) }),
  });
};

export const useCompleteRide = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { rideId: number }) => {
      const { error } = await supabase
        .from("rides")
        .update({ status: "completed", progress_percent: 100 })
        .eq("id", vars.rideId);
      if (error) throw { error: error.message };
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: getGetRideQueryKey(vars.rideId) }),
  });
};

export const useGetMyRides = () =>
  useQuery({
    queryKey: getGetMyRidesQueryKey(),
    queryFn: async () => {
      const userId = await getCurrentUserId();
      const [drivingRes, participantRes] = await Promise.all([
        supabase.from("rides").select(RIDE_SELECT).eq("driver_id", userId).order("departure_time", { ascending: true }),
        supabase.from("ride_participants").select(`ride:rides(${RIDE_SELECT})`).eq("user_id", userId),
      ]);
      if (drivingRes.error) throw drivingRes.error;
      if (participantRes.error) throw participantRes.error;
      return {
        drivingRides: drivingRes.data.map(normalizeRide),
        passengerRides: participantRes.data.map((participant: any) => participant.ride).filter(Boolean).map(normalizeRide),
      };
    },
  });

export const useListRideRequests = (
  params: { contextType?: string; contextId?: number; prayerName?: string },
  options?: { query?: Record<string, unknown> }
) =>
  useQuery({
    queryKey: ["/ride-requests", params],
    queryFn: async () => {
      let query = supabase
        .from("ride_requests")
        .select("*, requester:profiles!requester_id(id, name, id_verified)")
        .order("desired_time", { ascending: true });

      if (params.contextType) query = query.eq("context_type", params.contextType);
      if (params.contextId) {
        if (params.contextType === "event") query = query.eq("event_id", params.contextId);
        else if (params.contextType === "masjid") query = query.eq("masjid_id", params.contextId);
        else if (params.contextType === "errand") query = query.eq("errand_id", params.contextId);
      }
      if (params.prayerName) query = query.eq("prayer_name", params.prayerName);

      const { data, error } = await query;
      if (error) throw error;
      return data.map(normalizeRideRequest);
    },
    ...options?.query,
  });

export const useCreateRideRequest = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { data: Record<string, unknown> }) => {
      const userId = await getCurrentUserId();
      const data = vars.data as any;
      const { error } = await supabase.from("ride_requests").insert({
        context_type: data.contextType,
        event_id: data.contextType === "event" ? data.contextId : null,
        masjid_id: data.contextType === "masjid" ? data.contextId : null,
        errand_id: data.contextType === "errand" ? data.contextId : null,
        prayer_name: data.prayerName || null,
        requester_id: userId,
        pickup_location: data.pickupLocation,
        desired_time: data.desiredTime,
        notes: data.notes || null,
      });
      if (error) throw { error: error.message };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/ride-requests"] }),
  });
};

export const useGetMyRequests = () =>
  useQuery({
    queryKey: ["/ride-requests/my"],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase
        .from("ride_requests")
        .select("*")
        .eq("requester_id", userId)
        .order("desired_time", { ascending: true });
      if (error) throw error;
      return data.map(normalizeRideRequest);
    },
  });
