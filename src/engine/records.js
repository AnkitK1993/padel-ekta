// ── RECORDS / EXTENDED ANALYTICS ────────────────────────────
// Pure aggregation functions for the extended Analytics feature set (roadmap
// items: rating distribution, competitiveness-over-time, ratings-by-month,
// favourite-wins curve, margin buckets, fatigue-by-match-of-day, nemesis/bunny,
// partner loyalty, attendance streaks, hall of fame, milestone timeline,
// weighted MVP formula, per-player streak segments, rolling win%, waterfall
// top-moves). No DOM, no app state — matches/maps are passed in.

// ── Rating distribution histogram ──
// Buckets a score map (name → rating) into fixed-width bins for a histogram.
export function ratingDistribution(scoreMap, bucketSize = 50) {
  const entries = Object.entries(scoreMap || {}).map(([name, score]) => ({
    name,
    score: Math.round(score),
  }));
  if (!entries.length) return { entries: [], buckets: [], min: 1000, max: 1000 };
  const min = Math.min(...entries.map((e) => e.score));
  const max = Math.max(...entries.map((e) => e.score));
  const lo = Math.floor(min / bucketSize) * bucketSize;
  const hi = Math.ceil((max + 1) / bucketSize) * bucketSize;
  const buckets = [];
  for (let b = lo; b < hi; b += bucketSize) {
    buckets.push({
      from: b,
      to: b + bucketSize,
      players: entries.filter((e) => e.score >= b && e.score < b + bucketSize),
    });
  }
  if (!buckets.length) buckets.push({ from: lo, to: lo + bucketSize, players: entries });
  return { entries, buckets, min, max };
}

// ── League competitiveness over time ──
// stddev of a score map, recomputed at each month-end cutoff via scoreFn(matchesUpToCutoff).
export function competitivenessOverTime(sortedMatches, scoreFn) {
  const months = [...new Set(sortedMatches.map((m) => (m.date || "").slice(0, 7)))]
    .filter(Boolean)
    .sort();
  return months.map((mo) => {
    const cutoff = mo + "-31";
    const ms = sortedMatches.filter((m) => (m.date || "") <= cutoff);
    const map = scoreFn(ms);
    const vals = Object.values(map);
    if (vals.length < 2) return { month: mo, stddev: 0, n: vals.length };
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
    return { month: mo, stddev: Math.round(Math.sqrt(variance)), n: vals.length };
  });
}

// ── Ratings by month (for the bar-chart race) ──
export function ratingsByMonth(sortedMatches, scoreFn, months) {
  return months.map((mo) => {
    const cutoff = mo + "-31";
    const ms = sortedMatches.filter((m) => (m.date || "") <= cutoff);
    return { month: mo, scores: scoreFn(ms) };
  });
}

// ── Favourite-wins curve ──
// Buckets matches by pre-match ELO gap between teams; win% of the favourite
// (the team with the higher running rating going into that match).
export function favouriteWinCurve(sortedMatches) {
  const buckets = [
    { label: "0–25", lo: 0, hi: 25, fav: 0, total: 0 },
    { label: "25–50", lo: 25, hi: 50, fav: 0, total: 0 },
    { label: "50–100", lo: 50, hi: 100, fav: 0, total: 0 },
    { label: "100+", lo: 100, hi: Infinity, fav: 0, total: 0 },
  ];
  const elo = {};
  sortedMatches.forEach((m) => {
    const tA = m.teamA || [], tB = m.teamB || [];
    [...tA, ...tB].forEach((p) => { if (!(p in elo)) elo[p] = 1000; });
    const avgA = tA.reduce((s, p) => s + elo[p], 0) / Math.max(tA.length, 1);
    const avgB = tB.reduce((s, p) => s + elo[p], 0) / Math.max(tB.length, 1);
    const gap = Math.abs(avgA - avgB);
    const aWon = m.scoreA > m.scoreB;
    const favWon = avgA >= avgB ? aWon : !aWon;
    const b = buckets.find((x) => gap >= x.lo && gap < x.hi);
    if (b) { b.total++; if (favWon) b.fav++; }
    const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
    const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
    const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
    tA.forEach((p) => { elo[p] += dA; });
    tB.forEach((p) => { elo[p] += dB; });
  });
  return buckets
    .filter((b) => b.total > 0)
    .map((b) => ({ ...b, pct: Math.round((b.fav / b.total) * 100) }));
}

// ── Margin-of-victory buckets (0,1,2,3,4,5+) ──
export function marginBuckets(matches) {
  const buckets = {};
  matches.forEach((m) => {
    const margin = Math.abs(m.scoreA - m.scoreB);
    const key = margin >= 5 ? "5+" : String(margin);
    buckets[key] = (buckets[key] || 0) + 1;
  });
  return ["0", "1", "2", "3", "4", "5+"].map((k) => ({ margin: k, count: buckets[k] || 0 }));
}

// ── Fatigue by match-of-day ──
// Per-player match index within a calendar day (1st, 2nd, 3rd... match that
// day), aggregated into win% / avg games won per slot across the whole group.
// Relies on array order within a date as a proxy for intra-day chronology
// (the data model has no match timestamp, only a date).
export function fatigueByMatchOfDay(matches, maxN = 5) {
  const byDate = {};
  matches.forEach((m) => {
    const d = m.date || "";
    (byDate[d] || (byDate[d] = [])).push(m);
  });
  const slots = Array.from({ length: maxN }, (_, i) => ({
    n: i + 1, wins: 0, played: 0, gamesWon: 0, gamesTotal: 0,
  }));
  Object.values(byDate).forEach((dayMs) => {
    const idx = {};
    dayMs.forEach((m) => {
      const aWon = m.scoreA > m.scoreB;
      [
        { team: m.teamA || [], won: aWon, gf: m.scoreA, ga: m.scoreB },
        { team: m.teamB || [], won: !aWon, gf: m.scoreB, ga: m.scoreA },
      ].forEach(({ team, won, gf, ga }) => {
        team.forEach((p) => {
          idx[p] = (idx[p] || 0) + 1;
          const slot = slots[Math.min(idx[p], maxN) - 1];
          slot.played++;
          if (won) slot.wins++;
          slot.gamesWon += gf;
          slot.gamesTotal += gf + ga;
        });
      });
    });
  });
  return slots
    .filter((s) => s.played >= 5)
    .map((s) => ({
      n: s.n,
      winPct: Math.round((s.wins / s.played) * 100),
      avgGames: +(s.gamesWon / s.played).toFixed(1),
      played: s.played,
    }));
}

// ── Nemesis & Bunny ──
// Per player: the opponent they lose to most (nemesis) and beat most (bunny),
// among opponents met at least `minMeetings` times.
export function nemesisBunny(matches, minMeetings = 3) {
  const rec = {};
  matches.forEach((m) => {
    const aWon = m.scoreA > m.scoreB;
    const tA = m.teamA || [], tB = m.teamB || [];
    tA.forEach((a) => tB.forEach((b) => {
      (rec[a] || (rec[a] = {}))[b] = rec[a][b] || { w: 0, l: 0 };
      (rec[b] || (rec[b] = {}))[a] = rec[b][a] || { w: 0, l: 0 };
      if (aWon) { rec[a][b].w++; rec[b][a].l++; } else { rec[a][b].l++; rec[b][a].w++; }
    }));
  });
  const result = {};
  Object.entries(rec).forEach(([p, opps]) => {
    const list = Object.entries(opps)
      .map(([opp, r]) => ({ opp, ...r, total: r.w + r.l, pct: r.w / (r.w + r.l) }))
      .filter((r) => r.total >= minMeetings);
    if (!list.length) { result[p] = { nemesis: null, bunny: null }; return; }
    const nemesis = [...list].sort((a, b) => a.pct - b.pct || b.total - a.total)[0];
    const bunny = [...list].sort((a, b) => b.pct - a.pct || b.total - a.total)[0];
    result[p] = { nemesis, bunny };
  });
  return result;
}

// ── Partner loyalty ──
// % of a player's doubles matches played with their single most-frequent partner.
export function partnerLoyalty(matches, minMatches = 3) {
  const partnerCount = {}, totalCount = {};
  matches.forEach((m) => {
    [m.teamA, m.teamB].forEach((team) => {
      if (!team || team.length !== 2) return;
      const [a, b] = team;
      (partnerCount[a] || (partnerCount[a] = {}))[b] = (partnerCount[a][b] || 0) + 1;
      (partnerCount[b] || (partnerCount[b] = {}))[a] = (partnerCount[b][a] || 0) + 1;
      totalCount[a] = (totalCount[a] || 0) + 1;
      totalCount[b] = (totalCount[b] || 0) + 1;
    });
  });
  return Object.entries(partnerCount)
    .map(([name, partners]) => {
      const top = Object.entries(partners).sort((a, b) => b[1] - a[1])[0];
      const total = totalCount[name] || 0;
      return {
        name,
        topPartner: top?.[0] || null,
        topCount: top?.[1] || 0,
        total,
        pct: total ? Math.round(((top?.[1] || 0) / total) * 100) : 0,
        uniquePartners: Object.keys(partners).length,
      };
    })
    .filter((r) => r.total >= minMatches)
    .sort((a, b) => b.pct - a.pct);
}

// ── Attendance streaks ──
// Sessions = distinct calendar dates the group played at all. current = number
// of the most recent consecutive group sessions the player attended (0 if they
// missed the latest one); best = their longest such run ever.
export function attendanceStreaks(matches) {
  const allDates = [...new Set(matches.map((m) => m.date).filter(Boolean))].sort();
  const dateIdx = {};
  allDates.forEach((d, i) => (dateIdx[d] = i));
  const playerDates = {};
  matches.forEach((m) => {
    [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
      (playerDates[p] || (playerDates[p] = new Set())).add(m.date);
    });
  });
  return Object.entries(playerDates)
    .map(([name, datesSet]) => {
      const idxs = [...datesSet].map((d) => dateIdx[d]).sort((a, b) => a - b);
      const idxSet = new Set(idxs);
      let best = 0, run = 0, prev = -2;
      idxs.forEach((i) => { run = i === prev + 1 ? run + 1 : 1; best = Math.max(best, run); prev = i; });
      let current = 0;
      for (let i = allDates.length - 1; i >= 0; i--) {
        if (idxSet.has(i)) current++; else break;
      }
      return { name, best, current, sessionsPlayed: datesSet.size, totalSessions: allDates.length };
    })
    .sort((a, b) => b.current - a.current || b.best - a.best);
}

// ── Hall of Fame / all-time records ──
export function hallOfFameRecords(matches, statsArr, eloHistoryMap, assHistoryMap) {
  if (!matches.length) return null;
  let biggestWin = null;
  matches.forEach((m) => {
    const margin = Math.abs(m.scoreA - m.scoreB);
    if (!biggestWin || margin > biggestWin.margin) {
      const aWon = m.scoreA > m.scoreB;
      biggestWin = {
        margin, date: m.date,
        winners: aWon ? m.teamA : m.teamB,
        losers: aWon ? m.teamB : m.teamA,
        score: `${Math.max(m.scoreA, m.scoreB)}-${Math.min(m.scoreA, m.scoreB)}`,
      };
    }
  });
  const longestStreak = [...(statsArr || [])].sort((a, b) => (b.bestStreak || 0) - (a.bestStreak || 0))[0];
  const byDate = {};
  matches.forEach((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
      const key = `${p}|${m.date}`;
      byDate[key] = (byDate[key] || 0) + 1;
    }),
  );
  let mostInDay = null;
  Object.entries(byDate).forEach(([key, n]) => {
    if (!mostInDay || n > mostInDay.n) {
      const [name, date] = key.split("|");
      mostInDay = { name, date, n };
    }
  });
  const peakOf = (histMap) => {
    let peak = null;
    Object.entries(histMap || {}).forEach(([name, hist]) => {
      hist.forEach((h) => { if (!peak || h.elo > peak.val) peak = { name, val: h.elo, date: h.date }; });
    });
    return peak;
  };
  return {
    biggestWin,
    longestStreak,
    mostInDay,
    peakElo: peakOf(eloHistoryMap),
    peakAss: peakOf(assHistoryMap),
    totalMatches: matches.length,
    totalDays: new Set(matches.map((m) => m.date)).size,
  };
}

// ── Milestone timeline ──
export function buildMilestoneTimeline(sortedMatches) {
  const events = [];
  if (!sortedMatches.length) return events;
  events.push({ date: sortedMatches[0].date, icon: "🎬", text: "First match ever played" });
  const seen = new Set();
  sortedMatches.forEach((m, i) => {
    [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
      if (!seen.has(p)) {
        seen.add(p);
        events.push({ date: m.date, icon: "👋", text: `${p} played their first match` });
      }
    });
    const count = i + 1;
    if ([50, 100, 200, 500, 1000, 1500, 2000].includes(count)) {
      events.push({ date: m.date, icon: "🎯", text: `${count}th match played` });
    }
  });
  const byDate = {};
  sortedMatches.forEach((m) => { byDate[m.date] = (byDate[m.date] || 0) + 1; });
  const busiest = Object.entries(byDate).sort((a, b) => b[1] - a[1])[0];
  if (busiest && busiest[1] >= 5) {
    events.push({ date: busiest[0], icon: "📅", text: `Busiest day ever — ${busiest[1]} matches played` });
  }
  return events.filter((e) => e.date).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}

// ── Weighted MVP composite score ──
// Each component min-max normalized to 0-100 across the given player set
// before weighting, so the formula works regardless of ELO/ASS scale or
// match-count range: rating gain 40% · win% 30% · attendance 20% · upsets 10%.
export function weightedMvpScore(players) {
  if (!players || !players.length) return [];
  const norm = (key) => {
    const vals = players.map((p) => p[key] || 0);
    const min = Math.min(...vals), max = Math.max(...vals);
    const range = max - min || 1;
    return (v) => ((v - min) / range) * 100;
  };
  const nRating = norm("ratingGain"), nWin = norm("winPct"),
    nAtt = norm("attendance"), nUps = norm("upsets");
  return players
    .map((p) => ({
      ...p,
      composite: Math.round(
        nRating(p.ratingGain || 0) * 0.4 +
        nWin(p.winPct || 0) * 0.3 +
        nAtt(p.attendance || 0) * 0.2 +
        nUps(p.upsets || 0) * 0.1,
      ),
    }))
    .sort((a, b) => b.composite - a.composite);
}

// ── Per-player streak segments (for the streak Gantt timeline) ──
export function streakSegments(sortedMatches, playerName) {
  const pm = sortedMatches.filter(
    (m) => (m.teamA || []).includes(playerName) || (m.teamB || []).includes(playerName),
  );
  const segments = [];
  let cur = null;
  pm.forEach((m) => {
    const inA = (m.teamA || []).includes(playerName);
    const won = inA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
    const type = won ? "W" : "L";
    if (cur && cur.type === type) { cur.length++; cur.endDate = m.date; }
    else { cur = { type, length: 1, startDate: m.date, endDate: m.date }; segments.push(cur); }
  });
  return segments;
}

// ── Rolling win% (windowed, per match) ──
export function rollingWinPct(sortedMatches, playerName, window = 10) {
  const pm = sortedMatches.filter(
    (m) => (m.teamA || []).includes(playerName) || (m.teamB || []).includes(playerName),
  );
  return pm.map((m, i) => {
    const slice = pm.slice(Math.max(0, i - window + 1), i + 1);
    const wins = slice.filter((mm) => {
      const inA = (mm.teamA || []).includes(playerName);
      return inA ? mm.scoreA > mm.scoreB : mm.scoreB > mm.scoreA;
    }).length;
    return { date: m.date, pct: Math.round((wins / slice.length) * 100) };
  });
}

// ── Waterfall top-moves ──
// Given a player's rating history ([{date, elo:runningValue, delta, ...}]),
// returns their N biggest single-match rating swings in chronological order.
export function waterfallTopMoves(historyArr, n = 8) {
  if (!historyArr || !historyArr.length) return [];
  return [...historyArr]
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, n)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}
