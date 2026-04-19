import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { maySeePersonByGender } from "@/lib/gender-visibility";

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
    masjidId: r.masjid_id,
    errandId: r.errand_id,
    contextType: r.context_type,
    prayerName: r.prayer_name,
    driverId: r.driver_id,
    departureLocation: r.departure_location,
    departureTime: r.departure_time,
    seatsTotal: r.seats_total,
    seatsAvailable: r.seats_available,
    notes: r.notes,
    incentiveLabel: r.incentive_label,
    status: r.status ?? "scheduled",
    currentLat: r.current_lat,
    currentLng: r.current_lng,
    destinationLat: r.destination_lat,
    destinationLng: r.destination_lng,
    etaMinutes: r.eta_minutes,
    progressPercent: r.progress_percent,
    createdAt: r.created_at,
    driver: r.driver
      ? {
          id: r.driver.id,
          name: r.driver.name,
          gender: r.driver.gender ?? null,
          idVerified: r.driver.id_verified,
          carMake: r.driver.car_make,
          carModel: r.driver.car_model,
          carColor: r.driver.car_color,
          createdAt: r.driver.created_at,
        }
      : undefined,
    event: r.event
      ? { id: r.event.id, name: r.event.name, location: r.event.location, dateTime: r.event.date_time }
      : undefined,
    masjid: r.masjid ? { id: r.masjid.id, name: r.masjid.name } : undefined,
    errand: r.errand ? { id: r.errand.id, title: r.errand.title } : undefined,
    passengers: (r.ride_participants ?? []).map((p: any) => ({
      id: p.profiles.id,
      name: p.profiles.name,
      gender: p.profiles.gender ?? null,
      idVerified: p.profiles.id_verified,
    })),
  };
}

function normalizeMasjid(m: any) {
  return {
    id: m.id,
    name: m.name,
    address: m.address,
    description: m.description,
    imageUrl: m.image_url,
    fajr: m.fajr,
    dhuhr: m.dhuhr,
    asr: m.asr,
    maghrib: m.maghrib,
    isha: m.isha,
    jumuah: m.jumuah,
  };
}

function normalizeErrand(e: any) {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    category: e.category,
    location: e.location,
    scheduledTime: e.scheduled_time,
  };
}

function normalizeRideRequest(rr: any) {
  return {
    id: rr.id,
    requesterId: rr.requester_id as string | undefined,
    contextType: rr.context_type,
    prayerName: rr.prayer_name,
    pickupLocation: rr.pickup_location,
    desiredTime: rr.desired_time,
    notes: rr.notes,
    requester: rr.requester
      ? {
          id: rr.requester.id,
          name: rr.requester.name,
          gender: rr.requester.gender ?? null,
          idVerified: rr.requester.id_verified,
        }
      : undefined,
  };
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const getGetMeQueryKey = () => ["/auth/me"] as const;
export const getGetEventQueryKey = (id: number) => ["/events", id] as const;
export const getGetEventSummaryQueryKey = (id: number) => ["/events", id, "summary"] as const;
export const getListRidesQueryKey = (params?: object) => ["/rides", params] as const;
export const getGetRideQueryKey = (id: number) => ["/rides", id] as const;
export const getGetMyRidesQueryKey = () => ["/rides/my"] as const;
export const getListBookableRidesQueryKey = () => ["/rides/bookable"] as const;
export const getRideMessagesQueryKey = (rideId: number) => ["/rides", rideId, "messages"] as const;
export const getRideRequestMessagesQueryKey = (rideRequestId: number) => ["/ride-requests", rideRequestId, "messages"] as const;
export const getGetRideLocationQueryKey = (id: number) => ["/rides", id, "location"] as const;

// ── Auth ──────────────────────────────────────────────────────────────────────

export const useGetMe = () =>
  useQuery({
    queryKey: getGetMeQueryKey(),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "name, user_type, id_verified, driver_history_checked, profile_completed, car_make, car_model, car_color, gender, age, university, student_id_number, license_plate, vin_number, drivers_license_number, organization_name"
        )
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
        gender: profile?.gender ?? null,
        age: profile?.age ?? null,
        university: profile?.university ?? null,
        studentIdNumber: profile?.student_id_number ?? null,
        licensePlate: profile?.license_plate ?? null,
        vinNumber: profile?.vin_number ?? null,
        driversLicenseNumber: profile?.drivers_license_number ?? null,
        organizationName: profile?.organization_name ?? null,
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
  useMutation({ mutationFn: () => supabase.auth.signOut() });

/** Only fully verified drivers may publish rides in the app. */
export function canUserOfferRides(user: { userType: string | null; idVerified: boolean; driverHistoryChecked: boolean } | undefined | null) {
  return user?.userType === "driver" && !!user.idVerified && !!user.driverHistoryChecked;
}

/** Organization accounts can create campus/community events. */
export function isOrganizationUser(user: { userType: string | null } | undefined | null) {
  return user?.userType === "organization";
}

// ── Profile setup ─────────────────────────────────────────────────────────────

export const useSetupRiderProfile = () =>
  useMutation({
    mutationFn: async (vars: { data: { gender: string; age: number; university: string; studentIdNumber: string } }) => {
      const userId = await getCurrentUserId();
      const d = vars.data;
      const { error } = await supabase.from("profiles").update({
        user_type: "rider",
        gender: d.gender,
        age: d.age,
        university: d.university,
        student_id_number: d.studentIdNumber,
      }).eq("id", userId);
      if (error) throw { error: error.message };
    },
  });

export const useSetupDriverProfile = () =>
  useMutation({
    mutationFn: async (vars: { data: { gender: string; age: number; university: string; studentIdNumber: string; licensePlate: string; vinNumber: string; driversLicenseNumber: string; carMake: string; carModel: string; carColor: string } }) => {
      const userId = await getCurrentUserId();
      const d = vars.data;
      const { error } = await supabase.from("profiles").update({
        user_type: "driver",
        gender: d.gender,
        age: d.age,
        university: d.university,
        student_id_number: d.studentIdNumber,
        license_plate: d.licensePlate,
        vin_number: d.vinNumber,
        drivers_license_number: d.driversLicenseNumber,
        car_make: d.carMake,
        car_model: d.carModel,
        car_color: d.carColor,
      }).eq("id", userId);
      if (error) throw { error: error.message };
    },
  });

export const useSetupOrgProfile = () =>
  useMutation({
    mutationFn: async (vars: { data: { organizationName: string } }) => {
      const userId = await getCurrentUserId();
      const { error } = await supabase.from("profiles").update({
        user_type: "organization",
        organization_name: vars.data.organizationName,
        profile_completed: true,
      }).eq("id", userId);
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
      const { error } = await supabase.from("profiles").update({ driver_history_checked: true }).eq("id", userId);
      if (error) throw { error: error.message };
    },
  });

export const useUpdateMyProfile = () =>
  useMutation({
    mutationFn: async (vars: {
      data: {
        name?: string;
        gender?: string;
        age?: number;
        university?: string;
        studentIdNumber?: string;
        organizationName?: string;
      };
    }) => {
      const userId = await getCurrentUserId();
      const d = vars.data;
      const row: Record<string, unknown> = {};
      if (d.name !== undefined) row.name = d.name;
      if (d.gender !== undefined) row.gender = d.gender;
      if (d.age !== undefined) row.age = d.age;
      if (d.university !== undefined) row.university = d.university;
      if (d.studentIdNumber !== undefined) row.student_id_number = d.studentIdNumber;
      if (d.organizationName !== undefined) row.organization_name = d.organizationName;
      const { error } = await supabase.from("profiles").update(row).eq("id", userId);
      if (error) throw { error: error.message };
    },
  });

/** Update driver-only fields (same columns as registration driver flow). Optionally clears driver check. */
export const useSaveDriverProfileDetails = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      data: {
        gender: string;
        age: number;
        university: string;
        studentIdNumber: string;
        licensePlate: string;
        vinNumber: string;
        driversLicenseNumber: string;
        carMake: string;
        carModel: string;
        carColor: string;
      };
      clearDriverCheck?: boolean;
    }) => {
      const userId = await getCurrentUserId();
      const d = vars.data;
      const row: Record<string, unknown> = {
        user_type: "driver",
        gender: d.gender,
        age: d.age,
        university: d.university,
        student_id_number: d.studentIdNumber,
        license_plate: d.licensePlate,
        vin_number: d.vinNumber,
        drivers_license_number: d.driversLicenseNumber,
        car_make: d.carMake,
        car_model: d.carModel,
        car_color: d.carColor,
      };
      if (vars.clearDriverCheck) row.driver_history_checked = false;
      const { error } = await supabase.from("profiles").update(row).eq("id", userId);
      if (error) throw { error: error.message };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: getGetMeQueryKey() }),
  });
};

export const useCompleteProfile = () =>
  useMutation({
    mutationFn: async () => {
      const userId = await getCurrentUserId();
      const { error } = await supabase.from("profiles").update({ profile_completed: true }).eq("id", userId);
      if (error) throw { error: error.message };
    },
  });

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
      const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
      if (error) throw error;
      return normalizeEvent(data);
    },
    ...options?.query,
  });

export const useCreateEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      name: string;
      location: string;
      dateTime: string;
      category?: string;
      description?: string;
    }) => {
      const userId = await getCurrentUserId();
      const { data: prof, error: perr } = await supabase.from("profiles").select("user_type").eq("id", userId).single();
      if (perr) throw { error: perr.message };
      if (prof?.user_type !== "organization") throw { error: "Only organization accounts can create events." };
      const { data, error } = await supabase
        .from("events")
        .insert({
          name: vars.name.trim(),
          location: vars.location.trim(),
          date_time: vars.dateTime,
          category: (vars.category ?? "General").trim() || "General",
          description: vars.description?.trim() || null,
          created_by: userId,
        })
        .select()
        .single();
      if (error) throw { error: error.message };
      return normalizeEvent(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/events"] }),
  });
};

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
      const ridesWithSpace = rides.filter((r) => r.seats_available > 0).length;
      const totalPassengers = rides.reduce((sum, r) => sum + (r.seats_total - r.seats_available), 0);
      return { totalRides, availableSeats, ridesWithSpace, totalPassengers };
    },
    ...options?.query,
  });

// ── Masjids ───────────────────────────────────────────────────────────────────

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

// ── Errands ───────────────────────────────────────────────────────────────────

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

// ── Rides ─────────────────────────────────────────────────────────────────────

const RIDE_SELECT = `
  *,
  driver:profiles!driver_id(id, name, gender, id_verified, car_make, car_model, car_color, created_at),
  event:events(id, name, location, date_time),
  masjid:masjids(id, name),
  errand:errands(id, title),
  ride_participants(profiles(id, name, gender, id_verified))
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

export const useListBookableRides = (options?: { query?: Record<string, unknown> }) =>
  useQuery({
    queryKey: getListBookableRidesQueryKey(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select(RIDE_SELECT)
        .eq("status", "scheduled")
        .gt("seats_available", 0)
        .order("departure_time", { ascending: true });
      if (error) throw error;
      return data.map(normalizeRide);
    },
    ...options?.query,
  });

function normalizeRideMessage(m: any) {
  return {
    id: m.id,
    rideId: m.ride_id,
    senderId: m.sender_id,
    body: m.body,
    createdAt: m.created_at,
  };
}

export const useRideMessages = (rideId: number, options?: { query?: Record<string, unknown> }) =>
  useQuery({
    queryKey: getRideMessagesQueryKey(rideId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ride_messages")
        .select("id, ride_id, sender_id, body, created_at")
        .eq("ride_id", rideId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(normalizeRideMessage);
    },
    ...options?.query,
  });

export const useSendRideMessage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { rideId: number; body: string }) => {
      const userId = await getCurrentUserId();
      const text = vars.body.trim();
      if (!text) throw { error: "Message is empty" };
      const { data, error } = await supabase
        .from("ride_messages")
        .insert({
          ride_id: vars.rideId,
          sender_id: userId,
          body: text,
        })
        .select("id, ride_id, sender_id, body, created_at")
        .single();
      if (error) throw { error: error.message };
      return normalizeRideMessage(data);
    },
    onSuccess: (msg, vars) => {
      qc.setQueryData(getRideMessagesQueryKey(vars.rideId), (old: ReturnType<typeof normalizeRideMessage>[] | undefined) => {
        const list = old ?? [];
        if (list.some((m) => m.id === msg.id)) return list;
        return [...list, msg].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
      qc.invalidateQueries({ queryKey: getRideMessagesQueryKey(vars.rideId) });
    },
  });
};

function normalizeRideRequestMessage(m: any) {
  return {
    id: m.id,
    rideRequestId: m.ride_request_id,
    senderId: m.sender_id,
    body: m.body,
    createdAt: m.created_at,
  };
}

export const useRideRequestMessages = (rideRequestId: number, options?: { query?: Record<string, unknown> }) =>
  useQuery({
    queryKey: getRideRequestMessagesQueryKey(rideRequestId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ride_request_messages")
        .select("id, ride_request_id, sender_id, body, created_at")
        .eq("ride_request_id", rideRequestId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(normalizeRideRequestMessage);
    },
    ...options?.query,
  });

export const useSendRideRequestMessage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { rideRequestId: number; body: string }) => {
      const userId = await getCurrentUserId();
      const text = vars.body.trim();
      if (!text) throw { error: "Message is empty" };
      const { data, error } = await supabase
        .from("ride_request_messages")
        .insert({
          ride_request_id: vars.rideRequestId,
          sender_id: userId,
          body: text,
        })
        .select("id, ride_request_id, sender_id, body, created_at")
        .single();
      if (error) throw { error: error.message };
      return normalizeRideRequestMessage(data);
    },
    onSuccess: (msg, vars) => {
      qc.setQueryData(getRideRequestMessagesQueryKey(vars.rideRequestId), (old: ReturnType<typeof normalizeRideRequestMessage>[] | undefined) => {
        const list = old ?? [];
        if (list.some((m) => m.id === msg.id)) return list;
        return [...list, msg].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
      qc.invalidateQueries({ queryKey: getRideRequestMessagesQueryKey(vars.rideRequestId) });
      qc.invalidateQueries({ queryKey: ["/ride-requests"] });
    },
  });
};

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
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("user_type, id_verified, driver_history_checked")
        .eq("id", userId)
        .single();
      if (profErr) throw { error: profErr.message };
      if (prof?.user_type !== "driver" || !prof.id_verified || !prof.driver_history_checked) {
        throw { error: "Only verified drivers can offer rides. Complete driver verification in your profile." };
      }
      const d = vars.data as any;
      const { data, error } = await supabase
        .from("rides")
        .insert({
          context_type: d.contextType,
          event_id: d.contextType === "event" ? d.contextId : null,
          masjid_id: d.contextType === "masjid" ? d.contextId : null,
          errand_id: d.contextType === "errand" ? d.contextId : null,
          prayer_name: d.prayerName || null,
          driver_id: userId,
          departure_location: d.departureLocation,
          departure_time: d.departureTime,
          seats_total: d.seatsTotal,
          seats_available: d.seatsTotal,
          notes: d.notes || null,
          incentive_label: d.incentiveLabel || null,
          status: "scheduled",
        })
        .select()
        .single();
      if (error) throw { error: error.message };
      return { id: data.id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/rides"] });
      qc.invalidateQueries({ queryKey: getListBookableRidesQueryKey() });
    },
  });
};

export const useJoinRide = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { rideId: number }) => {
      const userId = await getCurrentUserId();
      const { data: ride, error: rideErr } = await supabase
        .from("rides")
        .select("driver_id, driver:profiles!driver_id(gender)")
        .eq("id", vars.rideId)
        .single();
      if (rideErr) throw { error: rideErr.message };
      if (ride?.driver_id === userId) throw { error: "You can’t book a seat on your own ride." };
      const { data: prof, error: profErr } = await supabase.from("profiles").select("gender, user_type").eq("id", userId).single();
      if (profErr) throw { error: profErr.message };
      const driverGender = (ride as { driver?: { gender?: string | null } }).driver?.gender ?? null;
      const viewer = { id: userId, gender: prof?.gender ?? null, userType: prof?.user_type ?? null };
      if (!maySeePersonByGender(viewer, driverGender)) {
        throw { error: "Same-gender rides only — this driver’s offer isn’t available to your account." };
      }
      const { error: joinError } = await supabase
        .from("ride_participants")
        .insert({ ride_id: vars.rideId, user_id: userId });
      if (joinError) throw { error: joinError.message };
      const { error: seatError } = await supabase.rpc("decrement_seat", { ride_id: vars.rideId });
      if (seatError) throw { error: seatError.message };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: getGetRideQueryKey(vars.rideId) });
      qc.invalidateQueries({ queryKey: getListBookableRidesQueryKey() });
      qc.invalidateQueries({ queryKey: getGetMyRidesQueryKey() });
      qc.invalidateQueries({ queryKey: getRideMessagesQueryKey(vars.rideId) });
    },
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
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: getGetRideQueryKey(vars.rideId) });
      qc.invalidateQueries({ queryKey: getListBookableRidesQueryKey() });
      qc.invalidateQueries({ queryKey: getGetMyRidesQueryKey() });
    },
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
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: getGetRideQueryKey(vars.rideId) }),
  });
};

export const useCompleteRide = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { rideId: number }) => {
      const { error } = await supabase.from("rides").update({ status: "completed", progress_percent: 100 }).eq("id", vars.rideId);
      if (error) throw { error: error.message };
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: getGetRideQueryKey(vars.rideId) }),
  });
};

export const useGetMyRides = () =>
  useQuery({
    queryKey: getGetMyRidesQueryKey(),
    queryFn: async () => {
      const userId = await getCurrentUserId();
      const [drivingRes, participantRes] = await Promise.all([
        supabase
          .from("rides")
          .select(RIDE_SELECT)
          .eq("driver_id", userId)
          .order("departure_time", { ascending: true }),
        supabase
          .from("ride_participants")
          .select(`ride:rides(${RIDE_SELECT})`)
          .eq("user_id", userId),
      ]);
      if (drivingRes.error) throw drivingRes.error;
      if (participantRes.error) throw participantRes.error;
      return {
        drivingRides: drivingRes.data.map(normalizeRide),
        passengerRides: participantRes.data.map((p: any) => p.ride).filter(Boolean).map(normalizeRide),
      };
    },
  });

// ── Ride requests ─────────────────────────────────────────────────────────────

export const useListRideRequests = (
  params: { contextType?: string; contextId?: number; prayerName?: string },
  options?: { query?: Record<string, unknown> }
) =>
  useQuery({
    queryKey: ["/ride-requests", params],
    queryFn: async () => {
      let query = supabase
        .from("ride_requests")
        .select("*, requester:profiles!requester_id(id, name, gender, id_verified)")
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
      const d = vars.data as any;
      const { error } = await supabase.from("ride_requests").insert({
        context_type: d.contextType,
        event_id: d.contextType === "event" ? d.contextId : null,
        masjid_id: d.contextType === "masjid" ? d.contextId : null,
        errand_id: d.contextType === "errand" ? d.contextId : null,
        prayer_name: d.prayerName || null,
        requester_id: userId,
        pickup_location: d.pickupLocation,
        desired_time: d.desiredTime,
        notes: d.notes || null,
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
