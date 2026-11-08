/*
 * ScalMint service-worker retirement.
 *
 * An older deployment registered a service worker that cached the app shell and
 * then failed to synthesise a Response for its fetches
 * ("Failed to convert value to 'Response'"). That left clients pinned to stale
 * HTML and dead JS chunks. This file exists only to replace that worker: it
 * deletes every cache, unregisters itself, and reloads controlled tabs so they
 * fetch the current build from the network.
 *
 * It deliberately registers no `fetch` handler. Do not add caching here.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch {
        // Cache storage can be unavailable (private mode / blocked); the
        // unregister step below is what actually retires this worker.
      }

      try {
        await self.registration.unregister();
      } catch {
        // Nothing else can be done from inside the worker.
      }

      try {
        const windows = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        await Promise.all(
          windows.map((client) =>
            client.navigate(client.url).catch(() => undefined),
          ),
        );
      } catch {
        // A failed reload must not keep the worker alive; clients recover on
        // their next navigation.
      }
    })(),
  );
});
