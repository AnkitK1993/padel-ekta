// ── GLICKO-2 RATING SYSTEM ───────────────────────────────────
// A faithful port of Glickman's Glicko-2 algorithm (glicko.net/glicko/glicko2.pdf),
// re-anchored to a 1000-centered scale (instead of the chess convention's 1500)
// for visual consistency with ASS/ELO everywhere else in this app. The scale
// factor (400/ln(10) ≈ 173.7178) and every formula below are unchanged from
// the reference algorithm — only the public rating's origin moved from 1500
// to 1000, a valid affine shift since Glicko-2 only ever operates on
// differences/ratios of rating-unit quantities in its internal (mu, phi) space.
//
// Doubles handling: since every match here is a 2v2 team, each player is rated
// against a single "virtual opponent" whose (rating, RD) is the average of the
// two players on the opposing team — the same simplification ASS/ELO already
// use elsewhere in this codebase to turn a team game into a pairwise update.
//
// Rating periods: each match is treated as its own rating period (one played
// game per update), matching how the app shows a delta per individual match
// everywhere else (ASS's pills, the Matches Played list). A player's RD/vol
// only change when THEY play — the "grows with inactivity" half of Glicko-2
// (meant for e.g. a player skipping an entire tournament) is intentionally
// not applied here, since match "periods" aren't uniform across players in a
// casual, irregularly-scheduled app; this is a documented simplification.
const SCALE = 400 / Math.log(10); // ≈ 173.7178
const BASE_RATING = 1000;
const BASE_RD = 350;
const BASE_VOL = 0.06;
const TAU = 0.5; // system constant bounding volatility change per period
const EPSILON = 0.000001;
const MAX_ITER = 100;

function _toInternal(r, rd) {
  return { mu: (r - BASE_RATING) / SCALE, phi: rd / SCALE };
}
function _g(phi) {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}
function _E(mu, muJ, phiJ) {
  return 1 / (1 + Math.exp(-_g(phiJ) * (mu - muJ)));
}
// opponents: [{ mu, phi, s }] — s = 1 win, 0 loss (0.5 draws aren't possible
// in padel, but the formula supports it if ever needed).
function _variance(mu, opponents) {
  let sum = 0;
  opponents.forEach(({ mu: muJ, phi: phiJ }) => {
    const e = _E(mu, muJ, phiJ);
    sum += _g(phiJ) * _g(phiJ) * e * (1 - e);
  });
  return 1 / sum;
}
function _delta(mu, opponents, v) {
  let sum = 0;
  opponents.forEach(({ mu: muJ, phi: phiJ, s }) => {
    sum += _g(phiJ) * (s - _E(mu, muJ, phiJ));
  });
  return v * sum;
}
function _newVolatility(phi, sigma, v, delta) {
  const a = Math.log(sigma * sigma);
  const f = (x) => {
    const ex = Math.exp(x);
    const num = ex * (delta * delta - phi * phi - v - ex);
    const den = 2 * (phi * phi + v + ex) * (phi * phi + v + ex);
    return num / den - (x - a) / (TAU * TAU);
  };
  let A = a;
  let B;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0 && k < MAX_ITER) k++;
    B = a - k * TAU;
  }
  let fA = f(A);
  let fB = f(B);
  let iter = 0;
  while (Math.abs(B - A) > EPSILON && iter < MAX_ITER) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
    iter++;
  }
  return Math.exp(A / 2);
}

// Applies one rating period (a single match here) for a player who played
// against `opponents` (in our usage, always exactly one virtual opponent —
// the average of the opposing pair). Returns updated { r, rd, vol }.
function _updatePlayer(r, rd, vol, opponents) {
  const { mu, phi } = _toInternal(r, rd);
  const oppInternal = opponents.map((o) => ({
    ..._toInternal(o.r, o.rd),
    s: o.s,
  }));
  const v = _variance(mu, oppInternal);
  const delta = _delta(mu, oppInternal, v);
  const newVol = _newVolatility(phi, vol, v, delta);
  const phiStar = Math.sqrt(phi * phi + newVol * newVol);
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  let sum = 0;
  oppInternal.forEach(({ mu: muJ, phi: phiJ, s }) => {
    sum += _g(phiJ) * (s - _E(mu, muJ, phiJ));
  });
  const newMu = mu + newPhi * newPhi * sum;
  return {
    r: SCALE * newMu + BASE_RATING,
    rd: SCALE * newPhi,
    vol: newVol,
  };
}

// Computes final { r, rd, vol } per player after walking `matches` in date
// order, one rating period per match, doubles resolved via the opposing
// pair's averaged (r, rd).
export function computeGlicko2Full(matches) {
  const state = {}; // name -> { r, rd, vol }
  const ensure = (p) => {
    if (!state[p]) state[p] = { r: BASE_RATING, rd: BASE_RD, vol: BASE_VOL };
    return state[p];
  };
  [...matches]
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .forEach((m) => {
      const teamA = m.teamA || [];
      const teamB = m.teamB || [];
      [...teamA, ...teamB].forEach(ensure);
      const aWon = m.scoreA > m.scoreB;
      // Snapshot pre-match state for both teams before either side updates —
      // otherwise team B's update would see team A's already-updated rating.
      const before = {};
      [...teamA, ...teamB].forEach((p) => (before[p] = { ...state[p] }));
      const avgOf = (players) => {
        const rs = players.map((p) => before[p].r);
        const rds = players.map((p) => before[p].rd);
        return {
          r: rs.reduce((s, v) => s + v, 0) / Math.max(rs.length, 1),
          rd: rds.reduce((s, v) => s + v, 0) / Math.max(rds.length, 1),
        };
      };
      const oppOfA = { ...avgOf(teamB), s: aWon ? 1 : 0 };
      const oppOfB = { ...avgOf(teamA), s: aWon ? 0 : 1 };
      teamA.forEach((p) => {
        const cur = before[p];
        state[p] = _updatePlayer(cur.r, cur.rd, cur.vol, [oppOfA]);
      });
      teamB.forEach((p) => {
        const cur = before[p];
        state[p] = _updatePlayer(cur.r, cur.rd, cur.vol, [oppOfB]);
      });
    });
  return state;
}

// Flat { name: rating } map — the shape computeStats()/ratingToSr() expect,
// matching computeASS()'s return shape.
export function computeGlicko2(matches) {
  const full = computeGlicko2Full(matches);
  const out = {};
  Object.keys(full).forEach((p) => {
    out[p] = full[p].r;
  });
  return out;
}

// Per-match rating deltas, in the same Map<match, {dA, dB, playerDeltas}>
// shape as computeMatchASSDeltas — dA/dB are the team-average delta (rounded)
// for the summary match-row pills; playerDeltas is per-player.
export function computeMatchGlicko2Deltas(matches) {
  const state = {};
  const ensure = (p) => {
    if (!state[p]) state[p] = { r: BASE_RATING, rd: BASE_RD, vol: BASE_VOL };
    return state[p];
  };
  const map = new Map();
  [...matches]
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .forEach((m) => {
      const teamA = m.teamA || [];
      const teamB = m.teamB || [];
      [...teamA, ...teamB].forEach(ensure);
      const aWon = m.scoreA > m.scoreB;
      const before = {};
      [...teamA, ...teamB].forEach((p) => (before[p] = { ...state[p] }));
      const avgOf = (players) => {
        const rs = players.map((p) => before[p].r);
        const rds = players.map((p) => before[p].rd);
        return {
          r: rs.reduce((s, v) => s + v, 0) / Math.max(rs.length, 1),
          rd: rds.reduce((s, v) => s + v, 0) / Math.max(rds.length, 1),
        };
      };
      const oppOfA = { ...avgOf(teamB), s: aWon ? 1 : 0 };
      const oppOfB = { ...avgOf(teamA), s: aWon ? 0 : 1 };
      const playerDeltas = {};
      let sumA = 0,
        sumB = 0;
      teamA.forEach((p) => {
        const cur = before[p];
        const next = _updatePlayer(cur.r, cur.rd, cur.vol, [oppOfA]);
        const d = Math.round(next.r - cur.r);
        playerDeltas[p] = d;
        sumA += d;
        state[p] = next;
      });
      teamB.forEach((p) => {
        const cur = before[p];
        const next = _updatePlayer(cur.r, cur.rd, cur.vol, [oppOfB]);
        const d = Math.round(next.r - cur.r);
        playerDeltas[p] = d;
        sumB += d;
        state[p] = next;
      });
      map.set(m, {
        dA: teamA.length ? Math.round(sumA / teamA.length) : 0,
        dB: teamB.length ? Math.round(sumB / teamB.length) : 0,
        playerDeltas,
      });
    });
  return map;
}

export const GLICKO2_BASE_RATING = BASE_RATING;
export const GLICKO2_BASE_RD = BASE_RD;
