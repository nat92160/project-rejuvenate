import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PlaceResult {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distance: number;
  straightLineDistance: number;
  distanceSource: "road" | "air";
  travelDurationMinutes?: number;
  address?: string;
  phone?: string;
  website?: string;
  denomination?: string;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function searchNearbyPlaces(apiKey: string, lat: number, lon: number, radiusM: number): Promise<PlaceResult[]> {
  // Use Google Places API (New) - Nearby Search
  const url = "https://places.googleapis.com/v1/places:searchNearby";
  
  const body = {
    includedTypes: ["synagogue"],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lon },
        radius: Math.min(radiusM, 100000),
      },
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.location,places.formattedAddress,places.internationalPhoneNumber,places.websiteUri,places.shortFormattedAddress",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Places API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const places = data.places || [];

  return places.map((place: any) => {
    const placeLat = place.location?.latitude;
    const placeLon = place.location?.longitude;
    const dist = haversineDistance(lat, lon, placeLat, placeLon);
    
    return {
      id: place.id,
      name: place.displayName?.text || "Synagogue",
      lat: placeLat,
      lon: placeLon,
      distance: dist,
      straightLineDistance: dist,
      distanceSource: "air" as const,
      address: place.shortFormattedAddress || place.formattedAddress || undefined,
      phone: place.internationalPhoneNumber || undefined,
      website: place.websiteUri || undefined,
    };
  }).sort((a: PlaceResult, b: PlaceResult) => a.distance - b.distance);
}

async function enrichWithDirections(apiKey: string, originLat: number, originLon: number, results: PlaceResult[]): Promise<PlaceResult[]> {
  if (results.length === 0) return results;

  // Use Routes API for distance matrix (batch)
  const destinations = results.slice(0, 10).map(r => ({
    waypoint: { location: { latLng: { latitude: r.lat, longitude: r.lon } } },
  }));

  try {
    const response = await fetch("https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "originIndex,destinationIndex,distanceMeters,duration",
      },
      body: JSON.stringify({
        origins: [{ waypoint: { location: { latLng: { latitude: originLat, longitude: originLon } } } }],
        destinations,
        travelMode: "DRIVE",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn("Routes API failed, keeping air distances:", response.status, errText);
      return results;
    }

    const routes = await response.json();
    
    // routes is an array of route elements
    const routeArray = Array.isArray(routes) ? routes : [];
    
    for (const route of routeArray) {
      const destIdx = route.destinationIndex;
      if (destIdx != null && destIdx < results.length) {
        if (route.distanceMeters) {
          results[destIdx] = {
            ...results[destIdx],
            distance: route.distanceMeters,
            distanceSource: "road",
            travelDurationMinutes: route.duration
              ? Math.max(1, Math.round(parseInt(route.duration.replace("s", "")) / 60))
              : undefined,
          };
        }
      }
    }

    return results.sort((a, b) => a.distance - b.distance);
  } catch (err) {
    console.warn("Routes enrichment failed:", err);
    return results;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) {
      throw new Error("GOOGLE_MAPS_API_KEY is not configured");
    }

    const { lat, lon } = await req.json();

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return new Response(JSON.stringify({ success: false, error: "Latitude/longitude invalides" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Progressive search: 5km, 15km, 50km
    const radii = [5000, 15000, 50000, 100000];
    let results: PlaceResult[] = [];

    for (const radius of radii) {
      results = await searchNearbyPlaces(apiKey, lat, lon, radius);
      if (results.length >= 3) break;
    }

    // Enrich top results with driving distances
    results = await enrichWithDirections(apiKey, lat, lon, results);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("nearby-synagogues error:", error);

    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
