/* 國中理化講義站 PWA — 離線快取（Phase 1：第 3 章核心） */
const CACHE_VERSION = "jpwn-pwa-v1";

const PRECACHE = [
  "cover.html",
  "index.html",
  "recap-ch3.html",
  "recap-midterm.html",
  "review.html",
  "sections/3-1.html",
  "sections/3-2.html",
  "sections/3-3.html",
  "sections/3-4.html",
  "css/style.css",
  "js/config.js",
  "js/layout.js",
  "js/app.js",
  "js/site-mode.js",
  "js/cloud-sync.js",
  "js/class-notes.js",
  "js/print-folios.js",
  "js/book-manifest.js",
  "js/live/audio-analyzer.js",
  "js/live/echo-timer.js",
  "animations/embed.css",
  "animations/wave-particle.html",
  "animations/echo-distance.html",
  "animations/echo-timer.html",
  "animations/hearing-range.html",
  "animations/sound-properties.html",
  "animations/audio-lab.html",
  "manifest.webmanifest"
];

function scopeBase() {
  const u = new URL("./", self.location.href);
  return u.href;
}

function scopedUrl(path) {
  return new URL(String(path || "").replace(/^\//, ""), scopeBase()).href;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      await Promise.all(
        PRECACHE.map(async (path) => {
          try {
            await cache.add(scopedUrl(path));
          } catch (err) {
            /* 單檔失敗不阻斷整體安裝 */
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("jpwn-pwa-") && k !== CACHE_VERSION)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function isKatexCdn(url) {
  return url.hostname === "cdn.jsdelivr.net" && url.pathname.includes("/katex/");
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.ok) {
    const cache = await caches.open(CACHE_VERSION);
    cache.put(request, res.clone());
  }
  return res;
}

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, res.clone());
    }
    return res;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await caches.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || network || fetch(request);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    if (isKatexCdn(url)) {
      event.respondWith(staleWhileRevalidate(req));
    }
    return;
  }

  const dest = req.destination;
  const isDoc =
    req.mode === "navigate" ||
    dest === "document" ||
    (dest === "" && /\.html?$/i.test(url.pathname));

  if (isDoc) {
    event.respondWith(networkFirst(req));
    return;
  }

  if (dest === "style" || dest === "script" || dest === "font" || dest === "image") {
    event.respondWith(cacheFirst(req));
    return;
  }

  if (/\.(css|js|html|webmanifest|svg|png|jpg|webp|woff2?)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(req));
  }
});
