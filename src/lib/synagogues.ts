import { supabase } from "@/integrations/supabase/client";

export interface SynagogueResult {
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

export async function fetchNearbySynagogues(lat: number, lon: number, signal?: AbortSignal): Promise<SynagogueResult[]> {
  // Timeout: if the edge function takes more than 8s, abort and return empty
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const { data, error } = await supabase.functions.invoke("nearby-synagogues", {
      body: { lat, lon },
    });

    clearTimeout(timeout);

    if (signal?.aborted || controller.signal.aborted) throw new DOMException("Aborted", "AbortError");

    if (error) {
      console.warn("Nearby search failed, falling back to raw GPS coords:", error.message);
      return [];
    }

    if (!data?.success) {
      console.warn("Nearby search invalid response, falling back:", data?.error);
      return [];
    }

    return (data.results || []) as SynagogueResult[];
  } catch (err: any) {
    clearTimeout(timeout);
    if (err?.name === "AbortError") {
      console.warn("Nearby search timed out after 8s, falling back to raw GPS");
    } else {
      console.warn("Nearby search error, falling back:", err);
    }
    return [];
  }
}

export function formatDistance(distanceInMeters: number): string {
  return distanceInMeters < 1000
    ? `${Math.round(distanceInMeters)} m`
    : `${(distanceInMeters / 1000).toFixed(1)} km`;
}
