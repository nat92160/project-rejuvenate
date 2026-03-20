import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const LOCAL_KEY = "affiche_chabbat_data";

export interface ShabbatFormData {
  synaName: string;
  synaAddress: string;
  synaRav: string;
  minhaFri: string;
  kabbalat: string;
  arvitFri: string;
  shaharit: string;
  moussaf: string;
  minhaSat: string;
  arvitMotse: string;
  sponsor: string;
  announce: string;
  ravMessage: string;
  notes: Record<string, string>;
  theme: string;
  font: string;
  torahReader: string;
  shiourSamedi: string;
  freeNote: string;
}

const EMPTY: ShabbatFormData = {
  synaName: "Ma Synagogue",
  synaAddress: "",
  synaRav: "",
  minhaFri: "",
  kabbalat: "",
  arvitFri: "",
  shaharit: "08:30",
  moussaf: "",
  minhaSat: "",
  arvitMotse: "",
  sponsor: "",
  announce: "",
  ravMessage: "",
  notes: {
    candleLighting: "", minhaFri: "", kabbalat: "", arvitFri: "",
    shaharit: "", torahReading: "", moussaf: "", minhaSat: "",
    havdalah: "", arvitMotse: "",
  },
  theme: "prestige",
  font: "greatvibes",
  torahReader: "",
  shiourSamedi: "",
  freeNote: "",
};

const loadLocal = (): Partial<ShabbatFormData> => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const useShabbatPosterData = () => {
  const { user } = useAuth();
  const [data, setData] = useState<ShabbatFormData>(() => ({ ...EMPTY, ...loadLocal() }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const loadedFromDb = useRef(false);

  // Load from DB on mount (overrides localStorage)
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = async () => {
      const { data: row } = await supabase
        .from("shabbat_posters")
        .select("form_data")
        .eq("user_id", user.id)
        .maybeSingle();
      if (row?.form_data && typeof row.form_data === "object") {
        const dbData = row.form_data as Partial<ShabbatFormData>;
        setData((prev) => ({ ...prev, ...dbData }));
        loadedFromDb.current = true;
      }
      setLoading(false);
    };
    void load();
  }, [user]);

  // Keep localStorage in sync as fallback
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    } catch {}
  }, [data]);

  const save = useCallback(async () => {
    if (!user) {
      toast.error("Connectez-vous pour sauvegarder");
      return;
    }
    setSaving(true);
    // Check if row exists
    const { data: existing } = await supabase
      .from("shabbat_posters")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const payload = JSON.parse(JSON.stringify(data));
    let error;
    if (existing) {
      ({ error } = await supabase
        .from("shabbat_posters")
        .update({ form_data: payload })
        .eq("user_id", user.id));
    } else {
      ({ error } = await supabase
        .from("shabbat_posters")
        .insert([{ user_id: user.id, form_data: payload }]));
    }
    setSaving(false);
    if (error) {
      console.error("Save error:", error);
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Données sauvegardées !");
    }
  }, [user, data]);

  return { data, setData, loading, saving, save };
};
