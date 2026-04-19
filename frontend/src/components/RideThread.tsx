import { useEffect, useRef, useState } from "react";
import { useRideMessages, useSendRideMessage } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";

type Props = {
  rideId: number;
  currentUserId: string;
  /** Map profile id → display name (driver + passengers + you) */
  nameByUserId: Record<string, string>;
  /** Driver, passengers, or anyone on a scheduled ride (pre-book questions) */
  canParticipate: boolean;
  /** Logged-in viewer has not booked yet — show extra hint */
  preJoinGuest?: boolean;
};

export function RideThread({ rideId, currentUserId, nameByUserId, canParticipate, preJoinGuest }: Props) {
  const { data: messages = [] } = useRideMessages(rideId, {
    query: { refetchInterval: 4000 },
  });
  const send = useSendRideMessage();
  const { toast } = useToast();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    send.mutate(
      { rideId, body: text },
      {
        onSuccess: () => {
          setDraft("");
        },
        onError: (e: unknown) => {
          const err = e as { error?: string; message?: string };
          toast({
            title: "Could not send",
            description: err?.error ?? err?.message ?? "Unknown error",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Card className="border-0 ring-1 ring-border/40">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Chat with the driver</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {preJoinGuest
            ? "Ask the driver a question before you book. After you join, you stay in this same thread."
            : "Ask pickup questions or coordinate details. Everyone on this ride can read the thread."}
        </p>
        <div className="max-h-64 overflow-y-auto space-y-2 rounded-xl bg-muted/40 p-3 mb-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No messages yet — say hello.</p>
          ) : (
            messages.map((m) => {
              const mine = m.senderId === currentUserId;
              const label = nameByUserId[m.senderId] ?? "Member";
              return (
                <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      mine ? "bg-primary text-primary-foreground" : "bg-background ring-1 ring-border"
                    }`}
                  >
                    <div className="text-[10px] font-semibold opacity-80 mb-0.5">{label}</div>
                    {m.body}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                    {(() => {
                      const ts = m.createdAt ? parseISO(m.createdAt) : null;
                      return ts && isValid(ts) ? format(ts, "MMM d, h:mm a") : "";
                    })()}
                  </span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
        {canParticipate ? (
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a message…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <Button type="button" className="rounded-full shrink-0" disabled={send.isPending || !draft.trim()} onClick={submit}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Book a seat on this ride to message the group.</p>
        )}
      </CardContent>
    </Card>
  );
}
