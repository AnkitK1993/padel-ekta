// ── FAIR TEAMS (menu → ⚖️ Fair Teams) ──────────────────────
// Pick who's here; get the most even 2v2 matches on current ratings, with
// pairs already played together today ranked lower. Usable any time — not only
// inside a live session.
import { state } from "../src/domain/state.js";
import { activeMatches, guestNames } from "../src/domain/selectors.js";
import { rating } from "../src/domain/rating-service.js";
import { fairMatchups } from "../src/domain/fair-teams.js";
import { todayISO } from "../src/domain/dates.js";
import { escHtml, jsArg } from "../src/ui/format.js";

const _picked = new Set();

function _roster() {
  const guests = new Set(guestNames());
  const names = new Set();
  Object.values(state.players || {}).forEach((p) => {
    if (p && p.name && !p.isGuest) names.add(p.name);
  });
  // Anyone who played this season, in case the roster lags.
  activeMatches().forEach((m) => [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => names.add(p)));
  return [...names].filter((n) => !guests.has(n)).sort((a, b) => a.localeCompare(b));
}

function _todayPlayers() {
  const t = todayISO();
  const s = new Set();
  state.matches.filter((m) => m.date === t).forEach((m) => [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => s.add(p)));
  return s;
}

function _render() {
  const body = document.getElementById("fair-teams-body");
  if (!body) return;
  const roster = _roster();
  const today = _todayPlayers();
  const chips = roster
    .map((n) => {
      const on = _picked.has(n);
      return `<button class="ana-filter-pill${on ? " active" : ""}" aria-pressed="${on}" onclick="_fairToggle(${jsArg(n)})" style="margin:0 6px 6px 0">${escHtml(n)}</button>`;
    })
    .join("");
  let results = "";
  if (_picked.size >= 4) {
    const map = rating.map(activeMatches());
    const strength = rating.strength(map);
    const t = todayISO();
    const avoid = new Set();
    state.matches
      .filter((m) => m.date === t)
      .forEach((m) => [m.teamA, m.teamB].forEach((tm) => tm && tm.length === 2 && avoid.add([...tm].sort().join(" & "))));
    const best = fairMatchups([..._picked], strength, { top: 5, avoidPairs: avoid });
    results = best
      .map((m, i) => {
        const pct = Math.round(m.chanceA * 100);
        const sitOut = [..._picked].filter((p) => !m.teamA.includes(p) && !m.teamB.includes(p));
        return `<div class="ana-card" style="padding:10px 12px;margin-top:8px">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <div style="font-size:12px;font-weight:800">${escHtml(m.teamA.join(" & "))}</div>
            <div style="font-size:10px;color:var(--muted)">vs</div>
            <div style="font-size:12px;font-weight:800;text-align:right">${escHtml(m.teamB.join(" & "))}</div>
          </div>
          <div style="height:6px;border-radius:3px;background:rgba(255,255,255,0.08);margin-top:8px;overflow:hidden"><div style="height:100%;width:${pct}%;background:var(--theme)"></div></div>
          <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--muted);margin-top:4px">
            <span>${i === 0 ? "⭐ Most even · " : ""}${pct}% – ${100 - pct}%${m.repeats ? " · repeats a pair from today" : ""}</span>
            <span>${sitOut.length ? `Sits out: ${escHtml(sitOut.join(", "))}` : ""}</span>
          </div>
        </div>`;
      })
      .join("");
  }
  body.innerHTML = `
    <div style="font-size:10px;color:var(--muted);margin-bottom:8px">Tap who's playing. Uses current ${escHtml(rating.label())} ratings for this season.</div>
    <div style="display:flex;gap:6px;margin-bottom:8px">
      ${today.size ? `<button class="ana-filter-pill" onclick="_fairPickToday()">Today's players (${today.size})</button>` : ""}
      ${_picked.size ? `<button class="ana-filter-pill" onclick="_fairClear()">Clear</button>` : ""}
    </div>
    <div style="display:flex;flex-wrap:wrap">${chips}</div>
    <div style="font-size:10px;font-weight:700;margin-top:6px">${_picked.size} selected${_picked.size < 4 ? " — pick at least 4" : ""}</div>
    ${results}`;
}

export function openFairTeams() {
  document.getElementById("fair-teams-modal")?.remove();
  const modal = document.createElement("div");
  modal.id = "fair-teams-modal";
  modal.className = "h2h-modal-overlay";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Fair teams");
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  modal.innerHTML = `<div class="h2h-modal-card" style="max-height:85vh;display:flex;flex-direction:column">
    <div class="h2h-modal-header">
      <span class="h2h-modal-title">⚖️ FAIR TEAMS</span>
      <button class="h2h-modal-close" onclick="document.getElementById('fair-teams-modal').remove()" aria-label="Close" title="Close">✕</button>
    </div>
    <div id="fair-teams-body" style="overflow-y:auto;flex:1;padding:4px 4px 8px"></div>
  </div>`;
  document.body.appendChild(modal);
  _render();
}

window._fairToggle = (n) => {
  if (_picked.has(n)) _picked.delete(n);
  else _picked.add(n);
  _render();
};
window._fairPickToday = () => {
  _todayPlayers().forEach((p) => _picked.add(p));
  _render();
};
window._fairClear = () => {
  _picked.clear();
  _render();
};
