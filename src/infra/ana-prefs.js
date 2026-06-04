// ── ANALYTICS VIEW-PREFERENCES · persistence adapter ───────────
// Infrastructure layer: the *only* place that knows how the analytics page's
// per-user view state (section order, collapsed set, favourites, hidden
// sections, pill order) is stored. Callers deal in plain values (arrays / Set)
// and never touch localStorage or the storage-key strings directly — so the
// backing store could change (IndexedDB, the cloud doc, …) without any caller
// edits. Extracted from app.js as the template for separating persistence from
// controller/presentation logic.
//
// Note: the toggle* handlers (toggleAnaFav / toggleAnaHidden / toggleAnaSection)
// stay in app.js — they are controller logic (DOM + active-category state) that
// merely *consume* this adapter.

const ANA_ORDER_KEY = "ekta_ana_order";
const ANA_COL_KEY = "ekta_ana_col";
const ANA_PILL_ORDER_KEY = "ekta_ana_pill_order";
const ANA_FAV_KEY = "ekta_ana_favs";
const ANA_HIDDEN_KEY = "ekta_ana_hidden";

function _readArr(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}
function _writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getAnaPillOrder() {
  return [...new Set(_readArr(ANA_PILL_ORDER_KEY))]; // dedupe corrupted state
}
export function saveAnaPillOrder(a) {
  _writeJSON(ANA_PILL_ORDER_KEY, a);
}

export function getAnaFavs() {
  return _readArr(ANA_FAV_KEY);
}
export function saveAnaFavs(a) {
  _writeJSON(ANA_FAV_KEY, a);
}

export function getAnaHidden() {
  return _readArr(ANA_HIDDEN_KEY);
}
export function saveAnaHidden(a) {
  _writeJSON(ANA_HIDDEN_KEY, a);
}

export function getAnaOrder() {
  return _readArr(ANA_ORDER_KEY);
}
export function saveAnaOrder(a) {
  _writeJSON(ANA_ORDER_KEY, a);
}

export function getAnaCollapsed() {
  return new Set(_readArr(ANA_COL_KEY));
}
export function saveAnaCollapsed(s) {
  _writeJSON(ANA_COL_KEY, [...s]);
}

// Whether the user has ever persisted a collapsed-set (used to seed defaults
// on first analytics render without leaking the storage key to the renderer).
export function hasAnaCollapsedPref() {
  return localStorage.getItem(ANA_COL_KEY) != null;
}
