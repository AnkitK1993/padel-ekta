// ── MATCH INTRO OVERLAY FEATURE MODULE ───────────────────────────────────────
// Extracted from app.js: all match-intro state, animation helpers, openMatchIntro,
// closeMatchIntro, and the match-card click listener.
// openEditMatch is called via window.openEditMatch since it lives in app.js.
import { activeMatches } from "../src/engine/selectors.js";
import { normPlayer } from "../src/domain/players.js";
import { state } from "../src/engine/state.js";
import { computeElo } from "../src/engine/elo.js";
import { _normScores } from "../src/engine/stats.js";
import {
  computePlayerXP,
  getPlayerLevel,
} from "../src/engine/xp.js";
import { getPairKey } from "../src/engine/pairs.js";
import { memoPairStats } from "../src/app/memo-store.js";
import {
  escHtml,
  jsArg,
  fmtDate,
  playerColor,
  playerInitials,
} from "../src/ui/format.js";
import {
  isFireMatch,
  isDominatingMatch,
  isZeroMatch,
  buildMatchRowHtml,
} from "../src/ui/render-match-rows.js";

// ── MATCH INTRO OVERLAY ────────────────────────────────────
let _mioTimers = [];
let _mioFinalize = null;
let _mioEloMemo = null; // { idx, amRef, priorElo, afterElo } — see openMatchIntro
function _mioSched(fn, delay) {
  const id = setTimeout(() => {
    _mioTimers = _mioTimers.filter((t) => t !== id);
    fn();
  }, delay);
  _mioTimers.push(id);
  return id;
}
function mioSkipAnimation() {
  _mioTimers.forEach((id) => clearTimeout(id));
  _mioTimers = [];
  if (typeof _mioFinalize === "function") _mioFinalize();
}

function openMatchIntro(idx) {
  const m = state.matches[idx];
  if (!m) return;
  // Cancel any in-flight animations from a previous opening
  _mioTimers.forEach((id) => clearTimeout(id));
  _mioTimers = [];
  _mioFinalize = null;

  const _amE = activeMatches();
  // Pre/post-match ELO over the active set. Two O(n) computeElo passes; cached
  // on (idx, activeMatches identity) so re-opening the same banner — or any
  // re-trigger — skips the recompute. activeMatches() returns a memoized array,
  // so a season/exclusion/data change yields a new ref and invalidates this.
  // _upToBeforeE (matches strictly before this one) is used throughout the rest
  // of this function (H2H, last-meeting, context lines), so it must live at the
  // function scope — NOT inside the memo else-branch, or it's undefined on the
  // memo-hit path and a ReferenceError elsewhere (which silently aborts the
  // whole overlay).
  const _upToBeforeE = new Set(state.matches.slice(0, idx));
  let priorElo, afterElo;
  if (_mioEloMemo && _mioEloMemo.idx === idx && _mioEloMemo.amRef === _amE) {
    priorElo = _mioEloMemo.priorElo;
    afterElo = _mioEloMemo.afterElo;
  } else {
    const _upToInclE = new Set(state.matches.slice(0, idx + 1));
    priorElo = computeElo(_amE.filter((mm) => _upToBeforeE.has(mm)));
    afterElo = computeElo(_amE.filter((mm) => _upToInclE.has(mm)));
    _mioEloMemo = { idx, amRef: _amE, priorElo, afterElo };
  }
  const aWon = m.scoreA > m.scoreB;

  // Pre-match individual and pair ranks
  const indivRanked = Object.entries(priorElo).sort((a, b) => b[1] - a[1]);
  const allPairs = memoPairStats();
  const pairsByElo = allPairs
    .map((p) => ({
      key: p.key,
      avg:
        p.players.reduce((s, n) => s + (priorElo[n] || 1000), 0) /
        p.players.length,
    }))
    .sort((a, b) => b.avg - a.avg);

  const mkRankLabel = (players) => {
    if (players.length >= 2) {
      const key = getPairKey(players);
      const i = pairsByElo.findIndex((p) => p.key === key);
      return i >= 0 ? `PAIR #${i + 1}` : "";
    }
    const i = indivRanked.findIndex(([n]) => n === players[0]);
    return i >= 0 ? `#${i + 1}` : "";
  };

  const avgElo = (players) =>
    Math.round(
      players.reduce((s, p) => s + (priorElo[p] || 1000), 0) /
        Math.max(players.length, 1),
    );

  const nameA = m.teamA.map((p) => normPlayer(p)).join(" & ");
  const nameB = m.teamB.map((p) => normPlayer(p)).join(" & ");

  // Match number (chronological position in all matches)
  const _sortedForNum = [...state.matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  const _matchNum = _sortedForNum.indexOf(m) + 1;
  document.getElementById("mio-date-bar").textContent =
    `${fmtDate(m.date).toUpperCase()} · MATCH #${_matchNum}`;

  // Admin-only edit affordance: tap a match (Summary or History) → this overlay
  // → Edit. stopPropagation so it isn't swallowed by the tap-to-close backdrop.
  const _mioEditBtn = document.getElementById("mio-edit-btn");
  if (_mioEditBtn) {
    _mioEditBtn.style.display = window.isAdmin ? "" : "none";
    _mioEditBtn.onclick = (e) => {
      e.stopPropagation();
      closeMatchIntro();
      window.openEditMatch(idx);
    };
  }

  const rankA = mkRankLabel(m.teamA);
  const rankB = mkRankLabel(m.teamB);
  const rankAEl = document.getElementById("mio-rank-a");
  const rankBEl = document.getElementById("mio-rank-b");
  rankAEl.textContent = rankA;
  rankAEl.style.visibility = rankA ? "visible" : "hidden";
  rankBEl.textContent = rankB;
  rankBEl.style.visibility = rankB ? "visible" : "hidden";

  // Escape each player name (HTML context); join with the <br> layout markup.
  document.getElementById("mio-name-a").innerHTML = m.teamA
    .map((p) => escHtml(normPlayer(p)))
    .join("<br>& ");
  document.getElementById("mio-name-b").innerHTML = m.teamB
    .map((p) => escHtml(normPlayer(p)))
    .join("<br>& ");
  const teamAvgLvl = (players) => {
    const levels = players.map(
      (p) => getPlayerLevel(computePlayerXP(normPlayer(p))).level,
    );
    return Math.round(levels.reduce((s, l) => s + l, 0) / levels.length);
  };
  document.getElementById("mio-elo-a").textContent =
    `ELO ${avgElo(m.teamA)} · LVL ${teamAvgLvl(m.teamA)}`;
  document.getElementById("mio-elo-b").textContent =
    `ELO ${avgElo(m.teamB)} · LVL ${teamAvgLvl(m.teamB)}`;

  const scoreAEl = document.getElementById("mio-score-a");
  const scoreBEl = document.getElementById("mio-score-b");
  scoreAEl.textContent = "0";
  scoreBEl.textContent = "0";
  scoreAEl.className = "mio-score-num" + (aWon ? " win" : "");
  scoreBEl.className = "mio-score-num" + (!aWon ? " win" : "");

  const winner = aWon ? nameA : nameB;
  document.getElementById("mio-result-line").textContent =
    `${winner.toUpperCase()} WIN`;

  // ELO delta pills
  const deltaPills = [...m.teamA, ...m.teamB]
    .map((p) => {
      const delta = (afterElo[p] || 1000) - (priorElo[p] || 1000);
      const sign = delta >= 0 ? "+" : "";
      const cls = delta >= 0 ? "gain" : "loss";
      return `<span class="mio-delta-pill ${cls}">${normPlayer(p)} ${sign}${delta}</span>`;
    })
    .join("");
  document.getElementById("mio-elo-deltas").innerHTML = deltaPills;

  // H2H data between the two teams (all prior matches)
  const tkA = [...m.teamA].sort().join("|");
  const tkB = [...m.teamB].sort().join("|");
  let h2hWinsA = 0,
    h2hWinsB = 0;
  _amE
    .filter((m) => _upToBeforeE.has(m))
    .forEach((pm) => {
      const pmA = [...(pm.teamA || [])].sort().join("|");
      const pmB = [...(pm.teamB || [])].sort().join("|");
      const fwd = pmA === tkA && pmB === tkB;
      const rev = pmA === tkB && pmB === tkA;
      if (!fwd && !rev) return;
      const pmAWon = pm.scoreA > pm.scoreB;
      if (fwd) {
        if (pmAWon) h2hWinsA++;
        else h2hWinsB++;
      } else {
        if (pmAWon) h2hWinsB++;
        else h2hWinsA++;
      }
    });
  const h2hTotal = h2hWinsA + h2hWinsB;
  // After this match
  const h2hAfterA = h2hWinsA + (aWon ? 1 : 0);
  const h2hAfterB = h2hWinsB + (!aWon ? 1 : 0);
  const h2hEl = document.getElementById("mio-h2h-row");
  if (h2hEl) {
    const colA = aWon ? "var(--green)" : "var(--red)";
    const colB = !aWon ? "var(--green)" : "var(--red)";
    // Show pre-match counts first; winner's count animates up after scores land
    h2hEl.innerHTML = `
      <div class="mio-h2h-cell" style="position:relative">
        <div class="mio-h2h-num mio-h2h-num-a" style="color:${colA}">${h2hWinsA}</div>
        <div class="mio-h2h-lbl">${nameA}</div>
      </div>
      <div class="mio-h2h-sep">${h2hTotal === 0 ? "FIRST<br>MEETING" : "H2H"}</div>
      <div class="mio-h2h-cell" style="position:relative">
        <div class="mio-h2h-num mio-h2h-num-b" style="color:${colB}">${h2hWinsB}</div>
        <div class="mio-h2h-lbl">${nameB}</div>
      </div>`;
    _mioSched(() => {
      const winNumEl = h2hEl.querySelector(
        aWon ? ".mio-h2h-num-a" : ".mio-h2h-num-b",
      );
      const newVal = aWon ? h2hAfterA : h2hAfterB;
      const oldVal = aWon ? h2hWinsA : h2hWinsB;
      if (winNumEl && newVal > oldVal) {
        winNumEl.textContent = newVal;
        winNumEl.classList.add("mio-count-flash");
        const plus = document.createElement("span");
        plus.className = "mio-float-plus";
        plus.textContent = "+1";
        winNumEl.parentElement.appendChild(plus);
        _mioSched(() => {
          winNumEl.classList.remove("mio-count-flash");
          plus.remove();
        }, 950);
      }
    }, 900);
  }

  // Individual player H2H grid (all 4 cross-matchups)
  const pvpEl = document.getElementById("mio-pvp-section");
  if (pvpEl && m.teamA.length >= 2 && m.teamB.length >= 2) {
    const priorMatches = _amE.filter((m) => _upToBeforeE.has(m));
    const [p1, p2] = m.teamA.map(normPlayer);
    const [p3, p4] = m.teamB.map(normPlayer);
    const crossPairs = [
      [p1, p3],
      [p1, p4],
      [p2, p3],
      [p2, p4],
    ];
    const pvpRows = crossPairs
      .map(([pa, pb]) => {
        let wA = 0,
          wB = 0;
        priorMatches.forEach((pm) => {
          const aP = [...(pm.teamA || [])].map(normPlayer);
          const bP = [...(pm.teamB || [])].map(normPlayer);
          const mAWon = pm.scoreA > pm.scoreB;
          if (aP.includes(pa) && bP.includes(pb)) {
            if (mAWon) wA++;
            else wB++;
          } else if (aP.includes(pb) && bP.includes(pa)) {
            if (mAWon) wB++;
            else wA++;
          }
        });
        const newWA = wA + (aWon ? 1 : 0);
        const newWB = wB + (!aWon ? 1 : 0);
        // Show pre-match counts; winner's number animates up after delay
        return `<div class="mio-pvp-row">
        <span class="mio-pvp-name ${aWon ? "mio-pvp-winner" : ""}">${pa}</span>
        <span class="mio-pvp-rec" style="position:relative">
          <span class="mio-pvp-num-a" data-after="${newWA}"${aWon ? ' style="color:var(--green)"' : ""}>${wA}</span>–<span class="mio-pvp-num-b" data-after="${newWB}"${!aWon ? ' style="color:var(--green)"' : ""}>${wB}</span>
        </span>
        <span class="mio-pvp-name mio-pvp-right ${!aWon ? "mio-pvp-winner" : ""}">${pb}</span>
      </div>`;
      })
      .join("");
    pvpEl.innerHTML = `<div class="mio-pvp-label">PLAYER H2H</div>${pvpRows}`;
    _mioSched(() => {
      pvpEl.querySelectorAll(".mio-pvp-row").forEach((row, ri) => {
        const numEl = row.querySelector(
          aWon ? ".mio-pvp-num-a" : ".mio-pvp-num-b",
        );
        if (!numEl) return;
        const after = parseInt(numEl.dataset.after, 10);
        const before = parseInt(numEl.textContent, 10);
        if (after > before) {
          _mioSched(() => {
            numEl.textContent = after;
            numEl.classList.add("mio-count-flash");
            const plus = document.createElement("span");
            plus.className = "mio-float-plus";
            plus.textContent = "+1";
            numEl.parentElement.appendChild(plus);
            _mioSched(() => {
              numEl.classList.remove("mio-count-flash");
              plus.remove();
            }, 950);
          }, ri * 160);
        }
      });
    }, 1150);
  } else if (pvpEl) {
    pvpEl.innerHTML = "";
  }

  // Event badges
  const badges = [];
  if (isFireMatch(m))
    badges.push(`<span class="event-badge fire">🔥 FIRE</span>`);
  if (isDominatingMatch(m))
    badges.push(`<span class="event-badge dominate">💀 DOMINATING</span>`);
  if (isZeroMatch(m))
    badges.push(`<span class="event-badge zero">😂 ZERO</span>`);
  document.getElementById("mio-badges").innerHTML = badges.join("");

  // Note (if present)
  const noteEl = document.getElementById("mio-note");
  if (noteEl) {
    noteEl.textContent = m.note || "";
    noteEl.style.display = m.note ? "block" : "none";
  }

  // ── Context extras ──────────────────────────────────────────
  const ctxEl = document.getElementById("mio-context-extras");
  if (ctxEl) {
    const ctxParts = [];

    // Streak context: did this extend or end a notable streak?
    const priorMs = _amE.filter((m) => _upToBeforeE.has(m));
    [...m.teamA, ...m.teamB].forEach((p) => {
      const pPrior = priorMs.filter((pm) =>
        [...(pm.teamA || []), ...(pm.teamB || [])].includes(p),
      );
      if (!pPrior.length) return;
      let sk = 0,
        st = null;
      for (let i = pPrior.length - 1; i >= 0; i--) {
        const pm = pPrior[i];
        const inA2 = (pm.teamA || []).includes(p);
        const won2 = inA2 ? pm.scoreA > pm.scoreB : pm.scoreB > pm.scoreA;
        if (st === null) {
          st = won2;
          sk = 1;
        } else if (won2 === st) sk++;
        else break;
      }
      const inA3 = (m.teamA || []).includes(p);
      const won3 = inA3 ? aWon : !aWon;
      if (st !== null && won3 === st && sk >= 2) {
        ctxParts.push(
          `🔥 ${normPlayer(p)}'s ${st ? "win" : "loss"} streak → ${sk + 1}`,
        );
      } else if (st !== null && won3 !== st && sk >= 3) {
        ctxParts.push(
          `💥 ${normPlayer(p)}'s ${sk}-${st ? "W" : "L"} streak ended`,
        );
      }
    });

    // ELO tier cross: check if any player crossed a tier boundary
    const ELO_TIERS = [
      { t: 900, n: "BRONZE" },
      { t: 1000, n: "SILVER" },
      { t: 1100, n: "GOLD" },
      { t: 1200, n: "PLATINUM" },
    ];
    [...m.teamA, ...m.teamB].forEach((p) => {
      const pre = priorElo[p] || 1000;
      const post = afterElo[p] || 1000;
      ELO_TIERS.forEach(({ t, n }) => {
        if (pre < t && post >= t)
          ctxParts.push(`⭐ ${normPlayer(p)} reached ${n}`);
        else if (pre >= t && post < t)
          ctxParts.push(`📉 ${normPlayer(p)} dropped below ${n}`);
      });
    });

    // Last meeting reminder
    const tkA2 = [...m.teamA].sort().join("|");
    const tkB2 = [...m.teamB].sort().join("|");
    const lastMeeting = [..._amE.filter((m) => _upToBeforeE.has(m))]
      .reverse()
      .find((pm) => {
        const pmA2 = [...(pm.teamA || [])].sort().join("|");
        const pmB2 = [...(pm.teamB || [])].sort().join("|");
        return (
          (pmA2 === tkA2 && pmB2 === tkB2) || (pmA2 === tkB2 && pmB2 === tkA2)
        );
      });
    if (lastMeeting) {
      const lmAWon = lastMeeting.scoreA > lastMeeting.scoreB;
      const lmA = [...lastMeeting.teamA].sort().join("|");
      const lastWinnerName = lmA === tkA2 ? nameA : nameB;
      ctxParts.push(
        `📅 Last meeting: ${fmtDate(lastMeeting.date)} · ${lastMeeting.scoreA}–${lastMeeting.scoreB} (${lastWinnerName.split("<br>").join(" ")} won)`,
      );
    }

    // Relative performance vs team averages
    const teamAvgScore = (players) => {
      const ms = _amE
        .filter((m) => _upToBeforeE.has(m))
        .filter(
          (pm) =>
            players.every((p) => (pm.teamA || []).includes(p)) ||
            players.every((p) => (pm.teamB || []).includes(p)),
        );
      if (!ms.length) return null;
      const totals = ms.map((pm) => {
        const tk = [...players].sort().join("|");
        const pmA3 = [...(pm.teamA || [])].sort().join("|");
        const ownScore = pmA3 === tk ? pm.scoreA : pm.scoreB;
        const oppScore = pmA3 === tk ? pm.scoreB : pm.scoreA;
        const [normOwn] = _normScores(ownScore, oppScore);
        return normOwn;
      });
      return totals.reduce((s, v) => s + v, 0) / totals.length;
    };
    const avgA2 = teamAvgScore(m.teamA);
    const avgB2 = teamAvgScore(m.teamB);
    if (avgA2 !== null && m.scoreA > avgA2 + 0.4)
      ctxParts.push(
        `📈 ${nameA.split("<br>").join(" ")} above avg (${avgA2.toFixed(1)})`,
      );
    else if (avgA2 !== null && m.scoreA < avgA2 - 0.4)
      ctxParts.push(
        `📉 ${nameA.split("<br>").join(" ")} below avg (${avgA2.toFixed(1)})`,
      );
    if (avgB2 !== null && m.scoreB > avgB2 + 0.4)
      ctxParts.push(
        `📈 ${nameB.split("<br>").join(" ")} above avg (${avgB2.toFixed(1)})`,
      );
    else if (avgB2 !== null && m.scoreB < avgB2 - 0.4)
      ctxParts.push(
        `📉 ${nameB.split("<br>").join(" ")} below avg (${avgB2.toFixed(1)})`,
      );

    ctxEl.innerHTML = ctxParts.length
      ? ctxParts.map((t) => `<div class="mio-ctx-line">${t}</div>`).join("")
      : "";
    ctxEl.style.display = ctxParts.length ? "block" : "none";
  }

  // Show overlay
  const overlay = document.getElementById("match-intro-overlay");
  overlay.classList.remove("active");
  void overlay.offsetWidth;
  overlay.classList.add("active");

  // Animate scores in after panels slide in
  const animScore = (el, final, delay) =>
    _mioSched(() => {
      let cur = 0;
      const tick = () => {
        cur = Math.min(cur + 1, final);
        el.textContent = cur;
        if (cur < final) _mioSched(tick, 110);
      };
      tick();
    }, delay);
  animScore(scoreAEl, m.scoreA, 480);
  animScore(scoreBEl, m.scoreB, 480);

  // Skip handler: jump every animated value to its final state
  _mioFinalize = () => {
    scoreAEl.textContent = m.scoreA;
    scoreBEl.textContent = m.scoreB;
    if (h2hEl) {
      const winNumEl = h2hEl.querySelector(
        aWon ? ".mio-h2h-num-a" : ".mio-h2h-num-b",
      );
      if (winNumEl) winNumEl.textContent = aWon ? h2hAfterA : h2hAfterB;
    }
    if (pvpEl) {
      pvpEl.querySelectorAll(".mio-pvp-row").forEach((row) => {
        const numEl = row.querySelector(
          aWon ? ".mio-pvp-num-a" : ".mio-pvp-num-b",
        );
        if (!numEl) return;
        const after = parseInt(numEl.dataset.after, 10);
        if (!isNaN(after)) numEl.textContent = after;
      });
    }
    // Remove any floating +1 elements still in flight
    document.querySelectorAll(".mio-float-plus").forEach((el) => el.remove());
    document
      .querySelectorAll(".mio-count-flash")
      .forEach((el) => el.classList.remove("mio-count-flash"));
  };
}

function closeMatchIntro() {
  _mioTimers.forEach((id) => clearTimeout(id));
  _mioTimers = [];
  _mioFinalize = null;
  document.querySelectorAll(".mio-float-plus").forEach((el) => el.remove());
  document.getElementById("match-intro-overlay").classList.remove("active");
}

// Delegated click: tap any match card (not admin buttons) to open intro
document.addEventListener("click", (e) => {
  const card = e.target.closest(".match-card");
  if (!card) return;
  if (e.target.closest("button, .swipe-delete-reveal")) return;
  const idx = parseInt(card.dataset.matchIdx, 10);
  if (!isNaN(idx)) openMatchIntro(idx);
});

export { openMatchIntro, closeMatchIntro, mioSkipAnimation };
