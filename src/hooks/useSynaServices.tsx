import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscribedSynaIds } from "@/hooks/useSubscribedSynaIds";

interface SynaServices {
  mikveEnabled: boolean;
  mikveWinterHours: string | null;
  mikveSummerHours: string | null;
  mikvePhone: string | null;
  mikveMapsLink: string | null;
  donationLink: string | null;
}

export function useSynaServices() {
  const { subIds, loading: subLoading } = useSubscribedSynaIds();
  const [services, setServices] = useState<SynaServices | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (subLoading) return;
    if (subIds.length === 0) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await (supabase
        .from("synagogue_profiles")
        .select("mikve_enabled, mikve_winter_hours, mikve_summer_hours, mikve_phone, mikve_maps_link, donation_link") as any)
        .eq("id", subIds[0])
        .maybeSingle();
      if (data) {
        setServices({
          mikveEnabled: data.mikve_enabled || false,
          mikveWinterHours: data.mikve_winter_hours,
          mikveSummerHours: data.mikve_summer_hours,
          mikvePhone: data.mikve_phone,
          mikveMapsLink: data.mikve_maps_link,
          donationLink: data.donation_link,
        });
      }
      setLoading(false);
    })();
  }, [subIds, subLoading]);

  return { services, loading };
}
