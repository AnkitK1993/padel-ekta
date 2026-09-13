// ── FAIR SHARE RATING SYSTEM ─────────────────────────────────
// Individual, doubles-aware points. Every other system here computes a team
// result and splits it either identically between partners (ASS's baseline
// behaviour) or by generic statistical uncertainty (OpenSkill/Glicko-2's own
// per-player confidence). Fair Share splits it by something padel-specific
// instead: the SKILL GAP between the two partners.
//
// The premise: opponents target the weaker player in doubles — cross-court
// rallies get aimed at whoever's more exploitable — so the weaker partner's
// actual performance is usually the more decisive factor in the outcome, not
// the stronger one's. Fair Share therefore moves the weaker partner's rating
// MORE than the stronger partner's, in BOTH directions: more reward for an
// upset-shaped win (they held up despite being the target), and more penalty
// for a loss (they were exploited as predicted). This is a deliberate,
// symmetric design choice — the same rule applies whether the team wins or
// loses, so there's no way to game it by choosing which outcome to hope for.
//
// Mechanism (three steps):
//   1. Match quality = 4×margin + total_games — identical to ASS, unchanged.
//   2. Team-level, opponent-adjusted swing — identical shape to ASS's win/
//      loss formula (quality × multiplier for a win, quality / multiplier
//      for a loss), computed once from each team's AVERAGE rating. This is
//      "how much should this match move the team overall," fully inheriting
//      the existing opponent-strength fairness every other system has.
//   3. Intra-team load split — that team swing is divided between the two
//      partners based on their internal rating gap, via a smooth, capped
//      curve (tanh) that saturates around an ~80/20 split at large
//      mismatches and stays ~50/50 for evenly-matched partners. The split
//      ALWAYS averages back to exactly the team swing — so this step can
//      only redistribute credit within the team, never inflate or deflate
//      it. That conservation property is what makes this "fair" by
//      construction rather than by tuning.
//
// Deliberately NOT modelled: which specific opponent each player rallied
// with cross-court (there's no fixed man-marking in padel, and match data
// here is just final scores) — the model works entirely off pre-match
// ratings and the final score, the same inputs every other system uses.
const MAX_SKEW = 0.3; // caps the split at roughly 80/20 for very large gaps
const GAP_SCALE = 300; // rating-point gap at which skew reaches ~76% of MAX_SKEW

function _clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// Share of the team's swing credited to the WEAKER partner (always >= 0.5).
function _loadShareWeaker(gap) {
  return 0.5 + MAX_SKEW * Math.tanh(gap / GAP_SCALE);
}

// Splits `teamDelta` between `players` (expected length 2 in every real
// match; length 0/1 handled defensively for odd test fixtures) using the
// internal rating gap. Returns { name: rawDelta }.
function _splitTeam(players, teamDelta, rating) {
  const out = {};
  if (players.length < 2) {
    players.forEach((p) => (out[p] = teamDelta));
    return out;
  }
  const [p1, p2] = players;
  const r1 = rating[p1],
    r2 = rating[p2];
  const gap = Math.abs(r1 - r2);
  const shareWeak = _loadShareWeaker(gap);
  const shareStrong = 1 - shareWeak;
  const weaker = r1 <= r2 ? p1 : p2;
  const stronger = r1 <= r2 ? p2 : p1;
  // ×2 so that equal partners (shareWeak = shareStrong = 0.5) each still get
  // the full team delta (matching every other system's convention where
  // evenly-matched teammates both move by the team amount), while the
  // (shareWeak + shareStrong) × 2 / 2 average always equals teamDelta exactly
  // — the conservation property described above.
  out[weaker] = Math.round(teamDelta * 2 * shareWeak);
  out[stronger] = Math.round(teamDelta * 2 * shareStrong);
  return out;
}

// Core walk: returns a Map<match, {dA, dB, playerDeltas}> of RAW per-match
// deltas (not baseline-inclusive), in the same shape as computeMatchASSDeltas
// /computeMatchGlicko2Deltas/computeMatchOpenSkillDeltas. `rating` is tracked
// internally (baseline-inclusive, starting at 1000) purely to know each
// player's CURRENT standing for the team-average and gap calculations —
// exactly analogous to ASS's own internal strength-multiplier proxy.
export function computeMatchFairShareDeltas(matches) {
  const rating = {};
  const ensure = (p) => {
    if (!(p in rating)) rating[p] = 1000;
  };
  const map = new Map();
  [...matches]
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .forEach((m) => {
      const teamA = m.teamA || [];
      const teamB = m.teamB || [];
      [...teamA, ...teamB].forEach(ensure);
      const aWon = m.scoreA > m.scoreB;
      const margin = Math.abs(m.scoreA - m.scoreB);
      const total = m.scoreA + m.scoreB;
      const quality = 4 * margin + total;
      const avgA = teamA.reduce((s, p) => s + rating[p], 0) / Math.max(teamA.length, 1);
      const avgB = teamB.reduce((s, p) => s + rating[p], 0) / Math.max(teamB.length, 1);
      const multA = _clamp(1 + (avgB - avgA) / 400, 0.5, 2.0);
      const multB = _clamp(1 + (avgA - avgB) / 400, 0.5, 2.0);
      const teamDeltaA = aWon ? Math.round(quality * multA) : -Math.round(quality / multA);
      const teamDeltaB = !aWon ? Math.round(quality * multB) : -Math.round(quality / multB);

      const deltasA = _splitTeam(teamA, teamDeltaA, rating);
      const deltasB = _splitTeam(teamB, teamDeltaB, rating);
      const playerDeltas = { ...deltasA, ...deltasB };

      Object.entries(playerDeltas).forEach(([p, d]) => {
        rating[p] += d;
      });

      map.set(m, {
        dA: teamA.length
          ? Math.round(teamA.reduce((s, p) => s + playerDeltas[p], 0) / teamA.length)
          : 0,
        dB: teamB.length
          ? Math.round(teamB.reduce((s, p) => s + playerDeltas[p], 0) / teamB.length)
          : 0,
        playerDeltas,
      });
    });
  return map;
}

// Flat { name: rating } map — the shape computeStats()/ratingToSr() expect,
// matching computeASS()'s return shape.
export function computeFairShare(matches) {
  const rating = {};
  computeMatchFairShareDeltas(matches).forEach(({ playerDeltas }) => {
    Object.entries(playerDeltas).forEach(([p, d]) => {
      rating[p] = (rating[p] || 0) + d;
    });
  });
  Object.keys(rating).forEach((p) => {
    rating[p] += 1000;
  });
  return rating;
}
