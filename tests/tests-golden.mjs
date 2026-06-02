// tests-golden.mjs — regression "golden file" tests for the SHIPPED ELO engine.
//
// Unlike tests.js (which exercises an in-file PORT of computeElo), this imports
// the REAL elo.js and freezes its output for a fixed match set. If a future
// refactor silently shifts the leaderboard numbers, this fails. Run:
//   node tests-golden.mjs    (or: npm run test:golden)

import { computeElo, computeEloHistory, computeEloPeaks } from "../src/engine/elo.js";
import { computeStats } from "../src/engine/stats.js";
import { computeBadges, initBadgesDeps } from "../src/engine/badges.js";

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
const r2 = (n) => Math.round(n * 100) / 100;

const M = (date, a, b, sa, sb) => ({ date, teamA: a, teamB: b, scoreA: sa, scoreB: sb });

// A fixed, deterministic season. DO NOT edit without re-freezing GOLDEN below
// (and understanding why the numbers changed).
const SEASON = [
  M("2024-01-01", ["Alice", "Bob"], ["Carol", "Dave"], 4, 2),
  M("2024-01-02", ["Alice", "Carol"], ["Bob", "Dave"], 4, 1),
  M("2024-01-03", ["Alice", "Dave"], ["Bob", "Carol"], 3, 4),
  M("2024-01-04", ["Bob", "Carol"], ["Alice", "Dave"], 4, 0),
  M("2024-01-05", ["Carol", "Dave"], ["Alice", "Bob"], 4, 3),
  M("2024-01-06", ["Alice", "Bob"], ["Carol", "Dave"], 5, 2),
  M("2024-01-07", ["Alice", "Carol"], ["Bob", "Dave"], 2, 4),
  M("2024-01-08", ["Bob", "Dave"], ["Alice", "Carol"], 4, 1),
];

// Frozen expected output of the shipped engine (generated from elo.js).
const GOLDEN_ELO = { Alice: 967, Bob: 1063, Carol: 999, Dave: 971 };
const GOLDEN_PEAKS = { Alice: 1032, Bob: 1063, Carol: 1048, Dave: 1000 };

console.log("\n\x1b[36m── ELO golden file (real elo.js) ───────────────────────\x1b[0m");

const elo = computeElo(SEASON);
const eloR = {};
Object.keys(elo).forEach((k) => (eloR[k] = r2(elo[k])));
ok(
  "final ELO matches frozen golden values",
  JSON.stringify(eloR, Object.keys(eloR).sort()) ===
    JSON.stringify(GOLDEN_ELO, Object.keys(GOLDEN_ELO).sort()),
  `got ${JSON.stringify(eloR)}`,
);

// Invariant: ELO is zero-sum around the 1000 base, so the total must always
// equal players × 1000 regardless of results.
const total = Object.values(elo).reduce((s, v) => s + v, 0);
ok(
  "ELO is zero-sum (sum == players × 1000)",
  Math.abs(total - Object.keys(elo).length * 1000) < 0.01,
  `sum=${r2(total)} for ${Object.keys(elo).length} players`,
);

// Determinism: same input → identical output across calls.
ok(
  "computeElo is deterministic",
  JSON.stringify(computeElo(SEASON)) === JSON.stringify(computeElo(SEASON)),
);

// Order independence of input array (engine sorts by date internally).
const shuffled = [...SEASON].reverse();
ok(
  "result is independent of input array order",
  JSON.stringify(eloR) ===
    JSON.stringify(
      Object.fromEntries(
        Object.entries(computeElo(shuffled)).map(([k, v]) => [k, r2(v)]),
      ),
    ),
);

const hist = computeEloHistory(SEASON);
ok(
  "history has an entry per match played per player",
  (hist.Alice || []).length === 8 && Object.keys(hist).length === 4,
  `Alice=${(hist.Alice || []).length} players=${Object.keys(hist).length}`,
);

const peaks = computeEloPeaks(SEASON);
const peaksR = {};
Object.keys(peaks).forEach((k) => (peaksR[k] = r2(peaks[k].elo ?? peaks[k])));
ok(
  "peak ELO matches frozen golden values",
  JSON.stringify(peaksR, Object.keys(peaksR).sort()) ===
    JSON.stringify(GOLDEN_PEAKS, Object.keys(GOLDEN_PEAKS).sort()),
  `got ${JSON.stringify(peaksR)}`,
);
ok(
  "peak ELO is always >= current ELO",
  Object.keys(elo).every((k) => (peaks[k].elo ?? peaks[k]) >= elo[k] - 0.01),
);

// ── computeBadges (real src/engine/badges.js) ───────────────────────────────
console.log(
  "\n\x1b[36m── Badges golden (real badges.js) ───────────────────────\x1b[0m",
);
// Inject real compute helpers; stub the app-coupled ones (getPairStats lives in
// app.js; the date helpers are deterministic stubs so "this week" = all-time).
initBadgesDeps({
  computeStats,
  computeElo,
  getPairStats: () => [], // disables the Best Duo badge in this fixture
  lastWeekRange: () => ({ from: "2000-01-01" }), // everything counts as "this week"
  fmtDate: (d) => d,
});
const hasBadge = (badges, label) => badges.some((b) => b.label === label);
const tierOf = (badges, label) =>
  (badges.find((b) => b.label === label) || {}).tier;

// 10 weekday matches (skipping the 06-07 weekend) where Alice wins every one 4-0.
const BADGE_SEASON = [
  "2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05",
  "2024-01-08", "2024-01-09", "2024-01-10", "2024-01-11", "2024-01-12",
].map((d) => M(d, ["Alice", "Bob"], ["Carol", "Dave"], 4, 0));
const bStats = computeStats(BADGE_SEASON);
const bElo = computeElo(BADGE_SEASON);
const aliceBadges = computeBadges("Alice", null, bElo, BADGE_SEASON, bStats);
const carolBadges = computeBadges("Carol", null, bElo, BADGE_SEASON, bStats);

ok("King badge → SR #1 player (Alice)", hasBadge(aliceBadges, "King"));
ok("King badge NOT given to a loser (Carol)", !hasBadge(carolBadges, "King"));
ok("On Fire badge → 5+ win streak (Alice 10-0)", hasBadge(aliceBadges, "On Fire"));
ok("Ironman badge → most matches played", hasBadge(aliceBadges, "Ironman"));
ok(
  "Veteran bronze at 10 matches",
  tierOf(aliceBadges, "Veteran") === "bronze",
  `tier=${tierOf(aliceBadges, "Veteran")}`,
);
ok(
  "Win Machine bronze at 10 wins",
  tierOf(aliceBadges, "Win Machine") === "bronze",
  `tier=${tierOf(aliceBadges, "Win Machine")}`,
);
ok(
  "Dominator (10 wins by 4-margin) ≥ silver",
  ["silver", "gold"].includes(tierOf(aliceBadges, "Dominator")),
  `tier=${tierOf(aliceBadges, "Dominator")}`,
);
ok(
  "Ice Cold badge → 5+ loss streak (Carol 0-10)",
  hasBadge(carolBadges, "Ice Cold"),
);
ok(
  "computeBadges is deterministic",
  JSON.stringify(computeBadges("Alice", null, bElo, BADGE_SEASON, bStats)) ===
    JSON.stringify(aliceBadges),
);
ok("empty match set → no badges", computeBadges("Nobody", null, {}, [], []).length === 0);

console.log(
  `\n\x1b[1mGolden: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`,
);
process.exit(fail ? 1 : 0);
