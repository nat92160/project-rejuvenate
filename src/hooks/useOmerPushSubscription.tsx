import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isNativePlatform } from "@/lib/capacitorPush";

const VAPID_PUBLIC_KEY = "BNYI9Tgykt3mNibxS99dEslhBuB7Ek-69xf0AyPT9iXcSfzA_K_D-amPMuM4F9s3y0lS9g7GDOXF_Va63XcIeIM";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

function toBase64url(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Push subscription for Omer reminders — works WITHOUT authentication.
 * Uses the `omer_push_subscriptions` table (no user_id required).
 */
export function useOmerPushSubscription() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const native = isNativePlatform();

  // Only web push supported for guests
  const supported = !native && "serviceWorker" in navigator && "PushManager" in window;

  // Register SW
  useEffect(() => {
    if (!supported) { setLoading(false); return; }
    navigator.serviceWorker
      .register("/sw-push.js")
      .then((reg) => setSwRegistration(reg))
      .catch(() => setLoading(false));
  }, [supported]);

  // Check existing subscription
  useEffect(() => {
    if (!swRegistration) { setLoading(false); return; }
    swRegistration.pushManager.getSubscription().then(async (sub) => {
      if (sub) {
        const { data } = await (supabase
          .from("omer_push_subscriptions" as any)
          .select("id") as any)
          .eq("endpoint", sub.endpoint)
          .maybeSingle();
        setIsSubscribed(!!data);
      }
      setLoading(false);
    });
  }, [swRegistration]);

  const subscribe = useCallback(async () => {
    if (!swRegistration) return false;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return false;

      let sub = await swRegistration.pushManager.getSubscription();
      if (!sub) {
        sub = await swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
        });
      }

      const key = sub.getKey("p256dh");
      const auth = sub.getKey("auth");
      if (!key || !auth) return false;

      // Grab user location for tzeit-based reminders
      let lat: number | null = null;
      let lng: number | null = null;
      let tz = "Europe/Paris";
      try {
        const stored = localStorage.getItem("calj_gps_city");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.lat && parsed.lng) { lat = parsed.lat; lng = parsed.lng; }
          if (parsed.tz) tz = parsed.tz;
        }
      } catch { /* use defaults */ }

      // Fallback: try Intl timezone
      if (tz === "Europe/Paris") {
        try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch {}
      }

      const { error } = await (supabase
        .from("omer_push_subscriptions" as any) as any)
        .upsert(
          {
            endpoint: sub.endpoint,
            p256dh: toBase64url(key),
            auth: toBase64url(auth),
            latitude: lat,
            longitude: lng,
            timezone: tz,
          },
          { onConflict: "endpoint" }
        );

      if (error) { console.error("Omer push sub error:", error); return false; }
      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error("Omer push subscribe error:", err);
      return false;
    }
  }, [swRegistration]);

  const unsubscribe = useCallback(async () => {
    if (!swRegistration) return;
    const sub = await swRegistration.pushManager.getSubscription();
    if (sub) {
      await (supabase
        .from("omer_push_subscriptions" as any)
        .delete() as any)
        .eq("endpoint", sub.endpoint);
    }
    setIsSubscribed(false);
  }, [swRegistration]);

  return { isSubscribed, subscribe, unsubscribe, loading, supported };
}
