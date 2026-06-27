// ── HEAD-TO-HEAD FEATURE MODULE ──────────────────────────────────────────────
// Extracted from app.js: computeH2HStreak, openH2HDetail, openRivalryScreen,
// renderH2HDeepDive. playerAvatar injected via initH2HDeps (uses photoMap).
import { activeMatches } from "../src/engine/selectors.js";
import { normPlayer } from "../src/domain/players.js";
import { state } from "../src/engine/state.js";
import { getHeadToHeadStats } from "../src/engine/pairs.js";
import {
  escHtml,
  fmtDate,
  playerColor,
  playerInitials,
} from "../src/ui/format.js";

// ── Injected deps ─────────────────────────────────────────────────────────────
let _playerAvatar = (name, size = 26) => {
  const col = playerColor(name);
  const fs = Math.round(size * 0.38);
  return `<span class="p-av" style="width:${size}px;height:${size}px;min-width:${size}px;font-size:${fs}px;background:${col}22;border:1.5px solid ${col};color:${col}">${playerInitials(name)}</span>`;
};

export function initH2HDeps({ playerAvatar }) {
  if (playerAvatar) _playerAvatar = playerAvatar;
}

// ── RIVALRY STREAKS ─────────────────────────────────────────
function computeH2HStreak(pA, pB, matches) {
  const h2h = [...matches]
    .filter((m) => {
      const aInA = (m.teamA || []).some((p) => normPlayer(p) === pA);
      const aInB = (m.teamB || []).some((p) => normPlayer(p) === pA);
      const bInA = (m.teamA || []).some((p) => normPlayer(p) === pB);
      const bInB = (m.teamB || []).some((p) => normPlayer(p) === pB);
      return (aInA && bInB) || (aInB && bInA);
    })
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  if (!h2h.length) return { leader: null, streak: 0 };
  let curLeader = null,
    streak = 0;
  for (const m of h2h) {
    const aInA = (m.teamA || []).some((p) => normPlayer(p) === pA);
    const aWon = aInA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
    const winner = aWon ? pA : pB;
    if (winner === curLeader) {
      streak++;
    } else {
      curLeader = winner;
      streak = 1;
    }
  }
  return { leader: curLeader, streak };
}

function openH2HDetail(a, b) {
  const existing = document.getElementById("h2h-detail-modal");
  if (existing) existing.remove();
  const h2h = getHeadToHeadStats(a, b, activeMatches());
  const total = h2h.aWins + h2h.bWins || 1;
  const aWinPct = Math.round((h2h.aWins / total) * 100);
  const bWinPct = 100 - aWinPct;

  // Game-level stats
  let aGW = 0,
    bGW = 0,
    aShut = 0,
    bShut = 0;
  let aStreak = 0,
    bStreak = 0,
    aCurStreak = 0,
    bCurStreak = 0,
    aCurType = null,
    bCurType = null;
  const sorted = [...h2h.matches].sort((x, y) =>
    (x.date || "").localeCompare(y.date || ""),
  );
  sorted.forEach((m) => {
    const aInA = (m.teamA || []).some((p) => normPlayer(p) === a);
    const aWon = aInA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
    const aS = aInA ? m.scoreA : m.scoreB;
    const bS = aInA ? m.scoreB : m.scoreA;
    aGW += aS;
    bGW += bS;
    if (bS === 0) aShut++;
    if (aS === 0) bShut++;
    if (aWon) {
      aCurType === "w" ? aCurStreak++ : ((aCurType = "w"), (aCurStreak = 1));
      bCurStreak = 0;
      bCurType = null;
    } else {
      bCurType === "w" ? bCurStreak++ : ((bCurType = "w"), (bCurStreak = 1));
      aCurStreak = 0;
      aCurType = null;
    }
    aStreak = Math.max(aStreak, aCurStreak);
    bStreak = Math.max(bStreak, bCurStreak);
  });
  const aGPct = Math.round((aGW / (aGW + bGW || 1)) * 100);

  // ELO walk for per-match deltas
  const h2hDeltaMap = new Map();
  const _e = {};
  [...state.matches]
    .sort((x, y) => (x.date || "").localeCompare(y.date || ""))
    .forEach((m) => {
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
        if (!(p in _e)) _e[p] = 1000;
      });
      const mAWon = m.scoreA > m.scoreB;
      const avgA =
        m.teamA.reduce((s, p) => s + _e[p], 0) / Math.max(m.teamA.length, 1);
      const avgB =
        m.teamB.reduce((s, p) => s + _e[p], 0) / Math.max(m.teamB.length, 1);
      const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
      const dA = Math.round(32 * ((mAWon ? 1 : 0) - expA));
      const dB = Math.round(32 * ((mAWon ? 0 : 1) - (1 - expA)));
      m.teamA.forEach((p) => {
        _e[p] = (_e[p] || 1000) + dA;
      });
      m.teamB.forEach((p) => {
        _e[p] = (_e[p] || 1000) + dB;
      });
      const aInA = (m.teamA || []).some((p) => normPlayer(p) === a);
      const aInB = (m.teamB || []).some((p) => normPlayer(p) === a);
      const bInA = (m.teamA || []).some((p) => normPlayer(p) === b);
      const bInB = (m.teamB || []).some((p) => normPlayer(p) === b);
      if ((aInA && bInB) || (aInB && bInA))
        h2hDeltaMap.set(m, { ad: aInA ? dA : dB, bd: bInA ? dA : dB });
    });
  let aEloTotal = 0,
    bEloTotal = 0;
  h2hDeltaMap.forEach((v) => {
    aEloTotal += v.ad;
    bEloTotal += v.bd;
  });

  const fmtD = (n) => (n > 0 ? `+${n}` : String(n));
  const dCol = (n) =>
    n > 0 ? "var(--green)" : n < 0 ? "var(--red)" : "var(--muted)";
  const eloBg = (n) =>
    n > 0
      ? "rgba(74,222,128,0.15)"
      : n < 0
        ? "rgba(248,113,113,0.15)"
        : "rgba(255,255,255,0.06)";
  const borderCol = (n) =>
    n > 0 ? "#4ade80" : n < 0 ? "#f87171" : "rgba(255,255,255,0.1)";

  const col1 = playerColor(a);
  const col2 = playerColor(b);
  const leader = h2h.aWins > h2h.bWins ? a : h2h.bWins > h2h.aWins ? b : null;
  const leaderCol = leader === a ? col1 : col2;
  const aN = a.split(" ")[0];
  const bN = b.split(" ")[0];

  const recentCards = [...h2h.matches]
    .sort((x, y) => (y.date || "").localeCompare(x.date || ""))
    .slice(0, 8)
    .map((m) => {
      const aInA = (m.teamA || []).some((p) => normPlayer(p) === a);
      const aWon = aInA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
      const sa = aInA ? m.scoreA : m.scoreB;
      const sb = aInA ? m.scoreB : m.scoreA;
      const deltas = h2hDeltaMap.get(m);
      const ad = deltas?.ad ?? 0;
      const bd = deltas?.bd ?? 0;
      const winnerCol = aWon ? col1 : col2;
      return `
        <div class="h2h-match-card">
          <div class="h2h-match-accent" style="background:${winnerCol}"></div>
          <div class="h2h-match-body">
            <div class="h2h-match-row1">
              <span class="h2h-match-winner-name" style="color:${winnerCol}">${aWon ? aN : bN} won</span>
              <span class="h2h-match-score">${sa}–${sb}</span>
              <span class="h2h-match-date">${fmtDate(m.date)}</span>
            </div>
            <div class="h2h-match-row2">
              <span class="h2h-elo-pill" style="background:${eloBg(ad)};color:${dCol(ad)}">${aN} ${fmtD(ad)}</span>
              <span class="h2h-elo-pill" style="background:${eloBg(bd)};color:${dCol(bd)}">${bN} ${fmtD(bd)}</span>
            </div>
          </div>
        </div>`;
    })
    .join("");

  const html = `
    <div id="h2h-detail-modal" class="h2h-modal-overlay" onclick="if(event.target===this)this.remove()">
      <div class="h2h-modal-card">
        <div class="h2h-modal-header">
          <span class="h2h-modal-title">⚔️ H2H DEEP DIVE</span>
          <button class="h2h-modal-close" onclick="document.getElementById('h2h-detail-modal').remove()">✕</button>
        </div>
        <div class="h2h-modern">
          <div class="h2h-hero">
            <div class="h2h-hero-side" style="background:linear-gradient(135deg,${col1}18 0%,transparent 70%)">
              ${_playerAvatar(a, 34)}
              <div class="h2h-hero-name">${a}</div>
              <div class="h2h-hero-wins" style="color:${col1}">${h2h.aWins}</div>
              <div class="h2h-hero-sub">${aWinPct}% win rate</div>
            </div>
            <div class="h2h-hero-center">
              <div class="h2h-vs-badge">VS</div>
              <div class="h2h-total-badge">${total}<br><span style="font-size:8px;font-weight:600;opacity:0.6">played</span></div>
            </div>
            <div class="h2h-hero-side h2h-hero-right" style="background:linear-gradient(225deg,${col2}18 0%,transparent 70%)">
              ${_playerAvatar(b, 34)}
              <div class="h2h-hero-name">${b}</div>
              <div class="h2h-hero-wins" style="color:${col2}">${h2h.bWins}</div>
              <div class="h2h-hero-sub">${bWinPct}% win rate</div>
            </div>
          </div>

          <div class="h2h-split-wrap">
            <span class="h2h-split-pct" style="color:${col1}">${aWinPct}%</span>
            <div class="h2h-split-bar">
              <div class="h2h-split-seg" style="width:${aWinPct}%;background:${col1}"></div>
              <div class="h2h-split-seg" style="width:${bWinPct}%;background:${col2}"></div>
            </div>
            <span class="h2h-split-pct" style="color:${col2}">${bWinPct}%</span>
          </div>

          <div class="h2h-leader-badge">
            ${
              leader
                ? `<span style="color:${leaderCol};font-weight:800">${leader}</span>&nbsp;leads this rivalry`
                : "⚖️ Perfectly balanced"
            }
          </div>

          <div class="h2h-stats-grid">
            <div class="h2h-stat-cell">
              <div class="h2h-stat-val ${h2h.diff >= 0 ? "" : "neg"}">${h2h.diff >= 0 ? "+" : ""}${h2h.diff}</div>
              <div class="h2h-stat-lbl">GAME DIFF</div>
            </div>
            <div class="h2h-stat-cell">
              <div class="h2h-stat-val">${aGPct}%</div>
              <div class="h2h-stat-lbl">GAME%</div>
            </div>
            <div class="h2h-stat-cell">
              <div class="h2h-stat-val" style="color:${col1}">${aGW}</div>
              <div class="h2h-stat-lbl">${aN} GW</div>
            </div>
            <div class="h2h-stat-cell">
              <div class="h2h-stat-val" style="color:${col2}">${bGW}</div>
              <div class="h2h-stat-lbl">${bN} GW</div>
            </div>
            <div class="h2h-stat-cell">
              <div class="h2h-stat-val" style="color:var(--green)">${aShut}</div>
              <div class="h2h-stat-lbl">${aN} SHUTOUT</div>
            </div>
            <div class="h2h-stat-cell">
              <div class="h2h-stat-val" style="color:var(--green)">${bShut}</div>
              <div class="h2h-stat-lbl">${bN} SHUTOUT</div>
            </div>
          </div>

          <div class="h2h-elo-row">
            <div class="h2h-elo-card" style="border-top-color:${borderCol(aEloTotal)}">
              <div class="h2h-elo-label">ELO IMPACT</div>
              <div class="h2h-elo-player" style="color:${col1}">${a}</div>
              <div class="h2h-elo-delta" style="color:${dCol(aEloTotal)}">${fmtD(aEloTotal)}</div>
              <div class="h2h-elo-sub">from ${total} meetings</div>
            </div>
            <div class="h2h-elo-card" style="border-top-color:${borderCol(bEloTotal)}">
              <div class="h2h-elo-label">ELO IMPACT</div>
              <div class="h2h-elo-player" style="color:${col2}">${b}</div>
              <div class="h2h-elo-delta" style="color:${dCol(bEloTotal)}">${fmtD(bEloTotal)}</div>
              <div class="h2h-elo-sub">from ${total} meetings</div>
            </div>
          </div>

          <div class="h2h-elo-row" style="margin-bottom:14px">
            <div class="h2h-elo-card" style="border-top-color:var(--accent)">
              <div class="h2h-elo-label">BEST WIN STREAK</div>
              <div class="h2h-elo-player" style="color:${col1}">${a}</div>
              <div class="h2h-elo-delta" style="color:var(--accent)">${aStreak}</div>
            </div>
            <div class="h2h-elo-card" style="border-top-color:var(--accent)">
              <div class="h2h-elo-label">BEST WIN STREAK</div>
              <div class="h2h-elo-player" style="color:${col2}">${b}</div>
              <div class="h2h-elo-delta" style="color:var(--accent)">${bStreak}</div>
            </div>
          </div>

          ${(() => {
            const rs = computeH2HStreak(a, b, activeMatches());
            if (!rs.leader || rs.streak < 2) return "";
            const rCol = rs.leader === a ? col1 : col2;
            return `<div class="h2h-streak-line" style="border-color:${rCol}20;background:${rCol}10"><span style="color:${rCol};font-weight:800">${rs.leader}</span> is on a <span style="color:${rCol};font-weight:800">${rs.streak}-match</span> win streak in this rivalry 🔥</div>`;
          })()}

          <div class="h2h-matches-title">RECENT MATCHES</div>
          <div class="h2h-match-list">
            ${recentCards || emptyState({ inline: true, message: "No matches yet." })}
          </div>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
}

// 4C: Rivalry Screen — full-screen overlay from H2H matrix cell tap
function openRivalryScreen(a, b) {
  document.getElementById("rivalry-screen-overlay")?.remove();
  const h2h = getHeadToHeadStats(a, b, activeMatches());
  const total = h2h.aWins + h2h.bWins || 1;
  const colA = playerColor(a);
  const colB = playerColor(b);
  const aN = a.split(" ")[0];
  const bN = b.split(" ")[0];
  const leader = h2h.aWins > h2h.bWins ? a : h2h.bWins > h2h.aWins ? b : null;
  const pctA = Math.round((h2h.aWins / total) * 100);
  const pctB = 100 - pctA;

  // Per-match stats
  const sorted = [...h2h.matches].sort((x, y) =>
    (x.date || "").localeCompare(y.date || ""),
  );
  let aStreak = 0,
    bStreak = 0,
    aCur = 0,
    bCur = 0;
  sorted.forEach((m) => {
    const aInA = (m.teamA || []).some((p) => normPlayer(p) === a);
    const aWon = aInA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
    if (aWon) {
      aCur++;
      bCur = 0;
    } else {
      bCur++;
      aCur = 0;
    }
    aStreak = Math.max(aStreak, aCur);
    bStreak = Math.max(bStreak, bCur);
  });

  // Greatest match = closest score
  const greatest = [...h2h.matches].sort(
    (x, y) => Math.abs(x.scoreA - x.scoreB) - Math.abs(y.scoreA - y.scoreB),
  )[0];
  let greatestHtml = "";
  if (greatest) {
    const aInA = (greatest.teamA || []).some((p) => normPlayer(p) === a);
    const sa = aInA ? greatest.scoreA : greatest.scoreB;
    const sb = aInA ? greatest.scoreB : greatest.scoreA;
    const winnerCol = sa > sb ? colA : colB;
    const winnerName = sa > sb ? aN : bN;
    greatestHtml = `<div class="rivalry-greatest">
      <div class="rivalry-greatest-lbl">⚡ GREATEST MATCH</div>
      <div class="rivalry-greatest-score" style="color:${winnerCol}">${sa}–${sb}</div>
      <div class="rivalry-greatest-sub">${winnerName} won · ${fmtDate(greatest.date)}</div>
    </div>`;
  }

  // Last 5 results
  const last5 = [...h2h.matches]
    .sort((x, y) => (y.date || "").localeCompare(x.date || ""))
    .slice(0, 5);
  const last5Html = last5
    .map((m) => {
      const aInA = (m.teamA || []).some((p) => normPlayer(p) === a);
      const aWon = aInA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
      const sa = aInA ? m.scoreA : m.scoreB;
      const sb = aInA ? m.scoreB : m.scoreA;
      const wCol = aWon ? colA : colB;
      return `<div class="rivalry-result-pill" style="border-color:${wCol}44;background:${wCol}12">
      <span style="color:${wCol};font-weight:900;font-size:10px">${aWon ? aN : bN}</span>
      <span style="font-size:11px;font-weight:700">${sa}–${sb}</span>
      <span style="color:var(--muted);font-size:9px">${fmtDate(m.date)}</span>
    </div>`;
    })
    .join("");

  // Current rivalry streak
  const rs = computeH2HStreak(a, b, activeMatches());
  const rsHtml =
    rs.leader && rs.streak >= 2
      ? `<div class="rivalry-streak-badge" style="color:${rs.leader === a ? colA : colB}">🔥 ${rs.leader.split(" ")[0]} on ${rs.streak}-match streak</div>`
      : "";

  const html = `
    <div id="rivalry-screen-overlay" class="rivalry-screen-overlay" onclick="if(event.target===this)this.remove()">
      <div class="rivalry-screen-card">
        <button class="rivalry-close-btn" onclick="document.getElementById('rivalry-screen-overlay').remove()">✕</button>

        <div class="rivalry-header" style="--ca:${colA};--cb:${colB}">
          <div class="rivalry-player-side" style="background:linear-gradient(135deg,${colA}22 0%,transparent 60%)">
            <div class="rivalry-avatar" style="background:${colA}33;border-color:${colA}66;color:${colA}">${playerInitials(a)}</div>
            <div class="rivalry-player-name" style="color:${colA}">${aN}</div>
            <div class="rivalry-big-wins" style="color:${colA}">${h2h.aWins}</div>
            <div class="rivalry-win-pct">${pctA}%</div>
          </div>
          <div class="rivalry-center-col">
            <div class="rivalry-vs-badge">VS</div>
            <div class="rivalry-total-played">${total}<br><span>played</span></div>
          </div>
          <div class="rivalry-player-side rivalry-player-right" style="background:linear-gradient(225deg,${colB}22 0%,transparent 60%)">
            <div class="rivalry-avatar" style="background:${colB}33;border-color:${colB}66;color:${colB}">${playerInitials(b)}</div>
            <div class="rivalry-player-name" style="color:${colB}">${bN}</div>
            <div class="rivalry-big-wins" style="color:${colB}">${h2h.bWins}</div>
            <div class="rivalry-win-pct">${pctB}%</div>
          </div>
        </div>

        <div class="rivalry-win-bar">
          <div class="rivalry-win-bar-a" style="width:${pctA}%;background:${colA}"></div>
          <div class="rivalry-win-bar-b" style="width:${pctB}%;background:${colB}"></div>
        </div>
        ${leader ? `<div class="rivalry-leader-badge" style="color:${leader === a ? colA : colB}">${leader.split(" ")[0]} leads this rivalry</div>` : `<div class="rivalry-leader-badge" style="color:var(--muted)">Perfect Tie</div>`}

        <div class="rivalry-streaks-row">
          <div class="rivalry-streak-card"><div style="color:${colA};font-weight:800">${aN}</div><div style="font-size:18px;font-weight:900;color:var(--theme)">${aStreak}</div><div style="font-size:9px;color:var(--muted)">BEST STREAK</div></div>
          ${rsHtml}
          <div class="rivalry-streak-card"><div style="color:${colB};font-weight:800">${bN}</div><div style="font-size:18px;font-weight:900;color:var(--theme)">${bStreak}</div><div style="font-size:9px;color:var(--muted)">BEST STREAK</div></div>
        </div>

        ${greatestHtml}

        <div class="rivalry-last5-label">LAST ${last5.length} RESULTS</div>
        <div class="rivalry-last5">${last5Html}</div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
}
function renderH2HDeepDive() {
  const p1 = document.getElementById("h2hP1")?.value;
  const p2 = document.getElementById("h2hP2")?.value;
  const result = document.getElementById("h2h-result");
  if (!result) return;
  if (!p1 || !p2 || p1 === p2) {
    result.innerHTML =
      '<div class="sub" style="padding:8px;color:var(--red)">Select two different players.</div>';
    return;
  }
  const h2h = getHeadToHeadStats(p1, p2, activeMatches());
  const total = h2h.aWins + h2h.bWins;
  if (total === 0) {
    result.innerHTML =
      '<div class="sub" style="padding:8px">These players have never faced each other.</div>';
    return;
  }
  // Walk full ELO to capture per-match deltas for this H2H pair
  const h2hDeltaMap = new Map();
  const _e = {};
  [...state.matches]
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .forEach((m) => {
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
        if (!(p in _e)) _e[p] = 1000;
      });
      const aWon = m.scoreA > m.scoreB;
      const avgA =
        m.teamA.reduce((s, p) => s + _e[p], 0) / Math.max(m.teamA.length, 1);
      const avgB =
        m.teamB.reduce((s, p) => s + _e[p], 0) / Math.max(m.teamB.length, 1);
      const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
      const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
      const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
      m.teamA.forEach((p) => {
        _e[p] = (_e[p] || 1000) + dA;
      });
      m.teamB.forEach((p) => {
        _e[p] = (_e[p] || 1000) + dB;
      });
      const p1InA = (m.teamA || []).includes(p1);
      const p1InB = (m.teamB || []).includes(p1);
      const p2InA = (m.teamA || []).includes(p2);
      const p2InB = (m.teamB || []).includes(p2);
      if ((p1InA && p2InB) || (p1InB && p2InA))
        h2hDeltaMap.set(m, { p1d: p1InA ? dA : dB, p2d: p2InA ? dA : dB });
    });
  let p1Total = 0,
    p2Total = 0;
  h2hDeltaMap.forEach((v) => {
    p1Total += v.p1d;
    p2Total += v.p2d;
  });
  const fmtD = (n) => (n > 0 ? `+${n}` : String(n));
  const dCol = (n) =>
    n > 0 ? "var(--green)" : n < 0 ? "var(--red)" : "var(--muted)";

  const p1Pct = Math.round((h2h.aWins / total) * 100);
  const p2Pct = 100 - p1Pct;
  const recent = [...h2h.matches]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 5);
  const col1 = playerColor(p1);
  const col2 = playerColor(p2);
  const leader = h2h.aWins > h2h.bWins ? p1 : h2h.bWins > h2h.aWins ? p2 : null;
  const leaderCol = leader === p1 ? col1 : col2;
  const eloBg = (n) =>
    n > 0
      ? "rgba(74,222,128,0.15)"
      : n < 0
        ? "rgba(248,113,113,0.15)"
        : "rgba(255,255,255,0.06)";
  const borderCol = (n) =>
    n > 0 ? "#4ade80" : n < 0 ? "#f87171" : "rgba(255,255,255,0.1)";
  result.innerHTML = `
    <div class="h2h-modern">
      <div class="h2h-hero">
        <div class="h2h-hero-side" style="background:linear-gradient(135deg,${col1}18 0%,transparent 70%)">
          ${_playerAvatar(p1, 34)}
          <div class="h2h-hero-name">${p1}</div>
          <div class="h2h-hero-wins" style="color:${col1}">${h2h.aWins}</div>
          <div class="h2h-hero-sub">${p1Pct}% win rate</div>
        </div>
        <div class="h2h-hero-center">
          <div class="h2h-vs-badge">VS</div>
          <div class="h2h-total-badge">${total}<br><span style="font-size:8px;font-weight:600;opacity:0.6">played</span></div>
        </div>
        <div class="h2h-hero-side h2h-hero-right" style="background:linear-gradient(225deg,${col2}18 0%,transparent 70%)">
          ${_playerAvatar(p2, 34)}
          <div class="h2h-hero-name">${p2}</div>
          <div class="h2h-hero-wins" style="color:${col2}">${h2h.bWins}</div>
          <div class="h2h-hero-sub">${p2Pct}% win rate</div>
        </div>
      </div>

      <div class="h2h-split-wrap">
        <span class="h2h-split-pct" style="color:${col1}">${p1Pct}%</span>
        <div class="h2h-split-bar">
          <div class="h2h-split-seg" style="width:${p1Pct}%;background:${col1}"></div>
          <div class="h2h-split-seg" style="width:${p2Pct}%;background:${col2}"></div>
        </div>
        <span class="h2h-split-pct" style="color:${col2}">${p2Pct}%</span>
      </div>

      <div class="h2h-leader-badge">
        ${
          leader
            ? `<span style="color:${leaderCol};font-weight:800">${leader}</span>&nbsp;leads this rivalry`
            : "⚖️ Perfectly balanced"
        }
      </div>

      <div class="h2h-elo-row">
        <div class="h2h-elo-card" style="border-top-color:${borderCol(p1Total)}">
          <div class="h2h-elo-label">ELO IMPACT</div>
          <div class="h2h-elo-player" style="color:${col1}">${p1}</div>
          <div class="h2h-elo-delta" style="color:${dCol(p1Total)}">${fmtD(p1Total)}</div>
          <div class="h2h-elo-sub">from ${total} meetings</div>
        </div>
        <div class="h2h-elo-card" style="border-top-color:${borderCol(p2Total)}">
          <div class="h2h-elo-label">ELO IMPACT</div>
          <div class="h2h-elo-player" style="color:${col2}">${p2}</div>
          <div class="h2h-elo-delta" style="color:${dCol(p2Total)}">${fmtD(p2Total)}</div>
          <div class="h2h-elo-sub">from ${total} meetings</div>
        </div>
      </div>

      ${(() => {
        const rs = computeH2HStreak(p1, p2, activeMatches());
        if (!rs.leader || rs.streak < 2) return "";
        const rCol = rs.leader === p1 ? col1 : col2;
        return `<div class="h2h-streak-line" style="border-color:${rCol}20;background:${rCol}10"><span style="color:${rCol};font-weight:800">${rs.leader}</span> is on a <span style="color:${rCol};font-weight:800">${rs.streak}-match</span> win streak in this rivalry 🔥</div>`;
      })()}

      <div class="h2h-matches-title">RECENT ENCOUNTERS</div>
      <div class="h2h-match-list">
        ${recent
          .map((m) => {
            const p1InA = m.teamA.includes(p1);
            const p1Won = p1InA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
            const deltas = h2hDeltaMap.get(m);
            const p1d = deltas?.p1d ?? 0;
            const p2d = deltas?.p2d ?? 0;
            const winnerCol = p1Won ? col1 : col2;
            const winnerName = p1Won ? p1 : p2;
            const scoreP1 = p1InA ? m.scoreA : m.scoreB;
            const scoreP2 = p1InA ? m.scoreB : m.scoreA;
            return `
              <div class="h2h-match-card">
                <div class="h2h-match-accent" style="background:${winnerCol}"></div>
                <div class="h2h-match-body">
                  <div class="h2h-match-row1">
                    <span class="h2h-match-winner-name" style="color:${winnerCol}">${winnerName} won</span>
                    <span class="h2h-match-score">${scoreP1}–${scoreP2}</span>
                    <span class="h2h-match-date">${fmtDate(m.date)}</span>
                  </div>
                  <div class="h2h-match-row2">
                    <span class="h2h-elo-pill" style="background:${eloBg(p1d)};color:${dCol(p1d)}">${p1} ${fmtD(p1d)}</span>
                    <span class="h2h-elo-pill" style="background:${eloBg(p2d)};color:${dCol(p2d)}">${p2} ${fmtD(p2d)}</span>
                  </div>
                </div>
              </div>`;
          })
          .join("")}
      </div>
    </div>`;
}

export { computeH2HStreak, openH2HDetail, openRivalryScreen, renderH2HDeepDive };
