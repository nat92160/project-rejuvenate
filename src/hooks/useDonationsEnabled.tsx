import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Reads the global kill-switch `donations_disabled_global` from app_settings.
 * When `disabled` is true, donations features should be hidden across the app.
 */
export const useDonationsEnabled = () => {
  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "donations_disabled_global")
        .maybeSingle();
      if (!cancelled) {
        setDisabled(data?.value === true || data?.value === "true");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { disabled, loading, enabled: !disabled };
};

export const setDonationsDisabledGlobal = async (disabled: boolean) => {
  return supabase.from("app_settings").upsert(
    { key: "donations_disabled_global", value: disabled as any, updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
};