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

const OVERPASS_SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const SEARCH_RADII_KM = [10, 25, 50, 120, 300];
const MIN_RESULTS = 4;
const MAX_RESULTS = 20;
const OVERPASS_TIMEOUT_MS = 15000;
const OSRM_TIMEOUT_MS = 12000;
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
      node["amenity"="synagogue"]${around};
      way["amenity"="synagogue"]${around};
      relation["amenity"="synagogue"]${around};
      node["name"~"Synagogue|Beth|Beit|Beith|Oratoire israélite|Oratoire israelite|בית", i]${around};
      way["name"~"Synagogue|Beth|Beit|Beith|Oratoire israélite|Oratoire israelite|בית", i]${around};
      relation["name"~"Synagogue|Beth|Beit|Beith|Oratoire israélite|Oratoire israelite|בית", i]${around};
    );
    out center tags;
  `;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number, signal?: AbortSignal) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  if (signal?.aborted) {
    clearTimeout(timeout);
    throw new DOMException("Aborted", "AbortError");
  }

  const abortListener = () => controller.abort();
  signal?.addEventListener("abort", abortListener);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortListener);
  }
}

async function queryOverpass(query: string, signal?: AbortSignal): Promise<any> {
  let lastError: Error | null = null;

  for (const server of OVERPASS_SERVERS) {
    try {
      const response = await fetchWithTimeout(
        server,
        {
          method: "POST",
          body: `data=${encodeURIComponent(query)}`,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        },
        OVERPASS_TIMEOUT_MS,
        signal,
      );

      if (!response.ok) {
        lastError = new Error(`${server}: HTTP ${response.status}`);
        continue;
      }

      return await response.json();
    } catch (error) {
      if ((error as Error)?.name === "AbortError" && signal?.aborted) {
        throw error;
      }
      lastError = error as Error;
    }
  }

  throw lastError || new Error("Tous les serveurs de recherche ont échoué.");
}

function parseResults(data: any, originLat: number, originLon: number, radiusMeters: number): SynagogueResult[] {
  const seen = new Set<string>();

  return ((data.elements || []) as any[])
    .map<SynagogueResult | null>((element) => {
      const tags = element.tags || {};
      const lat = Number(element.lat ?? element.center?.lat);
      const lon = Number(element.lon ?? element.center?.lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !isLikelySynagogue(tags)) {
        return null;
      }

      const straightLineDistance = haversineDistance(originLat, originLon, lat, lon);
      if (straightLineDistance > radiusMeters + 250) {
        return null;
      }

      const address = buildAddress(tags);
      const name = tags.name || tags["name:fr"] || "Synagogue";
      const dedupeKey = `${name}-${address}-${lat.toFixed(4)}-${lon.toFixed(4)}`;

      if (seen.has(dedupeKey)) {
        return null;
      }
      seen.add(dedupeKey);

      return {
        id: `${element.type}-${element.id}`,
        name,
        lat,
        lon,
        distance: straightLineDistance,
        straightLineDistance,
        distanceSource: "air",
        address: address || undefined,
        phone: tags.phone || tags["contact:phone"] || undefined,
        website: tags.website || tags["contact:website"] || undefined,
        denomination: tags.denomination || tags.community || undefined,
      };
    })
    .filter((item): item is SynagogueResult => item !== null)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, MAX_RESULTS);
}

async function enrichWithRoadDistance(originLat: number, originLon: number, results: SynagogueResult[], signal?: AbortSignal) {
  if (results.length === 0) {
    return results;
  }

  const coordinates = [
    `${originLon},${originLat}`,
    ...results.map((result) => `${result.lon},${result.lat}`),
  ].join(";");

  try {
    const response = await fetchWithTimeout(
      `https://router.project-osrm.org/table/v1/driving/${coordinates}?annotations=distance,duration&sources=0`,
      { method: "GET" },
      OSRM_TIMEOUT_MS,
      signal,
    );

    if (!response.ok) {
      return results;
    }

    const payload = await response.json();
    const distances = payload?.distances?.[0] as Array<number | null> | undefined;
    const durations = payload?.durations?.[0] as Array<number | null> | undefined;

    return results
      .map((result, index) => {
        const roadDistance = distances?.[index + 1];
        const duration = durations?.[index + 1];

        if (!Number.isFinite(roadDistance as number)) {
          return result;
        }

        return {
          ...result,
          distance: roadDistance as number,
          distanceSource: "road" as const,
          travelDurationMinutes: Number.isFinite(duration as number)
            ? Math.max(1, Math.round((duration as number) / 60))
            : undefined,
        };
      })
      .sort((a, b) => a.distance - b.distance);
  } catch {
    return results;
  }
}

export async function fetchNearbySynagogues(lat: number, lon: number, signal?: AbortSignal): Promise<SynagogueResult[]> {
  let lastResults: SynagogueResult[] = [];

  for (const radiusKm of SEARCH_RADII_KM) {
    const query = buildQuery(lat, lon, radiusKm);
    const data = await queryOverpass(query, signal);
    const parsed = parseResults(data, lat, lon, radiusKm * 1000);
    lastResults = await enrichWithRoadDistance(lat, lon, parsed, signal);

    if (lastResults.length >= MIN_RESULTS) {
      return lastResults;
    }
  }

  return lastResults;
}

export function formatDistance(distanceInMeters: number): string {
  return distanceInMeters < 1000
    ? `${Math.round(distanceInMeters)} m`
    : `${(distanceInMeters / 1000).toFixed(1)} km`;
}
