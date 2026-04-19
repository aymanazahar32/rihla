import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUserId } from "@/lib/api-client";

export function useDriverLocation(rideId: number) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastWriteRef = useRef(0);

  useEffect(() => {
    let watchId: number;

    const start = async () => {
      const userId = await getCurrentUserId().catch(() => null);
      if (!userId) return;

      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoords({ lat, lng });

          const now = Date.now();
          if (now - lastWriteRef.current >= 3000) {
            lastWriteRef.current = now;
            await supabase
              .from("rides")
              .update({ current_lat: lat, current_lng: lng })
              .eq("id", rideId)
              .eq("driver_id", userId);
          }
        },
        (err) => setError(err.message),
        { enableHighAccuracy: true, timeout: 15000 },
      );
    };

    void start();
    return () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    };
  }, [rideId]);

  return { coords, error };
}
