// tests-audit.mjs — undo recipes and log sharing for the admin audit log.
// Run: node tests/tests-audit.mjs
import { applyUndo, mergeLogs } from "../src/domain/audit.js";

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
const M = (id, date, sa, sb) => ({ id, date, teamA: ["A", "B"], teamB: ["C", "D"], scoreA: sa, scoreB: sb });
const base = [M("1", "2026-01-01", 4, 1), M("2", "2026-01-02", 4, 2)];

console.log("\n\x1b[36m── applyUndo ─────────────────────────────────────────\x1b[0m");
let r = applyUndo([...base, M("3", "2026-01-03", 4, 0)], { kind: "remove", ids: ["3"] });
ok("undo an add removes exactly that match", r.ok && r.matches.length === 2);
r = applyUndo(base, { kind: "remove", ids: ["3"] });
ok("undoing an add twice is a no-op", !r.ok && r.matches === base);
r = applyUndo([base[1]], { kind: "restore", match: { ...base[0], deletedAt: "2026-02-01" } });
ok("undo a delete puts the match back in date order, without deletedAt", r.ok && r.matches[0].id === "1" && !("deletedAt" in r.matches[0]));
r = applyUndo(base, { kind: "restore", match: base[0] });
ok("restoring a match that is already there is refused", !r.ok);
r = applyUndo([base[0], { ...base[1], scoreB: 3 }], { kind: "replace", before: base[1] });
ok("undo an edit restores the old version", r.ok && r.matches[1].scoreB === 2);
r = applyUndo([base[0]], { kind: "replace", before: base[1] });
ok("undoing an edit of a since-deleted match is refused", !r.ok);
ok("the input list is never mutated", base.length === 2 && base[1].scoreB === 2);

console.log("\n\x1b[36m── mergeLogs ─────────────────────────────────────────\x1b[0m");
const a = [{ id: "x", at: "2026-01-02T10:00:00Z", action: "Delete Match" }];
const b = [
  { id: "x", at: "2026-01-02T10:00:00Z", action: "Delete Match", undone: true },
  { id: "y", at: "2026-01-03T10:00:00Z", action: "Add Match" },
];
const m = mergeLogs(a, b);
ok("logs merge by id, newest first", m.length === 2 && m[0].id === "y");
ok("undone on either device stays undone", m[1].undone === true);
ok("the merged log is capped", mergeLogs(Array.from({ length: 10 }, (_, i) => ({ id: String(i), at: String(i) })), [], 5).length === 5);

console.log(`\n\x1b[1mAudit: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`);
process.exit(fail ? 1 : 0);
