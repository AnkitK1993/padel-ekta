// tests-season-scoring.mjs — regression tests for the Summary tab's
// Flip/Fair scoring-carryover variants (src/domain/season-scoring.js).
// Run: node tests/tests-season-scoring.mjs

import { computeASS } from "../src/domain/ass.js";
import {
  referenceSeasonFor,
  hasSeasonScoringReference,
  computeFlipASS,
  computeFairASS,
  computeSeasonScoringASS,
} from "../src/domain/season-scoring.js";

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

// Two seasons: S1 (Jan) then S2 (Mar), matching the app's real shape
// ({id, name, start, end}) with a gap in between (Feb, no matches — should
// not matter, since Fair keys off match dates, not season adjacency).
const S1 = { id: "s1", name: "Season 1", start: "2024-01-01", end: "2024-01-31" };
const S2 = { id: "s2", name: "Season 2", start: "2024-03-01", end: null };
const SEASONS = [S1, S2];

const S1_MATCHES = [
  M("2024-01-01", ["Alice", "Bob"], ["Carol", "Dave"], 4, 2),
  M("2024-01-05", ["Alice", "Carol"], ["Bob", "Dave"], 4, 1),
  M("2024-01-10", ["Alice", "Dave"], ["Bob", "Carol"], 3, 4),
  M("2024-01-15", ["Bob", "Carol"], ["Alice", "Dave"], 4, 0),
  M("2024-01-20", ["Carol", "Dave"], ["Alice", "Bob"], 4, 3),
  M("2024-01-25", ["Alice", "Bob"], ["Carol", "Dave"], 5, 2),
];

const S2_MATCHES = [
  M("2024-03-02", ["Alice", "Bob"], ["Carol", "Dave"], 4, 3),
  M("2024-03-08", ["Alice", "Carol"], ["Bob", "Dave"], 2, 4),
  M("2024-03-14", ["Bob", "Dave"], ["Alice", "Carol"], 4, 1),
];

const ALL_MATCHES = [...S1_MATCHES, ...S2_MATCHES];

console.log("\n\x1b[36m── season-scoring: reference season lookup ──────────\x1b[0m");

ok("S2's reference season is S1", referenceSeasonFor(SEASONS, S2)?.id === "s1");
ok("S1 (first season) has no reference", referenceSeasonFor(SEASONS, S1) === null);
ok("null/undefined season has no reference", referenceSeasonFor(SEASONS, null) === null);
ok("hasSeasonScoringReference true for S2", hasSeasonScoringReference(SEASONS, S2) === true);
ok("hasSeasonScoringReference false for S1", hasSeasonScoringReference(SEASONS, S1) === false);

console.log("\n\x1b[36m── FLIP ──────────────────────────────────────────────\x1b[0m");

const s1Final = computeASS(S1_MATCHES);
const flip = computeFlipASS(ALL_MATCHES, SEASONS, S2);

ok("computeFlipASS returns a map for S2 (valid reference)", flip !== null);

// The example from the request: S1 finish of 650 -> flip seed 1350;
// S1 finish of 1200 -> flip seed 800. Verify the formula directly (2000 - x),
// independent of the fixture's actual numbers, using synthetic seeds.
ok(
  "flip formula: 650 -> 1350",
  Math.round(2000 - 650) === 1350,
);
ok(
  "flip formula: 1200 -> 800",
  Math.round(2000 - 1200) === 800,
);

// Verify every player's flip-mode value equals the flipped S1-final seed plus
// their raw within-season net change (season-reset value minus 1000) — i.e.
// the season's point swings are untouched, only the starting line inverts.
const s2Reset = computeASS(S2_MATCHES);
Object.keys(s2Reset).forEach((p) => {
  const expectedSeed = 2000 - Math.round(s1Final[p] ?? 1000);
  const expected = Math.round(expectedSeed + (s2Reset[p] - 1000));
  ok(
    `flip[${p}] = flipped seed + season net change`,
    flip[p] === expected,
    `got ${flip[p]}, expected ${expected}`,
  );
});

ok("computeFlipASS falls back to null with no reference (S1)", computeFlipASS(ALL_MATCHES, SEASONS, S1) === null);

console.log("\n\x1b[36m── FAIR ──────────────────────────────────────────────\x1b[0m");

const fair = computeFairASS(ALL_MATCHES, SEASONS, S2);
const continuousAllTime = computeASS(ALL_MATCHES); // "ALL SEASONS" view — never reset

ok("computeFairASS returns a map for S2", fair !== null);

// Fair's formula: 1000 + (continuous-all-time-now - continuous-all-time-at-
// season-start). Verify every player's value matches that directly, rather
// than trusting the raw continuous number itself (which is NOT what Fair
// should display — the whole point is match points are computed with true
// all-time strength but credited on a clean 1000 season baseline).
Object.keys(fair).forEach((p) => {
  const seed = Math.round(s1Final[p] ?? 1000);
  const expected = Math.round(1000 + (continuousAllTime[p] - seed));
  ok(
    `fair[${p}] = 1000 + (continuous-now − continuous-at-season-start)`,
    fair[p] === expected,
    `got ${fair[p]}, expected ${expected}`,
  );
});

ok(
  "Fair is NOT just the raw continuous all-time number (unless every seed was exactly 1000)",
  Object.keys(fair).some((p) => Math.round(s1Final[p] ?? 1000) !== 1000)
    ? JSON.stringify(fair) !== JSON.stringify(continuousAllTime)
    : true,
);

// Direct worked example from the request: a 1300 all-time player beats a 700
// all-time player and the match is worth 5 points either way — the 1300
// player's season score should land at 1005 (not 1305), the 700 player's at
// 995 (not 695). Verify the rebasing arithmetic in isolation.
(function workedExample() {
  const seedHigh = 1300,
    seedLow = 700,
    matchPoints = 5;
  const continuousHighAfter = seedHigh + matchPoints;
  const continuousLowAfter = seedLow - matchPoints;
  const fairHigh = 1000 + (continuousHighAfter - seedHigh);
  const fairLow = 1000 + (continuousLowAfter - seedLow);
  ok("worked example: 1300 winner's season score is 1005, not 1305", fairHigh === 1005);
  ok("worked example: 700 loser's season score is 995, not 695", fairLow === 995);
})();

ok("computeFairASS falls back to null with no reference (S1)", computeFairASS(ALL_MATCHES, SEASONS, S1) === null);

console.log("\n\x1b[36m── computeSeasonScoringASS (mode dispatch + fallback) ─\x1b[0m");

ok(
  "'reset' mode returns the plain season-scoped computeASS",
  JSON.stringify(computeSeasonScoringASS("reset", ALL_MATCHES, S2_MATCHES, SEASONS, S2)) ===
    JSON.stringify(s2Reset),
);
ok(
  "'flip' mode matches computeFlipASS",
  JSON.stringify(computeSeasonScoringASS("flip", ALL_MATCHES, S2_MATCHES, SEASONS, S2)) ===
    JSON.stringify(flip),
);
ok(
  "'fair' mode matches computeFairASS",
  JSON.stringify(computeSeasonScoringASS("fair", ALL_MATCHES, S2_MATCHES, SEASONS, S2)) ===
    JSON.stringify(fair),
);
ok(
  "unknown mode falls back to reset",
  JSON.stringify(computeSeasonScoringASS("bogus", ALL_MATCHES, S2_MATCHES, SEASONS, S2)) ===
    JSON.stringify(s2Reset),
);
ok(
  "'flip' on S1 (no reference) falls back to reset",
  JSON.stringify(computeSeasonScoringASS("flip", ALL_MATCHES, S1_MATCHES, SEASONS, S1)) ===
    JSON.stringify(computeASS(S1_MATCHES)),
);
ok(
  "'fair' on S1 (no reference) falls back to reset",
  JSON.stringify(computeSeasonScoringASS("fair", ALL_MATCHES, S1_MATCHES, SEASONS, S1)) ===
    JSON.stringify(computeASS(S1_MATCHES)),
);
ok(
  "'reset' mode ignores season argument (null-season / ALL SEASONS)",
  JSON.stringify(computeSeasonScoringASS("reset", ALL_MATCHES, S2_MATCHES, SEASONS, null)) ===
    JSON.stringify(s2Reset),
);

console.log(
  `\n\x1b[1mSeason Scoring: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`,
);
process.exit(fail ? 1 : 0);
