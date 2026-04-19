import { useEffect, useRef, useState } from "react";
import { importLibrary } from "@/lib/google-maps";
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from "@/lib/map-defaults";

const MOSQUE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="18" fill="#4f46e5"/><text x="18" y="23" text-anchor="middle" font-size="18">🕌</text></svg>`;
const USER_LOCATION_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#4f46e5"/><circle cx="12" cy="12" r="6" fill="white"/></svg>`;

interface Masjid {
  id: number;
  name: string;
  lat: number | null;
  lng: number | null;
}

interface Props {
  masjids: Masjid[];
  onMasjidClick: (id: number) => void;
  userLocation?: { lat: number; lng: number } | null;
  height?: string;
}

export function HomeMap({ masjids, onMasjidClick, userLocation, height = "260px" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Init map once on mount
  useEffect(() => {
    let cancelled = false;
    importLibrary("maps").then(() => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      mapRef.current = new google.maps.Map(containerRef.current, {
        center: { lat: MAP_DEFAULT_CENTER[0], lng: MAP_DEFAULT_CENTER[1] },
        zoom: MAP_DEFAULT_ZOOM,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });
      setMapReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  // Centre on user location and show "you are here" marker
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
      userMarkerRef.current = null;
    }
    if (!userLocation) return;
    mapRef.current.setCenter({ lat: userLocation.lat, lng: userLocation.lng });
    mapRef.current.setZoom(13);
    userMarkerRef.current = new google.maps.Marker({
      position: { lat: userLocation.lat, lng: userLocation.lng },
      map: mapRef.current,
      title: "You are here",
      icon: {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(USER_LOCATION_SVG)}`,
        scaledSize: new google.maps.Size(24, 24),
        anchor: new google.maps.Point(12, 12),
      },
      zIndex: 10,
    });
  }, [userLocation, mapReady]);

  // Place masjid markers; only fitBounds when no user location
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const mappable = masjids.filter((m) => m.lat != null && m.lng != null);
    mappable.forEach((masjid) => {
      const marker = new google.maps.Marker({
        position: { lat: masjid.lat!, lng: masjid.lng! },
        map: mapRef.current!,
        title: masjid.name,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(MOSQUE_ICON_SVG)}`,
          scaledSize: new google.maps.Size(36, 36),
          anchor: new google.maps.Point(18, 18),
        },
      });
      marker.addListener("click", () => onMasjidClick(masjid.id));
      markersRef.current.push(marker);
    });

    if (!userLocation && mappable.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      mappable.forEach((m) => bounds.extend({ lat: m.lat!, lng: m.lng! }));
      mapRef.current!.fitBounds(bounds, 48);
    }
  }, [masjids, mapReady, onMasjidClick, userLocation]);

  return <div ref={containerRef} style={{ width: "100%", height }} />;
}
