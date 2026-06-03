// ── DATA SELECTORS ─────────────────────────────────────────
// The app's universal match-access layer: season scoping + guest/excluded-player
// filtering (activeMatches, memoised) and date-range filtering (filterMatches),
// plus the season-membership helpers. Reads the shared `state`; everything else
// (the per-device view prefs that app.js owns and reassigns, and the date
// helpers) is injected via initSelectorsDeps so this module stays decoupled.
import { state } from "./state.js";

let deps = {
  getDataVersion: () => 0, // bumped by commit(); part of the memo key
  getActiveSeasonId: () => "all", // per-device season view pref
  getExcludedPlayers: () => new Set(), // manually excluded player names
  getSessionGuestUnexcluded: () => new Set(), // guests temporarily re-included
  todayISO: () => "",
  weekISO: () => "",
  monthISO: () => "",
  weekendRange: () => ({ from: "", to: "" }),
  lastWeekRange: () => ({ from: "", to: "" }),
};

export function initSelectorsDeps(d) {
  deps = { ...deps, ...d };
}

// ── activeMatches() memo (invalidated by app.js on any data change) ──
let _amMemo = null,
  _amMemoKey = "";
let _hmMemo = null,
  _hmMemoKey = "";
export function invalidateAmMemo() {
  _amMemo = null;
  _hmMemo = null;
}

// ── SEASON HELPERS ─────────────────────────────────────────
// The currently-selected season object, or null when "ALL SEASONS".
export function _activeSeason() {
  const id = deps.getActiveSeasonId();
  if (!id || id === "all") return null;
  return state.seasons.find((s) => s.id === id) || null;
}
// True when `dateStr` (YYYY-MM-DD) falls inside the season's range. An empty
// end means open-ended (ongoing). Inclusive on both bounds.
export function _inSeason(s, dateStr) {
  const d = dateStr || "";
  if (!d) return false;
  if (s.start && d < s.start) return false;
  if (s.end && d > s.end) return false;
  return true;
}
// Count matches in a season range (ignores guest exclusion — raw range size).
export function _seasonMatchCount(s) {
  if (!s) return state.matches.length;
  let n = 0;
  for (const m of state.matches) if (_inSeason(s, m.date)) n++;
  return n;
}

// Names of players currently treated as guests (and not temporarily re-included
// for this session). Guests are kept out of all statistics.
export function guestNames() {
  return Object.values(state.players)
    .filter((p) => p.isGuest && !deps.getSessionGuestUnexcluded().has(p.name))
    .map((p) => p.name);
}

// Drop every match that involves a current guest. For stats surfaces that are
// inherently cross-season (Season Comparison, Leaderboard Replay) and therefore
// can't go through the season-scoped activeMatches(), but must still ignore
// guests. Same whole-match semantics activeMatches() uses.
export function withoutGuestMatches(matches) {
  const g = new Set(guestNames());
  if (!g.size) return matches;
  return matches.filter(
    (m) => ![...(m.teamA || []), ...(m.teamB || [])].some((p) => g.has(p)),
  );
}

// ── ACTIVE MATCHES (season-scoped + guest/excluded filtered, memoised) ──
export function activeMatches() {
  const s = _activeSeason();
  const excludedArr = [...guestNames(), ...deps.getExcludedPlayers()];
  const key = `${deps.getDataVersion()}|${deps.getActiveSeasonId()}|${excludedArr.sort().join(",")}`;
  if (_amMemoKey === key && _amMemo) return _amMemo;
  let base = state.matches;
  if (s) base = base.filter((m) => _inSeason(s, m.date));
  let result = base;
  if (excludedArr.length) {
    const excluded = new Set(excludedArr);
    result = base.filter(
      (m) =>
        ![...(m.teamA || []), ...(m.teamB || [])].some((p) => excluded.has(p)),
    );
  }
  _amMemoKey = key;
  _amMemo = result;
  return result;
}

// ── HISTORY MATCHES (season-scoped, INCLUDES guests) ───────
// The History page is a raw match log, so it shows guest matches (unlike the
// stats-facing activeMatches()). Still honours the season + manual excluded
// players. Separate memo so it doesn't thrash activeMatches().
export function historyMatches() {
  const s = _activeSeason();
  const excludedArr = [...deps.getExcludedPlayers()]; // manual excludes only — keep guests
  const key = `${deps.getDataVersion()}|${deps.getActiveSeasonId()}|${excludedArr.sort().join(",")}`;
  if (_hmMemoKey === key && _hmMemo) return _hmMemo;
  let base = state.matches;
  if (s) base = base.filter((m) => _inSeason(s, m.date));
  let result = base;
  if (excludedArr.length) {
    const excluded = new Set(excludedArr);
    result = base.filter(
      (m) =>
        ![...(m.teamA || []), ...(m.teamB || [])].some((p) => excluded.has(p)),
    );
  }
  _hmMemoKey = key;
  _hmMemo = result;
  return result;
}

// ── DATE-RANGE FILTER ──────────────────────────────────────
function _applyDateFilter(base, f, from, to) {
  const t = deps.todayISO(),
    sw = deps.weekISO(),
    swe = t,
    sm = deps.monthISO(),
    wr = deps.weekendRange(),
    lwr = deps.lastWeekRange();
  return base.filter((m) => {
    if (f === "all") return true;
    if (f === "today") return m.date === t;
    if (f === "week") return m.date >= sw && m.date <= swe;
    if (f === "weekend") return m.date >= wr.from && m.date <= wr.to;
    if (f === "month") return m.date >= sm && m.date <= t;
    if (f === "lastweek") return m.date >= lwr.from && m.date <= lwr.to;
    if (f === "day") return from ? m.date === from : m.date === t;
    if (f === "range") {
      const d = m.date || "";
      if (!d) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    }
    return true;
  });
}

// Stats / leaderboards: guest-excluded base.
export function filterMatches(f, from, to) {
  return _applyDateFilter(activeMatches(), f, from, to);
}
// History log: guest-inclusive base.
export function filterHistoryMatches(f, from, to) {
  return _applyDateFilter(historyMatches(), f, from, to);
}
