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

interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat?: number;
    lon?: number;
  };
  tags?: Record<string, string | undefined>;
  type: "node" | "way" | "relation";
}

const SEARCH_RADII_KM = [15, 40, 80, 150, 300];
const MIN_RESULTS = 6;
const MAX_RESULTS = 20;
const JEWISH_NAME_PATTERN = /synagogue|beth|beit|beith|oratoire isra(?:e|é)lite|isra(?:e|é)lite|juif|juive|heichal|heikhal|habad|chabad|בית|קהילה/i;

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadius = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildAddress(tags: Record<string, string | undefined>) {
  return [
    [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" "),
    tags["addr:postcode"],
    tags["addr:city"] || tags["addr:town"] || tags["addr:village"],
  ]
    .filter(Boolean)
    .join(", ");
}

function isLikelySynagogue(tags: Record<string, string | undefined>) {
  const searchableText = [
    tags.name,
    tags["name:fr"],
    tags["name:he"],
    tags.operator,
    tags.community,
    tags.description,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    tags.religion === "jewish" ||
    tags.building === "synagogue" ||
    tags.amenity === "synagogue" ||
    tags.denomination === "jewish" ||
    JEWISH_NAME_PATTERN.test(searchableText)
  );
}

function buildQuery(lat: number, lon: number, radiusKm: number) {
  const radiusMeters = Math.round(radiusKm * 1000);
  const around = `(around:${radiusMeters},${lat},${lon})`;

  return `
    [out:json][timeout:25];
    (
      node["amenity"="place_of_worship"]["religion"="jewish"]${around};
      way["amenity"="place_of_worship"]["religion"="jewish"]${around};
      relation["amenity"="place_of_worship"]["religion"="jewish"]${around};
      node["building"="synagogue"]${around};
      way["building"="synagogue"]${around};
      relation["building"="synagogue"]${around};
      node["name"~"Synagogue|Beth|Beit|Beith|Oratoire israélite|Oratoire israelite|בית", i]${around};
      way["name"~"Synagogue|Beth|Beit|Beith|Oratoire israélite|Oratoire israelite|בית", i]${around};
      relation["name"~"Synagogue|Beth|Beit|Beith|Oratoire israélite|Oratoire israelite|בית", i]${around};
    );
    out center tags;
  `;
}

async function fetchSynagoguesForRadius(
  lat: number,
  lon: number,
  radiusKm: number,
  signal?: AbortSignal,
): Promise<SynagogueResult[]> {
  const radiusMeters = Math.round(radiusKm * 1000);
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: `data=${encodeURIComponent(buildQuery(lat, lon, radiusKm))}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data = await response.json();
  const seen = new Set<string>();

  return ((data.elements || []) as OverpassElement[])
    .map<SynagogueResult | null>((element) => {
      const tags = element.tags || {};
      const elementLat = Number(element.lat ?? element.center?.lat);
      const elementLon = Number(element.lon ?? element.center?.lon);

      if (!Number.isFinite(elementLat) || !Number.isFinite(elementLon) || !isLikelySynagogue(tags)) {
        return null;
      }

      const distance = haversineDistance(lat, lon, elementLat, elementLon);
      const dedupeKey = `${tags.name || "Synagogue"}-${buildAddress(tags)}-${elementLat.toFixed(4)}-${elementLon.toFixed(4)}`;

      if (seen.has(dedupeKey) || distance > radiusMeters + 250) {
        return null;
      }

      seen.add(dedupeKey);

      return {
        id: `${element.type}-${element.id}`,
        name: tags.name || tags["name:fr"] || "Synagogue",
        lat: elementLat,
        lon: elementLon,
        distance,
        address: buildAddress(tags) || undefined,
        phone: tags.phone || tags["contact:phone"] || undefined,
        website: tags.website || tags["contact:website"] || undefined,
        denomination: tags.denomination || tags.community || undefined,
      };
    })
    .filter((item): item is SynagogueResult => item !== null)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, MAX_RESULTS);
}

export async function fetchNearbySynagogues(lat: number, lon: number, signal?: AbortSignal) {
  let lastResults: SynagogueResult[] = [];

  for (const radiusKm of SEARCH_RADII_KM) {
    lastResults = await fetchSynagoguesForRadius(lat, lon, radiusKm, signal);

    if (lastResults.length >= MIN_RESULTS) {
      return lastResults;
    }
  }

  return lastResults;
}

export function formatDistance(distanceMeters: number): string {
  return distanceMeters < 1000
    ? `${Math.round(distanceMeters)} m`
    : `${(distanceMeters / 1000).toFixed(1)} km`;
}
