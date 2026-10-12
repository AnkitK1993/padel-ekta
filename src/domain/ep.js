// ── EARNED POINTS (EP) ───────────────────────────────────────
// Every other system here is a RATING: everyone is handed 1000 up front and
// the number drifts from there. That anchor is a gift that only erodes with
// exposure, so the safest way to stay high on the board is to stop playing —
// on real history a player with 2 matches and 0 wins sat 7th of 14 while a
// player with 12 wins from 30 matches sat 13th.
//
// EP removes the anchor. Everyone starts at 0 and EARNS from every match, and
// WIN RATE IS THE BASELINE: a win is worth about the same whoever you beat
// (~100), so a player's score is essentially "how often do you win", nudged
// by who you played and with. An earlier version let a win swing between
// 0.5x and 1.5x on the opposition, and a 43% player who kept beating strong
// sides out-ranked 62% and 64% players; win rate only explained the order at
// rho 0.46. Now it is ~0.9 on real Season 2 / Season 1 data.
//   • a win pays ~100, +/-20% for how strong the opposition was (OPP_W)
//   • a veteran's loss COSTS, more when the team was favoured (VET_LOSS, a
//     moderate 25 — tuned on held-out seasons, see scripts/ep-holdout.mjs)
//   • a NEWCOMER's loss pays a small credit (LOSS_BASE) so showing up is never
//     punished while you are learning
//
// Inputs that decide what a match is worth:
//   1. EXPECTATION (p) — team win probability from an internal ELO walk. It
//      only moves a win by a modest amount (see OPP_W) and sizes a veteran's
//      loss; partner quality is inside it (a weaker partner lowers p). The
//      walk starts level at the first match of every scored window (a season,
//      a day, a filter) and learns only from that window — an earlier season's
//      strength is never the benchmark for this one. Career game counts (the
//      newcomer flag below) still span every season.
//   2. NEWCOMER FLAG — career games (ALL seasons) under MATURITY_GAMES (50).
//      Binary, and career-wide on purpose: a veteran does not become a rookie
//      again when a new season starts or a date filter changes.
//   3. MARGIN — a 4-0 is not a 4-3, modestly (MARGIN_W).
//   4. TEAMMATE SPLIT — the team's points are re-split toward whichever
//      partner has the lower public ASS right now (see TEAM_SPLIT_*), capped
//      at 12% of the award. The cap is deliberately small: the split always
//      flows from the stronger partner to the weaker one, so at full strength
//      it flattens the board and pulls the order away from win rate.
//
// The leaderboard key is EP / (games + SHRINKAGE), not raw total EP. Raw
// total rewards mileage over quality — on real history it put a 49% player
// above a 67% player purely on volume. The SHRINKAGE term is a block of
// zero-point phantom games: negligible next to 50 real games, overwhelming
// next to 2, so it prices small samples out without needing a minimum-games
// cutoff. Totals are still worth surfacing as a secondary "how much have I
// put in" number — they just shouldn't decide the order.

const WIN_BASE = 100; // a neutral win, before opposition and margin
// Opposition swing on a win: 1 + OPP_W * (0.5 - p). Deliberately mild — a win
// over a stronger side is worth a little more and over a weaker side a little
// less, but it must never let a losing record out-earn a winning one.
const OPP_W = 0.4;
const VET_LOSS = 25; // veteran loss costs up to this (when the team was a heavy favourite)
const LOSS_BASE = 10; // newcomer loss CREDIT, "you turned up" (scaled by how big the underdog)
// Career games (ALL seasons) before a player stops being a newcomer. A binary
// flag, not a ramp, and career-wide so it never resets with a new season.
const MATURITY_GAMES = 50;
const MARGIN_W = 0.4; // margin swing: 4-0 pays 1.20x, 4-3 pays 0.90x
const SHUTOUT_BONUS = 1.05; // extra for conceding nothing (~11% of matches)
export const EP_SHRINKAGE = 10; // phantom zero-point games in the rank key
// The headline "ASS" number is DOUBLED at the source (total / (games + 10) * 2)
// so every consumer — leaderboard, timelines, projections, deltas — sees the
// same scale without a print-time patch. Raw point totals (TOTAL column, the
// per-match "pts") are NOT scaled; they are points, not ratings.
export const EP_SCALE = 2;
// Teammate split. Whichever partner currently has the lower public ASS is the
// weaker player, and the team's points are re-split in their favour — no
// matter how many games either has played (a 30-game player on 80 ASS counts
// as better than a 90-game player on 75). The team's total is unchanged, only
// who gets how much of it. The shift is a fraction of the award, growing with
// the rating gap and capped, so a hair's-breadth difference barely moves
// anything.
export const TEAM_SPLIT_GAP_SCALE = 20; // rating gap (raw ASS) that reaches the cap...
export const TEAM_SPLIT_MAX_SHIFT = 0.12; // ...of this fraction of the award

const byDate = (a, b) => (a.date || "").localeCompare(b.date || "");

// Walks `careerMatches` (the full cross-season history) to keep ELO and career
// game counts warm, but only awards — and returns — EP for matches in
// `matches`. That split is what lets a Season 2 or TODAY leaderboard start
// its points at 0 while still knowing that a player has 200 games behind them.
export function computeMatchEPDeltas(matches, careerMatches = null, opts = {}) {
  const scoring = new Set(matches || []);
  // Union so a scoring match is never skipped just because the caller passed
  // a career list that doesn't contain it.
  const walk = [...new Set([...(careerMatches || []), ...(matches || [])])].sort(
    byDate,
  );

  const elo = {};
  const careerGames = {};
  // Running public score inputs, accumulated over the SCORED window only (so a
  // new season starts everyone at 0, exactly like the leaderboard).
  const epTot = {};
  const epGames = {};
  const map = new Map();
  const rating = (p) => (epTot[p] || 0) / ((epGames[p] || 0) + EP_SHRINKAGE);

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

      // Each award also records how it was built, for display: the pre-split
      // amount and the factors behind it.
      const breakdown = {};
      const award = (p, teamP, won) => {
        const vet = careerGames[p] >= MATURITY_GAMES;
        let raw;
        let oppF = null;
        let qualityF;
        if (won) {
          oppF = 1 + OPP_W * (0.5 - teamP);
          qualityF = winQ;
          raw = Math.round(WIN_BASE * oppF * winQ);
        } else if (!vet) {
          // Newcomers (under 50 career games) are in a growth phase: a loss
          // still pays a little.
          qualityF = lossQ;
          raw = Math.round(LOSS_BASE * (1 - teamP) * lossQ);
        } else {
          // Veterans have no such cushion — a loss costs, more so when the
          // team was favoured and when it was lopsided.
          qualityF = 2 - lossQ;
          raw = Math.round(-VET_LOSS * teamP * (2 - lossQ));
        }
        breakdown[p] = { won, vet, teamP, oppF, qualityF, raw, shift: 0 };
        return raw;
      };

      const playerDeltas = {};
      teamA.forEach((p) => (playerDeltas[p] = award(p, expA, aWon)));
      teamB.forEach((p) => (playerDeltas[p] = award(p, 1 - expA, !aWon)));

      // Re-split each pair's points toward the weaker (lower-ASS) partner.
      [teamA, teamB].forEach((team) => {
        if (team.length !== 2) return;
        const [x, y] = team;
        const gap = Math.abs(rating(x) - rating(y));
        const f = Math.min(TEAM_SPLIT_MAX_SHIFT, (gap / TEAM_SPLIT_GAP_SCALE) * TEAM_SPLIT_MAX_SHIFT);
        const shift = Math.round(
          f * Math.abs((playerDeltas[x] + playerDeltas[y]) / 2),
        );
        if (!shift) return;
        const [weak, strong] = rating(x) < rating(y) ? [x, y] : [y, x];
        playerDeltas[weak] += shift;
        playerDeltas[strong] -= shift;
        breakdown[weak].shift = shift;
        breakdown[strong].shift = -shift;
      });

      const sum = (t) => t.reduce((acc, p) => acc + playerDeltas[p], 0);
      const sumA = sum(teamA);
      const sumB = sum(teamB);
      [...teamA, ...teamB].forEach((p) => {
        epTot[p] = (epTot[p] || 0) + playerDeltas[p];
        epGames[p] = (epGames[p] || 0) + 1;
      });

      map.set(m, {
        dA: Math.round(sumA / teamA.length),
        dB: Math.round(sumB / teamB.length),
        playerDeltas,
        expA,
        breakdown,
      });
    }

    // Expectation only learns from the matches being scored: every window
    // (a season, a day, a filter) starts with everyone level, so an earlier
    // season's strength never decides who was the favourite in this one. The
    // career game counts (the 50-game newcomer flag) still come from the full
    // history. Pass { blindElo: false } to learn from the whole career instead.
    const learnElo = opts.blindElo === false || scoring.has(m);
    const eloDA = learnElo ? Math.round(32 * ((aWon ? 1 : 0) - expA)) : 0;
    const eloDB = learnElo ? Math.round(32 * ((aWon ? 0 : 1) - (1 - expA))) : 0;
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
export function computeEPFull(matches, careerMatches = null, opts = {}) {
  const ep = {};
  const games = {};
  computeMatchEPDeltas(matches, careerMatches, opts).forEach(({ playerDeltas }) => {
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
      score: (EP_SCALE * ep[p]) / (games[p] + EP_SHRINKAGE),
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

// { history, peaks, lows } in the same shape as the other engines' timelines, so the
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
      const score = (EP_SCALE * totals[p]) / (played[p] + EP_SHRINKAGE);
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

// Upsets, on ASS's own terms: walks matches with the same career-aware
// internal ELO EP already uses to price every match (the "expectation" input
// from the module header), and flags any match the LOSING side of that
// expectation actually won. `gap` is how many internal-ELO points separate
// the two teams' pre-match strength (winner's disadvantage) — a form of
// "how big a surprise was this," on the same walk that decides everyone's
// EP that match, not a separate metric bolted on after the fact.
export function computeEPUpsets(matches, careerMatches = null) {
  const walk = [...new Set([...(careerMatches || []), ...(matches || [])])].sort(
    byDate,
  );
  const scoring = new Set(matches || []);
  const elo = {};
  const upsets = [];

  walk.forEach((m) => {
    const teamA = m.teamA || [];
    const teamB = m.teamB || [];
    if (!teamA.length || !teamB.length) return;
    [...teamA, ...teamB].forEach((p) => {
      if (!(p in elo)) elo[p] = 1000;
    });

    const avg = (t) => t.reduce((s, p) => s + elo[p], 0) / t.length;
    const strengthA = avg(teamA);
    const strengthB = avg(teamB);
    const expA = 1 / (1 + Math.pow(10, (strengthB - strengthA) / 400));
    const aWon = m.scoreA > m.scoreB;

    if (scoring.has(m)) {
      const winnerExp = aWon ? expA : 1 - expA;
      if (winnerExp < 0.5) {
        const winners = aWon ? teamA : teamB;
        const losers = aWon ? teamB : teamA;
        const winnerStrength = aWon ? strengthA : strengthB;
        const loserStrength = aWon ? strengthB : strengthA;
        upsets.push({
          date: m.date,
          winners,
          losers,
          sw: Math.max(m.scoreA, m.scoreB),
          sl: Math.min(m.scoreA, m.scoreB),
          gap: Math.round(loserStrength - winnerStrength),
        });
      }
    }

    if (!scoring.has(m)) return; // same fresh start as the scoring walk
    const eloDA = Math.round(32 * ((aWon ? 1 : 0) - expA));
    const eloDB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
    teamA.forEach((p) => (elo[p] += eloDA));
    teamB.forEach((p) => (elo[p] += eloDB));
  });

  return upsets;
}

// Projects every player's leaderboard score forward `futureM` matches, from
// their average EP earned over their last `formN` matches (a simple rate
// projection — it does not attempt to re-simulate opponents, maturity
// ramping, or margin for hypothetical future matches, matching the level of
// approximation the retired classic engine's feature used).
//
// Both the current and projected score go through the SAME shrinkage
// denominator EP always uses, `games + EP_SHRINKAGE` — the projected score's
// denominator is `games + futureM + EP_SHRINKAGE`, so a low-volume player's
// projection is still discounted by the same "not enough evidence yet" logic
// as their current score, rather than assuming futureM games alone fixes it.
export function computeEPProjection(matches, careerMatches, formN, futureM) {
  const full = computeEPFull(matches, careerMatches);
  const { history } = computeEPTimeline(matches, careerMatches);
  const rows = Object.keys(full).map((name) => {
    const { ep, games, score } = full[name];
    const hist = history[name] || [];
    const recent = hist.slice(-formN);
    const avgDelta = recent.length
      ? recent.reduce((s, h) => s + h.delta, 0) / recent.length
      : 0;
    const projEp = ep + avgDelta * futureM;
    const projGames = games + futureM;
    const projScore = (EP_SCALE * projEp) / (projGames + EP_SHRINKAGE);
    return { name, games, avgDelta, currentScore: score, projScore };
  });

  const rank = (key) => {
    const sorted = [...rows].sort((a, b) => b[key] - a[key]);
    const map = {};
    sorted.forEach((r, i) => (map[r.name] = i + 1));
    return map;
  };
  const currentRank = rank("currentScore");
  const projRank = rank("projScore");
  rows.forEach((r) => {
    r.currentRank = currentRank[r.name];
    r.projRank = projRank[r.name];
    r.rankDiff = r.currentRank - r.projRank;
  });
  return rows;
}
