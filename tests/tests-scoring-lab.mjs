// tests-scoring-lab.mjs — the Scoring Lab's parameterised ASS engine.
// Its default parameters must reproduce the live engine (src/domain/ep.js)
// exactly, so the lab's "ASS (live)" option is always the Summary tab's board.
// Run: node tests/tests-scoring-lab.mjs
import { computeMatchEPDeltas, computeEPFull } from "../src/domain/ep.js";
import { labEPDeltas, labEPFull, labWinPct, labOption, LAB_OPTIONS, LAB_SLIDERS, labAddGrace, labMatchupDeltas, matchupPoints, matchupMargin } from "../src/domain/scoring-lab.js";

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
const v40 = labEPDeltas(w, career, { vetLoss: 40 });
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

const ns = labEPFull(live, { rankShrinkage: 0 });
const lf = labEPFull(live);
ok("average points: same points, score is 2 × points ÷ games", Object.keys(ns).every((p) => ns[p].ep === lf[p].ep && Math.abs(ns[p].score - (2 * ns[p].ep) / ns[p].games) < 1e-12));

const ramp = labEPDeltas(w, career, { lossMode: "ramp" });
let rampOk = true;
w.forEach((m) => Object.entries(ramp.get(m).breakdown).forEach(([p, b]) => {
  if (!b.won && b.careerGames >= 50 && b.raw !== live.get(m).breakdown[p].raw) rampOk = false;
}));
ok("gradual maturity: from game 50 on a loss is priced exactly like live", rampOk);

const oct = labEPDeltas(w, career, { winMode: "classic", lossMode: "classic", lossBase: 40, penalty: 60, splitMax: 0, expectation: "career", scale: 1 });
ok("2 Oct version: no teammate split", [...oct.values()].every((e) => Object.values(e.breakdown).every((b) => b.shift === 0)));
ok("2 Oct version: a win pays 50–150 before margin", [...oct.values()].every((e) => Object.values(e.breakdown).every((b) => !b.won || (b.raw >= 50 * 0.8 && b.raw <= 150 * 1.2 * 1.05 + 1))));

const wp = labWinPct([
  { teamA: ["A", "B"], teamB: ["C", "D"], scoreA: 4, scoreB: 1 },
  { teamA: ["A", "C"], teamB: ["B", "D"], scoreA: 2, scoreB: 4 },
]);
ok("win %: wins ÷ matches", wp.A.score === 50 && wp.C.score === 0 && wp.D.score === 50 && wp.B.score === 100 && wp.B.games === 2);

{
  const ao = labEPDeltas(w, career, { odds: "ass" });
  const cgAll = {}; const before = new Map();
  [...career].sort((a, b) => a.date.localeCompare(b.date)).forEach((m) => { before.set(m, Object.fromEntries([...m.teamA, ...m.teamB].map((p) => [p, cgAll[p] || 0]))); [...m.teamA, ...m.teamB].forEach((p) => (cgAll[p] = (cgAll[p] || 0) + 1)); });
  const tot = {}, gms = {};
  let assOk = true, eloOk = true, sawAss = false;
  w.forEach((m) => {
    const e = ao.get(m), vets = Object.values(before.get(m)).every((g) => g >= 50);
    const a = (p) => (2 * (tot[p] || 0)) / ((gms[p] || 0) + 10);
    if (vets) {
      sawAss = true;
      const gap = (a(m.teamA[0]) + a(m.teamA[1]) - a(m.teamB[0]) - a(m.teamB[1])) / 2;
      if (e.oddsFrom !== "ass" || Math.abs(e.expA - 1 / (1 + Math.pow(10, -gap / 50))) > 1e-12) assOk = false;
    } else if (e.oddsFrom !== "elo" || Math.abs(e.expA - live.get(m).expA) > 1e-12) eloOk = false;
    Object.entries(e.playerDeltas).forEach(([p, v]) => { tot[p] = (tot[p] || 0) + v; gms[p] = (gms[p] || 0) + 1; });
  });
  ok("ASS-based odds: all-veteran matches take the win chance from the team ASS gap", assOk && sawAss);
  ok("ASS-based odds: matches with a newcomer keep the hidden-rating win chance", eloOk);
  let underdogOk = true, gapsSeen = 0;
  {
    const tt = {}, gg = {};
    w.forEach((m) => {
      const e = ao.get(m), a = (p) => (2 * (tt[p] || 0)) / ((gg[p] || 0) + 10);
      if (e.oddsFrom === "ass") {
        const gap = a(m.teamA[0]) + a(m.teamA[1]) - a(m.teamB[0]) - a(m.teamB[1]);
        if (Math.abs(gap) > 1e-9) { gapsSeen++; if ((gap < 0) !== (e.expA < 0.5)) underdogOk = false; }
      }
      Object.entries(e.playerDeltas).forEach(([p, v]) => { tt[p] = (tt[p] || 0) + v; gg[p] = (gg[p] || 0) + 1; });
    });
  }
  ok("ASS-based odds: the lower-ASS team is the underdog (win chance under 50%)", underdogOk && gapsSeen > 50);
}

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
  const ns = labMatchupDeltas(w, career, { splitCap: 0 });
  ok("partner split 0%: both partners get the same points", w.every((m) => { const e = ns.get(m); return e.matchup.kind === "newcomer" || (e.playerDeltas[m.teamA[0]] === e.playerDeltas[m.teamA[1]] && e.playerDeltas[m.teamB[0]] === e.playerDeltas[m.teamB[1]]); }));
  let splitOk = true, splitSeen = 0;
  w.forEach((m) => {
    const e = mu.get(m), e0 = ns.get(m), x = e.matchup;
    if (x.kind === "newcomer") return;
    [m.teamA, m.teamB].forEach(([p, q]) => {
      const tot = e.playerDeltas[p] + e.playerDeltas[q], tot0 = e0.playerDeltas[p] + e0.playerDeltas[q];
      if (Math.abs(tot - tot0) > 2) splitOk = false; // the team's total doesn't change (± rounding)
      const [weak, strong] = x.ass[p] < x.ass[q] ? [p, q] : [q, p];
      const v = e0.playerDeltas[p];
      if (x.ass[p] === x.ass[q] || v === 0) return;
      splitSeen++;
      if (v > 0 && !(e.playerDeltas[weak] >= e.playerDeltas[strong])) splitOk = false; // win: weaker gets more
      if (v < 0 && !(e.playerDeltas[strong] <= e.playerDeltas[weak])) splitOk = false; // loss: stronger loses more
      const gap = Math.abs(x.ass[p] - x.ass[q]), sh = 0.15 * Math.min(1, gap / 20);
      if (Math.abs(e.playerDeltas[weak] - v * (v > 0 ? 1 + sh : 1 - sh)) > 1.5) splitOk = false;
    });
  });
  ok("partner split 15%: weaker partner gets more of a win, stronger takes more of a loss, team total unchanged", splitOk && splitSeen > 50);
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
  ok("Fair Matchup Points ranks on the season's ASS from the first match", labOption("matchup").params.seasonGames === 0);
  const s0 = labMatchupDeltas(career, career, { seasonKey: month, seasonGames: 0 });
  ok("with seasonGames 0 every reading is the season's ASS", career.every((m) => Object.values(s0.get(m).matchup.assFrom).every((f) => f === "season")));
  ok("season games restart at 0 each season", ["Ann", "Ben"].every((p) => bm.get(firstMatchOfMonth(p, "S2")).matchup.seasonGames[p] === 0));
}

console.log("\n\x1b[36m── gap rule (graded) ─────────────────────────────────\x1b[0m");
{
  const base = labMatchupDeltas(w, career, { seasonGames: 0 });
  const g00 = labMatchupDeltas(w, career, { seasonGames: 0, gapRule: true, gapBalanced: 0, gapFull: 0 });
  ok("gap rule at 0 / 0: any team gap is fully stacked", w.every((m) => { const x = g00.get(m).matchup; return x.kind === "newcomer" || x.stack === (x.gap > 0 ? 1 : 0); }));
  const gr = labMatchupDeltas(w, career, { seasonGames: 0, gapRule: true, gapBalanced: 10, gapFull: 40 });
  let rSmall = true, rGrade = true, partial = 0, saw14big = false;
  w.forEach((m) => {
    const x = gr.get(m).matchup;
    if (x.kind === "newcomer") return;
    const best = Object.keys(x.rank).find((p) => x.rank[p] === 1), worst = Object.keys(x.rank).find((p) => x.rank[p] === 4);
    const together = (m.teamA.includes(best) && m.teamA.includes(worst)) || (m.teamB.includes(best) && m.teamB.includes(worst));
    if (together && x.gap > 10 && x.stack > 0) saw14big = true;
    if (x.gap <= 10 && x.stack !== 0) rSmall = false;
    if (x.gap > 10) {
      const want = Math.min(1, (x.gap - 10) / 30);
      if (Math.abs(x.stack - want) > 1e-9) rGrade = false;
      if (x.stack > 0 && x.stack < 1) partial++;
    }
  });
  ok("#1 paired with #4 is no longer always balanced: a big team gap still counts", saw14big);
  ok("a team gap of 10 or less is balanced", rSmall);
  ok("between 10 and 40 the split is graded (gap − 10) ÷ 30", rGrade && partial > 5);
  const dflt = labMatchupDeltas(w, career, { seasonGames: 0, gapRule: true });
  ok("defaults: balanced up to 15, fully stacked from 30", w.every((m) => { const x = dflt.get(m).matchup; return x.kind === "newcomer" || Math.abs(x.stack - Math.max(0, Math.min(1, (x.gap - 15) / 15))) < 1e-9; }));
  const tt = labMatchupDeltas(w, career, { seasonGames: 0, gapRule: true, topTier: true });
  let tierOk = true, tierSeen = 0, sameOk = true;
  w.forEach((m) => {
    const x = tt.get(m).matchup, y = dflt.get(m).matchup;
    if (x.kind === "newcomer") return;
    if (!Array.isArray(x.top) || x.top.length > 6) tierOk = false;
    if (x.topA !== x.topB) {
      tierSeen++;
      const more = x.topA > x.topB ? "roleA" : "roleB";
      if (x.stack < 0.5 || x[more] !== "stronger") tierOk = false;
    } else if (x.stack !== y.stack || x.roleA !== y.roleA) sameOk = false;
  });
  ok("top 6 rule: the team with more top-6 players is stronger and at least half stacked", tierOk && tierSeen > 3);
  ok("top 6 rule: equal top-6 counts = the plain gap rule", sameOk);
  const half = labMatchupDeltas(w, career, { seasonGames: 0, gapRule: true, gapBalanced: 10, gapFull: 40, splitCap: 0 });
  let interp = true, checked = 0;
  w.forEach((m) => {
    const e = half.get(m), x = e.matchup;
    if (x.kind !== "mismatch") return;
    const aWon = m.scoreA > m.scoreB, g = x.g;
    [[m.teamA, x.roleA, aWon], [m.teamB, x.roleB, !aWon]].forEach(([t, role, won]) => {
      const bal = matchupPoints("balanced", won, g), full = matchupPoints(role, won, g);
      const want = (won ? 100 + 20 * g : -20 * g) + x.stack * ((won ? (role === "stronger" ? 50 : 120) + 20 * g : role === "stronger" ? -(30 + 10 * g) : -20 * g) - (won ? 100 + 20 * g : -20 * g));
      checked++;
      if (Math.abs(e.playerDeltas[t[0]] - want) > 0.51 || Math.abs(bal) < 0 || Math.abs(full) < 0) interp = false;
    });
  });
  ok("partly stacked points sit between the balanced and the stacked numbers", interp && checked > 10);
  ok("the gap-rule option: balanced up to (default 15), fully stacked from (default 30), top 6 toggle (off)", same(labOption("gaprule").sliders, ["gapBalanced", "gapFull", "topTier"]) && LAB_SLIDERS.find((s) => s.key === "gapBalanced").def === 15 && LAB_SLIDERS.find((s) => s.key === "gapFull").def === 30 && LAB_SLIDERS.find((s) => s.key === "topTier").toggle && LAB_SLIDERS.find((s) => s.key === "topTier").def === 0);
}

console.log("\n\x1b[36m── grace marks ───────────────────────────────────────\x1b[0m");
{
  const base = labEPDeltas(w, career);
  const gr = labAddGrace(base, "Lou", 20);
  const played = w.filter((m) => [...m.teamA, ...m.teamB].includes("Lou")).length;
  const f0 = labEPFull(base), f1 = labEPFull(gr);
  ok("grace marks add the points to every match the player played", f1.Lou.ep === f0.Lou.ep + 20 * played && f1.Lou.games === f0.Lou.games);
  ok("nobody else changes", Object.keys(f0).every((p) => p === "Lou" || f0[p].ep === f1[p].ep));
  ok("0 points or no player = the base board", labAddGrace(base, "Lou", 0) === base || [...labAddGrace(base, "Lou", 0).values()].every((e, i) => e === [...base.values()][i]));
  ok("touched matches say so", [...gr.values()].some((e) => e.grace && e.grace.player === "Lou" && e.grace.pts === 20));
}

console.log("\n\x1b[36m── option list ──────────────────────────────────────\x1b[0m");
ok("six options: live, custom sliders, gap rule, grace marks, ASS before 1 Oct and Fair Matchup Points", LAB_OPTIONS.map((o) => o.id).join() === "live,custom,gaprule,grace,pre1oct,matchup" && labOption("custom").kind === "matchup");
ok("the sliders start at the Fair Matchup values", LAB_SLIDERS.map((s) => `${s.key}=${s.def}`).join() === "winBase=100,lossMax=20,splitCap=15,gapBalanced=15,gapFull=30,topTier=0,graceMarks=10");
{
  const base = labMatchupDeltas(w, career, { seasonGames: 0, splitCap: 0 });
  const dflt = labMatchupDeltas(w, career, { seasonGames: 0, winBase: 100, lossMax: 20, splitCap: 0 });
  ok("custom at 100 / 20 = Fair Matchup Points exactly", w.every((m) => same(base.get(m).playerDeltas, dflt.get(m).playerDeltas)));
  const big = labMatchupDeltas(w, career, { seasonGames: 0, winBase: 200, lossMax: 40, splitCap: 0 });
  let prop = true;
  w.forEach((m) => {
    const b0 = base.get(m), b1 = big.get(m);
    if (b0.matchup.kind === "newcomer") return;
    Object.keys(b0.playerDeltas).forEach((p) => { if (Math.abs(b1.playerDeltas[p] - 2 * b0.playerDeltas[p]) > 1) prop = false; });
  });
  ok("doubling both sliders doubles every balanced / stacked number", prop);
  ok("stacked numbers keep their proportions (win 50-70 → 100-140 at win 200)", matchupPoints("stronger", true, 0, 2, 1) === 100 && matchupPoints("stronger", true, 1, 2, 1) === 140 && matchupPoints("stronger", false, 1, 1, 0.5) === -20);
  const nb = labMatchupDeltas(w, career, { seasonGames: 0, winBase: 150, lossMax: 40 });
  const lv = labEPDeltas(w, career, { winBase: 150, vetLoss: 50 });
  ok("newcomer matches use live ASS scaled the same way (win 150, veteran loss 50)", w.every((m) => nb.get(m).matchup.kind !== "newcomer" || same(nb.get(m).playerDeltas, lv.get(m).playerDeltas)));
}
{
  const hist = labEPDeltas(w, career, { winBase: 150, vetLoss: 0 });
  let okWin = true, okLoss = true;
  w.forEach((m) => Object.values(hist.get(m).breakdown).forEach((b) => { if (b.won && b.raw < 100) okWin = false; if (!b.won && b.vet && b.raw !== 0) okLoss = false; }));
  ok("win points 150: every win pays more than 100 before the split", okWin);
  ok("veteran loss 0: a veteran's loss costs nothing", okLoss);
}
ok("every option has an id, label, kind and description", LAB_OPTIONS.every((o) => o.id && o.label && o.kind && o.desc && o.desc.length > 40));
ok("ids are unique", new Set(LAB_OPTIONS.map((o) => o.id)).size === LAB_OPTIONS.length);
ok("an unknown id falls back to live", labOption("nope").id === "live");

console.log(`\n\x1b[1mScoring lab: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`);
process.exit(fail ? 1 : 0);
