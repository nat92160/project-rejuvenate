import { supabase } from "@/integrations/supabase/client";

export interface SynagogueResult {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distance: number;
  address?: string;
  phone?: string;
  website?: string;
  denomination?: string;
}

export async function fetchNearbySynagogues(lat: number, lon: number) {
  const { data, error } = await supabase.functions.invoke("nearby-synagogues", {
    body: { lat, lon },
  });

  if (error || !data?.success) {
    throw new Error(data?.error || error?.message || "Impossible de charger les synagogues proches");
  }

  return (data.results || []) as SynagogueResult[];
}

export function formatDistance(distanceMeters: number): string {
  return distanceMeters < 1000
    ? `${Math.round(distanceMeters)} m`
    : `${(distanceMeters / 1000).toFixed(1)} km`;
}
