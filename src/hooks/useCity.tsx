import { createContext, useContext, useState, ReactNode } from "react";
import { CityConfig, CITIES, DEFAULT_CITY } from "@/lib/cities";

export interface ActiveCityConfig extends CityConfig {
  _gps?: boolean;
  accuracyMeters?: number | null;
  source?: "gps" | "manual";
}

interface CityContextType {
  city: ActiveCityConfig;
  cityKey: string;
  setCityKey: (key: string) => void;
  isGeolocating: boolean;
  geolocate: () => void;
  locationError: string | null;
  triggerAutoGeo: () => void;
}

const CityContext = createContext<CityContextType | null>(null);
const GPS_STORAGE_KEY = "calj_gps_city";

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1&accept-language=fr`,
    );
    const data = await response.json();
    const address = data.address || {};

    return address.city || address.municipality || address.town || address.village || address.county || null;
  } catch {
    return null;
  }
}

function getNearestBaseCity(latitude: number, longitude: number): CityConfig {
  let nearestKey = DEFAULT_CITY;
  let nearestDistance = Infinity;

  for (const [key, city] of Object.entries(CITIES)) {
    const dLat = ((city.lat - latitude) * Math.PI) / 180;
    const dLng = ((city.lng - longitude) * Math.PI) / 180 * Math.cos((latitude * Math.PI) / 180);
    const distance = Math.sqrt(dLat * dLat + dLng * dLng);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestKey = key;
    }
  }

  return CITIES[nearestKey] || CITIES[DEFAULT_CITY];
}

function getGeolocationErrorMessage(error: GeolocationPositionError) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "La localisation a été refusée. Autorisez l'accès à votre position pour trouver les synagogues autour de vous.";
    case error.POSITION_UNAVAILABLE:
      return "Votre position GPS est indisponible pour le moment. Réessayez dans un endroit mieux couvert.";
    case error.TIMEOUT:
      return "La localisation a pris trop de temps. Réessayez pour récupérer votre position exacte.";
    default:
      return "Impossible de récupérer votre position exacte.";
  }
}

function loadStoredGpsCity(): ActiveCityConfig | null {
  try {
    const raw = localStorage.getItem(GPS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ActiveCityConfig) : null;
  } catch {
    return null;
  }
}

export function CityProvider({ children }: { children: ReactNode }) {
  const [cityKey, setCityKeyState] = useState(() => {
    try {
      return localStorage.getItem("calj_city") || DEFAULT_CITY;
    } catch {
      return DEFAULT_CITY;
    }
  });
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [gpsCity, setGpsCity] = useState<ActiveCityConfig | null>(() => loadStoredGpsCity());
  const [locationError, setLocationError] = useState<string | null>(null);
  const [autoGeoTriggered, setAutoGeoTriggered] = useState(false);

  const setCityKey = (key: string) => {
    setCityKeyState(key);
    setLocationError(null);

    try {
      localStorage.setItem("calj_city", key);
    } catch {
      // ignore storage failures
    }
  };

  const geolocate = () => {
    if (!navigator.geolocation) {
      setLocationError("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }

    setIsGeolocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const baseCity = getNearestBaseCity(latitude, longitude);
        const realCityName = await reverseGeocode(latitude, longitude);
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || baseCity.tz;

        const nextGpsCity: ActiveCityConfig = {
          ...baseCity,
          name: `📍 ${realCityName || baseCity.name}`,
          lat: latitude,
          lng: longitude,
          tz: browserTimezone,
          _gps: true,
          accuracyMeters: Number.isFinite(accuracy) ? Math.round(accuracy) : null,
          source: "gps",
        };

        setGpsCity(nextGpsCity);
        setCityKeyState("__gps__");

        try {
          localStorage.setItem("calj_city", "__gps__");
          localStorage.setItem(GPS_STORAGE_KEY, JSON.stringify(nextGpsCity));
        } catch {
          // ignore storage failures
        }

        setIsGeolocating(false);
      },
      (error) => {
        setLocationError(getGeolocationErrorMessage(error));
        setIsGeolocating(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
    );
  };

  const baseCity = CITIES[cityKey] || CITIES[DEFAULT_CITY];
  const city: ActiveCityConfig =
    cityKey === "__gps__" && gpsCity
      ? gpsCity
      : {
          ...baseCity,
          source: "manual",
          _gps: false,
          accuracyMeters: null,
        };

  // Auto-geolocate on first visit
  const triggerAutoGeo = () => {
    if (autoGeoTriggered) return;
    setAutoGeoTriggered(true);
    try {
      const hasVisited = localStorage.getItem("calj_has_visited");
      if (!hasVisited && navigator.geolocation) {
        localStorage.setItem("calj_has_visited", "1");
        geolocate();
      }
    } catch { /* ignore */ }
  };

  return (
    <CityContext.Provider value={{ city, cityKey, setCityKey, isGeolocating, geolocate, locationError, triggerAutoGeo }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error("useCity must be used within CityProvider");
  return ctx;
}
