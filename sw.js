const STATIC_CACHE = "ekta-padel-static-v6";
const RUNTIME_CACHE = "ekta-padel-runtime-v1";
const BUILD_KEY = "/__buildv__";
const BASE = self.registration.scope;
const STATIC = [
  BASE,
  BASE + "index.html",
  BASE + "styles.css",
  BASE + "app.js",
  BASE + "utils.js",
  BASE + "icons/icon.svg",
];
const RUNTIME_MAX_ENTRIES = 40;

async function cacheStaticAssets(buildVersion) {
  const cache = await caches.open(STATIC_CACHE);
  await cache.addAll(STATIC);
  if (buildVersion !== undefined) {
    await cache.put(BUILD_KEY, new Response(String(buildVersion)));
  }
}

self.addEventListener("install", (e) => {
  e.waitUntil(cacheStaticAssets().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function trimRuntimeCache() {
  const cache = await caches.open(RUNTIME_CACHE);
  const keys = await cache.keys();
  if (keys.length <= RUNTIME_MAX_ENTRIES) return;
  await Promise.all(
    keys.slice(0, keys.length - RUNTIME_MAX_ENTRIES).map((key) => cache.delete(key)),
  );
}

async function putRuntime(request, response) {
  if (!response || response.status !== 200 || request.method !== "GET") return;
  const cache = await caches.open(RUNTIME_CACHE);
  await cache.put(request, response.clone());
  await trimRuntimeCache();
}

// Fetch buildinfo.json from network, compare to stored version.
// If changed: wipe and re-cache static files, return true.
async function checkForUpdates() {
  try {
    const res = await fetch(BASE + "buildinfo.json", { cache: "no-store" });
    const { v } = await res.json();
    const cache = await caches.open(STATIC_CACHE);
    const stored = await cache.match(BUILD_KEY);
    const storedV = stored ? await stored.text() : null;
    if (storedV === String(v)) return false;
    await caches.delete(STATIC_CACHE);
    await caches.delete(RUNTIME_CACHE);
    await cacheStaticAssets(v);
    return true;
  } catch {
    return false;
  }
}

self.addEventListener("push", (e) => {
  const data = e.data ? e.data.json() : {};
  const title = data.title || "Ekta Padel 🎾";
  const body = data.body || "Live session update";
  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: BASE + "icons/icon.svg",
      badge: BASE + "icons/icon.svg",
      data: { url: BASE },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url || BASE;
  e.waitUntil(clients.openWindow(url));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const isHttp = url.protocol === "http:" || url.protocol === "https:";

  if (!isHttp) return;

  // Network-first for Firebase / Firestore.
  if (
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("firebase") ||
    url.hostname.includes("identitytoolkit.googleapis.com")
  ) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  if (e.request.mode === "navigate") {
    e.respondWith(
      caches.match(e.request, { ignoreSearch: true }).then((cached) => {
        checkForUpdates().then((updated) => {
          if (updated) {
            self.clients
              .matchAll()
              .then((clients) =>
                clients.forEach((client) =>
                  client.postMessage({ type: "NEW_BUILD" }),
                ),
              );
          }
        });
        return cached || fetch(e.request);
      }),
    );
    return;
  }

  if (e.request.method !== "GET") {
    e.respondWith(fetch(e.request));
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        putRuntime(e.request, res).catch(() => {});
        return res;
      });
    }),
  );
});
