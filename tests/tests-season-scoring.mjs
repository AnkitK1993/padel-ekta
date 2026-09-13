// tests-season-scoring.mjs — regression tests for the Summary tab's
// Flip/Fair/Pulse scoring-carryover variants (src/domain/season-scoring.js).
// Run: node tests/tests-season-scoring.mjs

import { computeASS } from "../src/domain/ass.js";
import {
  referenceSeasonFor,
  hasSeasonScoringReference,
  computeFlipASS,
  computeFairASS,
  computePulseASS,
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
// not matter, since Fair/Pulse key off match dates, not season adjacency).
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

ok("computeFair returns a map for S2", fair !== null);
ok(
  "Fair mode is identical to the continuous all-time ASS (no reset)",
  JSON.stringify(fair) === JSON.stringify(continuousAllTime),
  `fair=${JSON.stringify(fair)} continuous=${JSON.stringify(continuousAllTime)}`,
);
ok("computeFairASS falls back to null with no reference (S1)", computeFairASS(ALL_MATCHES, SEASONS, S1) === null);

console.log("\n\x1b[36m── PULSE ─────────────────────────────────────────────\x1b[0m");

const pulse = computePulseASS(ALL_MATCHES, SEASONS, S2);
ok("computePulse returns a map for S2", pulse !== null);

Object.keys(pulse).forEach((p) => {
  const expected = Math.round(1000 + (fair[p] - Math.round(s1Final[p] ?? 1000)));
  ok(
    `pulse[${p}] = Fair − season-start offset, based at 1000`,
    pulse[p] === expected,
    `got ${pulse[p]}, expected ${expected}`,
  );
});

// Pulse and Fair should move by the exact same amount match-to-match (they
// differ only by a per-player constant offset) — verify via two cumulative
// cutoffs within S2.
const partialAll = [...S1_MATCHES, S2_MATCHES[0]];
const fairPartial = computeFairASS(partialAll, SEASONS, S2);
const pulsePartial = computePulseASS(partialAll, SEASONS, S2);
Object.keys(fair).forEach((p) => {
  if (!(p in fairPartial)) return;
  const fairDelta = fair[p] - fairPartial[p];
  const pulseDelta = pulse[p] - pulsePartial[p];
  ok(
    `pulse and fair move identically for ${p} between cutoffs`,
    fairDelta === pulseDelta,
    `fairDelta=${fairDelta} pulseDelta=${pulseDelta}`,
  );
});

ok("computePulseASS falls back to null with no reference (S1)", computePulseASS(ALL_MATCHES, SEASONS, S1) === null);

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
  "'pulse' mode matches computePulseASS",
  JSON.stringify(computeSeasonScoringASS("pulse", ALL_MATCHES, S2_MATCHES, SEASONS, S2)) ===
    JSON.stringify(pulse),
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
  "'pulse' on S1 (no reference) falls back to reset",
  JSON.stringify(computeSeasonScoringASS("pulse", ALL_MATCHES, S1_MATCHES, SEASONS, S1)) ===
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
