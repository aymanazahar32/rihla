import { supabase } from "@/lib/supabase";
import type { ParsedIntent } from "@/lib/NLPrefillContext";

export interface ParseResult {
  parsed: Omit<ParsedIntent, "contextId">;
  contextHint: string | null;
}

export async function parseRideIntent(text: string): Promise<ParseResult> {
  const { data, error } = await supabase.functions.invoke("parse-ride-intent", {
    body: { text },
  });

  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);

  const input = data.result as Record<string, unknown>;
  const contextHint = (input.contextHint as string) ?? null;

  const parsed: Omit<ParsedIntent, "contextId"> = {
    intent: (() => {
      const v = input.intent as "offer" | "request" | undefined;
      if (!v) throw new Error("parse_ride_intent: missing required field 'intent'");
      return v;
    })(),
    contextType: input.contextType as "masjid" | "event" | "errand" | undefined,
    prayerName: input.prayerName as string | undefined,
    departureLocation: input.departureLocation as string | undefined,
    departureTimeISO: input.departureTimeISO as string | undefined,
    seats: input.seats as number | undefined,
    pickupLocation: input.pickupLocation as string | undefined,
    desiredTimeISO: input.desiredTimeISO as string | undefined,
    notes: input.notes as string | undefined,
    confidence: (input.confidence as Record<string, number>) ?? {},
  };

  return { parsed, contextHint };
}
