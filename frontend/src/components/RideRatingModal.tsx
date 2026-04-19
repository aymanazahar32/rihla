import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  ride: any;
  currentUserId: string;
  onDone: () => void;
}

function initials(n: string) {
  return n.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
}

export function RideRatingModal({ ride, currentUserId, onDone }: Props) {
  const [stars, setStars] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  const driver = ride?.driver;
  const dest = ride?.event?.name ?? ride?.masjid?.name ?? ride?.errand?.title ?? "your destination";

  async function submit() {
    if (!stars) return;
    setSubmitting(true);
    const { error } = await supabase.from("ride_ratings").insert({
      ride_id: ride.id,
      rater_id: currentUserId,
      rated_id: driver?.id,
      stars,
      comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Couldn't save rating", description: error.message, variant: "destructive" });
    } else {
      setDone(true);
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={done ? onDone : undefined} />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl px-6 pt-6 pb-10 shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />

        {done ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="w-14 h-14 text-emerald-500" />
            <h2 className="text-xl font-bold">Thanks for rating!</h2>
            <p className="text-sm text-muted-foreground">Your feedback helps the community.</p>
            <Button className="rounded-full px-8 mt-2" onClick={onDone}>Done</Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-1 mb-6 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-3">Ride complete</p>
              <Avatar className="w-16 h-16 mb-2">
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                  {initials(driver?.name ?? "?")}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold">{driver?.name ?? "Your driver"}</h2>
              <p className="text-sm text-muted-foreground">
                {[driver?.carColor, driver?.carMake, driver?.carModel].filter(Boolean).join(" ") || ""}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">to {dest}</p>
            </div>

            {/* Stars */}
            <div className="flex justify-center gap-2 mb-5">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setStars(s)}
                  className="transition-transform active:scale-90"
                >
                  <Star
                    className="w-10 h-10 transition-colors duration-100"
                    fill={(hovered || stars) >= s ? "#f59e0b" : "none"}
                    stroke={(hovered || stars) >= s ? "#f59e0b" : "#d1d5db"}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>

            {stars > 0 && (
              <p className="text-center text-sm font-medium text-amber-600 mb-4">
                {["", "Poor", "Fair", "Good", "Great", "Excellent!"][stars]}
              </p>
            )}

            <Textarea
              placeholder="Leave a comment (optional)…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="resize-none mb-4 rounded-xl text-sm"
              rows={3}
            />

            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1 rounded-full text-muted-foreground"
                onClick={onDone}
              >
                Skip
              </Button>
              <Button
                className="flex-2 rounded-full px-8"
                disabled={!stars || submitting}
                onClick={submit}
              >
                {submitting ? "Saving…" : "Submit rating"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
