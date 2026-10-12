// One cache PER BUILD ("ekta-padel-static-<build>"), plus a tiny pointer to the
// one in use. The app is only ever served from a single, complete build: a new
// build is downloaded whole into its own cache and then switched to by writing
// the pointer (one atomic put). There is no per-file overwriting, so a reload
// can never mix old and new modules (the "works only after clearing cache" bug).
const STATIC_PREFIX = "ekta-padel-static-";
const META_CACHE = "ekta-padel-meta";
const POINTER = "/__current__";
const RUNTIME_CACHE = "ekta-padel-runtime-v2";
const BASE = self.registration.scope;
const RUNTIME_MAX_ENTRIES = 40;
const CHECK_EVERY_MS = 10 * 60 * 1000; // navigations trigger a check at most this often

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

// The pointer: name of the build cache currently served.
let _current = null;
async function currentName() {
  if (_current) return _current;
  const meta = await caches.open(META_CACHE);
  const hit = await meta.match(POINTER);
  _current = hit ? await hit.text() : null;
  return _current;
}
async function setCurrent(name) {
  const meta = await caches.open(META_CACHE);
  await meta.put(POINTER, new Response(name));
  _current = name;
}
async function dropOldBuilds(keep) {
  const keys = await caches.keys();
  await Promise.all(
    keys.filter((k) => k.startsWith(STATIC_PREFIX) && !keep.includes(k)).map((k) => caches.delete(k)),
  );
}

// Download the WHOLE build into a cache of its own; if any file fails, throw it
// away and report failure — the cache in use is never touched.
async function downloadBuild(version) {
  const name = STATIC_PREFIX + version;
  await caches.delete(name);
  const cache = await caches.open(name);
  const urls = await loadPrecacheList();
  if (!(await fetchAllInto(cache, urls))) {
    await caches.delete(name);
    return null;
  }
  return name;
}

async function notifyClientsNewBuild() {
  const all = await self.clients.matchAll();
  all.forEach((client) => client.postMessage({ type: "NEW_BUILD" }));
}

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      // Best effort: with no buildinfo or a failed download we still install;
      // the activate-time heal and the first update check fill any gap.
      const version = (await fetchBuildVersion()) || "u" + Date.now();
      const name = (await downloadBuild(version)) || STATIC_PREFIX + version;
      await caches.open(name); // make sure it exists even if the download was partial
      await setCurrent(name);
      await self.skipWaiting();
    })(),
  );
});

// On activate: drop caches of older builds, then verify every precache entry is
// present (a CDN blip at install can drop files) so the first load never hits a
// missing-module import error.
async function _healCache() {
  const name = await currentName();
  if (!name) return;
  const cache = await caches.open(name);
  const urls = await loadPrecacheList();
  await Promise.all(
    urls.map(async (u) => {
      if (await cache.match(u)) return;
      return fetch(new Request(u, { cache: "reload" }))
        .then((r) => (r && r.ok ? cache.put(u, r) : null))
        .catch(() => null);
    }),
  );
}

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const name = await currentName();
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (k) =>
              k !== META_CACHE && k !== RUNTIME_CACHE && k !== name,
          )
          .map((k) => caches.delete(k)),
      );
      await _healCache();
      await self.clients.claim();
    })(),
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

// Compare buildinfo.json (always from the network) with the build being served.
// If it changed, download the new build whole into its own cache, then switch
// the pointer. The previous build stays until the next switch, so a page that
// is still open (and lazily importing modules) keeps finding its own files.
// Resolves { updated, error } — error is true when we couldn't tell.
let _checking = null;
let _lastCheck = 0;
function checkForUpdates() {
  if (_checking) return _checking; // one check at a time (install, page, navigation)
  _lastCheck = Date.now();
  _checking = (async () => {
    try {
      const version = await fetchBuildVersion();
      if (version === null) return { updated: false, error: true };
      const cur = await currentName();
      const want = STATIC_PREFIX + version;
      if (cur === want) return { updated: false, error: false };
      const name = await downloadBuild(version);
      if (!name) return { updated: false, error: true }; // partial — retry next check
      await setCurrent(name); // the atomic switch
      await dropOldBuilds([name, cur]);
      return { updated: true, error: false };
    } catch {
      return { updated: false, error: true };
    }
  })().finally(() => {
    _checking = null;
  });
  return _checking;
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
  if (e.data && e.data.type === "RESET_CACHES") {
    // Self-heal: the page failed to start. Forget every cache so the next load
    // is a clean download of the current deploy.
    e.waitUntil(
      (async () => {
        _current = null;
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        const reply = e.ports && e.ports[0];
        if (reply) reply.postMessage({ ok: true });
      })(),
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

// Code (HTML shell, app.js, styles.css, ES modules) is served ONLY from the
// current build's cache — instant and offline-safe, and always one consistent
// version. Freshness comes from checkForUpdates (on load, focus, hourly and, as
// a backstop, from navigations here), never from rewriting single files.
async function serveCode(e, ignoreSearch) {
  const name = await currentName();
  if (name) {
    const cache = await caches.open(name);
    const hit = await cache.match(e.request, { ignoreSearch });
    if (hit) {
      if (e.request.mode === "navigate" && Date.now() - _lastCheck > CHECK_EVERY_MS) {
        e.waitUntil(checkForUpdates().then((r) => (r.updated ? notifyClientsNewBuild() : null)));
      }
      return hit;
    }
  }
  // Not cached (first visit, or a file the precache list lacks): network, and
  // keep a copy in the current build so it works offline next time.
  const res = await fetch(e.request);
  if (name && res && res.ok && e.request.method === "GET") {
    const copy = res.clone();
    e.waitUntil(caches.open(name).then((c) => c.put(e.request.url, copy)).catch(() => {}));
  }
  return res;
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
    e.respondWith(serveCode(e, isNavigate));
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
