// ── PAIRING ODDS ───────────────────────────────────────────
// "Who plays with the best odds?" For every doubles match, take each player's
// rating (the active scoring system's number) as it stood just BEFORE that
// match and ask whether the teams were drawn fairly:
//
//   FAIR       the split pairs the best player with the worst (the most even
//              2v2 split there is — it always has the smallest rating gap).
//   EXCEPTION  not that split, but the best and worst players had already
//              been partners earlier the same day, so the fair draw was used
//              up. Not counted against anyone.
//   UNFAIR     any other split: one side was stacked. The side with the higher
//              combined rating is the FAVOURED team, the other the UNDERDOG.
//
// Pure: no DOM, no app state. `history` is `rating.timeline(matches).history`
// (per player, one entry per match in date order, `elo` = rating after it).

const byDate = (a, b) => (a.date || "").localeCompare(b.date || "");
const EPS = 1e-6;

function blank(name) {
  return { name, mp: 0, fair: 0, exception: 0, unfair: 0, favoured: 0, underdog: 0, edgeSum: 0, wins: { favoured: 0, underdog: 0 } };
}

export function analyzePairingOdds(matches, { history = {}, def = 0 } = {}) {
  const sorted = [...(matches || [])].sort(byDate); // stable: same-day order kept
  const idx = {}; // matches seen so far per player (into history)
  const cur = {}; // rating after the player's latest match
  const partneredToday = new Map(); // date -> Set("A|B") teammates so far that day
  const players = {};
  const list = []; // classified matches, in order
  let skipped = 0;

  const ratingNow = (p) => (p in cur ? cur[p] : def);
  const advance = (p) => {
    const i = (idx[p] = (idx[p] ?? -1) + 1);
    const e = history[p]?.[i];
    if (e && typeof e.elo === "number") cur[p] = e.elo;
  };
  const pairKey = (a, b) => [a, b].sort().join("|");

  sorted.forEach((m) => {
    const a = m.teamA || [];
    const b = m.teamB || [];
    const four = [...a, ...b];
    const doubles = a.length === 2 && b.length === 2 && new Set(four).size === 4;
    // Ratings are read BEFORE this match is applied to anyone.
    const before = {};
    four.forEach((p) => (before[p] = ratingNow(p)));

    if (!doubles) {
      skipped++;
      four.forEach(advance);
      return;
    }

    const order = [...four].sort((x, y) => before[y] - before[x] || x.localeCompare(y));
    const best = order[0];
    const worst = order[3];
    const sumA = before[a[0]] + before[a[1]];
    const sumB = before[b[0]] + before[b[1]];
    const idealGap = Math.abs(before[best] + before[worst] - before[order[1]] - before[order[2]]);
    const gap = Math.abs(sumA - sumB);
    const day = m.date || "";
    const seen = partneredToday.get(day) || new Set();

    let kind;
    if (gap <= idealGap + EPS) kind = "fair";
    else if (seen.has(pairKey(best, worst))) kind = "exception";
    else kind = "unfair";

    const favouredSide = sumA === sumB ? null : sumA > sumB ? "A" : "B";
    const aWon = Number(m.scoreA) > Number(m.scoreB);
    list.push({ match: m, kind, gap, favouredSide, best, worst });

    [["A", a, sumA - sumB, aWon], ["B", b, sumB - sumA, !aWon]].forEach(([side, team, edge, won]) => {
      team.forEach((p) => {
        const r = (players[p] ||= blank(p));
        r.mp++;
        r[kind]++;
        r.edgeSum += edge;
        if (kind === "unfair" && favouredSide) {
          const role = favouredSide === side ? "favoured" : "underdog";
          r[role]++;
          if (won) r.wins[role]++;
        }
      });
    });

    seen.add(pairKey(a[0], a[1]));
    seen.add(pairKey(b[0], b[1]));
    partneredToday.set(day, seen);
    four.forEach(advance);
  });

  // Percentages are of the matches that COUNT: exceptions are left out.
  const rows = Object.values(players).map((r) => {
    const counted = r.mp - r.exception;
    const pct = (n) => (counted ? (100 * n) / counted : 0);
    return {
      ...r,
      counted,
      fairPct: pct(r.fair),
      unfairPct: pct(r.unfair),
      favPct: pct(r.favoured),
      dogPct: pct(r.underdog),
      net: r.favoured - r.underdog,
      avgEdge: r.mp ? r.edgeSum / r.mp : 0,
    };
  });
  // Best odds first: the biggest share of their counted games played on the
  // favoured side, then the most such games.
  rows.sort((x, y) => y.favPct - x.favPct || y.favoured - x.favoured || y.mp - x.mp || x.name.localeCompare(y.name));

  const totals = { matches: list.length, fair: 0, exception: 0, unfair: 0, skipped };
  list.forEach((x) => totals[x.kind]++);
  return { rows, totals, matches: list };
}
