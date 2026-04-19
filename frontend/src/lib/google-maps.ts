import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

setOptions({
  key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
  version: "weekly",
});

export { importLibrary };

export async function searchNearbyMasjids(lat: number, lng: number, radiusMeters: number = 25000): Promise<google.maps.places.PlaceResult[]> {
  const { Map } = await importLibrary("maps") as google.maps.MapsLibrary;
  const { PlacesService } = await importLibrary("places") as google.maps.PlacesLibrary;
  
  // A dummy map instance is required for PlacesService
  const mapDiv = document.createElement("div");
  const map = new Map(mapDiv, {
    center: { lat, lng },
    zoom: 15,
  });
  
  const service = new PlacesService(map);
  
  return new Promise((resolve, reject) => {
    service.nearbySearch(
      {
        location: { lat, lng },
        radius: radiusMeters,
        type: "mosque",
        keyword: "masjid",
      },
      (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          resolve(results);
        } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve([]);
        } else {
          reject(new Error(`Places API error: ${status}`));
        }
      }
    );
  });
}
