// tests-openskill.mjs — regression tests for src/domain/openskill.js.
// Run: node tests/tests-openskill.mjs
//
// This engine is a from-scratch specialization of Weng-Lin's model to the
// exact 2-team/no-ties case, not a port of a specific reference
// implementation — so unlike Glicko-2 there's no external worked example to
// check byte-for-byte against. Confidence instead comes from a battery of
// mathematical invariants any correct implementation of this model MUST
// satisfy (monotonic sigma shrinkage, symmetric matchup symmetry, upsets
// swinging more than expected results, uncertain players moving faster than
// confident ones), which is the same standard applied to well-known
// implementations' own test suites.

import {
  computeOpenSkill,
  computeOpenSkillFull,
  computeMatchOpenSkillDeltas,
  ordinal,
  OPENSKILL_MU0,
  OPENSKILL_SIGMA0,
} from "../src/domain/openskill.js";

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

console.log("\n\x1b[36m── OpenSkill: single symmetric match ─────────────────\x1b[0m");

const symMatches = [M("2024-01-01", ["A1", "A2"], ["B1", "B2"], 6, 3)];
const full1 = computeOpenSkillFull(symMatches);
ok("winning teammates' mu increases", full1.A1.mu > OPENSKILL_MU0 && full1.A2.mu > OPENSKILL_MU0);
ok("losing teammates' mu decreases", full1.B1.mu < OPENSKILL_MU0 && full1.B2.mu < OPENSKILL_MU0);
ok(
  "equal-start teammates move identically within a team",
  full1.A1.mu === full1.A2.mu && full1.B1.mu === full1.B2.mu,
);
ok(
  "symmetric matchup (equal start) produces symmetric magnitude",
  Math.abs(full1.A1.mu - OPENSKILL_MU0 - (OPENSKILL_MU0 - full1.B1.mu)) < 0.0001,
);
ok(
  "sigma shrinks for every player after playing",
  [full1.A1, full1.A2, full1.B1, full1.B2].every((p) => p.sigma < OPENSKILL_SIGMA0),
);

console.log("\n\x1b[36m── OpenSkill: upset vs. expected result ──────────────\x1b[0m");

const warmup = [];
for (let i = 0; i < 10; i++) warmup.push(M(`2024-01-${10 + i}`, ["S1", "S2"], ["W1", "W2"], 6, 1));
const base = computeOpenSkillFull(warmup).S1.mu;
const expectedWin = computeOpenSkillFull([...warmup, M("2024-03-01", ["S1", "S2"], ["W1", "W2"], 6, 1)]).S1.mu;
const upset = computeOpenSkillFull([...warmup, M("2024-03-01", ["S1", "S2"], ["W1", "W2"], 1, 6)]).S1.mu;
ok(
  "an upset loss moves the favourite's mu more than another expected win",
  Math.abs(upset - base) > Math.abs(expectedWin - base),
  `expected-win delta=${(expectedWin - base).toFixed(2)}, upset delta=${(upset - base).toFixed(2)}`,
);
ok("the favourite's mu still exceeds the underdogs' after 10 expected wins", base > OPENSKILL_MU0);

console.log("\n\x1b[36m── OpenSkill: uncertainty (sigma) drives update size ─\x1b[0m");

// A fresh player (high sigma) partnered with a veteran (low sigma, from many
// prior matches) should move MORE than the veteran on the same win, since
// their own uncertainty is what scales the per-player update.
const veteranWarmup = [];
for (let i = 0; i < 15; i++) veteranWarmup.push(M(`2024-01-${10 + i}`, ["Vet", "Filler1"], ["Filler2", "Filler3"], 6, 3));
const preState = computeOpenSkillFull(veteranWarmup);
ok("veteran's sigma has shrunk well below the fresh-player default", preState.Vet.sigma < OPENSKILL_SIGMA0 * 0.9);

const mixedMatch = [...veteranWarmup, M("2024-03-01", ["Vet", "Rookie"], ["Filler1", "Filler4"], 6, 2)];
const postState = computeOpenSkillFull(mixedMatch);
const vetDelta = Math.abs(postState.Vet.mu - preState.Vet.mu);
const rookieDelta = Math.abs(postState.Rookie.mu - OPENSKILL_MU0);
ok(
  "the fresh rookie's mu moves more than the low-uncertainty veteran's on the same win",
  rookieDelta > vetDelta,
  `veteran delta=${vetDelta.toFixed(2)}, rookie delta=${rookieDelta.toFixed(2)}`,
);

console.log("\n\x1b[36m── ordinal() ──────────────────────────────────────────\x1b[0m");

ok("ordinal = mu - 3*sigma", ordinal(1000, 300) === 1000 - 900);
ok(
  "a brand-new player's ordinal starts far below their mu (conservative estimate)",
  ordinal(OPENSKILL_MU0, OPENSKILL_SIGMA0) < OPENSKILL_MU0,
);

console.log("\n\x1b[36m── computeMatchOpenSkillDeltas ────────────────────────\x1b[0m");

const deltaMap = computeMatchOpenSkillDeltas(symMatches);
const d0 = deltaMap.get(symMatches[0]);
ok("delta map has an entry for the match", !!d0);
ok("dA (winning team avg delta) is positive", d0.dA > 0, `got ${d0.dA}`);
ok("dB (losing team avg delta) is negative", d0.dB < 0, `got ${d0.dB}`);
ok(
  "playerDeltas match the team average for equal-start teammates",
  d0.playerDeltas.A1 === d0.dA && d0.playerDeltas.B1 === d0.dB,
);

console.log("\n\x1b[36m── computeOpenSkill (flat map) ────────────────────────\x1b[0m");

const flat = computeOpenSkill(symMatches);
ok("flat map matches full map's .mu values", flat.A1 === full1.A1.mu && flat.B1 === full1.B1.mu);
ok("every rating is a finite number", Object.values(flat).every((v) => Number.isFinite(v)));

console.log("\n\x1b[36m── Determinism & order independence ──────────────────\x1b[0m");

ok(
  "computeOpenSkill is deterministic",
  JSON.stringify(computeOpenSkill(mixedMatch)) === JSON.stringify(computeOpenSkill(mixedMatch)),
);
const shuffled = [...mixedMatch].reverse();
ok(
  "result is independent of input array order (engine sorts by date internally)",
  JSON.stringify(computeOpenSkill(mixedMatch)) === JSON.stringify(computeOpenSkill(shuffled)),
);

console.log(
  `\n\x1b[1mOpenSkill: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`,
);
process.exit(fail ? 1 : 0);
