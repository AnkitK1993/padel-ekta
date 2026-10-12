// ── PLAYER GOALS ───────────────────────────────────────────
// "Reach #4 by December": where a player stands against a target rank on the
// season leaderboard, and roughly how many wins it would take.
//
// Pure: callers pass the leaderboard (name -> score, best first) and, for the
// wins estimate, the player's running points total, games, the average points
// a win pays them, and the leaderboard's score formula (rating.scoreFor).

// board: [{ name, score }] sorted best first.
// Returns { curRank, targetScore, gap, winsNeeded, pct, reached }.
export function goalProgress({ board, name, targetRank, startRank, total = null, games = null, perWin = null, scoreFor = null }) {
  const idx = board.findIndex((r) => r.name === name);
  const curRank = idx >= 0 ? idx + 1 : board.length + 1;
  const me = idx >= 0 ? board[idx].score : null;
  const reached = curRank <= targetRank;
  // To take rank N you must beat whoever holds it now (yourself excluded).
  const others = board.filter((r) => r.name !== name);
  const holder = others[targetRank - 1] || null;
  const targetScore = holder ? holder.score : null;
  const gap = !reached && holder && me != null ? Math.max(0, targetScore - me) : 0;

  // Wins needed (others standing still): the smallest k with
  // scoreFor(total + k*perWin, games + k) > targetScore. Capped at 200.
  let winsNeeded = reached ? 0 : null;
  if (!reached && targetScore != null && scoreFor && total != null && games != null && perWin > 0) {
    for (let k = 1; k <= 200; k++) {
      if (scoreFor(total + k * perWin, games + k) > targetScore) {
        winsNeeded = k;
        break;
      }
    }
  }

  // Progress: share of the climb from where the goal was set to the target.
  const from = Math.max(startRank || curRank, targetRank);
  const pct = reached ? 100 : from === targetRank ? 0 : Math.max(0, Math.min(100, Math.round(((from - curRank) / (from - targetRank)) * 100)));
  return { curRank, targetScore, gap, winsNeeded, pct, reached };
}
