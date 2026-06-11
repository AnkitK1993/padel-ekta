// ── CLOUD REPOSITORY ──────────────────────────────────────────────────────
// Owns ALL Firestore read/write logic: save debounce, doc-size guard,
// pending-sync flag, conflict detection, and the Firestore subscription.
// app.js remains the data-mutation controller; this module is the I/O seam.
//
// Public surface:
//   init(deps)           — inject the shared handles from app.js once at boot
//   saveCloudData(opts)  — persist current state; opts.immediate skips debounce
//   loadCloudData()      — subscribe to Firestore; returns unsubscribe fn
//   trySyncNow()         — one-shot push of any pending local changes
//   buildCloudPayload()  — snapshot of the cloud-facing state (exposed for tests)
//
// The module is deliberately NOT a class — ES module singletons give the same
// "one instance" guarantee with less ceremony and better tree-shaking.

import { db, auth, doc, setDoc, onSnapshot } from "../infra/cloud/firebase.js";
import { state } from "../engine/state.js";

// ── Injected dependencies (app.js injects via init()) ─────────
let _deps = {
  getMatches: () => state.matches,
  getPlayers: () => state.players,
  getPlayerAliasMap: () => ({}),
  getNextPlayerId: () => 1,
  getSeasons: () => state.seasons,
  isAdmin: () => false,
  isForcedOffline: () => false,
  isSessionBuffering: () => false,
  onData: (_matches, _players, _pam, _npid) => {},
  showToast: (_msg, _emoji) => {},
  showConflict: (_args) => {},
  appCache: null,
  mkMatchKey: (m) => `${m.date}|${(m.teamA||[]).join(",")}|${(m.teamB||[]).join(",")}`,
};

export function init(deps) {
  _deps = { ..._deps, ...deps };
}

// ── Payload ────────────────────────────────────────────────────
export function buildCloudPayload() {
  return {
    matches: _deps.getMatches(),
    players: _deps.getPlayers(),
    playerAliasMap: _deps.getPlayerAliasMap(),
    nextPlayerId: _deps.getNextPlayerId(),
    seasons: _deps.getSeasons(),
  };
}

// ── Pending-sync flag ──────────────────────────────────────────
const _PENDING_KEY = "padel_pending_sync";

export function hasPendingSync() {
  return localStorage.getItem(_PENDING_KEY) === "1";
}

export function setPendingSync(flag) {
  if (flag) localStorage.setItem(_PENDING_KEY, "1");
  else localStorage.removeItem(_PENDING_KEY);
  const el = document.getElementById("sync-indicator");
  if (el) el.style.display = flag ? "flex" : "none";
}

// ── Doc-size guard (throttled — serialises full payload) ───────
const _DOC_LIMIT_KB = 1024;
const _DOC_WARN_KB = 700;
let _docSizeWarnedAt = 0;
let _docSizeCheckTimer = null;
let _docSizeCheckedAt = 0;
const _DOC_SIZE_THROTTLE_MS = 3000;

export function scheduleDocSizeCheck() {
  const now = Date.now();
  if (now - _docSizeCheckedAt >= _DOC_SIZE_THROTTLE_MS) {
    _docSizeCheckedAt = now;
    _checkDocSize(buildCloudPayload());
  } else if (!_docSizeCheckTimer) {
    _docSizeCheckTimer = setTimeout(() => {
      _docSizeCheckTimer = null;
      _docSizeCheckedAt = Date.now();
      _checkDocSize(buildCloudPayload());
    }, _DOC_SIZE_THROTTLE_MS - (now - _docSizeCheckedAt));
  }
}

export function checkDocSize(payload) {
  return _checkDocSize(payload);
}

function _checkDocSize(payload) {
  try {
    const bytes = new Blob([JSON.stringify(payload)]).size;
    const kb = Math.round(bytes / 1024);
    window._docSizeKB = kb;
    const pct = Math.round((kb / _DOC_LIMIT_KB) * 100);
    const el = document.getElementById("doc-size-readout");
    if (el) {
      el.textContent = `Cloud doc: ${kb} KB / ${_DOC_LIMIT_KB} KB (${pct}%)`;
      el.style.color =
        kb > 900 ? "var(--red)" : kb > _DOC_WARN_KB ? "var(--gold)" : "var(--muted)";
    }
    if (kb > _DOC_WARN_KB && Date.now() - _docSizeWarnedAt > 60000) {
      _docSizeWarnedAt = Date.now();
      _deps.showToast(
        `⚠️ Cloud data ${kb} KB of ${_DOC_LIMIT_KB} KB limit — consider archiving old seasons`,
        "⚠️",
      );
    }
  } catch (e) {}
}

// ── Save (debounced) ───────────────────────────────────────────
const _DEBOUNCE_MS = 400;
let _cloudSaveTimer = null;
let _lastLocalSaveTime = 0;

export function getLastLocalSaveTime() { return _lastLocalSaveTime; }

export function saveCloudData(opts) {
  // Local durability first — always, even when offline.
  const payload = buildCloudPayload();
  if (_deps.appCache)
    _deps.appCache.save(
      payload.matches, payload.players, payload.playerAliasMap, payload.nextPlayerId,
    );
  try {
    localStorage.setItem("padel_matches", JSON.stringify(payload.matches));
  } catch (e) {}
  scheduleDocSizeCheck();

  if (!navigator.onLine || _deps.isForcedOffline()) {
    setPendingSync(true);
    return Promise.resolve();
  }
  setPendingSync(true);
  clearTimeout(_cloudSaveTimer);
  _cloudSaveTimer = null;
  if (opts && opts.immediate) return _flushCloudSave();
  _cloudSaveTimer = setTimeout(_flushCloudSave, _DEBOUNCE_MS);
  return Promise.resolve();
}

async function _flushCloudSave() {
  _cloudSaveTimer = null;
  if (!navigator.onLine || _deps.isForcedOffline()) {
    setPendingSync(true);
    return;
  }
  if (!(auth.currentUser && _deps.isAdmin())) return;
  try {
    _lastLocalSaveTime = Date.now();
    await setDoc(doc(db, "padel", "main"), buildCloudPayload());
    setPendingSync(false);
  } catch (err) {
    console.error("Firestore save failed:", err);
    setPendingSync(true);
  }
}

export async function trySyncNow() {
  if (!navigator.onLine || _deps.isForcedOffline() || !auth?.currentUser || !_deps.isAdmin())
    return;
  if (!hasPendingSync()) return;
  try {
    _lastLocalSaveTime = Date.now();
    await setDoc(doc(db, "padel", "main"), buildCloudPayload());
    setPendingSync(false);
    _deps.showToast("Synced to cloud", "☁️");
  } catch (err) {
    console.error("Sync retry failed:", err);
  }
}

// ── Firestore subscription ─────────────────────────────────────
// dataFingerprint: compact representation used to skip no-op re-renders.
// Uses the same FNV hash approach as elo.js (avoids O(dataset) string pinning).
function _fnv(h, s) {
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function dataFingerprint(matches, players, pam) {
  const rows = Array.isArray(matches) ? matches : [];
  let h1 = 2166136261, h2 = 0x811c9dc4;
  for (const m of rows) {
    h1 = _fnv(h1, `${m.date || ""}${(m.teamA || []).join(",")}${(m.teamB || []).join(",")}${m.scoreA ?? ""}${m.scoreB ?? ""}${m.note || ""}`);
    h2 = _fnv(h2, m.date || "");
  }
  const pp = Object.values(players || {}).sort((a, b) => a.id - b.id)
    .map((p) => `${p.id}:${p.name}:${(pam[p.id] || []).join(",")}`).join("~");
  return `${rows.length}:${h1.toString(36)}:${h2.toString(36)}:${_fnv(2166136261, pp).toString(36)}`;
}

export function loadCloudData(onData, onConflict) {
  let fired = false;
  let lastFp = null;

  function extractPlayerData(d) {
    if (d.players && typeof d.players === "object" && Object.keys(d.players).length > 0) {
      return { pls: d.players, pam: d.playerAliasMap || {}, npid: d.nextPlayerId || 1 };
    }
    // Legacy format — migrate on the fly (imported lazily to avoid circular dep)
    const { migrateAliasMapToPlayers } = _lazyMigrate();
    const migrated = migrateAliasMapToPlayers(d.aliasMap || {});
    return { pls: migrated.players, pam: migrated.playerAliasMap, npid: migrated.nextPlayerId };
  }

  function handle(matches, pls, pam, npid, skipConflict = false) {
    const fp = dataFingerprint(matches, pls, pam);
    const isFirst = !fired;
    if (!isFirst && fp === lastFp) return;

    const recentSave = Date.now() - _lastLocalSaveTime < 15000;
    const sessionBuffering = _deps.isSessionBuffering();

    if (!skipConflict && !isFirst && !recentSave && !sessionBuffering && state.matches.length > 0) {
      const cloudKeys = new Set(matches.map(_deps.mkMatchKey));
      const localOnly = state.matches.filter((m) => !cloudKeys.has(_deps.mkMatchKey(m)));
      if (localOnly.length > 0) {
        onConflict(matches, pls, pam, npid, localOnly, (resolved, rPls, rPam, rNpid, save) => {
          lastFp = null;
          handle(resolved, rPls, rPam, rNpid, true);
          if (save) saveCloudData({ immediate: true });
        });
        return;
      }
    }

    lastFp = fp;
    fired = true;
    onData(matches, pls, pam, npid, isFirst);
  }

  // Try local cache first (fast first paint)
  if (_deps.appCache) {
    try {
      const cached = _deps.appCache.load();
      if (cached) {
        const { pls, pam, npid } = extractPlayerData(cached);
        handle(cached.matches || [], pls, pam, npid, true);
      }
    } catch (e) {}
  }

  const unsub = onSnapshot(
    doc(db, "padel", "main"),
    (snap) => {
      if (!snap.exists()) { fired = true; return; }
      const d = snap.data();
      const { pls, pam, npid } = extractPlayerData(d);
      handle(d.matches || [], pls, pam, npid, false);
    },
    (err) => console.error("Firestore listen error:", err),
  );
  return unsub;
}

// Lazy import shim to break potential circular deps
let _migrateFn = null;
function _lazyMigrate() {
  if (!_migrateFn) {
    // Synchronously resolved after module graph is loaded
    _migrateFn = { migrateAliasMapToPlayers: (aMap) => {
      const pls = {}, pam = {};
      let id = 1;
      Object.keys(aMap || {}).sort((a, b) => a.localeCompare(b)).forEach((name) => {
        pls[id] = { id, name, email: "", image: "", isGuest: false };
        pam[id] = Array.isArray(aMap[name]) ? [...aMap[name]] : [];
        id++;
      });
      return { players: pls, playerAliasMap: pam, nextPlayerId: id };
    }};
  }
  return _migrateFn;
}
