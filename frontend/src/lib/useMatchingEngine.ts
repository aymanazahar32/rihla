import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { runMatchingForContext } from "@/lib/matching";

function extractContext(row: any): { contextType: string; contextId: number; prayerName?: string } | null {
  const contextType = row.context_type;
  const contextId = row.event_id ?? row.masjid_id ?? row.errand_id;
  if (!contextType || !contextId) return null;
  return { contextType, contextId, prayerName: row.prayer_name ?? undefined };
}

export function useMatchingEngine(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    // Trigger matching when a new ride is posted
    const ridesSub = supabase
      .channel("matching-rides")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "rides" }, (payload) => {
        const ctx = extractContext(payload.new);
        if (ctx) runMatchingForContext(ctx.contextType, ctx.contextId, ctx.prayerName);
      })
      .subscribe();

    // Trigger matching when a new ride request is posted
    const requestsSub = supabase
      .channel("matching-requests")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ride_requests" }, (payload) => {
        const ctx = extractContext(payload.new);
        if (ctx) runMatchingForContext(ctx.contextType, ctx.contextId, ctx.prayerName);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ridesSub);
      supabase.removeChannel(requestsSub);
    };
  }, [enabled]);
}
