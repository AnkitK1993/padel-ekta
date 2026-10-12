// tests-data-health.mjs — regression tests for src/domain/data-health.js.
// Run: node tests/tests-data-health.mjs   (also part of `npm test`)
import {
  checkDataHealth,
  formatHealthReport,
  normalizeName,
  editDistance,
} from "../src/domain/data-health.js";
import { cleanPlayerName } from "../src/domain/players.js";

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

const players = {
  1: { id: 1, name: "Ankit", isGuest: false },
  2: { id: 2, name: "Rahul M", isGuest: false },
  3: { id: 3, name: "Rahul G", isGuest: false },
  4: { id: 4, name: "Sachin", isGuest: false },
  5: { id: 5, name: "Parthiv", isGuest: false },
  6: { id: 6, name: "Nobody", isGuest: false },
  7: { id: 7, name: "Ravi", isGuest: true },
};
const M = (id, date, A, B, sa, sb) => ({ id, date, teamA: A, teamB: B, scoreA: sa, scoreB: sb });
const seasons = [
  { id: "s1", name: "S1", start: "2026-01-01", end: "2026-06-30" },
  { id: "s2", name: "S2", start: "2026-07-01", end: null },
];
const clean = [
  M("a", "2026-02-01", ["Ankit", "Rahul M"], ["Rahul G", "Sachin"], 4, 2),
  M("b", "2026-02-02", ["Ankit", "Sachin"], ["Rahul G", "Parthiv"], 4, 3),
  M("c", "2026-08-01", ["Ankit", "Parthiv"], ["Rahul M", "Sachin"], 4, 1),
];
const run = (matches, extra = {}) =>
  checkDataHealth({ matches, players, seasons, today: "2026-10-11", ...extra });
const kinds = (r) => r.issues.map((i) => i.kind);

console.log("\n\x1b[36m── clean data ──────────────────────────────────────────\x1b[0m");
{
  const r = run(clean);
  ok("clean league: no errors or warnings", r.errors === 0 && r.warnings === 0, JSON.stringify(kinds(r)));
  ok("only notes: the unused roster player is reported", kinds(r).join() === "roster-orphan", kinds(r).join());
  ok("a first name + initial pair (Rahul M / Rahul G) is not flagged as a typo", !kinds(r).includes("roster-similar"));
  ok("ok flag is true when only notes remain", r.ok === true);
  ok("empty input does not throw", checkDataHealth().issues.length === 0);
}

console.log("\n\x1b[36m── names ───────────────────────────────────────────────\x1b[0m");
{
  const r = run([...clean, M("d", "2026-08-02", ["Ankit", "Sachn"], ["Rahul G", "Parthiv"], 4, 3)]);
  const u = r.issues.find((i) => i.kind === "name-unknown");
  ok("a name missing from the roster is warned about", !!u && u.name === "Sachn", JSON.stringify(u));
  ok("…with a did-you-mean for a one-letter slip", u && u.suggestion === "Sachin", JSON.stringify(u));
  const far = run([...clean, M("d", "2026-08-02", ["Ankit", "Zzzzzz"], ["Rahul G", "Parthiv"], 4, 3)]);
  ok("a stranger gets no suggestion", far.issues.find((i) => i.kind === "name-unknown").suggestion === null);

  const sp = run([...clean, M("d", "2026-08-02", ["Ankit ", "Sachin"], ["Rahul G", "Parthiv"], 4, 3)]);
  ok("trailing space in a match name is flagged", kinds(sp).includes("name-whitespace"), kinds(sp).join());
  ok("…and also as unknown, since it isn't the roster name", kinds(sp).includes("name-unknown"));

  const emp = run([...clean, M("d", "2026-08-02", ["Ankit", ""], ["Rahul G", "Parthiv"], 4, 3)]);
  ok("an empty name is an error", emp.errors >= 1 && kinds(emp).includes("name-empty"));

  const dup = checkDataHealth({
    matches: clean,
    players: { ...players, 8: { id: 8, name: "ankit", isGuest: false } },
    seasons,
    today: "2026-10-11",
  });
  ok("roster look-alikes (case-only difference) are warned about", kinds(dup).includes("roster-lookalike"), kinds(dup).join());

  const near = checkDataHealth({
    matches: clean,
    players: { ...players, 8: { id: 8, name: "Parthav", isGuest: false } },
    seasons,
    today: "2026-10-11",
  });
  ok("roster names one letter apart are noted", kinds(near).includes("roster-similar"), kinds(near).join());

  const alias = checkDataHealth({
    matches: clean,
    players,
    aliasMap: { 1: ["Ank", "AK"], 2: ["AK"] },
    seasons,
    today: "2026-10-11",
  });
  ok("an alias claimed by two players is an error", kinds(alias).includes("alias-collision"));
  ok("normalizeName ignores case, spaces, punctuation and accents", normalizeName("  Jóse-M. ") === normalizeName("jose m"));
  ok("editDistance", editDistance("kitten", "sitting") === 3 && editDistance("a", "a") === 0);
}

console.log("\n\x1b[36m── matches ─────────────────────────────────────────────\x1b[0m");
{
  ok("invalid score is an error", kinds(run([...clean, M("d", "2026-08-02", ["Ankit", "Sachin"], ["Rahul G", "Parthiv"], "x", 3)])).includes("score-invalid"));
  ok("negative score is an error", kinds(run([...clean, M("d", "2026-08-02", ["Ankit", "Sachin"], ["Rahul G", "Parthiv"], -1, 3)])).includes("score-invalid"));
  ok("a tie is a warning", run([...clean, M("d", "2026-08-02", ["Ankit", "Sachin"], ["Rahul G", "Parthiv"], 3, 3)]).issues.find((i) => i.kind === "score-tie")?.severity === "warn");
  ok("a player on both teams is an error", kinds(run([...clean, M("d", "2026-08-02", ["Ankit", "Sachin"], ["Ankit", "Parthiv"], 4, 3)])).includes("player-twice"));
  ok("a team with three players is an error", kinds(run([...clean, M("d", "2026-08-02", ["Ankit", "Sachin", "Parthiv"], ["Rahul G", "Rahul M"], 4, 3)])).includes("team-size"));
  ok("singles is only a note", run([...clean, M("d", "2026-08-02", ["Ankit"], ["Rahul G"], 4, 3)]).issues.find((i) => i.kind === "singles")?.severity === "info");
  ok("malformed date is an error", kinds(run([...clean, M("d", "02/08/2026", ["Ankit", "Sachin"], ["Rahul G", "Parthiv"], 4, 3)])).includes("date-invalid"));
  ok("missing date is an error", kinds(run([...clean, M("d", undefined, ["Ankit", "Sachin"], ["Rahul G", "Parthiv"], 4, 3)])).includes("date-invalid"));
  ok("a future date is a warning", kinds(run([...clean, M("d", "2027-01-01", ["Ankit", "Sachin"], ["Rahul G", "Parthiv"], 4, 3)])).includes("date-future"));
  ok("shared match ids are an error", kinds(run([...clean, M("a", "2026-08-02", ["Ankit", "Sachin"], ["Rahul G", "Parthiv"], 4, 3)])).includes("id-duplicate"));
  const dupM = run([...clean, M("d", "2026-02-01", ["Rahul M", "Ankit"], ["Sachin", "Rahul G"], 4, 2)]);
  ok("same teams (in any order), score and day = possible double entry", kinds(dupM).includes("duplicate-match"), kinds(dupM).join());
  ok("…pointing at the first copy", dupM.issues.find((i) => i.kind === "duplicate-match").firstIdx === 0);
  ok("same teams on a different day is NOT a duplicate", !kinds(run([...clean, M("d", "2026-02-09", ["Ankit", "Rahul M"], ["Rahul G", "Sachin"], 4, 2)])).includes("duplicate-match"));

  const ooo = run([clean[0], clean[2], clean[1]]);
  ok("matches stored out of date order are noted", ooo.issues.find((i) => i.kind === "out-of-order")?.count === 1, kinds(ooo).join());
  ok("in-order data has no such note", !kinds(run(clean)).includes("out-of-order"));
  ok("a match outside every season is noted", kinds(run([...clean, M("d", "2025-05-05", ["Ankit", "Sachin"], ["Rahul G", "Parthiv"], 4, 3)])).includes("no-season"));
  ok("no seasons defined → no season notes", !kinds(checkDataHealth({ matches: clean, players, seasons: [], today: "2026-10-11" })).includes("no-season"));
}

console.log("\n\x1b[36m── seasons ─────────────────────────────────────────────\x1b[0m");
{
  const back = checkDataHealth({ matches: clean, players, seasons: [{ id: "x", name: "Back", start: "2026-05-01", end: "2026-01-01" }], today: "2026-10-11" });
  ok("a season that ends before it starts is an error", kinds(back).includes("season-range"));
  const ov = checkDataHealth({ matches: clean, players, seasons: [{ id: "a", name: "A", start: "2026-01-01", end: "2026-07-15" }, { id: "b", name: "B", start: "2026-07-01", end: null }], today: "2026-10-11" });
  ok("overlapping seasons are warned about", kinds(ov).includes("season-overlap"));
  ok("an open-ended season overlaps a later start", kinds(checkDataHealth({ matches: clean, players, seasons: [{ id: "a", name: "A", start: "2026-01-01", end: null }, { id: "b", name: "B", start: "2026-09-01", end: null }], today: "2026-10-11" })).includes("season-overlap"));
  ok("back-to-back seasons are fine", !kinds(run(clean)).includes("season-overlap"));
}

console.log("\n\x1b[36m── the name rule ───────────────────────────────────────\x1b[0m");
{
  const ok1 = (raw, expect) => cleanPlayerName(raw).ok === expect;
  ok("plain names, initials, accents, apostrophes and hyphens are accepted",
    ["Rahul M", "José", "O'Brien", "Jean-Luc", "D.K.", "Ankit2"].every((n) => ok1(n, true)));
  ok("markup, separators and quotes are rejected",
    ["Ravi<b>", "A & B", "A|B", 'Say "hi"', "back`tick", "a/b"].every((n) => ok1(n, false)));
  ok("whitespace is collapsed and trimmed", cleanPlayerName("  Ankit    K ").name === "Ankit K");
  ok("empty and over-long names are rejected", !cleanPlayerName("   ").ok && !cleanPlayerName("x".repeat(31)).ok);
  const legacy = checkDataHealth({
    matches: clean,
    players: { ...players, 9: { id: 9, name: "Ravi<b>", isGuest: false } },
    seasons,
    today: "2026-10-11",
  });
  ok("an old roster name that breaks the rule is flagged", kinds(legacy).includes("name-chars"), kinds(legacy).join());
}

console.log("\n\x1b[36m── ordering & report ───────────────────────────────────\x1b[0m");
{
  const r = run([...clean, M("d", "2026-08-02", ["Ankit", "Sachn"], ["Rahul G", "Parthiv"], 4, "x")]);
  const sev = r.issues.map((i) => i.severity);
  ok("errors come before warnings before notes", sev.join() === [...sev].sort((a, b) => ({ error: 0, warn: 1, info: 2 })[a] - ({ error: 0, warn: 1, info: 2 })[b]).join(), sev.join());
  const rep = formatHealthReport(r);
  ok("the text report has a summary line and one line per issue", rep.split("\n").length === r.issues.length + 1 && /^Data health: \d+ error/.test(rep));
  ok("a clean result reads as such", formatHealthReport({ issues: [] }) === "Data health: no issues found.");
}

console.log(
  `\n\x1b[1mData health: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`,
);
process.exit(fail ? 1 : 0);
