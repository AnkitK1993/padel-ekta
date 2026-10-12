// ── PLAYER GOALS (Player detail → 🎯 Goal, and a banner on Home) ──
// A target leaderboard rank by a date, kept on this device. Progress is read
// off the current season's leaderboard on the active scoring system.
import { activeMatches } from "../src/domain/selectors.js";
import { rating } from "../src/domain/rating-service.js";
import { goalProgress } from "../src/domain/goals.js";
import { todayISO } from "../src/domain/dates.js";
import { escHtml, jsArg, fmtDate } from "../src/ui/format.js";
import { noteError } from "../src/infra/log.js";

const KEY = "padel_goals";
let _editing = null; // name whose goal form is open for changing

function _goals() {
  try {
    const g = JSON.parse(localStorage.getItem(KEY) || "{}");
    return g && typeof g === "object" ? g : {};
  } catch (e) {
    return {};
  }
}
function _save(g) {
  try {
    localStorage.setItem(KEY, JSON.stringify(g));
  } catch (e) {
    noteError("goals:save", e);
  }
}

function _board() {
  const am = activeMatches();
  const map = rating.map(am);
  return { am, board: rating.stats(am, map).map((p) => ({ name: p.name, score: map[p.name] ?? rating.def(), mp: p.mp })) };
}

function _progress(name, goal) {
  const { am, board } = _board();
  const extra = {};
  // Wins estimate only where the score formula is known (ASS).
  if (rating.system() === "ep") {
    const totals = rating.totals(am) || {};
    const hist = (rating.timeline(am).history || {})[name] || [];
    const wins = hist.filter((h) => h.won).map((h) => h.delta);
    extra.total = totals[name] ?? 0;
    extra.games = board.find((r) => r.name === name)?.mp ?? 0;
    extra.perWin = wins.length ? wins.reduce((s, d) => s + d, 0) / wins.length : 100;
    extra.scoreFor = rating.scoreFor;
  }
  return { board, p: goalProgress({ board, name, targetRank: goal.targetRank, startRank: goal.startRank, ...extra }) };
}

function _daysLeft(by) {
  if (!by) return null;
  const ms = new Date(by + "T23:59:59") - new Date();
  return Math.ceil(ms / 86400000);
}

function _progressHtml(name, goal, compact) {
  const { board, p } = _progress(name, goal);
  const days = _daysLeft(goal.by);
  const holder = board.filter((r) => r.name !== name)[goal.targetRank - 1];
  const lines = [];
  if (p.reached) lines.push(`🎉 Target reached — you're #${p.curRank}`);
  else {
    if (holder) lines.push(`${rating.fmt(p.gap)} ${escHtml(rating.label())} behind #${goal.targetRank} (${escHtml(holder.name)})`);
    if (p.winsNeeded) lines.push(`≈ ${p.winsNeeded} more win${p.winsNeeded !== 1 ? "s" : ""} if everyone else stood still`);
  }
  if (days != null) lines.push(days >= 0 ? `${days} day${days !== 1 ? "s" : ""} left (by ${fmtDate(goal.by)})` : `Deadline passed (${fmtDate(goal.by)})`);
  return `
    <div style="display:flex;justify-content:space-between;align-items:baseline">
      <div style="font-size:${compact ? 12 : 13}px;font-weight:800">${compact ? `${escHtml(name)} · ` : ""}#${p.curRank} → #${goal.targetRank}</div>
      <div style="font-size:11px;font-weight:800;color:var(--theme)">${p.pct}%</div>
    </div>
    <div style="height:8px;border-radius:4px;background:rgba(255,255,255,0.08);margin:6px 0;overflow:hidden" role="progressbar" aria-valuenow="${p.pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Goal progress"><div style="height:100%;width:${p.pct}%;background:${p.reached ? "var(--green)" : "var(--theme)"}"></div></div>
    <div style="font-size:10px;color:var(--muted);line-height:1.6">${lines.join("<br>")}</div>`;
}

// Card for the player-detail sheet.
export function goalCardHtml(name) {
  const goal = _goals()[name];
  if (goal && _editing !== name) {
    return `<div class="ana-card" id="pd-goal-card"><span class="badge">🎯 Goal</span>
      <div style="margin-top:8px">${_progressHtml(name, goal, false)}</div>
      <div style="display:flex;gap:6px;margin-top:8px">
        <button class="ana-filter-pill" onclick="_goalEdit(${jsArg(name)})">Change</button>
        <button class="ana-filter-pill" onclick="_goalRemove(${jsArg(name)})">Remove</button>
      </div></div>`;
  }
  const n = Math.max(_board().board.length, 1);
  const pick = goal ? goal.targetRank : 3;
  const opts = Array.from({ length: Math.min(n, 20) }, (_, i) => `<option value="${i + 1}"${i + 1 === pick ? " selected" : ""}>#${i + 1}</option>`).join("");
  const dec = goal?.by || `${new Date().getFullYear()}-12-31`;
  return `<div class="ana-card" id="pd-goal-card"><span class="badge">🎯 Goal</span>
    <div style="font-size:10px;color:var(--muted);margin:8px 0 6px">Set a target rank on this season's leaderboard.</div>
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
      <label style="font-size:10px">Reach <select id="goal-rank" class="mei-input" style="width:auto">${opts}</select></label>
      <label style="font-size:10px">by <input id="goal-by" type="date" class="mei-input" style="width:auto" value="${todayISO() > dec ? "" : dec}" min="${todayISO()}"></label>
      <button class="ana-filter-pill active" onclick="_goalSet(${jsArg(name)})">Set goal</button>
      ${goal ? `<button class="ana-filter-pill" onclick="_goalCancel(${jsArg(name)})">Cancel</button>` : ""}
    </div></div>`;
}

// Banner for Home: the most recently set goal.
export function goalBannerHtml() {
  const g = _goals();
  const entries = Object.entries(g).sort((a, b) => (b[1].setAt || "").localeCompare(a[1].setAt || ""));
  if (!entries.length) return "";
  const [name, goal] = entries[0];
  return `<div class="ana-card" role="button" tabindex="0" onclick="openPlayerDetail(${jsArg(name)})" style="padding:10px 12px;margin-bottom:9px;cursor:pointer">
    <div style="font-size:9px;font-weight:800;letter-spacing:0.08em;color:var(--muted);margin-bottom:4px">🎯 GOAL</div>
    ${_progressHtml(name, goal, true)}</div>`;
}

function _refresh(name) {
  const card = document.getElementById("pd-goal-card");
  if (card) card.outerHTML = goalCardHtml(name);
  window.renderGoalBanner?.();
}

window._goalSet = function (name) {
  const targetRank = parseInt(document.getElementById("goal-rank")?.value, 10);
  const by = document.getElementById("goal-by")?.value || "";
  if (!targetRank) return;
  const { board } = _board();
  const idx = board.findIndex((r) => r.name === name);
  const g = _goals();
  // Changing a goal keeps where the climb started.
  const startRank = g[name]?.startRank ?? (idx >= 0 ? idx + 1 : board.length + 1);
  g[name] = { targetRank, by, setAt: new Date().toISOString(), startRank };
  _save(g);
  _editing = null;
  _refresh(name);
};
window._goalRemove = function (name) {
  const g = _goals();
  delete g[name];
  _save(g);
  _refresh(name);
};
window._goalEdit = function (name) {
  _editing = name;
  _refresh(name);
};
window._goalCancel = function (name) {
  _editing = null;
  _refresh(name);
};
