// ── ANKIT SCORING SYSTEM (ASS) ─────────────────────────────
// Quality = 4 × margin + total_games  (dominance + contest volume)
// strengthMult = clamp(1 + oppBonus − 0.5 × partnerTax, 0.5, 2.0)
//   oppBonus   = (avgOppELO − myELO) / 400
//   partnerTax = (partnerELO − myELO) / 400
// Win:  Δ = +round(quality × mult)
// Loss: Δ = −round(quality / mult)
// ELO is used for the strength multiplier only; ASS is tracked separately.

export function computeMatchASSDeltas(matches, startElo = {}) {
  const elo = { ...startElo };
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

export function computeASS(matches) {
  const ass = {};
  computeMatchASSDeltas(matches).forEach(({ playerDeltas }) => {
    Object.entries(playerDeltas).forEach(([p, d]) => {
      ass[p] = (ass[p] || 0) + d;
    });
  });
  return ass;
}

// Returns { history, peaks, lows } in the same shape as computeEloTimeline so
// the analytics renderers can swap ELO ↔ ASS transparently.
// history[player] = [{ date, elo: runningASS, delta, won, opponent, scoreA, scoreB }]
// peaks[player]   = highest running ASS ever reached
// lows[player]    = lowest running ASS ever reached
export function computeASSTimeline(matches) {
  const running = {};
  const history = {};
  const peaks   = {};
  const lows    = {};
  const elo     = {}; // internal ELO walk for strength multiplier only

  [...matches]
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .forEach((m) => {
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
        if (!(p in elo))     elo[p]     = 1000;
        if (!(p in running)) { running[p] = 0; history[p] = []; peaks[p] = 0; lows[p] = 0; }
      });

      const margin  = Math.abs(m.scoreA - m.scoreB);
      const total   = m.scoreA + m.scoreB;
      const quality = 4 * margin + total;
      const aWon    = m.scoreA > m.scoreB;

      const avgEloA = m.teamA.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamA.length, 1);
      const avgEloB = m.teamB.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamB.length, 1);
      const expA    = 1 / (1 + Math.pow(10, (avgEloB - avgEloA) / 400));
      const eloDA   = Math.round(32 * ((aWon ? 1 : 0) - expA));
      const eloDB   = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));

      m.teamA.forEach((p) => {
        const myElo      = elo[p];
        const partner    = m.teamA.find((pp) => pp !== p);
        const partnerElo = partner ? elo[partner] : myElo;
        const mult = Math.max(0.5, Math.min(2.0,
          1 + (avgEloB - myElo) / 400 - 0.5 * (partnerElo - myElo) / 400));
        const d = aWon ? Math.round(quality * mult) : -Math.round(quality / mult);
        running[p] += d;
        history[p].push({ date: m.date, elo: running[p], delta: d, won: aWon,
          opponent: m.teamB.join(" & "), scoreA: m.scoreA, scoreB: m.scoreB });
        if (running[p] > peaks[p]) peaks[p] = running[p];
        if (running[p] < lows[p])  lows[p]  = running[p];
      });

      m.teamB.forEach((p) => {
        const myElo      = elo[p];
        const partner    = m.teamB.find((pp) => pp !== p);
        const partnerElo = partner ? elo[partner] : myElo;
        const mult = Math.max(0.5, Math.min(2.0,
          1 + (avgEloA - myElo) / 400 - 0.5 * (partnerElo - myElo) / 400));
        const d = !aWon ? Math.round(quality * mult) : -Math.round(quality / mult);
        running[p] += d;
        history[p].push({ date: m.date, elo: running[p], delta: d, won: !aWon,
          opponent: m.teamA.join(" & "), scoreA: m.scoreB, scoreB: m.scoreA });
        if (running[p] > peaks[p]) peaks[p] = running[p];
        if (running[p] < lows[p])  lows[p]  = running[p];
      });

      m.teamA.forEach((p) => { elo[p] += eloDA; });
      m.teamB.forEach((p) => { elo[p] += eloDB; });
    });

  return { history, peaks, lows };
}
