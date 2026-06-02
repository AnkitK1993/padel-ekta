// tests-golden.mjs — regression "golden file" tests for the SHIPPED ELO engine.
//
// Unlike tests.js (which exercises an in-file PORT of computeElo), this imports
// the REAL elo.js and freezes its output for a fixed match set. If a future
// refactor silently shifts the leaderboard numbers, this fails. Run:
//   node tests-golden.mjs    (or: npm run test:golden)

import { computeElo, computeEloHistory, computeEloPeaks } from "../src/engine/elo.js";
import { computeStats } from "../src/engine/stats.js";
import { initPairsDeps, getPairStats, getPairKey } from "../src/engine/pairs.js";
import { initXpDeps, xpThreshold, getPlayerLevel, getPrestigeTier } from "../src/engine/xp.js";
import { computeBadges, initBadgesDeps } from "../src/engine/badges.js";
import {
  initPlayerAnalyticsDeps,
  computeAchievements,
  computePlayerForm,
  computePowerRankings,
  computeChemistryScores,
} from "../src/engine/player-analytics.js";
import { toLocalISODate } from "../src/ui/format.js";

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
// Wire the real pairs module (normPlayer identity for test names).
initPairsDeps({ normPlayer: (n) => n });
// Inject real compute helpers; date helpers are deterministic stubs.
initBadgesDeps({
  computeStats,
  computeElo,
  getPairStats, // real module now — enables Best Duo badge when pairs qualify
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

// ── player-analytics (real src/engine/player-analytics.js) ──────────────────
console.log(
  "\n\x1b[36m── Player analytics golden (real module) ────────────────\x1b[0m",
);
// getPairStats is now the real module; toLocalISODate from format.js.
initPlayerAnalyticsDeps({ getPairStats, toLocalISODate });

const ach = computeAchievements("Alice", BADGE_SEASON);
ok("computeAchievements returns an array", Array.isArray(ach), typeof ach);
ok(
  "achievement objects have the expected shape",
  ach.length > 0 &&
    ach.every(
      (a) =>
        "icon" in a && "label" in a && "desc" in a && "unlocked" in a,
    ),
  `len=${ach.length}`,
);
ok(
  "a 10-0 player has unlocked achievements",
  ach.some((a) => a.unlocked),
);
ok(
  "computeAchievements is deterministic",
  JSON.stringify(computeAchievements("Alice", BADGE_SEASON)) ===
    JSON.stringify(ach),
);
ok(
  "computeAchievements on empty matches → []",
  computeAchievements("Nobody", []).length === 0,
);

const power = computePowerRankings(BADGE_SEASON);
ok("computePowerRankings returns an array", Array.isArray(power));
ok(
  "Alice (won all) tops the power rankings",
  power.length > 0 && power[0].name === "Alice",
  `top=${power[0]?.name}`,
);

const form = computePlayerForm("Alice", BADGE_SEASON);
ok("computePlayerForm runs without throwing", form !== undefined);
ok(
  "computeChemistryScores runs with real getPairStats",
  computeChemistryScores(BADGE_SEASON) !== undefined,
);

// ── pairs golden (real src/engine/pairs.js) ─────────────────────────────────
console.log(
  "\n\x1b[36m── Pairs golden (real pairs.js) ─────────────────────────\x1b[0m",
);
const pairs = getPairStats(BADGE_SEASON);
ok("getPairStats returns an array", Array.isArray(pairs));
ok("Alice+Bob (always winners) top the pair stats", pairs.length > 0 && pairs[0].winPct === 100, `top=${pairs[0]?.key} ${pairs[0]?.winPct}%`);
ok("pairs have expected shape (key/played/wins/winPct/diff)", pairs.every(p => "key" in p && "played" in p && "wins" in p && "winPct" in p && "diff" in p));
ok("getPairKey is order-independent", getPairKey(["Alice","Bob"]) === getPairKey(["Bob","Alice"]));
ok("getPairKey normalises to sorted & format", getPairKey(["Bob","Alice"]) === "Alice & Bob");
ok("getPairStats is deterministic", JSON.stringify(getPairStats(BADGE_SEASON)) === JSON.stringify(pairs));

// ── XP golden (real src/engine/xp.js) ───────────────────────────────────────
console.log("\n\x1b[36m── XP/Level golden (real xp.js) ─────────────────────────\x1b[0m");
// computePlayerXP reads matches — stub with empty activeMatches; match-type
// helpers not needed for pure level/prestige tests.
initXpDeps({ normPlayer: (n) => n, activeMatches: () => [], isFireMatch: () => false, isDominatingMatch: () => false, isZeroMatch: () => false });
ok("xpThreshold(1) === 0", xpThreshold(1) === 0);
ok("xpThreshold(2) === 60", xpThreshold(2) === 60);
ok("thresholds strictly increase", xpThreshold(3) > xpThreshold(2) && xpThreshold(5) > xpThreshold(3));
const lvl1 = getPlayerLevel(0);
ok("0 XP → level 1", lvl1.level === 1);
ok("progress is in [0,1]", lvl1.progress >= 0 && lvl1.progress <= 1);
const lvl2 = getPlayerLevel(xpThreshold(2));
ok("XP at threshold → level up", lvl2.level === 2 && lvl2.progress === 0);
ok("prestige: level 1 → rookie", getPrestigeTier(1) === "rookie");
ok("prestige: level 5 → bronze", getPrestigeTier(5) === "bronze");
ok("prestige: level 10 → silver", getPrestigeTier(10) === "silver");
ok("prestige: level 15 → gold", getPrestigeTier(15) === "gold");
ok("prestige: level 20 → diamond", getPrestigeTier(20) === "diamond");

console.log(
  `\n\x1b[1mGolden: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`,
);
process.exit(fail ? 1 : 0);
