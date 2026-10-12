// ── MATCH INTRO OVERLAY FEATURE MODULE ───────────────────────────────────────
// Extracted from app.js: all match-intro state, animation helpers, openMatchIntro,
// closeMatchIntro, and the match-card click listener.
// openEditMatch is called via window.openEditMatch since it lives in app.js.
import { normPlayer } from "../src/domain/players.js";
import { state } from "../src/domain/state.js";
import {
  rating,
  scopeFor,
  careerGamesBefore,
} from "../src/domain/rating-service.js";
import { isRatedMatch } from "../src/domain/selectors.js";
import { matchRating as _matchRating } from "../src/app/match-ratings.js";
import {
  computePlayerXP,
  getPlayerLevel,
} from "../src/domain/xp.js";
import { getPairKey } from "../src/domain/pairs.js";
import { memoPairStats } from "../src/app/memo-store.js";
import {
  escHtml,
  fmtDate,
} from "../src/ui/format.js";
import {
  isFireMatch,
  isDominatingMatch,
  isZeroMatch,
} from "../src/ui/render-match-rows.js";

// Everything rating-related comes straight from the rating service, so this
// overlay follows the Summary tab's scoring picker by construction, and the
// four players' before -> after are the History card's own numbers
// (src/app/match-ratings.js) — identical to the card that opened it.

// ── MATCH INTRO OVERLAY ────────────────────────────────────
let _mioTimers = [];
let _mioFinalize = null;
let _mioAssMemo = null; // { idx, amRef, priorAss, afterAss } — see openMatchIntro
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

  // H2H / streak context uses the raw match log (state.matches) — it opens
  // FROM that log, so results and records must agree with the card that
  // opened it. RATINGS are different: they only ever count RATED matches (no
  // guests, no excluded players), scoped to the season the match was played
  // in — the very list the leaderboard scores — so the numbers here can't
  // disagree with the leaderboard or the History card.
  const _amE = state.matches;
  // A guest / excluded-player match is a plain result: it changes nobody's
  // rating, so no rating numbers are shown for it.
  const _rated = isRatedMatch(m);
  const _scopeE = scopeFor(m);
  // Pre/post-match ASS over that set. One O(n) rating-map pass each side;
  // cached on (idx, match count, active label) so re-opening the same banner
  // — or any re-trigger — skips the recompute. _upToBeforeE (matches
  // strictly before this one) is used throughout the rest of this function
  // (H2H, last-meeting, context lines), so it must live at the function
  // scope — NOT inside the memo else-branch, or it's undefined on the
  // memo-hit path and a ReferenceError elsewhere (which silently aborts the
  // whole overlay).
  // "Before this match" follows the same order the rating engines use — by
  // date, entry order breaking ties — not raw array position, which disagrees
  // when a match was entered out of date order.
  const _upToBeforeE = new Set(
    state.matches.filter(
      (x, i) =>
        (x.date || "") < (m.date || "") ||
        ((x.date || "") === (m.date || "") && i < idx),
    ),
  );
  const _mcDefault = rating.def();
  let priorAss, afterAss;
  if (
    _mioAssMemo &&
    _mioAssMemo.idx === idx &&
    _mioAssMemo.amLen === _scopeE.length &&
    _mioAssMemo.label === rating.label()
  ) {
    priorAss = _mioAssMemo.priorAss;
    afterAss = _mioAssMemo.afterAss;
  } else {
    // Cut by DATE order (ties keep entry order), the same order the rating
    // engines and the History card walk — array position alone disagrees when
    // a match was entered out of date order.
    const _scopeSorted = [..._scopeE].sort((a, b) =>
      (a.date || "").localeCompare(b.date || ""),
    );
    const _k = _scopeSorted.indexOf(m);
    // An unrated match isn't in the scope: it sits in the season by date
    // (entry order breaks ties) and changes nobody's rating.
    const _before =
      _k >= 0
        ? _scopeSorted.slice(0, _k)
        : _scopeSorted.filter(
            (x) =>
              (x.date || "") < (m.date || "") ||
              ((x.date || "") === (m.date || "") && _upToBeforeE.has(x)),
          );
    const _incl = _k >= 0 ? _scopeSorted.slice(0, _k + 1) : _before;
    priorAss = rating.map(_before);
    afterAss = rating.map(_incl);
    _mioAssMemo = {
      idx,
      amLen: _scopeE.length,
      label: rating.label(),
      priorAss,
      afterAss,
    };
  }
  const aWon = m.scoreA > m.scoreB;

  // For the four players in this match use the History card's own numbers, so
  // the overlay can never disagree with the card that opened it.
  const _mr = _matchRating(m);
  if (_mr) {
    priorAss = { ...priorAss };
    afterAss = { ...afterAss };
    Object.entries(_mr).forEach(([p, v]) => {
      priorAss[p] = v.after - v.delta;
      afterAss[p] = v.after;
    });
  }

  // Pre-match individual and pair ranks
  const indivRanked = Object.entries(priorAss).sort((a, b) => b[1] - a[1]);
  const allPairs = memoPairStats();
  const pairsByElo = allPairs
    .map((p) => ({
      key: p.key,
      avg:
        p.players.reduce((s, n) => s + (priorAss[n] ?? _mcDefault), 0) /
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

  const avgAss = (players) =>
    rating.fmt(
      players.reduce((s, p) => s + (priorAss[p] ?? _mcDefault), 0) /
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
  const _mioLbl = rating.label();
  document.getElementById("mio-elo-a").textContent = _rated
    ? `${_mioLbl} ${avgAss(m.teamA)} · LVL ${teamAvgLvl(m.teamA)}`
    : `LVL ${teamAvgLvl(m.teamA)}`;
  document.getElementById("mio-elo-b").textContent = _rated
    ? `${_mioLbl} ${avgAss(m.teamB)} · LVL ${teamAvgLvl(m.teamB)}`
    : `LVL ${teamAvgLvl(m.teamB)}`;

  const scoreAEl = document.getElementById("mio-score-a");
  const scoreBEl = document.getElementById("mio-score-b");
  scoreAEl.textContent = "0";
  scoreBEl.textContent = "0";
  scoreAEl.className = "mio-score-num" + (aWon ? " win" : "");
  scoreBEl.className = "mio-score-num" + (!aWon ? " win" : "");

  const winner = aWon ? nameA : nameB;
  document.getElementById("mio-result-line").textContent =
    `${winner.toUpperCase()} WIN`;

  // Per-player pill: name, rating before -> after, and (EP) the raw points
  // earned. Rating goes straight through the active picker's formatter.
  const _pts = rating.entry(m)?.playerDeltas ?? null;
  const deltaPills = [...m.teamA, ...m.teamB]
    .map((p) => {
      const oldR = priorAss[p] ?? _mcDefault;
      const newR = afterAss[p] ?? _mcDefault;
      const aCls = newR - oldR >= 0 ? "gain" : "loss";
      const ptsHtml =
        _pts && _pts[p] !== undefined
          ? `<span class="mio-delta-pts">${_pts[p] >= 0 ? "+" : ""}${_pts[p]} pts</span>`
          : "";
      return `<span class="mio-delta-pill"><span class="mio-delta-name">${escHtml(normPlayer(p))}</span><span class="mio-delta-sub mio-delta-range ${aCls}">${rating.fmt(oldR)} → ${rating.fmt(newR)}</span>${ptsHtml}</span>`;
    })
    .join("");
  document.getElementById("mio-elo-deltas").innerHTML = _rated
    ? deltaPills
    : `<span class="mio-unrated" style="font-size:11px;color:var(--muted);font-weight:700;letter-spacing:0.04em">GUEST MATCH · NOT COUNTED IN RATINGS</span>`;

  // ── Extra detail: win chance, pair records, per-player cards ─────────
  renderMatchDetail(m, priorAss, afterAss, _pts, aWon, nameA, nameB, _rated);

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
        <div class="mio-h2h-lbl">${escHtml(nameA)}</div>
      </div>
      <div class="mio-h2h-sep">${h2hTotal === 0 ? "FIRST<br>MEETING" : "H2H"}</div>
      <div class="mio-h2h-cell" style="position:relative">
        <div class="mio-h2h-num mio-h2h-num-b" style="color:${colB}">${h2hWinsB}</div>
        <div class="mio-h2h-lbl">${escHtml(nameB)}</div>
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
        <span class="mio-pvp-name ${aWon ? "mio-pvp-winner" : ""}">${escHtml(pa)}</span>
        <span class="mio-pvp-rec" style="position:relative">
          <span class="mio-pvp-num-a" data-after="${newWA}"${aWon ? ' style="color:var(--green)"' : ""}>${wA}</span>–<span class="mio-pvp-num-b" data-after="${newWB}"${!aWon ? ' style="color:var(--green)"' : ""}>${wB}</span>
        </span>
        <span class="mio-pvp-name mio-pvp-right ${!aWon ? "mio-pvp-winner" : ""}">${escHtml(pb)}</span>
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

    // Rating tier cross: check if any player crossed a tier boundary. The
    // tier thresholds are 1000-centred (ASS CLASSIC's own scale), so they
    // only mean anything for engines on that scale — skip this callout for
    // a 0-based engine (EP) rather than showing tiers no one will ever hit.
    if (_rated && !rating.isZeroBased()) {
      const ASS_TIERS = [
        { t: 900, n: "BRONZE" },
        { t: 1000, n: "SILVER" },
        { t: 1100, n: "GOLD" },
        { t: 1200, n: "PLATINUM" },
      ];
      [...m.teamA, ...m.teamB].forEach((p) => {
        const pre = priorAss[p] ?? _mcDefault;
        const post = afterAss[p] ?? _mcDefault;
        ASS_TIERS.forEach(({ t, n }) => {
          if (pre < t && post >= t)
            ctxParts.push(`⭐ ${normPlayer(p)} reached ${n}`);
          else if (pre >= t && post < t)
            ctxParts.push(`📉 ${normPlayer(p)} dropped below ${n}`);
        });
      });
    }

    // Team rating gained/lost — net of the two teammates' individual deltas
    // (already shown per-player above; this is the team-level swing).
    const teamDelta = (players) =>
      players.reduce(
        (s, p) => s + ((afterAss[p] ?? _mcDefault) - (priorAss[p] ?? _mcDefault)),
        0,
      );
    const teamADelta = teamDelta(m.teamA);
    const teamBDelta = teamDelta(m.teamB);
    const fmtTeamDelta = (d) =>
      `${d >= 0 ? "+" : ""}${rating.fmt(d)} ${_mioLbl}`;
    if (_rated) {
      ctxParts.push(
        `${teamADelta >= 0 ? "📈" : "📉"} ${nameA.split("<br>").join(" ")} ${fmtTeamDelta(teamADelta)}`,
      );
      ctxParts.push(
        `${teamBDelta >= 0 ? "📈" : "📉"} ${nameB.split("<br>").join(" ")} ${fmtTeamDelta(teamBDelta)}`,
      );
    }

    ctxEl.innerHTML = ctxParts.length
      ? ctxParts
          .map((t) => `<div class="mio-ctx-line">${escHtml(t)}</div>`) // plain text with names
          .join("")
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


// Win-chance bar, pair records and a card per player (rank, win %, total
// points, game number / newcomer flag, recent form and how the points were
// built). Everything beyond rank/win%/form/pair record is EP-only and simply
// omitted for the other scoring systems.
function renderMatchDetail(m, priorAss, afterAss, pts, aWon, nameA, nameB, rated = true) {
  const wcEl = document.getElementById("mio-winchance");
  const dEl = document.getElementById("mio-detail");
  if (!wcEl || !dEl) return;
  if (!rated) {
    // A plain result: nothing to explain about ratings.
    wcEl.innerHTML = "";
    wcEl.style.display = "none";
    dEl.innerHTML = "";
    dEl.style.display = "none";
    return;
  }
  const lbl = rating.label();
  const def = rating.def();
  const guests = new Set(
    Object.values(state.players || {})
      .filter((p) => p.isGuest)
      .map((p) => p.name),
  );
  const byDate = (a, b) => (a.date || "").localeCompare(b.date || "");
  const scopeSorted = [...scopeFor(m)].sort(byDate);
  const k = scopeSorted.indexOf(m);
  const beforeScope = k >= 0 ? scopeSorted.slice(0, k) : scopeSorted;
  const inclScope = k >= 0 ? scopeSorted.slice(0, k + 1) : scopeSorted;
  const allSorted = [...state.matches].sort(byDate);
  const ka = allSorted.indexOf(m);
  const lifetimeBefore = ka >= 0 ? allSorted.slice(0, ka) : allSorted;
  const entry = rating.entry(m);
  const detail = entry ? { expA: entry.expA, breakdown: entry.breakdown } : null;
  const careerN = careerGamesBefore(m);

  const involves = (x, p) => (x.teamA || []).includes(p) || (x.teamB || []).includes(p);
  const wonBy = (x, p) =>
    (x.teamA || []).includes(p) ? x.scoreA > x.scoreB : x.scoreB > x.scoreA;
  const record = (ms, p) => {
    let w = 0;
    let g = 0;
    ms.forEach((x) => {
      if (!involves(x, p)) return;
      g++;
      if (wonBy(x, p)) w++;
    });
    return { w, g };
  };
  const pct = (r) => (r.g ? Math.round((100 * r.w) / r.g) : 0);
  const rankIn = (map, p) => {
    if (!(p in map)) return null;
    let r = 1;
    Object.keys(map).forEach((q) => {
      if (q !== p && !guests.has(q) && map[q] > map[p]) r++;
    });
    return r;
  };
  const totBefore = rating.totals(beforeScope);

  // 2 — win chance
  if (detail) {
    const pA = Math.round(detail.expA * 100);
    const pB = 100 - pA;
    const winnerP = aWon ? pA : pB;
    const upset = winnerP < 40 ? `<span class="mio-wc-upset">⚡ UPSET</span>` : "";
    wcEl.innerHTML = `<div class="mio-wc-lbl">WIN CHANCE BEFORE THE MATCH ${upset}</div>
      <div class="mio-wc-bar"><div class="mio-wc-a" style="flex:${pA}">${pA}%</div><div class="mio-wc-b" style="flex:${pB}">${pB}%</div></div>
      <div class="mio-wc-names"><span>${escHtml(nameA)}</span><span>${escHtml(nameB)}</span></div>`;
    wcEl.style.display = "";
  } else {
    wcEl.innerHTML = "";
    wcEl.style.display = "none";
  }

  // 6 — pair records
  const pairLine = (team) => {
    const [x, y] = team;
    if (!y) return "";
    let w = 0;
    let l = 0;
    lifetimeBefore.forEach((z) => {
      const together =
        ((z.teamA || []).includes(x) && (z.teamA || []).includes(y)) ||
        ((z.teamB || []).includes(x) && (z.teamB || []).includes(y));
      if (!together) return;
      if (wonBy(z, x)) w++;
      else l++;
    });
    const nm = `${escHtml(normPlayer(x))} &amp; ${escHtml(normPlayer(y))}`;
    return w + l
      ? `<div class="mio-pair-line"><b>${nm}</b> together: ${w}–${l} (${Math.round((100 * w) / (w + l))}%)</div>`
      : `<div class="mio-pair-line"><b>${nm}</b> — first time as a pair</div>`;
  };

  const card = (p) => {
    const ra = rankIn(priorAss, p);
    const rb = rankIn(afterAss, p);
    const wb = record(beforeScope, p);
    const wa = record(inclScope, p);
    const parts = [];
    parts.push(
      `<div class="mio-dc-row"><span>Rank</span><b>${ra ? `#${ra}` : "—"} → ${rb ? `#${rb}` : "—"}</b></div>`,
    );
    parts.push(
      `<div class="mio-dc-row"><span>Win %</span><b>${pct(wb)}% → ${pct(wa)}%</b></div>`,
    );
    if (totBefore && pts && pts[p] !== undefined) {
      const tb = totBefore[p] ?? 0;
      parts.push(
        `<div class="mio-dc-row"><span>Total pts</span><b>${tb} → ${tb + pts[p]}</b></div>`,
      );
    }
    const gamesBefore = wb.g;
    const car = careerN[p] ?? 0;
    const bd = detail && detail.breakdown ? detail.breakdown[p] : null;
    const vet = bd ? bd.vet : car >= 50;
    parts.push(
      `<div class="mio-dc-row"><span>Game</span><b>#${gamesBefore + 1} · ${car} career · <em class="${vet ? "vet" : "new"}">${vet ? "veteran" : "newcomer"}</em></b></div>`,
    );
    const form = lifetimeBefore
      .filter((x) => involves(x, p))
      .slice(-5)
      .map((x) => `<i class="${wonBy(x, p) ? "w" : "l"}"></i>`)
      .join("");
    parts.push(
      `<div class="mio-dc-row"><span>Form</span><b class="mio-form">${form || "—"}</b></div>`,
    );
    if (bd) {
      const sign = (v) => `${v >= 0 ? "+" : "−"}${Math.abs(v)}`;
      const fin = pts && pts[p] !== undefined ? pts[p] : bd.raw + bd.shift;
      const split = bd.shift ? `, partner split ${sign(bd.shift)}` : "";
      const txt = bd.won
        ? `Win: 100 × ${bd.oppF.toFixed(2)} opposition × ${bd.qualityF.toFixed(2)} margin = ${bd.raw}${split} → <b>${sign(fin)}</b>`
        : bd.vet
          ? `Veteran loss (team ${Math.round(bd.teamP * 100)}% favoured): ${sign(bd.raw)}${split} → <b>${sign(fin)}</b>`
          : `Newcomer loss credit: ${sign(bd.raw)}${split} → <b>${sign(fin)}</b>`;
      parts.push(`<div class="mio-dc-why">${txt}</div>`);
    }
    return `<div class="mio-dcard"><div class="mio-dc-name">${escHtml(normPlayer(p))}</div>${parts.join("")}</div>`;
  };

  dEl.style.display = "";
  dEl.innerHTML = `<div class="mio-detail-lbl">PAIR RECORD (BEFORE THIS MATCH)</div>
    ${pairLine(m.teamA)}${pairLine(m.teamB)}
    <div class="mio-detail-lbl">PLAYER BREAKDOWN · ${escHtml(lbl)}</div>
    <div class="mio-detail-grid">
      <div class="mio-detail-col">${m.teamA.map(card).join("")}</div>
      <div class="mio-detail-col">${m.teamB.map(card).join("")}</div>
    </div>`;
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
