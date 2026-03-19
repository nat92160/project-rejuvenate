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
  const { data, error } = await supabase.functions.invoke("nearby-synagogues", {
    body: { lat, lon },
  });

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  if (error) {
    throw new Error(error.message || "Erreur lors de la recherche de synagogues");
  }

  if (!data?.success) {
    throw new Error(data?.error || "Réponse invalide du serveur");
  }

  return (data.results || []) as SynagogueResult[];
}

export function formatDistance(distanceInMeters: number): string {
  return distanceInMeters < 1000
    ? `${Math.round(distanceInMeters)} m`
    : `${(distanceInMeters / 1000).toFixed(1)} km`;
}
