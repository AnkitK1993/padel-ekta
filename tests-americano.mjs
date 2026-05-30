// tests-americano.mjs — schedule generator correctness.
// Run: node tests-americano.mjs   (or: npm run test:americano)

import { generateAmericano, americanoFairness } from "./americano.js";

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

const P = (n) => Array.from({ length: n }, (_, i) => "P" + (i + 1));

// Every match is 4 distinct players; teams are 2 each; no player appears twice
// in a round (playing or sitting).
function structurallyValid(players, schedule, courts) {
  for (const rnd of schedule) {
    const seen = new Set();
    if (rnd.matches.length !== courts) return false;
    for (const m of rnd.matches) {
      const ps = [...m.teamA, ...m.teamB];
      if (m.teamA.length !== 2 || m.teamB.length !== 2) return false;
      if (new Set(ps).size !== 4) return false;
      for (const p of ps) {
        if (seen.has(p)) return false;
        seen.add(p);
      }
    }
    for (const p of rnd.sittingOut || []) {
      if (seen.has(p)) return false;
      seen.add(p);
    }
    if (seen.size !== players.length) return false;
  }
  return true;
}

console.log("\n\x1b[36m── Americano generator ──────────────────────────────\x1b[0m");

// 4 players, 3 rounds → the canonical Americano: everyone partners everyone
// exactly once, nobody sits.
{
  const players = P(4);
  const s = generateAmericano(players, 3);
  ok("4p/3r: structurally valid", structurallyValid(players, s, 1));
  const f = americanoFairness(players, s);
  ok("4p/3r: nobody sits out", f.maxSits === 0);
  ok("4p/3r: everyone partners everyone exactly once", f.maxPartnerRepeat === 1, JSON.stringify(f));
  ok("4p/3r: everyone plays all 3 rounds", f.minPlays === 3 && f.maxPlays === 3);
}

// 8 players, 7 rounds → 2 courts, nobody sits, strong partner variety.
{
  const players = P(8);
  const s = generateAmericano(players, 7);
  ok("8p/7r: structurally valid (2 courts)", structurallyValid(players, s, 2));
  const f = americanoFairness(players, s);
  ok("8p/7r: nobody sits out", f.maxSits === 0);
  ok("8p/7r: plays are equal across players", f.minPlays === f.maxPlays);
  ok("8p/7r: no partner pairing repeats too often", f.maxPartnerRepeat <= 2, JSON.stringify(f));
}

// Odd / non-multiple-of-4 counts → fair sit-out rotation (spread ≤ 1).
for (const n of [5, 6, 7, 9, 11]) {
  const players = P(n);
  const rounds = n; // a few rounds
  const s = generateAmericano(players, rounds);
  const courts = Math.floor(n / 4);
  const valid = structurallyValid(players, s, courts);
  const f = americanoFairness(players, s);
  ok(`${n}p/${rounds}r: structurally valid`, valid, JSON.stringify(f));
  ok(`${n}p/${rounds}r: sit-outs shared evenly (spread ≤ 1)`, f.maxSits - f.minSits <= 1, JSON.stringify(f));
  ok(`${n}p/${rounds}r: play counts balanced (spread ≤ 1)`, f.maxPlays - f.minPlays <= 1, JSON.stringify(f));
}

// Determinism: same input → identical schedule.
{
  const players = P(8);
  ok(
    "deterministic for a given input",
    JSON.stringify(generateAmericano(players, 5)) ===
      JSON.stringify(generateAmericano(players, 5)),
  );
}

// Guard: fewer than 4 players throws.
{
  let threw = false;
  try {
    generateAmericano(P(3), 3);
  } catch (e) {
    threw = true;
  }
  ok("throws with < 4 players", threw);
}

// De-dupes accidental duplicate names.
{
  const s = generateAmericano(["A", "B", "C", "D", "A"], 2);
  ok("ignores duplicate player names", structurallyValid(["A", "B", "C", "D"], s, 1));
}

console.log(`\n\x1b[1mAmericano: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`);
process.exit(fail ? 1 : 0);
