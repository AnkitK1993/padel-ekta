// ── LEAGUE ─────────────────────────────────────────────────────────────
// Football-style standings: a win is worth 3 points, a loss 0. The table is
// ordered by win % first, then game difference (games won − games lost); two
// players level on both share the place.
//
// The headline number is the win % itself (what orders the table). Game
// difference rides along as a tiebreak far below the printed precision
// (LEAGUE_GD_STEP per game — the closest two different win % can be is about
// 1e-4, and no game difference gets near 1000), so sorting on the number
// alone gives exactly win % → game difference → tie.
export const LEAGUE_WIN_POINTS = 3;
const LEAGUE_GD_STEP = 1e-8;

const byDate = (a, b) => (a.date || "").localeCompare(b.date || "");
const scoreOf = (r) => (r.mp ? (100 * r.mw) / r.mp : 0) + LEAGUE_GD_STEP * r.gd;

// name -> { mp, mw, ml, gw, gl, gd, winPct, ep (league points), score }.
// `ep` is the points total so every "TOTAL" column reads the same field.
export function computeLeagueFull(matches) {
  const out = {};
  const add = (p, won, gf, ga) => {
    const r = (out[p] ||= { mp: 0, mw: 0, ml: 0, gw: 0, gl: 0, gd: 0, winPct: 0, ep: 0, score: 0 });
    r.mp++;
    won ? r.mw++ : r.ml++;
    r.gw += Number(gf) || 0;
    r.gl += Number(ga) || 0;
    r.gd = r.gw - r.gl;
    r.winPct = (100 * r.mw) / r.mp;
    r.ep = LEAGUE_WIN_POINTS * r.mw;
    r.score = scoreOf(r);
  };
  (matches || []).forEach((m) => {
    const aWon = Number(m.scoreA) > Number(m.scoreB);
    (m.teamA || []).forEach((p) => add(p, aWon, m.scoreA, m.scoreB));
    (m.teamB || []).forEach((p) => add(p, !aWon, m.scoreB, m.scoreA));
  });
  return out;
}

// Per-match { playerDeltas (change in the headline number), playerAfter
// (the number after the match), points (3 / 0) }, walked in date order.
export function computeMatchLeagueDeltas(matches) {
  const run = {};
  const out = new Map();
  [...(matches || [])].sort(byDate).forEach((m) => {
    const aWon = Number(m.scoreA) > Number(m.scoreB);
    const playerDeltas = {};
    const playerAfter = {};
    const points = {};
    const step = (p, won, gf, ga) => {
      const r = (run[p] ||= { mp: 0, mw: 0, gd: 0 });
      const before = r.mp ? scoreOf(r) : 0;
      r.mp++;
      if (won) r.mw++;
      r.gd += (Number(gf) || 0) - (Number(ga) || 0);
      playerAfter[p] = scoreOf(r);
      playerDeltas[p] = playerAfter[p] - before;
      points[p] = won ? LEAGUE_WIN_POINTS : 0;
    };
    (m.teamA || []).forEach((p) => step(p, aWon, m.scoreA, m.scoreB));
    (m.teamB || []).forEach((p) => step(p, !aWon, m.scoreB, m.scoreA));
    out.set(m, { playerDeltas, playerAfter, points });
  });
  return out;
}
