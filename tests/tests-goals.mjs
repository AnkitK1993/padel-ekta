// tests-goals.mjs — progress towards a target leaderboard rank.
// Run: node tests/tests-goals.mjs
import { goalProgress } from "../src/domain/goals.js";

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
const board = [
  { name: "R", score: 99 },
  { name: "V", score: 97 },
  { name: "S", score: 89 },
  { name: "P", score: 81 },
  { name: "A", score: 80 },
  { name: "N", score: 79 },
];
const scoreFor = (t, g) => (2 * t) / (g + 10);

let r = goalProgress({ board, name: "A", targetRank: 4, startRank: 9 });
ok("current rank is read off the board", r.curRank === 5);
ok("the target score is the current holder's", r.targetScore === 81 && r.gap === 1);
ok("progress is the share of the climb from the starting rank", r.pct === 80, `pct=${r.pct}`);
ok("not reached yet", !r.reached);

r = goalProgress({ board, name: "A", targetRank: 4, startRank: 9, total: 2000, games: 40, perWin: 100, scoreFor });
ok("wins needed is the smallest number that passes the holder", r.winsNeeded === 1, `wins=${r.winsNeeded}`);
r = goalProgress({ board, name: "A", targetRank: 1, startRank: 5, total: 2000, games: 40, perWin: 100, scoreFor });
ok("a bigger gap needs more wins", r.winsNeeded > 1, `wins=${r.winsNeeded}`);

r = goalProgress({ board, name: "S", targetRank: 4, startRank: 6 });
ok("already at or above the target counts as reached, 100%", r.reached && r.pct === 100 && r.winsNeeded === 0);

r = goalProgress({ board, name: "Z", targetRank: 4 });
ok("a player not on the board ranks below everyone", r.curRank === board.length + 1 && !r.reached);

console.log(`\n\x1b[1mGoals: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`);
process.exit(fail ? 1 : 0);
