// ── SEASON-CARRYOVER SCORING VARIANTS ────────────────────────
// Three alternate ways to seed/derive a player's ASS when a season other than
// "ALL SEASONS" is active, layered purely on top of the existing computeASS()
// engine — no changes to the scoring math itself. Used by the Summary tab's
// scoring-mode picker; every other surface (Home, Player Detail, Analytics,
// Statistics) keeps using the canonical per-season-reset computeASS().
//
// Reference season = whichever season chronologically precedes the currently
// active one (by start date). "All-time-before-current" = the true cumulative
// ASS carried in from every prior season combined, evaluated once at the
// active season's start date.
import { _inSeason } from "./selectors.js";
import { computeASS } from "./ass.js";
import { orderSeasonsByStart } from "./season-stats.js";

// The season immediately before `season` by start date, or null if `season`
// is the first one (or isn't a real season — e.g. "ALL SEASONS").
export function referenceSeasonFor(seasons, season) {
  if (!season) return null;
  const ordered = orderSeasonsByStart(seasons);
  const idx = ordered.findIndex((s) => s.id === season.id);
  if (idx <= 0) return null;
  return ordered[idx - 1];
}

// True when at least one of the three carryover variants has something valid
// to compute against for `season` (i.e. a reference season exists).
export function hasSeasonScoringReference(seasons, season) {
  return !!referenceSeasonFor(seasons, season);
}

// Cumulative all-time ASS (guest-filtered matches already assumed) as of the
// end of the reference season = every match strictly before `season.start`.
// This is the shared seed all three variants are built from.
function _allTimeBeforeSeasonStart(allMatches, season) {
  if (!season || !season.start) return {};
  const before = allMatches.filter((m) => (m.date || "") < season.start);
  return computeASS(before);
}

// ── FLIP ──────────────────────────────────────────────────────
// seed[p] = 2000 - allTimeBeforeCurrent[p]  (650 -> 1350, 1200 -> 800).
// From there the season progresses exactly like the normal per-season-reset
// computation (seasonMatches, baseline 1000) — only the starting line moves;
// each match's point swing is unchanged. Players absent from the reference
// season seed at neutral 1000, same as a brand-new player in any mode.
export function computeFlipASS(allMatches, seasons, season) {
  const ref = referenceSeasonFor(seasons, season);
  if (!ref) return null;
  const seed = _allTimeBeforeSeasonStart(allMatches, season);
  const seasonMatches = allMatches.filter((m) => _inSeason(season, m.date));
  const seasonAss = computeASS(seasonMatches); // baseline-1000 "Reset" values
  const out = {};
  Object.keys(seasonAss).forEach((p) => {
    const flippedSeed = 2000 - (seed[p] ?? 1000);
    out[p] = Math.round(flippedSeed + (seasonAss[p] - 1000));
  });
  return out;
}

// ── FAIR ──────────────────────────────────────────────────────
// The continuous, never-reset number — identical to what "ALL SEASONS" shows,
// evaluated at each match up through the active season. Opponent-strength
// weighting uses true all-time context instead of an artificially-reset 1000.
export function computeFairASS(allMatches, seasons, season) {
  const ref = referenceSeasonFor(seasons, season);
  if (!ref) return null;
  const upToNow = allMatches.filter((m) => (m.date || "") <= _latestDate(allMatches, season));
  return computeASS(upToNow);
}

// ── PULSE ─────────────────────────────────────────────────────
// Net swing since the season boundary, using the same true-strength-aware
// engine as Fair, but re-based to a clean 1000 at season start — a fair
// "how did you do this season" ranking without Reset's early-season noise
// (where opponent strength is judged purely within-season, before enough
// matches accumulate to mean anything).
export function computePulseASS(allMatches, seasons, season) {
  const ref = referenceSeasonFor(seasons, season);
  if (!ref) return null;
  const fair = computeFairASS(allMatches, seasons, season);
  if (!fair) return null;
  const seed = _allTimeBeforeSeasonStart(allMatches, season);
  const out = {};
  Object.keys(fair).forEach((p) => {
    out[p] = Math.round(1000 + (fair[p] - (seed[p] ?? 1000)));
  });
  return out;
}

// Latest match date within `season` (or the season's own matches' max date) —
// Fair/Pulse should only ever look as far as the active season goes, even
// though their calculation basis is the full continuous history.
function _latestDate(allMatches, season) {
  const seasonMatches = allMatches.filter((m) => _inSeason(season, m.date));
  const dates = seasonMatches.map((m) => m.date || "").filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : "9999-99-99";
}

export const SEASON_SCORING_MODES = ["reset", "flip", "fair", "pulse"];

export const SEASON_SCORING_LABELS = {
  reset: "RESET",
  flip: "FLIP",
  fair: "FAIR",
  pulse: "PULSE",
};

export const SEASON_SCORING_DESCRIPTIONS = {
  reset: "Standard — everyone starts the season fresh at 1000.",
  flip: "Inverts last season's final standings: your S1 finish of X starts you at 2000-X.",
  fair: "Uses your true all-time score — no reset, exactly like ALL SEASONS.",
  pulse: "Net change since the season started, weighted by real opponent strength — 1000 baseline, no early-season noise.",
};

// Compute the ASS map for `mode`, falling back to the standard per-season
// computeASS() (i.e. "reset") whenever no reference season exists or mode is
// unrecognised. `allMatches` should already be guest-filtered, ungrouped
// (cross-season) matches; `seasonMatches` is the already season-scoped subset
// (activeMatches()) used for the reset fallback.
export function computeSeasonScoringASS(mode, allMatches, seasonMatches, seasons, season) {
  if (mode === "flip") {
    const r = computeFlipASS(allMatches, seasons, season);
    if (r) return r;
  } else if (mode === "fair") {
    const r = computeFairASS(allMatches, seasons, season);
    if (r) return r;
  } else if (mode === "pulse") {
    const r = computePulseASS(allMatches, seasons, season);
    if (r) return r;
  }
  return computeASS(seasonMatches);
}
