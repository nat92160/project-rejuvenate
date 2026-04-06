import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isNativePlatform, requestNativePushPermission, registerNativePush } from "@/lib/capacitorPush";

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

function getLocationData() {
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
  if (tz === "Europe/Paris") {
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch {}
  }
  return { lat, lng, tz };
}

/**
 * Push subscription for Omer reminders — works WITHOUT authentication.
 * Supports both Web Push (guests on browser) and Native Push (iOS/Android).
 */
export function useOmerPushSubscription() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const native = isNativePlatform();

  const webSupported = !native && "serviceWorker" in navigator && "PushManager" in window;
  const supported = native || webSupported;

  // Register SW (web only)
  useEffect(() => {
    if (native) {
      // Check localStorage for native subscription state
      setIsSubscribed(localStorage.getItem("omer_native_push") === "true");
      setLoading(false);
      return;
    }
    if (!webSupported) { setLoading(false); return; }
    navigator.serviceWorker
      .register("/sw-push.js")
      .then((reg) => setSwRegistration(reg))
      .catch(() => setLoading(false));
  }, [native, webSupported]);

  // Check existing web subscription
  useEffect(() => {
    if (native || !swRegistration) { if (!native) setLoading(false); return; }
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
  }, [swRegistration, native]);

  const subscribe = useCallback(async () => {
    const { lat, lng, tz } = getLocationData();

    // ─── Native push path ───
    if (native) {
      try {
        console.log("[OmerPush] Native path: requesting permission...");
        const granted = await requestNativePushPermission();
        console.log("[OmerPush] Permission granted:", granted);
        if (!granted) return false;
        const deviceToken = await registerNativePush();
        console.log("[OmerPush] Device token received:", deviceToken ? "yes" : "no");
        if (!deviceToken) return false;

        const { error } = await (supabase
          .from("omer_push_subscriptions" as any) as any)
          .upsert(
            {
              endpoint: `apns://${deviceToken}`,
              p256dh: "native",
              auth: "native",
              latitude: lat,
              longitude: lng,
              timezone: tz,
            },
            { onConflict: "endpoint" }
          );

        if (error) { console.error("[OmerPush] DB upsert error:", error); return false; }
        localStorage.setItem("omer_native_push", "true");
        localStorage.setItem("omer_native_token", deviceToken);
        setIsSubscribed(true);
        return true;
      } catch (err) {
        console.error("[OmerPush] Native push error:", err);
        return false;
      }
    }

    // ─── Web push path ───
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
  }, [swRegistration, native]);

  const unsubscribe = useCallback(async () => {
    if (native) {
      const token = localStorage.getItem("omer_native_token");
      if (token) {
        await (supabase
          .from("omer_push_subscriptions" as any)
          .delete() as any)
          .eq("endpoint", `apns://${token}`);
      }
      localStorage.removeItem("omer_native_push");
      localStorage.removeItem("omer_native_token");
      setIsSubscribed(false);
      return;
    }

    if (!swRegistration) return;
    const sub = await swRegistration.pushManager.getSubscription();
    if (sub) {
      await (supabase
        .from("omer_push_subscriptions" as any)
        .delete() as any)
        .eq("endpoint", sub.endpoint);
    }
    setIsSubscribed(false);
  }, [swRegistration, native]);

  return { isSubscribed, subscribe, unsubscribe, loading, supported };
}
