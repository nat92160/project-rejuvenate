import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SiddourRite } from "@/hooks/useSiddourRite";

export interface FullSection {
  index: number;
  title: string;
  heTitle: string;
  isHazara: boolean;
  hebrew: string[];
  french: string[];
}

interface FullOfficeData {
  rite: SiddourRite;
  office: string;
  sections: FullSection[];
}

const CACHE_PREFIX = "siddour_full_v3_";
const TTL = 1000 * 60 * 60 * 24 * 7; // 7 jours

export function useSiddourFullOffice(rite: SiddourRite, office: string) {
  const [data, setData] = useState<FullOfficeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    const cacheKey = `${CACHE_PREFIX}${rite}_${office}`;

    // 1. Cache instantané
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.t && Date.now() - parsed.t < TTL && parsed.d) {
          setData(parsed.d);
          setLoading(false);
        }
      }
    } catch { /* */ }

    // 2. Fetch frais
    (async () => {
      try {
        const { data: resp, error: err } = await supabase.functions.invoke("get-siddour", {
          body: { rite, office, full: true },
        });
        if (cancelled) return;
        if (err) throw err;
        if (resp?.success && resp.sections) {
          const fresh: FullOfficeData = { rite, office, sections: resp.sections };
          setData(fresh);
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), d: fresh }));
          } catch { /* quota */ }
        } else {
          throw new Error(resp?.error || "Réponse invalide");
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [rite, office]);

  return { data, loading, error };
}
