import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SiddourRite } from "@/hooks/useSiddourRite";

const CACHE_PREFIX = "siddour_fr_v1_";
const TTL = 1000 * 60 * 60 * 24 * 30; // 30 jours

function cacheKey(rite: SiddourRite, office: string, sectionIndex: number) {
  return `${CACHE_PREFIX}${rite}_${office}_${sectionIndex}`;
}

export function useSiddourTranslation(
  rite: SiddourRite,
  office: string,
  sectionIndex: number,
) {
  const [french, setFrench] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger depuis le cache au montage / changement de section
  useEffect(() => {
    setError(null);
    setFrench(null);
    try {
      const raw = localStorage.getItem(cacheKey(rite, office, sectionIndex));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.t && Date.now() - parsed.t < TTL && Array.isArray(parsed?.fr)) {
          setFrench(parsed.fr);
        }
      }
    } catch { /* ignore */ }
  }, [rite, office, sectionIndex]);

  const translate = useCallback(
    async (hebrew: string[], title: string) => {
      if (loading) return;
      setLoading(true);
      setError(null);
      try {
        const { data, error: invokeErr } = await supabase.functions.invoke(
          "translate-siddour-section",
          { body: { hebrew, title } },
        );
        if (invokeErr) throw invokeErr;
        if (!data?.success) throw new Error(data?.error || "Échec de la traduction");
        const fr: string[] = Array.isArray(data.french) ? data.french : [];
        setFrench(fr);
        try {
          localStorage.setItem(
            cacheKey(rite, office, sectionIndex),
            JSON.stringify({ t: Date.now(), fr }),
          );
        } catch { /* quota */ }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erreur de traduction");
      } finally {
        setLoading(false);
      }
    },
    [rite, office, sectionIndex, loading],
  );

  return { french, loading, error, translate };
}