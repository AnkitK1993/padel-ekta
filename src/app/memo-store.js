// ── MEMO STORE ─────────────────────────────────────────────────────────────
// Centralises all app-level memoised computations that sit above the engine
// modules (elo, stats, pairs) but below the view renderers.
//
// Why a module instead of inline lets in app.js:
//   • All invalidation in ONE place — _invalidateAll() is the only entry point.
//   • Engine modules stay pure (no knowledge of how their results are cached).
//   • Renderers call the memo functions; they never call engine functions directly.
//   • Unit-testable without a DOM or live state (pass any matches array).
//
// Pattern: each memo is (key → value). On any data change invalidate() resets
// all keys; per-read key comparison re-computes only when the dataset changed.

import { computeElo, computeEloHistory, computeEloPeaks, computeEloLows, clearEloCache, _lightFingerprint } from "../engine/elo.js";
import { computeStats } from "../engine/stats.js";
import { getPairStats } from "../engine/pairs.js";
import { activeMatches, invalidateAmMemo } from "../engine/selectors.js";

// Per-section caches that grow one entry per distinct dataset and would
// otherwise leak unbounded across a session. Cleared on every invalidation.
export const reignCache = {};
export const rankPeriodCache = {};

// ── Elo (decay-aware) ──────────────────────────────────────────
let _eloMemo = null, _eloMemoKey = "", _eloMemoDecay = false;

export function memoElo(decay = false) {
  const am = activeMatches();
  const key = decay
    ? `d|${JSON.stringify({ ...getEloDecayParams(), today: _todayISO() })}|${_lightFingerprint(am)}`
    : `r||${_lightFingerprint(am)}`;
  if (_eloMemoKey === key && _eloMemo) return _eloMemo;
  _eloMemoKey = key;
  _eloMemoDecay = decay;
  _eloMemo = computeElo(am, decay);
  return _eloMemo;
}

// ── Elo history ────────────────────────────────────────────────
let _eloHistMemo = null, _eloHistKey = "";

export function memoEloHistory() {
  const am = activeMatches();
  const key = _lightFingerprint(am);
  if (_eloHistKey === key && _eloHistMemo) return _eloHistMemo;
  _eloHistKey = key;
  _eloHistMemo = computeEloHistory(am);
  return _eloHistMemo;
}

// ── Elo peaks / lows ───────────────────────────────────────────
let _eloPeaksMemo = null, _eloPeaksKey = "";
let _eloLowsMemo = null, _eloLowsKey = "";

export function memoEloPeaks() {
  const am = activeMatches();
  const key = _lightFingerprint(am);
  if (_eloPeaksKey === key && _eloPeaksMemo) return _eloPeaksMemo;
  _eloPeaksKey = key;
  _eloPeaksMemo = computeEloPeaks(am);
  return _eloPeaksMemo;
}

export function memoEloLows() {
  const am = activeMatches();
  const key = _lightFingerprint(am);
  if (_eloLowsKey === key && _eloLowsMemo) return _eloLowsMemo;
  _eloLowsKey = key;
  _eloLowsMemo = computeEloLows(am);
  return _eloLowsMemo;
}

// ── Stats ──────────────────────────────────────────────────────
let _statsMemo = null, _statsMemoKey = "";
let _statNamesMemo = null, _statNamesKey = "";
let _dataVersionRef = { v: 0 };  // injected by app.js

export function initMemoStoreDeps({ getDataVersion, getEloDecayParams: _gdp, todayISO: _t }) {
  _getDataVersion = getDataVersion;
  getEloDecayParams = _gdp;
  _todayISO = _t;
}

let _getDataVersion = () => 0;
let getEloDecayParams = () => ({ perWeek: 1, graceDays: 28, maxDecay: 30, floor: 900 });
let _todayISO = () => new Date().toISOString().slice(0, 10);

function _statKey() {
  return `${_getDataVersion()}|${_lightFingerprint(activeMatches())}`;
}

export function memoStats() {
  const key = _statKey();
  if (_statsMemoKey !== key || !_statsMemo) {
    _statsMemoKey = key;
    _statsMemo = computeStats(activeMatches(), memoElo());
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

// ── Invalidation ───────────────────────────────────────────────
// Single entry point called by commit() — resets every cache key so that the
// next read for any memo unconditionally recomputes. Also clears the engine
// LRU (elo.js) and the activeMatches selector cache.
export function invalidateAll() {
  invalidateAmMemo();
  clearEloCache();
  _eloMemoKey = "";      _eloMemo = null;
  _eloHistKey = "";      _eloHistMemo = null;
  _eloPeaksKey = "";     _eloPeaksMemo = null;
  _eloLowsKey = "";      _eloLowsMemo = null;
  _statNamesKey = "";    _statNamesMemo = null;
  _statsMemoKey = "";    _statsMemo = null;
  _pairStatsKey = "";    _pairStatsMemo = null;
  for (const k in reignCache) delete reignCache[k];
  for (const k in rankPeriodCache) delete rankPeriodCache[k];
}
