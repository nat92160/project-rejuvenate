import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { SynaProfile } from "@/components/poster/MasterPosterTemplate";

const DEFAULT_PROFILE: SynaProfile = {
  name: "",
  logo_url: null,
  signature: "",
  primary_color: "#1e3a5f",
  secondary_color: "#C5A059",
  font_family: "Lora",
};

export const useSynaProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<SynaProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = async () => {
      const { data } = await supabase
        .from("synagogue_profiles")
        .select("name, logo_url, signature, primary_color, secondary_color, font_family")
        .eq("president_id", user.id)
        .maybeSingle();
      if (data) {
        setProfile({
          name: data.name || "",
          logo_url: data.logo_url,
          signature: data.signature || "",
          primary_color: data.primary_color || "#1e3a5f",
          secondary_color: data.secondary_color || "#C5A059",
          font_family: data.font_family || "Lora",
        });
      }
      setLoading(false);
    };
    void load();
  }, [user]);

  return { profile, loading };
};
