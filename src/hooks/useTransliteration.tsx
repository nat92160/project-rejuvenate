import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isInstructionOnly } from "@/lib/utils";

const CACHE_PREFIX = "translit_v2_";

export type ViewMode = "hebrew" | "phonetic";

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
      // Only send real prayer verses to the AI, not instruction-only lines
      const indexMap: number[] = [];
      const prayerVerses: string[] = [];
      verses.forEach((v, i) => {
        if (!isInstructionOnly(v) && v.replace(/<[^>]*>/g, '').trim().length > 0) {
          indexMap.push(i);
          prayerVerses.push(v);
        }
      });

      const { data, error } = await supabase.functions.invoke("transliterate", {
        body: { verses: prayerVerses },
      });
      if (error) throw error;

      if (data?.transliterations) {
        // Map AI results back to original indices
        const fullArray: string[] = new Array(verses.length).fill('');
        data.transliterations.forEach((t: string, ai: number) => {
          if (ai < indexMap.length) {
            fullArray[indexMap[ai]] = t;
          }
        });
        setTransliterations(fullArray);
        try {
          localStorage.setItem(`${CACHE_PREFIX}${cacheKey}`, JSON.stringify(fullArray));
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
