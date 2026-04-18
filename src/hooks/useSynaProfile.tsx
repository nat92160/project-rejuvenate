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
  const [synagogueId, setSynagogueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = async () => {
      // Check as president first, then as adjoint. Take first match (multi-synagogue support).
      let { data: rows } = await supabase
        .from("synagogue_profiles")
        .select("id, name, logo_url, signature, primary_color, secondary_color, font_family")
        .eq("president_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);
      
      if (!rows || rows.length === 0) {
        const res = await (supabase
          .from("synagogue_profiles")
          .select("id, name, logo_url, signature, primary_color, secondary_color, font_family") as any)
          .eq("adjoint_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1);
        rows = res.data;
      }
      const data = rows && rows[0];
      if (data) {
        setSynagogueId(data.id);
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

  return { profile, synagogueId, loading };
};
