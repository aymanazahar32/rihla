import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useListErrands, useListEvents, useListMasjids } from "@/lib/api-client";
import { useNLPrefill } from "@/lib/NLPrefillContext";
import { parseRideIntent } from "@/lib/parse-ride-intent";

export function useNLParser() {
  const [, setLocation] = useLocation();
  const { setPrefill } = useNLPrefill();
  const { data: masjids = [] } = useListMasjids();
  const { data: events = [] } = useListEvents();
  const { data: errands = [] } = useListErrands();

  const [nlText, setNlText] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [nlError, setNlError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const resolveContext = (
    contextType: "masjid" | "event" | "errand" | undefined,
    hint: string | null,
  ): number | undefined => {
    if (!contextType || !hint) return undefined;
    const hWords = hint.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const score = (name: string) => {
      const n = name.toLowerCase();
      if (n === hint.toLowerCase()) return 3;
      if (n.includes(hint.toLowerCase()) || hint.toLowerCase().includes(n)) return 2;
      const matched = hWords.filter((w) => n.includes(w));
      return matched.length / Math.max(hWords.length, 1);
    };
    const pick = (items: any[], nameKey: string) => {
      const scored = items.map((item) => ({ item, s: score(item[nameKey] ?? "") }));
      scored.sort((a, b) => b.s - a.s);
      return scored[0]?.s > 0 ? scored[0].item : undefined;
    };
    if (contextType === "masjid") return pick(masjids as any[], "name")?.id;
    if (contextType === "event") return pick(events as any[], "name")?.id;
    if (contextType === "errand") return pick(errands as any[], "title")?.id;
    return undefined;
  };

  const handleNLSubmit = async (onSuccess?: (() => void) | unknown) => {
    recognitionRef.current?.abort();
    setIsListening(false);
    if (!nlText.trim()) return;
    setNlLoading(true);
    setNlError(null);
    try {
      const { parsed, contextHint } = await parseRideIntent(nlText.trim());
      const contextId = resolveContext(parsed.contextType, contextHint);
      setPrefill({ ...parsed, contextId });

      const params = new URLSearchParams();
      params.set("intent", parsed.intent);
      if (parsed.contextType) params.set("contextType", parsed.contextType);
      if (contextId) params.set("contextId", String(contextId));
      if (parsed.prayerName) params.set("prayerName", parsed.prayerName);
      const timeISO =
        parsed.intent === "offer" ? parsed.departureTimeISO : parsed.desiredTimeISO;
      if (timeISO) params.set("timeISO", timeISO);

      if (typeof onSuccess === "function") onSuccess();

      if (contextId) {
        setLocation(`/match?${params.toString()}`);
      } else {
        const path = parsed.intent === "offer" ? "/rides/new" : "/requests/new";
        setLocation(`${path}?${params.toString()}`);
      }
    } catch (err) {
      console.error("[parseRideIntent]", err);
      setNlError("Couldn't parse that — try rephrasing.");
    } finally {
      setNlLoading(false);
    }
  };

  const toggleMic = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
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
      setNlText(event.results[0][0].transcript);
      setIsListening(false);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  };

  return {
    nlText,
    setNlText,
    nlLoading,
    nlError,
    setNlError,
    isListening,
    toggleMic,
    handleNLSubmit,
  };
}
