import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const CACHE_PREFIX = "translit_v1_";

export type ViewMode = "hebrew" | "phonetic" | "bilingual";

export function useTransliteration() {
  const [transliterations, setTransliterations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTransliteration = useCallback(async (verses: string[], cacheKey: string) => {
    // Check cache
    const cached = localStorage.getItem(`${CACHE_PREFIX}${cacheKey}`);
    if (cached) {
      try {
        setTransliterations(JSON.parse(cached));
        return;
      } catch { /* ignore */ }
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("transliterate", {
        body: { verses },
      });
      if (error) throw error;
      if (data?.transliterations) {
        setTransliterations(data.transliterations);
        try {
          localStorage.setItem(`${CACHE_PREFIX}${cacheKey}`, JSON.stringify(data.transliterations));
        } catch { /* ignore */ }
      }
    } catch (err) {
      console.error("Transliteration error:", err);
    }
    setLoading(false);
  }, []);

  const clearTransliterations = useCallback(() => {
    setTransliterations([]);
  }, []);

  return { transliterations, loading, fetchTransliteration, clearTransliterations };
}
