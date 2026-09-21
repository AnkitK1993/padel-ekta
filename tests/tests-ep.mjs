// tests-ep.mjs — regression tests for src/domain/ep.js (Earned Points).
// Run: node tests/tests-ep.mjs

import {
  computeEP,
  computeEPFull,
  computeEPTimeline,
  computeMatchEPDeltas,
  computeEPUpsets,
  computeEPProjection,
  EP_SHRINKAGE,
} from "../src/domain/ep.js";

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
const M = (date, a, b, sa, sb) => ({ date, teamA: a, teamB: b, scoreA: sa, scoreB: sb });
const d = (matches, m, careerMatches) =>
  computeMatchEPDeltas(matches, careerMatches).get(m).playerDeltas;
// n matches purely to age `who` past the maturity threshold, on a date before
// the window under test. Opponents rotate so nobody else gets over-aged.
const ageing = (who, n, from = "2023-01-01") =>
  Array.from({ length: n }, (_, i) =>
    M(from, [who, `Filler${i}A`], [`Filler${i}B`, `Filler${i}C`], 4, 2),
  );

console.log("\n\x1b[36m── EP: everyone starts at 0 and earns ───────────────\x1b[0m");

const one = [M("2024-01-01", ["Ankit", "Puneet"], ["Rahul", "Sahil"], 4, 2)];
const p1 = d(one, one[0]);
ok("a win pays positive", p1.Ankit > 0, `got ${p1.Ankit}`);
ok("equal-rated teammates get identical points on a win", p1.Ankit === p1.Puneet);
ok("equal-rated teammates get identical points on a loss", p1.Rahul === p1.Sahil);
ok(
  "a brand-new player's loss still pays POSITIVE (growth phase)",
  p1.Rahul > 0,
  `got ${p1.Rahul}`,
);
ok("a loss pays much less than a win", p1.Rahul < p1.Ankit / 2, `win ${p1.Ankit} vs loss ${p1.Rahul}`);
ok(
  "no 1000 anchor — totals are the sum of what was earned",
  computeEPFull(one).Ankit.ep === p1.Ankit,
);

console.log("\n\x1b[36m── EP: maturity turns losses negative ───────────────\x1b[0m");

// Same match, but the loser now has 60 career games behind them.
const vetCareer = ageing("Rahul", 60);
const matureLoss = d(one, one[0], [...vetCareer, ...one]);
ok(
  "a 50+ game veteran's loss goes NEGATIVE",
  matureLoss.Rahul < 0,
  `got ${matureLoss.Rahul}`,
);
ok(
  "their brand-new partner in the same match still earns positive",
  matureLoss.Sahil > 0,
  `got ${matureLoss.Sahil}`,
);
ok(
  "same team, same match, different points — driven by each player's own maturity",
  matureLoss.Rahul !== matureLoss.Sahil,
  `Rahul=${matureLoss.Rahul}, Sahil=${matureLoss.Sahil}`,
);
ok(
  "maturity uses CAREER games, not games in the scored window",
  d(one, one[0]).Rahul > 0 && matureLoss.Rahul < 0,
  "identical scored window, only the career history differs",
);
const halfCareer = d(one, one[0], [...ageing("Rahul", 25), ...one]);
ok(
  "maturity ramps smoothly — 25 career games sits between 0 and 60",
  halfCareer.Rahul < p1.Rahul && halfCareer.Rahul > matureLoss.Rahul,
  `new=${p1.Rahul}, half=${halfCareer.Rahul}, mature=${matureLoss.Rahul}`,
);

console.log("\n\x1b[36m── EP: margin and shutouts ──────────────────────────\x1b[0m");

const margins = [4, 3, 2, 1, 0].map((loserScore) => {
  const ms = [M("2024-01-01", ["A", "B"], ["C", "D"], 4, loserScore)];
  return { loserScore, win: d(ms, ms[0]).A, loss: d(ms, ms[0]).C };
});
ok(
  "a bigger winning margin always pays the winner more",
  margins.every((m, i) => i === 0 || m.win > margins[i - 1].win),
  margins.map((m) => `4-${m.loserScore}:${m.win}`).join(" "),
);
ok(
  "4-0 pays more than 4-1",
  margins[4].win > margins[3].win,
  `4-0=${margins[4].win}, 4-1=${margins[3].win}`,
);
ok(
  "4-0 pays meaningfully more than a 4-3 grind (>30%)",
  margins[4].win > margins[0].win * 1.3,
  `4-0=${margins[4].win}, 4-3=${margins[0].win}`,
);
ok(
  "the shutout kicker makes 4-0 jump more than the linear step from 4-2→4-1",
  margins[4].win - margins[3].win > margins[2].win - margins[1].win,
);
ok(
  "a heavier defeat earns the loser less than a narrow one",
  margins[4].loss < margins[0].loss,
  `lost 4-0: ${margins[4].loss}, lost 4-3: ${margins[0].loss}`,
);
ok(
  "margin is normalised across formats — 6-0 scores like 4-0",
  (() => {
    const six = [M("2024-01-01", ["A", "B"], ["C", "D"], 6, 0)];
    return d(six, six[0]).A === margins[4].win;
  })(),
);

console.log("\n\x1b[36m── EP: expectation prices partner quality ───────────\x1b[0m");

// Build a real rating gap: Strong beats everyone, Weak loses to everyone.
const history = [
  ...Array.from({ length: 12 }, (_, i) => M("2023-06-01", ["Strong", `X${i}`], ["Weak", `Y${i}`], 4, 1)),
];
const vsGood = [M("2024-01-01", ["Strong", "Mid1"], ["Opp1", "Opp2"], 4, 1)];
const vsWeak = [M("2024-01-01", ["Strong", "Weak"], ["Opp1", "Opp2"], 4, 1)];
const winGood = d(vsGood, vsGood[0], [...history, ...vsGood]).Strong;
const winWeak = d(vsWeak, vsWeak[0], [...history, ...vsWeak]).Strong;
ok(
  "winning WITH a weaker partner pays more than with a stronger one",
  winWeak > winGood,
  `weak partner=${winWeak}, strong partner=${winGood}`,
);
const lostGood = [M("2024-01-01", ["Strong", "Mid1"], ["Opp1", "Opp2"], 1, 4)];
const lostWeak = [M("2024-01-01", ["Strong", "Weak"], ["Opp1", "Opp2"], 1, 4)];
const loseGood = d(lostGood, lostGood[0], [...history, ...lostGood]).Strong;
const loseWeak = d(lostWeak, lostWeak[0], [...history, ...lostWeak]).Strong;
ok(
  "losing WITH a weaker partner costs less than with a stronger one",
  loseWeak > loseGood,
  `weak partner=${loseWeak}, strong partner=${loseGood}`,
);
ok(
  "so carrying a weak partner is never punished — better upside AND softer downside",
  winWeak > winGood && loseWeak > loseGood,
);
ok(
  "beating a much stronger team pays more than beating a much weaker one",
  (() => {
    const upset = [M("2024-01-01", ["Weak", "W2"], ["Strong", "S2"], 4, 1)];
    const stomp = [M("2024-01-01", ["Strong", "S2"], ["Weak", "W2"], 4, 1)];
    const hist = [...history, ...Array.from({ length: 12 }, (_, i) =>
      M("2023-06-02", ["Strong", `P${i}`], ["S2", `Q${i}`], 4, 1))];
    return d(upset, upset[0], [...hist, ...upset]).Weak >
      d(stomp, stomp[0], [...hist, ...stomp]).Strong;
  })(),
);

console.log("\n\x1b[36m── EP: the shrinkage divisor (rank key) ─────────────\x1b[0m");

const lopsided = [
  // Grinder plays 6, Cameo plays 1 — both win everything they play.
  ...Array.from({ length: 6 }, (_, i) => M(`2024-02-0${i + 1}`, ["Grinder", "G2"], [`L${i}`, `L${i}b`], 4, 2)),
  M("2024-02-07", ["Cameo", "C2"], ["Z1", "Z2"], 4, 2),
];
const full = computeEPFull(lopsided);
ok(
  "score = total EP / (games + shrinkage)",
  Math.abs(full.Grinder.score - full.Grinder.ep / (full.Grinder.games + EP_SHRINKAGE)) < 1e-9,
);
ok(
  "a 1-match cameo cannot outrank a 6-match player on the same win rate",
  full.Grinder.score > full.Cameo.score,
  `Grinder=${full.Grinder.score.toFixed(2)} (${full.Grinder.games}g), Cameo=${full.Cameo.score.toFixed(2)} (${full.Cameo.games}g)`,
);
ok(
  "raw totals would say the same here, but the divisor is what blocks loss-farming",
  (() => {
    // 20 losses vs 3 wins: the farmer wins on raw total, loses on score.
    const farm = [
      ...Array.from({ length: 20 }, (_, i) => M(`2024-03-01`, ["Farmer", `F${i}`], [`W${i}`, `W${i}b`], 1, 4)),
      ...Array.from({ length: 3 }, (_, i) => M(`2024-03-02`, ["Sharp", `S${i}`], [`V${i}`, `V${i}b`], 4, 1)),
    ];
    const f = computeEPFull(farm);
    return f.Farmer.ep > f.Sharp.ep && f.Farmer.score < f.Sharp.score;
  })(),
  "farmer should lead on total EP but trail on the rank key",
);
ok(
  "computeEP exposes the flat rank key",
  Math.abs(computeEP(lopsided).Grinder - full.Grinder.score) < 1e-9,
);
ok(
  "a player with zero wins ranks below every player with wins",
  (() => {
    const ms = [
      M("2024-04-01", ["Winner", "W2"], ["Loser", "L2"], 4, 2),
      M("2024-04-02", ["Winner", "W2"], ["Loser", "L2"], 4, 2),
    ];
    const f = computeEPFull(ms);
    return f.Loser.score < f.Winner.score;
  })(),
);

console.log("\n\x1b[36m── EP: window scoping and robustness ────────────────\x1b[0m");

const season1 = [M("2024-01-01", ["A", "B"], ["C", "D"], 4, 2)];
const season2 = [M("2024-09-01", ["A", "B"], ["C", "D"], 4, 2)];
ok(
  "only matches in the scored window produce deltas",
  computeMatchEPDeltas(season2, [...season1, ...season2]).size === 1,
);
ok(
  "EP resets to 0 each window — season 2 totals ignore season 1 earnings",
  computeEPFull(season2, [...season1, ...season2]).A.games === 1,
);
ok(
  "career context still leaks through: the same match scores differently with history behind it",
  d(season2, season2[0], [...ageing("C", 60, "2023-01-01"), ...season2]).C !==
    d(season2, season2[0], season2).C,
);
ok("empty matches → {}", Object.keys(computeEP([])).length === 0);
ok(
  "a malformed match with an empty team is skipped, not crashed on",
  computeEP([{ date: "2024-01-01", teamA: [], teamB: ["C", "D"], scoreA: 0, scoreB: 4 }]).C ===
    undefined,
);
ok(
  "computeEP is deterministic",
  JSON.stringify(computeEP(lopsided)) === JSON.stringify(computeEP(lopsided)),
);
ok(
  "result is independent of input array order (engine sorts by date internally)",
  JSON.stringify(computeEP(lopsided)) === JSON.stringify(computeEP([...lopsided].reverse())),
);

console.log("\n\x1b[36m── EP: timeline / peaks / lows ──────────────────────\x1b[0m");

const tlMatches = [
  M("2024-05-01", ["A", "B"], ["C", "D"], 4, 1),
  M("2024-05-02", ["A", "C"], ["B", "D"], 4, 2),
  M("2024-05-03", ["A", "D"], ["B", "C"], 1, 4),
  M("2024-05-04", ["A", "B"], ["C", "D"], 4, 0),
];
const tl = computeEPTimeline(tlMatches);
ok(
  "history has one entry per match played",
  tl.history.A.length === 4 && tl.history.B.length === 4,
  `A=${tl.history.A.length}, B=${tl.history.B.length}`,
);
ok(
  "entries carry the same fields the ASS timeline exposes",
  ["date", "elo", "delta", "won", "opponent", "scoreA", "scoreB"].every(
    (k) => k in tl.history.A[0],
  ),
  JSON.stringify(tl.history.A[0]),
);
ok(
  "elo tracks the running leaderboard score, not the cumulative total",
  (() => {
    const last = tl.history.A[3];
    const total = tl.history.A.reduce((s, h) => s + h.delta, 0);
    return Math.abs(last.elo - total / (4 + EP_SHRINKAGE)) < 1e-9;
  })(),
);
ok(
  "the final timeline value matches computeEPFull's score",
  Math.abs(tl.history.A[3].elo - computeEPFull(tlMatches).A.score) < 1e-9,
);
ok(
  "delta stays the raw EP earned that match",
  tl.history.A[0].delta === computeMatchEPDeltas(tlMatches).get(tlMatches[0]).playerDeltas.A,
);
ok(
  "won/opponent/scores are recorded from the player's own side",
  tl.history.A[2].won === false &&
    tl.history.A[2].scoreA === 1 &&
    tl.history.A[2].scoreB === 4 &&
    tl.history.A[2].opponent === "B & C",
  JSON.stringify(tl.history.A[2]),
);
ok(
  "peak is the highest running score reached, low the lowest",
  (() => {
    const vals = tl.history.A.map((h) => h.elo);
    return (
      Math.abs(tl.peaks.A - Math.max(...vals)) < 1e-9 &&
      Math.abs(tl.lows.A - Math.min(...vals)) < 1e-9
    );
  })(),
);
ok(
  "peak and low genuinely differ — the score moves both ways",
  tl.peaks.A > tl.lows.A,
  `peak=${tl.peaks.A.toFixed(2)}, low=${tl.lows.A.toFixed(2)}`,
);
ok(
  "career context reaches the timeline — a veteran's losing run trends lower",
  (() => {
    const losses = [
      M("2024-06-01", ["Vet", "P1"], ["Q1", "Q2"], 1, 4),
      M("2024-06-02", ["Vet", "P1"], ["Q1", "Q2"], 1, 4),
    ];
    const green = computeEPTimeline(losses, losses);
    const grey = computeEPTimeline(losses, [...ageing("Vet", 60), ...losses]);
    return grey.history.Vet[1].elo < green.history.Vet[1].elo;
  })(),
);
ok(
  "only the scored window appears, even with career history behind it",
  (() => {
    const t = computeEPTimeline(season2, [...season1, ...season2]);
    return t.history.A.length === 1;
  })(),
);
ok("empty matches → empty timeline", Object.keys(computeEPTimeline([]).history).length === 0);
ok(
  "computeEPTimeline is deterministic and order-independent",
  JSON.stringify(computeEPTimeline(tlMatches)) ===
    JSON.stringify(computeEPTimeline([...tlMatches].reverse())),
);

console.log("\n\x1b[36m── EP: upsets (Underdog Leaderboard) ────────────────[0m");

// Build a real strength gap: Strong beats everyone, Weak loses to everyone,
// each 12 times, before the match under test.
const strengthHistory = Array.from({ length: 12 }, (_, i) =>
  M("2023-06-01", ["Strong", `X${i}`], ["Weak", `Y${i}`], 4, 1),
);
const upsetMatch = [M("2024-02-01", ["Weak", "W2"], ["Strong", "S2"], 4, 1)];
const noUpsetMatch = [M("2024-02-01", ["Strong", "S2"], ["Weak", "W2"], 4, 1)];

const upsets = computeEPUpsets(upsetMatch, [...strengthHistory, ...upsetMatch]);
ok("the weaker team winning is recorded as an upset", upsets.length === 1, JSON.stringify(upsets));
ok(
  "winners/losers/score are recorded correctly",
  upsets[0].winners.includes("Weak") &&
    upsets[0].losers.includes("Strong") &&
    upsets[0].sw === 4 &&
    upsets[0].sl === 1,
  JSON.stringify(upsets[0]),
);
ok("gap is positive (the winner was the underdog)", upsets[0].gap > 0, `got ${upsets[0].gap}`);

const noUpsets = computeEPUpsets(noUpsetMatch, [...strengthHistory, ...noUpsetMatch]);
ok(
  "the stronger team winning is NOT an upset",
  noUpsets.length === 0,
  JSON.stringify(noUpsets),
);
ok(
  "only the scored window is scanned for upsets, even with career history behind it",
  computeEPUpsets(upsetMatch, [...strengthHistory, ...upsetMatch, ...ageing("Strong", 5, "2023-08-01")])
    .length === 1,
);
ok("empty matches → []", computeEPUpsets([]).length === 0);
ok(
  "computeEPUpsets is deterministic",
  JSON.stringify(computeEPUpsets(upsetMatch, strengthHistory)) ===
    JSON.stringify(computeEPUpsets(upsetMatch, strengthHistory)),
);

console.log("\n\x1b[36m── EP: rating projection ────────────────────────────[0m");

// Player A wins every one of their last 5 matches (+ve recent form); Player B
// loses every one of theirs AND is a 60-game veteran, so those losses are
// fully accountable (a new player's losses still pay positive — see the
// maturity tests above — so a losing streak alone isn't enough here).
const bCareer = ageing("B", 60, "2023-01-01");
const projMatches = [
  ...Array.from({ length: 5 }, (_, i) => M(`2024-03-0${i + 1}`, ["A", "P1"], ["Q1", "Q2"], 4, 1)),
  ...Array.from({ length: 5 }, (_, i) => M(`2024-03-0${i + 1}`, ["Q3", "Q4"], ["B", "P2"], 4, 1)),
];
const proj = computeEPProjection(projMatches, [...bCareer, ...projMatches], 5, 20);
const rowA = proj.find((r) => r.name === "A");
const rowB = proj.find((r) => r.name === "B");
ok("avgDelta is positive for a player on a run of wins", rowA.avgDelta > 0, `got ${rowA.avgDelta}`);
ok("avgDelta is negative for a player on a run of losses", rowB.avgDelta < 0, `got ${rowB.avgDelta}`);
ok(
  "projected score moves in the direction of recent form",
  rowA.projScore > rowA.currentScore && rowB.projScore < rowB.currentScore,
  `A: ${rowA.currentScore.toFixed(1)} -> ${rowA.projScore.toFixed(1)}, B: ${rowB.currentScore.toFixed(1)} -> ${rowB.projScore.toFixed(1)}`,
);
ok(
  "projection denominator grows by futureM (games + futureM + shrinkage)",
  (() => {
    const full = computeEPFull(projMatches, [...bCareer, ...projMatches]).A;
    const expected = (full.ep + rowA.avgDelta * 20) / (full.games + 20 + EP_SHRINKAGE);
    return Math.abs(rowA.projScore - expected) < 1e-9;
  })(),
);
ok(
  "currentRank/projRank/rankDiff are self-consistent",
  proj.every((r) => r.rankDiff === r.currentRank - r.projRank),
);
ok(
  "a wider form window pulls in more history and can change the average",
  (() => {
    const mixed = [
      M("2024-04-01", ["G", "P1"], ["Q1", "Q2"], 1, 4), // loss
      M("2024-04-02", ["G", "P1"], ["Q1", "Q2"], 4, 1), // win
      M("2024-04-03", ["G", "P1"], ["Q1", "Q2"], 4, 1), // win
    ];
    const narrow = computeEPProjection(mixed, mixed, 2, 10).find((r) => r.name === "G");
    const wide = computeEPProjection(mixed, mixed, 3, 10).find((r) => r.name === "G");
    return narrow.avgDelta !== wide.avgDelta;
  })(),
);
ok("empty matches → []", computeEPProjection([], null, 10, 20).length === 0);

console.log(`\n\x1b[1mEP: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`);
process.exit(fail ? 1 : 0);
