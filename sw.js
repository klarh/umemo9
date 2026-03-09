const CACHE_NAME = "umemo-20260309211518";
const APP_ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./style.css",
  "./favicon.svg",
  "./privacy.html",
  "./terms.html"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n.startsWith("umemo-") && n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Network-only for Google Identity Services and other external origins
  if (url.origin !== self.location.origin) return;

  // Cache-first for app assets, with background revalidation
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "GET_VERSION") {
    e.source.postMessage({ type: "VERSION", version: CACHE_NAME });
  }
  if (e.data && e.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
