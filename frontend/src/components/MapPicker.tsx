import { useEffect, useRef, useState } from "react";
import { importLibrary } from "@/lib/google-maps";
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from "@/lib/map-defaults";
import { Button } from "@/components/ui/button";
import { LocateFixed, MapPin, Loader2 } from "lucide-react";

interface Props {
  value: string;
  onChange: (address: string, lat: number, lng: number) => void;
  height?: string;
}

export function MapPicker({ value, onChange, height = "260px" }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);

  const placeMarker = (lat: number, lng: number) => {
    const map = mapRef.current;
    const geocoder = geocoderRef.current;
    if (!map || !geocoder) return;

    const latlng = { lat, lng };
    if (markerRef.current) {
      markerRef.current.setPosition(latlng);
    } else {
      markerRef.current = new google.maps.Marker({ position: latlng, map });
    }
    map.panTo(latlng);
    if (map.getZoom()! < 15) map.setZoom(15);

    setResolving(true);
    geocoder.geocode({ location: latlng }, (results, status) => {
      setResolving(false);
      const address =
        status === "OK" && results?.[0]
          ? results[0].formatted_address
          : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      onChange(address, lat, lng);
    });
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([importLibrary("maps"), importLibrary("places"), importLibrary("geocoding")]).then(() => {
      if (cancelled || !mapContainerRef.current || !autocompleteInputRef.current) return;

      const map = new google.maps.Map(mapContainerRef.current, {
        center: { lat: MAP_DEFAULT_CENTER[0], lng: MAP_DEFAULT_CENTER[1] },
        zoom: MAP_DEFAULT_ZOOM,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });
      mapRef.current = map;
      geocoderRef.current = new google.maps.Geocoder();

      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          map.setZoom(14);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 },
      );

      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (e.latLng) placeMarker(e.latLng.lat(), e.latLng.lng());
      });

      const autocomplete = new google.maps.places.Autocomplete(autocompleteInputRef.current!, {
        fields: ["formatted_address", "geometry"],
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry?.location) return;
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        if (markerRef.current) {
          markerRef.current.setPosition({ lat, lng });
        } else {
          markerRef.current = new google.maps.Marker({ position: { lat, lng }, map });
        }
        map.panTo({ lat, lng });
        map.setZoom(15);
        onChange(place.formatted_address ?? `${lat}, ${lng}`, lat, lng);
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        placeMarker(pos.coords.latitude, pos.coords.longitude);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          Search an address, use your current location, or tap the map to drop a pin.
        </p>
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={useCurrentLocation} disabled={locating}>
          {locating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5 mr-1" />}
          Use current location
        </Button>
      </div>
      <input
        ref={autocompleteInputRef}
        type="text"
        placeholder="Search address…"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <div ref={mapContainerRef} className="w-full rounded-xl overflow-hidden ring-1 ring-border/50" style={{ height }} />
      <div className="text-sm rounded-lg bg-muted/50 px-3 py-2 min-h-[2.5rem] flex items-center">
        {resolving ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Looking up address…
          </span>
        ) : value ? (
          <span className="text-foreground">{value}</span>
        ) : (
          <span className="text-muted-foreground">No pickup location selected yet.</span>
        )}
      </div>
    </div>
  );
}
