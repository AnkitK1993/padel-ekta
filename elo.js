// ── ELO ENGINE ─────────────────────────────────────────────
// Pure computation — no DOM, no Firebase, no app state.
// app.js calls initEloDeps() once at startup to inject the two
// app-level helpers this module needs.

let _getDecayParams = () => ({ perWeek: 1, graceDays: 28, maxDecay: 30, floor: 900 });
let _todayISO = () => new Date().toISOString().slice(0, 10);

export function initEloDeps(getDecayFn, todayFn) {
  _getDecayParams = getDecayFn;
  _todayISO = todayFn;
}

// ── LRU cache (per-subset results, max 48 entries) ──────────
const _ELO_CACHE_MAX = 48;
const _eloCalcCache = new Map();

function _rememberElo(key, elo) {
  if (_eloCalcCache.has(key)) _eloCalcCache.delete(key);
  _eloCalcCache.set(key, elo);
  while (_eloCalcCache.size > _ELO_CACHE_MAX)
    _eloCalcCache.delete(_eloCalcCache.keys().next().value);
}

export function clearEloCache() {
  _eloCalcCache.clear();
}

// ── Fingerprints ─────────────────────────────────────────────
export function _matchesFingerprintForCache(matches) {
  return (matches || [])
    .map(
      (m) =>
        `${m.date || ""}|${(m.teamA || []).join(",")}|${(m.teamB || []).join(",")}|${m.scoreA ?? ""}|${m.scoreB ?? ""}|${m.note || ""}`,
    )
    .join("~");
}

export function _lightFingerprint(matches) {
  const arr = matches || [];
  if (!arr.length) return "0||";
  const last = arr[arr.length - 1];
  return `${arr.length}|${last.date || ""}|${last.scoreA ?? ""}|${last.scoreB ?? ""}`;
}

function _eloCacheKey(matches, applyDecay) {
  const decayKey = applyDecay
    ? JSON.stringify({ ..._getDecayParams(), today: _todayISO() })
    : "";
  return `${applyDecay ? "decay" : "raw"}|${decayKey}|${_matchesFingerprintForCache(matches)}`;
}

// ── Core computation ─────────────────────────────────────────
export function computeElo(matches, applyDecay = false) {
  const cacheKey = _eloCacheKey(matches, applyDecay);
  const cached = _eloCalcCache.get(cacheKey);
  if (cached) return cached;

  const elo = {};
  const g = (n) => { if (!(n in elo)) elo[n] = 1000; };
  const sorted = [...matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  sorted.forEach((m) => {
    const aWon = m.scoreA > m.scoreB;
    [...m.teamA, ...m.teamB].forEach(g);
    const avgA =
      m.teamA.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamA.length, 1);
    const avgB =
      m.teamB.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamB.length, 1);
    const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
    const expB = 1 - expA;
    const deltaA = 32 * ((aWon ? 1 : 0) - expA);
    const deltaB = 32 * ((aWon ? 0 : 1) - expB);
    m.teamA.forEach((p) => { elo[p] = Math.round(elo[p] + deltaA); });
    m.teamB.forEach((p) => { elo[p] = Math.round(elo[p] + deltaB); });
  });
  if (applyDecay && sorted.length) {
    const { perWeek, graceDays, maxDecay, floor } = _getDecayParams();
    const today = _todayISO();
    const lastSeen = {};
    sorted.forEach((m) => {
      [...m.teamA, ...m.teamB].forEach((p) => {
        if (!lastSeen[p] || m.date > lastSeen[p]) lastSeen[p] = m.date;
      });
    });
    Object.keys(elo).forEach((p) => {
      const last = lastSeen[p];
      if (!last) return;
      const daysSince = Math.round(
        (new Date(today) - new Date(last)) / 86400000,
      );
      if (daysSince > graceDays) {
        const decay = Math.min(
          maxDecay,
          Math.floor((daysSince - graceDays) / 7) * perWeek,
        );
        elo[p] = Math.max(floor, elo[p] - decay);
      }
    });
  }
  _rememberElo(cacheKey, elo);
  return elo;
}

export function computeEloHistory(matches) {
  const elo = {};
  const history = {};
  const sorted = [...matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  sorted.forEach((m) => {
    const allP = [...(m.teamA || []), ...(m.teamB || [])];
    allP.forEach((p) => {
      if (!(p in elo)) { elo[p] = 1000; history[p] = []; }
    });
    const aWon = m.scoreA > m.scoreB;
    const avgA =
      m.teamA.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamA.length, 1);
    const avgB =
      m.teamB.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamB.length, 1);
    const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
    const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
    const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
    m.teamA.forEach((p) => {
      elo[p] = (elo[p] || 1000) + dA;
      history[p].push({
        date: m.date, elo: elo[p], delta: dA, won: aWon,
        opponent: m.teamB.join(" & "), scoreA: m.scoreA, scoreB: m.scoreB,
      });
    });
    m.teamB.forEach((p) => {
      elo[p] = (elo[p] || 1000) + dB;
      history[p].push({
        date: m.date, elo: elo[p], delta: dB, won: !aWon,
        opponent: m.teamA.join(" & "), scoreA: m.scoreB, scoreB: m.scoreA,
      });
    });
  });
  return history;
}

export function computeEloPeaks(matches) {
  const elo = {};
  const peaks = {};
  const sorted = [...matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  sorted.forEach((m) => {
    [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
      if (!(p in elo)) { elo[p] = 1000; peaks[p] = 1000; }
    });
    const aWon = m.scoreA > m.scoreB;
    const avgA =
      m.teamA.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamA.length, 1);
    const avgB =
      m.teamB.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamB.length, 1);
    const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
    const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
    const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
    m.teamA.forEach((p) => {
      elo[p] = (elo[p] || 1000) + dA;
      if (elo[p] > (peaks[p] || 0)) peaks[p] = elo[p];
    });
    m.teamB.forEach((p) => {
      elo[p] = (elo[p] || 1000) + dB;
      if (elo[p] > (peaks[p] || 0)) peaks[p] = elo[p];
    });
  });
  return peaks;
}

export function computeEloLows(matches) {
  const elo = {};
  const lows = {};
  const sorted = [...matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  sorted.forEach((m) => {
    [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
      if (!(p in elo)) { elo[p] = 1000; lows[p] = 1000; }
    });
    const aWon = m.scoreA > m.scoreB;
    const avgA =
      m.teamA.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamA.length, 1);
    const avgB =
      m.teamB.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamB.length, 1);
    const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
    const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
    const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
    m.teamA.forEach((p) => {
      elo[p] = (elo[p] || 1000) + dA;
      if (elo[p] < lows[p]) lows[p] = elo[p];
    });
    m.teamB.forEach((p) => {
      elo[p] = (elo[p] || 1000) + dB;
      if (elo[p] < lows[p]) lows[p] = elo[p];
    });
  });
  return lows;
}
