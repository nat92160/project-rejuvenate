import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function usePendingRequests() {
  const { user, dbRole } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user || dbRole !== "admin") {
      setCount(0);
      return;
    }

    const fetch = async () => {
      const { count: c } = await supabase
        .from("president_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      setCount(c ?? 0);
    };

    fetch();

    // Poll every 30s
    const interval = setInterval(fetch, 30_000);
    return () => clearInterval(interval);
  }, [user, dbRole]);

  return count;
}
