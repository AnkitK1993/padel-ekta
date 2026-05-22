const CACHE = "ekta-padel";
const BUILD_KEY = "/__buildv__";
const BASE = self.registration.scope;
const STATIC = [
  BASE,
  BASE + "index.html",
  BASE + "styles.css",
  BASE + "app.js",
  BASE + "utils.js",
  BASE + "icons/icon.svg"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(self.clients.claim());
});

// Fetch buildinfo.json from network, compare to stored version.
// If changed: wipe and re-cache all static files, return true.
async function checkForUpdates() {
  try {
    const res = await fetch(BASE + "buildinfo.json", { cache: "no-store" });
    const { v } = await res.json();
    const c = await caches.open(CACHE);
    const stored = await c.match(BUILD_KEY);
    const storedV = stored ? await stored.text() : null;
    if (storedV === String(v)) return false;
    // New build detected — replace entire cache
    await caches.delete(CACHE);
    const fresh = await caches.open(CACHE);
    await fresh.addAll(STATIC);
    await fresh.put(BUILD_KEY, new Response(String(v)));
    return true;
  } catch {
    return false;
  }
}

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // Network-first for Firebase / Firestore
  if (
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("firebase") ||
    url.hostname.includes("identitytoolkit.googleapis.com")
  ) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // On page navigation: respect hard refresh (cache:"reload"), otherwise serve cache + background update
  if (e.request.mode === "navigate") {
    // Hard refresh sends cache:"reload" — bypass SW cache, fetch fresh, then re-cache
    if (e.request.cache === "reload") {
      e.respondWith(
        fetch(e.request).then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          }
          return res;
        }).catch(() => caches.match(e.request))
      );
      return;
    }
    e.respondWith(
      caches.match(e.request).then(cached => {
        checkForUpdates().then(updated => {
          if (updated) {
            self.clients.matchAll().then(clients =>
              clients.forEach(c => c.postMessage({ type: "NEW_BUILD" }))
            );
          }
        });
        return cached || fetch(e.request);
      })
    );
    return;
  }

  // Cache-first for all other static assets (hard refresh bypasses for these too)
  if (e.request.cache === "reload") {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.status === 200 && e.request.method === "GET") {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && e.request.method === "GET") {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      });
    })
  );
});
