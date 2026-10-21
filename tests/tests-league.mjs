// tests-league.mjs — LEAGUE: 3 points a win, table by win % then game difference.
// Run: node tests/tests-league.mjs
import { computeLeagueFull, computeMatchLeagueDeltas, LEAGUE_WIN_POINTS } from "../src/domain/league.js";

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
const M = (date, teamA, teamB, scoreA, scoreB) => ({ date, teamA, teamB, scoreA, scoreB });
const ms = [
  M("2026-01-01", ["Ann", "Ben"], ["Cat", "Dan"], 4, 1), // Ann/Ben +3 games
  M("2026-01-02", ["Ann", "Cat"], ["Ben", "Dan"], 3, 4), // Ben/Dan +1
  M("2026-01-03", ["Eve", "Fay"], ["Gus", "Hal"], 4, 2), // Eve/Fay +2
  M("2026-01-04", ["Eve", "Gus"], ["Fay", "Hal"], 3, 4),
];
const f = computeLeagueFull(ms);
ok("a win is 3 points, a loss 0", LEAGUE_WIN_POINTS === 3 && f.Ann.ep === 3 && f.Ben.ep === 6 && f.Cat.ep === 0);
ok("the number is the win %", Math.abs(f.Ben.winPct - 100) < 1e-9 && Math.abs(f.Ann.score - 50) < 1e-6 && Math.abs(f.Cat.score) < 1e-6);
ok("win % decides first", f.Ben.score > f.Ann.score && f.Ann.score > f.Cat.score);
// Ann 1–1, games 7–5 (+2); Eve 1–1, games 7–6 (+1): same win %, game difference splits them.
ok("level on win %: game difference splits them", f.Ann.gd === 2 && f.Eve.gd === 1 && f.Ann.score > f.Eve.score);
ok("level on win % and game difference: an exact tie", computeLeagueFull([M("d", ["A", "B"], ["C", "D"], 4, 2), M("e", ["A", "C"], ["B", "D"], 4, 2)]).B.score === computeLeagueFull([M("d", ["A", "B"], ["C", "D"], 4, 2), M("e", ["A", "C"], ["B", "D"], 4, 2)]).C.score);
ok("same win % from different records ties exactly (7–3 vs 14–6, same GD)", (() => {
  const a = computeLeagueFull([...Array(10)].map((_, i) => M(`a${i}`, ["X", "q"], ["r", "s"], i < 7 ? 4 : 3, i < 7 ? 3 : 4)));
  const b = computeLeagueFull([...Array(20)].map((_, i) => M(`b${i}`, ["Y", "q"], ["r", "s"], i < 14 ? 4 : 3, i < 14 ? 3 : 4)));
  return a.X.winPct === b.Y.winPct && a.X.gd === 4 && b.Y.gd === 8 && b.Y.score > a.X.score;
})());
const d = computeMatchLeagueDeltas(ms);
const last = {};
ms.forEach((m) => Object.assign(last, d.get(m).playerAfter));
ok("per-match: the number after each player's last match = the table", Object.keys(f).every((p) => Math.abs(last[p] - f[p].score) < 1e-9));
ok("per-match: 3 points to the winners, 0 to the losers", d.get(ms[0]).points.Ann === 3 && d.get(ms[0]).points.Cat === 0);
console.log(`\n\x1b[1mLeague: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`);
if (fail) process.exit(1);
