import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useDriverLocation(rideId: number) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastWriteRef = useRef(0);

  useEffect(() => {
    let watchId: number;

    const start = async () => {
      if (!navigator.geolocation) {
        setError("Geolocation is not supported by this browser.");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const userId = user.id;

      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoords({ lat, lng });

          const now = Date.now();
          if (now - lastWriteRef.current >= 3000) {
            const { error: writeError } = await supabase
              .from("rides")
              .update({ current_lat: lat, current_lng: lng })
              .eq("id", rideId)
              .eq("driver_id", userId);
            if (writeError) setError(writeError.message);
            else lastWriteRef.current = Date.now();
          }
        },
        (err) => setError(err.message),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    };

    void start();
    return () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    };
  }, [rideId]);

  return { coords, error };
}
