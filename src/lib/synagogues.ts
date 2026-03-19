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

// Multiple Overpass servers for reliability
const OVERPASS_SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const SEARCH_RADII_KM = [15, 50, 120, 300];
const MIN_RESULTS = 3;
const MAX_RESULTS = 20;

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

function buildQuery(lat: number, lon: number, radiusKm: number) {
  const r = Math.round(radiusKm * 1000);
  // Simple, fast query — only religion=jewish + building=synagogue
  return `[out:json][timeout:15];(node["amenity"="place_of_worship"]["religion"="jewish"](around:${r},${lat},${lon});way["amenity"="place_of_worship"]["religion"="jewish"](around:${r},${lat},${lon});node["building"="synagogue"](around:${r},${lat},${lon});way["building"="synagogue"](around:${r},${lat},${lon}););out center tags;`;
}

async function queryOverpass(query: string, signal?: AbortSignal): Promise<any> {
  let lastError: Error | null = null;

  for (const server of OVERPASS_SERVERS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      // Chain with parent signal
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const onAbort = () => controller.abort();
      signal?.addEventListener("abort", onAbort);

      const res = await fetch(server, {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);

      if (!res.ok) {
        lastError = new Error(`${server}: HTTP ${res.status}`);
        continue; // try next server
      }

      return await res.json();
    } catch (err: any) {
      if (err?.name === "AbortError" && signal?.aborted) throw err;
      lastError = err;
      continue; // try next server
    }
  }

  throw lastError || new Error("All Overpass servers failed");
}

function parseResults(
  data: any,
  lat: number,
  lon: number,
  radiusMeters: number,
): SynagogueResult[] {
  const seen = new Set<string>();

  return ((data.elements || []) as any[])
    .map<SynagogueResult | null>((el) => {
      const tags = el.tags || {};
      const eLat = Number(el.lat ?? el.center?.lat);
      const eLon = Number(el.lon ?? el.center?.lon);

      if (!Number.isFinite(eLat) || !Number.isFinite(eLon)) return null;

      const distance = haversineDistance(lat, lon, eLat, eLon);
      if (distance > radiusMeters + 500) return null;

      const name = tags.name || tags["name:fr"] || "Synagogue";
      const addr = buildAddress(tags);
      const key = `${name}-${addr}-${eLat.toFixed(4)}-${eLon.toFixed(4)}`;
      if (seen.has(key)) return null;
      seen.add(key);

      return {
        id: `${el.type}-${el.id}`,
        name,
        lat: eLat,
        lon: eLon,
        distance,
        address: addr || undefined,
        phone: tags.phone || tags["contact:phone"] || undefined,
        website: tags.website || tags["contact:website"] || undefined,
        denomination: tags.denomination || tags.community || undefined,
      };
    })
    .filter((x): x is SynagogueResult => x !== null)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, MAX_RESULTS);
}

export async function fetchNearbySynagogues(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<SynagogueResult[]> {
  let lastResults: SynagogueResult[] = [];

  for (const radiusKm of SEARCH_RADII_KM) {
    const query = buildQuery(lat, lon, radiusKm);
    const data = await queryOverpass(query, signal);
    lastResults = parseResults(data, lat, lon, radiusKm * 1000);

    if (lastResults.length >= MIN_RESULTS) {
      return lastResults;
    }
  }

  return lastResults;
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}
