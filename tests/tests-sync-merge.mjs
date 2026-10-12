// tests-sync-merge.mjs — merging this device's unsynced changes into the cloud copy.
// Run: node tests/tests-sync-merge.mjs
import { mergeLocalIntoCloud, mergeRoster } from "../src/domain/sync-merge.js";

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
const keyOf = (m) => `${m.date}|${m.teamA.join(",")}|${m.teamB.join(",")}|${m.scoreA}-${m.scoreB}`;
const M = (id, date, sa, sb, a = ["A", "B"], b = ["C", "D"]) => ({ id, date, teamA: a, teamB: b, scoreA: sa, scoreB: sb });

console.log("\n\x1b[36m── mergeLocalIntoCloud ───────────────────────────────\x1b[0m");
const cloud = [M("1", "2026-01-01", 4, 1), M("2", "2026-01-02", 4, 2), M("3", "2026-01-03", 1, 4)];

let r = mergeLocalIntoCloud({ cloud, local: cloud, keyOf });
ok("identical data merges to itself", r.matches.length === 3 && r.added === 0 && r.edited === 0 && r.removed === 0);

r = mergeLocalIntoCloud({ cloud, local: [cloud[0], { ...cloud[1], scoreB: 3 }, cloud[2]], keyOf });
ok("an offline score edit replaces the cloud version (no duplicate)", r.matches.length === 3 && r.matches[1].scoreB === 3 && r.edited === 1);

r = mergeLocalIntoCloud({ cloud, local: [cloud[0], cloud[2]], deletedIds: ["2"], keyOf });
ok("a match deleted offline stays deleted", r.matches.length === 2 && !r.matches.some((m) => m.id === "2") && r.removed === 1);

r = mergeLocalIntoCloud({ cloud: [...cloud, M("4", "2026-01-04", 4, 0)], local: cloud, keyOf });
ok("a match added on another device is kept", r.matches.length === 4 && r.matches[3].id === "4");

r = mergeLocalIntoCloud({ cloud, local: [...cloud, M("5", "2026-01-02", 4, 3)], keyOf });
ok("a match added offline is kept, in date order", r.matches.length === 4 && r.added === 1 && r.matches[2].id === "5");

r = mergeLocalIntoCloud({ cloud, local: [cloud[0], { ...cloud[1], id: "x9" }, cloud[2]], keyOf });
ok("the same match under a different id is not duplicated", r.matches.length === 3 && r.added === 0);

r = mergeLocalIntoCloud({ cloud, local: cloud.map((m) => ({ ...m, teamA: m.teamA.map((p) => (p === "A" ? "Ann" : p)) })), keyOf });
ok("an offline rename applies without duplicating every match", r.matches.length === 3 && r.matches.every((m) => m.teamA[0] === "Ann"));

console.log("\n\x1b[36m── mergeRoster ───────────────────────────────────────\x1b[0m");
const rr = mergeRoster({
  cloudPlayers: { 1: { id: 1, name: "A" }, 2: { id: 2, name: "B" } },
  localPlayers: { 1: { id: 1, name: "Ann" }, 3: { id: 3, name: "New" } },
  cloudAliases: { 1: ["a"], 2: ["b"] },
  localAliases: { 1: ["ann"], 3: ["nw"] },
  cloudNextId: 3,
  localNextId: 4,
});
ok("local roster entries win and new players are kept", rr.players[1].name === "Ann" && rr.players[2].name === "B" && rr.players[3].name === "New");
ok("aliases are unioned", rr.aliases[1].includes("a") && rr.aliases[1].includes("ann") && rr.aliases[3][0] === "nw");
ok("next id is the larger", rr.nextId === 4);

console.log(`\n\x1b[1mSync merge: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`);
process.exit(fail ? 1 : 0);
