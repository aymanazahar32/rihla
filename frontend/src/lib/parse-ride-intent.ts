import { anthropic } from "@/lib/anthropic";
import type { ParsedIntent } from "@/lib/NLPrefillContext";

const TOOL = {
  name: "parse_ride_intent",
  description: "Extract structured fields from a natural language ride offer or request.",
  input_schema: {
    type: "object" as const,
    properties: {
      intent: {
        type: "string",
        enum: ["offer", "request"],
        description: "'offer' if the user is offering to drive, 'request' if they need a ride.",
      },
      contextType: {
        type: "string",
        enum: ["masjid", "event", "errand"],
        description: "Category of the trip destination.",
      },
      contextHint: {
        type: "string",
        description: "Name of the destination, event, or masjid mentioned (e.g. 'ICA', 'halal dinner', 'Costco run').",
      },
      prayerName: {
        type: "string",
        description: "Prayer name if going to salah (e.g. 'Jumu\\'ah', 'Fajr', 'Maghrib').",
      },
      departureLocation: {
        type: "string",
        description: "Where the driver is leaving from. For offers only.",
      },
      departureTimeISO: {
        type: "string",
        description: "Departure time as ISO 8601 string resolved from today's date. For offers only.",
      },
      seats: {
        type: "number",
        description: "Number of seats the driver has available. For offers only.",
      },
      pickupLocation: {
        type: "string",
        description: "Where the rider needs to be picked up from. For requests only.",
      },
      desiredTimeISO: {
        type: "string",
        description: "Desired pickup time as ISO 8601 string. For requests only.",
      },
      notes: {
        type: "string",
        description: "Any extra information not captured by other fields.",
      },
      confidence: {
        type: "object",
        description: "Confidence score 0-1 for each extracted field.",
        properties: {
          contextType: { type: "number" },
          departureLocation: { type: "number" },
          departureTimeISO: { type: "number" },
          seats: { type: "number" },
          pickupLocation: { type: "number" },
          desiredTimeISO: { type: "number" },
        },
      },
    },
    required: ["intent"],
  },
} as const;

export interface ParseResult {
  parsed: Omit<ParsedIntent, "contextId">;
  contextHint: string | null;
}

export async function parseRideIntent(text: string): Promise<ParseResult> {
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const dayName = nowDate.toLocaleDateString("en-US", { weekday: "long" });

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: `You extract structured fields from ride-sharing messages for a Muslim community carpool app.
Today is ${dayName}, ${now}. Resolve relative dates like "this Friday" or "tomorrow" to absolute ISO 8601 datetimes.
Context types: 'masjid' (going to a mosque for prayer), 'event' (campus/MSA event), 'errand' (grocery run, airport, shopping).
If the user mentions Jumu'ah, Fajr, Dhuhr, Asr, Maghrib, or Isha, set contextType to 'masjid' and set prayerName accordingly.`,
    messages: [{ role: "user", content: text }],
    tools: [TOOL],
    tool_choice: { type: "any" },
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse) {
    throw new Error("Claude did not return structured output.");
  }

  const input = toolUse.input as Record<string, unknown>;
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
