import { useCallback, useEffect, useState } from "react";

export type SiddourRite = "sefarade" | "ashkenaz";
const KEY = "siddour_rite_v1";

export function useSiddourRite() {
  const [rite, setRiteState] = useState<SiddourRite>(() => {
    try {
      const v = localStorage.getItem(KEY);
      return v === "ashkenaz" ? "ashkenaz" : "sefarade";
    } catch { return "sefarade"; }
  });

  const setRite = useCallback((r: SiddourRite) => {
    setRiteState(r);
    try { localStorage.setItem(KEY, r); } catch { /* */ }
  }, []);

  // sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) setRiteState(e.newValue === "ashkenaz" ? "ashkenaz" : "sefarade");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { rite, setRite };
}
