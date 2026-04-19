import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Public endpoint: Google Places Autocomplete + Place Details proxy.
 * - GET ?q=<query>            → returns predictions (autocomplete)
 * - GET ?place_id=<id>        → returns formatted address + components
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q");
    const placeId = url.searchParams.get("place_id");
    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY not configured");

    if (placeId) {
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
        placeId
      )}&fields=address_component,formatted_address,geometry&language=fr&key=${apiKey}`;
      const r = await fetch(detailsUrl);
      const d = await r.json();
      if (d.status !== "OK") {
        return new Response(JSON.stringify({ error: d.status, message: d.error_message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = d.result;
      const comps: any[] = result.address_components || [];
      const get = (type: string) => comps.find((c) => c.types.includes(type))?.long_name || "";
      const streetNumber = get("street_number");
      const route = get("route");
      const street = [streetNumber, route].filter(Boolean).join(" ");
      const city = get("locality") || get("postal_town") || get("administrative_area_level_2");
      const postalCode = get("postal_code");
      const country = get("country");

      return new Response(
        JSON.stringify({
          formatted_address: result.formatted_address,
          street,
          city,
          postal_code: postalCode,
          country,
          lat: result.geometry?.location?.lat,
          lng: result.geometry?.location?.lng,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!q || q.trim().length < 3) {
      return new Response(JSON.stringify({ predictions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const acUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      q
    )}&types=address&language=fr&components=country:fr|country:be|country:ch|country:lu|country:il&key=${apiKey}`;
    const r = await fetch(acUrl);
    const d = await r.json();

    const predictions = (d.predictions || []).map((p: any) => ({
      place_id: p.place_id,
      description: p.description,
      main_text: p.structured_formatting?.main_text || p.description,
      secondary_text: p.structured_formatting?.secondary_text || "",
    }));

    return new Response(JSON.stringify({ predictions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
