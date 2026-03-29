import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Determines whether the Omer widget should be visible.
 *
 * Visible when ANY of these is true:
 *  A) User arrived via /omer (direct link)
 *  B) User is admin
 *  C) The global "omer_enabled" master switch is ON
 */
export function useOmerVisibility({ isDirectLink = false }: { isDirectLink?: boolean } = {}) {
  const { isAdmin } = useAuth();
  const [masterEnabled, setMasterEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSetting = async () => {
      const { data } = await supabase
        .from("app_settings" as any)
        .select("value")
        .eq("key", "omer_enabled")
        .maybeSingle();
      setMasterEnabled(data?.value === true);
      setLoading(false);
    };

    fetchSetting();

    // Realtime subscription for instant toggle propagation
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

  const visible = isDirectLink || isAdmin || masterEnabled;

  return { visible, masterEnabled, loading };
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
