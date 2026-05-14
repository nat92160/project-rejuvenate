import { useState, useEffect } from "react";
import type { SynaProfile } from "@/components/poster/MasterPosterTemplate";
import { useManagedSynagogues } from "@/hooks/useManagedSynagogues";

const DEFAULT_PROFILE: SynaProfile = {
  name: "",
  logo_url: null,
  signature: "",
  primary_color: "#1e3a5f",
  secondary_color: "#C5A059",
  font_family: "Lora",
};

export const useSynaProfile = () => {
  const { selectedSynagogue, synagogueId, loading } = useManagedSynagogues();
  const [profile, setProfile] = useState<SynaProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    if (!selectedSynagogue) {
      setProfile(DEFAULT_PROFILE);
      return;
    }
    setProfile({
      name: selectedSynagogue.name || "",
      logo_url: selectedSynagogue.logo_url,
      signature: selectedSynagogue.signature || "",
      primary_color: selectedSynagogue.primary_color || "#1e3a5f",
      secondary_color: selectedSynagogue.secondary_color || "#C5A059",
      font_family: selectedSynagogue.font_family || "Lora",
    });
  }, [selectedSynagogue]);

  return { profile, synagogueId, loading };
};
