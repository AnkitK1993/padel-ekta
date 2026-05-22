const CACHE = "ekta-padel-v3";
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
  // Delete ALL caches with a different name — wipes any stale "ekta-padel" or "ekta-padel-v2"
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
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

  // On page navigation: always serve cache immediately so there is never a blank error page.
  // checkForUpdates() runs in the background — if buildinfo.json changed it re-caches all
  // static files and sends NEW_BUILD → the client reloads automatically with fresh code.
  if (e.request.mode === "navigate") {
    e.respondWith(
      caches.match(e.request, { ignoreSearch: true }).then(cached => {
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

  // Cache-first for static assets
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
