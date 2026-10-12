// ── PER-MATCH RATINGS (the History feed's numbers) ─────────────────────────
// One walk per season over the RATED matches gives every player's rating
// before -> after each match. This is the single source for "what did this
// match do to my rating": the History cards, the match overlay, Player Detail,
// head-to-head and the share poster all read matchRating(m), so the same
// match can't show two different numbers on two screens.
import { state } from "../domain/state.js";
import { ratedMatches, _inSeason } from "../domain/selectors.js";
import { rating } from "../domain/rating-service.js";
import { memoPairStats, dataVersion } from "./memo-store.js";

// Heavy precompute for the history feed: one chronological ASS walk yielding
// per-match ASS deltas + pre-match pair ranks, plus the pair-vs-pair H2H map.
// Depends only on the data and the active system, so it's memoized on
// (data version, system, array identity). buildMatchCards runs on every history render/filter and this walk
// is O(matches × pairs) — recomputing it each time was a mobile hot spot.
let _memo = null;
export function matchCardPrecompute() {
  const ratedRef = ratedMatches();
  if (
    _memo &&
    _memo.version === dataVersion() &&
    _memo.system === rating.system() &&
    _memo.matchesRef === state.matches &&
    _memo.ratedRef === ratedRef
  )
    return _memo;
  const rated = new Set(ratedRef);
  const eloMatchMap = new Map();
  const matchPairRankMap = new Map(); // match → Map(pairKey → pre-match rank)
  const _mcDefault = rating.def();
  const allPairsList = memoPairStats(); // all pairs ever formed
  const sortedForPrecompute = [...state.matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  // Follows the active scoring picker — was hardcoded to classic ASS, so
  // every History card's rating pill and pre-match pair rank stayed on the
  // 1000-baseline engine regardless of which system was selected. Reads off
  // the same per-system timeline Statistics/Player Detail use (not a naive
  // running sum of raw match deltas) because for a shrinkage-based engine
  // (EP) the raw per-match delta is on a different scale than the displayed
  // score — summing it directly would blow the pill's numbers up into the
  // thousands instead of showing the real, bounded leaderboard score.
  // Each season is scored on its own, exactly like the Summary leaderboard:
  // ratings restart at the baseline and only that season's matches feed the
  // score (EP still reads the full career for its internal expectation and
  // maturity). Walking every season as one continuous history made a
  // veteran's per-match change tiny — a 320-game player's shrinkage
  // denominator dwarfed a 70-game player's — which is not what either
  // player's season score does.
  const seasonKey = (m) =>
    state.seasons.find((sn) => _inSeason(sn, m.date))?.id ?? "__none__";
  const groups = new Map();
  sortedForPrecompute.forEach((m) => {
    const k = seasonKey(m);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(m);
  });
  groups.forEach((groupMatches) => {
    // Ratings are walked over RATED matches only (no guests, no excluded
    // players) — the very list the leaderboard scores — so a card's "after"
    // for a player is that player's leaderboard number at that point. An
    // unrated match stays in the log as a plain result: no rating change.
    const timeline = rating.timeline(
      groupMatches.filter((m) => rated.has(m)),
    ).history;
    const cur = {};
    const idxByPlayer = {};
    groupMatches.forEach((m) => {
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
        if (!(p in cur)) cur[p] = _mcDefault;
      });
      // Rank all pairs by their avg rating right now (before this match)
      matchPairRankMap.set(
        m,
        new Map(
          allPairsList
            .map((p) => ({
              key: p.key,
              avgElo:
                p.players.reduce((sum, n) => sum + (cur[n] ?? _mcDefault), 0) /
                p.players.length,
            }))
            .sort((a, b) => b.avgElo - a.avgElo)
            .map(({ key }, i) => [key, i + 1]),
        ),
      );
      if (!rated.has(m)) return; // plain result: no rating change
      const mData = {};
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
        const hist = timeline[p] || [];
        const idx = idxByPlayer[p] ?? 0;
        const entry = hist[idx];
        const before = cur[p] ?? _mcDefault;
        const after = entry ? entry.elo : before;
        mData[p] = { delta: after - before, after };
        cur[p] = after;
        idxByPlayer[p] = idx + 1;
      });
      eloMatchMap.set(m, mData);
    });
  });
  // Enhancement 8: pre-compute pair-vs-pair H2H records
  const pvpMap = {};
  state.matches.forEach((hm) => {
    const pa = (hm.teamA || []).slice().sort().join("&");
    const pb = (hm.teamB || []).slice().sort().join("&");
    if (!pa || !pb) return;
    const key = pa <= pb ? `${pa}|${pb}` : `${pb}|${pa}`;
    if (!pvpMap[key]) pvpMap[key] = { a: 0, b: 0, aFirst: pa <= pb };
    const aWonH = hm.scoreA > hm.scoreB;
    const paFirst = pvpMap[key].aFirst;
    if (paFirst ? aWonH : !aWonH) pvpMap[key].a++;
    else pvpMap[key].b++;
  });
  _memo = {
    version: dataVersion(),
    system: rating.system(),
    matchesRef: state.matches,
    ratedRef,
    eloMatchMap,
    matchPairRankMap,
    pvpMap,
  };
  return _memo;
}

// { [player]: { delta, after } } for one match, or null for a match that
// changes no rating (a guest or excluded player was in it).
export function matchRating(m) {
  return matchCardPrecompute().eloMatchMap.get(m) || null;
}
