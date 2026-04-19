import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

function notify(title: string, body: string, icon = "/icon-192.png") {
  if (Notification.permission !== "granted") return;
  new Notification(title, { body, icon, badge: "/icon-192.png" });
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  const result = await Notification.requestPermission();
  return result === "granted";
}

interface Options {
  userId: string | undefined;
  rideId?: number | null;          // active passenger ride (for driver location)
  userName?: string;
}

export function useRideNotifications({ userId, rideId, userName }: Options) {
  const lastStatusRef = useRef<string | null>(null);
  const notifiedArrivalRef = useRef(false);
  const notifiedMatchRef = useRef<Set<string>>(new Set());

  // 1. Match found — watch ride_matches inserts where request belongs to this user
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notif-matches-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ride_matches" },
        async (payload) => {
          const matchId = String(payload.new.id);
          if (notifiedMatchRef.current.has(matchId)) return;

          // Verify this match is for the current user's request
          const { data } = await supabase
            .from("ride_matches")
            .select("id, ride:rides(driver:profiles!driver_id(name))")
            .eq("id", payload.new.id)
            .single();

          if (!data) return;

          // Check request belongs to current user
          const { data: req } = await supabase
            .from("ride_requests")
            .select("id")
            .eq("id", payload.new.request_id)
            .eq("requester_id", userId)
            .maybeSingle();

          if (!req) return;

          notifiedMatchRef.current.add(matchId);
          const driverName = (data.ride as any)?.driver?.name ?? "A driver";
          notify("Match found! 🚗", `${driverName} is heading your way. Open Rihla to accept.`);
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [userId]);

  // 2. Driver arriving + ride status changes
  useEffect(() => {
    if (!rideId) return;

    const channel = supabase
      .channel(`notif-ride-${rideId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rides", filter: `id=eq.${rideId}` },
        (payload) => {
          const d = payload.new as any;

          // Status transition notifications
          if (d.status !== lastStatusRef.current) {
            lastStatusRef.current = d.status;
            if (d.status === "in_progress") {
              notify("You're on your way! 🎉", "Your driver has picked you up.");
              notifiedArrivalRef.current = false;
            } else if (d.status === "completed") {
              notify("Ride complete ✅", "How was your ride? Leave a rating in Rihla.");
            }
          }

          // Arriving proximity alert (< 300m, notify once)
          if (!notifiedArrivalRef.current && d.current_lat && d.current_lng && d.status !== "in_progress") {
            notify("Driver is almost here! 📍", "Your driver is less than 2 minutes away.");
            notifiedArrivalRef.current = true;
          }
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [rideId]);

  // 3. New chat message while app is in background
  useEffect(() => {
    if (!rideId || !userId) return;

    const channel = supabase
      .channel(`notif-chat-${rideId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ride_messages", filter: `ride_id=eq.${rideId}` },
        async (payload) => {
          const msg = payload.new as any;
          if (msg.sender_id === userId) return; // don't notify own messages
          if (document.visibilityState === "visible") return; // app is open

          const { data: sender } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", msg.sender_id)
            .single();

          notify(`${sender?.name ?? "Driver"} 💬`, msg.body);
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [rideId, userId]);
}
