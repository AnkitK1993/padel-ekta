// ── PLAYER DETAIL FEATURE MODULE ─────────────────────────────────────────────
// Extracted from app.js: getPlayerDetail, all _pd* builders, openPlayerDetail,
// _buildStreakCalendarHtml, streakCalDayClick, _dowDayRecord.
// Dependency injection via initPlayerDetailDeps for playerAvatar (uses photoMap).
import { activeMatches } from "../src/engine/selectors.js";
import { normPlayer, getPlayerDateRange } from "../src/domain/players.js";
import { state } from "../src/engine/state.js";
import { computeStats, eloToSr } from "../src/engine/stats.js";
import { computeElo, computeEloHistory } from "../src/engine/elo.js";
import { computeMatchASSDeltas } from "../src/engine/ass.js";
import {
  computeAchievements,
  computeArchetype,
  computePlayerForm,
  computeChemistryScores,
} from "../src/engine/player-analytics.js";
import { computeBadges } from "../src/engine/badges.js";
import {
  computePlayerXP,
  getPlayerLevel,
  xpThreshold,
  getPrestigeTier,
} from "../src/engine/xp.js";
import { getHeadToHeadStats } from "../src/engine/pairs.js";
import { lastWeekRange } from "../src/engine/dates.js";
import {
  memoElo,
  memoStats,
  memoASS,
  memoASSHistory,
  memoEloPeaks,
  memoEloLows,
  memoASSPeaks,
  memoASSLows,
  memoPairStats,
} from "../src/app/memo-store.js";
import {
  escHtml,
  jsArg,
  fmtDate,
  playerColor,
  playerInitials,
  getSRRatingClass,
  _rankColor,
  toLocalISODate,
} from "../src/ui/format.js";
import {
  buildSummaryMatchRow,
  isFireMatch,
  isDominatingMatch,
  isZeroMatch,
} from "../src/ui/render-match-rows.js";
import { emptyState } from "../src/ui/components.js";

// ── Injected deps ─────────────────────────────────────────────────────────────
// playerAvatar uses photoMap from app.js, so it must be injected.
let _playerAvatar = (name, size = 26) => {
  const col = playerColor(name);
  const fs = Math.round(size * 0.38);
  return `<span class="p-av" style="width:${size}px;height:${size}px;min-width:${size}px;font-size:${fs}px;background:${col}22;border:1.5px solid ${col};color:${col}">${playerInitials(name)}</span>`;
};

export function initPlayerDetailDeps({ playerAvatar }) {
  if (playerAvatar) _playerAvatar = playerAvatar;
}

function getPlayerDetail(name) {
  const matches = activeMatches().filter((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].some(
      (p) => normPlayer(p) === name,
    ),
  );
  const stats = memoStats().find(
    (p) => p.name === name,
  );
  const teammateCounts = {};
  const opponentCounts = {};
  const sortedMatches = [...matches].sort((a, b) => {
    const da = new Date(a.date || "1970-01-01");
    const db = new Date(b.date || "1970-01-01");
    return da - db;
  });
  let currentStreak = 0;
  let currentType = null;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let shutoutWins = 0;
  let shutoutLosses = 0;
  sortedMatches.forEach((m) => {
    const inA = (m.teamA || []).some((p) => normPlayer(p) === name);
    const own = inA ? Number(m.scoreA) : Number(m.scoreB);
    const opp = inA ? Number(m.scoreB) : Number(m.scoreA);
    const won = own > opp;
    if (won) {
      if (currentType === "win") currentStreak += 1;
      else {
        currentType = "win";
        currentStreak = 1;
      }
      maxWinStreak = Math.max(maxWinStreak, currentStreak);
    } else {
      if (currentType === "loss") currentStreak += 1;
      else {
        currentType = "loss";
        currentStreak = 1;
      }
      maxLossStreak = Math.max(maxLossStreak, currentStreak);
    }
    if (won && opp === 0) shutoutWins += 1;
    if (!won && own === 0) shutoutLosses += 1;
    const teammates = (inA ? m.teamA : m.teamB)
      .map(normPlayer)
      .filter((p) => p !== name);
    const opponents = (inA ? m.teamB : m.teamA).map(normPlayer);
    teammates.forEach(
      (p) => (teammateCounts[p] = (teammateCounts[p] || 0) + 1),
    );
    opponents.forEach(
      (p) => (opponentCounts[p] = (opponentCounts[p] || 0) + 1),
    );
  });
  const recent = sortedMatches.slice(-8).map((m) => {
    const inA = (m.teamA || []).some((p) => normPlayer(p) === name);
    const own = inA ? Number(m.scoreA) : Number(m.scoreB);
    const opp = inA ? Number(m.scoreB) : Number(m.scoreA);
    const won = own > opp;
    const opponents = (inA ? m.teamB : m.teamA).map(normPlayer);
    return {
      date: m.date,
      won,
      score: `${own}-${opp}`,
      opponents: opponents.join(" & "),
    };
  });
  const topMate = Object.entries(teammateCounts).sort((a, b) => b[1] - a[1])[0];
  const toughOpp = Object.entries(opponentCounts).sort(
    (a, b) => b[1] - a[1],
  )[0];
  return {
    stats,
    matches,
    recent,
    topMate,
    toughOpp,
    maxWinStreak,
    maxLossStreak,
    shutoutWins,
    shutoutLosses,
  };
}
function _buildStreakCalendarHtml(name) {
  if (!name) return "";
  // Count matches per day for this player over the last 52 weeks
  const playerMatches = activeMatches().filter((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].includes(name),
  );
  const dayCount = {};
  const dayMatches = {};
  playerMatches.forEach((m) => {
    if (!m.date) return;
    dayCount[m.date] = (dayCount[m.date] || 0) + 1;
    (dayMatches[m.date] = dayMatches[m.date] || []).push(m);
  });
  if (!Object.keys(dayCount).length) return "";

  // Last 52 weeks ending today, but align end column to current week (Sunday)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (6 - today.getDay())); // upcoming Saturday
  const startOfWeek = new Date(endOfWeek);
  startOfWeek.setDate(endOfWeek.getDate() - 52 * 7 + 1);

  const monthLabels = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];

  // Build columns (weeks) × rows (Sun=0..Sat=6)
  const cols = [];
  let cur = new Date(startOfWeek);
  cur.setDate(cur.getDate() - cur.getDay()); // align to Sunday
  let maxCount = 1;
  Object.values(dayCount).forEach((c) => {
    if (c > maxCount) maxCount = c;
  });
  while (cur <= endOfWeek) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const iso = toLocalISODate(cur);
      const isFuture = cur > today;
      week.push({
        iso,
        count: dayCount[iso] || 0,
        isFuture,
        month: cur.getMonth(),
      });
      cur.setDate(cur.getDate() + 1);
    }
    cols.push(week);
  }

  // Intensity bucket: 0, 1, 2-3, 4+
  const bucket = (n) =>
    n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 5 ? 3 : 4;

  // Build SVG-like div grid
  let lastMonth = -1;
  const monthHeader = cols
    .map((col, i) => {
      const firstDay = col.find((d) => !d.isFuture && d.iso);
      if (!firstDay) return `<div class="sc-mlbl"></div>`;
      const m = firstDay.month;
      if (m !== lastMonth && col[0].iso.endsWith("-01")) {
        lastMonth = m;
        return `<div class="sc-mlbl">${monthLabels[m]}</div>`;
      }
      // Also show label at first week of new month
      if (
        i > 0 &&
        cols[i - 1].some((d) => d.month !== m) &&
        col.some((d) => d.month === m && parseInt(d.iso.slice(8), 10) <= 7)
      ) {
        if (m !== lastMonth) {
          lastMonth = m;
          return `<div class="sc-mlbl">${monthLabels[m]}</div>`;
        }
      }
      return `<div class="sc-mlbl"></div>`;
    })
    .join("");

  const colsHtml = cols
    .map((col) => {
      const cells = col
        .map((d) => {
          if (d.isFuture)
            return `<div class="sc-cell sc-future" title=""></div>`;
          const b = bucket(d.count);
          const ttl = d.count
            ? `${d.iso} · ${d.count} match${d.count > 1 ? "es" : ""}`
            : d.iso;
          const click = d.count
            ? `onclick="streakCalDayClick(${jsArg(d.iso)}, ${jsArg(name)})"`
            : "";
          return `<div class="sc-cell sc-b${b}" title="${escHtml(ttl)}" ${click}></div>`;
        })
        .join("");
      return `<div class="sc-col">${cells}</div>`;
    })
    .join("");

  const total = Object.values(dayCount).reduce((s, c) => s + c, 0);
  const activeDays = Object.keys(dayCount).length;
  const legend = `<div class="sc-legend">
    <span>Less</span>
    ${[0, 1, 2, 3, 4].map((b) => `<div class="sc-cell sc-b${b}"></div>`).join("")}
    <span>More</span>
  </div>`;

  return `<div class="ana-card sc-card">
    <span class="badge">Activity Calendar — last 52 weeks</span>
    <div class="sc-stats">${total} matches · ${activeDays} active days</div>
    <div class="sc-scroll">
      <div class="sc-monthrow">${monthHeader}</div>
      <div class="sc-grid">${colsHtml}</div>
    </div>
    ${legend}
  </div>`;
}

function streakCalDayClick(date, playerName) {
  const dayMatches = activeMatches().filter(
    (m) =>
      m.date === date &&
      [...(m.teamA || []), ...(m.teamB || [])].includes(playerName),
  );
  if (!dayMatches.length) return;
  // Find first match index in state.matches
  const idx = state.matches.indexOf(dayMatches[0]);
  if (idx >= 0) {
    document.getElementById("player-detail-modal")?.remove();
    window.openMatchIntro(idx);
  }
}
// so no additional imports are needed.

function _pdBuildRadarHtml(name, form) {
  const eloMap = memoElo();
  const allStats = computeStats(activeMatches(), eloMap);
  const ps = allStats.find((p) => p.name === name);
  if (!ps || ps.mp < 3) return "";
  const allElos = Object.values(eloMap);
  const maxElo = Math.max(...allElos), minElo = Math.min(...allElos);
  const eloNorm = maxElo > minElo ? ((eloMap[name] || 1000) - minElo) / (maxElo - minElo) : 0.5;
  const winRateNorm = ps.mp > 0 ? ps.mw / ps.mp : 0;
  const closeMs = activeMatches().filter((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].includes(name) && Math.abs(m.scoreA - m.scoreB) <= 2,
  );
  const clutchNorm = closeMs.length >= 2
    ? closeMs.filter((m) => { const inA = (m.teamA || []).includes(name); return (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA); }).length / closeMs.length
    : 0.5;
  const formNorm = form ? form.score / 10 : winRateNorm;
  const maxMp = Math.max(...allStats.map((p) => p.mp), 1);
  const actNorm = ps.mp / maxMp;
  const margins = state.matches.filter((m) => [...(m.teamA || []), ...(m.teamB || [])].includes(name))
    .map((m) => { const inA = (m.teamA || []).includes(name); return (inA ? m.scoreA : m.scoreB) - (inA ? m.scoreB : m.scoreA); });
  const avgM = margins.reduce((s, v) => s + v, 0) / Math.max(margins.length, 1);
  const consistNorm = Math.min(1, Math.max(0, (avgM + 5) / 10));
  const activePlayers = allStats.filter((p) => p.mp >= 3);
  const _avg = (fn) => activePlayers.reduce((s, p) => s + fn(p), 0) / Math.max(activePlayers.length, 1);
  const avgWinRate = _avg((p) => (p.mp > 0 ? p.mw / p.mp : 0));
  const avgElo = _avg((p) => maxElo > minElo ? ((eloMap[p.name] || 1000) - minElo) / (maxElo - minElo) : 0.5);
  const avgClutch = _avg((p) => {
    const cMs = activeMatches().filter((m) => [...(m.teamA || []), ...(m.teamB || [])].includes(p.name) && Math.abs(m.scoreA - m.scoreB) <= 2);
    return cMs.length >= 2 ? cMs.filter((m) => { const inA = (m.teamA || []).includes(p.name); return (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA); }).length / cMs.length : 0.5;
  });
  const avgForm = _avg((p) => (p.mp > 0 ? p.mw / p.mp : 0));
  const avgAct  = _avg((p) => p.mp / maxMp);
  const avgConsist = _avg((p) => {
    const ms2 = state.matches.filter((m) => [...(m.teamA || []), ...(m.teamB || [])].includes(p.name))
      .map((m) => { const inA = (m.teamA || []).includes(p.name); return (inA ? m.scoreA : m.scoreB) - (inA ? m.scoreB : m.scoreA); });
    const a2 = ms2.reduce((a, v) => a + v, 0) / Math.max(ms2.length, 1);
    return Math.min(1, Math.max(0, (a2 + 5) / 10));
  });
  const axes = [
    { label: "WIN RATE", val: winRateNorm, avg: avgWinRate },
    { label: "ELO",      val: eloNorm,     avg: avgElo      },
    { label: "CLUTCH",   val: clutchNorm,  avg: avgClutch   },
    { label: "FORM",     val: formNorm,    avg: avgForm     },
    { label: "ACTIVITY", val: actNorm,     avg: avgAct      },
    { label: "MARGIN",   val: consistNorm, avg: avgConsist  },
  ];
  const N = axes.length, cx = 110, cy = 110, R = 78;
  const col = playerColor(name);
  const xy = (i, scale) => { const angle = (Math.PI * 2 * i) / N - Math.PI / 2; return { x: cx + scale * R * Math.cos(angle), y: cy + scale * R * Math.sin(angle) }; };
  const playerPts = axes.map((a, i) => xy(i, a.val));
  const avgPts    = axes.map((a, i) => xy(i, a.avg));
  const gridLines = [0.25, 0.5, 0.75, 1].map((sc) => {
    const g = axes.map((_, i) => { const p = xy(i, sc); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(" ");
    return `<polygon points="${g}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`;
  }).join("");
  const spokes = axes.map((_, i) => { const p = xy(i, 1); return `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`; }).join("");
  const polyPts    = playerPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const avgPolyPts = avgPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const labels = axes.map((a, i) => {
    const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
    const lx = cx + (R + 22) * Math.cos(angle), ly = cy + (R + 22) * Math.sin(angle);
    const anchor = Math.abs(lx - cx) < 6 ? "middle" : lx > cx ? "start" : "end";
    return `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="${anchor}" font-size="8" font-weight="700" fill="rgba(255,255,255,0.55)" font-family="DM Sans,sans-serif">${a.label}</text>`;
  }).join("");
  return `<div class="ana-card" style="overflow:visible"><span class="badge">Radar Profile</span>
    <svg viewBox="0 0 220 220" width="100%" style="max-width:260px;display:block;margin:8px auto 0;overflow:visible">
      ${gridLines}${spokes}
      <polygon points="${avgPolyPts}" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.28)" stroke-width="1.5" stroke-dasharray="4 3" stroke-linejoin="round"/>
      <polygon points="${polyPts}" fill="${col}" fill-opacity="0.18" stroke="${col}" stroke-width="2" stroke-linejoin="round"/>
      ${playerPts.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${col}"/>`).join("")}
      ${labels}
    </svg>
    <div style="display:flex;gap:14px;justify-content:center;margin-top:8px">
      <div style="display:flex;align-items:center;gap:5px"><div style="width:10px;height:10px;border-radius:50%;background:${col}"></div><span style="font-size:9px;color:var(--muted);font-weight:700;letter-spacing:0.06em">YOU</span></div>
      <div style="display:flex;align-items:center;gap:5px"><div style="width:12px;height:0;border-top:1.5px dashed rgba(255,255,255,0.35)"></div><span style="font-size:9px;color:var(--muted);font-weight:700;letter-spacing:0.06em">AVG</span></div>
    </div></div>`;
}

function _pdBuildFormGraphHtml(name, graphMatches) {
  if (graphMatches.length < 3) return "";
  const WINDOW = 5, W = 260, H = 56, PAD = 8;
  const wins = graphMatches.map((m) => {
    const inA = (m.teamA || []).some((p) => normPlayer(p) === name);
    const own = inA ? Number(m.scoreA) : Number(m.scoreB);
    const opp = inA ? Number(m.scoreB) : Number(m.scoreA);
    return own > opp ? 1 : 0;
  });
  const rates = wins.map((_, i) => { const sl = wins.slice(Math.max(0, i - WINDOW + 1), i + 1); return sl.reduce((s, v) => s + v, 0) / sl.length; });
  const n = rates.length;
  const xs = rates.map((_, i) => PAD + (i / (n - 1)) * (W - PAD * 2));
  const ys = rates.map((r) => H - PAD - r * (H - PAD * 2));
  const pathD = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const areaD = pathD + ` L${xs[n - 1].toFixed(1)},${(H - PAD).toFixed(1)} L${xs[0].toFixed(1)},${(H - PAD).toFixed(1)} Z`;
  const last = rates[n - 1];
  const lineColor = last >= 0.6 ? "#36d47e" : last <= 0.4 ? "#f04f4f" : "#f5c842";
  const gId = `fg_${name.replace(/\W+/g, "_")}`;
  const dots = xs.map((x, i) => `<circle cx="${x.toFixed(1)}" cy="${ys[i].toFixed(1)}" r="2.5" fill="${wins[i] ? "#36d47e" : "#f04f4f"}"/>`).join("");
  return `<div class="ana-card">
    <span class="badge">Form Graph</span>
    <div style="margin-top:10px">
      <svg width="100%" height="56" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="display:block;overflow:visible">
        <defs><linearGradient id="${gId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${lineColor}" stop-opacity="0.25"/><stop offset="100%" stop-color="${lineColor}" stop-opacity="0"/></linearGradient></defs>
        <line x1="${PAD}" y1="${(H / 2).toFixed(1)}" x2="${(W - PAD).toFixed(1)}" y2="${(H / 2).toFixed(1)}" stroke="rgba(255,255,255,0.07)" stroke-width="1" stroke-dasharray="4,4"/>
        <path d="${areaD}" fill="url(#${gId})"/>
        <path d="${pathD}" fill="none" stroke="${lineColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        ${dots}
      </svg>
      <div style="display:flex;justify-content:space-between;margin-top:5px">
        <span class="sub">rolling 5-match win rate · last ${n}</span>
        <span style="font-size:11px;font-weight:800;color:${lineColor}">${(last * 100).toFixed(0)}%</span>
      </div>
    </div>
  </div>`;
}

function _pdBuildEloTimelineHtml(name) {
  const sorted = [...state.matches].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const playerMs = sorted.filter((m) => [...(m.teamA || []), ...(m.teamB || [])].includes(name));
  if (playerMs.length < 3) return "";
  const elo = {}, pts = [];
  sorted.forEach((m) => {
    const allP = [...(m.teamA || []), ...(m.teamB || [])];
    allP.forEach((p) => { if (!(p in elo)) elo[p] = 1000; });
    const aWon = m.scoreA > m.scoreB;
    const avgA = m.teamA.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamA.length, 1);
    const avgB = m.teamB.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamB.length, 1);
    const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
    const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
    const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
    m.teamA.forEach((p) => { elo[p] = (elo[p] || 1000) + dA; });
    m.teamB.forEach((p) => { elo[p] = (elo[p] || 1000) + dB; });
    if ([...(m.teamA || []), ...(m.teamB || [])].includes(name)) {
      const inA = (m.teamA || []).includes(name);
      pts.push({ elo: elo[name], date: m.date, won: inA ? aWon : !aWon });
    }
  });
  if (pts.length < 3) return "";
  const W = 300, H = 90, pl = 36, pr = 8, pt = 8, pb = 18, cW = W - pl - pr, cH = H - pt - pb;
  const minE = Math.min(...pts.map((p) => p.elo)) - 20;
  const maxE = Math.max(...pts.map((p) => p.elo)) + 20;
  const eRange = Math.max(1, maxE - minE);
  const toX = (i) => pl + (i / (pts.length - 1 || 1)) * cW;
  const toY = (e) => pt + (1 - (e - minE) / eRange) * cH;
  const yLines = [minE + eRange * 0.25, minE + eRange * 0.5, minE + eRange * 0.75].map((ev) => {
    const y = toY(ev);
    return `<line x1="${pl}" y1="${y.toFixed(1)}" x2="${W - pr}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/><text x="${pl - 3}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="7" fill="rgba(255,255,255,0.3)">${Math.round(ev)}</text>`;
  }).join("");
  const polyline = pts.map((p, i) => `${toX(i).toFixed(1)},${toY(p.elo).toFixed(1)}`).join(" ");
  const area = `M${toX(0).toFixed(1)},${(H - pb).toFixed(1)} ` + pts.map((p, i) => `L${toX(i).toFixed(1)},${toY(p.elo).toFixed(1)}`).join(" ") + ` L${toX(pts.length - 1).toFixed(1)},${(H - pb).toFixed(1)} Z`;
  const col = playerColor(name);
  const circles = pts.map((p, i) => `<circle cx="${toX(i).toFixed(1)}" cy="${toY(p.elo).toFixed(1)}" r="2.5" fill="${p.won ? "var(--green)" : "var(--red)"}" stroke="rgba(0,0,0,0.4)" stroke-width="0.5"><title>${p.date}: ELO ${p.elo} (${p.won ? "W" : "L"})</title></circle>`).join("");
  const lastElo = pts[pts.length - 1].elo, firstElo = pts[0].elo;
  const netChange = lastElo - firstElo;
  const netStr = netChange > 0 ? `+${netChange}` : `${netChange}`;
  const netCol = netChange > 0 ? "var(--green)" : netChange < 0 ? "var(--red)" : "var(--muted)";
  const peakElo = Math.max(...pts.map((p) => p.elo));
  const peakPt  = pts.find((p) => p.elo === peakElo);
  const valleyElo = Math.min(...pts.map((p) => p.elo));
  const valleyPt  = pts.find((p) => p.elo === valleyElo);
  const fromPeak  = lastElo - peakElo;
  const fromPeakLabel = fromPeak === 0
    ? `<span style="color:var(--green);font-weight:700">▲ Currently at peak</span>`
    : `<span style="color:var(--red);font-weight:700">${fromPeak} from peak</span>`;
  return `<div class="ana-card"><span class="badge">ELO Timeline</span>
    <div style="display:flex;justify-content:space-between;align-items:center;margin:6px 0 4px">
      <div style="font-size:9px;color:var(--muted)">● W &nbsp; ● L &nbsp; · ${pts.length} matches</div>
      <div style="font-size:12px;font-weight:800;color:${netCol}">${netStr} ELO total</div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
      <div style="font-size:9px;color:var(--muted)">▲ Peak: <span style="color:var(--green);font-weight:800;font-size:11px">${peakElo}</span><span style="color:var(--muted);margin-left:4px">(${fmtDate(peakPt?.date)})</span></div>
      <div style="font-size:9px">${fromPeakLabel}</div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div style="font-size:9px;color:var(--muted)">▼ Low: <span style="color:var(--red);font-weight:800;font-size:11px">${valleyElo}</span><span style="color:var(--muted);margin-left:4px">(${fmtDate(valleyPt?.date)})</span></div>
      <div style="font-size:9px;color:var(--muted)">Range: <span style="font-weight:700;color:var(--fg)">${peakElo - valleyElo}</span></div>
    </div>
    <div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block;overflow:visible">
      ${yLines}
      <defs><linearGradient id="etg_${name.replace(/\s/g, "")}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${col}" stop-opacity="0.25"/><stop offset="100%" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
      <path d="${area}" fill="url(#etg_${name.replace(/\s/g, "")})" />
      <polyline points="${polyline}" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${circles}
      <text x="${toX(pts.length - 1).toFixed(1)}" y="${(toY(lastElo) - 5).toFixed(1)}" text-anchor="middle" font-size="8" font-weight="800" fill="${col}">${lastElo}</text>
    </svg></div>
  </div>`;
}

function _pdBuildASSTimelineHtml(name) {
  const pts = (memoASSHistory()[name] || []).map((h) => ({ elo: h.elo, date: h.date, won: h.won }));
  if (pts.length < 3) return "";
  const W = 300, H = 90, pl = 36, pr = 8, pt = 8, pb = 18, cW = W - pl - pr, cH = H - pt - pb;
  const minE = Math.min(...pts.map((p) => p.elo)) - 20;
  const maxE = Math.max(...pts.map((p) => p.elo)) + 20;
  const eRange = Math.max(1, maxE - minE);
  const toX = (i) => pl + (i / (pts.length - 1 || 1)) * cW;
  const toY = (e) => pt + (1 - (e - minE) / eRange) * cH;
  const yLines = [minE + eRange * 0.25, minE + eRange * 0.5, minE + eRange * 0.75].map((ev) => {
    const y = toY(ev);
    return `<line x1="${pl}" y1="${y.toFixed(1)}" x2="${W - pr}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/><text x="${pl - 3}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="7" fill="rgba(255,255,255,0.3)">${Math.round(ev)}</text>`;
  }).join("");
  const polyline = pts.map((p, i) => `${toX(i).toFixed(1)},${toY(p.elo).toFixed(1)}`).join(" ");
  const area = `M${toX(0).toFixed(1)},${(H - pb).toFixed(1)} ` + pts.map((p, i) => `L${toX(i).toFixed(1)},${toY(p.elo).toFixed(1)}`).join(" ") + ` L${toX(pts.length - 1).toFixed(1)},${(H - pb).toFixed(1)} Z`;
  const col = playerColor(name);
  const circles = pts.map((p, i) => `<circle cx="${toX(i).toFixed(1)}" cy="${toY(p.elo).toFixed(1)}" r="2.5" fill="${p.won ? "var(--green)" : "var(--red)"}" stroke="rgba(0,0,0,0.4)" stroke-width="0.5"><title>${p.date}: ASS ${p.elo} (${p.won ? "W" : "L"})</title></circle>`).join("");
  const lastVal = pts[pts.length - 1].elo, firstVal = pts[0].elo;
  const netChange = lastVal - firstVal;
  const netStr = netChange > 0 ? `+${netChange}` : `${netChange}`;
  const netCol = netChange > 0 ? "var(--green)" : netChange < 0 ? "var(--red)" : "var(--muted)";
  const peakVal = Math.max(...pts.map((p) => p.elo));
  const peakPt  = pts.find((p) => p.elo === peakVal);
  const valleyVal = Math.min(...pts.map((p) => p.elo));
  const valleyPt  = pts.find((p) => p.elo === valleyVal);
  const fromPeak  = lastVal - peakVal;
  const fromPeakLabel = fromPeak === 0
    ? `<span style="color:var(--green);font-weight:700">▲ Currently at peak</span>`
    : `<span style="color:var(--red);font-weight:700">${fromPeak} from peak</span>`;
  return `<div class="ana-card"><span class="badge">ASS Timeline</span>
    <div style="display:flex;justify-content:space-between;align-items:center;margin:6px 0 4px">
      <div style="font-size:9px;color:var(--muted)">● W &nbsp; ● L &nbsp; · ${pts.length} matches</div>
      <div style="font-size:12px;font-weight:800;color:${netCol}">${netStr} ASS total</div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
      <div style="font-size:9px;color:var(--muted)">▲ Peak: <span style="color:var(--green);font-weight:800;font-size:11px">${peakVal}</span><span style="color:var(--muted);margin-left:4px">(${fmtDate(peakPt?.date)})</span></div>
      <div style="font-size:9px">${fromPeakLabel}</div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div style="font-size:9px;color:var(--muted)">▼ Low: <span style="color:var(--red);font-weight:800;font-size:11px">${valleyVal}</span><span style="color:var(--muted);margin-left:4px">(${fmtDate(valleyPt?.date)})</span></div>
      <div style="font-size:9px;color:var(--muted)">Range: <span style="font-weight:700;color:var(--fg)">${peakVal - valleyVal}</span></div>
    </div>
    <div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block;overflow:visible">
      ${yLines}
      <defs><linearGradient id="atg_${name.replace(/\s/g, "")}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${col}" stop-opacity="0.25"/><stop offset="100%" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
      <path d="${area}" fill="url(#atg_${name.replace(/\s/g, "")})" />
      <polyline points="${polyline}" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${circles}
      <text x="${toX(pts.length - 1).toFixed(1)}" y="${(toY(lastVal) - 5).toFixed(1)}" text-anchor="middle" font-size="8" font-weight="800" fill="${col}">${lastVal}</text>
    </svg></div>
  </div>`;
}

function _pdBuildBestDayHtml(name, playerMs) {
  const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const played = Array(7).fill(0), won = Array(7).fill(0);
  playerMs.forEach((m) => {
    if (!m.date) return;
    const d = new Date(m.date + "T00:00:00").getDay();
    const inA = (m.teamA || []).includes(name);
    played[d]++;
    if (inA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA) won[d]++;
  });
  const rows = DAY.map((label, d) => {
    if (!played[d]) return "";
    const wr = Math.round((won[d] / played[d]) * 100);
    const col = wr >= 60 ? "var(--green)" : wr <= 40 ? "var(--red)" : "var(--muted)";
    return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0">
      <span style="font-size:10px;font-weight:700;width:28px;flex-shrink:0">${label}</span>
      <div style="flex:1;height:6px;background:rgba(255,255,255,0.07);border-radius:3px"><div style="height:100%;width:${wr}%;background:${col};border-radius:3px"></div></div>
      <span onclick="_dowDayRecord(${jsArg(name)},${d})" title="Tap for W–L record" style="font-size:10px;font-weight:800;color:${col};width:32px;text-align:right;cursor:pointer;text-decoration:underline dotted">${wr}%</span>
      <span style="font-size:9px;color:var(--muted);width:20px;text-align:right">${played[d]}g</span>
    </div>`;
  }).join("");
  if (!rows.replace(/\s/g, "")) return "";
  const best = DAY.reduce((b, _, d) => {
    if (played[d] < 2) return b;
    const wr = won[d] / played[d];
    return b.d === undefined || wr > b.wr ? { d, wr } : b;
  }, {});
  const chip = best.d !== undefined
    ? `<div style="margin-top:10px;padding:7px 10px;background:rgba(var(--theme-rgb),0.08);border:1px solid rgba(var(--theme-rgb),0.2);border-radius:8px;display:flex;align-items:center;gap:8px">
        <span style="font-size:18px">📅</span>
        <div><div style="font-size:8px;font-weight:800;color:var(--muted);letter-spacing:0.08em">BEST DAY TO PLAY</div>
        <div style="font-size:13px;font-weight:900;color:var(--accent)">${DAY[best.d]} <span style="font-size:10px;color:var(--green);font-weight:700">${Math.round(best.wr * 100)}% win rate</span></div></div>
      </div>`
    : "";
  return `<div class="ana-card"><span class="badge">Day of Week</span><div style="margin-top:8px">${rows}</div>${chip}</div>`;
}

// Popup: a player's W–L record on a given weekday, with the match breakdown.
// Wired to the day-of-week Win% values (player-detail card + the per-player
// grid on the Statistics page) — tapping a Win% reveals what's behind it (the
// hover title is invisible on touch). Recomputes from active matches so it's
// independent of how it was invoked.
function _dowDayRecord(player, dow) {
  const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const ms = activeMatches()
    .filter(
      (m) =>
        m.date &&
        new Date(m.date + "T00:00:00").getDay() === dow &&
        [...(m.teamA || []), ...(m.teamB || [])].includes(player),
    )
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  let w = 0,
    l = 0;
  const list = ms
    .map((m) => {
      const inA = (m.teamA || []).includes(player);
      const won = inA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
      won ? w++ : l++;
      const opp = (inA ? m.teamB : m.teamA) || [];
      return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
        <span style="font-size:10px;font-weight:900;width:14px;color:${won ? "var(--green)" : "var(--red)"}">${won ? "W" : "L"}</span>
        <span style="flex:1;min-width:0;font-size:11px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">vs ${escHtml(opp.join(" & ")) || "—"}</span>
        <span style="font-size:11px;font-weight:800">${m.scoreA}–${m.scoreB}</span>
        <span style="font-size:9px;color:var(--muted);width:46px;text-align:right;flex-shrink:0">${fmtDate(m.date)}</span>
      </div>`;
    })
    .join("");
  const total = w + l;
  const pct = total ? Math.round((w / total) * 100) : 0;
  document.getElementById("dow-rec-popup")?.remove();
  const el = document.createElement("div");
  el.id = "dow-rec-popup";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", `${player} record on ${DAY[dow]}`);
  el.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px";
  el.onclick = (e) => {
    if (e.target === el) el.remove();
  };
  el.innerHTML = `<div style="background:var(--bg-card,#12121c);border:1px solid rgba(var(--theme-rgb),0.25);border-radius:16px;padding:16px;max-width:340px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.5)">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px">
      <div style="font-size:13px;font-weight:900;color:var(--text)">${escHtml(player)} · ${DAY[dow]}</div>
      <button onclick="document.getElementById('dow-rec-popup').remove()" aria-label="Close" style="background:none;border:none;color:var(--muted);font-size:18px;line-height:1;cursor:pointer;padding:0 2px">✕</button>
    </div>
    <div style="font-size:22px;font-weight:900;color:var(--text)"><span style="color:var(--green)">${w}W</span> <span style="color:var(--muted);font-weight:700">–</span> <span style="color:var(--red)">${l}L</span> <span style="font-size:12px;color:var(--muted);font-weight:700">· ${pct}%</span></div>
    <div style="font-size:9px;color:var(--muted);letter-spacing:0.06em;text-transform:uppercase;margin:2px 0 10px">${total} match${total === 1 ? "" : "es"} on ${DAY[dow]}s</div>
    <div style="max-height:240px;overflow-y:auto">${list || '<div class="sub" style="padding:8px 0">No matches.</div>'}</div>
  </div>`;
  document.body.appendChild(el);
}
function openPlayerDetail(name) {
  document.getElementById("player-detail-modal")?.remove();
  const detail = getPlayerDetail(name);
  if (!detail.stats) {
    alert("No player stats found.");
    return;
  }
  const s = detail.stats;
  const daysPlayed = new Set(detail.matches.map((m) => m.date).filter(Boolean))
    .size;
  const { first: _firstGameDate } = getPlayerDateRange(name, activeMatches());
  const firstGameLabel = _firstGameDate
    ? (() => {
        const [y, m, d] = _firstGameDate.split("-");
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        return `Since ${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
      })()
    : null;

  // ── FORM ENGINE ──────────────────────────────────────────────
  const form = computePlayerForm(name, activeMatches());
  const formWidgetHtml = form
    ? `
    <div class="ana-card form-engine-card">
      <span class="badge">Player Form</span>
      <div class="form-score-row">
        <div class="form-score-big">${form.formEmoji} <span style="color:var(--theme)">${form.score}</span><span style="font-size:14px;color:var(--muted)">/10</span></div>
        <div class="form-score-meta">
          <div style="font-size:10px;color:var(--muted)">LAST ${form.last10count} MATCHES</div>
          <div style="font-size:13px;font-weight:800;color:var(--fg)">${form.winPct10}% WIN RATE</div>
        </div>
      </div>
      <div class="form-pills-row">
        <div class="form-pill"><span style="font-size:9px;color:var(--muted)">MOMENTUM</span><span style="font-size:11px;font-weight:800;color:${form.momentumColor}">${form.momentumLabel}</span></div>
        <div class="form-pill"><span style="font-size:9px;color:var(--muted)">UNDER PRESSURE</span><span style="font-size:11px;font-weight:800;color:${form.pressureColor}">${form.pressureLabel} (${form.pressureScore}%)</span></div>
        <div class="form-pill"><span style="font-size:9px;color:var(--muted)">WIN QUALITY</span><span style="font-size:11px;font-weight:800;color:var(--fg)">ELO ${form.winQuality}</span></div>
      </div>
    </div>`
    : "";

  // ── ARCHETYPE ────────────────────────────────────────────────
  const archetype = computeArchetype(name, activeMatches());
  const archetypeHtml = archetype
    ? `
    <div class="ana-card" style="display:flex;align-items:center;gap:12px;padding:12px 14px">
      <div style="font-size:32px;line-height:1">${archetype.icon}</div>
      <div style="flex:1">
        <div style="font-size:9px;color:var(--muted);font-weight:700;letter-spacing:0.1em">PLAY STYLE</div>
        <div style="font-size:16px;font-weight:900;color:${archetype.color};margin:2px 0">${archetype.label}</div>
        <div style="font-size:10px;color:var(--muted)">${archetype.desc}</div>
      </div>
    </div>`
    : "";

  // ── RADAR CHART ──────────────────────────────────────────────
  const radarHtml = _pdBuildRadarHtml(name, form);

  // Achievements with progress bars
  const achievements = computeAchievements(name, activeMatches());
  const achievementsHtml = achievements.length
    ? (() => {
        const unlocked = achievements.filter((a) => a.unlocked);
        const locked = achievements.filter((a) => !a.unlocked);
        const ordered = [...unlocked, ...locked];
        const renderCard = (a) => {
          // Parse progress fraction "n/d" or percent "n%" if present
          let pct = a.unlocked ? 100 : 0;
          if (!a.unlocked && a.progress) {
            const frac = String(a.progress).match(/(\d+)\s*\/\s*(\d+)/);
            const perc = String(a.progress).match(/(\d+)\s*%/);
            if (frac)
              pct = Math.min(
                100,
                (parseInt(frac[1], 10) / parseInt(frac[2], 10)) * 100,
              );
            else if (perc) pct = Math.min(100, parseInt(perc[1], 10));
          }
          return `<div class="ach-row${a.unlocked ? " ach-unlocked" : ""}">
            <div class="ach-icon">${a.icon}</div>
            <div class="ach-body">
              <div class="ach-head">
                <span class="ach-label">${a.label}</span>
                <span class="ach-progress-lbl">${a.unlocked ? "✓ UNLOCKED" : a.progress || "—"}</span>
              </div>
              <div class="ach-desc">${a.desc}</div>
              <div class="ach-bar"><div class="ach-bar-fill" style="width:${pct.toFixed(0)}%"></div></div>
            </div>
          </div>`;
        };
        return `<div class="ana-card">
          <div onclick="const c=this.nextElementSibling,h=c.style.display==='none';c.style.display=h?'':'none';this.querySelector('.cc-chev').textContent=h?'▴':'▾'" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px">
            <span class="badge">Achievements (${unlocked.length}/${achievements.length})</span>
            <span class="cc-chev" style="font-size:11px;color:var(--muted)">▾</span>
          </div>
          <div class="ach-list" style="display:none">${ordered.map(renderCard).join("")}</div>
        </div>`;
      })()
    : "";

  // Feature 1: current streak
  const streakIcon = s.curStreak > 0 ? (s.curType === "W" ? "🔥" : "❄️") : "";
  const streakColor =
    s.curStreak > 0
      ? s.curType === "W"
        ? "var(--green)"
        : "var(--red)"
      : "var(--muted)";
  const streakStr =
    s.curStreak > 0 ? `${streakIcon} ${s.curStreak}${s.curType}` : "—";

  // Feature 4: form dots (larger in detail view)
  const formDotsHtml =
    s.form.length > 0
      ? s.form
          .map(
            (r) =>
              `<span class="fd fd-lg ${r === "W" ? "fd-w" : "fd-l"}">${r}</span>`,
          )
          .join("")
      : `<span style="color:var(--muted);font-size:11px">—</span>`;

  // Feature 5: avg margin
  const marginVal =
    s.avgMargin >= 0 ? `+${s.avgMargin.toFixed(1)}` : s.avgMargin.toFixed(1);
  const marginColor =
    s.avgMargin > 0
      ? "var(--green)"
      : s.avgMargin < 0
        ? "var(--red)"
        : "var(--muted)";

  // Form graph — rolling 5-match win rate sparkline
  const graphMatches = [...detail.matches]
    .sort(
      (a, b) =>
        new Date(a.date || "1970-01-01") - new Date(b.date || "1970-01-01"),
    )
    .slice(-15);
  const formGraphHtml = _pdBuildFormGraphHtml(name, graphMatches);

  // Feature 2: best / worst partner
  const bestPartnerHtml = s.bestPartner
    ? `
          <div class="det-conn">
            <div class="det-conn-icon">🤝</div>
            <div class="det-conn-body">
              <div class="det-conn-name">${s.bestPartner.name}</div>
              <div class="det-conn-meta"><span class="p">${s.bestPartner.pct.toFixed(0)}% win</span> · ${s.bestPartner.played}g</div>
            </div>
            <div class="det-conn-tag">Best Partner</div>
          </div>`
    : "";

  const worstPartnerHtml =
    s.worstPartner && s.worstPartner.name !== s.bestPartner?.name
      ? `
          <div class="det-conn">
            <div class="det-conn-icon">⚡</div>
            <div class="det-conn-body">
              <div class="det-conn-name">${s.worstPartner.name}</div>
              <div class="det-conn-meta"><span class="n">${s.worstPartner.pct.toFixed(0)}% win</span> · ${s.worstPartner.played}g</div>
            </div>
            <div class="det-conn-tag">Worst Partner</div>
          </div>`
      : "";

  // Feature 3: nemesis / fav opponent
  const nemesisHtml = s.nemesis
    ? `
          <div class="det-conn">
            <div class="det-conn-icon">⚔️</div>
            <div class="det-conn-body">
              <div class="det-conn-name">${s.nemesis.name}</div>
              <div class="det-conn-meta"><span class="n">${s.nemesis.pct.toFixed(0)}% win rate</span> · ${s.nemesis.played}g</div>
            </div>
            <div class="det-conn-tag">Nemesis</div>
          </div>`
    : "";

  const favOppHtml =
    s.favOpp && s.favOpp.name !== s.nemesis?.name
      ? `
          <div class="det-conn">
            <div class="det-conn-icon">💪</div>
            <div class="det-conn-body">
              <div class="det-conn-name">${s.favOpp.name}</div>
              <div class="det-conn-meta"><span class="p">${s.favOpp.pct.toFixed(0)}% win rate</span> · ${s.favOpp.played}g</div>
            </div>
            <div class="det-conn-tag">Fav Opponent</div>
          </div>`
      : "";

  const mostCommonPartnerHtml = detail.topMate
    ? `<div class="det-conn">
            <div class="det-conn-icon">👥</div>
            <div class="det-conn-body">
              <div class="det-conn-name">${detail.topMate[0]}</div>
              <div class="det-conn-meta">${detail.topMate[1]} matches together</div>
            </div>
            <div class="det-conn-tag">Most Common Partner</div>
          </div>`
    : "";

  const mostCommonOppHtml = detail.toughOpp
    ? `<div class="det-conn">
            <div class="det-conn-icon">🎯</div>
            <div class="det-conn-body">
              <div class="det-conn-name">${detail.toughOpp[0]}</div>
              <div class="det-conn-meta">${detail.toughOpp[1]} matches faced</div>
            </div>
            <div class="det-conn-tag">Most Common Opponent</div>
          </div>`
    : "";

  // Shared match list for enhancements 14-16 and recent cards
  const pdSortedAll14 = [...state.matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  const pdPlayerMs = pdSortedAll14.filter((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].includes(name),
  );

  const connectionsHtml =
    bestPartnerHtml ||
    worstPartnerHtml ||
    nemesisHtml ||
    favOppHtml ||
    mostCommonPartnerHtml ||
    mostCommonOppHtml
      ? `<div class="ana-card">
              <span class="badge">Connections</span>
              <div class="det-conn-list">${bestPartnerHtml}${worstPartnerHtml}${nemesisHtml}${favOppHtml}${mostCommonPartnerHtml}${mostCommonOppHtml}</div>
            </div>`
      : "";

  // XP + Level
  const pdXP = computePlayerXP(name);
  const { level: pdLevel, progress: pdProgress } = getPlayerLevel(pdXP);
  const pdTier = getPrestigeTier(pdLevel);
  const pdXpPct = Math.round(pdProgress * 100);
  const pdXpToNext = xpThreshold(pdLevel + 1) - pdXP;
  let pdMatchCount = 0,
    pdWinCount = 0,
    pdFireCount = 0,
    pdDomCount = 0,
    pdZeroCount = 0;
  activeMatches().forEach((m) => {
    const inA = (m.teamA || []).some((p) => normPlayer(p) === name);
    const inB = (m.teamB || []).some((p) => normPlayer(p) === name);
    if (!inA && !inB) return;
    pdMatchCount++;
    const won = inA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
    if (won) pdWinCount++;
    if (isFireMatch(m)) pdFireCount++;
    if (isDominatingMatch(m) && won) pdDomCount++;
    if (isZeroMatch(m) && won) pdZeroCount++;
  });
  const _pdBarClr = {
    diamond: "linear-gradient(90deg,#a0e8ff,#e0b0ff)",
    gold: "#ffd700",
    silver: "#c0c0c0",
    bronze: "#cd7f32",
    rookie: "rgba(255,255,255,0.28)",
  };
  const pdBarStyle = _pdBarClr[pdTier].startsWith("linear")
    ? `background:${_pdBarClr[pdTier]}`
    : `background:${_pdBarClr[pdTier]}`;
  const xpCard = `
    <div class="ana-card">
      <span class="badge">XP & Level</span>
      <div class="pd-xp-header">
        <span class="lvl-badge prestige-${pdTier} pd-big">LVL <span id="pd-lvl-num" data-final="${pdLevel}">${pdLevel}</span></span>
        <div class="pd-xp-total"><span id="pd-xp-total" data-final="${pdXP}">${pdXP}</span><span style="font-size:12px;color:var(--muted);font-weight:600;margin-left:4px">XP</span></div>
      </div>
      <div class="pd-xp-bar-wrap">
        <div class="pd-xp-bar" id="pd-xp-bar" data-pct="${pdXpPct}" style="width:0%;${pdBarStyle}"></div>
      </div>
      <div class="pd-xp-progress-row">
        <span>${pdXpPct}% to LVL ${pdLevel + 1}</span>
        <span>${pdXpToNext} XP to go</span>
      </div>
      <div class="pd-xp-breakdown">
        <div class="pd-xp-src-row"><span class="pd-xp-src-lbl">Matches Played</span><span class="pd-xp-src-count">${pdMatchCount} × 15</span><span class="pd-xp-src-val">+${pdMatchCount * 15}</span></div>
        <div class="pd-xp-src-row"><span class="pd-xp-src-lbl">Wins</span><span class="pd-xp-src-count">${pdWinCount} × 25</span><span class="pd-xp-src-val">+${pdWinCount * 25}</span></div>
        ${pdFireCount > 0 ? `<div class="pd-xp-src-row"><span class="pd-xp-src-lbl">🔥 Fire Matches</span><span class="pd-xp-src-count">${pdFireCount} × 8</span><span class="pd-xp-src-val">+${pdFireCount * 8}</span></div>` : ""}
        ${pdDomCount > 0 ? `<div class="pd-xp-src-row"><span class="pd-xp-src-lbl">💀 Dominating Wins</span><span class="pd-xp-src-count">${pdDomCount} × 8</span><span class="pd-xp-src-val">+${pdDomCount * 8}</span></div>` : ""}
        ${pdZeroCount > 0 ? `<div class="pd-xp-src-row"><span class="pd-xp-src-lbl">😂 Zero Wins</span><span class="pd-xp-src-count">${pdZeroCount} × 12</span><span class="pd-xp-src-val">+${pdZeroCount * 12}</span></div>` : ""}
      </div>
    </div>`;

  // ELO
  const eloMap = memoElo();
  const playerElo = eloMap[name] || 1000;
  const eloChange = playerElo - 1000;
  const eloChangeStr = eloChange > 0 ? `+${eloChange}` : `${eloChange}`;
  const eloChangeCol =
    eloChange > 0
      ? "var(--green)"
      : eloChange < 0
        ? "var(--red)"
        : "var(--muted)";
  const eloRank =
    Object.entries(eloMap)
      .sort((a, b) => b[1] - a[1])
      .findIndex(([n]) => n === name) + 1;
  // ASS
  const assMapPd = memoASS();
  const playerASS = assMapPd[name] || 1000;
  const assChange = playerASS - 1000;
  const assChangeCol = assChange > 0 ? "var(--green)" : assChange < 0 ? "var(--red)" : "var(--muted)";
  const assRank = Object.entries(assMapPd).sort((a, b) => b[1] - a[1]).findIndex(([n]) => n === name) + 1;
  // SR derived from each scoring system (ELO and ASS) so the modal can show both.
  const srElo = eloToSr(playerElo);
  const srAss = eloToSr(playerASS);

  // Badges
  const badges = computeBadges(name, s, eloMap, activeMatches());
  const badgesHtml = badges.length
    ? `<div class="ana-card"><div onclick="const c=this.nextElementSibling,h=c.style.display==='none';c.style.display=h?'':'none';this.querySelector('.cc-chev').textContent=h?'▴':'▾'" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px"><span class="badge">Award Badges (${badges.length})</span><span class="cc-chev" style="font-size:11px;color:var(--muted)">▾</span></div><div class="badge-chips" style="display:none">${badges.map((b) => `<div class="badge-chip${b.tier ? " badge-tier-" + b.tier : ""}" title="${b.desc}"><span>${b.icon}</span><span class="badge-chip-lbl">${b.label}</span>${b.tier ? `<span class="badge-tier-lbl">${b.tier.toUpperCase()}</span>` : ""}</div>`).join("")}</div></div>`
    : "";

  // Streak Calendar — last 52 weeks
  const streakCalendarHtml = _buildStreakCalendarHtml(name);

  // Clutch stats
  const playerMatchesForClutch = activeMatches().filter((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].includes(name),
  );
  let closePlayed = 0,
    closeWins = 0;
  playerMatchesForClutch.forEach((m) => {
    if (Math.abs(m.scoreA - m.scoreB) > 1) return;
    const inA = (m.teamA || []).includes(name);
    const won = inA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
    closePlayed++;
    if (won) closeWins++;
  });
  const clutchPct = closePlayed > 0 ? (closeWins / closePlayed) * 100 : 0;
  const clutchLabel =
    closePlayed >= 3
      ? clutchPct > 60
        ? `<span style="color:var(--green);font-weight:800">CLUTCH</span>`
        : clutchPct < 40
          ? `<span style="color:var(--red);font-weight:800">CHOKER</span>`
          : `<span style="color:var(--muted);font-weight:800">NEUTRAL</span>`
      : "";
  const clutchHtml =
    closePlayed >= 3
      ? `<div class="ana-card"><span class="badge">Clutch Factor</span><div class="det-streak-row"><div class="det-streak-cell"><div class="det-streak-val">${clutchPct.toFixed(0)}%</div><div class="sub">Clutch Win%</div></div><div class="det-streak-div"></div><div class="det-streak-cell"><div class="det-streak-val">${closePlayed}</div><div class="sub">Close Matches</div></div><div class="det-streak-div"></div><div class="det-streak-cell"><div class="det-streak-val">${clutchLabel}</div><div class="sub">Rating</div></div></div></div>`
      : "";

  // Leaderboard Race stats for this player
  const { from: wkFrom, to: wkTo } = lastWeekRange();
  const allEloMap = memoElo();
  const allRanked = computeStats(activeMatches(), allEloMap);
  const preWkMatches = activeMatches().filter((m) => (m.date || "") < wkFrom);
  const preWkRanked = computeStats(preWkMatches, computeElo(preWkMatches));
  const rAll = allRanked.findIndex((p) => p.name === name) + 1 || null;
  const rPre = preWkRanked.findIndex((p) => p.name === name) + 1 || null;
  // Best rank: find minimum rank position across all match-date snapshots
  const _sortedAll = [...state.matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  const _playerDates = [
    ...new Set(
      _sortedAll
        .filter((m) => [...(m.teamA || []), ...(m.teamB || [])].includes(name))
        .map((m) => m.date),
    ),
  ];
  let bestRank = rAll || Infinity;
  _playerDates.forEach((date) => {
    const snap = _sortedAll.filter((m) => (m.date || "") <= date);
    const rank =
      computeStats(snap, computeElo(snap)).findIndex((p) => p.name === name) +
      1;
    if (rank > 0 && rank < bestRank) bestRank = rank;
  });
  bestRank = bestRank === Infinity ? null : bestRank;
  const raceDelta = rPre && rAll ? rPre - rAll : null;
  const raceDeltaStr =
    raceDelta === null
      ? "—"
      : raceDelta > 0
        ? `▲${raceDelta}`
        : raceDelta < 0
          ? `▼${Math.abs(raceDelta)}`
          : "—";
  const raceDeltaColor =
    raceDelta > 0
      ? "var(--green)"
      : raceDelta < 0
        ? "var(--red)"
        : "var(--muted)";
  const wkLabel = `${fmtDate(wkFrom).replace(/\s\d{4}$/, "")} – ${fmtDate(wkTo).replace(/\s\d{4}$/, "")}`;
  const raceHtml = `
    <div class="ana-card">
      <span class="badge">Leaderboard Race</span>
      <div class="det-streak-row">
        <div class="det-streak-cell">
          <div class="det-streak-val" style="color:${rAll ? _rankColor(rAll, allRanked.length) : "var(--muted)"}">${rAll ? `#<span id="pd-rank-cur" data-final="${rAll}">${rAll}</span>` : "—"}</div>
          <div class="sub">Current Rank</div>
        </div>
        <div class="det-streak-div"></div>
        <div class="det-streak-cell">
          <div class="det-streak-val" style="color:${rPre ? _rankColor(rPre, allRanked.length) : "var(--muted)"}">${rPre ? `#<span id="pd-rank-pre" data-final="${rPre}">${rPre}</span>` : "—"}</div>
          <div class="sub">Last Wk. Rank</div>
        </div>
        <div class="det-streak-div"></div>
        <div class="det-streak-cell">
          <div class="det-streak-val" style="color:${bestRank ? _rankColor(bestRank, allRanked.length) : "var(--muted)"}">${bestRank ? `#<span id="pd-rank-best" data-final="${bestRank}">${bestRank}</span>` : "—"}</div>
          <div class="sub">Best Rank</div>
        </div>
        <div class="det-streak-div"></div>
        <div class="det-streak-cell">
          <div class="det-streak-val" style="color:${raceDeltaColor}">${raceDeltaStr}</div>
          <div class="sub">Movement</div>
        </div>
      </div>
    </div>`;

  // ── SCORE TIMELINE CHARTS (ASS + ELO) ───────────────────
  const eloTimelineHtml = _pdBuildEloTimelineHtml(name);
  const assTimelineHtml = _pdBuildASSTimelineHtml(name);

  // ── RECENT MATCH CARDS (from match log with ELO delta) ───
  const recentMatchCards = (() => {
    const last8 = pdPlayerMs.slice(-10).reverse();
    if (!last8.length) return "";
    const runElo2 = {};
    const eloAfterEach = {};
    pdSortedAll14.forEach((m) => {
      const allP2 = [...(m.teamA || []), ...(m.teamB || [])];
      allP2.forEach((p) => {
        if (!(p in runElo2)) runElo2[p] = 1000;
      });
      const aWon3 = m.scoreA > m.scoreB;
      const tA3 = m.teamA || [],
        tB3 = m.teamB || [];
      const avgA3 =
        tA3.reduce((s, p) => s + runElo2[p], 0) / Math.max(tA3.length, 1);
      const avgB3 =
        tB3.reduce((s, p) => s + runElo2[p], 0) / Math.max(tB3.length, 1);
      const expA3 = 1 / (1 + Math.pow(10, (avgB3 - avgA3) / 400));
      const dA3 = Math.round(32 * ((aWon3 ? 1 : 0) - expA3));
      const dB3 = Math.round(32 * ((aWon3 ? 0 : 1) - (1 - expA3)));
      tA3.forEach((p) => {
        runElo2[p] = (runElo2[p] || 1000) + dA3;
      });
      tB3.forEach((p) => {
        runElo2[p] = (runElo2[p] || 1000) + dB3;
      });
      if ([...(m.teamA || []), ...(m.teamB || [])].includes(name)) {
        const inA4 = (m.teamA || []).includes(name);
        eloAfterEach[pdSortedAll14.indexOf(m)] = { delta: inA4 ? dA3 : dB3 };
      }
    });
    // ASS deltas per match for this player
    const assDeltas = computeMatchASSDeltas(pdSortedAll14);
    const assAfterEach = {};
    pdSortedAll14.forEach((m, mi) => {
      const info = assDeltas.get(m);
      if (info && info.playerDeltas && (name in info.playerDeltas)) {
        assAfterEach[mi] = info.playerDeltas[name];
      }
    });
    return last8
      .map((m) => {
        const inA4 = (m.teamA || []).includes(name);
        const won4 = inA4 ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
        const partner =
          (inA4 ? m.teamA || [] : m.teamB || [])
            .filter((p) => p !== name)
            .join(" & ") || "—";
        const opp = (inA4 ? m.teamB || [] : m.teamA || [])
          .join(" & ");
        const score = inA4
          ? `${m.scoreA}–${m.scoreB}`
          : `${m.scoreB}–${m.scoreA}`;
        const mi = pdSortedAll14.indexOf(m);
        const eld = eloAfterEach[mi];
        const eloDeltaStr = eld
          ? `${eld.delta >= 0 ? "+" : ""}${eld.delta}`
          : "";
        const eloDeltaCol = eld?.delta >= 0 ? "var(--green)" : "var(--red)";
        const assDelta = assAfterEach[mi];
        const assSign = assDelta !== undefined ? (assDelta >= 0 ? "+" : "") : "";
        const assCol = assDelta !== undefined ? (assDelta >= 0 ? "var(--green)" : "var(--red)") : "var(--muted)";
        const scoreColor = won4 ? "var(--green)" : "var(--red)";
        const _miIdx = state.matches.indexOf(m);
        const deltaHtml = (eld || assDelta !== undefined) ? `<div style="display:flex;flex-direction:column;align-items:flex-end;gap:1px;flex-shrink:0">
          ${eld ? `<div style="font-size:10px;font-weight:700;color:${eloDeltaCol}">ELO ${eloDeltaStr}</div>` : ""}
          ${assDelta !== undefined ? `<div style="font-size:10px;font-weight:700;color:${assCol}">ASS ${assSign}${assDelta}</div>` : ""}
        </div>` : "";
        return `<div class="ana-card det-match-card"${_miIdx >= 0 ? ` onclick="document.getElementById('player-detail-modal')?.remove();openMatchIntro(${_miIdx})" style="cursor:pointer"` : ""}>
        <div class="det-match-result" style="color:${scoreColor}">${won4 ? "W" : "L"}</div>
        <div class="det-match-body">
          <div class="det-match-score">${score}</div>
          <div class="sub">${fmtDate(m.date).replace(/\s\d{4}$/, "")} · w/ ${escHtml(partner)} · vs ${escHtml(opp)}</div>
        </div>
        ${deltaHtml}
      </div>`;
      })
      .join("");
  })();

  // ── VS-ALL-OPPONENTS BREAKDOWN ───────────────────────────
  const vsOpponentsHtml = (() => {
    const vsData = {};
    pdPlayerMs.forEach((m) => {
      const inA5 = (m.teamA || []).includes(name);
      const won5 = inA5 ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
      const opp5 = inA5 ? m.teamB : m.teamA;
      const own5 = inA5 ? m.scoreA : m.scoreB;
      const oppS5 = inA5 ? m.scoreB : m.scoreA;
      opp5.forEach((o) => {
        if (!vsData[o]) vsData[o] = { w: 0, p: 0, margin: 0 };
        vsData[o].p++;
        if (won5) vsData[o].w++;
        vsData[o].margin += own5 - oppS5;
      });
    });
    const rows5 = Object.entries(vsData)
      .filter(([, d]) => d.p >= 1)
      .sort((a, b) => b[1].p - a[1].p)
      .map(([opp, d]) => {
        const pct = Math.round((d.w / d.p) * 100);
        const col =
          pct >= 60
            ? "var(--green)"
            : pct <= 40
              ? "var(--red)"
              : "var(--muted)";
        const avgM2 = (d.margin / d.p).toFixed(1);
        const mc2 =
          d.margin > 0
            ? "var(--green)"
            : d.margin < 0
              ? "var(--red)"
              : "var(--muted)";
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span style="font-size:11px;font-weight:700">${escHtml(opp)}</span><div style="display:flex;gap:10px;align-items:center"><span style="font-size:10px;color:var(--muted)">${d.p} MP</span><span style="font-size:10px;color:var(--muted)">${d.w}W–${d.p - d.w}L</span><span style="font-size:11px;font-weight:800;color:${col}">${pct}%</span><span style="font-size:10px;color:${mc2}">${avgM2 > 0 ? "+" : ""}${avgM2}</span></div></div>`;
      })
      .join("");
    if (!rows5) return "";
    return `<div class="ana-card"><span class="badge">vs All Opponents</span><div onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'" style="cursor:pointer;padding:8px 0 4px;font-size:10px;color:var(--muted)">Tap to expand ▾</div><div style="display:none">${rows5}</div></div>`;
  })();

  // ── ALL-PARTNERS RANKED (Enhancement 15: ELO gain per partner) ──
  const allPartnersHtml = (() => {
    const pData = {};
    pdPlayerMs.forEach((m) => {
      const inA6 = (m.teamA || []).includes(name);
      const won6 = inA6 ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
      const team6 = inA6 ? m.teamA : m.teamB;
      team6
        .filter((p) => p !== name)
        .forEach((p) => {
          if (!pData[p]) pData[p] = { w: 0, p: 0 };
          pData[p].p++;
          if (won6) pData[p].w++;
        });
    });
    // Enhancement 15: compute cumulative ELO delta when paired with each partner
    const _eloW15 = {};
    const partnerEloDelta = {};
    const sortedForElo15 = [...state.matches].sort((a, b) =>
      (a.date || "").localeCompare(b.date || ""),
    );
    sortedForElo15.forEach((m) => {
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
        if (!(p in _eloW15)) _eloW15[p] = 1000;
      });
      const aWon15 = m.scoreA > m.scoreB;
      const tA15 = m.teamA || [],
        tB15 = m.teamB || [];
      const avgA15 =
        tA15.reduce((s, p) => s + (_eloW15[p] || 1000), 0) /
        Math.max(tA15.length, 1);
      const avgB15 =
        tB15.reduce((s, p) => s + (_eloW15[p] || 1000), 0) /
        Math.max(tB15.length, 1);
      const expA15 = 1 / (1 + Math.pow(10, (avgB15 - avgA15) / 400));
      const dA15 = Math.round(32 * ((aWon15 ? 1 : 0) - expA15));
      const dB15 = Math.round(32 * ((aWon15 ? 0 : 1) - (1 - expA15)));
      tA15.forEach((p) => {
        _eloW15[p] = (_eloW15[p] || 1000) + dA15;
      });
      tB15.forEach((p) => {
        _eloW15[p] = (_eloW15[p] || 1000) + dB15;
      });
      const inA15 = (m.teamA || []).includes(name);
      const inB15 = (m.teamB || []).includes(name);
      if (inA15 || inB15) {
        const myDelta15 = inA15 ? dA15 : dB15;
        const myTeam15 = inA15 ? m.teamA : m.teamB;
        myTeam15
          .filter((p) => p !== name)
          .forEach((p) => {
            if (!partnerEloDelta[p]) partnerEloDelta[p] = 0;
            partnerEloDelta[p] += myDelta15;
          });
      }
    });
    const rows6 = Object.entries(pData)
      .filter(([, d]) => d.p >= 1)
      .sort((a, b) => b[1].w / b[1].p - a[1].w / a[1].p || b[1].p - a[1].p)
      .map(([partner, d]) => {
        const pct = Math.round((d.w / d.p) * 100);
        const col =
          pct >= 60
            ? "var(--green)"
            : pct <= 40
              ? "var(--red)"
              : "var(--muted)";
        const eloDelta = partnerEloDelta[partner];
        const eloStr =
          eloDelta !== undefined
            ? `<span style="font-size:10px;font-weight:700;color:${eloDelta >= 0 ? "var(--green)" : "var(--red)"}">${eloDelta >= 0 ? "+" : ""}${eloDelta}</span>`
            : "";
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span style="font-size:11px;font-weight:700">${escHtml(partner)}</span><div style="display:flex;gap:8px;align-items:center"><span style="font-size:10px;color:var(--muted)">${d.p}g</span>${eloStr}<span style="font-size:11px;font-weight:800;color:${col}">${pct}%</span></div></div>`;
      })
      .join("");
    if (!rows6) return "";
    return `<div class="ana-card"><span class="badge">All Partners Ranked</span><div style="font-size:9px;color:var(--muted);padding:4px 0 2px">Win% · ELO gained together</div><div onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'" style="cursor:pointer;padding:8px 0 4px;font-size:10px;color:var(--muted)">Tap to expand ▾</div><div style="display:none">${rows6}</div></div>`;
  })();

  // ── PARTNER COMPATIBILITY SCORE ──────────────────────────
  const partnerCompatHtml = (() => {
    const pairStats = memoPairStats()
      .filter(
        (ps) =>
          ps.players.map(normPlayer).includes(normPlayer(name)) &&
          ps.played >= 3,
      )
      .sort((a, b) => b.winPct - a.winPct)
      .slice(0, 5);
    if (!pairStats.length) return "";
    const rows = pairStats
      .map((ps) => {
        const partner =
          ps.players.find((p) => normPlayer(p) !== normPlayer(name)) ||
          ps.players[0];
        const pct = Math.round(ps.winPct);
        const col =
          pct >= 60
            ? "var(--green)"
            : pct <= 40
              ? "var(--red)"
              : "var(--muted)";
        const stars =
          pct >= 70 ? "★★★" : pct >= 55 ? "★★☆" : pct >= 45 ? "★☆☆" : "☆☆☆";
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span style="font-size:11px;font-weight:700">${escHtml(partner)}</span>
        <div style="display:flex;gap:8px;align-items:center">
          <span style="font-size:9px;color:var(--muted)">${ps.played}g</span>
          <span style="font-size:11px;color:var(--gold)">${stars}</span>
          <span style="font-size:11px;font-weight:800;color:${col}">${pct}%</span>
        </div>
      </div>`;
      })
      .join("");
    return `<div class="ana-card"><span class="badge">Partner Compatibility</span><div style="font-size:9px;color:var(--muted);padding:4px 0 8px">Top pairings by win rate (min 3 games)</div>${rows}</div>`;
  })();

  // ── BEST DAY TO PLAY ─────────────────────────────────────
  const bestDayHtml = _pdBuildBestDayHtml(name, pdPlayerMs);

  // ── ELO PROJECTION CHART ─────────────────────────────────
  const eloProjectionHtml = (() => {
    if (pdPlayerMs.length < 5) return "";
    const eloHist = computeEloHistory(pdSortedAll14);
    const pts = eloHist[name] || [];
    if (pts.length < 5) return "";

    const FORM_WIN = Math.min(pts.length, 10);
    const formPts = pts.slice(-FORM_WIN);
    const avgDelta = formPts.reduce((s, p) => s + p.delta, 0) / FORM_WIN;
    const currentElo = pts[pts.length - 1].elo;

    const HIST_SHOW = Math.min(pts.length, 15);
    const histPts = pts.slice(-HIST_SHOW);
    const PROJ = 30;

    const allCoords = [
      ...histPts.map((p, i) => ({ i, elo: p.elo, proj: false })),
      ...Array.from({ length: PROJ }, (_, k) => ({
        i: HIST_SHOW + k,
        elo: Math.round(currentElo + avgDelta * (k + 1)),
        proj: true,
      })),
    ];

    const elos = allCoords.map((c) => c.elo);
    const pad = 18;
    const minE = Math.min(...elos) - pad,
      maxE = Math.max(...elos) + pad;
    const eRange = maxE - minE || 1;
    const W = 320,
      H = 88;
    const toX = (i) => ((i / (allCoords.length - 1)) * W).toFixed(1);
    const toY = (e) => (H - ((e - minE) / eRange) * H).toFixed(1);

    const histPath = histPts
      .map((p, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(p.elo)}`)
      .join(" ");
    const joinX = toX(HIST_SHOW - 1);
    const joinY = toY(histPts[histPts.length - 1].elo);
    const projCoords = allCoords.filter((c) => c.proj);
    const projPath =
      `M${joinX},${joinY} ` +
      projCoords.map((c) => `L${toX(c.i)},${toY(c.elo)}`).join(" ");

    const refY = toY(currentElo);
    const trendUp = avgDelta >= 0;
    const trendCol = trendUp ? "var(--green)" : "var(--red)";
    const trendLbl = trendUp ? "↑ CLIMBING" : "↓ DECLINING";

    const mkChip = (n) => {
      const proj = Math.round(currentElo + avgDelta * n);
      const d = proj - currentElo;
      const col = d >= 0 ? "var(--green)" : "var(--red)";
      return `<div class="elop-chip">
        <div class="elop-chip-n">+${n}</div>
        <div class="elop-chip-elo">${proj}</div>
        <div class="elop-chip-d" style="color:${col}">${d >= 0 ? "+" : ""}${d}</div>
      </div>`;
    };

    const markerDots = [10, 20, 30]
      .map((n) => {
        const coord = allCoords[HIST_SHOW - 1 + n];
        if (!coord) return "";
        return `<circle cx="${toX(coord.i)}" cy="${toY(coord.elo)}" r="3.5" fill="${trendCol}" stroke="var(--bg-card,#0c0c16)" stroke-width="1.5"/>`;
      })
      .join("");

    return `<div class="ana-card">
      <span class="badge">ELO Projection</span>
      <div class="elop-header">
        <span class="elop-trend" style="color:${trendCol}">${trendLbl}</span>
        <span class="elop-rate">${avgDelta >= 0 ? "+" : ""}${avgDelta.toFixed(1)} / match · last ${FORM_WIN}</span>
      </div>
      <div class="elop-svg-wrap">
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:82px;overflow:visible;display:block">
          <line x1="0" y1="${refY}" x2="${W}" y2="${refY}" stroke="rgba(255,255,255,0.09)" stroke-width="1" stroke-dasharray="4,4"/>
          <path d="${histPath}" fill="none" stroke="var(--theme)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="${projPath}" fill="none" stroke="${trendCol}" stroke-width="1.8" stroke-dasharray="6,4" stroke-linecap="round" opacity="0.85"/>
          ${markerDots}
          <circle cx="${joinX}" cy="${joinY}" r="3.5" fill="var(--theme)" stroke="var(--bg-card,#0c0c16)" stroke-width="1.5"/>
        </svg>
      </div>
      <div class="elop-chips">${[10, 20, 30].map(mkChip).join("")}</div>
    </div>`;
  })();

  // ── SCORE DISTRIBUTION CHART — Enhancement 16 ───────────
  const scoreDistHtml = (() => {
    if (pdPlayerMs.length < 3) return "";
    const dist = {};
    pdPlayerMs.forEach((m) => {
      const inA = (m.teamA || []).includes(name);
      const own = inA ? m.scoreA : m.scoreB;
      const opp = inA ? m.scoreB : m.scoreA;
      const key = `${own}–${opp}`;
      dist[key] = (dist[key] || 0) + 1;
    });
    const entries = Object.entries(dist).sort((a, b) => b[1] - a[1]);
    const maxCount = Math.max(...entries.map(([, c]) => c), 1);
    const bars = entries
      .map(([score, count]) => {
        const [own] = score.split("–").map(Number);
        const isWin = own > parseInt(score.split("–")[1], 10);
        const pct = Math.round((count / maxCount) * 100);
        const col = isWin ? "var(--green)" : "var(--red)";
        return `<div class="sd-row">
        <div class="sd-label ${isWin ? "p" : "n"}">${score}</div>
        <div class="sd-bar-wrap"><div class="sd-bar" style="width:${pct}%;background:${col}"></div></div>
        <div class="sd-count">${count}</div>
      </div>`;
      })
      .join("");
    return `<div class="ana-card"><span class="badge">Score Distribution</span><div style="margin-top:8px">${bars}</div></div>`;
  })();

  // ── PERSONAL RECORDS CAREER HIGHS ────────────────────────
  const personalRecordsHtml = (() => {
    if (!pdPlayerMs.length) return "";
    let biggestWin2 = null,
      biggestWinM = 0,
      biggestWinMatch = null;
    let worstLoss2 = null,
      worstLossM = 0,
      worstLossMatch = null;
    let longestWS = 0,
      longestLS = 0,
      curWS = 0,
      curLS = 0;
    const byDate2 = {};
    pdPlayerMs.forEach((m) => {
      const inA7 = (m.teamA || []).includes(name);
      const own7 = inA7 ? m.scoreA : m.scoreB;
      const opp7 = inA7 ? m.scoreB : m.scoreA;
      const won7 = own7 > opp7;
      const margin7 = own7 - opp7;
      if (won7 && margin7 > biggestWinM) {
        biggestWinM = margin7;
        biggestWin2 = `${own7}–${opp7}`;
        biggestWinMatch = m;
      }
      if (!won7 && -margin7 > worstLossM) {
        worstLossM = -margin7;
        worstLoss2 = `${own7}–${opp7}`;
        worstLossMatch = m;
      }
      if (won7) {
        curWS++;
        curLS = 0;
        if (curWS > longestWS) longestWS = curWS;
      } else {
        curLS++;
        curWS = 0;
        if (curLS > longestLS) longestLS = curLS;
      }
      if (!m.date) return;
      if (!byDate2[m.date]) byDate2[m.date] = { w: 0, p: 0 };
      byDate2[m.date].p++;
      if (won7) byDate2[m.date].w++;
    });
    const bestDay2 = Object.entries(byDate2).sort(
      (a, b) => b[1].w - a[1].w || b[1].p - a[1].p,
    )[0];
    const peakEloVal = memoEloPeaks()[name] || playerElo;
    const lowEloVal = memoEloLows()[name] || playerElo;
    const peakASSVal = memoASSPeaks()[name] || playerASS;
    const lowASSVal  = memoASSLows()[name]  || playerASS;
    // Tap Best Win / Worst Loss to open that match in the UFC overlay.
    const bwIdx = biggestWinMatch ? state.matches.indexOf(biggestWinMatch) : -1;
    const wlIdx = worstLossMatch ? state.matches.indexOf(worstLossMatch) : -1;
    const bwTap = bwIdx >= 0 ? ` onclick="openMatchIntro(${bwIdx})" style="cursor:pointer"` : "";
    const wlTap = wlIdx >= 0 ? ` onclick="openMatchIntro(${wlIdx})" style="cursor:pointer"` : "";
    return `<div class="ana-card"><span class="badge">Career Highs</span><div class="det-streak-row" style="flex-wrap:wrap;gap:10px;margin-top:8px"><div class="det-streak-cell"${bwTap}><div class="det-streak-val" style="color:var(--green)">${biggestWin2 || "—"}</div><div class="sub">Best Win${bwIdx >= 0 ? " ›" : ""}</div></div><div class="det-streak-div"></div><div class="det-streak-cell"${wlTap}><div class="det-streak-val" style="color:var(--red)">${worstLoss2 || "—"}</div><div class="sub">Worst Loss${wlIdx >= 0 ? " ›" : ""}</div></div><div class="det-streak-div"></div><div class="det-streak-cell"><div class="det-streak-val" style="color:var(--green)">${longestWS}W</div><div class="sub">Best Streak</div></div><div class="det-streak-div"></div><div class="det-streak-cell"><div class="det-streak-val" style="color:var(--gold)">${peakASSVal}</div><div class="sub">Peak ASS</div></div><div class="det-streak-div"></div><div class="det-streak-cell"><div class="det-streak-val" style="color:var(--red)">${lowASSVal}</div><div class="sub">Low ASS</div></div><div class="det-streak-div"></div><div class="det-streak-cell"><div class="det-streak-val" style="color:var(--gold)">${peakEloVal}</div><div class="sub">Peak ELO</div></div><div class="det-streak-div"></div><div class="det-streak-cell"><div class="det-streak-val" style="color:var(--red)">${lowEloVal}</div><div class="sub">Low ELO</div></div>${bestDay2 ? `<div class="det-streak-div"></div><div class="det-streak-cell"><div class="det-streak-val">${bestDay2[1].w}W/${bestDay2[1].p}</div><div class="sub">Best Day</div></div>` : ""}</div></div>`;
  })();

  // ── MONTHLY WIN-RATE SPARKLINE ────────────────────────────
  const monthlySparklineHtml = (() => {
    const moMap2 = {};
    pdPlayerMs.forEach((m) => {
      const mo = (m.date || "").slice(0, 7);
      if (!mo) return;
      const inA8 = (m.teamA || []).includes(name);
      const won8 = inA8 ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
      if (!moMap2[mo]) moMap2[mo] = { w: 0, p: 0 };
      moMap2[mo].p++;
      if (won8) moMap2[mo].w++;
    });
    const moKeys = Object.keys(moMap2).sort().slice(-8);
    if (moKeys.length < 3) return "";
    const moN4 = [
      "",
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const pts2 = moKeys.map((mo, i) => ({
      mo,
      pct: moMap2[mo].p ? (moMap2[mo].w / moMap2[mo].p) * 100 : 0,
      i,
    }));
    const W2 = 300,
      H2 = 70,
      pl2 = 8,
      pr2 = 8,
      pt3 = 8,
      pb2 = 18,
      cW2 = W2 - pl2 - pr2,
      cH2 = H2 - pt3 - pb2;
    const toX3 = (i) => pl2 + (i / (pts2.length - 1 || 1)) * cW2;
    const toY3 = (v) => pt3 + (1 - v / 100) * cH2;
    const col2 = playerColor(name);
    const polyline3 = pts2
      .map((p) => `${toX3(p.i).toFixed(1)},${toY3(p.pct).toFixed(1)}`)
      .join(" ");
    const circles3 = pts2
      .map((p) => {
        const c =
          p.pct >= 60
            ? "var(--green)"
            : p.pct <= 40
              ? "var(--red)"
              : "var(--gold)";
        return `<circle cx="${toX3(p.i).toFixed(1)}" cy="${toY3(p.pct).toFixed(1)}" r="2.5" fill="${c}"><title>${p.mo}: ${p.pct.toFixed(0)}%</title></circle>`;
      })
      .join("");
    const xLbls2 = pts2
      .map(
        (p) =>
          `<text x="${toX3(p.i).toFixed(1)}" y="${H2 - 3}" text-anchor="middle" font-size="7" fill="rgba(255,255,255,0.35)">${moN4[parseInt(p.mo.slice(5))]}</text>`,
      )
      .join("");
    const area2 =
      `M${toX3(0).toFixed(1)},${(H2 - pb2).toFixed(1)} ` +
      pts2
        .map((p) => `L${toX3(p.i).toFixed(1)},${toY3(p.pct).toFixed(1)}`)
        .join(" ") +
      ` L${toX3(pts2.length - 1).toFixed(1)},${(H2 - pb2).toFixed(1)} Z`;
    return `<div class="ana-card"><span class="badge">Monthly Win Rate</span><div style="overflow-x:auto;margin-top:8px"><svg viewBox="0 0 ${W2} ${H2}" width="100%" style="max-width:${W2}px;display:block;overflow:visible"><defs><linearGradient id="mwrg_${name.replace(/\s/g, "")}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${col2}" stop-opacity="0.2"/><stop offset="100%" stop-color="${col2}" stop-opacity="0"/></linearGradient></defs><path d="${area2}" fill="url(#mwrg_${name.replace(/\s/g, "")})"/><polyline points="${polyline3}" fill="none" stroke="${col2}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${circles3}${xLbls2}</svg></div></div>`;
  })();

  // ── STRENGTHS / WEAKNESSES TAGS ───────────────────────────
  const strengthTagsHtml = (() => {
    const tags = [];
    if (s.winPct >= 65)
      tags.push({ t: "💪 Consistent Winner", c: "var(--green)" });
    else if (s.winPct <= 35)
      tags.push({ t: "📈 Room to Grow", c: "var(--muted)" });
    if (form && form.momentumLabel === "RISING")
      tags.push({ t: "🔥 On the Rise", c: "var(--accent)" });
    else if (form && form.momentumLabel === "DECLINING")
      tags.push({ t: "📉 Declining Form", c: "var(--red)" });
    if (closePlayed >= 3 && clutchPct > 60)
      tags.push({ t: "⚔️ Clutch Performer", c: "var(--green)" });
    else if (closePlayed >= 3 && clutchPct < 40)
      tags.push({ t: "😰 Struggles in Close Matches", c: "var(--red)" });
    const allStats2 = memoStats();
    const ps2 = allStats2.find((p) => p.name === name);
    if (ps2?.avgMargin > 2)
      tags.push({ t: "💥 Dominant in wins", c: "var(--green)" });
    if (ps2?.consistency != null && ps2.consistency <= 2)
      tags.push({ t: "🪨 Rock Solid", c: "var(--gold)" });
    else if (ps2?.consistency != null && ps2.consistency >= 5)
      tags.push({ t: "🎲 Unpredictable", c: "var(--muted)" });
    if (tags.length === 0) return "";
    return `<div class="ana-card"><span class="badge">Profile Tags</span><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${tags.map((t) => `<span style="background:rgba(255,255,255,0.07);border-radius:20px;padding:4px 10px;font-size:10px;font-weight:700;color:${t.c}">${t.t}</span>`).join("")}</div></div>`;
  })();

  const html = `
          <div id="player-detail-modal" role="dialog" aria-modal="true" aria-label="${escHtml(name)} player detail">
            <div class="analytics-inner">
              <div class="analytics-header">
                <div class="analytics-title" style="display:flex;align-items:center;gap:10px"><div class="pd-av-wrap">${_playerAvatar(name, 64)}</div><span>${escHtml(name)}</span></div>
                <button class="analytics-close" aria-label="Close" onclick="document.getElementById('player-detail-modal').remove()">✕</button>
              </div>
              <div class="analytics-cards">

                <div class="ana-card ov-card">
                  <div class="ov-header">
                    <div class="ov-sr-block">
                      <div class="ov-sr-val" id="pd-sr-val" data-final="${s.sr.toFixed(2)}">${s.sr.toFixed(2)}</div>
                      <div class="ov-sr-lbl">Skill Rating</div>
                      <div class="ov-sr-elo" style="font-size:11px;color:var(--muted);margin-top:4px;display:flex;flex-direction:column;gap:2px">
                        <div style="display:flex;align-items:center;gap:6px">
                          <span style="font-size:9px;font-weight:800;letter-spacing:0.06em">ASS</span>
                          <span id="pd-ass-val" style="color:${assChangeCol};font-weight:800;font-size:13px">${playerASS}</span>
                          <span style="font-size:9px;color:var(--muted)">SR ${srAss.toFixed(2)}</span>
                          ${assRank > 0 ? `<span style="font-size:9px;color:var(--muted)">#${assRank} rank</span>` : ""}
                        </div>
                        <div style="display:flex;align-items:center;gap:6px">
                          <span style="font-size:9px;font-weight:800;letter-spacing:0.06em">ELO</span>
                          <span id="pd-elo-val" data-final="${playerElo}" style="color:${eloChangeCol};font-weight:800;font-size:13px">${playerElo}</span>
                          <span style="font-size:9px;color:var(--muted)">SR ${srElo.toFixed(2)}</span>
                          ${eloRank > 0 ? `<span style="font-size:9px;color:var(--muted)">#${eloRank} rank</span>` : ""}
                        </div>
                      </div>
                    </div>
                    <div class="ov-record-block">
                      <div class="ov-record">${s.mw}<span class="ov-record-sep">W</span>${s.ml}<span class="ov-record-sep">L</span></div>
                      <div class="ov-win-pct">${s.winPct.toFixed(0)}% win rate · ${s.mp} played · ${daysPlayed} day${daysPlayed !== 1 ? "s" : ""}${firstGameLabel ? ` · <span style="color:var(--muted)">${firstGameLabel}</span>` : ""}</div>
                    </div>
                  </div>
                  <div class="ov-grid">
                    <div class="ov-cell">
                      <div class="ov-val p">${s.gw}</div>
                      <div class="ov-lbl">Games Won</div>
                    </div>
                    <div class="ov-cell">
                      <div class="ov-val n">${s.gl}</div>
                      <div class="ov-lbl">Games Lost</div>
                    </div>
                    <div class="ov-cell">
                      <div class="ov-val ${s.diff >= 0 ? "p" : "n"}">${s.diff >= 0 ? "+" : ""}${s.diff}</div>
                      <div class="ov-lbl">Game Diff</div>
                    </div>
                    <div class="ov-cell">
                      <div class="ov-val">${s.gamePct.toFixed(0)}%</div>
                      <div class="ov-lbl">Game %</div>
                    </div>
                  </div>
                  ${form ? `<div style="margin-top:8px;padding:8px 12px;background:rgba(var(--theme-rgb),0.07);border:1px solid rgba(var(--theme-rgb),0.15);border-radius:10px;display:flex;justify-content:space-between;align-items:center">
                    <div>
                      <div style="font-size:8px;font-weight:800;letter-spacing:0.08em;color:var(--muted)">WIN QUALITY</div>
                      <div style="font-size:9px;color:var(--muted);margin-top:1px">avg ELO of opponents beaten</div>
                    </div>
                    <div style="font-size:22px;font-weight:900;color:var(--accent)">${form.winQuality}</div>
                  </div>` : ""}
                </div>

                ${xpCard}

                <div class="ana-card">
                  <span class="badge">Streak & Form</span>
                  <div class="det-streak-row">
                    <div class="det-streak-cell">
                      <div class="det-streak-val" style="color:${streakColor}">${streakStr}</div>
                      <div class="sub">Current</div>
                    </div>
                    <div class="det-streak-div"></div>
                    <div class="det-streak-cell">
                      <div class="det-streak-val" style="color:var(--green)">${s.bestWinStreak}W</div>
                      <div class="sub">Winning</div>
                    </div>
                    <div class="det-streak-div"></div>
                    <div class="det-streak-cell">
                      <div class="det-streak-val" style="color:var(--red)">${detail.maxLossStreak}L</div>
                      <div class="sub">Losing</div>
                    </div>
                  </div>
                  <div class="det-form-row">
                    <span class="sub" style="flex-shrink:0">Last ${s.form.length}</span>
                    <div class="det-form-dots">${formDotsHtml}</div>
                  </div>
                </div>

                ${formGraphHtml}

                <div class="ana-card">
                  <span class="badge">Score Dominance</span>
                  <div class="det-streak-row">
                    <div class="det-streak-cell">
                      <div class="det-streak-val" style="color:${marginColor}">${marginVal}</div>
                      <div class="sub">Avg Margin</div>
                    </div>
                    <div class="det-streak-div"></div>
                    <div class="det-streak-cell">
                      <div class="det-streak-val" style="color:${s.consistency !== null ? (s.consistency <= 2 ? "var(--green)" : s.consistency <= 4 ? "var(--gold)" : "var(--red)") : "var(--muted)"}">${s.consistency !== null ? s.consistency : "—"}</div>
                      <div class="sub">Consistency</div>
                    </div>
                  </div>
                  <div class="det-streak-row" style="margin-top:12px">
                    <div class="det-streak-cell">
                      <div class="det-streak-val" style="color:var(--green)">${detail.shutoutWins}</div>
                      <div class="sub">Shutout Wins</div>
                    </div>
                    <div class="det-streak-div"></div>
                    <div class="det-streak-cell">
                      <div class="det-streak-val" style="color:var(--red)">${detail.shutoutLosses}</div>
                      <div class="sub">Shutout Loss</div>
                    </div>
                  </div>
                </div>

                ${formWidgetHtml}

                ${archetypeHtml}

                ${radarHtml}

                ${raceHtml}

                ${assTimelineHtml}

                ${eloTimelineHtml}

                ${connectionsHtml}

                ${clutchHtml}

                ${achievementsHtml}

                ${streakCalendarHtml}

                ${badgesHtml}

                ${personalRecordsHtml}

                ${strengthTagsHtml}

                ${monthlySparklineHtml}

                ${vsOpponentsHtml}

                ${allPartnersHtml}

                ${partnerCompatHtml}

                ${eloProjectionHtml}

                ${scoreDistHtml}

                ${bestDayHtml}

              </div>
              <div style="margin-top:20px;font-size:13px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Recent Matches</div>
              <div class="analytics-cards">${recentMatchCards || `<div class="ana-card">${emptyState({ inline: true, message: "No matches yet." })}</div>`}</div>
            </div>
          </div>`;
  document.body.insertAdjacentHTML("beforeend", html);

  // Set stagger index for analyticsCardReveal animation in FULL mode
  document
    .querySelectorAll("#player-detail-modal .ana-card")
    .forEach((card, i) => {
      card.style.setProperty("--analytics-index", i);
    });

  // Scroll activity calendar so current month (rightmost column) is visible
  requestAnimationFrame(() => {
    const sc = document.querySelector("#player-detail-modal .sc-scroll");
    if (sc) sc.scrollLeft = sc.scrollWidth;
  });

  // shared ticker helper — 15 steps over ~330ms (22ms each)
  const pdTick = (el, target, format, delay = 200) => {
    if (!el || !target) return;
    let cur = 0;
    const step = target / 15;
    const tick = () => {
      cur = Math.min(cur + step, target);
      el.textContent = format(cur);
      if (cur < target) setTimeout(tick, 33);
    };
    setTimeout(tick, delay);
  };

  pdTick(
    document.getElementById("pd-sr-val"),
    parseFloat(document.getElementById("pd-sr-val")?.dataset.final || 0),
    (v) => v.toFixed(2),
  );
  pdTick(
    document.getElementById("pd-elo-val"),
    parseInt(document.getElementById("pd-elo-val")?.dataset.final || 0, 10),
    (v) => Math.round(v),
  );
  pdTick(
    document.getElementById("pd-xp-total"),
    parseInt(document.getElementById("pd-xp-total")?.dataset.final || 0, 10),
    (v) => Math.round(v),
  );
  pdTick(
    document.getElementById("pd-rank-cur"),
    parseInt(document.getElementById("pd-rank-cur")?.dataset.final || 0, 10),
    (v) => Math.round(v),
  );
  pdTick(
    document.getElementById("pd-rank-pre"),
    parseInt(document.getElementById("pd-rank-pre")?.dataset.final || 0, 10),
    (v) => Math.round(v),
  );
  pdTick(
    document.getElementById("pd-rank-best"),
    parseInt(document.getElementById("pd-rank-best")?.dataset.final || 0, 10),
    (v) => Math.round(v),
  );

  // XP bar fill animation (level number already shows final value from HTML)
  const xpBarEl = document.getElementById("pd-xp-bar");
  if (xpBarEl) {
    const finalPct = parseInt(xpBarEl.dataset.pct, 10);
    xpBarEl.style.transition = "none";
    xpBarEl.style.width = "0%";
    setTimeout(() => {
      void xpBarEl.offsetWidth;
      xpBarEl.style.transition = `width ${Math.max(600, finalPct * 8)}ms ease-out`;
      xpBarEl.style.width = `${finalPct}%`;
    }, 420);
  }
}

// ── Exports for window re-exposure in app.js ─────────────────────────────────
export { openPlayerDetail, streakCalDayClick, _dowDayRecord };
