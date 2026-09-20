// ── EARNED POINTS (EP) ───────────────────────────────────────
// Every other system here is a RATING: everyone is handed 1000 up front and
// the number drifts from there. That anchor is a gift that only erodes with
// exposure, so the safest way to stay high on the board is to stop playing —
// on real history a player with 2 matches and 0 wins sat 7th of 14 while a
// player with 12 wins from 30 matches sat 13th.
//
// EP removes the anchor. Everyone starts at 0 and EARNS from every match:
//   • a win always pays, scaled by how unlikely it was
//   • a loss also pays while you're new, so showing up is never punished
//   • once you're established, a loss you were expected to win starts costing
//
// Three inputs decide what a match is worth:
//   1. EXPECTATION (p) — team win probability from an internal ELO walk, the
//      same mechanism ASS already uses for its strength multiplier. Beating a
//      stronger team pays more; losing to one costs less. This is also what
//      handles partner quality: pairing with a weaker player lowers p, which
//      raises the win award and softens the loss, so carrying someone is not
//      punished. Per-match expected value works out near-identical whoever
//      you partner (~46 vs ~45 on real ratings), so the board can't be farmed
//      by cherry-picking partners.
//   2. MATURITY — career games / MATURITY_GAMES, clamped to 1. Scales ONLY
//      the loss penalty, so newcomers earn on every match while veterans are
//      accountable. Deliberately CAREER games, not games in the window being
//      scored: a veteran must not get rookie protection again each time a new
//      season starts or a date filter changes.
//   3. MARGIN — a 4-0 is not a 4-3. Weight is deliberately modest: on real
//      history the correlation between a team's rating edge and its margin is
//      only 0.166 (a 100+ point edge buys well under half a point of margin),
//      so margin is real signal but noisy, and over-weighting it would just
//      reward running up the score.
//
// The leaderboard key is EP / (games + SHRINKAGE), not raw total EP. Raw
// total rewards mileage over quality — on real history it put a 49% player
// above a 67% player purely on volume. The SHRINKAGE term is a block of
// zero-point phantom games: negligible next to 50 real games, overwhelming
// next to 2, so it prices small samples out without needing a minimum-games
// cutoff. Totals are still worth surfacing as a secondary "how much have I
// put in" number — they just shouldn't decide the order.

const WIN_BASE = 100; // a neutral win, before expectation and margin
const LOSS_BASE = 40; // the "you turned up" component of a loss
const PENALTY = 60; // maximum loss penalty, reached at full maturity
const MATURITY_GAMES = 50; // career games until losses are fully accountable
const MARGIN_W = 0.4; // margin swing: 4-0 pays 1.20x, 4-3 pays 0.90x
const SHUTOUT_BONUS = 1.05; // extra for conceding nothing (~11% of matches)
export const EP_SHRINKAGE = 10; // phantom zero-point games in the rank key

const byDate = (a, b) => (a.date || "").localeCompare(b.date || "");

// Walks `careerMatches` (the full cross-season history) to keep ELO and career
// game counts warm, but only awards — and returns — EP for matches in
// `matches`. That split is what lets a Season 2 or TODAY leaderboard start
// its points at 0 while still knowing that a player has 200 games behind them.
export function computeMatchEPDeltas(matches, careerMatches = null) {
  const scoring = new Set(matches || []);
  // Union so a scoring match is never skipped just because the caller passed
  // a career list that doesn't contain it.
  const walk = [...new Set([...(careerMatches || []), ...(matches || [])])].sort(
    byDate,
  );

  const elo = {};
  const careerGames = {};
  const map = new Map();

  walk.forEach((m) => {
    const teamA = m.teamA || [];
    const teamB = m.teamB || [];
    if (!teamA.length || !teamB.length) return;
    [...teamA, ...teamB].forEach((p) => {
      if (!(p in elo)) elo[p] = 1000;
      if (!(p in careerGames)) careerGames[p] = 0;
    });

    const avg = (t) => t.reduce((s, p) => s + elo[p], 0) / t.length;
    const strengthA = avg(teamA);
    const strengthB = avg(teamB);
    const expA = 1 / (1 + Math.pow(10, (strengthB - strengthA) / 400));
    const aWon = m.scoreA > m.scoreB;

    if (scoring.has(m)) {
      const winScore = Math.max(m.scoreA, m.scoreB, 1);
      const normMargin = Math.min(
        1,
        Math.abs(m.scoreA - m.scoreB) / winScore,
      );
      const shutout = Math.min(m.scoreA, m.scoreB) === 0 ? SHUTOUT_BONUS : 1;
      const winQ = (1 - MARGIN_W / 2 + MARGIN_W * normMargin) * shutout;
      const lossQ = (1 + MARGIN_W / 2 - MARGIN_W * normMargin) / shutout;

      const award = (p, teamP, won) => {
        if (won) return Math.round(WIN_BASE * (0.5 + (1 - teamP)) * winQ);
        const maturity = Math.min(1, careerGames[p] / MATURITY_GAMES);
        return Math.round(
          LOSS_BASE * (1 - teamP) * lossQ - PENALTY * teamP * maturity,
        );
      };

      const playerDeltas = {};
      let sumA = 0;
      let sumB = 0;
      teamA.forEach((p) => {
        const d = award(p, expA, aWon);
        playerDeltas[p] = d;
        sumA += d;
      });
      teamB.forEach((p) => {
        const d = award(p, 1 - expA, !aWon);
        playerDeltas[p] = d;
        sumB += d;
      });

      map.set(m, {
        dA: Math.round(sumA / teamA.length),
        dB: Math.round(sumB / teamB.length),
        playerDeltas,
      });
    }

    const eloDA = Math.round(32 * ((aWon ? 1 : 0) - expA));
    const eloDB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
    teamA.forEach((p) => {
      elo[p] += eloDA;
      careerGames[p]++;
    });
    teamB.forEach((p) => {
      elo[p] += eloDB;
      careerGames[p]++;
    });
  });

  return map;
}

// { name: { ep, games, score } } — `games` counts only the scored window (it
// is the leaderboard denominator), while maturity above used career games.
export function computeEPFull(matches, careerMatches = null) {
  const ep = {};
  const games = {};
  computeMatchEPDeltas(matches, careerMatches).forEach(({ playerDeltas }) => {
    Object.entries(playerDeltas).forEach(([p, d]) => {
      ep[p] = (ep[p] || 0) + d;
      games[p] = (games[p] || 0) + 1;
    });
  });
  const out = {};
  Object.keys(ep).forEach((p) => {
    out[p] = {
      ep: ep[p],
      games: games[p],
      score: ep[p] / (games[p] + EP_SHRINKAGE),
    };
  });
  return out;
}

// Flat rank key, matching the shape the other engines expose.
export function computeEP(matches, careerMatches = null) {
  const full = computeEPFull(matches, careerMatches);
  const out = {};
  Object.keys(full).forEach((p) => (out[p] = full[p].score));
  return out;
}

// { history, peaks, lows } in the same shape as computeASSTimeline, so the
// analytics renderers can swap between engines transparently.
//
// `elo` here tracks the running LEADERBOARD score — cumulative EP over
// (games so far + SHRINKAGE) — not the cumulative total. The total only ever
// climbs, which would make "peak" always the last match and "low" always the
// first; the score is the number actually shown on the board and genuinely
// moves both ways, so its peak and low mean something. The trade-off is that
// the first handful of matches read low by construction (the shrinkage term
// dominates a small denominator) and climb as the sample fills out.
//
// `delta` stays the raw EP earned for that match — "what did this match pay"
// is the useful per-row number, and it's what the match-delta column shows.
export function computeEPTimeline(matches, careerMatches = null) {
  const history = {};
  const peaks = {};
  const lows = {};
  const totals = {};
  const played = {};

  const ordered = [...(matches || [])].sort(byDate);
  const deltas = computeMatchEPDeltas(matches, careerMatches);

  ordered.forEach((m) => {
    const entry = deltas.get(m);
    if (!entry) return;
    const teamA = m.teamA || [];
    const teamB = m.teamB || [];
    const aWon = m.scoreA > m.scoreB;

    const record = (p, won, opponent, mine, theirs) => {
      if (!(p in totals)) {
        totals[p] = 0;
        played[p] = 0;
        history[p] = [];
        peaks[p] = -Infinity;
        lows[p] = Infinity;
      }
      const d = entry.playerDeltas[p];
      totals[p] += d;
      played[p]++;
      const score = totals[p] / (played[p] + EP_SHRINKAGE);
      history[p].push({
        date: m.date,
        elo: score,
        delta: d,
        won,
        opponent,
        scoreA: mine,
        scoreB: theirs,
      });
      if (score > peaks[p]) peaks[p] = score;
      if (score < lows[p]) lows[p] = score;
    };

    teamA.forEach((p) => record(p, aWon, teamB.join(" & "), m.scoreA, m.scoreB));
    teamB.forEach((p) => record(p, !aWon, teamA.join(" & "), m.scoreB, m.scoreA));
  });

  return { history, peaks, lows };
}
