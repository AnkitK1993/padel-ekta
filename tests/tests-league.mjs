// tests-league.mjs — LEAGUE: +3 a win, −2 a loss, table by points then game difference.
// Run: node tests/tests-league.mjs
import { computeLeagueFull, computeMatchLeagueDeltas, LEAGUE_WIN_POINTS, LEAGUE_LOSS_POINTS } from "../src/domain/league.js";

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
  M("2026-01-01", ["Ann", "Ben"], ["Cat", "Dan"], 4, 1),
  M("2026-01-02", ["Ann", "Cat"], ["Ben", "Dan"], 3, 4),
  M("2026-01-03", ["Eve", "Fay"], ["Gus", "Hal"], 4, 2),
  M("2026-01-04", ["Eve", "Gus"], ["Fay", "Hal"], 3, 4),
];
const f = computeLeagueFull(ms);
ok("a win is +3, a loss −2", LEAGUE_WIN_POINTS === 3 && LEAGUE_LOSS_POINTS === -2);
ok("points = 3 × wins − 2 × losses", f.Ben.ep === 6 && f.Ann.ep === 1 && f.Cat.ep === -4);
ok("the number is the points total (game difference only below the whole number)", Math.round(f.Ben.score) === 6 && Math.round(f.Cat.score) === -4);
ok("points decide first", f.Ben.score > f.Ann.score && f.Ann.score > f.Cat.score);
// Ann 1–1, games 7–5 (+2); Eve 1–1, games 7–6 (+1): level on points, game difference splits them.
ok("level on points: game difference splits them", f.Ann.ep === f.Eve.ep && f.Ann.gd === 2 && f.Eve.gd === 1 && f.Ann.score > f.Eve.score);
const t = computeLeagueFull([M("d", ["A", "B"], ["C", "D"], 4, 2), M("e", ["A", "C"], ["B", "D"], 4, 2)]);
ok("level on points and game difference: an exact tie", t.B.score === t.C.score);
ok("more games only help while you win more than you lose (2–1 = +4, 1–2 = −1)", (() => {
  const x = computeLeagueFull([M("a", ["P", "q"], ["r", "s"], 4, 0), M("b", ["P", "q"], ["r", "s"], 4, 0), M("c", ["P", "q"], ["r", "s"], 0, 4)]);
  return x.P.ep === 4 && x.r.ep === -1;
})());
const d = computeMatchLeagueDeltas(ms);
const last = {};
ms.forEach((m) => Object.assign(last, d.get(m).playerAfter));
ok("per-match: the number after each player's last match = the table", Object.keys(f).every((p) => Math.abs(last[p] - f[p].score) < 1e-9));
ok("per-match: +3 to the winners, −2 to the losers", d.get(ms[0]).points.Ann === 3 && d.get(ms[0]).points.Cat === -2);
console.log(`\n\x1b[1mLeague: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`);
if (fail) process.exit(1);
