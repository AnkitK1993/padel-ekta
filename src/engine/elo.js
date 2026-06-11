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
  _timelineKey = "";
  _timelineMemo = null;
}

// ── Fingerprints ─────────────────────────────────────────────
// Cache keys must reflect every field that affects the result, but the key
// itself must stay small: the LRU retains up to 48 keys, so an O(dataset)
// string key would pin ~48 copies of the whole match log in memory. Instead
// fold the same fields into two independent FNV-1a hashes (64 bits combined —
// collision odds are negligible for a cache this size) plus the match count.
function _fnvField(h, s) {
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.imul(h ^ 0x7c, 16777619); // fold a separator so "ab","c" ≠ "a","bc"
}

export function _matchesFingerprintForCache(matches) {
  const arr = matches || [];
  let h1 = 2166136261;
  let h2 = 0x811c9dc4; // different basis → independent second hash
  for (const m of arr) {
    for (const f of [
      m.date || "",
      (m.teamA || []).join(","),
      (m.teamB || []).join(","),
      `${m.scoreA ?? ""}`,
      `${m.scoreB ?? ""}`,
      m.note || "",
    ]) {
      h1 = _fnvField(h1, f);
      h2 = _fnvField(h2, f);
    }
  }
  return `${arr.length}:${(h1 >>> 0).toString(36)}:${(h2 >>> 0).toString(36)}`;
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

// History, peaks and lows all replay the same match sequence with identical
// delta math, so compute the three together in ONE sorted pass and memoize the
// bundle. Callers that ask for all three per render (player detail, analytics)
// now pay one O(n log n) replay instead of three. clearEloCache() drops the memo.
let _timelineKey = "";
let _timelineMemo = null;

export function computeEloTimeline(matches) {
  const key = _matchesFingerprintForCache(matches);
  if (_timelineMemo && _timelineKey === key) return _timelineMemo;
  const elo = {};
  const history = {};
  const peaks = {};
  const lows = {};
  const sorted = [...matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  sorted.forEach((m) => {
    const allP = [...(m.teamA || []), ...(m.teamB || [])];
    allP.forEach((p) => {
      if (!(p in elo)) { elo[p] = 1000; history[p] = []; peaks[p] = 1000; lows[p] = 1000; }
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
      if (elo[p] > peaks[p]) peaks[p] = elo[p];
      if (elo[p] < lows[p]) lows[p] = elo[p];
    });
    m.teamB.forEach((p) => {
      elo[p] = (elo[p] || 1000) + dB;
      history[p].push({
        date: m.date, elo: elo[p], delta: dB, won: !aWon,
        opponent: m.teamA.join(" & "), scoreA: m.scoreB, scoreB: m.scoreA,
      });
      if (elo[p] > peaks[p]) peaks[p] = elo[p];
      if (elo[p] < lows[p]) lows[p] = elo[p];
    });
  });
  _timelineKey = key;
  _timelineMemo = { history, peaks, lows };
  return _timelineMemo;
}

export function computeEloHistory(matches) {
  return computeEloTimeline(matches).history;
}

export function computeEloPeaks(matches) {
  return computeEloTimeline(matches).peaks;
}

export function computeEloLows(matches) {
  return computeEloTimeline(matches).lows;
}
