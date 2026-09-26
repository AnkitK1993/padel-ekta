// ── HISTORY / SESSION SUMMARY CARD ─────────────────────────
// Builds the "HIGHLIGHTS" card (podium, awards, hot/cold, player-of-the-period,
// ASS changes) as an HTML string. Pure string output. Imports what's already
// modular; the app-coupled helpers (normPlayer, getPairStats) are injected via
// initHistorySummaryDeps so the body stays close to the original.
import { computeStats } from "../domain/stats.js";
import { computeASS } from "../domain/ass.js";
import { _rankColor, escHtml } from "./format.js";
import { activeMatches } from "../domain/selectors.js";

let _deps = {
  normPlayer: (n) => n,
  getPairStats: () => [],
  memoAss: () => ({}),
  // Rating accessors follow the Summary tab's scoring picker instead of
  // being hard-wired to ASS CLASSIC. Each falls back to the original
  // engine/format, so nothing changes if they aren't supplied.
  ratingMap: (ms) => computeASS(ms),
  ratingDefault: () => 1000,
  ratingFmt: (v) => String(Math.round(v)),
  ratingLabel: () => "ASS",
  matchDeltasFn: (ms) => null,
  topGainersWindow: () => "today",
  todayISO: () => "",
};
export function initHistorySummaryDeps(d) {
  _deps = { ..._deps, ...d };
}
// Thin aliases so the function body below is an unmodified copy of the original.
const normPlayer = (n) => _deps.normPlayer(n);
const getPairStats = (m) => _deps.getPairStats(m);
const _memoASS = () => _deps.memoAss();
const _ratingMap = (ms) => _deps.ratingMap(ms);
const _ratingDefault = () => _deps.ratingDefault();
const _ratingFmt = (v) => _deps.ratingFmt(v);
const _ratingLabel = () => _deps.ratingLabel();

export function buildHistorySummary(matches, filter = "all") {
  if (matches.length < 3) return "";
  const stats = computeStats(matches, _ratingMap(matches));
  const playerSet = new Set();
  let totalGames = 0,
    totalMargin = 0;
  const scoreDist = {};
  matches.forEach((m) => {
    [...m.teamA, ...m.teamB].forEach((p) => playerSet.add(normPlayer(p)));
    totalGames += m.scoreA + m.scoreB;
    totalMargin += Math.abs(m.scoreA - m.scoreB);
    const hi = Math.max(m.scoreA, m.scoreB),
      lo = Math.min(m.scoreA, m.scoreB);
    const k = `${hi}-${lo}`;
    scoreDist[k] = (scoreDist[k] || 0) + 1;
  });
  const avgMargin = (totalMargin / matches.length).toFixed(1);
  const medals = ["🥇", "🥈", "🥉"];
  let delay = 60;
  const d = () => {
    const v = delay;
    delay += 65;
    return v;
  };

  // ── TOP POINTS GAINERS — replaces the old static leaderboard-rank podium.
  // "TODAY" is a fresh, career-blind walk of just today's real-clock matches
  // (mirrors the MATCHES PLAYED section's own TODAY reset); "ALL TIME" is
  // each player's total career gain since their baseline. Independent of the
  // `filter` param (whatever date range the rest of this card is scoped to).
  const _tgWindow = _deps.topGainersWindow();
  const _ratingDef = _ratingDefault();
  const _allActiveForGains = activeMatches();
  const _lbl = _ratingLabel();
  const gainers = (() => {
    if (_tgWindow === "today") {
      const todayMs = _allActiveForGains.filter(
        (m) => (m.date || "") === _deps.todayISO(),
      );
      const deltasMap = _deps.matchDeltasFn(todayMs);
      const totals = {};
      const counts = {};
      todayMs.forEach((m) => {
        const info = deltasMap?.get ? deltasMap.get(m) : null;
        [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
          const dv = info?.playerDeltas?.[p];
          if (dv === undefined) return;
          totals[p] = (totals[p] || 0) + dv;
          counts[p] = (counts[p] || 0) + 1;
        });
      });
      return Object.entries(totals)
        .map(([p, delta]) => ({ name: normPlayer(p), delta, mp: counts[p] }))
        .sort((a, b) => b.delta - a.delta);
    }
    const allMap = _ratingMap(_allActiveForGains);
    const seen = new Set();
    const mpByPlayer = {};
    _allActiveForGains.forEach((m) =>
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
        seen.add(p);
        mpByPlayer[p] = (mpByPlayer[p] || 0) + 1;
      }),
    );
    return [...seen]
      .map((p) => ({
        name: normPlayer(p),
        delta: (allMap[p] ?? _ratingDef) - _ratingDef,
        mp: mpByPlayer[p],
      }))
      .sort((a, b) => b.delta - a.delta);
  })();
  const topGainers = gainers.slice(0, Math.min(3, gainers.length));
  const podiumHtml = topGainers
    .map((p, i) => {
      const col = p.delta > 0 ? "var(--green)" : p.delta < 0 ? "var(--red)" : "var(--muted)";
      const sign = p.delta > 0 ? "+" : "";
      return `<div class="hsum-row hsum-cascade" style="animation-delay:${d()}ms">
            <span class="hsum-medal">${medals[i]}</span>
            <span class="hsum-pname">${escHtml(p.name)}</span>
            <span class="hsum-rec">${p.mp} mp</span>
            <span class="hsum-pct" style="color:${col}">${sign}${_ratingFmt(p.delta)} ${escHtml(_lbl)}</span>
          </div>`;
    })
    .join("");
  const gainersToggleHtml = `<div class="mdw-wrap" style="display:inline-flex;margin-left:8px;vertical-align:middle">
    <button class="mdw-btn${_tgWindow === "alltime" ? " active" : ""}" onclick="event.stopPropagation();window.toggleTopGainersWindow('alltime')">ALL TIME</button>
    <button class="mdw-btn${_tgWindow === "today" ? " active" : ""}" onclick="event.stopPropagation();window.toggleTopGainersWindow('today')">TODAY</button>
  </div>`;
  const highlights = [];
  const pairs = getPairStats(matches).filter((p) => p.played >= 2);
  if (pairs.length) {
    const b = pairs[0];
    highlights.push(
      `<div class="hsum-hl hsum-cascade" style="animation-delay:${d()}ms"><span class="hsum-hl-icon">🤝</span><span class="hsum-hl-label">Best Pair</span><span class="hsum-hl-val">${b.key} &nbsp;<span style="color:var(--green)">${b.winPct}% · ${b.played}g</span></span></div>`,
    );
  }
  const bigWin = [...matches].sort(
    (a, b) => Math.abs(b.scoreA - b.scoreB) - Math.abs(a.scoreA - a.scoreB),
  )[0];
  if (bigWin) {
    const w = bigWin.scoreA > bigWin.scoreB ? bigWin.teamA : bigWin.teamB;
    highlights.push(
      `<div class="hsum-hl hsum-cascade" style="animation-delay:${d()}ms"><span class="hsum-hl-icon">💀</span><span class="hsum-hl-label">Biggest Win</span><span class="hsum-hl-val">${bigWin.scoreA}–${bigWin.scoreB} &nbsp;${w.join(" & ")}</span></div>`,
    );
  }
  const hottest = stats
    .filter((p) => p.curStreak > 0 && p.curType === "W")
    .sort((a, b) => b.curStreak - a.curStreak)[0];
  if (hottest) {
    highlights.push(
      `<div class="hsum-hl hsum-cascade" style="animation-delay:${d()}ms"><span class="hsum-hl-icon">🔥</span><span class="hsum-hl-label">On Fire</span><span class="hsum-hl-val">${hottest.name} &nbsp;<span style="color:var(--green)">${hottest.curStreak} win streak</span></span></div>`,
    );
  }
  const topScore = Object.entries(scoreDist).sort((a, b) => b[1] - a[1])[0];
  if (topScore && topScore[1] > 1) {
    highlights.push(
      `<div class="hsum-hl hsum-cascade" style="animation-delay:${d()}ms"><span class="hsum-hl-icon">🎯</span><span class="hsum-hl-label">Top Scoreline</span><span class="hsum-hl-val">${topScore[0]} &nbsp;<span style="color:var(--muted)">${topScore[1]}× played</span></span></div>`,
    );
  }
  // Hot / Cold board
  const hotPlayers = stats
    .filter((p) => p.curType === "W" && p.curStreak >= 2)
    .sort((a, b) => b.curStreak - a.curStreak)
    .slice(0, 2);
  const coldPlayers = stats
    .filter((p) => p.curType === "L" && p.curStreak >= 2)
    .sort((a, b) => b.curStreak - a.curStreak)
    .slice(0, 2);
  let hotColdHtml = "";
  if (hotPlayers.length || coldPlayers.length) {
    const rows = [
      ...hotPlayers.map(
        (p) =>
          `<div class="hsum-hl hsum-cascade" style="animation-delay:${d()}ms"><span class="hsum-hl-icon">🔥</span><span class="hsum-hl-label" style="color:var(--green)">${p.name}</span><span class="hsum-hl-val" style="color:var(--green)">${p.curStreak}W streak</span></div>`,
      ),
      ...coldPlayers.map(
        (p) =>
          `<div class="hsum-hl hsum-cascade" style="animation-delay:${d()}ms"><span class="hsum-hl-icon">❄️</span><span class="hsum-hl-label" style="color:var(--red)">${p.name}</span><span class="hsum-hl-val" style="color:var(--red)">${p.curStreak}L streak</span></div>`,
      ),
    ];
    hotColdHtml = `<div class="hsum-section-lbl">HOT &amp; COLD</div><div class="hsum-highlights">${rows.join("")}</div>`;
  }

  // Top ASS gainer within the filtered period
  const potwLabels = {
    today: { title: "PLAYER OF THE DAY", sub: "matches today" },
    week: { title: "PLAYER OF THE WEEK", sub: "matches this week" },
    weekend: { title: "PLAYER OF THE WEEKEND", sub: "matches this weekend" },
    month: { title: "PLAYER OF THE MONTH", sub: "matches this month" },
    lastweek: { title: "BEST PLAYER OF LAST WEEK", sub: "matches last week" },
    all: { title: "ALL TIME BEST PLAYER", sub: "matches played" },
    range: { title: "TOP PLAYER", sub: "matches in range" },
  };
  const potwLabel = potwLabels[filter] || potwLabels.all;
  let potwHtml = "";
  if (matches.length >= 2) {
    const _scoringLbl = _lbl;
    const periodDates = matches.map((m) => m.date || "").filter(Boolean);
    const firstDate = periodDates.reduce((a, b) => (a < b ? a : b));
    const beforeMatches = activeMatches().filter((m) => (m.date || "") < firstDate);
    const preScore = _ratingMap(beforeMatches);
    const fullScore = _ratingMap(activeMatches());
    const periodPlayers = new Set();
    matches.forEach((m) =>
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) =>
        periodPlayers.add(p),
      ),
    );
    const potwDeltas = [...periodPlayers]
      .map((p) => ({
        name: normPlayer(p),
        delta: (fullScore[p] ?? _ratingDef) - (preScore[p] ?? _ratingDef),
        mp: matches.filter((m) =>
          [...(m.teamA || []), ...(m.teamB || [])].includes(p),
        ).length,
      }))
      .filter((p) => p.delta > 0 && p.mp >= 2)
      .sort((a, b) => b.delta - a.delta);
    const potw = potwDeltas[0];
    if (potw) {
      potwHtml = `<div class="potw-card hsum-cascade" style="animation-delay:${d()}ms">
        <div class="potw-crown">⭐</div>
        <div class="potw-body">
          <div class="potw-label">${potwLabel.title}</div>
          <div class="potw-name">${escHtml(potw.name)}</div>
          <div class="potw-meta"><span style="color:var(--green);font-weight:800">+${_ratingFmt(potw.delta)} ${escHtml(_scoringLbl)}</span> · ${potw.mp} ${potwLabel.sub}</div>
        </div>
      </div>`;
    }
  }

  // Rating changes table for the filtered period — follows the active
  // scoring picker (was hardcoded to computeASS/1000).
  let sessionRecapHtml = "";
  if (matches.length) {
    const periodDates2 = matches.map((m) => m.date || "1970-01-01");
    const firstDate2 = periodDates2.reduce((a, b) => (a < b ? a : b));
    const beforeMs2 = activeMatches().filter((m) => (m.date || "1970-01-01") < firstDate2);
    const assAfter  = _ratingMap(activeMatches());
    const assBefore = _ratingMap(beforeMs2);
    const periodPlayers2 = new Set();
    matches.forEach((m) =>
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) =>
        periodPlayers2.add(p),
      ),
    );
    const _scoreColor = (d) => d > 0 ? "var(--green)" : d < 0 ? "var(--red)" : "var(--muted)";
    const _sign = (d) => d > 0 ? "+" : "";
    const rows = [...periodPlayers2]
      .map((p) => {
        const name = normPlayer(p);
        const assStart = assBefore[p] ?? _ratingDef;
        const assEnd   = assAfter[p]  ?? _ratingDef;
        const assDelta = assEnd - assStart;
        return { name, assStart, assEnd, assDelta };
      })
      .sort((a, b) => b.assDelta - a.assDelta);
    const th = (label) => `<th style="padding:3px 5px;color:var(--muted);font-size:8px;font-weight:700;letter-spacing:0.06em;text-align:center;border-bottom:1px solid rgba(255,255,255,0.08)">${label}</th>`;
    const deltaCell = (d) => {
      const sign = _sign(d);
      const col  = _scoreColor(d);
      return `<td style="padding:3px 4px;text-align:center;font-size:10px;font-weight:800;color:${col}">${sign}${_ratingFmt(d)}</td>`;
    };
    const numCell = (v) => `<td style="padding:3px 4px;text-align:center;font-size:10px;color:var(--muted);font-variant-numeric:tabular-nums">${_ratingFmt(v)}</td>`;
    const tableRows = rows.map((r, i) => `
      <tr class="hsum-cascade" style="animation-delay:${d()}ms;border-bottom:1px solid rgba(255,255,255,0.04)">
        <td style="padding:4px 5px;font-size:10px;font-weight:700;text-transform:uppercase;white-space:nowrap">${escHtml(r.name)}</td>
        ${numCell(r.assStart)}
        ${numCell(r.assEnd)}
        ${deltaCell(r.assDelta)}
      </tr>`).join("");
    sessionRecapHtml = `
      <div class="hsum-section-lbl">${escHtml(_lbl)} CHANGES</div>
      <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
        <table style="width:100%;border-collapse:collapse;table-layout:auto">
          <thead><tr>
            ${th("PLAYER")}
            ${th(`${escHtml(_lbl)} START`)}${th(`${escHtml(_lbl)} NOW`)}${th(`${escHtml(_lbl)} Δ`)}
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>`;
  }

  return `<div class="hist-summary-card hsum-card-anim">
          <div class="hsum-header">
            <span class="hsum-title">📊 HIGHLIGHTS</span>
            <span class="hsum-count">${matches.length} match${matches.length > 1 ? "es" : ""}</span>
          </div>
          <div class="hsum-stats">
            <div class="hsum-stat hsum-cascade" style="animation-delay:0ms"><div class="hsum-val">${matches.length}</div><div class="hsum-lbl">Matches</div></div>
            <div class="hsum-stat hsum-cascade" style="animation-delay:65ms"><div class="hsum-val">${playerSet.size}</div><div class="hsum-lbl">Players</div></div>
            <div class="hsum-stat hsum-cascade" style="animation-delay:130ms"><div class="hsum-val">${totalGames}</div><div class="hsum-lbl">Games</div></div>
            <div class="hsum-stat hsum-cascade" style="animation-delay:195ms"><div class="hsum-val">±${avgMargin}</div><div class="hsum-lbl">Avg Margin</div></div>
          </div>
          ${potwHtml}
          ${topGainers.length ? `<div class="hsum-section-lbl" style="display:flex;align-items:center;justify-content:space-between">Top Points Gainers${gainersToggleHtml}</div><div class="hsum-podium">${podiumHtml}</div>` : ""}
          ${highlights.length ? `<div class="hsum-section-lbl">AWARDS</div><div class="hsum-highlights">${highlights.join("")}</div>` : ""}
          ${hotColdHtml}
          ${sessionRecapHtml}
        </div>`;
}
