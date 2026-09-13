// tests-season-recap.mjs — regression tests for src/domain/season-recap.js.
// Run: node tests/tests-season-recap.mjs

import { computeSeasonRecap } from "../src/domain/season-recap.js";
import { computeASS } from "../src/domain/ass.js";

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

console.log("\n\x1b[36m── computeSeasonRecap: basic shape ────────────────────\x1b[0m");

const matches = [
  M("2024-01-01", ["Ankit", "Bob"], ["Carol", "Dave"], 6, 2),
  M("2024-01-05", ["Ankit", "Carol"], ["Bob", "Dave"], 6, 4),
  M("2024-01-10", ["Ankit", "Dave"], ["Bob", "Carol"], 3, 6),
  M("2024-01-15", ["Bob", "Carol"], ["Ankit", "Dave"], 4, 6),
];
const recap = computeSeasonRecap(matches, "Ankit");

ok("returns a non-null recap for a player who played", !!recap);
ok("matchesPlayed matches the number of matches the player appeared in", recap.matchesPlayed === 4);
ok("daysPlayed counts distinct dates", recap.daysPlayed === 4);
ok("record (mw/ml) matches computeStats", recap.mw === 3 && recap.ml === 1);
ok("winPct is rounded and consistent with 3/4", recap.winPct === 75);
ok("startRating is always the 1000 season baseline", recap.startRating === 1000);
ok("endRating matches the final computeASS() value for this player", recap.endRating === Math.round(computeASS(matches).Ankit));
ok("ratingDelta = endRating - startRating", recap.ratingDelta === recap.endRating - 1000);
ok("peakRating is at least the endRating (never lower than where they ended, in a net-positive run)", recap.peakRating >= recap.endRating || recap.ratingDelta < 0);
ok("lowRating is at most the peakRating", recap.lowRating <= recap.peakRating);

console.log("\n\x1b[36m── best win ────────────────────────────────────────────\x1b[0m");

ok("bestWin is populated when the player has at least one win", !!recap.bestWin);
ok("bestWin references a real opponent pairing", recap.bestWin.opponent === "Carol & Dave");
ok("bestWin's score matches the actual match score", recap.bestWin.scoreA === 6 && recap.bestWin.scoreB === 2);
ok("bestWin's gain is a positive number", recap.bestWin.gain > 0);

console.log("\n\x1b[36m── rivals / partners passthrough from computeStats ─────\x1b[0m");

ok("nemesis is populated (played multiple opponents)", !!recap.nemesis);
ok("favOpp is populated", !!recap.favOpp);
ok("bestWinStreak is a non-negative number", recap.bestWinStreak >= 0);

console.log("\n\x1b[36m── players who didn't play return null ─────────────────\x1b[0m");

ok(
  "a name that never appears in the match set returns null",
  computeSeasonRecap(matches, "Nobody") === null,
);
ok("empty match list returns null for any player", computeSeasonRecap([], "Ankit") === null);

console.log("\n\x1b[36m── a player who lost every match still gets a recap ────\x1b[0m");

const lossMatches = [
  M("2024-01-01", ["Weak", "Filler1"], ["Filler2", "Filler3"], 1, 6),
  M("2024-01-02", ["Weak", "Filler1"], ["Filler2", "Filler3"], 2, 6),
];
const lossRecap = computeSeasonRecap(lossMatches, "Weak");
ok("recap exists even with zero wins", !!lossRecap);
ok("bestWin is null when the player never won", lossRecap.bestWin === null);
ok("ratingDelta is negative for an all-loss season", lossRecap.ratingDelta < 0);
ok("record shows 0 wins", lossRecap.mw === 0 && lossRecap.ml === 2);

console.log("\n\x1b[36m── determinism & order independence ────────────────────\x1b[0m");

ok(
  "computeSeasonRecap is deterministic",
  JSON.stringify(computeSeasonRecap(matches, "Ankit")) ===
    JSON.stringify(computeSeasonRecap(matches, "Ankit")),
);
const shuffled = [...matches].reverse();
ok(
  "result is independent of input array order",
  JSON.stringify(computeSeasonRecap(matches, "Ankit")) ===
    JSON.stringify(computeSeasonRecap(shuffled, "Ankit")),
);

console.log(
  `\n\x1b[1mSeason Recap: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`,
);
process.exit(fail ? 1 : 0);
