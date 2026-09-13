// ── OPENSKILL RATING SYSTEM ───────────────────────────────────
// A from-scratch implementation of the Weng-Lin Bayesian rating model
// (Weng & Lin, "A Bayesian Approximation Method for Online Ranking", 2011 —
// the algorithm behind the openskill.js / openskill Python libraries, an
// open alternative to Microsoft's patented TrueSkill), specialized to the
// exact shape every match here has: exactly two teams, exactly one winner,
// no ties, no partial-credit weighting. That specialization is deliberate —
// the general model also handles N teams and tied ranks via a heavier
// Plackett-Luce sum, machinery padel never needs, and reproducing it exactly
// from documentation alone (rather than the library's source) would risk
// silently getting the tie-handling wrong. The two-team, no-ties case below
// reduces to the well-established Bradley-Terry pairwise-comparison model,
// which is unambiguous and directly analogous to Glicko's own E() function.
//
// Each player has a belief (mu, sigma): mu is the mean skill estimate, sigma
// the uncertainty (a wide sigma means "we don't know yet"). Constants are the
// library's own defaults (mu=25, sigma=25/3, beta=25/6, tau=25/300) uniformly
// scaled ×40 so mu starts at 1000 — consistent with ASS/ELO/Glicko-2's
// baseline elsewhere in this app. This is a valid rescaling: every formula
// below only ever uses ratios or differences of same-unit (mu, sigma, beta)
// quantities, so scaling all three by the same constant leaves the model's
// actual behaviour (win probabilities, relative rating movement) unchanged.
const SCALE = 40; // 1000 / 25
const MU0 = 1000;
const SIGMA0 = (25 / 3) * SCALE; // ≈ 333.33
const BETA = SIGMA0 / 2; // ≈ 166.67 — library default beta = sigma0 / 2
const TAU = (25 / 300) * SCALE; // ≈ 3.33 — per-period volatility floor
const KAPPA = 0.0001; // dimensionless floor on the sigma shrink factor

function _sumTeam(players, state) {
  let mu = 0,
    sigmaSq = 0;
  players.forEach((p) => {
    mu += state[p].mu;
    sigmaSq += state[p].sigma * state[p].sigma;
  });
  return { mu, sigmaSq };
}

// One match's update for both teams. `state` maps name -> {mu, sigma}
// (read-only in, new values returned per player so callers control when to
// write them back — needed because both teams' updates must be computed from
// the SAME pre-match snapshot, exactly like Glicko-2's doubles handling).
function _matchUpdate(teamA, teamB, aWon, state) {
  const A = _sumTeam(teamA, state);
  const B = _sumTeam(teamB, state);
  const c = Math.sqrt(A.sigmaSq + B.sigmaSq + 2 * BETA * BETA);
  const qA = 1 / (1 + Math.exp((B.mu - A.mu) / c));
  const qB = 1 - qA;
  const sA = aWon ? 1 : 0;
  const sB = aWon ? 0 : 1;
  // Default gamma: how much of the total game uncertainty is "this team's
  // own" — teams full of provisional (high-sigma) players update faster.
  const gammaA = Math.sqrt(A.sigmaSq) / c;
  const gammaB = Math.sqrt(B.sigmaSq) / c;

  const updateTeam = (players, s, q, qOther, gamma) => {
    const out = {};
    players.forEach((p) => {
      const { mu, sigma } = state[p];
      const sigmaSq = sigma * sigma;
      const newMu = mu + (sigmaSq / c) * (s - q);
      const shrink = Math.max(1 - (sigmaSq / (c * c)) * gamma * q * qOther, KAPPA);
      out[p] = { mu: newMu, sigma: sigma * Math.sqrt(shrink) };
    });
    return out;
  };

  return {
    ...updateTeam(teamA, sA, qA, qB, gammaA),
    ...updateTeam(teamB, sB, qB, qA, gammaB),
  };
}

// Final { name: { mu, sigma } } after walking `matches` in date order.
export function computeOpenSkillFull(matches) {
  const state = {};
  const ensure = (p) => {
    if (!state[p]) state[p] = { mu: MU0, sigma: SIGMA0 };
  };
  [...matches]
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .forEach((m) => {
      const teamA = m.teamA || [];
      const teamB = m.teamB || [];
      [...teamA, ...teamB].forEach(ensure);
      const aWon = m.scoreA > m.scoreB;
      Object.assign(state, _matchUpdate(teamA, teamB, aWon, state));
    });
  return state;
}

// Flat { name: mu } map — the shape computeStats()/ratingToSr() expect. mu
// (not the conservative ordinal) is used as the headline number so every
// player still starts at the same 1000 baseline as ASS/ELO/Glicko-2; the
// ordinal (mu - 3*sigma) is exposed separately for the "confidence" column.
export function computeOpenSkill(matches) {
  const full = computeOpenSkillFull(matches);
  const out = {};
  Object.keys(full).forEach((p) => {
    out[p] = full[p].mu;
  });
  return out;
}

export function ordinal(mu, sigma) {
  return mu - 3 * sigma;
}

// Per-match rating deltas (change in mu), same Map<match, {dA, dB,
// playerDeltas}> shape as computeMatchASSDeltas/computeMatchGlicko2Deltas.
export function computeMatchOpenSkillDeltas(matches) {
  const state = {};
  const ensure = (p) => {
    if (!state[p]) state[p] = { mu: MU0, sigma: SIGMA0 };
  };
  const map = new Map();
  [...matches]
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .forEach((m) => {
      const teamA = m.teamA || [];
      const teamB = m.teamB || [];
      [...teamA, ...teamB].forEach(ensure);
      const aWon = m.scoreA > m.scoreB;
      const before = { ...state };
      const updated = _matchUpdate(teamA, teamB, aWon, state);
      const playerDeltas = {};
      let sumA = 0,
        sumB = 0;
      teamA.forEach((p) => {
        const d = Math.round(updated[p].mu - before[p].mu);
        playerDeltas[p] = d;
        sumA += d;
      });
      teamB.forEach((p) => {
        const d = Math.round(updated[p].mu - before[p].mu);
        playerDeltas[p] = d;
        sumB += d;
      });
      Object.assign(state, updated);
      map.set(m, {
        dA: teamA.length ? Math.round(sumA / teamA.length) : 0,
        dB: teamB.length ? Math.round(sumB / teamB.length) : 0,
        playerDeltas,
      });
    });
  return map;
}

export const OPENSKILL_MU0 = MU0;
export const OPENSKILL_SIGMA0 = SIGMA0;
