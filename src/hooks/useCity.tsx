import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { CityConfig, CITIES, DEFAULT_CITY } from "@/lib/cities";

interface CityContextType {
  city: CityConfig;
  cityKey: string;
  setCityKey: (key: string) => void;
  isGeolocating: boolean;
  geolocate: () => void;
}

const CityContext = createContext<CityContextType | null>(null);

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=fr`,
      { headers: { "User-Agent": "ChabbatChalom/1.0" } }
    );
    const d = await r.json();
    return d.address?.city || d.address?.town || d.address?.village || d.address?.municipality || null;
  } catch {
    return null;
  }
}

export function CityProvider({ children }: { children: ReactNode }) {
  const [cityKey, setCityKeyState] = useState(() => {
    try { return localStorage.getItem("calj_city") || DEFAULT_CITY; } catch { return DEFAULT_CITY; }
  });
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [gpsCity, setGpsCity] = useState<CityConfig | null>(null);

  const setCityKey = (key: string) => {
    setCityKeyState(key);
    try { localStorage.setItem("calj_city", key); } catch {}
  };

  const geolocate = () => {
    if (!navigator.geolocation) return;
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        // Find nearest predefined city for fallback name & timezone
        let nearestKey = DEFAULT_CITY;
        let nearestDist = Infinity;
        for (const [key, c] of Object.entries(CITIES)) {
          const dLat = (c.lat - latitude) * Math.PI / 180;
          const dLng = (c.lng - longitude) * Math.PI / 180 * Math.cos(latitude * Math.PI / 180);
          const d = Math.sqrt(dLat * dLat + dLng * dLng);
          if (d < nearestDist) { nearestDist = d; nearestKey = key; }
        }
        const base = CITIES[nearestKey] || CITIES[DEFAULT_CITY];

        // Get real city name via reverse geocoding
        const realCityName = await reverseGeocode(latitude, longitude);

        // Use browser timezone (most accurate for user's actual location)
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || base.tz;

        setGpsCity({
          ...base,
          name: `📍 ${realCityName || base.name}`,
          lat: latitude,
          lng: longitude,
          tz: browserTz,
          _gps: true,
        } as CityConfig & { _gps: boolean });
        setCityKey("__gps__");
        setIsGeolocating(false);
      },
      () => setIsGeolocating(false),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const city = cityKey === "__gps__" && gpsCity ? gpsCity : (CITIES[cityKey] || CITIES[DEFAULT_CITY]);

  return (
    <CityContext.Provider value={{ city, cityKey, setCityKey, isGeolocating, geolocate }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error("useCity must be used within CityProvider");
  return ctx;
}
