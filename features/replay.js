// ── LEADERBOARD REPLAY ─────────────────────────────────────
// Self-contained widget for the Statistics → Replay tab: animates the all-time
// leaderboard match-by-match. Extracted from app.js — it has ZERO app-local
// dependencies (only src/ engine + format helpers + DOM + its own _replay*
// state), so moving it decouples that shared state and shrinks app.js. Exports
// are re-exposed on window by app.js for the inline onclick handlers.
import { state } from "../src/engine/state.js";
import { withoutGuestMatches } from "../src/engine/selectors.js";
import { computeElo } from "../src/engine/elo.js";
import { computeASS } from "../src/engine/ass.js";
import { computeStats } from "../src/engine/stats.js";
import { escHtml, fmtDate, playerColor, playerInitials } from "../src/ui/format.js";

const _REPLAY_MIN = 5;
const _REPLAY_BASE_MS = 400;
let _replayIdx = 0,
  _replayTimer = null,
  _replaySpeed = 1,
  _replayLoop = false,
  _replayReverse = false,
  _replaySpotlight = "",
  _replayMode = "elo",
  _replayPrevElos = {},
  _replayPrevRanks = {};

function _replaySorted() {
  // Leaderboard replay is all-time (cross-season) but still skips guests.
  return [...withoutGuestMatches(state.matches)].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
}

function _replayComputeMilestones(sorted) {
  const ms = [];
  for (let i = 25; i < sorted.length; i += 25)
    ms.push({ idx: i, label: `Match ${i}` });
  let big = null;
  sorted.forEach((m, i) => {
    const diff = Math.abs(m.scoreA - m.scoreB);
    if (diff >= 5 && (!big || diff > big.diff))
      big = { idx: i + 1, diff, label: `Blowout ${m.scoreA}-${m.scoreB}` };
  });
  if (big) ms.push(big);
  return ms;
}

export function _buildLeaderboardReplayHtml() {
  const sorted = _replaySorted();
  if (sorted.length < _REPLAY_MIN)
    return '<div class="sub" style="padding:8px">Need at least 5 matches for replay.</div>';
  _replayIdx = sorted.length;
  _replayPrevElos = {};
  _replayPrevRanks = {};
  const milestones = _replayComputeMilestones(sorted);
  const range = sorted.length - _REPLAY_MIN || 1;
  const milestoneDots = milestones
    .map((m) => {
      const pct = ((m.idx - _REPLAY_MIN) / range) * 100;
      return `<div class="lr-milestone" style="left:${pct}%" title="${escHtml(m.label)}"></div>`;
    })
    .join("");
  const uniqDates = [
    ...new Set(sorted.map((m) => m.date).filter(Boolean)),
  ].sort();
  const dateOpts =
    '<option value="" disabled selected>📅 Jump to date</option>' +
    uniqDates
      .map(
        (d) => `<option value="${escHtml(d)}">${escHtml(fmtDate(d))}</option>`,
      )
      .join("");
  const topPlayers = computeStats(sorted, computeElo(sorted));
  const spotlightOpts =
    '<option value="">👁 Spotlight: All</option>' +
    topPlayers
      .map(
        (p) =>
          `<option value="${escHtml(p.name)}"${p.name === _replaySpotlight ? " selected" : ""}>${escHtml(p.name)}</option>`,
      )
      .join("");
  return `<div class="ana-card lr-card" style="padding:12px">
    <div class="lr-controls">
      <button class="lr-btn" title="-10 matches" onclick="_replayStep(-10)">⏮</button>
      <button class="lr-btn" title="-1 match" onclick="_replayStep(-1)">◀</button>
      <button class="lr-btn lr-btn-play" id="replay-play-btn" onclick="_replayPlay()">▶</button>
      <button class="lr-btn" title="+1 match" onclick="_replayStep(1)">▶</button>
      <button class="lr-btn" title="+10 matches" onclick="_replayStep(10)">⏭</button>
      <button class="lr-btn lr-reset-btn" title="Reset" onclick="_replayReset()">↺</button>
    </div>
    <div class="lr-toggles">
      <div class="lr-speed-group">
        ${[0.5, 1, 2, 4]
          .map(
            (s) =>
              `<button class="lr-speed-pill${_replaySpeed === s ? " active" : ""}" onclick="_replaySetSpeed(${s})">${s}x</button>`,
          )
          .join("")}
      </div>
      <div class="lr-mode-group">
        <button class="lr-speed-pill${_replayMode === "elo" ? " active" : ""}" onclick="_replayToggleMode('elo')">ELO</button>
        <button class="lr-speed-pill${_replayMode === "ass" ? " active" : ""}" onclick="_replayToggleMode('ass')">ASS</button>
      </div>
      <button class="lr-toggle lr-toggle-loop${_replayLoop ? " active" : ""}" onclick="_replayToggleLoop()" title="Loop">↻</button>
      <button class="lr-toggle lr-toggle-rev${_replayReverse ? " active" : ""}" onclick="_replayToggleReverse()" title="Reverse">⇄</button>
    </div>
    <div class="lr-slider-wrap">
      <div class="lr-milestones">${milestoneDots}</div>
      <input type="range" id="replay-slider" min="${_REPLAY_MIN}" max="${sorted.length}" value="${sorted.length}" step="1" oninput="_replayUpdate(this.value)">
    </div>
    <div class="lr-jumps">
      <input type="number" inputmode="numeric" pattern="[0-9]*" id="replay-jump-num" min="${_REPLAY_MIN}" max="${sorted.length}" placeholder="Match #" onchange="_replayJumpToMatch(this.value)">
      <select id="replay-jump-date" onchange="_replayJumpToDate(this.value)">${dateOpts}</select>
      <select id="replay-spotlight" onchange="_replaySetSpotlight(this.value)">${spotlightOpts}</select>
    </div>
    <div class="lr-caption" id="replay-caption"></div>
    <div id="replay-board" class="lr-board"></div>
  </div>`;
}

export function _replayUpdate(idx) {
  const sorted = _replaySorted();
  _replayIdx = Math.max(
    _REPLAY_MIN,
    Math.min(parseInt(idx, 10) || _REPLAY_MIN, sorted.length),
  );
  const slice = sorted.slice(0, _replayIdx);
  const eloMap = computeElo(slice);
  const scoreMap = _replayMode === "ass" ? computeASS(slice) : eloMap;
  const scoreLabel = _replayMode === "ass" ? "ASS" : "ELO";
  const stats = computeStats(slice, eloMap).slice(0, 8);
  const maxScore = Math.max(...stats.map((s) => scoreMap[s.name] || 1000), 1000);
  const board = document.getElementById("replay-board");
  const slider = document.getElementById("replay-slider");
  const caption = document.getElementById("replay-caption");
  if (slider) slider.value = _replayIdx;
  const m = sorted[_replayIdx - 1];
  if (caption && m) {
    const aWon = m.scoreA > m.scoreB;
    const winners = aWon ? m.teamA : m.teamB;
    const losers = aWon ? m.teamB : m.teamA;
    const ws = Math.max(m.scoreA, m.scoreB);
    const ls = Math.min(m.scoreA, m.scoreB);
    const prevSlice = sorted.slice(0, _replayIdx - 1);
    const prevScoreMap = _replayMode === "ass" ? computeASS(prevSlice) : computeElo(prevSlice);
    const winnerName = winners[0];
    const scoreDelta =
      (scoreMap[winnerName] || 1000) - (prevScoreMap[winnerName] || 1000);
    const sign = scoreDelta >= 0 ? "+" : "";
    caption.innerHTML = `<span class="lr-cap-num">Match ${_replayIdx}/${sorted.length}</span>
      <span class="lr-cap-date">${m.date || ""}</span>
      <span class="lr-cap-result">${winners.join(" & ")} <span class="lr-cap-def">def.</span> ${losers.join(" & ")} <b>${ws}-${ls}</b></span>
      <span class="lr-cap-elo" style="color:${scoreDelta >= 0 ? "var(--green)" : "var(--red)"}">${winnerName} ${sign}${scoreDelta} ${scoreLabel}</span>`;
  }
  if (!board) return;
  board.innerHTML = stats
    .map((p, i) => {
      const score = scoreMap[p.name] || 1000;
      const barW = Math.round((score / maxScore) * 100);
      const isSpot = _replaySpotlight && p.name === _replaySpotlight;
      const dim = _replaySpotlight && !isSpot ? " lr-dim" : "";
      const fat = isSpot ? " lr-fat" : "";
      const col =
        i === 0
          ? "var(--gold)"
          : i === 1
            ? "var(--theme)"
            : i === 2
              ? "var(--green)"
              : "var(--accent)";
      const prevRank = _replayPrevRanks[p.name];
      let rankChip = '<span class="lr-rank-blank"></span>';
      if (typeof prevRank === "number" && prevRank !== i) {
        const diff = prevRank - i;
        rankChip =
          diff > 0
            ? `<span class="lr-rank-up">↑${diff}</span>`
            : `<span class="lr-rank-dn">↓${Math.abs(diff)}</span>`;
      }
      const prevScore = _replayPrevElos[p.name];
      let eloChip = '<span class="lr-elo-d-blank"></span>';
      if (typeof prevScore === "number") {
        const d = score - prevScore;
        if (d !== 0) {
          const s = d > 0 ? "+" : "";
          eloChip = `<span class="lr-elo-d" style="color:${d > 0 ? "var(--green)" : "var(--red)"}">${s}${d}</span>`;
        }
      }
      return `<div class="lr-row${dim}${fat}">
        <div class="lr-rank" style="color:${col}">#${i + 1}</div>
        ${rankChip}
        <div class="lr-av" style="background:${playerColor(p.name)}">${playerInitials(p.name)}</div>
        <div class="lr-name-wrap">
          <div class="lr-name">${p.name}</div>
          <div class="lr-bar"><div class="lr-bar-fill" style="width:${barW}%;background:${col}"></div></div>
        </div>
        <div class="lr-elo" style="color:${col}">${score}</div>
        ${eloChip}
      </div>`;
    })
    .join("");
  _replayPrevElos = {};
  _replayPrevRanks = {};
  stats.forEach((p, i) => {
    _replayPrevElos[p.name] = scoreMap[p.name] || 1000;
    _replayPrevRanks[p.name] = i;
  });
}

export function _replayToggleMode(mode) {
  _replayMode = mode || (_replayMode === "elo" ? "ass" : "elo");
  document.querySelectorAll(".lr-mode-group .lr-speed-pill").forEach((b) => {
    b.classList.toggle("active", b.textContent === _replayMode.toUpperCase());
  });
  _replayUpdate(_replayIdx);
}

export function _replayStep(delta) {
  const max = _replaySorted().length;
  _replayUpdate(Math.max(_REPLAY_MIN, Math.min(_replayIdx + delta, max)));
}

export function _replayJumpToMatch(n) {
  const v = parseInt(n, 10);
  if (!isNaN(v)) _replayUpdate(v);
}

export function _replayJumpToDate(date) {
  if (!date) return;
  const sorted = _replaySorted();
  let idx = -1;
  for (let i = 0; i < sorted.length; i++) {
    if ((sorted[i].date || "") <= date) idx = i;
    else break;
  }
  if (idx >= 0) _replayUpdate(idx + 1);
}

export function _replaySetSpeed(s) {
  _replaySpeed = s;
  document.querySelectorAll(".lr-speed-pill").forEach((b) => {
    b.classList.toggle("active", parseFloat(b.textContent) === s);
  });
  if (_replayTimer) {
    _replayStop();
    _replayPlay();
  }
}

export function _replayToggleLoop() {
  _replayLoop = !_replayLoop;
  document
    .querySelector(".lr-toggle-loop")
    ?.classList.toggle("active", _replayLoop);
}

export function _replayToggleReverse() {
  _replayReverse = !_replayReverse;
  document
    .querySelector(".lr-toggle-rev")
    ?.classList.toggle("active", _replayReverse);
}

export function _replaySetSpotlight(name) {
  _replaySpotlight = name || "";
  _replayUpdate(_replayIdx);
}

function _replayStop() {
  if (_replayTimer) {
    clearInterval(_replayTimer);
    _replayTimer = null;
  }
  const btn = document.getElementById("replay-play-btn");
  if (btn) btn.textContent = "▶";
}

export function _replayPlay() {
  const sorted = _replaySorted();
  const btn = document.getElementById("replay-play-btn");
  if (_replayTimer) {
    _replayStop();
    return;
  }
  if (_replayReverse) {
    if (_replayIdx <= _REPLAY_MIN) _replayIdx = sorted.length + 1;
  } else if (_replayIdx >= sorted.length) {
    _replayIdx = _REPLAY_MIN - 1;
  }
  if (btn) btn.textContent = "⏸";
  const intervalMs = Math.max(50, Math.round(_REPLAY_BASE_MS / _replaySpeed));
  _replayTimer = setInterval(() => {
    if (_replayReverse) {
      _replayIdx = Math.max(_REPLAY_MIN, _replayIdx - 1);
      _replayUpdate(_replayIdx);
      if (_replayIdx <= _REPLAY_MIN) {
        if (_replayLoop) _replayIdx = sorted.length + 1;
        else _replayStop();
      }
    } else {
      _replayIdx = Math.min(_replayIdx + 1, sorted.length);
      _replayUpdate(_replayIdx);
      if (_replayIdx >= sorted.length) {
        if (_replayLoop) _replayIdx = _REPLAY_MIN - 1;
        else _replayStop();
      }
    }
  }, intervalMs);
}

export function _replayReset() {
  _replayStop();
  _replaySpotlight = "";
  _replayPrevElos = {};
  _replayPrevRanks = {};
  const sp = document.getElementById("replay-spotlight");
  if (sp) sp.value = "";
  const jn = document.getElementById("replay-jump-num");
  if (jn) jn.value = "";
  const jd = document.getElementById("replay-jump-date");
  if (jd) jd.value = "";
  _replayUpdate(_REPLAY_MIN);
}
