const STATIC_CACHE = "ekta-padel-static-v23";
const RUNTIME_CACHE = "ekta-padel-runtime-v2";
const BUILD_KEY = "/__buildv__";
const BASE = self.registration.scope;
const RUNTIME_MAX_ENTRIES = 40;

// What must be cached for the app to start with no network. The list is
// GENERATED from the real import graph (scripts/gen-precache.js -> precache.json,
// kept fresh by a test), so a new module can never be forgotten. If the file
// can't be fetched we still precache the bare shell below rather than fail the
// install; every other module is then picked up lazily by the fetch handler.
const FALLBACK_FILES = [
  "",
  "index.html",
  "styles.css",
  "app.js",
  "utils.js",
  "manifest.json",
  "icons/icon.svg",
];

async function loadPrecacheList() {
  try {
    const res = await fetch(BASE + "precache.json", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const { files } = await res.json();
    if (!Array.isArray(files) || !files.length) throw new Error("empty");
    return files.map((f) => BASE + f);
  } catch {
    return FALLBACK_FILES.map((f) => BASE + f);
  }
}

// The build stamp the deploy wrote to buildinfo.json (always from the network).
async function fetchBuildVersion() {
  try {
    const res = await fetch(BASE + "buildinfo.json", { cache: "no-store" });
    if (!res.ok) return null;
    const { v } = await res.json();
    return v === undefined ? null : String(v);
  } catch {
    return null;
  }
}

// Fetch every URL fresh (cache:"reload" so a new deploy can't re-store STALE
// bytes from the browser's own HTTP cache — GitHub Pages serves max-age=600)
// into `cache`. Resolves true only if EVERY file was stored.
async function fetchAllInto(cache, urls) {
  const results = await Promise.all(
    urls.map((u) =>
      fetch(new Request(u, { cache: "reload" }))
        .then((r) => {
          if (!r || !r.ok) throw new Error(`${r && r.status} ${u}`);
          return cache.put(u, r).then(() => true);
        })
        .catch(() => false),
    ),
  );
  return results.every(Boolean);
}

async function cacheStaticAssets() {
  const cache = await caches.open(STATIC_CACHE);
  const [urls, version] = await Promise.all([loadPrecacheList(), fetchBuildVersion()]);
  // Best effort at install: one failed file must not abort the whole install
  // (the activate-time heal and the update check fill any gap).
  await Promise.all(
    urls.map((u) =>
      fetch(new Request(u, { cache: "reload" }))
        .then((res) => (res && res.ok ? cache.put(u, res) : null))
        .catch(() => null),
    ),
  );
  // Record which build this cache holds, so the first update check doesn't
  // mistake "no stamp" for "a new build" and re-download everything.
  if (version !== null) await cache.put(BUILD_KEY, new Response(version));
}

async function notifyClientsNewBuild() {
  const all = await self.clients.matchAll();
  all.forEach((client) => client.postMessage({ type: "NEW_BUILD" }));
}

self.addEventListener("install", (e) => {
  e.waitUntil(cacheStaticAssets().then(() => self.skipWaiting()));
});

// On activate: delete old caches, then verify every precache entry is actually
// present (install's best-effort fetch can silently drop files on CDN blips).
// Any gap is refetched before we claim clients, so the first load never hits
// a missing-module import error.
async function _healCache() {
  const cache = await caches.open(STATIC_CACHE);
  const urls = await loadPrecacheList();
  await Promise.all(
    urls.map(async (u) => {
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

// Fetch buildinfo.json from network, compare to the stored version. If changed,
// download the WHOLE new file set into a staging cache first — if any file
// fails we abort and keep the current cache untouched, so a partial download
// (network blip, CDN propagation lag) can never leave the app half-updated.
// Only then is it swapped into the live cache: new files are written over the
// old ones and obsolete ones pruned, so the live cache is never empty.
// Resolves { updated, error } — error is true when we couldn't tell.
async function checkForUpdates() {
  try {
    const version = await fetchBuildVersion();
    if (version === null) return { updated: false, error: true };
    const live = await caches.open(STATIC_CACHE);
    const stored = await live.match(BUILD_KEY);
    if (stored && (await stored.text()) === version) return { updated: false, error: false };

    const urls = await loadPrecacheList();
    const STAGING = STATIC_CACHE + "-staging";
    await caches.delete(STAGING);
    const staging = await caches.open(STAGING);
    if (!(await fetchAllInto(staging, urls))) {
      await caches.delete(STAGING);
      return { updated: false, error: true }; // partial download — retry next check
    }
    await staging.put(BUILD_KEY, new Response(version));

    const wanted = new Set([...urls, new URL(BUILD_KEY, BASE).href]);
    const staged = await staging.keys();
    await Promise.all(
      staged.map(async (req) => live.put(req, await staging.match(req))),
    );
    // Prune what the new build no longer ships (keep the runtime SWR copies of
    // anything still wanted, drop files that left the precache list).
    const liveKeys = await live.keys();
    await Promise.all(
      liveKeys
        .filter((req) => !wanted.has(req.url) && !staged.some((s) => s.url === req.url))
        .filter((req) => /\.(?:js|css|html|json)$/.test(new URL(req.url).pathname))
        .map((req) => live.delete(req)),
    );
    await caches.delete(STAGING);
    return { updated: true, error: false };
  } catch {
    return { updated: false, error: true };
  }
}

// Client can ask us to check for a new build without a full navigation
// (e.g. on focus / visibility / a timer) — useful for an installed PWA that
// stays open for a long time and rarely triggers a navigate.
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "CHECK_UPDATE") {
    const reply = e.ports && e.ports[0];
    e.waitUntil(
      checkForUpdates().then(async (result) => {
        if (result.updated) await notifyClientsNewBuild();
        // A manual "check for updates" passes a port and gets the verdict back.
        if (reply) reply.postMessage(result);
      }),
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

// Stale-while-revalidate for code (HTML shell, app.js, styles.css, ES modules).
// Respond INSTANTLY from cache — same fast, offline-safe timing as before — but
// always kick a background fetch with cache:"no-store" (bypassing the browser's
// own 10-minute HTTP cache) that overwrites the cached copy with the freshly
// deployed bytes. The result: after a deploy the very next reload serves the new
// code, so users never have to clear their browser cache. Self-heals on every
// load and does not depend on buildinfo.json changing.
async function staleWhileRevalidate(request, cacheName, ignoreSearch) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreSearch });

  const revalidate = fetch(new Request(request.url, { cache: "no-store" }))
    .then((fresh) => {
      if (fresh && fresh.ok) cache.put(request.url, fresh.clone()).catch(() => {});
      return fresh;
    })
    .catch(() => null);

  // Cached copy present → serve it now; the background fetch refreshes the cache
  // for next time. Nothing cached (first visit / offline) → wait for the network.
  if (cached) return cached;
  const fresh = await revalidate;
  return fresh || fetch(request);
}

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

  if (e.request.method !== "GET") {
    e.respondWith(fetch(e.request));
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const isNavigate = e.request.mode === "navigate";
  // Code that goes stale between deploys: the HTML shell, app.js, styles.css
  // and every ES module under src/ and features/.
  const isCode = sameOrigin && /\.(?:js|css|html)$/.test(url.pathname);

  if (isNavigate || isCode) {
    e.respondWith(staleWhileRevalidate(e.request, STATIC_CACHE, isNavigate));
    return;
  }

  // Static assets (icons, fonts, images, manifest) rarely change — cache-first
  // for instant loads; populate the runtime cache on first fetch.
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
