const STATIC_CACHE = "ekta-padel-static-v13";
const RUNTIME_CACHE = "ekta-padel-runtime-v2";
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
  BASE + "src/ui/view-state.js",
  BASE + "src/ui/components.js",
  BASE + "src/engine/selectors.js",
  BASE + "src/engine/americano.js",
  BASE + "src/engine/pairs.js",
  BASE + "src/engine/xp.js",
  BASE + "src/engine/badges.js",
  BASE + "src/engine/player-analytics.js",
  BASE + "src/engine/dates.js",
  BASE + "src/infra/ana-prefs.js",
  BASE + "src/infra/app-prefs.js",
  BASE + "src/infra/cloud/firebase.js",
  BASE + "features/replay.js",
  BASE + "manifest.json",
  BASE + "icons/icon.svg",
  BASE + "icons/icon-180.png",
  BASE + "icons/icon-192.png",
  BASE + "icons/icon-512.png",
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

// On activate: delete old caches, then verify every STATIC entry is actually
// present (install's catch(() => null) can silently drop files on CDN blips).
// Any gap is refetched before we claim clients, so the first load never hits
// a missing-module import error.
async function _healCache() {
  const cache = await caches.open(STATIC_CACHE);
  await Promise.all(
    STATIC.map(async (u) => {
      const hit = await cache.match(u);
      if (hit) return;
      return fetch(new Request(u, { cache: "reload" }))
        .then((r) => (r && r.ok ? cache.put(u, r) : null))
        .catch(() => null);
    }),
  );
}

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
      .then(() => _healCache())
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
// If changed: atomically swap to a freshly-populated cache so a partial
// download (network blip, CDN propagation lag) never leaves the app broken.
async function checkForUpdates() {
  try {
    const res = await fetch(BASE + "buildinfo.json", { cache: "no-store" });
    const { v } = await res.json();
    const existing = await caches.open(STATIC_CACHE);
    const stored = await existing.match(BUILD_KEY);
    const storedV = stored ? await stored.text() : null;
    if (storedV === String(v)) return false;

    // Build into a staging cache first — if any fetch fails we abort and
    // keep the existing cache intact so the app stays usable.
    const STAGING = STATIC_CACHE + "-staging";
    await caches.delete(STAGING);
    const staging = await caches.open(STAGING);
    const ok = await Promise.all(
      STATIC.map((u) =>
        fetch(new Request(u, { cache: "reload" }))
          .then((r) => {
            if (!r || !r.ok) throw new Error(`${r?.status} ${u}`);
            return staging.put(u, r);
          })
          .catch(() => false),
      ),
    );
    // If every file was fetched successfully, atomic swap.
    if (ok.every(Boolean)) {
      await staging.put(BUILD_KEY, new Response(String(v)));
      await caches.delete(STATIC_CACHE);
      const live = await caches.open(STATIC_CACHE);
      const keys = await staging.keys();
      await Promise.all(
        keys.map(async (req) => {
          const resp = await staging.match(req);
          return live.put(req, resp);
        }),
      );
      await caches.delete(STAGING);
      return true;
    } else {
      // Partial download — clean up staging and try again next check.
      await caches.delete(STAGING);
      return false;
    }
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
