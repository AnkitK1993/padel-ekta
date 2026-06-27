// ── PADEL PERFORMANCE SCORE (PPS) ──────────────────────────
// Quality = 4 × margin + total_games  (dominance + contest volume)
// strengthMult = clamp(1 + oppBonus − 0.5 × partnerTax, 0.5, 2.0)
//   oppBonus   = (avgOppELO − myELO) / 400
//   partnerTax = (partnerELO − myELO) / 400
// Win:  ΔPP = +round(quality × mult)
// Loss: ΔPP = −round(quality / mult)
// ELO is used for the strength multiplier only; PPS is tracked separately.

export function computeMatchPPSDeltas(matches) {
  const elo = {};
  const map = new Map();

  [...matches]
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .forEach((m) => {
      const allPlayers = [...(m.teamA || []), ...(m.teamB || [])];
      allPlayers.forEach((p) => { if (!(p in elo)) elo[p] = 1000; });

      const margin  = Math.abs(m.scoreA - m.scoreB);
      const total   = m.scoreA + m.scoreB;
      const quality = 4 * margin + total;
      const aWon    = m.scoreA > m.scoreB;

      const avgEloA = m.teamA.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamA.length, 1);
      const avgEloB = m.teamB.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamB.length, 1);

      // Advance running ELO for future strength calculations.
      const expA  = 1 / (1 + Math.pow(10, (avgEloB - avgEloA) / 400));
      const eloDA = Math.round(32 * ((aWon ? 1 : 0) - expA));
      const eloDB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));

      const playerDeltas = {};
      let sumDA = 0, sumDB = 0;

      m.teamA.forEach((p) => {
        const myElo      = elo[p];
        const partner    = m.teamA.find((pp) => pp !== p);
        const partnerElo = partner ? elo[partner] : myElo;
        const mult = Math.max(0.5, Math.min(2.0,
          1 + (avgEloB - myElo) / 400 - 0.5 * (partnerElo - myElo) / 400));
        const d = aWon ? Math.round(quality * mult) : -Math.round(quality / mult);
        playerDeltas[p] = d;
        sumDA += d;
      });

      m.teamB.forEach((p) => {
        const myElo      = elo[p];
        const partner    = m.teamB.find((pp) => pp !== p);
        const partnerElo = partner ? elo[partner] : myElo;
        const mult = Math.max(0.5, Math.min(2.0,
          1 + (avgEloA - myElo) / 400 - 0.5 * (partnerElo - myElo) / 400));
        const d = !aWon ? Math.round(quality * mult) : -Math.round(quality / mult);
        playerDeltas[p] = d;
        sumDB += d;
      });

      map.set(m, {
        dA: m.teamA.length ? Math.round(sumDA / m.teamA.length) : 0,
        dB: m.teamB.length ? Math.round(sumDB / m.teamB.length) : 0,
        playerDeltas,
      });

      m.teamA.forEach((p) => { elo[p] += eloDA; });
      m.teamB.forEach((p) => { elo[p] += eloDB; });
    });

  return map;
}

export function computePPS(matches) {
  const pps = {};
  computeMatchPPSDeltas(matches).forEach(({ playerDeltas }) => {
    Object.entries(playerDeltas).forEach(([p, d]) => {
      pps[p] = (pps[p] || 0) + d;
    });
  });
  return pps;
}
