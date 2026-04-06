import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  isNativePlatform,
  requestNativePushPermission,
  registerNativePush,
  onNativePushReceived,
} from "@/lib/capacitorPush";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = "BNYI9Tgykt3mNibxS99dEslhBuB7Ek-69xf0AyPT9iXcSfzA_K_D-amPMuM4F9s3y0lS9g7GDOXF_Va63XcIeIM";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

export function usePushSubscription(synagogueId: string) {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const native = isNativePlatform();

  // --- WEB: Register push service worker ---
  useEffect(() => {
    if (native) return; // skip on native
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setLoading(false);
      return;
    }
    navigator.serviceWorker
      .register("/sw-push.js")
      .then((reg) => setSwRegistration(reg))
      .catch((err) => {
        console.error("SW registration failed:", err);
        setLoading(false);
      });
  }, [native]);

  // --- NATIVE: Listen for push notifications ---
  useEffect(() => {
    if (!native) return;
    onNativePushReceived((notification) => {
      if (notification.title || notification.body) {
        toast(notification.title || "Notification", {
          description: notification.body,
        });
      }
    });
  }, [native]);

  // --- Check existing subscription ---
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (native) {
      // Check if we have a native subscription for this synagogue
      (supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("synagogue_id", synagogueId) as any)
        .eq("push_type", "native")
        .maybeSingle()
        .then(({ data }) => {
          setIsSubscribed(!!data);
          setLoading(false);
        });
      return;
    }

    // Web: check via service worker
    if (!swRegistration) {
      setLoading(false);
      return;
    }

    swRegistration.pushManager.getSubscription().then((sub) => {
      if (sub) {
        const key = sub.getKey("p256dh");
        const auth = sub.getKey("auth");
        if (key && auth) {
          supabase
            .from("push_subscriptions")
            .select("id")
            .eq("user_id", user.id)
            .eq("synagogue_id", synagogueId)
            .eq("endpoint", sub.endpoint)
            .maybeSingle()
            .then(({ data }) => {
              setIsSubscribed(!!data);
              setLoading(false);
            });
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
  }, [swRegistration, user, synagogueId, native]);

  // --- SUBSCRIBE ---
  const subscribe = useCallback(async () => {
    if (!user) {
      console.warn("[Push] No user, skipping subscribe");
      return false;
    }

    if (native) {
      try {
        console.log("[Push] Native platform detected, requesting permission...");
        const granted = await requestNativePushPermission();
        console.log("[Push] Permission granted:", granted);
        if (!granted) return false;

        console.log("[Push] Registering for native push...");
        const deviceToken = await registerNativePush();
        console.log("[Push] Got device token:", deviceToken?.substring(0, 20) + "...");

        const { error } = await supabase.from("push_subscriptions").upsert(
          {
            user_id: user.id,
            synagogue_id: synagogueId,
            push_type: "native",
            device_token: deviceToken,
            endpoint: null,
            p256dh: null,
            auth: null,
          } as never,
          { onConflict: "user_id,synagogue_id,push_type" }
        );

        if (error) {
          console.error("[Push] Native push sub save error:", error);
          return false;
        }

        console.log("[Push] Native subscription saved successfully!");
        setIsSubscribed(true);
        return true;
      } catch (err) {
        console.error("[Push] Native push subscribe error:", err);
        return false;
      }
    }

    // Web push
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

      const toBase64url = (buf: ArrayBuffer) =>
        btoa(String.fromCharCode(...new Uint8Array(buf)))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          synagogue_id: synagogueId,
          endpoint: sub.endpoint,
          p256dh: toBase64url(key),
          auth: toBase64url(auth),
          push_type: "web",
          device_token: null,
        } as never,
        { onConflict: "user_id,synagogue_id,push_type" }
      );

      if (error) {
        console.error("Push sub save error:", error);
        return false;
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error("Push subscribe error:", err);
      return false;
    }
  }, [swRegistration, user, synagogueId, native]);

  // --- UNSUBSCRIBE ---
  const unsubscribe = useCallback(async () => {
    if (!user) return;

    if (native) {
      await (supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id)
        .eq("synagogue_id", synagogueId) as any)
        .eq("push_type", "native");
      setIsSubscribed(false);
      return;
    }

    if (!swRegistration) return;
    const sub = await swRegistration.pushManager.getSubscription();
    if (sub) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id)
        .eq("synagogue_id", synagogueId)
        .eq("endpoint", sub.endpoint);
    }
    setIsSubscribed(false);
  }, [swRegistration, user, synagogueId, native]);

  // On native, push is always "supported"
  const supported = native || ("serviceWorker" in navigator && "PushManager" in window);

  return { isSubscribed, subscribe, unsubscribe, loading, supported };
}
