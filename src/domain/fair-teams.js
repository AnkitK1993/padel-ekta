// ── FAIR TEAMS ─────────────────────────────────────────────
// Given the players who turned up and a strength per player (any scale — the
// app passes the 0-10 SR band so it means the same on every scoring system),
// propose the most even 2v2 matches.
//
// Every way to pick 4 of the players, and every way to split those 4 into two
// pairs, is scored by the gap between the two pairs' average strength. With up
// to 12 players that is 495 x 3 = 1,485 candidates — instant.
//
// Pure: no DOM, no app state.

// Chance the first pair wins, from the strength gap (logistic; `scale` is the
// gap that makes a side ~91% favourites).
export function winChance(gap, scale = 2.5) {
  return 1 / (1 + Math.pow(10, -gap / scale));
}

function* combos(arr, k, start = 0, pick = []) {
  if (pick.length === k) {
    yield pick;
    return;
  }
  for (let i = start; i < arr.length; i++) yield* combos(arr, k, i + 1, [...pick, arr[i]]);
}

// players: [name]; strength: name -> number; opts.top: how many to return;
// opts.avoidPairs: Set of "A & B" pair keys to rank lower (e.g. tonight's
// repeats). Returns [{ teamA, teamB, gap, chanceA }] most even first.
export function fairMatchups(players, strength, { top = 5, avoidPairs = new Set() } = {}) {
  const uniq = [...new Set(players)].filter(Boolean);
  if (uniq.length < 4) return [];
  const s = (p) => (Number.isFinite(strength(p)) ? strength(p) : 0);
  const key = (a, b) => [a, b].sort().join(" & ");
  const out = [];
  for (const four of combos(uniq, 4)) {
    const [a, b, c, d] = four;
    // The three distinct splits of four players into two pairs.
    for (const [t1, t2] of [
      [[a, b], [c, d]],
      [[a, c], [b, d]],
      [[a, d], [b, c]],
    ]) {
      const gap = (s(t1[0]) + s(t1[1])) / 2 - (s(t2[0]) + s(t2[1])) / 2;
      const repeats = (avoidPairs.has(key(...t1)) ? 1 : 0) + (avoidPairs.has(key(...t2)) ? 1 : 0);
      // The stronger pair listed first.
      const [teamA, teamB, g] = gap >= 0 ? [t1, t2, gap] : [t2, t1, -gap];
      out.push({ teamA, teamB, gap: g, chanceA: winChance(g), repeats });
    }
  }
  out.sort((x, y) => x.repeats - y.repeats || x.gap - y.gap);
  return out.slice(0, top);
}
