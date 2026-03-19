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

export function CityProvider({ children }: { children: ReactNode }) {
  const [cityKey, setCityKeyState] = useState(() => {
    try { return localStorage.getItem("calj_city") || DEFAULT_CITY; } catch { return DEFAULT_CITY; }
  });
  const [isGeolocating, setIsGeolocating] = useState(false);

  const setCityKey = (key: string) => {
    setCityKeyState(key);
    try { localStorage.setItem("calj_city", key); } catch {}
  };

  const [gpsCity, setGpsCity] = useState<CityConfig | null>(null);

  const geolocate = () => {
    if (!navigator.geolocation) return;
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // Find nearest city for name/tz, but use exact GPS coords for calculations
        let nearestKey = DEFAULT_CITY;
        let nearestDist = Infinity;
        for (const [key, c] of Object.entries(CITIES)) {
          const dLat = (c.lat - latitude) * Math.PI / 180;
          const dLng = (c.lng - longitude) * Math.PI / 180 * Math.cos(latitude * Math.PI / 180);
          const d = Math.sqrt(dLat * dLat + dLng * dLng);
          if (d < nearestDist) { nearestDist = d; nearestKey = key; }
        }
        const base = CITIES[nearestKey] || CITIES[DEFAULT_CITY];
        // Create a GPS-precise city config using exact coordinates
        setGpsCity({
          ...base,
          name: `📍 ${base.name}`,
          lat: latitude,
          lng: longitude,
          _gps: true,
        } as CityConfig & { _gps: boolean });
        setCityKey("__gps__");
        setIsGeolocating(false);
      },
      () => setIsGeolocating(false),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const city = CITIES[cityKey] || CITIES[DEFAULT_CITY];

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
