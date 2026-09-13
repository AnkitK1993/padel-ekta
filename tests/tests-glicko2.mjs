// tests-glicko2.mjs — regression tests for src/domain/glicko2.js.
// Run: node tests/tests-glicko2.mjs

import {
  computeGlicko2,
  computeGlicko2Full,
  computeMatchGlicko2Deltas,
  GLICKO2_BASE_RATING,
  GLICKO2_BASE_RD,
} from "../src/domain/glicko2.js";

let pass = 0,
  fail = 0;
function ok(name, cond, detail) {
  if (cond) {
    process.stdout.write(`  \x1b[32m✓\x1b[0m ${name}\n`);
    pass++;
  } else {
    process.stdout.write(`  \x1b[31m✗\x1b[0m ${name}\n    \x1b[33m${detail || ""}\x1b[0m\n`);
    fail++;
  }
}
const M = (date, a, b, sa, sb) => ({ date, teamA: a, teamB: b, scoreA: sa, scoreB: sb });

console.log("\n\x1b[36m── Glicko-2: canonical worked example (independently re-derived) ──\x1b[0m");

// Glickman's own published worked example (glicko.net/glicko/glicko2.pdf):
// a player rated 1500/RD200/vol0.06 plays 3 games in one rating period against
// opponents 1400/RD30 (win), 1550/RD100 (loss), 1700/RD300 (loss), tau=0.5.
// Official result: r'≈1464.06, RD'≈151.52, vol'≈0.05999. Re-implemented here
// independently (1500-centered, not this module's rescaled-1000 API) purely to
// verify the underlying algorithm (g/E/v/delta/volatility-solver/phi'/mu')
// before trusting the app's 1000-centered wrapper built on the same formulas.
(function verifyCanonicalAlgorithm() {
  const SCALE = 400 / Math.log(10);
  const toInternal = (r, rd) => ({ mu: (r - 1500) / SCALE, phi: rd / SCALE });
  const g = (phi) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
  const E = (mu, muJ, phiJ) => 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
  const variance = (mu, opps) =>
    1 / opps.reduce((s, { mu: muJ, phi: phiJ }) => s + g(phiJ) * g(phiJ) * E(mu, muJ, phiJ) * (1 - E(mu, muJ, phiJ)), 0);
  const delta = (mu, opps, v) =>
    v * opps.reduce((s, { mu: muJ, phi: phiJ, s: sj }) => s + g(phiJ) * (sj - E(mu, muJ, phiJ)), 0);
  const newVol = (phi, sigma, v, delta, tau) => {
    const a = Math.log(sigma * sigma);
    const f = (x) => {
      const ex = Math.exp(x);
      return (
        (ex * (delta * delta - phi * phi - v - ex)) / (2 * Math.pow(phi * phi + v + ex, 2)) -
        (x - a) / (tau * tau)
      );
    };
    let A = a, B;
    if (delta * delta > phi * phi + v) B = Math.log(delta * delta - phi * phi - v);
    else {
      let k = 1;
      while (f(a - k * tau) < 0) k++;
      B = a - k * tau;
    }
    let fA = f(A), fB = f(B), iter = 0;
    while (Math.abs(B - A) > 0.000001 && iter < 100) {
      const C = A + ((A - B) * fA) / (fB - fA);
      const fC = f(C);
      if (fC * fB <= 0) { A = B; fA = fB; } else { fA = fA / 2; }
      B = C; fB = fC; iter++;
    }
    return Math.exp(A / 2);
  };
  const tau = 0.5;
  const { mu, phi } = toInternal(1500, 200);
  const opps = [
    { ...toInternal(1400, 30), s: 1 },
    { ...toInternal(1550, 100), s: 0 },
    { ...toInternal(1700, 300), s: 0 },
  ];
  const v = variance(mu, opps);
  const d = delta(mu, opps, v);
  const vol2 = newVol(phi, 0.06, v, d, tau);
  const phiStar = Math.sqrt(phi * phi + vol2 * vol2);
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const sum = opps.reduce((s, { mu: muJ, phi: phiJ, s: sj }) => s + g(phiJ) * (sj - E(mu, muJ, phiJ)), 0);
  const newMu = mu + newPhi * newPhi * sum;
  const rPrime = SCALE * newMu + 1500;
  const rdPrime = SCALE * newPhi;
  ok("rating matches official example (≈1464.06)", Math.abs(rPrime - 1464.06) < 0.05, `got ${rPrime.toFixed(2)}`);
  ok("RD matches official example (≈151.52)", Math.abs(rdPrime - 151.52) < 0.05, `got ${rdPrime.toFixed(2)}`);
  ok("volatility matches official example (≈0.05999)", Math.abs(vol2 - 0.05999) < 0.0001, `got ${vol2.toFixed(6)}`);
})();

console.log("\n\x1b[36m── Glicko-2: app-facing API invariants ──────────────\x1b[0m");

const symMatches = [M("2024-01-01", ["A"], ["B"], 6, 3)];
const full1 = computeGlicko2Full(symMatches);
ok("winner's rating increases", full1.A.r > GLICKO2_BASE_RATING, `got ${full1.A.r}`);
ok("loser's rating decreases", full1.B.r < GLICKO2_BASE_RATING, `got ${full1.B.r}`);
ok(
  "symmetric 1v1 (equal start) produces symmetric magnitude",
  Math.abs(full1.A.r - GLICKO2_BASE_RATING - (GLICKO2_BASE_RATING - full1.B.r)) < 0.01,
);
ok("RD shrinks after playing", full1.A.rd < GLICKO2_BASE_RD, `got ${full1.A.rd}`);
ok("RD shrinks for the loser too", full1.B.rd < GLICKO2_BASE_RD, `got ${full1.B.rd}`);

console.log("\n\x1b[36m── Glicko-2: doubles (opponent = averaged pair) ─────\x1b[0m");

const doublesMatches = [M("2024-01-01", ["A1", "A2"], ["B1", "B2"], 6, 2)];
const full2 = computeGlicko2Full(doublesMatches);
["A1", "A2"].forEach((p) => ok(`winner ${p}'s rating increases`, full2[p].r > GLICKO2_BASE_RATING));
["B1", "B2"].forEach((p) => ok(`loser ${p}'s rating decreases`, full2[p].r < GLICKO2_BASE_RATING));
ok(
  "both winning teammates move identically (symmetric roles)",
  Math.abs(full2.A1.r - full2.A2.r) < 0.001,
);

console.log("\n\x1b[36m── Glicko-2: repeated play narrows RD further ───────\x1b[0m");

const manyMatches = [];
for (let i = 0; i < 10; i++) manyMatches.push(M(`2024-01-${10 + i}`, ["A"], ["B"], 6, i % 5));
const fullMany = computeGlicko2Full(manyMatches);
ok(
  "RD after 10 games is smaller than RD after 1 game",
  fullMany.A.rd < full1.A.rd,
  `10-game RD=${fullMany.A.rd}, 1-game RD=${full1.A.rd}`,
);

console.log("\n\x1b[36m── Glicko-2: upset moves rating more than an expected win ──\x1b[0m");

const warmup = [];
for (let i = 0; i < 8; i++) warmup.push(M(`2024-01-${10 + i}`, ["S"], ["W"], 6, 1));
const baseState = computeGlicko2Full(warmup).S.r;
const expectedWin = computeGlicko2Full([...warmup, M("2024-03-01", ["S"], ["W"], 6, 1)]).S.r;
const upset = computeGlicko2Full([...warmup, M("2024-03-01", ["S"], ["W"], 1, 6)]).S.r;
ok(
  "an upset loss moves the favourite's rating more than another expected win",
  Math.abs(upset - baseState) > Math.abs(expectedWin - baseState),
  `expected-win delta=${(expectedWin - baseState).toFixed(2)}, upset delta=${(upset - baseState).toFixed(2)}`,
);

console.log("\n\x1b[36m── computeMatchGlicko2Deltas ─────────────────────────\x1b[0m");

const deltaMap = computeMatchGlicko2Deltas(doublesMatches);
const d0 = deltaMap.get(doublesMatches[0]);
ok("delta map has an entry for the match", !!d0);
ok("dA (winning team avg delta) is positive", d0.dA > 0, `got ${d0.dA}`);
ok("dB (losing team avg delta) is negative", d0.dB < 0, `got ${d0.dB}`);
ok(
  "playerDeltas sum to roughly team totals",
  Math.abs(d0.playerDeltas.A1 - d0.dA) <= 1 && Math.abs(d0.playerDeltas.A2 - d0.dA) <= 1,
);

console.log("\n\x1b[36m── computeGlicko2 (flat map) ─────────────────────────\x1b[0m");

const flat = computeGlicko2(doublesMatches);
ok("flat map matches full map's .r values", flat.A1 === full2.A1.r && flat.B1 === full2.B1.r);
ok(
  "every rating is a finite number",
  Object.values(flat).every((v) => Number.isFinite(v)),
);

console.log(
  `\n\x1b[1mGlicko-2: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`,
);
process.exit(fail ? 1 : 0);
