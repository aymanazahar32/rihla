import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

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

export interface NLPrefillCtx {
  prefill: ParsedIntent | null;
  setPrefill: (p: ParsedIntent | null) => void;
  consume: () => ParsedIntent | null;
}

const Ctx = createContext<NLPrefillCtx | null>(null);

export function NLPrefillProvider({ children }: { children: ReactNode }) {
  const [prefill, setPrefill] = useState<ParsedIntent | null>(null);

  const consume = useCallback((): ParsedIntent | null => {
    let snapshot: ParsedIntent | null = null;
    setPrefill((current) => {
      snapshot = current;
      return null;
    });
    return snapshot;
  }, []);

  return <Ctx.Provider value={{ prefill, setPrefill, consume }}>{children}</Ctx.Provider>;
}

export function useNLPrefill() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNLPrefill must be used inside NLPrefillProvider");
  return ctx;
}
