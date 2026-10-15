// tests-pairing-odds.mjs — fair / exception / unfair classification of doubles pairings.
// Run: node tests/tests-pairing-odds.mjs
import { analyzePairingOdds } from "../src/domain/pairing-odds.js";

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
const M = (date, a, b, sa = 4, sb = 2) => ({ date, teamA: a, teamB: b, scoreA: sa, scoreB: sb });
// Ratings before the first match: A 90, B 70, C 50, D 30 (via def per player is not possible,
// so seed them through an earlier "rating" entry in history by padding matches).
// Simpler: provide history where each player's first entry is their post-match rating, and
// start the scored matches after a warm-up match of the same four.
const hist = (vals) => Object.fromEntries(Object.entries(vals).map(([p, arr]) => [p, arr.map((elo) => ({ elo }))]));

console.log("\n\x1b[36m── classification ───────────────────────────────────\x1b[0m");
// Warm-up match fixes ratings (after it): A90 B70 C50 D30. Then three matches the same day.
const warm = M("2026-01-01", ["A", "B"], ["C", "D"]);
const fairM = M("2026-01-02", ["A", "D"], ["B", "C"]); // best+worst vs middle
const unfairM = M("2026-01-03", ["A", "B"], ["C", "D"]); // top two together
const H = hist({
  A: [90, 90, 90, 90], B: [70, 70, 70, 70], C: [50, 50, 50, 50], D: [30, 30, 30, 30],
});
let r = analyzePairingOdds([warm, fairM, unfairM], { history: H });
const kinds = r.matches.map((x) => x.kind);
ok("first match (everyone on the default rating, ties) counts as fair", kinds[0] === "fair", kinds.join());
ok("best+worst vs middle is FAIR", kinds[1] === "fair");
ok("top two together is UNFAIR", kinds[2] === "unfair");
ok("the stronger side of an unfair match is the favoured one", r.matches[2].favouredSide === "A");

console.log("\n\x1b[36m── exception ────────────────────────────────────────\x1b[0m");
const d1 = M("2026-01-05", ["A", "D"], ["B", "C"]); // fair; A & D partner
const d2 = M("2026-01-05", ["A", "B"], ["C", "D"]); // same day, not fair, but A&D already paired
const d3 = M("2026-01-06", ["A", "B"], ["C", "D"]); // next day, A&D did not pair that day → unfair
r = analyzePairingOdds([warm, d1, d2, d3], { history: hist({ A: [90, 90, 90, 90], B: [70, 70, 70, 70], C: [50, 50, 50, 50], D: [30, 30, 30, 30] }) });
ok("best+worst already partnered the same day → EXCEPTION", r.matches[2].kind === "exception", r.matches.map((x) => x.kind).join());
ok("the next day it counts as UNFAIR again", r.matches[3].kind === "unfair");
ok("exceptions are not counted as unfair for anyone", r.rows.every((p) => p.unfair <= 1) && r.totals.exception === 1);

console.log("\n\x1b[36m── per-player numbers ───────────────────────────────\x1b[0m");
r = analyzePairingOdds([warm, fairM, unfairM], { history: H });
const get = (n) => r.rows.find((p) => p.name === n);
ok("favoured / underdog are counted only for unfair matches", get("A").favoured === 1 && get("C").underdog === 1 && get("A").underdog === 0);
ok("each player's matches add up", r.rows.every((p) => p.fair + p.exception + p.unfair === p.mp));
ok("average edge is positive for the strong, negative for the weak", get("A").avgEdge > get("D").avgEdge);
ok("rows are sorted by edge, best first", r.rows[0].avgEdge >= r.rows[r.rows.length - 1].avgEdge);
ok("non-doubles matches are skipped, not counted", analyzePairingOdds([M("2026-01-01", ["A"], ["B"])], { history: {} }).totals.skipped === 1);

console.log(`\n\x1b[1mPairing odds: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`);
process.exit(fail ? 1 : 0);
