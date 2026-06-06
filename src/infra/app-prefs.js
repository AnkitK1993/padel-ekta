// ── APP UI/UX SETTINGS · persistence adapter ───────────────────
// Infrastructure layer: the single source of truth for how the app's display /
// behaviour preferences are stored — animation level, cascade, smooth-mode,
// battery-saver, notifications, forced-offline, screenshot-ask, hide-empty.
// Each flag is persisted as "1"/"0" (or absent); that encoding and the storage
// keys live ONLY here, so callers deal in booleans/strings and never touch
// localStorage. Accessors are intentionally thin and do NOT swallow errors —
// the call sites keep their own try/catch + DOM updates (controller concern),
// which keeps this extraction exactly behaviour-neutral.
//
// NOTE: data-mirror keys (padel_matches/seasons/photos/pending_sync/…) are a
// different concern (offline cache) and belong to the cloud/cache adapter, not
// here. This module is settings only.

const K = {
  anim: "anim_level",
  cascade: "cascade_anim",
  smooth: "smooth_mode",
  battery: "padel_battery_saver",
  notif: "padel_notif_enabled",
  offline: "padel_forced_offline",
  screenshot: "screenshot_ask_choice",
  hideEmpty: "padel_ana_hide_empty",
  fontScale: "padel_font_scale",
};

const _is1 = (key) => localStorage.getItem(key) === "1";
const _set01 = (key, on) => localStorage.setItem(key, on ? "1" : "0");

// ── UI text/zoom scale (1 = 100%; clamped 0.8–1.4) ──
export const FONT_SCALE_MIN = 0.8;
export const FONT_SCALE_MAX = 1.4;
export function getFontScale() {
  const v = parseFloat(localStorage.getItem(K.fontScale));
  return v >= FONT_SCALE_MIN && v <= FONT_SCALE_MAX ? v : 1;
}
export function setFontScale(v) {
  localStorage.setItem(K.fontScale, String(v));
}

// ── Animation level (anim_level, falling back to legacy cascade_anim) ──
export function getAnimLevelRaw() {
  return localStorage.getItem(K.anim);
}
export function resolveAnimLevel() {
  return (
    getAnimLevelRaw() ||
    (localStorage.getItem(K.cascade) === "0" ? "medium" : "full")
  );
}
export function setAnimLevelRaw(val) {
  localStorage.setItem(K.anim, val);
}

// ── Smooth mode ──
export function getSmoothMode() {
  return _is1(K.smooth);
}
export function setSmoothMode(on) {
  _set01(K.smooth, on);
}

// ── Battery saver (sticky three-state: "1" / "0" / unset) ──
export function getBatterySaverPref() {
  return localStorage.getItem(K.battery); // "1" | "0" | null
}
export function hasBatterySaverPref() {
  return getBatterySaverPref() != null;
}
export function setBatterySaver(on) {
  _set01(K.battery, on);
}

// ── Notifications ──
export function getNotifEnabled() {
  return _is1(K.notif);
}
export function setNotifEnabled(on) {
  _set01(K.notif, on);
}

// ── Forced offline (absent = online; set "1" = offline) ──
export function getForcedOffline() {
  return _is1(K.offline);
}
export function setForcedOffline(on) {
  if (on) localStorage.setItem(K.offline, "1");
  else localStorage.removeItem(K.offline);
}

// ── Screenshot "ask every time" choice ──
export function getScreenshotAsk() {
  return _is1(K.screenshot);
}
export function setScreenshotAsk(on) {
  _set01(K.screenshot, on);
}

// ── Analytics: hide empty sections ──
export function getAnaHideEmpty() {
  return _is1(K.hideEmpty);
}
export function setAnaHideEmpty(on) {
  _set01(K.hideEmpty, on);
}
