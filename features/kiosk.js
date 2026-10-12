// ── TV / KIOSK MODE (menu → 📺 TV mode, or open the app with ?tv=1) ──
// A full-screen, auto-rotating dashboard for a phone or TV left courtside:
// the season leaderboard, the latest session's results, the biggest movers
// and who's on form. Everything is re-read from the live data on every slide,
// so new matches show up on their own. The screen is kept awake, and after an
// app update reloads the page it comes straight back into TV mode.
import { state } from "../src/domain/state.js";
import { rating, scopeFor } from "../src/domain/rating-service.js";
import { todayISO } from "../src/domain/dates.js";
import { escHtml, fmtDate } from "../src/ui/format.js";
import { normPlayer } from "../src/domain/players.js";
import { noteError } from "../src/infra/log.js";

const SLIDE_MS = 12000;
const FLAG = "ekta_tv"; // sessionStorage: reopen after a reload

let _timer = null;
let _clock = null;
let _idx = 0;
let _wake = null;

// ── data ──────────────────────────────────────────────────────────────────
function _season() {
  const today = todayISO();
  const scope = scopeFor({ date: today });
  const seasonObj = state.seasons.find((s) => (!s.start || today >= s.start) && (!s.end || today <= s.end));
  return { scope, name: seasonObj ? seasonObj.name : "All matches" };
}

// The day to feature: today if anything was played, else the latest match day.
function _sessionDay() {
  const today = todayISO();
  if (state.matches.some((m) => m.date === today)) return today;
  return [...state.matches].map((m) => m.date || "").filter((d) => d <= today).sort().pop() || today;
}

function _board(scope) {
  const map = rating.map(scope);
  return rating.stats(scope, map).map((p) => ({ ...p, score: map[p.name] ?? rating.def() }));
}

// ── slides ────────────────────────────────────────────────────────────────
function _slideLeaderboard() {
  const { scope, name } = _season();
  const day = _sessionDay();
  const board = _board(scope);
  // Rank before the featured session, for the movement arrows.
  const beforeRank = {};
  _board(scope.filter((m) => (m.date || "") < day)).forEach((p, i) => (beforeRank[p.name] = i + 1));
  const rows = board
    .slice(0, 10)
    .map((p, i) => {
      const was = beforeRank[p.name];
      const mv = was ? was - (i + 1) : 0;
      const arrow = mv > 0 ? `<span class="tv-up">▲${mv}</span>` : mv < 0 ? `<span class="tv-down">▼${-mv}</span>` : `<span class="tv-flat">•</span>`;
      const left = rating.gamesUntilVeteran(p.name);
      return `<div class="tv-row${i < 3 ? " tv-top" : ""}">
        <span class="tv-rank">${i + 1}</span>
        <span class="tv-name">${escHtml(normPlayer(p.name))}${left > 0 ? `<span class="tv-new">NEW</span>` : ""}</span>
        <span class="tv-move">${arrow}</span>
        <span class="tv-rec">${p.mw}–${p.ml}</span>
        <span class="tv-score">${rating.fmt(p.score)}</span>
      </div>`;
    })
    .join("");
  return {
    title: `LEADERBOARD · ${escHtml(name)}`,
    sub: `${escHtml(rating.label())} · arrows since ${day === todayISO() ? "today's" : "the last"} session`,
    body: rows || `<div class="tv-empty">No matches this season yet.</div>`,
  };
}

function _slideResults() {
  const { scope } = _season();
  const day = _sessionDay();
  const ms = state.matches.filter((m) => m.date === day);
  const recent = ms.slice(-8).reverse();
  const team = (t) => escHtml((t || []).map((p) => normPlayer(p)).join(" & "));
  const rows = recent
    .map((m) => {
      const aWon = m.scoreA > m.scoreB;
      return `<div class="tv-result">
        <span class="tv-team${aWon ? " tv-win" : ""}">${team(m.teamA)}</span>
        <span class="tv-score-pill">${m.scoreA}–${m.scoreB}</span>
        <span class="tv-team tv-right${!aWon ? " tv-win" : ""}">${team(m.teamB)}</span>
      </div>`;
    })
    .join("");
  return {
    title: day === todayISO() ? "TODAY'S RESULTS" : `LAST SESSION · ${escHtml(fmtDate(day))}`,
    sub: `${ms.length} match${ms.length !== 1 ? "es" : ""}${ms.length > 8 ? " · latest 8" : ""}`,
    body: rows || `<div class="tv-empty">No matches yet today.</div>`,
  };
}

function _slideMovers() {
  const { scope } = _season();
  const day = _sessionDay();
  const before = rating.map(scope.filter((m) => (m.date || "") < day));
  const after = rating.map(scope.filter((m) => (m.date || "") <= day));
  const played = new Set(scope.filter((m) => m.date === day).flatMap((m) => [...(m.teamA || []), ...(m.teamB || [])]));
  const moves = [...played]
    .map((p) => ({ p, d: (after[p] ?? rating.def()) - (before[p] ?? rating.def()), now: after[p] ?? rating.def() }))
    .sort((a, b) => b.d - a.d);
  const row = (x) => `<div class="tv-row">
      <span class="tv-name">${escHtml(normPlayer(x.p))}</span>
      <span class="tv-delta ${x.d >= 0 ? "tv-up" : "tv-down"}">${x.d >= 0 ? "+" : ""}${rating.fmt(x.d)}</span>
      <span class="tv-score">${rating.fmt(x.now)}</span>
    </div>`;
  const up = moves.filter((x) => x.d > 0).slice(0, 5);
  const down = moves.filter((x) => x.d < 0).slice(-3).reverse();
  return {
    title: day === todayISO() ? "TODAY'S MOVERS" : `MOVERS · ${escHtml(fmtDate(day))}`,
    sub: `${escHtml(rating.label())} change over the session`,
    body: moves.length
      ? `<div class="tv-sec">📈 CLIMBERS</div>${up.map(row).join("") || `<div class="tv-empty">—</div>`}${down.length ? `<div class="tv-sec">📉 SLIPPED</div>${down.map(row).join("")}` : ""}`
      : `<div class="tv-empty">Nobody has played yet.</div>`,
  };
}

function _slideForm() {
  const { scope } = _season();
  const board = _board(scope).filter((p) => p.mp >= 3);
  const streaks = board
    .filter((p) => p.curType === "W" && p.curStreak >= 2)
    .sort((a, b) => b.curStreak - a.curStreak)
    .slice(0, 6);
  const dots = (form) => (form || []).map((r) => `<span class="tv-dot ${r === "W" ? "tv-dot-w" : "tv-dot-l"}"></span>`).join("");
  const rows = (streaks.length ? streaks : board.slice(0, 6))
    .map(
      (p) => `<div class="tv-row">
        <span class="tv-name">${escHtml(normPlayer(p.name))}</span>
        <span class="tv-streak">${p.curType === "W" && p.curStreak >= 2 ? `🔥 ${p.curStreak} in a row` : ""}</span>
        <span class="tv-dots">${dots(p.form)}</span>
      </div>`,
    )
    .join("");
  return {
    title: streaks.length ? "ON FIRE" : "FORM",
    sub: "last 5 results, newest on the right",
    body: rows || `<div class="tv-empty">Not enough matches yet.</div>`,
  };
}

const SLIDES = [_slideLeaderboard, _slideResults, _slideMovers, _slideForm];

// ── shell ─────────────────────────────────────────────────────────────────
function _render() {
  const el = document.getElementById("tv-overlay");
  if (!el) return;
  let s;
  try {
    s = SLIDES[_idx % SLIDES.length]();
  } catch (e) {
    noteError("kiosk:slide", e);
    s = { title: "EKTA PADEL", sub: "", body: `<div class="tv-empty">Couldn't draw this slide.</div>` };
  }
  el.querySelector(".tv-title").innerHTML = s.title;
  el.querySelector(".tv-sub").innerHTML = s.sub;
  const body = el.querySelector(".tv-body");
  body.innerHTML = s.body;
  body.classList.remove("tv-in");
  void body.offsetWidth;
  body.classList.add("tv-in");
  el.querySelectorAll(".tv-pip").forEach((p, i) => p.classList.toggle("on", i === _idx % SLIDES.length));
  const bar = el.querySelector(".tv-progress > div");
  bar.style.transition = "none";
  bar.style.width = "0%";
  void bar.offsetWidth;
  bar.style.transition = `width ${SLIDE_MS}ms linear`;
  bar.style.width = "100%";
}

function _schedule() {
  clearTimeout(_timer);
  _timer = setTimeout(() => {
    _idx = (_idx + 1) % SLIDES.length;
    _render();
    _schedule();
  }, SLIDE_MS);
}

function _tick() {
  const c = document.querySelector("#tv-overlay .tv-clock");
  if (c) c.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

async function _keepAwake() {
  try {
    if ("wakeLock" in navigator && document.visibilityState === "visible") _wake = await navigator.wakeLock.request("screen");
  } catch (e) {
    noteError("kiosk:wakeLock", e); // not supported / not allowed — the dashboard still works
  }
}
function _onVisible() {
  if (document.visibilityState === "visible" && document.getElementById("tv-overlay")) _keepAwake();
}
function _onKey(e) {
  if (e.key === "Escape") closeTvMode();
  else if (e.key === "ArrowRight" || e.key === " ") tvNext(1);
  else if (e.key === "ArrowLeft") tvNext(-1);
}

export function tvNext(step = 1) {
  _idx = (_idx + step + SLIDES.length) % SLIDES.length;
  _render();
  _schedule();
}

export function openTvMode({ fullscreen = true } = {}) {
  if (document.getElementById("tv-overlay")) return;
  const el = document.createElement("div");
  el.id = "tv-overlay";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-label", "TV mode");
  el.innerHTML = `
    <div class="tv-head">
      <div><div class="tv-brand">EKTA <span>PADEL</span></div><div class="tv-title"></div><div class="tv-sub"></div></div>
      <div class="tv-head-right"><div class="tv-clock"></div>
        <button class="tv-btn" onclick="tvFullscreen()" aria-label="Full screen" title="Full screen">⛶</button>
        <button class="tv-btn" onclick="closeTvMode()" aria-label="Exit TV mode" title="Exit TV mode (Esc)">✕</button>
      </div>
    </div>
    <div class="tv-body" onclick="tvNext(1)"></div>
    <div class="tv-foot"><div class="tv-pips">${SLIDES.map(() => `<span class="tv-pip"></span>`).join("")}</div><div class="tv-hint">Tap to skip · updates live</div></div>
    <div class="tv-progress"><div></div></div>`;
  document.body.appendChild(el);
  document.body.classList.add("tv-open");
  window.__kioskActive = true;
  try {
    sessionStorage.setItem(FLAG, "1");
  } catch (e) {
    noteError("kiosk:flag", e);
  }
  _idx = 0;
  _render();
  _schedule();
  _tick();
  _clock = setInterval(_tick, 15000);
  _keepAwake();
  document.addEventListener("visibilitychange", _onVisible);
  document.addEventListener("keydown", _onKey);
  if (fullscreen) tvFullscreen();
}

export function tvFullscreen() {
  const d = document.documentElement;
  if (!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen().catch(() => {}); // needs a tap; fine if refused
}

export function closeTvMode() {
  clearTimeout(_timer);
  clearInterval(_clock);
  _timer = _clock = null;
  document.getElementById("tv-overlay")?.remove();
  document.body.classList.remove("tv-open");
  window.__kioskActive = false;
  document.removeEventListener("visibilitychange", _onVisible);
  document.removeEventListener("keydown", _onKey);
  try {
    _wake?.release();
  } catch (e) {
    noteError("kiosk:release", e);
  }
  _wake = null;
  try {
    sessionStorage.removeItem(FLAG);
  } catch (e) {
    noteError("kiosk:flag", e);
  }
  if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  // Drop ?tv=1 so closing really closes it (a reload won't reopen).
  const u = new URL(location.href);
  if (u.searchParams.has("tv")) {
    u.searchParams.delete("tv");
    history.replaceState(null, "", u.pathname + (u.search ? u.search : "") + u.hash);
  }
}

// Reopen after a reload (an app update) or when the link asks for it.
export function shouldResumeTv() {
  let flag = false;
  try {
    flag = sessionStorage.getItem(FLAG) === "1";
  } catch (e) {
    noteError("kiosk:flag", e);
  }
  return flag || new URLSearchParams(location.search).get("tv") === "1";
}

// Inline handlers in the overlay call these.
window.closeTvMode = closeTvMode;
window.tvNext = tvNext;
window.tvFullscreen = tvFullscreen;
