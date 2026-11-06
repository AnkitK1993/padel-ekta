// tests-parser.mjs — the admin "Add Matches" line formats.
// Run: node tests/tests-parser.mjs
import { initParserDeps, parseBlock } from "../src/domain/parser.js";

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
const nameMap = { Aks: "Akshay", Aya: "Ayaan", Par: "Parthiv", Sac: "Sachin", Nil: "Nilesh", Ank: "Ankit" };
const aliasMap = Object.fromEntries([...new Set(Object.values(nameMap))].map((n) => [n, []]));
initParserDeps(() => nameMap, () => aliasMap, () => "2026-11-06");
const one = (line) => parseBlock(line);
const want = (r, a, b, sA, sB) =>
  r.errors.length === 0 && r.parsed.length === 1 && r.parsed[0].teamA.join() === a && r.parsed[0].teamB.join() === b && r.parsed[0].scoreA === sA && r.parsed[0].scoreB === sB;

const block = `Aks Aya vs Par Sac : 4-2
Nil Aya vs Sac Ank : 4-3
Aya Sac vs Par Aks : 4-0
Ank Aya vs Nil Sac : 4-1`;
const r = parseBlock(block);
ok("colon before the score: all four lines parse", r.errors.length === 0 && r.parsed.length === 4, JSON.stringify(r.errors));
ok("…and read the right teams and score", want(one("Aks Aya vs Par Sac : 4-2"), "Akshay,Ayaan", "Parthiv,Sachin", 4, 2));
ok("colon with no spaces", want(one("Aks Aya vs Par Sac:4-2"), "Akshay,Ayaan", "Parthiv,Sachin", 4, 2));
ok("= , | before the score", ["=", ",", "|"].every((s) => want(one(`Aks Aya vs Par Sac ${s} 4-2`), "Akshay,Ayaan", "Parthiv,Sachin", 4, 2)));
ok("plain format still works", want(one("Aks Aya vs Par Sac 4-2"), "Akshay,Ayaan", "Parthiv,Sachin", 4, 2));
ok("en dash and spaced score still work", want(one("Aks Aya vs Par Sac : 4 – 2"), "Akshay,Ayaan", "Parthiv,Sachin", 4, 2));
ok("v instead of vs", want(one("Aks Aya v Par Sac : 4-2"), "Akshay,Ayaan", "Parthiv,Sachin", 4, 2));
ok("dates still set the day", parseBlock("6/11/26\nAks Aya vs Par Sac : 4-2").parsed[0].date === "2026-11-06" && parseBlock("1/11/26\nAks Aya vs Par Sac : 4-2").parsed[0].date === "2026-11-01");
ok("a draw is still rejected", one("Aks Aya vs Par Sac : 4-4").errors.length === 1);
console.log(`\n\x1b[1mParser: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`);
if (fail) process.exit(1);
