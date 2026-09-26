// ── SEASON STATS ────────────────────────────────────────────
// Cross-season helpers built on top of the existing per-match engines
// (computeASS, computeStats) and the season-membership helper (_inSeason).
// These are inherently cross-season (like Season Comparison in app.js), so
// callers pass a guest-filtered, ALL-seasons match list — typically
// withoutGuestMatches(state.matches) — rather than the season-scoped
// activeMatches().
import { _inSeason } from "./selectors.js";
import { computeASS } from "./ass.js";
import { computeStats } from "./stats.js";

// Seasons ordered oldest-first by start date.
export function orderSeasonsByStart(seasons) {
  return [...seasons].sort((a, b) => (a.start || "").localeCompare(b.start || ""));
}

// One row per season the player has matches in, oldest → newest.
// [{ season, rank, outOf, ass, sr, mp, mw, ml }]
// ratingMapFn/srFn/ratingDefault let a caller follow the Summary tab's active
// scoring system instead of always ranking seasons by ASS CLASSIC; all three
// default to the original ASS CLASSIC behaviour so existing callers/tests
// are unaffected.
export function computeSeasonTrajectory(
  matches,
  seasons,
  playerName,
  ratingMapFn = computeASS,
  srFn = null,
  ratingDefault = 1000,
) {
  const rows = [];
  orderSeasonsByStart(seasons).forEach((season) => {
    const ms = matches.filter((m) => _inSeason(season, m.date));
    if (!ms.length) return;
    const ass = ratingMapFn(ms);
    const standings = computeStats(ms, ass, srFn ? srFn(ass) : undefined);
    const idx = standings.findIndex((p) => p.name === playerName);
    if (idx === -1) return;
    const p = standings[idx];
    rows.push({
      season,
      rank: idx + 1,
      outOf: standings.length,
      ass: ass[playerName] ?? ratingDefault,
      sr: p.sr,
      mp: p.mp,
      mw: p.mw,
      ml: p.ml,
    });
  });
  return rows;
}

// Rank/ASS delta for every player present in both seasons, sorted by
// assDelta descending (biggest risers first).
// [{ name, assA, assB, assDelta, rankA, rankB, rankDelta }]
// ratingMapFn/ratingDefault default to ASS CLASSIC for existing callers/tests;
// pass the active system's accessors to follow the Summary tab's picker.
export function computeSeasonRiserFaller(
  matches,
  seasonA,
  seasonB,
  ratingMapFn = computeASS,
  ratingDefault = 1000,
) {
  const msA = matches.filter((m) => _inSeason(seasonA, m.date));
  const msB = matches.filter((m) => _inSeason(seasonB, m.date));
  if (!msA.length || !msB.length) return [];
  const assA = ratingMapFn(msA);
  const assB = ratingMapFn(msB);
  const standingsA = computeStats(msA, assA);
  const standingsB = computeStats(msB, assB);
  const rankA = new Map(standingsA.map((p, i) => [p.name, i + 1]));
  const rankB = new Map(standingsB.map((p, i) => [p.name, i + 1]));
  const rows = [];
  standingsB.forEach((p) => {
    if (!rankA.has(p.name)) return;
    const a = assA[p.name] ?? ratingDefault;
    const b = assB[p.name] ?? ratingDefault;
    rows.push({
      name: p.name,
      assA: a,
      assB: b,
      assDelta: b - a,
      rankA: rankA.get(p.name),
      rankB: rankB.get(p.name),
      // Positive rankDelta = moved UP the table (e.g. #5 -> #2 = +3).
      rankDelta: rankA.get(p.name) - rankB.get(p.name),
    });
  });
  return rows.sort((a, b) => b.assDelta - a.assDelta);
}

// Buckets one player's matches by (opponent, season). `matches` must already
// be that player's own matches (e.g. pdPlayerMs). Matches whose date falls
// outside every defined season are excluded from the result — the caller is
// expected to still show the season-agnostic aggregate elsewhere.
// Returns Map<opponentName, [{season, w, l, p}]> oldest→newest per opponent.
export function computeHeadToHeadSeasonSplits(matches, seasons, playerName) {
  const ordered = orderSeasonsByStart(seasons);
  const result = new Map();
  matches.forEach((m) => {
    const season = ordered.find((s) => _inSeason(s, m.date));
    if (!season) return;
    const inA = (m.teamA || []).includes(playerName);
    const won = inA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
    const opponents = inA ? m.teamB || [] : m.teamA || [];
    opponents.forEach((opp) => {
      if (!result.has(opp)) result.set(opp, []);
      const list = result.get(opp);
      let entry = list.find((e) => e.season.id === season.id);
      if (!entry) {
        entry = { season, w: 0, l: 0, p: 0 };
        list.push(entry);
      }
      entry.p++;
      if (won) entry.w++;
      else entry.l++;
    });
  });
  return result;
}

// True when a season has ended (s.end < todayIso) and no season — including
// one that hasn't started yet — currently covers today.
export function seasonNeedsRollover(seasons, todayIso) {
  const ended = seasons.filter((s) => s.end && s.end < todayIso);
  if (!ended.length) return false;
  const covered = seasons.some((s) => _inSeason(s, todayIso));
  return !covered;
}
