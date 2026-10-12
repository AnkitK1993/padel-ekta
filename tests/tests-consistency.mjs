// tests-consistency.mjs — keeps "one rating service" true.
//
// Two layers:
//   1. STATIC: no screen may reach around src/domain/rating-service.js. The
//      bug class this prevents is a module quietly computing another engine (or a
//      1000-centred default) while the rest of the app shows another system —
//      the same player showing two different numbers on two screens.
//   2. ENGINE: for every scoring system, the number a History card shows (the
//      timeline's last value) equals the leaderboard number (the rating map),
//      every match has a delta for every player, and the printed forms are
//      stable. scripts/consistency-check.js covers the same invariants in a
//      real browser, on what is actually printed.
//
// Run: node tests/tests-consistency.mjs   (also part of `npm test`)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  rating,
  setActiveSystem,
  SCORING_SYSTEMS,
} from "../src/domain/rating-service.js";
import { state } from "../src/domain/state.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

// ── 1. static guards ─────────────────────────────────────────────────────
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".github", "tests", "scripts", "docs", "icons"]);
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), out);
    } else if (e.name.endsWith(".js")) out.push(path.join(dir, e.name));
  }
  return out;
}
const rel = (f) => path.relative(ROOT, f).split(path.sep).join("/");
const files = walk(ROOT).map((f) => ({ file: rel(f), text: fs.readFileSync(f, "utf8") }));

// Strip comments so prose that mentions an engine doesn't count as a call.
const code = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");

const ENGINE_FILES = new Set(["ep.js", "glicko2.js", "openskill.js", "fairshare.js"]);
// Modules allowed to talk to an engine directly:
//  - the rating service itself (the single dispatcher),
//  - the engines (they build on each other and on their own helpers).
const ENGINE_OK = new Set([
  "src/domain/rating-service.js",
  ...[...ENGINE_FILES].map((f) => `src/domain/${f}`),
]);

console.log("\n\x1b[36m── static: nothing reaches around the rating service ────\x1b[0m");

const badImports = [];
for (const { file, text } of files) {
  if (ENGINE_OK.has(file)) continue;
  const re = /import\s+[^;]*?from\s+["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(code(text)))) {
    if (ENGINE_FILES.has(path.basename(m[1]))) badImports.push(`${file} imports ${m[1]}`);
  }
}
ok(
  "only the rating service imports a scoring engine",
  badImports.length === 0,
  badImports.join("\n    "),
);

const ENGINE_CALL =
  /(?<![\w.$])(computeEP|computeEPFull|computeEPTimeline|computeMatchEPDeltas|computeEPUpsets|computeEPProjection|computeGlicko2|computeGlicko2Full|computeMatchGlicko2Deltas|computeOpenSkill|computeOpenSkillFull|computeMatchOpenSkillDeltas|computeFairShare|computeMatchFairShareDeltas)\s*\(/;
const badCalls = [];
for (const { file, text } of files) {
  if (ENGINE_OK.has(file)) continue;
  code(text)
    .split("\n")
    .forEach((line, i) => {
      if (ENGINE_CALL.test(line)) badCalls.push(`${file}:${i + 1}  ${line.trim().slice(0, 90)}`);
    });
}
ok("no scoring-engine function is called outside the rating service", badCalls.length === 0, badCalls.join("\n    "));

const srImports = files.filter(
  ({ file, text }) =>
    !["src/domain/stats.js", "src/domain/rating-service.js"].includes(file) &&
    /(?<![\w.$])ratingToSr\b/.test(code(text)),
);
ok(
  "ratingToSr (the 1000-centred SR formula) is only used by stats.js and the service",
  srImports.length === 0,
  srImports.map((f) => f.file).join(", "),
);

const strayState = files.filter(({ file, text }) => {
  const c = code(text);
  return (
    /\b(?:let|var|const)\s+_scoringSystem\b/.test(c) ||
    (file !== "src/domain/rating-service.js" && /\bsetActiveSystem\s*\(/.test(c) && file !== "app.js")
  );
});
ok(
  "the active system has one owner: no second copy, and only app.js sets it",
  strayState.length === 0,
  strayState.map((f) => f.file).join(", "),
);

// Every rating.<x> the code uses must exist on the service (catches typos and
// calls to a method that was renamed or removed — a TypeError on first use).
const used = new Map();
for (const { file, text } of files) {
  if (file === "src/domain/rating-service.js") continue;
  const re = /(?<![\w.$])rating\.(\w+)/g;
  let m;
  const c = code(text);
  while ((m = re.exec(c))) {
    if (!used.has(m[1])) used.set(m[1], []);
    used.get(m[1]).push(file);
  }
}
const missing = [...used.keys()].filter((k) => !(k in rating));
ok(
  `every rating.* method the app calls exists (${used.size} distinct)`,
  missing.length === 0,
  missing.map((k) => `${k} (${[...new Set(used.get(k))].join(", ")})`).join("; "),
);

// A swallowed error hides real bugs inside the same try: every catch must
// either handle the error, log it (noteError) or say why it can be ignored.
const silentCatches = [];
for (const { file, text } of files) {
  text.split("\n").forEach((line, i) => {
    if (/^\s*(\/\/|\*)/.test(line)) return; // prose in a comment
    if (/catch\s*(\(\s*\w*\s*\))?\s*\{\s*\}/.test(line)) silentCatches.push(`${file}:${i + 1}`);
  });
}
ok("no empty catch blocks (log with noteError, or comment why it's safe)", silentCatches.length === 0, silentCatches.join(", "));

// ── 2. engine-level invariants ───────────────────────────────────────────
// A small deterministic league: two seasons, 6 players, mixed margins.
function league() {
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const names = ["Ann", "Ben", "Cy", "Di", "Ed", "Flo"];
  const skill = { Ann: 1.2, Ben: 0.8, Cy: 0.2, Di: 0, Ed: -0.5, Flo: -1 };
  const out = [];
  for (let d = 0; d < 60; d++) {
    const date = new Date(Date.UTC(2025, d < 30 ? 2 : 5, 1 + (d % 30))).toISOString().slice(0, 10);
    for (let k = 0; k < 2; k++) {
      const pool = [...names].sort(() => rnd() - 0.5).slice(0, 4);
      const A = [pool[0], pool[1]];
      const B = [pool[2], pool[3]];
      const s = (t) => t.reduce((x, p) => x + skill[p], 0);
      const aWins = rnd() < 1 / (1 + Math.exp(-(s(A) - s(B))));
      const lo = Math.floor(rnd() * 4);
      out.push({ date, teamA: A, teamB: B, scoreA: aWins ? 4 : lo, scoreB: aWins ? lo : 4 });
    }
  }
  return out;
}
const matches = league();
state.matches = matches;
state.players = {};
state.seasons = [
  { id: "s1", name: "S1", start: "2025-03-01", end: "2025-03-31" },
  { id: "s2", name: "S2", start: "2025-06-01", end: null },
];
const players = [...new Set(matches.flatMap((m) => [...m.teamA, ...m.teamB]))];

for (const sys of SCORING_SYSTEMS) {
  console.log(`\n\x1b[36m── engine: ${sys} ───────────────────────────────────────\x1b[0m`);
  setActiveSystem(sys);
  const map = rating.map(matches);
  const tl = rating.timeline(matches);
  const deltas = rating.deltas(matches);

  ok(`${sys}: rating.system() reports the active system`, rating.system() === sys);
  ok(
    `${sys}: every player has a finite rating`,
    players.every((p) => Number.isFinite(map[p])),
  );
  ok(
    `${sys}: History's last value for each player == the leaderboard rating`,
    players.every((p) => {
      const h = tl.history[p];
      return h && h.length && Math.abs(h[h.length - 1].elo - map[p]) < 1e-9;
    }),
    players
      .filter((p) => Math.abs(tl.history[p].at(-1).elo - map[p]) >= 1e-9)
      .map((p) => `${p}: timeline ${tl.history[p].at(-1).elo} vs map ${map[p]}`)
      .join("; "),
  );
  ok(
    `${sys}: peak >= last value >= low for every player`,
    players.every((p) => {
      const last = tl.history[p].at(-1).elo;
      return tl.peaks[p] >= last - 1e-9 && tl.lows[p] <= last + 1e-9;
    }),
  );
  ok(
    `${sys}: every match has a finite delta for each of its four players`,
    matches.every((m) => {
      const e = deltas.get(m);
      return e && [...m.teamA, ...m.teamB].every((p) => Number.isFinite(e.playerDeltas[p]));
    }),
  );
  ok(
    `${sys}: History entries line up one-per-match-played`,
    players.every((p) => {
      const played = matches.filter((m) => [...m.teamA, ...m.teamB].includes(p)).length;
      return tl.history[p].length === played;
    }),
  );
  ok(
    `${sys}: fmt prints ${rating.isZeroBased() ? "2 decimals" : "whole numbers"}`,
    rating.isZeroBased() ? rating.fmt(1.005) === "1.00" || rating.fmt(1.005) === "1.01" : rating.fmt(1000.4) === "1000",
  );
  ok(
    `${sys}: def() is the baseline an unrated player reads as`,
    rating.def() === (rating.isZeroBased() ? 0 : 1000),
  );
  ok(
    `${sys}: stats() carry an SR for every player on the 0-10 band's scale`,
    rating.stats(matches).every((p) => Number.isFinite(p.sr)),
  );
  if (sys === "ep") {
    const m0 = matches[matches.length - 1];
    const e = rating.entry(m0);
    ok(`ep: entry() gives win chance and an award breakdown`, e && Number.isFinite(e.expA) && e.breakdown);
  } else {
    ok(`${sys}: entry() is null (no EP detail)`, rating.entry(matches[0]) === null);
  }
}
setActiveSystem("ep");

console.log(
  `\n\x1b[1mConsistency: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`,
);
process.exit(fail ? 1 : 0);
