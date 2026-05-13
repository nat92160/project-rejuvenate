import { createContext, useContext, useRef, useState, ReactNode } from "react";
import { CityConfig, CITIES, DEFAULT_CITY } from "@/lib/cities";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

export interface ActiveCityConfig extends CityConfig {
  _gps?: boolean;
  accuracyMeters?: number | null;
  source?: "gps" | "manual";
  altitude?: number;
}

interface CityContextType {
  city: ActiveCityConfig;
  cityKey: string;
  setCityKey: (key: string) => void;
  isGeolocating: boolean;
  manualAltitude: number;
  setManualAltitude: (alt: number) => void;
  geolocate: () => void;
  locationError: string | null;
  triggerAutoGeo: () => void;
}

const CityContext = createContext<CityContextType | null>(null);
const GPS_STORAGE_KEY = "calj_gps_city";
const ALT_STORAGE_KEY = "calj_manual_altitude";

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1&accept-language=fr`,
    );
    const data = await response.json();
    const address = data.address || {};

    return address.town || address.city || address.village || address.municipality || address.county || null;
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

function isIosWebViewOrBrowser() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
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

function getNativeGeolocationErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String((error as any)?.message || "");
  const code = String((error as any)?.code || "");

  if (code.includes("0003") || /denied|refus|permission/i.test(message)) {
    return "La localisation est refusée. Autorisez Chabbat Chalom dans Réglages > Confidentialité et sécurité > Service de localisation.";
  }

  if (code.includes("0010") || /timeout|time.?out|temps/i.test(message)) {
    return "Votre iPhone n'a pas encore trouvé votre position. Activez le service de localisation puis réessayez près d'une fenêtre.";
  }

  if (/unavailable|indisponible|location/i.test(message)) {
    return "Votre position GPS est indisponible pour le moment. Vérifiez que le service de localisation est activé.";
  }

  return "Impossible de récupérer votre position exacte. Vérifiez le service de localisation puis réessayez.";
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
  const geolocationRequestId = useRef(0);
  const [manualAltitude, setManualAltitudeState] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(ALT_STORAGE_KEY);
      return stored ? Number(stored) : 0;
    } catch { return 0; }
  });

  const setManualAltitude = (alt: number) => {
    setManualAltitudeState(alt);
    try { localStorage.setItem(ALT_STORAGE_KEY, String(alt)); } catch { /* ignore */ }
  };

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
    const isNative = Capacitor.isNativePlatform();
    if (!isNative && !navigator.geolocation) {
      setLocationError("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }

    // Prevent double-tap while already geolocating
    if (isGeolocating) return;

    setIsGeolocating(true);
    setLocationError(null);

    const requestId = ++geolocationRequestId.current;

    // Safety timeout: if GPS never responds, unlock the button without overwriting later results
    const safetyTimer = setTimeout(() => {
      if (geolocationRequestId.current !== requestId) return;
      setIsGeolocating(false);
      setLocationError(
        isNative || isIosWebViewOrBrowser()
          ? "Votre iPhone cherche encore votre position. Vérifiez que le service de localisation est actif puis réessayez."
          : "La localisation a pris trop de temps. Réessayez.",
      );
    }, isNative || isIosWebViewOrBrowser() ? 30000 : 15000);

    const onSuccess = async (position: GeolocationPosition | { coords: GeolocationCoordinates }) => {
        if (geolocationRequestId.current !== requestId) return;
        clearTimeout(safetyTimer);
        const { latitude, longitude, accuracy, altitude: gpsAltitude } = position.coords;
        const baseCity = getNearestBaseCity(latitude, longitude);

        let realCityName: string | null = null;
        try {
          realCityName = await Promise.race([
            reverseGeocode(latitude, longitude),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
          ]);
        } catch { /* use fallback */ }

        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || baseCity.tz;

        const resolvedAltitude = (gpsAltitude && Number.isFinite(gpsAltitude) && gpsAltitude > 0)
          ? Math.round(gpsAltitude)
          : 0;

        const nextGpsCity: ActiveCityConfig = {
          ...baseCity,
          name: `📍 ${realCityName || baseCity.name}`,
          lat: latitude,
          lng: longitude,
          tz: browserTimezone,
          _gps: true,
          accuracyMeters: Number.isFinite(accuracy) ? Math.round(accuracy) : null,
          source: "gps",
          altitude: resolvedAltitude,
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
    };

    if (isNative) {
      // Native: ensure permission, then use Capacitor Geolocation (works in WKWebView)
      (async () => {
        try {
          const perm = await Geolocation.checkPermissions();
          if (perm.location !== "granted") {
            const req = await Geolocation.requestPermissions();
            if (req.location !== "granted") {
              clearTimeout(safetyTimer);
              setLocationError("Autorisez la localisation dans les réglages de l'iPhone pour trouver les synagogues autour de vous.");
              setIsGeolocating(false);
              return;
            }
          }
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 });
          await onSuccess(pos as any);
        } catch (err: any) {
          if (geolocationRequestId.current !== requestId) return;
          clearTimeout(safetyTimer);
          setLocationError(getNativeGeolocationErrorMessage(err));
          setIsGeolocating(false);
        }
      })();
    } else {
      navigator.geolocation.getCurrentPosition(
        onSuccess as PositionCallback,
        (error) => {
          clearTimeout(safetyTimer);
          setLocationError(getGeolocationErrorMessage(error));
          setIsGeolocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 },
      );
    }
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
    <CityContext.Provider value={{ city, cityKey, setCityKey, isGeolocating, geolocate, locationError, triggerAutoGeo, manualAltitude, setManualAltitude }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error("useCity must be used within CityProvider");
  return ctx;
}
