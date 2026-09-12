// ── PAIR STATISTICS ────────────────────────────────────────
// Pure pair/H2H helpers. normPlayer is injected via initPairsDeps.
// Callers must pass an explicit matches array (no activeMatches() fallback).

let _normPlayer = (n) => n;
export function initPairsDeps(deps) {
  _normPlayer = deps.normPlayer;
}

export function getPairKey(team) {
  return [...team].map(_normPlayer).sort().join(" & ");
}

export function getPairStats(matches) {
  const pairs = {};
  (matches || []).forEach((m) => {
    const aWon = Number(m.scoreA) > Number(m.scoreB);
    [
      { team: m.teamA || [], gf: Number(m.scoreA), ga: Number(m.scoreB), won: aWon },
      { team: m.teamB || [], gf: Number(m.scoreB), ga: Number(m.scoreA), won: !aWon },
    ].forEach((row) => {
      if (row.team.length < 2) return;
      const key = getPairKey(row.team);
      if (!pairs[key])
        pairs[key] = { key, players: key.split(" & "), played: 0, wins: 0, gf: 0, ga: 0 };
      pairs[key].played++;
      pairs[key].wins += row.won ? 1 : 0;
      pairs[key].gf += row.gf;
      pairs[key].ga += row.ga;
    });
  });
  return Object.values(pairs)
    .map((p) => ({
      ...p,
      losses: p.played - p.wins,
      winPct: p.played ? Math.round((p.wins / p.played) * 100) : 0,
      diff: p.gf - p.ga,
    }))
    .sort((a, b) => b.winPct - a.winPct || b.played - a.played || b.diff - a.diff);
}

export function pairInMatch(m, pairKey) {
  if (!pairKey) return true;
  return (
    getPairKey(m.teamA || []) === pairKey ||
    getPairKey(m.teamB || []) === pairKey
  );
}

export function playersOpposed(m, a, b) {
  if (!a || !b) return true;
  const na = a.toLowerCase();
  const nb = b.toLowerCase();
  const inA1 = (m.teamA || []).some((p) => _normPlayer(p).toLowerCase() === na);
  const inA2 = (m.teamA || []).some((p) => _normPlayer(p).toLowerCase() === nb);
  const inB1 = (m.teamB || []).some((p) => _normPlayer(p).toLowerCase() === na);
  const inB2 = (m.teamB || []).some((p) => _normPlayer(p).toLowerCase() === nb);
  return (inA1 && inB2) || (inB1 && inA2);
}

export function getHeadToHeadStats(a, b, matches) {
  const rows = (matches || []).filter((m) => playersOpposed(m, a, b));
  let aWins = 0, bWins = 0, diff = 0;
  rows.forEach((m) => {
    const aInTeamA = (m.teamA || []).some((p) => _normPlayer(p) === a);
    const aWon = aInTeamA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
    if (aWon) aWins++;
    else bWins++;
    diff += aInTeamA ? m.scoreA - m.scoreB : m.scoreB - m.scoreA;
  });
  return { matches: rows, aWins, bWins, diff };
}
