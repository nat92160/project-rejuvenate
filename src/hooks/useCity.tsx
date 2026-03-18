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

  const geolocate = () => {
    if (!navigator.geolocation) return;
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        let nearestKey = DEFAULT_CITY;
        let nearestDist = Infinity;
        for (const [key, c] of Object.entries(CITIES)) {
          const d = Math.hypot(c.lat - latitude, c.lng - longitude);
          if (d < nearestDist) { nearestDist = d; nearestKey = key; }
        }
        setCityKey(nearestKey);
        setIsGeolocating(false);
      },
      () => setIsGeolocating(false),
      { enableHighAccuracy: true, timeout: 15000 }
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
