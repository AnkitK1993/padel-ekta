// tests-fair-teams.mjs — the "most even 2v2" proposer.
// Run: node tests/tests-fair-teams.mjs
import { fairMatchups, winChance } from "../src/domain/fair-teams.js";

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
const S = { A: 9, B: 7, C: 5, D: 3, E: 6, F: 4 };
const str = (p) => S[p];

let r = fairMatchups(["A", "B", "C", "D"], str);
ok("4 players give the 3 possible splits", r.length === 3);
ok("best split pairs strongest with weakest (A+D vs B+C)", r[0].gap === 0 && [r[0].teamA, r[0].teamB].some((t) => t.includes("A") && t.includes("D")), JSON.stringify(r[0]));
ok("the worst split is last (A+B vs C+D)", r[2].gap === 4);
ok("an even match is a 50% chance", Math.abs(r[0].chanceA - 0.5) < 1e-9);
ok("the stronger pair is listed first", r.every((m) => m.chanceA >= 0.5));

r = fairMatchups(["A", "B", "C", "D", "E", "F"], str, { top: 10 });
ok("more players: candidates from every group of four", r.length === 10 && r.every((m) => new Set([...m.teamA, ...m.teamB]).size === 4));
ok("results are sorted most even first", r.every((m, i) => i === 0 || r[i - 1].gap <= m.gap));

r = fairMatchups(["A", "B", "C", "D"], str, { avoidPairs: new Set(["A & D"]) });
ok("a pair to avoid is ranked below fresh pairings", !(r[0].teamA.includes("A") && r[0].teamA.includes("D")) && !(r[0].teamB.includes("A") && r[0].teamB.includes("D")));

ok("fewer than 4 players → nothing", fairMatchups(["A", "B", "C"], str).length === 0);
ok("duplicates are ignored", fairMatchups(["A", "A", "B", "C"], str).length === 0);
ok("win chance grows with the gap", winChance(0) === 0.5 && winChance(2.5) > 0.9 && winChance(1) > 0.5);

console.log(`\n\x1b[1mFair teams: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`);
process.exit(fail ? 1 : 0);
