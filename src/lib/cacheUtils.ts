/**
 * Cache utilities for clearing all application caches.
 */

/** App version — bump on major data structure changes */
export const APP_VERSION = "2026.03.23.1";

/** Clear all browser caches: Cache API, localStorage data caches, and SW */
export async function clearAllCaches(): Promise<void> {
  // 1. Clear Cache Storage (workbox runtime caches)
  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
  }

  // 2. Clear localStorage items that are data caches (preserve user preferences)
  const preserveKeys = [
    "calj_theme",
    "calj_city",
    "calj_custom_tabs_",
    "chabbat_guest_name",
    "pending_president_request",
  ];

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !preserveKeys.some((p) => key.startsWith(p))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));

  // 3. Clear sessionStorage
  sessionStorage.clear();

  // 4. Unregister and re-register service workers
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((r) => r.unregister()));
  }
}
