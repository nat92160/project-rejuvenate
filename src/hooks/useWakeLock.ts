import { useEffect, useRef } from "react";

export function useWakeLock(active: boolean) {
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active) {
      wakeLock.current?.release().catch(() => {});
      wakeLock.current = null;
      return;
    }

    const request = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock.current = await navigator.wakeLock.request("screen");
        }
      } catch { /* user denied or not supported */ }
    };

    request();

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && active) request();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      wakeLock.current?.release().catch(() => {});
      wakeLock.current = null;
    };
  }, [active]);
}
