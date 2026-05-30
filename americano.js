// ── AMERICANO / ROUND-ROBIN SCHEDULE GENERATOR ─────────────
// Pure computation — no DOM, no Firebase, no app state.
// Produces a padel "Americano" schedule: across the rounds, players rotate so
// (as far as the maths allows) everyone partners and opposes everyone, courts
// are filled 4-to-a-match, and sit-outs are shared evenly.
//
// Algorithm: greedy round-robin. Each round we pick who plays (fewest sit-outs
// first), then form partnerships minimising repeat partners, then pair the
// partnerships into matches minimising repeat opponents. Deterministic for a
// given input so schedules are reproducible.

function _emptyCounts(players) {
  const m = {};
  players.forEach((p) => (m[p] = {}));
  return m;
}

function _formMatches(playing, partner, opponent) {
  const pc = (a, b) => partner[a][b] || 0;
  const oc = (a, b) => opponent[a][b] || 0;

  // 1. Greedily form partnerships that have played together the least.
  const remaining = [...playing];
  const pairs = [];
  while (remaining.length >= 2) {
    let bi = 0,
      bj = 1,
      best = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      for (let j = i + 1; j < remaining.length; j++) {
        const s = pc(remaining[i], remaining[j]);
        if (s < best) {
          best = s;
          bi = i;
          bj = j;
        }
      }
    }
    pairs.push([remaining[bi], remaining[bj]]);
    remaining.splice(bj, 1);
    remaining.splice(bi, 1);
  }

  // 2. Pair partnerships into matches, minimising repeat opponents.
  const rem = [...pairs];
  const matches = [];
  while (rem.length >= 2) {
    const base = rem.shift();
    let best = Infinity,
      bk = 0;
    for (let k = 0; k < rem.length; k++) {
      const o = rem[k];
      const s =
        oc(base[0], o[0]) +
        oc(base[0], o[1]) +
        oc(base[1], o[0]) +
        oc(base[1], o[1]);
      if (s < best) {
        best = s;
        bk = k;
      }
    }
    const opp = rem.splice(bk, 1)[0];
    matches.push({ teamA: base, teamB: opp });
  }
  return matches;
}

export function generateAmericano(players, numRounds, opts = {}) {
  const list = (players || []).map(String).filter(Boolean);
  const uniq = [...new Set(list)];
  const N = uniq.length;
  const rounds = Math.max(1, Math.floor(numRounds || 1));
  if (N < 4)
    throw new Error("Need at least 4 players for an Americano.");

  const courts = Math.min(
    Math.floor(N / 4),
    opts.maxCourts ? Math.max(1, opts.maxCourts) : Infinity,
  );
  const playPerRound = courts * 4;

  const partner = _emptyCounts(uniq);
  const opponent = _emptyCounts(uniq);
  const sitCount = {};
  uniq.forEach((p) => (sitCount[p] = 0));
  const playCount = {};
  uniq.forEach((p) => (playCount[p] = 0));

  const schedule = [];
  for (let r = 0; r < rounds; r++) {
    // Sit out the players who have sat out the FEWEST times so far, so sit-outs
    // even up over the session. (sitCount ascending == playCount descending, so
    // this balances play counts too.) Deterministic tie-break by original order.
    const order = uniq
      .map((p, i) => ({ p, i }))
      .sort((a, b) => sitCount[a.p] - sitCount[b.p] || a.i - b.i)
      .map((x) => x.p);

    const numSitting = N - playPerRound;
    const sitting = order.slice(0, numSitting);
    const playing = order.slice(numSitting);
    sitting.forEach((p) => (sitCount[p] += 1));
    playing.forEach((p) => (playCount[p] += 1));

    const matches = _formMatches(playing, partner, opponent);
    matches.forEach((m) => {
      const [a, b] = m.teamA;
      const [c, d] = m.teamB;
      partner[a][b] = (partner[a][b] || 0) + 1;
      partner[b][a] = (partner[b][a] || 0) + 1;
      partner[c][d] = (partner[c][d] || 0) + 1;
      partner[d][c] = (partner[d][c] || 0) + 1;
      [
        [a, c],
        [a, d],
        [b, c],
        [b, d],
      ].forEach(([x, y]) => {
        opponent[x][y] = (opponent[x][y] || 0) + 1;
        opponent[y][x] = (opponent[y][x] || 0) + 1;
      });
    });

    schedule.push({ round: r + 1, matches, sittingOut: sitting });
  }
  return schedule;
}

// Fairness summary for a generated schedule — used by tests and by the UI to
// show "everyone partnered everyone" style reassurance.
export function americanoFairness(players, schedule) {
  const uniq = [...new Set((players || []).map(String).filter(Boolean))];
  const partner = _emptyCounts(uniq);
  const opponent = _emptyCounts(uniq);
  const plays = {};
  const sits = {};
  uniq.forEach((p) => {
    plays[p] = 0;
    sits[p] = 0;
  });
  schedule.forEach((rnd) => {
    (rnd.sittingOut || []).forEach((p) => (sits[p] = (sits[p] || 0) + 1));
    rnd.matches.forEach((m) => {
      const ps = [...m.teamA, ...m.teamB];
      ps.forEach((p) => (plays[p] = (plays[p] || 0) + 1));
      const [a, b] = m.teamA;
      const [c, d] = m.teamB;
      partner[a][b] = (partner[a][b] || 0) + 1;
      partner[b][a] = (partner[b][a] || 0) + 1;
      partner[c][d] = (partner[c][d] || 0) + 1;
      partner[d][c] = (partner[d][c] || 0) + 1;
      [
        [a, c],
        [a, d],
        [b, c],
        [b, d],
      ].forEach(([x, y]) => {
        opponent[x][y] = (opponent[x][y] || 0) + 1;
        opponent[y][x] = (opponent[y][x] || 0) + 1;
      });
    });
  });
  const playVals = uniq.map((p) => plays[p]);
  const sitVals = uniq.map((p) => sits[p]);
  let maxPartnerRepeat = 0;
  uniq.forEach((a) =>
    uniq.forEach((b) => {
      if (a !== b && (partner[a][b] || 0) > maxPartnerRepeat)
        maxPartnerRepeat = partner[a][b];
    }),
  );
  return {
    minPlays: Math.min(...playVals),
    maxPlays: Math.max(...playVals),
    minSits: Math.min(...sitVals),
    maxSits: Math.max(...sitVals),
    maxPartnerRepeat,
  };
}
