// tests-golden.mjs — regression "golden file" tests for the SHIPPED engines.
//
// Unlike tests.js (which exercises an in-file PORT of the stats math), this
// imports the REAL engine modules (ass.js, badges.js, player-analytics.js, …)
// and exercises their behaviour against a fixed match set. Run:
//   node tests-golden.mjs    (or: npm run test:golden)

import { computeASS } from "../src/domain/ass.js";
import { computeStats } from "../src/domain/stats.js";
import {
  computeSeasonTrajectory,
  computeSeasonRiserFaller,
  computeHeadToHeadSeasonSplits,
  seasonNeedsRollover,
  orderSeasonsByStart,
} from "../src/domain/season-stats.js";
import { buildSeasonRevealSlides } from "../features/season-reveal.js";
import { initPairsDeps, getPairStats, getPairKey } from "../src/domain/pairs.js";
import { initXpDeps, xpThreshold, getPlayerLevel, getPrestigeTier } from "../src/domain/xp.js";
import { computeBadges, initBadgesDeps } from "../src/domain/badges.js";
import {
  initPlayerAnalyticsDeps,
  computeAchievements,
  computeArchetype,
  computePlayerForm,
  computePowerRankings,
  computeChemistryScores,
  computeMatchStories,
  computePartnerOpponentMatrix,
} from "../src/domain/player-analytics.js";
import { toLocalISODate } from "../src/ui/format.js";
import { state } from "../src/domain/state.js";
import {
  initSelectorsDeps,
  activeMatches,
  historyMatches,
  filterHistoryMatches,
  filterMatches,
  invalidateAmMemo,
} from "../src/domain/selectors.js";

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

console.log("\n\x1b[36m── ASS golden file (real ass.js) ────────────────────────\x1b[0m");

const ass = computeASS(SEASON);

// Invariant: ASS is anchored around the 1000 base per player (each player's
// own baseline is 1000, deltas are not necessarily zero-sum like classic ELO,
// so just sanity-check every player has a finite numeric rating).
ok(
  "computeASS returns a finite numeric rating for every player",
  Object.values(ass).every((v) => Number.isFinite(v)),
  `got ${JSON.stringify(ass)}`,
);

// Determinism: same input → identical output across calls.
ok(
  "computeASS is deterministic",
  JSON.stringify(computeASS(SEASON)) === JSON.stringify(computeASS(SEASON)),
);

// Order independence of input array (engine sorts by date internally).
const shuffled = [...SEASON].reverse();
const assR = {};
Object.keys(ass).forEach((k) => (assR[k] = r2(ass[k])));
ok(
  "result is independent of input array order",
  JSON.stringify(assR) ===
    JSON.stringify(
      Object.fromEntries(
        Object.entries(computeASS(shuffled)).map(([k, v]) => [k, r2(v)]),
      ),
    ),
);

// ── computeBadges (real src/domain/badges.js) ───────────────────────────────
console.log(
  "\n\x1b[36m── Badges golden (real badges.js) ───────────────────────\x1b[0m",
);
// Wire the real pairs module (normPlayer identity for test names).
initPairsDeps({ normPlayer: (n) => n });
// Inject real compute helpers; date helpers are deterministic stubs.
initBadgesDeps({
  computeStats,
  computeElo: computeASS,
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
const bElo = computeASS(BADGE_SEASON);
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

// ── player-analytics (real src/domain/player-analytics.js) ──────────────────
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

// ── computeArchetype ──────────────────────────────────────────────────────────
const arch = computeArchetype("Alice", BADGE_SEASON);
ok("computeArchetype returns non-null for 10+ matches", arch !== null, "got null");
ok(
  "archetype object has required shape (icon/label/desc/color)",
  arch !== null && "icon" in arch && "label" in arch && "desc" in arch && "color" in arch,
  `got ${JSON.stringify(arch)}`,
);
ok(
  "Alice (10-0, +4 margin) classified as Finisher",
  arch?.label === "Finisher",
  `label=${arch?.label}`,
);
ok(
  "computeArchetype returns null for < 5 matches",
  computeArchetype("Alice", BADGE_SEASON.slice(0, 3)) === null,
);
ok(
  "computeArchetype is deterministic",
  JSON.stringify(computeArchetype("Alice", BADGE_SEASON)) === JSON.stringify(arch),
);

// ── computeMatchStories ───────────────────────────────────────────────────────
const stories = computeMatchStories(SEASON);
ok("computeMatchStories returns an array", Array.isArray(stories), typeof stories);
ok(
  "story objects have required shape (icon/type/text/date)",
  stories.length === 0 ||
    stories.every((s) => "icon" in s && "type" in s && "text" in s && "date" in s),
  `first=${JSON.stringify(stories[0])}`,
);
ok(
  "computeMatchStories on < 2 matches returns []",
  computeMatchStories([SEASON[0]]).length === 0,
);
ok(
  "computeMatchStories is deterministic",
  JSON.stringify(computeMatchStories(SEASON)) === JSON.stringify(stories),
);
// SEASON has varied ELO swings — expect at least some stories generated
ok(
  "SEASON generates at least one story",
  stories.length > 0,
  `got ${stories.length} stories`,
);

// ── computePartnerOpponentMatrix (partner/opponent grid) ────────────────────
console.log(
  "\n\x1b[36m── Partner/Opponent matrix golden ───────────────────────\x1b[0m",
);
// Alice+Bob partner twice; once they face Alice+Carol (so Alice opposes Carol,
// Bob opposes Carol). Carol+Dave partner once.
const POM = [
  M("2024-01-01", ["Alice", "Bob"], ["Carol", "Dave"], 6, 3),
  M("2024-01-02", ["Alice", "Bob"], ["Eve", "Dave"], 6, 4),
  M("2024-01-03", ["Alice", "Carol"], ["Bob", "Dave"], 5, 7),
];
const pom = computePartnerOpponentMatrix(POM);
ok(
  "Alice & Bob partnered 2, opposed 1",
  pom.Alice?.Bob?.partnered === 2 && pom.Alice?.Bob?.opposed === 1,
  `got ${JSON.stringify(pom.Alice?.Bob)}`,
);
ok(
  "matrix is symmetric (Bob→Alice == Alice→Bob)",
  pom.Bob?.Alice?.partnered === 2 && pom.Bob?.Alice?.opposed === 1,
  `got ${JSON.stringify(pom.Bob?.Alice)}`,
);
ok(
  "Alice & Carol partnered 1 (match 3) + opposed 1 (match 1)",
  pom.Alice?.Carol?.partnered === 1 && pom.Alice?.Carol?.opposed === 1,
  `got ${JSON.stringify(pom.Alice?.Carol)}`,
);
ok(
  "Alice never played Eve as partner, opposed once",
  (pom.Alice?.Eve?.partnered || 0) === 0 && pom.Alice?.Eve?.opposed === 1,
  `got ${JSON.stringify(pom.Alice?.Eve)}`,
);
ok(
  "partnered+opposed = matches both played (Alice&Bob: 3)",
  pom.Alice.Bob.partnered + pom.Alice.Bob.opposed === 3,
);
ok(
  "norm fn is applied (lowercase alias collapses)",
  (() => {
    const m = computePartnerOpponentMatrix(
      [M("2024-01-01", ["a", "B"], ["c", "d"], 6, 0)],
      (n) => n.toUpperCase(),
    );
    return m.A?.B?.partnered === 1;
  })(),
);
ok("empty matches → {}", Object.keys(computePartnerOpponentMatrix([])).length === 0);

// ── selectors: guest handling (Statistics excludes, History includes) ───────
console.log(
  "\n\x1b[36m── Selectors guest golden (real selectors.js) ───────────\x1b[0m",
);
// One match is all-regular; the other involves the guest "Zoe".
state.matches = [
  { date: "2026-06-01", teamA: ["Ann", "Bo"], teamB: ["Cy", "Di"], scoreA: 6, scoreB: 3 },
  { date: "2026-06-02", teamA: ["Ann", "Zoe"], teamB: ["Cy", "Di"], scoreA: 4, scoreB: 2 },
];
state.players = {
  1: { id: 1, name: "Ann", isGuest: false },
  9: { id: 9, name: "Zoe", isGuest: true },
};
initSelectorsDeps({
  getDataVersion: () => 1,
  getActiveSeasonId: () => "all",
  getExcludedPlayers: () => new Set(),
  getSessionGuestUnexcluded: () => new Set(),
  todayISO: () => "2026-06-03",
});
invalidateAmMemo();
ok(
  "activeMatches() drops the guest match (stats exclude guests)",
  activeMatches().length === 1,
  `got ${activeMatches().length}`,
);
ok(
  "historyMatches() keeps the guest match (History shows guests)",
  historyMatches().length === 2,
  `got ${historyMatches().length}`,
);
ok(
  "filterMatches('all') is guest-excluded (stats path)",
  filterMatches("all").length === 1,
  `got ${filterMatches("all").length}`,
);
ok(
  "filterHistoryMatches('all') is guest-inclusive (log path)",
  filterHistoryMatches("all").length === 2,
  `got ${filterHistoryMatches("all").length}`,
);
// Re-including the guest for the session brings their match back into stats.
initSelectorsDeps({ getSessionGuestUnexcluded: () => new Set(["Zoe"]) });
invalidateAmMemo();
ok(
  "session-unexcluded guest re-enters activeMatches()",
  activeMatches().length === 2,
  `got ${activeMatches().length}`,
);

// ── pairs golden (real src/domain/pairs.js) ─────────────────────────────────
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

// ── XP golden (real src/domain/xp.js) ───────────────────────────────────────
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

// ── season-stats golden (real src/domain/season-stats.js) ──────────────────
console.log(
  "\n\x1b[36m── Season stats golden (real season-stats.js) ───────────\x1b[0m",
);
const S1 = { id: "s1", name: "Season 1", start: "2024-01-01", end: "2024-01-31" };
const S2 = { id: "s2", name: "Season 2", start: "2024-02-01", end: "2024-02-28" };
const SEASON2 = [
  M("2024-02-01", ["Bob", "Dave"], ["Alice", "Carol"], 4, 1),
  M("2024-02-02", ["Bob", "Carol"], ["Alice", "Dave"], 4, 2),
  M("2024-02-03", ["Bob", "Alice"], ["Carol", "Dave"], 1, 4),
  M("2024-02-04", ["Carol", "Dave"], ["Bob", "Alice"], 4, 0),
  M("2024-02-05", ["Alice", "Eve"], ["Bob", "Carol"], 4, 3),
  M("2024-02-06", ["Alice", "Eve"], ["Bob", "Dave"], 4, 2),
];
// Dated after Season 2 ends — falls outside every defined season range.
const OUT_OF_SEASON = M("2024-03-15", ["Alice", "Bob"], ["Carol", "Dave"], 4, 2);
const ALL_SEASON_MATCHES = [...SEASON, ...SEASON2, OUT_OF_SEASON];
const SEASONS_FIXTURE = [S2, S1]; // deliberately unsorted input

ok(
  "orderSeasonsByStart sorts oldest-first regardless of input order",
  orderSeasonsByStart(SEASONS_FIXTURE).map((s) => s.id).join(",") === "s1,s2",
);

const daveTraj = computeSeasonTrajectory(ALL_SEASON_MATCHES, SEASONS_FIXTURE, "Dave");
ok(
  "trajectory: Dave played both seasons -> 2 rows, oldest first",
  daveTraj.length === 2 && daveTraj[0].season.id === "s1" && daveTraj[1].season.id === "s2",
  `got ${JSON.stringify(daveTraj.map((r) => r.season.id))}`,
);
ok(
  "trajectory rows have finite ass and a rank within outOf",
  daveTraj.every((r) => Number.isFinite(r.ass) && r.rank >= 1 && r.rank <= r.outOf),
  `got ${JSON.stringify(daveTraj)}`,
);

const eveTraj = computeSeasonTrajectory(ALL_SEASON_MATCHES, SEASONS_FIXTURE, "Eve");
ok(
  "trajectory: Eve only played Season 2 -> 1 row, that season omitted for Season 1",
  eveTraj.length === 1 && eveTraj[0].season.id === "s2",
  `got ${JSON.stringify(eveTraj.map((r) => r.season.id))}`,
);

const riserFaller = computeSeasonRiserFaller(ALL_SEASON_MATCHES, S1, S2);
ok(
  "riser/faller: only players common to both seasons (Eve excluded, played S2 only)",
  riserFaller.length === 4 && !riserFaller.some((r) => r.name === "Eve"),
  `got ${JSON.stringify(riserFaller.map((r) => r.name))}`,
);
ok(
  "riser/faller: assDelta/rankDelta are internally consistent",
  riserFaller.every(
    (r) => r.assDelta === r.assB - r.assA && r.rankDelta === r.rankA - r.rankB,
  ),
  `got ${JSON.stringify(riserFaller)}`,
);
ok(
  "riser/faller: sorted by assDelta descending",
  riserFaller.every((r, i) => i === 0 || riserFaller[i - 1].assDelta >= r.assDelta),
  `got ${JSON.stringify(riserFaller.map((r) => r.assDelta))}`,
);

const aliceMatches = ALL_SEASON_MATCHES.filter((m) =>
  [...m.teamA, ...m.teamB].includes("Alice"),
);
const splits = computeHeadToHeadSeasonSplits(aliceMatches, SEASONS_FIXTURE, "Alice");
const carolSplits = splits.get("Carol") || [];
ok(
  "H2H split: Alice vs Carol split across exactly the 2 defined seasons",
  carolSplits.length === 2 &&
    carolSplits[0].season.id === "s1" &&
    carolSplits[1].season.id === "s2",
  `got ${JSON.stringify(carolSplits)}`,
);
ok(
  "H2H split: out-of-season match excluded (sum stays 9, not 10)",
  carolSplits.reduce((s, e) => s + e.p, 0) === 9,
  `got ${carolSplits.reduce((s, e) => s + e.p, 0)}`,
);
ok(
  "H2H split: empty matches -> empty map",
  computeHeadToHeadSeasonSplits([], SEASONS_FIXTURE, "Nobody").size === 0,
);

ok("rollover: no ended season -> false", seasonNeedsRollover([], "2024-03-01") === false);
const endedNoSuccessor = { id: "x1", start: "2024-01-01", end: "2024-02-01" };
const coveringToday = { id: "x2", start: "2024-02-15", end: "2024-03-31" };
const futureNotStarted = { id: "x3", start: "2024-04-01", end: "2024-04-30" };
ok(
  "rollover: ended season, no successor -> true",
  seasonNeedsRollover([endedNoSuccessor], "2024-03-01") === true,
);
ok(
  "rollover: ended season + a season covering today -> false",
  seasonNeedsRollover([endedNoSuccessor, coveringToday], "2024-03-01") === false,
);
ok(
  "rollover: ended season + a future season that hasn't started yet -> true",
  seasonNeedsRollover([endedNoSuccessor, futureNotStarted], "2024-03-01") === true,
);

// ── season-reveal golden (real features/season-reveal.js) ──────────────────
console.log(
  "\n\x1b[36m── Season reveal golden (real season-reveal.js) ─────────\x1b[0m",
);
const FULL_SNAPSHOT_SEASON = {
  id: "s1",
  name: "Season 1",
  archivedSnapshot: {
    matches: 12,
    mvp: { name: "Alice", mp: 12, mw: 9 },
    topPair: { players: ["Alice", "Bob"], winPct: 75 },
    mostImproved: { name: "Carol" },
    ironMan: { name: "Dave", mp: 12 },
    standings: [
      { name: "Alice", mp: 12, mw: 9, ml: 3, sr: 4.32 },
      { name: "Bob", mp: 12, mw: 8, ml: 4, sr: 3.9 },
      { name: "Carol", mp: 12, mw: 6, ml: 6, sr: 3.1 },
      { name: "Dave", mp: 12, mw: 5, ml: 7, sr: 2.8 },
    ],
  },
};
const fullSlides = buildSeasonRevealSlides(FULL_SNAPSHOT_SEASON);
ok(
  "full snapshot -> 6 slides in the documented order",
  fullSlides.map((s) => s.key).join(",") ===
    "champion,mvp,toppair,ironman,mostimproved,top3",
  `got ${JSON.stringify(fullSlides.map((s) => s.key))}`,
);
ok(
  "champion slide reads standings[0] (rank-based), not the mvp field",
  fullSlides[0].name === "Alice" && fullSlides[0].celebrate === true,
  `got ${JSON.stringify(fullSlides[0])}`,
);
ok(
  "top3 slide has 3 ranked entries",
  fullSlides[5].top3.length === 3 && fullSlides[5].top3[0].rank === 1,
  `got ${JSON.stringify(fullSlides[5])}`,
);

const partialSlides = buildSeasonRevealSlides({
  id: "s2",
  name: "Season 2",
  archivedSnapshot: {
    matches: 4,
    mvp: null,
    topPair: null,
    mostImproved: null,
    ironMan: null,
    standings: [{ name: "Solo", mp: 4, mw: 4, ml: 0, sr: 5 }],
  },
});
ok(
  "missing awards are skipped -> only champion + top3",
  partialSlides.map((s) => s.key).join(",") === "champion,top3",
  `got ${JSON.stringify(partialSlides.map((s) => s.key))}`,
);

ok(
  "no archivedSnapshot -> no slides",
  buildSeasonRevealSlides({ id: "s3", name: "Unarchived" }).length === 0,
);
ok(
  "buildSeasonRevealSlides is deterministic",
  JSON.stringify(buildSeasonRevealSlides(FULL_SNAPSHOT_SEASON)) ===
    JSON.stringify(fullSlides),
);

console.log(
  `\n\x1b[1mGolden: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`,
);
process.exit(fail ? 1 : 0);
