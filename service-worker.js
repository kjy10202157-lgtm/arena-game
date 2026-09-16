const CACHE = "neon-clash-v54";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./game.js",
  "./profile-system.js",
  "./profile-ui.js",
  "./profile.css",
  "./arena-obstacles.js",
  "./feedback.js",
  "./online.html",
  "./online.css",
  "./online-config.js",
  "./online6.js",
  "./manifest.webmanifest",
  "./privacy.html",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("neon-clash-") && key !== CACHE).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).then(async response => {
      if (response.ok) {
        const copy = response.clone();
        try { await (await caches.open(CACHE)).put(event.request, copy); } catch {}
      }
      return response;
    }).catch(() =>
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(event.request, {ignoreSearch:true});
        if (cached) return cached;
        if (event.request.mode === "navigate") return (await cache.match("./index.html")) || Response.error();
        return Response.error();
      })
    )
  );
});

