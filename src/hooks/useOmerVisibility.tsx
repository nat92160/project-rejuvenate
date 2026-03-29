import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCity } from "@/hooks/useCity";
import { ComplexZmanimCalendar, GeoLocation, JewishCalendar } from "kosher-zmanim";

/**
 * Determines whether the Omer widget should be visible.
 *
 * Visible when ANY of these is true:
 *  A) User arrived via /omer (direct link) — bypasses ALL restrictions
 *  B) User is admin — always visible
 *  C) Master switch ON + currently in Omer period + within 2h before Shkiya or after
 */
export function useOmerVisibility({ isDirectLink = false }: { isDirectLink?: boolean } = {}) {
  const { isAdmin } = useAuth();
  const [masterEnabled, setMasterEnabled] = useState(() => {
    // Hydrate from localStorage cache to survive app restarts
    try { return localStorage.getItem("omer_master_switch") === "true"; } catch { return false; }
  });
  const [loading, setLoading] = useState(true);
  const [geoVisible, setGeoVisible] = useState(false);

  // Fetch master switch (with localStorage persistence)
  useEffect(() => {
    const fetchSetting = async () => {
      const { data } = await (supabase
        .from("app_settings" as any)
        .select("value") as any)
        .eq("key", "omer_enabled")
        .maybeSingle();
      const enabled = data?.value === true;
      setMasterEnabled(enabled);
      try { localStorage.setItem("omer_master_switch", String(enabled)); } catch {}
      setLoading(false);
    };

    fetchSetting();

    const channel = supabase
      .channel("app_settings_omer")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "app_settings", filter: "key=eq.omer_enabled" },
        (payload: any) => {
          setMasterEnabled(payload.new?.value === true);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Geo-temporal check: is it Omer period AND within 2h before Shkiya?
  useEffect(() => {
    const check = () => {
      try {
        // Use Jerusalem as default fallback
        let lat = 31.7683;
        let lng = 35.2137;
        let tz = "Asia/Jerusalem";

        // Try to get user city from localStorage
        try {
          const stored = localStorage.getItem("calj_gps_city");
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.lat && parsed.lng && parsed.tz) {
              lat = parsed.lat;
              lng = parsed.lng;
              tz = parsed.tz;
            }
          } else {
            const cityKey = localStorage.getItem("calj_city");
            if (cityKey) {
              // We can't import CITIES directly here without circular deps risk,
              // but the common case is covered by gps_city above.
              // For non-GPS users, we'll use a simple approach.
            }
          }
        } catch { /* use Jerusalem default */ }

        const now = new Date();

        // Check if we're in Omer period using JewishCalendar
        const jCal = new JewishCalendar(now);
        const omerDay = jCal.getDayOfOmer();

        if (omerDay <= 0) {
          setGeoVisible(false);
          return;
        }

        // We're in the Omer period — check if within 2h before Shkiya
        const geoLocation = new GeoLocation("User", lat, lng, 0, tz);
        const czc = new ComplexZmanimCalendar(geoLocation);
        czc.setDate(now);

        const sunset = czc.getSunset();
        if (!sunset) {
          // Can't determine sunset — show the widget to be safe
          setGeoVisible(true);
          return;
        }

        const sunsetDate = sunset instanceof Date ? sunset : (sunset as any).toJSDate?.() ?? new Date(sunset as any);
        const sunsetMs = sunsetDate.getTime();
        const nowMs = now.getTime();
        const twoHoursBefore = sunsetMs - (2 * 60 * 60 * 1000);

        // Show if we're within 2h before sunset or after sunset (evening counting time)
        setGeoVisible(nowMs >= twoHoursBefore);
      } catch {
        // On error, show the widget to be safe
        setGeoVisible(true);
      }
    };

    check();
    // Re-check every 5 minutes
    const interval = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const visible = isDirectLink || isAdmin || (masterEnabled && geoVisible);

  return { visible, masterEnabled, loading, geoVisible };
}

/**
 * Toggle the master switch (admin only).
 */
export async function toggleOmerMasterSwitch(newValue: boolean) {
  const { error } = await (supabase
    .from("app_settings" as any) as any)
    .update({ value: newValue, updated_at: new Date().toISOString() })
    .eq("key", "omer_enabled");
  return { error };
}
