// ── SCORING LAB ────────────────────────────────────────────
// A sandbox for comparing ways of scoring the SAME matches. It never changes
// what the rest of the app shows — the live leaderboard always comes from the
// rating service. The Statistics page's "Scoring Lab" section lists LAB_OPTIONS
// and, for the one picked, shows its leaderboard and every match's points.
//
// The ASS-family options all run through labEPDeltas(): the live ASS engine
// (src/domain/ep.js) rewritten with its constants as parameters, so a variant
// is just a different parameter set. With LAB_EP_DEFAULTS it reproduces the
// live engine exactly — tests/tests-scoring-lab.mjs checks that on real data,
// so the lab can't quietly drift from what the Summary tab shows.
//
// Pure: no DOM, no app state.

export const LAB_EP_DEFAULTS = {
  winBase: 100, // a neutral win
  // "opp": win = winBase × (1 + oppW × (0.5 − p)) — the live formula
  // "classic": win = winBase × (0.5 + (1 − p)) — 50…150 by how big an underdog
  winMode: "opp",
  oppW: 0.4,
  // "binary": newcomer (< maturity career games) loss pays a small credit,
  //           a veteran's loss costs up to vetLoss — the live formula
  // "ramp":   credit fades out and cost fades in over the first `maturity` games
  // "classic": credit (lossBase) minus a penalty that grows to `penalty`
  lossMode: "binary",
  vetLoss: 25,
  lossBase: 10,
  penalty: 60,
  maturity: 50,
  marginW: 0.4,
  shutout: 1.05,
  shrinkage: 10, // phantom zero-point games in the score (and the split's rating)
  rankShrinkage: null, // score-only override (null = same as shrinkage)
  scale: 2, // the headline number is scale × points ÷ (games + shrinkage)
  splitMax: 0.12, // teammate re-split toward the lower-rated partner, max share
  splitGapScale: 20,
  // "window": who's favoured is learned only from the matches being scored;
  // "career": learned from every match ever played
  expectation: "window",
};

const byDate = (a, b) => (a.date || "").localeCompare(b.date || "");

// Map(match -> { playerDeltas, dA, dB, expA, breakdown }) for `matches`,
// walking `career` (all history) to keep strength and career game counts warm.
export function labEPDeltas(matches, career = null, params = {}) {
  const P = { ...LAB_EP_DEFAULTS, ...params };
  const scoring = new Set(matches || []);
  const walk = [...new Set([...(career || []), ...(matches || [])])].sort(byDate);
  const elo = {};
  const careerGames = {};
  const epTot = {};
  const epGames = {};
  const map = new Map();
  const rating = (p) => (epTot[p] || 0) / ((epGames[p] || 0) + P.shrinkage);

  walk.forEach((m) => {
    const teamA = m.teamA || [];
    const teamB = m.teamB || [];
    if (!teamA.length || !teamB.length) return;
    [...teamA, ...teamB].forEach((p) => {
      if (!(p in elo)) elo[p] = 1000;
      if (!(p in careerGames)) careerGames[p] = 0;
    });
    const avg = (t) => t.reduce((s, p) => s + elo[p], 0) / t.length;
    const expA = 1 / (1 + Math.pow(10, (avg(teamB) - avg(teamA)) / 400));
    const aWon = m.scoreA > m.scoreB;

    if (scoring.has(m)) {
      const winScore = Math.max(m.scoreA, m.scoreB, 1);
      const normMargin = Math.min(1, Math.abs(m.scoreA - m.scoreB) / winScore);
      const shutout = Math.min(m.scoreA, m.scoreB) === 0 ? P.shutout : 1;
      const winQ = (1 - P.marginW / 2 + P.marginW * normMargin) * shutout;
      const lossQ = (1 + P.marginW / 2 - P.marginW * normMargin) / shutout;
      const breakdown = {};
      const award = (p, teamP, won) => {
        const games = careerGames[p];
        const mat = Math.min(1, games / P.maturity);
        const vet = games >= P.maturity;
        let raw;
        if (won) {
          raw =
            P.winMode === "classic"
              ? Math.round(P.winBase * (0.5 + (1 - teamP)) * winQ)
              : Math.round(P.winBase * (1 + P.oppW * (0.5 - teamP)) * winQ);
        } else if (P.lossMode === "classic") {
          raw = Math.round(P.lossBase * (1 - teamP) * lossQ - P.penalty * teamP * mat);
        } else if (P.lossMode === "ramp") {
          raw = Math.round(
            P.lossBase * (1 - teamP) * lossQ * (1 - mat) - P.vetLoss * teamP * (2 - lossQ) * mat,
          );
        } else if (!vet) {
          raw = Math.round(P.lossBase * (1 - teamP) * lossQ);
        } else {
          raw = Math.round(-P.vetLoss * teamP * (2 - lossQ));
        }
        breakdown[p] = { won, careerGames: games, vet, teamP, raw, shift: 0 };
        return raw;
      };
      const playerDeltas = {};
      teamA.forEach((p) => (playerDeltas[p] = award(p, expA, aWon)));
      teamB.forEach((p) => (playerDeltas[p] = award(p, 1 - expA, !aWon)));

      if (P.splitMax > 0)
        [teamA, teamB].forEach((team) => {
          if (team.length !== 2) return;
          const [x, y] = team;
          const gap = Math.abs(rating(x) - rating(y));
          const f = Math.min(P.splitMax, (gap / P.splitGapScale) * P.splitMax);
          const shift = Math.round(f * Math.abs((playerDeltas[x] + playerDeltas[y]) / 2));
          if (!shift) return;
          const [weak, strong] = rating(x) < rating(y) ? [x, y] : [y, x];
          playerDeltas[weak] += shift;
          playerDeltas[strong] -= shift;
          breakdown[weak].shift = shift;
          breakdown[strong].shift = -shift;
        });

      const sum = (t) => t.reduce((acc, p) => acc + playerDeltas[p], 0);
      [...teamA, ...teamB].forEach((p) => {
        epTot[p] = (epTot[p] || 0) + playerDeltas[p];
        epGames[p] = (epGames[p] || 0) + 1;
      });
      map.set(m, {
        dA: Math.round(sum(teamA) / teamA.length),
        dB: Math.round(sum(teamB) / teamB.length),
        playerDeltas,
        expA,
        breakdown,
      });
    }

    const learn = P.expectation === "career" || scoring.has(m);
    const dA = learn ? Math.round(32 * ((aWon ? 1 : 0) - expA)) : 0;
    const dB = learn ? Math.round(32 * ((aWon ? 0 : 1) - (1 - expA))) : 0;
    teamA.forEach((p) => {
      elo[p] += dA;
      careerGames[p]++;
    });
    teamB.forEach((p) => {
      elo[p] += dB;
      careerGames[p]++;
    });
  });
  return map;
}

// { name: { ep, games, score } } from a deltas map.
export function labEPFull(deltas, params = {}) {
  const P = { ...LAB_EP_DEFAULTS, ...params };
  const shrink = P.rankShrinkage ?? P.shrinkage;
  const ep = {};
  const games = {};
  deltas.forEach(({ playerDeltas }) =>
    Object.entries(playerDeltas).forEach(([p, d]) => {
      ep[p] = (ep[p] || 0) + d;
      games[p] = (games[p] || 0) + 1;
    }),
  );
  const out = {};
  Object.keys(ep).forEach((p) => {
    out[p] = { ep: ep[p], games: games[p], score: (P.scale * ep[p]) / (games[p] + shrink) };
  });
  return out;
}

// Plain win %: { name: { ep: wins, games, score: win% } }.
export function labWinPct(matches) {
  const out = {};
  (matches || []).forEach((m) => {
    const aWon = m.scoreA > m.scoreB;
    [[m.teamA || [], aWon], [m.teamB || [], !aWon]].forEach(([t, won]) =>
      t.forEach((p) => {
        const r = (out[p] ||= { ep: 0, games: 0, score: 0 });
        r.games++;
        if (won) r.ep++;
      }),
    );
  });
  Object.values(out).forEach((r) => (r.score = (100 * r.ep) / r.games));
  return out;
}

// What the Statistics page offers. `kind`:
//   "ep"     — labEPDeltas with `params`
//   "system" — one of the app's other scoring engines, via the rating service
//   "winpct" — labWinPct
export const LAB_OPTIONS = [
  {
    id: "live",
    label: "ASS (live)",
    kind: "ep",
    params: {},
    desc: "Exactly what the Summary tab shows today. A win pays about 100: up to 20% more for beating a stronger side, less for a weaker one, and more for a bigger margin (a shutout earns a little extra). Until a player's 50th career game a loss still pays a small credit; after that a loss costs up to 25 — more when their team was the favourite. Who was favoured is judged only on the matches in this view. Partners' points are nudged (up to 12%) toward the lower-rated partner. Score = 2 × points ÷ (games + 10), so a handful of games can't top the board.",
  },
  {
    id: "vet40",
    label: "Veteran loss 40",
    kind: "ep",
    params: { vetLoss: 40 },
    desc: "Same as live, except a veteran's loss (50+ career games) costs up to 40 instead of 25. Losing hurts experienced players more; newcomers are unaffected.",
  },
  {
    id: "career",
    label: "All-seasons strength",
    kind: "ep",
    params: { expectation: "career" },
    desc: "Same as live, except who was the favourite in each match is judged on strength learned from ALL history (every season), not only the matches in this view. A player who was strong last season starts this one as a favourite, so beating them pays more and losing to them costs less. With every season in view (All seasons, all dates) it's identical to live.",
  },
  {
    id: "ramp",
    label: "Gradual maturity",
    kind: "ep",
    params: { lossMode: "ramp" },
    desc: "Same as live, except there's no switch at 50 games: the newcomer's loss credit fades out and the veteran's loss cost (up to 25) fades in a little with every career game, from game 1 to game 50.",
  },
  {
    id: "noshrink",
    label: "Average points",
    kind: "ep",
    params: { rankShrinkage: 0 },
    desc: "Same points per match as live, but ranked by plain average points per game — without the 10 'phantom' zero-point games live adds. A short hot streak counts fully, so players with few games can jump to the top.",
  },
  {
    id: "oct2",
    label: "2 Oct version",
    kind: "ep",
    params: {
      winMode: "classic",
      lossMode: "classic",
      lossBase: 40,
      penalty: 60,
      splitMax: 0,
      expectation: "career",
      scale: 1,
    },
    desc: "The scoring as it was on 2 October. A win pays 50–150 depending on how big an underdog the team was (bigger upsets pay more). A loss pays a 'turned up' credit of up to 40 minus a penalty of up to 60 that grows over a player's first 50 career games. Strength is learned from all history and there's no teammate split. Shown on its original scale (about half of today's numbers) — compare ranks, not numbers.",
  },
  {
    id: "first",
    label: "First ASS",
    kind: "ep",
    params: {
      winMode: "classic",
      lossMode: "classic",
      lossBase: 40,
      penalty: 60,
      splitMax: 0.5,
      expectation: "career",
      scale: 1,
    },
    desc: "The first ASS version: the 2 October formulas plus a large teammate split — up to 50% of a team's points moved toward the lower-rated partner. Original scale (about half of today's numbers) — compare ranks, not numbers.",
  },
  {
    id: "winpct",
    label: "Win %",
    kind: "winpct",
    desc: "Plain win percentage: matches won ÷ matches played. No adjustment for the opponents, the margin or how many games someone played (ties go to the player with more wins). A useful baseline: every other option is win % plus adjustments.",
  },
  {
    id: "glicko2",
    label: "Glicko-2",
    kind: "system",
    system: "glicko2",
    desc: "The chess-style Glicko-2 rating, everyone starting at 1000. Each match moves a player by how surprising the result was against the average of the other pair, and moves new or uncertain players more (the ± column is that uncertainty).",
  },
  {
    id: "openskill",
    label: "OpenSkill",
    kind: "system",
    system: "openskill",
    desc: "A Bayesian skill rating (the open alternative to Xbox's TrueSkill), starting at 1000. It keeps a skill estimate and an uncertainty per player; upsets and uncertain players move most. The ± column is the uncertainty.",
  },
  {
    id: "fairshare",
    label: "Fair Share",
    kind: "system",
    system: "fairshare",
    desc: "A 1000-based rating where each match moves the team by the margin and the opposition's strength, then splits it by the partners' skill gap: the weaker partner moves more, up after a win and down after a loss (opponents tend to target the weaker player).",
  },
];

export const labOption = (id) => LAB_OPTIONS.find((o) => o.id === id) || LAB_OPTIONS[0];
