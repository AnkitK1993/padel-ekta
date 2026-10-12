// ── MILESTONE & ANNIVERSARY TRACKING ──────────────────────
// Detects player achievements when matches are committed and fires
// toast + confetti. Also fires anniversary toasts on app startup.
// Calls window.showToast / window.fireConfetti (already on window).
import { state } from "../src/domain/state.js";
import { computeStats } from "../src/domain/stats.js";
import { rating, scopeKey } from "../src/domain/rating-service.js";
import { normPlayer } from "../src/domain/players.js";
import { todayISO } from "../src/domain/dates.js";
import { isRatedMatch } from "../src/domain/selectors.js";

import { noteError } from "../src/infra/log.js";
// Best-ever win streak per player, walked fresh from a match array — used to
// detect "new personal-best streak" independent of the fixed 3/5/10 thresholds.
function _bestStreakMap(matches) {
  const sorted = [...matches].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const cur = {}, best = {};
  sorted.forEach((m) => {
    const aWon = m.scoreA > m.scoreB;
    [[m.teamA || [], aWon], [m.teamB || [], !aWon]].forEach(([team, won]) => {
      team.forEach((p) => {
        cur[p] = won ? (cur[p] || 0) + 1 : 0;
        if ((cur[p] || 0) > (best[p] || 0)) best[p] = cur[p];
      });
    });
  });
  return best;
}

const MILESTONE_LOG_KEY = "padel_milestone_log";

export function getMilestoneLog() {
  try {
    return JSON.parse(localStorage.getItem(MILESTONE_LOG_KEY)) || [];
  } catch (e) {
    return [];
  }
}

export function saveMilestoneEntry(msg, emoji) {
  const log = getMilestoneLog();
  log.unshift({ msg, emoji, date: todayISO() });
  if (log.length > 100) log.length = 100;
  try {
    localStorage.setItem(MILESTONE_LOG_KEY, JSON.stringify(log));
  } catch (e) {
    noteError("milestones:saveMilestoneEntry", e);
  }
}

export function checkMilestones(prevMatches, newMatches) {
  const milestones = [10, 25, 50, 100, 200];
  const allPlayers = new Set();
  newMatches.forEach((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => allPlayers.add(p)),
  );
  allPlayers.forEach((player) => {
    const prevCount = prevMatches.filter(
      (m) =>
        (m.teamA || []).includes(player) || (m.teamB || []).includes(player),
    ).length;
    const newCount = newMatches.filter(
      (m) =>
        (m.teamA || []).includes(player) || (m.teamB || []).includes(player),
    ).length;
    milestones.forEach((n) => {
      if (prevCount < n && newCount >= n) {
        window.showToast(`${player} hit ${n} matches!`, "🏅");
        saveMilestoneEntry(`${player} hit ${n} matches!`, "🏅");
        if (n >= 50) window.fireConfetti({ count: 100, duration: 2400 });
      }
    });
  });
  // Rating milestones, ranks and records are judged on the active scoring
  // system over the leaderboard's own matches (rated ones), inside the season
  // the new match belongs to (ratings restart every season, so a cross-season
  // window would be a number no leaderboard ever shows).
  const label = rating.label();
  const latest = [...newMatches].sort((a, b) =>
    (b.date || "").localeCompare(a.date || ""),
  )[0];
  const scope = latest ? scopeKey(latest) : null;
  const inScope = (m) => scopeKey(m) === scope && isRatedMatch(m);
  const prevScope = latest ? prevMatches.filter(inScope) : [];
  const newScope = latest ? newMatches.filter(inScope) : [];

  // Win streaks (all matches) — computed once, not once per player.
  const streakMilestones = [3, 5, 10];
  const prevStats = computeStats(prevMatches);
  const newStats = computeStats(newMatches);
  // Leaderboard order (the same ranking the Summary tab shows).
  const prevRanked = prevScope.length ? rating.stats(prevScope) : [];
  const newRanked = newScope.length ? rating.stats(newScope) : [];
  allPlayers.forEach((player) => {
    const prev = prevStats.find((s) => s.name === player);
    const cur = newStats.find((s) => s.name === player);
    if (!prev || !cur) return;
    streakMilestones.forEach((n) => {
      if (
        (prev.curStreak || 0) < n &&
        (cur.curStreak || 0) >= n &&
        cur.curType === "W"
      ) {
        window.showToast(`${player} is on a ${n}-match win streak!`, "🔥");
        saveMilestoneEntry(`${player} is on a ${n}-match win streak!`, "🔥");
      }
    });
    // Rank change (top 3), on the leaderboard's ranking.
    if (!prevRanked.length) return;
    const prevRank = prevRanked.findIndex((s) => s.name === player) + 1;
    const newRank = newRanked.findIndex((s) => s.name === player) + 1;
    if (!prevRank || !newRank) return;
    if (prevRank > 1 && newRank === 1) {
      window.showToast(`${player} is now #1!`, "👑");
      saveMilestoneEntry(`${player} is now #1!`, "👑");
      window.fireConfetti({ count: 150, duration: 3000 });
    } else if (prevRank > 3 && newRank <= 3) {
      window.showToast(`${player} entered the Top 3!`, "🥉");
      saveMilestoneEntry(`${player} entered the Top 3!`, "🥉");
      window.fireConfetti({ count: 80, duration: 2200 });
    }
  });
  if (prevScope.length > 0) {
    const prevMap = rating.map(prevScope);
    const newMap = rating.map(newScope);
    allPlayers.forEach((player) => {
      const prev = prevMap[player] ?? rating.def();
      const curr = newMap[player] ?? rating.def();
      rating.ladder().steps.forEach((t) => {
        if (prev < t && curr >= t) {
          const display = normPlayer(player);
          window.showToast(`${display} hit ${label} ${t}!`, "⚡");
          saveMilestoneEntry(`${display} hit ${label} ${t}!`, "⚡");
          window.fireConfetti({ count: 90, duration: 2400 });
        }
      });
    });
  }
  // Record-break celebrations: new season-high rating (at any level — not just
  // the fixed rungs above) and new personal-best win streak, both compared
  // against the player's own history before this match.
  // Gated to players with an established history (10+ prior matches) — early
  // on, every win is trivially a "new peak", which would fire on nearly every
  // match and cheapen the celebration. The rating record needs those 10
  // matches inside the current season, since the season-high resets with it.
  const MIN_MATCHES_FOR_RECORD = 10;
  const countMatches = (arr) => {
    const counts = {};
    arr.forEach((m) =>
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
        counts[p] = (counts[p] || 0) + 1;
      }),
    );
    return counts;
  };
  if (prevMatches.length >= MIN_MATCHES_FOR_RECORD) {
    const prevMatchCounts = countMatches(prevMatches);
    const prevScopeCounts = countMatches(prevScope);
    const prevPeaks = prevScope.length ? rating.timeline(prevScope).peaks : {};
    const nowMap = rating.map(newScope);
    const prevBestStreak = _bestStreakMap(prevMatches);
    const newBestStreak = _bestStreakMap(newMatches);
    allPlayers.forEach((player) => {
      if ((prevMatchCounts[player] || 0) < MIN_MATCHES_FOR_RECORD) return;
      const display = normPlayer(player);
      if ((prevScopeCounts[player] || 0) >= MIN_MATCHES_FOR_RECORD) {
        const prevPeak = prevPeaks[player] ?? rating.def();
        const cur = nowMap[player] ?? rating.def();
        if (cur > prevPeak) {
          const msg = `${display} hit a new season-high ${label}: ${rating.fmt(cur)}!`;
          window.showToast(msg, "🏆");
          saveMilestoneEntry(msg, "🏆");
          window.fireConfetti({ count: 90, duration: 2200 });
        }
      }
      const pb = prevBestStreak[player] || 0;
      const nb = newBestStreak[player] || 0;
      if (nb > pb && pb >= 2) {
        window.showToast(`${display} set a new personal-best streak: ${nb} wins in a row!`, "🚀");
        saveMilestoneEntry(`${display} set a new personal-best streak: ${nb} wins in a row!`, "🚀");
        window.fireConfetti({ count: 100, duration: 2400 });
      }
    });
  }
}

export function _checkAnniversaries() {
  if (!state.matches || !state.matches.length) return;
  const today = new Date();
  const tMM = String(today.getMonth() + 1).padStart(2, "0");
  const tDD = String(today.getDate()).padStart(2, "0");
  const tY = today.getFullYear();
  let seen = "";
  try {
    seen = sessionStorage.getItem("padel_anniv_shown") || "";
  } catch (e) {
    noteError("milestones:_checkAnniversaries", e);
  }
  const firstSeen = {};
  for (const m of state.matches) {
    if (!m.date) continue;
    [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
      if (!firstSeen[p] || m.date < firstSeen[p]) firstSeen[p] = m.date;
    });
  }
  const anniversaries = [];
  for (const [name, firstDate] of Object.entries(firstSeen)) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(firstDate || "");
    if (!m) continue;
    const [, fY, fMM, fDD] = m;
    if (fMM === tMM && fDD === tDD && tY > parseInt(fY, 10)) {
      const yrs = tY - parseInt(fY, 10);
      const key = `${name}-${tY}`;
      if (seen.includes(key)) continue;
      anniversaries.push({ name, yrs, key });
    }
  }
  if (!anniversaries.length) return;
  let allKeys = seen;
  anniversaries.forEach((a, i) => {
    setTimeout(() => {
      window.showToast(
        `${a.name}: ${a.yrs} year${a.yrs > 1 ? "s" : ""} since their first match!`,
        "🎂",
        6000,
      );
      window.fireConfetti({ count: 70, duration: 2400 });
    }, i * 2500);
    allKeys += "|" + a.key;
  });
  try {
    sessionStorage.setItem("padel_anniv_shown", allKeys);
  } catch (e) {
    noteError("milestones:_checkAnniversaries", e);
  }
}
