// Minimal offline-capable service worker (spec §6).
const CACHE = "recipe-shell-v1";
const SHELL = ["/", "/search", "/add", "/settings", "/manifest.webmanifest"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return; // never cache API
  e.respondWith(
    fetch(request).then((res) => {
      const copy = res.clone();
      if (res.ok && url.origin === location.origin) caches.open(CACHE).then((c) => c.put(request, copy));
      return res;
    }).catch(() => caches.match(request).then((m) => m || caches.match("/")))
  );
});
