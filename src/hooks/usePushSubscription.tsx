import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const VAPID_PUBLIC_KEY = "BPEw1AhklkYgH1yJk9BrOmGhJfxTRGNMrHPpyBnLNd13gQpl8LB6TibiN0zd9XqJqXMTin7DidhxV9-mwjdOF6M";

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

  // Register push service worker
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setLoading(false);
      return;
    }

    navigator.serviceWorker
      .register("/sw-push.js")
      .then((reg) => {
        setSwRegistration(reg);
      })
      .catch((err) => {
        console.error("SW registration failed:", err);
        setLoading(false);
      });
  }, []);

  // Check existing subscription
  useEffect(() => {
    if (!swRegistration || !user) {
      setLoading(false);
      return;
    }

    swRegistration.pushManager.getSubscription().then((sub) => {
      if (sub) {
        // Check if this subscription is saved for this synagogue
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
  }, [swRegistration, user, synagogueId]);

  const subscribe = useCallback(async () => {
    if (!swRegistration || !user) return false;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return false;

      let sub = await swRegistration.pushManager.getSubscription();
      if (!sub) {
        sub = await swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
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
        } as never,
        { onConflict: "user_id,endpoint,synagogue_id" }
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
  }, [swRegistration, user, synagogueId]);

  const unsubscribe = useCallback(async () => {
    if (!swRegistration || !user) return;

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
  }, [swRegistration, user, synagogueId]);

  const supported = "serviceWorker" in navigator && "PushManager" in window;

  return { isSubscribed, subscribe, unsubscribe, loading, supported };
}
