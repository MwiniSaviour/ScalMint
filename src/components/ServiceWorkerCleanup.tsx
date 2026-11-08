"use client";

import { useEffect } from "react";

/**
 * Retires any previously registered service worker.
 *
 * A stale worker from an older deploy kept serving cached HTML/JS and threw
 * `Failed to convert value to 'Response'` on fetch, leaving the dashboard stuck
 * on an old build. `/sw.js` handles browsers that run an update check; this
 * component catches the same clients on their next successful load and removes
 * the registration so they cannot pin the app again.
 *
 * It only acts when a registration actually exists, so it is a no-op for
 * visitors who never had one.
 */
export function ServiceWorkerCleanup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    void (async () => {
      try {
        const registrations =
          await navigator.serviceWorker.getRegistrations();

        if (cancelled || registrations.length === 0) return;

        await Promise.all(
          registrations.map((registration) => registration.unregister()),
        );

        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }

        if (!cancelled && sessionStorage.getItem("scalmint-sw-retired") !== "1") {
          sessionStorage.setItem("scalmint-sw-retired", "1");
          window.location.reload();
        }
      } catch {
        // Cleanup is best-effort; the /sw.js kill-switch retires the worker on
        // its next update cycle regardless.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
