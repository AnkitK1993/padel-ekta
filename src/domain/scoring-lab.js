// ── SCORING LAB ────────────────────────────────────────────
// A sandbox for comparing ways of scoring the SAME matches. It never changes
// what the rest of the app shows — the live leaderboard always comes from the
// rating service. The Statistics page's "Scoring Lab" section lists LAB_OPTIONS
// and, for the one picked, shows its leaderboard and every match's points.
//
// The ASS-family options all run through labEPDeltas(): the live ASS engine
// (src/domain/ep.js) rewritten with its constants as parameters, so a variant
// is just a different parameter set. With LAB_EP_DEFAULTS it reproduces the
// live engine exactly — tests/tests-scoring-lab.mjs checks that on real data,
// so the lab can't quietly drift from what the Summary tab shows.
//
// Pure: no DOM, no app state.

export const LAB_EP_DEFAULTS = {
  winBase: 100, // a neutral win
  // "opp": win = winBase × (1 + oppW × (0.5 − p)) — the live formula
  // "classic": win = winBase × (0.5 + (1 − p)) — 50…150 by how big an underdog
  winMode: "opp",
  oppW: 0.4,
  // "binary": newcomer (< maturity career games) loss pays a small credit,
  //           a veteran's loss costs up to vetLoss — the live formula
  // "ramp":   credit fades out and cost fades in over the first `maturity` games
  // "classic": credit (lossBase) minus a penalty that grows to `penalty`
  lossMode: "binary",
  vetLoss: 25,
  lossBase: 10,
  penalty: 60,
  maturity: 50,
  marginW: 0.4,
  shutout: 1.05,
  shrinkage: 10, // phantom zero-point games in the score (and the split's rating)
  rankShrinkage: null, // score-only override (null = same as shrinkage)
  scale: 2, // the headline number is scale × points ÷ (games + shrinkage)
  splitMax: 0.12, // teammate re-split toward the lower-rated partner, max share
  splitGapScale: 20,
  // "window": who's favoured is learned only from the matches being scored;
  // "career": learned from every match ever played
  expectation: "window",
  // Who's favoured, for the win chance that prices a win / a veteran's loss:
  // "elo": the hidden strength rating (live);
  // "ass": when all four players have `maturity`+ career games, from the gap in
  //        the teams' average ASS so far: 1 / (1 + 10^(−gap / oddsScale));
  //        otherwise the hidden rating, as live.
  odds: "elo",
  oddsScale: 50, // fitted on real veteran-only matches (S1 + S2)
  // Early-season fix: until a player has `earlyGames` games in the scored
  // window, their strength for the win chance — and their ASS for the partner
  // split — come from their ASS over their last `earlyPrevGames` games before
  // the window (points as scored in those games' own season, `seasonKey`),
  // instead of the hidden rating that starts everyone level. The ASS is put
  // on the hidden rating's scale with the fitted odds above (400 ÷ oddsScale
  // rating points per ASS point, centred on the players' average).
  earlyFix: false,
  earlyGames: 10,
  earlyPrevGames: 25,
  seasonKey: null,
};

const byDate = (a, b) => (a.date || "").localeCompare(b.date || "");

// Map(match -> { playerDeltas, dA, dB, expA, breakdown }) for `matches`,
// walking `career` (all history) to keep strength and career game counts warm.
export function labEPDeltas(matches, career = null, params = {}) {
  const P = { ...LAB_EP_DEFAULTS, ...params };
  const scoring = new Set(matches || []);
  const walk = [...new Set([...(career || []), ...(matches || [])])].sort(byDate);
  const elo = {};
  const careerGames = {};
  const epTot = {};
  const epGames = {};
  const map = new Map();
  const baseRating = (p) => (epTot[p] || 0) / ((epGames[p] || 0) + P.shrinkage);

  // Early-season fix: each player's ASS over their last earlyPrevGames games
  // before the window, and the rating it stands for.
  const prevAss = {};
  if (P.earlyFix) {
    const first = walk.find((m) => scoring.has(m));
    const pre = first ? walk.filter((m) => !scoring.has(m) && byDate(m, first) < 0) : [];
    const key = P.seasonKey || (() => "");
    const groups = new Map();
    pre.forEach((m) => {
      const k = key(m);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(m);
    });
    const pts = {};
    const plain = { ...params, earlyFix: false };
    groups.forEach((ms) =>
      labEPDeltas(ms, walk, plain).forEach((e, m) =>
        Object.entries(e.playerDeltas).forEach(([p, d]) => (pts[p] ||= []).push({ m, d })),
      ),
    );
    Object.entries(pts).forEach(([p, list]) => {
      const last = list.sort((a, b) => byDate(a.m, b.m)).slice(-Math.max(1, P.earlyPrevGames));
      prevAss[p] = last.reduce((t, e) => t + e.d, 0) / (last.length + P.shrinkage); // unscaled, like rating()
    });
  }
  const prevVals = Object.values(prevAss);
  const prevMean = prevVals.length ? prevVals.reduce((a, b) => a + b, 0) / prevVals.length : 0;
  const early = (p) => P.earlyFix && p in prevAss && (epGames[p] || 0) < P.earlyGames;
  const rating = (p) => (early(p) ? prevAss[p] : baseRating(p));
  const strength = (p, elo) => (early(p) ? 1000 + (400 / P.oddsScale) * P.scale * (prevAss[p] - prevMean) : elo[p]);

  walk.forEach((m) => {
    const teamA = m.teamA || [];
    const teamB = m.teamB || [];
    if (!teamA.length || !teamB.length) return;
    [...teamA, ...teamB].forEach((p) => {
      if (!(p in elo)) elo[p] = 1000;
      if (!(p in careerGames)) careerGames[p] = 0;
    });
    const avg = (t) => t.reduce((s, p) => s + elo[p], 0) / t.length;
    const eloExpA = 1 / (1 + Math.pow(10, (avg(teamB) - avg(teamA)) / 400));
    let expA = eloExpA;
    let oddsFrom = "elo";
    if (P.earlyFix && scoring.has(m) && [...teamA, ...teamB].some(early)) {
      const avgS = (t) => t.reduce((s, p) => s + strength(p, elo), 0) / t.length;
      expA = 1 / (1 + Math.pow(10, (avgS(teamB) - avgS(teamA)) / 400));
      oddsFrom = "early";
    }
    if (
      P.odds === "ass" &&
      scoring.has(m) &&
      [...teamA, ...teamB].every((p) => careerGames[p] >= P.maturity)
    ) {
      const teamAss = (t) => t.reduce((s, p) => s + P.scale * rating(p), 0) / t.length;
      expA = 1 / (1 + Math.pow(10, -(teamAss(teamA) - teamAss(teamB)) / P.oddsScale));
      oddsFrom = "ass";
    }
    const aWon = m.scoreA > m.scoreB;

    if (scoring.has(m)) {
      const winScore = Math.max(m.scoreA, m.scoreB, 1);
      const normMargin = Math.min(1, Math.abs(m.scoreA - m.scoreB) / winScore);
      const shutout = Math.min(m.scoreA, m.scoreB) === 0 ? P.shutout : 1;
      const winQ = (1 - P.marginW / 2 + P.marginW * normMargin) * shutout;
      const lossQ = (1 + P.marginW / 2 - P.marginW * normMargin) / shutout;
      const breakdown = {};
      const award = (p, teamP, won) => {
        const games = careerGames[p];
        const mat = P.maturity > 0 ? Math.min(1, games / P.maturity) : 1;
        const vet = games >= P.maturity;
        let raw;
        if (won) {
          raw =
            P.winMode === "classic"
              ? Math.round(P.winBase * (0.5 + (1 - teamP)) * winQ)
              : Math.round(P.winBase * (1 + P.oppW * (0.5 - teamP)) * winQ);
        } else if (P.lossMode === "classic") {
          raw = Math.round(P.lossBase * (1 - teamP) * lossQ - P.penalty * teamP * mat);
        } else if (P.lossMode === "ramp") {
          raw = Math.round(
            P.lossBase * (1 - teamP) * lossQ * (1 - mat) - P.vetLoss * teamP * (2 - lossQ) * mat,
          );
        } else if (!vet) {
          raw = Math.round(P.lossBase * (1 - teamP) * lossQ);
        } else {
          raw = Math.round(-P.vetLoss * teamP * (2 - lossQ));
        }
        // The same shape as the live engine's breakdown (oppF / qualityF), so
        // the match overlay can explain a lab-scored newcomer match too.
        const oppF = won ? (P.winMode === "classic" ? 0.5 + (1 - teamP) : 1 + P.oppW * (0.5 - teamP)) : null;
        const qualityF = won ? winQ : vet ? 2 - lossQ : lossQ;
        breakdown[p] = { won, careerGames: games, vet, teamP, oppF, qualityF, raw, shift: 0 };
        return raw;
      };
      const playerDeltas = {};
      teamA.forEach((p) => (playerDeltas[p] = award(p, expA, aWon)));
      teamB.forEach((p) => (playerDeltas[p] = award(p, 1 - expA, !aWon)));

      if (P.splitMax > 0)
        [teamA, teamB].forEach((team) => {
          if (team.length !== 2) return;
          const [x, y] = team;
          const gap = Math.abs(rating(x) - rating(y));
          const f = Math.min(P.splitMax, (gap / P.splitGapScale) * P.splitMax);
          const shift = Math.round(f * Math.abs((playerDeltas[x] + playerDeltas[y]) / 2));
          if (!shift) return;
          const [weak, strong] = rating(x) < rating(y) ? [x, y] : [y, x];
          playerDeltas[weak] += shift;
          playerDeltas[strong] -= shift;
          breakdown[weak].shift = shift;
          breakdown[strong].shift = -shift;
        });

      const sum = (t) => t.reduce((acc, p) => acc + playerDeltas[p], 0);
      [...teamA, ...teamB].forEach((p) => {
        epTot[p] = (epTot[p] || 0) + playerDeltas[p];
        epGames[p] = (epGames[p] || 0) + 1;
      });
      map.set(m, {
        dA: Math.round(sum(teamA) / teamA.length),
        dB: Math.round(sum(teamB) / teamB.length),
        playerDeltas,
        expA,
        oddsFrom,
        breakdown,
      });
    }

    const learn = P.expectation === "career" || scoring.has(m);
    const dA = learn ? Math.round(32 * ((aWon ? 1 : 0) - eloExpA)) : 0;
    const dB = learn ? Math.round(32 * ((aWon ? 0 : 1) - (1 - eloExpA))) : 0;
    teamA.forEach((p) => {
      elo[p] += dA;
      careerGames[p]++;
    });
    teamB.forEach((p) => {
      elo[p] += dB;
      careerGames[p]++;
    });
  });
  return map;
}

// { name: { ep, games, score } } from a deltas map.
export function labEPFull(deltas, params = {}) {
  const P = { ...LAB_EP_DEFAULTS, ...params };
  const shrink = P.rankShrinkage ?? P.shrinkage;
  const ep = {};
  const games = {};
  deltas.forEach(({ playerDeltas }) =>
    Object.entries(playerDeltas).forEach(([p, d]) => {
      ep[p] = (ep[p] || 0) + d;
      games[p] = (games[p] || 0) + 1;
    }),
  );
  const out = {};
  Object.keys(ep).forEach((p) => {
    out[p] = { ep: ep[p], games: games[p], score: (P.scale * ep[p]) / (games[p] + shrink) };
  });
  return out;
}

// Form ASS: live ASS points, each match priced inside its own season
// (`seasonKey`), but the board weights every match by how recent it is —
// its weight halves every `half` days, counted back from the latest match in
// `matches` — and previous seasons still count. Score = 2 × Σ(weight × points)
// ÷ (Σ weight + k). `ep` is the weighted points total.
// `engine`: "ass" — each season scored by the ASS engine with `assParams`;
// "gap" — by the team-gap rule with `gapParams` (its newcomer matches by ASS
// with `assParams`).
export function labFormDeltas(matches, career = null, { seasonKey = () => "", engine = "ass", assParams = {}, gapParams = {} } = {}) {
  if (engine === "gap")
    return labMatchupDeltas(matches, career || matches, {
      seasonGames: 0,
      gapRule: true,
      ...gapParams,
      seasonKey,
      liveParams: { ...assParams },
    });
  const groups = new Map();
  (matches || []).forEach((m) => {
    const k = seasonKey(m);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(m);
  });
  const out = new Map();
  groups.forEach((ms) => labEPDeltas(ms, career || matches, { ...assParams, seasonKey }).forEach((e, m) => out.set(m, e)));
  return out;
}
export function labFormFull(deltas, { half = 45, k = 10 } = {}) {
  let last = "";
  deltas.forEach((_, m) => {
    if ((m.date || "") > last) last = m.date || "";
  });
  const lastT = last ? Date.parse(last) : 0;
  const num = {};
  const den = {};
  const games = {};
  deltas.forEach(({ playerDeltas }, m) => {
    const age = Math.max(0, (lastT - Date.parse(m.date || last)) / 864e5);
    const w = half > 0 ? Math.pow(0.5, age / half) : 1;
    Object.entries(playerDeltas).forEach(([p, d]) => {
      num[p] = (num[p] || 0) + w * d;
      den[p] = (den[p] || 0) + w;
      games[p] = (games[p] || 0) + 1;
    });
  });
  const out = {};
  Object.keys(num).forEach((p) => {
    out[p] = { ep: Math.round(num[p]), games: games[p], score: (2 * num[p]) / (den[p] + k) };
  });
  return out;
}

// Plain win %: { name: { ep: wins, games, score: win% } }.
export function labWinPct(matches) {
  const out = {};
  (matches || []).forEach((m) => {
    const aWon = m.scoreA > m.scoreB;
    [[m.teamA || [], aWon], [m.teamB || [], !aWon]].forEach(([t, won]) =>
      t.forEach((p) => {
        const r = (out[p] ||= { ep: 0, games: 0, score: 0 });
        r.games++;
        if (won) r.ep++;
      }),
    );
  });
  Object.values(out).forEach((r) => (r.score = (100 * r.ep) / r.games));
  return out;
}

// ── FAIR MATCHUP POINTS ────────────────────────────────────
// Rewards winning from a fair or an underdog draw more than winning from a
// stacked one. If anyone in the match has fewer than `maturity` career games,
// their ASS isn't trusted yet, so the whole match is scored exactly as live
// ASS scores it. Otherwise the four are ranked by their ASS just before the
// match: a player's ASS over ALL history until they've played `seasonGames`
// games in that match's season, then their ASS for that season (the main
// option uses 0, i.e. always the season's ASS):
//   balanced (1+4 vs 2+3)  win 100 → 120   loss 0 → −20
//   stronger team          win  50 →  70   loss −30 → −40
//   weaker team            win 120 → 140   loss 0 → −20
// where the arrow runs from the closest result (4-3, 6-5) to a whitewash
// (4-0, 6-0): g = (winner − loser − 1) ÷ (winner − 1). Both partners get the
// same points. The board is 2 × points ÷ (games + 10), like ASS.
export const MATCHUP_POINTS = {
  balanced: { win: 100, winUp: 20, loss: 0, lossUp: 20 },
  stronger: { win: 50, winUp: 20, loss: 30, lossUp: 10 },
  weaker: { win: 120, winUp: 20, loss: 0, lossUp: 20 },
};
export function matchupMargin(m) {
  const w = Math.max(Number(m.scoreA), Number(m.scoreB));
  const l = Math.min(Number(m.scoreA), Number(m.scoreB));
  return w > 1 ? Math.max(0, Math.min(1, (w - l - 1) / (w - 1))) : 1;
}
// winScale / lossScale stretch every win / loss number in the table by the
// same factor (the Custom option's sliders), keeping their proportions.
export function matchupPoints(role, won, g, winScale = 1, lossScale = 1) {
  const c = MATCHUP_POINTS[role];
  return Math.round(won ? (c.win + c.winUp * g) * winScale : -(c.loss + c.lossUp * g) * lossScale);
}
// The defaults the Custom sliders scale from: a balanced 4-3 win, and the
// biggest balanced / weaker-team loss.
export const MATCHUP_WIN_REF = 100;
export const MATCHUP_LOSS_REF = 20;
// Partner split: the team's points are shared unevenly by the partners' ASS
// gap — the weaker partner gets more of a win, the stronger partner takes more
// of a loss. Share shift = splitCap% × min(1, gap ÷ MATCHUP_SPLIT_FULL_GAP), so
// at the default 10% cap: 0.5% per ASS point, full 10% from a 20-point gap.
export const MATCHUP_SPLIT_CAP = 10;
export const MATCHUP_SPLIT_FULL_GAP = 20;

// Map(match -> { playerDeltas, matchup }) for `matches`. `matchup` holds what
// the match was judged on: kind ("newcomer" | "balanced" | "mismatch"), each
// side's role, every player's all-history ASS and career games before it, the
// newcomers, and the margin g. Newcomer matches also carry live ASS's own
// breakdown/expA.
// `winBase` / `lossMax` (default 100 / 20) scale the whole table
// proportionally; newcomer matches then use live ASS with the win base and
// veteran loss scaled the same way (win 100 → winBase, loss 25 → 25 × lossMax / 20).
export function labMatchupDeltas(
  matches,
  career = null,
  {
    maturity = 50,
    seasonGames = 50,
    seasonKey = () => "",
    winBase = MATCHUP_WIN_REF,
    lossMax = MATCHUP_LOSS_REF,
    splitCap = MATCHUP_SPLIT_CAP,
    // Gap rule (the "Fair ASS · gap rule" option): the teams' combined-ASS
    // gap alone decides — balanced up to gapBalanced, fully stacked from
    // gapFull, graded in between. Off: any split other than best + worst vs
    // the middle two is fully stacked.
    gapRule = false,
    gapBalanced = 15,
    gapFull = 30,
    // Early-season fix: until a player has earlyGames games this season, read
    // their ASS over their last earlyPrevGames games before the season (points
    // as scored in those seasons), instead of this season's near-zero ASS.
    // A player with no earlier games keeps this season's.
    earlyCareer = false,
    earlyGames = 10,
    earlyPrevGames = 50,
    // Extra options for the live ASS engine that scores newcomer matches
    // (partner split, newcomer line, its own early-season fix).
    liveParams = {},
    // Season 3: the ASS engine for newcomer matches follows this option's own
    // partner split, veteran line and early-season fix (one set of sliders).
    liveFollows = false,
    // Gap rule only: a win's 4–3 points at a balanced gap, halfway, and fully
    // stacked ({ bal, strongMid, weakMid, strongFull, weakFull }); in between
    // they slide straight from one to the next. A 4–0 still adds +20.
    winPoints = null,
    // With winPoints: the extra a 4–0 win adds (a 4–2 a third of it, …).
    winUp = MATCHUP_POINTS.balanced.winUp,
    // Gap rule only: a loss's 4–3 points (as positive numbers) at a balanced
    // gap, halfway and fully stacked ({ bal, strongMid, strongFull, weakMid,
    // weakFull }); a heavier loss adds the usual margin extra on top.
    lossPoints = null,
  } = {},
) {
  if (liveFollows)
    liveParams = {
      splitMax: Math.max(0, splitCap) / 100,
      maturity,
      earlyFix: !!earlyCareer,
      earlyGames,
      earlyPrevGames,
      ...liveParams,
    };
  const winScale = winBase / MATCHUP_WIN_REF;
  const lossScale = lossMax / MATCHUP_LOSS_REF;
  const walk = [...new Set([...(career || []), ...(matches || [])])].sort(byDate);
  // All-history ASS before each match: the live engine over the whole walk.
  const histDeltas = labEPDeltas(walk, walk);
  // Season ASS before each match: the live engine over that match's season.
  const bySeason = new Map();
  walk.forEach((m) => {
    const k = seasonKey(m);
    if (!bySeason.has(k)) bySeason.set(k, []);
    bySeason.get(k).push(m);
  });
  const seasonDeltas = new Map();
  bySeason.forEach((ms) => labEPDeltas(ms, walk).forEach((e, m) => seasonDeltas.set(m, e)));
  // Newcomer matches: live ASS, with the same veteran line as the matchup rule.
  const live = labEPDeltas(matches, career, {
    ...(winScale === 1 && lossScale === 1
      ? {}
      : { winBase: LAB_EP_DEFAULTS.winBase * winScale, vetLoss: LAB_EP_DEFAULTS.vetLoss * lossScale }),
    ...(maturity !== LAB_EP_DEFAULTS.maturity ? { maturity } : {}),
    ...(Object.keys(liveParams).length ? { seasonKey, ...liveParams } : {}),
  });
  const tot = {};
  const games = {};
  const recent = {}; // player -> [{ k, d }] season-scored points, in order
  const prevCache = new Map();
  // ASS over p's last earlyPrevGames games before season k (null: none).
  const prevAss = (p, k) => {
    const key = `${k}|${p}`;
    if (!prevCache.has(key)) {
      const before = (recent[p] || []).filter((e) => e.k !== k).slice(-Math.max(1, earlyPrevGames));
      prevCache.set(
        key,
        before.length
          ? (LAB_EP_DEFAULTS.scale * before.reduce((t, e) => t + e.d, 0)) / (before.length + LAB_EP_DEFAULTS.shrinkage)
          : null,
      );
    }
    return prevCache.get(key);
  };
  const sTot = {}; // season key -> { player: points }
  const sGames = {};
  const careerGames = {};
  const scoring = new Set(matches || []);
  const out = new Map();
  walk.forEach((m) => {
    const teamA = m.teamA || [];
    const teamB = m.teamB || [];
    const four = [...teamA, ...teamB];
    const k = seasonKey(m);
    const st = (sTot[k] ||= {});
    const sg = (sGames[k] ||= {});
    const score = (t, n) => (LAB_EP_DEFAULTS.scale * (t || 0)) / ((n || 0) + LAB_EP_DEFAULTS.shrinkage);
    const ass = {};
    const assFrom = {}; // "season", "history" (all-history) or "previous" (early-season fix)
    const cg = {};
    const sgBefore = {};
    // One player's reading: the early-season fix first, then season / history.
    const readAss = (p) => {
      const n = sg[p] || 0;
      if (earlyCareer && n < earlyGames) {
        const prev = prevAss(p, k);
        if (prev !== null) return [prev, "previous"];
        return [score(st[p], sg[p]), "season"];
      }
      return n >= seasonGames ? [score(st[p], sg[p]), "season"] : [score(tot[p], games[p]), "history"];
    };
    four.forEach((p) => {
      sgBefore[p] = sg[p] || 0;
      [ass[p], assFrom[p]] = readAss(p);
      cg[p] = careerGames[p] || 0;
    });
    if (scoring.has(m) && teamA.length && teamB.length) {
      const aWon = Number(m.scoreA) > Number(m.scoreB);
      const g = matchupMargin(m);
      const newcomers = four.filter((p) => cg[p] < maturity);
      const info = { ass, assFrom, seasonGames: sgBefore, careerGames: cg, newcomers, g, kind: "", roleA: "", roleB: "" };
      if (newcomers.length || teamA.length !== 2 || teamB.length !== 2) {
        const e = live.get(m);
        info.kind = "newcomer";
        out.set(m, { ...e, matchup: info });
      } else {
        const order = [...four].sort((x, y) => ass[y] - ass[x] || x.localeCompare(y));
        const sA = ass[teamA[0]] + ass[teamA[1]];
        const sB = ass[teamB[0]] + ass[teamB[1]];
        const ideal = Math.abs(ass[order[0]] + ass[order[3]] - ass[order[1]] - ass[order[2]]);
        const teamGap = Math.abs(sA - sB);
        // How stacked the split is, 0 (balanced) … 1 (fully stacked).
        let stack;
        let aStronger = sA > sB;
        if (!gapRule) stack = teamGap <= ideal + 1e-9 ? 0 : 1;
        else {
          stack =
            gapFull <= gapBalanced
              ? teamGap > gapBalanced ? 1 : 0
              : Math.max(0, Math.min(1, (teamGap - gapBalanced) / (gapFull - gapBalanced)));
        }
        const balanced = stack === 0;
        info.kind = balanced ? "balanced" : "mismatch";
        info.gap = teamGap;
        info.stack = stack;
        info.rank = Object.fromEntries(order.map((p, i) => [p, i + 1]));
        info.roleA = balanced ? "balanced" : aStronger ? "stronger" : "weaker";
        info.roleB = balanced ? "balanced" : aStronger ? "weaker" : "stronger";
        const playerDeltas = {};
        info.split = {}; // per player: the share shift applied (+ = got more / lost less)
        [
          [teamA, info.roleA, aWon],
          [teamB, info.roleB, !aWon],
        ].forEach(([team, role, won]) => {
          // Partly stacked: in between the balanced and the stacked numbers.
          const pts = (r) => (won ? MATCHUP_POINTS[r].win + MATCHUP_POINTS[r].winUp * g : -(MATCHUP_POINTS[r].loss + MATCHUP_POINTS[r].lossUp * g));
          let mixed = role === "balanced" ? pts("balanced") : pts("balanced") + stack * (pts(role) - pts("balanced"));
          if (won && winPoints && gapRule) {
            const lerp = (a, b, t) => a + (b - a) * t;
            const W = winPoints;
            const midV = role === "stronger" ? W.strongMid : W.weakMid;
            const fullV = role === "stronger" ? W.strongFull : W.weakFull;
            const at43 = role === "balanced" ? W.bal : stack <= 0.5 ? lerp(W.bal, midV, stack / 0.5) : lerp(midV, fullV, (stack - 0.5) / 0.5);
            mixed = at43 + winUp * g;
          }
          if (!won && lossPoints && gapRule) {
            const lerp = (a, b, t) => a + (b - a) * t;
            const Lp = lossPoints;
            const midV = role === "stronger" ? Lp.strongMid : Lp.weakMid;
            const fullV = role === "stronger" ? Lp.strongFull : Lp.weakFull;
            const at43 = role === "balanced" ? Lp.bal : stack <= 0.5 ? lerp(Lp.bal, midV, stack / 0.5) : lerp(midV, fullV, (stack - 0.5) / 0.5);
            const up = role === "balanced" ? MATCHUP_POINTS.balanced.lossUp : lerp(MATCHUP_POINTS.balanced.lossUp, MATCHUP_POINTS[role].lossUp, stack);
            mixed = -(at43 + up * g);
          }
          const raw = mixed * (won ? winScale : lossScale);
          const [x, y] = team;
          const gap = Math.abs(ass[x] - ass[y]);
          const sh = (Math.max(0, splitCap) / 100) * Math.min(1, gap / MATCHUP_SPLIT_FULL_GAP);
          const weak = ass[x] < ass[y] ? x : y;
          team.forEach((p) => {
            // weaker partner: more of a win, less of a loss; stronger: the reverse
            const f = p === weak ? (raw >= 0 ? 1 + sh : 1 - sh) : raw >= 0 ? 1 - sh : 1 + sh;
            playerDeltas[p] = Math.round(raw * f) || 0;
            info.split[p] = raw === 0 || !sh ? 0 : p === weak ? sh : -sh;
          });
        });
        const avg = (t) => Math.round(t.reduce((x, p) => x + playerDeltas[p], 0) / t.length);
        out.set(m, { playerDeltas, dA: avg(teamA), dB: avg(teamB), matchup: info });
      }
    }
    const h = histDeltas.get(m);
    const sd = seasonDeltas.get(m);
    four.forEach((p) => {
      careerGames[p] = (careerGames[p] || 0) + 1;
      if (sd) {
        st[p] = (st[p] || 0) + sd.playerDeltas[p];
        sg[p] = (sg[p] || 0) + 1;
        (recent[p] ||= []).push({ k, d: sd.playerDeltas[p] });
      }
      if (h) {
        tot[p] = (tot[p] || 0) + h.playerDeltas[p];
        games[p] = (games[p] || 0) + 1;
      }
    });
  });
  return out;
}

// Grace marks: `pts` extra points for `player` in every match they played,
// on top of an existing per-match map. Returns a new map; each touched entry
// records { grace: { player, pts } } so the match detail can say so.
export function labAddGrace(deltas, player, pts) {
  const out = new Map();
  deltas.forEach((e, m) => {
    if (!player || !pts || !(player in (e.playerDeltas || {}))) {
      out.set(m, e);
      return;
    }
    const playerDeltas = { ...e.playerDeltas, [player]: e.playerDeltas[player] + pts };
    out.set(m, { ...e, playerDeltas, grace: { player, pts } });
  });
  return out;
}

// What the Statistics page offers. `kind`:
//   "ep"      — labEPDeltas with `params`
//   "matchup" — labMatchupDeltas with `params`
// (labEPDeltas also supports other variants — veteran loss, maturity ramp,
// all-history strength, ASS-based odds, the 2 Oct / first versions — through
// its parameters; the tests exercise them.)
export const LAB_OPTIONS = [
  {
    id: "live",
    label: "ASS (live)",
    kind: "ep",
    params: {},
    sliders: ["assSplit", "assMaturity", "assEarly", "assEarlyGames", "assEarlyPrev"],
    desc: "Exactly what the Summary tab shows today (with the sliders at their defaults — move them to see the board with a different partner split, newcomer line or the early-season fix; ▲▼ then compare against the real board). Early-season fix (off by default): the hidden rating that decides who's favoured starts everyone level each season, so the first days are judged near 50–50 — when on, a player's ASS over their last games before the season (default 25) decides their strength and their partner split until they've played the chosen number of games this season (default 10). A win pays about 100: up to 20% more for beating a stronger side, less for a weaker one, and more for a bigger margin (a shutout earns a little extra). Until a player's 50th career game a loss still pays a small credit; after that a loss costs up to 25 — more when their team was the favourite. Who was favoured is judged only on the matches in this view. Partners' points are nudged (up to 12%) toward the lower-rated partner. Score = 2 × points ÷ (games + 10), so a handful of games can't top the board.",
  },
  {
    id: "custom",
    label: "Custom Fair Matchup (sliders)",
    kind: "matchup",
    params: { seasonGames: 0 },
    custom: true,
    sliders: ["winBase", "lossMax", "splitCap"],
    desc: "Fair Matchup Points with your own numbers. The first two sliders set a balanced win and the biggest balanced loss; every other number in the table — stacked and underdog wins and losses, and the live-ASS scoring of newcomer matches — moves in proportion. The third sets the partner split: how much more of a win the weaker partner gets (and of a loss the stronger partner takes), reached at a 20-point ASS gap between partners.",
  },
  {
    id: "gaprule",
    label: "Fair ASS · gap rule",
    kind: "matchup",
    params: { seasonGames: 0, gapRule: true },
    sliders: ["gapBalanced", "gapFull", "splitCap", "maturity", "earlyCareer", "earlyGames", "earlyPrevGames"],
    desc: "Fair ASS, but a split only counts as stacked when the teams were really uneven: the gap between the two teams' combined ASS decides. Up to the first slider (default 15) it's balanced — in our matches the higher-ASS team wins only about half of those. From the second (default 30) it's fully stacked (stronger team wins 50–70 and loses 30–40, weaker team wins 120–140 and loses 0–20) — past about 30 the stronger team wins about 7 in 10 and that doesn't climb further. In between the points slide gradually from balanced to stacked. Partner split (slider, default 5%): the weaker partner gets that much more of a win and the stronger partner takes that much more of a loss, reached at a 20-point ASS gap between partners. Veteran from career game (slider, default 10): a match with anyone below it is a newcomer match, scored as ASS — where a newcomer's loss pays a small credit and only veterans' losses cost. Early-season fix (on/off, on by default — as FAIR ASS GAP on the Summary tab): at the start of a season everyone's ASS is near 0, so gaps mean little — when on, a player's ASS over their last games before this season (normally the end of last season — how many: the last slider, default 25) decides the team gap until they have played the chosen number of games this season (default 10), then this season's ASS. A player with no earlier games uses this season's. Newcomer rule and score are as Fair ASS.",
  },
  {
    id: "grace",
    label: "Grace Marks",
    kind: "grace",
    params: {},
    sliders: ["graceMarks"],
    desc: "The leaderboard on the Summary tab's scoring (ASS, FAIR ASS or FAIR ASS GAP) — then pick a player and give them extra points in every match they played in this view, and see where that would put them. ▲▼ show places gained or lost against the same board without the grace marks.",
  },
  {
    id: "pre1oct",
    label: "ASS before 1 Oct",
    kind: "ep",
    params: {
      winMode: "classic",
      lossMode: "classic",
      lossBase: 40,
      penalty: 60,
      splitMax: 0,
      expectation: "career",
      scale: 2,
    },
    desc: "ASS exactly as the app scored it up to 1 October (the engine was unchanged from 21 Sep to 11 Oct). A win pays 50–150 depending on how big an underdog the team was — bigger upsets pay much more — times the margin. A loss pays a 'turned up' credit of up to 40 minus a penalty of up to 60 that grows over a player's first 50 career games, so veterans lose up to about 60 for a loss as heavy favourites. Who's favoured is learned from all history, both partners always get the same points, and score = 2 × points ÷ (games + 10).",
  },
  {
    id: "form",
    label: "Next Season",
    kind: "form",
    params: {},
    sliders: [
      "formHalf",
      "formK",
      "formAll",
      "fSplit",
      "fMaturity",
      "fEarly",
      "fEarlyGames",
      "fEarlyPrev",
      "fGap",
      "fWin",
      "fOpp",
      "fMargin",
      "fShutout",
      "fVetLoss",
      "fNewCredit",
      "fGapBal",
      "fGapFull",
      "fWinBal",
      "fWinStrongMid",
      "fWinWeakMid",
      "fWinStrongFull",
      "fWinWeakFull",
      "fWinUp",
      "fLossBal",
      "fLossStrongMid",
      "fLossStrongFull",
      "fLossWeakFull",
    ],
    desc: "Next Season — ASS that follows current form (the Summary tab's NEXT SEASON scoring uses these defaults). Every match keeps the points it earned in its own season, but recent matches count more: a match's weight halves every N days (first slider, default 45), counted back from the latest match shown — a 45-day-old match counts half, a 90-day-old one a quarter (0 = no fading). With 'Previous seasons count' on (default) last season's matches still count at their faded weight. Score = 2 × weighted points ÷ (weighted games + the cushion, default 10). Shared settings apply to both kinds of points: the partner split (default 20%), who counts as a beginner (until career game 50) and the early-season fix (off). Then pick the points: by default every win pays about the same as ASS (about 100, up to 30% more for beating a stronger side; no extra for the margin; a loss up to −15; a beginner's loss a small credit) — or switch on 'Stacked wins pay less', which judges veterans' matches by the gap between the teams' combined ASS: balanced / halfway / fully stacked win and loss points each get a slider (a stacked win can pay 50 and a stacked loss cost more), and the shared settings move to 5% / game 10 / fix on unless you changed them. Only the sliders for the chosen points are shown. These defaults were tuned so the top of the table isn't stretched out (Vinit about 5 clear, Ankit / Rahul M / Parthiv within about 5) while matching how the group ranks its players (95% of player pairs in the same order).",
  },
];

// The Custom option's sliders: what they set, their range and starting value.
export const LAB_SLIDERS = [
  { key: "winBase", label: "Win points (balanced 4–3)", min: 20, max: 200, step: 5, def: MATCHUP_WIN_REF },
  { key: "lossMax", label: "Loss points (balanced 4–0)", min: 0, max: 100, step: 1, def: MATCHUP_LOSS_REF },
  { key: "splitCap", label: "Partner split (max %)", min: 0, max: 30, step: 1, def: 5 },
  { key: "gapBalanced", label: "Balanced up to team gap", min: 0, max: 40, step: 1, def: 15 },
  { key: "gapFull", label: "Fully stacked from team gap", min: 0, max: 60, step: 1, def: 30 },
  { key: "maturity", label: "Veteran from career game", min: 0, max: 50, step: 1, def: 10 },
  // ASS (live)'s own sliders; `param` is the engine option each sets (times
  // `paramScale`, when the engine takes a fraction).
  { key: "assSplit", live: true, param: "splitMax", paramScale: 0.01, label: "Partner split (max %)", min: 0, max: 30, step: 1, def: 12 },
  { key: "assEarly", live: true, param: "earlyFix", label: "Early-season fix", toggle: true, min: 0, max: 1, step: 1, def: 0 },
  { key: "assEarlyGames", live: true, param: "earlyGames", label: "Previous-season ASS until season game", min: 0, max: 30, step: 1, def: 10 },
  { key: "assEarlyPrev", live: true, param: "earlyPrevGames", label: "Previous-season games used", min: 10, max: 100, step: 5, def: 25 },
  { key: "assMaturity", live: true, param: "maturity", label: "Veteran from career game", min: 0, max: 50, step: 1, def: 50 },
  { key: "earlyCareer", label: "Early-season fix", toggle: true, min: 0, max: 1, step: 1, def: 1 },
  { key: "earlyGames", label: "Previous-season ASS until season game", min: 0, max: 30, step: 1, def: 10 },
  { key: "earlyPrevGames", label: "Previous-season games used", min: 10, max: 100, step: 5, def: 25 },
  // ── Form ASS (its own sliders; `group` heads them in the Lab, `fp` says
  // where each value goes: form.* / ass.* / gap.* / win.* / loss.*, times
  // `paramScale`, plus `paramAdd`).
  { key: "formHalf", group: "Form", fp: "form.half", label: "Weight halves every (days)", min: 0, max: 120, step: 1, def: 45 },
  { key: "formK", group: "Form", fp: "form.k", label: "Small-sample cushion (games)", min: 0, max: 30, step: 1, def: 10 },
  { key: "formAll", group: "Form", fp: "form.all", label: "Previous seasons count", toggle: true, min: 0, max: 1, step: 1, def: 1 },
  // Shared by both kinds of points (fpGap: where the value goes in team-gap
  // mode; defGap: its default there — the slider moves to it when the points
  // switch flips, unless it was changed).
  { key: "fSplit", group: "Shared · both kinds of points", fp: "ass.splitMax", paramScale: 0.01, fpGap: "gap.splitCap", defGap: 5, label: "Partner split (max %)", min: 0, max: 30, step: 1, def: 20 },
  { key: "fMaturity", group: "Shared · both kinds of points", fp: "ass.maturity", fpGap: "gap.maturity", defGap: 10, label: "Beginners until career game", min: 0, max: 100, step: 1, def: 50 },
  { key: "fEarly", group: "Shared · both kinds of points", fp: "ass.earlyFix", fpGap: "gap.earlyCareer", defGap: 1, label: "Early-season fix", toggle: true, min: 0, max: 1, step: 1, def: 0 },
  { key: "fEarlyGames", group: "Shared · both kinds of points", fp: "ass.earlyGames", fpGap: "gap.earlyGames", showIf: { key: "fEarly", is: 1 }, label: "Previous-season ASS until season game", min: 0, max: 30, step: 1, def: 10 },
  { key: "fEarlyPrev", group: "Shared · both kinds of points", fp: "ass.earlyPrevGames", fpGap: "gap.earlyPrevGames", showIf: { key: "fEarly", is: 1 }, label: "Previous-season games used", min: 10, max: 100, step: 5, def: 25 },
  // The either/or: every win about the same (ASS) vs stacked wins pay less.
  { key: "fGap", group: "Points per match", fp: "form.gap", label: "Stacked wins pay less (team-gap points)", toggle: true, min: 0, max: 1, step: 1, def: 0 },
  { key: "fWin", group: "Points per match", showIf: { key: "fGap", is: 0 }, fp: "ass.winBase", label: "Win points (a neutral win)", min: 20, max: 200, step: 5, def: 100 },
  { key: "fOpp", group: "Points per match", showIf: { key: "fGap", is: 0 }, fp: "ass.oppW", paramScale: 0.02, label: "Beating a stronger side: up to +% (and − vs weaker)", min: 0, max: 50, step: 1, def: 30 },
  { key: "fMargin", group: "Points per match", showIf: { key: "fGap", is: 0 }, fp: "ass.marginW", paramScale: 0.01, label: "Margin effect: a 4–0 pays +½ this % over a 4–2", min: 0, max: 80, step: 5, def: 0 },
  { key: "fShutout", group: "Points per match", showIf: { key: "fGap", is: 0 }, fp: "ass.shutout", paramScale: 0.01, paramAdd: 1, label: "Shutout bonus (%)", min: 0, max: 20, step: 1, def: 5 },
  { key: "fVetLoss", group: "Points per match", showIf: { key: "fGap", is: 0 }, fp: "ass.vetLoss", label: "Loss: up to (more when favoured)", min: 0, max: 60, step: 1, def: 15 },
  { key: "fNewCredit", group: "Points per match", showIf: { key: "fGap", is: 0 }, fp: "ass.lossBase", label: "Beginner's loss credit: up to", min: 0, max: 30, step: 1, def: 10 },
  { key: "fGapBal", group: "Points per match", showIf: { key: "fGap", is: 1 }, fp: "gap.gapBalanced", label: "Balanced up to team gap", min: 0, max: 40, step: 1, def: 15 },
  { key: "fGapFull", group: "Points per match", showIf: { key: "fGap", is: 1 }, fp: "gap.gapFull", label: "Fully stacked from team gap", min: 0, max: 60, step: 1, def: 30 },
  { key: "fWinBal", group: "Points per match", showIf: { key: "fGap", is: 1 }, fp: "win.bal", label: "Win at a balanced gap (4–3)", min: 0, max: 200, step: 5, def: 100 },
  { key: "fWinStrongMid", group: "Points per match", showIf: { key: "fGap", is: 1 }, fp: "win.strongMid", label: "Stronger team win, halfway gap", min: 0, max: 200, step: 5, def: 75 },
  { key: "fWinWeakMid", group: "Points per match", showIf: { key: "fGap", is: 1 }, fp: "win.weakMid", label: "Weaker team win, halfway gap", min: 0, max: 200, step: 5, def: 110 },
  { key: "fWinStrongFull", group: "Points per match", showIf: { key: "fGap", is: 1 }, fp: "win.strongFull", label: "Stronger team win, fully stacked", min: 0, max: 200, step: 5, def: 50 },
  { key: "fWinWeakFull", group: "Points per match", showIf: { key: "fGap", is: 1 }, fp: "win.weakFull", label: "Weaker team win, fully stacked", min: 0, max: 200, step: 5, def: 120 },
  { key: "fWinUp", group: "Points per match", showIf: { key: "fGap", is: 1 }, fp: "gap.winUp", label: "Extra for a 4–0 win", min: 0, max: 60, step: 1, def: 20 },
  { key: "fLossBal", group: "Points per match", showIf: { key: "fGap", is: 1 }, fp: "loss.bal", label: "Loss at a balanced gap (4–3)", min: 0, max: 60, step: 1, def: 0 },
  { key: "fLossStrongMid", group: "Points per match", showIf: { key: "fGap", is: 1 }, fp: "loss.strongMid", label: "Stronger team loss, halfway gap", min: 0, max: 80, step: 1, def: 15 },
  { key: "fLossStrongFull", group: "Points per match", showIf: { key: "fGap", is: 1 }, fp: "loss.strongFull", label: "Stronger team loss, fully stacked", min: 0, max: 80, step: 1, def: 30 },
  { key: "fLossWeakFull", group: "Points per match", showIf: { key: "fGap", is: 1 }, fp: "loss.weakFull", label: "Weaker team loss, fully stacked", min: 0, max: 60, step: 1, def: 0 },
  { key: "graceMarks", label: "Grace marks per match", min: 0, max: 50, step: 1, def: 10 },
];

export const labOption = (id) => LAB_OPTIONS.find((o) => o.id === id) || LAB_OPTIONS[0];
