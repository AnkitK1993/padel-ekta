const STATIC_CACHE = "ekta-padel-static-v10";
const RUNTIME_CACHE = "ekta-padel-runtime-v1";
const BUILD_KEY = "/__buildv__";
const BASE = self.registration.scope;
const STATIC = [
  BASE,
  BASE + "index.html",
  BASE + "styles.css",
  BASE + "app.js",
  BASE + "src/engine/state.js",
  BASE + "features/analytics.js",
  BASE + "features/live-session.js",
  BASE + "utils.js",
  BASE + "src/engine/elo.js",
  BASE + "src/engine/stats.js",
  BASE + "src/engine/parser.js",
  BASE + "src/ui/format.js",
  BASE + "src/ui/charts.js",
  BASE + "src/ui/render-match-rows.js",
  BASE + "src/ui/render-history-summary.js",
  BASE + "src/ui/render-anim.js",
  BASE + "src/engine/selectors.js",
  BASE + "src/engine/americano.js",
  BASE + "src/engine/pairs.js",
  BASE + "src/engine/xp.js",
  BASE + "src/engine/badges.js",
  BASE + "src/engine/player-analytics.js",
  BASE + "manifest.json",
  BASE + "icons/icon.svg",
];
const RUNTIME_MAX_ENTRIES = 40;

async function cacheStaticAssets(buildVersion) {
  const cache = await caches.open(STATIC_CACHE);
  // Fetch with cache:"reload" so a fresh deploy can't re-store STALE files from
  // the browser's own HTTP cache (GitHub Pages serves assets with max-age=600).
  // Each asset is guarded so one failure can't abort the whole precache.
  await Promise.all(
    STATIC.map((u) =>
      fetch(new Request(u, { cache: "reload" }))
        .then((res) => (res && res.ok ? cache.put(u, res) : null))
        .catch(() => null),
    ),
  );
  if (buildVersion !== undefined) {
    await cache.put(BUILD_KEY, new Response(String(buildVersion)));
  }
}

async function notifyClientsNewBuild() {
  const all = await self.clients.matchAll();
  all.forEach((client) => client.postMessage({ type: "NEW_BUILD" }));
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
    // Only refresh the app shell. The runtime cache holds version-pinned CDN
    // libs (Firebase/emailjs/html2canvas) that don't change between deploys —
    // wiping it every build (and we deploy on every edit) just forces needless
    // re-downloads of hundreds of KB.
    await caches.delete(STATIC_CACHE);
    await cacheStaticAssets(v);
    return true;
  } catch {
    return false;
  }
}

// Client can ask us to check for a new build without a full navigation
// (e.g. on focus / visibility / a timer) — useful for an installed PWA that
// stays open for a long time and rarely triggers a navigate.
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "CHECK_UPDATE") {
    e.waitUntil(
      checkForUpdates().then((updated) =>
        updated ? notifyClientsNewBuild() : undefined,
      ),
    );
  }
  if (e.data && e.data.type === "SHOW_NOTIFICATION") {
    e.waitUntil(
      self.registration.showNotification(e.data.title || "Ekta Padel 🎾", {
        body: e.data.body || "",
        icon: BASE + "icons/icon.svg",
        badge: BASE + "icons/icon.svg",
        data: { url: BASE },
      }),
    );
  }
});

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
          if (updated) notifyClientsNewBuild();
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
