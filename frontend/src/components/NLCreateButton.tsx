import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Mic, MicOff, Sparkles, X } from "lucide-react";
import { useNLParser } from "@/lib/useNLParser";

export function NLCreateButton() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { nlText, setNlText, nlLoading, nlError, setNlError, isListening, toggleMic, handleNLSubmit } =
    useNLParser();

  const closeOverlay = () => {
    if (isListening) toggleMic();
    setNlText("");
    setNlError(null);
    setIsOpen(false);
  };

  // Hidden on home page — it already has the inline NL bar
  if (location === "/") return null;

  return (
    <>
      {/* Floating pill — shown when overlay is closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Sparkles className="w-4 h-4" />
          Ask AI
        </button>
      )}

      {/* Full-screen overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeOverlay();
          }}
        >
          <div className="w-full max-w-md bg-card rounded-2xl shadow-xl ring-1 ring-border/50 p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Where are you headed?</h2>
              <button
                onClick={() => closeOverlay()}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Input bar */}
            <div className="flex items-center gap-2 rounded-2xl bg-muted/50 ring-1 ring-border/50 px-4 py-3 focus-within:ring-primary/50 transition-shadow">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <input
                autoFocus
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="e.g. Going to Jumu'ah from UTA, 3 seats"
                value={nlText}
                onChange={(e) => {
                  setNlText(e.target.value);
                  if (nlError) setNlError(null);
                }}
                onKeyDown={(e) =>
                  e.key === "Enter" && handleNLSubmit(() => setIsOpen(false))
                }
                disabled={nlLoading}
              />
              <button
                onClick={toggleMic}
                disabled={nlLoading}
                className={`shrink-0 p-1.5 rounded-xl transition-colors disabled:opacity-40 ${
                  isListening
                    ? "text-red-500 bg-red-500/10"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                type="button"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                onClick={() => handleNLSubmit(() => setIsOpen(false))}
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
        </div>
      )}
    </>
  );
}
