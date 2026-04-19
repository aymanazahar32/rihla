import { useEffect, useRef, useState } from "react";
import { useRideRequestMessages, useSendRideRequestMessage } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";

type Props = {
  rideRequestId: number;
  currentUserId: string;
  requesterId: string;
  requesterName: string;
};

export function RequestMessageThread({ rideRequestId, currentUserId, requesterId, requesterName }: Props) {
  const { data: messages = [] } = useRideRequestMessages(rideRequestId, {
    query: { refetchInterval: 5000 },
  });
  const send = useSendRideRequestMessage();
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
      { rideRequestId, body: text },
      {
        onSuccess: () => setDraft(""),
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
    <Card className="border-0 ring-1 ring-amber-200/60 bg-amber-50/20 mt-3">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <MessageCircle className="w-4 h-4 text-amber-700" />
          <h4 className="text-sm font-semibold">Message about this request</h4>
        </div>
        <p className="text-[11px] text-muted-foreground mb-2">
          Verified drivers can offer a ride or ask details. The person who requested the ride can reply.
        </p>
        <div className="max-h-48 overflow-y-auto space-y-2 rounded-lg bg-background/80 p-2 mb-2 ring-1 ring-border/50">
          {messages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No messages yet.</p>
          ) : (
            messages.map((m) => {
              const mine = m.senderId === currentUserId;
              const label = mine ? "You" : m.senderId === requesterId ? requesterName : "Driver";
              const ts = m.createdAt ? parseISO(m.createdAt) : null;
              return (
                <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[90%] rounded-xl px-2.5 py-1.5 text-xs ${
                      mine ? "bg-primary text-primary-foreground" : "bg-muted ring-1 ring-border"
                    }`}
                  >
                    <div className="text-[10px] font-semibold opacity-80 mb-0.5">{label}</div>
                    {m.body}
                  </div>
                  {ts && isValid(ts) ? (
                    <span className="text-[10px] text-muted-foreground mt-0.5 px-1">{format(ts, "MMM d, h:mm a")}</span>
                  ) : null}
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message…"
            className="text-sm h-9"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <Button type="button" size="sm" className="rounded-full shrink-0" disabled={send.isPending || !draft.trim()} onClick={submit}>
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
