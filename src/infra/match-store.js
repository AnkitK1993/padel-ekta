// ── MATCH STORE · local persistence adapter ────────────────────────────────
// Owns localStorage keys and serialisation for the match-adjacent tables that
// are NOT part of the main cloud payload: deleted matches and the milestone
// log. Keeps every storage key in one place; callers never touch localStorage
// for these concerns directly.

// ── Deleted matches (soft-delete bin) ─────────────────────────
const _DELETED_KEY = "padel_deleted_matches";

export function loadDeletedMatches() {
  try {
    return JSON.parse(localStorage.getItem(_DELETED_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

export function saveDeletedMatches(matches) {
  try {
    localStorage.setItem(_DELETED_KEY, JSON.stringify(matches));
  } catch (e) {}
}

// ── Milestone log ──────────────────────────────────────────────
const _MILESTONE_KEY = "padel_milestone_log";
const _MILESTONE_MAX = 100;

export function getMilestoneLog() {
  try {
    return JSON.parse(localStorage.getItem(_MILESTONE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

export function saveMilestoneEntry(msg, emoji) {
  try {
    const log = getMilestoneLog();
    log.unshift({ msg, emoji, ts: Date.now() });
    localStorage.setItem(
      _MILESTONE_KEY,
      JSON.stringify(log.slice(0, _MILESTONE_MAX)),
    );
  } catch (e) {}
}

// ── Season list ────────────────────────────────────────────────
const _SEASONS_KEY = "padel_seasons";

export function loadSeasonsLocal() {
  try {
    return JSON.parse(localStorage.getItem(_SEASONS_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

export function saveSeasonsLocal(seasons) {
  try {
    localStorage.setItem(_SEASONS_KEY, JSON.stringify(seasons));
  } catch (e) {}
}

// ── Weekly rank snapshots ──────────────────────────────────────
const _SNAP_KEY = "padel_weekly_snaps";

export function getWeeklySnaps() {
  try {
    return JSON.parse(localStorage.getItem(_SNAP_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

export function saveWeeklySnap(snap) {
  try {
    const snaps = getWeeklySnaps();
    snaps.push(snap);
    localStorage.setItem(_SNAP_KEY, JSON.stringify(snaps));
  } catch (e) {}
}

// ── Player photo cache ─────────────────────────────────────────
const _PHOTO_KEY = "padel_photos";

export function loadPhotosLocal() {
  try {
    return JSON.parse(localStorage.getItem(_PHOTO_KEY) || "null");
  } catch (e) {
    return null;
  }
}

export function savePhotosLocal(map) {
  try {
    localStorage.setItem(_PHOTO_KEY, JSON.stringify(map));
  } catch (e) {}
}
