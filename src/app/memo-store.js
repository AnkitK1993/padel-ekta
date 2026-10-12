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

import { _lightFingerprint } from "../domain/fingerprint.js";
import { computeStats } from "../domain/stats.js";
import { getPairStats } from "../domain/pairs.js";
import { activeMatches, invalidateAmMemo } from "../domain/selectors.js";
import { rating, invalidate as invalidateRatingCaches } from "../domain/rating-service.js";

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

// The app's data version (bumped on every data change) — for other app-level
// memos that need the same invalidation as this store.
export function dataVersion() {
  return _getDataVersion();
}

// The active scoring system is part of every key: stats carry SR and a rank
// order derived from the rating, so a picker change must never reuse them.
function _statKey() {
  return `${_getDataVersion()}|${rating.system()}|${_lightFingerprint(activeMatches())}`;
}

export function memoStats() {
  const key = _statKey();
  if (_statsMemoKey !== key || !_statsMemo) {
    _statsMemoKey = key;
    _statsMemo = rating.stats(activeMatches(), memoRating());
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

// ── Rating map ────────────────────────────────────────────────
// Memoises rating.map(activeMatches()) for whichever scoring system is active —
// the most frequently called un-cached computation in the codebase (hit by
// home, compact, analytics, power rankings, scatter plot, rank divergence per
// render). Keyed on the system too, so switching the picker can't serve the
// previous engine's numbers.
let _ratingMemo = null, _ratingMemoKey = "";

export function memoRating() {
  const key = _statKey();
  if (_ratingMemoKey === key && _ratingMemo) return _ratingMemo;
  _ratingMemoKey = key;
  _ratingMemo = rating.map(activeMatches());
  return _ratingMemo;
}

// ── Rating timeline (history / peaks / lows) ──────────────────
// Computes all three in a single chronological walk and shares the result.
let _timelineMemo = null, _timelineKey = "";

function _getTimeline() {
  const key = _statKey();
  if (_timelineKey === key && _timelineMemo) return _timelineMemo;
  _timelineKey = key;
  _timelineMemo = rating.timeline(activeMatches());
  return _timelineMemo;
}

export function memoRatingHistory() { return _getTimeline().history; }
export function memoRatingPeaks()   { return _getTimeline().peaks; }
export function memoRatingLows()    { return _getTimeline().lows; }

// ── Invalidation ───────────────────────────────────────────────
// Single entry point called by commit() — resets every cache key so that the
// next read for any memo unconditionally recomputes. Also clears the
// activeMatches selector cache.
export function invalidateAll() {
  invalidateAmMemo();
  invalidateRatingCaches();
  _statNamesKey = "";    _statNamesMemo = null;
  _statsMemoKey = "";    _statsMemo = null;
  _pairStatsKey = "";    _pairStatsMemo = null;
  _ratingMemoKey = "";   _ratingMemo = null;
  _timelineKey = "";     _timelineMemo = null;
  for (const k in reignCache) delete reignCache[k];
  for (const k in rankPeriodCache) delete rankPeriodCache[k];
}

// Clears only the memos the Statistics/Analytics page reads (stats, ASS,
// pair stats, reign + rank-period lookups) — the Statistics page is meant to
// always recompute on demand rather than reuse a stale in-memory result.
export function clearAnalyticsCache() {
  invalidateRatingCaches();
  _statNamesKey = "";    _statNamesMemo = null;
  _statsMemoKey = "";    _statsMemo = null;
  _pairStatsKey = "";    _pairStatsMemo = null;
  _ratingMemoKey = "";   _ratingMemo = null;
  _timelineKey = "";     _timelineMemo = null;
  for (const k in reignCache) delete reignCache[k];
  for (const k in rankPeriodCache) delete rankPeriodCache[k];
}
