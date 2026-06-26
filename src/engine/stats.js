// ── STATS ENGINE ───────────────────────────────────────────
// Pure computation — no DOM, no Firebase, no app state. Mirrors the elo.js
// pattern: app.js imports these and passes all inputs as arguments.

// ── SCORE NORMALISATION (cap max side to 4) ────────────────
// Returns [normA, normB] scaled so max(A,B) = 4.
// Scores already ≤ 4 are unchanged.
export function _normScores(sA, sB) {
  const mx = Math.max(sA, sB, 1);
  if (mx <= 4) return [sA, sB];
  const f = 4 / mx;
  return [sA * f, sB * f];
}

// ── ELO → SKILL RATING (0–10 scale) ────────────────────────
export function eloToSr(elo) {
  return parseFloat(((elo - 700) / 60).toFixed(2));
}

// ── COMPUTE STATS ──────────────────────────────────────────
// Aggregates per-player stats from a list of matches. When eloMap has an entry
// for a player, their skill rating (sr) is derived from ELO; otherwise it falls
// back to a win-rate/games/activity blend.
export function computeStats(matches, eloMap = {}) {
  const P = {};
  const g = (n) => {
    if (!P[n])
      P[n] = {
        name: n,
        mp: 0,
        mw: 0,
        gw: 0,
        gl: 0,
        ngw: 0,
        results: [],
        partnerPlayed: {},
        partnerWins: {},
        oppPlayed: {},
        oppWins: {},
      };
    return P[n];
  };
  const sorted = [...matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  sorted.forEach((m) => {
    const aWon = m.scoreA > m.scoreB;
    const [_nsA, _nsB] = _normScores(m.scoreA, m.scoreB);
    m.teamA.forEach((p) => {
      const pl = g(p);
      pl.mp++;
      pl.gw += m.scoreA;
      pl.gl += m.scoreB;
      pl.ngw += _nsA;
      if (aWon) pl.mw++;
      pl.results.push({ won: aWon, margin: m.scoreA - m.scoreB });
      m.teamA.forEach((partner) => {
        if (partner !== p) {
          pl.partnerPlayed[partner] = (pl.partnerPlayed[partner] || 0) + 1;
          if (aWon)
            pl.partnerWins[partner] = (pl.partnerWins[partner] || 0) + 1;
        }
      });
      m.teamB.forEach((opp) => {
        pl.oppPlayed[opp] = (pl.oppPlayed[opp] || 0) + 1;
        if (aWon) pl.oppWins[opp] = (pl.oppWins[opp] || 0) + 1;
      });
    });
    m.teamB.forEach((p) => {
      const pl = g(p);
      pl.mp++;
      pl.gw += m.scoreB;
      pl.gl += m.scoreA;
      pl.ngw += _nsB;
      if (!aWon) pl.mw++;
      pl.results.push({ won: !aWon, margin: m.scoreB - m.scoreA });
      m.teamB.forEach((partner) => {
        if (partner !== p) {
          pl.partnerPlayed[partner] = (pl.partnerPlayed[partner] || 0) + 1;
          if (!aWon)
            pl.partnerWins[partner] = (pl.partnerWins[partner] || 0) + 1;
        }
      });
      m.teamA.forEach((opp) => {
        pl.oppPlayed[opp] = (pl.oppPlayed[opp] || 0) + 1;
        if (!aWon) pl.oppWins[opp] = (pl.oppWins[opp] || 0) + 1;
      });
    });
  });
  const rows = Object.values(P);
  const maxMP = Math.max(1, ...rows.map((p) => p.mp));
  return rows
    .map((p) => {
      const ml = p.mp - p.mw,
        total = p.gw + p.gl;
      const mwr = p.mp > 0 ? p.mw / p.mp : 0,
        gwr = total > 0 ? p.gw / total : 0,
        act = p.mp / maxMP;
      const sr =
        p.name in eloMap
          ? eloToSr(eloMap[p.name])
          : mwr * 5 + gwr * 3 + act * 2;

      // Feature 1: win streak
      let curStreak = 0,
        curType = "",
        bestWinStreak = 0,
        runW = 0;
      if (p.results.length > 0) {
        curType = p.results[p.results.length - 1].won ? "W" : "L";
        for (let i = p.results.length - 1; i >= 0; i--) {
          const r = p.results[i];
          if ((r.won && curType === "W") || (!r.won && curType === "L"))
            curStreak++;
          else break;
        }
      }
      p.results.forEach((r) => {
        if (r.won) {
          runW++;
          bestWinStreak = Math.max(bestWinStreak, runW);
        } else runW = 0;
      });

      // Feature 2: partnership stats (min 2 games together)
      const MIN_G = 2;
      let bestPartner = null,
        worstPartner = null,
        bestPPct = -1,
        worstPPct = 101;
      Object.keys(p.partnerPlayed).forEach((partner) => {
        const played = p.partnerPlayed[partner];
        if (played < MIN_G) return;
        const pct = ((p.partnerWins[partner] || 0) / played) * 100;
        if (
          pct > bestPPct ||
          (pct === bestPPct && played > (bestPartner?.played ?? 0))
        ) {
          bestPPct = pct;
          bestPartner = { name: partner, pct, played };
        }
        if (
          pct < worstPPct ||
          (pct === worstPPct && played > (worstPartner?.played ?? 0))
        ) {
          worstPPct = pct;
          worstPartner = { name: partner, pct, played };
        }
      });

      // Feature 3: nemesis / favourite opponent (min 2 games)
      let favOpp = null,
        nemesis = null,
        favOPct = -1,
        nemOPct = 101;
      Object.keys(p.oppPlayed).forEach((opp) => {
        const played = p.oppPlayed[opp];
        if (played < MIN_G) return;
        const pct = ((p.oppWins[opp] || 0) / played) * 100;
        if (pct > favOPct) {
          favOPct = pct;
          favOpp = { name: opp, pct, played };
        }
        if (pct < nemOPct) {
          nemOPct = pct;
          nemesis = { name: opp, pct, played };
        }
      });

      // Feature 4: form — last 5 W/L
      const form = p.results.slice(-5).map((r) => (r.won ? "W" : "L"));

      // Feature 5: avg score margin
      const avgMargin =
        p.results.length > 0
          ? p.results.reduce((s, r) => s + r.margin, 0) / p.results.length
          : 0;

      // Consistency: lower std dev = more consistent
      const consistency =
        p.results.length >= 3
          ? parseFloat(
              Math.sqrt(
                p.results.reduce(
                  (s, r) => s + Math.pow(r.margin - avgMargin, 2),
                  0,
                ) / p.results.length,
              ).toFixed(1),
            )
          : null;

      return {
        ...p,
        ml,
        diff: p.gw - p.gl,
        sr,
        mwr,
        gwr,
        act,
        winPct: mwr * 100,
        gamePct: gwr * 100,
        curStreak,
        curType,
        bestWinStreak,
        bestPartner,
        worstPartner,
        favOpp,
        nemesis,
        form,
        avgMargin,
        consistency,
      };
    })
    .sort((a, b) => b.sr - a.sr || b.gamePct - a.gamePct);
}
