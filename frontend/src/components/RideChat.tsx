import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Send, X, ChevronDown } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: number;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
}

interface Props {
  rideId: number;
  currentUserId: string;
  currentUserName: string;
}

function initials(n: string) {
  return n.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
}

export function RideChat({ rideId, currentUserId, currentUserName }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load history + subscribe to new messages
  useEffect(() => {
    let cancelled = false;

    supabase
      .from("ride_messages")
      .select("id, sender_id, body, created_at, sender:profiles!sender_id(name)")
      .eq("ride_id", rideId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled || !data) return;
        setMessages(data.map(normalize));
      });

    const channel = supabase
      .channel(`chat-${rideId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ride_messages", filter: `ride_id=eq.${rideId}` },
        (payload) => {
          const raw = payload.new as any;
          supabase
            .from("profiles")
            .select("name")
            .eq("id", raw.sender_id)
            .single()
            .then(({ data: p }) => {
              if (cancelled) return;
              const msg: Message = {
                id: raw.id,
                senderId: raw.sender_id,
                senderName: p?.name ?? "Unknown",
                body: raw.body,
                createdAt: raw.created_at,
              };
              setMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                return [...prev, msg];
              });
              setUnread((n) => n + 1);
            });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [rideId]);

  // Scroll to bottom when chat opens or new message arrives
  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages.length]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft("");
    await supabase.from("ride_messages").insert({ ride_id: rideId, sender_id: currentUserId, body });
    setSending(false);
  }

  return (
    <>
      {/* Floating chat button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="relative flex items-center justify-center w-11 h-11 rounded-full bg-white shadow-lg ring-1 ring-border/40 active:scale-95 transition-transform"
        >
          <MessageCircle className="w-5 h-5 text-primary" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      )}

      {/* Chat drawer */}
      {open && (
        <div className="fixed inset-0 z-[3000] flex flex-col justify-end pointer-events-none">
          {/* Tap-outside backdrop (only bottom half so map is still visible) */}
          <div
            className="absolute inset-0 pointer-events-auto"
            onClick={() => setOpen(false)}
          />

          <div
            className="relative pointer-events-auto w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl flex flex-col"
            style={{ height: "clamp(320px, 55vh, 540px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Ride chat</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-muted">
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {messages.length === 0 && (
                <p className="text-xs text-center text-muted-foreground mt-8">
                  No messages yet. Say hi!
                </p>
              )}
              {messages.map((m) => {
                const isMe = m.senderId === currentUserId;
                return (
                  <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                    {!isMe && (
                      <Avatar className="w-7 h-7 shrink-0 mt-0.5">
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                          {initials(m.senderName)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`flex flex-col gap-0.5 max-w-[72%] ${isMe ? "items-end" : "items-start"}`}>
                      {!isMe && (
                        <span className="text-[10px] text-muted-foreground font-medium">{m.senderName}</span>
                      )}
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm leading-snug ${
                          isMe
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-muted text-foreground rounded-tl-sm"
                        }`}
                      >
                        {m.body}
                      </div>
                      <span className="text-[9px] text-muted-foreground">
                        {format(new Date(m.createdAt), "h:mm a")}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2 px-4 py-3 border-t border-border/40 shrink-0">
              <Input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Type a message…"
                className="flex-1 rounded-full text-sm h-9"
                disabled={sending}
              />
              <Button
                size="icon"
                className="rounded-full w-9 h-9 shrink-0"
                disabled={!draft.trim() || sending}
                onClick={send}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function normalize(raw: any): Message {
  return {
    id: raw.id,
    senderId: raw.sender_id,
    senderName: raw.sender?.name ?? "Unknown",
    body: raw.body,
    createdAt: raw.created_at,
  };
}
