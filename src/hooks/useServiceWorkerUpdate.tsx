import { useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

const UPDATE_TOAST_ID = "service-worker-update";

/**
 * Detects new service worker versions and prompts user to reload.
 * Avoids duplicate toasts and waits for the new worker to take control
 * before reloading the page.
 */
export function useServiceWorkerUpdate() {
  const hasShownUpdateRef = useRef(false);
  const isRefreshingRef = useRef(false);

  const handleUpdate = useCallback((registration: ServiceWorkerRegistration) => {
    if (hasShownUpdateRef.current || isRefreshingRef.current) return;

    hasShownUpdateRef.current = true;

    toast("🔄 Nouvelle version disponible", {
      id: UPDATE_TOAST_ID,
      description: "L'application a été mise à jour.",
      duration: Infinity,
      action: {
        label: "Actualiser",
        onClick: () => {
          if (isRefreshingRef.current) return;

          isRefreshingRef.current = true;
          toast.dismiss(UPDATE_TOAST_ID);
          registration.waiting?.postMessage({ type: "SKIP_WAITING" });
        },
      },
      onDismiss: () => {
        if (!isRefreshingRef.current) {
          hasShownUpdateRef.current = false;
        }
      },
    });
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const isPreviewHost =
      window.location.hostname.includes("id-preview--") ||
      window.location.hostname.includes("lovableproject.com");

    if (isPreviewHost) return;

    let interval: number | undefined;

    const onUpdateFound = (registration: ServiceWorkerRegistration) => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          handleUpdate(registration);
        }
      });
    };

    const onControllerChange = () => {
      if (isRefreshingRef.current) {
        window.location.reload();
      }
    };

    const start = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;

        if (registration.waiting) {
          handleUpdate(registration);
        }

        registration.addEventListener("updatefound", () => onUpdateFound(registration));

        interval = window.setInterval(() => {
          registration.update().catch(() => undefined);
        }, 60_000);
      } catch {
        // Ignore service worker errors
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    void start();

    return () => {
      if (interval) {
        window.clearInterval(interval);
      }
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, [handleUpdate]);
}
