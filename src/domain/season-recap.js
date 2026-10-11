// ── PERSONAL SEASON RECAP ────────────────────────────────────
// A "Wrapped"-style personal recap for one player over one season's matches.
// Pure function — no DOM, no season-archival dependency — so it works for
// any season (archived or still in progress, as a "recap so far") the same
// way computeStats()/the rating service already do elsewhere. `seasonMatches`
// should already be scoped to the season and guest-filtered (activeMatches()
// filtered by _inSeason(), exactly like archiveSeason() does).
import { rating } from "./rating-service.js";

export function computeSeasonRecap(seasonMatches, playerName) {
  const playerMs = seasonMatches.filter((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].includes(playerName),
  );
  if (!playerMs.length) return null;

  const stats = rating
    .stats(seasonMatches, rating.map(seasonMatches))
    .find((p) => p.name === playerName);
  if (!stats) return null;

  // Rating trajectory across the season for whichever scoring system is
  // active, from that system's own starting level (the same baseline every
  // other season-scoped view uses) — walked via the player's own history
  // entries so "peak"/"low" reflect their actual path, not just the start/end
  // snapshot.
  const timeline = (rating.timeline(seasonMatches).history || {})[playerName] || [];
  const startRating = rating.def();
  const endRating = timeline.length ? rating.round(timeline[timeline.length - 1].elo) : startRating;
  const peakRating = timeline.length ? rating.round(Math.max(...timeline.map((t) => t.elo))) : startRating;
  const lowRating = timeline.length ? rating.round(Math.min(...timeline.map((t) => t.elo))) : startRating;

  // Best win: the single win with the biggest ASS gain (accounts for both
  // margin and opponent strength, same signal the rest of the app uses).
  const wins = timeline.filter((t) => t.won);
  const bestWinEntry = wins.length
    ? wins.reduce((a, b) => (b.delta > a.delta ? b : a))
    : null;

  const daysPlayed = new Set(playerMs.map((m) => m.date).filter(Boolean)).size;

  return {
    name: playerName,
    matchesPlayed: playerMs.length,
    daysPlayed,
    mw: stats.mw,
    ml: stats.ml,
    winPct: Math.round(stats.winPct),
    startRating,
    endRating,
    ratingDelta: rating.round(endRating - startRating),
    peakRating,
    lowRating,
    bestWin: bestWinEntry
      ? {
          opponent: bestWinEntry.opponent,
          scoreA: bestWinEntry.scoreA,
          scoreB: bestWinEntry.scoreB,
          date: bestWinEntry.date,
          gain: bestWinEntry.delta,
        }
      : null,
    nemesis: stats.nemesis,
    favOpp: stats.favOpp,
    bestPartner: stats.bestPartner,
    worstPartner: stats.worstPartner,
    bestWinStreak: stats.bestWinStreak,
    consistency: stats.consistency,
  };
}
