import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

setOptions({
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
  version: "weekly",
});

export { importLibrary };
