import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SiddourRite } from "@/hooks/useSiddourRite";

const CACHE_PREFIX = "siddour_cmt_v1_";
const TTL = 1000 * 60 * 60 * 24 * 30;

function cacheKey(rite: SiddourRite, office: string, sectionIndex: number) {
  return `${CACHE_PREFIX}${rite}_${office}_${sectionIndex}`;
}

export function useSiddourCommentary(rite: SiddourRite, office: string, sectionIndex: number) {
  const [paragraphs, setParagraphs] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setParagraphs(null);
    try {
      const raw = localStorage.getItem(cacheKey(rite, office, sectionIndex));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.t && Date.now() - parsed.t < TTL && Array.isArray(parsed?.p)) {
          setParagraphs(parsed.p);
        }
      }
    } catch { /* */ }
  }, [rite, office, sectionIndex]);

  const generate = useCallback(async (hebrew: string[], title: string) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("comment-siddour-section", {
        body: { hebrew, title, rite },
      });
      if (invokeErr) throw invokeErr;
      if (!data?.success) throw new Error(data?.error || "Échec de la génération");
      const p: string[] = Array.isArray(data.paragraphs) ? data.paragraphs : [];
      setParagraphs(p);
      try {
        localStorage.setItem(cacheKey(rite, office, sectionIndex), JSON.stringify({ t: Date.now(), p }));
      } catch { /* */ }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [rite, office, sectionIndex, loading]);

  return { paragraphs, loading, error, generate };
}