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
          const enabled = payload.new?.value === true;
          setMasterEnabled(enabled);
          try { localStorage.setItem("omer_master_switch", String(enabled)); } catch {}
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Check if we're in the Omer period
  const [inOmerPeriod, setInOmerPeriod] = useState(false);
  // Check if it's before counting time (daytime = sans brakha)
  const [isBeforeCountingTime, setIsBeforeCountingTime] = useState(false);

  useEffect(() => {
    const check = () => {
      try {
        let lat = 31.7683;
        let lng = 35.2137;
        let tz = "Asia/Jerusalem";

        try {
          const stored = localStorage.getItem("calj_gps_city");
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.lat && parsed.lng && parsed.tz) {
              lat = parsed.lat;
              lng = parsed.lng;
              tz = parsed.tz;
            }
          }
        } catch { /* use Jerusalem default */ }

        const now = new Date();
        const jCal = new JewishCalendar(now);
        const omerDay = jCal.getDayOfOmer();

        if (omerDay <= 0) {
          setInOmerPeriod(false);
          setIsBeforeCountingTime(false);
          return;
        }

        setInOmerPeriod(true);

        // Determine if we're before sunset (counting time) → sans brakha note
        const geoLocation = new GeoLocation("User", lat, lng, 0, tz);
        const czc = new ComplexZmanimCalendar(geoLocation);
        czc.setDate(now);

        const sunset = czc.getSunset();
        if (!sunset) {
          setIsBeforeCountingTime(false);
          return;
        }

        const sunsetDate = sunset instanceof Date ? sunset : (sunset as any).toJSDate?.() ?? new Date(sunset as any);
        setIsBeforeCountingTime(now.getTime() < sunsetDate.getTime());
      } catch {
        setInOmerPeriod(true);
        setIsBeforeCountingTime(false);
      }
    };

    check();
    const interval = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const visible = isDirectLink || isAdmin || (masterEnabled && inOmerPeriod);

  return { visible, masterEnabled, loading, inOmerPeriod, isBeforeCountingTime };
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
