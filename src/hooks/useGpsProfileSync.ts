import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const GPS_SYNC_KEY = "calj_gps_profile_sync";
const MIN_DISTANCE_KM = 10;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * On native platforms, syncs the user's GPS position to their profile
 * so edge functions can use it for notification timing.
 * Only updates if position changed by > 10km or never synced.
 */
export function useGpsProfileSync() {
  const { user } = useAuth();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (syncedRef.current) return;
    if (!user) return;

    // Works on both native and web — browser geolocation API is used on web
    const doSync = async () => {
      syncedRef.current = true;

      try {
        // Check last sync
        const lastSync = localStorage.getItem(GPS_SYNC_KEY);
        let lastLat: number | null = null;
        let lastLng: number | null = null;
        let lastTime = 0;

        if (lastSync) {
          try {
            const parsed = JSON.parse(lastSync);
            lastLat = parsed.lat;
            lastLng = parsed.lng;
            lastTime = parsed.time || 0;
          } catch { /* ignore */ }
        }

        // Don't sync more than once per 24h
        if (Date.now() - lastTime < 24 * 60 * 60 * 1000 && lastLat !== null) return;

        let latitude: number;
        let longitude: number;

        if (Capacitor.isNativePlatform()) {
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 });
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
        } else {
          // Web fallback — use navigator.geolocation
          if (!navigator.geolocation) return;
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 300000,
            });
          });
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
        }

        // Check if moved significantly
        if (lastLat !== null && lastLng !== null) {
          const dist = haversineKm(lastLat, lastLng, latitude, longitude);
          if (dist < MIN_DISTANCE_KM) {
            // Update timestamp only to avoid re-checking
            localStorage.setItem(GPS_SYNC_KEY, JSON.stringify({ lat: lastLat, lng: lastLng, time: Date.now() }));
            return;
          }
        }

        // Update profile
        await supabase
          .from("profiles")
          .update({ latitude, longitude } as any)
          .eq("user_id", user.id);

        localStorage.setItem(GPS_SYNC_KEY, JSON.stringify({ lat: latitude, lng: longitude, time: Date.now() }));
        console.log("[GPS Sync] Profile GPS updated:", latitude.toFixed(4), longitude.toFixed(4));
      } catch (err) {
        // Silent fail — GPS is optional
        console.debug("[GPS Sync] Could not sync:", err);
      }
    };

    doSync();
  }, [user]);
}
