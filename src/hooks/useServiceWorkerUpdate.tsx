import { useEffect, useCallback } from "react";
import { toast } from "sonner";

/**
 * Detects new service worker versions and prompts user to reload.
 * Uses workbox-window for clean SW lifecycle management.
 */
export function useServiceWorkerUpdate() {
  const handleUpdate = useCallback((registration: ServiceWorkerRegistration) => {
    toast("🔄 Nouvelle version disponible", {
      description: "L'application a été mise à jour.",
      duration: Infinity,
      action: {
        label: "Actualiser",
        onClick: () => {
          registration.waiting?.postMessage({ type: "SKIP_WAITING" });
          window.location.reload();
        },
      },
    });
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const checkForUpdates = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;

        // Check if there's already a waiting SW
        if (registration.waiting) {
          handleUpdate(registration);
          return;
        }

        // Listen for new SW installing
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              handleUpdate(registration);
            }
          });
        });

        // Periodic check every 60 seconds
        const interval = setInterval(() => {
          registration.update().catch(() => {});
        }, 60_000);

        return () => clearInterval(interval);
      } catch {
        // SW not supported or error
      }
    };

    // Also listen for controller change (another tab triggered skipWaiting)
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    checkForUpdates();

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, [handleUpdate]);
}
