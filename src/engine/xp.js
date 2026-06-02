// ── XP / LEVEL / PRESTIGE ──────────────────────────────────
// Player progression compute helpers. xpThreshold/getPlayerLevel/getPrestigeTier
// are pure; computePlayerXP is injected with normPlayer + activeMatches +
// the three match-type helpers that live in render-match-rows.js.

let _normPlayer = (n) => n;
let _activeMatches = () => [];
let _isFireMatch = () => false;
let _isDominatingMatch = () => false;
let _isZeroMatch = () => false;

export function initXpDeps(deps) {
  _normPlayer = deps.normPlayer;
  _activeMatches = deps.activeMatches;
  _isFireMatch = deps.isFireMatch;
  _isDominatingMatch = deps.isDominatingMatch;
  _isZeroMatch = deps.isZeroMatch;
}

export function xpThreshold(level) {
  if (level <= 1) return 0;
  return Math.floor(60 * Math.pow(level - 1, 1.8));
}

export function computePlayerXP(displayName) {
  let xp = 0;
  _activeMatches().forEach((m) => {
    const inA = (m.teamA || []).some((p) => _normPlayer(p) === displayName);
    const inB = (m.teamB || []).some((p) => _normPlayer(p) === displayName);
    if (!inA && !inB) return;
    xp += 15;
    const won = inA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
    if (won) xp += 25;
    if (_isFireMatch(m)) xp += 8;
    if (_isDominatingMatch(m) && won) xp += 8;
    if (_isZeroMatch(m) && won) xp += 12;
  });
  return xp;
}

export function getPlayerLevel(xp) {
  let level = 1;
  while (xpThreshold(level + 1) <= xp) level++;
  const thisXp = xpThreshold(level);
  const nextXp = xpThreshold(level + 1);
  return { level, xp, progress: (xp - thisXp) / (nextXp - thisXp) };
}

export function getPrestigeTier(level) {
  if (level >= 20) return "diamond";
  if (level >= 15) return "gold";
  if (level >= 10) return "silver";
  if (level >= 5) return "bronze";
  return "rookie";
}
