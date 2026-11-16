/* Referee Finance: keeps the app working with no connection.
   Pages: try the network first (so updates show up), fall back to the saved copy.
   Fonts and icons: saved copy first, refreshed in the background. */
const CACHE = "rf-shell-v2";
const SHELL = ["./", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const font = /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin === location.origin && (req.mode === "navigate" || /\.html?$/.test(url.pathname) || url.pathname.endsWith("/"))) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req.mode === "navigate" ? "./" : req, copy)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then((m) => m || caches.match("./")))
    );
  } else if (url.origin === location.origin || font) {
    e.respondWith(
      caches.match(req).then((m) => {
        const net = fetch(req).then((res) => { if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; }).catch(() => m);
        return m || net;
      })
    );
  }
});
