// ── MILESTONE & ANNIVERSARY TRACKING ──────────────────────
// Detects player achievements when matches are committed and fires
// toast + confetti. Also fires anniversary toasts on app startup.
// Calls window.showToast / window.fireConfetti (already on window).
import { state } from "../src/engine/state.js";
import { computeStats } from "../src/engine/stats.js";
import { computeElo, computeEloPeaks } from "../src/engine/elo.js";
import { computeASS, computeASSTimeline } from "../src/engine/ass.js";
import { normPlayer } from "../src/domain/players.js";
import { todayISO } from "../src/engine/dates.js";

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
  } catch (e) {}
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
  // Check for win streaks hitting milestones
  const streakMilestones = [3, 5, 10];
  allPlayers.forEach((player) => {
    const prevStats = computeStats(prevMatches);
    const newStats = computeStats(newMatches);
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
    // Rank change (top 3)
    const prevRank = prevStats.findIndex((s) => s.name === player) + 1;
    const newRank = newStats.findIndex((s) => s.name === player) + 1;
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
  // ELO threshold milestones
  const eloThresholds = [1050, 1100, 1150, 1200, 1250, 1300];
  if (prevMatches.length > 0) {
    const prevEloMap = computeElo(prevMatches);
    const newEloMap = computeElo(newMatches);
    allPlayers.forEach((player) => {
      const prev = prevEloMap[player] || 1000;
      const curr = newEloMap[player] || 1000;
      eloThresholds.forEach((t) => {
        if (prev < t && curr >= t) {
          const display = normPlayer(player);
          window.showToast(`${display} hit ELO ${t}!`, "⚡");
          saveMilestoneEntry(`${display} hit ELO ${t}!`, "⚡");
          window.fireConfetti({ count: 90, duration: 2400 });
        }
      });
    });
  }
  // Record-break celebrations: new all-time rating peak (ELO/ASS, at any
  // level — not just the fixed thresholds above) and new personal-best win
  // streak, both compared against the player's own history before this match.
  // Gated to players with an established history (10+ prior matches) — early
  // on, every win is trivially a "new peak", which would fire on nearly every
  // match and cheapen the celebration.
  const MIN_MATCHES_FOR_RECORD = 10;
  if (prevMatches.length >= MIN_MATCHES_FOR_RECORD) {
    const prevMatchCounts = {};
    prevMatches.forEach((m) =>
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
        prevMatchCounts[p] = (prevMatchCounts[p] || 0) + 1;
      }),
    );
    const prevEloPeaks = computeEloPeaks(prevMatches);
    const newEloNow = computeElo(newMatches);
    const prevAssPeaks = computeASSTimeline(prevMatches).peaks;
    const newAssNow = computeASS(newMatches);
    const prevBestStreak = _bestStreakMap(prevMatches);
    const newBestStreak = _bestStreakMap(newMatches);
    allPlayers.forEach((player) => {
      if ((prevMatchCounts[player] || 0) < MIN_MATCHES_FOR_RECORD) return;
      const display = normPlayer(player);
      const prevPeakElo = prevEloPeaks[player] || 1000;
      const curElo = newEloNow[player] || 1000;
      if (curElo > prevPeakElo) {
        window.showToast(`${display} hit a new all-time ELO peak: ${Math.round(curElo)}!`, "📈");
        saveMilestoneEntry(`${display} hit a new all-time ELO peak: ${Math.round(curElo)}!`, "📈");
        window.fireConfetti({ count: 90, duration: 2200 });
      }
      const prevPeakAss = prevAssPeaks[player] || 1000;
      const curAss = newAssNow[player] || 1000;
      if (curAss > prevPeakAss) {
        window.showToast(`${display} hit a new all-time ASS peak: ${Math.round(curAss)}!`, "🏆");
        saveMilestoneEntry(`${display} hit a new all-time ASS peak: ${Math.round(curAss)}!`, "🏆");
        window.fireConfetti({ count: 90, duration: 2200 });
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
  } catch (e) {}
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
  } catch (e) {}
}
