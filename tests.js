// tests.js — Ekta Padel Test Suite
// Run with: node tests.js
"use strict";

// ─── TEST RUNNER ─────────────────────────────────────────────────────────────

let _pass = 0, _fail = 0;
const _failures = [];

function test(name, fn) {
  try {
    fn();
    process.stdout.write(`  \x1b[32m✓\x1b[0m ${name}\n`);
    _pass++;
  } catch (e) {
    process.stdout.write(`  \x1b[31m✗\x1b[0m ${name}\n    \x1b[33m${e.message}\x1b[0m\n`);
    _failures.push({ name, msg: e.message });
    _fail++;
  }
}

function group(name) {
  const bar = "─".repeat(Math.max(0, 54 - name.length));
  console.log(`\n\x1b[36m── ${name} ${bar}\x1b[0m`);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "Assertion failed");
}
function assertEqual(a, b, label) {
  if (a !== b) throw new Error(`${label ? label + ": " : ""}expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}
function assertClose(a, b, eps = 0.01, label) {
  if (Math.abs(a - b) > eps) throw new Error(`${label ? label + ": " : ""}expected ≈${b}, got ${a}`);
}
function assertDeepEqual(a, b, label) {
  const as = JSON.stringify(a), bs = JSON.stringify(b);
  if (as !== bs) throw new Error(`${label ? label + ": " : ""}expected\n      ${bs}\n    got\n      ${as}`);
}

// ─── PURE FUNCTIONS (extracted from app.js) ──────────────────────────────────

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function toLocalISODate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtDate(raw) {
  if (!raw) return "—";
  const s = String(raw);
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return Number(m[3]) + " " + MONTHS_SHORT[Number(m[2]) - 1] + " " + m[1];
  m = s.match(/^(\d{2})-(\d{2})$/);
  if (m) return Number(m[2]) + " " + MONTHS_SHORT[Number(m[1]) - 1];
  return s;
}

function parseDateHdr(s) {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let [, d, mo, y] = m;
  if (y.length === 2) y = "20" + y;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function _normScores(sA, sB) {
  const mx = Math.max(sA, sB, 1);
  if (mx <= 4) return [sA, sB];
  const f = 4 / mx;
  return [sA * f, sB * f];
}

function eloToSr(elo) {
  return parseFloat(Math.min(10, Math.max(0, (elo - 700) / 60)).toFixed(2));
}

function normalizedScoreline(m) {
  const hi = Math.max(Number(m.scoreA), Number(m.scoreB));
  const lo = Math.min(Number(m.scoreA), Number(m.scoreB));
  return `${hi}-${lo}`;
}

function isFireMatch(m) {
  return Math.abs(m.scoreA - m.scoreB) <= 1;
}

function isDominatingMatch(m) {
  const winnerScore = Math.max(Number(m.scoreA), Number(m.scoreB));
  const loserScore  = Math.min(Number(m.scoreA), Number(m.scoreB));
  return (
    (winnerScore === 4 && loserScore === 1) ||
    (winnerScore === 6 && (loserScore === 1 || loserScore === 2))
  );
}

function isZeroMatch(m) {
  return Number(m.scoreA) === 0 || Number(m.scoreB) === 0;
}

function xpThreshold(level) {
  if (level <= 1) return 0;
  return Math.floor(60 * Math.pow(level - 1, 1.8));
}

function getPlayerLevel(xp) {
  let level = 1;
  while (xpThreshold(level + 1) <= xp) level++;
  const thisXp = xpThreshold(level);
  const nextXp  = xpThreshold(level + 1);
  return { level, xp, progress: (xp - thisXp) / (nextXp - thisXp) };
}

function getPrestigeTier(level) {
  if (level >= 20) return "diamond";
  if (level >= 15) return "gold";
  if (level >= 10) return "silver";
  if (level >= 5)  return "bronze";
  return "rookie";
}

// computeElo — no caching; decay params injected so tests control "today"
function computeElo(matches, applyDecay = false, decayParams = null, todayStr = null) {
  const elo = {};
  const g = n => { if (!(n in elo)) elo[n] = 1000; };
  const sorted = [...matches].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  sorted.forEach(m => {
    const aWon = m.scoreA > m.scoreB;
    [...m.teamA, ...m.teamB].forEach(g);
    const avgA = m.teamA.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamA.length, 1);
    const avgB = m.teamB.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamB.length, 1);
    const expA  = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
    const deltaA = 32 * ((aWon ? 1 : 0) - expA);
    const deltaB = 32 * ((aWon ? 0 : 1) - (1 - expA));
    m.teamA.forEach(p => { elo[p] = Math.round(elo[p] + deltaA); });
    m.teamB.forEach(p => { elo[p] = Math.round(elo[p] + deltaB); });
  });
  if (applyDecay && sorted.length && decayParams && todayStr) {
    const { perWeek, graceDays, maxDecay, floor } = decayParams;
    const lastSeen = {};
    sorted.forEach(m => {
      [...m.teamA, ...m.teamB].forEach(p => {
        if (!lastSeen[p] || m.date > lastSeen[p]) lastSeen[p] = m.date;
      });
    });
    Object.keys(elo).forEach(p => {
      const last = lastSeen[p];
      if (!last) return;
      const daysSince = Math.round((new Date(todayStr) - new Date(last)) / 86400000);
      if (daysSince > graceDays) {
        const decay = Math.min(maxDecay, Math.floor((daysSince - graceDays) / 7) * perWeek);
        elo[p] = Math.max(floor, elo[p] - decay);
      }
    });
  }
  return elo;
}

function computeEloHistory(matches) {
  const elo = {}, history = {};
  const sorted = [...matches].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  sorted.forEach(m => {
    [...(m.teamA || []), ...(m.teamB || [])].forEach(p => {
      if (!(p in elo)) { elo[p] = 1000; history[p] = []; }
    });
    const aWon = m.scoreA > m.scoreB;
    const avgA = m.teamA.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamA.length, 1);
    const avgB = m.teamB.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamB.length, 1);
    const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
    const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
    const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
    m.teamA.forEach(p => { elo[p] = (elo[p] || 1000) + dA; history[p].push({ date: m.date, elo: elo[p], delta: dA, won: aWon, opponent: m.teamB.join(" & ") }); });
    m.teamB.forEach(p => { elo[p] = (elo[p] || 1000) + dB; history[p].push({ date: m.date, elo: elo[p], delta: dB, won: !aWon, opponent: m.teamA.join(" & ") }); });
  });
  return history;
}

function computeEloPeaks(matches) {
  const elo = {}, peaks = {};
  const sorted = [...matches].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  sorted.forEach(m => {
    [...(m.teamA || []), ...(m.teamB || [])].forEach(p => {
      if (!(p in elo)) { elo[p] = 1000; peaks[p] = 1000; }
    });
    const aWon = m.scoreA > m.scoreB;
    const avgA = m.teamA.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamA.length, 1);
    const avgB = m.teamB.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamB.length, 1);
    const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
    const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
    const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
    m.teamA.forEach(p => { elo[p] = (elo[p] || 1000) + dA; if (elo[p] > peaks[p]) peaks[p] = elo[p]; });
    m.teamB.forEach(p => { elo[p] = (elo[p] || 1000) + dB; if (elo[p] > peaks[p]) peaks[p] = elo[p]; });
  });
  return peaks;
}

function getPairKey(team) {
  return [...team].sort().join(" & ");
}

function normPlayer(name) { return name; }

function playersOpposed(m, a, b) {
  const aInA = (m.teamA || []).some(p => p === a), bInB = (m.teamB || []).some(p => p === b);
  const bInA = (m.teamA || []).some(p => p === b), aInB = (m.teamB || []).some(p => p === a);
  return (aInA && bInB) || (bInA && aInB);
}

function getHeadToHeadStats(a, b, matches) {
  const rows = matches.filter(m => playersOpposed(m, a, b));
  let aWins = 0, bWins = 0, diff = 0;
  rows.forEach(m => {
    const aInTeamA = (m.teamA || []).some(p => p === a);
    const aWon = aInTeamA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
    if (aWon) aWins++; else bWins++;
    diff += aInTeamA ? m.scoreA - m.scoreB : m.scoreB - m.scoreA;
  });
  return { matches: rows, aWins, bWins, diff };
}

function getPairStats(matches) {
  const pairs = {};
  matches.forEach(m => {
    const aWon = Number(m.scoreA) > Number(m.scoreB);
    [
      { team: m.teamA || [], gf: Number(m.scoreA), ga: Number(m.scoreB), won: aWon },
      { team: m.teamB || [], gf: Number(m.scoreB), ga: Number(m.scoreA), won: !aWon },
    ].forEach(row => {
      if (row.team.length < 2) return;
      const key = getPairKey(row.team);
      if (!pairs[key]) pairs[key] = { key, players: key.split(" & "), played: 0, wins: 0, gf: 0, ga: 0 };
      pairs[key].played++;
      pairs[key].wins += row.won ? 1 : 0;
      pairs[key].gf += row.gf;
      pairs[key].ga += row.ga;
    });
  });
  return Object.values(pairs).map(p => ({
    ...p, losses: p.played - p.wins,
    winPct: p.played ? Math.round((p.wins / p.played) * 100) : 0,
    diff: p.gf - p.ga,
  })).sort((a, b) => b.winPct - a.winPct || b.played - a.played || b.diff - a.diff);
}

function computeStats(matches, eloMap = {}) {
  const P = {};
  const g = n => {
    if (!P[n]) P[n] = { name: n, mp: 0, mw: 0, gw: 0, gl: 0, ngw: 0, results: [], partnerPlayed: {}, partnerWins: {}, oppPlayed: {}, oppWins: {} };
    return P[n];
  };
  const sorted = [...matches].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  sorted.forEach(m => {
    const aWon = m.scoreA > m.scoreB;
    const [_nsA, _nsB] = _normScores(m.scoreA, m.scoreB);
    m.teamA.forEach(p => {
      const pl = g(p);
      pl.mp++; pl.gw += m.scoreA; pl.gl += m.scoreB; pl.ngw += _nsA;
      if (aWon) pl.mw++;
      pl.results.push({ won: aWon, margin: m.scoreA - m.scoreB });
      m.teamA.forEach(partner => {
        if (partner !== p) {
          pl.partnerPlayed[partner] = (pl.partnerPlayed[partner] || 0) + 1;
          if (aWon) pl.partnerWins[partner] = (pl.partnerWins[partner] || 0) + 1;
        }
      });
      m.teamB.forEach(opp => {
        pl.oppPlayed[opp] = (pl.oppPlayed[opp] || 0) + 1;
        if (aWon) pl.oppWins[opp] = (pl.oppWins[opp] || 0) + 1;
      });
    });
    m.teamB.forEach(p => {
      const pl = g(p);
      pl.mp++; pl.gw += m.scoreB; pl.gl += m.scoreA; pl.ngw += _nsB;
      if (!aWon) pl.mw++;
      pl.results.push({ won: !aWon, margin: m.scoreB - m.scoreA });
      m.teamB.forEach(partner => {
        if (partner !== p) {
          pl.partnerPlayed[partner] = (pl.partnerPlayed[partner] || 0) + 1;
          if (!aWon) pl.partnerWins[partner] = (pl.partnerWins[partner] || 0) + 1;
        }
      });
      m.teamA.forEach(opp => {
        pl.oppPlayed[opp] = (pl.oppPlayed[opp] || 0) + 1;
        if (!aWon) pl.oppWins[opp] = (pl.oppWins[opp] || 0) + 1;
      });
    });
  });
  const rows = Object.values(P);
  const maxMP = Math.max(1, ...rows.map(p => p.mp));
  return rows.map(p => {
    const ml = p.mp - p.mw, total = p.gw + p.gl;
    const mwr = p.mp > 0 ? p.mw / p.mp : 0;
    const gwr = total > 0 ? p.gw / total : 0;
    const act = p.mp / maxMP;
    const sr  = p.name in eloMap ? eloToSr(eloMap[p.name]) : mwr * 5 + gwr * 3 + act * 2;
    let curStreak = 0, curType = "", bestWinStreak = 0, runW = 0;
    if (p.results.length > 0) {
      curType = p.results[p.results.length - 1].won ? "W" : "L";
      for (let i = p.results.length - 1; i >= 0; i--) {
        const r = p.results[i];
        if ((r.won && curType === "W") || (!r.won && curType === "L")) curStreak++;
        else break;
      }
    }
    p.results.forEach(r => {
      if (r.won) { runW++; bestWinStreak = Math.max(bestWinStreak, runW); } else runW = 0;
    });
    const MIN_G = 2;
    let bestPartner = null, worstPartner = null, bestPPct = -1, worstPPct = 101;
    Object.keys(p.partnerPlayed).forEach(partner => {
      const played = p.partnerPlayed[partner];
      if (played < MIN_G) return;
      const pct = ((p.partnerWins[partner] || 0) / played) * 100;
      if (pct > bestPPct || (pct === bestPPct && played > (bestPartner?.played ?? 0))) { bestPPct = pct; bestPartner = { name: partner, pct, played }; }
      if (pct < worstPPct || (pct === worstPPct && played > (worstPartner?.played ?? 0))) { worstPPct = pct; worstPartner = { name: partner, pct, played }; }
    });
    let favOpp = null, nemesis = null, favOPct = -1, nemOPct = 101;
    Object.keys(p.oppPlayed).forEach(opp => {
      const played = p.oppPlayed[opp];
      if (played < MIN_G) return;
      const pct = ((p.oppWins[opp] || 0) / played) * 100;
      if (pct > favOPct) { favOPct = pct; favOpp = { name: opp, pct, played }; }
      if (pct < nemOPct) { nemOPct = pct; nemesis = { name: opp, pct, played }; }
    });
    const form = p.results.slice(-5).map(r => r.won ? "W" : "L");
    const avgMargin = p.results.length > 0 ? p.results.reduce((s, r) => s + r.margin, 0) / p.results.length : 0;
    const consistency = p.results.length >= 3
      ? parseFloat(Math.sqrt(p.results.reduce((s, r) => s + Math.pow(r.margin - avgMargin, 2), 0) / p.results.length).toFixed(1))
      : null;
    return { ...p, ml, diff: p.gw - p.gl, sr, mwr, gwr, act, winPct: mwr * 100, gamePct: gwr * 100, curStreak, curType, bestWinStreak, bestPartner, worstPartner, favOpp, nemesis, form, avgMargin, consistency };
  }).sort((a, b) => b.sr - a.sr || b.gamePct - a.gamePct);
}

function makeActiveMatches(allMatches, guestNames, excludedNames, sessionUnexcluded) {
  const excluded = new Set([
    ...[...guestNames].filter(n => !sessionUnexcluded.has(n)),
    ...excludedNames,
  ]);
  if (!excluded.size) return allMatches;
  return allMatches.filter(m => ![...(m.teamA || []), ...(m.teamB || [])].some(p => excluded.has(p)));
}

// ── SEASONS (mirrors app.js _inSeason + the activeMatches() season scope) ──
// A season is { id, name, start:"YYYY-MM-DD", end:"YYYY-MM-DD"|null }.
function inSeason(season, dateStr) {
  const d = dateStr || "";
  if (!d) return false;                       // undated matches never fall in a range
  if (season.start && d < season.start) return false;
  if (season.end && d > season.end) return false;  // null/"" end = open-ended (ongoing)
  return true;
}

// Full activeMatches() pipeline: season scope FIRST, then guest/exclude filter.
// season === null means "ALL SEASONS" (no date filter).
function makeActiveMatchesWithSeason(allMatches, season, guestNames, excludedNames, sessionUnexcluded) {
  let base = allMatches;
  if (season) base = base.filter(m => inSeason(season, m.date));
  return makeActiveMatches(base, guestNames, excludedNames, sessionUnexcluded);
}

function sortPlayersGuestsLast(names, guestSet) {
  return [...names].sort((a, b) => {
    const ag = guestSet.has(a), bg = guestSet.has(b);
    if (ag !== bg) return ag ? 1 : -1;
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });
}

// ─── SAMPLE DATA ─────────────────────────────────────────────────────────────

const M = (date, teamA, teamB, scoreA, scoreB) => ({ date, teamA, teamB, scoreA, scoreB });

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

group("toLocalISODate");
test("formats a Date object to YYYY-MM-DD", () => {
  assertEqual(toLocalISODate(new Date(2024, 2, 25)), "2024-03-25");
});
test("pads month and day with zeros", () => {
  assertEqual(toLocalISODate(new Date(2024, 0, 5)), "2024-01-05");
});
test("accepts a date string", () => {
  assertEqual(toLocalISODate(new Date("2023-12-31")), "2023-12-31");
});
test("returns empty string for invalid date", () => {
  assertEqual(toLocalISODate(new Date("not-a-date")), "");
});

group("fmtDate");
test("formats YYYY-MM-DD to DD Mon YYYY", () => {
  assertEqual(fmtDate("2024-03-25"), "25 Mar 2024");
});
test("formats YYYY-MM-01 correctly (no leading zero in day)", () => {
  assertEqual(fmtDate("2024-01-01"), "1 Jan 2024");
});
test("formats month-only MM-DD to DD Mon", () => {
  assertEqual(fmtDate("12-25"), "25 Dec");
});
test("returns em dash for falsy input", () => {
  assertEqual(fmtDate(null), "—");
  assertEqual(fmtDate(""), "—");
  assertEqual(fmtDate(undefined), "—");
});
test("returns raw string for unrecognised format", () => {
  assertEqual(fmtDate("hello"), "hello");
});
test("all 12 months format correctly", () => {
  const expected = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  expected.forEach((mon, i) => {
    const mm = String(i + 1).padStart(2, "0");
    assert(fmtDate(`2024-${mm}-15`).includes(mon), `Month ${i+1} should show ${mon}`);
  });
});

group("parseDateHdr");
test("parses DD/MM/YYYY", () => {
  assertEqual(parseDateHdr("25/03/2024"), "2024-03-25");
});
test("parses single-digit D/M/YY", () => {
  assertEqual(parseDateHdr("1/1/24"), "2024-01-01");
});
test("expands 2-digit year with 20xx prefix", () => {
  assertEqual(parseDateHdr("15/06/99"), "2099-06-15");
});
test("returns null for text input", () => {
  assertEqual(parseDateHdr("not a date"), null);
});
test("returns null for ISO format (wrong separator)", () => {
  assertEqual(parseDateHdr("2024-03-25"), null);
});
test("returns null for empty string", () => {
  assertEqual(parseDateHdr(""), null);
});

group("isFireMatch");
test("6-5 is fire (margin 1)", () => {
  assert(isFireMatch({ scoreA: 6, scoreB: 5 }));
});
test("4-3 is fire (margin 1)", () => {
  assert(isFireMatch({ scoreA: 4, scoreB: 3 }));
});
test("3-3 is fire (tie, margin 0)", () => {
  assert(isFireMatch({ scoreA: 3, scoreB: 3 }));
});
test("6-4 is NOT fire (margin 2)", () => {
  assert(!isFireMatch({ scoreA: 6, scoreB: 4 }));
});
test("4-0 is NOT fire (margin 4)", () => {
  assert(!isFireMatch({ scoreA: 4, scoreB: 0 }));
});
test("6-0 is NOT fire (margin 6)", () => {
  assert(!isFireMatch({ scoreA: 6, scoreB: 0 }));
});

group("isDominatingMatch");
test("4-1 is dominating", () => {
  assert(isDominatingMatch({ scoreA: 4, scoreB: 1 }));
});
test("1-4 is dominating (reversed)", () => {
  assert(isDominatingMatch({ scoreA: 1, scoreB: 4 }));
});
test("6-1 is dominating", () => {
  assert(isDominatingMatch({ scoreA: 6, scoreB: 1 }));
});
test("6-2 is dominating", () => {
  assert(isDominatingMatch({ scoreA: 6, scoreB: 2 }));
});
test("6-3 is NOT dominating", () => {
  assert(!isDominatingMatch({ scoreA: 6, scoreB: 3 }));
});
test("4-0 is NOT dominating", () => {
  assert(!isDominatingMatch({ scoreA: 4, scoreB: 0 }));
});
test("4-2 is NOT dominating", () => {
  assert(!isDominatingMatch({ scoreA: 4, scoreB: 2 }));
});
test("6-0 is NOT dominating", () => {
  assert(!isDominatingMatch({ scoreA: 6, scoreB: 0 }));
});
test("3-1 is NOT dominating (winner not 4 or 6)", () => {
  assert(!isDominatingMatch({ scoreA: 3, scoreB: 1 }));
});

group("isZeroMatch");
test("4-0 is zero match", () => {
  assert(isZeroMatch({ scoreA: 4, scoreB: 0 }));
});
test("0-6 is zero match", () => {
  assert(isZeroMatch({ scoreA: 0, scoreB: 6 }));
});
test("4-1 is NOT zero match", () => {
  assert(!isZeroMatch({ scoreA: 4, scoreB: 1 }));
});
test("6-2 is NOT zero match", () => {
  assert(!isZeroMatch({ scoreA: 6, scoreB: 2 }));
});

group("normalizedScoreline");
test("6-3 stays 6-3", () => {
  assertEqual(normalizedScoreline({ scoreA: 6, scoreB: 3 }), "6-3");
});
test("3-6 flips to 6-3", () => {
  assertEqual(normalizedScoreline({ scoreA: 3, scoreB: 6 }), "6-3");
});
test("4-4 tie stays 4-4", () => {
  assertEqual(normalizedScoreline({ scoreA: 4, scoreB: 4 }), "4-4");
});
test("4-0 stays 4-0", () => {
  assertEqual(normalizedScoreline({ scoreA: 4, scoreB: 0 }), "4-0");
});

group("_normScores");
test("score ≤ 4 unchanged: 3-1", () => {
  assertDeepEqual(_normScores(3, 1), [3, 1]);
});
test("score ≤ 4 unchanged: 4-2", () => {
  assertDeepEqual(_normScores(4, 2), [4, 2]);
});
test("score > 4 normalises to max 4: 6-3 → [4, 2]", () => {
  const [a, b] = _normScores(6, 3);
  assertClose(a, 4, 0.001, "6 normalised");
  assertClose(b, 2, 0.001, "3 normalised");
});
test("score > 4: 6-2 → [4, ~1.33]", () => {
  const [a, b] = _normScores(6, 2);
  assertClose(a, 4, 0.001);
  assertClose(b, 4/3, 0.001);
});
test("both zeros: floor is 1 → unchanged 0-0", () => {
  const [a, b] = _normScores(0, 0);
  assertEqual(a, 0); assertEqual(b, 0);
});

group("eloToSr");
test("ELO 700 → SR 0.00", () => {
  assertEqual(eloToSr(700), 0.00);
});
test("ELO 1000 → SR 5.00", () => {
  assertEqual(eloToSr(1000), 5.00);
});
test("ELO 1300 → SR 10.00", () => {
  assertEqual(eloToSr(1300), 10.00);
});
test("ELO below 700 is clamped to 0", () => {
  assertEqual(eloToSr(100), 0.00);
});
test("ELO above 1300 is clamped to 10", () => {
  assertEqual(eloToSr(2000), 10.00);
});
test("ELO 850 → SR 2.50", () => {
  assertEqual(eloToSr(850), 2.50);
});
test("ELO 1060 → SR 6.00 (round number)", () => {
  // (1060 - 700) / 60 = 360/60 = 6.00
  assertEqual(eloToSr(1060), 6.00);
});

group("computeElo — basic");
test("empty matches returns empty object", () => {
  assertDeepEqual(computeElo([]), {});
});
test("all players start at 1000", () => {
  // No matches played yet — computed from a match to seed values
  const elo = computeElo([M("2024-01-01", ["Alice", "Bob"], ["Carol", "Dave"], 4, 3)]);
  assert("Alice" in elo && "Carol" in elo, "all four players present");
});
test("winner gains ELO, loser loses ELO", () => {
  const elo = computeElo([M("2024-01-01", ["Alice", "Bob"], ["Carol", "Dave"], 4, 3)]);
  assert(elo["Alice"] > 1000, "Alice should gain");
  assert(elo["Bob"]   > 1000, "Bob should gain");
  assert(elo["Carol"] < 1000, "Carol should lose");
  assert(elo["Dave"]  < 1000, "Dave should lose");
});
test("equal teams: winner gains 16, loser loses 16", () => {
  const elo = computeElo([M("2024-01-01", ["Alice", "Bob"], ["Carol", "Dave"], 4, 3)]);
  assertEqual(elo["Alice"], 1016);
  assertEqual(elo["Bob"],   1016);
  assertEqual(elo["Carol"], 984);
  assertEqual(elo["Dave"],  984);
});
test("all teammates share the same ELO delta", () => {
  const elo = computeElo([M("2024-01-01", ["Alice", "Bob"], ["Carol", "Dave"], 6, 2)]);
  assertEqual(elo["Alice"], elo["Bob"]);
  assertEqual(elo["Carol"], elo["Dave"]);
});
test("score margin does NOT affect ELO — 6-0 same as 6-5", () => {
  const elo1 = computeElo([M("2024-01-01", ["A", "B"], ["C", "D"], 6, 0)]);
  const elo2 = computeElo([M("2024-01-01", ["A", "B"], ["C", "D"], 6, 5)]);
  assertEqual(elo1["A"], elo2["A"]);
  assertEqual(elo1["C"], elo2["C"]);
});
test("ELO is symmetric: A gains what B loses (2-player equal teams)", () => {
  const elo = computeElo([M("2024-01-01", ["Alice"], ["Bob"], 4, 2)]);
  assertEqual(elo["Alice"] + elo["Bob"], 2000, "sum stays constant");
});
test("ELO sum is conserved across all four players", () => {
  const elo = computeElo([M("2024-01-01", ["A", "B"], ["C", "D"], 4, 2)]);
  assertEqual(elo["A"] + elo["B"] + elo["C"] + elo["D"], 4000);
});
test("chronological order enforced regardless of input order", () => {
  const forward  = computeElo([
    M("2024-01-01", ["A", "B"], ["C", "D"], 4, 2),
    M("2024-01-02", ["C", "D"], ["A", "B"], 4, 1),
  ]);
  const backward = computeElo([
    M("2024-01-02", ["C", "D"], ["A", "B"], 4, 1),
    M("2024-01-01", ["A", "B"], ["C", "D"], 4, 2),
  ]);
  assertDeepEqual(forward, backward, "should produce identical ELOs");
});
test("underdog winning yields larger gain than favourite winning", () => {
  // Make Alice/Bob very strong (800 points ahead)
  const setupMatches = Array.from({ length: 50 }, (_, i) =>
    M(`2024-01-${String(i+1).padStart(2,"0")}`, ["Alice","Bob"], ["Carol","Dave"], 4, 1)
  );
  // Now Carol/Dave (underdogs) win one match
  const underdogWin = computeElo([
    ...setupMatches,
    M("2024-03-01", ["Carol","Dave"], ["Alice","Bob"], 4, 1)
  ]);
  // And Alice/Bob (favourites) win another
  const favouriteWin = computeElo([
    ...setupMatches,
    M("2024-03-01", ["Alice","Bob"], ["Carol","Dave"], 4, 1)
  ]);
  assert(underdogWin["Carol"] > favouriteWin["Carol"], "underdog gains more");
});
test("single-player team (singles-style) works", () => {
  const elo = computeElo([M("2024-01-01", ["Alice"], ["Bob"], 4, 2)]);
  assert(elo["Alice"] > 1000);
  assert(elo["Bob"] < 1000);
});
test("same player in multiple matches — ELO accumulates correctly", () => {
  const elo = computeElo([
    M("2024-01-01", ["Alice", "Bob"], ["Carol", "Dave"], 4, 2),
    M("2024-01-02", ["Alice", "Bob"], ["Carol", "Dave"], 4, 2),
    M("2024-01-03", ["Alice", "Bob"], ["Carol", "Dave"], 4, 2),
  ]);
  assert(elo["Alice"] > 1032, "Alice should be well above starting ELO after 3 wins");
  assert(elo["Carol"] < 968, "Carol should be well below starting ELO after 3 losses");
});

group("computeElo — decay");
const DEFAULT_DECAY = { perWeek: 1, graceDays: 28, maxDecay: 30, floor: 900 };
test("no decay within grace period (28 days)", () => {
  const matches = [M("2024-01-01", ["Alice", "Bob"], ["Carol", "Dave"], 4, 2)];
  const withoutDecay = computeElo(matches);
  const withDecay    = computeElo(matches, true, DEFAULT_DECAY, "2024-01-29");
  assertEqual(withDecay["Alice"], withoutDecay["Alice"], "exactly 28 days — no decay");
});
test("decay kicks in after grace period (35 days = 1 week = 1 pt)", () => {
  const matches = [M("2024-01-01", ["Alice", "Bob"], ["Carol", "Dave"], 4, 2)];
  const base       = computeElo(matches);
  const withDecay  = computeElo(matches, true, DEFAULT_DECAY, "2024-02-05"); // 35 days later
  assertEqual(withDecay["Alice"], base["Alice"] - 1, "1 week past grace = 1pt decay");
});
test("decay caps at maxDecay (30 pts default)", () => {
  const matches = [M("2024-01-01", ["Alice", "Bob"], ["Carol", "Dave"], 4, 2)];
  const withDecay = computeElo(matches, true, DEFAULT_DECAY, "2026-01-01"); // years later
  const base = computeElo(matches);
  assertEqual(withDecay["Alice"], base["Alice"] - 30, "capped at maxDecay");
});
test("ELO floor prevents decay from pushing below 900", () => {
  // One match puts both teams near 1000; then a very long inactivity triggers max decay.
  // The decay floor (900) should prevent going below it — but only guards the decay step,
  // not natural match-loss drops.
  const matches = [M("2020-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 3)];
  // "today" is far in the future → triggers heavy decay on everyone
  const withDecay = computeElo(matches, true, DEFAULT_DECAY, "2026-01-01");
  // After one match everyone is near 1000 ±16; decay can take at most 30 pts.
  // So nobody should be below 900 (1000 - 16 - 30 = 954 worst case for loser).
  Object.values(withDecay).forEach(elo => {
    assert(elo >= 900, `ELO ${elo} fell below floor after decay`);
  });
});
test("player with recent match is not decayed", () => {
  const matches = [
    M("2024-01-01", ["Alice", "Bob"], ["Carol", "Dave"], 4, 2),
    M("2024-06-01", ["Alice", "Bob"], ["Carol", "Dave"], 4, 2), // Alice active
  ];
  const base      = computeElo(matches);
  const withDecay = computeElo(matches, true, DEFAULT_DECAY, "2024-06-20"); // 19 days after last match
  assertEqual(withDecay["Alice"], base["Alice"], "Alice played recently, no decay");
});

group("computeEloHistory");
test("returns history keyed by player name", () => {
  const history = computeEloHistory([M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2)]);
  assert("Alice" in history && "Carol" in history);
});
test("first history entry starts from 1000", () => {
  const history = computeEloHistory([M("2024-01-01", ["Alice"], ["Bob"], 4, 2)]);
  assert(history["Alice"][0].elo === 1016, "Alice wins, first ELO is 1016 (1000+16)");
});
test("history entries ordered chronologically", () => {
  const history = computeEloHistory([
    M("2024-01-03", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
  ]);
  assert(history["Alice"][0].date < history["Alice"][1].date, "sorted by date");
});
test("history entry has required fields", () => {
  const history = computeEloHistory([M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2)]);
  const entry = history["Alice"][0];
  assert("date" in entry && "elo" in entry && "delta" in entry && "won" in entry && "opponent" in entry);
});
test("delta is positive for winner, negative for loser", () => {
  const history = computeEloHistory([M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2)]);
  assert(history["Alice"][0].delta > 0, "winner has positive delta");
  assert(history["Carol"][0].delta < 0, "loser has negative delta");
});
test("winner entry has won=true, loser has won=false", () => {
  const history = computeEloHistory([M("2024-01-01", ["Alice"], ["Bob"], 4, 2)]);
  assertEqual(history["Alice"][0].won, true);
  assertEqual(history["Bob"][0].won,   false);
});

group("computeEloPeaks");
test("all players start at peak 1000", () => {
  const peaks = computeEloPeaks([M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 1, 4)]);
  // Alice loses first match, peak should still be 1000
  assertEqual(peaks["Alice"], 1000);
});
test("peak tracks highest ELO ever reached", () => {
  const peaks = computeEloPeaks([
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-02", ["Carol","Dave"], ["Alice","Bob"], 4, 1),
    M("2024-01-03", ["Carol","Dave"], ["Alice","Bob"], 4, 1),
  ]);
  const full = computeElo([
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
  ]);
  assert(peaks["Alice"] >= full["Alice"], "peak ≥ current ELO after wins then losses");
});
test("peak never decreases", () => {
  const matches = [
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-02", ["Carol","Dave"], ["Alice","Bob"], 4, 1),
    M("2024-01-03", ["Carol","Dave"], ["Alice","Bob"], 4, 1),
    M("2024-01-04", ["Carol","Dave"], ["Alice","Bob"], 4, 1),
  ];
  const peaks = computeEloPeaks(matches);
  const final = computeElo(matches);
  assert(peaks["Alice"] >= final["Alice"], "Alice's peak ≥ final ELO after a losing run");
});

group("xpThreshold");
test("level 1 threshold is 0", () => {
  assertEqual(xpThreshold(1), 0);
});
test("level 2 threshold is 60", () => {
  assertEqual(xpThreshold(2), 60);
});
test("thresholds increase with level", () => {
  assert(xpThreshold(3) > xpThreshold(2), "level 3 > level 2");
  assert(xpThreshold(5) > xpThreshold(4), "level 5 > level 4");
});
test("threshold is always a non-negative integer", () => {
  for (let lvl = 1; lvl <= 20; lvl++) {
    const t = xpThreshold(lvl);
    assert(Number.isInteger(t) && t >= 0, `level ${lvl} threshold should be non-negative integer`);
  }
});

group("getPlayerLevel");
test("0 XP → level 1", () => {
  assertEqual(getPlayerLevel(0).level, 1);
});
test("exactly at threshold → levels up", () => {
  assertEqual(getPlayerLevel(60).level, 2);
});
test("one XP below threshold → does not level up", () => {
  assertEqual(getPlayerLevel(59).level, 1);
});
test("progress is between 0 and 1", () => {
  const { progress } = getPlayerLevel(30);
  assert(progress >= 0 && progress <= 1, "progress should be 0-1");
});
test("progress is 0 at level threshold", () => {
  const { progress } = getPlayerLevel(60); // exactly level 2
  assertClose(progress, 0, 0.001);
});
test("XP accumulates across many levels", () => {
  const { level } = getPlayerLevel(1000);
  assert(level >= 5, "1000 XP should be at least level 5");
});

group("getPrestigeTier");
test("level 1 → rookie", () => { assertEqual(getPrestigeTier(1), "rookie"); });
test("level 4 → rookie", () => { assertEqual(getPrestigeTier(4), "rookie"); });
test("level 5 → bronze", () => { assertEqual(getPrestigeTier(5), "bronze"); });
test("level 9 → bronze", () => { assertEqual(getPrestigeTier(9), "bronze"); });
test("level 10 → silver", () => { assertEqual(getPrestigeTier(10), "silver"); });
test("level 14 → silver", () => { assertEqual(getPrestigeTier(14), "silver"); });
test("level 15 → gold",   () => { assertEqual(getPrestigeTier(15), "gold"); });
test("level 19 → gold",   () => { assertEqual(getPrestigeTier(19), "gold"); });
test("level 20 → diamond",() => { assertEqual(getPrestigeTier(20), "diamond"); });
test("level 50 → diamond",() => { assertEqual(getPrestigeTier(50), "diamond"); });

group("getPairKey");
test("canonical order (alphabetical) regardless of input order", () => {
  assertEqual(getPairKey(["Bob", "Alice"]), "Alice & Bob");
  assertEqual(getPairKey(["Alice", "Bob"]), "Alice & Bob");
});
test("single player returns just that player", () => {
  assertEqual(getPairKey(["Alice"]), "Alice");
});

group("getPairStats");
test("empty matches returns empty array", () => {
  assertDeepEqual(getPairStats([]), []);
});
test("single-player teams are skipped", () => {
  const result = getPairStats([M("2024-01-01", ["Alice"], ["Bob"], 4, 2)]);
  assertDeepEqual(result, []);
});
test("pair that always wins has 100% winPct", () => {
  const matches = [
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-02", ["Alice","Bob"], ["Carol","Dave"], 4, 1),
    M("2024-01-03", ["Alice","Bob"], ["Carol","Dave"], 6, 3),
  ];
  const stats = getPairStats(matches);
  const aliceBob = stats.find(p => p.players.includes("Alice") && p.players.includes("Bob"));
  assert(aliceBob, "Alice & Bob should appear");
  assertEqual(aliceBob.winPct, 100);
  assertEqual(aliceBob.played, 3);
  assertEqual(aliceBob.wins, 3);
});
test("pair stats are symmetric (both pairs from same match tracked)", () => {
  const matches = [M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2)];
  const stats = getPairStats(matches);
  assertEqual(stats.length, 2, "both pairs should be tracked");
});
test("goals for/against tracked correctly", () => {
  const matches = [M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 6, 2)];
  const stats = getPairStats(matches);
  const aliceBob = stats.find(p => p.players.includes("Alice"));
  assertEqual(aliceBob.gf, 6);
  assertEqual(aliceBob.ga, 2);
  assertEqual(aliceBob.diff, 4);
});
test("sorted by winPct descending", () => {
  const matches = [
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-02", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-03", ["Carol","Dave"], ["Alice","Bob"], 4, 2),
  ];
  const stats = getPairStats(matches);
  assert(stats[0].winPct >= stats[1].winPct, "sorted by winPct");
});

group("getHeadToHeadStats");
test("no matches returns empty", () => {
  const h2h = getHeadToHeadStats("Alice", "Bob", []);
  assertEqual(h2h.aWins, 0);
  assertEqual(h2h.bWins, 0);
  assertEqual(h2h.matches.length, 0);
});
test("players on same team are NOT counted", () => {
  const matches = [M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2)];
  const h2h = getHeadToHeadStats("Alice", "Bob", matches);
  assertEqual(h2h.matches.length, 0, "teammates do not face each other");
});
test("players on opposing teams ARE counted", () => {
  const matches = [M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2)];
  const h2h = getHeadToHeadStats("Alice", "Carol", matches);
  assertEqual(h2h.matches.length, 1);
});
test("aWins increments when A wins", () => {
  const matches = [
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-02", ["Alice","Bob"], ["Carol","Dave"], 4, 1),
  ];
  const h2h = getHeadToHeadStats("Alice", "Carol", matches);
  assertEqual(h2h.aWins, 2);
  assertEqual(h2h.bWins, 0);
});
test("bWins increments when B (Carol) wins", () => {
  // a="Alice", b="Carol". Carol's team wins (scoreA=4, Carol is in teamA).
  // aInTeamA = false (Alice not in teamA), so aWon = scoreB > scoreA = 2 > 4 = false → bWins++
  const matches = [M("2024-01-01", ["Carol","Dave"], ["Alice","Bob"], 4, 2)];
  const h2h = getHeadToHeadStats("Alice", "Carol", matches);
  assertEqual(h2h.bWins, 1);
  assertEqual(h2h.aWins, 0);
});
test("positive diff when a wins more games overall", () => {
  const matches = [
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 6, 2),
    M("2024-01-02", ["Alice","Bob"], ["Carol","Dave"], 4, 1),
  ];
  const h2h = getHeadToHeadStats("Alice", "Carol", matches);
  assert(h2h.diff > 0, "Alice wins more games, diff should be positive");
});

group("computeStats — basics");
test("empty matches returns empty array", () => {
  assertDeepEqual(computeStats([]), []);
});
test("all four players present after one match", () => {
  const stats = computeStats([M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2)]);
  assertEqual(stats.length, 4);
  assert(stats.some(p => p.name === "Alice"));
  assert(stats.some(p => p.name === "Carol"));
});
test("match played (mp) counts correctly", () => {
  const matches = [
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-02", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
  ];
  const stats = computeStats(matches);
  const alice = stats.find(p => p.name === "Alice");
  assertEqual(alice.mp, 2);
});
test("match wins (mw) correct for winner", () => {
  const matches = [
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-02", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-03", ["Carol","Dave"], ["Alice","Bob"], 4, 1),
  ];
  const stats = computeStats(matches);
  const alice = stats.find(p => p.name === "Alice");
  assertEqual(alice.mw, 2);
  assertEqual(alice.ml, 1);
});
test("goals for/against tracked per player", () => {
  const stats = computeStats([M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 6, 2)]);
  const alice = stats.find(p => p.name === "Alice");
  assertEqual(alice.gw, 6);
  assertEqual(alice.gl, 2);
  assertEqual(alice.diff, 4);
  const carol = stats.find(p => p.name === "Carol");
  assertEqual(carol.gw, 2);
  assertEqual(carol.gl, 6);
  assertEqual(carol.diff, -4);
});
test("winPct is correct percentage", () => {
  const matches = [
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-02", ["Carol","Dave"], ["Alice","Bob"], 4, 2),
  ];
  const stats = computeStats(matches);
  const alice = stats.find(p => p.name === "Alice");
  assertEqual(alice.winPct, 50);
});
test("sorted by SR descending (consistent winner at top)", () => {
  const matches = [
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-02", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-03", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
  ];
  const stats = computeStats(matches);
  assertEqual(stats[0].name === "Alice" || stats[0].name === "Bob", true, "winner at top");
});

group("computeStats — streaks");
test("win streak increments correctly", () => {
  const matches = [
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-02", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-03", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
  ];
  const stats = computeStats(matches);
  const alice = stats.find(p => p.name === "Alice");
  assertEqual(alice.curStreak, 3);
  assertEqual(alice.curType, "W");
});
test("loss streak tracked as L type", () => {
  const matches = [
    M("2024-01-01", ["Carol","Dave"], ["Alice","Bob"], 4, 2),
    M("2024-01-02", ["Carol","Dave"], ["Alice","Bob"], 4, 2),
  ];
  const stats = computeStats(matches);
  const alice = stats.find(p => p.name === "Alice");
  assertEqual(alice.curStreak, 2);
  assertEqual(alice.curType, "L");
});
test("streak resets after opposite result", () => {
  const matches = [
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-02", ["Carol","Dave"], ["Alice","Bob"], 4, 2),
    M("2024-01-03", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
  ];
  const stats = computeStats(matches);
  const alice = stats.find(p => p.name === "Alice");
  assertEqual(alice.curStreak, 1, "only last unbroken streak counts");
  assertEqual(alice.curType, "W");
});
test("bestWinStreak tracks all-time best", () => {
  const matches = [
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-02", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-03", ["Alice","Bob"], ["Carol","Dave"], 4, 2), // 3-win streak
    M("2024-01-04", ["Carol","Dave"], ["Alice","Bob"], 4, 2), // broken
    M("2024-01-05", ["Alice","Bob"], ["Carol","Dave"], 4, 2), // 1-win streak
  ];
  const stats = computeStats(matches);
  const alice = stats.find(p => p.name === "Alice");
  assertEqual(alice.bestWinStreak, 3);
  assertEqual(alice.curStreak, 1);
});

group("computeStats — form");
test("form is last 5 W/L results", () => {
  const matches = [
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-02", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-03", ["Carol","Dave"], ["Alice","Bob"], 4, 2),
    M("2024-01-04", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-05", ["Carol","Dave"], ["Alice","Bob"], 4, 2),
    M("2024-01-06", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
  ];
  const stats = computeStats(matches);
  const alice = stats.find(p => p.name === "Alice");
  assertDeepEqual(alice.form, ["W","L","W","L","W"]); // last 5
});
test("form has at most 5 entries", () => {
  const matches = Array.from({ length: 10 }, (_, i) =>
    M(`2024-01-${String(i+1).padStart(2,"0")}`, ["Alice","Bob"], ["Carol","Dave"], 4, 2)
  );
  const stats = computeStats(matches);
  const alice = stats.find(p => p.name === "Alice");
  assertEqual(alice.form.length, 5);
});

group("computeStats — partnerships (min 2 games)");
test("bestPartner is null with only 1 game together", () => {
  const stats = computeStats([M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2)]);
  const alice = stats.find(p => p.name === "Alice");
  assertEqual(alice.bestPartner, null, "only 1 game — below MIN_G threshold");
});
test("bestPartner set with 2+ games and 100% win rate", () => {
  const matches = [
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-02", ["Alice","Bob"], ["Carol","Dave"], 4, 1),
  ];
  const stats = computeStats(matches);
  const alice = stats.find(p => p.name === "Alice");
  assert(alice.bestPartner !== null, "bestPartner should be set");
  assertEqual(alice.bestPartner.name, "Bob");
  assertEqual(alice.bestPartner.pct, 100);
});
test("worstPartner set when losing with a partner ≥2 games", () => {
  const matches = [
    M("2024-01-01", ["Carol","Dave"], ["Alice","Bob"], 4, 2),
    M("2024-01-02", ["Carol","Dave"], ["Alice","Bob"], 4, 1),
    M("2024-01-03", ["Carol","Dave"], ["Alice","Bob"], 4, 1),
  ];
  const stats = computeStats(matches);
  const alice = stats.find(p => p.name === "Alice");
  assert(alice.worstPartner !== null);
  assertEqual(alice.worstPartner.pct, 0);
});

group("computeStats — nemesis / favourite opponent (min 2 games)");
test("nemesis is null with only 1 game against an opponent", () => {
  const stats = computeStats([M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2)]);
  const alice = stats.find(p => p.name === "Alice");
  assertEqual(alice.nemesis, null);
});
test("nemesis set after 2+ losses against same opponent", () => {
  const matches = [
    M("2024-01-01", ["Carol","Dave"], ["Alice","Bob"], 4, 2),
    M("2024-01-02", ["Carol","Dave"], ["Alice","Bob"], 4, 1),
  ];
  const stats = computeStats(matches);
  const alice = stats.find(p => p.name === "Alice");
  assert(alice.nemesis !== null);
  assert(alice.nemesis.name === "Carol" || alice.nemesis.name === "Dave");
});
test("favOpp set after 2+ wins against same opponent", () => {
  const matches = [
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-02", ["Alice","Bob"], ["Carol","Dave"], 4, 1),
  ];
  const stats = computeStats(matches);
  const alice = stats.find(p => p.name === "Alice");
  assert(alice.favOpp !== null);
});

group("computeStats — consistency");
test("consistency is null with fewer than 3 matches", () => {
  const matches = [
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-02", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
  ];
  const stats = computeStats(matches);
  const alice = stats.find(p => p.name === "Alice");
  assertEqual(alice.consistency, null);
});
test("consistency is a non-negative number with 3+ matches", () => {
  const matches = [
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-02", ["Alice","Bob"], ["Carol","Dave"], 6, 1),
    M("2024-01-03", ["Alice","Bob"], ["Carol","Dave"], 4, 3),
  ];
  const stats = computeStats(matches);
  const alice = stats.find(p => p.name === "Alice");
  assert(alice.consistency !== null && alice.consistency >= 0);
});
test("perfect consistency (identical margins) → consistency near 0", () => {
  const matches = [
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-02", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-03", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
  ];
  const stats = computeStats(matches);
  const alice = stats.find(p => p.name === "Alice");
  assertEqual(alice.consistency, 0, "same margin every game → zero std dev");
});

group("makeActiveMatches (guest/exclude filtering)");
test("no guests, no exclusions → all matches returned", () => {
  const matches = [
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-02", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
  ];
  const result = makeActiveMatches(matches, new Set(), new Set(), new Set());
  assertEqual(result.length, 2);
});
test("guest player's matches are excluded", () => {
  const matches = [
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-02", ["Alice","Guest1"], ["Carol","Dave"], 4, 2),
  ];
  const result = makeActiveMatches(matches, new Set(["Guest1"]), new Set(), new Set());
  assertEqual(result.length, 1, "Guest1's match should be excluded");
});
test("session-unexcluded guest is included", () => {
  const matches = [
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-02", ["Alice","Guest1"], ["Carol","Dave"], 4, 2),
  ];
  const sessionUnexcluded = new Set(["Guest1"]);
  const result = makeActiveMatches(matches, new Set(["Guest1"]), new Set(), sessionUnexcluded);
  assertEqual(result.length, 2, "Guest1 re-included via session override");
});
test("manually excluded non-guest is filtered out", () => {
  const matches = [
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-02", ["Alice","Bob"], ["Eve","Frank"], 4, 2),
  ];
  const result = makeActiveMatches(matches, new Set(), new Set(["Eve"]), new Set());
  assertEqual(result.length, 1, "Eve's match excluded");
});
test("excluding one player removes all their matches even as partner", () => {
  const matches = [
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-02", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-03", ["Alice","Eve"], ["Carol","Dave"], 4, 2), // Eve excluded
  ];
  const result = makeActiveMatches(matches, new Set(), new Set(["Eve"]), new Set());
  assertEqual(result.length, 2);
});
test("multiple guests all excluded simultaneously", () => {
  const matches = [
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-02", ["Alice","Guest1"], ["Carol","Dave"], 4, 2),
    M("2024-01-03", ["Alice","Bob"], ["Carol","Guest2"], 4, 2),
  ];
  const result = makeActiveMatches(matches, new Set(["Guest1","Guest2"]), new Set(), new Set());
  assertEqual(result.length, 1, "only the match with no guests remains");
});

group("sortPlayersGuestsLast");
test("non-guests sorted alphabetically", () => {
  const sorted = sortPlayersGuestsLast(["Charlie","Alice","Bob"], new Set());
  assertDeepEqual(sorted, ["Alice","Bob","Charlie"]);
});
test("guests appear after all non-guests", () => {
  const sorted = sortPlayersGuestsLast(["Charlie","Alice","GuestBob"], new Set(["GuestBob"]));
  assertDeepEqual(sorted, ["Alice","Charlie","GuestBob"]);
});
test("multiple guests at end, sorted among themselves", () => {
  const sorted = sortPlayersGuestsLast(
    ["Zara","GuestBen","Alice","GuestAmy"],
    new Set(["GuestBen","GuestAmy"])
  );
  assertDeepEqual(sorted, ["Alice","Zara","GuestAmy","GuestBen"]);
});
test("all guests: sorted alphabetically", () => {
  const sorted = sortPlayersGuestsLast(["Charlie","Alice","Bob"], new Set(["Alice","Bob","Charlie"]));
  assertDeepEqual(sorted, ["Alice","Bob","Charlie"]);
});
test("empty list returns empty list", () => {
  assertDeepEqual(sortPlayersGuestsLast([], new Set()), []);
});
test("case-insensitive sort", () => {
  const sorted = sortPlayersGuestsLast(["bob","Alice","charlie"], new Set());
  assertDeepEqual(sorted, ["Alice","bob","charlie"]);
});

group("ELO + Stats integration");
test("ELO feeds into SR rating in computeStats", () => {
  const matches = [M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2)];
  const eloMap  = computeElo(matches);
  const stats   = computeStats(matches, eloMap);
  const alice   = stats.find(p => p.name === "Alice");
  const carol   = stats.find(p => p.name === "Carol");
  assertEqual(alice.sr, eloToSr(eloMap["Alice"]));
  assertEqual(carol.sr, eloToSr(eloMap["Carol"]));
});
test("winner ranked higher than loser after consistent results", () => {
  const matches = Array.from({ length: 5 }, (_, i) =>
    M(`2024-01-${String(i+1).padStart(2,"0")}`, ["Alice","Bob"], ["Carol","Dave"], 4, 2)
  );
  const eloMap = computeElo(matches);
  const stats  = computeStats(matches, eloMap);
  const alice  = stats.find(p => p.name === "Alice");
  const carol  = stats.find(p => p.name === "Carol");
  assert(alice.sr > carol.sr, "persistent winner should rank above loser");
});
test("filtered matches produce different stats than unfiltered", () => {
  const allMatches = [
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-02", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-03", ["Alice","Guest"], ["Carol","Dave"], 4, 2), // Guest match
  ];
  const full    = computeStats(allMatches);
  const active  = makeActiveMatches(allMatches, new Set(["Guest"]), new Set(), new Set());
  const partial = computeStats(active);
  const aliceFull = full.find(p => p.name === "Alice");
  const alicePart = partial.find(p => p.name === "Alice");
  assertEqual(aliceFull.mp, 3);
  assertEqual(alicePart.mp, 2, "filtered: Guest match excluded");
});
test("ELO of player only in active matches differs from ELO in all matches", () => {
  const allMatches = [
    M("2024-01-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),
    M("2024-01-02", ["Alice","Guest"], ["Carol","Dave"], 4, 2),
  ];
  const eloAll    = computeElo(allMatches);
  const active    = makeActiveMatches(allMatches, new Set(["Guest"]), new Set(), new Set());
  const eloActive = computeElo(active);
  assert(eloAll["Alice"] !== eloActive["Alice"], "ELO differs when guest match included vs excluded");
});

group("inSeason (date-range membership)");
const SEASON_CLOSED = { id: "s1", name: "Q1", start: "2026-01-01", end: "2026-03-31" };
const SEASON_OPEN   = { id: "s2", name: "Now", start: "2026-02-01", end: null };
test("start boundary is inclusive", () => {
  assert(inSeason(SEASON_CLOSED, "2026-01-01"));
});
test("end boundary is inclusive", () => {
  assert(inSeason(SEASON_CLOSED, "2026-03-31"));
});
test("day before start is excluded", () => {
  assert(!inSeason(SEASON_CLOSED, "2025-12-31"));
});
test("day after end is excluded", () => {
  assert(!inSeason(SEASON_CLOSED, "2026-04-01"));
});
test("date inside range is included", () => {
  assert(inSeason(SEASON_CLOSED, "2026-02-15"));
});
test("empty/undated match is never in range", () => {
  assert(!inSeason(SEASON_CLOSED, ""));
  assert(!inSeason(SEASON_CLOSED, undefined));
});
test("open-ended season includes far-future dates", () => {
  assert(inSeason(SEASON_OPEN, "2030-12-31"));
});
test("open-ended season still respects its start", () => {
  assert(!inSeason(SEASON_OPEN, "2026-01-15"));
});

group("season scope + guest filter composition (activeMatches pipeline)");
const SEASON_MATCHES = [
  M("2025-12-20", ["Alice","Bob"], ["Carol","Dave"], 4, 2),   // before season
  M("2026-01-05", ["Alice","Bob"], ["Carol","Dave"], 4, 2),   // in season
  M("2026-02-10", ["Alice","Guest"], ["Carol","Dave"], 4, 2), // in season, has guest
  M("2026-03-31", ["Alice","Bob"], ["Carol","Dave"], 4, 2),   // in season (end boundary)
  M("2026-05-01", ["Alice","Bob"], ["Carol","Dave"], 4, 2),   // after season
];
test("ALL SEASONS (null) applies no date filter", () => {
  const r = makeActiveMatchesWithSeason(SEASON_MATCHES, null, new Set(), new Set(), new Set());
  assertEqual(r.length, 5);
});
test("season scopes matches to its date range", () => {
  const r = makeActiveMatchesWithSeason(SEASON_MATCHES, SEASON_CLOSED, new Set(), new Set(), new Set());
  assertEqual(r.length, 3, "only the 3 in-range matches remain");
});
test("season scope composes with guest exclusion", () => {
  // Guest's match (2026-02-10) is in-range but should drop out under guest filter.
  const r = makeActiveMatchesWithSeason(SEASON_MATCHES, SEASON_CLOSED, new Set(["Guest"]), new Set(), new Set());
  assertEqual(r.length, 2, "in-range minus the guest match");
});
test("empty-range season yields no matches", () => {
  const empty = { id: "e", name: "Empty", start: "2020-01-01", end: "2020-12-31" };
  const r = makeActiveMatchesWithSeason(SEASON_MATCHES, empty, new Set(), new Set(), new Set());
  assertEqual(r.length, 0);
});
test("season-scoped stats differ from all-time stats", () => {
  const allStats = computeStats(makeActiveMatchesWithSeason(SEASON_MATCHES, null, new Set(), new Set(), new Set()));
  const seasonStats = computeStats(makeActiveMatchesWithSeason(SEASON_MATCHES, SEASON_CLOSED, new Set(), new Set(), new Set()));
  const aliceAll = allStats.find(p => p.name === "Alice");
  const aliceSeason = seasonStats.find(p => p.name === "Alice");
  assertEqual(aliceAll.mp, 5);
  assertEqual(aliceSeason.mp, 3, "Alice played 3 matches inside the season");
});
test("season-scoped ELO resets from 1000 (independent of prior seasons)", () => {
  // ELO over only the in-range matches must not depend on the out-of-range ones.
  const inRangeOnly = SEASON_MATCHES.filter(m => inSeason(SEASON_CLOSED, m.date));
  const viaPipeline = makeActiveMatchesWithSeason(SEASON_MATCHES, SEASON_CLOSED, new Set(), new Set(), new Set());
  assertDeepEqual(computeElo(viaPipeline), computeElo(inRangeOnly));
});

// ─── SUMMARY ─────────────────────────────────────────────────────────────────

const total = _pass + _fail;
console.log(`\n${"─".repeat(57)}`);
console.log(`\x1b[1mResults: ${_pass}/${total} passed\x1b[0m  (${_fail} failed)\n`);
if (_failures.length) {
  console.log("\x1b[31mFailed tests:\x1b[0m");
  _failures.forEach(f => console.log(`  • ${f.name}\n    ${f.msg}`));
  console.log();
}
process.exit(_fail > 0 ? 1 : 0);
