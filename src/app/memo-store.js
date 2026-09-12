// ── MEMO STORE ─────────────────────────────────────────────────────────────
// Centralises all app-level memoised computations that sit above the engine
// modules (ass, stats, pairs) but below the view renderers.
//
// Why a module instead of inline lets in app.js:
//   • All invalidation in ONE place — _invalidateAll() is the only entry point.
//   • Engine modules stay pure (no knowledge of how their results are cached).
//   • Renderers call the memo functions; they never call engine functions directly.
//   • Unit-testable without a DOM or live state (pass any matches array).
//
// Pattern: each memo is (key → value). On any data change invalidate() resets
// all keys; per-read key comparison re-computes only when the dataset changed.

import { _lightFingerprint } from "../engine/fingerprint.js";
import { computeStats } from "../engine/stats.js";
import { getPairStats } from "../engine/pairs.js";
import { activeMatches, invalidateAmMemo } from "../engine/selectors.js";
import { computeASS, computeASSTimeline } from "../engine/ass.js";

// Per-section caches that grow one entry per distinct dataset and would
// otherwise leak unbounded across a session. Cleared on every invalidation.
export const reignCache = {};
export const rankPeriodCache = {};

// ── Stats ──────────────────────────────────────────────────────
let _statsMemo = null, _statsMemoKey = "";
let _statNamesMemo = null, _statNamesKey = "";
let _dataVersionRef = { v: 0 };  // injected by app.js

export function initMemoStoreDeps({ getDataVersion }) {
  _getDataVersion = getDataVersion;
}

let _getDataVersion = () => 0;

function _statKey() {
  return `${_getDataVersion()}|${_lightFingerprint(activeMatches())}`;
}

export function memoStats() {
  const key = _statKey();
  if (_statsMemoKey !== key || !_statsMemo) {
    _statsMemoKey = key;
    _statsMemo = computeStats(activeMatches(), memoASS());
  }
  return _statsMemo.slice(); // safe copy for callers that sort
}

export function memoStatPlayerNames() {
  const key = _statKey();
  if (_statNamesKey !== key || !_statNamesMemo) {
    _statNamesKey = key;
    _statNamesMemo = computeStats(activeMatches()).map((s) => s.name);
  }
  return _statNamesMemo.slice();
}

// ── Pair stats ─────────────────────────────────────────────────
let _pairStatsMemo = null, _pairStatsKey = "";

export function memoPairStats() {
  const key = _statKey();
  if (_pairStatsKey !== key || !_pairStatsMemo) {
    _pairStatsKey = key;
    _pairStatsMemo = getPairStats(activeMatches());
  }
  return _pairStatsMemo.slice();
}

// ── ASS score map ─────────────────────────────────────────────
// Memoises computeASS(activeMatches()) — the most frequently called
// un-cached computation in the codebase (hit by home, compact, analytics,
// power rankings, scatter plot, rank divergence per render).
let _assMemo = null, _assMemoKey = "";

export function memoASS() {
  const am = activeMatches();
  const key = _lightFingerprint(am);
  if (_assMemoKey === key && _assMemo) return _assMemo;
  _assMemoKey = key;
  _assMemo = computeASS(am);
  return _assMemo;
}

// ── ASS timeline (history / peaks / lows) ─────────────────────
// Computes all three in a single chronological walk and shares the result.
let _assTimelineMemo = null, _assTimelineKey = "";

function _getASSTimeline() {
  const am  = activeMatches();
  const key = _lightFingerprint(am);
  if (_assTimelineKey === key && _assTimelineMemo) return _assTimelineMemo;
  _assTimelineKey  = key;
  _assTimelineMemo = computeASSTimeline(am);
  return _assTimelineMemo;
}

export function memoASSHistory() { return _getASSTimeline().history; }
export function memoASSPeaks()   { return _getASSTimeline().peaks; }
export function memoASSLows()    { return _getASSTimeline().lows; }

// ── Invalidation ───────────────────────────────────────────────
// Single entry point called by commit() — resets every cache key so that the
// next read for any memo unconditionally recomputes. Also clears the
// activeMatches selector cache.
export function invalidateAll() {
  invalidateAmMemo();
  _statNamesKey = "";    _statNamesMemo = null;
  _statsMemoKey = "";    _statsMemo = null;
  _pairStatsKey = "";    _pairStatsMemo = null;
  _assMemoKey = "";      _assMemo = null;
  _assTimelineKey = ""; _assTimelineMemo = null;
  for (const k in reignCache) delete reignCache[k];
  for (const k in rankPeriodCache) delete rankPeriodCache[k];
}

// Clears only the memos the Statistics/Analytics page reads (stats, ASS,
// pair stats, reign + rank-period lookups) — the Statistics page is meant to
// always recompute on demand rather than reuse a stale in-memory result.
export function clearAnalyticsCache() {
  _statNamesKey = "";    _statNamesMemo = null;
  _statsMemoKey = "";    _statsMemo = null;
  _pairStatsKey = "";    _pairStatsMemo = null;
  _assMemoKey = "";      _assMemo = null;
  _assTimelineKey = ""; _assTimelineMemo = null;
  for (const k in reignCache) delete reignCache[k];
  for (const k in rankPeriodCache) delete rankPeriodCache[k];
}
