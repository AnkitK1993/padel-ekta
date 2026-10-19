// tests-scoring-lab.mjs — the Scoring Lab's parameterised ASS engine.
// Its default parameters must reproduce the live engine (src/domain/ep.js)
// exactly, so the lab's "ASS (live)" option is always the Summary tab's board.
// Run: node tests/tests-scoring-lab.mjs
import { computeMatchEPDeltas, computeEPFull } from "../src/domain/ep.js";
import { labEPDeltas, labEPFull, labWinPct, labOption, LAB_OPTIONS, labMatchupDeltas, matchupPoints, matchupMargin } from "../src/domain/scoring-lab.js";

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

// A deterministic made-up league: 12 players of different strength, 420
// matches over ~140 days (so plenty of players pass 50 career games).
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const names = "Ann Ben Cal Dee Eve Fin Gus Hal Ivy Jon Kai Lou".split(" ");
const skill = Object.fromEntries(names.map((n, i) => [n, 1 - i / 14]));
const career = [];
for (let i = 0; i < 420; i++) {
  const pool = [...names].sort(() => rnd() - 0.5).slice(0, 4);
  const a = pool.slice(0, 2), b = pool.slice(2);
  const pa = (skill[a[0]] + skill[a[1]]) / (skill[a[0]] + skill[a[1]] + skill[b[0]] + skill[b[1]]);
  const aWon = rnd() < pa;
  const lose = Math.floor(rnd() * 4);
  const day = String(1 + Math.floor(i / 3)).padStart(3, "0");
  const date = new Date(Date.UTC(2026, 0, 1) + (Number(day) - 1) * 864e5).toISOString().slice(0, 10);
  career.push({ date, teamA: a, teamB: b, scoreA: aWon ? 4 : lose, scoreB: aWon ? lose : 4 });
}
const windows = {
  "all history": career,
  "second half": career.filter((m) => m.date >= "2026-03-12"),
  "one day": career.filter((m) => m.date === career[300].date),
};
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);

console.log("\n\x1b[36m── default parameters = the live engine ─────────────\x1b[0m");
for (const [label, w] of Object.entries(windows)) {
  for (const blind of [true, false]) {
    const live = computeMatchEPDeltas(w, career, blind ? {} : { blindElo: false });
    const lab = labEPDeltas(w, career, blind ? {} : { expectation: "career" });
    const bad = w.filter((m) => !same(live.get(m)?.playerDeltas, lab.get(m)?.playerDeltas)).length;
    ok(`${label}, ${blind ? "window" : "all-history"} strength: every player's points match (${w.length} matches)`, bad === 0, `${bad} differ`);
    const fl = computeEPFull(w, career, blind ? {} : { blindElo: false });
    const fb = labEPFull(lab);
    ok(`${label}, ${blind ? "window" : "all-history"} strength: every score matches`, Object.keys(fl).every((p) => Math.abs(fl[p].score - fb[p].score) < 1e-12));
  }
}
ok("the live option uses the default parameters", same(labOption("live").params, {}));

console.log("\n\x1b[36m── the variants do what they say ────────────────────\x1b[0m");
const w = windows["second half"];
const live = labEPDeltas(w, career);
const v40 = labEPDeltas(w, career, labOption("vet40").params);
let vetLossesDeeper = true, othersSame = true;
w.forEach((m) => {
  const L = live.get(m), V = v40.get(m);
  Object.keys(L.breakdown).forEach((p) => {
    const b = L.breakdown[p];
    if (!b.won && b.vet && V.breakdown[p].raw > b.raw) vetLossesDeeper = false;
    if ((b.won || !b.vet) && V.breakdown[p].raw !== b.raw) othersSame = false;
  });
});
ok("veteran loss 40: a veteran's loss costs at least as much as live", vetLossesDeeper);
ok("veteran loss 40: wins and newcomer losses are unchanged", othersSame);

const ns = labEPFull(live, labOption("noshrink").params);
const lf = labEPFull(live);
ok("average points: same points, score is 2 × points ÷ games", Object.keys(ns).every((p) => ns[p].ep === lf[p].ep && Math.abs(ns[p].score - (2 * ns[p].ep) / ns[p].games) < 1e-12));

const ramp = labEPDeltas(w, career, labOption("ramp").params);
let rampOk = true;
w.forEach((m) => Object.entries(ramp.get(m).breakdown).forEach(([p, b]) => {
  if (!b.won && b.careerGames >= 50 && b.raw !== live.get(m).breakdown[p].raw) rampOk = false;
}));
ok("gradual maturity: from game 50 on a loss is priced exactly like live", rampOk);

const oct = labEPDeltas(w, career, labOption("oct2").params);
ok("2 Oct version: no teammate split", [...oct.values()].every((e) => Object.values(e.breakdown).every((b) => b.shift === 0)));
ok("2 Oct version: a win pays 50–150 before margin", [...oct.values()].every((e) => Object.values(e.breakdown).every((b) => !b.won || (b.raw >= 50 * 0.8 && b.raw <= 150 * 1.2 * 1.05 + 1))));

const wp = labWinPct([
  { teamA: ["A", "B"], teamB: ["C", "D"], scoreA: 4, scoreB: 1 },
  { teamA: ["A", "C"], teamB: ["B", "D"], scoreA: 2, scoreB: 4 },
]);
ok("win %: wins ÷ matches", wp.A.score === 50 && wp.C.score === 0 && wp.D.score === 50 && wp.B.score === 100 && wp.B.games === 2);

console.log("\n\x1b[36m── fair matchup points ──────────────────────────────\x1b[0m");
const sc = (a, b) => ({ scoreA: a, scoreB: b });
ok("margin: 4-3 → 0, 4-0 → 1, 4-2 → 1/3, 6-5 → 0, 6-0 → 1", matchupMargin(sc(4, 3)) === 0 && matchupMargin(sc(0, 4)) === 1 && Math.abs(matchupMargin(sc(4, 2)) - 1 / 3) < 1e-12 && matchupMargin(sc(6, 5)) === 0 && matchupMargin(sc(6, 0)) === 1);
ok("stronger team: win 70 at 4-0, 50 at 4-3; loss −40 at 4-0, −30 at 4-3", matchupPoints("stronger", true, 1) === 70 && matchupPoints("stronger", true, 0) === 50 && matchupPoints("stronger", false, 1) === -40 && matchupPoints("stronger", false, 0) === -30);
ok("weaker team: win 140 / 120, loss −20 / 0", matchupPoints("weaker", true, 1) === 140 && matchupPoints("weaker", true, 0) === 120 && matchupPoints("weaker", false, 1) === -20 && matchupPoints("weaker", false, 0) === 0);
ok("balanced: win 120 / 100, loss −20 / 0", matchupPoints("balanced", true, 1) === 120 && matchupPoints("balanced", true, 0) === 100 && matchupPoints("balanced", false, 1) === -20 && matchupPoints("balanced", false, 0) === 0);
{
  const mu = labMatchupDeltas(w, career);
  const lv = labEPDeltas(w, career);
  const kinds = [...labMatchupDeltas(career, career).values()].map((e) => e.matchup.kind);
  ok("the league has newcomer, balanced and mismatch matches", ["newcomer", "balanced", "mismatch"].every((k) => kinds.includes(k)));
  ok("a match with a newcomer (< 50 career games) is scored exactly as live ASS", w.every((m) => mu.get(m).matchup.kind !== "newcomer" || same(mu.get(m).playerDeltas, lv.get(m).playerDeltas)));
  ok("newcomer matches are exactly those with someone under 50 career games", w.every((m) => (mu.get(m).matchup.kind === "newcomer") === Object.values(mu.get(m).matchup.careerGames).some((g) => g < 50)));
  ok("balanced means best + worst vs the middle two (by all-history ASS)", w.every((m) => {
    const x = mu.get(m).matchup;
    if (x.kind !== "balanced") return true;
    const top = Object.keys(x.rank).find((p) => x.rank[p] === 1), bot = Object.keys(x.rank).find((p) => x.rank[p] === 4);
    const t = m.teamA.includes(top) ? m.teamA : m.teamB;
    return t.includes(bot) || Math.abs(x.ass[m.teamA[0]] + x.ass[m.teamA[1]] - x.ass[m.teamB[0]] - x.ass[m.teamB[1]]) < 1e-9;
  }));
  ok("in a mismatch the stronger side has the higher combined ASS", w.every((m) => {
    const x = mu.get(m).matchup;
    if (x.kind !== "mismatch") return true;
    const sA = x.ass[m.teamA[0]] + x.ass[m.teamA[1]], sB = x.ass[m.teamB[0]] + x.ass[m.teamB[1]];
    return (x.roleA === "stronger") === sA > sB && x.roleA !== x.roleB;
  }));
  ok("both partners always get the same points (outside newcomer matches)", w.every((m) => { const e = mu.get(m); return e.matchup.kind === "newcomer" || (e.playerDeltas[m.teamA[0]] === e.playerDeltas[m.teamA[1]] && e.playerDeltas[m.teamB[0]] === e.playerDeltas[m.teamB[1]]); }));
  const wholeHist = labMatchupDeltas(career, career), part = labMatchupDeltas(w, career);
  ok("ranks use ALL history: a window gives the same ASS readings as the full history", w.every((m) => same(wholeHist.get(m).matchup.ass, part.get(m).matchup.ass)));
  // Two seasons (split at 1 Mar): a player is judged on all-history ASS until
  // their 50th game of the season, then on that season's ASS.
  const month = (m) => (m.date < "2026-03-01" ? "S1" : "S2");
  const bm = labMatchupDeltas(career, career, { seasonKey: month });
  const hist = labMatchupDeltas(career, career);
  let switchOk = true, sawSeason = false;
  career.forEach((m) => {
    const x = bm.get(m).matchup;
    Object.keys(x.ass).forEach((p) => {
      if (x.seasonGames[p] < 50) { if (x.assFrom[p] !== "history" || Math.abs(x.ass[p] - hist.get(m).matchup.ass[p]) > 1e-9) switchOk = false; }
      else { sawSeason = true; if (x.assFrom[p] !== "season") switchOk = false; }
    });
  });
  ok("all-history ASS until 50 games in the season, season ASS after", switchOk && sawSeason);
  const firstMatchOfMonth = (p, mon) => career.find((m) => month(m) === mon && [...m.teamA, ...m.teamB].includes(p));
  ok("season games restart at 0 each season", ["Ann", "Ben"].every((p) => bm.get(firstMatchOfMonth(p, "S2")).matchup.seasonGames[p] === 0));
}

console.log("\n\x1b[36m── option list ──────────────────────────────────────\x1b[0m");
ok("every option has an id, label, kind and description", LAB_OPTIONS.every((o) => o.id && o.label && o.kind && o.desc && o.desc.length > 40));
ok("ids are unique", new Set(LAB_OPTIONS.map((o) => o.id)).size === LAB_OPTIONS.length);
ok("an unknown id falls back to live", labOption("nope").id === "live");

console.log(`\n\x1b[1mScoring lab: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`);
process.exit(fail ? 1 : 0);
