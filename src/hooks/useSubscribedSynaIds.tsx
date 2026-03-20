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
      const { data } = await supabase
        .from("synagogue_subscriptions")
        .select("synagogue_id")
        .eq("user_id", user.id);
      setSubIds((data || []).map((s: any) => s.synagogue_id));
      setLoading(false);
    })();
  }, [user]);

  return { subIds, loading };
};
