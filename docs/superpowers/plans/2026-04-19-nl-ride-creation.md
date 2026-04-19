# NL Ride Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a natural-language input bar to the homepage that lets a user type (or speak) a sentence, calls Claude to parse intent and fields, and navigates to the pre-filled ride-create or request-create form.

**Architecture:** A React context (`NLPrefillContext`) carries parsed fields across navigation. `parse-ride-intent.ts` makes a single Claude `tool_use` call for structured output. The homepage input bar resolves context (masjid/event/errand ID) client-side from React Query cache before navigating.

**Tech Stack:** `@anthropic-ai/sdk ^0.90.0` (already installed), Web Speech API (browser-native), React Context, Wouter navigation, Tailwind/shadcn UI.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/.env` | Modify | Add `VITE_ANTHROPIC_API_KEY` |
| `src/lib/anthropic.ts` | Create | Anthropic client singleton |
| `src/lib/NLPrefillContext.tsx` | Create | Typed prefill state + provider + hook |
| `src/lib/parse-ride-intent.ts` | Create | Claude `tool_use` call → typed `ParsedIntent` |
| `src/App.tsx` | Modify | Wrap router with `NLPrefillProvider` |
| `src/pages/home.tsx` | Modify | Add NL input bar + mic + submit logic |
| `src/pages/ride-create.tsx` | Modify | Read prefill on mount, show AI banner |
| `src/pages/request-create.tsx` | Modify | Read prefill on mount, show AI banner |

---

## Task 1 — Anthropic client + API key

**Files:**
- Modify: `frontend/.env`
- Create: `src/lib/anthropic.ts`

- [ ] **Step 1: Add the API key to .env**

```
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

- [ ] **Step 2: Create the client singleton**

Create `nerds/frontend/src/lib/anthropic.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});
```

- [ ] **Step 3: Verify build still passes**

```bash
cd nerds/frontend && npm run build
```
Expected: `✓ built in` with no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/.env frontend/src/lib/anthropic.ts
git commit -m "feat: add Anthropic client singleton"
```

---

## Task 2 — NLPrefillContext

**Files:**
- Create: `src/lib/NLPrefillContext.tsx`

- [ ] **Step 1: Create the context**

Create `nerds/frontend/src/lib/NLPrefillContext.tsx`:

```typescript
import { createContext, useContext, useState, type ReactNode } from "react";

export interface ParsedIntent {
  intent: "offer" | "request";
  contextType?: "masjid" | "event" | "errand";
  contextId?: number;
  prayerName?: string;
  // offer fields
  departureLocation?: string;
  departureTimeISO?: string;
  seats?: number;
  // request fields
  pickupLocation?: string;
  desiredTimeISO?: string;
  // shared
  notes?: string;
  confidence: Record<string, number>;
}

interface NLPrefillCtx {
  prefill: ParsedIntent | null;
  setPrefill: (p: ParsedIntent | null) => void;
  consume: () => ParsedIntent | null;
}

const Ctx = createContext<NLPrefillCtx | null>(null);

export function NLPrefillProvider({ children }: { children: ReactNode }) {
  const [prefill, setPrefill] = useState<ParsedIntent | null>(null);

  const consume = (): ParsedIntent | null => {
    const p = prefill;
    setPrefill(null);
    return p;
  };

  return <Ctx.Provider value={{ prefill, setPrefill, consume }}>{children}</Ctx.Provider>;
}

export function useNLPrefill() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNLPrefill must be used inside NLPrefillProvider");
  return ctx;
}
```

- [ ] **Step 2: Wrap the app with the provider in App.tsx**

In `nerds/frontend/src/App.tsx`, add the import and wrap:

```typescript
// Add import at top
import { NLPrefillProvider } from "@/lib/NLPrefillContext";

// Wrap inside App(), around ModeProvider:
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NLPrefillProvider>
          <ModeProvider>
            <MatchingEngineMount />
            <Router />
            <Toaster />
          </ModeProvider>
        </NLPrefillProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 3: Build to confirm no errors**

```bash
cd nerds/frontend && npm run build
```
Expected: `✓ built in` with no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/NLPrefillContext.tsx frontend/src/App.tsx
git commit -m "feat: add NLPrefillContext for AI pre-fill state"
```

---

## Task 3 — parse-ride-intent (Claude tool_use call)

**Files:**
- Create: `src/lib/parse-ride-intent.ts`

- [ ] **Step 1: Create the parser**

Create `nerds/frontend/src/lib/parse-ride-intent.ts`:

```typescript
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
          departureTime: { type: "number" },
          seats: { type: "number" },
          pickupLocation: { type: "number" },
          desiredTime: { type: "number" },
        },
      },
    },
    required: ["intent"],
  },
} as const;

export async function parseRideIntent(text: string): Promise<{
  raw: ReturnType<typeof extractRaw>;
  contextHint: string | null;
}> {
  const now = new Date().toISOString();
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

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
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return structured output.");
  }

  const input = toolUse.input as Record<string, unknown>;
  const contextHint = (input.contextHint as string) ?? null;

  return { raw: extractRaw(input), contextHint };
}

function extractRaw(input: Record<string, unknown>) {
  return {
    intent: (input.intent as "offer" | "request") ?? "offer",
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
}
```

- [ ] **Step 2: Build to confirm no type errors**

```bash
cd nerds/frontend && npm run build
```
Expected: `✓ built in` with no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/parse-ride-intent.ts
git commit -m "feat: Claude tool_use parser for NL ride intent"
```

---

## Task 4 — NL input bar on homepage

**Files:**
- Modify: `src/pages/home.tsx`

- [ ] **Step 1: Add the NL bar between the toggle and map**

In `nerds/frontend/src/pages/home.tsx`, add these imports at the top:

```typescript
import { useRef as useRefNL, useState as useStateNL } from "react";
import { Sparkles, Mic, MicOff, ArrowRight } from "lucide-react";
import { parseRideIntent } from "@/lib/parse-ride-intent";
import { useNLPrefill } from "@/lib/NLPrefillContext";
import { useListEvents, useListErrands } from "@/lib/api-client";
```

Note: `useRef` and `useState` are already imported — rename the new ones is wrong. Just extend the existing import line:

```typescript
import { useEffect, useRef, useState } from "react";
```

Add these additional imports (Sparkles, Mic, MicOff, ArrowRight) to the existing lucide-react import line.

- [ ] **Step 2: Add hook calls and resolver logic inside the component**

Inside `HomePage()`, after the existing hooks, add:

```typescript
  const { setPrefill } = useNLPrefill();
  const { data: events = [] } = useListEvents({});
  const { data: errands = [] } = useListErrands({});

  const [nlText, setNlText] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [nlError, setNlError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const resolveContext = (
    contextType: "masjid" | "event" | "errand" | undefined,
    hint: string | null
  ): { contextId: number | undefined } => {
    if (!contextType || !hint) return { contextId: undefined };
    const h = hint.toLowerCase();
    if (contextType === "masjid") {
      const match = masjids.find((m) => m.name.toLowerCase().includes(h) || h.includes(m.name.toLowerCase()));
      return { contextId: match?.id };
    }
    if (contextType === "event") {
      const match = (events as any[]).find((e) => e.name.toLowerCase().includes(h) || h.includes(e.name.toLowerCase()));
      return { contextId: match?.id };
    }
    if (contextType === "errand") {
      const match = (errands as any[]).find((e) => e.title.toLowerCase().includes(h) || h.includes(e.title.toLowerCase()));
      return { contextId: match?.id };
    }
    return { contextId: undefined };
  };

  const handleNLSubmit = async () => {
    if (!nlText.trim()) return;
    setNlLoading(true);
    setNlError(null);
    try {
      const { raw, contextHint } = await parseRideIntent(nlText.trim());
      const { contextId } = resolveContext(raw.contextType, contextHint);
      const prefill = { ...raw, contextId };
      setPrefill(prefill);

      const params = new URLSearchParams();
      if (raw.contextType) params.set("contextType", raw.contextType);
      if (contextId) params.set("contextId", String(contextId));
      if (raw.prayerName) params.set("prayerName", raw.prayerName);

      const path = raw.intent === "offer" ? "/rides/new" : "/requests/new";
      setLocation(`${path}?${params.toString()}`);
    } catch (err: any) {
      setNlError("Couldn't parse that — try rephrasing.");
    } finally {
      setNlLoading(false);
    }
  };

  const toggleMic = () => {
    const SpeechRecognition = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setNlError("Speech recognition not supported in this browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setNlText(transcript);
      setIsListening(false);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  };
```

- [ ] **Step 3: Insert the UI element between the toggle and the map**

Find the `{/* Community Map */}` comment in `home.tsx` and insert this block directly above it:

```tsx
        {/* NL Input Bar */}
        <div className="flex-shrink-0 space-y-1.5">
          <div className="flex items-center gap-2 rounded-2xl bg-card ring-1 ring-border/50 px-4 py-3 shadow-sm focus-within:ring-primary/50 transition-shadow">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder={mode === "driving" ? 'e.g. "Going to Jumu\'ah at ICA, leaving UTA, 3 seats"' : 'e.g. "Need a ride to the MSA halal dinner Friday"'}
              value={nlText}
              onChange={(e) => setNlText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNLSubmit()}
              disabled={nlLoading}
            />
            <button
              onClick={toggleMic}
              className={`shrink-0 p-1.5 rounded-xl transition-colors ${isListening ? "text-red-500 bg-red-500/10" : "text-muted-foreground hover:text-foreground"}`}
              title={isListening ? "Stop listening" : "Speak"}
              type="button"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              onClick={handleNLSubmit}
              disabled={nlLoading || !nlText.trim()}
              className="shrink-0 p-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
              type="button"
            >
              {nlLoading ? (
                <span className="w-4 h-4 block border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </div>
          {nlError && <p className="text-xs text-destructive px-2">{nlError}</p>}
        </div>
```

- [ ] **Step 4: Build to confirm no errors**

```bash
cd nerds/frontend && npm run build
```
Expected: `✓ built in` with no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/home.tsx
git commit -m "feat: NL input bar on homepage with mic + AI submit"
```

---

## Task 5 — Pre-fill ride-create.tsx

**Files:**
- Modify: `src/pages/ride-create.tsx`

- [ ] **Step 1: Import the context and add pre-fill logic**

Add import at top of `ride-create.tsx`:

```typescript
import { useNLPrefill } from "@/lib/NLPrefillContext";
import { Sparkles } from "lucide-react";
```

- [ ] **Step 2: Add hook + useEffect inside RideCreatePage()**

After the existing `useState` declarations (after line `const [notes, setNotes] = useState("")`), add:

```typescript
  const { consume } = useNLPrefill();
  const [aiPrefilled, setAiPrefilled] = useState(false);
  const [lowConfidenceFields, setLowConfidenceFields] = useState<string[]>([]);

  // Consume NL prefill once on mount
  useEffect(() => {
    const p = consume();
    if (!p || p.intent !== "offer") return;
    if (p.departureLocation) setDepartureLocation(p.departureLocation);
    if (p.seats) setSeatsTotal(p.seats);
    if (p.notes) setNotes(p.notes);
    if (p.departureTimeISO) {
      // Convert ISO to datetime-local format (YYYY-MM-DDTHH:mm)
      const d = new Date(p.departureTimeISO);
      if (!isNaN(d.getTime())) {
        setDepartureTime(d.toISOString().slice(0, 16));
      }
    }
    const low = Object.entries(p.confidence)
      .filter(([, v]) => v < 0.75)
      .map(([k]) => k);
    setLowConfidenceFields(low);
    setAiPrefilled(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 3: Add the AI banner to the form JSX**

Inside the `<form>` element, directly before the first `<div className="space-y-2">` (Departure location), insert:

```tsx
              {aiPrefilled && (
                <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-sm text-primary font-medium">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  Auto-filled by AI
                  {lowConfidenceFields.length > 0 && (
                    <span className="ml-auto text-amber-600 text-xs font-normal">
                      Double-check: {lowConfidenceFields.join(", ")}
                    </span>
                  )}
                </div>
              )}
```

- [ ] **Step 4: Build**

```bash
cd nerds/frontend && npm run build
```
Expected: `✓ built in` with no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ride-create.tsx
git commit -m "feat: pre-fill ride-create from NL prefill context"
```

---

## Task 6 — Pre-fill request-create.tsx

**Files:**
- Modify: `src/pages/request-create.tsx`

- [ ] **Step 1: Import and add hook**

Add at top of `request-create.tsx`:

```typescript
import { useNLPrefill } from "@/lib/NLPrefillContext";
import { Sparkles } from "lucide-react";
```

- [ ] **Step 2: Add consume logic inside RequestCreatePage()**

After the existing `useState` declarations (after `const [notes, setNotes] = useState("")`), add:

```typescript
  const { consume } = useNLPrefill();
  const [aiPrefilled, setAiPrefilled] = useState(false);
  const [lowConfidenceFields, setLowConfidenceFields] = useState<string[]>([]);

  useEffect(() => {
    const p = consume();
    if (!p || p.intent !== "request") return;
    if (p.pickupLocation) setPickupLocation(p.pickupLocation);
    if (p.notes) setNotes(p.notes);
    if (p.desiredTimeISO) {
      const d = new Date(p.desiredTimeISO);
      if (!isNaN(d.getTime())) {
        setDesiredTime(d.toISOString().slice(0, 16));
      }
    }
    const low = Object.entries(p.confidence)
      .filter(([, v]) => v < 0.75)
      .map(([k]) => k);
    setLowConfidenceFields(low);
    setAiPrefilled(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 3: Add AI banner to the form**

Inside the `<form>` element, before the first `<div className="space-y-2">` (Pickup location), insert:

```tsx
              {aiPrefilled && (
                <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-sm text-primary font-medium">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  Auto-filled by AI
                  {lowConfidenceFields.length > 0 && (
                    <span className="ml-auto text-amber-600 text-xs font-normal">
                      Double-check: {lowConfidenceFields.join(", ")}
                    </span>
                  )}
                </div>
              )}
```

- [ ] **Step 4: Build**

```bash
cd nerds/frontend && npm run build
```
Expected: `✓ built in` with no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/request-create.tsx
git commit -m "feat: pre-fill request-create from NL prefill context"
```

---

## Verification (manual — no test runner in this project)

1. Start dev server: `cd nerds/frontend && npm run dev`
2. Log in as a verified driver
3. On homepage, type: `"Going to Jumu'ah at ICA this Friday around 12:30, leaving from UTA College Park, have 3 seats"`
4. Press Enter or click →
5. Should navigate to `/rides/new?contextType=masjid&prayerName=Jumu'ah` with:
   - Blue "Auto-filled by AI ✨" banner
   - Departure location field pre-filled with "UTA College Park"
   - Seats pre-filled as 3
   - Time pre-filled to Friday 12:30
6. Test mic: click 🎤, speak the same sentence, see transcript appear in the input
7. Log in as a rider, type: `"Need a ride to the MSA halal dinner Saturday"`, press Enter
8. Should navigate to `/requests/new?contextType=event` with AI banner
