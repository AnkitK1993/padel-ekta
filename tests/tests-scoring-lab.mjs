// tests-scoring-lab.mjs — the Scoring Lab's parameterised ASS engine.
// Its default parameters must reproduce the live engine (src/domain/ep.js)
// exactly, so the lab's "ASS (live)" option is always the Summary tab's board.
// Run: node tests/tests-scoring-lab.mjs
import { computeMatchEPDeltas, computeEPFull } from "../src/domain/ep.js";
import { labEPDeltas, labEPFull, labWinPct, labOption, LAB_OPTIONS, LAB_SLIDERS, labAddGrace, labMatchupDeltas, matchupPoints, matchupMargin, labFormDeltas, labFormFull } from "../src/domain/scoring-lab.js";

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
      const gap = Math.abs(x.ass[p] - x.ass[q]), sh = 0.1 * Math.min(1, gap / 20);
      if (Math.abs(e.playerDeltas[weak] - v * (v > 0 ? 1 + sh : 1 - sh)) > 1.5) splitOk = false;
    });
  });
  ok("partner split 10%: weaker partner gets more of a win, stronger takes more of a loss, team total unchanged", splitOk && splitSeen > 50);
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
  ok("Season 3 ranks on the season's ASS from the first match", labOption("season3").params.seasonGames === 0);
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
  const wp = { bal: 100, strongMid: 75, weakMid: 110, strongFull: 50, weakFull: 120 };
  const asIs = labMatchupDeltas(w, career, { seasonGames: 0, gapRule: true, splitCap: 0 });
  const withWp = labMatchupDeltas(w, career, { seasonGames: 0, gapRule: true, splitCap: 0, winPoints: wp });
  // At the default win points only the halfway shape differs from the straight slide: same at 0, ½ and 1.
  let wpOk = true, wpSeen = 0;
  w.forEach((m) => {
    const x = withWp.get(m).matchup;
    if (x.kind === "newcomer") return;
    const aWon = m.scoreA > m.scoreB;
    const role = aWon ? x.roleA : x.roleB;
    const t = aWon ? m.teamA : m.teamB;
    const lerp = (a, b, f) => a + (b - a) * f;
    const s0 = x.stack;
    const mid = role === "stronger" ? wp.strongMid : wp.weakMid, full = role === "stronger" ? wp.strongFull : wp.weakFull;
    const want = (role === "balanced" ? wp.bal : s0 <= 0.5 ? lerp(wp.bal, mid, s0 / 0.5) : lerp(mid, full, (s0 - 0.5) / 0.5)) + 20 * x.g;
    if (Math.abs(withWp.get(m).playerDeltas[t[0]] - want) > 0.51) wpOk = false;
    wpSeen++;
    const loser = aWon ? m.teamB : m.teamA;
    if (withWp.get(m).playerDeltas[loser[0]] !== asIs.get(m).playerDeltas[loser[0]]) wpOk = false;
  });
  ok("win sliders: a win pays the balanced / halfway / fully-stacked points, sliding straight between; losses unchanged", wpOk && wpSeen > 10);
  const big = labMatchupDeltas(w, career, { seasonGames: 0, gapRule: true, splitCap: 0, winPoints: { ...wp, strongFull: 10 } });
  ok("win sliders: lowering the fully-stacked win lowers only stacked wins", w.some((m) => { const x = big.get(m).matchup; return x.kind === "mismatch" && x.stack === 1 && big.get(m).playerDeltas[m.teamA[0]] !== withWp.get(m).playerDeltas[m.teamA[0]]; }) && w.every((m) => { const x = big.get(m).matchup; return x.kind !== "balanced" || same(big.get(m).playerDeltas, withWp.get(m).playerDeltas); }));
  const half2 = (m) => (m.date < "2026-03-20" ? "S1" : "S2");
  const early = labMatchupDeltas(w, career, { seasonGames: 0, seasonKey: half2, gapRule: true, earlyCareer: true, earlyGames: 5, earlyPrevGames: 40 });
  // Expected: ASS over the player's last 50 games before their season, points as scored in that season.
  const walkAll = [...career].sort((a, b) => a.date.localeCompare(b.date));
  const s1 = walkAll.filter((m) => half2(m) === "S1");
  const s1Pts = labEPDeltas(s1, walkAll);
  const prevWant = (p) => {
    const ms = s1.filter((m) => [...m.teamA, ...m.teamB].includes(p)).slice(-40);
    return ms.length ? (2 * ms.reduce((t, m) => t + s1Pts.get(m).playerDeltas[p], 0)) / (ms.length + 10) : null;
  };
  let earlyOk = true, prev = 0, seas = 0;
  w.forEach((m) => {
    const x = early.get(m).matchup;
    Object.keys(x.assFrom).forEach((p) => {
      if (half2(m) === "S2" && x.seasonGames[p] < 5) {
        const want = prevWant(p);
        if (want === null ? x.assFrom[p] !== "season" : x.assFrom[p] !== "previous" || Math.abs(x.ass[p] - want) > 1e-9) earlyOk = false;
        prev++;
      } else if (half2(m) === "S2") {
        if (x.assFrom[p] !== "season") earlyOk = false;
        seas++;
      }
    });
  });
  ok("early-season fix: ASS over the last 40 games before the season until N games this season, then the season's", earlyOk && prev > 0 && seas > 0);
  const v20 = labMatchupDeltas(w, career, { seasonGames: 0, gapRule: true, maturity: 20 });
  ok("veteran line slider: newcomer = under N career games (20 here)", w.every((m) => { const x = v20.get(m).matchup; const nc = Object.keys(x.careerGames).filter((p) => x.careerGames[p] < 20); return (x.kind === "newcomer") === nc.length > 0; }));
  const v0 = labMatchupDeltas(w, career, { seasonGames: 0, gapRule: true, maturity: 0 });
  ok("veteran line at 0: nobody is a newcomer, no NaN points", w.every((m) => v0.get(m).matchup.kind !== "newcomer" && Object.values(v0.get(m).playerDeltas).every(Number.isFinite)));
  const off = labMatchupDeltas(w, career, { seasonGames: 0, seasonKey: half2, gapRule: true, earlyCareer: false, earlyGames: 5 });
  ok("early-season fix off = season ASS from the first game", w.every((m) => Object.values(off.get(m).matchup.assFrom).every((f) => f === "season")));
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
  ok("the gap-rule option: balanced up to (default 15), fully stacked from (default 30), partner split, no top 6 rule", same(labOption("gaprule").sliders, ["gapBalanced", "gapFull", "splitCap", "maturity", "earlyCareer", "earlyGames", "earlyPrevGames"]) && LAB_SLIDERS.find((s) => s.key === "gapBalanced").def === 15 && LAB_SLIDERS.find((s) => s.key === "gapFull").def === 30 && !LAB_SLIDERS.some((s) => s.key === "topTier"));
}

{
  const live = labOption("live");
  const sl = LAB_SLIDERS.find((s) => s.key === "assMaturity");
  ok("ASS (live) has its own veteran slider (0–50, default 50) that sets the engine's maturity", same(live.sliders, ["assSplit", "assMaturity", "assEarly", "assEarlyGames", "assEarlyPrev"]) && sl.param === "maturity" && sl.min === 0 && sl.max === 50 && sl.def === 50);
  const at50 = labEPDeltas(w, career, { maturity: 50 }), base = labEPDeltas(w, career);
  ok("at 50 it is the live engine exactly", w.every((m) => same(at50.get(m).playerDeltas, base.get(m).playerDeltas)));
  const sp = LAB_SLIDERS.find((s) => s.key === "assSplit");
  ok("ASS (live) partner split slider: 0–30%, default 12 = the live 0.12", sp.param === "splitMax" && sp.def * sp.paramScale === 0.12 && sp.min === 0 && sp.max === 30);
  const at12 = labEPDeltas(w, career, { splitMax: 0.12 });
  ok("split at 12% is the live engine exactly", w.every((m) => same(at12.get(m).playerDeltas, base.get(m).playerDeltas)));
  const s0 = labEPDeltas(w, career, { splitMax: 0 });
  ok("split at 0%: partners get the same points", w.every((m) => [m.teamA, m.teamB].every(([x, y]) => s0.get(m).playerDeltas[x] === s0.get(m).playerDeltas[y])));
  const half2 = (m) => (m.date < "2026-03-20" ? "S1" : "S2");
  const s2 = career.filter((m) => half2(m) === "S2");
  const fixOff = labEPDeltas(s2, career, { seasonKey: half2, earlyFix: false });
  const plain2 = labEPDeltas(s2, career);
  ok("ASS early-season fix off = the live engine exactly", s2.every((m) => same(fixOff.get(m).playerDeltas, plain2.get(m).playerDeltas)));
  const fix = labEPDeltas(s2, career, { seasonKey: half2, earlyFix: true, earlyGames: 5, earlyPrevGames: 25 });
  const seen = {};
  let fixOk = true, early = 0, later = 0;
  [...s2].sort((a, b) => a.date.localeCompare(b.date)).forEach((m) => {
    const e = fix.get(m);
    const anyEarly = [...m.teamA, ...m.teamB].some((p) => (seen[p] || 0) < 5);
    if (anyEarly !== (e.oddsFrom === "early")) fixOk = false;
    if (!Object.values(e.playerDeltas).every(Number.isFinite)) fixOk = false;
    anyEarly ? early++ : later++;
    [...m.teamA, ...m.teamB].forEach((p) => (seen[p] = (seen[p] || 0) + 1));
  });
  ok("ASS early-season fix on: previous-season strength for a player's first N games, then the live rating", fixOk && early > 0 && later > 0);
  ok("ASS early-season fix changes the early win chances", s2.some((m) => fix.get(m).oddsFrom === "early" && Math.abs(fix.get(m).expA - plain2.get(m).expA) > 0.02));
  const at0 = labEPDeltas(w, career, { maturity: 0 });
  ok("at 0 every loss costs (no newcomer credit)", w.every((m) => Object.values(at0.get(m).breakdown).every((b) => b.won || b.raw <= 0)));
}
{
  const half2 = (m) => (m.date < "2026-03-20" ? "S1" : "S2");
  const fd = labFormDeltas(career, career, { seasonKey: half2 });
  const s2 = career.filter((m) => half2(m) === "S2");
  const live2 = labEPDeltas(s2, career);
  ok("Form ASS: each match keeps its own season's ASS points", s2.every((m) => same(fd.get(m).playerDeltas, live2.get(m).playerDeltas)));
  const flat = labFormFull(fd, { half: 0, k: 10 }), plain = labEPFull(fd);
  ok("Form ASS with no fading = plain ASS over the same matches", Object.keys(plain).every((p) => Math.abs(flat[p].score - plain[p].score) < 1e-9));
  // A player whose wins are all recent beats one whose identical wins are old.
  const mk = (date, a, b) => ({ date, teamA: a, teamB: b, scoreA: 4, scoreB: 2 });
  const toy = [mk("2026-01-01", ["Old", "X"], ["Y", "Z"]), mk("2026-01-02", ["Old", "X"], ["Y", "Z"]), mk("2026-06-01", ["New", "X"], ["Y", "Z"]), mk("2026-06-02", ["New", "X"], ["Y", "Z"])];
  const tf = labFormFull(labFormDeltas(toy, toy), { half: 30, k: 10 });
  ok("Form ASS: recent wins count more than old ones", tf.New.score > tf.Old.score && tf.New.games === tf.Old.games);
  const sl = (k) => LAB_SLIDERS.find((s) => s.key === k);
  ok("Form ASS sliders: half-life 0–120 days (45), cushion 0–30 (10), previous seasons on, team-gap switch, 32 in all", labOption("form").sliders.slice(0, 4).join() === "formHalf,formK,formAll,fGap" && labOption("form").sliders.length === 32 && sl("formHalf").min === 0 && sl("formHalf").max === 120 && sl("formHalf").def === 45 && sl("formK").def === 10 && sl("formAll").toggle && sl("formAll").def === 1);
}
{
  // Form ASS's own sliders: their defaults must give exactly the live engine's
  // points (ASS mode) / the team-gap points (team-gap mode).
  const half2 = (m) => (m.date < "2026-03-20" ? "S1" : "S2");
  const val = (k) => { const s = LAB_SLIDERS.find((x) => x.key === k); return s.toggle ? !!s.def : s.def * (s.paramScale ?? 1) + (s.paramAdd ?? 0); };
  const P = { ass: {}, gap: {}, win: {}, loss: {} };
  labOption("form").sliders.forEach((k) => { const s = LAB_SLIDERS.find((x) => x.key === k); const [g, n] = s.fp.split("."); if (P[g]) P[g][n] = val(k); });
  const plain = labFormDeltas(career, career, { seasonKey: half2 });
  const viaSliders = labFormDeltas(career, career, { seasonKey: half2, assParams: P.ass });
  ok("Form ASS: the ASS sliders at their defaults = live ASS points", career.every((m) => same(plain.get(m).playerDeltas, viaSliders.get(m).playerDeltas)));
  const gapP = { ...P.gap, winPoints: P.win, lossPoints: { ...P.loss, weakMid: (P.loss.bal + P.loss.weakFull) / 2 } };
  const gapVia = labFormDeltas(career, career, { seasonKey: half2, engine: "gap", assParams: P.ass, gapParams: gapP });
  const gapRef = labMatchupDeltas(career, career, { seasonGames: 0, seasonKey: half2, gapRule: true, gapBalanced: 15, gapFull: 30, splitCap: 5, maturity: 10, earlyCareer: true, earlyGames: 10, earlyPrevGames: 25, winPoints: P.win, liveParams: { ...P.ass } });
  ok("Form ASS team-gap mode at the defaults = the gap rule's own loss points", career.every((m) => same(gapVia.get(m).playerDeltas, gapRef.get(m).playerDeltas)));
  const harsh = labFormDeltas(career, career, { seasonKey: half2, engine: "gap", assParams: P.ass, gapParams: { ...gapP, lossPoints: { ...gapP.lossPoints, strongFull: 60, strongMid: 30 } } });
  let harder = 0, otherSame = true;
  career.forEach((m) => { const x = harsh.get(m).matchup, y = gapVia.get(m); if (!x || x.kind === "newcomer") return;
    const aWon = m.scoreA > m.scoreB; const loserRole = aWon ? x.roleB : x.roleA; const l = aWon ? m.teamB : m.teamA, w = aWon ? m.teamA : m.teamB;
    if (loserRole === "stronger") { if (harsh.get(m).playerDeltas[l[0]] < y.playerDeltas[l[0]]) harder++; } else if (harsh.get(m).playerDeltas[l[0]] !== y.playerDeltas[l[0]]) otherSame = false;
    if (harsh.get(m).playerDeltas[w[0]] !== y.playerDeltas[w[0]]) otherSame = false; });
  ok("Form ASS: raising the stacked-loss sliders costs the stronger losing team more, nothing else", harder > 3 && otherSame);
  const noVet = labFormDeltas(career, career, { seasonKey: half2, assParams: { ...P.ass, vetLoss: 0 } });
  ok("Form ASS: veteran loss at 0 = veterans' losses cost nothing", career.every((m) => Object.values(noVet.get(m).breakdown).every((b) => b.won || !b.vet || b.raw === 0)));
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
ok("seven options: live, custom sliders, gap rule, grace marks, ASS before 1 Oct, Form ASS and Season 3", LAB_OPTIONS.map((o) => o.id).join() === "live,custom,gaprule,grace,pre1oct,form,season3" && labOption("custom").kind === "matchup");
{
  const s3 = labOption("season3");
  const half2s = (m) => (m.date < "2026-03-20" ? "S1" : "S2");
  ok("Season 3: one set of sliders (gap, wins, split, veteran line, early-season fix), no repeats, no top 6", s3.params.gapRule && s3.params.liveFollows && same(s3.sliders, ["gapBalanced", "gapFull", "winBal", "winStrongMid", "winWeakMid", "winStrongFull", "winWeakFull", "splitCap", "maturity", "earlyCareer", "earlyGames", "earlyPrevGames"]));
  const follow = labMatchupDeltas(career, career, { seasonGames: 0, seasonKey: half2s, gapRule: true, maturity: 30, splitCap: 0, liveFollows: true });
  const liveSame = labEPDeltas(career, career, { maturity: 30, splitMax: 0, seasonKey: half2s, earlyFix: false });
  ok("Season 3: newcomer matches use the same split and veteran line (ASS)", career.every((m) => follow.get(m).matchup.kind !== "newcomer" || same(follow.get(m).playerDeltas, liveSame.get(m).playerDeltas)) && career.some((m) => follow.get(m).matchup.kind === "newcomer"));
  const half2 = (m) => (m.date < "2026-03-20" ? "S1" : "S2");
  const s2 = career.filter((m) => half2(m) === "S2");
  const base = labMatchupDeltas(s2, career, { seasonGames: 0, seasonKey: half2, gapRule: true, maturity: 30 });
  const sameLive = labMatchupDeltas(s2, career, { seasonGames: 0, seasonKey: half2, gapRule: true, maturity: 30, liveParams: { splitMax: 0.12, maturity: 50, earlyFix: false } });
  ok("Season 3 at the ASS defaults = the gap rule with live ASS newcomer matches", s2.every((m) => same(base.get(m).playerDeltas, sameLive.get(m).playerDeltas)));
  const noSplit = labMatchupDeltas(career, career, { seasonGames: 0, seasonKey: half2, gapRule: true, maturity: 30, liveParams: { splitMax: 0 } });
  const liveNoSplit = labEPDeltas(career, career, { maturity: 30, splitMax: 0 });
  let nc = 0, ncOk = true, vetSame = true;
  const baseAll = labMatchupDeltas(career, career, { seasonGames: 0, seasonKey: half2, gapRule: true, maturity: 30 });
  career.forEach((m) => {
    const x = noSplit.get(m);
    if (x.matchup.kind === "newcomer") {
      nc++;
      if (!same(x.playerDeltas, liveNoSplit.get(m).playerDeltas)) ncOk = false;
    } else if (!same(x.playerDeltas, baseAll.get(m).playerDeltas)) vetSame = false;
  });
  ok("Season 3's ASS split slider changes only the newcomer (ASS-scored) matches", nc > 0 && ncOk && vetSame, `nc=${nc} ncOk=${ncOk} vetSame=${vetSame}`);
}
ok("the sliders start at the Fair Matchup values", LAB_SLIDERS.filter((s) => !s.fp).map((s) => `${s.key}=${s.def}`).join() === "winBase=100,lossMax=20,splitCap=5,gapBalanced=15,gapFull=30,winBal=100,winStrongMid=75,winWeakMid=110,winStrongFull=50,winWeakFull=120,maturity=10,assSplit=12,assEarly=0,assEarlyGames=10,assEarlyPrev=25,assMaturity=50,earlyCareer=1,earlyGames=10,earlyPrevGames=25,graceMarks=10");
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
