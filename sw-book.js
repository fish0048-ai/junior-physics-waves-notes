self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.indexOf("jpwn-book") === 0).map((k) => caches.delete(k)));
    } catch (err) {
      /* ignore */
    }
    await self.registration.unregister();
  })());
});
