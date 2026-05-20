import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** Returns the list of synagogue IDs the current user is subscribed to */
export const useSubscribedSynaIds = () => {
  const { user } = useAuth();
  const [subIds, setSubIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setSubIds([]); setLoading(false); return; }
    (async () => {
      const [subsRes, presRes, adjRes] = await Promise.all([
        supabase.from("synagogue_subscriptions").select("synagogue_id").eq("user_id", user.id),
        (supabase.from("synagogue_profiles").select("id") as any).eq("president_id", user.id),
        (supabase.from("synagogue_profiles").select("id") as any).eq("adjoint_id", user.id),
      ]);
      const all = new Set<string>();
      (subsRes.data || []).forEach((s: any) => s.synagogue_id && all.add(s.synagogue_id));
      (presRes.data || []).forEach((s: any) => s.id && all.add(s.id));
      (adjRes.data || []).forEach((s: any) => s.id && all.add(s.id));
      setSubIds(Array.from(all));
      setLoading(false);
    })();
  }, [user]);

  return { subIds, loading };
};
