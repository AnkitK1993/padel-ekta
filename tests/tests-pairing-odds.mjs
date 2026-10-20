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
{
  const H4 = hist({ A: [90, 90, 90, 90], B: [70, 70, 70, 70], C: [50, 50, 50, 50], D: [30, 30, 30, 30] });
  const inc = analyzePairingOdds([warm, d1, d2, d3], { history: H4, includeExceptions: true });
  ok("include exceptions: the same-day repeat counts as unfair", inc.matches[2].kind === "unfair" && inc.matches[2].wasException && inc.totals.exception === 0 && inc.totals.excSeen === 1);
  const A = inc.rows.find((p) => p.name === "A");
  ok("include exceptions: A is favoured in it too, and percentages cover every game", A.favoured === 2 && A.exception === 0 && A.excSeen === 1 && A.counted === A.mp);
  const exc = analyzePairingOdds([warm, d1, d2, d3], { history: H4 });
  ok("left out (default): still reports how many exceptions each player had", exc.rows.find((p) => p.name === "A").excSeen === 1 && exc.totals.excSeen === 1);
}

console.log("\n\x1b[36m── per-player numbers ───────────────────────────────\x1b[0m");
r = analyzePairingOdds([warm, fairM, unfairM], { history: H });
const get = (n) => r.rows.find((p) => p.name === n);
ok("favoured / underdog are counted only for unfair matches", get("A").favoured === 1 && get("C").underdog === 1 && get("A").underdog === 0);
ok("each player's matches add up", r.rows.every((p) => p.fair + p.exception + p.unfair === p.mp));
ok("average edge is positive for the strong, negative for the weak", get("A").avgEdge > get("D").avgEdge);
ok("rows are sorted by favoured %, best first", r.rows.every((p, i) => i === 0 || r.rows[i - 1].favPct >= p.favPct));
ok("A (top) is favoured in the unfair match, D (bottom) is not", get("A").favPct > 0 && get("D").favPct === 0);
const ex = analyzePairingOdds([warm, d1, d2], { history: hist({ A: [90, 90, 90], B: [70, 70, 70], C: [50, 50, 50], D: [30, 30, 30] }) });
const exA = ex.rows.find((p) => p.name === "A");
ok("percentages leave exceptions out (A: 2 counted of 3 played)", exA.counted === 2 && exA.mp === 3 && Math.abs(exA.fairPct - 100) < 1e-9);
ok("non-doubles matches are skipped, not counted", analyzePairingOdds([M("2026-01-01", ["A"], ["B"])], { history: {} }).totals.skipped === 1);

console.log("\n\x1b[36m── worked example: A 90, B 80, C 70, D 60 ─────────────\x1b[0m");
{
  const H2 = hist({ A: [90, 90, 90, 90], B: [80, 80, 80, 80], C: [70, 70, 70, 70], D: [60, 60, 60, 60] });
  const w = M("2026-02-01", ["A", "B"], ["C", "D"]);
  const ad = M("2026-02-02", ["A", "D"], ["B", "C"]);
  const ab = M("2026-02-03", ["A", "B"], ["C", "D"]);
  const ac = M("2026-02-04", ["A", "C"], ["B", "D"]);
  const x = analyzePairingOdds([w, ad, ab, ac], { history: H2 });
  ok("A+D vs B+C (150 v 150) is fair", x.matches[1].kind === "fair");
  ok("A+B vs C+D (170 v 130) is unfair, A & B favoured", x.matches[2].kind === "unfair" && x.matches[2].favouredSide === "A");
  ok("A+C vs B+D (160 v 140) is unfair, A & C favoured", x.matches[3].kind === "unfair" && x.matches[3].favouredSide === "A");
  const g = (n) => x.rows.find((p) => p.name === n);
  ok("favoured counts: A 2, B 1, C 1, D 0", g("A").favoured === 2 && g("B").favoured === 1 && g("C").favoured === 1 && g("D").favoured === 0);
}

console.log(`\n\x1b[1mPairing odds: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`);
process.exit(fail ? 1 : 0);
