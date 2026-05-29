import { initEloDeps, computeElo, computeEloHistory, computeEloPeaks, computeEloLows, _lightFingerprint, clearEloCache } from './elo.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCLXji1E8S_i2zLiYphHKjPLtpo9ODvOlI",
  authDomain: "padelekta-99316.firebaseapp.com",
  databaseURL:
    "https://padelekta-99316-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "padelekta-99316",
  storageBucket: "padelekta-99316.firebasestorage.app",
  messagingSenderId: "742104410143",
  appId: "1:742104410143:web:2d546ca8ab2f7ca16f4d2a",
  measurementId: "G-LN19GL652D",
};

const ADMIN_EMAIL = "ankit.konchady@gmail.com";
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ── HTML ESCAPE ───────────────────────────────────────────────
function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsArg(value) {
  return escHtml(JSON.stringify(String(value ?? "")));
}

function toLocalISODate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ── DATE FORMATTER ────────────────────────────────────────────
const MONTHS_SHORT = [
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
function fmtDate(raw) {
  if (!raw) return "—";
  const s = String(raw);
  // Full date: YYYY-MM-DD → DD MMM YYYY
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m)
    return Number(m[3]) + " " + MONTHS_SHORT[Number(m[2]) - 1] + " " + m[1];
  // Short: MM-DD → DD MMM
  m = s.match(/^(\d{2})-(\d{2})$/);
  if (m) return Number(m[2]) + " " + MONTHS_SHORT[Number(m[1]) - 1];
  return s;
}

// ── UNDO TOAST ────────────────────────────────────────────
function showUndoToast(msg, undoFn, ms = 5000) {
  document.querySelector(".undo-toast")?.remove();
  const el = document.createElement("div");
  el.className = "undo-toast";
  el.innerHTML = `<span class="undo-toast-msg">${msg}</span><button class="undo-toast-btn" onclick="this.closest('.undo-toast')._undo()">UNDO</button><div class="undo-toast-bar"></div>`;
  el._undo = () => {
    clearTimeout(el._tid);
    el.remove();
    undoFn();
  };
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.classList.add("undo-toast-show");
    el.querySelector(".undo-toast-bar").style.transition =
      `width ${ms}ms linear`;
    requestAnimationFrame(() => {
      el.querySelector(".undo-toast-bar").style.width = "0%";
    });
  });
  el._tid = setTimeout(() => {
    el.classList.remove("undo-toast-show");
    setTimeout(() => el.remove(), 400);
  }, ms);
}

// ── HAMBURGER MENU ─────────────────────────────────────────
function closeHamburgerMenu() {
  const menu = document.getElementById("hamburger-menu");
  const btn = document.getElementById("hamburgerBtn");
  if (!menu) return;
  menu.classList.remove("open");
  btn?.classList.remove("active");
}

function toggleHamburgerMenu() {
  const menu = document.getElementById("hamburger-menu");
  const btn = document.getElementById("hamburgerBtn");
  if (!menu) return;
  const open = menu.classList.toggle("open");
  btn.classList.toggle("active", open);
  if (open) {
    const close = (e) => {
      if (!menu.contains(e.target) && e.target !== btn) {
        menu.classList.remove("open");
        btn.classList.remove("active");
        document.removeEventListener("click", close, true);
      }
    };
    setTimeout(() => document.addEventListener("click", close, true), 0);
  }
}

// ── TOAST ──────────────────────────────────────────────────
function showToast(msg, emoji = "🎉", duration = 4000) {
  const el = document.createElement("div");
  el.className = "milestone-toast";
  el.innerHTML = `<span class="toast-icon">${emoji}</span><span>${msg}</span>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("toast-show"));
  setTimeout(() => {
    el.classList.remove("toast-show");
    setTimeout(() => el.remove(), 400);
  }, duration);
}

// ── PULL TO REFRESH ──────────────────────────────────────
const _PTR_THRESHOLD = 70;
let _ptrStartY = 0,
  _ptrDelta = 0,
  _ptrPulling = false,
  _ptrRefreshing = false;

function _ptrTarget(e) {
  // PTR only when scroll container is at the top
  const page = e.target.closest(".page");
  if (!page || !page.classList.contains("active")) return null;
  const id = page.id;
  // Only enable on home / compact / history pages
  if (!["pg-home", "pg-compact", "pg-history"].includes(id)) return null;
  // Find scrolling container — usually page itself or its first scroll child
  const scroller =
    page.querySelector(".page-body-scroll") || page;
  if (scroller.scrollTop > 0) return null;
  return scroller;
}

function _ptrStart(e) {
  if (_ptrRefreshing) return;
  const t = _ptrTarget(e);
  if (!t) return;
  _ptrStartY = e.touches[0].clientY;
  _ptrDelta = 0;
  _ptrPulling = true;
}

function _ptrMove(e) {
  if (!_ptrPulling || _ptrRefreshing) return;
  const dy = e.touches[0].clientY - _ptrStartY;
  if (dy < 0) return;
  _ptrDelta = Math.min(dy * 0.55, 120);
  const ind = document.getElementById("ptr-indicator");
  const lbl = document.getElementById("ptr-label");
  if (!ind) return;
  ind.style.transform = `translate(-50%, ${Math.min(_ptrDelta, 80) - 60}px)`;
  ind.style.opacity = Math.min(_ptrDelta / 60, 1);
  if (lbl)
    lbl.textContent = _ptrDelta >= _PTR_THRESHOLD ? "RELEASE TO REFRESH" : "PULL TO REFRESH";
  ind.classList.toggle("armed", _ptrDelta >= _PTR_THRESHOLD);
  if (_ptrDelta > 30) e.preventDefault();
}

function _ptrEnd() {
  if (!_ptrPulling) return;
  _ptrPulling = false;
  const ind = document.getElementById("ptr-indicator");
  const lbl = document.getElementById("ptr-label");
  if (_ptrDelta >= _PTR_THRESHOLD) {
    _ptrRefreshing = true;
    if (ind) {
      ind.classList.add("refreshing");
      ind.style.transform = "translate(-50%, 20px)";
      ind.style.opacity = 1;
    }
    if (lbl) lbl.textContent = "REFRESHING…";
    // Re-render current active page
    const page = document.querySelector(".page.active");
    const id = page?.id;
    setTimeout(() => {
      if (id === "pg-home") renderHome();
      else if (id === "pg-compact") renderCompact();
      else if (id === "pg-history") renderModernMatches();
      if (lbl) lbl.textContent = "UPDATED ✓";
      if (navigator.vibrate) {
        try { navigator.vibrate(20); } catch (e) {}
      }
      setTimeout(() => {
        if (ind) {
          ind.classList.remove("refreshing", "armed");
          ind.style.transform = "translate(-50%, -60px)";
          ind.style.opacity = 0;
        }
        _ptrRefreshing = false;
      }, 600);
    }, 350);
  } else {
    if (ind) {
      ind.classList.remove("armed");
      ind.style.transform = "translate(-50%, -60px)";
      ind.style.opacity = 0;
    }
  }
  _ptrDelta = 0;
}

document.addEventListener("touchstart", _ptrStart, { passive: true });
document.addEventListener("touchmove", _ptrMove, { passive: false });
document.addEventListener("touchend", _ptrEnd, { passive: true });
document.addEventListener("touchcancel", _ptrEnd, { passive: true });

// ── CONFETTI (canvas-based, milestone celebration) ────────
function fireConfetti(opts = {}) {
  const count = opts.count || 90;
  const duration = opts.duration || 2200;
  const colors = opts.colors || [
    "var(--theme)",
    "#f5c842",
    "#ff5fe5",
    "#5cd0ff",
    "#36d47e",
    "#ff7a3d",
    "#ffffff",
  ];
  // Resolve CSS vars to actual hex
  const resolvedColors = colors.map((c) => {
    if (!c.startsWith("var(")) return c;
    const name = c.slice(4, -1);
    return (
      getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim() || "#fff"
    );
  });
  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:99999";
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const W = window.innerWidth;
  const H = window.innerHeight;
  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: W / 2 + (Math.random() - 0.5) * 60,
      y: H / 3,
      vx: (Math.random() - 0.5) * 14,
      vy: -8 - Math.random() * 8,
      g: 0.32 + Math.random() * 0.15,
      size: 4 + Math.random() * 5,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.35,
      color: resolvedColors[Math.floor(Math.random() * resolvedColors.length)],
      shape: Math.random() < 0.5 ? "rect" : "circle",
      life: 1,
    });
  }
  const start = performance.now();
  function tick(t) {
    const elapsed = t - start;
    const fade = Math.max(0, 1 - elapsed / duration);
    ctx.clearRect(0, 0, W, H);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.g;
      p.rot += p.vr;
      p.life = fade;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      if (p.shape === "rect") {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.55);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    if (elapsed < duration) requestAnimationFrame(tick);
    else canvas.remove();
  }
  requestAnimationFrame(tick);
  if (navigator.vibrate) {
    try {
      navigator.vibrate([12, 25, 12, 25, 30]);
    } catch (e) {}
  }
}

// ── THEME PICKER ─────────────────────────────────────────
function openThemePicker() {
  const ov = document.getElementById("tp-overlay");
  const grid = document.getElementById("tp-grid");
  if (!ov || !grid) return;
  const themes = window.THEMES || [];
  const cur = typeof window.getThemeIdx === "function" ? window.getThemeIdx() : -1;
  grid.innerHTML = themes
    .map(
      (t, i) => {
        const modeClass = t.mode ? ` tp-swatch-${t.mode}` : "";
        const dot = t.mode === "holo"
          ? `<span class="tp-dot tp-dot-holo"></span>`
          : t.mode === "royal-gold"
            ? `<span class="tp-dot tp-dot-royal-gold"></span>`
            : t.mode === "midnight-oled"
              ? `<span class="tp-dot tp-dot-midnight-oled"></span>`
              : `<span class="tp-dot" style="background:${t.hex}"></span>`;
        return `<button class="tp-swatch${i === cur ? " tp-swatch-active" : ""}${modeClass}" onclick="pickTheme(${i})" style="--sw:${t.hex};--sw-rgb:${t.r},${t.g},${t.b}">
          ${dot}
          <span class="tp-name">${t.name}</span>
        </button>`;
      },
    )
    .join("");
  ov.classList.add("open");
}
function closeThemePicker() {
  document.getElementById("tp-overlay")?.classList.remove("open");
}
function pickTheme(i) {
  if (typeof window.setThemeByIdx === "function") window.setThemeByIdx(i);
  closeThemePicker();
}

// ── ANNIVERSARY TOAST ─────────────────────────────────────
function _checkAnniversaries() {
  if (!allMatches || !allMatches.length) return;
  const today = new Date();
  const tMM = String(today.getMonth() + 1).padStart(2, "0");
  const tDD = String(today.getDate()).padStart(2, "0");
  const tY = today.getFullYear();
  let seen = "";
  try {
    seen = sessionStorage.getItem("padel_anniv_shown") || "";
  } catch (e) {}
  const firstSeen = {};
  for (const m of allMatches) {
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
      showToast(
        `${a.name}: ${a.yrs} year${a.yrs > 1 ? "s" : ""} since their first match!`,
        "🎂",
        6000,
      );
      fireConfetti({ count: 70, duration: 2400 });
    }, i * 2500);
    allKeys += "|" + a.key;
  });
  try {
    sessionStorage.setItem("padel_anniv_shown", allKeys);
  } catch (e) {}
}

// ── GLOBAL SEARCH ─────────────────────────────────────────
function openGlobalSearch() {
  const ov = document.getElementById("gs-overlay");
  if (!ov) return;
  ov.classList.add("open");
  const input = document.getElementById("gs-input");
  if (input) {
    input.value = "";
    setTimeout(() => input.focus(), 100);
  }
  _globalSearchInput("");
}
function closeGlobalSearch() {
  document.getElementById("gs-overlay")?.classList.remove("open");
}
function _globalSearchInput(q) {
  const results = document.getElementById("gs-results");
  if (!results) return;
  const query = (q || "").trim().toLowerCase();
  if (!query) {
    results.innerHTML = `<div class="gs-empty">Type a player name, score (e.g. <b>6-2</b>), or date (e.g. <b>2026-05-21</b>)</div>`;
    return;
  }
  const out = [];
  // Players
  const players = new Set();
  activeMatches().forEach((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => players.add(p)),
  );
  [...players]
    .filter((p) => p.toLowerCase().includes(query))
    .slice(0, 8)
    .forEach((p) => {
      out.push(
        `<button class="gs-result" onclick="closeGlobalSearch();openPlayerDetail(${jsArg(p)})">
          <span class="gs-result-av" style="background:${playerColor(p)}">${playerInitials(p)}</span>
          <span class="gs-result-name">${escHtml(p)}</span>
          <span class="gs-result-tag">PLAYER</span>
        </button>`,
      );
    });
  // Matches by scoreline
  const scoreM = query.match(/^(\d+)\s*[-–]?\s*(\d+)?$/);
  if (scoreM) {
    const sA = parseInt(scoreM[1], 10);
    const sB = scoreM[2] !== undefined ? parseInt(scoreM[2], 10) : null;
    allMatches
      .filter((m) => {
        if (sB === null)
          return m.scoreA === sA || m.scoreB === sA;
        return (
          (m.scoreA === sA && m.scoreB === sB) ||
          (m.scoreA === sB && m.scoreB === sA)
        );
      })
      .slice(-10)
      .reverse()
      .forEach((m) => {
        const aWon = m.scoreA > m.scoreB;
        const win = aWon ? m.teamA : m.teamB;
        const lose = aWon ? m.teamB : m.teamA;
        const idx = allMatches.indexOf(m);
        out.push(
          `<button class="gs-result" onclick="closeGlobalSearch();openMatchIntro(${idx})">
            <span class="gs-result-score">${m.scoreA}-${m.scoreB}</span>
            <span class="gs-result-name">${escHtml(win.join(" & "))} <span class="gs-vs">vs</span> ${escHtml(lose.join(" & "))}</span>
            <span class="gs-result-tag">${m.date || ""}</span>
          </button>`,
        );
      });
  }
  // Matches by date
  const dateM = query.match(/^(\d{4})-?(\d{2})?-?(\d{2})?/);
  if (dateM && !scoreM) {
    const datePrefix = `${dateM[1]}${dateM[2] ? "-" + dateM[2] : ""}${dateM[3] ? "-" + dateM[3] : ""}`;
    allMatches
      .filter((m) => (m.date || "").startsWith(datePrefix))
      .slice(-10)
      .reverse()
      .forEach((m) => {
        const idx = allMatches.indexOf(m);
        out.push(
          `<button class="gs-result" onclick="closeGlobalSearch();openMatchIntro(${idx})">
            <span class="gs-result-score">${m.scoreA}-${m.scoreB}</span>
            <span class="gs-result-name">${escHtml(m.teamA.join(" & "))} <span class="gs-vs">vs</span> ${escHtml(m.teamB.join(" & "))}</span>
            <span class="gs-result-tag">${m.date || ""}</span>
          </button>`,
        );
      });
  }
  results.innerHTML = out.length
    ? out.join("")
    : `<div class="gs-empty">No results for "${escHtml(query)}"</div>`;
}

const MILESTONE_LOG_KEY = "padel_milestone_log";
function getMilestoneLog() {
  try {
    return JSON.parse(localStorage.getItem(MILESTONE_LOG_KEY)) || [];
  } catch (e) {
    return [];
  }
}
function saveMilestoneEntry(msg, emoji) {
  const log = getMilestoneLog();
  log.unshift({ msg, emoji, date: todayISO() });
  if (log.length > 100) log.length = 100;
  try {
    localStorage.setItem(MILESTONE_LOG_KEY, JSON.stringify(log));
  } catch (e) {}
}

function checkMilestones(prevMatches, newMatches) {
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
        showToast(`${player} hit ${n} matches!`, "🏅");
        saveMilestoneEntry(`${player} hit ${n} matches!`, "🏅");
        if (n >= 50) fireConfetti({ count: 100, duration: 2400 });
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
        showToast(`${player} is on a ${n}-match win streak!`, "🔥");
        saveMilestoneEntry(`${player} is on a ${n}-match win streak!`, "🔥");
      }
    });
    // Rank change (top 3)
    const prevRank = prevStats.findIndex((s) => s.name === player) + 1;
    const newRank = newStats.findIndex((s) => s.name === player) + 1;
    if (prevRank > 1 && newRank === 1) {
      showToast(`${player} is now #1!`, "👑");
      saveMilestoneEntry(`${player} is now #1!`, "👑");
      fireConfetti({ count: 150, duration: 3000 });
    } else if (prevRank > 3 && newRank <= 3) {
      showToast(`${player} entered the Top 3!`, "🥉");
      saveMilestoneEntry(`${player} entered the Top 3!`, "🥉");
      fireConfetti({ count: 80, duration: 2200 });
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
          showToast(`${display} hit ELO ${t}!`, "⚡");
          saveMilestoneEntry(`${display} hit ELO ${t}!`, "⚡");
          fireConfetti({ count: 90, duration: 2400 });
        }
      });
    });
  }
}

// ── STATE ──────────────────────────────────────────────────
let allMatches = [];
let nameMap = {};
let aliasMap = {};
// Source-of-truth player roster (replaces aliasMap/nameMap as stored data)
let players = {};        // { [id]: { id, name, email, image, isGuest } }
let playerAliasMap = {}; // { [id]: [alias1, alias2, ...] }
let nextPlayerId = 1;
let _dataVersion = 0;
let _homeRenderedVersion = -1, _homeRenderedFilter = "";
let _compactRenderedVersion = -1, _compactRenderedFilter = "";
let _addRenderedVersion = -1;
let _excludedPlayers = new Set((() => { try { return JSON.parse(localStorage.getItem("padel-exclude-players") || "[]"); } catch(e) { return []; } })());
let _sessionGuestUnexcluded = new Set(); // guests temporarily re-included this Summary session
let photoMap = {};
let calYear = new Date().getFullYear(),
  calMonth = new Date().getMonth();
let matchTabFilter = "today",
  histPlayerFilter = "",
  histOutcomeFilter = "all",
  histMarginFilter = "all",
  histPairFilter = "",
  histScorelineFilter = "",
  h2hFilterA = "",
  h2hFilterB = "";
let _h2hActiveSlot = null;
let _filterSheetMode = null;
let matchFrom = null,
  matchTo = null;
let homeFilter = "all",
  homeFrom = null,
  homeTo = null;
let cmpFilter = "today",
  cmpFrom = null,
  cmpTo = null;
let cmpSortKey = "sr";
let cmpSortAsc = false;
let cmpRecordSortMode = "wins";
let _cmpLeaderHtmls = [];
let _cmpFiltered = [];
let _cmpEqualized = false;
const _CMP_TOGGLE_COLS = [
  { key: "mp",      label: "MP"  },
  { key: "record",  label: "W–L" },
  { key: "winPct",  label: "W%"  },
  { key: "gw",      label: "GW"  },
  { key: "gl",      label: "GL"  },
  { key: "gamePct", label: "G%"  },
  { key: "elo",     label: "ELO" },
];
function _loadCmpHiddenCols() {
  try {
    const s = localStorage.getItem("padel_cmp_hidden_cols_v2");
    if (s) return new Set(JSON.parse(s));
  } catch (e) {}
  return new Set(["gw", "gl", "gamePct"]);
}
let _cmpHiddenCols = _loadCmpHiddenCols();
let _eloTLPlayer = "";
let _eloTLFilter = "all";
let _eloTLOverlay = "";
let _eloTLPts = [];
let prevPage = "home";
let lastMatchSnapshot = null;
let _lastLocalSaveTime = 0; // suppress spurious conflict detection after a local save
let _forcedOffline = localStorage.getItem("padel_forced_offline") === "1";
let _firestoreUnsub = null;
let _emailTimer = null;
window.isAdmin = false;
const _animLevel0 = localStorage.getItem("anim_level") || (localStorage.getItem("cascade_anim") === "0" ? "medium" : "full");
if (_animLevel0 === "medium" || _animLevel0 === "off") document.body.classList.add("no-cascade");
if (_animLevel0 === "off") document.body.classList.add("no-anim");
let deletedMatches = [];
const DELETED_KEY = "padel_deleted";
function loadDeletedMatches() {
  try {
    deletedMatches = JSON.parse(localStorage.getItem(DELETED_KEY) || "[]");
    if (!Array.isArray(deletedMatches)) deletedMatches = [];
  } catch (e) {
    deletedMatches = [];
  }
}
function saveDeletedMatches() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffISO = toLocalISODate(cutoff);
  deletedMatches = deletedMatches.filter(
    (d) => (d.deletedAt || "") >= cutoffISO,
  );
  try {
    localStorage.setItem(DELETED_KEY, JSON.stringify(deletedMatches));
  } catch (e) {}
}

// ── ELO DECAY CONFIG ───────────────────────────────────────
const ELO_CFG_KEY = "elo-config";
function loadEloConfig() {
  try {
    return JSON.parse(localStorage.getItem(ELO_CFG_KEY)) || {};
  } catch {
    return {};
  }
}
function saveEloConfig(cfg) {
  try {
    localStorage.setItem(ELO_CFG_KEY, JSON.stringify(cfg));
  } catch {}
  _invalidateEloMemo();
}
function getEloDecayParams() {
  const c = loadEloConfig();
  return {
    perWeek: Number(c.perWeek) || 1,
    graceDays: Number(c.graceDays) || 28,
    maxDecay: Number(c.maxDecay) || 30,
    floor: Number(c.floor) || 900,
  };
}
const ELO_DEFAULTS = { perWeek: 1, graceDays: 28, maxDecay: 30, floor: 900 };

function renderEloConfigCard() {
  const p = getEloDecayParams();
  const d = ELO_DEFAULTS;
  const el = document.getElementById("elo-decay-config");
  if (!el) return;
  const isDefault =
    p.perWeek === d.perWeek &&
    p.graceDays === d.graceDays &&
    p.maxDecay === d.maxDecay &&
    p.floor === d.floor;
  const cfgRow = (id, label, val, def, min, max, step, desc) => `
    <div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px">
        <span style="font-size:10px;color:var(--muted);font-weight:700">${label}</span>
        <span style="font-size:9px;color:var(--muted)">default: ${def}</span>
      </div>
      <input id="${id}" type="number" inputmode="numeric" pattern="[0-9]*" min="${min}" max="${max}" step="${step || 1}" value="${val}" class="mei-input" style="width:100%">
      <div style="font-size:9px;color:var(--muted);margin-top:3px">${desc}</div>
    </div>`;
  el.innerHTML = `
    <div style="background:rgba(255,255,255,0.03);border-radius:10px;padding:10px;margin-bottom:10px;font-size:10px;color:var(--muted);line-height:1.6">
      📉 Inactive players lose ELO over time. After <strong style="color:var(--fg)">${p.graceDays} days</strong> without a match,
      they drop <strong style="color:var(--fg)">${p.perWeek} pt/week</strong>, capped at <strong style="color:var(--fg)">${p.maxDecay} pts total</strong>,
      never falling below <strong style="color:var(--fg)">ELO ${p.floor}</strong>.
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      ${cfgRow("edcfg-per-week", "POINTS / WEEK", p.perWeek, d.perWeek, 0, 50, 0.5, "ELO lost each week of inactivity")}
      ${cfgRow("edcfg-grace", "GRACE PERIOD (days)", p.graceDays, d.graceDays, 1, 365, 1, "Days without play before decay starts")}
      ${cfgRow("edcfg-max", "MAX DECAY (pts)", p.maxDecay, d.maxDecay, 0, 500, 1, "Maximum total ELO loss from decay")}
      ${cfgRow("edcfg-floor", "ELO FLOOR", p.floor, d.floor, 500, 1200, 1, "ELO cannot drop below this value")}
    </div>
    <div id="elo-cfg-msg" style="font-size:11px;margin-bottom:6px;display:none"></div>
    <div style="display:flex;gap:8px">
      <button onclick="applyEloConfig()" style="flex:1;padding:8px;border-radius:10px;font-weight:700;font-size:12px;background:rgba(var(--theme-rgb),0.15);border:1px solid rgba(var(--theme-rgb),0.4);color:var(--theme);cursor:pointer">Save</button>
      ${!isDefault ? `<button onclick="resetEloConfig()" style="padding:8px 12px;border-radius:10px;font-weight:700;font-size:11px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:var(--muted);cursor:pointer">Reset Defaults</button>` : ""}
    </div>`;
}
function resetEloConfig() {
  saveEloConfig(ELO_DEFAULTS);
  _invalidateEloMemo();
  renderEloConfigCard();
  renderAnalyticsPage();
  showToast("Reset to defaults", "↺");
}
function applyEloConfig() {
  const perWeek = parseFloat(document.getElementById("edcfg-per-week")?.value);
  const graceDays = parseInt(document.getElementById("edcfg-grace")?.value);
  const maxDecay = parseInt(document.getElementById("edcfg-max")?.value);
  const floor = parseInt(document.getElementById("edcfg-floor")?.value);
  if (isNaN(perWeek) || isNaN(graceDays) || isNaN(maxDecay) || isNaN(floor)) {
    const msg = document.getElementById("elo-cfg-msg");
    if (msg) {
      msg.style.display = "block";
      msg.style.color = "var(--red)";
      msg.textContent = "All fields are required.";
    }
    return;
  }
  saveEloConfig({ perWeek, graceDays, maxDecay, floor });
  _invalidateEloMemo();
  const msg = document.getElementById("elo-cfg-msg");
  if (msg) {
    msg.style.display = "block";
    msg.style.color = "var(--green)";
    msg.textContent = "Config saved!";
    setTimeout(() => (msg.style.display = "none"), 2000);
  }
  renderAnalyticsPage();
  showToast("ELO decay config saved", "⚡");
}

// ── ELO MEMO ───────────────────────────────────────────────
let _eloMemo = null, _eloMemoKey = "", _eloMemoDecay = false;
let _eloHistMemo = null, _eloHistKey = "";
let _eloPeaksMemo = null, _eloPeaksKey = "";
let _eloLowsMemo = null, _eloLowsKey = "";
initEloDeps(getEloDecayParams, todayISO);

function _memoElo(decay = false) {
  const am = activeMatches();
  const decayKey = decay ? JSON.stringify({ ...getEloDecayParams(), today: todayISO() }) : "";
  const key = `${decay ? "d" : "r"}|${decayKey}|${_lightFingerprint(am)}`;
  if (_eloMemoKey !== key || !_eloMemo) {
    _eloMemoKey = key;
    _eloMemoDecay = decay;
    _eloMemo = computeElo(am, decay);
  }
  return _eloMemo;
}

function _memoEloHistory() {
  const am = activeMatches();
  const key = _lightFingerprint(am);
  if (_eloHistKey !== key || !_eloHistMemo) { _eloHistKey = key; _eloHistMemo = computeEloHistory(am); }
  return _eloHistMemo;
}
function _memoEloPeaks() {
  const am = activeMatches();
  const key = _lightFingerprint(am);
  if (_eloPeaksKey !== key || !_eloPeaksMemo) { _eloPeaksKey = key; _eloPeaksMemo = computeEloPeaks(am); }
  return _eloPeaksMemo;
}
function _memoEloLows() {
  const am = activeMatches();
  const key = _lightFingerprint(am);
  if (_eloLowsKey !== key || !_eloLowsMemo) { _eloLowsKey = key; _eloLowsMemo = computeEloLows(am); }
  return _eloLowsMemo;
}

function _invalidateEloMemo() {
  _eloMemoKey = ""; _eloMemo = null;
  clearEloCache();
  _eloHistKey = ""; _eloHistMemo = null;
  _eloPeaksKey = ""; _eloPeaksMemo = null;
  _eloLowsKey = ""; _eloLowsMemo = null;
}

let _anaObserver = null;
let _pairSort = { key: "winPct", dir: -1 };
let _pairsData = [];
let _pairsShowAll = false;

// ── SPLASH HELPERS ─────────────────────────────────────────
function setSplashStatus(msg) {
  var el = document.getElementById("splash-status");
  if (el) el.textContent = msg;
}

// ── SAVE HELPER — writes to Firestore AND updates cache ─────
async function saveCloudData() {
  _invalidateEloMemo();
  const payload = { matches: allMatches, players, playerAliasMap, nextPlayerId };
  if (window.appCache) window.appCache.save(allMatches, players, playerAliasMap, nextPlayerId);
  try {
    localStorage.setItem("padel_matches", JSON.stringify(allMatches));
  } catch (e) {}
  if (!navigator.onLine || _forcedOffline) {
    _setPendingSync(true);
    return;
  }
  try {
    if (auth.currentUser && window.isAdmin) {
      _lastLocalSaveTime = Date.now(); // suppress conflict dialog for the snapshot that echoes this write
      await setDoc(doc(db, "padel", "main"), payload);
      _setPendingSync(false);
    }
  } catch (err) {
    console.error("Firestore save failed:", err);
    _setPendingSync(true);
  }
}

function _hasPendingSync() {
  return localStorage.getItem("padel_pending_sync") === "1";
}
function _setPendingSync(flag) {
  if (flag) localStorage.setItem("padel_pending_sync", "1");
  else localStorage.removeItem("padel_pending_sync");
  const el = document.getElementById("sync-indicator");
  if (el) el.style.display = flag ? "flex" : "none";
}
async function _trySyncNow() {
  if (!navigator.onLine || _forcedOffline || !auth?.currentUser || !window.isAdmin) return;
  if (!_hasPendingSync()) return;
  const payload = { matches: allMatches, players, playerAliasMap, nextPlayerId };
  try {
    _lastLocalSaveTime = Date.now();
    await setDoc(doc(db, "padel", "main"), payload);
    _setPendingSync(false);
    showToast("Synced to cloud", "☁️");
  } catch (err) {
    console.error("Sync retry failed:", err);
  }
}

function toggleOfflineMode(on) {
  _forcedOffline = on;
  if (on) {
    localStorage.setItem("padel_forced_offline", "1");
    if (_firestoreUnsub) { _firestoreUnsub(); _firestoreUnsub = null; }
    _setPendingSync(true);
    showToast("Offline mode ON — tap SYNC to push manually", "✈️");
  } else {
    localStorage.removeItem("padel_forced_offline");
    _resubscribeFirestore();
    showToast("Online mode — reconnecting to cloud", "☁️");
  }
  const toggle = document.getElementById("offline-mode-toggle");
  if (toggle) toggle.checked = on;
}

function _resubscribeFirestore() {
  if (_firestoreUnsub) { _firestoreUnsub(); _firestoreUnsub = null; }
  try {
    _firestoreUnsub = onSnapshot(doc(db, "padel", "main"), (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      let pls, pam, npid;
      if (d.players && typeof d.players === "object" && Object.keys(d.players).length > 0) {
        pls = d.players; pam = d.playerAliasMap || {}; npid = d.nextPlayerId || 1;
      } else {
        const mig = migrateAliasMapToPlayers(d.aliasMap || {});
        pls = mig.players; pam = mig.playerAliasMap; npid = mig.nextPlayerId;
      }
      const incoming = d.matches || [];
      const _sessionBuffering = !!(_liveSessionData?.sessionActive);
      if (_sessionBuffering && _sessionPendingCount > 0) {
        const cloudKeys = new Set(incoming.map(_mkMatchKey));
        const pending = allMatches.filter(m => !cloudKeys.has(_mkMatchKey(m)));
        allMatches = pending.length
          ? [...incoming, ...pending].sort((a, b) => (a.date || "").localeCompare(b.date || ""))
          : incoming;
      } else {
        allMatches = incoming;
      }
      players = pls; playerAliasMap = pam; nextPlayerId = npid;
      rebuildNameMaps(); _invalidateEloMemo();
      if (!_sessionBuffering || _sessionPendingCount === 0) _setPendingSync(false);
      renderHome(); renderCompact(); refreshManage();
    }, (err) => { console.error("Firestore re-subscribe error:", err); });
  } catch (e) { console.error("Re-subscribe failed:", e); }
}

// ── PLAYER PHOTOS ──────────────────────────────────────────
function loadPhotos() {
  try {
    const cached = JSON.parse(localStorage.getItem("padel_photos") || "null");
    if (cached && typeof cached === "object") photoMap = cached;
  } catch (e) {}
  try {
    onSnapshot(doc(db, "padel", "photos"), (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (d.photoMap && typeof d.photoMap === "object") {
        photoMap = d.photoMap;
        try { localStorage.setItem("padel_photos", JSON.stringify(photoMap)); } catch (_) {}
        renderHome();
      }
    });
  } catch (e) {}
}

async function _savePhotosToCloud() {
  try {
    localStorage.setItem("padel_photos", JSON.stringify(photoMap));
    if (auth.currentUser && window.isAdmin) {
      await setDoc(doc(db, "padel", "photos"), { photoMap });
    }
  } catch (e) { console.error("Photo save failed:", e); }
}

function savePlayerPhoto(name) {
  if (!window.isAdmin) return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;
    const canvas = document.createElement("canvas");
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 128, 128);
      photoMap[name] = canvas.toDataURL("image/jpeg", 0.78);
      _savePhotosToCloud();
      renderHome();
      renderNamesTable();
      showToast("Photo saved");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      showToast("Could not read image", "❌");
    };
    img.src = url;
  };
  input.click();
}

function removePlayerPhoto(name) {
  if (!window.isAdmin) return;
  delete photoMap[name];
  _savePhotosToCloud();
  renderHome();
  renderNamesTable();
  showToast("Photo removed");
}

// ── SCHEDULED MATCHES ──────────────────────────────────────

// ── SYNC CONFLICT RESOLUTION ───────────────────────────────
function _mkMatchKey(m) {
  // Stable key for deduplication — order-sensitive (Team A / Team B are distinct)
  return `${m.date || ""}|${(m.teamA || []).join(",")}|${(m.teamB || []).join(",")}|${m.scoreA}|${m.scoreB}`;
}

function _showSyncConflict(
  cloudMatches,
  cloudPls,
  cloudPam,
  cloudNpid,
  localOnly,
  resolveFn,
) {
  document.getElementById("sync-conflict-overlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "sync-conflict-overlay";
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:9992;display:flex;align-items:flex-end;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px)";

  const localCount = allMatches.length;
  const cloudCount = cloudMatches.length;
  const mergeCount = cloudCount + localOnly.length;

  const listHtml =
    localOnly
      .slice(0, 6)
      .map((m) => {
        const label = `${(m.teamA || []).map((p) => p.split(" ")[0]).join(" & ")} vs ${(m.teamB || []).map((p) => p.split(" ")[0]).join(" & ")} <span style="color:var(--muted)">${m.scoreA}–${m.scoreB}</span>`;
        return `<div class="sc-row">${fmtDate(m.date)} · ${label}</div>`;
      })
      .join("") +
    (localOnly.length > 6
      ? `<div style="font-size:10px;color:var(--muted);padding:3px 0">+${localOnly.length - 6} more…</div>`
      : "");

  overlay.innerHTML = `
    <div class="sync-conflict-sheet">
      <div class="sc-title">⚠️ Sync Conflict</div>
      <div class="sc-desc">Cloud has <strong>${cloudCount}</strong> matches, local has <strong>${localCount}</strong>. The following local matches are missing from cloud:</div>
      <div class="sc-list">${listHtml}</div>
      <button class="sc-btn sc-btn-primary" id="sc-merge">🔀 Merge Both — ${mergeCount} matches</button>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="sc-btn sc-btn-secondary" id="sc-cloud">☁️ Use Cloud (${cloudCount})</button>
        <button class="sc-btn sc-btn-secondary" id="sc-local">📱 Keep Local (${localCount})</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector("#sc-merge").onclick = () => {
    const cloudKeys = new Set(cloudMatches.map(_mkMatchKey));
    const merged = [
      ...cloudMatches,
      ...localOnly.filter((m) => !cloudKeys.has(_mkMatchKey(m))),
    ].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    overlay.remove();
    resolveFn(
      merged,
      { ...cloudPls, ...players },
      { ...cloudPam, ...playerAliasMap },
      Math.max(cloudNpid || 1, nextPlayerId),
      true,
    );
  };
  overlay.querySelector("#sc-cloud").onclick = () => {
    overlay.remove();
    resolveFn(cloudMatches, cloudPls, cloudPam, cloudNpid, false);
  };
  overlay.querySelector("#sc-local").onclick = () => {
    overlay.remove();
    resolveFn(allMatches, players, playerAliasMap, nextPlayerId, true);
    showToast("Keeping local data", "📱");
  };
}

// ── SESSION STREAK ──────────────────────────────────────────
function computeSessionStreak() {
  if (!allMatches.length) return 0;
  const getMonday = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    const dow = d.getDay();
    d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    return toLocalISODate(d);
  };
  const weeks = [
    ...new Set(activeMatches().filter((m) => m.date).map((m) => getMonday(m.date))),
  ]
    .sort()
    .reverse();
  if (weeks.length < 2) return weeks.length;
  let streak = 1;
  for (let i = 0; i < weeks.length - 1; i++) {
    const diff = Math.round(
      (new Date(weeks[i] + "T00:00:00") -
        new Date(weeks[i + 1] + "T00:00:00")) /
        86400000,
    );
    if (diff === 7) streak++;
    else break;
  }
  return streak;
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

// ── WEEKLY SNAPSHOT ─────────────────────────────────────────
const SNAP_KEY = "ekta_weekly_snap";
function getWeeklySnaps() {
  try {
    return JSON.parse(localStorage.getItem(SNAP_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveWeeklySnap(snap) {
  const snaps = getWeeklySnaps();
  const existing = snaps.findIndex((s) => s.weekOf === snap.weekOf);
  if (existing >= 0) snaps[existing] = snap;
  else snaps.unshift(snap);
  snaps.splice(12); // keep last 12 weeks
  try {
    localStorage.setItem(SNAP_KEY, JSON.stringify(snaps));
  } catch {}
}
function autoSaveWeeklySnap() {
  if (!allMatches.length) return;
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  const weekOf = toLocalISODate(monday);
  const existing = getWeeklySnaps().find((s) => s.weekOf === weekOf);
  if (existing) return; // already snapped this week
  const stats = computeStats(activeMatches(), _memoElo());
  const rankMap = {};
  stats.forEach((p, i) => {
    rankMap[p.name] = i + 1;
  });
  saveWeeklySnap({ weekOf, rankMap });
}
function getPrevWeekRankMap() {
  const snaps = getWeeklySnaps();
  if (snaps.length < 2) return snaps[0]?.rankMap || {};
  return snaps[1].rankMap;
}

// ── DATA LOADER ────────────────────────────────────────────
function loadCloudData() {
  let fired = false;
  let lastDataFingerprint = null;

  function dataFingerprint(matches, pls, pam) {
    const rows = Array.isArray(matches) ? matches : [];
    try {
      const matchPart = rows
        .map(
          (m) =>
            `${m.date || ""}|${(m.teamA || []).join(",")}|${(m.teamB || []).join(",")}|${m.scoreA ?? ""}|${m.scoreB ?? ""}|${m.note || ""}`,
        )
        .join("~");
      const playerPart = Object.values(pls || {})
        .sort((a, b) => a.id - b.id)
        .map((p) => `${p.id}:${p.name}:${(pam[p.id] || []).join(",")}`)
        .join("~");
      return `${rows.length}::${matchPart}::${playerPart}`;
    } catch (e) {
      return JSON.stringify({ matches: rows, pls: pls || {} });
    }
  }

  // Extract new-format player fields from a data object (Firestore doc or cache),
  // auto-migrating from old aliasMap format when needed.
  function extractPlayerData(d) {
    if (d.players && typeof d.players === "object" && Object.keys(d.players).length > 0) {
      return {
        pls: d.players,
        pam: d.playerAliasMap || {},
        npid: d.nextPlayerId || 1,
      };
    }
    // Old format — migrate on the fly (data not yet saved in new format)
    const migrated = migrateAliasMapToPlayers(d.aliasMap || {});
    return { pls: migrated.players, pam: migrated.playerAliasMap, npid: migrated.nextPlayerId };
  }

  function onData(matches, pls, pam, npid, skipConflict = false) {
    const fp = dataFingerprint(matches, pls, pam);
    const isFirstLoad = !fired;

    // If this is a Firestore update that matches the cache we already rendered, skip re-render
    if (!isFirstLoad && fp === lastDataFingerprint) return;

    // Conflict detection: local matches that aren't in the incoming cloud data.
    // Skip for 5 s after a local save — the stale Firestore cache snapshot
    // hasn't picked up our write yet and would falsely flag new matches.
    // Also skip while a live session is active — buffered matches are intentionally
    // local-only until the user taps SYNC or END SESSION.
    const _recentSave = (Date.now() - _lastLocalSaveTime) < 15000;
    const _sessionBuffering = !!(_liveSessionData?.sessionActive);
    if (!skipConflict && !isFirstLoad && !_recentSave && !_sessionBuffering && allMatches.length > 0) {
      const cloudKeys = new Set(matches.map(_mkMatchKey));
      const localOnly = allMatches.filter(
        (m) => !cloudKeys.has(_mkMatchKey(m)),
      );
      if (localOnly.length > 0) {
        _showSyncConflict(
          matches,
          pls,
          pam,
          npid,
          localOnly,
          (resolved, rPls, rPam, rNpid, save) => {
            lastDataFingerprint = null; // force reprocess
            onData(resolved, rPls, rPam, rNpid, true);
            if (save) saveCloudData();
          },
        );
        return;
      }
    }

    lastDataFingerprint = fp;
    _dataVersion++;

    // If a live session is buffering local matches, re-attach them after the cloud update
    // so Firestore snapshots can't silently erase unsync'd session matches.
    if (_sessionBuffering && _sessionPendingCount > 0) {
      const cloudKeys = new Set(matches.map(_mkMatchKey));
      const pending = allMatches.filter(m => !cloudKeys.has(_mkMatchKey(m)));
      allMatches = pending.length
        ? [...matches, ...pending].sort((a, b) => (a.date || "").localeCompare(b.date || ""))
        : matches;
    } else {
      allMatches = matches;
    }
    players = pls;
    playerAliasMap = pam;
    nextPlayerId = npid || 1;
    rebuildNameMaps();
    _invalidateEloMemo();
    autoSaveWeeklySnap();
    if (window.appCache) window.appCache.save(allMatches, players, playerAliasMap, nextPlayerId);

    const _onAddPage = () => document.querySelector(".page.active")?.id === "pg-add";
    if (isFirstLoad) {
      // First render: paint data, then dismiss splash so user sees cards animate in cleanly once
      renderHome();
      renderCompact();
      if (_onAddPage()) refreshManage();
      fired = true;
      window.dismissSplash("Ready ✓");
      setTimeout(_checkAnniversaries, 1800);
      setTimeout(checkResumeSession, 800); // Enhancement 13: show session resume banner if saved state exists
    } else {
      // Genuine new data from Firestore: fade board out, re-render, fade back in — no blur flash
      const board = document.getElementById("board");
      if (board) {
        board.style.transition = "opacity 0.15s ease";
        board.style.opacity = "0";
      }
      setTimeout(function () {
        renderHome();
        renderCompact();
        if (_onAddPage()) { refreshManage(); if (_addRenderedVersion !== _dataVersion) renderAddMatches(); }
        if (board) {
          // Suppress the per-card keyframe animation for live updates
          board.querySelectorAll(".pc").forEach(function (c) {
            c.style.animation = "none";
            c.style.opacity = "1";
            c.style.transform = "none";
          });
          board.style.opacity = "1";
        }
      }, 160);
    }
  }

  // Step 1 — try cache instantly
  try {
    const cached = window.appCache && window.appCache.load();
    if (cached && Array.isArray(cached.matches) && cached.matches.length) {
      const { pls, pam, npid } = extractPlayerData(cached);
      onData(cached.matches, pls, pam, npid);
    }
  } catch (e) {}

  // Step 2 — Firestore live subscription (skipped in forced-offline mode)
  if (_forcedOffline) {
    window.dismissSplash("Offline mode");
    return;
  }
  try {
    _firestoreUnsub = onSnapshot(
      doc(db, "padel", "main"),
      function (snap) {
        if (!snap.exists()) {
          window.dismissSplash("Ready");
          return;
        }
        const d = snap.data();
        const { pls, pam, npid } = extractPlayerData(d);
        onData(d.matches || [], pls, pam, npid);
      },
      function (err) {
        console.error("Firestore error:", err);
        window.dismissSplash("Offline");
      },
    );
  } catch (e) {
    console.error("onSnapshot failed:", e);
    window.dismissSplash("Offline");
  }
}

function animateGauges() {
  const gauges = document.querySelectorAll(".sr-ring");

  const noCascade = document.body.classList.contains("no-cascade");
  gauges.forEach((g, i) => {
    const target = getComputedStyle(g).getPropertyValue("--target-angle");
    setTimeout(() => {
      g.style.setProperty("--speed-angle", target);
    }, noCascade ? 0 : i * 80);
  });
}

// ── AUTH ───────────────────────────────────────────────────
document.getElementById("loginBtn").addEventListener("click", async () => {
  try {
    if (auth.currentUser) {
      await signOut(auth);
      closeHamburgerMenu();
      return;
    }
    await signInWithPopup(auth, provider);
    closeHamburgerMenu();
  } catch (err) {
    if (err.code === "auth/popup-blocked")
      await signInWithRedirect(auth, provider);
    else alert(err.message);
  }
});

getRedirectResult(auth).catch(console.error);

let _authInitialFired = false;
// Enhancement 21: offline indicator
function _updateOfflineIndicator() {
  const el = document.getElementById("offline-indicator");
  if (!el) return;
  el.style.display = navigator.onLine ? "none" : "flex";
}
window.addEventListener("online", () => { _updateOfflineIndicator(); _trySyncNow(); });
window.addEventListener("offline", _updateOfflineIndicator);
_updateOfflineIndicator();
_setPendingSync(_hasPendingSync());

onAuthStateChanged(auth, (user) => {
  const wasAdmin = window.isAdmin;
  window.isAdmin = !!user && user.email === ADMIN_EMAIL;
  updateAdminUI(user);
  if (window.isAdmin) scheduleAutoEmail();
  else if (_emailTimer) {
    clearTimeout(_emailTimer);
    _emailTimer = null;
  }
  // Skip re-render on the initial auth state resolution at startup —
  // loadCloudData() already handles the first render. Only re-render
  // when auth genuinely changes (user logs in or out mid-session).
  if (!_authInitialFired) {
    _authInitialFired = true;
    return;
  }
  if (allMatches.length) {
    renderHome();
    renderCompact();
  }
});

function updateAdminUI(user) {
  const scToggle = document.getElementById("screenshotChoiceToggle");
  if (scToggle) scToggle.checked = localStorage.getItem("screenshot_ask_choice") === "1";
  const _al = localStorage.getItem("anim_level") || (localStorage.getItem("cascade_anim") === "0" ? "medium" : "full");
  document.querySelectorAll(".anim-seg-btn").forEach((b) => b.classList.toggle("active", b.dataset.val === _al));
  const fab = document.getElementById("fab");
  // Show/hide admin tabs in all tabbars
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.style.display = window.isAdmin ? "flex" : "none";
  });
  // FAB only shows when on the add page and admin
  const currentPage = document.querySelector(".page.active")?.id;
  fab.style.display =
    window.isAdmin && currentPage === "pg-add" ? "flex" : "none";
  document.getElementById("loginBtn").textContent = user ? "Logout" : "Login";
  // Hide edit/add tabs for non-admins
  document.querySelectorAll(".itab").forEach((tab) => {
    const txt = tab.textContent.trim();
    if (
      !window.isAdmin &&
      (txt.includes("Add") || txt.includes("Names") || txt.includes("Manage"))
    ) {
      tab.style.display = "none";
    } else {
      tab.style.display = "";
    }
  });
  // Prefill date for admin whenever auth state resolves
  if (window.isAdmin) {
    prefillMatchTADate();
  }
  // Show Live Scoring button only for admin
  const liveHmenu = document.getElementById("live-scoring-hmenu");
  if (liveHmenu) liveHmenu.style.display = window.isAdmin ? "" : "none";
  // Show Offline Mode toggle only for admin
  const offlineItem = document.getElementById("offline-mode-item");
  if (offlineItem) offlineItem.style.display = window.isAdmin ? "" : "none";
}

// ── NAVIGATION ─────────────────────────────────────────────
function goTo(id) {
  if (id === "add" && !window.isAdmin) {
    alert("Only admin can add data");
    return;
  }
  const _leavingPage = document.querySelector(".page.active")?.id;
  if (_leavingPage === "pg-compact" && id !== "compact") _sessionGuestUnexcluded.clear();
  prevPage = (_leavingPage || "pg-home").replace("pg-", "");
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("pg-" + id).classList.add("active");
  document.getElementById("fab").style.display =
    id === "add" && window.isAdmin ? "flex" : "none";
  if (id === "home") {
    const fk = `${homeFilter}|${homeFrom||""}|${homeTo||""}`;
    if (_homeRenderedVersion !== _dataVersion || _homeRenderedFilter !== fk) renderHome();
  }
  if (id === "compact") {
    const fk = `${cmpFilter}|${cmpFrom||""}|${cmpTo||""}|${cmpSortKey}|${cmpSortAsc}`;
    if (_compactRenderedVersion !== _dataVersion || _compactRenderedFilter !== fk) renderCompact();
  }
  if (id === "history") {
    renderModernMatches();
  }
  if (id === "add") {
    refreshManage();
    if (_addRenderedVersion !== _dataVersion) renderAddMatches();
  }
}
function goBack() {
  const curId = document.querySelector(".page.active")?.id?.replace("pg-", "");
  const dest = prevPage === "add" ? "home" : prevPage;
  goTo(dest === curId ? "home" : dest);
}

function _slideTab(fromPage, toPage, dir) {
  const DUR = 300;
  const EASE = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";
  const w = window.innerWidth;

  // Classes already swapped by switchMainTab before this is called.
  // fromPage = now-inactive (CSS: opacity 0, translateX 8px, pointer-events none)
  // toPage   = now-active   (CSS: opacity 1, translateX 0,  pointer-events auto)
  // We override inline to set the START positions, then animate to the END positions.

  fromPage.style.transition = "none";
  fromPage.style.opacity = "1";
  fromPage.style.pointerEvents = "none";
  fromPage.style.transform = "translateX(0)";

  toPage.style.transition = "none";
  toPage.style.transform = `translateX(${dir * w}px)`;

  // Force reflow so start positions register before transitions begin
  fromPage.getBoundingClientRect();
  toPage.getBoundingClientRect();

  fromPage.style.transition = `transform ${DUR}ms ${EASE}, opacity ${DUR}ms ease`;
  fromPage.style.transform = `translateX(${-dir * w}px)`;
  fromPage.style.opacity = "0";

  toPage.style.transition = `transform ${DUR}ms ${EASE}`;
  toPage.style.transform = "translateX(0)";

  // Return CSS control after animation completes
  setTimeout(() => {
    for (const p of [fromPage, toPage]) {
      p.style.transition = "";
      p.style.transform = "";
      p.style.opacity = "";
      p.style.pointerEvents = "";
    }
  }, DUR + 50);
}

function switchMainTab(id, skipAnim = false) {
  if (id === "add" && !window.isAdmin) {
    alert("Only admin can access this");
    return;
  }

  // Capture current page before any class changes
  const curPage = document.querySelector(".page.active");
  const nextPage = document.getElementById("pg-" + id);

  // ── Sync date filter between Detailed (home) and Summary (compact) ──
  const homeSelEl = document.getElementById("homeFilterSel");
  const cmpSelEl = document.getElementById("cmpSel");
  if (homeSelEl && cmpSelEl) {
    if (id === "compact" && homeFilter !== "all") {
      cmpFilter = homeFilter;
      cmpSelEl.value = cmpFilter;
    }
  }

  // Update all tabbars
  document
    .querySelectorAll(".tabbar .tbb")
    .forEach((b) => b.classList.remove("on"));
  document.querySelectorAll(`.tabbar .tbb`).forEach((b) => {
    if (b.dataset.tab === id) b.classList.add("on");
  });

  // Swap active class immediately (same as original — keeps tabs always responsive)
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  if (nextPage) nextPage.classList.add("active");

  // FAB only visible on admin/add page
  document.getElementById("fab").style.display =
    id === "add" && window.isAdmin ? "flex" : "none";

  // Render content for the new page — skip if data + filter haven't changed
  if (id === "home") {
    const fk = `${homeFilter}|${homeFrom||""}|${homeTo||""}`;
    if (_homeRenderedVersion !== _dataVersion || _homeRenderedFilter !== fk) renderHome();
  }
  if (id === "compact") {
    const fk = `${cmpFilter}|${cmpFrom||""}|${cmpTo||""}|${cmpSortKey}|${cmpSortAsc}`;
    if (_compactRenderedVersion !== _dataVersion || _compactRenderedFilter !== fk) renderCompact();
  }
  if (id === "history") {
    renderModernMatches();
    populateHistoryPlayerChips();
    const hdf = document.getElementById("histDateFilter");
    if (hdf) hdf.value = matchTabFilter;
    const hrf = document.getElementById("histResultFilter");
    if (hrf) hrf.value = histOutcomeFilter;
    const htf = document.getElementById("histTagFilter");
    if (htf) htf.value = histMarginFilter;
  }
  if (id === "analytics") {
    renderAnalyticsPage();
    setTimeout(applyAnalyticsAnimations, 0);
  }
  if (id === "add") {
    refreshManage();
    if (_addRenderedVersion !== _dataVersion) renderAddMatches();
    prefillMatchTADate();
  }

  // ── Directional slide animation (pure visual layer on top of correct DOM state) ──
  const curIdx = mainTabOrder.indexOf(curPage?.id.replace("pg-", ""));
  const nextIdx = mainTabOrder.indexOf(id);
  const canSlide =
    !skipAnim &&
    curPage &&
    nextPage &&
    curPage !== nextPage &&
    curIdx !== -1 &&
    nextIdx !== -1 &&
    !_nd.active;

  if (canSlide) {
    _slideTab(curPage, nextPage, nextIdx > curIdx ? 1 : -1);
  }
}

const mainTabOrder = ["compact", "home", "history", "analytics"];

function isScrollable(el) {
  while (el && el !== document.body) {
    const style = window.getComputedStyle(el);
    const overflow = style.overflow + style.overflowX + style.overflowY;
    if (/auto|scroll/.test(overflow)) {
      if (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight)
        return true;
    }
    el = el.parentElement;
  }
  return false;
}

// ── PHYSICS SWIPE NAVIGATION ───────────────────────────────
const _nd = {
  active: false,
  debounce: false,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastTime: 0,
  vel: 0,
  curPage: null,
  adjPage: null,
  adjIdx: -1,
  curIdx: -1,
  dir: 0,
};

function _ndBlurOverlay() {
  return document.getElementById("swipe-blur-overlay");
}

function _ndRubberBand(x, limit) {
  if (Math.abs(x) <= limit) return x;
  const s = x > 0 ? 1 : -1;
  return s * (limit + Math.sqrt(Math.abs(x) - limit) * 14);
}

function _ndCleanup(instant) {
  const { curPage, adjPage } = _nd;
  const dur = instant ? 0 : 400;
  if (curPage) {
    curPage.style.transition = instant
      ? "none"
      : `transform ${dur}ms cubic-bezier(0.34,1.56,0.64,1), filter ${dur}ms ease`;
    curPage.style.transform = "";
    curPage.style.filter = "";
  }
  if (adjPage) {
    const adjStart = _nd.dir === 1 ? -window.innerWidth : window.innerWidth;
    adjPage.style.transition = instant
      ? "none"
      : `transform ${dur}ms cubic-bezier(0.34,1.56,0.64,1)`;
    adjPage.style.transform = `translateX(${adjStart}px)`;
  }
  const bl = _ndBlurOverlay();
  if (bl) {
    bl.style.transition = "opacity 0.3s";
    bl.style.opacity = "0";
  }
  setTimeout(() => {
    if (adjPage) {
      adjPage.style.transition = "";
      adjPage.style.transform = "";
      adjPage.style.opacity = "";
    }
    if (curPage) {
      curPage.style.transition = "";
    }
    _nd.curPage = null;
    _nd.adjPage = null;
    _nd.active = false;
  }, dur + 10);
}

function _ndCommit() {
  const { curPage, adjPage, dir } = _nd;
  const w = window.innerWidth;
  const curTarget = dir === 1 ? w : -w;
  const EASE = "cubic-bezier(0.25,0.46,0.45,0.94)";
  const DUR = 310;
  curPage.style.transition = `transform ${DUR}ms ${EASE}, filter ${DUR}ms ease`;
  curPage.style.transform = `translateX(${curTarget}px)`;
  curPage.style.filter = "blur(6px)";
  adjPage.style.transition = `transform ${DUR}ms ${EASE}`;
  adjPage.style.transform = "translateX(0px)";
  const bl = _ndBlurOverlay();
  if (bl) {
    bl.style.transition = "opacity 0.25s";
    bl.style.opacity = "0";
  }
  setTimeout(() => {
    switchMainTab(mainTabOrder[_nd.adjIdx], true);
    curPage.style.transition = "none";
    curPage.style.transform = "";
    curPage.style.filter = "";
    adjPage.style.transition = "none";
    adjPage.style.transform = "";
    adjPage.style.opacity = "";
    requestAnimationFrame(() => {
      curPage.style.transition = "";
      adjPage.style.transition = "";
      _nd.curPage = null;
      _nd.adjPage = null;
      _nd.active = false;
      _nd.debounce = true;
      setTimeout(() => {
        _nd.debounce = false;
      }, 320);
    });
  }, DUR);
}

document.addEventListener(
  "touchstart",
  (e) => {
    if (_nd.debounce || e.touches.length !== 1) return;
    if (document.querySelector("#player-detail-modal, #h2h-detail-modal"))
      return;
    if (isScrollable(e.target)) return;
    _nd.startX = _nd.lastX = e.touches[0].clientX;
    _nd.startY = e.touches[0].clientY;
    _nd.lastTime = Date.now();
    _nd.vel = 0;
    _nd.active = false;
    _nd.curPage = null;
    _nd.adjPage = null;
    const ap = document.querySelector(".page.active");
    if (!ap) return;
    _nd.curIdx = mainTabOrder.indexOf(ap.id.replace("pg-", ""));
    if (_nd.curIdx === -1) return;
    _nd.curPage = ap;
  },
  { passive: true },
);

document.addEventListener(
  "touchmove",
  (e) => {
    if (!_nd.curPage) return;
    const touch = e.touches[0];
    const dx = touch.clientX - _nd.startX;
    const dy = touch.clientY - _nd.startY;

    // Velocity tracking
    const now = Date.now(),
      dt = Math.max(now - _nd.lastTime, 1);
    _nd.vel = (touch.clientX - _nd.lastX) / dt;
    _nd.lastX = touch.clientX;
    _nd.lastTime = now;

    if (!_nd.active) {
      if (Math.abs(dy) > Math.abs(dx) + 5) {
        _nd.curPage = null;
        return;
      }
      if (Math.abs(dx) < 10) return;
      const dir = dx > 0 ? 1 : -1;
      const adjIdx = _nd.curIdx - dir;
      if (adjIdx < 0 || adjIdx >= mainTabOrder.length) {
        _nd.curPage = null;
        return;
      }
      const adjPage = document.getElementById("pg-" + mainTabOrder[adjIdx]);
      if (!adjPage) {
        _nd.curPage = null;
        return;
      }
      _nd.dir = dir;
      _nd.adjIdx = adjIdx;
      _nd.adjPage = adjPage;
      // Arm adjacent page off-screen
      const w = window.innerWidth;
      adjPage.style.transition = "none";
      adjPage.style.opacity = "1";
      adjPage.style.pointerEvents = "none";
      adjPage.style.transform = `translateX(${dir === 1 ? -w : w}px)`;
      _nd.curPage.style.transition = "none";
      _nd.active = true;
    }

    e.preventDefault();
    const w = window.innerWidth;
    const clamped = _ndRubberBand(dx, w * 0.46);
    const pct = Math.min(Math.abs(clamped) / w, 1);

    _nd.curPage.style.transform = `translateX(${clamped}px)`;
    _nd.curPage.style.filter = `blur(${(pct * 5).toFixed(1)}px)`;

    const adjBase = _nd.dir === 1 ? -w : w;
    _nd.adjPage.style.transform = `translateX(${adjBase + clamped}px)`;

    const bl = _ndBlurOverlay();
    if (bl) {
      bl.style.transition = "none";
      bl.style.opacity = (pct * 0.55).toFixed(2);
    }
  },
  { passive: false },
);

document.addEventListener(
  "touchend",
  (e) => {
    if (!_nd.active || !_nd.curPage || !_nd.adjPage) {
      _nd.curPage = null;
      _nd.adjPage = null;
      _nd.active = false;
      return;
    }
    const dx = e.changedTouches[0].clientX - _nd.startX;
    const commit =
      Math.abs(dx) > window.innerWidth * 0.33 || Math.abs(_nd.vel) > 0.38;
    commit ? _ndCommit() : _ndCleanup(false);
  },
  { passive: true },
);

// ── SWIPE-TO-DELETE ────────────────────────────────────────
let _swipeTouchStartX = 0,
  _swipeTouchStartY = 0,
  _swipeCard = null,
  _swipeActive = false;
document.addEventListener(
  "touchstart",
  (e) => {
    if (e.touches.length !== 1) return;
    const card = (window.isAdmin ? e.target.closest(".match-card") : null)
               || e.target.closest(".smr-wrap");
    if (!card) return;
    _swipeTouchStartX = e.touches[0].clientX;
    _swipeTouchStartY = e.touches[0].clientY;
    _swipeCard = card;
    _swipeActive = false;
  },
  { passive: true },
);

document.addEventListener(
  "touchmove",
  (e) => {
    if (!_swipeCard) return;
    const dx = e.touches[0].clientX - _swipeTouchStartX;
    const dy = e.touches[0].clientY - _swipeTouchStartY;
    if (!_swipeActive && Math.abs(dy) > Math.abs(dx)) {
      _swipeCard = null;
      return;
    }
    if (!_swipeActive && Math.abs(dx) > 8) _swipeActive = true;
    if (!_swipeActive) return;
    if (dx < 0) {
      const reveal = Math.min(72, Math.abs(dx));
      const inner = _swipeCard.querySelector(".match-card-inner, .smr-inner");
      if (inner) {
        inner.style.transform = `translateX(${-reveal}px)`;
        _swipeCard.classList.add("swiping");
      }
      if (reveal >= 52) _swipeCard.classList.add("swipe-revealed");
      else _swipeCard.classList.remove("swipe-revealed");
    } else {
      const inner = _swipeCard.querySelector(".match-card-inner, .smr-inner");
      if (inner) inner.style.transform = "";
      _swipeCard.classList.remove("swipe-revealed", "swiping");
    }
  },
  { passive: true },
);

document.addEventListener(
  "touchend",
  (e) => {
    if (!_swipeCard) return;
    const card = _swipeCard;
    _swipeCard = null;
    _swipeActive = false;
    const inner = card.querySelector(".match-card-inner, .smr-inner");
    if (card.classList.contains("swipe-revealed")) {
      if (inner) {
        inner.style.transition = "transform 0.25s ease";
        inner.style.transform = "translateX(-72px)";
      }
    } else {
      card.classList.remove("swipe-revealed", "swiping");
      if (inner) {
        inner.style.transition = "transform 0.25s ease";
        inner.style.transform = "";
        setTimeout(() => {
          inner.style.transition = "";
        }, 260);
      }
    }
  },
  { passive: true },
);

// Format today as D/M/YY (the expected date header format)
function todayDMYY() {
  const now = new Date();
  const d = now.getDate();
  const m = now.getMonth() + 1;
  const yy = String(now.getFullYear()).slice(-2);
  return `${d}/${m}/${yy}`;
}

function prefillMatchTADate() {
  const ta = document.getElementById("matchTA");
  if (!ta) return;
  // Only prefill if the textarea is completely empty
  if (ta.value.trim() === "") {
    ta.value = todayDMYY() + "\n";
    // Place cursor at end so admin can type right away
    ta.selectionStart = ta.selectionEnd = ta.value.length;
    previewMatchImport();
  }
}

function switchITab(id) {
  const keys = ["matches", "names", "manage"];
  document
    .querySelectorAll(".itab")
    .forEach((t, i) => t.classList.toggle("on", keys[i] === id));
  document
    .querySelectorAll(".panel")
    .forEach((p) => p.classList.remove("show"));
  document.getElementById("ip-" + id).classList.add("show");
  // FAB hidden only on Manage sub-tab
  document.getElementById("fab").style.display =
    id !== "manage" && window.isAdmin ? "flex" : "none";
  if (id === "manage") {
    applyMngOrder();
    refreshManage();
    document
      .querySelectorAll("#ip-manage .mng-card, #ip-manage .mng-danger-card")
      .forEach((el, i) => {
        el.style.setProperty("--analytics-index", i);
        el.style.animation = "none";
        void el.offsetWidth;
        el.style.animation = "";
      });
    // Make cards collapsible; start collapsed on first visit
    document
      .querySelectorAll("#ip-manage .mng-card, #ip-manage .mng-danger-card")
      .forEach((card) => {
        const header = card.querySelector(".mng-card-header");
        if (header && !header.dataset.collapseInit) {
          header.dataset.collapseInit = "1";
          header.addEventListener("click", () => toggleMngCard(header));
        }
        if (!card.dataset.collapseInited) {
          card.dataset.collapseInited = "1";
          card.classList.add("mng-collapsed");
        }
      });
  }
  if (id === "names") renderNamesTable();
  if (id === "matches") prefillMatchTADate();
}

// ── MANAGE CARD REORDER ─────────────────────────────────────
const MNG_ORDER_KEY = "mng-card-order";
let _mngReorderActive = false;
let _mngDragSrc = null;

function _saveMngOrder() {
  const ids = Array.from(
    document.querySelectorAll("#mng-cards-container .mng-card[data-card-id]"),
  ).map((c) => c.dataset.cardId);
  try {
    localStorage.setItem(MNG_ORDER_KEY, JSON.stringify(ids));
  } catch {}
}

function applyMngOrder() {
  let order;
  try {
    order = JSON.parse(localStorage.getItem(MNG_ORDER_KEY));
  } catch {}
  if (!Array.isArray(order)) return;
  const container = document.getElementById("mng-cards-container");
  if (!container) return;
  order.forEach((id) => {
    const card = container.querySelector(`.mng-card[data-card-id="${id}"]`);
    if (card) container.appendChild(card);
  });
}

function toggleMngCard(header) {
  const card = header.closest(".mng-card, .mng-danger-card");
  if (card) card.classList.toggle("mng-collapsed");
}

function toggleManageReorder() {
  _mngReorderActive = !_mngReorderActive;
  const container = document.getElementById("mng-cards-container");
  const btn = document.getElementById("mng-reorder-btn");
  if (!container) return;
  container.classList.toggle("mng-reorder-active", _mngReorderActive);
  if (btn) {
    btn.textContent = _mngReorderActive ? "✓ DONE" : "⠿ REORDER";
    btn.style.color = _mngReorderActive ? "var(--theme)" : "var(--muted)";
    btn.style.borderColor = _mngReorderActive
      ? "rgba(var(--theme-rgb),0.4)"
      : "rgba(255,255,255,0.1)";
  }
  if (_mngReorderActive) {
    container.querySelectorAll(".mng-card[data-card-id]").forEach((card) => {
      card.setAttribute("draggable", "true");
      card.addEventListener("dragstart", _mngDragStart);
      card.addEventListener("dragover", _mngDragOver);
      card.addEventListener("dragleave", _mngDragLeave);
      card.addEventListener("drop", _mngDrop);
      card.addEventListener("dragend", _mngDragEnd);
    });
  } else {
    _saveMngOrder();
    container.querySelectorAll(".mng-card[data-card-id]").forEach((card) => {
      card.removeAttribute("draggable");
      card.removeEventListener("dragstart", _mngDragStart);
      card.removeEventListener("dragover", _mngDragOver);
      card.removeEventListener("dragleave", _mngDragLeave);
      card.removeEventListener("drop", _mngDrop);
      card.removeEventListener("dragend", _mngDragEnd);
    });
  }
}

function _mngDragStart(e) {
  _mngDragSrc = this;
  this.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
}
function _mngDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  this.classList.add("drag-over");
}
function _mngDragLeave() {
  this.classList.remove("drag-over");
}
function _mngDrop(e) {
  e.preventDefault();
  this.classList.remove("drag-over");
  if (!_mngDragSrc || _mngDragSrc === this) return;
  const container = document.getElementById("mng-cards-container");
  const cards = Array.from(
    container.querySelectorAll(".mng-card[data-card-id]"),
  );
  const srcIdx = cards.indexOf(_mngDragSrc);
  const tgtIdx = cards.indexOf(this);
  if (srcIdx < tgtIdx) container.insertBefore(_mngDragSrc, this.nextSibling);
  else container.insertBefore(_mngDragSrc, this);
}
function _mngDragEnd() {
  this.classList.remove("dragging");
  document
    .querySelectorAll(".mng-card")
    .forEach((c) => c.classList.remove("drag-over"));
  _mngDragSrc = null;
}

function refreshManage() {
  const days = new Set(allMatches.map((m) => m.date)).size;
  document.getElementById("manageInfo").innerHTML =
    `Matches: <strong>${allMatches.length}</strong><br>Days: <strong>${days}</strong><br>Players mapped: <strong>${Object.keys(aliasMap).length}</strong>`;
  renderEmailStatus();
  renderTrash();
  renderEloConfigCard();
}

// ── DATE HELPERS ───────────────────────────────────────────
function todayISO() {
  return toLocalISODate();
}
function weekISO() {
  const d = new Date(),
    day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  d.setDate(d.getDate() + diff);
  return toLocalISODate(d);
}
function weekEndISO() {
  const s = new Date(weekISO());
  s.setDate(s.getDate() + 6);
  return toLocalISODate(s);
}
function weekendRange() {
  const now = new Date(),
    day = now.getDay();
  const sat = new Date(now);
  sat.setDate(now.getDate() + (day === 0 ? -1 : 6 - day));
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return {
    from: toLocalISODate(sat),
    to: toLocalISODate(sun),
  };
}
function monthISO() {
  const d = new Date();
  d.setDate(1);
  return toLocalISODate(d);
}
function lastWeekRange() {
  const d = new Date(),
    day = d.getDay();
  const daysToMonday = day === 0 ? 6 : day - 1;
  const thisMonday = new Date(d);
  thisMonday.setDate(d.getDate() - daysToMonday);
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(thisMonday.getDate() - 1);
  return {
    from: toLocalISODate(lastMonday),
    to: toLocalISODate(lastSunday),
  };
}

function parseDateHdr(s) {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let [, d, mo, y] = m;
  if (y.length === 2) y = "20" + y;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}
function resolve(a) {
  const raw = String(a || "").trim();
  if (!raw) return raw;
  if (nameMap[raw]) return nameMap[raw];
  const hit = Object.entries(nameMap).find(
    ([alias]) => alias.toLowerCase() === raw.toLowerCase(),
  );
  return hit ? hit[1] : raw;
}

// Resolve a 2-char initial like "Ni" → full name from aliasMap or nameMap
function resolveInitial(init) {
  const key = String(init || "").trim().toLowerCase();
  if (!key) return null;

  const aliasExact = Object.entries(nameMap).find(
    ([alias]) => alias.toLowerCase() === key,
  );
  if (aliasExact) return aliasExact[1];

  const displayExact = Object.keys(aliasMap).find(
    (name) => name.toLowerCase() === key,
  );
  if (displayExact) return displayExact;

  const aliasPrefix = Object.entries(nameMap).find(([alias]) =>
    alias.toLowerCase().startsWith(key),
  );
  if (aliasPrefix) return aliasPrefix[1];

  const displayPrefix = Object.keys(aliasMap).find((name) =>
    name.toLowerCase().startsWith(key),
  );
  return displayPrefix || null;
}

function parseMatchLine(line) {
  line = line.trim().replace(/\s+/g, " ");

  // Shorthand format: NiGo v PaPu 6-1  (2-char initials, no spaces)
  const sh = line.match(
    /^([A-Za-z]{2})([A-Za-z]{2})\s+(?:vs?)\s+([A-Za-z]{2})([A-Za-z]{2})\s+(\d+)\s*[-–]\s*(\d+)$/i,
  );
  if (sh) {
    const r1 = resolveInitial(sh[1]),
      r2 = resolveInitial(sh[2]);
    const r3 = resolveInitial(sh[3]),
      r4 = resolveInitial(sh[4]);
    const sA = +sh[5],
      sB = +sh[6];
    if (r1 && r2 && r3 && r4 && !isNaN(sA) && !isNaN(sB) && sA !== sB) {
      return { teamA: [r1, r2], teamB: [r3, r4], scoreA: sA, scoreB: sB };
    }
  }

  // Standard format: Player1 Player2 vs Player3 Player4 6-1
  const m = line.match(/^(.+?)\s+(?:vs|v)\s+(.+?)\s+(\d+)\s*[-–]\s*(\d+)$/i);
  if (!m) return null;
  const tA = m[1].trim().split(" ").filter(Boolean),
    tB = m[2].trim().split(" ").filter(Boolean);
  const sA = +m[3],
    sB = +m[4];
  if (tA.length < 1 || tA.length > 2 || tB.length < 1 || tB.length > 2)
    return null;
  if (tA.length !== tB.length) return null;
  if (isNaN(sA) || isNaN(sB) || sA === sB) return null;
  return {
    teamA: tA.map(resolve),
    teamB: tB.map(resolve),
    scoreA: sA,
    scoreB: sB,
  };
}

function parseBlock(raw) {
  const parsed = [],
    errors = [],
    cur = { d: todayISO() };
  raw.split("\n").forEach((line, i) => {
    const t = line.trim();
    if (!t) return;
    const dt = parseDateHdr(t);
    if (dt) {
      cur.d = dt;
      return;
    }
    const m = parseMatchLine(t);
    if (m) parsed.push({ date: cur.d, ...m });
    else errors.push({ ln: i + 1, text: t });
  });
  return { parsed, errors };
}

// ── PLAYER AVATARS ─────────────────────────────────────────
const _AV_COLORS = [
  "#18d7ff",
  "#36d47e",
  "#f5c842",
  "#f04f4f",
  "#b06dff",
  "#ff7a3d",
  "#62b6ff",
  "#ff5fa0",
  "#4ec9b0",
  "#c8a96e",
];

function playerColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++)
    h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return _AV_COLORS[h % _AV_COLORS.length];
}
function playerInitials(name) {
  const p = name.trim().split(/\s+/);
  return (
    p.length >= 2 ? p[0][0] + p[p.length - 1][0] : name.slice(0, 2)
  ).toUpperCase();
}
function playerAvatar(name, size = 26) {
  const col = playerColor(name);
  const fs = Math.round(size * 0.38);
  const photo = photoMap[name];
  if (photo) {
    return `<span class="p-av p-av-photo" style="width:${size}px;height:${size}px;min-width:${size}px;border:1.5px solid ${col}"><img src="${photo}" alt="${escHtml(name)}" style="width:100%;height:100%;object-fit:cover;display:block"></span>`;
  }
  return `<span class="p-av" style="width:${size}px;height:${size}px;min-width:${size}px;font-size:${fs}px;background:${col}22;border:1.5px solid ${col};color:${col}">${playerInitials(name)}</span>`;
}
function sheetAv(name) {
  const photo = photoMap[name];
  if (photo) return `<img src="${photo}" class="live-sheet-item-av" style="object-fit:cover" alt="">`;
  return `<span class="live-sheet-item-av" style="background:${playerColor(name)}">${playerInitials(name)}</span>`;
}
function sheetAvSm(name) {
  const photo = photoMap[name];
  if (photo) return `<img src="${photo}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;flex-shrink:0" alt="">`;
  return `<div style="width:24px;height:24px;border-radius:50%;background:${playerColor(name)};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;flex-shrink:0">${playerInitials(name)}</div>`;
}

// ── GUEST FILTER ────────────────────────────────────────────
function activeMatches() {
  const excluded = new Set([
    ...Object.values(players)
      .filter(p => p.isGuest && !_sessionGuestUnexcluded.has(p.name))
      .map(p => p.name),
    ..._excludedPlayers,
  ]);
  if (!excluded.size) return allMatches;
  return allMatches.filter(m =>
    ![...(m.teamA || []), ...(m.teamB || [])].some(p => excluded.has(p))
  );
}

// ── FILTER ─────────────────────────────────────────────────
function filterMatches(f, from, to) {
  const t = todayISO(),
    sw = weekISO(),
    swe = t,
    sm = monthISO(),
    wr = weekendRange(),
    lwr = lastWeekRange();
  return activeMatches().filter((m) => {
    if (f === "all") return true;
    if (f === "today") return m.date === t;
    if (f === "week") return m.date >= sw && m.date <= swe;
    if (f === "weekend") return m.date >= wr.from && m.date <= wr.to;
    if (f === "month") return m.date >= sm && m.date <= t;
    if (f === "lastweek") return m.date >= lwr.from && m.date <= lwr.to;
    if (f === "day") return from ? m.date === from : m.date === t;
    if (f === "range") {
      const d = m.date || "";
      if (!d) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    }
    return true;
  });
}

// ── SCORE NORMALISATION (cap max side to 4) ────────────────
// Returns [normA, normB] scaled so max(A,B) = 4.
// Scores already ≤ 4 are unchanged.
function _normScores(sA, sB) {
  const mx = Math.max(sA, sB, 1);
  if (mx <= 4) return [sA, sB];
  const f = 4 / mx;
  return [sA * f, sB * f];
}

// ── COMPUTE STATS ──────────────────────────────────────────
function eloToSr(elo) {
  return parseFloat(Math.min(10, Math.max(0, (elo - 700) / 60)).toFixed(2));
}

function computeStats(matches, eloMap = {}) {
  const P = {};
  const g = (n) => {
    if (!P[n])
      P[n] = {
        name: n,
        mp: 0,
        mw: 0,
        gw: 0,
        gl: 0,
        ngw: 0,
        results: [],
        partnerPlayed: {},
        partnerWins: {},
        oppPlayed: {},
        oppWins: {},
      };
    return P[n];
  };
  const sorted = [...matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  sorted.forEach((m) => {
    const aWon = m.scoreA > m.scoreB;
    const [_nsA, _nsB] = _normScores(m.scoreA, m.scoreB);
    m.teamA.forEach((p) => {
      const pl = g(p);
      pl.mp++;
      pl.gw += m.scoreA;
      pl.gl += m.scoreB;
      pl.ngw += _nsA;
      if (aWon) pl.mw++;
      pl.results.push({ won: aWon, margin: m.scoreA - m.scoreB });
      m.teamA.forEach((partner) => {
        if (partner !== p) {
          pl.partnerPlayed[partner] = (pl.partnerPlayed[partner] || 0) + 1;
          if (aWon)
            pl.partnerWins[partner] = (pl.partnerWins[partner] || 0) + 1;
        }
      });
      m.teamB.forEach((opp) => {
        pl.oppPlayed[opp] = (pl.oppPlayed[opp] || 0) + 1;
        if (aWon) pl.oppWins[opp] = (pl.oppWins[opp] || 0) + 1;
      });
    });
    m.teamB.forEach((p) => {
      const pl = g(p);
      pl.mp++;
      pl.gw += m.scoreB;
      pl.gl += m.scoreA;
      pl.ngw += _nsB;
      if (!aWon) pl.mw++;
      pl.results.push({ won: !aWon, margin: m.scoreB - m.scoreA });
      m.teamB.forEach((partner) => {
        if (partner !== p) {
          pl.partnerPlayed[partner] = (pl.partnerPlayed[partner] || 0) + 1;
          if (!aWon)
            pl.partnerWins[partner] = (pl.partnerWins[partner] || 0) + 1;
        }
      });
      m.teamA.forEach((opp) => {
        pl.oppPlayed[opp] = (pl.oppPlayed[opp] || 0) + 1;
        if (!aWon) pl.oppWins[opp] = (pl.oppWins[opp] || 0) + 1;
      });
    });
  });
  const rows = Object.values(P);
  const maxMP = Math.max(1, ...rows.map((p) => p.mp));
  return rows
    .map((p) => {
      const ml = p.mp - p.mw,
        total = p.gw + p.gl;
      const mwr = p.mp > 0 ? p.mw / p.mp : 0,
        gwr = total > 0 ? p.gw / total : 0,
        act = p.mp / maxMP;
      const sr =
        p.name in eloMap
          ? eloToSr(eloMap[p.name])
          : mwr * 5 + gwr * 3 + act * 2;

      // Feature 1: win streak
      let curStreak = 0,
        curType = "",
        bestWinStreak = 0,
        runW = 0;
      if (p.results.length > 0) {
        curType = p.results[p.results.length - 1].won ? "W" : "L";
        for (let i = p.results.length - 1; i >= 0; i--) {
          const r = p.results[i];
          if ((r.won && curType === "W") || (!r.won && curType === "L"))
            curStreak++;
          else break;
        }
      }
      p.results.forEach((r) => {
        if (r.won) {
          runW++;
          bestWinStreak = Math.max(bestWinStreak, runW);
        } else runW = 0;
      });

      // Feature 2: partnership stats (min 2 games together)
      const MIN_G = 2;
      let bestPartner = null,
        worstPartner = null,
        bestPPct = -1,
        worstPPct = 101;
      Object.keys(p.partnerPlayed).forEach((partner) => {
        const played = p.partnerPlayed[partner];
        if (played < MIN_G) return;
        const pct = ((p.partnerWins[partner] || 0) / played) * 100;
        if (
          pct > bestPPct ||
          (pct === bestPPct && played > (bestPartner?.played ?? 0))
        ) {
          bestPPct = pct;
          bestPartner = { name: partner, pct, played };
        }
        if (
          pct < worstPPct ||
          (pct === worstPPct && played > (worstPartner?.played ?? 0))
        ) {
          worstPPct = pct;
          worstPartner = { name: partner, pct, played };
        }
      });

      // Feature 3: nemesis / favourite opponent (min 2 games)
      let favOpp = null,
        nemesis = null,
        favOPct = -1,
        nemOPct = 101;
      Object.keys(p.oppPlayed).forEach((opp) => {
        const played = p.oppPlayed[opp];
        if (played < MIN_G) return;
        const pct = ((p.oppWins[opp] || 0) / played) * 100;
        if (pct > favOPct) {
          favOPct = pct;
          favOpp = { name: opp, pct, played };
        }
        if (pct < nemOPct) {
          nemOPct = pct;
          nemesis = { name: opp, pct, played };
        }
      });

      // Feature 4: form — last 5 W/L
      const form = p.results.slice(-5).map((r) => (r.won ? "W" : "L"));

      // Feature 5: avg score margin
      const avgMargin =
        p.results.length > 0
          ? p.results.reduce((s, r) => s + r.margin, 0) / p.results.length
          : 0;

      // Consistency: lower std dev = more consistent
      const consistency =
        p.results.length >= 3
          ? parseFloat(
              Math.sqrt(
                p.results.reduce(
                  (s, r) => s + Math.pow(r.margin - avgMargin, 2),
                  0,
                ) / p.results.length,
              ).toFixed(1),
            )
          : null;

      return {
        ...p,
        ml,
        diff: p.gw - p.gl,
        sr,
        mwr,
        gwr,
        act,
        winPct: mwr * 100,
        gamePct: gwr * 100,
        curStreak,
        curType,
        bestWinStreak,
        bestPartner,
        worstPartner,
        favOpp,
        nemesis,
        form,
        avgMargin,
        consistency,
      };
    })
    .sort((a, b) => b.sr - a.sr || b.gamePct - a.gamePct);
}

// ── MOMENTUM BADGE ─────────────────────────────────────────
function getMomentumBadge(playerName) {
  // Get last 3 matches for this player, in chronological order
  const playerMatches = allMatches
    .filter((m) => m.teamA.includes(playerName) || m.teamB.includes(playerName))
    .slice(-3);
  if (playerMatches.length < 2) return "";
  let wins = 0,
    losses = 0;
  playerMatches.forEach((m) => {
    const onA = m.teamA.includes(playerName);
    const won = onA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
    if (won) wins++;
    else losses++;
  });
  if (wins >= 2) return "🔥";
  if (losses >= 2) return "❄️";
  return "";
}

function normPlayer(name) {
  return (nameMap[name] || name || "").trim();
}

// Rebuild aliasMap + nameMap from the players/playerAliasMap source-of-truth
function rebuildNameMaps() {
  aliasMap = {};
  nameMap = {};
  Object.values(players).forEach((p) => {
    const aliases = playerAliasMap[p.id] || [];
    aliasMap[p.name] = aliases;
    aliases.forEach((a) => { nameMap[a] = p.name; });
  });
}

// One-time migration from old { aliasMap } format to new players/playerAliasMap
function migrateAliasMapToPlayers(aMap) {
  const pls = {};
  const pam = {};
  let id = 1;
  Object.keys(aMap || {})
    .sort((a, b) => a.localeCompare(b))
    .forEach((name) => {
      pls[id] = { id, name, email: "", image: "", isGuest: false };
      pam[id] = Array.isArray(aMap[name]) ? [...aMap[name]] : [];
      id++;
    });
  return { players: pls, playerAliasMap: pam, nextPlayerId: id };
}

// Compute first/last played date for a display-name player
function getPlayerDateRange(playerName) {
  const dates = allMatches
    .filter((m) =>
      [...(m.teamA || []), ...(m.teamB || [])].some(
        (p) => normPlayer(p) === playerName,
      ),
    )
    .map((m) => m.date)
    .filter(Boolean)
    .sort();
  return { first: dates[0] || null, last: dates[dates.length - 1] || null };
}

function normalizedScoreline(m) {
  const hi = Math.max(Number(m.scoreA), Number(m.scoreB));
  const lo = Math.min(Number(m.scoreA), Number(m.scoreB));
  return `${hi}-${lo}`;
}

function sameMatch(a, b) {
  if (!a || !b) return false;
  const ta = [...(a.teamA || [])].sort().join("|");
  const tb = [...(a.teamB || [])].sort().join("|");
  const oa = [...(b.teamA || [])].sort().join("|");
  const ob = [...(b.teamB || [])].sort().join("|");
  return (
    a.date === b.date &&
    a.scoreA === b.scoreA &&
    a.scoreB === b.scoreB &&
    ta === oa &&
    tb === ob
  );
}

function getAllPlayerNamesFromMatches() {
  const names = new Set(Object.values(players).map((p) => p.name));
  allMatches.forEach((m) => {
    [...(m.teamA || []), ...(m.teamB || [])].forEach((p) =>
      names.add(normPlayer(p)),
    );
  });
  return sortPlayersGuestsLast([...names].filter(Boolean));
}

// Sort player names alphabetically, guests pushed to end
function sortPlayersGuestsLast(names) {
  const guestSet = new Set(Object.values(players).filter(p => p.isGuest).map(p => p.name));
  return [...names].sort((a, b) => {
    const ag = guestSet.has(a), bg = guestSet.has(b);
    if (ag !== bg) return ag ? 1 : -1;
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });
}

function getPairKey(team) {
  return [...team].map(normPlayer).sort().join(" & ");
}

function getPairStats(matches) {
  if (matches === undefined) matches = activeMatches();
  const pairs = {};
  matches.forEach((m) => {
    const aWon = Number(m.scoreA) > Number(m.scoreB);
    [
      {
        team: m.teamA || [],
        gf: Number(m.scoreA),
        ga: Number(m.scoreB),
        won: aWon,
      },
      {
        team: m.teamB || [],
        gf: Number(m.scoreB),
        ga: Number(m.scoreA),
        won: !aWon,
      },
    ].forEach((row) => {
      if (row.team.length < 2) return;
      const key = getPairKey(row.team);
      if (!pairs[key])
        pairs[key] = {
          key,
          players: key.split(" & "),
          played: 0,
          wins: 0,
          gf: 0,
          ga: 0,
        };
      pairs[key].played++;
      pairs[key].wins += row.won ? 1 : 0;
      pairs[key].gf += row.gf;
      pairs[key].ga += row.ga;
    });
  });
  return Object.values(pairs)
    .map((p) => ({
      ...p,
      losses: p.played - p.wins,
      winPct: p.played ? Math.round((p.wins / p.played) * 100) : 0,
      diff: p.gf - p.ga,
    }))
    .sort(
      (a, b) => b.winPct - a.winPct || b.played - a.played || b.diff - a.diff,
    );
}

function pairInMatch(m, pairKey) {
  if (!pairKey) return true;
  return (
    getPairKey(m.teamA || []) === pairKey ||
    getPairKey(m.teamB || []) === pairKey
  );
}

function playersOpposed(m, a, b) {
  if (!a || !b) return true;
  const na = a.toLowerCase();
  const nb = b.toLowerCase();
  const inA1 = (m.teamA || []).some((p) => normPlayer(p).toLowerCase() === na);
  const inA2 = (m.teamA || []).some((p) => normPlayer(p).toLowerCase() === nb);
  const inB1 = (m.teamB || []).some((p) => normPlayer(p).toLowerCase() === na);
  const inB2 = (m.teamB || []).some((p) => normPlayer(p).toLowerCase() === nb);
  return (inA1 && inB2) || (inB1 && inA2);
}

function getHeadToHeadStats(a, b, matches) {
  if (matches === undefined) matches = activeMatches();
  const rows = matches.filter((m) => playersOpposed(m, a, b));
  let aWins = 0,
    bWins = 0,
    diff = 0;
  rows.forEach((m) => {
    const aInTeamA = (m.teamA || []).some((p) => normPlayer(p) === a);
    const aWon = aInTeamA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
    if (aWon) aWins++;
    else bWins++;
    diff += aInTeamA ? m.scoreA - m.scoreB : m.scoreB - m.scoreA;
  });
  return { matches: rows, aWins, bWins, diff };
}

function getPlayerDetail(name) {
  const matches = activeMatches().filter((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].some(
      (p) => normPlayer(p) === name,
    ),
  );
  const stats = computeStats(activeMatches(), _memoElo()).find(
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

function getAchievements() {
  const stats = computeStats(activeMatches());
  const achievements = [];
  stats.forEach((p) => {
    const detail = getPlayerDetail(p.name);
    const last = detail.recent.slice(-5);
    const wins = last.filter((m) => m.won).length;
    const losses = last.length - wins;
    if (last.length >= 3 && wins === last.length)
      achievements.push({
        title: "Hot Streak",
        name: p.name,
        sub: `${wins} wins in recent form`,
      });
    if (last.length >= 3 && losses === last.length)
      achievements.push({
        title: "Cold Run",
        name: p.name,
        sub: `${losses} recent losses`,
      });
  });
  // Game Diff Boss — single player with highest positive differential
  const diffBoss = stats
    .filter((p) => p.diff > 0)
    .sort((a, b) => b.diff - a.diff)[0];
  if (diffBoss)
    achievements.push({
      title: "Game Diff Boss",
      name: diffBoss.name,
      sub: `+${diffBoss.diff} game differential`,
    });
  getPairStats()
    .slice(0, 3)
    .forEach((p) =>
      achievements.push({
        title: "Pair Power",
        name: p.key,
        sub: `${p.winPct}% across ${p.played} matches`,
      }),
    );
  return achievements.slice(0, 10);
}

// ── ADD MATCHES ────────────────────────────────────────────
function previewMatchImport() {
  const raw = document.getElementById("matchTA").value;
  const box = document.getElementById("matchPreview");
  if (!raw.trim()) {
    box.classList.remove("show");
    box.innerHTML = "";
    return;
  }
  const { parsed, errors } = parseBlock(raw);
  const duplicates = parsed.filter((m) =>
    allMatches.some((old) => sameMatch(old, m)),
  );
  const dupPlayers = parsed.filter(
    (m) =>
      new Set([...m.teamA, ...m.teamB]).size < m.teamA.length + m.teamB.length,
  );
  const rows = parsed.slice(0, 5).map((m) => {
    const dup = allMatches.some((old) => sameMatch(old, m));
    const badP =
      new Set([...m.teamA, ...m.teamB]).size < m.teamA.length + m.teamB.length;
    const warn = dup || badP;
    const tag = badP ? " · repeated player!" : dup ? " · duplicate?" : "";
    return `<div class="preview-row"><span>${m.date} · ${m.teamA.join(" & ")} vs ${m.teamB.join(" & ")}</span><strong class="${warn ? "preview-warn" : ""}">${m.scoreA}-${m.scoreB}${tag}</strong></div>`;
  });
  box.innerHTML = `
              <div><strong style="color:var(--text)">${parsed.length}</strong> parsed · <strong class="${errors.length ? "preview-warn" : ""}">${errors.length}</strong> skipped · <strong class="${duplicates.length ? "preview-warn" : ""}">${duplicates.length}</strong> duplicate warning(s)${dupPlayers.length ? ` · <strong class="preview-warn">${dupPlayers.length}</strong> repeated player(s)` : ""}</div>
              ${rows.join("")}
              ${parsed.length > 5 ? `<div class="preview-row"><span>+ ${parsed.length - 5} more</span><span></span></div>` : ""}
            `;
  box.classList.add("show");
}

function addMatches() {
  const raw = document.getElementById("matchTA").value;
  const eEl = document.getElementById("mErr"),
    oEl = document.getElementById("mOk");
  eEl.classList.remove("show");
  oEl.classList.remove("show");
  const { parsed: allParsed, errors } = parseBlock(raw);
  const badPlayerRows = allParsed.filter(
    (m) =>
      new Set([...m.teamA, ...m.teamB]).size < m.teamA.length + m.teamB.length,
  );
  const parsed = allParsed.filter(
    (m) =>
      new Set([...m.teamA, ...m.teamB]).size ===
      m.teamA.length + m.teamB.length,
  );
  const errParts = [];
  if (errors.length) {
    errParts.push(
      `Skipped ${errors.length} line(s):<br>` +
        errors
          .slice(0, 4)
          .map((e) => `Line ${e.ln}: ${e.text}`)
          .join("<br>") +
        (errors.length > 4 ? "<br>…and more" : ""),
    );
  }
  if (badPlayerRows.length) {
    errParts.push(
      `Skipped ${badPlayerRows.length} match(es) with repeated players.`,
    );
  }
  if (errParts.length) {
    eEl.innerHTML = errParts.join("<br>");
    eEl.classList.add("show");
  }
  // Split: exact duplicates vs genuinely new
  const exactDups = parsed.filter((m) => allMatches.some((old) => sameMatch(old, m)));
  const toAdd = parsed.filter((m) => !allMatches.some((old) => sameMatch(old, m)));

  // Same-day same-teams among the non-exact-dup matches
  const sameDayDups = toAdd.filter((m) =>
    allMatches.some(
      (old) =>
        old.date === m.date &&
        [...(old.teamA || [])].sort().join("|") === [...(m.teamA || [])].sort().join("|") &&
        [...(old.teamB || [])].sort().join("|") === [...(m.teamB || [])].sort().join("|"),
    ),
  );

  function _commit(list) {
    if (!list.length) return;
    const prevSnapshot = [...allMatches];
    lastMatchSnapshot = prevSnapshot;
    let step = [...prevSnapshot];
    for (const m of list) {
      const next = [...step, m];
      checkMilestones(step, next);
      step = next;
    }
    allMatches.push(...list);
    _lastLocalSaveTime = Date.now();
    saveCloudData();
    document.getElementById("matchTA").value = "";
    prefillMatchTADate();
    oEl.textContent = `Added ${list.length} match${list.length > 1 ? "es" : ""}.`;
    oEl.classList.add("show");
    document.getElementById("undoAddBtn").style.display = "block";
    setTimeout(() => oEl.classList.remove("show"), 2500);
    renderHome();
    renderCompact();
    renderModernMatches();
    renderAddMatches();
  }

  // Exact duplicates → prompt (add all parsed if confirmed)
  if (exactDups.length) {
    const preview = exactDups
      .slice(0, 3)
      .map((m) => `${m.teamA.join(" & ")} vs ${m.teamB.join(" & ")} (${m.date})`)
      .join("\n");
    const more = exactDups.length > 3 ? `\n…and ${exactDups.length - 3} more` : "";
    showDupConfirmSheet(
      `${exactDups.length} exact duplicate(s) already exist:\n${preview}${more}\nAdd anyway?`,
      () => _commit(parsed),
    );
    return;
  }

  // Same-day same-teams → prompt (add non-exact-dups if confirmed)
  if (sameDayDups.length) {
    const preview = sameDayDups
      .slice(0, 3)
      .map((m) => `${m.teamA.join(" & ")} vs ${m.teamB.join(" & ")} (${m.date})`)
      .join("\n");
    const more = sameDayDups.length > 3 ? `\n…and ${sameDayDups.length - 3} more` : "";
    showDupConfirmSheet(
      `${sameDayDups.length} match(es) with the same teams already exist on that day:\n${preview}${more}`,
      () => _commit(toAdd),
    );
    return;
  }

  _commit(toAdd);
}

function undoLastAdd() {
  if (!lastMatchSnapshot) return;
  allMatches = lastMatchSnapshot;
  lastMatchSnapshot = null;
  saveCloudData();
  renderHome();
  renderCompact();
  renderModernMatches();
  renderAddMatches();
  refreshManage();
  document.getElementById("undoAddBtn").style.display = "none";
  const oEl = document.getElementById("mOk");
  oEl.textContent = "Last match import undone.";
  oEl.classList.add("show");
  setTimeout(() => oEl.classList.remove("show"), 2500);
}

// ── NAMES ──────────────────────────────────────────────────
function saveNames() {
  // Bulk JSON import into the player roster
  const raw = document.getElementById("namesTA")?.value.trim();
  const eEl = document.getElementById("nErr"),
    oEl = document.getElementById("nOk");
  if (eEl) eEl.classList.remove("show");
  if (oEl) oEl.classList.remove("show");
  if (!raw) return;

  // Collect display→aliases from JSON or line-by-line
  const importMap = {}; // display → [aliases]
  const errs = [];

  if (raw.startsWith("{")) {
    try {
      let parsed = JSON.parse(raw);
      if (parsed.nameMap && typeof parsed.nameMap === "object") parsed = parsed.nameMap;
      Object.entries(parsed).forEach(([alias, display]) => {
        if (typeof alias !== "string" || typeof display !== "string") return;
        const a = alias.trim(), d = display.trim();
        if (!a || !d) return;
        if (!importMap[d]) importMap[d] = [];
        if (!importMap[d].includes(a)) importMap[d].push(a);
      });
    } catch (e) {
      if (eEl) { eEl.innerHTML = "Invalid JSON — check format"; eEl.classList.add("show"); }
      return;
    }
  } else {
    raw.split("\n").forEach((line, i) => {
      const t = line.trim();
      if (!t) return;
      const idx = t.indexOf("-");
      if (idx < 1) { errs.push(`Line ${i + 1}`); return; }
      const display = t.slice(0, idx).trim();
      const aliases = t.slice(idx + 1).split(",").map((a) => a.trim()).filter(Boolean);
      if (!display || !aliases.length) { errs.push(`Line ${i + 1}`); return; }
      importMap[display] = aliases;
    });
    if (errs.length && eEl) {
      eEl.innerHTML = `${errs.length} line(s) skipped`;
      eEl.classList.add("show");
    }
  }

  // Merge into players: update existing by name, add new
  Object.entries(importMap).forEach(([displayName, aliases]) => {
    const existing = Object.values(players).find((p) => p.name === displayName);
    if (existing) {
      playerAliasMap[existing.id] = aliases;
    } else {
      const id = nextPlayerId++;
      players[id] = { id, name: displayName, email: "", image: "", isGuest: false };
      playerAliasMap[id] = aliases;
    }
  });

  rebuildNameMaps();
  saveCloudData();
  if (oEl) {
    oEl.textContent = `Imported ${Object.keys(importMap).length} player(s).`;
    oEl.classList.add("show");
    setTimeout(() => oEl.classList.remove("show"), 2500);
  }
  renderNamesTable();
}
function loadNames() {
  const ta = document.getElementById("namesTA");
  if (ta) {
    ta.value = Object.values(players)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => `${p.name} - ${(playerAliasMap[p.id] || []).join(", ")}`)
      .join("\n");
  }
}

function editNameEntry(displayName) {
  // Legacy shim — find player by name and open the edit sheet
  const p = Object.values(players).find((x) => x.name === displayName);
  if (p) openPlayerEditSheet(p.id);
}

function renderNamesTable() {
  const table = document.getElementById("names-table");
  const sorted = Object.values(players).sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }),
  );
  if (!sorted.length) {
    table.innerHTML =
      '<p style="color:var(--muted);font-size:14px;text-align:center;padding:24px 0">No players yet. Tap + ADD PLAYER to get started.</p>';
    return;
  }
  table.innerHTML = sorted
    .map((p) => {
      const aliases = (playerAliasMap[p.id] || []);
      const { first, last } = getPlayerDateRange(p.name);
      const initials = (p.name || "?")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      const photo = photoMap[p.name];
      const avatarImg = photo
        ? `<img src="${photo}" style="width:40px;height:40px;border-radius:50%;object-fit:cover">`
        : `<div style="width:40px;height:40px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#000">${escHtml(initials)}</div>`;
      const photoControls = window.isAdmin
        ? `<div style="display:flex;gap:4px;margin-top:4px;justify-content:center">
            <button onclick="savePlayerPhoto(${jsArg(p.name)})" title="Upload photo" style="font-size:14px;background:none;border:none;cursor:pointer;padding:0;line-height:1">📷</button>
            ${photo ? `<button onclick="removePlayerPhoto(${jsArg(p.name)})" title="Remove photo" style="font-size:11px;background:none;border:none;cursor:pointer;padding:0;color:var(--muted);line-height:1">✕</button>` : ""}
          </div>`
        : "";
      const avatar = `<div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">${avatarImg}${photoControls}</div>`;
      const guestBadge = p.isGuest
        ? `<span style="font-size:9px;padding:2px 6px;border-radius:10px;background:rgba(255,165,0,0.15);color:orange;font-weight:700;letter-spacing:0.05em">GUEST</span>`
        : "";
      const aliasList = aliases.length
        ? `<div style="font-size:11px;color:var(--muted);margin-top:2px;text-transform:uppercase;letter-spacing:0.04em">${escHtml(aliases.join(" · "))}</div>`
        : "";
      const dates = (first || last)
        ? `<div style="font-size:10px;color:var(--muted);margin-top:4px">First: ${first ? fmtDate(first) : "—"} &nbsp;·&nbsp; Last: ${last ? fmtDate(last) : "—"}</div>`
        : "";
      const emailLine = p.email
        ? `<div style="font-size:10px;color:var(--muted);margin-top:2px">✉ ${escHtml(p.email)}</div>`
        : "";
      return `<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
        ${avatar}
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-weight:700;font-size:14px;color:var(--accent);text-transform:uppercase;letter-spacing:0.04em">${escHtml(p.name)}</span>
            ${guestBadge}
          </div>
          ${aliasList}${dates}${emailLine}
        </div>
        <button class="action-btn edit-btn" style="padding:6px 12px;font-size:11px;flex-shrink:0" onclick="openPlayerEditSheet(${p.id})">Edit</button>
      </div>`;
    })
    .join("");
}

function setScreenshotChoiceSetting(val) {
  localStorage.setItem("screenshot_ask_choice", val ? "1" : "0");
}

function setAnimLevel(val) {
  localStorage.setItem("anim_level", val);
  document.body.classList.toggle("no-cascade", val === "medium" || val === "off");
  document.body.classList.toggle("no-anim", val === "off");
  document.querySelectorAll(".anim-seg-btn").forEach((b) => b.classList.toggle("active", b.dataset.val === val));
}

function clearMatches() {
  if (!confirm("Clear all match data?")) return;
  allMatches = [];
  lastMatchSnapshot = null;
  document.getElementById("undoAddBtn").style.display = "none";
  saveCloudData();
  renderHome();
  renderCompact();
  refreshManage();
}
function clearNames() {
  if (!confirm("Clear all players?")) return;
  players = {};
  playerAliasMap = {};
  nextPlayerId = 1;
  rebuildNameMaps();
  saveCloudData();
  refreshManage();
  renderNamesTable();
}
function exportData() {
  navigator.clipboard
    .writeText(JSON.stringify({ matches: allMatches, players, playerAliasMap, nextPlayerId }, null, 2))
    .then(() => {
      const el = document.getElementById("expOk");
      el.textContent = "Copied!";
      el.classList.add("show");
      setTimeout(() => el.classList.remove("show"), 2500);
    })
    .catch(() => alert("Copy failed"));
}
function exportCSV() {
  const rows = [
    [
      "Date",
      "Team A P1",
      "Team A P2",
      "Score A",
      "Score B",
      "Team B P1",
      "Team B P2",
      "Note",
    ],
  ];
  allMatches.forEach((m) => {
    rows.push([
      m.date || "",
      m.teamA[0] || "",
      m.teamA[1] || "",
      m.scoreA,
      m.scoreB,
      m.teamB[0] || "",
      m.teamB[1] || "",
      m.note || "",
    ]);
  });
  const csv = rows
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "padel_matches.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function importData() {
  const raw = prompt(
    "Paste JSON export data to import (matches + names + aliases):",
  );
  if (!raw) return;
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    alert("Invalid JSON data");
    return;
  }
  const incomingMatches = data.matches || data.allMatches;
  if (!Array.isArray(incomingMatches)) {
    alert("JSON must include a matches array.");
    return;
  }
  // Enhancement 22: auto-merge instead of full replace
  const incoming = incomingMatches;
  const existingKeys = new Set(allMatches.map((m) => _mkMatchKey(m)));
  const newMatches = incoming.filter((m) => !existingKeys.has(_mkMatchKey(m)));
  const merged = [...allMatches, ...newMatches];
  merged.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  if (newMatches.length === 0) {
    alert("All matches already exist — nothing new to import.");
    return;
  }
  const confirm = window.confirm(`Merge: ${newMatches.length} new match${newMatches.length !== 1 ? "es" : ""} will be added (${incoming.length - newMatches.length} duplicates skipped). Continue?`);
  if (!confirm) return;
  allMatches = merged;
  if (data.players && typeof data.players === "object") {
    players = { ...players, ...data.players };
    playerAliasMap = { ...playerAliasMap, ...(data.playerAliasMap || {}) };
    if (data.nextPlayerId > nextPlayerId) nextPlayerId = data.nextPlayerId;
    rebuildNameMaps();
  } else {
    aliasMap = { ...aliasMap, ...(data.aliasMap || {}) };
    nameMap = { ...nameMap, ...(data.nameMap || {}) };
  }
  lastMatchSnapshot = null;
  document.getElementById("undoAddBtn").style.display = "none";
  saveCloudData();
  renderHome();
  renderCompact();
  renderModernMatches();
  renderAddMatches();
  refreshManage();
  renderNamesTable();
  alert(`Import complete: ${newMatches.length} match${newMatches.length !== 1 ? "es" : ""} added.`);
}

// ── RENDER HOME ────────────────────────────────────────────
function applyRange(page) {
  if (page === "home") {
    homeFrom = document.getElementById("drFrom").value || null;
    homeTo = document.getElementById("drTo").value || null;
    if (homeFrom && homeTo) renderHome();
  } else {
    cmpFrom = document.getElementById("cmpFrom").value || null;
    cmpTo = document.getElementById("cmpTo").value || null;
    renderCompact();
  }
}
function applyCmpDay() {
  cmpFrom = document.getElementById("cmpDayInput").value || null;
  cmpTo = null;
  renderCompact();
}
function onHomeFilterChange(val) {
  homeFilter = val;
  _syncHomeFilterLabel();
  const dr = document.getElementById("homeDrRow");
  if (val === "range") {
    dr.classList.add("show");
  } else {
    dr.classList.remove("show");
    homeFrom = null;
    homeTo = null;
    renderHome();
  }
}

function toggleCmpEqualized() {
  _cmpEqualized = !_cmpEqualized;
  const btn = document.getElementById("cmpEqBtn");
  if (btn) btn.classList.toggle("ss-eq-btn-on", _cmpEqualized);
  const th = document.getElementById("cmp-sr-th");
  if (th) th.innerHTML = (_cmpEqualized ? 'EQ <span class="sort-arrow" id="sort-sr"></span>' : 'SR <span class="sort-arrow" id="sort-sr"></span>');
  renderCompact();
}

function _saveExcludedPlayers() {
  try { localStorage.setItem("padel-exclude-players", JSON.stringify([..._excludedPlayers])); } catch(e) {}
}

function _updateExcludeBtn() {
  const btn = document.getElementById("cmpExcludeBtn");
  if (!btn) return;
  const guestCount = Object.values(players).filter(p => p.isGuest && !_sessionGuestUnexcluded.has(p.name)).length;
  const n = guestCount + _excludedPlayers.size;
  btn.classList.toggle("ss-eq-btn-on", n > 0);
  btn.innerHTML = n > 0 ? `🚫<span class="ss-exc-badge">${n}</span>` : "🚫";
}

function openExcludeSheet() {
  const overlay = document.getElementById("exclude-sheet-overlay");
  const sheet = document.getElementById("exclude-sheet");
  const list = document.getElementById("exclude-sheet-list");
  if (!overlay || !sheet || !list) return;
  const guestNames = new Set(Object.values(players).filter(p => p.isGuest).map(p => p.name));
  // Collect all names — guests first (pre-checked), then non-guests
  const guestSorted = [...guestNames].sort((a, b) => a.localeCompare(b));
  const nonGuestNames = new Set();
  allMatches.forEach(m => [...(m.teamA || []), ...(m.teamB || [])].forEach(p => {
    const n = nameMap[p] || p;
    if (!guestNames.has(n)) nonGuestNames.add(n);
  }));
  Object.values(players).forEach(p => { if (!p.isGuest) nonGuestNames.add(nameMap[p.name] || p.name); });
  const nonGuestSorted = [...nonGuestNames].filter(n => n).sort((a, b) => a.localeCompare(b));

  const makeItem = (p, isGuest) => {
    const on = isGuest ? !_sessionGuestUnexcluded.has(p) : _excludedPlayers.has(p);
    const guestTag = isGuest ? `<span style="font-size:9px;color:var(--muted);margin-left:auto;padding-right:4px;flex-shrink:0">GUEST</span>` : "";
    return `<button class="live-sheet-item${on ? " live-sheet-item-selected" : ""}" onclick="toggleExcludePlayer(${jsArg(p)})">
      ${sheetAv(p)}
      <span class="live-sheet-item-name">${escHtml(p)}</span>
      ${guestTag}
      ${on ? '<span class="live-sheet-check">✓</span>' : ""}
    </button>`;
  };

  const rows = [
    ...guestSorted.map(p => makeItem(p, true)),
    ...(guestSorted.length && nonGuestSorted.length ? [`<div class="exc-divider"></div>`] : []),
    ...nonGuestSorted.map(p => makeItem(p, false)),
  ];
  list.innerHTML = rows.join("");
  overlay.classList.add("live-sheet-open");
  sheet.classList.add("live-sheet-open");
}

function toggleExcludePlayer(name) {
  const isGuest = Object.values(players).some(p => p.isGuest && p.name === name);
  if (isGuest) {
    // Session-only toggle — guests default to excluded, override to re-include
    if (_sessionGuestUnexcluded.has(name)) _sessionGuestUnexcluded.delete(name);
    else _sessionGuestUnexcluded.add(name);
  } else {
    if (_excludedPlayers.has(name)) _excludedPlayers.delete(name);
    else _excludedPlayers.add(name);
    _saveExcludedPlayers();
  }
  // Refresh the tapped item in the sheet list
  const list = document.getElementById("exclude-sheet-list");
  if (list) {
    list.querySelectorAll(".live-sheet-item").forEach(btn => {
      const nameEl = btn.querySelector(".live-sheet-item-name");
      if (!nameEl || nameEl.textContent !== name) return;
      const on = isGuest ? !_sessionGuestUnexcluded.has(name) : _excludedPlayers.has(name);
      btn.classList.toggle("live-sheet-item-selected", on);
      const existing = btn.querySelector(".live-sheet-check");
      if (on && !existing) btn.insertAdjacentHTML("beforeend", '<span class="live-sheet-check">✓</span>');
      if (!on && existing) existing.remove();
    });
  }
  _updateExcludeBtn();
  renderCompact();
}

function clearExcludedPlayers() {
  _excludedPlayers.clear();
  _saveExcludedPlayers();
  // Also session-unexclude all guests so "CLEAR ALL" truly shows everyone
  Object.values(players).filter(p => p.isGuest).forEach(p => _sessionGuestUnexcluded.add(p.name));
  _updateExcludeBtn();
  renderCompact();
  closeExcludeSheet();
}

function closeExcludeSheet() {
  document.getElementById("exclude-sheet-overlay")?.classList.remove("live-sheet-open");
  document.getElementById("exclude-sheet")?.classList.remove("live-sheet-open");
}

function openColSheet() {
  _renderColChips();
  document.getElementById("col-sheet-overlay")?.classList.add("live-sheet-open");
  document.getElementById("col-sheet")?.classList.add("live-sheet-open");
}
function closeColSheet() {
  document.getElementById("col-sheet-overlay")?.classList.remove("live-sheet-open");
  document.getElementById("col-sheet")?.classList.remove("live-sheet-open");
}
function _renderColChips() {
  const list = document.getElementById("col-chip-list");
  if (!list) return;
  const chips = _CMP_TOGGLE_COLS.map(c =>
    `<button class="col-chip${_cmpHiddenCols.has(c.key) ? "" : " col-chip--on"}" onclick="toggleCmpCol(${jsArg(c.key)})">${escHtml(c.label)}</button>`
  ).join("");
  const showAll = _cmpHiddenCols.size > 0
    ? `<button class="ss-exc-clear-btn" onclick="showAllCmpCols()">SHOW ALL</button>`
    : "";
  list.innerHTML = chips + showAll;
}
function showAllCmpCols() {
  _cmpHiddenCols.clear();
  try { localStorage.setItem("padel_cmp_hidden_cols_v2", JSON.stringify([])); } catch (e) {}
  _applyCmpColClasses();
  _renderColChips();
}
function toggleCmpCol(key) {
  if (_cmpHiddenCols.has(key)) _cmpHiddenCols.delete(key);
  else _cmpHiddenCols.add(key);
  try { localStorage.setItem("padel_cmp_hidden_cols_v2", JSON.stringify([..._cmpHiddenCols])); } catch (e) {}
  _applyCmpColClasses();
  _renderColChips();
}
function _applyCmpColClasses() {
  const table = document.querySelector(".cmp");
  if (!table) return;
  _CMP_TOGGLE_COLS.forEach(c => table.classList.toggle(`hide-col-${c.key}`, _cmpHiddenCols.has(c.key)));
}

function onCmpFilter() {
  cmpFilter = document.getElementById("cmpSel").value;
  const dr = document.getElementById("cmpDr");
  if (cmpFilter === "range") dr.classList.add("show");
  else {
    dr.classList.remove("show");
    renderCompact();
  }
}

// home filter handled by onHomeFilterChange dropdown

// ── FORM SPARKLINE ─────────────────────────────────────────
function getFormSparkline(playerName, width = 80, height = 28) {
  // Get all matches involving player, sorted by date
  const pMatches = allMatches
    .filter((m) => m.teamA.includes(playerName) || m.teamB.includes(playerName))
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  if (pMatches.length < 2) return "";

  const last10 = pMatches.slice(-10);

  // Compute cumulative SR after each match using running window
  const srPoints = last10.map((_, i) => {
    const window = pMatches.slice(0, pMatches.indexOf(last10[i]) + 1);
    const s = computeStats(window, computeElo(window)).find(
      (p) => p.name === playerName,
    );
    return s ? s.sr : 0;
  });

  const min = Math.min(...srPoints);
  const max = Math.max(...srPoints);
  const range = max - min || 0.1;
  const pad = 3;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const pts = srPoints.map((v, i) => {
    const x = pad + (i / (srPoints.length - 1)) * w;
    const y = pad + h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  // Trend: compare first half avg vs second half avg
  const mid = Math.floor(srPoints.length / 2);
  const firstAvg = srPoints.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
  const lastAvg =
    srPoints.slice(mid).reduce((a, b) => a + b, 0) / (srPoints.length - mid);
  const trending =
    lastAvg > firstAvg + 0.05
      ? "up"
      : lastAvg < firstAvg - 0.05
        ? "down"
        : "flat";
  const lineColor =
    trending === "up" ? "#36d47e" : trending === "down" ? "#f04f4f" : "#f5c842";

  // Build area fill path
  const firstPt = pts[0].split(",");
  const lastPt = pts[pts.length - 1].split(",");
  const areaPath = `M${firstPt[0]},${pad + h} L${pts.join(" L")} L${lastPt[0]},${pad + h} Z`;

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
              <defs>
                <linearGradient id="sg_${playerName.replace(/\s/g, "_")}" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="${lineColor}" stop-opacity="0.25"/>
                  <stop offset="100%" stop-color="${lineColor}" stop-opacity="0.02"/>
                </linearGradient>
              </defs>
              <path d="${areaPath}" fill="url(#sg_${playerName.replace(/\s/g, "_")})" />
              <polyline points="${pts.join(" ")}" fill="none" stroke="${lineColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="${lastPt[0]}" cy="${lastPt[1]}" r="2.5" fill="${lineColor}"/>
            </svg>`;
}

function getSRRatingClass(normalizedSR) {
  let c =
    normalizedSR >= 7 ? "sr-high" : normalizedSR >= 4 ? "sr-mid" : "sr-low";
  if (normalizedSR > 7) c += " rev-limit";
  return c;
}

function getEloTier(elo) {
  if (elo >= 1150) return { name: "MASTER", color: "#ff5fe5" };
  if (elo >= 1100) return { name: "DIAMOND", color: "#5cd0ff" };
  if (elo >= 1050) return { name: "PLATINUM", color: "#7bc7c7" };
  if (elo >= 1000) return { name: "GOLD", color: "#f5c842" };
  if (elo >= 950) return { name: "SILVER", color: "#b8bdcc" };
  return { name: "BRONZE", color: "#c47645" };
}

function eloTierBadge(elo) {
  return `<span class="elo-tier-chip">${elo}</span>`;
}

let _hudGaugeId = 0;
function buildHudGaugeSvg(sr, ratingClass) {
  const uid = ++_hudGaugeId;
  const cx = 40, cy = 40, r = 33;
  const isHigh = ratingClass.includes("sr-high");
  const isMid  = ratingClass.includes("sr-mid");
  const col = isHigh ? "#32d74b" : isMid ? "#ffd60a" : "#ff3b30";
  const rgb = isHigh ? "50,215,75" : isMid ? "255,214,10" : "255,59,48";
  const isRevLim = ratingClass.includes("rev-limit");

  const pct   = Math.min(1, Math.max(0, sr / 10));
  const total = parseFloat((Math.PI * r).toFixed(2));
  const fill  = parseFloat((pct * total).toFixed(2));
  const lx = cx - r, rx = cx + r;
  const arcPath = `M ${lx} ${cy} A ${r} ${r} 0 0 1 ${rx} ${cy}`;

  // 19 tick marks every 10° spanning the 180° semicircle
  let ticks = "";
  for (let step = 0; step <= 18; step++) {
    const deg = 180 - step * 10;
    const rad = (deg * Math.PI) / 180;
    const isMaj = step % 3 === 0;
    const ro = r + 4, ri = r + (isMaj ? 1 : 3);
    const x1 = (cx + ro * Math.cos(rad)).toFixed(1);
    const y1 = (cy - ro * Math.sin(rad)).toFixed(1);
    const x2 = (cx + ri * Math.cos(rad)).toFixed(1);
    const y2 = (cy - ri * Math.sin(rad)).toFixed(1);
    ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${isMaj ? 1.4 : 0.8}" opacity="${isMaj ? 0.55 : 0.28}"/>`;
  }

  // Scale labels: 0 (left), 5 (top), 10 (right)
  const scalePts = [
    { ang: 180, lbl: "0",  anc: "end",    dx: -2, dy: 3 },
    { ang:  90, lbl: "5",  anc: "middle", dx:  0, dy: -6 },
    { ang:   0, lbl: "10", anc: "start",  dx:  2, dy: 3 },
  ];
  const scaleSvg = scalePts.map(({ ang, lbl, anc, dx, dy }) => {
    const rad = (ang * Math.PI) / 180;
    const sx = (cx + (r + 9) * Math.cos(rad) + dx).toFixed(1);
    const sy = (cy - (r + 9) * Math.sin(rad) + dy).toFixed(1);
    return `<text x="${sx}" y="${sy}" text-anchor="${anc}" font-size="5" font-family="monospace" fill="${col}" opacity="0.38">${lbl}</text>`;
  }).join("");

  return `<svg viewBox="0 0 80 48" class="hud-gauge-svg${isRevLim ? " hud-rev" : ""}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="hgf${uid}" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="2.5"/>
      </filter>
    </defs>
    <path d="M 2 ${cy + 4} L 2 ${cy - 11} L 11 ${cy - 11}" fill="none" stroke="${col}" stroke-width="1" opacity="0.55"/>
    <path d="M 78 ${cy + 4} L 78 ${cy - 11} L 69 ${cy - 11}" fill="none" stroke="${col}" stroke-width="1" opacity="0.55"/>
    ${ticks}
    <path d="${arcPath}" fill="none" stroke="rgba(${rgb},0.14)" stroke-width="2.5"/>
    <path d="${arcPath}" fill="none" stroke="${col}" stroke-width="5"
      stroke-dasharray="${total} ${total}" opacity="0.25"
      style="--fill:${fill};--total:${total}"
      filter="url(#hgf${uid})" class="hud-arc"/>
    <path d="${arcPath}" fill="none" stroke="${col}" stroke-width="2"
      stroke-dasharray="${total} ${total}" stroke-linecap="round"
      style="--fill:${fill};--total:${total}"
      class="hud-arc"/>
    <circle cx="${cx}" cy="${cy}" r="2.2" fill="${col}" opacity="0.9"/>
    <circle cx="${cx}" cy="${cy}" r="4"   fill="${col}" opacity="0.18" filter="url(#hgf${uid})"/>
    <line x1="${cx - 20}" y1="${cy + 4}" x2="${cx - 7}"  y2="${cy + 4}" stroke="${col}" stroke-width="0.7" opacity="0.35"/>
    <line x1="${cx + 7}"  y1="${cy + 4}" x2="${cx + 20}" y2="${cy + 4}" stroke="${col}" stroke-width="0.7" opacity="0.35"/>
    ${scaleSvg}
  </svg>`;
}

let _renderHomeGen = 0;
function renderHome() {
  _homeRenderedVersion = _dataVersion;
  _homeRenderedFilter = `${homeFilter}|${homeFrom||""}|${homeTo||""}`;
  const filtered = filterMatches(homeFilter, homeFrom, homeTo);
  const homeEloMapFull = computeElo(filtered);
  const stats = computeStats(filtered, homeEloMapFull);
  const totalG = filtered.reduce((s, m) => s + m.scoreA + m.scoreB, 0);
  const uniqD = new Set(filtered.map((m) => m.date)).size;
  const board = document.getElementById("board");
  if (!stats.length) {
    board.innerHTML = `<div class="empty"><div class="ico">🏓</div><p>No matches yet.<br>Tap <strong style="color:var(--accent)">+ Add</strong> to get started.</p><button class="add-cta" onclick="goTo('add')">Add Matches</button></div>`;
    const sb = document.getElementById("session-streak-badge");
    if (sb) sb.style.display = "none";
    return;
  }

  // Session streak badge (hidden per design)
  const streak = computeSessionStreak();
  const streakEl = document.getElementById("session-streak-badge");
  if (streakEl) streakEl.style.display = "none";
  const maxSR = stats[0].sr || 1;
  const homeEloMap = homeEloMapFull;

  // ELO delta over each player's last 5 matches
  const eloDeltaMap = {};
  stats.forEach((p) => {
    const playerMs = filtered
      .filter((m) => [...(m.teamA || []), ...(m.teamB || [])].includes(p.name))
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const last5 = playerMs.slice(-5);
    if (!last5.length) {
      eloDeltaMap[p.name] = null;
      return;
    }
    const without5 = filtered.filter((m) => !last5.includes(m));
    const prevElo = computeElo(without5)[p.name] || 1000;
    eloDeltaMap[p.name] = Math.round((homeEloMap[p.name] || 1000) - prevElo);
  });

  // Monthly ELO delta (30-day trend) — Enhancement 4
  const monthlyEloDeltaMap = {};
  const _thirtyAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); })();
  stats.forEach((p) => {
    const last30 = filtered.filter((m) => [...(m.teamA || []), ...(m.teamB || [])].includes(p.name) && (m.date || "") >= _thirtyAgo);
    if (!last30.length) { monthlyEloDeltaMap[p.name] = null; return; }
    const without30 = filtered.filter((m) => !last30.includes(m));
    monthlyEloDeltaMap[p.name] = Math.round((homeEloMap[p.name] || 1000) - (computeElo(without30)[p.name] || 1000));
  });

  const cardHtmls = stats.map((p, i) => {
    const rc = i === 0 ? "r1" : i === 1 ? "r2" : i === 2 ? "r3" : "";
    const ri =
      i === 0
        ? `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="display:block"><defs><radialGradient id="mgG" cx="36%" cy="28%" r="72%"><stop offset="0%" stop-color="#fffce0"/><stop offset="28%" stop-color="#FFD700"/><stop offset="65%" stop-color="#C8920A"/><stop offset="100%" stop-color="#8B6307"/></radialGradient><radialGradient id="mgGHL" cx="30%" cy="22%" r="44%"><stop offset="0%" stop-color="rgba(255,255,255,0.6)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></radialGradient></defs><circle cx="20" cy="20" r="19.5" fill="#5c3700"/><circle cx="20" cy="20" r="18" fill="url(#mgG)"/><circle cx="20" cy="20" r="18" fill="url(#mgGHL)"/><circle cx="20" cy="20" r="13.5" fill="none" stroke="rgba(255,240,120,0.55)" stroke-width="1.2"/><text x="20" y="27.5" text-anchor="middle" font-family="'Bebas Neue',sans-serif" font-size="19" font-weight="900" fill="#3d2000">1</text></svg>`
        : i === 1
          ? `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="display:block"><defs><radialGradient id="mgS" cx="36%" cy="28%" r="72%"><stop offset="0%" stop-color="#ffffff"/><stop offset="30%" stop-color="#d4d8e8"/><stop offset="65%" stop-color="#8a92b0"/><stop offset="100%" stop-color="#5a618a"/></radialGradient><radialGradient id="mgSHL" cx="30%" cy="22%" r="44%"><stop offset="0%" stop-color="rgba(255,255,255,0.65)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></radialGradient></defs><circle cx="20" cy="20" r="19.5" fill="#2a2f4a"/><circle cx="20" cy="20" r="18" fill="url(#mgS)"/><circle cx="20" cy="20" r="18" fill="url(#mgSHL)"/><circle cx="20" cy="20" r="13.5" fill="none" stroke="rgba(200,210,240,0.5)" stroke-width="1.2"/><text x="20" y="27.5" text-anchor="middle" font-family="'Bebas Neue',sans-serif" font-size="19" font-weight="900" fill="#1a1f3a">2</text></svg>`
          : i === 2
            ? `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="display:block"><defs><radialGradient id="mgB" cx="36%" cy="28%" r="72%"><stop offset="0%" stop-color="#ffe8cc"/><stop offset="28%" stop-color="#CD853F"/><stop offset="65%" stop-color="#8B5A2B"/><stop offset="100%" stop-color="#5d3a1a"/></radialGradient><radialGradient id="mgBHL" cx="30%" cy="22%" r="44%"><stop offset="0%" stop-color="rgba(255,255,255,0.55)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></radialGradient></defs><circle cx="20" cy="20" r="19.5" fill="#3d1f08"/><circle cx="20" cy="20" r="18" fill="url(#mgB)"/><circle cx="20" cy="20" r="18" fill="url(#mgBHL)"/><circle cx="20" cy="20" r="13.5" fill="none" stroke="rgba(255,180,100,0.5)" stroke-width="1.2"/><text x="20" y="27.5" text-anchor="middle" font-family="'Bebas Neue',sans-serif" font-size="19" font-weight="900" fill="#2d1000">3</text></svg>`
            : i + 1;
    const bw = ((p.sr / maxSR) * 100).toFixed(1);
    const normalizedSR = Math.max(0, Math.min(10, p.sr));
    const cardAngle = Math.round((normalizedSR / 10) * 180);
    const cardRatingClass = getSRRatingClass(normalizedSR);
    const ds = p.diff > 0 ? `+${p.diff}` : `${p.diff}`;
    const dc = p.diff > 0 ? "p" : p.diff < 0 ? "n" : "m";
    const mc = p.mw > p.ml ? "p" : p.mw < p.ml ? "n" : "m";
    const gc = p.gamePct >= 50 ? "tp" : "tn";
    const momentumBadge = getMomentumBadge(p.name);
    const sparklineSvg = getFormSparkline(p.name, 64, 20);
    const last5DotsHtml = p.form.length
      ? `<span class="spark-dots">${p.form.map((r) => `<span class="s5-dot ${r === "W" ? "s5-w" : "s5-l"}"></span>`).join("")}</span>`
      : "";
    const eld = eloDeltaMap[p.name];
    const mEld = monthlyEloDeltaMap[p.name];
    const eldHtml = mEld !== null && mEld !== undefined
      ? `<span class="s5-elo ${mEld > 0 ? "s5-pos" : mEld < 0 ? "s5-neg" : "s5-neu"}" title="ELO change (30 days)">${mEld > 0 ? "▲" : mEld < 0 ? "▼" : "–"}${Math.abs(mEld)}</span>`
      : eld !== null && eld !== undefined
        ? `<span class="s5-elo ${eld > 0 ? "s5-pos" : eld < 0 ? "s5-neg" : "s5-neu"}">${eld > 0 ? "▲" : eld < 0 ? "▼" : ""}${eld > 0 ? "+" : ""}${eld}</span>`
        : "";
    // Enhancement 1: streak chip
    const streakChip = p.curStreak > 0
      ? `<span class="card-streak-chip ${p.curType === "W" ? "csc-w" : "csc-l"}">${p.curType === "W" ? "🔥" : "❄️"}${p.curStreak}${p.curType}</span>`
      : "";
    const hasRowData = sparklineSvg || last5DotsHtml || eldHtml;
    const sparklineHtml = hasRowData
      ? `<div class="spark-row">${streakChip}<span class="spark-lbl">Form</span>${sparklineSvg || '<div style="flex:1"></div>'}<span class="spark-extras">${last5DotsHtml}${eldHtml}</span><span class="spark-full">Full stats →</span></div>`
      : streakChip
        ? `<div class="spark-row">${streakChip}</div>`
        : "";
    const playerBadges = computeBadges(p.name, p, homeEloMap, filtered, stats);
    const badgePillsHtml = playerBadges.length
      ? `<div class="card-badge-row">${playerBadges.map((b) => `<span class="card-badge-pill" title="${b.desc}">${b.icon} ${b.label}</span>`).join("")}</div>`
      : "";

    if (document.body.classList.contains("holo-mode")) {
      const corners = `<span class="holo-corner holo-corner-tl"></span><span class="holo-corner holo-corner-tr"></span><span class="holo-corner holo-corner-bl"></span><span class="holo-corner holo-corner-br"></span>`;
      return `<div class="pc ${rc} holo-pc" style="--card-index:${i}" onclick="openPlayerDetail(${jsArg(p.name)})">${corners}<div class="glow"></div><div class="ct"><div class="rb">${ri}</div><div class="ct-nameblock"><div class="pname-elo-row"><span class="pname">${escHtml(p.name)}</span><span class="pname-elo">${homeEloMap[p.name] || 1000}</span>${mkLvlRow(p.name)}</div></div><div class="skill-block"><div class="mini-gauge-wrap">${buildHudGaugeSvg(p.sr, cardRatingClass)}<div class="sr-val hud-sr-val ${cardRatingClass}" data-final="${p.sr.toFixed(2)}">${p.sr.toFixed(2)}</div></div></div></div><div class="bar-track"><div class="bar-fill" style="width:${bw}%"></div></div><div class="row3"><div class="cs"><div class="cv">${p.mp}</div><div class="cl">Played</div></div><div class="cs"><div class="cv ${mc}">${p.mw}W–${p.ml}L</div><div class="cl">Record</div></div><div class="cs"><div class="cv">${p.winPct.toFixed(0)}%</div><div class="cl">Win %</div></div><div class="cs"><div class="cv">${p.gw}–${p.gl}<span class="cv-diff ${dc}"> ${ds}</span></div><div class="cl">G Diff</div></div><div class="cs"><div class="cv ${gc}">${p.gamePct.toFixed(0)}%</div><div class="cl">G%</div></div></div>${sparklineHtml}</div>`;
    }
    return `<div class="pc ${rc}" style="--card-index:${i}" onclick="openPlayerDetail(${jsArg(p.name)})"><div class="glow"></div><div class="ct"><div class="rb">${ri}</div><div class="ct-nameblock"><div class="pname-elo-row"><span class="pname">${escHtml(p.name)}</span><span class="pname-elo">${homeEloMap[p.name] || 1000}</span>${mkLvlRow(p.name)}</div></div><div class="skill-block"><div class="mini-gauge-wrap"><div class="sr-ring ${cardRatingClass}" style="--speed-angle:${cardAngle}deg;--target-angle:${cardAngle}deg"><div class="gauge"><div class="needle"></div></div><div class="sr-val" data-final="${p.sr.toFixed(2)}">${p.sr.toFixed(2)}</div></div></div></div></div><div class="bar-track"><div class="bar-fill" style="width:${bw}%"></div></div><div class="row3"><div class="cs"><div class="cv">${p.mp}</div><div class="cl">Played</div></div><div class="cs"><div class="cv ${mc}">${p.mw}W–${p.ml}L</div><div class="cl">Record</div></div><div class="cs"><div class="cv">${p.winPct.toFixed(0)}%</div><div class="cl">Win %</div></div><div class="cs"><div class="cv">${p.gw}–${p.gl}<span class="cv-diff ${dc}"> ${ds}</span></div><div class="cl">G Diff</div></div><div class="cs"><div class="cv ${gc}">${p.gamePct.toFixed(0)}%</div><div class="cl">G%</div></div></div>${sparklineHtml}</div>`;
  });

  _renderSessionActiveCard();

  if (document.body.classList.contains("splash-done") && !document.body.classList.contains("no-cascade")) {
    board.innerHTML = "";
    const gen = ++_renderHomeGen;
    cardHtmls.forEach((html, i) => {
      setTimeout(() => {
        if (_renderHomeGen !== gen) return;
        const tmp = document.createElement("div");
        tmp.innerHTML = html;
        const card = tmp.firstChild;
        board.appendChild(card);
        const srEl = card.querySelector(".sr-val[data-final]");
        if (srEl) animateSrVal(srEl, 300);
        const xpRow = card.querySelector(".xp-row");
        if (xpRow) animateXpRow(xpRow, 300);
        card.querySelectorAll(".holo-gauge-val[data-final]").forEach((el) => animateSrVal(el, 220 + i * 60));
        const needle = card.querySelector(".needle");
        if (needle) setTimeout(() => _sweepNeedle(needle), 50);
        if (i === cardHtmls.length - 1) {
          setTimeout(animateGauges, 50);
        }
      }, i * 100);
    });
  } else {
    board.innerHTML = cardHtmls.join("");
    runSpeedometerSweep();
    setTimeout(animateGauges, 50);
    board
      .querySelectorAll(".sr-val[data-final]")
      .forEach((el) => animateSrVal(el, 300));
    board.querySelectorAll(".xp-row").forEach((el) => animateXpRow(el, 300));
    board.querySelectorAll(".holo-gauge-val[data-final]").forEach((el) => animateSrVal(el, 300));
  }
}

function animateXpRow(el, delay = 300) {
  const barEl = el.querySelector(".xp-bar-fill[data-pct]");
  if (!barEl) return;
  const finalPct = parseInt(barEl.dataset.pct, 10);
  barEl.style.transition = "none";
  barEl.style.width = "0%";
  setTimeout(() => {
    void barEl.offsetWidth;
    barEl.style.transition = `width ${Math.max(500, finalPct * 7)}ms ease-out`;
    barEl.style.width = `${finalPct}%`;
  }, delay);
}

function animateSrVal(el, delay = 200) {
  const target = parseFloat(el.dataset.final);
  if (isNaN(target)) return;
  let cur = 0;
  const step = target / 15;
  const tick = () => {
    cur = Math.min(cur + step, target);
    el.textContent = cur.toFixed(2);
    if (cur < target) setTimeout(tick, 33);
  };
  setTimeout(tick, delay);
}

// ── RENDER COMPACT ─────────────────────────────────────────
function _sweepNeedle(needle) {
  const ring = needle.closest(".sr-ring");
  if (!ring) return;
  const isRevLimit = ring.classList.contains("rev-limit");
  if (isRevLimit) ring.classList.remove("rev-limit");
  const targetDeg = parseFloat(getComputedStyle(ring).getPropertyValue("--speed-angle")) || 0;
  needle.animate(
    [
      { transform: "translateX(-50%) rotate(-90deg)" },
      { transform: "translateX(-50%) rotate(90deg)", offset: 0.62 },
      { transform: `translateX(-50%) rotate(${-90 + targetDeg}deg)` },
    ],
    { duration: 2200, easing: "cubic-bezier(0.22,1.15,0.36,1)", fill: "forwards" },
  );
  if (isRevLimit) {
    setTimeout(() => {
      if (!document.body.contains(ring)) return;
      ring.classList.add("rev-limit");
      // Shake the whole card visibly (additive so it doesn't fight cardSlideUp)
      const card = ring.closest(".pc");
      if (card) {
        card.animate(
          [
            { transform: "translateX(0px)" },
            { transform: "translateX(-5px)" },
            { transform: "translateX(5px)" },
            { transform: "translateX(-4px)" },
            { transform: "translateX(4px)" },
            { transform: "translateX(-3px)" },
            { transform: "translateX(3px)" },
            { transform: "translateX(-1px)" },
            { transform: "translateX(0px)" },
          ],
          { duration: 500, easing: "ease-in-out", composite: "add" },
        );
      }
    }, 2200);
  }
}

function runSpeedometerSweep() {
  requestAnimationFrame(() => {
    document.querySelectorAll(".needle").forEach(_sweepNeedle);
  });
}

function renderCompact() {
  _compactRenderedVersion = _dataVersion;
  _compactRenderedFilter = `${cmpFilter}|${cmpFrom||""}|${cmpTo||""}|${cmpSortKey}|${cmpSortAsc}|${[..._excludedPlayers].sort().join(",")}`;
  _updateExcludeBtn();
  const _cmpDateLbl = document.getElementById("cmpDateLabel");
  if (_cmpDateLbl) {
    const _LBL_MONTHS = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const _fmtLbl = iso => { const [,m,d] = iso.split("-"); return `${parseInt(d)} ${_LBL_MONTHS[parseInt(m)]}`; };
    const _cmpLblMap = { all:"ALL TIME", today:"TODAY", week:"THIS WEEK", lastweek:"LAST WEEK", weekend:"WEEKEND", month:"THIS MONTH", range:"RANGE", day:"DAY" };
    if (cmpFilter === "day" && cmpFrom) _cmpDateLbl.textContent = _fmtLbl(cmpFrom);
    else if (cmpFilter === "range" && cmpFrom && cmpTo) _cmpDateLbl.textContent = `${_fmtLbl(cmpFrom)}–${_fmtLbl(cmpTo)}`;
    else _cmpDateLbl.textContent = _cmpLblMap[cmpFilter] || cmpFilter.toUpperCase();
  }
  const filtered = filterMatches(cmpFilter, cmpFrom, cmpTo);
  const _cmpEloMap = computeElo(filtered);
  const stats = computeStats(filtered, _cmpEloMap);
  if (_cmpEqualized) {
    stats.forEach(p => {
      const c = p.mp / (p.mp + 5);
      const wScore = p.mwr * c + 0.5 * (1 - c);
      const gScore = p.gwr * c + 0.5 * (1 - c);
      p.eqSR = (wScore * 0.65 + gScore * 0.35) * 10;
    });
  }
  const sortFns = {
    name: (a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    mp: (a, b) => a.mp - b.mp,
    record: (a, b) => {
      if (cmpRecordSortMode === "wins") {
        if (a.mw !== b.mw) return a.mw - b.mw;
        if (a.ml !== b.ml) return a.ml - b.ml;
      } else {
        if (a.ml !== b.ml) return a.ml - b.ml;
        if (a.mw !== b.mw) return a.mw - b.mw;
      }
      return 0;
    },
    winPct: (a, b) => a.winPct - b.winPct,
    gw: (a, b) => a.gw - b.gw,
    gl: (a, b) => a.gl - b.gl,
    gamePct: (a, b) => a.gamePct - b.gamePct,
    elo: (a, b) => (_cmpEloMap[a.name] || 1000) - (_cmpEloMap[b.name] || 1000),
    sr: (a, b) => (_cmpEqualized ? (a.eqSR - b.eqSR) : (a.sr - b.sr)) || a.gamePct - b.gamePct,
  };
  const sorted = [...stats].sort((a, b) => {
    const cmp = sortFns[cmpSortKey](a, b);
    if (cmp !== 0) return cmpSortAsc ? cmp : -cmp;
    return a.name.localeCompare(b.name, undefined, {
      sensitivity: "base",
    });
  });
  const maxSR = sorted.length ? sorted[0].sr || 1 : 1;
  const fname = {
    all: "All Time",
    today: "Today",
    week: "This Week",
    weekend: "Weekend",
    month: "This Month",
    range: "Custom Range",
  };
  document.getElementById("cmpMeta").innerHTML =
    `<strong>${stats.length}</strong> players &nbsp;·&nbsp; <strong>${filtered.length}</strong> matches &nbsp;·&nbsp; ${fname[cmpFilter]}`;
  const tbody = document.getElementById("cmpBody");
  if (!sorted.length) {
    _cmpLeaderHtmls = [];
    _cmpFiltered = filtered;
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:28px;color:var(--muted);font-size:12px">No data for this period</td></tr>`;
    document.getElementById("cmpMatches").innerHTML =
      buildSummaryMatchRows(filtered);
    updateSortArrows(sorted);
    return;
  }
  updateSortArrows();
  _applyCmpColClasses();

  const splashDone = document.body.classList.contains("splash-done");

  const prevRankMap = getPrevWeekRankMap();
  const srSorted = [...sorted].sort((a, b) => {
    const sa = _cmpEqualized ? (a.eqSR ?? a.sr) : a.sr;
    const sb = _cmpEqualized ? (b.eqSR ?? b.sr) : b.sr;
    return sb - sa;
  });
  const srRankMap = {};
  srSorted.forEach((p, j) => { srRankMap[p.name] = j + 1; });
  const leaderRowHtmls = sorted.map((p, i) => {
    const rc = i === 0 ? "rg" : i === 1 ? "rs" : i === 2 ? "rb2" : "";
    const ri =
      i === 0
        ? "🥇"
        : i === 1
          ? "🥈"
          : i === 2
            ? "🥉"
            : `<span class="rn">${i + 1}</span>`;
    const mc = p.mw > p.ml ? "p" : p.mw < p.ml ? "n" : "m";
    const gc = p.gamePct >= 50 ? "tp" : "tn";
    const displaySR = _cmpEqualized ? (p.eqSR ?? p.sr) : p.sr;
    const normalizedSR = Math.max(0, Math.min(10, displaySR));
    const ratingClass = getSRRatingClass(normalizedSR);
    const momentumBadge = getMomentumBadge(p.name);
    const pillW = Math.round((normalizedSR / 10) * 100);
    const animClass = "";
    const prevRank = prevRankMap[p.name];
    const curRank = i + 1;
    let rankDelta = "";
    if (prevRank) {
      const diff = prevRank - curRank;
      if (diff > 0)
        rankDelta = `<span class="wk-rank-delta wk-up">▲${diff}</span>`;
      else if (diff < 0)
        rankDelta = `<span class="wk-rank-delta wk-down">▼${Math.abs(diff)}</span>`;
      else rankDelta = `<span class="wk-rank-delta wk-same">–</span>`;
    }
    const eloVal = Math.round(_cmpEloMap[p.name] || 1000);
    const _eloDiff = eloVal - 1000;
    const eloDeltaBadge = _eloDiff > 0
      ? `<span class="wk-rank-delta wk-up">+${_eloDiff}</span>`
      : _eloDiff < 0
        ? `<span class="wk-rank-delta wk-down">${_eloDiff}</span>`
        : `<span class="wk-rank-delta wk-same">±0</span>`;
    return `<tr class="${rc}${animClass}" style="cursor:pointer" onclick="openPlayerDetail(${jsArg(p.name)})"><td>${ri}</td><td>${escHtml(p.name.toUpperCase())}${rankDelta}</td><td data-col="mp">${p.mp}</td><td data-col="record"><span class="rec-cell ${mc}">${p.mw}–${p.ml}</span></td><td data-col="winPct">${p.winPct.toFixed(0)}%</td><td data-col="gw" class="tp">${p.gw}</td><td data-col="gl" class="tn">${p.gl}</td><td data-col="gamePct" class="${gc}">${p.gamePct.toFixed(0)}%</td><td data-col="elo" class="cmp-elo-cell">${eloVal}${eloDeltaBadge}</td><td><div class="sr-pill ${ratingClass}"><div class="sr-pill-bar"><div class="sr-pill-fill" style="width:${pillW}%"></div></div><span class="sr-pill-val" data-final="${displaySR.toFixed(2)}" style="color:${_rankColor(srRankMap[p.name], sorted.length)}">${displaySR.toFixed(2)}</span></div></td></tr>`;
  });

  _cmpLeaderHtmls = leaderRowHtmls;
  _cmpFiltered = filtered;

  const matchEloDeltas = _computeMatchEloDeltas(filtered);
  const reversedMatches = [...filtered].reverse();

  const cmpMatchesEl = document.getElementById("cmpMatches");
  const matchesHeader = cmpMatchesEl.previousElementSibling;

  if (splashDone && !document.body.classList.contains("no-cascade")) {
    tbody.innerHTML = "";
    cmpMatchesEl.innerHTML = "";
    matchesHeader.style.opacity = "0";
    matchesHeader.style.transform = "translateY(14px)";
    matchesHeader.style.transition =
      "opacity 0.38s cubic-bezier(0.22,1,0.36,1), transform 0.38s cubic-bezier(0.22,1,0.36,1)";

    leaderRowHtmls.forEach((html, i) => {
      setTimeout(() => {
        tbody.insertAdjacentHTML("beforeend", html);
        const srEl = tbody.lastElementChild.querySelector(".sr-pill-val[data-final]");
        if (srEl) animateSrVal(srEl, 50);
      }, i * 100);
    });

    const matchStartDelay = leaderRowHtmls.length * 100;
    setTimeout(() => {
      matchesHeader.style.opacity = "1";
      matchesHeader.style.transform = "translateY(0)";
    }, matchStartDelay);

    if (reversedMatches.length) {
      const list = document.createElement("div");
      list.className = "smr-list";
      setTimeout(() => cmpMatchesEl.appendChild(list), matchStartDelay);
      const animCount = Math.min(10, reversedMatches.length);
      const animRows = reversedMatches
        .slice(0, animCount)
        .map((m) => buildSummaryMatchRow(m, " card-anim", allMatches.indexOf(m), matchEloDeltas));
      const restRows = reversedMatches
        .slice(animCount)
        .map((m) => buildSummaryMatchRow(m, "", allMatches.indexOf(m), matchEloDeltas));
      animRows.forEach((html, i) => {
        setTimeout(() => {
          list.insertAdjacentHTML("beforeend", html);
        }, matchStartDelay + i * 100);
      });
      if (restRows.length) {
        setTimeout(() => {
          list.insertAdjacentHTML("beforeend", restRows.join(""));
        }, matchStartDelay + animCount * 100);
      }
      const summaryHtml = buildHistorySummary(filtered, cmpFilter);
      if (summaryHtml) {
        setTimeout(() => {
          cmpMatchesEl.insertAdjacentHTML("beforeend", summaryHtml);
          setTimeout(_animEloCounts, 80);
        }, matchStartDelay + animCount * 100 + 100);
      }
    } else {
      setTimeout(() => {
        cmpMatchesEl.innerHTML = `<div class="empty" style="padding:20px 0"><div class="ico">🏓</div><p>No matches found</p></div>`;
      }, matchStartDelay);
    }
  } else {
    matchesHeader.style.cssText = "";
    tbody.innerHTML = leaderRowHtmls.join("");
    tbody
      .querySelectorAll(".sr-pill-val[data-final]")
      .forEach((el) => animateSrVal(el, 0));
    const _nc = document.body.classList.contains("no-cascade");
    const initRows = reversedMatches.map((m, i) =>
      buildSummaryMatchRow(m, i < 10 && !_nc ? " card-anim" : "", allMatches.indexOf(m), matchEloDeltas),
    );
    if (initRows.length) {
      cmpMatchesEl.innerHTML =
        `<div class="smr-list">${initRows.join("")}</div>` +
        buildHistorySummary(filtered, cmpFilter);
      setTimeout(_animEloCounts, 80);
    } else {
      cmpMatchesEl.innerHTML = `<div class="empty" style="padding:20px 0"><div class="ico">🏓</div><p>No matches found</p></div>`;
    }
  }
}

function updateSortArrows() {
  const keyMap = {
    name: ["sort-name"],
    mp: ["sort-mp"],
    record: ["sort-record"],
    winPct: ["sort-winPct"],
    gw: ["sort-gw"],
    gl: ["sort-gl"],
    gamePct: ["sort-gamePct"],
    elo: ["sort-elo"],
    sr: ["sort-sr", "sort-rank"],
  };
  Object.entries(keyMap).forEach(([key, ids]) => {
    ids.forEach((id) => {
      const arrow = document.getElementById(id);
      if (!arrow) return;
      if (cmpSortKey === key) {
        if (key === "record") {
          arrow.innerHTML =
            cmpRecordSortMode === "wins"
              ? '<span style="color:var(--green)">▲</span>'
              : '<span style="color:var(--red)">▼</span>';
        } else {
          arrow.textContent = cmpSortAsc ? "▲" : "▼";
        }
      } else {
        arrow.innerHTML = "";
      }
      arrow.classList.toggle("active", cmpSortKey === key);
    });
  });
  // Highlight active TH column — Enhancement 6
  document.querySelectorAll("#cmpHead th").forEach((th) => th.classList.remove("cmp-th-sort-active"));
  const activeArrow = document.querySelector(".sort-arrow.active");
  if (activeArrow) {
    const th = activeArrow.closest("th");
    if (th) th.classList.add("cmp-th-sort-active");
  }
}

function setCmpSort(key) {
  if (cmpSortKey === key) {
    if (key === "record") {
      cmpRecordSortMode = cmpRecordSortMode === "wins" ? "losses" : "wins";
      cmpSortAsc = false;
    } else {
      cmpSortAsc = !cmpSortAsc;
    }
  } else {
    cmpSortKey = key;
    cmpSortAsc = key === "name";
    if (key === "record") cmpRecordSortMode = "wins";
  }
  renderCompact();
}

// ── MATCH HISTORY HELPERS ──────────────────────────────────
function isFireMatch(m) {
  return Math.abs(m.scoreA - m.scoreB) <= 1;
}

function isDominatingMatch(m) {
  const winnerScore = Math.max(Number(m.scoreA), Number(m.scoreB));
  const loserScore = Math.min(Number(m.scoreA), Number(m.scoreB));
  return (
    (winnerScore === 4 && loserScore === 1) ||
    (winnerScore === 6 && (loserScore === 1 || loserScore === 2))
  );
}

function isZeroMatch(m) {
  return Number(m.scoreA) === 0 || Number(m.scoreB) === 0;
}

function buildMatchRowHtml(m, extraClass = "", delay = null, matchIdx = null) {
  const aWon = m.scoreA > m.scoreB;
  const winA = aWon ? "cmr-win" : "cmr-loss";
  const winB = !aWon ? "cmr-win" : "cmr-loss";
  const teamA = (m.teamA || []).join(" & ");
  const teamB = (m.teamB || []).join(" & ");
  const diff = Math.abs(m.scoreA - m.scoreB);
  const badge = isFireMatch(m)
    ? `<span class="cmr-badge cmr-fire" title="Fire match: margin of 1 game">🔥</span>`
    : isDominatingMatch(m)
      ? `<span class="cmr-badge cmr-dom" title="Dominating: 4-1, 6-1, or 6-2">💀</span>`
      : isZeroMatch(m)
        ? `<span class="cmr-badge cmr-zero" title="Zero match: scored 0 games">😂</span>`
        : "";
  const clickable =
    matchIdx !== null
      ? ` style="animation-delay:${delay !== null ? delay : 0}ms;cursor:pointer" onclick="openMatchIntro(${matchIdx})"`
      : delay !== null
        ? ` style="animation-delay:${delay}ms"`
        : "";
  const delBtn = window.isAdmin && matchIdx !== null
    ? `<button class="cmr-del-btn" onclick="event.stopPropagation();deleteMatchByIndex(${matchIdx})" title="Delete match">✕</button>`
    : "";
  return `<tr class="cmr-row${extraClass}"${clickable}>
          <td class="cmr-date">${fmtDate(m.date)
            .replace(/\s+\d{4}$/, "")
            .toUpperCase()}</td>
          <td class="cmr-team ${winA}">${teamA}</td>
          <td class="cmr-sc"><span class="cmr-sv ${winA}">${m.scoreA}</span><span class="cmr-dash">–</span><span class="cmr-sv ${winB}">${m.scoreB}</span></td>
          <td class="cmr-team cmr-team-r ${winB}">${teamB}</td>
          <td class="cmr-meta">${badge}${delBtn}</td>
        </tr>`;
}

function buildCompactMatchRows(matches) {
  if (!matches.length)
    return `<div class="empty" style="padding:20px 0"><div class="ico">🏓</div><p>No matches found</p></div>`;
  return `<table class="cmp-match-rows"><tbody>${[...matches]
    .reverse()
    .map((m) => buildMatchRowHtml(m, "", null, allMatches.indexOf(m)))
    .join("")}</tbody></table>`;
}

function _computeMatchEloDeltas(matches) {
  const elo = {};
  const map = new Map();
  [...matches].sort((a, b) => (a.date || "").localeCompare(b.date || "")).forEach(m => {
    [...(m.teamA || []), ...(m.teamB || [])].forEach(p => { if (!(p in elo)) elo[p] = 1000; });
    const aWon = m.scoreA > m.scoreB;
    const avgA = m.teamA.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamA.length, 1);
    const avgB = m.teamB.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamB.length, 1);
    const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
    const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
    const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
    map.set(m, { dA, dB });
    m.teamA.forEach(p => { elo[p] = (elo[p] || 1000) + dA; });
    m.teamB.forEach(p => { elo[p] = (elo[p] || 1000) + dB; });
  });
  return map;
}
function buildSummaryMatchRow(m, extraClass = "", matchIdx = null, eloDeltaMap = null) {
  const aWon = m.scoreA > m.scoreB;
  const winA = aWon ? "cmr-win" : "cmr-loss";
  const winB = !aWon ? "cmr-win" : "cmr-loss";
  const teamA = (m.teamA || []).join(" & ");
  const teamB = (m.teamB || []).join(" & ");
  const badge = isFireMatch(m)
    ? `<span class="cmr-badge cmr-fire" title="Fire match: margin of 1 game">🔥</span>`
    : isDominatingMatch(m)
      ? `<span class="cmr-badge cmr-dom" title="Dominating: 4-1, 6-1, or 6-2">💀</span>`
      : isZeroMatch(m)
        ? `<span class="cmr-badge cmr-zero" title="Zero match: scored 0 games">😂</span>`
        : "";
  const clickHandler = matchIdx !== null ? `onclick="openMatchIntro(${matchIdx})"` : "";
  const _mkD = (d) => d == null ? "" : `<span class="smr-ed ${d > 0 ? "smr-ed-pos" : d < 0 ? "smr-ed-neg" : "smr-ed-neu"}">${d > 0 ? "+" : ""}${d}</span>`;
  const eloD = eloDeltaMap?.get(m);
  return `<div class="smr-wrap${extraClass}">
    <div class="smr-inner" ${clickHandler}>
      <span class="cmr-date">${fmtDate(m.date).replace(/\s+\d{4}$/, "").toUpperCase()}</span>
      <span class="cmr-team ${winA}">${escHtml(teamA)}${_mkD(eloD?.dA)}</span>
      <span class="cmr-sc"><span class="cmr-sv ${winA}">${m.scoreA}</span><span class="cmr-dash">–</span><span class="cmr-sv ${winB}">${m.scoreB}</span></span>
      <span class="cmr-team cmr-team-r ${winB}">${escHtml(teamB)}${_mkD(eloD?.dB)}</span>
      <span class="cmr-meta">${badge}</span>
    </div>
    ${matchIdx !== null ? `<div class="swipe-delete-reveal" onclick="event.stopPropagation();deleteMatchByIndex(${matchIdx})">🗑</div>` : ""}
  </div>`;
}
function buildSummaryMatchRows(matches) {
  if (!matches.length) return `<div class="empty" style="padding:20px 0"><div class="ico">🏓</div><p>No matches found</p></div>`;
  return `<div class="smr-list">${[...matches].reverse().map((m) => buildSummaryMatchRow(m, "", allMatches.indexOf(m))).join("")}</div>`;
}

function buildMatchCards(matches, showAdmin) {
  if (!matches.length)
    return `<div class="empty"><div class="ico">🏓</div><p>No matches found</p></div>`;
  // Single chronological walk: compute per-match ELO deltas AND pre-match pair ranks
  const eloMatchMap = new Map();
  const matchPairRankMap = new Map(); // match → Map(pairKey → pre-match rank)
  const _finalElo = {};
  const _allPairsList = getPairStats(); // all pairs ever formed
  {
    const elo = _finalElo;
    [...allMatches]
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      .forEach((m) => {
        [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
          if (!(p in elo)) elo[p] = 1000;
        });
        // Rank all pairs by their avg ELO right now (before this match)
        matchPairRankMap.set(
          m,
          new Map(
            _allPairsList
              .map((p) => ({
                key: p.key,
                avgElo:
                  p.players.reduce((s, n) => s + (elo[n] || 1000), 0) /
                  p.players.length,
              }))
              .sort((a, b) => b.avgElo - a.avgElo)
              .map(({ key }, i) => [key, i + 1]),
          ),
        );
        const aWon = m.scoreA > m.scoreB;
        const avgA =
          m.teamA.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamA.length, 1);
        const avgB =
          m.teamB.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamB.length, 1);
        const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
        const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
        const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
        const mData = {};
        (m.teamA || []).forEach((p) => {
          const after = (elo[p] || 1000) + dA;
          mData[p] = { delta: dA, after };
          elo[p] = after;
        });
        (m.teamB || []).forEach((p) => {
          const after = (elo[p] || 1000) + dB;
          mData[p] = { delta: dB, after };
          elo[p] = after;
        });
        eloMatchMap.set(m, mData);
      });
  }
  const mkEloPill = (p, eloData) => {
    const d = eloData[p];
    if (!d) return "";
    const display = normPlayer(p);
    const short =
      Object.keys(nameMap).find(
        (k) => nameMap[k] === display && k.length === 3,
      ) || display.slice(0, 3).toUpperCase();
    const cls = d.delta >= 0 ? "elo-gain" : "elo-loss";
    const arrow = d.delta >= 0 ? "↑" : "↓";
    return `<span class="elo-delta-pill ${cls}"><span class="elo-pname">${short}</span><span class="elo-pval">${d.after}</span><span class="elo-parrow">${arrow}${Math.abs(d.delta)}</span></span>`;
  };

  const mkTeamBlock = (players, won, score, hasZeroEmoji, preMatchRankMap) => {
    const winCls = won ? "winner" : "";
    const scoreCls = won ? "win" : "";
    const crown = won ? "👑 " : "";
    const rank = preMatchRankMap?.get(getPairKey(players));
    const rankHtml = rank
      ? `<div class="team-pair-rank">ELO #${rank}</div>`
      : "";
    if (players.length >= 2) {
      const p2Suffix = hasZeroEmoji ? " 😭" : "";
      return `<div class="team-block team-block-split">
        <span class="team-p1 ${winCls}">${crown}${players[0]}</span>
        <span class="team-amp">&</span>
        <span class="team-p2 ${winCls}">${players[1]}${p2Suffix}</span>
        <div class="team-score ${scoreCls}" data-final="${score}">0</div>
        ${rankHtml}
      </div>`;
    }
    const label = (players[0] || "") + (hasZeroEmoji ? " 😭" : "");
    return `<div class="team-block">
      <div class="team-name ${winCls}">${crown}${label}</div>
      <div class="team-score ${scoreCls}" data-final="${score}">0</div>
      ${rankHtml}
    </div>`;
  };

  // Enhancement 8: pre-compute pair-vs-pair H2H records
  const _pvpMap = {};
  allMatches.forEach((hm) => {
    const pa = (hm.teamA || []).slice().sort().join("&");
    const pb = (hm.teamB || []).slice().sort().join("&");
    if (!pa || !pb) return;
    const key = pa <= pb ? `${pa}|${pb}` : `${pb}|${pa}`;
    if (!_pvpMap[key]) _pvpMap[key] = { a: 0, b: 0, aFirst: pa <= pb };
    const aWonH = hm.scoreA > hm.scoreB;
    const paFirst = _pvpMap[key].aFirst;
    if (paFirst ? aWonH : !aWonH) _pvpMap[key].a++;
    else _pvpMap[key].b++;
  });

  return [...matches]
    .reverse()
    .map((m, index) => {
      const aWon = m.scoreA > m.scoreB;
      const diff = Math.abs(m.scoreA - m.scoreB);
      const isFire = isFireMatch(m);
      const isDominating = isDominatingMatch(m);
      const aZero = m.scoreA === 0,
        bZero = m.scoreB === 0;
      const isZero = isZeroMatch(m);

      const bWon = !aWon;
      const realIdx = allMatches.indexOf(m);

      // Event badges — Enhancement 7: title tooltips
      const badges = [];
      if (isFire)
        badges.push(`<span class="event-badge fire" title="Close match: margin of 1 game">🔥 FIRE MATCH</span>`);
      if (isDominating)
        badges.push(`<span class="event-badge dominate" title="Dominant performance: 4-1, 6-1, or 6-2">💀 DOMINATING</span>`);
      if (isZero)
        badges.push(`<span class="event-badge zero" title="One team scored 0 games">😂 ZERO SE HAAR GAYE!</span>`);

      const delay = Math.min(index * 0.1, 1); // Staggered delay up to 1s

      // Enhancement 8: pair-vs-pair H2H record badge
      const _pa8 = (m.teamA || []).slice().sort().join("&");
      const _pb8 = (m.teamB || []).slice().sort().join("&");
      const _pvpKey = _pa8 <= _pb8 ? `${_pa8}|${_pb8}` : `${_pb8}|${_pa8}`;
      const _pvp = _pvpMap[_pvpKey];
      let pvpHtml = "";
      if (_pvp && (_pvp.a + _pvp.b) >= 2) {
        const paFirst = _pa8 <= _pb8;
        const aW8 = paFirst ? _pvp.a : _pvp.b;
        const bW8 = paFirst ? _pvp.b : _pvp.a;
        const leader8 = aW8 > bW8 ? "RED" : bW8 > aW8 ? "BLUE" : null;
        pvpHtml = `<span class="match-h2h-badge" title="Head-to-head: these two pairs have played ${_pvp.a + _pvp.b} times">H2H ${aW8}–${bW8}${leader8 ? ` ${leader8} leads` : " TIED"}</span>`;
      }

      const noteHtml = m.note
        ? `<div class="match-note">📝 ${escHtml(m.note)}</div>`
        : "";
      return `
              <div class="match-card${isFire ? " fire-card" : ""}${isDominating ? " dominate-card" : ""}${isZero ? " zero-card" : ""}" style="animation-delay: ${delay}s;" data-match-idx="${realIdx}" data-margin="${diff}" data-match-month="${(m.date || "").slice(0, 7)}">
                <div class="match-card-inner">
                <div class="match-top">
                  <span class="match-date">📅 ${fmtDate(m.date)}</span>
                  <span class="match-tag">${diff} game${diff === 1 ? "" : "s"} gap</span>
                </div>
                <div class="match-score-row" style="margin-top:10px">
                  ${mkTeamBlock(m.teamA || [], aWon, m.scoreA, aZero && bWon, matchPairRankMap.get(m))}
                  <div class="vs-text">VS</div>
                  ${mkTeamBlock(m.teamB || [], bWon, m.scoreB, bZero && aWon, matchPairRankMap.get(m))}
                </div>
                ${(() => {
                  const ed = eloMatchMap.get(m) || {};
                  const aP = (m.teamA || [])
                    .map((p) => mkEloPill(p, ed))
                    .join("");
                  const bP = (m.teamB || [])
                    .map((p) => mkEloPill(p, ed))
                    .join("");
                  return `<div class="match-elo-row"><div class="match-elo-team">${aP}</div><div class="match-elo-vs-gap"></div><div class="match-elo-team">${bP}</div></div>`;
                })()}
                ${badges.length ? `<div class="match-event-strip">${badges.join("")}</div>` : ""}
                ${noteHtml}
                <div class="match-footer" style="margin-top:10px">
                  ${
                    showAdmin && window.isAdmin
                      ? `<div class="match-actions">
                    <button class="action-btn edit-btn" onclick="editMatchByIndex(${realIdx}, this)">✏ Edit</button>
                    <button class="action-btn delete-btn" onclick="deleteMatchByIndex(${realIdx})">🗑 Del</button>
                    <button class="action-btn rematch-btn" onclick="quickRematch(${realIdx})">⚡ Rematch</button>
                  </div>`
                      : ``
                  }
                </div>
                </div>
                ${window.isAdmin ? `<div class="swipe-delete-reveal" onclick="deleteMatchByIndex(${realIdx})">🗑<br><span>Delete</span></div>` : ""}
              </div>`;
    })
    .join("");
}


function filterMatchTab(f) {
  matchTabFilter = f;
  document
    .querySelectorAll("[data-mf]")
    .forEach((b) => b.classList.remove("on"));
  const active = document.querySelector(`[data-mf="${f}"]`);
  if (active) active.classList.add("on");
  const dr = document.getElementById("matchDr");
  if (dr) {
    dr.style.display = ""; // always clear inline override first
    if (f === "range") {
      dr.classList.add("show");
    } else {
      dr.classList.remove("show");
      const mf = document.getElementById("matchFrom");
      const mt = document.getElementById("matchTo");
      if (mf) mf.value = "";
      if (mt) mt.value = "";
    }
  }
  renderModernMatches();
}

// ── MATCH OF THE DAY + BIGGEST UPSET ──────────────────────
function getPlayerRankAtDate(playerName, beforeDate) {
  // Rank based on SR from all matches strictly before this date
  const prior = activeMatches().filter((m) => m.date < beforeDate);
  if (!prior.length) return null;
  const stats = computeStats(prior);
  const idx = stats.findIndex((p) => p.name === playerName);
  return idx === -1 ? null : idx + 1; // 1-based rank
}

function buildMatchOfTheDay() {
  if (!allMatches.length) return "";
  const latestDate = allMatches.reduce(
    (max, m) => (m.date > max ? m.date : max),
    "",
  );
  const sessionMatches = allMatches.filter((m) => m.date === latestDate);
  if (!sessionMatches.length) return "";

  // ── MATCH OF THE DAY: closest scoreline, then highest total ──
  const scored = sessionMatches.map((m) => ({
    m,
    diff: Math.abs(m.scoreA - m.scoreB),
    total: m.scoreA + m.scoreB,
  }));
  scored.sort((a, b) => a.diff - b.diff || b.total - a.total);
  const { m: motd } = scored[0];

  const aWon = motd.scoreA > motd.scoreB;
  const teamA = motd.teamA.join(" & ");
  const teamB = motd.teamB.join(" & ");
  const winner = aWon ? teamA : teamB;
  const loser = aWon ? teamB : teamA;
  const wScore = aWon ? motd.scoreA : motd.scoreB;
  const lScore = aWon ? motd.scoreB : motd.scoreA;
  const isThriller = Math.abs(motd.scoreA - motd.scoreB) <= 1;
  const motdLabel = isThriller ? "🎭 THRILLER" : "⚡ MATCH OF THE DAY";
  const motdSub = isThriller
    ? `Closest game of the session — decided by just ${Math.abs(motd.scoreA - motd.scoreB)} game${Math.abs(motd.scoreA - motd.scoreB) === 1 ? "" : "s"}!`
    : `Most dramatic result of the session`;

  const motdHtml = `<div class="motd-card">
              <div class="motd-header">
                <span class="motd-label">${motdLabel}</span>
                <span class="motd-date">📅 ${fmtDate(latestDate)}</span>
              </div>
              <div class="motd-teams">
                <div class="motd-team winner">
                  <div class="motd-name">👑 ${winner}</div>
                  <div class="motd-score win" data-final="${wScore}">0</div>
                </div>
                <div class="motd-vs">VS</div>
                <div class="motd-team">
                  <div class="motd-name">${loser}</div>
                  <div class="motd-score" data-final="${lScore}">0</div>
                </div>
              </div>
              <div class="motd-sub">${motdSub}</div>
            </div>`;

  // ── BIGGEST UPSET: lower-ELO pair beats higher-ELO pair ──
  let upsetHtml = "";
  // Chronological ELO walk — capture pre-match pair rank for each session match
  const _allPairsForUpset = getPairStats();
  const upsetMatchRankMap = new Map(); // match → Map(pairKey → pre-match rank)
  {
    const elo = {};
    [...allMatches]
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      .forEach((m) => {
        [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
          if (!(p in elo)) elo[p] = 1000;
        });
        if (sessionMatches.includes(m)) {
          upsetMatchRankMap.set(
            m,
            new Map(
              _allPairsForUpset
                .map((p) => ({
                  key: p.key,
                  avgElo:
                    p.players.reduce((s, n) => s + (elo[n] || 1000), 0) /
                    p.players.length,
                }))
                .sort((a, b) => b.avgElo - a.avgElo)
                .map(({ key }, i) => [key, i + 1]),
            ),
          );
        }
        const aWon = m.scoreA > m.scoreB;
        const avgA =
          m.teamA.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamA.length, 1);
        const avgB =
          m.teamB.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamB.length, 1);
        const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
        const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
        const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
        m.teamA.forEach((p) => {
          elo[p] = (elo[p] || 1000) + dA;
        });
        m.teamB.forEach((p) => {
          elo[p] = (elo[p] || 1000) + dB;
        });
      });
  }
  const getPairEloRank = (m, team) =>
    upsetMatchRankMap.get(m)?.get([...team].sort().join(" & ")) || "?";

  let bestUpset = null,
    bestGap = 0;
  sessionMatches.forEach((m) => {
    const winTeam = m.scoreA > m.scoreB ? m.teamA : m.teamB;
    const loseTeam = m.scoreA > m.scoreB ? m.teamB : m.teamA;
    const mRankMap = upsetMatchRankMap.get(m);
    if (!mRankMap) return;
    const winRank = mRankMap.get([...winTeam].sort().join(" & ")) || 999;
    const loseRank = mRankMap.get([...loseTeam].sort().join(" & ")) || 999;
    // Upset = winner had a worse (higher number) rank than loser
    const gap = winRank - loseRank;
    if (gap > 0 && gap > bestGap) {
      bestGap = gap;
      bestUpset = { m, winTeam, loseTeam };
    }
  });

  if (bestUpset) {
    const { m: um, winTeam, loseTeam } = bestUpset;
    const uWin = um.scoreA > um.scoreB ? um.scoreA : um.scoreB;
    const uLose = um.scoreA > um.scoreB ? um.scoreB : um.scoreA;
    const winEloRank = getPairEloRank(um, winTeam);
    const loseEloRank = getPairEloRank(um, loseTeam);
    upsetHtml = `<div class="motd-card upset-card">
                <div class="motd-header">
                  <span class="motd-label upset-label">🚨 BIGGEST UPSET</span>
                  <span class="motd-date">📅 ${fmtDate(latestDate)}</span>
                </div>
                <div class="motd-teams">
                  <div class="motd-team winner">
                    <div class="motd-name">👑 ${winTeam.join(" & ")}</div>
                    <div class="motd-score win" data-final="${uWin}">0</div>
                    <div class="upset-rank">ELO #${winEloRank}</div>
                  </div>
                  <div class="motd-vs">VS</div>
                  <div class="motd-team">
                    <div class="motd-name">${loseTeam.join(" & ")}</div>
                    <div class="motd-score" data-final="${uLose}">0</div>
                    <div class="upset-rank">ELO #${loseEloRank} favored</div>
                  </div>
                </div>
                <div class="motd-sub">Lower-ELO pair pulled off a shock win 😤</div>
              </div>`;
  }

  return motdHtml + upsetHtml;
}

function buildHistorySummary(matches, filter = "all") {
  if (matches.length < 3) return "";
  const stats = computeStats(matches, computeElo(matches));
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
  const top3 = stats.slice(0, Math.min(3, stats.length));
  const medals = ["🥇", "🥈", "🥉"];
  let delay = 60;
  const d = () => {
    const v = delay;
    delay += 65;
    return v;
  };
  const podiumHtml = top3
    .map(
      (p, i) =>
        `<div class="hsum-row hsum-cascade" style="animation-delay:${d()}ms">
            <span class="hsum-medal">${medals[i]}</span>
            <span class="hsum-pname">${p.name}</span>
            <span class="hsum-rec">${p.mw}W–${p.ml}L</span>
            <span class="hsum-pct" style="color:${_rankColor(i + 1, top3.length)}">${p.winPct.toFixed(0)}%</span>
            <span class="hsum-sr" style="color:${_rankColor(i+1,top3.length)}">${p.sr.toFixed(2)} SR</span>
          </div>`,
    )
    .join("");
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

  // Top ELO gainer within the filtered period
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
    const periodDates = matches.map((m) => m.date || "").filter(Boolean);
    const firstDate = periodDates.reduce((a, b) => (a < b ? a : b));
    const preElo = computeElo(
      activeMatches().filter((m) => (m.date || "") < firstDate),
    );
    const fullElo = _memoElo();
    const periodPlayers = new Set();
    matches.forEach((m) =>
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) =>
        periodPlayers.add(p),
      ),
    );
    const potwDeltas = [...periodPlayers]
      .map((p) => ({
        name: normPlayer(p),
        delta: Math.round((fullElo[p] || 1000) - (preElo[p] || 1000)),
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
          <div class="potw-name">${potw.name}</div>
          <div class="potw-meta"><span style="color:var(--green);font-weight:800">+${potw.delta} ELO</span> · ${potw.mp} ${potwLabel.sub}</div>
        </div>
      </div>`;
    }
  }

  // ELO changes across the entire filtered period
  let sessionRecapHtml = "";
  if (matches.length) {
    const periodDates = matches.map((m) => m.date || "1970-01-01");
    const firstDate = periodDates.reduce((a, b) => (a < b ? a : b));
    const eloAfter = _memoElo();
    const eloBefore = computeElo(
      activeMatches().filter((m) => (m.date || "1970-01-01") < firstDate),
    );
    const periodPlayers = new Set();
    matches.forEach((m) =>
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) =>
        periodPlayers.add(p),
      ),
    );
    const deltas = [...periodPlayers]
      .map((p) => ({
        name: normPlayer(p),
        delta: Math.round((eloAfter[p] || 1000) - (eloBefore[p] || 1000)),
        bElo: Math.round(eloBefore[p] || 1000),
        aElo: Math.round(eloAfter[p] || 1000),
      }))
      .sort((a, b) => b.delta - a.delta);
    const deltaRows = deltas
      .map((p) => {
        const sign = p.delta > 0 ? "+" : "";
        const chipCls =
          p.delta > 0 ? "sr-chip-g" : p.delta < 0 ? "sr-chip-l" : "sr-chip-z";
        const arrow = p.delta > 0 ? "▲" : p.delta < 0 ? "▼" : "·";
        return `<div class="elo-delta-row hsum-cascade" style="animation-delay:${d()}ms">
        <span class="elo-delta-name">${p.name}</span>
        <span style="display:flex;align-items:center;width:200px;flex-shrink:0;font-size:10px;font-weight:700;font-variant-numeric:tabular-nums">
          <span style="display:inline-block;width:36px;text-align:right;color:var(--muted)">${p.bElo}</span>
          <span class="elo-ba-sep" style="margin:0 4px;color:var(--muted)">→</span>
          <span class="elo-ba-a" style="display:inline-block;width:36px;text-align:left;color:var(--text)" data-from="${p.bElo}" data-to="${p.aElo}">${p.bElo}</span>
        </span>
        <span class="sr-chip ${chipCls}">${arrow} ${sign}${p.delta}</span>
      </div>`;
      })
      .join("");
    sessionRecapHtml = `
      <div class="hsum-section-lbl">ELO CHANGES</div>
      <div class="elo-delta-list">${deltaRows}</div>`;
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
          ${top3.length ? `<div class="hsum-section-lbl">Top Performers</div><div class="hsum-podium">${podiumHtml}</div>` : ""}
          ${highlights.length ? `<div class="hsum-section-lbl">AWARDS</div><div class="hsum-highlights">${highlights.join("")}</div>` : ""}
          ${hotColdHtml}
          ${sessionRecapHtml}
        </div>`;
}

function toggleMatchesSection() {
  const list = document.querySelector("#cmpMatches .smr-list") || document.querySelector("#cmpMatches .cmp-match-rows");
  const chevron = document.getElementById("cmpMatchesChevron");
  if (!list) return;
  list.classList.toggle("collapsed");
  chevron?.classList.toggle("collapsed");
}

function toggleMatchCalendar() {
  const cal = document.getElementById("match-calendar");
  const btn = document.getElementById("calToggleBtn");
  if (!cal) return;
  const open = cal.style.display === "none";
  cal.style.display = open ? "block" : "none";
  if (btn) btn.classList.toggle("cal-toggle-active", open);
  if (open) renderMatchCalendar();
}

function renderMatchCalendar() {
  const cal = document.getElementById("match-calendar");
  if (!cal) return;

  const _amCal = activeMatches();
  const matchDates = new Set(_amCal.map((m) => m.date).filter(Boolean));
  const matchCountByDate = {};
  _amCal.forEach((m) => {
    if (m.date) matchCountByDate[m.date] = (matchCountByDate[m.date] || 0) + 1;
  });

  const todayStr = todayISO();
  const year = calYear,
    month = calMonth;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
  const totalDays = lastDay.getDate();
  const monthName = firstDay.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  let _calMaxCount = 1;
  for (let d = 1; d <= totalDays; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const c = matchCountByDate[iso] || 0;
    if (c > _calMaxCount) _calMaxCount = c;
  }
  let cells = "";
  // Empty cells before first day
  for (let i = 0; i < startDow; i++)
    cells += `<div class="cal-cell cal-empty"></div>`;
  for (let d = 1; d <= totalDays; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const count = matchCountByDate[iso] || 0;
    const isToday = iso === todayStr;
    const hasMatch = count > 0;
    const heatOpacity = hasMatch ? (0.15 + (count / _calMaxCount) * 0.55).toFixed(2) : "0";
    const heatStyle = hasMatch ? ` style="background:rgba(var(--theme-rgb),${heatOpacity})"` : "";
    cells += `<div class="cal-cell${isToday ? " cal-today" : ""}${hasMatch ? " cal-has-match" : ""}"${heatStyle} onclick="calDayClick('${iso}')">
      <span class="cal-day-num">${d}</span>
      ${hasMatch ? `<span class="cal-heat-count">${count}</span>` : ""}
    </div>`;
  }

  cal.innerHTML = `
    <div class="cal-header">
      <button class="cal-nav" onclick="calNav(-1)">‹</button>
      <span class="cal-month-lbl">${monthName}</span>
      <button class="cal-nav" onclick="calNav(1)">›</button>
    </div>
    <div class="cal-dow-row">
      ${["M", "T", "W", "T", "F", "S", "S"].map((d) => `<div class="cal-dow">${d}</div>`).join("")}
    </div>
    <div class="cal-grid">${cells}</div>`;
}

function calNav(dir) {
  calMonth += dir;
  if (calMonth > 11) {
    calMonth = 0;
    calYear++;
  }
  if (calMonth < 0) {
    calMonth = 11;
    calYear--;
  }
  renderMatchCalendar();
}

function calDayClick(iso) {
  // Highlight selected day
  document
    .querySelectorAll(".cal-cell.cal-selected")
    .forEach((el) => el.classList.remove("cal-selected"));
  document.querySelectorAll(".cal-cell").forEach((el) => {
    const d = parseInt(iso.slice(8));
    const y = parseInt(iso.slice(0, 4));
    const mo = parseInt(iso.slice(5, 7)) - 1;
    if (
      y === calYear &&
      mo === calMonth &&
      el.querySelector(".cal-day-num")?.textContent === String(d)
    )
      el.classList.add("cal-selected");
  });
  // Set state before navigating so switchMainTab picks it up
  matchTabFilter = "range";
  const mf = document.getElementById("matchFrom");
  const mt = document.getElementById("matchTo");
  if (mf) mf.value = iso;
  if (mt) mt.value = iso;
  const dr = document.getElementById("matchDr");
  if (dr) {
    dr.style.display = "";
    dr.classList.add("show");
  }
  // Navigate — switchMainTab calls renderModernMatches() which reads the state above
  switchMainTab("history");
}

function renderModernMatches() {
  const query = (
    document.getElementById("modern-match-search")?.value || ""
  ).toLowerCase();
  const mfrom =
    matchTabFilter === "range"
      ? document.getElementById("matchFrom")?.value || null
      : null;
  const mto =
    matchTabFilter === "range"
      ? document.getElementById("matchTo")?.value || null
      : null;
  let matches = filterMatches(matchTabFilter, mfrom, mto);
  if (query) {
    const q = query.toLowerCase();
    matches = matches.filter((m) => {
      const players = [...(m.teamA || []), ...(m.teamB || [])].map((p) =>
        (nameMap[p] || p).toLowerCase(),
      );
      if (players.some((p) => p.includes(q))) return true;
      if (
        `${m.scoreA}-${m.scoreB}`.includes(q) ||
        `${m.scoreB}-${m.scoreA}`.includes(q)
      )
        return true;
      if ((m.date || "").includes(q)) return true;
      if ((m.note || "").toLowerCase().includes(q)) return true;
      return false;
    });
  }
  // Player filter
  if (histPlayerFilter) {
    matches = matches.filter((m) =>
      [...m.teamA, ...m.teamB].some(
        (p) =>
          (nameMap[p] || p).toLowerCase() === histPlayerFilter.toLowerCase(),
      ),
    );
  }
  // Outcome filter (requires a player to be selected)
  if (histOutcomeFilter !== "all" && histPlayerFilter) {
    matches = matches.filter((m) => {
      const inA = m.teamA.some(
        (p) =>
          (nameMap[p] || p).toLowerCase() === histPlayerFilter.toLowerCase(),
      );
      const aWon = m.scoreA > m.scoreB;
      const playerWon = inA ? aWon : !aWon;
      return histOutcomeFilter === "win" ? playerWon : !playerWon;
    });
  }
  if (histPairFilter) {
    matches = matches.filter((m) => pairInMatch(m, histPairFilter));
  }
  if (h2hFilterA && h2hFilterB) {
    matches = matches.filter((m) => playersOpposed(m, h2hFilterA, h2hFilterB));
  }
  if (histScorelineFilter) {
    matches = matches.filter((m) => {
      if (histScorelineFilter === "zero") return isZeroMatch(m);
      return normalizedScoreline(m) === histScorelineFilter;
    });
  }
  // Margin filter
  if (histMarginFilter !== "all") {
    matches = matches.filter((m) => {
      if (histMarginFilter === "close") return isFireMatch(m);
      if (histMarginFilter === "dominating") return isDominatingMatch(m);
      if (histMarginFilter === "zero") return isZeroMatch(m);
      return true;
    });
  }
  let summary = "";
  if (h2hFilterA && h2hFilterB) {
    const h2h = getHeadToHeadStats(h2hFilterA, h2hFilterB, activeMatches());
    const total = h2h.aWins + h2h.bWins || 1;
    const aWinPct = Math.round((h2h.aWins / total) * 100);
    const bWinPct = 100 - aWinPct;
    const aCol =
      aWinPct > bWinPct
        ? "var(--green)"
        : aWinPct < bWinPct
          ? "var(--red)"
          : "var(--text)";
    const bCol =
      bWinPct > aWinPct
        ? "var(--green)"
        : bWinPct < aWinPct
          ? "var(--red)"
          : "var(--text)";
    const diffStr = h2h.diff >= 0 ? `+${h2h.diff}` : `${h2h.diff}`;
    const h2hEloHist = _memoEloHistory();
    const h2hP1Pts = (h2hEloHist[h2hFilterA] || []).filter((pt) =>
      pt.opponent.split(" & ").includes(h2hFilterB),
    );
    const h2hP2Pts = (h2hEloHist[h2hFilterB] || []).filter((pt) =>
      pt.opponent.split(" & ").includes(h2hFilterA),
    );
    const h2hP1Impact = h2hP1Pts.reduce((s, pt) => s + pt.delta, 0);
    const h2hP2Impact = h2hP2Pts.reduce((s, pt) => s + pt.delta, 0);
    const fmtEloImpact = (n) =>
      n > 0
        ? `<span style="color:var(--green)">+${n}</span>`
        : n < 0
          ? `<span style="color:var(--red)">${n}</span>`
          : `<span style="color:var(--muted)">0</span>`;
    summary = `<div class="pair-stats-card" style="margin-bottom:10px" onclick="openH2HDetail(${jsArg(h2hFilterA)},${jsArg(h2hFilterB)})">
            <div class="psc-header"><span class="psc-badge">⚔️ Head-to-Head</span><span class="psc-tap">Full stats →</span></div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <div style="font-size:15px;font-weight:900;color:var(--text);text-transform:uppercase">${escHtml(h2hFilterA)}</div>
              <div style="font-size:11px;font-weight:800;color:var(--muted)">VS</div>
              <div style="font-size:15px;font-weight:900;color:var(--text);text-align:right;text-transform:uppercase">${escHtml(h2hFilterB)}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
              <div style="font-size:26px;font-weight:900;color:${aCol};min-width:32px">${h2h.aWins}</div>
              <div style="flex:1;height:6px;border-radius:4px;background:rgba(255,255,255,0.06);overflow:hidden;display:flex">
                <div style="width:${aWinPct}%;background:${aCol};transition:width 0.5s"></div>
              </div>
              <div style="font-size:26px;font-weight:900;color:${bCol};min-width:32px;text-align:right">${h2h.bWins}</div>
            </div>
            <div class="psc-stats">
              <div class="psc-stat"><div class="psc-sv">${total}</div><div class="psc-sl">Played</div></div>
              <div class="psc-divider"></div>
              <div class="psc-stat"><div class="psc-sv" style="color:${aCol}">${aWinPct}%</div><div class="psc-sl">${escHtml(h2hFilterA.split(" ")[0])} Win%</div></div>
              <div class="psc-divider"></div>
              <div class="psc-stat"><div class="psc-sv ${h2h.diff >= 0 ? "p" : "n"}">${diffStr}</div><div class="psc-sl">Game Diff</div></div>
              <div class="psc-divider"></div>
              <div class="psc-stat"><div class="psc-sv" style="color:${bCol}">${bWinPct}%</div><div class="psc-sl">${escHtml(h2hFilterB.split(" ")[0])} Win%</div></div>
            </div>
            <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08)" onclick="event.stopPropagation()">
              <div style="font-size:9px;font-weight:800;letter-spacing:0.1em;color:var(--muted);margin-bottom:6px">ELO IMPACT FROM THIS RIVALRY</div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                  <div style="font-size:16px;font-weight:900">${fmtEloImpact(h2hP1Impact)}</div>
                  <div style="font-size:9px;color:var(--muted)">${escHtml(h2hFilterA.toUpperCase())}</div>
                </div>
                <div style="font-size:9px;color:var(--muted)">ELO GAINED / LOST</div>
                <div style="text-align:right">
                  <div style="font-size:16px;font-weight:900">${fmtEloImpact(h2hP2Impact)}</div>
                  <div style="font-size:9px;color:var(--muted)">${escHtml(h2hFilterB.toUpperCase())}</div>
                </div>
              </div>
            </div>
          </div>`;
  }
  if (histPairFilter) {
    const pairMatches = activeMatches().filter((m) =>
      pairInMatch(m, histPairFilter),
    );
    if (pairMatches.length) {
      let pw = 0,
        pgw = 0,
        pgl = 0;
      pairMatches.forEach((m) => {
        const isPair = getPairKey(m.teamA) === histPairFilter;
        const ps = isPair ? m.scoreA : m.scoreB;
        const os = isPair ? m.scoreB : m.scoreA;
        pgw += ps;
        pgl += os;
        if (ps > os) pw++;
      });
      const pp = pairMatches.length,
        pl = pp - pw;
      const wpct = Math.round((pw / pp) * 100);
      const diff = pgw - pgl;
      const diffStr = diff >= 0 ? `+${diff}` : `${diff}`;
      const col =
        wpct >= 60 ? "var(--green)" : wpct <= 40 ? "var(--red)" : "var(--text)";
      const gpct = Math.round((pgw / (pgw + pgl || 1)) * 100);
      summary =
        `<div class="pair-stats-card" onclick="openPairDetail(${jsArg(histPairFilter)})">
              <div class="psc-header">
                <span class="psc-badge">🤝 Pair Stats</span>
                <span class="psc-tap">Full stats →</span>
              </div>
              <div class="psc-hero">
                <div class="psc-name">${escHtml(histPairFilter)}</div>
                <div class="psc-winrate" style="color:${col}">${wpct}%</div>
              </div>
              <div class="psc-bar-wrap"><div class="psc-bar" style="width:${wpct}%;background:${col}"></div></div>
              <div class="psc-stats">
                <div class="psc-stat"><div class="psc-sv">${pp}</div><div class="psc-sl">Played</div></div>
                <div class="psc-divider"></div>
                <div class="psc-stat"><div class="psc-sv p">${pw}</div><div class="psc-sl">Wins</div></div>
                <div class="psc-divider"></div>
                <div class="psc-stat"><div class="psc-sv n">${pl}</div><div class="psc-sl">Losses</div></div>
                <div class="psc-divider"></div>
                <div class="psc-stat"><div class="psc-sv ${diff >= 0 ? "p" : "n"}">${diffStr}</div><div class="psc-sl">Diff</div></div>
                <div class="psc-divider"></div>
                <div class="psc-stat"><div class="psc-sv">${pgw}–${pgl}</div><div class="psc-sl">Games</div></div>
                <div class="psc-divider"></div>
                <div class="psc-stat"><div class="psc-sv">${gpct}%</div><div class="psc-sl">Game %</div></div>
              </div>
            </div>` + summary;
    }
  }
  const isFiltered =
    matchTabFilter !== "today" ||
    histPlayerFilter ||
    histPairFilter ||
    histOutcomeFilter !== "all" ||
    histMarginFilter !== "all" ||
    histScorelineFilter ||
    h2hFilterA ||
    h2hFilterB;
  const motdHtml = isFiltered ? "" : buildMatchOfTheDay();
  const histList = document.getElementById("modern-match-list");
  histList.innerHTML = "";

  // Parse all content into a temp container
  const tmpAll = document.createElement("div");
  tmpAll.innerHTML = motdHtml + summary + buildMatchCards(matches, true);

  // Collect feature cards first, then match cards
  const featureCards = Array.from(
    tmpAll.querySelectorAll(
      ".motd-card, .upset-card, .thriller-card, .pair-stats-card",
    ),
  );
  const matchCards = Array.from(tmpAll.querySelectorAll(".match-card"));
  const emptyEl = tmpAll.querySelector(".empty");

  // Build a flat cascade: feature cards + first 10 match cards animated, rest instant
  const allAnimated = [...featureCards, ...matchCards.slice(0, 10)];
  const instant = matchCards.slice(10);

  const _noCascade = document.body.classList.contains("no-cascade");
  allAnimated.forEach((el, i) => {
    el.style.opacity = "0";
    el.style.animation = "none";
    setTimeout(() => {
      el.style.animation = "";
      el.style.opacity = "";
      if (!_noCascade) el.classList.add("card-anim");
      histList.appendChild(el);
      el.querySelectorAll(
        ".team-score[data-final], .motd-score[data-final]",
      ).forEach((scoreEl) => {
        const final = parseInt(scoreEl.dataset.final, 10);
        if (!isNaN(final) && final > 0) {
          let cur = 0;
          scoreEl.textContent = "0";
          const tick = () => {
            cur = Math.min(cur + 1, final);
            scoreEl.textContent = cur;
            if (cur < final) setTimeout(tick, 140);
          };
          setTimeout(tick, 80);
        } else {
          scoreEl.textContent = scoreEl.dataset.final || "0";
        }
      });
    }, _noCascade ? 0 : i * 100);
  });

  if (instant.length) {
    setTimeout(() => {
      instant.forEach((el) => {
        el.querySelectorAll(
          ".team-score[data-final], .motd-score[data-final]",
        ).forEach((scoreEl) => {
          scoreEl.textContent = scoreEl.dataset.final || "0";
        });
        el.style.animation = "none";
        el.style.opacity = "1";
        el.style.transform = "none";
        histList.appendChild(el);
      });
    }, allAnimated.length * 100);
  }

  if (!allAnimated.length && !instant.length && emptyEl) {
    histList.appendChild(emptyEl);
  }
  populateHistoryPlayerChips();
  populateHistoryAdvancedFilters();
  _updateHistFilterBadge();
}

function _updateHistFilterBadge() {
  const badge = document.getElementById("hist-filter-badge");
  const clearBtn = document.getElementById("hist-filter-clear");
  if (!badge || !clearBtn) return;
  let count = 0;
  if (matchTabFilter !== "today") count++;
  if (histPlayerFilter) count++;
  if (histOutcomeFilter !== "all") count++;
  if (histMarginFilter !== "all") count++;
  if (histPairFilter) count++;
  if (h2hFilterA || h2hFilterB) count++;
  if (histScorelineFilter) count++;
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = "inline-flex";
    clearBtn.style.display = "inline-flex";
  } else {
    badge.style.display = "none";
    clearBtn.style.display = "none";
  }
}

// Jump-to-date: scroll history list to a date group
function histJumpToDate(dateStr) {
  if (!dateStr) return;
  // Make sure history tab is showing all-time or a range that includes the date
  filterMatchTab("range");
  const fromEl = document.getElementById("matchFrom");
  const toEl = document.getElementById("matchTo");
  if (fromEl) fromEl.value = dateStr;
  if (toEl) toEl.value = dateStr;
  renderModernMatches();
  // Scroll to the date group after render
  requestAnimationFrame(() => {
    const groups = document.querySelectorAll(".match-date-group");
    const target = [...groups].find((g) => g.dataset.date === dateStr || g.querySelector(`[data-date="${dateStr}"]`));
    const firstCard = document.querySelector(`.match-card[data-date="${dateStr}"]`);
    const scrollTarget = target || firstCard;
    if (scrollTarget) scrollTarget.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// Long-press match card → quick-action sheet (Share, Edit, Delete)
let _lpTimer = null, _lpCard = null;
document.addEventListener("pointerdown", (e) => {
  const card = e.target.closest(".match-card");
  if (!card || e.target.closest("button, .swipe-delete-reveal")) return;
  _lpCard = card;
  _lpTimer = setTimeout(() => {
    const idx2 = parseInt(card.dataset.matchIdx, 10);
    if (!isNaN(idx2)) _openMatchQuickActions(idx2, card);
  }, 600);
});
document.addEventListener("pointerup", () => { clearTimeout(_lpTimer); _lpCard = null; });
document.addEventListener("pointermove", (e) => {
  if (_lpCard) { clearTimeout(_lpTimer); _lpCard = null; }
});

function _openMatchQuickActions(idx2, cardEl) {
  document.getElementById("match-quick-sheet")?.remove();
  const m = allMatches[idx2];
  if (!m) return;
  const sheet = document.createElement("div");
  sheet.id = "match-quick-sheet";
  sheet.className = "match-quick-sheet";
  sheet.innerHTML = `
    <div class="mqs-backdrop" onclick="document.getElementById('match-quick-sheet').remove()"></div>
    <div class="mqs-panel">
      <div class="mqs-title">${m.teamA.join(" & ")} vs ${m.teamB.join(" & ")} · ${m.scoreA}–${m.scoreB}</div>
      <button class="mqs-btn" onclick="openMatchIntro(${idx2});document.getElementById('match-quick-sheet').remove()">👁 View Details</button>
      ${window.isAdmin ? `<button class="mqs-btn" onclick="openEditMatch(${idx2});document.getElementById('match-quick-sheet').remove()">✏️ Edit Match</button>` : ""}
      ${window.isAdmin ? `<button class="mqs-btn mqs-btn-danger" onclick="deleteModernMatch(${idx2});document.getElementById('match-quick-sheet').remove()">🗑 Delete Match</button>` : ""}
      <button class="mqs-btn mqs-btn-cancel" onclick="document.getElementById('match-quick-sheet').remove()">Cancel</button>
    </div>`;
  document.body.appendChild(sheet);
  requestAnimationFrame(() => sheet.querySelector(".mqs-panel").classList.add("open"));
}

function clearAllHistFilters() {
  histPlayerFilter = "";
  histOutcomeFilter = "all";
  histMarginFilter = "all";
  histPairFilter = "";
  h2hFilterA = "";
  h2hFilterB = "";
  histScorelineFilter = "";
  const hdf = document.getElementById("histDateFilter");
  if (hdf) hdf.value = "today";
  const hrf = document.getElementById("histResultFilter");
  if (hrf) hrf.value = "all";
  const htf = document.getElementById("histTagFilter");
  if (htf) htf.value = "all";
  _updateFilterBtnDisplay();
  _updateH2HSlotDisplay();
  populateHistoryPlayerChips();
  filterMatchTab("today"); // also clears date range inputs and hides matchDr
}

function populateHistoryPlayerChips() {
  _updateFilterBtnDisplay();
}

function populateHistoryAdvancedFilters() {
  _updateFilterBtnDisplay();
  const data = document.getElementById("player-suggestions");
  if (data) {
    data.innerHTML = getAllPlayerNamesFromMatches()
      .map((player) => `<option value="${escHtml(player)}">`)
      .join("");
  }
}

function setHistPlayerFilter(name) {
  histPlayerFilter = name;
  if (name) {
    h2hFilterA = "";
    h2hFilterB = "";
    _updateH2HSlotDisplay();
  } else {
    histOutcomeFilter = "all";
    refreshOutcomeButtons();
  }
  _updateFilterBtnDisplay();
  populateHistoryPlayerChips();
  renderModernMatches();
}

function setHistOutcome(val) {
  histOutcomeFilter = val;
  refreshOutcomeButtons();
  renderModernMatches();
}

function setHistMargin(val) {
  histMarginFilter = val;
  document
    .querySelectorAll("[data-margin]")
    .forEach((b) => b.classList.remove("on"));
  document.querySelector(`[data-margin="${val}"]`)?.classList.add("on");
  renderModernMatches();
}

// ── PAIR SHEET SEARCH ──────────────────────────────────────
function filterSheetSearch(query) {
  const list = document.getElementById("filter-sheet-list");
  if (!list) return;
  const pairs = getPairStats();
  const q = (query || "").toLowerCase().trim();
  const filtered = q ? pairs.filter((p) => p.key.toLowerCase().includes(q)) : pairs;
  list.innerHTML = [
    !q ? `<button class="live-sheet-item${!histPairFilter ? " live-sheet-item-selected" : ""}" onclick="selectFilterItem('')">
      <span class="live-sheet-item-name">ALL PAIRS</span>
      ${!histPairFilter ? '<span class="live-sheet-check">✓</span>' : ""}
    </button>` : "",
    ...filtered.map((p) => {
      const cur = p.key === histPairFilter;
      return `<button class="live-sheet-item${cur ? " live-sheet-item-selected" : ""}" onclick="selectFilterItem(${jsArg(p.key)})">
        <span class="live-sheet-item-name">${escHtml(p.key)}</span>
        <span style="font-size:10px;color:var(--muted);margin-left:auto">${p.wins}W–${p.losses}L</span>
        ${cur ? '<span class="live-sheet-check">✓</span>' : ""}
      </button>`;
    }),
  ].join("");
}

function setHistPairFilter(val) {
  histPairFilter = val;
  if (val) {
    h2hFilterA = "";
    h2hFilterB = "";
    _updateH2HSlotDisplay();
  }
  _updateFilterBtnDisplay();
  renderModernMatches();
}

function setHistScorelineFilter(val) {
  histScorelineFilter = val;
  renderModernMatches();
}

function _updateFilterBtnDisplay() {
  const playerBtn = document.getElementById("hist-player-btn");
  if (playerBtn) {
    document.getElementById("hist-player-label").textContent = histPlayerFilter
      ? histPlayerFilter.toUpperCase()
      : "ALL PLAYERS";
    playerBtn.classList.toggle("filter-fab-active", !!histPlayerFilter);
  }
  const pairBtn = document.getElementById("hist-pair-btn");
  if (pairBtn) {
    document.getElementById("hist-pair-label").textContent = histPairFilter ? histPairFilter.toUpperCase() : "ALL PAIRS";
    pairBtn.classList.toggle("filter-fab-active", !!histPairFilter);
  }
}

function openFilterSheet(mode) {
  _filterSheetMode = mode;
  const overlay = document.getElementById("filter-sheet-overlay");
  const sheet = document.getElementById("filter-sheet");
  const list = document.getElementById("filter-sheet-list");
  const title = document.getElementById("filter-sheet-title");
  if (!overlay || !sheet || !list) return;
  if (mode === "player") {
    if (title) title.textContent = "SELECT PLAYER";
    const sw = document.getElementById("filter-sheet-search-wrap");
    if (sw) sw.style.display = "none";
    const names = new Set();
    activeMatches().forEach((m) =>
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) =>
        names.add(nameMap[p] || p),
      ),
    );
    const sorted = sortPlayersGuestsLast([...names]);
    list.innerHTML = [
      `<button class="live-sheet-item${!histPlayerFilter ? " live-sheet-item-selected" : ""}" onclick="selectFilterItem('')">
        <span class="live-sheet-item-name">ALL PLAYERS</span>
        ${!histPlayerFilter ? '<span class="live-sheet-check">✓</span>' : ""}
      </button>`,
      ...sorted.map((p) => {
        const cur = p === histPlayerFilter;
        return `<button class="live-sheet-item${cur ? " live-sheet-item-selected" : ""}" onclick="selectFilterItem(${jsArg(p)})">
          ${sheetAv(p)}
          <span class="live-sheet-item-name">${escHtml(p)}</span>
          ${cur ? '<span class="live-sheet-check">✓</span>' : ""}
        </button>`;
      }),
    ].join("");
  } else if (mode === "pair") {
    if (title) title.textContent = "SELECT PAIR";
    const searchWrap = document.getElementById("filter-sheet-search-wrap");
    const searchInput = document.getElementById("filter-sheet-search");
    if (searchWrap) searchWrap.style.display = "block";
    if (searchInput) searchInput.value = "";
    filterSheetSearch("");
    setTimeout(() => searchInput?.focus(), 280);
  }
  overlay.classList.add("live-sheet-open");
  sheet.classList.add("live-sheet-open");
}

function closeFilterSheet() {
  document.getElementById("filter-sheet-overlay")?.classList.remove("live-sheet-open");
  document.getElementById("filter-sheet")?.classList.remove("live-sheet-open");
  const searchWrap = document.getElementById("filter-sheet-search-wrap");
  const searchInput = document.getElementById("filter-sheet-search");
  if (searchWrap) searchWrap.style.display = "none";
  if (searchInput) searchInput.value = "";
  _filterSheetMode = null;
}

function _filterDateHint(v) {
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmt = (iso) => { const [,m,d] = iso.split("-"); return `${parseInt(d)} ${MONTHS[parseInt(m)-1]}`; };
  const today = todayISO();
  if (v === "week") return `${fmt(weekISO())} – ${fmt(today)}`;
  if (v === "lastweek") { const {from,to} = lastWeekRange(); return `${fmt(from)} – ${fmt(to)}`; }
  if (v === "month") return `${fmt(monthISO())} – ${fmt(today)}`;
  if (v === "today") return fmt(today);
  if (v === "day") return cmpFrom ? `Selected: ${fmt(cmpFrom)}` : "Tap to pick a day";
  if (v === "range") return cmpFrom && cmpTo ? `${fmt(cmpFrom)} – ${fmt(cmpTo)}` : "Tap to set a range";
  return "";
}

const _CMP_DATE_OPTIONS = [
  { v: "all", l: "ALL TIME", icon: "⏱" },
  { v: "today", l: "TODAY", icon: "📅" },
  { v: "week", l: "THIS WEEK", icon: "📆" },
  { v: "lastweek", l: "LAST WEEK", icon: "⬅️" },
  { v: "weekend", l: "WEEKEND", icon: "🏖" },
  { v: "month", l: "THIS MONTH", icon: "🗓" },
  { v: "day", l: "PICK A DAY", icon: "🔍" },
  { v: "range", l: "DATE RANGE", icon: "📊" },
];

const _HOME_DATE_OPTIONS = [
  { v: "all",      l: "ALL TIME",   icon: "⏱" },
  { v: "today",    l: "TODAY",      icon: "📅" },
  { v: "week",     l: "THIS WEEK",  icon: "📆" },
  { v: "lastweek", l: "LAST WEEK",  icon: "⬅️" },
  { v: "weekend",  l: "WEEKEND",    icon: "🏖" },
  { v: "month",    l: "THIS MONTH", icon: "🗓" },
  { v: "range",    l: "DATE RANGE", icon: "📏" },
];
const _HOME_LBL_MAP = { all: "ALL TIME", today: "TODAY", week: "THIS WEEK", lastweek: "LAST WEEK", weekend: "WEEKEND", month: "THIS MONTH", range: "DATE RANGE" };

function _syncHomeFilterLabel() {
  const lbl = document.getElementById("homeFilterLabel");
  if (lbl) lbl.textContent = _HOME_LBL_MAP[homeFilter] || homeFilter.toUpperCase();
}

function openHomeFilterSheet() {
  _filterSheetMode = "homedate";
  const title = document.getElementById("filter-sheet-title");
  if (title) title.textContent = "DATE FILTER";
  const list = document.getElementById("filter-sheet-list");
  if (!list) return;
  list.innerHTML = _HOME_DATE_OPTIONS
    .map((o) => {
      const hint = _filterDateHint(o.v);
      return `<div class="live-sheet-item${homeFilter === o.v ? " live-sheet-item-selected" : ""}" onclick="selectFilterItem('${o.v}')">
        <span style="font-size:20px;width:28px;text-align:center;flex-shrink:0">${o.icon}</span>
        <span style="display:flex;flex-direction:column;gap:1px">
          <span>${o.l}</span>
          ${hint ? `<span style="font-size:9px;font-weight:500;color:var(--muted);letter-spacing:0.02em">${hint}</span>` : ""}
        </span>
        ${homeFilter === o.v ? '<span class="live-sheet-check">✓<\/span>' : ""}
      </div>`;
    })
    .join("");
  document.getElementById("filter-sheet-overlay")?.classList.add("live-sheet-open");
  document.getElementById("filter-sheet")?.classList.add("live-sheet-open");
}

function openCmpDateSheet() {
  _filterSheetMode = "cmpdate";
  const title = document.getElementById("filter-sheet-title");
  if (title) title.textContent = "DATE FILTER";
  const list = document.getElementById("filter-sheet-list");
  if (!list) return;
  list.innerHTML = _CMP_DATE_OPTIONS
    .map((o) => {
      const hint = _filterDateHint(o.v);
      return `<div class="live-sheet-item${cmpFilter === o.v ? " live-sheet-item-selected" : ""}" onclick="selectFilterItem('${o.v}')">
        <span style="font-size:20px;width:28px;text-align:center;flex-shrink:0">${o.icon}</span>
        <span style="display:flex;flex-direction:column;gap:1px">
          <span>${o.l}</span>
          ${hint ? `<span style="font-size:9px;font-weight:500;color:var(--muted);letter-spacing:0.02em">${hint}</span>` : ""}
        </span>
        ${cmpFilter === o.v ? '<span class="live-sheet-check">✓</span>' : ""}
      </div>`;
    })
    .join("");
  document
    .getElementById("filter-sheet-overlay")
    ?.classList.add("live-sheet-open");
  document.getElementById("filter-sheet")?.classList.add("live-sheet-open");
}

function selectFilterItem(value) {
  const mode = _filterSheetMode;
  closeFilterSheet();
  if (mode === "homedate") {
    homeFilter = value;
    const sel = document.getElementById("homeFilterSel");
    if (sel) sel.value = value;
    const dr = document.getElementById("homeDrRow");
    if (dr) dr.classList.toggle("show", value === "range");
    _syncHomeFilterLabel();
    if (value !== "range") { homeFrom = null; homeTo = null; renderHome(); }
    return;
  }
  if (mode === "cmpdate") {
    const sel = document.getElementById("cmpSel");
    if (sel) sel.value = value;
    cmpFilter = value;
    const dr = document.getElementById("cmpDr");
    const dp = document.getElementById("cmpDayPicker");
    if (value === "range") {
      if (dr) dr.classList.add("show");
      if (dp) dp.classList.remove("show");
    } else if (value === "day") {
      if (dr) dr.classList.remove("show");
      if (dp) dp.classList.add("show");
      if (!cmpFrom) cmpFrom = todayISO();
      cmpTo = null;
      const di = document.getElementById("cmpDayInput");
      if (di && !di.value) di.value = cmpFrom;
    } else {
      if (dr) dr.classList.remove("show");
      if (dp) dp.classList.remove("show");
      cmpFrom = null;
      cmpTo = null;
    }
    renderCompact();
    return;
  }
  if (mode === "player") setHistPlayerFilter(value);
  else if (mode === "pair") setHistPairFilter(value);
  else if (mode === "digestplayer") renderDigestCard(undefined, value);
  else if (mode === "whatifplayer") {
    renderWhatIfSection(value);
    const btn = document.getElementById("whatif-player-fab");
    if (btn) {
      btn.querySelector(".whatif-fab-label").textContent =
        value || "SELECT PLAYER";
      btn.classList.toggle("filter-fab-active", !!value);
    }
  } else if (mode === "eloTLOverlay") {
    _eloTLSetOverlay(value);
  } else if (mode === "eloprobp1") {
    _eloProbP1 = value;
    _updateEloProbSlots();
  } else if (mode === "eloprobp2") {
    _eloProbP2 = value;
    _updateEloProbSlots();
  } else if (mode === "cmpplayerA") {
    _cmpPlayerA = value;
    _updateCmpSlots();
  } else if (mode === "cmpplayerB") {
    _cmpPlayerB = value;
    _updateCmpSlots();
  } else if (mode && mode.startsWith("sim_")) {
    const slot = mode.split("_")[1];
    if (slot === "a1") _simA1 = value;
    else if (slot === "a2") _simA2 = value;
    else if (slot === "b1") _simB1 = value;
    else if (slot === "b2") _simB2 = value;
    _simUpdateSlots();
  } else if (mode && mode.startsWith("predict_")) {
    const slot = mode.split("_")[1];
    if (slot === "a1") _predictPlayerA = value;
    else if (slot === "a2") _predictPartnerA = value;
    else if (slot === "b1") _predictPlayerB = value;
    else if (slot === "b2") _predictPartnerB = value;
    const el = document.getElementById(`pred-label-${slot}`);
    const btn = document.getElementById(`pred-slot-${slot}`);
    if (el) el.textContent = value || "—";
    if (btn) btn.classList.toggle("h2h-slot-filled", !!value);
  }
}

function _updateCmpSlots() {
  const aBtn = document.getElementById("cmpSlotA");
  const bBtn = document.getElementById("cmpSlotB");
  if (aBtn) {
    document.getElementById("cmpLabelA").textContent = _cmpPlayerA || "P1";
    aBtn.classList.toggle("h2h-slot-filled", !!_cmpPlayerA);
  }
  if (bBtn) {
    document.getElementById("cmpLabelB").textContent = _cmpPlayerB || "P2";
    bBtn.classList.toggle("h2h-slot-filled", !!_cmpPlayerB);
  }
}

function _updateH2HSlotDisplay() {
  const aBtn = document.getElementById("h2h-slot-a");
  const bBtn = document.getElementById("h2h-slot-b");
  const clearBtn = document.getElementById("h2h-slot-clear");
  if (!aBtn) return;
  document.getElementById("h2h-slot-a-label").textContent = h2hFilterA || "P1";
  document.getElementById("h2h-slot-b-label").textContent = h2hFilterB || "P2";
  aBtn.classList.toggle("h2h-slot-filled", !!h2hFilterA);
  bBtn.classList.toggle("h2h-slot-filled", !!h2hFilterB);
  if (clearBtn)
    clearBtn.style.display = h2hFilterA || h2hFilterB ? "flex" : "none";
}

function openH2HSheet(slot) {
  _h2hActiveSlot = slot;
  const overlay = document.getElementById("h2h-sheet-overlay");
  const sheet = document.getElementById("h2h-sheet");
  const list = document.getElementById("h2h-sheet-list");
  const title = document.getElementById("h2h-sheet-title");
  if (!overlay || !sheet || !list) return;
  if (title) title.textContent = slot === "a" ? "SELECT P1" : "SELECT P2";
  const taken = slot === "a" ? h2hFilterB : h2hFilterA;
  const selected = slot === "a" ? h2hFilterA : h2hFilterB;
  const players = computeStats(activeMatches())
    .map((p) => p.name)
    .sort();
  list.innerHTML = players
    .map((p) => {
      const isTaken = p === taken;
      const isCurrent = p === selected;
      return `<button class="live-sheet-item${isCurrent ? " live-sheet-item-selected" : ""}${isTaken ? " live-sheet-item-taken" : ""}"
      onclick="${isTaken ? "" : `selectH2HPlayer(${jsArg(p)})`}"
      ${isTaken ? "disabled" : ""}>
      ${sheetAv(p)}
      <span class="live-sheet-item-name">${escHtml(p)}</span>
      ${isCurrent ? '<span class="live-sheet-check">✓</span>' : ""}
    </button>`;
    })
    .join("");
  overlay.classList.add("live-sheet-open");
  sheet.classList.add("live-sheet-open");
}

function closeH2HSheet() {
  document
    .getElementById("h2h-sheet-overlay")
    ?.classList.remove("live-sheet-open");
  document.getElementById("h2h-sheet")?.classList.remove("live-sheet-open");
  _h2hActiveSlot = null;
}

function selectH2HPlayer(name) {
  if (_h2hActiveSlot === "a") h2hFilterA = name;
  else if (_h2hActiveSlot === "b") h2hFilterB = name;
  closeH2HSheet();
  if (h2hFilterA || h2hFilterB) {
    histPlayerFilter = "";
    histPairFilter = "";
    const ps = document.getElementById("histPlayerSelect");
    const pr = document.getElementById("histPairFilter");
    if (ps) ps.value = "";
    if (pr) pr.value = "";
    populateHistoryPlayerChips();
  }
  _updateH2HSlotDisplay();
  renderModernMatches();
}

function clearHeadToHeadFilter() {
  h2hFilterA = "";
  h2hFilterB = "";
  _updateH2HSlotDisplay();
  renderModernMatches();
}

function refreshOutcomeButtons() {
  document
    .querySelectorAll("[data-outcome]")
    .forEach((b) => b.classList.remove("on"));
  document
    .querySelector(`[data-outcome="${histOutcomeFilter}"]`)
    ?.classList.add("on");
}

function getPlayerStats(matches) {
  const stats = {};
  matches.forEach((m) => {
    const aWon = m.scoreA > m.scoreB;
    m.teamA.forEach((p) => {
      if (!stats[p])
        stats[p] = {
          name: p,
          matches: 0,
          wins: 0,
          losses: 0,
          gw: 0,
          gl: 0,
          net: 0,
        };
      stats[p].matches++;
      stats[p].gw += m.scoreA;
      stats[p].gl += m.scoreB;
      stats[p].net = stats[p].gw - stats[p].gl;
      if (aWon) stats[p].wins++;
      else stats[p].losses++;
    });
    m.teamB.forEach((p) => {
      if (!stats[p])
        stats[p] = {
          name: p,
          matches: 0,
          wins: 0,
          losses: 0,
          gw: 0,
          gl: 0,
          net: 0,
        };
      stats[p].matches++;
      stats[p].gw += m.scoreB;
      stats[p].gl += m.scoreA;
      stats[p].net = stats[p].gw - stats[p].gl;
      if (!aWon) stats[p].wins++;
      else stats[p].losses++;
    });
  });
  return Object.values(stats).sort((a, b) => b.matches - a.matches);
}

function renderAddMatches() {
  _addRenderedVersion = _dataVersion;
  const query = (
    document.getElementById("add-match-search")?.value || ""
  ).toLowerCase();
  let matches = query
    ? allMatches.filter((m) => JSON.stringify(m).toLowerCase().includes(query))
    : [...allMatches];
  const addList = document.getElementById("add-match-list");
  addList.innerHTML = buildMatchCards(matches, true);
  addList
    .querySelectorAll(".team-score[data-final], .motd-score[data-final]")
    .forEach((el) => {
      el.textContent = el.dataset.final || "0";
    });
}

function deleteMatchByIndex(i) {
  const removed = allMatches.splice(i, 1)[0];
  if (!removed) return;
  removed.deletedAt = todayISO();
  deletedMatches.unshift(removed);
  saveDeletedMatches();
  saveCloudData();
  renderModernMatches();
  renderAddMatches();
  renderHome();
  renderCompact();
  renderTrash();
  showUndoToast("Match deleted", () => {
    deletedMatches.shift();
    allMatches.splice(i, 0, removed);
    delete removed.deletedAt;
    saveDeletedMatches();
    saveCloudData();
    renderModernMatches();
    renderAddMatches();
    renderHome();
    renderCompact();
    renderTrash();
  });
}

function restoreMatch(i) {
  const m = deletedMatches.splice(i, 1)[0];
  if (!m) return;
  delete m.deletedAt;
  allMatches.push(m);
  saveDeletedMatches();
  saveCloudData();
  renderModernMatches();
  renderAddMatches();
  renderHome();
  renderCompact();
  renderTrash();
  showToast("Match restored!", "↩️");
}

function purgeTrash() {
  const backup = [...deletedMatches];
  const count = backup.length;
  deletedMatches = [];
  saveDeletedMatches();
  renderTrash();
  showUndoToast(`Emptied ${count} match(es) from trash`, () => {
    deletedMatches = backup;
    saveDeletedMatches();
    renderTrash();
  });
}

function renderTrash() {
  const el = document.getElementById("trash-list");
  if (!el) return;
  if (!deletedMatches.length) {
    el.innerHTML =
      '<div style="color:var(--muted);font-size:12px;padding:4px 0">Trash is empty.</div>';
    document
      .getElementById("trash-purge-btn")
      ?.style.setProperty("display", "none");
    return;
  }
  document
    .getElementById("trash-purge-btn")
    ?.style.setProperty("display", "block");
  el.innerHTML = deletedMatches
    .map((m, i) => {
      const label = `${m.teamA?.join(" & ")} vs ${m.teamB?.join(" & ")} ${m.scoreA}–${m.scoreB}`;
      return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)">
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:600;color:var(--text)">${label}</div>
        <div style="font-size:10px;color:var(--muted)">${fmtDate(m.date)} · deleted ${fmtDate(m.deletedAt)}</div>
      </div>
      <button onclick="restoreMatch(${i})" style="font-size:10px;font-weight:700;padding:4px 8px;border-radius:8px;border:1px solid rgba(var(--theme-rgb),0.3);background:transparent;color:var(--theme);cursor:pointer">↩</button>
    </div>`;
    })
    .join("");
}
function closeMatchEdit() {
  document.querySelectorAll(".match-edit-inline").forEach((el) => {
    const idx = el.dataset.editIdx;
    el.classList.remove("open");
    const src = document.querySelector(`.match-card[data-match-idx="${idx}"]`);
    if (src) src.classList.remove("edit-active");
    setTimeout(() => el.remove(), 260);
  });
}

function editMatchByIndex(i, btn) {
  const m = allMatches[i];
  if (!m) return;
  // If clicking the same card again, toggle closed
  const existing = document.querySelector(
    `.match-edit-inline[data-edit-idx="${i}"]`,
  );
  if (existing) {
    closeMatchEdit();
    return;
  }
  closeMatchEdit();
  const players = getAllPlayerNamesFromMatches();
  const opts = (val) =>
    players
      .map(
        (p) =>
          `<option value="${escHtml(p)}"${p === val ? " selected" : ""}>${escHtml(p)}</option>`,
      )
      .join("");
  const el = document.createElement("div");
  el.className = "match-edit-inline";
  el.dataset.editIdx = i;
  el.innerHTML = `
    <div class="mei-header">
      <span class="mei-title">✏ EDIT MATCH</span>
      <button class="mei-close" onclick="closeMatchEdit()">✕</button>
    </div>
    <div class="mei-section-lbl">DATE</div>
    <input id="edit-match-date" type="date" class="mei-input" style="width:100%;margin-bottom:10px" value="${m.date || todayISO()}">
    <div class="mei-section-lbl" style="color:var(--green)">TEAM A</div>
    <div class="mei-row">
      <select id="edit-a1" class="mei-sel"><option value="">P1</option>${opts(m.teamA[0])}</select>
      <select id="edit-a2" class="mei-sel"><option value="">P2</option>${opts(m.teamA[1])}</select>
    </div>
    <div class="mei-section-lbl" style="color:var(--red)">TEAM B</div>
    <div class="mei-row">
      <select id="edit-b1" class="mei-sel"><option value="">P1</option>${opts(m.teamB[0])}</select>
      <select id="edit-b2" class="mei-sel"><option value="">P2</option>${opts(m.teamB[1])}</select>
    </div>
    <div class="mei-section-lbl">SCORE</div>
    <div class="mei-row" style="align-items:center;margin-bottom:10px">
      <input id="edit-sa" type="number" inputmode="numeric" pattern="[0-9]*" min="0" max="20" class="mei-input mei-score" value="${m.scoreA}">
      <span style="color:var(--muted);font-weight:900;font-size:18px;padding:0 4px">–</span>
      <input id="edit-sb" type="number" inputmode="numeric" pattern="[0-9]*" min="0" max="20" class="mei-input mei-score" value="${m.scoreB}">
    </div>
    <div class="mei-section-lbl">NOTE <span style="font-weight:400;text-transform:none;letter-spacing:0">(optional)</span></div>
    <input id="edit-note" type="text" class="mei-input" style="width:100%;margin-bottom:10px" placeholder="e.g. rainy day, semifinals…" value="${escHtml(m.note || "")}">
    <div id="edit-match-err" style="color:var(--red);font-size:12px;margin-bottom:6px;display:none"></div>
    <div class="mei-actions">
      <button class="mei-cancel" onclick="closeMatchEdit()">Cancel</button>
      <button class="mei-save" onclick="saveMatchEdit(${i})">Save Changes</button>
    </div>`;
  const srcCard = btn
    ? btn.closest(".match-card")
    : document.querySelector(`.match-card[data-match-idx="${i}"]`);
  if (srcCard) {
    srcCard.insertAdjacentElement("afterend", el);
    srcCard.classList.add("edit-active");
  } else {
    const list = document.getElementById("modern-match-list");
    if (list) list.prepend(el);
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add("open"));
  });
  setTimeout(
    () => el.scrollIntoView({ behavior: "smooth", block: "nearest" }),
    60,
  );
}

function saveMatchEdit(i) {
  const m = allMatches[i];
  if (!m) return;
  const date = document.getElementById("edit-match-date")?.value;
  const a1 = document.getElementById("edit-a1")?.value;
  const a2 = document.getElementById("edit-a2")?.value;
  const b1 = document.getElementById("edit-b1")?.value;
  const b2 = document.getElementById("edit-b2")?.value;
  const sa = parseInt(document.getElementById("edit-sa")?.value);
  const sb = parseInt(document.getElementById("edit-sb")?.value);
  const note = document.getElementById("edit-note")?.value.trim();
  const errEl = document.getElementById("edit-match-err");
  const show = (msg) => {
    errEl.textContent = msg;
    errEl.style.display = "block";
  };
  if (!a1 || !b1) return show("Select at least P1 for each team.");
  if (isNaN(sa) || isNaN(sb)) return show("Enter valid scores.");
  if (sa === sb) return show("Scores cannot be equal.");
  // Enhancement 23: block future-dated match edits
  if (date && date > todayISO()) return show("Match date cannot be in the future.");
  const teamA = [a1, a2].filter(Boolean);
  const teamB = [b1, b2].filter(Boolean);
  if (teamA.length !== teamB.length)
    return show("Both teams must have the same size.");
  if (new Set([...teamA, ...teamB]).size < teamA.length + teamB.length)
    return show("All players in a match must be different.");
  m.date = date || m.date;
  m.teamA = teamA;
  m.teamB = teamB;
  m.scoreA = sa;
  m.scoreB = sb;
  if (note) m.note = note;
  else delete m.note;
  saveCloudData();
  closeMatchEdit();
  renderModernMatches();
  renderAddMatches();
  renderHome();
  renderCompact();
}

// ── FAB MODAL ──────────────────────────────────────────────
const _fabSlotLabels = {
  "modern-team-a-p1": "Team A — P1",
  "modern-team-a-p2": "Team A — P2",
  "modern-team-b-p1": "Team B — P1",
  "modern-team-b-p2": "Team B — P2",
};
const _fabSlotIds = Object.keys(_fabSlotLabels);
let _pickerSlotId = null;

function populatePlayerDropdowns() {
  _fabSlotIds.forEach((id) => {
    const inp = document.getElementById(id);
    if (inp) inp.value = "";
    _updateSlotButton(id, "");
  });
}

function _updateSlotButton(slotId, name) {
  const btn = document.getElementById(`slot-${slotId}`);
  if (!btn) return;
  if (!name) {
    btn.innerHTML = `<span class="slot-av-placeholder">+</span><span class="slot-label">${_fabSlotLabels[slotId] || slotId}</span>`;
    btn.classList.remove("filled");
    return;
  }
  const photo = photoMap[name];
  const avInner = photo
    ? `<img src="${photo}" alt="${escHtml(name)}" style="width:100%;height:100%;object-fit:cover;display:block;">`
    : playerInitials(name);
  btn.innerHTML = `<span class="slot-av" style="background:${photo ? "none" : playerColor(name)}">${avInner}</span><span class="slot-name">${escHtml(name)}</span>`;
  btn.classList.add("filled");
}

function _syncFabDropdowns() {
  _fabSlotIds.forEach((id) => {
    const val = document.getElementById(id)?.value || "";
    _updateSlotButton(id, val);
  });
}

function openPlayerPicker(slotId, label) {
  _pickerSlotId = slotId;
  const overlay = document.getElementById("player-picker-overlay");
  const titleEl = document.getElementById("player-picker-title");
  const grid = document.getElementById("player-picker-grid");
  if (!overlay || !grid) return;
  if (titleEl) titleEl.textContent = label;
  const taken = _fabSlotIds
    .filter((id) => id !== slotId)
    .map((id) => document.getElementById(id)?.value || "")
    .filter(Boolean);
  const currentVal = document.getElementById(slotId)?.value || "";
  const displayNames = getAllPlayerNamesFromMatches();
  grid.innerHTML = displayNames.map((name) => {
    const isTaken = taken.includes(name);
    const isSelected = name === currentVal;
    const photo = photoMap[name];
    const avInner = photo
      ? `<img src="${photo}" alt="${escHtml(name)}">`
      : playerInitials(name);
    const cls = `player-picker-chip${isTaken ? " taken" : ""}${isSelected ? " selected" : ""}`;
    return `<button class="${cls}" onclick="pickPlayer(${jsArg(name)})">
      <div class="pp-chip-av" style="background:${photo ? "none" : playerColor(name)}">${avInner}</div>
      <span class="pp-chip-name">${escHtml(name)}</span>
    </button>`;
  }).join("");
  overlay.classList.add("open");
}

function pickPlayer(name) {
  if (!_pickerSlotId) return;
  const inp = document.getElementById(_pickerSlotId);
  if (inp) inp.value = name;
  _updateSlotButton(_pickerSlotId, name);
  closePlayerPicker();
}

function closePlayerPicker() {
  document.getElementById("player-picker-overlay")?.classList.remove("open");
  _pickerSlotId = null;
}

function closePlayerPickerBackdrop(e) {
  if (e.target.id === "player-picker-overlay") closePlayerPicker();
}

function openFabModal() {
  const activeTab = document.querySelector(".itab.on");
  if (activeTab && activeTab.textContent.includes("Add Matches")) {
    openModernAddModal();
  } else if (activeTab && activeTab.textContent.includes("Names")) {
    openNameAddModal();
  }
}

function openModernAddModal() {
  document.getElementById("modern-add-modal").classList.add("show");
  document.getElementById("modern-date").value = todayISO();
  populatePlayerDropdowns();
  const sa = document.getElementById("modern-score-a");
  const sb = document.getElementById("modern-score-b");
  if (sa) sa.value = "";
  if (sb) sb.value = "";
}

function quickRematch(idx) {
  const m = allMatches[idx];
  if (!m) return;
  // Swap teams: winners become team B, losers become team A
  const newA = (m.teamB || []).map((p) => nameMap[p] || p);
  const newB = (m.teamA || []).map((p) => nameMap[p] || p);
  openModernAddModal();
  requestAnimationFrame(() => {
    const sel = (id, val) => {
      const el = document.getElementById(id);
      if (el && val) el.value = val;
    };
    sel("modern-team-a-p1", newA[0] || "");
    sel("modern-team-a-p2", newA[1] || "");
    sel("modern-team-b-p1", newB[0] || "");
    sel("modern-team-b-p2", newB[1] || "");
    _syncFabDropdowns();
    // Clear scores so user enters fresh result
    const sa = document.getElementById("modern-score-a");
    const sb = document.getElementById("modern-score-b");
    if (sa) sa.value = "";
    if (sb) sb.value = "";
  });
}
function closeModernAddModal() {
  document.getElementById("modern-add-modal").classList.remove("show");
  const noteEl = document.getElementById("modern-note");
  if (noteEl) noteEl.value = "";
}
document.getElementById("modern-add-modal").addEventListener("click", (e) => {
  if (e.target.id === "modern-add-modal") closeModernAddModal();
});

function openNameAddModal() {
  document.getElementById("name-add-modal").classList.add("show");
}
function closeNameAddModal() {
  document.getElementById("name-add-modal").classList.remove("show");
}
document.getElementById("name-add-modal").addEventListener("click", (e) => {
  if (e.target.id === "name-add-modal") closeNameAddModal();
});

function saveQuickName() {
  const display = document.getElementById("name-display").value.trim();
  const aliasesText = document.getElementById("name-aliases").value.trim();
  const email = document.getElementById("name-email")?.value.trim() || "";
  const isGuest = document.getElementById("name-guest")?.checked || false;

  if (!display) { alert("Display name is required"); return; }

  const aliases = aliasesText
    ? aliasesText.split(",").map((a) => a.trim()).filter(Boolean)
    : [];

  const id = nextPlayerId++;
  players[id] = { id, name: display, email, isGuest };
  playerAliasMap[id] = aliases;
  rebuildNameMaps();
  saveCloudData();
  closeNameAddModal();
  renderNamesTable();

  document.getElementById("name-display").value = "";
  document.getElementById("name-aliases").value = "";
  if (document.getElementById("name-email")) document.getElementById("name-email").value = "";
  if (document.getElementById("name-guest")) document.getElementById("name-guest").checked = false;
}

function saveModernMatch() {
  const p1a = document.getElementById("modern-team-a-p1").value;
  const p2a = document.getElementById("modern-team-a-p2").value;
  const p1b = document.getElementById("modern-team-b-p1").value;
  const p2b = document.getElementById("modern-team-b-p2").value;
  const sA = parseInt(document.getElementById("modern-score-a").value);
  const sB = parseInt(document.getElementById("modern-score-b").value);
  const date = document.getElementById("modern-date").value || todayISO();
  const note = document.getElementById("modern-note")?.value.trim() || "";
  if (!p1a || !p2a || !p1b || !p2b || isNaN(sA) || isNaN(sB) || sA === sB) {
    alert("Invalid match data");
    return;
  }
  // Enhancement 23: block future-dated match entries
  if (date > todayISO()) {
    alert("Match date cannot be in the future.");
    return;
  }
  if (new Set([p1a, p2a, p1b, p2b]).size < 4) {
    alert("All 4 players must be different");
    return;
  }
  const teamA = [p1a, p2a];
  const teamB = [p1b, p2b];
  const candidate = { teamA, teamB, scoreA: sA, scoreB: sB, date };

  function _doSave() {
    const prevSnapshot = [...allMatches];
    lastMatchSnapshot = prevSnapshot;
    if (note) candidate.note = note;
    allMatches.push(candidate);
    checkMilestones(prevSnapshot, allMatches);
    _lastLocalSaveTime = Date.now();
    saveCloudData();
    closeModernAddModal();
    renderModernMatches();
    renderAddMatches();
    renderHome();
    renderCompact();
  }

  // Exact duplicate
  if (allMatches.some((old) => sameMatch(old, candidate))) {
    showDupConfirmSheet("This match already exists. Add anyway?", _doSave);
    return;
  }
  // Same-day same-teams (different score)
  const sameDayConflict = allMatches.some(
    (old) =>
      old.date === candidate.date &&
      [...(old.teamA || [])].sort().join("|") === [...teamA].sort().join("|") &&
      [...(old.teamB || [])].sort().join("|") === [...teamB].sort().join("|"),
  );
  if (sameDayConflict) {
    showDupConfirmSheet("These teams already played on this date. Add anyway?", _doSave);
    return;
  }
  _doSave();
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
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
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
  // Find first match index in allMatches
  const idx = allMatches.indexOf(dayMatches[0]);
  if (idx >= 0) {
    document.getElementById("player-detail-modal")?.remove();
    openMatchIntro(idx);
  }
}

function openPlayerDetail(name) {
  document.getElementById("player-detail-modal")?.remove();
  const detail = getPlayerDetail(name);
  if (!detail.stats) {
    alert("No player stats found.");
    return;
  }
  const s = detail.stats;
  const daysPlayed = new Set(detail.matches.map(m => m.date).filter(Boolean)).size;

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
  const radarHtml = (() => {
    const eloMap = _memoElo();
    const allStats = computeStats(activeMatches(), eloMap);
    const ps = allStats.find((p) => p.name === name);
    if (!ps || ps.mp < 3) return "";
    const allElos = Object.values(eloMap);
    const maxElo = Math.max(...allElos),
      minElo = Math.min(...allElos);
    const eloNorm =
      maxElo > minElo
        ? ((eloMap[name] || 1000) - minElo) / (maxElo - minElo)
        : 0.5;
    const winRateNorm = ps.mp > 0 ? ps.mw / ps.mp : 0;
    const closeMs = activeMatches().filter(
      (m) =>
        [...(m.teamA || []), ...(m.teamB || [])].includes(name) &&
        Math.abs(m.scoreA - m.scoreB) <= 2,
    );
    const clutchNorm =
      closeMs.length >= 2
        ? closeMs.filter((m) => {
            const inA = (m.teamA || []).includes(name);
            return (
              (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA)
            );
          }).length / closeMs.length
        : 0.5;
    const formNorm = form ? form.score / 10 : winRateNorm;
    const maxMp = Math.max(...allStats.map((p) => p.mp), 1);
    const actNorm = ps.mp / maxMp;
    const margins = allMatches
      .filter((m) => [...(m.teamA || []), ...(m.teamB || [])].includes(name))
      .map((m) => {
        const inA = (m.teamA || []).includes(name);
        return (inA ? m.scoreA : m.scoreB) - (inA ? m.scoreB : m.scoreA);
      });
    const avgM =
      margins.reduce((s, v) => s + v, 0) / Math.max(margins.length, 1);
    const consistNorm = Math.min(1, Math.max(0, (avgM + 5) / 10));

    // Avg values across all active players for comparison overlay
    const activePlayers = allStats.filter((p) => p.mp >= 3);
    const _avg = (fn) =>
      activePlayers.reduce((s, p) => s + fn(p), 0) /
      Math.max(activePlayers.length, 1);
    const avgWinRate = _avg((p) => (p.mp > 0 ? p.mw / p.mp : 0));
    const avgElo = _avg((p) =>
      maxElo > minElo
        ? ((eloMap[p.name] || 1000) - minElo) / (maxElo - minElo)
        : 0.5,
    );
    const avgClutch = _avg((p) => {
      const cMs = activeMatches().filter(
        (m) =>
          [...(m.teamA || []), ...(m.teamB || [])].includes(p.name) &&
          Math.abs(m.scoreA - m.scoreB) <= 2,
      );
      return cMs.length >= 2
        ? cMs.filter((m) => {
            const inA = (m.teamA || []).includes(p.name);
            return (
              (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA)
            );
          }).length / cMs.length
        : 0.5;
    });
    const avgForm = _avg((p) => (p.mp > 0 ? p.mw / p.mp : 0));
    const avgAct = _avg((p) => p.mp / maxMp);
    const avgConsist = _avg((p) => {
      const ms2 = allMatches
        .filter((m) =>
          [...(m.teamA || []), ...(m.teamB || [])].includes(p.name),
        )
        .map((m) => {
          const inA = (m.teamA || []).includes(p.name);
          return (inA ? m.scoreA : m.scoreB) - (inA ? m.scoreB : m.scoreA);
        });
      const a2 = ms2.reduce((a, v) => a + v, 0) / Math.max(ms2.length, 1);
      return Math.min(1, Math.max(0, (a2 + 5) / 10));
    });

    const axes = [
      { label: "WIN RATE", val: winRateNorm, avg: avgWinRate },
      { label: "ELO", val: eloNorm, avg: avgElo },
      { label: "CLUTCH", val: clutchNorm, avg: avgClutch },
      { label: "FORM", val: formNorm, avg: avgForm },
      { label: "ACTIVITY", val: actNorm, avg: avgAct },
      { label: "MARGIN", val: consistNorm, avg: avgConsist },
    ];
    const N = axes.length;
    const cx = 110,
      cy = 110,
      R = 78;
    const col = playerColor(name);
    const xy = (i, scale) => {
      const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
      return {
        x: cx + scale * R * Math.cos(angle),
        y: cy + scale * R * Math.sin(angle),
      };
    };
    const playerPts = axes.map((a, i) => xy(i, a.val));
    const avgPts = axes.map((a, i) => xy(i, a.avg));
    const gridLines = [0.25, 0.5, 0.75, 1]
      .map((sc) => {
        const g = axes
          .map((_, i) => {
            const p = xy(i, sc);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          })
          .join(" ");
        return `<polygon points="${g}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`;
      })
      .join("");
    const spokes = axes
      .map((_, i) => {
        const p = xy(i, 1);
        return `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
      })
      .join("");
    const polyPts = playerPts
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");
    const avgPolyPts = avgPts
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");
    const labels = axes
      .map((a, i) => {
        const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
        const lx = cx + (R + 22) * Math.cos(angle);
        const ly = cy + (R + 22) * Math.sin(angle);
        const anchor =
          Math.abs(lx - cx) < 6 ? "middle" : lx > cx ? "start" : "end";
        return `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="${anchor}" font-size="8" font-weight="700" fill="rgba(255,255,255,0.55)" font-family="DM Sans,sans-serif">${a.label}</text>`;
      })
      .join("");
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
  })();

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
            if (frac) pct = Math.min(100, (parseInt(frac[1], 10) / parseInt(frac[2], 10)) * 100);
            else if (perc) pct = Math.min(100, parseInt(perc[1], 10));
          }
          return `<div class="ach-row${a.unlocked ? " ach-unlocked" : ""}">
            <div class="ach-icon">${a.icon}</div>
            <div class="ach-body">
              <div class="ach-head">
                <span class="ach-label">${a.label}</span>
                <span class="ach-progress-lbl">${a.unlocked ? "✓ UNLOCKED" : (a.progress || "—")}</span>
              </div>
              <div class="ach-desc">${a.desc}</div>
              <div class="ach-bar"><div class="ach-bar-fill" style="width:${pct.toFixed(0)}%"></div></div>
            </div>
          </div>`;
        };
        return `<div class="ana-card">
          <span class="badge">Achievements (${unlocked.length}/${achievements.length})</span>
          <div class="ach-list">${ordered.map(renderCard).join("")}</div>
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
  const formGraphHtml = (() => {
    if (graphMatches.length < 3) return "";
    const WINDOW = 5,
      W = 260,
      H = 56,
      PAD = 8;
    const wins = graphMatches.map((m) => {
      const inA = (m.teamA || []).some((p) => normPlayer(p) === name);
      const own = inA ? Number(m.scoreA) : Number(m.scoreB);
      const opp = inA ? Number(m.scoreB) : Number(m.scoreA);
      return own > opp ? 1 : 0;
    });
    const rates = wins.map((_, i) => {
      const sl = wins.slice(Math.max(0, i - WINDOW + 1), i + 1);
      return sl.reduce((s, v) => s + v, 0) / sl.length;
    });
    const n = rates.length;
    const xs = rates.map((_, i) => PAD + (i / (n - 1)) * (W - PAD * 2));
    const ys = rates.map((r) => H - PAD - r * (H - PAD * 2));
    const pathD = xs
      .map(
        (x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`,
      )
      .join(" ");
    const areaD =
      pathD +
      ` L${xs[n - 1].toFixed(1)},${(H - PAD).toFixed(1)} L${xs[0].toFixed(1)},${(H - PAD).toFixed(1)} Z`;
    const last = rates[n - 1];
    const lineColor =
      last >= 0.6 ? "#36d47e" : last <= 0.4 ? "#f04f4f" : "#f5c842";
    const gId = `fg_${name.replace(/\W+/g, "_")}`;
    const dots = xs
      .map(
        (x, i) =>
          `<circle cx="${x.toFixed(1)}" cy="${ys[i].toFixed(1)}" r="2.5" fill="${wins[i] ? "#36d47e" : "#f04f4f"}"/>`,
      )
      .join("");
    return `<div class="ana-card">
      <span class="badge">Form Graph</span>
      <div style="margin-top:10px">
        <svg width="100%" height="56" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="display:block;overflow:visible">
          <defs>
            <linearGradient id="${gId}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${lineColor}" stop-opacity="0.25"/>
              <stop offset="100%" stop-color="${lineColor}" stop-opacity="0"/>
            </linearGradient>
          </defs>
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
  })();

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
  const pdSortedAll14 = [...allMatches].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const pdPlayerMs = pdSortedAll14.filter((m) => [...(m.teamA || []), ...(m.teamB || [])].includes(name));

  // Enhancement 14: dangerous opponent — opponent with highest win rate AGAINST this player
  const dangerousOppHtml = (() => {
    const oppData = {};
    pdPlayerMs.forEach((m) => {
      const inA = (m.teamA || []).includes(name);
      const won = inA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
      const opps = inA ? (m.teamB || []) : (m.teamA || []);
      opps.forEach((o) => {
        if (!oppData[o]) oppData[o] = { w: 0, p: 0 };
        oppData[o].p++;
        if (!won) oppData[o].w++;
      });
    });
    const best = Object.entries(oppData)
      .filter(([, d]) => d.p >= 3)
      .sort((a, b) => (b[1].w / b[1].p) - (a[1].w / a[1].p))[0];
    if (!best) return "";
    const [oppName, d] = best;
    const pct = Math.round(d.w / d.p * 100);
    if (pct < 55) return "";
    return `<div class="det-conn">
      <div class="det-conn-icon">⚠️</div>
      <div class="det-conn-body">
        <div class="det-conn-name">${oppName}</div>
        <div class="det-conn-meta"><span class="n">${pct}% win rate vs me</span> · ${d.p}g</div>
      </div>
      <div class="det-conn-tag">Dangerous Opp.</div>
    </div>`;
  })();

  const connectionsHtml =
    bestPartnerHtml ||
    worstPartnerHtml ||
    nemesisHtml ||
    favOppHtml ||
    mostCommonPartnerHtml ||
    mostCommonOppHtml ||
    dangerousOppHtml
      ? `<div class="ana-card">
              <span class="badge">Connections</span>
              <div class="det-conn-list">${bestPartnerHtml}${worstPartnerHtml}${nemesisHtml}${favOppHtml}${mostCommonPartnerHtml}${mostCommonOppHtml}${dangerousOppHtml}</div>
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
  const eloMap = _memoElo();
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

  // Badges
  const badges = computeBadges(name, s, eloMap, activeMatches());
  const badgesHtml = badges.length
    ? `<div class="ana-card"><span class="badge">Award Badges</span><div class="badge-chips" style="margin-top:10px">${badges.map((b) => `<div class="badge-chip${b.tier ? " badge-tier-" + b.tier : ""}" title="${b.desc}"><span>${b.icon}</span><span class="badge-chip-lbl">${b.label}</span>${b.tier ? `<span class="badge-tier-lbl">${b.tier.toUpperCase()}</span>` : ""}</div>`).join("")}</div></div>`
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
  const allEloMap = _memoElo();
  const allRanked = computeStats(activeMatches(), allEloMap);
  const preWkMatches = activeMatches().filter((m) => (m.date || "") < wkFrom);
  const preWkRanked = computeStats(preWkMatches, computeElo(preWkMatches));
  const rAll = allRanked.findIndex((p) => p.name === name) + 1 || null;
  const rPre = preWkRanked.findIndex((p) => p.name === name) + 1 || null;
  // Best rank: find minimum rank position across all match-date snapshots
  const _sortedAll = [...allMatches].sort((a, b) =>
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

  // ── ELO TIMELINE CHART ─────────────────────────────────
  const eloTimelineHtml = (() => {
    const sorted = [...allMatches].sort((a, b) =>
      (a.date || "").localeCompare(b.date || ""),
    );
    const playerMs = sorted.filter((m) =>
      [...(m.teamA || []), ...(m.teamB || [])].includes(name),
    );
    if (playerMs.length < 3) return "";
    const elo = {};
    const pts = [];
    sorted.forEach((m) => {
      const allP = [...(m.teamA || []), ...(m.teamB || [])];
      allP.forEach((p) => {
        if (!(p in elo)) elo[p] = 1000;
      });
      const aWon = m.scoreA > m.scoreB;
      const avgA =
        m.teamA.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamA.length, 1);
      const avgB =
        m.teamB.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamB.length, 1);
      const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
      const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
      const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
      m.teamA.forEach((p) => {
        elo[p] = (elo[p] || 1000) + dA;
      });
      m.teamB.forEach((p) => {
        elo[p] = (elo[p] || 1000) + dB;
      });
      if ([...(m.teamA || []), ...(m.teamB || [])].includes(name)) {
        const inA = (m.teamA || []).includes(name);
        pts.push({ elo: elo[name], date: m.date, won: inA ? aWon : !aWon });
      }
    });
    if (pts.length < 3) return "";
    const W = 300,
      H = 90,
      pl = 36,
      pr = 8,
      pt = 8,
      pb = 18,
      cW = W - pl - pr,
      cH = H - pt - pb;
    const minE = Math.min(...pts.map((p) => p.elo)) - 20;
    const maxE = Math.max(...pts.map((p) => p.elo)) + 20;
    const eRange = Math.max(1, maxE - minE);
    const toX = (i) => pl + (i / (pts.length - 1 || 1)) * cW;
    const toY = (e) => pt + (1 - (e - minE) / eRange) * cH;
    const yLines = [
      minE + eRange * 0.25,
      minE + eRange * 0.5,
      minE + eRange * 0.75,
    ]
      .map((ev) => {
        const y = toY(ev);
        return `<line x1="${pl}" y1="${y.toFixed(1)}" x2="${W - pr}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/><text x="${pl - 3}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="7" fill="rgba(255,255,255,0.3)">${Math.round(ev)}</text>`;
      })
      .join("");
    const polyline = pts
      .map((p, i) => `${toX(i).toFixed(1)},${toY(p.elo).toFixed(1)}`)
      .join(" ");
    const area =
      `M${toX(0).toFixed(1)},${(H - pb).toFixed(1)} ` +
      pts
        .map((p, i) => `L${toX(i).toFixed(1)},${toY(p.elo).toFixed(1)}`)
        .join(" ") +
      ` L${toX(pts.length - 1).toFixed(1)},${(H - pb).toFixed(1)} Z`;
    const col = playerColor(name);
    const circles = pts
      .map(
        (p, i) =>
          `<circle cx="${toX(i).toFixed(1)}" cy="${toY(p.elo).toFixed(1)}" r="2.5" fill="${p.won ? "var(--green)" : "var(--red)"}" stroke="rgba(0,0,0,0.4)" stroke-width="0.5"><title>${p.date}: ELO ${p.elo} (${p.won ? "W" : "L"})</title></circle>`,
      )
      .join("");
    const lastElo = pts[pts.length - 1].elo;
    const firstElo = pts[0].elo;
    const netChange = lastElo - firstElo;
    const netStr = netChange > 0 ? `+${netChange}` : `${netChange}`;
    const netCol =
      netChange > 0
        ? "var(--green)"
        : netChange < 0
          ? "var(--red)"
          : "var(--muted)";
    const peakElo = Math.max(...pts.map((p) => p.elo));
    const peakPt = pts.find((p) => p.elo === peakElo);
    const valleyElo = Math.min(...pts.map((p) => p.elo));
    const valleyPt = pts.find((p) => p.elo === valleyElo);
    const fromPeak = lastElo - peakElo;
    const fromPeakLabel =
      fromPeak === 0
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
  })();

  // ── RECENT MATCH CARDS (from match log with ELO delta) ───
  const recentMatchCards = (() => {
    const last8 = pdPlayerMs.slice(-10).reverse();
    if (!last8.length) return "";
    const runElo2 = {};
    const eloAfterEach = {};
    pdSortedAll14.forEach((m) => {
      const allP2 = [...(m.teamA || []), ...(m.teamB || [])];
      allP2.forEach((p) => { if (!(p in runElo2)) runElo2[p] = 1000; });
      const aWon3 = m.scoreA > m.scoreB;
      const tA3 = m.teamA || [], tB3 = m.teamB || [];
      const avgA3 = tA3.reduce((s, p) => s + runElo2[p], 0) / Math.max(tA3.length, 1);
      const avgB3 = tB3.reduce((s, p) => s + runElo2[p], 0) / Math.max(tB3.length, 1);
      const expA3 = 1 / (1 + Math.pow(10, (avgB3 - avgA3) / 400));
      const dA3 = Math.round(32 * ((aWon3 ? 1 : 0) - expA3));
      const dB3 = Math.round(32 * ((aWon3 ? 0 : 1) - (1 - expA3)));
      tA3.forEach((p) => { runElo2[p] = (runElo2[p] || 1000) + dA3; });
      tB3.forEach((p) => { runElo2[p] = (runElo2[p] || 1000) + dB3; });
      if ([...(m.teamA || []), ...(m.teamB || [])].includes(name)) {
        const inA4 = (m.teamA || []).includes(name);
        eloAfterEach[pdSortedAll14.indexOf(m)] = { delta: inA4 ? dA3 : dB3 };
      }
    });
    return last8.map((m) => {
      const inA4 = (m.teamA || []).includes(name);
      const won4 = inA4 ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
      const partner = (inA4 ? (m.teamA || []) : (m.teamB || [])).filter((p) => p !== name).map((p) => p.split(" ")[0]).join(" & ") || "—";
      const opp = (inA4 ? (m.teamB || []) : (m.teamA || [])).map((p) => p.split(" ")[0]).join(" & ");
      const score = inA4 ? `${m.scoreA}–${m.scoreB}` : `${m.scoreB}–${m.scoreA}`;
      const eld = eloAfterEach[pdSortedAll14.indexOf(m)];
      const eloDeltaStr = eld ? `${eld.delta >= 0 ? "+" : ""}${eld.delta}` : "";
      const eloDeltaCol = eld?.delta >= 0 ? "var(--green)" : "var(--red)";
      const scoreColor = won4 ? "var(--green)" : "var(--red)";
      return `<div class="ana-card det-match-card">
        <div class="det-match-result" style="color:${scoreColor}">${won4 ? "W" : "L"}</div>
        <div class="det-match-body">
          <div class="det-match-score">${score}</div>
          <div class="sub">${fmtDate(m.date).replace(/\s\d{4}$/, "")} · w/ ${escHtml(partner)} · vs ${escHtml(opp)}</div>
        </div>
        ${eld ? `<div style="font-size:11px;font-weight:700;color:${eloDeltaCol};flex-shrink:0">${eloDeltaStr}</div>` : ""}
      </div>`;
    }).join("");
  })();

  // ── VS-ALL-OPPONENTS BREAKDOWN ───────────────────────────
  const vsOpponentsHtml = (() => {
    const vsData = {};
    pdPlayerMs.forEach((m) => {
      const inA5 = (m.teamA || []).includes(name);
      const won5 = inA5 ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
      const opp5 = inA5 ? m.teamB : m.teamA;
      const own5 = inA5 ? (m.scoreA) : (m.scoreB);
      const oppS5 = inA5 ? m.scoreB : m.scoreA;
      opp5.forEach((o) => {
        if (!vsData[o]) vsData[o] = { w: 0, p: 0, margin: 0 };
        vsData[o].p++;
        if (won5) vsData[o].w++;
        vsData[o].margin += (own5 - oppS5);
      });
    });
    const rows5 = Object.entries(vsData)
      .filter(([, d]) => d.p >= 1)
      .sort((a, b) => b[1].p - a[1].p)
      .map(([opp, d]) => {
        const pct = Math.round(d.w / d.p * 100);
        const col = pct >= 60 ? "var(--green)" : pct <= 40 ? "var(--red)" : "var(--muted)";
        const avgM2 = (d.margin / d.p).toFixed(1);
        const mc2 = d.margin > 0 ? "var(--green)" : d.margin < 0 ? "var(--red)" : "var(--muted)";
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span style="font-size:11px;font-weight:700">${opp}</span><div style="display:flex;gap:10px;align-items:center"><span style="font-size:10px;color:var(--muted)">${d.w}W–${d.p-d.w}L</span><span style="font-size:11px;font-weight:800;color:${col}">${pct}%</span><span style="font-size:10px;color:${mc2}">${avgM2>0?"+":""}${avgM2}</span></div></div>`;
      }).join("");
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
      team6.filter((p) => p !== name).forEach((p) => {
        if (!pData[p]) pData[p] = { w: 0, p: 0 };
        pData[p].p++;
        if (won6) pData[p].w++;
      });
    });
    // Enhancement 15: compute cumulative ELO delta when paired with each partner
    const _eloW15 = {};
    const partnerEloDelta = {};
    const sortedForElo15 = [...allMatches].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    sortedForElo15.forEach((m) => {
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => { if (!(p in _eloW15)) _eloW15[p] = 1000; });
      const aWon15 = m.scoreA > m.scoreB;
      const tA15 = m.teamA || [], tB15 = m.teamB || [];
      const avgA15 = tA15.reduce((s, p) => s + (_eloW15[p] || 1000), 0) / Math.max(tA15.length, 1);
      const avgB15 = tB15.reduce((s, p) => s + (_eloW15[p] || 1000), 0) / Math.max(tB15.length, 1);
      const expA15 = 1 / (1 + Math.pow(10, (avgB15 - avgA15) / 400));
      const dA15 = Math.round(32 * ((aWon15 ? 1 : 0) - expA15));
      const dB15 = Math.round(32 * ((aWon15 ? 0 : 1) - (1 - expA15)));
      tA15.forEach((p) => { _eloW15[p] = (_eloW15[p] || 1000) + dA15; });
      tB15.forEach((p) => { _eloW15[p] = (_eloW15[p] || 1000) + dB15; });
      const inA15 = (m.teamA || []).includes(name);
      const inB15 = (m.teamB || []).includes(name);
      if (inA15 || inB15) {
        const myDelta15 = inA15 ? dA15 : dB15;
        const myTeam15 = inA15 ? m.teamA : m.teamB;
        myTeam15.filter((p) => p !== name).forEach((p) => {
          if (!partnerEloDelta[p]) partnerEloDelta[p] = 0;
          partnerEloDelta[p] += myDelta15;
        });
      }
    });
    const rows6 = Object.entries(pData)
      .filter(([, d]) => d.p >= 1)
      .sort((a, b) => b[1].w / b[1].p - a[1].w / a[1].p || b[1].p - a[1].p)
      .map(([partner, d]) => {
        const pct = Math.round(d.w / d.p * 100);
        const col = pct >= 60 ? "var(--green)" : pct <= 40 ? "var(--red)" : "var(--muted)";
        const eloDelta = partnerEloDelta[partner];
        const eloStr = eloDelta !== undefined
          ? `<span style="font-size:10px;font-weight:700;color:${eloDelta >= 0 ? 'var(--green)' : 'var(--red)'}">${eloDelta >= 0 ? '+' : ''}${eloDelta}</span>`
          : '';
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span style="font-size:11px;font-weight:700">${partner}</span><div style="display:flex;gap:8px;align-items:center"><span style="font-size:10px;color:var(--muted)">${d.p}g</span>${eloStr}<span style="font-size:11px;font-weight:800;color:${col}">${pct}%</span></div></div>`;
      }).join("");
    if (!rows6) return "";
    return `<div class="ana-card"><span class="badge">All Partners Ranked</span><div style="font-size:9px;color:var(--muted);padding:4px 0 2px">Win% · ELO gained together</div><div onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'" style="cursor:pointer;padding:8px 0 4px;font-size:10px;color:var(--muted)">Tap to expand ▾</div><div style="display:none">${rows6}</div></div>`;
  })();

  // ── PARTNER COMPATIBILITY SCORE ──────────────────────────
  const partnerCompatHtml = (() => {
    const pairStats = getPairStats(activeMatches())
      .filter((ps) => ps.players.map(normPlayer).includes(normPlayer(name)) && ps.played >= 3)
      .sort((a, b) => b.winPct - a.winPct)
      .slice(0, 5);
    if (!pairStats.length) return "";
    const rows = pairStats.map((ps) => {
      const partner = ps.players.find((p) => normPlayer(p) !== normPlayer(name)) || ps.players[0];
      const pct = Math.round(ps.winPct);
      const col = pct >= 60 ? "var(--green)" : pct <= 40 ? "var(--red)" : "var(--muted)";
      const stars = pct >= 70 ? "★★★" : pct >= 55 ? "★★☆" : pct >= 45 ? "★☆☆" : "☆☆☆";
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span style="font-size:11px;font-weight:700">${escHtml(partner)}</span>
        <div style="display:flex;gap:8px;align-items:center">
          <span style="font-size:9px;color:var(--muted)">${ps.played}g</span>
          <span style="font-size:11px;color:var(--gold)">${stars}</span>
          <span style="font-size:11px;font-weight:800;color:${col}">${pct}%</span>
        </div>
      </div>`;
    }).join("");
    return `<div class="ana-card"><span class="badge">Partner Compatibility</span><div style="font-size:9px;color:var(--muted);padding:4px 0 8px">Top pairings by win rate (min 3 games)</div>${rows}</div>`;
  })();

  // ── BEST DAY TO PLAY ─────────────────────────────────────
  const bestDayHtml = (() => {
    const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const played = Array(7).fill(0), won = Array(7).fill(0);
    pdPlayerMs.forEach((m) => {
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
        <div style="flex:1;height:6px;background:rgba(255,255,255,0.07);border-radius:3px">
          <div style="height:100%;width:${wr}%;background:${col};border-radius:3px"></div>
        </div>
        <span style="font-size:10px;font-weight:800;color:${col};width:32px;text-align:right">${wr}%</span>
        <span style="font-size:9px;color:var(--muted);width:20px;text-align:right">${played[d]}g</span>
      </div>`;
    }).join("");
    if (!rows.replace(/\s/g, "")) return "";
    const best = DAY.reduce((b, _, d) => {
      if (played[d] < 2) return b;
      const wr = won[d] / played[d];
      return (b.d === undefined || wr > b.wr) ? { d, wr } : b;
    }, {});
    const chip = best.d !== undefined
      ? `<div style="margin-top:10px;padding:7px 10px;background:rgba(var(--theme-rgb),0.08);border:1px solid rgba(var(--theme-rgb),0.2);border-radius:8px;display:flex;align-items:center;gap:8px">
          <span style="font-size:18px">📅</span>
          <div><div style="font-size:8px;font-weight:800;color:var(--muted);letter-spacing:0.08em">BEST DAY TO PLAY</div>
          <div style="font-size:13px;font-weight:900;color:var(--accent)">${DAY[best.d]} <span style="font-size:10px;color:var(--green);font-weight:700">${Math.round(best.wr * 100)}% win rate</span></div></div>
        </div>`
      : "";
    return `<div class="ana-card"><span class="badge">Day of Week</span><div style="margin-top:8px">${rows}</div>${chip}</div>`;
  })();

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

    const elos = allCoords.map(c => c.elo);
    const pad = 18;
    const minE = Math.min(...elos) - pad, maxE = Math.max(...elos) + pad;
    const eRange = maxE - minE || 1;
    const W = 320, H = 88;
    const toX = i => ((i / (allCoords.length - 1)) * W).toFixed(1);
    const toY = e => (H - ((e - minE) / eRange) * H).toFixed(1);

    const histPath = histPts.map((p, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(p.elo)}`).join(" ");
    const joinX = toX(HIST_SHOW - 1);
    const joinY = toY(histPts[histPts.length - 1].elo);
    const projCoords = allCoords.filter(c => c.proj);
    const projPath = `M${joinX},${joinY} ` + projCoords.map(c => `L${toX(c.i)},${toY(c.elo)}`).join(" ");

    const refY = toY(currentElo);
    const trendUp = avgDelta >= 0;
    const trendCol = trendUp ? "var(--green)" : "var(--red)";
    const trendLbl = trendUp ? "↑ CLIMBING" : "↓ DECLINING";

    const mkChip = n => {
      const proj = Math.round(currentElo + avgDelta * n);
      const d = proj - currentElo;
      const col = d >= 0 ? "var(--green)" : "var(--red)";
      return `<div class="elop-chip">
        <div class="elop-chip-n">+${n}</div>
        <div class="elop-chip-elo">${proj}</div>
        <div class="elop-chip-d" style="color:${col}">${d >= 0 ? "+" : ""}${d}</div>
      </div>`;
    };

    const markerDots = [10, 20, 30].map(n => {
      const coord = allCoords[HIST_SHOW - 1 + n];
      if (!coord) return "";
      return `<circle cx="${toX(coord.i)}" cy="${toY(coord.elo)}" r="3.5" fill="${trendCol}" stroke="var(--bg-card,#0c0c16)" stroke-width="1.5"/>`;
    }).join("");

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
    const bars = entries.map(([score, count]) => {
      const [own] = score.split("–").map(Number);
      const isWin = own > (parseInt(score.split("–")[1], 10));
      const pct = Math.round((count / maxCount) * 100);
      const col = isWin ? "var(--green)" : "var(--red)";
      return `<div class="sd-row">
        <div class="sd-label ${isWin ? 'p' : 'n'}">${score}</div>
        <div class="sd-bar-wrap"><div class="sd-bar" style="width:${pct}%;background:${col}"></div></div>
        <div class="sd-count">${count}</div>
      </div>`;
    }).join("");
    return `<div class="ana-card"><span class="badge">Score Distribution</span><div style="margin-top:8px">${bars}</div></div>`;
  })();

  // ── PERSONAL RECORDS CAREER HIGHS ────────────────────────
  const personalRecordsHtml = (() => {
    if (!pdPlayerMs.length) return "";
    let biggestWin2 = null, biggestWinM = 0;
    let worstLoss2 = null, worstLossM = 0;
    let longestWS = 0, longestLS = 0, curWS = 0, curLS = 0;
    const byDate2 = {};
    pdPlayerMs.forEach((m) => {
      const inA7 = (m.teamA || []).includes(name);
      const own7 = inA7 ? m.scoreA : m.scoreB;
      const opp7 = inA7 ? m.scoreB : m.scoreA;
      const won7 = own7 > opp7;
      const margin7 = own7 - opp7;
      if (won7 && margin7 > biggestWinM) { biggestWinM = margin7; biggestWin2 = `${own7}–${opp7}`; }
      if (!won7 && -margin7 > worstLossM) { worstLossM = -margin7; worstLoss2 = `${own7}–${opp7}`; }
      if (won7) { curWS++; curLS = 0; if (curWS > longestWS) longestWS = curWS; }
      else { curLS++; curWS = 0; if (curLS > longestLS) longestLS = curLS; }
      if (!m.date) return;
      if (!byDate2[m.date]) byDate2[m.date] = { w: 0, p: 0 };
      byDate2[m.date].p++;
      if (won7) byDate2[m.date].w++;
    });
    const bestDay2 = Object.entries(byDate2).sort((a, b) => b[1].w - a[1].w || b[1].p - a[1].p)[0];
    const peakEloVal = _memoEloPeaks()[name] || playerElo;
    return `<div class="ana-card"><span class="badge">Career Highs</span><div class="det-streak-row" style="flex-wrap:wrap;gap:10px;margin-top:8px"><div class="det-streak-cell"><div class="det-streak-val" style="color:var(--green)">${biggestWin2 || "—"}</div><div class="sub">Best Win</div></div><div class="det-streak-div"></div><div class="det-streak-cell"><div class="det-streak-val" style="color:var(--red)">${worstLoss2 || "—"}</div><div class="sub">Worst Loss</div></div><div class="det-streak-div"></div><div class="det-streak-cell"><div class="det-streak-val" style="color:var(--green)">${longestWS}W</div><div class="sub">Best Streak</div></div><div class="det-streak-div"></div><div class="det-streak-cell"><div class="det-streak-val" style="color:var(--gold)">${peakEloVal}</div><div class="sub">Peak ELO</div></div>${bestDay2 ? `<div class="det-streak-div"></div><div class="det-streak-cell"><div class="det-streak-val">${bestDay2[1].w}W/${bestDay2[1].p}</div><div class="sub">Best Day</div></div>` : ""}</div></div>`;
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
    const moN4 = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const pts2 = moKeys.map((mo, i) => ({
      mo, pct: moMap2[mo].p ? (moMap2[mo].w / moMap2[mo].p) * 100 : 0, i
    }));
    const W2 = 300, H2 = 70, pl2 = 8, pr2 = 8, pt3 = 8, pb2 = 18, cW2 = W2 - pl2 - pr2, cH2 = H2 - pt3 - pb2;
    const toX3 = (i) => pl2 + (i / (pts2.length - 1 || 1)) * cW2;
    const toY3 = (v) => pt3 + (1 - v / 100) * cH2;
    const col2 = playerColor(name);
    const polyline3 = pts2.map((p) => `${toX3(p.i).toFixed(1)},${toY3(p.pct).toFixed(1)}`).join(" ");
    const circles3 = pts2.map((p) => {
      const c = p.pct >= 60 ? "var(--green)" : p.pct <= 40 ? "var(--red)" : "var(--gold)";
      return `<circle cx="${toX3(p.i).toFixed(1)}" cy="${toY3(p.pct).toFixed(1)}" r="2.5" fill="${c}"><title>${p.mo}: ${p.pct.toFixed(0)}%</title></circle>`;
    }).join("");
    const xLbls2 = pts2.map((p) => `<text x="${toX3(p.i).toFixed(1)}" y="${H2 - 3}" text-anchor="middle" font-size="7" fill="rgba(255,255,255,0.35)">${moN4[parseInt(p.mo.slice(5))]}</text>`).join("");
    const area2 = `M${toX3(0).toFixed(1)},${(H2 - pb2).toFixed(1)} ` + pts2.map((p) => `L${toX3(p.i).toFixed(1)},${toY3(p.pct).toFixed(1)}`).join(" ") + ` L${toX3(pts2.length-1).toFixed(1)},${(H2-pb2).toFixed(1)} Z`;
    return `<div class="ana-card"><span class="badge">Monthly Win Rate</span><div style="overflow-x:auto;margin-top:8px"><svg viewBox="0 0 ${W2} ${H2}" width="100%" style="max-width:${W2}px;display:block;overflow:visible"><defs><linearGradient id="mwrg_${name.replace(/\s/g,"")}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${col2}" stop-opacity="0.2"/><stop offset="100%" stop-color="${col2}" stop-opacity="0"/></linearGradient></defs><path d="${area2}" fill="url(#mwrg_${name.replace(/\s/g,"")})"/><polyline points="${polyline3}" fill="none" stroke="${col2}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${circles3}${xLbls2}</svg></div></div>`;
  })();

  // ── STRENGTHS / WEAKNESSES TAGS ───────────────────────────
  const strengthTagsHtml = (() => {
    const tags = [];
    if (s.winPct >= 65) tags.push({ t: "💪 Consistent Winner", c: "var(--green)" });
    else if (s.winPct <= 35) tags.push({ t: "📈 Room to Grow", c: "var(--muted)" });
    if (form && form.momentumLabel === "RISING") tags.push({ t: "🔥 On the Rise", c: "var(--accent)" });
    else if (form && form.momentumLabel === "DECLINING") tags.push({ t: "📉 Declining Form", c: "var(--red)" });
    if (closePlayed >= 3 && clutchPct > 60) tags.push({ t: "⚔️ Clutch Performer", c: "var(--green)" });
    else if (closePlayed >= 3 && clutchPct < 40) tags.push({ t: "😰 Struggles in Close Matches", c: "var(--red)" });
    const allStats2 = computeStats(activeMatches(), _memoElo());
    const ps2 = allStats2.find((p) => p.name === name);
    if (ps2?.avgMargin > 2) tags.push({ t: "💥 Dominant in wins", c: "var(--green)" });
    if (ps2?.consistency != null && ps2.consistency <= 2) tags.push({ t: "🪨 Rock Solid", c: "var(--gold)" });
    else if (ps2?.consistency != null && ps2.consistency >= 5) tags.push({ t: "🎲 Unpredictable", c: "var(--muted)" });
    if (tags.length === 0) return "";
    return `<div class="ana-card"><span class="badge">Profile Tags</span><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${tags.map((t) => `<span style="background:rgba(255,255,255,0.07);border-radius:20px;padding:4px 10px;font-size:10px;font-weight:700;color:${t.c}">${t.t}</span>`).join("")}</div></div>`;
  })();

  const html = `
          <div id="player-detail-modal">
            <div class="analytics-inner">
              <div class="analytics-header">
                <div class="analytics-title" style="display:flex;align-items:center;gap:10px"><div class="pd-av-wrap">${playerAvatar(name, 64)}</div><span>${escHtml(name)}</span></div>
                <button class="analytics-close" onclick="document.getElementById('player-detail-modal').remove()">✕</button>
              </div>
              <div class="analytics-cards">

                <div class="ana-card ov-card">
                  <div class="ov-header">
                    <div class="ov-sr-block">
                      <div class="ov-sr-val" id="pd-sr-val" data-final="${s.sr.toFixed(2)}">${s.sr.toFixed(2)}</div>
                      <div class="ov-sr-lbl">Skill Rating</div>
                      <div class="ov-sr-elo" style="font-size:11px;color:var(--muted);margin-top:2px">ELO <span id="pd-elo-val" data-final="${playerElo}" style="color:${eloChangeCol};font-weight:700">${playerElo}</span>${eloRank > 0 ? `<span style="margin-left:6px;font-size:9px;font-weight:800;letter-spacing:0.06em;color:var(--muted)">· #${eloRank} ELO RANK</span>` : ""}</div>
                    </div>
                    <div class="ov-record-block">
                      <div class="ov-record">${s.mw}<span class="ov-record-sep">W</span>${s.ml}<span class="ov-record-sep">L</span></div>
                      <div class="ov-win-pct">${s.winPct.toFixed(0)}% win rate · ${s.mp} played · ${daysPlayed} day${daysPlayed !== 1 ? "s" : ""}</div>
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
              <div class="analytics-cards">${recentMatchCards || '<div class="ana-card"><div class="sub">No matches yet.</div></div>'}</div>
            </div>
          </div>`;
  document.body.insertAdjacentHTML("beforeend", html);

  // Set stagger index for analyticsCardReveal animation in FULL mode
  document.querySelectorAll("#player-detail-modal .ana-card").forEach((card, i) => {
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
  [...allMatches]
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
              ${playerAvatar(a, 34)}
              <div class="h2h-hero-name">${a}</div>
              <div class="h2h-hero-wins" style="color:${col1}">${h2h.aWins}</div>
              <div class="h2h-hero-sub">${aWinPct}% win rate</div>
            </div>
            <div class="h2h-hero-center">
              <div class="h2h-vs-badge">VS</div>
              <div class="h2h-total-badge">${total}<br><span style="font-size:8px;font-weight:600;opacity:0.6">played</span></div>
            </div>
            <div class="h2h-hero-side h2h-hero-right" style="background:linear-gradient(225deg,${col2}18 0%,transparent 70%)">
              ${playerAvatar(b, 34)}
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
            ${recentCards || '<div style="color:var(--muted);padding:8px;font-size:11px">No matches yet.</div>'}
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

// 4D: Shareable Match Poster
function openShareMatchPoster(matchIdx) {
  document.getElementById("share-card-overlay")?.remove();
  const m = allMatches[matchIdx];
  if (!m) return;
  const _amSlice = activeMatches();
  const _upToIncl = new Set(allMatches.slice(0, matchIdx + 1));
  const _upToBefore = new Set(allMatches.slice(0, matchIdx));
  const eloMap = computeElo(_amSlice.filter(m => _upToIncl.has(m)));
  const eloMapBefore = computeElo(_amSlice.filter(m => _upToBefore.has(m)));
  const aWon = m.scoreA > m.scoreB;
  const winTeam = aWon ? m.teamA : m.teamB;
  const losTeam = aWon ? m.teamB : m.teamA;
  const winScore = aWon ? m.scoreA : m.scoreB;
  const losScore = aWon ? m.scoreB : m.scoreA;
  const allPlayers = [...(m.teamA || []), ...(m.teamB || [])];
  const colA = playerColor(m.teamA[0]);
  const colB = playerColor(m.teamB[0]);
  const winCol = aWon ? colA : colB;

  const mkAvatar = (name, size = 36) => {
    const c = playerColor(name);
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${c}33;border:2px solid ${c}66;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.35)}px;font-weight:900;color:${c}">${playerInitials(name)}</div>`;
  };
  const mkEloDelta = (name) => {
    const before = eloMapBefore[name] || 1000;
    const after = eloMap[name] || 1000;
    const d = Math.round(after - before);
    const col = d > 0 ? "#4ade80" : d < 0 ? "#f87171" : "rgba(255,255,255,0.4)";
    return `<span style="font-size:10px;font-weight:700;color:${col}">${d > 0 ? "+" : ""}${d}</span>`;
  };
  const mkTeamRow = (team) =>
    team
      .map(
        (p) =>
          `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      ${mkAvatar(p, 32)}
      <span style="font-size:13px;font-weight:800;color:#f0ecff">${p}</span>
      <span style="margin-left:auto">${mkEloDelta(p)}</span>
    </div>`,
      )
      .join("");

  const card = `
    <div style="background:linear-gradient(160deg,#0d0d1a 0%,#11111f 60%,#0a0a15 100%);border-radius:24px;border:1px solid rgba(255,255,255,0.08);padding:0;width:100%;max-width:340px;box-shadow:0 8px 60px rgba(0,0,0,0.7);position:relative;overflow:hidden">
      <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 20% 0%,${winCol}18 0%,transparent 55%);pointer-events:none"></div>
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,${winCol},transparent)"></div>

      <div style="padding:20px 20px 14px;text-align:center">
        <div style="font-size:9px;font-weight:800;letter-spacing:0.15em;color:var(--muted);margin-bottom:6px">MATCH RESULT · ${fmtDate(m.date)}</div>
        <div style="font-size:46px;font-weight:900;color:#f0ecff;letter-spacing:-0.03em;line-height:1">${winScore}<span style="font-size:28px;color:rgba(255,255,255,0.3)"> – </span>${losScore}</div>
        <div style="font-size:10px;color:${winCol};font-weight:800;letter-spacing:0.08em;margin-top:6px">🏆 ${winTeam.map((p) => p.split(" ")[0]).join(" & ")} WIN</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:1px solid rgba(255,255,255,0.06)">
        <div style="padding:14px 16px;border-right:1px solid rgba(255,255,255,0.06)">
          <div style="font-size:8px;font-weight:700;color:${aWon ? colA : "rgba(255,255,255,0.3)"};letter-spacing:0.1em;margin-bottom:8px">${aWon ? "🏆 WINNERS" : "TEAM A"}</div>
          ${mkTeamRow(m.teamA)}
        </div>
        <div style="padding:14px 16px">
          <div style="font-size:8px;font-weight:700;color:${!aWon ? colB : "rgba(255,255,255,0.3)"};letter-spacing:0.1em;margin-bottom:8px">${!aWon ? "🏆 WINNERS" : "TEAM B"}</div>
          ${mkTeamRow(m.teamB)}
        </div>
      </div>

      <div style="padding:10px 20px 16px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.05)">
        <div style="display:flex;align-items:center;gap:6px">
          <div style="width:16px;height:16px;border-radius:4px;background:${winCol};display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:900;color:#000">P</div>
          <div style="font-size:10px;font-weight:800;letter-spacing:0.08em;color:${winCol}">PADEL EKTA</div>
        </div>
        <div style="font-size:9px;color:rgba(255,255,255,0.2);font-weight:600">ELO changes shown</div>
      </div>
    </div>`;

  const overlay = document.createElement("div");
  overlay.id = "share-card-overlay";
  overlay.className = "share-overlay";
  overlay.innerHTML = `
    <div class="share-overlay-bg" onclick="document.getElementById('share-card-overlay').remove()"></div>
    <div class="share-overlay-inner">
      <div class="share-overlay-hint">📸 Screenshot to share</div>
      ${card}
      <button class="share-close-btn" onclick="document.getElementById('share-card-overlay').remove()">Close</button>
    </div>`;
  document.body.appendChild(overlay);
}

function _animEloCounts() {
  document
    .querySelectorAll(".elo-ba-a[data-from][data-to]")
    .forEach((el, i) => {
      const from = parseInt(el.dataset.from, 10);
      const to = parseInt(el.dataset.to, 10);
      if (from === to) return;
      const dur = 350;
      const delay = 350 + i * 60;
      setTimeout(() => {
        const startTime = performance.now();
        const tick = (now) => {
          const p = Math.min((now - startTime) / dur, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(from + (to - from) * ease);
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = to;
        };
        requestAnimationFrame(tick);
      }, delay);
    });
}

let _shareBlob = null, _shareLabel = "";

function openSummaryShare() {
  if (!window.html2canvas) { showToast("Capture not available", "❌"); return; }
  const askChoice = localStorage.getItem("screenshot_ask_choice") === "1";
  if (askChoice) {
    document.getElementById("screenshot-choice-overlay")?.classList.add("live-sheet-open");
    document.getElementById("screenshot-choice-sheet")?.classList.add("live-sheet-open");
  } else {
    // Default: TODAY → leaderboard + matches; all other filters → leaderboard only
    doSummaryScreenshot(cmpFilter === "today");
  }
}

function closeScreenshotChoiceSheet() {
  document.getElementById("screenshot-choice-overlay")?.classList.remove("live-sheet-open");
  document.getElementById("screenshot-choice-sheet")?.classList.remove("live-sheet-open");
}

async function doSummaryScreenshot(includeMatches) {
  closeScreenshotChoiceSheet();
  showToast("Capturing…", "📸");
  const captureEl = document.querySelector("#pg-compact .cmp-body-scroll");
  if (!captureEl) { showToast("No data to capture", "❌"); return; }

  // Flush staggered leaderboard rows if animation still in progress
  if (_cmpLeaderHtmls.length) {
    const tbody = document.getElementById("cmpBody");
    if (tbody) tbody.innerHTML = _cmpLeaderHtmls.join("");
  }
  // Flush SR pill counter animations to final values
  captureEl.querySelectorAll(".sr-pill-val[data-final]").forEach(el => {
    el.textContent = el.dataset.final;
  });

  // Always hide HIGHLIGHTS card
  const highlights = captureEl.querySelectorAll(".hist-summary-card");
  highlights.forEach(el => el.style.display = "none");

  // Optionally hide matches section
  const matchesHeader = captureEl.querySelector(".cmp-matches-header");
  const matchesBody = document.getElementById("cmpMatches");
  if (!includeMatches) {
    if (matchesHeader) matchesHeader.style.display = "none";
    if (matchesBody) matchesBody.style.display = "none";
  }

  const fnameMap = { all: "AllTime", today: "Today", week: "ThisWeek", lastweek: "LastWeek", weekend: "Weekend", month: "ThisMonth", range: "Custom" };
  _shareLabel = fnameMap[cmpFilter] || "Summary";
  const restore = () => {
    highlights.forEach(el => el.style.display = "");
    if (!includeMatches) {
      if (matchesHeader) matchesHeader.style.display = "";
      if (matchesBody) matchesBody.style.display = "";
    }
  };
  try {
    const canvas = await window.html2canvas(captureEl, {
      backgroundColor: "#030309",
      scale: 2,
      useCORS: true,
      allowTaint: true,
      height: captureEl.scrollHeight,
      windowHeight: captureEl.scrollHeight,
    });
    restore();
    canvas.toBlob((blob) => {
      _shareBlob = blob;
      const prevImg = document.getElementById("share-preview-img");
      if (prevImg.src.startsWith("blob:")) URL.revokeObjectURL(prevImg.src);
      prevImg.src = URL.createObjectURL(blob);
      document.getElementById("share-preview-sheet").classList.add("open");
    }, "image/png");
  } catch (e) {
    restore();
    showToast("Capture failed", "❌");
  }
}

function closeSharePreview() {
  const sheet = document.getElementById("share-preview-sheet");
  if (sheet) sheet.classList.remove("open");
  const img = document.getElementById("share-preview-img");
  if (img && img.src.startsWith("blob:")) { URL.revokeObjectURL(img.src); img.src = ""; }
  _shareBlob = null;
}

async function doShareWhatsApp() {
  if (!_shareBlob) return;
  const file = new File([_shareBlob], `EktaPadel-${_shareLabel}.png`, { type: "image/png" });
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: "Ekta Padel", text: `${_shareLabel} Leaderboard` }).catch(() => {});
  } else {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(_shareBlob);
    a.download = `EktaPadel-${_shareLabel}.png`;
    a.click();
    showToast("Saved! Open WhatsApp and send from gallery.", "💬");
  }
  closeSharePreview();
}

function doShareDownload() {
  if (!_shareBlob) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(_shareBlob);
  a.download = `EktaPadel-${_shareLabel}.png`;
  a.click();
  closeSharePreview();
}

function openSummaryScreenshot() {
  const leaderTableEl = document.querySelector(".cmp-body-scroll .cmp");
  if (!leaderTableEl) {
    showToast("No data to capture", "❌");
    return;
  }

  // Flush any in-progress staggered animation: instantly write all rows to the DOM
  if (_cmpLeaderHtmls.length) {
    const tbody = document.getElementById("cmpBody");
    if (tbody) tbody.innerHTML = _cmpLeaderHtmls.join("");
  }
  if (_cmpFiltered.length !== undefined) {
    const cmpMatchesEl = document.getElementById("cmpMatches");
    if (cmpMatchesEl) {
      cmpMatchesEl.innerHTML =
        buildCompactMatchRows(_cmpFiltered) +
        buildHistorySummary(_cmpFiltered, cmpFilter);
    }
  }

  const fname = {
    all: "All Time",
    today: "Today",
    week: "This Week",
    lastweek: "Last Week",
    weekend: "Weekend",
    month: "This Month",
    range: "Custom Range",
  };
  const filterLabel = (fname[cmpFilter] || "Summary").toUpperCase();

  // Clone leaderboard — strip interactivity & sort arrows
  const leaderClone = leaderTableEl.cloneNode(true);
  leaderClone
    .querySelectorAll("[onclick]")
    .forEach((el) => el.removeAttribute("onclick"));
  leaderClone.querySelectorAll(".sort-arrow").forEach((el) => el.remove());
  // Flush SR pill values to their final number (they start at 0.00 before animation)
  leaderClone.querySelectorAll(".sr-pill-val[data-final]").forEach((el) => {
    el.textContent = el.dataset.final;
  });

  // Clone matches
  const matchTableEl = document.querySelector("#cmpMatches .cmp-match-rows");
  let matchHtml = "";
  if (matchTableEl) {
    const matchClone = matchTableEl.cloneNode(true);
    matchClone
      .querySelectorAll("[onclick]")
      .forEach((el) => el.removeAttribute("onclick"));
    matchHtml = `
      <div class="snap-section-hdr">MATCHES PLAYED</div>
      <div class="snap-full-row">${matchClone.outerHTML}</div>`;
  }

  // Populate snapshot page
  const _snapDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  document.getElementById("snap-content").innerHTML = `
    <div class="snap-brand-bar">
      <span class="snap-brand-name">🎾 EKTA PADEL</span>
      <span class="snap-brand-sub">${_snapDate}</span>
    </div>
    <div class="snap-section-hdr snap-section-hdr-row">
      <span>PLAYER LEADERBOARD</span>
      <span class="ss-card-badge">${filterLabel}</span>
    </div>
    <div class="snap-full-row">${leaderClone.outerHTML}</div>
    ${matchHtml}`;

  // Navigate to snapshot page
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("pg-snapshot").classList.add("active");
  document.getElementById("pg-snapshot").scrollTop = 0;
  document.getElementById("fab").style.display = "none";
}

function closeSnapshot() {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("pg-compact").classList.add("active");
  renderCompact();
}

async function shareSnapshot() {
  if (!window.html2canvas) { showToast("Capture not available", "❌"); return; }
  showToast("Capturing…", "📸");
  const snapEl = document.getElementById("snap-content");
  if (!snapEl) return;
  const fnameMap = { all: "AllTime", today: "Today", week: "ThisWeek", lastweek: "LastWeek", weekend: "Weekend", month: "ThisMonth", range: "Custom" };
  _shareLabel = fnameMap[cmpFilter] || "Summary";
  try {
    const canvas = await window.html2canvas(snapEl, {
      backgroundColor: "#030309",
      scale: 2,
      useCORS: true,
      allowTaint: true,
      height: snapEl.scrollHeight,
      windowHeight: snapEl.scrollHeight,
    });
    canvas.toBlob((blob) => {
      _shareBlob = blob;
      const prevImg = document.getElementById("share-preview-img");
      if (prevImg.src.startsWith("blob:")) URL.revokeObjectURL(prevImg.src);
      prevImg.src = URL.createObjectURL(blob);
      document.getElementById("share-preview-sheet").classList.add("open");
    }, "image/png");
  } catch (e) {
    showToast("Capture failed", "❌");
  }
}

function openShareCard(name) {
  document.getElementById("share-card-overlay")?.remove();
  const detail = getPlayerDetail(name);
  if (!detail.stats) return;
  const s = detail.stats;
  const eloMap = _memoElo();
  const elo = Math.round(eloMap[name] || 1000);
  const col = playerColor(name);

  const streakIcon = s.curStreak > 0 ? (s.curType === "W" ? "🔥" : "❄️") : "";
  const streakStr =
    s.curStreak > 0 ? `${streakIcon} ${s.curStreak}${s.curType}` : "—";
  const marginStr =
    s.avgMargin >= 0 ? `+${s.avgMargin.toFixed(1)}` : s.avgMargin.toFixed(1);
  const marginColor =
    s.avgMargin > 0 ? "#36d47e" : s.avgMargin < 0 ? "#f04f4f" : "#60607a";

  const formDots = s.form
    .slice(-10)
    .map(
      (r) =>
        `<span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;font-size:10px;font-weight:900;background:${r === "W" ? "rgba(54,212,126,0.15)" : "rgba(240,79,79,0.15)"};border:1px solid ${r === "W" ? "rgba(54,212,126,0.35)" : "rgba(240,79,79,0.35)"};color:${r === "W" ? "#36d47e" : "#f04f4f"}">${r}</span>`,
    )
    .join("");

  const allRanked = computeStats(activeMatches(), eloMap);
  const rank = allRanked.findIndex((p) => p.name === name) + 1;

  const bigStat = (val, lbl, color = "#eeeae4") =>
    `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;padding:14px 6px">
      <div style="font-size:26px;font-weight:900;color:${color};letter-spacing:-0.02em;line-height:1">${val}</div>
      <div style="font-size:9px;font-weight:700;color:#4a4a6a;text-transform:uppercase;letter-spacing:0.1em">${lbl}</div>
    </div>`;
  const miniStat = (val, lbl, color = "#ccc8e8") =>
    `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex:1;padding:10px 4px">
      <div style="font-size:16px;font-weight:800;color:${color};line-height:1">${val}</div>
      <div style="font-size:8px;font-weight:700;color:#4a4a6a;text-transform:uppercase;letter-spacing:0.08em;text-align:center">${lbl}</div>
    </div>`;
  const vDiv = (h = 32) =>
    `<div style="width:1px;height:${h}px;background:rgba(255,255,255,0.07);align-self:center"></div>`;

  const card = `
    <div style="background:linear-gradient(160deg,#0d0d1a 0%,#11111f 60%,#0a0a15 100%);border-radius:24px;border:1px solid rgba(255,255,255,0.08);padding:0;width:100%;max-width:340px;box-shadow:0 8px 60px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.04);position:relative;overflow:hidden">

      <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 15% 10%,${col}22 0%,transparent 55%);pointer-events:none"></div>
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,${col},transparent)"></div>

      <div style="padding:24px 22px 18px;display:flex;align-items:center;gap:16px">
        <div style="position:relative;flex-shrink:0">
          <div style="width:68px;height:68px;border-radius:50%;background:${col}22;border:2px solid ${col}55;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;color:${col};letter-spacing:-0.02em">${playerInitials(name)}</div>
          <div style="position:absolute;inset:-3px;border-radius:50%;border:1.5px solid ${col}33;pointer-events:none"></div>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:22px;font-weight:900;color:#f0ecff;letter-spacing:-0.01em;line-height:1.1">${name}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
            <span style="background:${col}22;color:${col};font-size:10px;font-weight:800;padding:3px 8px;border-radius:20px;border:1px solid ${col}44;letter-spacing:0.04em">#${rank} RANK</span>
            <span style="color:#4a4a6a;font-size:10px;font-weight:600">${elo} ELO</span>
          </div>
        </div>
      </div>

      <div style="margin:0 16px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:14px;display:flex;align-items:stretch">
        ${bigStat(`${s.mw}W–${s.ml}L`, "Record")}
        ${vDiv(40)}
        ${bigStat(`${s.winPct.toFixed(0)}%`, "Win Rate", s.winPct >= 50 ? "#36d47e" : "#f04f4f")}
        ${vDiv(40)}
        ${bigStat(s.sr.toFixed(2), "Skill Rating", col)}
      </div>

      <div style="margin:0 16px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:14px;display:flex;align-items:stretch">
        ${miniStat(s.mp, "Matches")}
        ${vDiv(24)}
        ${miniStat(detail.maxWinStreak || 0, "Best Streak")}
        ${vDiv(24)}
        ${miniStat(streakStr, "Current")}
        ${vDiv(24)}
        ${miniStat(marginStr, "Avg Margin", marginColor)}
        ${vDiv(24)}
        ${miniStat(`${s.consistency?.toFixed(0) ?? "—"}%`, "Consist.")}
      </div>

      ${
        s.form.length
          ? `
      <div style="margin:0 16px 18px">
        <div style="font-size:8px;font-weight:800;color:#4a4a6a;letter-spacing:0.12em;margin-bottom:8px;text-transform:uppercase">Recent Form</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap">${formDots}</div>
      </div>`
          : ""
      }

      <div style="margin:0 16px 20px;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)"></div>
      <div style="padding:0 22px 20px;display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:6px">
          <div style="width:18px;height:18px;border-radius:5px;background:${col};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;color:#000">P</div>
          <div style="font-size:11px;font-weight:800;letter-spacing:0.08em;color:${col}">PADEL EKTA</div>
        </div>
        <div style="font-size:9px;color:#3a3a5a;font-weight:600;letter-spacing:0.04em">${todayISO()}</div>
      </div>
    </div>`;

  const overlay = document.createElement("div");
  overlay.id = "share-card-overlay";
  overlay.className = "share-overlay";
  overlay.innerHTML = `
    <div class="share-overlay-bg" onclick="document.getElementById('share-card-overlay').remove()"></div>
    <div class="share-overlay-inner">
      <div class="share-overlay-hint">📸 Screenshot to share</div>
      ${card}
      <button class="share-close-btn" onclick="document.getElementById('share-card-overlay').remove()">Close</button>
    </div>`;
  document.body.appendChild(overlay);
}

let _digestFilter = "week";
let _digestPlayer = "";

function _digestMatches(filter, player) {
  const today = todayISO();
  const { from: wkFrom, to: wkTo } = lastWeekRange();
  const { from: mFrom } = (() => {
    const d = new Date();
    d.setDate(1);
    return { from: toLocalISODate(d) };
  })();
  const _amDig = activeMatches();
  let base;
  if (filter === "week") {
    const wStart = weekISO();
    base = _amDig.filter(
      (m) => (m.date || "") >= wStart && (m.date || "") <= today,
    );
    if (base.length < 2)
      base = _amDig.filter(
        (m) => (m.date || "") >= wkFrom && (m.date || "") <= wkTo,
      );
  } else if (filter === "lastweek") {
    base = _amDig.filter(
      (m) => (m.date || "") >= wkFrom && (m.date || "") <= wkTo,
    );
  } else if (filter === "month") {
    base = _amDig.filter(
      (m) => (m.date || "") >= mFrom && (m.date || "") <= today,
    );
  } else {
    base = _amDig;
  }
  if (player)
    base = base.filter((m) =>
      [...(m.teamA || []), ...(m.teamB || [])].includes(player),
    );
  return base;
}

function _buildDigestContent(filter, player) {
  const ms = _digestMatches(filter, player);
  const accentCol = "var(--theme)";
  if (ms.length < 2)
    return `<div class="sub" style="padding:16px;text-align:center">Not enough matches for selected filter.</div>`;
  const eloNow = _memoElo();
  const eloAt = computeElo(
    activeMatches().filter((m) => {
      const base =
        filter === "week"
          ? weekISO()
          : filter === "lastweek"
            ? lastWeekRange().from
            : filter === "month"
              ? (() => {
                  const d = new Date();
                  d.setDate(1);
                  return toLocalISODate(d);
                })()
              : "0000-00-00";
      return (m.date || "") < base;
    }),
  );
  const stats = computeStats(ms, computeElo(ms));
  const topWinner = [...stats].sort((a, b) => b.mw - a.mw)[0];
  const mover = Object.keys(eloNow)
    .map((p) => ({ name: p, gain: (eloNow[p] || 1000) - (eloAt[p] || 1000) }))
    .filter((p) =>
      ms.some((m) => [...(m.teamA || []), ...(m.teamB || [])].includes(p.name)),
    )
    .sort((a, b) => b.gain - a.gain)[0];
  const hotPlayer = stats
    .filter((p) => p.curType === "W" && p.curStreak >= 2)
    .sort((a, b) => b.curStreak - a.curStreak)[0];
  const wkPairs = getPairStats(ms).filter((p) => p.played >= 2)[0];
  const players = [
    ...new Set(ms.flatMap((m) => [...(m.teamA || []), ...(m.teamB || [])])),
  ];
  const labelMap = {
    week: "This Week",
    lastweek: "Last Week",
    month: "This Month",
    all: "All Time",
  };
  const statRow = (icon, lbl, val, sub) =>
    `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
      <div style="font-size:20px;width:28px;text-align:center;flex-shrink:0">${icon}</div>
      <div style="flex:1;min-width:0"><div style="font-size:10px;font-weight:700;color:var(--muted);letter-spacing:0.06em;text-transform:uppercase">${lbl}</div><div style="font-size:13px;font-weight:900;color:var(--text);margin-top:1px">${val || "—"}</div></div>
      <div style="font-size:10px;color:var(--muted);text-align:right;flex-shrink:0">${sub || ""}</div>
    </div>`;
  return `<div style="padding:0">
    <div style="font-size:11px;color:var(--muted);margin-bottom:10px">${ms.length} matches · ${players.length} players${player ? ` · ${player}` : ""}</div>
    ${topWinner ? statRow("🏆", "Most Wins", topWinner.name, `${topWinner.mw}W–${topWinner.ml}L`) : ""}
    ${mover ? statRow("⚡", "Biggest ELO Gain", mover.name, `+${mover.gain > 0 ? mover.gain : 0}`) : ""}
    ${hotPlayer ? statRow("🔥", "Hot Streak", hotPlayer.name, `${hotPlayer.curStreak} in a row`) : ""}
    ${wkPairs ? statRow("🤝", "Best Pair", wkPairs.players.join(" & "), `${wkPairs.wins}W ${wkPairs.winPct}%`) : ""}
    ${stats[0] ? statRow("📊", "Top Performer", stats[0].name, `SR ${stats[0].sr.toFixed(2)}`) : ""}
  </div>`;
}

function renderDigestCard(filter, player) {
  _digestFilter = filter || _digestFilter;
  _digestPlayer = player !== undefined ? player : _digestPlayer;
  const content = document.getElementById("digest-content");
  if (content)
    content.innerHTML = _buildDigestContent(_digestFilter, _digestPlayer);
  // Update active filter button
  document
    .querySelectorAll(".digest-filter-btn")
    .forEach((b) =>
      b.classList.toggle("active", b.dataset.f === _digestFilter),
    );
  // Update player label
  const lbl = document.getElementById("digest-player-label");
  if (lbl) lbl.textContent = _digestPlayer || "ALL PLAYERS";
  const btn = document.getElementById("digest-player-btn");
  if (btn) btn.classList.toggle("filter-fab-active", !!_digestPlayer);
}

function openDigestPlayerSheet() {
  _filterSheetMode = "digestplayer";
  const el = document.getElementById("filter-sheet-title");
  if (el) el.textContent = "SELECT PLAYER";
  const list = document.getElementById("filter-sheet-list");
  if (!list) return;
  const players = sortPlayersGuestsLast(computeStats(activeMatches()).map((s) => s.name));
  list.innerHTML =
    `<div class="live-sheet-item" onclick="selectFilterItem('')"><div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--muted)">ALL</div><span>All Players</span></div>` +
    players
      .map(
        (p) =>
          `<div class="live-sheet-item" onclick="selectFilterItem(${jsArg(p)})">${sheetAvSm(p)}<span>${escHtml(p)}</span></div>`,
      )
      .join("");
  const overlay = document.getElementById("filter-sheet-overlay");
  const sheet = document.getElementById("filter-sheet");
  if (overlay) overlay.classList.add("live-sheet-open");
  if (sheet) sheet.classList.add("live-sheet-open");
}

function openWeeklyDigest() {
  document.getElementById("share-card-overlay")?.remove();
  const { from: wkFrom, to: wkTo } = lastWeekRange();
  const _amWk = activeMatches();
  const wkMatches = _amWk.filter(
    (m) => (m.date || "") >= wkFrom && (m.date || "") <= wkTo,
  );
  const thisWkMatches = _amWk.filter(
    (m) => (m.date || "") >= weekISO() && (m.date || "") <= todayISO(),
  );
  const useMatches = thisWkMatches.length >= 3 ? thisWkMatches : wkMatches;
  const label = thisWkMatches.length >= 3 ? "This Week" : "Last Week";
  if (useMatches.length < 2) {
    showToast("Not enough matches this week yet", "📋");
    return;
  }

  const eloNow = computeElo(_amWk);
  const eloPre = computeElo(
    _amWk.filter(
      (m) => (m.date || "") < (thisWkMatches.length >= 3 ? weekISO() : wkFrom),
    ),
  );
  const stats = computeStats(useMatches, computeElo(useMatches));

  // Most wins
  const topWinner = [...stats].sort((a, b) => b.mw - a.mw)[0];
  // Biggest ELO mover
  const mover = Object.keys(eloNow)
    .map((p) => ({ name: p, gain: (eloNow[p] || 1000) - (eloPre[p] || 1000) }))
    .filter((p) =>
      useMatches.some((m) =>
        [...(m.teamA || []), ...(m.teamB || [])].includes(p.name),
      ),
    )
    .sort((a, b) => b.gain - a.gain)[0];
  // Biggest upset
  const runElo2 = {};
  let biggestUpset = null;
  [...allMatches]
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .forEach((m) => {
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
        if (!(p in runElo2)) runElo2[p] = 1000;
      });
      const avgA =
        m.teamA.reduce((s, p) => s + runElo2[p], 0) /
        Math.max(m.teamA.length, 1);
      const avgB =
        m.teamB.reduce((s, p) => s + runElo2[p], 0) /
        Math.max(m.teamB.length, 1);
      const aWon = m.scoreA > m.scoreB;
      const gap = aWon ? avgB - avgA : avgA - avgB;
      if (
        useMatches.includes(m) &&
        gap > 30 &&
        (!biggestUpset || gap > biggestUpset.gap)
      ) {
        biggestUpset = {
          m,
          gap: Math.round(gap),
          winner: aWon ? m.teamA : m.teamB,
          loser: aWon ? m.teamB : m.teamA,
        };
      }
      const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
      const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
      const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
      m.teamA.forEach((p) => {
        runElo2[p] = (runElo2[p] || 1000) + dA;
      });
      m.teamB.forEach((p) => {
        runElo2[p] = (runElo2[p] || 1000) + dB;
      });
    });
  // Best pair
  const wkPairs = getPairStats(useMatches).filter((p) => p.played >= 2)[0];
  // Hot streak player
  const hotPlayer = stats
    .filter((p) => p.curType === "W" && p.curStreak >= 2)
    .sort((a, b) => b.curStreak - a.curStreak)[0];

  const accentCol = "#18d7ff";
  const statRow = (icon, label2, val, sub) =>
    `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
      <div style="font-size:20px;width:28px;text-align:center;flex-shrink:0">${icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:10px;font-weight:700;color:#4a4a6a;letter-spacing:0.06em;text-transform:uppercase">${label2}</div>
        <div style="font-size:13px;font-weight:900;color:#eeeae4;margin-top:1px">${val}</div>
      </div>
      <div style="font-size:10px;color:#4a4a6a;text-align:right;flex-shrink:0">${sub}</div>
    </div>`;

  const card = `
    <div style="background:linear-gradient(160deg,#0d0d1a,#11111f,#0a0a15);border-radius:24px;border:1px solid rgba(255,255,255,0.08);width:100%;max-width:340px;box-shadow:0 8px 60px rgba(0,0,0,0.7);position:relative;overflow:hidden">
      <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 20% 0%,${accentCol}18 0%,transparent 55%);pointer-events:none"></div>
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,${accentCol},transparent)"></div>
      <div style="padding:20px 22px 16px">
        <div style="font-size:10px;font-weight:800;color:${accentCol};letter-spacing:0.14em;margin-bottom:4px">WEEKLY DIGEST</div>
        <div style="font-size:20px;font-weight:900;color:#f0ecff;line-height:1.1">${label}</div>
        <div style="font-size:11px;color:#4a4a6a;margin-top:4px">${useMatches.length} matches · ${[...new Set(useMatches.flatMap((m) => [...m.teamA, ...m.teamB]))].length} players</div>
      </div>
      <div style="margin:0 16px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:4px 12px">
        ${topWinner ? statRow("🏆", "Top Winner", topWinner.name, `${topWinner.mw}W–${topWinner.ml}L`) : ""}
        ${mover && mover.gain > 0 ? statRow("📈", "Biggest Mover", mover.name, `+${mover.gain} ELO`) : ""}
        ${hotPlayer ? statRow("🔥", "On Fire", hotPlayer.name, `${hotPlayer.curStreak}-match win streak`) : ""}
        ${wkPairs ? statRow("🤝", "Best Duo", wkPairs.key, `${wkPairs.winPct}% · ${wkPairs.played}g`) : ""}
        ${biggestUpset ? statRow("⚡", "Biggest Upset", biggestUpset.winner.map((p) => p.split(" ")[0]).join(" & ") + " won", `+${biggestUpset.gap} ELO gap`) : ""}
      </div>
      <div style="margin:0 16px 20px;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)"></div>
      <div style="padding:0 22px 20px;display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:6px">
          <div style="width:18px;height:18px;border-radius:5px;background:${accentCol};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;color:#000">P</div>
          <div style="font-size:11px;font-weight:800;letter-spacing:0.08em;color:${accentCol}">PADEL EKTA</div>
        </div>
        <div style="font-size:9px;color:#3a3a5a;font-weight:600">${todayISO()}</div>
      </div>
    </div>`;

  const shareLines = [
    `PADEL EKTA — ${label} Digest`,
    `${useMatches.length} matches played`,
    topWinner
      ? `🏆 Top Winner: ${topWinner.name} (${topWinner.mw}W–${topWinner.ml}L)`
      : "",
    mover && mover.gain > 0
      ? `📈 Biggest Mover: ${mover.name} (+${mover.gain} ELO)`
      : "",
    hotPlayer
      ? `🔥 On Fire: ${hotPlayer.name} (${hotPlayer.curStreak}-match streak)`
      : "",
    wkPairs ? `🤝 Best Duo: ${wkPairs.key} (${wkPairs.winPct}%)` : "",
    biggestUpset
      ? `⚡ Biggest Upset: ${biggestUpset.winner.map((p) => p.split(" ")[0]).join(" & ")} (+${biggestUpset.gap} ELO gap)`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  window._shareDigest = () => {
    if (navigator.share) {
      navigator
        .share({ title: "Padel Ekta Weekly Digest", text: shareLines })
        .catch(() => {});
    } else {
      navigator.clipboard
        ?.writeText(shareLines)
        .then(() => showToast("Copied to clipboard!", "📋"))
        .catch(() => showToast("Screenshot to share", "📸"));
    }
  };

  const overlay = document.createElement("div");
  overlay.id = "share-card-overlay";
  overlay.className = "share-overlay";
  overlay.innerHTML = `
    <div class="share-overlay-bg" onclick="document.getElementById('share-card-overlay').remove()"></div>
    <div class="share-overlay-inner">
      <div class="share-overlay-hint">📸 Screenshot or share</div>
      ${card}
      <div style="display:flex;gap:8px;width:100%;max-width:340px">
        <button class="share-close-btn" style="flex:1" onclick="document.getElementById('share-card-overlay').remove()">Close</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function _pairsHeaderHtml() {
  const arrow = (col) => {
    if (_pairSort.key !== col)
      return '<span style="opacity:0.25;font-size:7px;margin-left:2px">◇</span>';
    return `<span style="font-size:7px;margin-left:2px">${_pairSort.dir < 0 ? "▼" : "▲"}</span>`;
  };
  return `<div class="chem-header">
    <div class="chem-rank">RANK</div>
    <div class="chem-elo-rank chem-sort-hd" onclick="sortPairsBy('eloRank')">ELO${arrow("eloRank")}</div>
    <div class="chem-names chem-sort-hd" onclick="sortPairsBy('name')">PAIR${arrow("name")}</div>
    <div class="chem-wl chem-sort-hd" onclick="sortPairsBy('wins')">W–L${arrow("wins")}</div>
    <div class="chem-bar-wrap"></div>
    <div class="chem-pct chem-sort-hd" onclick="sortPairsBy('winPct')">WIN%${arrow("winPct")}</div>
    <div class="chem-played chem-sort-hd" onclick="sortPairsBy('played')">GP${arrow("played")}</div>
    <div class="pair-chem-badge chem-sort-hd" onclick="sortPairsBy('chem')">⚡${arrow("chem")}</div>
  </div>`;
}

const PAIRS_PAGE_LIMIT = 15;
function _pairsSortedRows() {
  const { key, dir } = _pairSort;
  const sorted = [..._pairsData].sort((a, b) => {
    let av, bv;
    if (key === "name") {
      av = a.key;
      bv = b.key;
    } else if (key === "wins") {
      av = a.wins;
      bv = b.wins;
    } else if (key === "winPct") {
      av = a.wins / a.played;
      bv = b.wins / b.played;
    } else if (key === "played") {
      av = a.played;
      bv = b.played;
    } else if (key === "eloRank") {
      av = a.eloRank;
      bv = b.eloRank;
    } else if (key === "chem") {
      av = a.chem;
      bv = b.chem;
    } else {
      av = a.wins / a.played;
      bv = b.wins / b.played;
    }
    if (typeof av === "string") return dir * av.localeCompare(bv);
    if (av !== bv) return dir < 0 ? bv - av : av - bv;
    return b.played - a.played;
  });
  const toShow = _pairsShowAll ? sorted : sorted.slice(0, PAIRS_PAGE_LIMIT);
  const moreCount = sorted.length - PAIRS_PAGE_LIMIT;
  const rowsHtml = toShow
    .map((p, i) => {
      const pc = Math.round((p.wins / p.played) * 100);
      const col =
        pc >= 60 ? "var(--green)" : pc <= 40 ? "var(--red)" : "var(--text)";
      const chemCol =
        p.chem >= 70
          ? "var(--green)"
          : p.chem >= 45
            ? "var(--text)"
            : "var(--muted)";
      const eloRankHtml =
        p.eloRank < 9999
          ? `<div class="chem-elo-rank" style="color:${p.eloRank <= 3 ? "var(--accent)" : "var(--muted)"}">#${p.eloRank}</div>`
          : `<div class="chem-elo-rank">—</div>`;
      return `<div class="chem-row" style="cursor:pointer" onclick="openPairDetail(${jsArg(p.key)})"><div class="chem-rank">#${i + 1}</div>${eloRankHtml}<div class="chem-names">${escHtml(p.players.join(" & "))}</div><div class="chem-wl">${p.wins}–${p.played - p.wins}</div><div class="chem-bar-wrap"><div class="chem-bar" style="width:${pc}%;background:${col}"></div></div><div class="chem-pct" style="color:${col}">${pc}%</div><div class="chem-played">${p.played}g</div><div class="pair-chem-badge" style="color:${chemCol}">⚡${p.chem}</div></div>`;
    })
    .join("");
  const showMoreHtml =
    !_pairsShowAll && moreCount > 0
      ? `<div onclick="_showAllPairs()" style="text-align:center;padding:10px;font-size:11px;font-weight:700;color:var(--theme);cursor:pointer;border-top:1px solid var(--border)">SHOW ${moreCount} MORE ▼</div>`
      : "";
  return rowsHtml + showMoreHtml;
}
function _showAllPairs() {
  _pairsShowAll = true;
  const el = document.getElementById("all-pairs-table");
  if (el) el.innerHTML = _pairsHeaderHtml() + _pairsSortedRows();
}

function sortPairsBy(key) {
  if (_pairSort.key === key) {
    _pairSort.dir *= -1;
  } else {
    _pairSort.key = key;
    _pairSort.dir = key === "eloRank" || key === "name" ? 1 : -1;
  }
  const el = document.getElementById("all-pairs-table");
  if (el) el.innerHTML = _pairsHeaderHtml() + _pairsSortedRows();
}

function openSessionHighlights(date) {
  document.getElementById("session-highlights-modal")?.remove();
  const sessionMs = activeMatches().filter((m) => m.date === date);
  if (!sessionMs.length) return;
  const sortedMs = [...sessionMs].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  const players = [
    ...new Set(
      sortedMs.flatMap((m) => [...(m.teamA || []), ...(m.teamB || [])]),
    ),
  ];
  const _amD = activeMatches();
  const eloAfter = computeElo(_amD.filter((m) => (m.date || "") <= date));
  const eloBefore = computeElo(_amD.filter((m) => (m.date || "") < date));
  const gains = players
    .map((p) => ({
      name: p,
      delta: (eloAfter[p] || 1000) - (eloBefore[p] || 1000),
    }))
    .sort((a, b) => b.delta - a.delta);
  const winsMap = {};
  sortedMs.forEach((m) => {
    const aWon = m.scoreA > m.scoreB;
    (aWon ? m.teamA : m.teamB).forEach((p) => {
      winsMap[p] = (winsMap[p] || 0) + 1;
    });
  });
  const mvp = players.reduce(
    (best, p) => ((winsMap[p] || 0) > (winsMap[best] || 0) ? p : best),
    players[0],
  );
  const biggestGame = sortedMs.reduce(
    (big, m) =>
      m.scoreA + m.scoreB > (big?.scoreA || 0) + (big?.scoreB || 0) ? m : big,
    null,
  );
  const closest = sortedMs
    .filter((m) => Math.abs(m.scoreA - m.scoreB) <= 1)
    .sort(() => Math.random() - 0.5)[0];
  const matchRows = sortedMs
    .map((m) => {
      const aWon = m.scoreA > m.scoreB;
      const winCol = "var(--green)";
      const loseCol = "rgba(255,255,255,0.3)";
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)">
      <div style="font-size:11px;font-weight:700;color:${aWon ? winCol : loseCol}">${m.teamA.map((p) => p.split(" ")[0]).join(" & ")}</div>
      <div style="font-size:14px;font-weight:900;letter-spacing:0.08em">${m.scoreA}–${m.scoreB}</div>
      <div style="font-size:11px;font-weight:700;text-align:right;color:${!aWon ? winCol : loseCol}">${m.teamB.map((p) => p.split(" ")[0]).join(" & ")}</div>
    </div>`;
    })
    .join("");
  const gainRows = gains
    .map((g) => {
      const col =
        g.delta > 0
          ? "var(--green)"
          : g.delta < 0
            ? "var(--red)"
            : "var(--muted)";
      const sign = g.delta > 0 ? "+" : "";
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0">
      <span style="font-size:11px;font-weight:700">${g.name}</span>
      <span style="font-size:12px;font-weight:800;color:${col}">${sign}${g.delta}</span>
    </div>`;
    })
    .join("");
  const overlay = document.createElement("div");
  overlay.id = "session-highlights-modal";
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:9900;background:rgba(0,0,0,0.7);display:flex;align-items:flex-end;justify-content:center";
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };
  overlay.innerHTML = `<div style="background:var(--surface);border-radius:20px 20px 0 0;width:100%;max-width:480px;padding:20px 16px 40px;max-height:80vh;overflow-y:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div style="font-size:14px;font-weight:900;letter-spacing:0.04em">📋 ${fmtDate(date).toUpperCase()}</div>
      <button onclick="document.getElementById('session-highlights-modal').remove()" style="background:rgba(255,255,255,0.06);border:none;color:var(--muted);font-size:14px;border-radius:8px;width:28px;height:28px;cursor:pointer">✕</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
      <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:8px;text-align:center"><div style="font-size:14px;font-weight:800;color:var(--theme)">${sortedMs.length}</div><div style="font-size:9px;color:var(--muted);font-weight:700">MATCHES</div></div>
      <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:8px;text-align:center"><div style="font-size:14px;font-weight:800;color:var(--theme)">${players.length}</div><div style="font-size:9px;color:var(--muted);font-weight:700">PLAYERS</div></div>
      <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:8px;text-align:center"><div style="font-size:11px;font-weight:800;color:var(--accent)">${mvp}</div><div style="font-size:9px;color:var(--muted);font-weight:700">🏆 MVP</div></div>
    </div>
    ${closest ? `<div style="font-size:10px;font-weight:700;color:var(--muted);margin-bottom:6px">🔥 CLOSEST GAME</div><div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:8px 12px;margin-bottom:12px;font-size:12px;font-weight:700">${closest.teamA.map((p) => p.split(" ")[0]).join("&")} ${closest.scoreA}–${closest.scoreB} ${closest.teamB.map((p) => p.split(" ")[0]).join("&")}</div>` : ""}
    <div style="font-size:10px;font-weight:700;color:var(--muted);margin-bottom:6px">ALL MATCHES</div>
    <div style="margin-bottom:12px">${matchRows}</div>
    <div style="font-size:10px;font-weight:700;color:var(--muted);margin-bottom:6px">⚡ ELO CHANGES</div>
    <div>${gainRows}</div>
  </div>`;
  document.body.appendChild(overlay);
}

function openPairDetail(key) {
  document.getElementById("pair-detail-modal")?.remove();
  const players = key.split(" & ");
  const matches = activeMatches().filter(
    (m) =>
      m.teamA.length === 2 &&
      m.teamB.length === 2 &&
      ([...m.teamA].sort().join(" & ") === key ||
        [...m.teamB].sort().join(" & ") === key),
  );
  if (!matches.length) return;

  // ── Core counts ──────────────────────────────────────────
  let wins = 0,
    gw = 0,
    gl = 0,
    totalDiff = 0;
  let curStreak = 0,
    curType = "",
    bestWin = 0,
    bestLoss = 0;
  let winStreak = 0,
    lossStreak = 0,
    maxWinStreak = 0,
    maxLossStreak = 0;
  let fireCount = 0,
    dominatingWins = 0,
    shutoutWins = 0,
    shutoutLosses = 0;
  const form = [],
    oppRecord = {};

  const sorted = [...matches].sort((a, b) => a.date.localeCompare(b.date));
  sorted.forEach((m) => {
    const isPair = [...m.teamA].sort().join(" & ") === key;
    const pScore = isPair ? m.scoreA : m.scoreB;
    const oScore = isPair ? m.scoreB : m.scoreA;
    const won = pScore > oScore;
    const margin = pScore - oScore;
    const opp = [...(isPair ? m.teamB : m.teamA)].sort().join(" & ");

    gw += pScore;
    gl += oScore;
    totalDiff += margin;
    if (won) {
      wins++;
      if (margin > bestWin) bestWin = margin;
    } else {
      if (-margin > bestLoss) bestLoss = -margin;
    }

    form.push(won ? "W" : "L");
    if (!oppRecord[opp]) oppRecord[opp] = { w: 0, l: 0 };
    if (won) oppRecord[opp].w++;
    else oppRecord[opp].l++;

    if (won) {
      winStreak++;
      lossStreak = 0;
      if (winStreak > maxWinStreak) maxWinStreak = winStreak;
    } else {
      lossStreak++;
      winStreak = 0;
      if (lossStreak > maxLossStreak) maxLossStreak = lossStreak;
    }

    if (isFireMatch(m)) fireCount++;
    if (isDominatingMatch(m) && won) dominatingWins++;
    if (pScore === 0) shutoutLosses++;
    if (oScore === 0) shutoutWins++;
  });

  // Current streak
  for (let i = form.length - 1; i >= 0; i--) {
    if (i === form.length - 1) {
      curType = form[i];
      curStreak = 1;
    } else if (form[i] === curType) curStreak++;
    else break;
  }

  const played = matches.length,
    losses = played - wins;
  const winPct = Math.round((wins / played) * 100);
  const gamePct = Math.round((gw / (gw + gl)) * 100);
  const avgDiff = (totalDiff / played).toFixed(1);
  const avgDiffStr = totalDiff >= 0 ? `+${avgDiff}` : avgDiff;
  const firstMatch = sorted[0].date,
    lastMatch = sorted[sorted.length - 1].date;

  // ── Form dots ─────────────────────────────────────────────
  const formHtml = form
    .slice(-10)
    .map(
      (r) =>
        `<span class="fd fd-lg ${r === "W" ? "fd-w" : "fd-l"}">${r}</span>`,
    )
    .join("");

  // ── Opponents ─────────────────────────────────────────────
  const oppHtml = Object.entries(oppRecord)
    .sort((a, b) => b[1].w + b[1].l - (a[1].w + a[1].l))
    .map(([opp, rec]) => {
      const tot = rec.w + rec.l;
      const pct = Math.round((rec.w / tot) * 100);
      const col =
        pct >= 60 ? "var(--green)" : pct <= 40 ? "var(--red)" : "var(--text)";
      return `<div class="chem-row"><div class="chem-names" style="font-size:10px">${opp}</div><div class="chem-wl">${rec.w}–${rec.l}</div><div class="chem-bar-wrap"><div class="chem-bar" style="width:${pct}%;background:${col}"></div></div><div class="chem-pct" style="color:${col}">${pct}%</div></div>`;
    })
    .join("");

  // ── Recent matches ────────────────────────────────────────
  const recentHtml = [...sorted]
    .reverse()
    .slice(0, 6)
    .map((m) => {
      const isPair = [...m.teamA].sort().join(" & ") === key;
      const pScore = isPair ? m.scoreA : m.scoreB;
      const oScore = isPair ? m.scoreB : m.scoreA;
      const won = pScore > oScore;
      const opp = [...(isPair ? m.teamB : m.teamA)].sort().join(" & ");
      return `<div class="chem-row"><div style="font-size:9px;color:var(--muted);flex-shrink:0;width:56px">${fmtDate(
        m.date,
      )
        .replace(/\s+\d{4}$/, "")
        .toUpperCase()}</div><div class="chem-names" style="font-size:10px">vs ${opp}</div><div style="font-size:11px;font-weight:800;color:${won ? "var(--green)" : "var(--red)"};flex-shrink:0">${pScore}–${oScore}</div></div>`;
    })
    .join("");

  const streakCol = curType === "W" ? "var(--green)" : "var(--red)";
  const streakIcon = curType === "W" ? "🔥" : "❄️";

  const html = `
          <div id="pair-detail-modal">
            <div class="analytics-inner">
              <div class="analytics-header">
                <div class="analytics-title" style="font-size:15px">🤝 ${key}</div>
                <button class="analytics-close" onclick="document.getElementById('pair-detail-modal').remove()">✕</button>
              </div>
              <div class="analytics-cards">

                <!-- Overview -->
                <div class="ana-card ov-card">
                  <div class="ov-header">
                    <div class="ov-sr-block">
                      <div class="ov-sr-val" style="color:${winPct >= 60 ? "var(--green)" : winPct <= 40 ? "var(--red)" : "var(--text)"}">${winPct}%</div>
                      <div class="ov-sr-lbl">Win Rate</div>
                    </div>
                    <div class="ov-record-block">
                      <div class="ov-record">${wins}<span class="ov-record-sep">W</span>${losses}<span class="ov-record-sep">L</span></div>
                      <div class="ov-win-pct">${played} matches together</div>
                    </div>
                  </div>
                  <div class="ov-grid" style="margin-top:10px">
                    <div class="ov-cell"><div class="ov-val p">${gw}</div><div class="ov-lbl">Games Won</div></div>
                    <div class="ov-cell"><div class="ov-val n">${gl}</div><div class="ov-lbl">Games Lost</div></div>
                    <div class="ov-cell"><div class="ov-val ${totalDiff >= 0 ? "p" : "n"}">${totalDiff >= 0 ? "+" : ""}${totalDiff}</div><div class="ov-lbl">Game Diff</div></div>
                    <div class="ov-cell"><div class="ov-val">${gamePct}%</div><div class="ov-lbl">Game %</div></div>
                    <div class="ov-cell"><div class="ov-val ${totalDiff >= 0 ? "p" : "n"}">${avgDiffStr}</div><div class="ov-lbl">Avg Margin</div></div>
                    <div class="ov-cell"><div class="ov-val p">+${bestWin}</div><div class="ov-lbl">Best Win</div></div>
                    <div class="ov-cell"><div class="ov-val n">-${bestLoss}</div><div class="ov-lbl">Worst Loss</div></div>
                    <div class="ov-cell"><div class="ov-val">${fireCount}</div><div class="ov-lbl">🔥 Fires</div></div>
                  </div>
                </div>

                <!-- Streaks -->
                <div class="ana-card">
                  <span class="badge">Streaks & Form</span>
                  <div class="ov-grid" style="margin-top:10px;grid-template-columns:repeat(3,1fr)">
                    <div class="ov-cell">
                      <div class="ov-val" style="color:${curStreak > 0 ? streakCol : "var(--muted)"}">${curStreak > 0 ? `${streakIcon} ${curStreak}${curType}` : "—"}</div>
                      <div class="ov-lbl">Current</div>
                    </div>
                    <div class="ov-cell">
                      <div class="ov-val" style="color:var(--green)">${maxWinStreak}W</div>
                      <div class="ov-lbl">Best Streak</div>
                    </div>
                    <div class="ov-cell">
                      <div class="ov-val" style="color:var(--red)">${maxLossStreak}L</div>
                      <div class="ov-lbl">Worst Streak</div>
                    </div>
                    <div class="ov-cell">
                      <div class="ov-val" style="color:var(--green)">${shutoutWins}</div>
                      <div class="ov-lbl">Shutout W</div>
                    </div>
                    <div class="ov-cell">
                      <div class="ov-val" style="color:var(--red)">${shutoutLosses}</div>
                      <div class="ov-lbl">Shutout L</div>
                    </div>
                    <div class="ov-cell">
                      <div class="ov-val">${dominatingWins}</div>
                      <div class="ov-lbl">💀 Dominant W</div>
                    </div>
                  </div>
                  <div style="margin-top:12px">
                    <div style="font-size:9px;font-weight:700;letter-spacing:0.1em;color:var(--muted);text-transform:uppercase;margin-bottom:6px">Recent Form</div>
                    <div style="display:flex;gap:4px;flex-wrap:wrap">${formHtml}</div>
                  </div>
                </div>

                <!-- Timeline -->
                <div class="ana-card">
                  <span class="badge">Timeline</span>
                  <div class="det-streak-row" style="margin-top:10px">
                    <div class="det-streak-cell">
                      <div class="det-streak-val" style="font-size:13px;font-weight:700">${fmtDate(firstMatch)}</div>
                      <div class="sub">First Together</div>
                    </div>
                    <div class="det-streak-div"></div>
                    <div class="det-streak-cell">
                      <div class="det-streak-val" style="font-size:13px;font-weight:700">${fmtDate(lastMatch)}</div>
                      <div class="sub">Last Together</div>
                    </div>
                  </div>
                </div>

                <!-- vs Opponents -->
                <div class="ana-card">
                  <span class="badge">vs Opponents</span>
                  <div style="margin-top:8px">${oppHtml || '<div class="sub">No data.</div>'}</div>
                </div>

              </div>
              <div style="margin-top:20px;font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Recent Matches</div>
              <div class="ana-card" style="padding:8px 12px">${recentHtml || '<div class="sub">No matches.</div>'}</div>
            </div>
          </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
}

function getMatrixAlias(name) {
  // If already an alias array from firebase
  if (Array.isArray(name)) {
    return String(name[0] || "")
      .trim()
      .toUpperCase()
      .slice(0, 3);
  }

  // If passed actual player name string
  const aliases = aliasMap?.[name];

  if (Array.isArray(aliases) && aliases.length > 0) {
    return String(aliases[0] || "")
      .trim()
      .toUpperCase()
      .slice(0, 3);
  }

  // Fallback initials
  return String(name || "")
    .split(" ")
    .map((p) => p[0] || "")
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

// ── P VS P MATRIX (COMPACT, NO SCROLL) ────────────────────
let _h2hMatrixSort = "matches";

function _h2hSortPlayers(players) {
  if (!Array.isArray(players)) return [];
  const eloMap = _memoElo();
  const matchCount = {};
  const winPct = {};
  players.forEach((p) => {
    let played = 0,
      wins = 0;
    activeMatches().forEach((m) => {
      const inA = (m.teamA || []).includes(p);
      const inB = (m.teamB || []).includes(p);
      if (!inA && !inB) return;
      played++;
      const won = (inA && m.scoreA > m.scoreB) || (inB && m.scoreB > m.scoreA);
      if (won) wins++;
    });
    matchCount[p] = played;
    winPct[p] = played > 0 ? wins / played : 0;
  });
  const sorted = [...players];
  if (_h2hMatrixSort === "matches") {
    sorted.sort(
      (a, b) =>
        (matchCount[b] || 0) - (matchCount[a] || 0) ||
        (eloMap[b] || 0) - (eloMap[a] || 0),
    );
  } else if (_h2hMatrixSort === "winrate") {
    sorted.sort(
      (a, b) => (winPct[b] || 0) - (winPct[a] || 0) || (matchCount[b] || 0) - (matchCount[a] || 0),
    );
  } else if (_h2hMatrixSort === "name") {
    return sortPlayersGuestsLast(sorted);
  }
  return sorted;
}

function _h2hSetSort(key) {
  _h2hMatrixSort = key;
  document.querySelectorAll(".h2h-sort-pill").forEach((b) => {
    const isActive =
      (b.textContent.trim() === "MATCHES" && key === "matches") ||
      (b.textContent.trim() === "WIN %" && key === "winrate") ||
      (b.textContent.trim() === "NAME" && key === "name");
    b.classList.toggle("active", isActive);
  });
  const inner = document.getElementById("h2h-matrix-inner");
  if (inner) {
    const sorted = _h2hSortPlayers(getAllPlayerNamesFromMatches());
    inner.innerHTML = buildH2HMatrixCompact(sorted);
  }
}

function buildH2HMatrixCompact(players) {
  if (players.length < 2)
    return '<div style="color:var(--muted);font-size:11px">Need at least 2 players with matches.</div>';

  // Build head-to-head matrix
  const matrix = {};
  players.forEach((a) => {
    matrix[a] = {};
    players.forEach((b) => {
      if (a === b) {
        matrix[a][b] = null;
        return;
      }
      const h2h = getHeadToHeadStats(a, b);
      const total = h2h.aWins + h2h.bWins;
      matrix[a][b] = total > 0 ? { wins: h2h.aWins, total } : null;
    });
  });

  const colHeaders = players
    .map(
      (p) =>
        `<th class="pvp-th" title="${p}">${getMatrixAlias(aliasMap[p])}</th>`,
    )
    .join("");

  const rows = players
    .map((a) => {
      const cells = players
        .map((b) => {
          if (a === b) return `<td class="pvp-td pvp-self">·</td>`;
          const d = matrix[a][b];
          if (!d) return `<td class="pvp-td pvp-none">—</td>`;
          const pct = Math.round((d.wins / d.total) * 100);
          const cls =
            pct >= 60 ? "pvp-win" : pct <= 40 ? "pvp-loss" : "pvp-even";
          return `<td class="pvp-td ${cls} pvp-td-click" title="${escHtml(`${a} vs ${b}: ${d.wins}W–${d.total - d.wins}L`)}" onclick="openRivalryScreen(${jsArg(a)},${jsArg(b)})">${pct}%<sub class="pvp-total">${d.total}</sub></td>`;
        })
        .join("");
      // Row label: use same alias as column header; click to highlight/dim row
      return `<tr><td class="pvp-row-hdr pvp-row-hdr-click" title="${escHtml(a)}" onclick="_h2hHighlightRow(this.closest('tr'))">${escHtml(getMatrixAlias(aliasMap[a]))}</td>${cells}</tr>`;
    })
    .join("");

  // Legend: alias → full name, two per line
  const legend = players
    .map(
      (p) =>
        `<span class="pvp-legend-item"><strong>${escHtml(getMatrixAlias(aliasMap[p]))}</strong> ${escHtml(p.toUpperCase())}</span>`,
    )
    .join("");

  return `<div class="pvp-wrap">
              <div class="pvp-scroll-wrap">
                <table class="pvp-table">
                  <thead><tr><th class="pvp-corner"></th>${colHeaders}</tr></thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>
              <div class="pvp-legend">${legend}</div>
            </div>`;
}

function _h2hHighlightRow(tr) {
  const table = tr?.closest("table");
  if (!table) return;
  const all = table.querySelectorAll("tbody tr");
  const isHighlighted = tr.classList.contains("pvp-row-highlight");
  all.forEach((r) => { r.classList.remove("pvp-row-highlight", "pvp-dimmed"); });
  if (!isHighlighted) {
    tr.classList.add("pvp-row-highlight");
    all.forEach((r) => { if (r !== tr) r.classList.add("pvp-dimmed"); });
  }
}

// ── P VS P MATRIX ──────────────────────────────────────────
function buildH2HMatrix(players) {
  if (players.length < 2)
    return '<div style="color:var(--muted);font-size:11px">Need at least 2 players with matches.</div>';

  // Build win % for each row vs col (row beats col)
  const matrix = {};
  players.forEach((a) => {
    matrix[a] = {};
    players.forEach((b) => {
      if (a === b) {
        matrix[a][b] = null;
        return;
      }
      const h2h = getHeadToHeadStats(a, b);
      const total = h2h.aWins + h2h.bWins;
      matrix[a][b] = total > 0 ? { wins: h2h.aWins, total } : null;
    });
  });

  // Short name: first 5 chars to keep columns tight
  const short = (n) => (n.length > 6 ? n.slice(0, 5) + "…" : n);

  const colHeaders = players
    .map(
      (p) => `<th class="pvp-th" title="${p}">${getMatrixAlias(short(p))}</th>`,
    )
    .join("");

  const rows = players
    .map((a) => {
      const cells = players
        .map((b) => {
          if (a === b) return `<td class="pvp-td pvp-self">·</td>`;
          const d = matrix[a][b];
          if (!d) return `<td class="pvp-td pvp-none">—</td>`;
          const pct = Math.round((d.wins / d.total) * 100);
          const cls =
            pct >= 60 ? "pvp-win" : pct <= 40 ? "pvp-loss" : "pvp-even";
          return `<td class="pvp-td ${cls} pvp-td-click" title="${escHtml(`${a} vs ${b}: ${d.wins}W–${d.total - d.wins}L`)}" onclick="openRivalryScreen(${jsArg(a)},${jsArg(b)})">${pct}%</td>`;
        })
        .join("");
      return `<tr><td class="pvp-row-hdr" title="${escHtml(a)}">${escHtml(short(a))}</td>${cells}</tr>`;
    })
    .join("");

  return `<table class="pvp-table">
              <thead><tr><th class="pvp-corner"></th>${colHeaders}</tr></thead>
              <tbody>${rows}</tbody>
            </table>`;
}

// ── PLAYER COMPARISON ─────────────────────────────────────
const CMP_DATE_OPTS = [
  { v: "all", l: "ALL TIME" },
  { v: "today", l: "TODAY" },
  { v: "week", l: "THIS WEEK" },
  { v: "lastweek", l: "LAST WEEK" },
  { v: "weekend", l: "WEEKEND" },
  { v: "month", l: "THIS MONTH" },
];

let _cmpPlayerA = "";
let _cmpPlayerB = "";
let _cmpDateFilter = "all";

function _cmpSelectorHtml() {
  const datePills = CMP_DATE_OPTS.map(
    (o) =>
      `<button class="digest-filter-btn${o.v === _cmpDateFilter ? " active" : ""}" onclick="_cmpSetDate('${o.v}')">${o.l}</button>`,
  ).join("");
  return `
    <div class="cmp-inline-selectors">
      <button class="h2h-slot-btn${_cmpPlayerA ? " h2h-slot-filled" : ""}" id="cmpSlotA" onclick="openCmpSheet('A')" style="flex:1">
        <span id="cmpLabelA" style="font-size:12px;font-weight:800">${_cmpPlayerA || "P1"}</span>
      </button>
      <span class="cmp-inline-vs">VS</span>
      <button class="h2h-slot-btn${_cmpPlayerB ? " h2h-slot-filled" : ""}" id="cmpSlotB" onclick="openCmpSheet('B')" style="flex:1">
        <span id="cmpLabelB" style="font-size:12px;font-weight:800">${_cmpPlayerB || "P2"}</span>
      </button>
    </div>
    <div style="display:flex;gap:4px;flex-wrap:wrap;margin:6px 0">${datePills}</div>
    <button class="cmp-ctrl cmp-full" onclick="triggerCompare()">COMPARE</button>`;
}

function openCmpSheet(slot) {
  _filterSheetMode = slot === "A" ? "cmpplayerA" : "cmpplayerB";
  const el = document.getElementById("filter-sheet-title");
  if (el) el.textContent = slot === "A" ? "SELECT P1" : "SELECT P2";
  const list = document.getElementById("filter-sheet-list");
  if (!list) return;
  const taken = slot === "A" ? _cmpPlayerB : _cmpPlayerA;
  const selected = slot === "A" ? _cmpPlayerA : _cmpPlayerB;
  const players = sortPlayersGuestsLast(computeStats(activeMatches()).map((s) => s.name));
  list.innerHTML = players
    .map((p) => {
      const disabled =
        p === taken ? ' style="opacity:0.3;pointer-events:none"' : "";
      const sel = p === selected ? " live-sheet-item-selected" : "";
      return `<div class="live-sheet-item${sel}"${disabled} onclick="selectFilterItem(${jsArg(p)})">${sheetAvSm(p)}<span>${escHtml(p)}</span></div>`;
    })
    .join("");
  const overlay = document.getElementById("filter-sheet-overlay");
  const sheet = document.getElementById("filter-sheet");
  if (overlay) overlay.classList.add("live-sheet-open");
  if (sheet) sheet.classList.add("live-sheet-open");
}

function _cmpSetDate(v) {
  _cmpDateFilter = v;
  document
    .querySelectorAll("#compare-card .digest-filter-btn")
    .forEach((b) =>
      b.classList.toggle(
        "active",
        b.textContent.toLowerCase().includes(v) ||
          (v === "all" && b.textContent === "ALL TIME"),
      ),
    );
  // Re-render date pills with correct active state
  const card = document.getElementById("compare-card");
  if (!card) return;
  card.querySelectorAll(".digest-filter-btn").forEach((b) => {
    const match = CMP_DATE_OPTS.find((o) => o.l === b.textContent);
    if (match) b.classList.toggle("active", match.v === v);
  });
}

function cmpDateOptsHtml(selected = "all") {
  return CMP_DATE_OPTS.map(
    (o) =>
      `<option value="${o.v}"${o.v === selected ? " selected" : ""}>${o.l}</option>`,
  ).join("");
}

function triggerCompare() {
  const a = _cmpPlayerA;
  const b = _cmpPlayerB;
  const dateF = _cmpDateFilter || "all";
  if (!a || !b || a === b) {
    showToast("Select two different players", "⚠️", 2000);
    return;
  }
  openPlayerCompare(a, b, dateF);
}

function openPlayerCompare(nameA, nameB, dateFilter = "all") {
  const card = document.getElementById("compare-card");
  if (!card) return;
  const filtered = filterMatches(dateFilter);
  const eloMap = computeElo(filtered);
  const stats = computeStats(filtered, eloMap);
  const sA = stats.find((s) => s.name === nameA);
  const sB = stats.find((s) => s.name === nameB);
  if (!sA || !sB) return;

  const row = (label, valA, valB, higherIsBetter = true) => {
    const a = parseFloat(valA);
    const b = parseFloat(valB);
    const aCol =
      isNaN(a) || isNaN(b)
        ? "var(--text)"
        : higherIsBetter
          ? a > b
            ? "var(--green)"
            : a < b
              ? "var(--red)"
              : "var(--text)"
          : a < b
            ? "var(--green)"
            : a > b
              ? "var(--red)"
              : "var(--text)";
    const bCol =
      isNaN(a) || isNaN(b)
        ? "var(--text)"
        : higherIsBetter
          ? b > a
            ? "var(--green)"
            : b < a
              ? "var(--red)"
              : "var(--text)"
          : b < a
            ? "var(--green)"
            : b > a
              ? "var(--red)"
              : "var(--text)";
    return `<div class="cmp-row">
      <div class="cmp-val" style="color:${aCol}">${valA}</div>
      <div class="cmp-lbl">${label}</div>
      <div class="cmp-val" style="color:${bCol}">${valB}</div>
    </div>`;
  };

  const formA = (sA.form || [])
    .map((r) => `<span class="form-dot ${r === "W" ? "w" : "l"}">${r}</span>`)
    .join("");
  const formB = (sB.form || [])
    .map((r) => `<span class="form-dot ${r === "W" ? "w" : "l"}">${r}</span>`)
    .join("");

  const noData = (n) =>
    `<span style="color:var(--muted);font-size:11px">${n} — no data for this period</span>`;

  _cmpPlayerA = nameA;
  _cmpPlayerB = nameB;
  _cmpDateFilter = dateFilter;
  card.dataset.mode = "result";
  card.style.display = "block";
  card.innerHTML = `
    <div class="cmp-inline-card">
      <div class="cmp-inline-header">
        <span class="cmp-inline-title">⚡ Compare Players</span>
        <button class="cmp-inline-close" onclick="document.getElementById('compare-card').style.display='none';document.getElementById('compare-card').innerHTML=''">×</button>
      </div>
      ${_cmpSelectorHtml()}
      ${
        !sA || !sB
          ? `<div style="padding:12px 0;color:var(--muted);font-size:12px;text-align:center">${!sA ? noData(nameA) : ""}${!sB ? noData(nameB) : ""}</div>`
          : `
      <div class="cmp-result-block">
        <div class="cmp-names-bar">
          <div class="cmp-name">${nameA.split(" ")[0]}</div>
          <div class="cmp-vs-tag">${CMP_DATE_OPTS.find((o) => o.v === dateFilter)?.l || "ALL TIME"}</div>
          <div class="cmp-name">${nameB.split(" ")[0]}</div>
        </div>
        <div class="cmp-rows">
          ${row("Matches", sA.mp, sB.mp)}
          ${row("Win %", sA.winPct.toFixed(0) + "%", sB.winPct.toFixed(0) + "%")}
          ${row("Skill Rating", sA.sr.toFixed(2), sB.sr.toFixed(2))}
          ${row("ELO", eloMap[nameA] || 1000, eloMap[nameB] || 1000)}
          ${row("Game %", sA.gamePct.toFixed(0) + "%", sB.gamePct.toFixed(0) + "%")}
          ${row("Best Streak", sA.bestWinStreak + "W", sB.bestWinStreak + "W")}
          ${row("Avg Margin", (sA.avgMargin >= 0 ? "+" : "") + sA.avgMargin.toFixed(1), (sB.avgMargin >= 0 ? "+" : "") + sB.avgMargin.toFixed(1))}
          ${sA.consistency !== null && sB.consistency !== null ? row("Consistency ±", sA.consistency, sB.consistency, false) : ""}
          <div class="cmp-row" style="align-items:flex-start;padding-top:8px">
            <div class="cmp-form">${formA}</div>
            <div class="cmp-lbl">Form</div>
            <div class="cmp-form" style="justify-content:flex-end">${formB}</div>
          </div>
        </div>
      </div>`
      }
    </div>`;
}

function renderCompareSelector() {
  const card = document.getElementById("compare-card");
  if (!card) return;
  // Toggle: collapse if selector already open
  if (card.style.display !== "none" && card.dataset.mode === "selector") {
    card.style.display = "none";
    card.innerHTML = "";
    return;
  }
  const players = sortPlayersGuestsLast(computeStats(activeMatches()).map((s) => s.name));
  const opts =
    `<option value="">P1</option>` +
    players.map((p) => `<option value="${escHtml(p)}">${escHtml(p)}</option>`).join("");
  const optsB =
    `<option value="">P2</option>` +
    players.map((p) => `<option value="${escHtml(p)}">${escHtml(p)}</option>`).join("");
  _cmpPlayerA = "";
  _cmpPlayerB = "";
  _cmpDateFilter = "all";
  card.dataset.mode = "selector";
  card.style.display = "block";
  card.innerHTML = `
    <div class="cmp-inline-card">
      <div class="cmp-inline-header">
        <span class="cmp-inline-title">⚡ Compare Players</span>
        <button class="cmp-inline-close" onclick="document.getElementById('compare-card').style.display='none';document.getElementById('compare-card').innerHTML=''">×</button>
      </div>
      ${_cmpSelectorHtml()}
    </div>`;
}

// ── ANALYTICS ──────────────────────────────────────────────
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
  const h2h = getHeadToHeadStats(p1, p2);
  const total = h2h.aWins + h2h.bWins;
  if (total === 0) {
    result.innerHTML =
      '<div class="sub" style="padding:8px">These players have never faced each other.</div>';
    return;
  }
  // Walk full ELO to capture per-match deltas for this H2H pair
  const h2hDeltaMap = new Map();
  const _e = {};
  [...allMatches]
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
          ${playerAvatar(p1, 34)}
          <div class="h2h-hero-name">${p1}</div>
          <div class="h2h-hero-wins" style="color:${col1}">${h2h.aWins}</div>
          <div class="h2h-hero-sub">${p1Pct}% win rate</div>
        </div>
        <div class="h2h-hero-center">
          <div class="h2h-vs-badge">VS</div>
          <div class="h2h-total-badge">${total}<br><span style="font-size:8px;font-weight:600;opacity:0.6">played</span></div>
        </div>
        <div class="h2h-hero-side h2h-hero-right" style="background:linear-gradient(225deg,${col2}18 0%,transparent 70%)">
          ${playerAvatar(p2, 34)}
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

// ── ANALYTICS SECTION STATE ────────────────────────────────
const ANA_ORDER_KEY = "ekta_ana_order";
const ANA_COL_KEY = "ekta_ana_col";
const ANA_PILL_ORDER_KEY = "ekta_ana_pill_order";
const ANA_FAV_KEY = "ekta_ana_favs";
const ANA_HIDDEN_KEY = "ekta_ana_hidden";

function getAnaPillOrder() {
  try {
    const raw = JSON.parse(localStorage.getItem(ANA_PILL_ORDER_KEY)) || [];
    return [...new Set(raw)]; // deduplicate in case of corrupted state
  } catch {
    return [];
  }
}
function saveAnaPillOrder(a) {
  localStorage.setItem(ANA_PILL_ORDER_KEY, JSON.stringify(a));
}
function getAnaFavs() {
  try {
    return JSON.parse(localStorage.getItem(ANA_FAV_KEY)) || [];
  } catch {
    return [];
  }
}
function saveAnaFavs(a) {
  localStorage.setItem(ANA_FAV_KEY, JSON.stringify(a));
}
function toggleAnaFav(key, e) {
  e.stopPropagation();
  const favs = getAnaFavs();
  const idx = favs.indexOf(key);
  if (idx === -1) favs.push(key);
  else favs.splice(idx, 1);
  saveAnaFavs(favs);
  // Update star icon on this section
  const sec = document.querySelector(`.ana-sec[data-key="${key}"]`);
  if (sec) {
    const star = sec.querySelector(".ana-fav-btn");
    if (star) star.classList.toggle("active", idx === -1);
  }
  // If currently viewing favs, re-apply filter
  if (_anaActiveCat === "favs") anaFilterCategory("favs", true);
}

function getAnaHidden() {
  try { return JSON.parse(localStorage.getItem(ANA_HIDDEN_KEY)) || []; } catch { return []; }
}
function saveAnaHidden(a) {
  localStorage.setItem(ANA_HIDDEN_KEY, JSON.stringify(a));
}
function toggleAnaHidden(key, e) {
  e.stopPropagation();
  const hidden = getAnaHidden();
  const idx = hidden.indexOf(key);
  if (idx === -1) hidden.push(key); else hidden.splice(idx, 1);
  saveAnaHidden(hidden);
  const isNowHidden = idx === -1;
  const sec = document.querySelector(`.ana-sec[data-key="${key}"]`);
  if (sec) {
    if (isNowHidden) sec.dataset.hidden = "true"; else delete sec.dataset.hidden;
    const btn = sec.querySelector(".ana-hide-btn");
    if (btn) { btn.classList.toggle("active", isNowHidden); btn.title = isNowHidden ? "Unhide" : "Hide"; btn.textContent = isNowHidden ? "+" : "−"; }
  }
  anaFilterCategory(_anaActiveCat, true);
}

function getAnaOrder() {
  try {
    return JSON.parse(localStorage.getItem(ANA_ORDER_KEY)) || [];
  } catch (e) {
    return [];
  }
}
function saveAnaOrder(a) {
  localStorage.setItem(ANA_ORDER_KEY, JSON.stringify(a));
}
function getAnaCollapsed() {
  try {
    return new Set(JSON.parse(localStorage.getItem(ANA_COL_KEY)) || []);
  } catch (e) {
    return new Set();
  }
}
function saveAnaCollapsed(s) {
  localStorage.setItem(ANA_COL_KEY, JSON.stringify([...s]));
}

function toggleAnaSection(key) {
  const el = document.querySelector(`.ana-sec[data-key="${key}"]`);
  if (!el) return;
  el.classList.toggle("collapsed");
  const col = getAnaCollapsed();
  el.classList.contains("collapsed") ? col.add(key) : col.delete(key);
  saveAnaCollapsed(col);
  if (key === "calendar" && !el.classList.contains("collapsed"))
    renderMatchCalendar();
  if (!el.classList.contains("collapsed")) {
    // Staggered card slide-in for all content in the newly expanded section
    const skipAnim = document.body.classList.contains("no-cascade");
    let stagger = 0;
    el.querySelectorAll(
      ".ana-card, .award-card, .awards-grid, .pair-stats-card, .h2h-cascade-item",
    ).forEach((card) => {
      card.style.opacity = "";
      card.classList.remove("card-anim");
      if (!skipAnim) {
        void card.offsetWidth;
        card.style.animationDelay = `${stagger * 55}ms`;
        card.classList.add("card-anim");
        stagger++;
      }
    });
    // Re-trigger ELO bars
    if (key === "elo") {
      el.querySelectorAll(".elo-bar").forEach((bar) => {
        bar.style.animation = "none";
        void bar.offsetWidth;
        bar.style.animation = "";
      });
    }
  }
}

let _anaDragKey = null;
let _anaClone = null;
let _anaDragOffsetY = 0;
let _anaActiveCat = "all";

function _togglePairForm(btn) {
  const expanded = btn.dataset.expanded === "1";
  const rows = btn.closest(".ana-card")?.querySelectorAll(".pform-extra");
  if (!rows) return;
  rows.forEach((r) => (r.style.display = expanded ? "none" : ""));
  btn.dataset.expanded = expanded ? "0" : "1";
  const extra = [...rows].length;
  btn.textContent = expanded ? `Show ${extra} more ▼` : `Show less ▲`;
}

function _toggleSynergyMore(btn) {
  const expanded = btn.dataset.expanded === "1";
  const card = btn.closest(".ana-card, .ana-sec-body");
  const rows = card?.querySelectorAll(".synergy-extra");
  if (!rows) return;
  rows.forEach((r) => (r.style.display = expanded ? "none" : ""));
  btn.dataset.expanded = expanded ? "0" : "1";
  btn.textContent = expanded ? `Show ${rows.length} more ▼` : `Show less ▲`;
}

// ── ANALYTICS SECTION SEARCH ───────────────────────────────
let _anaSections = [];
let _anaSearchIdx = -1;

function openAnaSearch() {
  const overlay = document.getElementById("ana-search-overlay");
  const input = document.getElementById("ana-sov-input");
  if (!overlay) return;
  overlay.classList.add("active");
  document.getElementById("ana-sov-results").innerHTML = "";
  _anaSearchIdx = -1;
  setTimeout(() => input && input.focus(), 60);
}

function closeAnaSearch() {
  const overlay = document.getElementById("ana-search-overlay");
  if (overlay) overlay.classList.remove("active");
  const input = document.getElementById("ana-sov-input");
  if (input) input.value = "";
  document.getElementById("ana-sov-results").innerHTML = "";
  _anaSearchIdx = -1;
}

function anaSearchInput(q) {
  const res = document.getElementById("ana-sov-results");
  if (!res) return;
  _anaSearchIdx = -1;
  const query = (q || "").trim().toLowerCase();
  if (!query) { res.innerHTML = ""; return; }

  const matches = _anaSections.filter(s =>
    s.title.toLowerCase().replace(/[^\w\s]/g, "").includes(query) ||
    s.key.toLowerCase().includes(query)
  );

  if (!matches.length) {
    res.innerHTML = `<div class="ana-sov-empty">No sections found</div>`;
    return;
  }

  const catLabel = { activity:"Activity", players:"Players", records:"Records", elo:"ELO", rivals:"Rivals" };
  res.innerHTML = matches.slice(0, 8).map((s, i) =>
    `<div class="ana-sov-item" data-key="${s.key}" style="animation-delay:${i * 40}ms"
      onmousedown="anaSearchSelect('${s.key}')">
      <span class="ana-sov-item-icon">${s.title.match(/^\p{Emoji}/u)?.[0] || "📋"}</span>
      <span class="ana-sov-item-title">${s.title.replace(/^\p{Emoji}\s*/u, "")}</span>
      <span class="ana-sov-item-cat">${catLabel[s.cat] || s.cat}</span>
    </div>`
  ).join("");
}

function anaSearchKey(e) {
  const items = document.querySelectorAll(".ana-sov-item");
  if (e.key === "Escape") { closeAnaSearch(); return; }
  if (e.key === "ArrowDown") { _anaSearchIdx = Math.min(_anaSearchIdx + 1, items.length - 1); }
  else if (e.key === "ArrowUp") { _anaSearchIdx = Math.max(_anaSearchIdx - 1, 0); }
  else if (e.key === "Enter" && _anaSearchIdx >= 0) {
    const key = items[_anaSearchIdx]?.dataset.key;
    if (key) anaSearchSelect(key);
    return;
  } else return;
  items.forEach((el, i) => el.classList.toggle("ana-sov-item-focus", i === _anaSearchIdx));
  e.preventDefault();
}

function anaSearchSelect(key) {
  closeAnaSearch();
  const el = document.querySelector(`.ana-sec[data-key="${key}"]`);
  if (!el) return;
  if (_anaActiveCat !== "all" && el.dataset.cat !== _anaActiveCat) anaFilterCategory("all", true);
  if (el.classList.contains("collapsed")) toggleAnaSection(key);
  setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  el.classList.remove("ana-sec-highlight");
  void el.offsetWidth;
  el.classList.add("ana-sec-highlight");
  setTimeout(() => el.classList.remove("ana-sec-highlight"), 1800);
}

function anaFilterCategory(cat, skipPillUpdate) {
  _anaActiveCat = cat;
  if (!skipPillUpdate) {
    document
      .querySelectorAll(".ana-filter-pill")
      .forEach((pill) =>
        pill.classList.toggle("active", pill.dataset.cat === cat),
      );
  }

  const favs = cat === "favs" ? getAnaFavs() : null;
  let delay = 0;
  document
    .querySelectorAll("#analytics-page-content .ana-sec")
    .forEach((sec) => {
      const isHidden = sec.dataset.hidden === "true";
      let shouldHide;
      if (cat === "hidden") {
        shouldHide = !isHidden;
      } else if (cat === "all") {
        shouldHide = isHidden;
      } else if (cat === "favs") {
        shouldHide = isHidden || !favs.includes(sec.dataset.key);
      } else {
        shouldHide = isHidden || sec.dataset.cat !== cat;
      }
      const wasHidden = sec.classList.contains("ana-cat-hidden");
      sec.classList.toggle("ana-cat-hidden", shouldHide);

      if (!skipPillUpdate && !shouldHide && (wasHidden || cat !== "all")) {
        sec.classList.remove("ana-sec-reveal");
        void sec.offsetWidth;
        sec.style.animationDelay = `${delay}ms`;
        sec.classList.add("ana-sec-reveal");
        delay += 75;
      }
    });
}

function _reRenderAnalytics() {
  const sc = document.querySelector("#pg-analytics .page-body-scroll");
  const top = sc?.scrollTop || 0;
  renderAnalyticsPage();
  // Double RAF: first RAF queues after paint, second RAF fires after layout is stable
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const scNew = document.querySelector("#pg-analytics .page-body-scroll");
      if (scNew) scNew.scrollTop = top;
    }),
  );
}

function anaHandlePointerDown(e, key) {
  if (e.button !== undefined && e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  _anaDragKey = key;

  const sec = document.querySelector(`.ana-sec[data-key="${key}"]`);
  if (!sec) return;
  const rect = sec.getBoundingClientRect();
  _anaDragOffsetY = e.clientY - rect.top;

  // Floating clone
  _anaClone = sec.cloneNode(true);
  Object.assign(_anaClone.style, {
    position: "fixed",
    top: rect.top + "px",
    left: rect.left + "px",
    width: rect.width + "px",
    zIndex: 9999,
    opacity: "0.85",
    pointerEvents: "none",
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    borderRadius: "8px",
    background: "var(--surface2)",
  });
  document.body.appendChild(_anaClone);
  sec.classList.add("ana-sec-dragging");

  document.addEventListener("pointermove", _anaOnMove);
  document.addEventListener("pointerup", _anaOnUp);
  document.addEventListener("pointercancel", _anaOnUp);
}

function _anaOnMove(e) {
  if (!_anaClone) return;
  _anaClone.style.top = e.clientY - _anaDragOffsetY + "px";

  document
    .querySelectorAll(".ana-sec-drop-above, .ana-sec-drop-below")
    .forEach((el) =>
      el.classList.remove("ana-sec-drop-above", "ana-sec-drop-below"),
    );

  const container = document.getElementById("analytics-page-content");
  if (!container) return;
  for (const sec of container.querySelectorAll(".ana-sec")) {
    if (sec.dataset.key === _anaDragKey) continue;
    const r = sec.getBoundingClientRect();
    if (e.clientY >= r.top && e.clientY <= r.bottom) {
      sec.classList.add(
        e.clientY < r.top + r.height / 2
          ? "ana-sec-drop-above"
          : "ana-sec-drop-below",
      );
      break;
    }
  }
}

function _anaOnUp(e) {
  document.removeEventListener("pointermove", _anaOnMove);
  document.removeEventListener("pointerup", _anaOnUp);
  document.removeEventListener("pointercancel", _anaOnUp);
  if (_anaClone) {
    _anaClone.remove();
    _anaClone = null;
  }

  const dragged = document.querySelector(`.ana-sec[data-key="${_anaDragKey}"]`);
  if (dragged) dragged.classList.remove("ana-sec-dragging");

  const above = document.querySelector(".ana-sec-drop-above");
  const below = document.querySelector(".ana-sec-drop-below");
  const target = above || below;
  document
    .querySelectorAll(".ana-sec-drop-above, .ana-sec-drop-below")
    .forEach((el) =>
      el.classList.remove("ana-sec-drop-above", "ana-sec-drop-below"),
    );

  if (target && _anaDragKey) {
    const container = document.getElementById("analytics-page-content");
    const secs = [...container.querySelectorAll(".ana-sec")].map(
      (el) => el.dataset.key,
    );
    const from = secs.indexOf(_anaDragKey);
    secs.splice(from, 1);
    const to = secs.indexOf(target.dataset.key);
    secs.splice(above ? to : to + 1, 0, _anaDragKey);
    saveAnaOrder(secs);
    _reRenderAnalytics();
  }
  _anaDragKey = null;
}

// ── PILL DRAG-TO-REORDER (long-press 600ms to enter drag, scroll works before that) ────
let _pillDragSrc = null;
let _pillClone = null;
let _pillStartX = 0,
  _pillStartY = 0;
let _pillIsDragging = false;
let _pillDragReady = false;
let _pillLongPressTimer = null;
let _pillPointerId = null;
let _pillPreMoveHandler = null;
let _pillPreUpHandler = null;
const PILL_LP_MS = 600;

function _pillRemovePreListeners() {
  const preMove = _pillPreMoveHandler;
  const preUp = _pillPreUpHandler;
  _pillPreMoveHandler = null;
  _pillPreUpHandler = null;
  if (preMove) document.removeEventListener("pointermove", preMove);
  if (preUp) {
    document.removeEventListener("pointerup", preUp);
    document.removeEventListener("pointercancel", preUp);
  }
  document
    .querySelectorAll(".ana-filter-pill.pill-long-pressing")
    .forEach((p) => p.classList.remove("pill-long-pressing"));
}

function _pillPointerDown(e, id) {
  if (e.button !== undefined && e.button !== 0) return;
  clearTimeout(_pillLongPressTimer);
  _pillRemovePreListeners();

  _pillDragSrc = id;
  _pillStartX = e.clientX;
  _pillStartY = e.clientY;
  _pillIsDragging = false;
  _pillDragReady = false;
  _pillPointerId = e.pointerId;

  const srcEl = document.querySelector(`.ana-filter-pill[data-cat="${id}"]`);
  if (srcEl) {
    srcEl.classList.add("pill-long-pressing");
    srcEl.style.setProperty("--lp-dur", PILL_LP_MS + "ms");
  }

  _pillPreMoveHandler = (ev) => {
    if (
      Math.abs(ev.clientX - _pillStartX) > 8 ||
      Math.abs(ev.clientY - _pillStartY) > 8
    )
      _pillCancelLP(false);
  };
  _pillPreUpHandler = (ev) => _pillCancelLP(ev.type !== "pointercancel");

  document.addEventListener("pointermove", _pillPreMoveHandler);
  document.addEventListener("pointerup", _pillPreUpHandler);
  document.addEventListener("pointercancel", _pillPreUpHandler);

  _pillLongPressTimer = setTimeout(_pillActivateDrag, PILL_LP_MS);
}

function _pillCancelLP(isTap) {
  clearTimeout(_pillLongPressTimer);
  _pillRemovePreListeners();
  if (isTap && _pillDragSrc) anaFilterCategory(_pillDragSrc);
  if (!isTap) _pillDragSrc = null;
}

function _pillActivateDrag() {
  // Remove pre-phase listeners BEFORE adding drag-phase listeners
  _pillRemovePreListeners();
  if (!_pillDragSrc) return;
  _pillDragReady = true;
  if (navigator.vibrate) navigator.vibrate(30);

  const srcEl = document.querySelector(
    `.ana-filter-pill[data-cat="${_pillDragSrc}"]`,
  );
  if (srcEl) {
    try {
      srcEl.setPointerCapture(_pillPointerId);
    } catch {}
    const rect = srcEl.getBoundingClientRect();
    _pillClone = srcEl.cloneNode(true);
    Object.assign(_pillClone.style, {
      position: "fixed",
      top: rect.top + "px",
      left: rect.left + "px",
      width: rect.width + "px",
      zIndex: "9999",
      opacity: "0.9",
      pointerEvents: "none",
      boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      transition: "none",
    });
    document.body.appendChild(_pillClone);
    srcEl.style.opacity = "0.25";
  }
  document.addEventListener("pointermove", _pillOnMove);
  document.addEventListener("pointerup", _pillOnUp);
  document.addEventListener("pointercancel", _pillOnUp);
}

function _pillOnMove(e) {
  if (!_pillDragSrc || !_pillDragReady) return;
  _pillIsDragging = true;
  if (_pillClone)
    _pillClone.style.left = e.clientX - _pillClone.offsetWidth / 2 + "px";
  document
    .querySelectorAll(".ana-filter-pill")
    .forEach((p) => p.classList.remove("pill-drop-before", "pill-drop-after"));
  document.querySelectorAll(".ana-filter-pill").forEach((p) => {
    if (p.dataset.cat === _pillDragSrc) return;
    const r = p.getBoundingClientRect();
    if (e.clientX >= r.left - 4 && e.clientX <= r.right + 4)
      p.classList.add(
        e.clientX < r.left + r.width / 2
          ? "pill-drop-before"
          : "pill-drop-after",
      );
  });
}

function _pillOnUp(e) {
  document.removeEventListener("pointermove", _pillOnMove);
  document.removeEventListener("pointerup", _pillOnUp);
  document.removeEventListener("pointercancel", _pillOnUp);

  if (_pillClone) {
    _pillClone.remove();
    _pillClone = null;
  }
  const src = document.querySelector(
    `.ana-filter-pill[data-cat="${_pillDragSrc}"]`,
  );
  if (src) src.style.opacity = "";

  const before = document.querySelector(".pill-drop-before");
  const after = document.querySelector(".pill-drop-after");
  const target = before || after;
  document
    .querySelectorAll(".pill-drop-before, .pill-drop-after")
    .forEach((p) => p.classList.remove("pill-drop-before", "pill-drop-after"));

  if (_pillIsDragging && target && _pillDragSrc) {
    const seen = new Set();
    const order = [...document.querySelectorAll(".ana-filter-pill")]
      .map((b) => b.dataset.cat)
      .filter((id) => id && !seen.has(id) && seen.add(id));
    const from = order.indexOf(_pillDragSrc);
    const to = order.indexOf(target.dataset.cat);
    if (from !== -1 && to !== -1) {
      order.splice(from, 1);
      order.splice(before ? to : to + 1, 0, _pillDragSrc);
      saveAnaPillOrder(order);
      _reRenderAnalytics();
    }
  }
  _pillDragSrc = null;
  _pillIsDragging = false;
  _pillDragReady = false;
}

// ── XP + LEVELS ────────────────────────────────────────────
function xpThreshold(level) {
  if (level <= 1) return 0;
  return Math.floor(60 * Math.pow(level - 1, 1.8));
}

function computePlayerXP(displayName) {
  let xp = 0;
  activeMatches().forEach((m) => {
    const inA = (m.teamA || []).some((p) => normPlayer(p) === displayName);
    const inB = (m.teamB || []).some((p) => normPlayer(p) === displayName);
    if (!inA && !inB) return;
    xp += 15;
    const won = inA ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
    if (won) xp += 25;
    if (isFireMatch(m)) xp += 8;
    if (isDominatingMatch(m) && won) xp += 8;
    if (isZeroMatch(m) && won) xp += 12;
  });
  return xp;
}

function getPlayerLevel(xp) {
  let level = 1;
  while (xpThreshold(level + 1) <= xp) level++;
  const thisXp = xpThreshold(level);
  const nextXp = xpThreshold(level + 1);
  return { level, xp, progress: (xp - thisXp) / (nextXp - thisXp) };
}

function getPrestigeTier(level) {
  if (level >= 20) return "diamond";
  if (level >= 15) return "gold";
  if (level >= 10) return "silver";
  if (level >= 5) return "bronze";
  return "rookie";
}

function mkLvlBadge(displayName) {
  const { level } = getPlayerLevel(computePlayerXP(displayName));
  const tier = getPrestigeTier(level);
  return `<span class="lvl-badge prestige-${tier}">LVL ${level}</span>`;
}

function mkLvlRow(displayName) {
  const xp = computePlayerXP(displayName);
  const { level, progress } = getPlayerLevel(xp);
  const tier = getPrestigeTier(level);
  const pct = Math.round(progress * 100);
  const barClr = {
    diamond: "linear-gradient(90deg,#a0e8ff,#e0b0ff)",
    gold: "#ffd700",
    silver: "#c0c0c0",
    bronze: "#cd7f32",
    rookie: "rgba(255,255,255,0.28)",
  };
  const bg = barClr[tier].startsWith("linear")
    ? `background:${barClr[tier]}`
    : `background:${barClr[tier]}`;
  return `<div class="xp-row"><span class="lvl-badge prestige-${tier}">LVL <span class="xp-lvl-num" data-final="${level}">${level}</span></span><div class="xp-bar-mini"><div class="xp-bar-fill" data-pct="${pct}" style="width:0%;${bg}"></div></div><span class="xp-pct-lbl">${pct}%</span></div>`;
}

function computeBadges(name, stats, eloMap, allMatchesArr, precomputedStats) {
  const badges = [];
  const allStats = precomputedStats || computeStats(allMatchesArr);
  const sr = allStats;

  // 👑 King: ranked #1 by SR
  if (sr.length && sr[0].name === name)
    badges.push({ icon: "👑", label: "King", desc: "Ranked #1 overall" });

  // 🔥 On Fire / 🧊 Ice Cold
  const ps = allStats.find((p) => p.name === name);
  if (ps) {
    if (ps.curType === "W" && ps.curStreak >= 5)
      badges.push({
        icon: "🔥",
        label: "On Fire",
        desc: `${ps.curStreak} match win streak`,
      });
    if (ps.curType === "L" && ps.curStreak >= 5)
      badges.push({
        icon: "🧊",
        label: "Ice Cold",
        desc: `${ps.curStreak} match loss streak`,
      });
  }

  // 💪 Ironman: most matches played
  const maxMp = Math.max(...allStats.map((p) => p.mp));
  if (ps && ps.mp === maxMp && maxMp > 0)
    badges.push({
      icon: "💪",
      label: "Ironman",
      desc: `Most matches played (${maxMp})`,
    });

  // 🎯 Sniper: won 2+ matches in a session without conceding any games
  const sessionDates = [
    ...new Set(allMatchesArr.map((m) => m.date).filter(Boolean)),
  ];
  for (const date of sessionDates) {
    const sm = allMatchesArr.filter(
      (m) =>
        m.date === date &&
        [...(m.teamA || []), ...(m.teamB || [])].includes(name),
    );
    let shutoutWins = 0;
    sm.forEach((m) => {
      const inA = (m.teamA || []).includes(name);
      const own = inA ? m.scoreA : m.scoreB;
      const opp = inA ? m.scoreB : m.scoreA;
      if (own > opp && opp === 0) shutoutWins++;
    });
    if (shutoutWins >= 2) {
      badges.push({
        icon: "🎯",
        label: "Sniper",
        desc: "Won 2+ matches X-0 in one session",
      });
      break;
    }
  }

  // 🧗 Climber: biggest positive ELO gain this week
  const { from: wkFrom } = lastWeekRange();
  const preWkElo = computeElo(
    allMatchesArr.filter((m) => (m.date || "") < wkFrom),
  );
  const eloGains = allStats.map((p) => ({
    name: p.name,
    gain: (eloMap[p.name] || 1000) - (preWkElo[p.name] || 1000),
  }));
  const topGainer = eloGains.sort((a, b) => b.gain - a.gain)[0];
  if (topGainer && topGainer.name === name && topGainer.gain > 0)
    badges.push({
      icon: "🧗",
      label: "Climber",
      desc: `+${topGainer.gain} ELO this week`,
    });

  // 🦁 Clutch King: best win% in close matches (margin <= 1) with ≥3 close games
  const closeW = {},
    closeP = {};
  allMatchesArr.forEach((m) => {
    if (Math.abs(m.scoreA - m.scoreB) > 1) return;
    const aWon = m.scoreA > m.scoreB;
    [...(m.teamA || [])].forEach((p) => {
      closeP[p] = (closeP[p] || 0) + 1;
      if (aWon) closeW[p] = (closeW[p] || 0) + 1;
    });
    [...(m.teamB || [])].forEach((p) => {
      closeP[p] = (closeP[p] || 0) + 1;
      if (!aWon) closeW[p] = (closeW[p] || 0) + 1;
    });
  });
  const clutchPlayers = Object.keys(closeP).filter((p) => closeP[p] >= 3);
  if (clutchPlayers.length) {
    const best = clutchPlayers.sort(
      (a, b) => (closeW[b] || 0) / closeP[b] - (closeW[a] || 0) / closeP[a],
    )[0];
    if (best === name)
      badges.push({
        icon: "🦁",
        label: "Clutch King",
        desc: `${Math.round(((closeW[name] || 0) / closeP[name]) * 100)}% in close matches`,
      });
  }

  // 🤝 Best Duo: part of pair with highest win% (≥4 games)
  const pairs = getPairStats(allMatchesArr).filter((p) => p.played >= 4);
  if (pairs.length && pairs[0].players.includes(name))
    badges.push({
      icon: "🤝",
      label: "Best Duo",
      desc: `${pairs[0].winPct}% with ${pairs[0].players.find((p) => p !== name)}`,
    });

  // 🃏 Giant Killer: beaten 2+ players with higher SR
  if (ps) {
    const srMap = {};
    allStats.forEach((p) => {
      srMap[p.name] = p.sr;
    });
    const beatenHigher = new Set();
    allMatchesArr.forEach((m) => {
      const aWon = m.scoreA > m.scoreB;
      const inA = (m.teamA || []).includes(name);
      const inB = (m.teamB || []).includes(name);
      if (!inA && !inB) return;
      const won = (inA && aWon) || (inB && !aWon);
      if (!won) return;
      const opps = inA ? m.teamB || [] : m.teamA || [];
      opps.forEach((opp) => {
        if ((srMap[opp] || 0) > (srMap[name] || 0)) beatenHigher.add(opp);
      });
    });
    if (beatenHigher.size >= 2)
      badges.push({
        icon: "🃏",
        label: "Giant Killer",
        desc: `Beaten ${beatenHigher.size} higher-rated players`,
      });
  }

  // ── MULTI-TIER BADGES ────────────────────────────────────
  // Veteran: matches played
  if (ps) {
    const mp = ps.mp;
    if (mp >= 50)
      badges.push({
        icon: "🎖️",
        label: "Veteran",
        desc: `${mp} matches played`,
        tier: "gold",
      });
    else if (mp >= 25)
      badges.push({
        icon: "🎖️",
        label: "Veteran",
        desc: `${mp} matches played`,
        tier: "silver",
      });
    else if (mp >= 10)
      badges.push({
        icon: "🎖️",
        label: "Veteran",
        desc: `${mp} matches played`,
        tier: "bronze",
      });
  }

  // Win Machine: total wins
  if (ps) {
    const w = ps.mw;
    if (w >= 40)
      badges.push({
        icon: "🏆",
        label: "Win Machine",
        desc: `${w} wins`,
        tier: "gold",
      });
    else if (w >= 20)
      badges.push({
        icon: "🏆",
        label: "Win Machine",
        desc: `${w} wins`,
        tier: "silver",
      });
    else if (w >= 10)
      badges.push({
        icon: "🏆",
        label: "Win Machine",
        desc: `${w} wins`,
        tier: "bronze",
      });
  }

  // Comeback King: most wins after trailing (win with lower score first)
  if (ps) {
    let comebacks = 0;
    const pMatches = allMatchesArr.filter(
      (m) => (m.teamA || []).includes(name) || (m.teamB || []).includes(name),
    );
    pMatches.forEach((m) => {
      const inA = (m.teamA || []).includes(name);
      const myScore = inA ? m.scoreA : m.scoreB;
      const theirScore = inA ? m.scoreB : m.scoreA;
      if (myScore > theirScore && theirScore > 0 && myScore - theirScore <= 2)
        comebacks++;
    });
    if (comebacks >= 10)
      badges.push({
        icon: "💪",
        label: "Comeback King",
        desc: `${comebacks} close wins`,
        tier: "gold",
      });
    else if (comebacks >= 5)
      badges.push({
        icon: "💪",
        label: "Comeback King",
        desc: `${comebacks} close wins`,
        tier: "silver",
      });
    else if (comebacks >= 2)
      badges.push({
        icon: "💪",
        label: "Comeback King",
        desc: `${comebacks} close wins`,
        tier: "bronze",
      });
  }

  // Dominator: wins by 3+ margin
  if (ps) {
    const dominWins = allMatchesArr.filter((m) => {
      const inA = (m.teamA || []).includes(name),
        inB = (m.teamB || []).includes(name);
      if (!inA && !inB) return false;
      const aWon = m.scoreA > m.scoreB;
      return (
        ((inA && aWon) || (inB && !aWon)) && Math.abs(m.scoreA - m.scoreB) >= 3
      );
    }).length;
    if (dominWins >= 20)
      badges.push({
        icon: "💀",
        label: "Dominator",
        desc: `${dominWins} dominant wins`,
        tier: "gold",
      });
    else if (dominWins >= 10)
      badges.push({
        icon: "💀",
        label: "Dominator",
        desc: `${dominWins} dominant wins`,
        tier: "silver",
      });
    else if (dominWins >= 5)
      badges.push({
        icon: "💀",
        label: "Dominator",
        desc: `${dominWins} dominant wins`,
        tier: "bronze",
      });
  }

  // Weekend Warrior: most matches on weekends
  if (ps) {
    const wkMatches = allMatchesArr.filter((m) => {
      if (!m.date) return false;
      const d = new Date(m.date + "T00:00:00").getDay();
      return (
        (d === 0 || d === 6) &&
        [...(m.teamA || []), ...(m.teamB || [])].includes(name)
      );
    }).length;
    if (wkMatches >= 30)
      badges.push({
        icon: "🏖️",
        label: "Weekend Warrior",
        desc: `${wkMatches} weekend matches`,
        tier: "gold",
      });
    else if (wkMatches >= 15)
      badges.push({
        icon: "🏖️",
        label: "Weekend Warrior",
        desc: `${wkMatches} weekend matches`,
        tier: "silver",
      });
    else if (wkMatches >= 5)
      badges.push({
        icon: "🏖️",
        label: "Weekend Warrior",
        desc: `${wkMatches} weekend matches`,
        tier: "bronze",
      });
  }

  // Perfect Day: won all matches in a session
  for (const date of sessionDates) {
    const sm = allMatchesArr.filter(
      (m) =>
        m.date === date &&
        [...(m.teamA || []), ...(m.teamB || [])].includes(name),
    );
    if (sm.length >= 3) {
      const allWon = sm.every((m) => {
        const inA = (m.teamA || []).includes(name);
        return (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
      });
      if (allWon) {
        badges.push({
          icon: "⭐",
          label: "Perfect Day",
          desc: `Won all ${sm.length} on ${fmtDate(date)}`,
          tier: sm.length >= 5 ? "gold" : sm.length >= 4 ? "silver" : "bronze",
        });
        break;
      }
    }
  }

  // Underdog: won as the lower-ELO team
  if (ps) {
    const eloMapCur = eloMap;
    let underdogWins = 0;
    allMatchesArr.forEach((m) => {
      const inA = (m.teamA || []).includes(name),
        inB = (m.teamB || []).includes(name);
      if (!inA && !inB) return;
      const aWon = m.scoreA > m.scoreB;
      const myWon = (inA && aWon) || (inB && !aWon);
      if (!myWon) return;
      const myTeam = inA ? m.teamA : m.teamB;
      const oppTeam = inA ? m.teamB : m.teamA;
      const myAvg =
        myTeam.reduce((s, p) => s + (eloMapCur[p] || 1000), 0) / myTeam.length;
      const oppAvg =
        oppTeam.reduce((s, p) => s + (eloMapCur[p] || 1000), 0) /
        oppTeam.length;
      if (myAvg < oppAvg - 30) underdogWins++;
    });
    if (underdogWins >= 10)
      badges.push({
        icon: "🐉",
        label: "Underdog",
        desc: `${underdogWins} underdog wins`,
        tier: "gold",
      });
    else if (underdogWins >= 5)
      badges.push({
        icon: "🐉",
        label: "Underdog",
        desc: `${underdogWins} underdog wins`,
        tier: "silver",
      });
    else if (underdogWins >= 2)
      badges.push({
        icon: "🐉",
        label: "Underdog",
        desc: `${underdogWins} underdog wins`,
        tier: "bronze",
      });
  }

  return badges;
}

// ══════════════════════════════════════════════════════════════
// ── PHASE 1: PLAYER FORM ENGINE ───────────────────────────────
// ══════════════════════════════════════════════════════════════

function computePlayerForm(name, matches) {
  const sorted = [...matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  const playerMs = sorted.filter((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].includes(name),
  );
  if (playerMs.length < 3) return null;

  const eloMap = computeElo(matches);
  const last10 = playerMs.slice(-10);
  const prev10 = playerMs.slice(-20, -10);

  // Win % last 10
  const wins10 = last10.filter((m) => {
    const inA = (m.teamA || []).includes(name);
    return (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
  }).length;
  const winPct10 = last10.length > 0 ? wins10 / last10.length : 0;

  // Average margin last 10
  const avgMargin10 =
    last10.reduce((s, m) => {
      const inA = (m.teamA || []).includes(name);
      const myScore = inA ? m.scoreA : m.scoreB;
      const theirScore = inA ? m.scoreB : m.scoreA;
      return s + (myScore - theirScore);
    }, 0) / Math.max(last10.length, 1);

  // Win quality: avg opponent ELO in last 10 wins
  let qualSum = 0,
    qualCount = 0;
  last10.forEach((m) => {
    const inA = (m.teamA || []).includes(name);
    const won = (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
    if (!won) return;
    const opps = inA ? m.teamB || [] : m.teamA || [];
    opps.forEach((opp) => {
      qualSum += eloMap[opp] || 1000;
      qualCount++;
    });
  });
  const winQuality = qualCount > 0 ? qualSum / qualCount : 1000;

  // Pressure (close match win %, diff ≤ 2)
  const closeMs = playerMs.filter((m) => Math.abs(m.scoreA - m.scoreB) <= 2);
  const closeWins = closeMs.filter((m) => {
    const inA = (m.teamA || []).includes(name);
    return (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
  }).length;
  const pressureScore = closeMs.length >= 3 ? closeWins / closeMs.length : 0.5;

  // Momentum: compare last 5 vs previous 5 win %
  const last5 = playerMs.slice(-5);
  const prev5 = playerMs.slice(-10, -5);
  const w5 = last5.filter((m) => {
    const inA = (m.teamA || []).includes(name);
    return (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
  }).length;
  const wp5 = prev5.filter((m) => {
    const inA = (m.teamA || []).includes(name);
    return (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
  }).length;
  const momentumDelta =
    last5.length > 0 && prev5.length > 0
      ? (w5 / last5.length - wp5 / prev5.length) * 100
      : 0;

  // Composite form score 0–10
  const formScore = Math.min(
    10,
    Math.max(
      0,
      winPct10 * 4 +
        Math.min(1, Math.max(0, (avgMargin10 + 5) / 10)) * 2.5 +
        Math.min(1, (winQuality - 900) / 300) * 2 +
        pressureScore * 1.5,
    ),
  );

  // Labels
  const momentumLabel =
    momentumDelta > 8
      ? "Rising ↑"
      : momentumDelta < -8
        ? "Falling ↓"
        : "Stable →";
  const momentumColor =
    momentumDelta > 8
      ? "var(--green)"
      : momentumDelta < -8
        ? "var(--red)"
        : "var(--muted)";
  const pressureLabel =
    pressureScore >= 0.7 ? "Elite" : pressureScore >= 0.5 ? "Solid" : "Shaky";
  const pressureColor =
    pressureScore >= 0.7
      ? "var(--green)"
      : pressureScore >= 0.5
        ? "var(--gold)"
        : "var(--red)";
  const formEmoji =
    formScore >= 8
      ? "🔥"
      : formScore >= 6
        ? "⚡"
        : formScore >= 4
          ? "😐"
          : "❄️";

  return {
    score: Math.round(formScore * 10) / 10,
    formEmoji,
    winPct10: Math.round(winPct10 * 100),
    avgMargin10: Math.round(avgMargin10 * 10) / 10,
    momentumDelta: Math.round(momentumDelta),
    momentumLabel,
    momentumColor,
    pressureScore: Math.round(pressureScore * 100),
    pressureLabel,
    pressureColor,
    closeMatches: closeMs.length,
    last10count: last10.length,
    winQuality: Math.round(winQuality),
  };
}

// ── PLAY STYLE ARCHETYPE ──────────────────────────────────────
function computeArchetype(name, matches) {
  const sorted = [...matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  const playerMs = sorted.filter((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].includes(name),
  );
  if (playerMs.length < 5) return null;

  const eloMap = computeElo(matches);
  const wins = playerMs.filter((m) => {
    const inA = (m.teamA || []).includes(name);
    return (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
  });
  const winPct = wins.length / playerMs.length;

  // Close match win %
  const close = playerMs.filter((m) => Math.abs(m.scoreA - m.scoreB) <= 2);
  const closeWinPct =
    close.length > 0
      ? close.filter((m) => {
          const inA = (m.teamA || []).includes(name);
          return (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
        }).length / close.length
      : 0.5;

  // Avg margin
  const avgMargin =
    playerMs.reduce((s, m) => {
      const inA = (m.teamA || []).includes(name);
      return s + ((inA ? m.scoreA : m.scoreB) - (inA ? m.scoreB : m.scoreA));
    }, 0) / playerMs.length;

  // Streak volatility (how often streak direction changes)
  let changes = 0;
  for (let i = 1; i < playerMs.length; i++) {
    const prev = playerMs[i - 1],
      cur = playerMs[i];
    const prevWon = (prev.teamA || []).includes(name)
      ? prev.scoreA > prev.scoreB
      : prev.scoreB > prev.scoreA;
    const curWon = (cur.teamA || []).includes(name)
      ? cur.scoreA > cur.scoreB
      : cur.scoreB > cur.scoreA;
    if (prevWon !== curWon) changes++;
  }
  const volatility = changes / Math.max(playerMs.length - 1, 1);

  // Win quality (avg opponent ELO in wins)
  let qualSum = 0,
    qualCount = 0;
  wins.forEach((m) => {
    const opps = (m.teamA || []).includes(name) ? m.teamB || [] : m.teamA || [];
    opps.forEach((opp) => {
      qualSum += eloMap[opp] || 1000;
      qualCount++;
    });
  });
  const winQuality = qualCount > 0 ? qualSum / qualCount : 1000;

  // Classify
  if (closeWinPct >= 0.65 && close.length >= 4)
    return {
      label: "Clutch Player",
      icon: "🧊",
      desc: "Thrives under pressure, wins the close ones",
      color: "#00c8ff",
    };
  if (avgMargin >= 2.5 && winPct >= 0.6)
    return {
      label: "Finisher",
      icon: "🎯",
      desc: "Wins decisively, rarely drops close sets",
      color: "#00ff9d",
    };
  if (winQuality >= 1050 && wins.length >= 5)
    return {
      label: "Giant Slayer",
      icon: "⚔️",
      desc: "Elevates against strong opponents",
      color: "var(--gold)",
    };
  if (volatility < 0.35 && winPct >= 0.55)
    return {
      label: "Consistent",
      icon: "🛡",
      desc: "Rock-solid, rarely goes on bad runs",
      color: "#b44dff",
    };
  if (volatility > 0.55)
    return {
      label: "Streaky",
      icon: "🎲",
      desc: "Runs hot and cold — dangerous on a good day",
      color: "#ff9d00",
    };
  if (winPct >= 0.65)
    return {
      label: "Aggressor",
      icon: "🔥",
      desc: "High win rate, dominates most matchups",
      color: "#ff2d78",
    };
  return {
    label: "Balanced",
    icon: "⚖️",
    desc: "Well-rounded, no glaring weakness",
    color: "var(--muted)",
  };
}

// ── SMART POWER RANKINGS ──────────────────────────────────────
function computePowerRankings(matches) {
  const eloMap = computeElo(matches);
  const stats = computeStats(matches, eloMap);
  if (!stats.length) return [];

  const maxElo = Math.max(...Object.values(eloMap));
  const minElo = Math.min(...Object.values(eloMap));
  const eloRange = Math.max(maxElo - minElo, 1);

  const sorted = [...matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  const maxMp = Math.max(...stats.map((s) => s.mp), 1);

  return stats
    .map((p) => {
      const form = computePlayerForm(p.name, matches);
      const eloNorm = ((eloMap[p.name] || 1000) - minElo) / eloRange;
      const formNorm = form ? form.score / 10 : p.mw / Math.max(p.mp, 1);
      const activityNorm = p.mp / maxMp;

      // Win quality: avg ELO of opponents beaten
      let qualSum = 0,
        qualCount = 0;
      sorted
        .filter((m) =>
          [...(m.teamA || []), ...(m.teamB || [])].includes(p.name),
        )
        .forEach((m) => {
          const inA = (m.teamA || []).includes(p.name);
          const won =
            (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
          if (!won) return;
          const opps = inA ? m.teamB || [] : m.teamA || [];
          opps.forEach((opp) => {
            qualSum += eloMap[opp] || 1000;
            qualCount++;
          });
        });
      const winQualNorm =
        qualCount > 0 ? Math.min(1, (qualSum / qualCount - 900) / 400) : 0;

      const score =
        eloNorm * 0.4 + formNorm * 0.3 + winQualNorm * 0.2 + activityNorm * 0.1;

      return {
        name: p.name,
        score: Math.round(score * 1000) / 10,
        elo: eloMap[p.name] || 1000,
        winPct: Math.round((p.mw / Math.max(p.mp, 1)) * 100),
        mp: p.mp,
        form: form ? form.score : null,
        formEmoji: form ? form.formEmoji : "—",
      };
    })
    .sort((a, b) => b.score - a.score);
}

// ── PARTNERSHIP CHEMISTRY SCORE ───────────────────────────────
function computeChemistryScores(matches) {
  const eloMap = computeElo(matches);
  const pairs = getPairStats(matches).filter((p) => p.played >= 3);
  if (!pairs.length) return [];

  const maxPlayed = Math.max(...pairs.map((p) => p.played), 1);
  const allElos = Object.values(eloMap);
  const avgElo =
    allElos.reduce((s, v) => s + v, 0) / Math.max(allElos.length, 1);

  return pairs
    .map((p) => {
      const [n1, n2] = p.players;
      const avgMargin = p.played ? (p.gf - p.ga) / p.played : 0;
      const winPctNorm = p.winPct / 100;
      const marginNorm = Math.min(1, Math.max(0, (avgMargin + 5) / 10));
      const activityNorm = p.played / maxPlayed;

      // vs-strong: wins against above-average ELO opponents
      const sorted = [...matches].sort((a, b) =>
        (a.date || "").localeCompare(b.date || ""),
      );
      let strongWins = 0,
        strongPlayed = 0;
      sorted.forEach((m) => {
        const inA =
          (m.teamA || []).includes(n1) && (m.teamA || []).includes(n2);
        const inB =
          (m.teamB || []).includes(n1) && (m.teamB || []).includes(n2);
        if (!inA && !inB) return;
        const opps = inA ? m.teamB || [] : m.teamA || [];
        const oppAvgElo =
          opps.reduce((s, op) => s + (eloMap[op] || 1000), 0) /
          Math.max(opps.length, 1);
        if (oppAvgElo < avgElo) return;
        strongPlayed++;
        const aWon = m.scoreA > m.scoreB;
        if ((inA && aWon) || (inB && !aWon)) strongWins++;
      });
      const vsStrongNorm = strongPlayed >= 2 ? strongWins / strongPlayed : 0.5;

      const chemScore =
        winPctNorm * 0.4 +
        marginNorm * 0.25 +
        vsStrongNorm * 0.25 +
        activityNorm * 0.1;
      const score10 = Math.min(10, Math.round(chemScore * 10 * 10) / 10);
      const tier =
        score10 >= 8.5 ? "S" : score10 >= 7 ? "A" : score10 >= 5.5 ? "B" : "C";
      const tierColor =
        tier === "S"
          ? "var(--gold)"
          : tier === "A"
            ? "var(--green)"
            : tier === "B"
              ? "var(--theme)"
              : "var(--muted)";

      return {
        players: p.players,
        played: p.played,
        wins: p.wins,
        winPct: p.winPct,
        avgMargin,
        score: score10,
        tier,
        tierColor,
      };
    })
    .sort((a, b) => b.score - a.score);
}

// ── MATCH STORY CARDS ─────────────────────────────────────────
function computeMatchStories(matches) {
  if (matches.length < 2) return [];
  const sorted = [...matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  const stories = [];
  const eloHistory = {};
  const streaks = {};

  sorted.forEach((m, idx) => {
    const allP = [...(m.teamA || []), ...(m.teamB || [])];
    allP.forEach((p) => {
      if (!(p in eloHistory)) eloHistory[p] = 1000;
      if (!(p in streaks)) streaks[p] = { type: null, count: 0 };
    });

    const aWon = m.scoreA > m.scoreB;
    const avgA =
      m.teamA.reduce((s, p) => s + eloHistory[p], 0) /
      Math.max(m.teamA.length, 1);
    const avgB =
      m.teamB.reduce((s, p) => s + eloHistory[p], 0) /
      Math.max(m.teamB.length, 1);
    const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
    const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
    const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));

    const prevElos = { ...eloHistory };

    m.teamA.forEach((p) => {
      eloHistory[p] = (eloHistory[p] || 1000) + dA;
    });
    m.teamB.forEach((p) => {
      eloHistory[p] = (eloHistory[p] || 1000) + dB;
    });

    // Update streaks
    [...m.teamA, ...m.teamB].forEach((p) => {
      const won =
        (m.teamA.includes(p) && aWon) || (m.teamB.includes(p) && !aWon);
      const type = won ? "W" : "L";
      if (streaks[p].type === type) streaks[p].count++;
      else {
        streaks[p].type = type;
        streaks[p].count = 1;
      }
    });

    const date = m.date;

    // Story: Streak ended
    [...m.teamA, ...m.teamB].forEach((p) => {
      const prevStreak = streaks[p].count === 1 ? null : null; // tracked below
    });

    // Story: Upset (lower ELO team wins)
    const eloDiff = Math.abs(avgA - avgB);
    if (eloDiff >= 60) {
      const upsetTeam =
        aWon && avgA < avgB ? m.teamA : !aWon && avgB < avgA ? m.teamB : null;
      const favoriteTeam = upsetTeam === m.teamA ? m.teamB : m.teamA;
      if (upsetTeam) {
        stories.push({
          icon: "😱",
          type: "upset",
          text: `${upsetTeam.join(" & ")} upset ${favoriteTeam.join(" & ")} (+${Math.round(eloDiff)} ELO gap)`,
          date,
          score: `${m.scoreA}–${m.scoreB}`,
          matchIdx: idx,
        });
      }
    }

    // Story: ELO milestone (1050, 1100, 1150, 1200)
    allP.forEach((p) => {
      [1050, 1100, 1150, 1200, 1250].forEach((milestone) => {
        if (prevElos[p] < milestone && eloHistory[p] >= milestone) {
          stories.push({
            icon: "🏆",
            type: "milestone",
            text: `${p} crossed ELO ${milestone} for the first time!`,
            date,
            score: `ELO ${Math.round(eloHistory[p])}`,
            matchIdx: idx,
          });
        }
      });
    });

    // Story: Shutout (X–0)
    if (m.scoreA === 0 || m.scoreB === 0) {
      const winner = aWon ? m.teamA : m.teamB;
      const loser = aWon ? m.teamB : m.teamA;
      stories.push({
        icon: "💀",
        type: "shutout",
        text: `${winner.join(" & ")} shut out ${loser.join(" & ")} ${m.scoreA}–${m.scoreB}`,
        date,
        score: `${m.scoreA}–${m.scoreB}`,
        matchIdx: idx,
      });
    }
  });

  // Story: Longest win streak per player (all-time)
  const allStats = computeStats(matches);
  allStats.forEach((p) => {
    if (p.bestWinStreak >= 7) {
      stories.push({
        icon: "🔥",
        type: "streak",
        text: `${p.name} holds the all-time record: ${p.bestWinStreak}-match win streak`,
        date: null,
        score: `${p.bestWinStreak} wins`,
        matchIdx: null,
      });
    }
  });

  // Most recent stories first, limit 30
  return stories.reverse().slice(0, 30);
}

// ── ACHIEVEMENTS (new additions beyond computeBadges) ─────────
function computeAchievements(name, matches) {
  const sorted = [...matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  const playerMs = sorted.filter((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].includes(name),
  );
  const eloMap = computeElo(matches);
  const eloHistory = computeEloHistory(matches);
  const pts = eloHistory[name] || [];
  const allStats = computeStats(matches, eloMap);
  const ps = allStats.find((p) => p.name === name);
  if (!ps) return [];

  const ach = [];
  const add = (icon, label, desc, unlocked, progress = null) =>
    ach.push({ icon, label, desc, unlocked, progress });

  const wins = playerMs.filter((m) => {
    const inA = (m.teamA || []).includes(name);
    return (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
  });
  const closeMs = playerMs.filter((m) => Math.abs(m.scoreA - m.scoreB) <= 2);
  const closeWins = closeMs.filter((m) => {
    const inA = (m.teamA || []).includes(name);
    return (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
  });

  // Ice Cold — win 5 close games
  add(
    "🧊",
    "Ice Cold",
    "Win 5 close games (≤2 pt diff)",
    closeWins.length >= 5,
    `${Math.min(closeWins.length, 5)}/5`,
  );

  // King Slayer — beat the #1 ranked player
  const ranked = allStats;
  const topPlayer = ranked[0]?.name;
  const beatTop =
    topPlayer &&
    topPlayer !== name &&
    wins.some((m) => {
      const opps = (m.teamA || []).includes(name)
        ? m.teamB || []
        : m.teamA || [];
      return opps.includes(topPlayer);
    });
  add("👑", "King Slayer", `Beat the #1 ranked player`, beatTop);

  // Untouchable — 10-win streak
  add(
    "⚡",
    "Untouchable",
    "Achieve a 10-match win streak",
    ps.bestWinStreak >= 10,
    `${Math.min(ps.bestWinStreak, 10)}/10`,
  );

  // Wall — concede ≤10 pts in a match
  const wallMatch = playerMs.some((m) => {
    const inA = (m.teamA || []).includes(name);
    const conceded = inA ? m.scoreB : m.scoreA;
    const myScore = inA ? m.scoreA : m.scoreB;
    return myScore > conceded && conceded === 0;
  });
  add("🛡", "Wall", "Win a match conceding 0 games", wallMatch);

  // Sharpshooter — 75%+ win rate (min 10 matches)
  const winPct = ps.mp >= 10 ? Math.round((ps.mw / ps.mp) * 100) : 0;
  add(
    "🎯",
    "Sharpshooter",
    "80%+ win rate (min 10 matches)",
    ps.mp >= 10 && winPct >= 80,
    ps.mp >= 10 ? `${winPct}%` : `${ps.mp}/10 played`,
  );

  // On Fire — 5-match win streak
  add(
    "🔥",
    "On Fire",
    "Win 5 matches in a row",
    ps.bestWinStreak >= 5,
    `${Math.min(ps.bestWinStreak, 5)}/5`,
  );

  // Diamond — reach ELO 1200
  const peakElo =
    pts.length > 0 ? Math.max(...pts.map((p) => p.elo)) : eloMap[name] || 1000;
  add(
    "💎",
    "Diamond",
    "Reach ELO 1200",
    peakElo >= 1200,
    `Peak: ${Math.round(peakElo)}`,
  );

  // Chemistry Lab — 10 wins with same partner
  const partnerWins = ps.partnerWins || {};
  const bestPartnerWins = Math.max(0, ...Object.values(partnerWins));
  const bestPartnerName =
    Object.keys(partnerWins).find((k) => partnerWins[k] === bestPartnerWins) ||
    null;
  add(
    "🤝",
    "Chemistry Lab",
    "Win 10 matches with the same partner",
    bestPartnerWins >= 10,
    bestPartnerName ? `${bestPartnerWins}/10 with ${bestPartnerName}` : "0/10",
  );

  // Climber — rise 5+ ranks in a month
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const monthAgoStr = toLocalISODate(monthAgo);
  const oldMs = matches.filter((m) => (m.date || "") < monthAgoStr);
  const oldRank = computeStats(oldMs).findIndex((p) => p.name === name) + 1;
  const curRank = allStats.findIndex((p) => p.name === name) + 1;
  const rankRise = oldRank > 0 && curRank > 0 ? oldRank - curRank : 0;
  add(
    "⬆️",
    "Climber",
    "Rise 5+ ranks in a month",
    rankRise >= 5,
    rankRise > 0 ? `+${rankRise} ranks` : "—",
  );

  // Comeback Kid — win 3 close matches from behind concept (close wins)
  add(
    "😤",
    "Comeback Kid",
    "Win 3 tense close matches",
    closeWins.length >= 3,
    `${Math.min(closeWins.length, 3)}/3`,
  );

  // Upset Artist — beat 3 higher-ELO opponents in a row
  let consecUpsets = 0,
    maxConsecUpsets = 0;
  playerMs.forEach((m) => {
    const inA = (m.teamA || []).includes(name);
    const won = (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
    if (!won) {
      consecUpsets = 0;
      return;
    }
    const myTeam = inA ? m.teamA : m.teamB;
    const oppTeam = inA ? m.teamB : m.teamA;
    const myAvg =
      myTeam.reduce((s, p) => s + (eloMap[p] || 1000), 0) / myTeam.length;
    const oppAvg =
      oppTeam.reduce((s, p) => s + (eloMap[p] || 1000), 0) / oppTeam.length;
    if (oppAvg > myAvg + 20) {
      consecUpsets++;
      maxConsecUpsets = Math.max(maxConsecUpsets, consecUpsets);
    } else consecUpsets = 0;
  });
  add(
    "🎲",
    "Upset Artist",
    "Beat 3 higher-ELO opponents in a row",
    maxConsecUpsets >= 3,
    `${Math.min(maxConsecUpsets, 3)}/3`,
  );

  // Regular — play every week for 4 weeks
  const weeks = new Set(
    playerMs
      .map((m) => {
        if (!m.date) return null;
        const d = new Date(m.date + "T00:00:00");
        const jan1 = new Date(d.getFullYear(), 0, 1);
        return `${d.getFullYear()}-${Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7)}`;
      })
      .filter(Boolean),
  );
  add(
    "📅",
    "Regular",
    "Play at least once a week for 4 weeks",
    weeks.size >= 4,
    `${Math.min(weeks.size, 4)}/4 weeks`,
  );

  // Season MVP placeholder — top SR in any month
  const monthStats = {};
  matches.forEach((m) => {
    const mo = (m.date || "").slice(0, 7);
    if (!monthStats[mo]) monthStats[mo] = [];
    monthStats[mo].push(m);
  });
  const isMVP = Object.values(monthStats).some((ms) => {
    const st = computeStats(ms);
    return st.length && st[0].name === name;
  });
  add("🥇", "Season MVP", "Finish #1 in any month", isMVP);

  return ach;
}

// ── SEASON MODE ───────────────────────────────────────────────
function computeSeasons(matches) {
  if (!matches.length) return [];
  const sorted = [...matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  // Group by calendar month
  const byMonth = {};
  sorted.forEach((m) => {
    const mo = (m.date || "").slice(0, 7);
    if (!byMonth[mo]) byMonth[mo] = [];
    byMonth[mo].push(m);
  });
  return Object.entries(byMonth)
    .map(([month, ms]) => {
      const eloMap = computeElo(ms);
      const stats = computeStats(ms, eloMap).filter((p) => p.mp >= 2);
      const pairs = getPairStats(ms).filter((p) => p.played >= 2);
      const mvp = stats[0] || null;
      const topPair = pairs[0] || null;
      const priorEloMap = stats.length > 1
        ? computeElo(sorted.filter((m) => (m.date || "") < month + "-01"))
        : null;
      const mostImproved =
        priorEloMap
          ? [...stats].sort((a, b) =>
              (eloMap[b.name] || 1000) - (priorEloMap[b.name] || 1000) -
              ((eloMap[a.name] || 1000) - (priorEloMap[a.name] || 1000))
            )[0]
          : null;
      const ironMan = stats.length
        ? [...stats].sort((a, b) => b.mp - a.mp)[0]
        : null;
      const [yr, mo] = month.split("-");
      const monthName = new Date(+yr, +mo - 1, 1).toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
      return {
        month,
        monthName,
        matches: ms.length,
        players: stats,
        pairs,
        mvp,
        topPair,
        mostImproved,
        ironMan,
      };
    })
    .reverse();
}

function _partnerTab(btn, tab) {
  const panels = ["chemistry", "partners", "synergy", "form"];
  panels.forEach((t) => {
    const el = document.getElementById(`partner-tab-${t}`);
    if (el) el.style.display = t === tab ? "" : "none";
  });
  btn
    .closest(".partner-tabs")
    ?.querySelectorAll(".partner-tab")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
}

function _simUpdateSlots() {
  const slots = { a1: _simA1, a2: _simA2, b1: _simB1, b2: _simB2 };
  Object.entries(slots).forEach(([k, v]) => {
    const lbl = document.getElementById(`sim-label-${k}`);
    const btn = document.getElementById(`sim-slot-${k}`);
    if (lbl) lbl.textContent = v || "—";
    if (btn) btn.classList.toggle("h2h-slot-filled", !!v);
  });
}

function runMatchSimulator() {
  const a1 = _simA1;
  const a2 = _simA2;
  const b1 = _simB1;
  const b2 = _simB2;
  const result = document.getElementById("sim-result");
  if (!result) return;

  if (!a1 || !a2 || !b1 || !b2) {
    result.innerHTML =
      '<div class="sub" style="color:var(--red);padding:8px 0">Select all 4 players.</div>';
    return;
  }
  if (new Set([a1, a2, b1, b2]).size < 4) {
    result.innerHTML =
      '<div class="sub" style="color:var(--red);padding:8px 0">All 4 players must be different.</div>';
    return;
  }

  const eloMap = _memoElo();
  const e = (p) => eloMap[p] || 1000;
  const avgA = (e(a1) + e(a2)) / 2;
  const avgB = (e(b1) + e(b2)) / 2;
  const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
  const expB = 1 - expA;
  const winPctA = Math.round(expA * 100);
  const winPctB = 100 - winPctA;

  const dAwin = Math.round(32 * (1 - expA));
  const dBlose = Math.round(32 * (0 - expB));
  const dAlose = Math.round(32 * (0 - expA));
  const dBwin = Math.round(32 * (1 - expB));

  const fmt = (n) => (n > 0 ? `+${n}` : `${n}`);
  const col = (n) =>
    n > 0 ? "var(--green)" : n < 0 ? "var(--red)" : "var(--muted)";

  result.innerHTML = `
    <div class="sim-result-inner">
      <div class="sim-prob-row">
        <span class="sim-prob-val" style="color:var(--green)">${winPctA}%</span>
        <div class="sim-prob-track">
          <div class="sim-prob-fill-a" style="width:${winPctA}%"></div>
          <div class="sim-prob-fill-b" style="width:${winPctB}%"></div>
        </div>
        <span class="sim-prob-val" style="color:var(--red)">${winPctB}%</span>
      </div>
      <div class="sim-outcomes">
        <div class="sim-outcome">
          <div class="sim-outcome-title" style="color:var(--green)">If A wins</div>
          <div class="sim-p-row"><span>${a1}</span><span style="color:${col(dAwin)};font-weight:800">${fmt(dAwin)}</span></div>
          <div class="sim-p-row"><span>${a2}</span><span style="color:${col(dAwin)};font-weight:800">${fmt(dAwin)}</span></div>
          <div class="sim-p-row"><span>${b1}</span><span style="color:${col(dBlose)};font-weight:800">${fmt(dBlose)}</span></div>
          <div class="sim-p-row"><span>${b2}</span><span style="color:${col(dBlose)};font-weight:800">${fmt(dBlose)}</span></div>
        </div>
        <div class="sim-outcome-div"></div>
        <div class="sim-outcome">
          <div class="sim-outcome-title" style="color:var(--red)">If B wins</div>
          <div class="sim-p-row"><span>${a1}</span><span style="color:${col(dAlose)};font-weight:800">${fmt(dAlose)}</span></div>
          <div class="sim-p-row"><span>${a2}</span><span style="color:${col(dAlose)};font-weight:800">${fmt(dAlose)}</span></div>
          <div class="sim-p-row"><span>${b1}</span><span style="color:${col(dBwin)};font-weight:800">${fmt(dBwin)}</span></div>
          <div class="sim-p-row"><span>${b2}</span><span style="color:${col(dBwin)};font-weight:800">${fmt(dBwin)}</span></div>
        </div>
      </div>
    </div>`;
}


function buildEloTimelineHtml(filterKey) {
  filterKey = filterKey || _eloTLFilter || "all";
  _eloTLFilter = filterKey;
  const history = _memoEloHistory();
  const eloNow = _memoElo();
  const players = Object.keys(history)
    .filter((p) => (history[p] || []).length >= 2)
    .sort((a, b) => (eloNow[b] || 1000) - (eloNow[a] || 1000));
  if (!players.length)
    return '<div class="sub" style="padding:8px">No ELO data yet.</div>';
  if (!_eloTLPlayer || !history[_eloTLPlayer]) _eloTLPlayer = players[0];
  const name = _eloTLPlayer;
  let pts = [...(history[name] || [])];
  const now = new Date();
  const todayStr = toLocalISODate(now);
  const dayOfWeek = now.getDay();
  const daysToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() + daysToMon);
  const thisMondayStr = toLocalISODate(thisMonday);
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastMondayStr = toLocalISODate(lastMonday);
  const lastSundayStr = toLocalISODate(
    new Date(thisMonday.getTime() - 86400000),
  );

  if (filterKey === "3m") {
    const c = new Date(now);
    c.setMonth(c.getMonth() - 3);
    const cs = toLocalISODate(c);
    pts = pts.filter((p) => (p.date || "") >= cs);
  } else if (filterKey === "1m") {
    const c = new Date(now);
    c.setMonth(c.getMonth() - 1);
    const cs = toLocalISODate(c);
    pts = pts.filter((p) => (p.date || "") >= cs);
  } else if (filterKey === "1w") {
    const c = new Date(now);
    c.setDate(c.getDate() - 7);
    const cs = toLocalISODate(c);
    pts = pts.filter((p) => (p.date || "") >= cs);
  } else if (filterKey === "thisweek") {
    pts = pts.filter((p) => (p.date || "") >= thisMondayStr);
  } else if (filterKey === "lastweek") {
    pts = pts.filter(
      (p) => (p.date || "") >= lastMondayStr && (p.date || "") <= lastSundayStr,
    );
  } else if (filterKey === "today") {
    pts = pts.filter((p) => p.date === todayStr);
  }
  _eloTLPts = pts;
  const chips = players
    .map(
      (p) =>
        `<button class="elo-tl-chip${p === name ? " active" : ""}" onclick="selectEloTLPlayer(${jsArg(p)})">${escHtml(p)}</button>`,
    )
    .join("");
  const pills = [
    { k: "all", l: "ALL" },
    { k: "3m", l: "3M" },
    { k: "1m", l: "1M" },
    { k: "1w", l: "1W" },
    { k: "thisweek", l: "THIS WK" },
    { k: "lastweek", l: "LAST WK" },
    { k: "today", l: "TODAY" },
  ]
    .map(
      (f) =>
        `<button class="elo-tl-filter${filterKey === f.k ? " active" : ""}" onclick="filterEloTimeline('${f.k}')">${f.l}</button>`,
    )
    .join("");
  let chartHtml = "";
  if (pts.length < 2) {
    chartHtml =
      '<div class="sub" style="padding:16px 0;text-align:center">Not enough data for selected period.</div>';
  } else {
    // Pre-compute overlay pts so Y range includes both players
    let overlayPts = [];
    if (_eloTLOverlay && _eloTLOverlay !== name && history[_eloTLOverlay]) {
      let rawOpts = [...history[_eloTLOverlay]];
      if (filterKey === "3m") {
        const c = new Date(now); c.setMonth(c.getMonth() - 3);
        rawOpts = rawOpts.filter((p) => (p.date || "") >= toLocalISODate(c));
      } else if (filterKey === "1m") {
        const c = new Date(now); c.setMonth(c.getMonth() - 1);
        rawOpts = rawOpts.filter((p) => (p.date || "") >= toLocalISODate(c));
      } else if (filterKey === "1w") {
        const c = new Date(now); c.setDate(c.getDate() - 7);
        rawOpts = rawOpts.filter((p) => (p.date || "") >= toLocalISODate(c));
      } else if (filterKey === "thisweek") {
        rawOpts = rawOpts.filter((p) => (p.date || "") >= thisMondayStr);
      } else if (filterKey === "lastweek") {
        rawOpts = rawOpts.filter((p) => (p.date || "") >= lastMondayStr && (p.date || "") <= lastSundayStr);
      } else if (filterKey === "today") {
        rawOpts = rawOpts.filter((p) => p.date === todayStr);
      }
      if (rawOpts.length >= 2) overlayPts = rawOpts;
    }

    const W = 320,
      pl = 38,
      pr = 10,
      pt = 10,
      pb = 20;
    const allElos = [...pts.map((p) => p.elo), ...overlayPts.map((p) => p.elo)];
    const rawMin = Math.min(...allElos);
    const rawMax = Math.max(...allElos);
    const combinedRange = rawMax - rawMin;
    const H = Math.max(100, Math.min(220, pt + pb + Math.round(combinedRange * 0.6)));
    const cW = W - pl - pr,
      cH = H - pt - pb;
    const minE = rawMin - 15;
    const maxE = rawMax + 15;
    const eRange = Math.max(1, maxE - minE);
    const toX = (i) => pl + (i / Math.max(pts.length - 1, 1)) * cW;
    const toY = (e) => pt + (1 - (e - minE) / eRange) * cH;
    const col = playerColor(name);
    const gradId = `etgtl_${name.replace(/[^a-zA-Z0-9]/g, "")}`;
    const yLines = [
      minE + eRange * 0.25,
      minE + eRange * 0.5,
      minE + eRange * 0.75,
    ]
      .map((ev) => {
        const y = toY(ev);
        return `<line x1="${pl}" y1="${y.toFixed(1)}" x2="${W - pr}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/><text x="${pl - 3}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="7" fill="rgba(255,255,255,0.3)">${Math.round(ev)}</text>`;
      })
      .join("");
    const polyline = pts
      .map((p, i) => `${toX(i).toFixed(1)},${toY(p.elo).toFixed(1)}`)
      .join(" ");
    const area =
      `M${toX(0).toFixed(1)},${(H - pb).toFixed(1)} ` +
      pts
        .map((p, i) => `L${toX(i).toFixed(1)},${toY(p.elo).toFixed(1)}`)
        .join(" ") +
      ` L${toX(pts.length - 1).toFixed(1)},${(H - pb).toFixed(1)} Z`;
    const circles = pts
      .map(
        (p, i) =>
          `<circle cx="${toX(i).toFixed(1)}" cy="${toY(p.elo).toFixed(1)}" r="4" fill="${p.won ? "var(--green)" : "var(--red)"}" stroke="rgba(0,0,0,0.4)" stroke-width="0.5" style="cursor:pointer" onclick="showEloMatchDetail(${i})"></circle>`,
      )
      .join("");
    const lastElo = pts[pts.length - 1].elo;
    const startElo = pts[0].elo - pts[0].delta;
    const netChange = lastElo - startElo;
    const netStr = netChange > 0 ? `+${netChange}` : String(netChange);
    const netCol =
      netChange > 0
        ? "var(--green)"
        : netChange < 0
          ? "var(--red)"
          : "var(--muted)";
    // Peak / trough annotations
    let peakIdx = 0,
      troughIdx = 0;
    pts.forEach((p, i) => {
      if (p.elo > pts[peakIdx].elo) peakIdx = i;
      if (p.elo < pts[troughIdx].elo) troughIdx = i;
    });
    const annot = (i, label, fill) => {
      const x = toX(i);
      const y = toY(pts[i].elo);
      const above = pts[i].elo - minE > eRange * 0.5;
      const ly = above ? y + 18 : y - 12;
      return `<g>
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="none" stroke="${fill}" stroke-width="1.5"/>
        <text x="${x.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="8" font-weight="900" fill="${fill}">${label} ${pts[i].elo}</text>
      </g>`;
    };
    const peakTroughAnnotations =
      peakIdx !== troughIdx
        ? annot(peakIdx, "▲", "var(--gold)") + annot(troughIdx, "▼", "var(--red)")
        : "";

    // Overlay: 2nd player line (uses pre-computed overlayPts)
    let overlayHtml = "";
    if (overlayPts.length >= 2) {
      const overlayCol = playerColor(_eloTLOverlay);
      const overlayPoly = overlayPts
        .map((p, i) => `${toX((i / Math.max(overlayPts.length - 1, 1)) * (pts.length - 1)).toFixed(1)},${toY(p.elo).toFixed(1)}`)
        .join(" ");
      overlayHtml = `<polyline points="${overlayPoly}" fill="none" stroke="${overlayCol}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="4 3" opacity="0.85"/>
        <text x="${(toX(pts.length - 1) - 4).toFixed(1)}" y="${(toY(overlayPts[overlayPts.length - 1].elo) - 5).toFixed(1)}" text-anchor="end" font-size="9" font-weight="800" fill="${overlayCol}">${_eloTLOverlay}</text>`;
    }

    chartHtml = `<div style="display:flex;justify-content:space-between;align-items:center;margin:8px 0 6px">
        <div style="font-size:9px;color:var(--muted)">● W &nbsp;● L &nbsp;· ${pts.length} matches</div>
        <div style="font-size:12px;font-weight:800;color:${netCol}">${netStr} ELO</div>
      </div>
      <div style="overflow-x:auto">
        <svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block;overflow:visible">
          ${yLines}
          <defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${col}" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="${col}" stop-opacity="0"/>
          </linearGradient></defs>
          <path d="${area}" fill="url(#${gradId})"/>
          <polyline points="${polyline}" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          ${overlayHtml}
          ${circles}
          ${peakTroughAnnotations}
          <text x="${toX(pts.length - 1).toFixed(1)}" y="${(toY(lastElo) - 7).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="900" fill="${col}">${lastElo}</text>
        </svg>
      </div>
      <div id="elo-tl-detail"></div>`;
  }
  // Build overlay selector
  const overlaySelector = `<div style="display:flex;align-items:center;gap:6px;margin:6px 0">
    <button class="filter-fab-btn${_eloTLOverlay ? " filter-fab-active" : ""}" onclick="openEloTLOverlaySheet()" style="flex:1;text-align:left"><span>${_eloTLOverlay || "+ COMPARE WITH…"}</span></button>
    ${_eloTLOverlay ? `<button class="elo-tl-clear" onclick="_eloTLSetOverlay('')">✕</button>` : ""}
  </div>`;
  return `<div class="ana-card" style="padding:10px 12px">
    <div class="elo-tl-players">${chips}</div>
    <div class="elo-tl-filters">${pills}</div>
    ${overlaySelector}
    ${chartHtml}
  </div>`;
}

function _eloTLSetOverlay(name) {
  _eloTLOverlay = name || "";
  _rerenderEloTLSection();
}

function openEloTLOverlaySheet() {
  _filterSheetMode = "eloTLOverlay";
  const el = document.getElementById("filter-sheet-title");
  if (el) el.textContent = "COMPARE WITH";
  const list = document.getElementById("filter-sheet-list");
  if (!list) return;
  const history = _memoEloHistory();
  const players = sortPlayersGuestsLast(Object.keys(history).filter((p) => p !== _eloTLPlayer));
  list.innerHTML =
    `<div class="live-sheet-item" onclick="selectFilterItem('')"><div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--muted)">—</div><span>None</span></div>` +
    players.map((p) => {
      const sel = p === _eloTLOverlay ? " live-sheet-item-selected" : "";
      return `<div class="live-sheet-item${sel}" onclick="selectFilterItem(${jsArg(p)})">${sheetAvSm(p)}<span>${escHtml(p)}</span></div>`;
    }).join("");
  const overlay = document.getElementById("filter-sheet-overlay");
  const sheet = document.getElementById("filter-sheet");
  if (overlay) overlay.classList.add("live-sheet-open");
  if (sheet) sheet.classList.add("live-sheet-open");
}

function _rerenderEloTLSection() {
  const el = document.querySelector(
    '.ana-sec[data-key="eloTimeline"] .ana-sec-body',
  );
  if (el) el.innerHTML = buildEloTimelineHtml(_eloTLFilter);
}

function selectEloTLPlayer(name) {
  _eloTLPlayer = name;
  _rerenderEloTLSection();
}

function filterEloTimeline(key) {
  _eloTLFilter = key;
  _rerenderEloTLSection();
}

function showEloMatchDetail(idx) {
  const p = _eloTLPts[idx];
  const d = document.getElementById("elo-tl-detail");
  if (!d || !p) return;
  const dStr = p.delta > 0 ? `+${p.delta}` : String(p.delta);
  const dCol =
    p.delta > 0 ? "var(--green)" : p.delta < 0 ? "var(--red)" : "var(--muted)";
  d.innerHTML = `<div style="margin-top:8px;padding:8px 10px;background:rgba(255,255,255,0.04);border-radius:8px;border-left:3px solid ${p.won ? "var(--green)" : "var(--red)"}">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:11px;font-weight:700;color:${p.won ? "var(--green)" : "var(--red)"}">${p.won ? "WIN" : "LOSS"}</span>
      <span style="font-size:10px;color:var(--muted)">${fmtDate(p.date)}</span>
    </div>
    <div style="margin-top:3px;font-size:11px">vs <strong>${p.opponent.toUpperCase()}</strong></div>
    <div style="margin-top:3px;display:flex;gap:12px;font-size:11px">
      <span style="color:var(--muted)">Score: <strong style="color:var(--fg)">${p.scoreA}–${p.scoreB}</strong></span>
      <span style="color:var(--muted)">ELO: <strong style="color:var(--fg)">${p.elo}</strong></span>
      <span style="font-weight:700;color:${dCol}">${dStr}</span>
    </div>
  </div>`;
}

function _updateEloProbSlots() {
  const aBtn = document.getElementById("eloProb-slot-p1");
  const bBtn = document.getElementById("eloProb-slot-p2");
  if (aBtn) {
    document.getElementById("eloProb-label-p1").textContent =
      _eloProbP1 || "P1";
    aBtn.classList.toggle("h2h-slot-filled", !!_eloProbP1);
  }
  if (bBtn) {
    document.getElementById("eloProb-label-p2").textContent =
      _eloProbP2 || "P2";
    bBtn.classList.toggle("h2h-slot-filled", !!_eloProbP2);
  }
  if (_eloProbP1 && _eloProbP2 && _eloProbP1 !== _eloProbP2) calcEloWinProb();
  else {
    const r = document.getElementById("elo-prob-result");
    if (r) r.innerHTML = "";
  }
}

function openEloProbSheet(slot) {
  _filterSheetMode = slot === "p1" ? "eloprobp1" : "eloprobp2";
  const el = document.getElementById("filter-sheet-title");
  if (el) el.textContent = slot === "p1" ? "SELECT P1" : "SELECT P2";
  const list = document.getElementById("filter-sheet-list");
  if (!list) return;
  const taken = slot === "p1" ? _eloProbP2 : _eloProbP1;
  const selected = slot === "p1" ? _eloProbP1 : _eloProbP2;
  const players = sortPlayersGuestsLast(computeStats(activeMatches()).map((s) => s.name));
  list.innerHTML = players
    .map((p) => {
      const disabled =
        p === taken ? ' style="opacity:0.3;pointer-events:none"' : "";
      const sel = p === selected ? " live-sheet-item-selected" : "";
      return `<div class="live-sheet-item${sel}"${disabled} onclick="selectFilterItem(${jsArg(p)})">${sheetAvSm(p)}<span>${escHtml(p)}</span></div>`;
    })
    .join("");
  const overlay = document.getElementById("filter-sheet-overlay");
  const sheet = document.getElementById("filter-sheet");
  if (overlay) overlay.classList.add("live-sheet-open");
  if (sheet) sheet.classList.add("live-sheet-open");
}

function openWhatIfPlayerSheet() {
  _filterSheetMode = "whatifplayer";
  const el = document.getElementById("filter-sheet-title");
  if (el) el.textContent = "SELECT PLAYER";
  const list = document.getElementById("filter-sheet-list");
  if (!list) return;
  const players = sortPlayersGuestsLast(computeStats(activeMatches()).map((s) => s.name));
  list.innerHTML = players
    .map((p) => {
      const sel = p === _whatIfPlayer ? " live-sheet-item-selected" : "";
      return `<div class="live-sheet-item${sel}" onclick="selectFilterItem(${jsArg(p)})">${sheetAvSm(p)}<span>${escHtml(p)}</span></div>`;
    })
    .join("");
  const overlay = document.getElementById("filter-sheet-overlay");
  const sheet = document.getElementById("filter-sheet");
  if (overlay) overlay.classList.add("live-sheet-open");
  if (sheet) sheet.classList.add("live-sheet-open");
}

function calcEloWinProb() {
  const p1 = _eloProbP1;
  const p2 = _eloProbP2;
  const result = document.getElementById("elo-prob-result");
  if (!result) return;
  if (!p1 || !p2 || p1 === p2) {
    result.innerHTML =
      '<div class="sub" style="color:var(--red);padding:4px">Select two different players.</div>';
    return;
  }
  const em = _memoElo();
  const e1 = em[p1] || 1000;
  const e2 = em[p2] || 1000;
  const prob = 1 / (1 + Math.pow(10, (e2 - e1) / 400));
  const pct1 = Math.round(prob * 100);
  const pct2 = 100 - pct1;
  const col1 = playerColor(p1);
  const col2 = playerColor(p2);
  result.innerHTML = `<div style="margin-top:8px">
    <div style="display:flex;align-items:center;gap:0;margin-bottom:10px;border-radius:6px;overflow:hidden;height:10px">
      <div style="flex:${pct1};background:${col1};height:100%;min-width:4px"></div>
      <div style="flex:${pct2};background:${col2};height:100%;min-width:4px"></div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="font-size:22px;font-weight:900;color:${col1}">${pct1}%</div>
        <div style="font-size:10px;color:var(--muted)">${p1.toUpperCase()}</div>
        <div style="font-size:9px;color:var(--muted)">ELO ${e1}</div>
      </div>
      <div style="font-size:10px;color:var(--muted);padding-top:6px">WIN CHANCE</div>
      <div style="text-align:right">
        <div style="font-size:22px;font-weight:900;color:${col2}">${pct2}%</div>
        <div style="font-size:10px;color:var(--muted)">${p2.toUpperCase()}</div>
        <div style="font-size:9px;color:var(--muted)">ELO ${e2}</div>
      </div>
    </div>
  </div>`;
}

// ── ELO WIN PROBABILITY STATE ──────────────────────────────
let _eloProbP1 = "";
let _eloProbP2 = "";

// ── WHAT-IF SIMULATOR STATE ────────────────────────────────
let _whatIfToggles = {}; // matchIdx -> bool (false = excluded)
let _whatIfFlips = {}; // matchIdx -> bool (true = flip outcome)
let _whatIfPlayer = "";

function renderWhatIfSection(playerName) {
  _whatIfPlayer = playerName;
  _whatIfToggles = {};
  _whatIfFlips = {};
  const matchesEl = document.getElementById("whatif-matches");
  const resultEl = document.getElementById("whatif-result");
  const ctrlEl = document.getElementById("whatif-controls");
  if (!matchesEl || !resultEl) return;
  if (!playerName) {
    matchesEl.innerHTML = "";
    resultEl.innerHTML = "";
    if (ctrlEl) ctrlEl.style.display = "none";
    return;
  }
  const playerMatches = allMatches
    .map((m, i) => ({ m, i }))
    .filter(({ m }) =>
      [...(m.teamA || []), ...(m.teamB || [])].includes(playerName),
    );
  playerMatches.forEach(({ i }) => {
    _whatIfToggles[i] = true;
    _whatIfFlips[i] = false;
  });
  if (ctrlEl) ctrlEl.style.display = "flex";
  _renderWhatIfRows(playerName, playerMatches);
  resultEl.innerHTML = "";
}

function _renderWhatIfRows(playerName, playerMatches) {
  const matchesEl = document.getElementById("whatif-matches");
  if (!matchesEl) return;
  matchesEl.innerHTML =
    `<div class="whatif-list">` +
    playerMatches
      .slice(-20)
      .reverse()
      .map(({ m, i }) => {
        const inA = (m.teamA || []).includes(playerName);
        const baseWon =
          (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
        const flipped = !!_whatIfFlips[i];
        const effectiveWon = flipped ? !baseWon : baseWon;
        const excluded = _whatIfToggles[i] === false;
        const partner = (inA ? m.teamA : m.teamB)
          .filter((p) => p !== playerName)
          .join(" & ");
        const opp = (inA ? m.teamB : m.teamA).join(" & ");
        return `<div class="whatif-row${excluded ? " wi-excluded" : ""}${flipped ? " wi-flipped" : ""}">
        <div class="wi-outcome-dot" style="background:${effectiveWon ? "var(--green)" : "var(--red)"}"></div>
        <div class="wi-match-info">
          <span class="wi-date">${fmtDate(m.date)}</span>
          <span class="wi-vs">w/ ${partner || "—"} vs ${opp}</span>
          <span class="wi-score${flipped ? " wi-score-flipped" : ""}">${m.scoreA}–${m.scoreB}${flipped ? " →FLIPPED" : ""}</span>
        </div>
        <div class="wi-actions">
          <button class="wi-btn wi-flip${flipped ? " active" : ""}" title="${flipped ? "Restore outcome" : "Flip to " + (baseWon ? "Loss" : "Win")}" onclick="toggleWhatIfFlip(${i})"
            ${excluded ? "disabled" : ""}>⇄</button>
          <button class="wi-btn wi-excl${excluded ? " active" : ""}" title="${excluded ? "Re-include" : "Exclude match"}" onclick="toggleWhatIfMatch(${i})">✕</button>
        </div>
      </div>`;
      })
      .join("") +
    `</div>
    <button class="btn-go" style="width:100%;font-size:11px;margin-top:8px" onclick="recomputeWhatIfElo()">SIMULATE ▶</button>`;
}

function toggleWhatIfMatch(idx) {
  _whatIfToggles[idx] = _whatIfToggles[idx] === false ? true : false;
  if (_whatIfToggles[idx] === false) _whatIfFlips[idx] = false; // can't flip excluded
  _refreshWhatIfRows();
}

function toggleWhatIfFlip(idx) {
  _whatIfFlips[idx] = !_whatIfFlips[idx];
  _refreshWhatIfRows();
}

function whatIfFlipAllLosses() {
  const eloMap = _memoElo();
  allMatches.forEach((m, i) => {
    if (!_whatIfToggles.hasOwnProperty(i)) return;
    const inA = (m.teamA || []).includes(_whatIfPlayer);
    const won = (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
    if (!won && _whatIfToggles[i] !== false) _whatIfFlips[i] = true;
  });
  _refreshWhatIfRows();
}

function whatIfReset() {
  Object.keys(_whatIfToggles).forEach((i) => {
    _whatIfToggles[i] = true;
    _whatIfFlips[i] = false;
  });
  _refreshWhatIfRows();
  document.getElementById("whatif-result").innerHTML = "";
}

function _refreshWhatIfRows() {
  if (!_whatIfPlayer) return;
  const playerMatches = allMatches
    .map((m, i) => ({ m, i }))
    .filter(({ m }) =>
      [...(m.teamA || []), ...(m.teamB || [])].includes(_whatIfPlayer),
    );
  _renderWhatIfRows(_whatIfPlayer, playerMatches);
}

function recomputeWhatIfElo() {
  const resultEl = document.getElementById("whatif-result");
  if (!resultEl || !_whatIfPlayer) return;
  // Build the modified match list
  const whatIfMatches = allMatches
    .filter((m, i) => _whatIfToggles[i] !== false)
    .map((m) => {
      const i = allMatches.indexOf(m);
      if (_whatIfFlips[i]) {
        // Flip: swap scores so the outcome reverses
        return { ...m, scoreA: m.scoreB, scoreB: m.scoreA };
      }
      return m;
    });
  const actualElo = _memoElo()[_whatIfPlayer] || 1000;
  const whatIfElo = computeElo(whatIfMatches)[_whatIfPlayer] || 1000;
  const diff = whatIfElo - actualElo;
  const col =
    diff > 0 ? "var(--green)" : diff < 0 ? "var(--red)" : "var(--muted)";
  const sign = diff > 0 ? "+" : "";
  // Rank change
  const actualRanked = Object.entries(_memoElo()).sort(
    (a, b) => b[1] - a[1],
  );
  const whatIfRanked = Object.entries(computeElo(whatIfMatches)).sort(
    (a, b) => b[1] - a[1],
  );
  const actualRank = actualRanked.findIndex(([n]) => n === _whatIfPlayer) + 1;
  const whatIfRank = whatIfRanked.findIndex(([n]) => n === _whatIfPlayer) + 1;
  const rankDiff = actualRank - whatIfRank;
  const rankStr =
    rankDiff > 0
      ? `▲${rankDiff}`
      : rankDiff < 0
        ? `▼${Math.abs(rankDiff)}`
        : "—";
  const rankCol =
    rankDiff > 0
      ? "var(--green)"
      : rankDiff < 0
        ? "var(--red)"
        : "var(--muted)";
  const excluded = Object.values(_whatIfToggles).filter((v) => !v).length;
  const flipped = Object.values(_whatIfFlips).filter((v) => v).length;
  const eloPillCls = diff > 0 ? "positive" : diff < 0 ? "negative" : "neutral";
  const rankPillCls =
    rankDiff > 0 ? "positive" : rankDiff < 0 ? "negative" : "neutral";
  resultEl.innerHTML = `<div class="whatif-result-card">
    <div class="wi-res-row">
      <div class="wi-res-cell">
        <div class="wi-res-label">ACTUAL ELO</div>
        <div class="wi-res-val">${actualElo}</div>
        <div class="wi-res-sub">Rank #${actualRank}</div>
      </div>
      <div class="wi-res-arrow">→</div>
      <div class="wi-res-cell">
        <div class="wi-res-label">WHAT-IF ELO</div>
        <div class="wi-res-val">${whatIfElo}</div>
        <div class="wi-res-sub">Rank #${whatIfRank}</div>
      </div>
    </div>
    <div class="wi-res-deltas">
      <span class="wi-delta-pill ${eloPillCls}">${sign}${diff} ELO</span>
      <span class="wi-delta-pill ${rankPillCls}">${rankStr} rank</span>
      ${flipped ? `<span class="wi-delta-pill neutral">${flipped} flipped</span>` : ""}
      ${excluded ? `<span class="wi-delta-pill neutral">${excluded} excluded</span>` : ""}
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════════════
// ── NEW ANALYTICS SECTION BUILDERS ────────────────────────────
// ══════════════════════════════════════════════════════════════

// ── RANK HISTORY HELPERS ──────────────────────────────────────

const _rankPeriodCache = {};
const _MIN_RANK_PERIODS = 3;
const _MIN_RANK_PLAYERS = 3;

function _computeRankPeriods(periodType) {
  const fp = `${periodType}|${_lightFingerprint(activeMatches())}`;
  if (_rankPeriodCache[fp]) return _rankPeriodCache[fp];

  const matches = activeMatches();
  if (!matches.length) return (_rankPeriodCache[fp] = []);

  const buckets = {};
  matches.forEach((m) => {
    if (!m.date) return;
    let key;
    if (periodType === "week") {
      const d = new Date(m.date + "T00:00:00");
      const dow = d.getDay();
      d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
      key = toLocalISODate(d);
    } else if (periodType === "today") {
      key = m.date;
    } else if (periodType === "weekend") {
      const d = new Date(m.date + "T00:00:00");
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) return; // skip weekday matches
      const sat = new Date(d);
      if (dow === 0) sat.setDate(d.getDate() - 1);
      key = toLocalISODate(sat);
    } else {
      key = m.date.slice(0, 7);
    }
    if (!buckets[key]) buckets[key] = { key, matches: [], from: m.date, to: m.date };
    buckets[key].matches.push(m);
    if (m.date < buckets[key].from) buckets[key].from = m.date;
    if (m.date > buckets[key].to) buckets[key].to = m.date;
  });

  const _shortMonths = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const result = Object.values(buckets)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((b, idx) => {
      const distinct = new Set(b.matches.flatMap(m => [...(m.teamA||[]), ...(m.teamB||[])]));
      let label;
      if (periodType === "week") {
        const parts = fmtDate(b.key).replace(/^\w+,\s*/, "").replace(/\s\d{4}$/, "");
        label = "Wk " + parts;
      } else if (periodType === "today") {
        const [, mo, dd] = b.key.split("-");
        label = parseInt(dd) + " " + _shortMonths[parseInt(mo)];
      } else if (periodType === "weekend") {
        const [, mo, dd] = b.key.split("-");
        label = "Wknd " + parseInt(dd) + " " + _shortMonths[parseInt(mo)];
      } else {
        const [y, mo] = b.key.split("-");
        label = _shortMonths[parseInt(mo)] + " '" + y.slice(2);
      }
      if (distinct.size < _MIN_RANK_PLAYERS) return { key: b.key, from: b.from, to: b.to, label, ranks: [], idx };
      const eloMap = computeElo(b.matches);
      const statsArr = computeStats(b.matches, eloMap);
      const ranks = statsArr.map((p, i) => ({ name: p.name, rank: i + 1, sr: p.sr, mp: p.mp }));
      return { key: b.key, from: b.from, to: b.to, label, ranks, idx };
    });

  return (_rankPeriodCache[fp] = result);
}

function _rankColor(rank, maxRank) {
  const t = (rank - 1) / Math.max(maxRank - 1, 1);
  return `hsl(${Math.round(120 * (1 - t))},70%,55%)`;
}
function _rankBg(rank, maxRank) {
  const t = (rank - 1) / Math.max(maxRank - 1, 1);
  return `hsla(${Math.round(120 * (1 - t))},60%,50%,0.18)`;
}

function _buildPodiumTrackerHtml(periodType) {
  const periods = _computeRankPeriods(periodType);
  const validPeriods = periods.filter(p => p.ranks.length > 0);
  if (validPeriods.length < 2)
    return '<div style="color:var(--muted);font-size:12px;padding:8px 0">Need at least 2 periods with 3+ players.</div>';

  let maxRank = 3;
  const tally = {};
  validPeriods.forEach((p) => {
    p.ranks.forEach((r) => {
      if (!tally[r.name]) tally[r.name] = { name: r.name, g: 0, s: 0, b: 0, periodsPlayed: 0, extra: {} };
      tally[r.name].periodsPlayed++;
      if (r.rank === 1) tally[r.name].g++;
      else if (r.rank === 2) tally[r.name].s++;
      else if (r.rank === 3) tally[r.name].b++;
      else { tally[r.name].extra[r.rank] = (tally[r.name].extra[r.rank] || 0) + 1; }
      if (r.rank > maxRank) maxRank = r.rank;
    });
  });

  const extraRanks = Array.from({ length: maxRank - 3 }, (_, i) => i + 4);

  const rows = Object.values(tally)
    .map(p => ({ ...p, podiums: p.g + p.s + p.b,
      podiumRate: p.periodsPlayed >= _MIN_RANK_PERIODS ? (p.g + p.s + p.b) / p.periodsPlayed : 0 }))
    .filter(p => p.periodsPlayed >= _MIN_RANK_PERIODS)
    .sort((a, b) => b.g - a.g || b.s - a.s || b.b - a.b);

  if (!rows.length)
    return '<div style="color:var(--muted);font-size:12px;padding:8px 0">Not enough data yet.</div>';

  const _stickyTh = `position:sticky;left:0;z-index:2;background:var(--surface2)`;
  const _stickyTd = `position:sticky;left:0;z-index:1;background:var(--card)`;
  const _th = `font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;padding:5px 10px;text-align:center;white-space:nowrap;border-bottom:1px solid rgba(255,255,255,0.08)`;
  const _td = `padding:6px 10px;text-align:center;font-weight:800;font-size:11px;white-space:nowrap`;

  const mkD = (count, rankVal, name) => count > 0
    ? `<span style="cursor:pointer;border-bottom:1px dotted currentColor" onclick="_openPodiumDrill(${jsArg(name)},${typeof rankVal==='number'?rankVal:jsArg(rankVal)},${jsArg(periodType)})">${count}</span>`
    : `<span style="color:rgba(255,255,255,0.18)">${count}</span>`;

  const thead = `<tr>
    <th style="${_th};${_stickyTh};text-align:left">Player</th>
    <th style="${_th}">🥇</th>
    <th style="${_th}">🥈</th>
    <th style="${_th}">🥉</th>
    <th style="${_th}">Podiums</th>
    <th style="${_th}">%</th>
    ${extraRanks.map(n => `<th style="${_th}">#${n}</th>`).join("")}
  </tr>`;

  const tbody = rows.map(r => `<tr>
    <td style="${_td};${_stickyTd};text-align:left;font-weight:700">${escHtml(r.name)}</td>
    <td style="${_td};color:${_rankColor(1, maxRank)}">${mkD(r.g, 1, r.name)}</td>
    <td style="${_td};color:${_rankColor(2, maxRank)}">${mkD(r.s, 2, r.name)}</td>
    <td style="${_td};color:${_rankColor(3, maxRank)}">${mkD(r.b, 3, r.name)}</td>
    <td style="${_td}">${mkD(r.podiums, "podiums", r.name)}<span style="font-size:9px;color:var(--muted)"> /${r.periodsPlayed}</span></td>
    <td style="${_td};color:var(--theme);text-align:right">${r.periodsPlayed >= _MIN_RANK_PERIODS ? (r.podiumRate * 100).toFixed(0) + "%" : "—"}</td>
    ${extraRanks.map(n => `<td style="${_td};color:${_rankColor(n, maxRank)}">${mkD(r.extra?.[n] || 0, n, r.name)}</td>`).join("")}
  </tr>`).join("");

  return `<div class="ana-card" style="padding:8px 12px;overflow-x:auto;-webkit-overflow-scrolling:touch">
    <table style="border-collapse:separate;border-spacing:0;width:max-content;min-width:100%">
      <thead>${thead}</thead>
      <tbody>${tbody}</tbody>
    </table>
  </div>`;
}

const _reignCache = {};
function _buildRankReignHtml() {
  const allM = activeMatches();
  const fp = _lightFingerprint(allM);
  if (_reignCache[fp]) return _reignCache[fp];

  // All distinct match days sorted chronologically
  const allDates = [...new Set(allM.map(m => m.date).filter(Boolean))].sort();
  if (allDates.length < 2)
    return '<div style="color:var(--muted);font-size:12px;padding:8px 0">Need at least 2 match days with 3+ players.</div>';

  // Current ALL TIME ELO rank (latest snapshot = full history)
  const eloMap = computeElo(allM);
  const eloRanking = Object.entries(eloMap).sort((a, b) => b[1] - a[1]);
  const eloRankOf = {};
  eloRanking.forEach(([name], i) => { eloRankOf[name] = i + 1; });

  // For each match day compute cumulative ALL TIME rank up to that day,
  // then tally how many days each player held each rank position.
  const sorted = [...allM].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  let maxRank = 1;
  const tally = {};
  allDates.forEach(date => {
    const snap = sorted.filter(m => (m.date || "") <= date);
    const statsSnap = computeStats(snap, computeElo(snap));
    statsSnap.forEach((p, i) => {
      const rank = i + 1;
      if (!tally[p.name]) tally[p.name] = { name: p.name, rankCounts: {}, days: 0 };
      tally[p.name].days++;
      tally[p.name].rankCounts[rank] = (tally[p.name].rankCounts[rank] || 0) + 1;
      if (rank > maxRank) maxRank = rank;
    });
  });

  const rows = Object.values(tally)
    .filter(p => p.days >= _MIN_RANK_PERIODS)
    .sort((a, b) => {
      const ra = eloRankOf[a.name] ?? 9999;
      const rb = eloRankOf[b.name] ?? 9999;
      return ra !== rb ? ra - rb : a.name.localeCompare(b.name);
    });

  if (!rows.length)
    return '<div style="color:var(--muted);font-size:12px;padding:8px 0">Not enough data yet.</div>';

  const rankCols = Array.from({ length: maxRank }, (_, i) => i + 1);
  const rankEmoji = r => r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : `#${r}`;
  const rankColor = r => _rankColor(r, maxRank);
  const eloRankColor = r => _rankColor(r, eloRanking.length);

  const _sTh = `position:sticky;left:0;z-index:2;background:var(--surface2)`;
  const _sTd = `position:sticky;left:0;z-index:1;background:var(--card)`;
  const _th  = `font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;padding:5px 10px;text-align:center;white-space:nowrap;border-bottom:1px solid rgba(255,255,255,0.08)`;
  const _td  = `padding:6px 10px;text-align:center;font-weight:800;font-size:11px;white-space:nowrap`;

  const thead = `<tr>
    <th style="${_th};${_sTh};text-align:left">Player</th>
    <th style="${_th}">Rank</th>
    <th style="${_th}">Days</th>
    ${rankCols.map(r => `<th style="${_th}">${rankEmoji(r)}</th>`).join("")}
  </tr>`;

  const tbody = rows.map(row => {
    const eloRank = eloRankOf[row.name];
    const eloCell = eloRank
      ? `<td style="${_td};color:${eloRankColor(eloRank)};font-size:13px">#${eloRank}</td>`
      : `<td style="${_td};color:var(--muted)">—</td>`;
    const daysCell = `<td style="${_td};color:var(--theme)">${row.days}</td>`;
    const cells = rankCols.map(r => {
      const cnt = row.rankCounts[r] || 0;
      return `<td style="${_td};color:${cnt > 0 ? rankColor(r) : "rgba(255,255,255,0.15)"}" title="${cnt} day${cnt !== 1 ? "s" : ""} at ${rankEmoji(r)}">${cnt > 0 ? cnt : "—"}</td>`;
    }).join("");
    return `<tr>
      <td style="${_td};${_sTd};text-align:left;font-weight:700">${escHtml(row.name)}</td>
      ${eloCell}${daysCell}${cells}
    </tr>`;
  }).join("");

  const html = `<div class="ana-card" style="padding:8px 12px;overflow-x:auto;-webkit-overflow-scrolling:touch">
    <div style="font-size:9px;color:var(--muted);margin-bottom:8px;font-weight:600;letter-spacing:0.04em">ALL TIME · ${allDates.length} MATCH DAYS</div>
    <table style="border-collapse:separate;border-spacing:0;width:max-content;min-width:100%">
      <thead>${thead}</thead>
      <tbody>${tbody}</tbody>
    </table>
  </div>`;
  return (_reignCache[fp] = html);
}

function _buildRankTimelineHtml(periodType, maxPeriods = 10) {
  const allPeriods = _computeRankPeriods(periodType);
  const validPeriods = allPeriods.filter(p => p.ranks.length > 0);
  const _tlPills = (active) => `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
    <button class="digest-filter-btn${active==="today"?" active":""}" onclick="_timelineSetPeriod(this,'today')">DAILY</button>
    <button class="digest-filter-btn${active==="week"?" active":""}" onclick="_timelineSetPeriod(this,'week')">WEEKLY</button>
    <button class="digest-filter-btn${active==="weekend"?" active":""}" onclick="_timelineSetPeriod(this,'weekend')">WEEKEND</button>
    <button class="digest-filter-btn${active==="month"?" active":""}" onclick="_timelineSetPeriod(this,'month')">MONTHLY</button>
  </div>`;
  if (validPeriods.length < 2)
    return `<div>${_tlPills(periodType)}<div style="color:var(--muted);font-size:12px;padding:8px 0">Need at least 2 periods with 3+ players.</div></div>`;

  const periods = validPeriods.slice(-maxPeriods);
  const playerSet = new Set();
  periods.forEach(p => p.ranks.forEach(r => playerSet.add(r.name)));

  const lookup = {};
  periods.forEach(p => {
    lookup[p.key] = {};
    p.ranks.forEach(r => { lookup[p.key][r.name] = r.rank; });
  });

  // Current ALL TIME ELO rank
  const eloMapTl = computeElo(activeMatches());
  const eloRankOfTl = {};
  Object.entries(eloMapTl).sort((a, b) => b[1] - a[1]).forEach(([name], i) => { eloRankOfTl[name] = i + 1; });

  const players = [...playerSet].map((name) => ({
    name,
    eloRank: eloRankOfTl[name] ?? 9999,
  })).sort((a, b) => a.eloRank !== b.eloRank ? a.eloRank - b.eloRank : a.name.localeCompare(b.name));

  let tlMaxRank = 1;
  periods.forEach(p => p.ranks.forEach(r => { if (r.rank > tlMaxRank) tlMaxRank = r.rank; }));

  const eloRankColor = r => _rankColor(r, players.length);
  const _stickyTh = `position:sticky;left:0;z-index:2;background:var(--surface2)`;
  const _stickyTd = `position:sticky;left:0;z-index:1;background:var(--card)`;
  const _th = `font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;padding:5px 8px;text-align:center;white-space:nowrap;border-bottom:1px solid rgba(255,255,255,0.08)`;
  const _rankTd = `padding:6px 8px;text-align:center;font-weight:800;font-size:11px;white-space:nowrap`;

  const headerCells = periods.map(p => `<th class="rhtl-th-period">${escHtml(p.label)}</th>`).join("");
  const bodyRows = players.map(pl => {
    const eloRank = eloRankOfTl[pl.name];
    const rankCell = eloRank
      ? `<td style="${_rankTd};color:${eloRankColor(eloRank)}">#${eloRank}</td>`
      : `<td style="${_rankTd};color:var(--muted)">—</td>`;
    return `<tr>
      <td class="rhtl-td-name" style="${_stickyTd};font-weight:700">${escHtml(pl.name)}</td>
      ${rankCell}` +
    periods.map(p => {
      const r = lookup[p.key][pl.name];
      const cellStyle = r != null
        ? `background:${_rankBg(r, tlMaxRank)};color:${_rankColor(r, tlMaxRank)}`
        : `background:transparent;color:rgba(255,255,255,0.12)`;
      return `<td class="rhtl-cell" style="${cellStyle}" title="${r != null ? "#" + r + " · " + escHtml(p.label) : "Did not play"}">${r != null ? r : "—"}</td>`;
    }).join("") + "</tr>";
  }).join("");

  const legend = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
    <span style="font-size:9px;color:var(--muted)">#1</span>
    <div style="flex:1;height:5px;border-radius:3px;background:linear-gradient(to right,hsl(120,70%,55%),hsl(60,70%,55%),hsl(0,70%,55%))"></div>
    <span style="font-size:9px;color:var(--muted)">#${tlMaxRank}</span>
    <span style="font-size:9px;color:rgba(255,255,255,0.25);margin-left:6px">— absent</span>
  </div>`;

  return `<div>${_tlPills(periodType)}
    <div class="ana-card" style="padding:10px 12px">
      ${legend}
      <div class="rhtl-wrap">
        <table class="rhtl-table">
          <thead><tr><th class="rhtl-th-name" style="${_stickyTh}">Player</th><th style="${_th}">Rank</th>${headerCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
      <div style="font-size:9px;color:var(--muted);margin-top:8px">Rank within each ${periodType === "week" ? "week" : "month"} based on all matches in that period. Showing last ${periods.length}.</div>
    </div>
  </div>`;
}

function _podiumSetPeriod(btn, type) {
  btn.closest("div").querySelectorAll(".digest-filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const content = btn.closest("[class]")?.parentElement?.querySelector(".podium-content")
    || btn.parentElement?.nextElementSibling;
  if (content) content.innerHTML = _buildPodiumTrackerHtml(type);
}
function _reignSetPeriod(btn, type) {
  btn.closest("div").querySelectorAll(".digest-filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const content = btn.closest("[class]")?.parentElement?.querySelector(".reign-content")
    || btn.parentElement?.nextElementSibling;
  if (content) content.innerHTML = _buildRankReignHtml(type);
}
function _timelineSetPeriod(btn, type) {
  const body = btn.closest(".ana-sec-body") || btn.closest(".ana-card")?.parentElement || btn.parentElement?.parentElement;
  if (body) body.innerHTML = _buildRankTimelineHtml(type);
}

function _openPodiumDrill(playerName, rankVal, periodType) {
  const periods = _computeRankPeriods(periodType);
  const matching = periods.filter(p => {
    if (!p.ranks.length) return false;
    const r = p.ranks.find(x => x.name === playerName);
    if (!r) return false;
    return rankVal === "podiums" ? r.rank <= 3 : r.rank === rankVal;
  });
  if (!matching.length) return;

  const medalEmoji = rankVal === 1 ? "🥇" : rankVal === 2 ? "🥈" : rankVal === 3 ? "🥉" : rankVal === "podiums" ? "🏅" : `#${rankVal}`;
  const rankLabel = rankVal === "podiums" ? "Podium Finishes" : `#${rankVal} Finishes`;
  const periodLabel = { today: "Daily", week: "Weekly", weekend: "Weekend", month: "Monthly" }[periodType] || periodType;
  const _fmtD = iso => {
    if (!iso) return "";
    const [, m, d] = iso.split("-");
    return parseInt(d) + " " + ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m)];
  };

  const renderItem = p => {
    const r = p.ranks.find(x => x.name === playerName);
    const medal = r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : `#${r.rank}`;
    const sub = (periodType === "week" || periodType === "month")
      ? `<span style="color:var(--muted);font-size:9px;display:block;margin-top:1px">${_fmtD(p.from)} – ${_fmtD(p.to)}</span>` : "";
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);cursor:pointer;-webkit-tap-highlight-color:transparent"
        onclick="_podiumDrillGoTo(${jsArg(p.key)},${jsArg(periodType)})">
      <span style="font-size:18px;line-height:1;flex-shrink:0">${medal}</span>
      <span style="flex:1;font-size:12px;font-weight:700;line-height:1.4">${escHtml(p.label)}${sub}</span>
      <span style="font-size:14px;color:var(--theme);flex-shrink:0">›</span>
    </div>`;
  };

  const PAGE = 10;
  const head = matching.slice(0, PAGE).map(renderItem).join("");
  const tail = matching.slice(PAGE);
  const moreBlock = tail.length
    ? `<div id="pdrill-more" style="display:none">${tail.map(renderItem).join("")}</div>
       <button onclick="document.getElementById('pdrill-more').style.display='block';this.remove()"
         style="width:100%;margin-top:10px;padding:9px;background:rgba(255,255,255,0.06);border:none;border-radius:8px;color:var(--muted);font-size:11px;font-weight:700;cursor:pointer;letter-spacing:0.04em">
         SHOW ${tail.length} MORE
       </button>` : "";

  let overlay = document.getElementById("podium-drill-overlay");
  if (!overlay) { overlay = document.createElement("div"); overlay.id = "podium-drill-overlay"; document.body.appendChild(overlay); }
  overlay.innerHTML = `<div style="position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:flex-end" onclick="_closePodiumDrill()">
    <div style="background:var(--card);border-radius:16px 16px 0 0;width:100%;max-height:65vh;overflow-y:auto;padding:20px 16px 36px;box-sizing:border-box" onclick="event.stopPropagation()">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
        <div>
          <div style="font-size:14px;font-weight:800">${escHtml(playerName)} ${medalEmoji} ${rankLabel}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:3px">${periodLabel} · ${matching.length} period${matching.length !== 1 ? "s" : ""}</div>
        </div>
        <button onclick="_closePodiumDrill()" style="background:rgba(255,255,255,0.08);border:none;border-radius:50%;width:28px;height:28px;color:var(--text);font-size:14px;cursor:pointer;flex-shrink:0;margin-top:2px">✕</button>
      </div>
      ${head}${moreBlock}
    </div>
  </div>`;
  overlay.style.display = "block";
}

function _podiumDrillGoTo(key, periodType) {
  _closePodiumDrill();
  let filter, from, to = null;
  if (periodType === "today") {
    filter = "day"; from = key;
  } else if (periodType === "week") {
    filter = "range"; from = key;
    const d = new Date(key + "T00:00:00"); d.setDate(d.getDate() + 6);
    to = toLocalISODate(d);
  } else if (periodType === "weekend") {
    filter = "range"; from = key;
    const d = new Date(key + "T00:00:00"); d.setDate(d.getDate() + 1);
    to = toLocalISODate(d);
  } else {
    filter = "range"; from = key + "-01";
    const [y, m] = key.split("-");
    to = toLocalISODate(new Date(parseInt(y), parseInt(m), 0));
  }
  cmpFilter = filter; cmpFrom = from; cmpTo = to;
  const dr = document.getElementById("cmpDr");
  const dp = document.getElementById("cmpDayPicker");
  const sel = document.getElementById("cmpSel");
  if (sel) sel.value = filter;
  if (filter === "day") {
    if (dp) { dp.classList.add("show"); const di = document.getElementById("cmpDayInput"); if (di) di.value = from; }
    if (dr) dr.classList.remove("show");
  } else {
    if (dr) { dr.classList.add("show"); const cf = document.getElementById("cmpFrom"), ct = document.getElementById("cmpTo"); if (cf) cf.value = from; if (ct) ct.value = to || ""; }
    if (dp) dp.classList.remove("show");
  }
  switchMainTab("compact");
  renderCompact();
}

function _closePodiumDrill() {
  const el = document.getElementById("podium-drill-overlay");
  if (el) el.style.display = "none";
}

function _buildPowerRankingsHtml() {
  const rankings = computePowerRankings(activeMatches());
  if (!rankings.length)
    return '<div class="sub" style="padding:8px">Need more data.</div>';
  const prevRanks = getPrevWeekRankMap();
  const rows = rankings
    .map((p, i) => {
      const col =
        i === 0
          ? "var(--gold)"
          : i === 1
            ? "var(--theme)"
            : i === 2
              ? "var(--green)"
              : "var(--muted)";
      const bar = `<div style="height:3px;border-radius:2px;background:rgba(255,255,255,0.06);margin-top:4px"><div style="height:100%;width:${p.score}%;background:${col};border-radius:2px;transition:width 0.6s"></div></div>`;
      const avatar = `<div style="width:28px;height:28px;border-radius:50%;background:${playerColor(p.name)};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;flex-shrink:0">${playerInitials(p.name)}</div>`;
      const prev = prevRanks[p.name];
      let movement = `<span class="pr-mvmt pr-mvmt-eq">—</span>`;
      if (prev) {
        const diff = prev - (i + 1);
        if (diff > 0) movement = `<span class="pr-mvmt pr-mvmt-up">↑${diff}</span>`;
        else if (diff < 0)
          movement = `<span class="pr-mvmt pr-mvmt-dn">↓${Math.abs(diff)}</span>`;
      } else {
        movement = `<span class="pr-mvmt pr-mvmt-new">NEW</span>`;
      }
      return `<div class="pr-row">
      <div style="font-size:13px;font-weight:900;color:${col};width:24px;text-align:center">#${i + 1}</div>
      ${movement}
      ${avatar}
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
        ${bar}
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:14px;font-weight:900;color:${col}">${p.score}</div>
        <div style="font-size:8px;color:var(--muted);font-weight:700">${p.formEmoji} ${p.winPct}%W · ELO ${p.elo}</div>
      </div>
    </div>`;
    })
    .join("");
  return `<div class="ana-card" style="padding:10px 12px">
    <div style="font-size:9px;color:var(--muted);margin-bottom:10px">Composite: ELO 40% · Form 30% · Win Quality 20% · Activity 10% · Arrows vs last week</div>
    ${rows}
  </div>`;
}

function _buildChemistryLeaderboardHtml() {
  const scores = computeChemistryScores(activeMatches());
  if (!scores.length)
    return '<div class="sub" style="padding:8px">Need at least 3 matches per pair.</div>';
  const worst = scores.length > 5 ? scores.slice(-5).reverse() : [];
  const rows = scores
    .slice(0, 20)
    .map((p, i) => {
      const col = playerColor(p.players[0]);
      const col2 = playerColor(p.players[1]);
      return `<div class="chem-ldr-row">
      <div style="font-size:12px;font-weight:800;color:var(--muted);width:20px">#${i + 1}</div>
      <div style="display:flex;gap:-4px;flex-shrink:0">
        <div style="width:24px;height:24px;border-radius:50%;background:${col};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff">${playerInitials(p.players[0])}</div>
        <div style="width:24px;height:24px;border-radius:50%;background:${col2};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff;margin-left:-6px">${playerInitials(p.players[1])}</div>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.players.join(" & ")}</div>
        <div style="font-size:9px;color:var(--muted)">${p.played} matches · ${p.winPct}% win · avg ${p.avgMargin > 0 ? "+" : ""}${p.avgMargin?.toFixed ? p.avgMargin.toFixed(1) : 0}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:16px;font-weight:900;color:${p.tierColor}">${p.score}</div>
        <div style="font-size:10px;font-weight:900;color:${p.tierColor}">${p.tier}-Tier</div>
      </div>
    </div>`;
    })
    .join("");
  const antiRows = worst
    .map((p, i) => {
      const col = playerColor(p.players[0]);
      const col2 = playerColor(p.players[1]);
      return `<div class="chem-ldr-row" style="opacity:0.92">
      <div style="font-size:11px;font-weight:800;color:var(--red);width:24px">💔${i + 1}</div>
      <div style="display:flex;gap:-4px;flex-shrink:0">
        <div style="width:22px;height:22px;border-radius:50%;background:${col};display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:#fff;filter:grayscale(0.35)">${playerInitials(p.players[0])}</div>
        <div style="width:22px;height:22px;border-radius:50%;background:${col2};display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:#fff;margin-left:-5px;filter:grayscale(0.35)">${playerInitials(p.players[1])}</div>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:10px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.players.join(" & ")}</div>
        <div style="font-size:9px;color:var(--muted)">${p.played} matches · ${p.winPct}% win · avg ${p.avgMargin > 0 ? "+" : ""}${p.avgMargin?.toFixed ? p.avgMargin.toFixed(1) : 0}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:14px;font-weight:900;color:var(--red)">${p.score}</div>
      </div>
    </div>`;
    })
    .join("");
  const antiBlock = antiRows
    ? `<div style="margin-top:14px;padding-top:12px;border-top:1px dashed rgba(255,255,255,0.1)">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:12px;letter-spacing:0.14em;color:var(--red);margin-bottom:8px">💔 ANTI-CHEMISTRY — pairs to avoid</div>
      ${antiRows}
    </div>`
    : "";
  return `<div class="ana-card" style="padding:10px 12px">
    <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">
      ${[
        ["S", "var(--gold)", "≥8.5"],
        ["A", "var(--green)", "7–8.5"],
        ["B", "var(--theme)", "5.5–7"],
        ["C", "var(--muted)", "<5.5"],
      ]
        .map(
          ([t, c, r]) =>
            `<span style="font-size:9px;font-weight:800;color:${c};background:rgba(255,255,255,0.05);border-radius:6px;padding:2px 7px">${t} ${r}</span>`,
        )
        .join("")}
    </div>
    ${rows}
    ${antiBlock}
  </div>`;
}

let _predictPlayerA = "",
  _predictPlayerB = "",
  _predictPartnerA = "",
  _predictPartnerB = "";

let _simA1 = "", _simA2 = "", _simB1 = "", _simB2 = "";

function _buildMatchPredictHtml() {
  const players = computeStats(activeMatches()).map((p) => p.name);
  if (players.length < 2)
    return '<div class="sub" style="padding:8px">Need at least 2 players.</div>';
  return `<div class="ana-card" style="padding:12px">
    <div style="font-size:10px;color:var(--muted);margin-bottom:12px">Pick two teams — get win probability, expected score, and chemistry rating.</div>
    <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;margin-bottom:10px">
      <div>
        <div style="font-size:9px;font-weight:700;color:var(--muted);margin-bottom:4px">TEAM A</div>
        <button class="h2h-slot-btn${_predictPlayerA ? " h2h-slot-filled" : ""}" id="pred-slot-a1" onclick="openPredictSheet('a1')" style="width:100%;margin-bottom:6px">
          <span style="font-size:9px;color:var(--muted);display:block">P1</span>
          <span id="pred-label-a1" style="font-size:11px;font-weight:800">${_predictPlayerA || "—"}</span>
        </button>
        <button class="h2h-slot-btn${_predictPartnerA ? " h2h-slot-filled" : ""}" id="pred-slot-a2" onclick="openPredictSheet('a2')" style="width:100%">
          <span style="font-size:9px;color:var(--muted);display:block">P2</span>
          <span id="pred-label-a2" style="font-size:11px;font-weight:800">${_predictPartnerA || "—"}</span>
        </button>
      </div>
      <div style="font-size:14px;font-weight:900;color:var(--muted)">VS</div>
      <div>
        <div style="font-size:9px;font-weight:700;color:var(--muted);margin-bottom:4px">TEAM B</div>
        <button class="h2h-slot-btn${_predictPlayerB ? " h2h-slot-filled" : ""}" id="pred-slot-b1" onclick="openPredictSheet('b1')" style="width:100%;margin-bottom:6px">
          <span style="font-size:9px;color:var(--muted);display:block">P1</span>
          <span id="pred-label-b1" style="font-size:11px;font-weight:800">${_predictPlayerB || "—"}</span>
        </button>
        <button class="h2h-slot-btn${_predictPartnerB ? " h2h-slot-filled" : ""}" id="pred-slot-b2" onclick="openPredictSheet('b2')" style="width:100%">
          <span style="font-size:9px;color:var(--muted);display:block">P2</span>
          <span id="pred-label-b2" style="font-size:11px;font-weight:800">${_predictPartnerB || "—"}</span>
        </button>
      </div>
    </div>
    <button onclick="runMatchPrediction()" style="width:100%;padding:9px;border-radius:10px;font-weight:800;font-size:12px;background:rgba(var(--theme-rgb),0.15);border:1px solid rgba(var(--theme-rgb),0.4);color:var(--theme);cursor:pointer;letter-spacing:0.04em">PREDICT MATCH ▶</button>
    <div id="predict-result" style="margin-top:8px"></div>
  </div>`;
}

function openPredictSheet(slot) {
  _filterSheetMode = "predict_" + slot;
  const el = document.getElementById("filter-sheet-title");
  if (el) el.textContent = "SELECT PLAYER";
  const list = document.getElementById("filter-sheet-list");
  if (!list) return;
  const taken = [
    _predictPlayerA,
    _predictPartnerA,
    _predictPlayerB,
    _predictPartnerB,
  ].filter((v, i) => v && ["a1", "a2", "b1", "b2"][i] !== slot);
  const players = sortPlayersGuestsLast(computeStats(activeMatches()).map((s) => s.name));
  const selected =
    slot === "a1"
      ? _predictPlayerA
      : slot === "a2"
        ? _predictPartnerA
        : slot === "b1"
          ? _predictPlayerB
          : _predictPartnerB;
  list.innerHTML =
    `<div class="live-sheet-item" onclick="selectFilterItem('')"><div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--muted)">—</div><span>None</span></div>` +
    players
      .map((p) => {
        const dis = taken.includes(p)
          ? ' style="opacity:0.3;pointer-events:none"'
          : "";
        const sel = p === selected ? " live-sheet-item-selected" : "";
        return `<div class="live-sheet-item${sel}"${dis} onclick="selectFilterItem(${jsArg(p)})">${sheetAvSm(p)}<span>${escHtml(p)}</span></div>`;
      })
      .join("");
  const overlay = document.getElementById("filter-sheet-overlay");
  const sheet = document.getElementById("filter-sheet");
  if (overlay) overlay.classList.add("live-sheet-open");
  if (sheet) sheet.classList.add("live-sheet-open");
}

function openSimSheet(slot) {
  _filterSheetMode = "sim_" + slot;
  const el = document.getElementById("filter-sheet-title");
  if (el) el.textContent = "SELECT PLAYER";
  const list = document.getElementById("filter-sheet-list");
  if (!list) return;
  const taken = { a1: _simA1, a2: _simA2, b1: _simB1, b2: _simB2 };
  const current = taken[slot];
  const others = Object.entries(taken)
    .filter(([k]) => k !== slot)
    .map(([, v]) => v)
    .filter(Boolean);
  const players = sortPlayersGuestsLast(computeStats(activeMatches()).map((s) => s.name));
  list.innerHTML =
    `<div class="live-sheet-item" onclick="selectFilterItem('')"><div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--muted)">—</div><span>None</span></div>` +
    players
      .map((p) => {
        const dis = others.includes(p) ? ' style="opacity:0.3;pointer-events:none"' : "";
        const sel = p === current ? " live-sheet-item-selected" : "";
        return `<div class="live-sheet-item${sel}"${dis} onclick="selectFilterItem(${jsArg(p)})">${sheetAvSm(p)}<span>${escHtml(p)}</span></div>`;
      })
      .join("");
  const overlay = document.getElementById("filter-sheet-overlay");
  const sheet = document.getElementById("filter-sheet");
  if (overlay) overlay.classList.add("live-sheet-open");
  if (sheet) sheet.classList.add("live-sheet-open");
}

function runMatchPrediction() {
  const teamA = [_predictPlayerA, _predictPartnerA].filter(Boolean);
  const teamB = [_predictPlayerB, _predictPartnerB].filter(Boolean);
  const res = document.getElementById("predict-result");
  if (!res) return;
  if (!teamA.length || !teamB.length) {
    res.innerHTML =
      '<div style="color:var(--red);font-size:11px;padding:4px">Select at least one player per team.</div>';
    return;
  }
  const eloMap = _memoElo();
  const avgA =
    teamA.reduce((s, p) => s + (eloMap[p] || 1000), 0) / teamA.length;
  const avgB =
    teamB.reduce((s, p) => s + (eloMap[p] || 1000), 0) / teamB.length;
  const probA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
  const pctA = Math.round(probA * 100),
    pctB = 100 - pctA;
  const colA = playerColor(teamA[0]),
    colB = playerColor(teamB[0]);

  // Chemistry tiers
  const chemA = computeChemistryScores(activeMatches()).find((c) =>
    c.players.every((p) => teamA.includes(p)) || teamA.length === 1
      ? true
      : false,
  );
  const chemB = computeChemistryScores(activeMatches()).find((c) =>
    c.players.every((p) => teamB.includes(p)) || teamB.length === 1
      ? true
      : false,
  );

  // H2H between these exact teams
  const tkA = [...teamA].sort().join("|"),
    tkB = [...teamB].sort().join("|");
  let h2hA = 0,
    h2hB = 0;
  activeMatches().forEach((m) => {
    const pmA = [...(m.teamA || [])].sort().join("|"),
      pmB = [...(m.teamB || [])].sort().join("|");
    const fwd = pmA === tkA && pmB === tkB,
      rev = pmA === tkB && pmB === tkA;
    if (!fwd && !rev) return;
    const aWon = m.scoreA > m.scoreB;
    if (fwd) {
      aWon ? h2hA++ : h2hB++;
    } else {
      aWon ? h2hB++ : h2hA++;
    }
  });

  // Expected score based on avg score in their matches
  const relevantMs = activeMatches().filter((m) => {
    const players = [...(m.teamA || []), ...(m.teamB || [])];
    return (
      teamA.some((p) => players.includes(p)) &&
      teamB.some((p) => players.includes(p))
    );
  });
  const avgScore =
    relevantMs.length > 2
      ? Math.round(
          relevantMs.reduce((s, m) => s + Math.max(m.scoreA, m.scoreB), 0) /
            relevantMs.length,
        )
      : 4;
  const upsetFlag =
    (pctA < 40 || pctA > 60) &&
    (eloMap[teamA[0]] || 1000) < (eloMap[teamB[0]] || 1000) - 80;

  res.innerHTML = `
    <div style="border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);padding:12px;margin-top:4px">
      <div style="display:flex;align-items:center;gap:0;border-radius:6px;overflow:hidden;height:8px;margin-bottom:12px">
        <div style="flex:${pctA};background:${colA};min-width:4px"></div>
        <div style="flex:${pctB};background:${colB};min-width:4px"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:10px">
        <div><div style="font-size:24px;font-weight:900;color:${colA}">${pctA}%</div><div style="font-size:9px;color:var(--muted)">${teamA.join(" & ").toUpperCase()}</div></div>
        <div style="text-align:right"><div style="font-size:24px;font-weight:900;color:${colB}">${pctB}%</div><div style="font-size:9px;color:var(--muted)">${teamB.join(" & ").toUpperCase()}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;text-align:center">
        <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:6px">
          <div style="font-size:13px;font-weight:800">${h2hA + h2hB > 0 ? `${h2hA}–${h2hB}` : "—"}</div>
          <div style="font-size:8px;color:var(--muted)">H2H</div>
        </div>
        <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:6px">
          <div style="font-size:13px;font-weight:800">${pctA > pctB ? avgScore : Math.max(pctB - pctA, 0) > 20 ? Math.max(avgScore - 1, 1) : avgScore}–${pctA > pctB ? (Math.max(pctA - pctB, 0) > 20 ? Math.max(avgScore - 1, 1) : avgScore) : avgScore}</div>
          <div style="font-size:8px;color:var(--muted)">EXP. SCORE</div>
        </div>
        <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:6px">
          <div style="font-size:10px;font-weight:800;color:${chemA ? chemA.tierColor : "var(--muted)"}">${chemA ? chemA.tier + "-Tier" : "—"}</div>
          <div style="font-size:8px;color:var(--muted)">CHEM A</div>
        </div>
      </div>
      ${upsetFlag ? `<div style="margin-top:8px;padding:6px 10px;border-radius:8px;background:rgba(255,165,0,0.1);border:1px solid rgba(255,165,0,0.3);font-size:10px;font-weight:700;color:#ffaa00">😱 UPSET ALERT — underdog has a real chance</div>` : ""}
    </div>`;
}

function _buildStoryFeedHtml() {
  const stories = computeMatchStories(activeMatches());
  if (!stories.length)
    return '<div class="sub" style="padding:8px">No stories yet — play more matches!</div>';
  const cards = stories
    .map(
      (s, i) => `
    <div class="story-card" data-type="${s.type || ""}" data-idx="${i}" style="${i < 5 ? "" : "display:none"}">
      <div class="story-icon">${s.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:700;color:var(--fg);line-height:1.4">${s.text}</div>
        ${s.date ? `<div style="font-size:9px;color:var(--muted);margin-top:2px">${fmtDate(s.date)} · ${s.score}</div>` : `<div style="font-size:9px;color:var(--muted);margin-top:2px">${s.score}</div>`}
      </div>
    </div>`,
    )
    .join("");
  const chips = [
    ["all", "ALL"],
    ["upset", "😱 UPSETS"],
    ["milestone", "🏆 MILESTONES"],
    ["shutout", "💀 SHUTOUTS"],
    ["streak", "🔥 STREAKS"],
  ]
    .map(
      ([f, l]) =>
        `<button class="story-chip${f === "all" ? " active" : ""}" onclick="_storyFilter('${f}', this)">${l}</button>`,
    )
    .join("");
  const remaining = stories.length - 5;
  const showMoreBtn = remaining > 0 ? `<button class="story-show-more" onclick="_storyShowMore(this,'all')">Show More (${remaining} more)</button>` : "";
  return `<div class="ana-card" style="padding:10px 12px">
    <div class="story-chips">${chips}</div>
    <div class="story-cards-wrap">${cards}</div>
    <div class="story-more-wrap">${showMoreBtn}</div>
  </div>`;
}

function _storyFilter(filter, btn) {
  const wrap = btn.parentElement;
  if (wrap)
    wrap.querySelectorAll(".story-chip").forEach((b) => b.classList.toggle("active", b === btn));
  const card = btn.closest(".ana-card");
  if (!card) return;
  const allCards = [...card.querySelectorAll(".story-card")];
  let shown = 0;
  allCards.forEach((c) => {
    const matches = filter === "all" || c.dataset.type === filter;
    if (matches && shown < 5) { c.style.display = ""; shown++; }
    else c.style.display = "none";
  });
  const matching = allCards.filter((c) => filter === "all" || c.dataset.type === filter).length;
  const moreWrap = card.querySelector(".story-more-wrap");
  if (moreWrap) {
    const rem = matching - 5;
    moreWrap.innerHTML = rem > 0 ? `<button class="story-show-more" onclick="_storyShowMore(this,'${filter}')">Show More (${rem} more)</button>` : "";
  }
}

function _storyShowMore(btn, filter) {
  const card = btn.closest(".ana-card");
  if (!card) return;
  card.querySelectorAll(".story-card").forEach((c) => {
    if (filter === "all" || c.dataset.type === filter) c.style.display = "";
  });
  btn.parentElement.innerHTML = "";
}

function _buildSeasonModeHtml() {
  const seasons = computeSeasons(activeMatches());
  if (!seasons.length)
    return '<div class="sub" style="padding:8px">No seasons found.</div>';
  const cards = seasons
    .map(
      (s) => `
    <div class="season-card" onclick="this.classList.toggle('season-open')">
      <div class="season-card-header">
        <div>
          <div style="font-size:13px;font-weight:800">${s.monthName}</div>
          <div style="font-size:9px;color:var(--muted)">${s.matches} matches · ${s.players.length} players</div>
        </div>
        <div style="font-size:11px;color:var(--muted)">▼</div>
      </div>
      <div class="season-card-body">
        ${s.mvp ? `<div class="season-award"><span class="season-award-icon">🥇</span><div><div style="font-size:9px;color:var(--gold);font-weight:700">MVP</div><div style="font-size:12px;font-weight:800">${s.mvp.name}</div><div style="font-size:9px;color:var(--muted)">${s.mvp.mw}W ${s.mvp.mp}P ${Math.round((s.mvp.mw / s.mvp.mp) * 100)}%</div></div></div>` : ""}
        ${s.topPair ? `<div class="season-award"><span class="season-award-icon">🤝</span><div><div style="font-size:9px;color:var(--theme);font-weight:700">TOP PAIR</div><div style="font-size:12px;font-weight:800">${s.topPair.players.join(" & ")}</div><div style="font-size:9px;color:var(--muted)">${s.topPair.wins}W ${s.topPair.played}P ${s.topPair.winPct}%</div></div></div>` : ""}
        ${s.ironMan ? `<div class="season-award"><span class="season-award-icon">💪</span><div><div style="font-size:9px;color:var(--green);font-weight:700">IRON MAN</div><div style="font-size:12px;font-weight:800">${s.ironMan.name}</div><div style="font-size:9px;color:var(--muted)">${s.ironMan.mp} matches</div></div></div>` : ""}
        <div style="margin-top:8px;font-size:9px;color:var(--muted);font-weight:700;letter-spacing:0.06em">STANDINGS</div>
        ${s.players
          .slice(0, 5)
          .map(
            (
              p,
              i,
            ) => `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
          <div style="font-size:11px;font-weight:800;color:var(--muted);width:16px">#${i + 1}</div>
          <div style="width:20px;height:20px;border-radius:50%;background:${playerColor(p.name)};display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:#fff">${playerInitials(p.name)}</div>
          <div style="flex:1;font-size:11px;font-weight:700">${p.name}</div>
          <div style="font-size:11px;font-weight:800;color:var(--muted)">${p.mw}W ${Math.round((p.mw / p.mp) * 100)}%</div>
        </div>`,
          )
          .join("")}
      </div>
    </div>`,
    )
    .join("");
  return `<div style="display:flex;flex-direction:column;gap:8px;padding:4px 0">${cards}</div>`;
}

function _buildRivalryHoFHtml() {
  const rivalries = {};
  activeMatches().forEach((m) => {
    if (!m.teamA || !m.teamB || m.teamA.length < 2 || m.teamB.length < 2) return;
    const tA = [...m.teamA].map(normPlayer).sort().join("|");
    const tB = [...m.teamB].map(normPlayer).sort().join("|");
    const [k1, k2] = [tA, tB].sort();
    const key = `${k1}~vs~${k2}`;
    if (!rivalries[key]) {
      rivalries[key] = {
        pair1: k1.split("|"),
        pair2: k2.split("|"),
        matches: [],
        wins1: 0,
        wins2: 0,
      };
    }
    rivalries[key].matches.push(m);
    const aWon = m.scoreA > m.scoreB;
    const aIsK1 = tA === k1;
    if ((aWon && aIsK1) || (!aWon && !aIsK1)) rivalries[key].wins1++;
    else rivalries[key].wins2++;
  });
  const top = Object.values(rivalries)
    .filter((r) => r.matches.length >= 3)
    .sort((a, b) => b.matches.length - a.matches.length)
    .slice(0, 5);
  if (!top.length)
    return '<div class="sub" style="padding:8px">Need pairs that have played each other 3+ times.</div>';
  return `<div style="display:flex;flex-direction:column;gap:8px;padding:4px 0">${top
    .map((r, i) => {
      const sorted = [...r.matches].sort((a, b) =>
        (a.date || "").localeCompare(b.date || ""),
      );
      const last = sorted[sorted.length - 1];
      const lastTA = [...last.teamA].map(normPlayer).sort().join("|");
      const lastIsK1 = lastTA === r.pair1.join("|");
      const lastWinner =
        (last.scoreA > last.scoreB) === lastIsK1
          ? r.pair1.join(" & ")
          : r.pair2.join(" & ");
      const dominator =
        r.wins1 === r.wins2
          ? "Tied"
          : r.wins1 > r.wins2
            ? `${r.pair1.join(" & ")} lead`
            : `${r.pair2.join(" & ")} lead`;
      const av = (name) =>
        `<span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:${playerColor(name)};font-size:8px;font-weight:800;color:#fff">${playerInitials(name)}</span>`;
      return `<div class="ana-card rhof-card">
        <div class="rhof-rank">#${i + 1} · ${r.matches.length} MEETINGS · ${dominator}</div>
        <div class="rhof-pairs">
          <div class="rhof-pair">
            <div class="rhof-avs">${av(r.pair1[0])}${av(r.pair1[1])}</div>
            <div class="rhof-pair-name">${r.pair1.join(" & ")}</div>
          </div>
          <div class="rhof-vs"><span style="color:${r.wins1 >= r.wins2 ? "var(--green)" : "var(--muted)"}">${r.wins1}</span><span style="color:var(--muted);margin:0 2px">–</span><span style="color:${r.wins2 >= r.wins1 ? "var(--green)" : "var(--muted)"}">${r.wins2}</span></div>
          <div class="rhof-pair">
            <div class="rhof-avs">${av(r.pair2[0])}${av(r.pair2[1])}</div>
            <div class="rhof-pair-name">${r.pair2.join(" & ")}</div>
          </div>
        </div>
        <div class="rhof-last">Last: ${last.date || ""} · <b>${lastWinner}</b> won ${Math.max(last.scoreA, last.scoreB)}-${Math.min(last.scoreA, last.scoreB)}</div>
      </div>`;
    })
    .join("")}</div>`;
}

const _REPLAY_MIN = 5;
const _REPLAY_BASE_MS = 400;
let _replayIdx = 0,
  _replayTimer = null,
  _replaySpeed = 1,
  _replayLoop = false,
  _replayReverse = false,
  _replaySpotlight = "",
  _replayPrevElos = {},
  _replayPrevRanks = {};

function _replaySorted() {
  return [...allMatches].sort((a, b) =>
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

function _buildLeaderboardReplayHtml() {
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
  const uniqDates = [...new Set(sorted.map((m) => m.date).filter(Boolean))].sort();
  const dateOpts =
    '<option value="" disabled selected>📅 Jump to date</option>' +
    uniqDates.map((d) => `<option value="${escHtml(d)}">${escHtml(fmtDate(d))}</option>`).join("");
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

function _replayUpdate(idx) {
  const sorted = _replaySorted();
  _replayIdx = Math.max(
    _REPLAY_MIN,
    Math.min(parseInt(idx, 10) || _REPLAY_MIN, sorted.length),
  );
  const slice = sorted.slice(0, _replayIdx);
  const eloMap = computeElo(slice);
  const stats = computeStats(slice, eloMap).slice(0, 8);
  const maxElo = Math.max(...stats.map((s) => eloMap[s.name] || 1000), 1000);
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
    const prevElos = computeElo(sorted.slice(0, _replayIdx - 1));
    const winnerName = winners[0];
    const eloDelta =
      (eloMap[winnerName] || 1000) - (prevElos[winnerName] || 1000);
    const sign = eloDelta >= 0 ? "+" : "";
    caption.innerHTML = `<span class="lr-cap-num">Match ${_replayIdx}/${sorted.length}</span>
      <span class="lr-cap-date">${m.date || ""}</span>
      <span class="lr-cap-result">${winners.join(" & ")} <span class="lr-cap-def">def.</span> ${losers.join(" & ")} <b>${ws}-${ls}</b></span>
      <span class="lr-cap-elo" style="color:${eloDelta >= 0 ? "var(--green)" : "var(--red)"}">${winnerName} ${sign}${eloDelta} ELO</span>`;
  }
  if (!board) return;
  board.innerHTML = stats
    .map((p, i) => {
      const elo = eloMap[p.name] || 1000;
      const barW = Math.round((elo / maxElo) * 100);
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
      const prevElo = _replayPrevElos[p.name];
      let eloChip = '<span class="lr-elo-d-blank"></span>';
      if (typeof prevElo === "number") {
        const d = elo - prevElo;
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
        <div class="lr-elo" style="color:${col}">${elo}</div>
        ${eloChip}
      </div>`;
    })
    .join("");
  _replayPrevElos = {};
  _replayPrevRanks = {};
  stats.forEach((p, i) => {
    _replayPrevElos[p.name] = eloMap[p.name] || 1000;
    _replayPrevRanks[p.name] = i;
  });
}

function _replayStep(delta) {
  const max = _replaySorted().length;
  _replayUpdate(Math.max(_REPLAY_MIN, Math.min(_replayIdx + delta, max)));
}

function _replayJumpToMatch(n) {
  const v = parseInt(n, 10);
  if (!isNaN(v)) _replayUpdate(v);
}

function _replayJumpToDate(date) {
  if (!date) return;
  const sorted = _replaySorted();
  let idx = -1;
  for (let i = 0; i < sorted.length; i++) {
    if ((sorted[i].date || "") <= date) idx = i;
    else break;
  }
  if (idx >= 0) _replayUpdate(idx + 1);
}

function _replaySetSpeed(s) {
  _replaySpeed = s;
  document.querySelectorAll(".lr-speed-pill").forEach((b) => {
    b.classList.toggle("active", parseFloat(b.textContent) === s);
  });
  if (_replayTimer) {
    _replayStop();
    _replayPlay();
  }
}

function _replayToggleLoop() {
  _replayLoop = !_replayLoop;
  document
    .querySelector(".lr-toggle-loop")
    ?.classList.toggle("active", _replayLoop);
}

function _replayToggleReverse() {
  _replayReverse = !_replayReverse;
  document
    .querySelector(".lr-toggle-rev")
    ?.classList.toggle("active", _replayReverse);
}

function _replaySetSpotlight(name) {
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

function _replayPlay() {
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

function _replayReset() {
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

window._renderHiLoTable = function() {
  const el = document.getElementById("hi-lo-elo-body");
  if (!el || !window._hiLoData) return;
  const { col, asc } = window._hiLoSort;
  const pg3 = "grid-template-columns:22px 1fr 44px 44px 48px 44px 48px 46px";
  const sorted = [...window._hiLoData].sort((a, b) => {
    const av = col === "name" ? a.name : a[col];
    const bv = col === "name" ? b.name : b[col];
    if (col === "name") return asc ? av.localeCompare(bv) : bv.localeCompare(av);
    return asc ? av - bv : bv - av;
  });
  el.innerHTML = sorted.map((r, i) => {
    const fpStr = r.fromPeak === 0
      ? `<span style="color:var(--green);font-size:9px;font-weight:800">PEAK</span>`
      : `<span style="color:var(--red)">${r.fromPeak}</span>`;
    const flStr = r.fromLow === 0
      ? `<span style="color:var(--muted);font-size:9px">LOW</span>`
      : `<span style="color:var(--green)">+${r.fromLow}</span>`;
    const dots = (r.pts5 || []).map(pt =>
      `<span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:${pt.won ? "var(--green)" : "var(--red)"}"></span>`
    ).join("");
    const momStr = r.momAvg > 0
      ? `<span style="color:var(--green);font-size:8px">↑${r.momAvg}</span>`
      : r.momAvg < 0
        ? `<span style="color:var(--red);font-size:8px">↓${Math.abs(r.momAvg)}</span>`
        : `<span style="color:var(--muted);font-size:8px">→</span>`;
    return `<div class="lrace-row" style="${pg3};padding:6px 4px">
      <div class="lrace-rank" style="font-size:10px">#${i + 1}</div>
      <div class="lrace-name" style="font-size:10px">${r.name}</div>
      <div style="text-align:center;font-size:11px;font-weight:800">${r.current}</div>
      <div style="text-align:center;font-size:11px;font-weight:800;color:var(--gold)">${r.peak}</div>
      <div style="text-align:center;font-size:9px">${fpStr}</div>
      <div style="text-align:center;font-size:11px;font-weight:800;color:var(--red)">${r.low}</div>
      <div style="text-align:center;font-size:9px">${flStr}</div>
      <div style="text-align:center"><div style="display:flex;justify-content:center;gap:2px;margin-bottom:2px">${dots}</div>${momStr}</div>
    </div>`;
  }).join("");
  document.querySelectorAll(".hilo-hdr").forEach(h => {
    const c = h.dataset.col;
    const base = h.title.replace(/^Sort by /, "").toUpperCase();
    const isActive = c === col;
    h.style.color = isActive ? "var(--theme)" : "";
    const arrow = isActive ? (asc ? " ↑" : " ↓") : "";
    h.textContent = h.textContent.replace(/ [↑↓]$/, "") + arrow;
  });
};

window._hiLoSortBy = function(col) {
  if (!window._hiLoSort) return;
  if (window._hiLoSort.col === col) {
    window._hiLoSort.asc = !window._hiLoSort.asc;
  } else {
    window._hiLoSort = { col, asc: col === "name" };
  }
  window._renderHiLoTable();
};

// ── ELO PROJECTION ─────────────────────────────────────────────
window._eloProj = { formN: 10, futureM: 20, sortCol: "currentRank", sortAsc: true };

window._eloprojAdj = function(type, delta) {
  const state = window._eloProj;
  if (!state) return;
  if (type === "form") {
    state.formN = Math.max(10, state.formN + delta);
    const el = document.getElementById("eloproj-form-n");
    if (el) el.textContent = state.formN;
  } else {
    state.futureM = Math.max(10, state.futureM + delta);
    const el = document.getElementById("eloproj-future-n");
    if (el) el.textContent = state.futureM;
  }
  window._renderEloProjTable();
};

window._eloprojSort = function(col) {
  const state = window._eloProj;
  if (!state) return;
  if (state.sortCol === col) {
    state.sortAsc = !state.sortAsc;
  } else {
    state.sortCol = col;
    state.sortAsc = col === "name";
  }
  window._renderEloProjTable();
};

window._renderEloProjTable = function() {
  const tableEl = document.getElementById("eloproj-table");
  if (!tableEl) return;
  const { formN, futureM, sortCol, sortAsc } = window._eloProj;
  const eloMap = _memoElo();
  const histAll = _memoEloHistory();
  if (!histAll || !eloMap) return;

  const ranked = Object.entries(eloMap).sort((a, b) => b[1] - a[1]);
  if (!ranked.length) { tableEl.innerHTML = '<div class="sub" style="padding:8px">No ELO data.</div>'; return; }

  const currentRankMap = {};
  ranked.forEach(([name], i) => { currentRankMap[name] = i + 1; });

  const projData = ranked.map(([name, currentElo]) => {
    const hist = histAll[name] || [];
    const slice = hist.slice(-formN);
    const avgDelta = slice.length ? slice.reduce((s, p) => s + p.delta, 0) / slice.length : 0;
    const projElo = Math.round(currentElo + avgDelta * futureM);
    return { name, currentElo, avgDelta, projElo, currentRank: currentRankMap[name] };
  });

  const projSorted = [...projData].sort((a, b) => b.projElo - a.projElo);
  const projRankMap = {};
  projSorted.forEach((p, i) => { projRankMap[p.name] = i + 1; });

  // Attach projRank and rankDiff then sort display order
  projData.forEach((p) => {
    p.projRank = projRankMap[p.name];
    p.rankDiff = p.currentRank - p.projRank;
  });

  const sortFn = {
    currentRank: (a, b) => a.currentRank - b.currentRank,
    name:        (a, b) => a.name.localeCompare(b.name),
    currentElo:  (a, b) => b.currentElo - a.currentElo,
    avgDelta:    (a, b) => b.avgDelta - a.avgDelta,
    projElo:     (a, b) => b.projElo - a.projElo,
    projRank:    (a, b) => a.projRank - b.projRank,
    rankDiff:    (a, b) => b.rankDiff - a.rankDiff,
  };
  const cmp = sortFn[sortCol] || sortFn.currentRank;
  projData.sort(sortAsc ? cmp : (a, b) => cmp(b, a));

  const pg = "grid-template-columns:28px 1fr 50px 52px 70px 36px 40px";
  const arrow = (col) => sortCol === col ? (sortAsc ? " ▲" : " ▼") : "";

  const rows = projData.map((p) => {
    const rankEl = p.rankDiff > 0
      ? `<span class="ep-rank-up">▲${p.rankDiff}</span>`
      : p.rankDiff < 0
        ? `<span class="ep-rank-dn">▼${Math.abs(p.rankDiff)}</span>`
        : `<span class="ep-rank-eq">—</span>`;
    const avgSign = p.avgDelta >= 0 ? "+" : "";
    const avgCol = p.avgDelta > 0 ? "var(--green)" : p.avgDelta < 0 ? "var(--red)" : "var(--muted)";
    const projDiff = p.projElo - p.currentElo;
    const projSign = projDiff >= 0 ? "+" : "";
    const projDiffCol = projDiff > 0 ? "var(--green)" : projDiff < 0 ? "var(--red)" : "var(--muted)";
    const rankColor = _rankColor(p.currentRank, projData.length);
    const newRankColor = _rankColor(p.projRank, projData.length);
    return `<div class="lrace-row ep-row" style="${pg}">
      <div class="lrace-rank" style="color:${rankColor}">#${p.currentRank}</div>
      <div class="lrace-name">${escHtml(p.name)}</div>
      <div class="ep-cell">${p.currentElo}</div>
      <div class="ep-cell" style="color:${avgCol}">${avgSign}${p.avgDelta.toFixed(1)}</div>
      <div class="ep-cell">${p.projElo}<span class="ep-diff" style="color:${projDiffCol}">${projSign}${projDiff}</span></div>
      <div class="ep-cell" style="color:${newRankColor};font-weight:800">#${p.projRank}</div>
      <div class="ep-cell">${rankEl}</div>
    </div>`;
  }).join("");

  const hdr = `<div class="lrace-header ep-hdr" style="${pg}">
    <span class="hilo-hdr" onclick="window._eloprojSort('currentRank')">#NOW${arrow("currentRank")}</span>
    <span class="hilo-hdr" onclick="window._eloprojSort('name')">Player${arrow("name")}</span>
    <span class="hilo-hdr" onclick="window._eloprojSort('currentElo')">ELO${arrow("currentElo")}</span>
    <span class="hilo-hdr" onclick="window._eloprojSort('avgDelta')">Avg Δ${arrow("avgDelta")}</span>
    <span class="hilo-hdr" onclick="window._eloprojSort('projElo')">After ${futureM}${arrow("projElo")}</span>
    <span class="hilo-hdr" onclick="window._eloprojSort('projRank')">#New${arrow("projRank")}</span>
    <span class="hilo-hdr" onclick="window._eloprojSort('rankDiff')">Δ Rank${arrow("rankDiff")}</span>
  </div>`;
  tableEl.innerHTML = hdr + rows;
};

function renderAnalyticsPage() {
  const container = document.getElementById("analytics-page-content");
  if (!container) return;
  if (!allMatches.length) {
    container.innerHTML =
      '<div style="padding:40px;text-align:center;color:var(--muted)">No matches yet.</div>';
    return;
  }

  // ── DATA COLLECTION ────────────────────────────────────
  const stats = {},
    shutoutWins = {},
    shutoutLosses = {};
  const highestMargins = [],
    partnerships = {},
    teamMatchups = {};
  const monthlyStats = {},
    dateCounts = {},
    scoreDist = {},
    rivalryCount = {};
  const closeWins = {},
    closePlayed = {};

  const sortedM = [...allMatches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );

  sortedM.forEach((m) => {
    const aWon = m.scoreA > m.scoreB;
    const winners = aWon ? m.teamA : m.teamB,
      losers = aWon ? m.teamB : m.teamA;
    const winScore = aWon ? m.scoreA : m.scoreB,
      loseScore = aWon ? m.scoreB : m.scoreA;
    const margin = Math.abs(m.scoreA - m.scoreB);

    [...m.teamA, ...m.teamB].forEach((p) => {
      if (!stats[p])
        stats[p] = {
          name: p,
          wins: 0,
          losses: 0,
          matches: 0,
          streak: 0,
          bestStreak: 0,
          teammates: {},
        };
    });
    winners.forEach((p) => {
      stats[p].wins++;
      stats[p].matches++;
      stats[p].streak++;
      if (stats[p].streak > stats[p].bestStreak)
        stats[p].bestStreak = stats[p].streak;
    });
    losers.forEach((p) => {
      stats[p].losses++;
      stats[p].matches++;
      stats[p].streak = 0;
    });

    if (loseScore === 0) {
      winners.forEach((p) => {
        shutoutWins[p] = (shutoutWins[p] || 0) + 1;
      });
      losers.forEach((p) => {
        shutoutLosses[p] = (shutoutLosses[p] || 0) + 1;
      });
    }
    winners.forEach((p) =>
      highestMargins.push({
        player: p,
        margin,
        score: `${winScore}-${loseScore}`,
      }),
    );

    if (m.teamA.length === 2 && m.teamB.length === 2) {
      const addP = (t, won, ownScore, oppScore) => {
        const key = [...t].sort().join(" & ");
        if (!partnerships[key])
          partnerships[key] = {
            players: [...t].sort(),
            wins: 0,
            played: 0,
            diff: 0,
            gw: 0,
            gt: 0,
          };
        partnerships[key].played++;
        partnerships[key].gw += ownScore;
        partnerships[key].gt += ownScore + oppScore;
        if (won) {
          partnerships[key].wins++;
          partnerships[key].diff += margin;
        } else partnerships[key].diff -= margin;
      };
      addP(m.teamA, aWon, m.scoreA, m.scoreB);
      addP(m.teamB, !aWon, m.scoreB, m.scoreA);
      // Team vs Team matchup tracking
      const tkA = [...m.teamA].sort().join(" & ");
      const tkB = [...m.teamB].sort().join(" & ");
      const mk = [tkA, tkB].sort().join(" vs ");
      if (!teamMatchups[mk])
        teamMatchups[mk] = {
          teamA: [...m.teamA].sort(),
          teamB: [...m.teamB].sort(),
          wins: { [tkA]: 0, [tkB]: 0 },
          played: 0,
          matches: [],
        };
      teamMatchups[mk].played++;
      teamMatchups[mk].wins[aWon ? tkA : tkB]++;
      teamMatchups[mk].matches.push(m);
    }
    if (m.teamA.length === 2) {
      const [a, b] = m.teamA;
      stats[a].teammates[b] = (stats[a].teammates[b] || 0) + 1;
      stats[b].teammates[a] = (stats[b].teammates[a] || 0) + 1;
    }
    if (m.teamB.length === 2) {
      const [a, b] = m.teamB;
      stats[a].teammates[b] = (stats[a].teammates[b] || 0) + 1;
      stats[b].teammates[a] = (stats[b].teammates[a] || 0) + 1;
    }

    // Monthly win rates
    const mo = (m.date || "").substring(0, 7);
    if (mo) {
      if (!monthlyStats[mo]) monthlyStats[mo] = {};
      m.teamA.forEach((p) => {
        if (!monthlyStats[mo][p]) monthlyStats[mo][p] = { w: 0, m: 0 };
        monthlyStats[mo][p].m++;
        if (aWon) monthlyStats[mo][p].w++;
      });
      m.teamB.forEach((p) => {
        if (!monthlyStats[mo][p]) monthlyStats[mo][p] = { w: 0, m: 0 };
        monthlyStats[mo][p].m++;
        if (!aWon) monthlyStats[mo][p].w++;
      });
    }
    if (m.date) dateCounts[m.date] = (dateCounts[m.date] || 0) + 1;

    const hi = Math.max(m.scoreA, m.scoreB),
      lo = Math.min(m.scoreA, m.scoreB);
    scoreDist[`${hi}-${lo}`] = (scoreDist[`${hi}-${lo}`] || 0) + 1;

    m.teamA.forEach((a) =>
      m.teamB.forEach((b) => {
        const k = [a, b].sort().join("|");
        rivalryCount[k] = (rivalryCount[k] || 0) + 1;
      }),
    );

    if (margin <= 1) {
      winners.forEach((p) => {
        closeWins[p] = (closeWins[p] || 0) + 1;
        closePlayed[p] = (closePlayed[p] || 0) + 1;
      });
      losers.forEach((p) => {
        closePlayed[p] = (closePlayed[p] || 0) + 1;
      });
    }
  });

  // ── ELO ────────────────────────────────────────────────
  const eloMap = _memoElo(true);

  // ── DERIVED ────────────────────────────────────────────
  const players = Object.values(stats);
  const mostActive = [...players].sort((a, b) => b.matches - a.matches)[0];
  const topWinRate = [...players]
    .filter((p) => p.matches >= 3)
    .sort((a, b) => b.wins / b.matches - a.wins / a.matches)[0];
  const topStreak = [...players].sort((a, b) => b.bestStreak - a.bestStreak)[0];
  const mostShutoutWinsEntry = Object.entries(shutoutWins).sort(
    (a, b) => b[1] - a[1],
  )[0];
  const maxLosses = Math.max(...Object.values(shutoutLosses), 0);
  const mostShutoutLosses = Object.entries(shutoutLosses)
    .filter(([, v]) => v === maxLosses)
    .map(([k]) => k);
  const biggestWin = [...highestMargins].sort((a, b) => b.margin - a.margin)[0];
  const bestPartnership = Object.values(partnerships)
    .filter((p) => p.played >= 2)
    .sort((a, b) => {
      const winPctDiff = b.wins / b.played - a.wins / a.played;
      if (Math.abs(winPctDiff) > 1e-9) return winPctDiff;
      const playedDiff = b.played - a.played;
      if (playedDiff !== 0) return playedDiff;
      return b.gw / b.gt - a.gw / a.gt;
    })[0];
  const pairLeaderboard = getPairStats().slice(0, 8);
  const playersByMatches = _h2hSortPlayers(getAllPlayerNamesFromMatches());
  const matrixSortBar = `<div class="h2h-sort-bar">
    <span class="h2h-sort-lbl">SORT</span>
    ${[
      ["matches", "MATCHES"],
      ["winrate", "WIN %"],
      ["name", "NAME"],
    ]
      .map(
        ([k, l]) =>
          `<button class="h2h-sort-pill${_h2hMatrixSort === k ? " active" : ""}" onclick="_h2hSetSort('${k}')">${l}</button>`,
      )
      .join("")}
  </div>`;
  const matrixHtml = `<div id="h2h-matrix-wrap">
    ${matrixSortBar}
    <div id="h2h-matrix-inner">${buildH2HMatrixCompact(playersByMatches)}</div>
  </div>`;

  const compList = computeStats(activeMatches(), _memoElo());
  const clutchP = Object.keys(closePlayed)
    .filter((p) => closePlayed[p] >= 3)
    .sort(
      (a, b) =>
        (closeWins[b] || 0) / closePlayed[b] -
        (closeWins[a] || 0) / closePlayed[a],
    )[0];
  const clutchRankedAll = Object.keys(closePlayed)
    .filter((p) => closePlayed[p] >= 3)
    .map((p) => ({
      name: p,
      wins: closeWins[p] || 0,
      played: closePlayed[p],
      pct: Math.round(((closeWins[p] || 0) / closePlayed[p]) * 100),
    }))
    .sort((a, b) => b.pct - a.pct || b.played - a.played);
  // grid: Rank | Player | Close W-L | Clutch%
  const clutchGrid = "grid-template-columns:40px 1fr 62px 72px";
  const clutchRankHtml = clutchRankedAll.length
    ? `<div class="lrace-header" style="${clutchGrid}"><span>Rank</span><span>Player</span><span>Close W-L</span><span>Clutch%</span></div>` +
      clutchRankedAll
        .map((p, i) => {
          const col =
            p.pct > 60
              ? "var(--green)"
              : p.pct < 40
                ? "var(--red)"
                : "var(--muted)";
          const lbl = p.pct > 60 ? "CLUTCH" : p.pct < 40 ? "CHOKER" : "NEUTRAL";
          return `<div class="lrace-row" style="${clutchGrid}"><div class="lrace-rank">#${i + 1}</div><div class="lrace-name">${p.name}</div><div class="lrace-1mo">${p.wins}–${p.played - p.wins}</div><div class="lrace-delta" style="color:${col}">${p.pct}% <span style="font-size:9px">${lbl}</span></div></div>`;
        })
        .join("")
    : '<div class="sub" style="padding:8px">Need 3+ close matches per player.</div>';

  const _antiClutchRows = [...clutchRankedAll]
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3)
    .filter((p) => p.pct < 50);
  const _antiClutchHtml = _antiClutchRows.length >= 2
    ? `<div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.07)"><div style="font-size:9px;font-weight:700;color:var(--muted);letter-spacing:0.08em;margin-bottom:6px">😰 ANTI-CLUTCH</div>` +
      _antiClutchRows.map((p, i) =>
        `<div class="lrace-row" style="${clutchGrid}"><div class="lrace-rank">#${i + 1}</div><div class="lrace-name">${p.name}</div><div class="lrace-1mo">${p.wins}–${p.played - p.wins}</div><div class="lrace-delta" style="color:var(--red)">${p.pct}% <span style="font-size:9px">CHOKER</span></div></div>`
      ).join("") + `</div>`
    : "";

  // ── CONSISTENCY RANKINGS ─────────────────────────────────
  // grid: Rank | Player | Matches | Consistency
  const conGrid = "grid-template-columns:40px 1fr 56px 86px";
  const consistencyStats = compList
    .filter((p) => p.mp >= 3 && p.consistency !== null)
    .sort((a, b) => a.consistency - b.consistency);
  const consistencyRankHtml = consistencyStats.length
    ? `<div style="font-size:9px;color:var(--muted);margin-bottom:8px">Lower = more consistent (std dev of score margins)</div>` +
      `<div class="lrace-header" style="${conGrid}"><span>Rank</span><span>Player</span><span>Matches</span><span>Consistency</span></div>` +
      consistencyStats
        .map((p, i) => {
          const col =
            p.consistency <= 2
              ? "var(--green)"
              : p.consistency <= 4
                ? "var(--gold)"
                : "var(--red)";
          const lbl =
            p.consistency <= 2
              ? "SOLID"
              : p.consistency <= 4
                ? "STEADY"
                : "ERRATIC";
          return `<div class="lrace-row" style="${conGrid}"><div class="lrace-rank">#${i + 1}</div><div class="lrace-name">${p.name}</div><div class="lrace-1mo">${p.mp}</div><div class="lrace-delta" style="color:${col}">±${p.consistency} <span style="font-size:9px">${lbl}</span></div></div>`;
        })
        .join("") +
      (consistencyStats.length >= 3
        ? `<div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.07)"><div style="font-size:9px;font-weight:700;color:var(--muted);letter-spacing:0.08em;margin-bottom:6px">⚡ MOST VOLATILE</div>` +
          [...consistencyStats].reverse().slice(0, 3).map((p, i) =>
            `<div class="lrace-row" style="${conGrid}"><div class="lrace-rank">#${i + 1}</div><div class="lrace-name">${p.name}</div><div class="lrace-1mo">${p.mp}</div><div class="lrace-delta" style="color:var(--red)">±${p.consistency} <span style="font-size:9px">VOLATILE</span></div></div>`
          ).join("") + `</div>`
        : "")
    : '<div class="sub" style="padding:8px">Need 3+ matches per player.</div>';

  // ── QUALITY WINS (OPPONENT STRENGTH WEIGHTING) ───────────
  const eloMapFull = _memoElo();
  const qualityWins = {};
  allMatches.forEach((m) => {
    const winners = m.scoreA > m.scoreB ? m.teamA : m.teamB;
    const losers = m.scoreA > m.scoreB ? m.teamB : m.teamA;
    const loserAvgElo =
      losers.reduce((s, p) => s + (eloMapFull[p] || 1000), 0) /
      (losers.length || 1);
    winners.forEach((p) => {
      if (!qualityWins[p]) qualityWins[p] = { total: 0, count: 0 };
      qualityWins[p].total += loserAvgElo;
      qualityWins[p].count++;
    });
  });
  const qualityRanked = Object.entries(qualityWins)
    .filter(([, v]) => v.count >= 3)
    .map(([name, v]) => ({
      name,
      score: Math.round(v.total / v.count),
      wins: v.count,
    }))
    .sort((a, b) => b.score - a.score);

  // Hardest single win = match with highest combined opponent ELO
  let _hardestWinMatch = null, _hardestCombinedElo = 0;
  allMatches.forEach((m) => {
    const _aw = m.scoreA > m.scoreB;
    const _losers2 = _aw ? m.teamB : m.teamA;
    const _combElo = _losers2.reduce((s, p) => s + (eloMapFull[p] || 1000), 0);
    if (_combElo > _hardestCombinedElo) { _hardestCombinedElo = _combElo; _hardestWinMatch = m; }
  });
  const _hardestWinCallout = _hardestWinMatch ? (() => {
    const _aw2 = _hardestWinMatch.scoreA > _hardestWinMatch.scoreB;
    const _w = (_aw2 ? _hardestWinMatch.teamA : _hardestWinMatch.teamB).join(" & ");
    const _l = (_aw2 ? _hardestWinMatch.teamB : _hardestWinMatch.teamA).join(" & ");
    return `<div style="background:rgba(var(--theme-rgb),0.08);border:1px solid rgba(var(--theme-rgb),0.18);border-radius:10px;padding:10px 12px;margin-bottom:10px"><div style="font-size:8px;font-weight:700;color:var(--gold);letter-spacing:0.08em;margin-bottom:5px">💎 HARDEST WIN · OPP ELO ${_hardestCombinedElo}</div><div style="font-size:12px;font-weight:800">${_w} <span style="color:var(--green)">beat</span> ${_l}</div><div style="font-size:10px;color:var(--muted);margin-top:3px">${fmtDate(_hardestWinMatch.date)} · ${_hardestWinMatch.scoreA}–${_hardestWinMatch.scoreB}</div></div>`;
  })() : "";

  // grid: Rank | Player | Wins | Avg Opp ELO
  const qualGrid = "grid-template-columns:40px 1fr 44px 72px";
  const qualityRankHtml = qualityRanked.length
    ? `<div style="font-size:9px;color:var(--muted);margin-bottom:8px">Average ELO of defeated opponents — higher = tougher competition</div>` +
      `<div class="lrace-header" style="${qualGrid}"><span>Rank</span><span>Player</span><span>Wins</span><span>Avg ELO</span></div>` +
      qualityRanked
        .map((p, i) => {
          const col =
            p.score >= 1050
              ? "var(--green)"
              : p.score <= 980
                ? "var(--red)"
                : "var(--muted)";
          const lbl =
            p.score >= 1050
              ? "💎 ELITE"
              : p.score <= 980
                ? "📉 EASY"
                : "⚖️ MID";
          return `<div class="lrace-row" style="${qualGrid}"><div class="lrace-rank">#${i + 1}</div><div class="lrace-name">${p.name}</div><div class="lrace-1mo">${p.wins}</div><div class="lrace-delta" style="color:${col}">${p.score} <span style="font-size:8px">${lbl}</span></div></div>`;
        })
        .join("")
    : '<div class="sub" style="padding:8px">Need 3+ wins per player.</div>';

  const destroyer = compList
    .filter((p) => p.mp >= 3)
    .sort((a, b) => b.avgMargin - a.avgMargin)[0];

  const topRivalEntry = Object.entries(rivalryCount).sort(
    (a, b) => b[1] - a[1],
  )[0];
  const [rivalA, rivalB] = topRivalEntry?.[0]?.split("|") || [null, null];
  const rivalry = rivalA && rivalB ? getHeadToHeadStats(rivalA, rivalB) : null;

  const uniqueMonths = Object.keys(monthlyStats).sort();
  const top5 = [...players]
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 5)
    .map((p) => p.name);
  const scoreDistSorted = Object.entries(scoreDist)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7);
  const maxSD = scoreDistSorted[0]?.[1] || 1;

  const closeMatches = sortedM
    .filter((m) => Math.abs(m.scoreA - m.scoreB) <= 1)
    .slice(-5)
    .reverse();

  const pwrMap = {};
  compList.forEach((p) => {
    pwrMap[p.name] = p.mwr;
  });
  const upsets = sortedM
    .map((m) => {
      const aWon = m.scoreA > m.scoreB;
      const wTeam = aWon ? m.teamA : m.teamB,
        lTeam = aWon ? m.teamB : m.teamA;
      const wR =
        wTeam.reduce((s, p) => s + (pwrMap[p] || 0.5), 0) /
        Math.max(wTeam.length, 1);
      const lR =
        lTeam.reduce((s, p) => s + (pwrMap[p] || 0.5), 0) /
        Math.max(lTeam.length, 1);
      return { m, wTeam, lTeam, gap: lR - wR };
    })
    .filter((u) => u.gap > 0.08)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3);

  const { from: wkFrom, to: wkTo } = lastWeekRange();
  const rankAll = compList.reduce((o, p, i) => ({ ...o, [p.name]: i + 1 }), {});
  const _preWkArr = activeMatches().filter((m) => (m.date || "") < wkFrom);
  const rank1wk = computeStats(_preWkArr, computeElo(_preWkArr)).reduce(
    (o, p, i) => ({ ...o, [p.name]: i + 1 }),
    {},
  );
  const rankRace = compList.map((p) => ({
    name: p.name,
    rAll: rankAll[p.name] || "—",
    r1mo: rank1wk[p.name] || "—",
    delta:
      typeof rank1wk[p.name] === "number" && typeof rankAll[p.name] === "number"
        ? rank1wk[p.name] - rankAll[p.name]
        : null,
  }));

  const formTable = playersByMatches
    .map((name) => {
      const pm = sortedM
        .filter((m) => m.teamA.includes(name) || m.teamB.includes(name))
        .slice(-10);
      if (pm.length < 3) return null;
      let w = 0;
      const dots = pm.map((m) => {
        const won = m.teamA.includes(name)
          ? m.scoreA > m.scoreB
          : m.scoreB > m.scoreA;
        if (won) w++;
        return won ? "W" : "L";
      });
      let strk = 0;
      const lastDot = dots.length ? dots[dots.length - 1] : null;
      if (lastDot) for (let si = dots.length - 1; si >= 0 && dots[si] === lastDot; si--) strk++;
      return {
        name,
        dots,
        pct: Math.round((w / pm.length) * 100),
        n: pm.length,
        streak: strk,
        streakType: lastDot,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.pct - a.pct);

  const bestPairPerP = compList
    .map((p) => ({ name: p.name, partner: p.bestPartner, wins: p.mw }))
    .filter((p) => p.partner && p.wins >= 1);
  const pairFormData = getPairStats()
    .filter((p) => p.played >= 3)
    .map((pair) => {
      const pm = sortedM
        .filter((m) => {
          const ak = [...m.teamA].sort().join(" & "),
            bk = [...m.teamB].sort().join(" & ");
          return ak === pair.key || bk === pair.key;
        })
        .slice(-5);
      const form = pm.map((m) => {
        const won =
          [...m.teamA].sort().join(" & ") === pair.key
            ? m.scoreA > m.scoreB
            : m.scoreB > m.scoreA;
        return won ? "W" : "L";
      });
      return { ...pair, form };
    });

  const sessionMap = {};
  sortedM.forEach((m) => {
    if (!m.date) return;
    if (!sessionMap[m.date])
      sessionMap[m.date] = { matches: [], players: new Set() };
    sessionMap[m.date].matches.push(m);
    [...m.teamA, ...m.teamB].forEach((p) => sessionMap[m.date].players.add(p));
  });
  const sessions = Object.entries(sessionMap)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 5)
    .map(([date, d]) => {
      const dw = {};
      d.matches.forEach((m) => {
        (m.scoreA > m.scoreB ? m.teamA : m.teamB).forEach((p) => {
          dw[p] = (dw[p] || 0) + 1;
        });
      });
      return {
        date,
        matches: d.matches,
        players: [...d.players],
        mvp: Object.entries(dw).sort((a, b) => b[1] - a[1])[0],
      };
    });

  // ── HTML HELPERS ───────────────────────────────────────
  const card = (badge, name, sub) =>
    `<div class="ana-card"><span class="badge">${badge}</span><div class="name">${name || "—"}</div><div class="sub">${sub}</div></div>`;
  const scard = (icon, title, name, sub) =>
    `<div class="award-card"><div class="award-icon">${icon}</div><div class="award-title">${title}</div><div class="award-name">${name || "—"}</div><div class="award-sub">${sub}</div></div>`;
  const section = (title) => `<div class="ana-section-title">${title}</div>`;
  const fdots = (arr) =>
    arr
      .map(
        (r) =>
          `<span class="fd ${r === "W" ? "fd-w" : "fd-l"}" style="width:14px;height:14px;font-size:7px">${r}</span>`,
      )
      .join("");
  const chartColors = ["#f5c842", "#18d7ff", "#36d47e", "#f04f4f", "#b44dff"];

  // ── WIN RATE CHART ─────────────────────────────────────
  let winChartHtml =
    '<div class="sub" style="padding:8px">Need matches across multiple months.</div>';
  if (uniqueMonths.length >= 2) {
    const W = 300,
      H = 110,
      pl = 32,
      pr = 8,
      pt = 10,
      pb = 18,
      cW = W - pl - pr,
      cH = H - pt - pb;
    const moN = [
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
    const yL = [0, 50, 100]
      .map((p) => {
        const y = pt + (1 - p / 100) * cH;
        return `<line x1="${pl}" y1="${y.toFixed(1)}" x2="${W - pr}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/><text x="${pl - 3}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="7" fill="rgba(255,255,255,0.35)">${p}%</text>`;
      })
      .join("");
    const xL = uniqueMonths
      .map((mo, i) => {
        const x = pl + (i / (uniqueMonths.length - 1 || 1)) * cW;
        return `<text x="${x.toFixed(1)}" y="${H - 3}" text-anchor="middle" font-size="7" fill="rgba(255,255,255,0.35)">${moN[parseInt(mo.substring(5))] || mo.substring(5)}</text>`;
      })
      .join("");
    const lines = top5
      .map((pn, ci) => {
        const pts = uniqueMonths
          .map((mo, i) => {
            const d = monthlyStats[mo]?.[pn];
            if (!d || d.m === 0) return null;
            return {
              x: pl + (i / (uniqueMonths.length - 1 || 1)) * cW,
              y: pt + (1 - d.w / d.m) * cH,
            };
          })
          .filter(Boolean);
        if (pts.length < 1) return "";
        const color = chartColors[ci % 5];
        return `<polyline points="${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>${pts.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5" fill="${color}"/>`).join("")}`;
      })
      .join("");
    const legend = top5
      .map(
        (p, ci) =>
          `<span style="display:inline-flex;align-items:center;gap:3px;font-size:9px;color:rgba(255,255,255,0.65)"><span style="display:inline-block;width:10px;height:2px;background:${chartColors[ci % 5]};border-radius:1px"></span>${p.split(" ")[0]}</span>`,
      )
      .join("");
    winChartHtml = `<div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block">${yL}${lines}${xL}</svg></div><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">${legend}</div>`;
  }

  // ── HEATMAP (all-time, clickable) ─────────────────────
  const heatHtml = (() => {
    const MON = [
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
    const DOW = ["M", "T", "W", "T", "F", "S", "S"];

    // Start from Monday of the week containing the first ever match
    const allDs = Object.keys(dateCounts).sort();
    const refDate = allDs.length ? new Date(allDs[0]) : new Date();
    const startDow = (refDate.getDay() + 6) % 7;
    refDate.setDate(refDate.getDate() - startDow);

    const todayD = new Date();
    const hCells = [];
    const cur = new Date(refDate);
    while (cur <= todayD) {
      const ds = toLocalISODate(cur);
      hCells.push({ ds, c: dateCounts[ds] || 0 });
      cur.setDate(cur.getDate() + 1);
    }
    while (hCells.length % 7 !== 0) hCells.push({ ds: "", c: 0, pad: true });

    const numWeeks = hCells.length / 7;
    const maxH = Math.max(...hCells.map((c) => c.c), 1);
    const todayStr = todayISO();

    // Month labels (one per column, show when month changes)
    const monthRow = Array.from({ length: numWeeks }, (_, col) => {
      const cell = hCells[col * 7];
      if (!cell?.ds) return `<div></div>`;
      const mo = parseInt(cell.ds.substring(5, 7)) - 1;
      const prev =
        col > 0
          ? parseInt(hCells[(col - 1) * 7]?.ds?.substring(5, 7) || "0") - 1
          : -1;
      return `<div class="hm-mo-lbl">${mo !== prev ? MON[mo] : ""}</div>`;
    }).join("");

    // Grid cells
    const cells = hCells
      .map((c) => {
        if (c.pad) return `<div class="hm-cell hm-pad"></div>`;
        const a = c.c === 0 ? 0 : Math.max(0.18, c.c / maxH);
        const bg =
          c.c === 0
            ? "rgba(255,255,255,0.05)"
            : `rgba(var(--theme-rgb),${a.toFixed(2)})`;
        const isToday = c.ds === todayStr;
        const clickable =
          c.c > 0
            ? `onclick="calDayClick('${c.ds}')" style="background:${bg};cursor:pointer${isToday ? ";outline:1.5px solid rgba(var(--theme-rgb),0.8);outline-offset:-1px" : ""}"`
            : `style="background:${bg}${isToday ? ";outline:1.5px solid rgba(var(--theme-rgb),0.5);outline-offset:-1px" : ""}"`;
        const tip = c.ds + (c.c ? `: ${c.c} match${c.c > 1 ? "es" : ""}` : "");
        return `<div class="hm-cell" ${clickable} title="${tip}"></div>`;
      })
      .join("");

    // Stats bar
    const totalSessions = allDs.length;
    const busiestDay = allDs.reduce(
      (a, b) => (dateCounts[b] > dateCounts[a] ? b : a),
      allDs[0] || "",
    );
    const monthCounts = {};
    allDs.forEach((ds) => {
      const k = ds.substring(0, 7);
      monthCounts[k] = (monthCounts[k] || 0) + dateCounts[ds];
    });
    const busiestMonth = Object.keys(monthCounts).reduce(
      (a, b) => (monthCounts[b] > monthCounts[a] ? b : a),
      Object.keys(monthCounts)[0] || "",
    );
    const busiestMonthLabel = busiestMonth
      ? MON[parseInt(busiestMonth.substring(5, 7)) - 1] +
        " " +
        busiestMonth.substring(0, 4)
      : "—";
    const statsBar = `<div class="hm-stats-row">
      <div class="hm-stat"><div class="hm-stat-val">${totalSessions}</div><div class="hm-stat-lbl">Session Days</div></div>
      <div class="hm-stat-div"></div>
      <div class="hm-stat"><div class="hm-stat-val">${allMatches.length}</div><div class="hm-stat-lbl">Total Matches</div></div>
      <div class="hm-stat-div"></div>
      <div class="hm-stat"><div class="hm-stat-val">${busiestMonthLabel}</div><div class="hm-stat-lbl">Busiest Month</div></div>
      <div class="hm-stat-div"></div>
      <div class="hm-stat"><div class="hm-stat-val">${busiestDay ? fmtDate(busiestDay) : "—"}</div><div class="hm-stat-lbl">Peak Day (${dateCounts[busiestDay] || 0}m)</div></div>
    </div>`;

    return `<div class="hm-outer">
      <div class="hm-scroll">
        <div class="hm-dow-col">${DOW.map((d) => `<div class="hm-dow">${d}</div>`).join("")}</div>
        <div style="flex:1;min-width:0">
          <div class="hm-mo-row" style="grid-template-columns:repeat(${numWeeks},var(--hm-sz))">${monthRow}</div>
          <div class="hm-grid" style="grid-template-columns:repeat(${numWeeks},var(--hm-sz))">${cells}</div>
        </div>
      </div>
      <div class="hm-legend"><span>Less</span><div class="hm-leg-cell" style="background:rgba(255,255,255,0.05)"></div><div class="hm-leg-cell" style="background:rgba(var(--theme-rgb),0.25)"></div><div class="hm-leg-cell" style="background:rgba(var(--theme-rgb),0.6)"></div><div class="hm-leg-cell" style="background:rgba(var(--theme-rgb),1)"></div><span>More</span></div>
    </div>${statsBar}`;
  })();

  // ── SCORE DISTRIBUTION ─────────────────────────────────
  const _topScore = scoreDistSorted[0];
  const _allMarginsRaw = sortedM.map((m) => Math.abs(m.scoreA - m.scoreB));
  const _avgMarginOverall = _allMarginsRaw.length
    ? (_allMarginsRaw.reduce((s, v) => s + v, 0) / _allMarginsRaw.length).toFixed(1)
    : "—";
  const _sdCallout = _topScore
    ? `<div style="display:flex;gap:8px;margin-bottom:10px"><div style="flex:1;background:rgba(var(--theme-rgb),0.08);border-radius:8px;padding:8px;text-align:center"><div style="font-size:8px;color:var(--muted);letter-spacing:0.06em;margin-bottom:3px">MOST COMMON SCORE</div><div style="font-size:20px;font-weight:900;color:var(--theme)">${_topScore[0]}</div><div style="font-size:9px;color:var(--muted)">${_topScore[1]}× · ${Math.round(_topScore[1] / allMatches.length * 100)}%</div></div><div style="flex:1;background:rgba(var(--theme-rgb),0.08);border-radius:8px;padding:8px;text-align:center"><div style="font-size:8px;color:var(--muted);letter-spacing:0.06em;margin-bottom:3px">AVG MARGIN</div><div style="font-size:20px;font-weight:900;color:var(--accent)">${_avgMarginOverall}</div><div style="font-size:9px;color:var(--muted)">games per match</div></div></div>`
    : "";
  const sdHtml = scoreDistSorted
    .map(
      ([s, c]) =>
        `<div class="sdist-row"><div class="sdist-lbl">${s}</div><div class="sdist-bar-wrap"><div class="sdist-bar" style="width:${((c / maxSD) * 100).toFixed(0)}%"></div></div><div class="sdist-count">${c}</div></div>`,
    )
    .join("");

  // ── FORM TABLE ─────────────────────────────────────────
  const ftHtml =
    formTable
      .map((p, i) => {
        const pc =
          p.pct >= 60
            ? "var(--green)"
            : p.pct <= 40
              ? "var(--red)"
              : "var(--text)";
        const skBadge = p.streak >= 2
          ? `<span class="ft-streak-badge ${p.streakType === "W" ? "ft-sk-w" : "ft-sk-l"}">${p.streak}${p.streakType}</span>`
          : `<span class="ft-streak-badge ft-sk-n">—</span>`;
        return `<div class="ftable-row"><div class="ftable-rank">${i + 1}</div><div class="ftable-name">${p.name}</div><div class="ftable-dots">${fdots(p.dots)}</div><div class="ftable-pct" style="color:${pc}">${p.pct}%</div>${skBadge}</div>`;
      })
      .join("") ||
    '<div class="sub" style="padding:8px">Not enough data.</div>';

  // ── LEADERBOARD RACE ───────────────────────────────────
  const lrHtml = rankRace
    .map((p) => {
      const arrow =
        p.delta > 0
          ? `<span style="color:var(--green)">▲${p.delta}</span>`
          : p.delta < 0
            ? `<span style="color:var(--red)">▼${Math.abs(p.delta)}</span>`
            : `<span style="color:var(--muted)">—</span>`;
      const rankColor = _rankColor(p.rAll, rankRace.length);
      const avatar = sheetAvSm(p.name);
      return `<div class="lrace-row">
        <div class="lrace-rank" style="color:${rankColor}">#${p.rAll}</div>
        <div class="lrace-name">${avatar}<span>${p.name}</span></div>
        <div class="lrace-1mo">${typeof p.r1mo === "number" ? `#${p.r1mo}` : "—"}</div>
        <div class="lrace-delta">${arrow}</div>
      </div>`;
    })
    .join("");

  // ── MOST IMPROVED ──────────────────────────────────────
  const mostImproved = (() => {
    const pNames = Object.keys(stats).filter((p) => stats[p].matches >= 5);
    let best = null, bestDiff = -Infinity;
    for (const p of pNames) {
      const overall = stats[p].wins / stats[p].matches;
      const pMatches = sortedM.filter((m) => [...(m.teamA || []), ...(m.teamB || [])].includes(p));
      const recent = pMatches.slice(-10);
      if (recent.length < 3) continue;
      const recWins = recent.filter((m) =>
        (m.scoreA > m.scoreB ? (m.teamA || []) : (m.teamB || [])).includes(p)
      ).length;
      const recentRate = recWins / recent.length;
      const diff = recentRate - overall;
      if (diff > bestDiff) { bestDiff = diff; best = p; }
    }
    return best ? { name: best, diff: Math.round(bestDiff * 100) } : null;
  })();

  // ── AWARDS ─────────────────────────────────────────────
  const awards = [
    {
      i: "🎯",
      t: "Sharpshooter",
      n: topWinRate?.name,
      s: `${topWinRate ? Math.round((topWinRate.wins / topWinRate.matches) * 100) : 0}% win rate`,
    },
    {
      i: "🛡️",
      t: "The Wall",
      n: mostShutoutWinsEntry?.[0] || "—",
      s: `${mostShutoutWinsEntry?.[1] || 0} shutout wins`,
    },
    {
      i: "💔",
      t: "Glass Jaw",
      n: mostShutoutLosses[0] || "—",
      s: `${maxLosses} shutout losses`,
    },
    {
      i: "📈",
      t: "Most Improved",
      n: mostImproved?.name || "—",
      s: mostImproved
        ? `+${mostImproved.diff}% recent vs overall`
        : "Needs 5+ matches",
    },
    {
      i: "🎲",
      t: "Clutch",
      n: clutchP || "—",
      s: clutchP
        ? `${Math.round(((closeWins[clutchP] || 0) / closePlayed[clutchP]) * 100)}% in close matches`
        : "Needs 3+ close matches",
    },
    {
      i: "🤝",
      t: "Dynamic Duo",
      n: bestPartnership?.players?.join(" & ") || "—",
      s: `${bestPartnership ? Math.round((bestPartnership.wins / bestPartnership.played) * 100) : 0}% win rate together`,
    },
  ];
  const awardsHtml = awards
    .map(
      (a) =>
        `<div class="award-card"><div class="award-icon">${a.i}</div><div class="award-title">${a.t}</div><div class="award-name">${a.n || "—"}</div><div class="award-sub">${a.s}</div></div>`,
    )
    .join("");

  // ── CLOSEST MATCHES ────────────────────────────────────
  const cmHtml = closeMatches.length
    ? closeMatches
        .map(
          (m) =>
            `<div class="ana-card" style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px"><div><div style="font-size:12px;font-weight:700;text-transform:uppercase">${m.teamA.join(" & ")} vs ${m.teamB.join(" & ")}</div><div class="sub">${fmtDate(m.date)}</div></div><div style="font-size:16px;font-weight:800;color:var(--theme)">${m.scoreA}–${m.scoreB}</div></div>`,
        )
        .join("")
    : '<div class="ana-card"><div class="sub">No close matches yet.</div></div>';

  // ── BIGGEST UPSETS ─────────────────────────────────────
  const upHtml = upsets.length
    ? upsets
        .map(
          (u) =>
            `<div class="ana-card" style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px"><div><div style="font-size:12px;font-weight:700;text-transform:uppercase">${u.wTeam.join(" & ")} <span style="color:var(--green)">won</span></div><div class="sub" style="text-transform:uppercase">vs ${u.lTeam.join(" & ")} · ${fmtDate(u.m.date)}</div></div><div style="text-align:right"><div style="font-size:14px;font-weight:800;color:var(--text)">${u.m.scoreA}–${u.m.scoreB}</div><div style="font-size:9px;color:var(--red);font-weight:700">+${(u.gap * 100).toFixed(0)}% gap</div></div></div>`,
        )
        .join("")
    : '<div class="ana-card"><div class="sub">No clear upsets found.</div></div>';

  // ── CHEMISTRY ─────────────────────────────────────────
  const chemData = Object.entries(partnerships)
    .filter(([, v]) => v.played >= 2)
    .sort((a, b) => {
      const diff = b[1].wins / b[1].played - a[1].wins / a[1].played;
      return diff !== 0 ? diff : b[1].played - a[1].played;
    })
    .slice(0, 6);
  const chemHtml = chemData.length
    ? chemData
        .map(([, p]) => {
          const pc = Math.round((p.wins / p.played) * 100);
          const col =
            pc >= 60 ? "var(--green)" : pc <= 40 ? "var(--red)" : "var(--text)";
          return `<div class="chem-row"><div class="chem-names">${p.players.join(" & ")}</div><div class="chem-bar-wrap"><div class="chem-bar" style="width:${pc}%;background:${col}"></div></div><div class="chem-pct" style="color:${col}">${pc}%</div><div class="chem-played">${p.played}g</div></div>`;
        })
        .join("")
    : '<div class="sub" style="padding:8px">Need more doubles data.</div>';

  const bpHtml =
    bestPairPerP
      .map(
        (p) =>
          `<div class="bpair-row"><div class="bpair-player">${p.name}</div><div class="bpair-partner">🤝 ${p.partner.name.split(" ")[0]}</div><div class="bpair-pct">${p.partner.pct.toFixed(0)}%</div></div>`,
      )
      .join("") ||
    '<div class="sub" style="padding:8px">Not enough data.</div>';

  // ── PAIR SYNERGY DELTA ────────────────────────────────────
  // For each player, show how much better/worse they perform with each partner vs their baseline
  const overallWinRate = {};
  compList.forEach((p) => {
    overallWinRate[p.name] = p.winPct;
  });
  const synergyRows = [];
  Object.entries(partnerships).forEach(([key, pd]) => {
    if (pd.played < 2) return;
    const [pA, pB] = pd.players;
    const pairPct = (pd.wins / pd.played) * 100;
    if (overallWinRate[pA] !== undefined) {
      synergyRows.push({
        player: pA,
        partner: pB,
        pairPct,
        delta: pairPct - overallWinRate[pA],
        played: pd.played,
      });
    }
    if (overallWinRate[pB] !== undefined) {
      synergyRows.push({
        player: pB,
        partner: pA,
        pairPct,
        delta: pairPct - overallWinRate[pB],
        played: pd.played,
      });
    }
  });
  synergyRows.sort((a, b) => b.delta - a.delta);
  const synergyHtml = (() => {
    if (!synergyRows.length)
      return '<div class="sub" style="padding:8px">Not enough data.</div>';
    const SYN_LIMIT = 10;
    const rowHtml = (r) => {
      const col =
        r.delta > 5
          ? "var(--green)"
          : r.delta < -5
            ? "var(--red)"
            : "var(--muted)";
      const sign = r.delta >= 0 ? "+" : "";
      return `<div class="bpair-row"><div class="bpair-player">${r.player}</div><div class="bpair-partner">+ ${r.partner.split(" ")[0]}</div><div class="bpair-pct" style="color:${col}">${sign}${r.delta.toFixed(0)}%</div></div>`;
    };
    const visible = synergyRows.slice(0, SYN_LIMIT).map(rowHtml).join("");
    const hidden = synergyRows.slice(SYN_LIMIT);
    if (!hidden.length) return visible;
    const extraHtml = hidden
      .map(
        (r) =>
          `<div class="synergy-extra" style="display:none">${rowHtml(r)}</div>`,
      )
      .join("");
    const btn = `<div style="text-align:center;padding:6px 0"><button onclick="_toggleSynergyMore(this)" data-expanded="0" style="font-size:10px;font-weight:700;color:var(--theme);background:transparent;border:none;cursor:pointer;padding:4px 8px">Show ${hidden.length} more ▼</button></div>`;
    return visible + extraHtml + btn;
  })();

  // ── PAIRED H2H ────────────────────────────────────────────
  const pairedH2HRows = Object.entries(teamMatchups)
    .filter(([, v]) => v.played >= 2)
    .sort((a, b) => b[1].played - a[1].played);
  const pairedH2HHtml = pairedH2HRows.length
    ? pairedH2HRows
        .map(([matchupKey, v], idx) => {
          const tkA = v.teamA.join(" & ");
          const tkB = v.teamB.join(" & ");
          const wA = v.wins[tkA] || 0;
          const wB = v.wins[tkB] || 0;
          const colA =
            wA > wB ? "var(--green)" : wA < wB ? "var(--red)" : "var(--muted)";
          const colB =
            wB > wA ? "var(--green)" : wB < wA ? "var(--red)" : "var(--muted)";
          const shortA = v.teamA.map((p) => p.split(" ")[0]).join(" & ");
          const shortB = v.teamB.map((p) => p.split(" ")[0]).join(" & ");
          const leader = wA > wB ? tkA : wB > wA ? tkB : null;
          const shortLeader = wA > wB ? shortA : wB > wA ? shortB : null;
          const leadsBy = Math.abs(wA - wB);
          // Detailed match list for popup
          const matchList = (v.matches || [])
            .slice()
            .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
            .map((m) => {
              const aWon = m.scoreA > m.scoreB;
              const mtkA = m.teamA.sort().join(" & ");
              const isVtkA = mtkA === v.teamA.slice().sort().join(" & ");
              const winnerSide = aWon
                ? isVtkA
                  ? "A"
                  : "B"
                : isVtkA
                  ? "B"
                  : "A";
              const winName = winnerSide === "A" ? shortA : shortB;
              const scoreStr = isVtkA
                ? `${m.scoreA}–${m.scoreB}`
                : `${m.scoreB}–${m.scoreA}`;
              return `<div style="display:flex;justify-content:space-between;font-size:10px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
              <span style="color:var(--muted)">${fmtDate(m.date)}</span>
              <span style="font-weight:700;color:${winnerSide === "A" ? colA : colB}">${winName}</span>
              <span style="font-weight:700">${scoreStr}</span>
            </div>`;
            })
            .join("");
          const avgScoreA =
            wA > 0 ? (v.gamesWonByTeam?.[tkA] / wA).toFixed(1) : "—";
          return `<div style="border-bottom:1px solid var(--border)">
            <div style="display:flex;align-items:center;padding:8px 0;cursor:pointer;gap:8px" onclick="this.parentElement.querySelector('.ph2h-detail').style.display=this.parentElement.querySelector('.ph2h-detail').style.display==='none'?'block':'none'">
              <div style="flex:1;min-width:0">
                <div style="font-size:11px;font-weight:700">${shortA} <span style="color:var(--muted);font-weight:400">vs</span> ${shortB}</div>
                ${shortLeader ? `<div style="font-size:9px;color:var(--muted);margin-top:2px">${shortLeader} leads by ${leadsBy}</div>` : `<div style="font-size:9px;color:var(--muted);margin-top:2px">Series tied</div>`}
              </div>
              <div style="display:flex;align-items:center;gap:6px">
                <span style="font-size:18px;font-weight:900;color:${colA}">${wA}</span>
                <span style="font-size:10px;color:var(--muted)">${v.played}g</span>
                <span style="font-size:18px;font-weight:900;color:${colB}">${wB}</span>
              </div>
              <span style="color:var(--muted);font-size:10px">›</span>
            </div>
            <div class="ph2h-detail" style="display:none;background:rgba(255,255,255,0.03);border-radius:8px;padding:8px 10px;margin-bottom:8px">
              <div style="font-size:9px;font-weight:700;color:var(--muted);margin-bottom:6px">MATCH HISTORY</div>
              ${matchList || '<div style="font-size:10px;color:var(--muted)">No match details</div>'}
            </div>
          </div>`;
        })
        .join("")
    : '<div class="sub" style="padding:8px">Need 2+ head-to-head matches between same pairs.</div>';

  const allPairsRanked = Object.entries(partnerships).sort((a, b) => {
    const diff = b[1].wins / b[1].played - a[1].wins / a[1].played;
    return diff !== 0 ? diff : b[1].played - a[1].played;
  });

  // Compute ELO rank for each pair (avg of the two players' current ELO)
  const pairEloRankMap = new Map();
  const pairAvgEloArr = [...Object.entries(partnerships)].map(([key, p]) => ({
    key,
    avgElo:
      p.players.reduce((s, n) => s + (eloMap[n] || 1000), 0) / p.players.length,
  }));
  pairAvgEloArr
    .slice()
    .sort((a, b) => b.avgElo - a.avgElo)
    .forEach(({ key }, i) => pairEloRankMap.set(key, i + 1));

  // Pair chemistry score = 60% win% + 40% ELO-normalized
  const _minPairElo = pairAvgEloArr.length
    ? Math.min(...pairAvgEloArr.map((x) => x.avgElo))
    : 1000;
  const _maxPairElo = pairAvgEloArr.length
    ? Math.max(...pairAvgEloArr.map((x) => x.avgElo))
    : 1000;
  const _pairEloRange = Math.max(1, _maxPairElo - _minPairElo);
  const pairChemMap = new Map();
  pairAvgEloArr.forEach(({ key, avgElo }) => {
    const p = partnerships[key];
    const winComp = p.played ? (p.wins / p.played) * 100 : 0;
    const eloNorm = ((avgElo - _minPairElo) / _pairEloRange) * 100;
    pairChemMap.set(key, Math.round(0.6 * winComp + 0.4 * eloNorm));
  });

  _pairSort = { key: "winPct", dir: -1 };
  _pairsShowAll = false;
  _pairsData = allPairsRanked.map(([key, p]) => ({
    key,
    players: p.players,
    wins: p.wins,
    played: p.played,
    eloRank: pairEloRankMap.get(key) || 9999,
    chem: pairChemMap.get(key) || 0,
  }));

  const allPairsHtml = _pairsData.length
    ? `<div id="all-pairs-table">${_pairsHeaderHtml()}${_pairsSortedRows()}</div>`
    : '<div class="sub" style="padding:8px">No pair data.</div>';

  const pfHtml = pairFormData.length
    ? pairFormData
        .map(
          (p, i) =>
            `<div class="pform-row pform-extra${i >= 6 ? " pform-hidden" : ""}" style="${i >= 6 ? "display:none" : ""}"><div class="pform-name">${p.key}</div><div class="pform-dots">${fdots(p.form)}</div><div class="pform-stat">${p.winPct}% · ${p.played}g</div></div>`,
        )
        .join("") +
      (pairFormData.length > 6
        ? `<div class="pform-row" style="justify-content:center;padding:4px 0"><button onclick="_togglePairForm(this)" data-expanded="0" style="font-size:10px;font-weight:700;color:var(--theme);background:transparent;border:none;cursor:pointer;padding:4px 8px">Show ${pairFormData.length - 6} more ▼</button></div>`
        : "")
    : '<div class="sub" style="padding:8px">Need more pair data.</div>';

  // ── RIVALRY ────────────────────────────────────────────
  let rivalHtml = '<div class="sub" style="padding:8px">Not enough data.</div>';
  if (rivalry && rivalA && rivalB) {
    const tot = rivalry.aWins + rivalry.bWins;
    const aPct = Math.round((rivalry.aWins / tot) * 100);
    const bPct = 100 - aPct;

    // Series leader
    const leader =
      rivalry.aWins > rivalry.bWins
        ? rivalA
        : rivalry.bWins > rivalry.aWins
          ? rivalB
          : null;
    const leaderWins = leader ? Math.max(rivalry.aWins, rivalry.bWins) : null;
    const leaderHtml = leader
      ? `<div class="rival-leader"><span class="rival-leader-name">${leader}</span><span class="rival-leader-lbl">leads ${leaderWins}–${tot - leaderWins}</span></div>`
      : `<div class="rival-leader"><span class="rival-leader-lbl" style="color:var(--muted)">Series tied ${rivalry.aWins}–${rivalry.bWins}</span></div>`;

    // Current run within rivalry
    const chronoMeetings = [...rivalry.matches].sort((a, b) =>
      (a.date || "").localeCompare(b.date || ""),
    );
    let runCount = 0,
      runWinner = null;
    for (let i = chronoMeetings.length - 1; i >= 0; i--) {
      const m = chronoMeetings[i];
      const aWon =
        (m.teamA.includes(rivalA) && m.scoreA > m.scoreB) ||
        (m.teamB.includes(rivalA) && m.scoreB > m.scoreA);
      const w = aWon ? rivalA : rivalB;
      if (runWinner === null) {
        runWinner = w;
        runCount = 1;
      } else if (w === runWinner) runCount++;
      else break;
    }
    const runHtml =
      runCount >= 2
        ? `<div class="rival-run">🔥 <strong>${runWinner}</strong> has won the last <strong>${runCount}</strong> in this rivalry</div>`
        : "";

    // W/L dots (last 10, chronological left→right, from rivalA's perspective)
    const dotMeetings = chronoMeetings.slice(-10);
    const dots = dotMeetings
      .map((m) => {
        const aWon =
          (m.teamA.includes(rivalA) && m.scoreA > m.scoreB) ||
          (m.teamB.includes(rivalA) && m.scoreB > m.scoreA);
        return `<span class="rival-dot ${aWon ? "rival-dot-w" : "rival-dot-l"}" title="${aWon ? rivalA : rivalB} won ${m.scoreA}-${m.scoreB}"></span>`;
      })
      .join("");
    const dotsHtml = `<div class="rival-dots-row"><span class="rival-dots-name">${rivalA}</span><div class="rival-dots">${dots}</div><span class="rival-dots-name">${rivalB}</span></div>`;

    // Recent 5 matches
    const recent = [...rivalry.matches]
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 5);
    const recentRows = recent
      .map((m) => {
        const aWon =
          (m.teamA.includes(rivalA) && m.scoreA > m.scoreB) ||
          (m.teamB.includes(rivalA) && m.scoreB > m.scoreA);
        const winScore = Math.max(m.scoreA, m.scoreB);
        const loseScore = Math.min(m.scoreA, m.scoreB);
        return `<div class="rival-match-row"><span class="rival-match-winner" style="color:${aWon ? "var(--green)" : "var(--red)"}">${aWon ? rivalA : rivalB} won</span><span class="rival-match-score">${winScore}–${loseScore} · ${fmtDate(m.date)}</span></div>`;
      })
      .join("");

    rivalHtml = `
      <div class="rivalry-header"><div class="rivalry-player">${rivalA}</div><div class="rivalry-vs">VS</div><div class="rivalry-player">${rivalB}</div></div>
      <div class="rivalry-record">
        <div class="rivalry-stat"><div class="rivalry-val p">${rivalry.aWins}</div><div class="rivalry-lbl">${aPct}%</div></div>
        <div class="rivalry-stat"><div class="rivalry-val m">${tot}</div><div class="rivalry-lbl">Meetings</div></div>
        <div class="rivalry-stat"><div class="rivalry-val n">${rivalry.bWins}</div><div class="rivalry-lbl">${bPct}%</div></div>
      </div>
      ${leaderHtml}
      ${dotsHtml}
      ${runHtml}
      <div class="rival-recent-title">Recent Meetings</div>
      ${recentRows}`;
  }

  // ── SESSIONS ───────────────────────────────────────────
  const allSessionEntries = Object.entries(sessionMap).sort((a, b) =>
    b[0].localeCompare(a[0]),
  );
  const totalSessions = allSessionEntries.length;
  const allSessionDates = allSessionEntries.map(([d]) => d);
  let longestGap = 0;
  for (let i = 0; i < allSessionDates.length - 1; i++) {
    const gap = Math.round(
      (new Date(allSessionDates[i] + "T00:00:00") -
        new Date(allSessionDates[i + 1] + "T00:00:00")) /
        86400000,
    );
    if (gap > longestGap) longestGap = gap;
  }
  const avgMatchesPerSession = totalSessions
    ? (allMatches.length / totalSessions).toFixed(1)
    : 0;
  const maxPlayersSession = allSessionEntries.reduce(
    (max, [, d]) => Math.max(max, d.players.size),
    0,
  );
  const sessionSummaryHtml = totalSessions
    ? `<div class="sess-summary-grid">
    <div class="sess-summary-cell"><div class="sess-summary-val">${totalSessions}</div><div class="sess-summary-lbl">TOTAL SESSIONS</div></div>
    <div class="sess-summary-cell"><div class="sess-summary-val">${avgMatchesPerSession}</div><div class="sess-summary-lbl">AVG MATCHES</div></div>
    <div class="sess-summary-cell"><div class="sess-summary-val">${longestGap}d</div><div class="sess-summary-lbl">LONGEST GAP</div></div>
    <div class="sess-summary-cell"><div class="sess-summary-val">${maxPlayersSession}</div><div class="sess-summary-lbl">MAX PLAYERS</div></div>
  </div>`
    : "";
  const sessHtml = sessions.length
    ? sessionSummaryHtml +
      sessions
        .map(
          (s) =>
            `<div class="session-card" onclick="openSessionHighlights('${s.date}')" style="cursor:pointer"><div class="session-date">${fmtDate(s.date)}</div><div class="session-stats"><span>${s.matches.length} match${s.matches.length > 1 ? "es" : ""}</span><span>${s.players.length} players</span></div>${s.mvp ? `<div class="session-mvp">🏆 MVP: <strong>${s.mvp[0]}</strong> · ${s.mvp[1]}W</div>` : ""}<div class="session-players">${s.players.map((p) => `<span class="session-chip">${p}</span>`).join("")}</div><div class="session-tap-hint">Tap for highlights →</div></div>`,
        )
        .join("")
    : '<div class="sub" style="padding:8px">No sessions yet.</div>';

  // ── H2H DEEP DIVE ──────────────────────────────────────
  const opts = playersByMatches
    .map((p) => `<option value="${escHtml(p)}">${escHtml(p.toUpperCase())}</option>`)
    .join("");
  const placeholder = `<option value="" disabled selected>Select player</option>`;
  const h2hHtml = `<div class="h2h-form"><div class="h2h-selects h2h-cascade-item"><select id="h2hP1" class="hist-select compact-select" style="flex:1">${placeholder}${opts}</select><span style="color:var(--muted);font-weight:700;font-size:12px;flex-shrink:0">VS</span><select id="h2hP2" class="hist-select compact-select" style="flex:1">${placeholder}${opts}</select></div><button class="btn-go h2h-cascade-item" style="width:100%;margin-top:8px" onclick="renderH2HDeepDive()">Compare</button></div><div id="h2h-result" style="margin-top:8px"></div>`;

  // ── ELO RANKINGS ───────────────────────────────────────
  const { from: wkFromElo } = lastWeekRange();
  const preWkEloMap = computeElo(
    activeMatches().filter((m) => (m.date || "") < wkFromElo),
  );
  const eloRanked = Object.entries(eloMap).sort((a, b) => b[1] - a[1]);
  const preWkRanked = Object.entries(preWkEloMap).sort((a, b) => b[1] - a[1]);
  const maxEloVal = eloRanked[0]?.[1] || 1000;
  const minEloVal = eloRanked[eloRanked.length - 1]?.[1] || 1000;
  const eloRange = Math.max(1, maxEloVal - minEloVal);
  const eloPeaks = _memoEloPeaks();
  const eloHistoryAll = _memoEloHistory();
  const eloHtml = eloRanked.length
    ? `<div class="ana-card elo-leaderboard-card" style="padding:10px 12px">${eloRanked
        .map(([pname, ev], i) => {
          const change = ev - (preWkEloMap[pname] || 1000);
          const changeStr =
            change > 0
              ? `<span style="color:var(--green)">+${change}</span>`
              : change < 0
                ? `<span style="color:var(--red)">${change}</span>`
                : `<span style="color:var(--muted)">—</span>`;
          const preWkRankIdx = preWkRanked.findIndex(([n]) => n === pname);
          const rankChange =
            preWkRankIdx >= 0 ? preWkRankIdx + 1 - (i + 1) : null;
          const rankArrow =
            rankChange === null
              ? ""
              : rankChange > 0
                ? `<span class="elo-rank-arrow elo-rank-up">▲${rankChange}</span>`
                : rankChange < 0
                  ? `<span class="elo-rank-arrow elo-rank-down">▼${Math.abs(rankChange)}</span>`
                  : `<span class="elo-rank-arrow elo-rank-same">—</span>`;
          const barW = Math.max(5, ((ev - minEloVal) / eloRange) * 100).toFixed(
            0,
          );
          const col =
            ev >= 1100
              ? "var(--green)"
              : ev <= 900
                ? "var(--red)"
                : "var(--theme)";
          const peak = eloPeaks[pname] || ev;
          const fromPeak = ev - peak;
          const fromPeakStr =
            fromPeak === 0
              ? `<span style="color:var(--green);font-size:8px">▲ PEAK</span>`
              : `<span style="color:var(--red);font-size:8px">${fromPeak}</span>`;
          // Last 5 momentum dots
          const pts5 = (eloHistoryAll[pname] || []).slice(-5);
          const dots5 = pts5
            .map(
              (pt) =>
                `<span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:${pt.won ? "var(--green)" : "var(--red)"};margin-right:1px"></span>`,
            )
            .join("");
          const momDeltas = pts5.map((pt) => pt.delta);
          const momAvg = momDeltas.length
            ? Math.round(
                momDeltas.reduce((s, d) => s + d, 0) / momDeltas.length,
              )
            : 0;
          const momStr =
            momAvg > 0
              ? `<span style="color:var(--green);font-size:8px">↑${momAvg}</span>`
              : momAvg < 0
                ? `<span style="color:var(--red);font-size:8px">↓${Math.abs(momAvg)}</span>`
                : `<span style="color:var(--muted);font-size:8px">→</span>`;
          return `<div class="elo-row" style="gap:5px;align-items:center">
            <div class="elo-rank-col"><div class="elo-rank">#${i + 1}</div>${rankArrow}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:700;text-transform:uppercase;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${pname}</div>
              <div class="elo-bar-wrap"><div class="elo-bar" style="width:${barW}%;background:${col};animation-delay:${(i * 0.07).toFixed(2)}s"></div></div>
            </div>
            <div style="flex-shrink:0;width:38px;text-align:right">
              <div class="elo-val">${ev}</div>
              <div class="elo-change" style="margin-top:2px">${changeStr}</div>
            </div>
            <div style="flex-shrink:0;width:50px;text-align:right;border-left:1px solid rgba(255,255,255,0.06);padding-left:5px">
              <div style="font-size:7px;color:var(--muted);letter-spacing:0.08em">PEAK</div>
              <div style="font-size:11px;font-weight:800">${peak}</div>
              <div style="margin-top:1px">${fromPeakStr}</div>
            </div>
            <div style="flex-shrink:0;width:44px;text-align:right;border-left:1px solid rgba(255,255,255,0.06);padding-left:5px">
              <div style="font-size:7px;color:var(--muted);letter-spacing:0.08em">L5</div>
              <div style="display:flex;justify-content:flex-end;gap:1px;margin:2px 0">${dots5}</div>
              <div>${momStr}</div>
            </div>
          </div>`;
        })
        .join("")}</div>`
    : '<div class="sub" style="padding:8px">No data yet.</div>';

  // ── ELO WIN PROBABILITY ────────────────────────────────
  const eloWinProbHtml =
    playersByMatches.length >= 2
      ? `<div class="ana-card" style="padding:10px 12px">
        <div style="font-size:10px;color:var(--muted);margin-bottom:10px">Pick two players to see win probability based on current ELO ratings.</div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <button class="h2h-slot-btn" id="eloProb-slot-p1" onclick="openEloProbSheet('p1')" style="flex:1">
            <span style="font-size:9px;color:var(--muted);display:block;margin-bottom:2px">PLAYER 1</span>
            <span id="eloProb-label-p1" style="font-size:12px;font-weight:800">P1</span>
          </button>
          <span style="color:var(--muted);font-weight:700;font-size:12px;flex-shrink:0">VS</span>
          <button class="h2h-slot-btn" id="eloProb-slot-p2" onclick="openEloProbSheet('p2')" style="flex:1">
            <span style="font-size:9px;color:var(--muted);display:block;margin-bottom:2px">PLAYER 2</span>
            <span id="eloProb-label-p2" style="font-size:12px;font-weight:800">P2</span>
          </button>
        </div>
        <div id="elo-prob-result" style="margin-top:4px"></div>
      </div>`
      : '<div class="sub" style="padding:8px">Need at least 2 players.</div>';

  // ── ELO VOLATILITY ─────────────────────────────────────
  const eloVolatilityHtml = (() => {
    const players = Object.keys(eloHistoryAll).filter(
      (p) => eloHistoryAll[p].length >= 3,
    );
    if (!players.length)
      return '<div class="sub" style="padding:8px">Need more matches.</div>';
    const rows = players
      .map((p) => {
        const deltas = eloHistoryAll[p].map((pt) => pt.delta);
        const mean = deltas.reduce((s, d) => s + d, 0) / deltas.length;
        const stdDev = Math.sqrt(
          deltas.reduce((s, d) => s + Math.pow(d - mean, 2), 0) / deltas.length,
        );
        return { name: p, stdDev, matches: deltas.length, avgDelta: mean };
      })
      .sort((a, b) => a.stdDev - b.stdDev);
    const maxStd = rows[rows.length - 1]?.stdDev || 1;
    return `<div class="ana-card" style="padding:10px 12px">
      <div style="font-size:9px;color:var(--muted);margin-bottom:10px">Lower deviation = more consistent ELO swings per match.</div>
      ${rows
        .map((r, i) => {
          const barW = Math.max(5, (r.stdDev / maxStd) * 100).toFixed(0);
          const label =
            r.stdDev < 10
              ? "🪨 Rock"
              : r.stdDev < 14
                ? "✅ Steady"
                : r.stdDev < 18
                  ? "⚡ Variable"
                  : "🎲 Volatile";
          const avgStr =
            r.avgDelta > 0
              ? `+${r.avgDelta.toFixed(1)}`
              : r.avgDelta.toFixed(1);
          const avgCol =
            r.avgDelta > 0
              ? "var(--green)"
              : r.avgDelta < 0
                ? "var(--red)"
                : "var(--muted)";
          return `<div class="elo-row">
          <div class="elo-rank">#${i + 1}</div>
          <div class="elo-name">${r.name}</div>
          <div class="elo-bar-wrap"><div class="elo-bar" style="width:${barW}%;background:var(--theme);opacity:0.7"></div></div>
          <div style="font-size:9px;color:var(--muted);min-width:26px;text-align:right">±${r.stdDev.toFixed(0)}</div>
          <div style="font-size:9px;min-width:30px;text-align:right;color:${avgCol}">${avgStr}</div>
          <div style="font-size:8px;color:var(--muted);min-width:56px;text-align:right">${label}</div>
        </div>`;
        })
        .join("")}
    </div>`;
  })();

  // ── PAIR CHEMISTRY MATRIX ──────────────────────────────
  const pairMatrixPlayers = [
    ...new Set(getPairStats(activeMatches()).flatMap((p) => p.players)),
  ].sort();
  const pairMatrixHtml = (() => {
    if (pairMatrixPlayers.length < 2)
      return '<div class="sub" style="padding:8px">Need more pair data.</div>';
    const pairLookup = {};
    getPairStats(activeMatches()).forEach((p) => {
      pairLookup[p.key] = p;
    });
    const colHeaders = pairMatrixPlayers
      .map((p) => `<th class="pvp-th" title="${p}">${getMatrixAlias(p)}</th>`)
      .join("");
    const rows = pairMatrixPlayers
      .map((rowP) => {
        const cells = pairMatrixPlayers
          .map((colP) => {
            if (rowP === colP) return `<td class="pvp-td pvp-self">·</td>`;
            const key = [rowP, colP].sort().join(" & ");
            const pair = pairLookup[key];
            if (!pair || pair.played < 2)
              return `<td class="pvp-td pvp-none">—</td>`;
            const pct = pair.winPct;
            const cls =
              pct > 60 ? "pvp-win" : pct < 40 ? "pvp-loss" : "pvp-even";
            return `<td class="pvp-td ${cls}" title="${getMatrixAlias(rowP)} & ${getMatrixAlias(colP)}: ${pair.wins}W–${pair.played - pair.wins}L">${pct}%</td>`;
          })
          .join("");
        return `<tr><td class="pvp-row-hdr" title="${rowP}">${getMatrixAlias(rowP)}</td>${cells}</tr>`;
      })
      .join("");
    return `<div class="ana-card" style="padding:10px 8px"><div style="font-size:9px;color:var(--muted);margin-bottom:8px">Win % as partners. — = fewer than 2 games together.</div><div class="pvp-wrap"><div class="pvp-scroll-wrap"><table class="pvp-table"><thead><tr><th class="pvp-corner"></th>${colHeaders}</tr></thead><tbody>${rows}</tbody></table></div></div></div>`;
  })();

  // ── MONTHLY AWARDS ─────────────────────────────────────
  const nowDate = new Date();
  const curMonth = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, "0")}`;
  const _am14 = activeMatches();
  const monthlyMatchList = _am14.filter((m) =>
    (m.date || "").startsWith(curMonth),
  );
  const monthlyAwardsHtml = (() => {
    if (monthlyMatchList.length < 2)
      return '<div class="sub" style="padding:8px">Not enough matches this month.</div>';
    const moEloNow = computeElo(_am14);
    const moEloPre = computeElo(
      _am14.filter((m) => !(m.date || "").startsWith(curMonth)),
    );
    const moStats = computeStats(monthlyMatchList);
    // Most Improved
    const moGains = moStats
      .map((p) => ({
        name: p.name,
        gain: (moEloNow[p.name] || 1000) - (moEloPre[p.name] || 1000),
      }))
      .sort((a, b) => b.gain - a.gain);
    const mostImproved = moGains[0];
    // Best Duo of Month
    const moPairs = getPairStats(monthlyMatchList)
      .filter((p) => p.played >= 2)
      .sort((a, b) => b.winPct - a.winPct);
    const bestDuoMonth = moPairs[0];
    // Most Consistent: lowest std dev of per-match game%
    const moConsistency = moStats
      .filter((p) => p.mp >= 3)
      .map((p) => {
        const playerMatches = monthlyMatchList.filter((m) =>
          [...(m.teamA || []), ...(m.teamB || [])].includes(p.name),
        );
        const gamePcts = playerMatches.map((m) => {
          const inA = (m.teamA || []).includes(p.name);
          const gw = inA ? m.scoreA : m.scoreB;
          const gl = inA ? m.scoreB : m.scoreA;
          return gw + gl > 0 ? gw / (gw + gl) : 0.5;
        });
        const mean = gamePcts.reduce((s, v) => s + v, 0) / gamePcts.length;
        const sd = Math.sqrt(
          gamePcts.reduce((s, v) => s + Math.pow(v - mean, 2), 0) /
            gamePcts.length,
        );
        return { name: p.name, sd };
      })
      .sort((a, b) => a.sd - b.sd);
    const mostConsistent = moConsistency[0];
    // Most Feared: highest win% with ≥3 matches
    const mostFeared = moStats
      .filter((p) => p.mp >= 3)
      .sort((a, b) => b.winPct - a.winPct)[0];
    // Most Active
    const mostActiveMo = moStats.sort((a, b) => b.mp - a.mp)[0];
    return `<div class="awards-grid">${scard("📈", "Most Improved", mostImproved?.name, mostImproved ? `+${mostImproved.gain} ELO this month` : "—")}${scard("🤝", "Best Duo", bestDuoMonth ? bestDuoMonth.key : null, bestDuoMonth ? `${bestDuoMonth.winPct}% · ${bestDuoMonth.played}g` : "Need ≥2 games")}${scard("🎯", "Most Consistent", mostConsistent?.name, mostConsistent ? `${(mostConsistent.sd * 100).toFixed(1)}% std dev` : "Need ≥3 matches")}${scard("👹", "Most Feared", mostFeared?.name, mostFeared ? `${mostFeared.winPct.toFixed(0)}% win rate` : "Need ≥3 matches")}${scard("🔁", "Most Active", mostActiveMo?.name, mostActiveMo ? `${mostActiveMo.mp} matches this month` : "—")}</div>`;
  })();

  // ── PERSONAL BESTS ─────────────────────────────────────
  const personalBestsHtml = (() => {
    const pbStats = computeStats(activeMatches()).filter((p) => p.mp >= 3);
    if (!pbStats.length)
      return '<div class="sub" style="padding:8px">Not enough data.</div>';
    const rows = pbStats.map((p) => {
      const playerMs = sortedM.filter((m) =>
        [...(m.teamA || []), ...(m.teamB || [])].includes(p.name),
      );
      // Longest win streak ever = bestWinStreak from computeStats
      const longestWS = p.bestWinStreak;
      // Biggest win margin
      let biggestMargin = 0,
        biggestScore = "";
      playerMs.forEach((m) => {
        const inA = (m.teamA || []).includes(p.name);
        const own = inA ? m.scoreA : m.scoreB;
        const opp = inA ? m.scoreB : m.scoreA;
        if (own > opp && own - opp > biggestMargin) {
          biggestMargin = own - opp;
          biggestScore = `${own}-${opp}`;
        }
      });
      // Best session performance (most wins in one day)
      const byDate = {};
      playerMs.forEach((m) => {
        if (!m.date) return;
        if (!byDate[m.date]) byDate[m.date] = { wins: 0, played: 0 };
        byDate[m.date].played++;
        const inA = (m.teamA || []).includes(p.name);
        if ((inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA))
          byDate[m.date].wins++;
      });
      const bestDay = Object.values(byDate).sort(
        (a, b) => b.wins - a.wins || b.played - a.played,
      )[0];
      const mostMatchesDay = Object.entries(byDate).sort(
        (a, b) => b[1].played - a[1].played,
      )[0];
      let mostDayStr = "—";
      if (mostMatchesDay) {
        const [mdDate, mdData] = mostMatchesDay;
        const totalOnDay = sortedM.filter((m) => m.date === mdDate).length;
        mostDayStr = `${mdData.played}/${totalOnDay}`;
      }
      return `<div class="pb-row"><div class="pb-name">${p.name}</div><div class="pb-stat" title="Longest win streak">🔥${longestWS}W</div><div class="pb-stat" title="Biggest win">${biggestScore ? `💥${biggestScore}` : "—"}</div><div class="pb-stat" title="Best day wins">⭐${bestDay ? `${bestDay.wins}W/${bestDay.played}` : "—"}</div><div class="pb-stat" title="Most matches in a day">📅${mostDayStr}</div></div>`;
    });
    return `<div class="ana-card" style="padding:10px 12px"><div class="pb-header"><div class="pb-name">Player</div><div class="pb-stat">Best Streak</div><div class="pb-stat">Best Win</div><div class="pb-stat">Best Day</div><div class="pb-stat">Most/Day</div></div>${rows.join("")}</div>`;
  })();

  // ── SCORE PREDICTION ACCURACY ─────────────────────────
  const predAccHtml = (() => {
    if (allMatches.length < 5)
      return '<div class="sub" style="padding:8px">Need more matches.</div>';
    const sorted2 = [...allMatches].sort((a, b) =>
      (a.date || "").localeCompare(b.date || ""),
    );
    const runElo = {};
    let correct = 0,
      total = 0,
      upsets = 0;
    const byMonth = {};
    sorted2.forEach((m) => {
      const allP = [...(m.teamA || []), ...(m.teamB || [])];
      allP.forEach((p) => {
        if (!(p in runElo)) runElo[p] = 1000;
      });
      const avgA =
        m.teamA.reduce((s, p) => s + runElo[p], 0) /
        Math.max(m.teamA.length, 1);
      const avgB =
        m.teamB.reduce((s, p) => s + runElo[p], 0) /
        Math.max(m.teamB.length, 1);
      const aFav = avgA >= avgB;
      const aWon = m.scoreA > m.scoreB;
      const predicted = aFav ? aWon : !aWon;
      if (predicted) correct++;
      else upsets++;
      total++;
      const mo = (m.date || "").slice(0, 7);
      if (mo) {
        if (!byMonth[mo]) byMonth[mo] = { c: 0, t: 0 };
        byMonth[mo].t++;
        if (predicted) byMonth[mo].c++;
      }
      const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
      const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
      const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
      m.teamA.forEach((p) => {
        runElo[p] = (runElo[p] || 1000) + dA;
      });
      m.teamB.forEach((p) => {
        runElo[p] = (runElo[p] || 1000) + dB;
      });
    });
    const pct = Math.round((correct / total) * 100);
    const label =
      pct >= 70 ? "PREDICTABLE" : pct >= 55 ? "MODERATE" : "CHAOTIC";
    const col =
      pct >= 70 ? "var(--green)" : pct >= 55 ? "var(--gold)" : "var(--red)";
    const moHtml = Object.entries(byMonth)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 6)
      .map(([mo, d]) => {
        const mp = Math.round((d.c / d.t) * 100);
        const mc =
          mp >= 70 ? "var(--green)" : mp >= 55 ? "var(--gold)" : "var(--red)";
        const moName = [
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
        ][parseInt(mo.slice(5)) - 1];
        return `<div class="pred-mo-row"><span class="pred-mo-lbl">${moName} ${mo.slice(0, 4)}</span><div class="pred-mo-bar-wrap"><div class="pred-mo-bar" style="width:${mp}%;background:${mc}"></div></div><span class="pred-mo-pct" style="color:${mc}">${mp}%</span></div>`;
      })
      .join("");
    return `<div class="ana-card" style="padding:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div>
          <div style="font-size:28px;font-weight:900;color:${col};line-height:1">${pct}%</div>
          <div style="font-size:9px;color:var(--muted);margin-top:3px;letter-spacing:0.08em">${label}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:var(--text);font-weight:700">${correct}/${total} predicted correctly</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">${upsets} upsets occurred</div>
        </div>
      </div>
      <div style="height:6px;border-radius:4px;background:rgba(255,255,255,0.07);margin-bottom:14px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${col};border-radius:4px;transition:width 0.6s ease"></div>
      </div>
      <div style="font-size:9px;font-weight:700;color:var(--muted);letter-spacing:0.08em;margin-bottom:8px">BY MONTH</div>
      ${moHtml}
    </div>`;
  })();

  // ── MATCH SIMULATOR ────────────────────────────────────
  const simulatorHtml = `
    <div class="ana-card sim-card">
      <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;margin-bottom:10px">
        <div>
          <div class="sim-team-label" style="color:var(--green);font-size:9px;font-weight:700;margin-bottom:4px">TEAM A</div>
          <button class="h2h-slot-btn${_simA1 ? " h2h-slot-filled" : ""}" id="sim-slot-a1" onclick="openSimSheet('a1')" style="width:100%;margin-bottom:6px">
            <span style="font-size:9px;color:var(--muted);display:block">P1</span>
            <span id="sim-label-a1" style="font-size:11px;font-weight:800">${_simA1 || "—"}</span>
          </button>
          <button class="h2h-slot-btn${_simA2 ? " h2h-slot-filled" : ""}" id="sim-slot-a2" onclick="openSimSheet('a2')" style="width:100%">
            <span style="font-size:9px;color:var(--muted);display:block">P2</span>
            <span id="sim-label-a2" style="font-size:11px;font-weight:800">${_simA2 || "—"}</span>
          </button>
        </div>
        <div class="sim-vs">VS</div>
        <div>
          <div class="sim-team-label" style="color:var(--red);font-size:9px;font-weight:700;margin-bottom:4px">TEAM B</div>
          <button class="h2h-slot-btn${_simB1 ? " h2h-slot-filled" : ""}" id="sim-slot-b1" onclick="openSimSheet('b1')" style="width:100%;margin-bottom:6px">
            <span style="font-size:9px;color:var(--muted);display:block">P1</span>
            <span id="sim-label-b1" style="font-size:11px;font-weight:800">${_simB1 || "—"}</span>
          </button>
          <button class="h2h-slot-btn${_simB2 ? " h2h-slot-filled" : ""}" id="sim-slot-b2" onclick="openSimSheet('b2')" style="width:100%">
            <span style="font-size:9px;color:var(--muted);display:block">P2</span>
            <span id="sim-label-b2" style="font-size:11px;font-weight:800">${_simB2 || "—"}</span>
          </button>
        </div>
      </div>
      <button class="sim-btn" onclick="runMatchSimulator()">SIMULATE</button>
      <div id="sim-result"></div>
    </div>`;

  // ── DAY-OF-WEEK ANALYSIS ───────────────────────────────
  const dowHtml = (() => {
    const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = Array(7).fill(0),
      wins = Array(7).fill(0);
    sortedM.forEach((m) => {
      if (!m.date) return;
      const d = new Date(m.date + "T00:00:00").getDay();
      counts[d]++;
      const aWon = m.scoreA > m.scoreB;
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {}); // just count matches
      counts[d]; // already counted
    });
    // Count actual matches per day
    const dayCounts = Array(7).fill(0);
    sortedM.forEach((m) => {
      if (!m.date) return;
      dayCounts[new Date(m.date + "T00:00:00").getDay()]++;
    });
    const maxCount = Math.max(...dayCounts, 1);
    const totalMatches = dayCounts.reduce((s, c) => s + c, 0) || 1;
    const topDay = dayCounts.indexOf(Math.max(...dayCounts));
    const rows = dayCounts
      .map((cnt, d) => {
        const pct = Math.round((cnt / maxCount) * 100);
        const share = Math.round((cnt / totalMatches) * 100);
        const isTop = d === topDay && cnt > 0;
        return `<div class="dow-row${isTop ? " dow-top" : ""}">
        <span class="dow-day">${DAY_NAMES[d]}</span>
        <div class="dow-bar-wrap"><div class="dow-bar" style="width:${pct}%;background:${isTop ? "var(--accent)" : "rgba(var(--theme-rgb),0.5)"}"></div></div>
        <span class="dow-count">${cnt} <span style="color:var(--muted);font-size:9px">(${share}%)</span></span>
      </div>`;
      })
      .join("");
    return `<div class="ana-card" style="padding:12px">
      <div style="font-size:10px;color:var(--muted);margin-bottom:10px">Most active day: <strong style="color:var(--accent)">${DAY_NAMES[topDay]}</strong> (${dayCounts[topDay]} matches)</div>
      <div class="dow-table">${rows}</div>
    </div>`;
  })();

  // ── CARRY FACTOR ───────────────────────────────────────
  const carryHtml = (() => {
    const eloMapFull = _memoElo();
    const playerList = computeStats(activeMatches()).map((p) => p.name);
    if (playerList.length < 2)
      return '<div class="sub" style="padding:10px 8px">Not enough data.</div>';
    const rows = playerList
      .map((name) => {
        const withP = {},
          withoutP = {};
        sortedM.forEach((m) => {
          const aWon = m.scoreA > m.scoreB;
          const inA = (m.teamA || []).includes(name);
          const inB = (m.teamB || []).includes(name);
          if (!inA && !inB) {
            // Match without the player — tally for opponents
            [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
              if (!withoutP[p]) withoutP[p] = { w: 0, p: 0 };
              withoutP[p].p++;
              const pInA = (m.teamA || []).includes(p);
              if ((pInA && aWon) || (!pInA && !aWon)) withoutP[p].w++;
            });
          } else {
            const myTeam = inA ? m.teamA : m.teamB;
            const myWon = (inA && aWon) || (inB && !aWon);
            myTeam
              .filter((p) => p !== name)
              .forEach((p) => {
                if (!withP[p]) withP[p] = { w: 0, p: 0 };
                withP[p].p++;
                if (myWon) withP[p].w++;
              });
          }
        });
        const pmates = Object.keys(withP).filter((p) => withP[p].p >= 2);
        if (!pmates.length) return null;
        const avgWithMe =
          pmates.reduce((s, p) => s + withP[p].w / withP[p].p, 0) /
          pmates.length;
        const avgWithout =
          pmates.reduce((s, p) => {
            const wo = withoutP[p];
            return s + (wo ? wo.w / wo.p : 0.5);
          }, 0) / pmates.length;
        const delta = Math.round((avgWithMe - avgWithout) * 100);
        const partnerList = pmates
          .map((p) => {
            const wp = withP[p];
            const wo = withoutP[p];
            const wPct = Math.round((wp.w / wp.p) * 100);
            const woPct = wo && wo.p ? Math.round((wo.w / wo.p) * 100) : 50;
            return { p, wPct, woPct, diff: wPct - woPct, played: wp.p };
          })
          .sort((a, b) => b.diff - a.diff);
        return {
          name,
          delta,
          avgWithMe: Math.round(avgWithMe * 100),
          avgWithout: Math.round(avgWithout * 100),
          partnerList,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.delta - a.delta);
    if (!rows.length)
      return '<div class="sub" style="padding:10px 8px">Not enough data.</div>';
    return `<div class="ana-card" style="padding:12px">
      <div style="font-size:9px;color:var(--muted);margin-bottom:10px">
        <strong style="color:var(--fg)">Carry Factor</strong> measures how much a player improves their teammates' win rate.<br>
        <span style="opacity:0.75">e.g. +15% means partners win 15% more matches when paired with this player than without them.</span><br>
        <span style="opacity:0.6">Requires 2+ games per partner pairing. Tap a row to see the breakdown.</span>
      </div>
      ${rows
        .map((r) => {
          const col = r.delta >= 0 ? "var(--green)" : "var(--red)";
          const sign = r.delta >= 0 ? "+" : "";
          const bkd = r.partnerList || [];
          const bkdHtml = bkd.length
            ? bkd
                .map((b) => {
                  const dc = b.diff >= 0 ? "var(--green)" : "var(--red)";
                  const ds = b.diff >= 0 ? "+" : "";
                  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:10px">
            <span style="color:var(--muted)">${b.p}</span>
            <span style="color:${dc};font-weight:700">${b.wPct}% with (${ds}${b.diff}%)</span>
            <span style="color:var(--muted);font-size:9px">${b.played}g</span>
          </div>`;
                })
                .join("")
            : "";
          return `<div class="carry-row" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'" style="cursor:pointer">
          <span class="carry-name">${r.name}</span>
          <div class="carry-bars">
            <div class="carry-bar-bg"><div class="carry-bar-fill" style="width:${r.avgWithMe}%;background:${col}"></div></div>
          </div>
          <span class="carry-delta" style="color:${col}">${sign}${r.delta}%</span>
        </div>
        <div style="display:none;background:rgba(255,255,255,0.03);border-radius:8px;padding:6px 10px;margin-bottom:4px">${bkdHtml || '<div style="font-size:10px;color:var(--muted)">No partner data</div>'}</div>`;
        })
        .join("")}
    </div>`;
  })();

  // ── CLUTCH TRENDS ──────────────────────────────────────
  const clutchTrendHtml = (() => {
    const MONTHS = [
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
    const playerList = computeStats(activeMatches()).map((p) => p.name);
    const byPlayer = {};
    sortedM.forEach((m) => {
      if (!m.date || Math.abs(m.scoreA - m.scoreB) > 1) return;
      const yrmo = m.date.slice(0, 7);
      const aWon = m.scoreA > m.scoreB;
      const process = (players, won) => {
        players.forEach((p) => {
          if (!byPlayer[p]) byPlayer[p] = {};
          if (!byPlayer[p][yrmo]) byPlayer[p][yrmo] = { w: 0, p: 0 };
          byPlayer[p][yrmo].p++;
          if (won) byPlayer[p][yrmo].w++;
        });
      };
      process(m.teamA || [], aWon);
      process(m.teamB || [], !aWon);
    });
    const allMonths = [
      ...new Set(sortedM.filter((m) => m.date).map((m) => m.date.slice(0, 7))),
    ]
      .sort()
      .slice(-6);
    if (!allMonths.length)
      return '<div class="sub" style="padding:10px 8px">Not enough data.</div>';
    const topPlayers = playerList.filter(
      (p) => byPlayer[p] && Object.values(byPlayer[p]).some((d) => d.p >= 1),
    ).sort((a, b) => a.localeCompare(b));
    if (!topPlayers.length)
      return '<div class="sub" style="padding:10px 8px">Not enough clutch matches.</div>';
    // Enhancement 20: unified clutch summary table
    const clutchSummary = (() => {
      const totals = {};
      sortedM.forEach((m) => {
        if (Math.abs(m.scoreA - m.scoreB) > 1) return;
        const aWon20 = m.scoreA > m.scoreB;
        const process20 = (players, won) => players.forEach((p) => {
          if (!totals[p]) totals[p] = { w: 0, p: 0 };
          totals[p].p++;
          if (won) totals[p].w++;
        });
        process20(m.teamA || [], aWon20);
        process20(m.teamB || [], !aWon20);
      });
      const summaryRows = Object.entries(totals)
        .filter(([, d]) => d.p >= 2)
        .sort((a, b) => (b[1].w / b[1].p) - (a[1].w / a[1].p))
        .map(([p, d]) => {
          const pct = Math.round(d.w / d.p * 100);
          const col = pct >= 60 ? "var(--green)" : pct <= 40 ? "var(--red)" : "var(--gold)";
          const rating = pct >= 60 ? "CLUTCH" : pct <= 40 ? "CHOKER" : "STEADY";
          return `<tr><td style="font-size:11px;font-weight:700;padding:5px 0;color:${playerColor(p)}">${p}</td><td style="text-align:center;font-size:10px;color:var(--muted)">${d.w}W–${d.p-d.w}L</td><td style="text-align:center;font-size:11px;font-weight:800;color:${col}">${pct}%</td><td style="text-align:center;font-size:9px;font-weight:700;color:${col}">${rating}</td></tr>`;
        }).join("");
      if (!summaryRows) return "";
      return `<div class="ana-card" style="padding:10px 12px;margin-bottom:8px">
        <div style="font-size:9px;font-weight:700;color:var(--muted);letter-spacing:0.08em;margin-bottom:8px">CLUTCH RANKING — ALL TIME (close matches, margin ≤1)</div>
        <table style="width:100%;border-collapse:collapse"><thead><tr>
          <th style="text-align:left;font-size:9px;color:var(--muted);padding-bottom:4px">Player</th>
          <th style="text-align:center;font-size:9px;color:var(--muted)">Played</th>
          <th style="text-align:center;font-size:9px;color:var(--muted)">Win%</th>
          <th style="text-align:center;font-size:9px;color:var(--muted)">Rating</th>
        </tr></thead><tbody>${summaryRows}</tbody></table>
      </div>`;
    })();

    return clutchSummary + `<div class="ana-card" style="padding:12px;overflow-x:auto">
      <div style="font-size:9px;color:var(--muted);margin-bottom:8px">Win% in close matches (margin ≤1) per month</div>
      <table style="width:100%;border-collapse:collapse;font-size:10px">
        <tr><th style="text-align:left;color:var(--muted);font-weight:600;padding-bottom:6px">Player</th>${allMonths.map((m) => `<th style="color:var(--muted);font-weight:600;padding:0 4px 6px;text-align:center">${MONTHS[parseInt(m.slice(5)) - 1]}</th>`).join("")}</tr>
        ${topPlayers
          .map((p) => {
            const pCol = playerColor(p);
            const cells = allMonths
              .map((mo) => {
                const d = byPlayer[p]?.[mo];
                if (!d || !d.p)
                  return `<td style="text-align:center;color:var(--muted)">—</td>`;
                const pct = Math.round((d.w / d.p) * 100);
                const col =
                  pct >= 60
                    ? "var(--green)"
                    : pct >= 40
                      ? "var(--gold)"
                      : "var(--red)";
                return `<td style="text-align:center;color:${col};font-weight:700">${pct}%</td>`;
              })
              .join("");
            return `<tr><td style="padding:4px 0;color:${pCol};font-weight:700">${p}</td>${cells}</tr>`;
          })
          .join("")}
      </table>
    </div>`;
  })();

  // ── WHAT-IF SIMULATOR ──────────────────────────────────
  const whatIfHtml = (() => {
    return `<div class="ana-card" style="padding:12px">
      <div style="font-size:10px;color:var(--muted);margin-bottom:10px">Select a player — flip individual losses to wins, exclude matches, and see the counterfactual ELO</div>
      <button class="filter-fab-btn" id="whatif-player-fab" onclick="openWhatIfPlayerSheet()" style="margin-bottom:10px"><span class="whatif-fab-label">SELECT PLAYER</span></button>
      <div id="whatif-controls" style="display:none;margin-bottom:8px;gap:6px;flex-wrap:wrap">
        <button class="whatif-action-btn" onclick="whatIfFlipAllLosses()">↩ Flip All Losses</button>
        <button class="whatif-action-btn" onclick="whatIfReset()">↺ Reset All</button>
      </div>
      <div id="whatif-matches"></div>
      <div id="whatif-result"></div>
    </div>`;
  })();

  // ── MILESTONE HISTORY ──────────────────────────────────
  // ── DIGEST CARD ────────────────────────────────────────
  _digestFilter = "week";
  _digestPlayer = "";
  _eloProbP1 = "";
  _eloProbP2 = "";
  const digestHtml = `<div style="background:linear-gradient(160deg,rgba(13,13,26,0.95),rgba(17,17,31,0.95));border-radius:16px;border:1px solid rgba(255,255,255,0.07);padding:14px 14px 10px;position:relative;overflow:hidden">
    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--theme),transparent)"></div>
    <div style="font-size:10px;font-weight:800;color:var(--theme);letter-spacing:0.14em;margin-bottom:8px">DIGEST</div>
    <div style="display:flex;gap:5px;margin-bottom:10px;flex-wrap:wrap">
      <button class="digest-filter-btn active" data-f="week" onclick="renderDigestCard('week')">This Week</button>
      <button class="digest-filter-btn" data-f="lastweek" onclick="renderDigestCard('lastweek')">Last Week</button>
      <button class="digest-filter-btn" data-f="month" onclick="renderDigestCard('month')">This Month</button>
      <button class="digest-filter-btn" data-f="all" onclick="renderDigestCard('all')">All Time</button>
    </div>
    <button class="filter-fab-btn" id="digest-player-btn" onclick="openDigestPlayerSheet()" style="margin-bottom:10px"><span id="digest-player-label">ALL PLAYERS</span></button>
    <div id="digest-content">${_buildDigestContent("week", "")}</div>
  </div>`;

  const milestoneLog = getMilestoneLog();
  const milestoneHtml = (() => {
    if (!milestoneLog.length)
      return '<div class="sub" style="padding:10px 8px">No milestones recorded yet.</div>';
    const rows = milestoneLog
      .map(
        (entry) =>
          `<div class="mlog-row">
        <span class="mlog-icon">${entry.emoji}</span>
        <span class="mlog-msg">${entry.msg}</span>
        <span class="mlog-date">${fmtDate(entry.date)}</span>
      </div>`,
      )
      .join("");
    return `<div class="ana-card mlog-card">${rows}</div>`;
  })();

  // ── NEW SECTIONS DATA ──────────────────────────────────

  // 1a: Player Stats Table
  const _playerStatsTableHtml = (() => {
    if (!compList.length) return '<div class="sub" style="padding:8px">No data.</div>';
    const pg = "grid-template-columns:1fr 44px 60px 54px 60px";
    return `<div class="ana-card" style="padding:8px 12px"><div class="lrace-header" style="${pg}"><span>Player</span><span>Avg G</span><span>Shutout%</span><span>Partners</span><span>Avg Margin</span></div>` +
      compList.filter((p) => p.mp >= 1).map((p) => {
        const avgG = (p.ngw / p.mp).toFixed(1);
        const shutRate = stats[p.name]?.wins > 0
          ? Math.round(((shutoutWins[p.name] || 0) / stats[p.name].wins) * 100) + "%"
          : "—";
        const partDiv = Object.keys(stats[p.name]?.teammates || {}).length;
        const avgM = p.avgMargin != null ? (p.avgMargin >= 0 ? "+" : "") + p.avgMargin.toFixed(1) : "—";
        const mc = p.avgMargin > 0 ? "var(--green)" : p.avgMargin < 0 ? "var(--red)" : "var(--muted)";
        return `<div class="lrace-row" style="${pg}"><div class="lrace-name">${p.name}</div><div style="text-align:center;font-weight:700">${avgG}</div><div style="text-align:center;font-weight:700">${shutRate}</div><div style="text-align:center;font-weight:700">${partDiv}</div><div style="text-align:center;font-weight:700;color:${mc}">${avgM}</div></div>`;
      }).join("") + `</div>`;
  })();

  // 1b: Pair Leaderboard Top 10 with streak + against quality
  const _pairLeaderboardHtml = (() => {
    const pairAQ = {}, pairStrk = {};
    sortedM.forEach((m) => {
      if (m.teamA.length !== 2 || m.teamB.length !== 2) return;
      const tkA = [...m.teamA].sort().join(" & "), tkB = [...m.teamB].sort().join(" & ");
      [tkA, tkB].forEach((tk, ti) => {
        const opp = ti === 0 ? m.teamB : m.teamA;
        if (!pairAQ[tk]) pairAQ[tk] = { t: 0, c: 0 };
        pairAQ[tk].t += opp.reduce((s, p) => s + (eloMap[p] || 1000), 0) / opp.length;
        pairAQ[tk].c++;
      });
    });
    Object.entries(partnerships).forEach(([key, pd]) => {
      const pms = sortedM.filter((m) => {
        if (m.teamA.length !== 2 || m.teamB.length !== 2) return false;
        const ak = [...m.teamA].sort().join(" & "), bk = [...m.teamB].sort().join(" & ");
        return ak === key || bk === key;
      });
      let sk = 0, st = null;
      for (let i = pms.length - 1; i >= 0; i--) {
        const m = pms[i];
        const ak = [...m.teamA].sort().join(" & ");
        const won = ak === key ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
        if (st === null) { st = won ? "W" : "L"; sk = 1; }
        else if ((won && st === "W") || (!won && st === "L")) sk++;
        else break;
      }
      pairStrk[key] = { sk, st };
    });
    const top10 = Object.entries(partnerships)
      .filter(([, pd]) => pd.played >= 2)
      .sort((a, b) => b[1].wins / b[1].played - a[1].wins / a[1].played || b[1].played - a[1].played)
      .slice(0, 10);
    if (!top10.length) return '<div class="sub" style="padding:8px">Need 2+ games per pair.</div>';
    const pg2 = "grid-template-columns:1fr 44px 52px 54px 54px";
    return `<div class="ana-card" style="padding:8px 12px"><div class="lrace-header" style="${pg2}"><span>Pair</span><span>Played</span><span>Win%</span><span>vs ELO</span><span>Streak</span></div>` +
      top10.map(([key, pd], i) => {
        const pct = Math.round(pd.wins / pd.played * 100);
        const col = pct >= 60 ? "var(--green)" : pct <= 40 ? "var(--red)" : "var(--muted)";
        const aq = pairAQ[key] ? Math.round(pairAQ[key].t / pairAQ[key].c) : "—";
        const s = pairStrk[key];
        const sStr = s?.sk >= 1 ? `${s.sk}${s.st}` : "—";
        const sCol = s?.st === "W" ? "var(--green)" : s?.st === "L" ? "var(--red)" : "var(--muted)";
        const shortKey = pd.players.map((p) => p.split(" ")[0]).join(" & ");
        return `<div class="lrace-row" style="${pg2}"><div class="lrace-name" style="font-size:10px">#${i + 1} ${shortKey}</div><div style="text-align:center;font-weight:700">${pd.played}</div><div style="text-align:center;font-weight:700;color:${col}">${pct}%</div><div style="text-align:center;font-weight:700;font-size:10px">${aq}</div><div style="text-align:center;font-weight:700;color:${sCol}">${sStr}</div></div>`;
      }).join("") + `</div>`;
  })();

  // 1c: Monthly Stats Table
  const _monthlyStatsTableHtml = (() => {
    if (!uniqueMonths.length) return '<div class="sub" style="padding:8px">No monthly data yet.</div>';
    const moN2 = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const lastMos = uniqueMonths.slice(-6);
    const potmMap = {};
    lastMos.forEach((mo) => {
      const allEntries = Object.entries(monthlyStats[mo] || {});
      const maxM = Math.max(...allEntries.map(([, d]) => d.m), 0);
      const threshold = Math.max(1, Math.round(maxM * 0.3));
      const ps2 = allEntries.filter(([, d]) => d.m >= threshold);
      if (!ps2.length) return;
      const top = ps2.sort((a, b) => b[1].w / b[1].m - a[1].w / a[1].m)[0];
      if (top) potmMap[mo] = { name: top[0], pct: Math.round(top[1].w / top[1].m * 100), matches: top[1].m };
    });
    const trendArrows = {};
    if (lastMos.length >= 2) {
      playersByMatches.forEach((p) => {
        const [prev, curr] = lastMos.slice(-2).map((mo) => monthlyStats[mo]?.[p]);
        if (prev?.m >= 2 && curr?.m >= 2) {
          const d = curr.w / curr.m - prev.w / prev.m;
          trendArrows[p] = d > 0.1 ? "↑" : d < -0.1 ? "↓" : "→";
        }
      });
    }
    const activePs = playersByMatches.filter((p) => lastMos.some((mo) => monthlyStats[mo]?.[p]?.m > 0));
    if (!activePs.length) return '<div class="sub" style="padding:8px">No data.</div>';
    const potmHtml2 = Object.keys(potmMap).length
      ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">` +
        Object.entries(potmMap).map(([mo, d]) =>
          `<div style="background:rgba(var(--theme-rgb),0.1);border:1px solid rgba(var(--theme-rgb),0.2);border-radius:8px;padding:6px 10px"><div style="font-size:8px;color:var(--gold);font-weight:700;letter-spacing:0.06em">${moN2[parseInt(mo.slice(5))]} POTM</div><div style="font-size:11px;font-weight:800">${d.name.split(" ")[0]}</div><div style="font-size:9px;color:var(--muted)">${d.pct}% · ${d.matches}P</div></div>`
        ).join("") + `</div>`
      : "";
    const hdrs = lastMos.map((mo) => `<th style="text-align:center;color:var(--muted);font-weight:600;font-size:9px;padding:0 4px 6px">${moN2[parseInt(mo.slice(5))]}</th>`).join("");
    const bodyRows2 = activePs.map((p) => {
      const cells2 = lastMos.map((mo) => {
        const d = monthlyStats[mo]?.[p];
        if (!d || !d.m) return `<td style="text-align:center;color:var(--muted);font-size:10px">—</td>`;
        const pct = Math.round(d.w / d.m * 100);
        const col = pct >= 70 ? "var(--green)" : pct >= 40 ? "var(--gold)" : "var(--red)";
        const bg = pct >= 70 ? "rgba(54,212,126,0.12)" : pct >= 40 ? "rgba(241,196,15,0.1)" : "rgba(240,79,79,0.12)";
        return `<td style="text-align:center;font-size:10px;font-weight:700;color:${col};background:${bg};border-radius:4px;padding:2px 3px">${pct}%<br><span style="font-size:8px;color:var(--muted);font-weight:600">${d.w}W–${d.m-d.w}L</span></td>`;
      }).join("");
      const arr = trendArrows[p];
      const arrCol = arr === "↑" ? "var(--green)" : arr === "↓" ? "var(--red)" : "var(--muted)";
      const arrSpan = arr ? `<span style="font-size:10px;color:${arrCol};margin-left:3px">${arr}</span>` : "";
      return `<tr><td style="font-size:11px;font-weight:700;padding:4px 6px 4px 0;white-space:nowrap">${p}${arrSpan}</td>${cells2}</tr>`;
    }).join("");
    return `<div class="ana-card" style="padding:12px;overflow-x:auto">${potmHtml2}<table style="width:100%;border-collapse:collapse;font-size:10px;border-spacing:2px"><thead><tr><th style="text-align:left;color:var(--muted);font-weight:600;font-size:9px;padding-bottom:6px">Player</th>${hdrs}</tr></thead><tbody>${bodyRows2}</tbody></table></div>`;
  })();

  // HIGH LOW ELO table
  const _eloLows = _memoEloLows();
  window._hiLoData = eloRanked.map(([pname, ev]) => {
    const pts5 = (eloHistoryAll[pname] || []).slice(-5);
    const momAvg = pts5.length
      ? Math.round(pts5.reduce((s, p) => s + p.delta, 0) / pts5.length)
      : 0;
    return {
      name: pname,
      current: ev,
      peak: eloPeaks[pname] || ev,
      low: _eloLows[pname] || ev,
      fromPeak: ev - (eloPeaks[pname] || ev),
      fromLow: ev - (_eloLows[pname] || ev),
      pts5,
      momAvg,
    };
  });
  window._hiLoSort = { col: "current", asc: false };

  const _peakEloHtml = (() => {
    if (!eloRanked.length) return '<div class="sub" style="padding:8px">No data.</div>';
    const pg3 = "grid-template-columns:22px 1fr 44px 44px 48px 44px 48px 46px";
    const mkH = (col, label, tip) =>
      `<span class="hilo-hdr" data-col="${col}" onclick="_hiLoSortBy('${col}')" title="${tip}" style="text-align:center;cursor:pointer;user-select:none">${label}</span>`;
    return `<div class="ana-card" style="padding:8px 10px">
      <div class="lrace-header" style="${pg3};font-size:8px">
        <span style="color:var(--muted)">#</span>
        ${mkH('name','PLAYER','Sort by player name')}
        ${mkH('current','NOW','Sort by current ELO')}
        ${mkH('peak','PEAK','Sort by peak ELO')}
        ${mkH('fromPeak','↓PEAK','Sort by distance from peak')}
        ${mkH('low','LOW','Sort by lowest ELO')}
        ${mkH('fromLow','↑LOW','Sort by recovery from low')}
        <span style="text-align:center;color:var(--muted);cursor:default" title="Last 5 form">FORM</span>
      </div>
      <div id="hi-lo-elo-body"></div>
    </div>`;
  })();

  // 2: Per-player Day-of-Week win rate grid
  const _dowPlayerHtml = (() => {
    const DAY2 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const byP = {};
    sortedM.forEach((m) => {
      if (!m.date) return;
      const d = new Date(m.date + "T00:00:00").getDay();
      const aWon2 = m.scoreA > m.scoreB;
      [...m.teamA, ...m.teamB].forEach((p) => {
        if (!byP[p]) byP[p] = Array.from({ length: 7 }, () => ({ w: 0, p: 0 }));
        byP[p][d].p++;
        const inA = (m.teamA || []).includes(p);
        if ((inA && aWon2) || (!inA && !aWon2)) byP[p][d].w++;
      });
    });
    const activeDays = [0,1,2,3,4,5,6].filter((d) => Object.values(byP).some((v) => v[d].p > 0));
    if (!activeDays.length) return '<div class="sub" style="padding:8px">Not enough data.</div>';
    const hdrs2 = activeDays.map((d) => `<th style="text-align:center;color:var(--muted);font-weight:600;font-size:9px;padding:0 4px 6px">${DAY2[d]}</th>`).join("");
    const rows2 = playersByMatches.filter((p) => byP[p]).map((p) => {
      const cells3 = activeDays.map((d) => {
        const dd = byP[p][d];
        if (!dd.p) return `<td style="text-align:center;color:var(--muted);font-size:10px">—</td>`;
        const pct = Math.round(dd.w / dd.p * 100);
        const col = pct >= 60 ? "var(--green)" : pct <= 40 ? "var(--red)" : "var(--gold)";
        return `<td style="text-align:center;font-size:10px;font-weight:700;color:${col}" title="${dd.w}W–${dd.p-dd.w}L">${pct}%</td>`;
      }).join("");
      return `<tr><td style="font-size:11px;font-weight:700;padding:4px 6px 4px 0;white-space:nowrap">${p}</td>${cells3}</tr>`;
    }).join("");
    return `<div class="ana-card" style="padding:12px;overflow-x:auto"><div style="font-size:9px;color:var(--muted);margin-bottom:8px">Win % per player per day of week</div><table style="width:100%;border-collapse:collapse;font-size:10px"><thead><tr><th style="text-align:left;color:var(--muted);font-weight:600;font-size:9px;padding-bottom:6px">Player</th>${hdrs2}</tr></thead><tbody>${rows2}</tbody></table></div>`;
  })();

  // 2: Score Margin Trend (avg margin per month)
  const _scoreMargTrendHtml = (() => {
    if (uniqueMonths.length < 2) return '<div class="sub" style="padding:8px">Need matches across 2+ months.</div>';
    const moMargins = {};
    sortedM.forEach((m) => {
      const mo = (m.date || "").slice(0, 7);
      if (!mo) return;
      if (!moMargins[mo]) moMargins[mo] = { total: 0, count: 0 };
      moMargins[mo].total += Math.abs(m.scoreA - m.scoreB);
      moMargins[mo].count++;
    });
    const moN3 = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const pts = uniqueMonths.map((mo) => ({
      mo,
      avg: moMargins[mo] ? moMargins[mo].total / moMargins[mo].count : null,
    })).filter((p) => p.avg !== null);
    if (pts.length < 2) return '<div class="sub" style="padding:8px">Not enough data.</div>';
    const W = 300, H = 90, pl = 30, pr = 8, pt2 = 8, pb = 18, cW = W - pl - pr, cH = H - pt2 - pb;
    const maxA = Math.max(...pts.map((p) => p.avg)) + 0.5;
    const minA = Math.max(0, Math.min(...pts.map((p) => p.avg)) - 0.5);
    const toX2 = (i) => pl + (i / (pts.length - 1 || 1)) * cW;
    const toY2 = (v) => pt2 + (1 - (v - minA) / (maxA - minA || 1)) * cH;
    const polyline2 = pts.map((p, i) => `${toX2(i).toFixed(1)},${toY2(p.avg).toFixed(1)}`).join(" ");
    const xLbls = pts.map((p, i) => `<text x="${toX2(i).toFixed(1)}" y="${H - 3}" text-anchor="middle" font-size="7" fill="rgba(255,255,255,0.35)">${moN3[parseInt(p.mo.slice(5))]}</text>`).join("");
    const circles2 = pts.map((p, i) => `<circle cx="${toX2(i).toFixed(1)}" cy="${toY2(p.avg).toFixed(1)}" r="2.5" fill="var(--theme)"><title>${p.mo}: ${p.avg.toFixed(1)}</title></circle>`).join("");
    const lastAvg = pts[pts.length - 1].avg, prevAvg = pts[pts.length - 2]?.avg;
    const trend = lastAvg < prevAvg - 0.1 ? "getting tighter" : lastAvg > prevAvg + 0.1 ? "more one-sided" : "steady";
    return `<div class="ana-card" style="padding:12px"><div style="font-size:9px;color:var(--muted);margin-bottom:6px">Average score margin per month — ${trend}</div><div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block;overflow:visible"><polyline points="${polyline2}" fill="none" stroke="var(--theme)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${circles2}${xLbls}</svg></div></div>`;
  })();

  // 2: Dominance Index
  const _dominanceHtml = (() => {
    const beatenCounts = {};
    sortedM.forEach((m) => {
      const aWon2 = m.scoreA > m.scoreB;
      const winners = aWon2 ? m.teamA : m.teamB;
      const losers  = aWon2 ? m.teamB : m.teamA;
      winners.forEach((w) => {
        if (!beatenCounts[w]) beatenCounts[w] = {};
        losers.forEach((l) => { beatenCounts[w][l] = (beatenCounts[w][l] || 0) + 1; });
      });
    });
    if (!Object.keys(beatenCounts).length) return '<div class="sub" style="padding:8px">No data.</div>';
    window._domCounts = beatenCounts;
    window._domRebuild = function(minN) {
      const n = Math.max(1, Math.floor(+minN) || 1);
      const pg = "grid-template-columns:40px 1fr 60px";
      const lbl = n === 1 ? "beaten at least once" : `beaten ${n}+ times`;
      const rows = Object.entries(beatenCounts)
        .map(([p, opp]) => ({ name: p, count: Object.values(opp).filter(c => c >= n).length }))
        .filter(r => r.count > 0)
        .sort((a, b) => b.count - a.count);
      const el = document.getElementById("dominance-card");
      if (!el) return;
      el.querySelector(".dom-desc").textContent = `Distinct opponents ${lbl}`;
      el.querySelector(".dom-rows").innerHTML = rows.length
        ? rows.map((r, i) => `<div class="lrace-row" style="${pg}"><div class="lrace-rank">#${i+1}</div><div class="lrace-name">${escHtml(r.name)}</div><div style="text-align:center;font-weight:800;color:var(--theme)">${r.count}</div></div>`).join("")
        : `<div style="font-size:11px;color:var(--muted);padding:8px 0">No player has beaten any opponent ${n}+ times.</div>`;
    };
    const pg4 = "grid-template-columns:40px 1fr 60px";
    const initRows = Object.entries(beatenCounts)
      .map(([p, opp]) => ({ name: p, count: Object.keys(opp).length }))
      .sort((a, b) => b.count - a.count);
    return `<div class="ana-card" style="padding:8px 12px" id="dominance-card">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px">
        <div class="dom-desc" style="font-size:9px;color:var(--muted)">Distinct opponents beaten at least once</div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          <span style="font-size:9px;color:var(--muted);white-space:nowrap">Min wins vs same opp</span>
          <input type="number" inputmode="numeric" pattern="[0-9]*" min="1" max="99" value="1" class="dom-threshold-inp" oninput="window._domRebuild(this.value)">
        </div>
      </div>
      <div class="lrace-header" style="${pg4}"><span>Rank</span><span>Player</span><span>Opp</span></div>
      <div class="dom-rows">${initRows.map((r, i) => `<div class="lrace-row" style="${pg4}"><div class="lrace-rank">#${i+1}</div><div class="lrace-name">${escHtml(r.name)}</div><div style="text-align:center;font-weight:800;color:var(--theme)">${r.count}</div></div>`).join("")}</div>
    </div>`;
  })();

  // 2: Most One-Sided Rivalries
  const _oneSidedHtml = (() => {
    const rivalries = Object.entries(teamMatchups)
      .filter(([, v]) => v.played >= 3)
      .map(([, v]) => {
        const tkA = v.teamA.join(" & "), tkB = v.teamB.join(" & ");
        const wA = v.wins[tkA] || 0, wB = v.wins[tkB] || 0;
        const dom = Math.max(wA, wB), sub = Math.min(wA, wB);
        const domTeam = wA >= wB ? v.teamA : v.teamB;
        const subTeam = wA >= wB ? v.teamB : v.teamA;
        return { domTeam, subTeam, dom, sub, played: v.played };
      })
      .filter((r) => r.dom > r.sub)
      .sort((a, b) => b.dom / b.played - a.dom / a.played || b.dom - a.dom)
      .slice(0, 5);
    if (!rivalries.length) return '<div class="sub" style="padding:8px">Need 3+ meetings between same teams with a clear leader.</div>';
    return `<div class="ana-card" style="padding:10px 12px">` +
      rivalries.map((r) => {
        const domPct = Math.round(r.dom / r.played * 100);
        const short = (t) => t.map((p) => p.split(" ")[0]).join(" & ");
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)"><div><div style="font-size:11px;font-weight:700">${short(r.domTeam)} <span style="color:var(--green)">dominate</span></div><div style="font-size:9px;color:var(--muted);margin-top:2px">vs ${short(r.subTeam)}</div></div><div style="text-align:right"><div style="font-size:16px;font-weight:900;color:var(--green)">${r.dom}–${r.sub}</div><div style="font-size:9px;color:var(--muted)">${r.played}g · ${domPct}%</div></div></div>`;
      }).join("") + `</div>`;
  })();

  // 2: Score Heatmap Grid (winner vs loser score — symmetric pairs merged)
  const _scoreHeatmapHtml = (() => {
    const grid3 = {};
    let maxScore = 6;
    sortedM.forEach((m) => {
      const hi = Math.max(m.scoreA, m.scoreB);
      const lo = Math.min(m.scoreA, m.scoreB);
      if (isNaN(hi) || isNaN(lo) || hi < 0) return;
      const key = `${hi}_${lo}`;
      grid3[key] = (grid3[key] || 0) + 1;
      if (hi > maxScore) maxScore = hi;
    });
    const scores = Array.from({ length: maxScore + 1 }, (_, i) => i);
    const maxG = Math.max(...Object.values(grid3), 1);
    const header = `<tr><th style="font-size:8px;color:var(--muted);padding:0 4px 4px 0">Win↓ Loss→</th>${scores.map((s) => `<th style="font-size:8px;color:var(--muted);font-weight:600;text-align:center;padding:0 4px 4px">${s}</th>`).join("")}</tr>`;
    const bodyRows3 = scores.map((hi) => {
      const cells4 = scores.map((lo) => {
        if (lo > hi) return `<td style="background:transparent;padding:4px 5px"></td>`;
        const cnt = grid3[`${hi}_${lo}`] || 0;
        const bg = cnt === 0 ? "rgba(255,255,255,0.04)" : `rgba(var(--theme-rgb),${Math.max(0.12, cnt / maxG * 0.8).toFixed(2)})`;
        return `<td style="text-align:center;background:${bg};border-radius:3px;padding:4px;font-size:9px;font-weight:700;color:${cnt?'var(--text)':'transparent'}">${cnt || ""}</td>`;
      }).join("");
      return `<tr><td style="font-size:9px;color:var(--muted);font-weight:700;padding:2px 6px 2px 0">${hi}</td>${cells4}</tr>`;
    }).join("");
    return `<div class="ana-card" style="padding:12px;overflow-x:auto"><div style="font-size:9px;color:var(--muted);margin-bottom:8px">Score frequency — win score (row) vs loss score (col). 4-2 and 2-4 counted together.</div><table style="border-collapse:separate;border-spacing:3px"><thead>${header}</thead><tbody>${bodyRows3}</tbody></table></div>`;
  })();

  // ── ABSENCE TRACKER ────────────────────────────────────────
  const _absenceTrackerHtml = (() => {
    if (!sortedM.length) return '<div class="sub" style="padding:12px">No data.</div>';
    const todayStr3 = todayISO();
    const todayD = new Date(todayStr3 + "T00:00:00");
    const firstDate3 = {}, lastDate3 = {};
    sortedM.forEach((m) => {
      [...m.teamA, ...m.teamB].forEach((p) => {
        if (!firstDate3[p] || m.date < firstDate3[p]) firstDate3[p] = m.date;
        if (!lastDate3[p] || m.date > lastDate3[p]) lastDate3[p] = m.date;
      });
    });
    const rows3 = Object.keys(lastDate3)
      .map(p => {
        const days3 = Math.round((todayD - new Date(lastDate3[p] + "T00:00:00")) / 86400000);
        const missed = sortedM.filter(m => m.date > lastDate3[p]).length;
        return { name: p, first: firstDate3[p], last: lastDate3[p], days: days3, missed };
      })
      .sort((a, b) => b.days - a.days);
    const fmtShort = s => s ? fmtDate(s).replace(/ \d{4}$/, '') : '—';
    const rowsHtml3 = rows3.map((r) => {
      const col = r.days === 0 ? "var(--green)" : r.days <= 7 ? "var(--accent)" : r.days <= 30 ? "#ffb340" : "var(--red)";
      const lbl = r.days === 0 ? "Today" : r.days === 1 ? "1 day" : r.days + " days";
      return `<tr class="abt-row">
        <td class="abt-name">${escHtml(r.name)}</td>
        <td class="abt-date">${fmtShort(r.first)}</td>
        <td class="abt-date">${fmtShort(r.last)}</td>
        <td class="abt-days" style="color:${col}">${lbl}</td>
        <td class="abt-matches">${r.missed}</td>
      </tr>`;
    }).join('');
    return `<div class="ana-card" style="padding:0;overflow:hidden"><table class="abt-table"><thead><tr><th>Player</th><th>First</th><th>Last</th><th>Days</th><th>Missed</th></tr></thead><tbody>${rowsHtml3}</tbody></table></div>`;
  })()

  // ── RENDER ─────────────────────────────────────────────
  const favKeys = getAnaFavs();
  const hiddenKeys = getAnaHidden();
  const makeSec = (key, title, body, col, cat) => {
    const isFav = favKeys.includes(key);
    const isHid = hiddenKeys.includes(key);
    return `<div class="ana-sec${col ? " collapsed" : ""}" data-key="${key}" data-cat="${cat || "all"}"${isHid ? ' data-hidden="true"' : ""}>
      <div class="ana-section-title ana-sec-hdr" onclick="toggleAnaSection('${key}')">
        <span class="ana-sec-drag-handle"
          onpointerdown="anaHandlePointerDown(event,'${key}')"
          onclick="event.stopPropagation()">⠿</span>
        <span class="ana-sec-chev"></span>
        <span class="ana-sec-title-txt">${title}</span>
        <button class="ana-hide-btn${isHid ? " active" : ""}"
          onclick="toggleAnaHidden('${key}',event)"
          title="${isHid ? "Unhide" : "Hide"}">${isHid ? "+" : "−"}</button>
        <button class="ana-fav-btn${isFav ? " active" : ""}"
          onclick="toggleAnaFav('${key}',event)"
          title="${isFav ? "Remove from Favourites" : "Add to Favourites"}">★</button>
      </div>
      <div class="ana-sec-body">${body}</div>
    </div>`;
  };

  const allSecs = [
    {
      key: "predacc",
      cat: "records",
      title: "🔮 Prediction Accuracy",
      body: predAccHtml,
    },
    {
      key: "simulator",
      cat: "records",
      title: "🎮 Match Simulator",
      body: simulatorHtml,
    },
    {
      key: "pvp",
      cat: "players",
      title: "⚔️ Player vs Player Matrix",
      body: `<div class="ana-card" style="padding:10px 8px"><div style="font-size:9px;color:var(--muted);margin-bottom:8px">Win % of <strong style="color:var(--accent)">row</strong> vs column. — = never met.</div>${matrixHtml}</div>`,
    },
    {
      key: "awards",
      cat: "records",
      title: "🏅 Awards Board",
      body: `<div class="awards-grid">${scard("🏃", "Most Active", mostActive?.name, `${mostActive?.matches || 0} matches played`)}${awardsHtml}${scard("🏆", "Best Win Rate", topWinRate?.name, `${topWinRate ? Math.round((topWinRate.wins / topWinRate.matches) * 100) : 0}% (${topWinRate?.wins || 0}W–${topWinRate?.losses || 0}L)`)}${scard("🔥", "Longest Streak", topStreak?.name, `${topStreak?.bestStreak || 0} consecutive wins`)}${scard("⚔️", "Most Dominant", destroyer?.name, `+${destroyer?.avgMargin?.toFixed(1) || 0} avg margin`)}</div>`,
    },
    {
      key: "form",
      cat: "players",
      title: "⚡ Current Form",
      body: `<div class="ana-card" style="padding:8px 12px"><div class="ftable-header"><span>#</span><span>Player</span><span>Last 10</span><span>Win%</span><span>Streak</span></div>${ftHtml}</div>`,
    },
    {
      key: "lrace",
      cat: "players",
      title: "🏎️ Leaderboard Race",
      body: `<div class="ana-card" style="padding:8px 12px"><div class="lrace-header"><span>Rank</span><span>Player</span><span>Last Wk.</span><span>Trend</span></div>${lrHtml}</div>`,
    },
    {
      key: "podiumtracker",
      cat: "players",
      title: "🥇 Podium Tracker",
      body: `<div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
          <button class="digest-filter-btn active" onclick="_podiumSetPeriod(this,'today')">DAILY</button>
          <button class="digest-filter-btn" onclick="_podiumSetPeriod(this,'week')">WEEKLY</button>
          <button class="digest-filter-btn" onclick="_podiumSetPeriod(this,'weekend')">WEEKEND</button>
          <button class="digest-filter-btn" onclick="_podiumSetPeriod(this,'month')">MONTHLY</button>
        </div>
        <div class="podium-content">${_buildPodiumTrackerHtml("today")}</div>
      </div>`,
    },
    {
      key: "rankreign",
      cat: "players",
      title: "👑 Rank Reign",
      body: _buildRankReignHtml(),
    },
    {
      key: "ranktimeline",
      cat: "players",
      title: "📅 Rank Timeline",
      body: _buildRankTimelineHtml("today"),
    },
    {
      key: "clutchrank",
      cat: "players",
      title: "🎯 Clutch Rankings",
      body: `<div class="ana-card" style="padding:8px 12px">${clutchRankHtml}${_antiClutchHtml}</div>`,
    },
    {
      key: "consistency",
      cat: "players",
      title: "📐 Consistency Rankings",
      body: `<div class="ana-card" style="padding:8px 12px">${consistencyRankHtml}</div>`,
    },
    {
      key: "qualitywins",
      cat: "players",
      title: "💎 Quality Wins",
      body: `<div class="ana-card" style="padding:8px 12px">${_hardestWinCallout}${qualityRankHtml}</div>`,
    },
    ...(uniqueMonths.length >= 2
      ? [
          {
            key: "winrate",
            cat: "activity",
            title: "📈 Win Rate Over Time",
            body: `<div class="ana-card">${winChartHtml}</div>`,
          },
        ]
      : []),
    {
      key: "score",
      cat: "activity",
      title: "📊 Score Distribution",
      body: `<div class="ana-card">${_sdCallout}${sdHtml}</div>`,
    },
    {
      key: "partnership",
      cat: "pairs",
      title: "🤝 Partnership Analytics",
      body: `<div class="partner-tabs">
        <button class="partner-tab active" onclick="_partnerTab(this,'synergy')">Synergy</button>
        <button class="partner-tab" onclick="_partnerTab(this,'form')">Form</button>
      </div>
      <div id="partner-tab-synergy" class="partner-tab-panel">
        <div style="font-size:10px;font-weight:700;color:var(--muted);margin:6px 0 4px;letter-spacing:0.06em">SYNERGY DELTA (vs solo avg)</div>
        <div class="ana-card" style="padding:10px 12px"><div style="font-size:9px;color:var(--muted);margin-bottom:6px">How much win% changes when paired with each partner</div>${synergyHtml}</div>
      </div>
      <div id="partner-tab-form" class="partner-tab-panel" style="display:none">
        <div style="font-size:10px;font-weight:700;color:var(--muted);margin:6px 0 4px;letter-spacing:0.06em">PAIR RECENT FORM</div>
        <div class="ana-card" style="padding:10px 12px">${pfHtml}</div>
      </div>`,
    },
    {
      key: "rivalry",
      cat: "players",
      title: "🔥 Rivalry Spotlight",
      body: `<div class="ana-card">${rivalHtml}</div>`,
    },
    {
      key: "session",
      cat: "activity",
      title: "📋 Session Stats",
      body: sessHtml,
    },
    {
      key: "dayofweek",
      cat: "activity",
      title: "📅 Day-of-Week Analysis",
      body: dowHtml,
    },
    {
      key: "carryfactor",
      cat: "players",
      title: "🏋️ Carry Factor",
      body: carryHtml,
    },
    {
      key: "clutchtrend",
      cat: "players",
      title: "🎯 Clutch Trends",
      body: clutchTrendHtml,
    },
    {
      key: "whatif",
      cat: "elo",
      title: "🔄 What-If Simulator",
      body: whatIfHtml,
    },
    {
      key: "pairs",
      cat: "pairs",
      title: "🤝 All Pairs",
      body: `<div class="ana-card" style="padding:10px 12px">${allPairsHtml}</div>`,
    },
    {
      key: "pairedh2h",
      cat: "pairs",
      title: "⚔️ Paired H2H Records",
      body: `<div class="ana-card" style="padding:8px 12px">${pairedH2HHtml}</div>`,
    },
    { key: "elo", cat: "elo", title: "⚡ ELO Rankings", body: eloHtml },
    {
      key: "eloTimeline",
      cat: "elo",
      title: "📈 ELO History Chart",
      body: buildEloTimelineHtml("all"),
    },
    {
      key: "eloWinProb",
      cat: "elo",
      title: "🎯 ELO Win Probability",
      body: eloWinProbHtml,
    },
    {
      key: "eloVolatility",
      cat: "elo",
      title: "📊 ELO Volatility / Consistency",
      body: eloVolatilityHtml,
    },
    {
      key: "pairmatrix",
      cat: "pairs",
      title: "🧪 Pair Chemistry Matrix",
      body: pairMatrixHtml,
    },
    {
      key: "monthlyawards",
      cat: "records",
      title: "🏆 Monthly Awards",
      body: monthlyAwardsHtml,
    },
    {
      key: "personalbests",
      cat: "players",
      title: "🏅 Personal Bests",
      body: personalBestsHtml,
    },
    {
      key: "milestones",
      cat: "records",
      title: "🎖️ Milestone History",
      body: milestoneHtml,
    },
    {
      key: "calendar",
      cat: "activity",
      title: "📅 Match Calendar",
      body: `<div id="match-calendar" class="match-calendar"></div>`,
    },
    // ── TODO BATCH: Statistics enhancements ────────────────────
    { key: "playerstats", cat: "players", title: "📊 Player Stats Deep Dive", body: _playerStatsTableHtml },
    { key: "pairleaderboard", cat: "pairs", title: "🏆 Pair Leaderboard Top 10", body: _pairLeaderboardHtml },
    ...(uniqueMonths.length >= 1 ? [{ key: "monthlystats", cat: "activity", title: "📅 Monthly Stats", body: _monthlyStatsTableHtml }] : []),
    { key: "peakelo", cat: "elo", title: "📈 High Low ELO", body: _peakEloHtml },
    { key: "dowplayer", cat: "activity", title: "📆 Day-of-Week Win Rates", body: _dowPlayerHtml },
    { key: "scoremargtrend", cat: "activity", title: "📉 Score Margin Trend", body: _scoreMargTrendHtml },
    { key: "dominance", cat: "players", title: "🦁 Dominance Index", body: _dominanceHtml },
    { key: "scoreheatmap", cat: "activity", title: "🟦 Score Heatmap", body: _scoreHeatmapHtml },
    { key: "absencetracker", cat: "players", title: "👻 Absence Tracker", body: _absenceTrackerHtml },
    // ── NEW PHASE 1-5 SECTIONS ─────────────────────────────────
    {
      key: "powerrankings",
      cat: "players",
      title: "⚡ Power Rankings",
      body: _buildPowerRankingsHtml(),
    },
    {
      key: "chemistryleader",
      cat: "pairs",
      title: "🧪 Chemistry Leaderboard",
      body: _buildChemistryLeaderboardHtml(),
    },
    {
      key: "matchpredict",
      cat: "records",
      title: "🔮 Match Prediction",
      body: _buildMatchPredictHtml(),
    },
    {
      key: "storyfeed",
      cat: "records",
      title: "📰 Match Stories",
      body: _buildStoryFeedHtml(),
    },
    {
      key: "seasonmode",
      cat: "records",
      title: "🏆 Season Mode",
      body: _buildSeasonModeHtml(),
    },
    {
      key: "lreplay",
      cat: "players",
      title: "▶️ Leaderboard Replay",
      body: _buildLeaderboardReplayHtml(),
    },
    {
      key: "rivalries",
      cat: "players",
      title: "⚔️ Rivalries",
      body: (() => {
        const enc = {};
        activeMatches().forEach((m) => {
          const tA = m.teamA || [], tB = m.teamB || [];
          const aWon = m.scoreA > m.scoreB;
          tA.forEach((a) => {
            tB.forEach((b) => {
              const sorted = [normPlayer(a), normPlayer(b)].sort();
              const key = sorted.join(" vs ");
              if (!enc[key]) enc[key] = { total: 0, wins0: 0, p0: sorted[0], p1: sorted[1] };
              enc[key].total++;
              const p0IsA = normPlayer(a) === sorted[0];
              if ((p0IsA && aWon) || (!p0IsA && !aWon)) enc[key].wins0++;
            });
          });
        });
        const rivals = Object.values(enc)
          .filter((r) => r.total >= 5)
          .sort((a, b) => b.total - a.total)
          .slice(0, 6);
        if (!rivals.length)
          return `<div class="ana-card"><div class="sub" style="padding:8px 0">Need 5+ head-to-head encounters to surface rivalries.</div></div>`;
        return rivals.map((r) => {
          const p0w = r.wins0, p1w = r.total - r.wins0;
          const p0pct = Math.round((p0w / r.total) * 100);
          const col0 = p0pct >= 60 ? "var(--green)" : p0pct <= 40 ? "var(--red)" : "var(--muted)";
          const col1 = p0pct <= 40 ? "var(--green)" : p0pct >= 60 ? "var(--red)" : "var(--muted)";
          return `<div class="ana-card" style="padding:10px 12px;margin-bottom:6px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <span style="font-size:12px;font-weight:800;color:${col0}">${escHtml(r.p0)}</span>
              <span style="font-size:9px;font-weight:700;color:var(--muted);letter-spacing:0.06em">${r.total} matches</span>
              <span style="font-size:12px;font-weight:800;color:${col1}">${escHtml(r.p1)}</span>
            </div>
            <div style="display:flex;height:6px;border-radius:3px;overflow:hidden;gap:1px">
              <div style="flex:${p0pct};background:var(--accent);border-radius:3px 0 0 3px"></div>
              <div style="flex:${100 - p0pct};background:rgba(255,255,255,0.15);border-radius:0 3px 3px 0"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:4px">
              <span style="font-size:10px;font-weight:700;color:${col0}">${p0w}W (${p0pct}%)</span>
              <span style="font-size:10px;font-weight:700;color:${col1}">${p1w}W (${100 - p0pct}%)</span>
            </div>
          </div>`;
        }).join("");
      })(),
    },
    {
      key: "elodow",
      cat: "elo",
      title: "📅 ELO Gain by Day",
      body: (() => {
        const hist = _memoEloHistory();
        const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const byDay = Array.from({ length: 7 }, () => ({ sum: 0, count: 0 }));
        Object.values(hist).forEach((entries) => {
          entries.forEach((e) => {
            if (!e.date) return;
            const d = new Date(e.date + "T00:00:00").getDay();
            byDay[d].sum += e.delta;
            byDay[d].count++;
          });
        });
        const avgs = byDay.map((d) => (d.count ? d.sum / d.count : null));
        const maxAbs = Math.max(...avgs.filter((v) => v !== null).map(Math.abs), 1);
        const cells = DAY.map((dayName, i) => {
          const avg = avgs[i];
          if (avg === null)
            return `<div style="flex:1;min-width:38px;padding:8px 4px;text-align:center;background:rgba(255,255,255,0.04);border-radius:8px"><div style="font-size:10px;color:var(--muted)">—</div><div style="font-size:8px;color:rgba(255,255,255,0.3);margin-top:4px">${dayName}</div><div style="font-size:7px;color:var(--muted)">0g</div></div>`;
          const intensity = Math.min(1, Math.abs(avg) / maxAbs);
          const bg = avg >= 0
            ? `rgba(72,199,116,${(0.1 + 0.7 * intensity).toFixed(2)})`
            : `rgba(240,79,79,${(0.1 + 0.7 * intensity).toFixed(2)})`;
          const col = avg >= 0 ? "var(--green)" : "var(--red)";
          return `<div style="flex:1;min-width:38px;padding:8px 4px;text-align:center;background:${bg};border-radius:8px">
            <div style="font-size:11px;font-weight:800;color:${col}">${avg >= 0 ? "+" : ""}${avg.toFixed(1)}</div>
            <div style="font-size:8px;color:rgba(255,255,255,0.5);margin-top:3px">${dayName}</div>
            <div style="font-size:7px;color:rgba(255,255,255,0.35)">${byDay[i].count}g</div>
          </div>`;
        }).join("");
        return `<div class="ana-card"><div style="display:flex;gap:4px;overflow-x:auto;padding-bottom:2px">${cells}</div><div style="font-size:9px;color:var(--muted);margin-top:8px;text-align:center">Average ELO Δ per match played on each day</div></div>`;
      })(),
    },
    {
      key: "eloproj",
      cat: "players",
      title: "🔮 ELO Projection",
      body: (() => {
        const formN = window._eloProj?.formN || 10;
        const futureM = window._eloProj?.futureM || 20;
        return `<div class="ana-card" style="padding:10px 12px">
          <div class="ep-controls">
            <div class="ep-ctrl-group">
              <div class="ep-ctrl-label">FORM WINDOW</div>
              <div class="ep-stepper">
                <button class="ep-step-btn" onclick="window._eloprojAdj('form',-10)">−</button>
                <span class="ep-step-val" id="eloproj-form-n">${formN}</span>
                <span class="ep-step-unit">games</span>
                <button class="ep-step-btn" onclick="window._eloprojAdj('form',10)">+</button>
              </div>
            </div>
            <div class="ep-ctrl-divider"></div>
            <div class="ep-ctrl-group">
              <div class="ep-ctrl-label">PROJECT AHEAD</div>
              <div class="ep-stepper">
                <button class="ep-step-btn" onclick="window._eloprojAdj('future',-10)">−</button>
                <span class="ep-step-val" id="eloproj-future-n">${futureM}</span>
                <span class="ep-step-unit">matches</span>
                <button class="ep-step-btn" onclick="window._eloprojAdj('future',10)">+</button>
              </div>
            </div>
          </div>
          <div id="eloproj-table"></div>
        </div>`;
      })(),
    },
  ];

  const storedOrder = getAnaOrder();
  const validKeys = allSecs.map((s) => s.key);
  const orderedKeys = [
    ...storedOrder.filter((k) => validKeys.includes(k)),
    ...validKeys.filter((k) => !storedOrder.includes(k)),
  ];
  // Collapse all sections by default on first visit (no stored state yet)
  if (!localStorage.getItem(ANA_COL_KEY)) saveAnaCollapsed(new Set(validKeys));
  const collapsed = getAnaCollapsed();

  const _catBase = [
    { id: "all", label: "ALL" },
    { id: "favs", label: "★ FAVS" },
    { id: "elo", label: "ELO" },
    { id: "players", label: "PLAYERS" },
    { id: "pairs", label: "PAIRS" },
    { id: "records", label: "RECORDS" },
    { id: "activity", label: "ACTIVITY" },
    { id: "hidden", label: "HIDDEN" },
  ];
  const pillOrder = getAnaPillOrder();
  // If a saved order exists, use it; append any new base pills not yet in the order.
  // If no saved order, use default base list as-is (no appending — avoids duplicates).
  const _catLabels = pillOrder.length
    ? [
        ...pillOrder
          .map((id) => _catBase.find((c) => c.id === id))
          .filter(Boolean),
        ..._catBase.filter((c) => !pillOrder.includes(c.id)),
      ]
    : _catBase;
  const filterPillsHtml = `<div class="ana-filter-row" id="ana-filter-row" oncontextmenu="event.preventDefault()">${_catLabels
    .map(
      (c) =>
        `<button class="ana-filter-pill${_anaActiveCat === c.id ? " active" : ""}"
        data-cat="${c.id}"
        onpointerdown="_pillPointerDown(event,'${c.id}')"
        oncontextmenu="event.preventDefault()">${c.label}</button>`,
    )
    .join("")}</div>`;

  // Cache sections for search autocomplete
  _anaSections = allSecs.map(s => ({ key: s.key, title: s.title, cat: s.cat }));

  container.innerHTML =
    filterPillsHtml +
    orderedKeys
      .map((key) => {
        const def = allSecs.find((s) => s.key === key);
        if (!def) return "";
        return makeSec(key, def.title, def.body, collapsed.has(key), def.cat);
      })
      .join("");

  // Re-apply active category filter after re-render
  anaFilterCategory(_anaActiveCat, true);

  if (!collapsed.has("calendar"))
    requestAnimationFrame(() => renderMatchCalendar());

  requestAnimationFrame(() => window._renderHiLoTable?.());

  // Seed ELO Projection state (preserve existing formN/futureM across re-renders)
  window._eloProj = {
    formN: window._eloProj?.formN || 10,
    futureM: window._eloProj?.futureM || 20,
    sortCol: window._eloProj?.sortCol || "currentRank",
    sortAsc: window._eloProj?.sortAsc ?? true,
  };
  requestAnimationFrame(() => window._renderEloProjTable?.());

  // Animate cards and section titles as they scroll into view
  if (_anaObserver) {
    _anaObserver.disconnect();
    _anaObserver = null;
  }
  if (!document.body.classList.contains("no-cascade")) {
    _anaObserver = new IntersectionObserver(
      (entries) => {
        let stagger = 0;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          el.style.animationDelay = `${stagger * 60}ms`;
          el.classList.add(
            el.classList.contains("ana-section-title")
              ? "section-anim"
              : "card-anim",
          );
          stagger++;
          _anaObserver.unobserve(el);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -20px 0px" },
    );

    container
      .querySelectorAll(
        ".ana-card, .award-card, .awards-grid, .ana-section-title, .pair-stats-card, .h2h-cascade-item",
      )
      .forEach((el) => {
        // Skip elements inside collapsed sections — they animate when the section expands
        if (el.closest(".ana-sec.collapsed")) return;
        el.style.opacity = "0";
        _anaObserver.observe(el);
      });
  }

  // JS-driven hover — reliable on all browsers/devices, bypasses CSS :hover issues
  if (!container._hoverBound) {
    container._hoverBound = true;
    container.addEventListener("mouseover", (e) => {
      const hdr = e.target.closest(".ana-sec-hdr");
      if (hdr) hdr.classList.add("ana-sec-hovered");
    });
    container.addEventListener("mouseout", (e) => {
      const hdr = e.target.closest(".ana-sec-hdr");
      if (hdr) hdr.classList.remove("ana-sec-hovered");
    });
  }

  // Mouse-wheel → horizontal scroll for pills row on desktop
  const pillRow = document.getElementById("ana-filter-row");
  if (pillRow && !pillRow._wheelBound) {
    pillRow._wheelBound = true;
    pillRow.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        pillRow.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  }
}

// Cascade-in: top-level sections animate sequentially on tab entry
function applyAnalyticsAnimations() {
  const container = document.getElementById("analytics-page-content");
  if (!container) return;
  const sections = container.querySelectorAll(".ana-sec");
  sections.forEach((sec, i) => {
    sec.classList.remove("ana-cascade-in");
    // force reflow so the animation restarts on repeat visits
    void sec.offsetWidth;
    sec.style.animationDelay = `${i * 65}ms`;
    sec.classList.add("ana-cascade-in");
  });
}

// Keep showAnalytics as alias for backward compat
function showAnalytics() {
  switchMainTab("analytics");
}

// ── EMAIL BACKUP ───────────────────────────────────────────
const emailConfig = {
  recipientEmail: "ankit.konchady@gmail.com",
  serviceId: "ekta_padel_service_id",
  templateId: "ekta_padel_template_id",
  publicKey: "_DebI6XI8p5DhoR4F",
};

function renderEmailStatus() {
  const el = document.getElementById("email-status");
  if (!el) return;
  const last = localStorage.getItem("padel_last_email");
  const today = todayISO();
  const sentText =
    last === today
      ? "✅ Sent today"
      : last
        ? `Last sent: ${last}`
        : "Never sent";
  el.innerHTML = `${sentText} &nbsp;·&nbsp; Auto-sends daily at 1 pm`;
}

async function sendBackupEmail(isAuto = false) {
  if (typeof emailjs === "undefined") {
    if (!isAuto) showToast("EmailJS not loaded", "❌");
    return false;
  }
  const { serviceId, templateId, publicKey, recipientEmail } = emailConfig;
  if (!serviceId || !templateId || !publicKey || !recipientEmail) {
    if (!isAuto) showToast("Complete email config first", "⚠️");
    return false;
  }
  try {
    const todayStr = todayISO();
    const jsonData = JSON.stringify({ matches: allMatches, players, playerAliasMap, nextPlayerId }, null, 2);

    await emailjs.send(
      serviceId,
      templateId,
      {
        to_email: recipientEmail,
        from_name: "Ekta Padel",
        subject: `Padel Backup — ${todayStr}`,
        send_type: isAuto ? "🤖 Automatic daily backup" : "📤 Manual backup",
        match_count: allMatches.length,
        backup_date: todayStr,
        json_data: jsonData,
      },
      publicKey,
    );

    localStorage.setItem("padel_last_email", todayStr);
    renderEmailStatus();
    if (!isAuto) showToast("Backup email sent!", "📧");
    return true;
  } catch (err) {
    console.error("Backup email error:", err);
    if (!isAuto) showToast("Email failed — check config", "❌");
    return false;
  }
}

function scheduleAutoEmail() {
  if (_emailTimer) {
    clearTimeout(_emailTimer);
    _emailTimer = null;
  }
  if (!window.isAdmin) return;
  if (!emailConfig.serviceId || !emailConfig.recipientEmail) return;

  const now = new Date();
  const today = todayISO();
  const target = new Date(now);
  target.setHours(13, 0, 0, 0);

  if (localStorage.getItem("padel_last_email") !== today && now >= target) {
    localStorage.setItem("padel_last_email", today); // claim slot before async to prevent multi-tab race
    sendBackupEmail(true).then((ok) => {
      if (!ok) localStorage.removeItem("padel_last_email"); // release on failure so it can retry
      scheduleAutoEmail();
    });
    return;
  }

  if (localStorage.getItem("padel_last_email") === today) {
    target.setDate(target.getDate() + 1);
  }

  _emailTimer = setTimeout(() => {
    sendBackupEmail(true).then(() => scheduleAutoEmail());
  }, target - now);
}

// ── INIT ───────────────────────────────────────────────────
// loadCloudData() orchestrates: cache-first render → Firestore refresh.
// renderHome/renderCompact are called inside it after data is ready.
renderNamesTable();
loadCloudData();
// Sync offline-mode toggle UI with persisted state
const _offlineToggleEl = document.getElementById("offline-mode-toggle");
if (_offlineToggleEl) _offlineToggleEl.checked = _forcedOffline;
loadPhotos();
loadDeletedMatches();
scheduleAutoEmail();
setTimeout(() => {
  renderEloConfigCard();
}, 0);

// Expose globals
Object.assign(window, {
  goTo,
  goBack,
  switchMainTab,
  switchITab,
  filterMatchTab,
  applyRange,
  applyCmpDay,
  renderHome,
  onCmpFilter,
  toggleCmpEqualized,
  openExcludeSheet,
  closeExcludeSheet,
  toggleExcludePlayer,
  clearExcludedPlayers,
  openColSheet,
  closeColSheet,
  toggleCmpCol,
  showAllCmpCols,
  addMatches,
  saveNames,
  loadNames,
  clearMatches,
  clearNames,
  sendBackupEmail,
  exportData,
  exportCSV,
  setScreenshotChoiceSetting,
  setAnimLevel,
  toggleOfflineMode,
  renderHome,
  renderCompact,
  setCmpSort,
  renderModernMatches,
  setHistPlayerFilter,
  setHistOutcome,
  setHistMargin,
  setHistPairFilter,
  filterSheetSearch,
  setHistScorelineFilter,
  openFilterSheet,
  closeFilterSheet,
  selectFilterItem,
  openH2HSheet,
  closeH2HSheet,
  selectH2HPlayer,
  clearHeadToHeadFilter,
  clearAllHistFilters,
  populateHistoryPlayerChips,
  populateHistoryAdvancedFilters,
  renderAddMatches,
  refreshManage,
  deleteMatchByIndex,
  restoreMatch,
  purgeTrash,
  renderTrash,
  editMatchByIndex,
  saveMatchEdit,
  closeMatchEdit,
  openModernAddModal,
  closeModernAddModal,
  saveModernMatch,
  openPlayerPicker,
  pickPlayer,
  closePlayerPicker,
  closePlayerPickerBackdrop,
  showAnalytics,
  renderAnalyticsPage,
  toggleAnaSection,
  anaHandlePointerDown,
  populatePlayerDropdowns,
  renderNamesTable,
  editNameEntry,
  importData,
  openFabModal,
  openNameAddModal,
  closeNameAddModal,
  saveQuickName,
  previewMatchImport,
  undoLastAdd,
  computeElo,
  computeBadges,
  openPlayerDetail,
  openPairDetail,
  sortPairsBy,
  openH2HDetail,
  onHomeFilterChange,
  prefillMatchTADate,
  renderH2HDeepDive,
  selectEloTLPlayer,
  filterEloTimeline,
  showEloMatchDetail,
  calcEloWinProb,
  _togglePairForm,
  _toggleSynergyMore,
  openAnaSearch,
  closeAnaSearch,
  anaSearchInput,
  anaSearchKey,
  anaSearchSelect,
  anaFilterCategory,
  toggleAnaFav,
  toggleAnaHidden,
  _pillPointerDown,
  setHistoryDateFilter,
  histJumpToDate,
  openPlayerCompare,
  renderCompareSelector,
  triggerCompare,
  playerAvatar,
  playerColor,
  playerInitials,
  openShareCard,
  openWeeklyDigest,
  openSummaryShare,
  closeScreenshotChoiceSheet,
  doSummaryScreenshot,
  closeSharePreview,
  doShareWhatsApp,
  doShareDownload,
  openSummaryScreenshot,
  closeSnapshot,
  shareSnapshot,
  quickRematch,
  applyEloConfig,
  resetEloConfig,
  runMatchSimulator,
  openSimSheet,
  _showAllPairs,
  openSessionHighlights,
  _partnerTab,
  renderDigestCard,
  openDigestPlayerSheet,
  openWhatIfPlayerSheet,
  openEloProbSheet,
  _updateEloProbSlots,
  openCmpSheet,
  _cmpSetDate,
  _updateCmpSlots,
  toggleMngCard,
  toggleManageReorder,
  openPredictSheet,
  runMatchPrediction,
  _replayUpdate,
  _replayPlay,
  _replayReset,
  _replayStep,
  _replayJumpToMatch,
  _replayJumpToDate,
  _replaySetSpeed,
  _replayToggleLoop,
  _replayToggleReverse,
  _replaySetSpotlight,
  toggleMatchCalendar,
  toggleMatchesSection,
  calNav,
  calDayClick,
  showToast,
  toggleHamburgerMenu,
  closeHamburgerMenu,
  openGlobalSearch,
  closeGlobalSearch,
  _globalSearchInput,
  _storyFilter,
  openThemePicker,
  closeThemePicker,
  pickTheme,
  fireConfetti,
  streakCalDayClick,
  _h2hSetSort,
  _eloTLSetOverlay,
  openEloTLOverlaySheet,
  openMatchIntro,
  closeMatchIntro,
  mioSkipAnimation,
  showUndoToast,
  renderWhatIfSection,
  toggleWhatIfMatch,
  toggleWhatIfFlip,
  whatIfFlipAllLosses,
  whatIfReset,
  recomputeWhatIfElo,
  computeH2HStreak,
  openLiveMode,
  openLivePlayerSheet,
  selectLivePlayer,
  closeLivePlayerSheet,
  liveAdjustScore,
  liveAddPoint,
  liveUndoPoint,
  setLiveGameMode,
  endLiveMatch,
  openSessionSetup,
  closeSessionSetup,
  sessionSetupSelectAll,
  sessionSetupSelectNone,
  confirmSessionStart,
  endLiveSession,
  syncSession,
  substituteLivePlayer,
  checkResumeSession,
  resumeSession,
  discardResumeSession,
  _renderSessionActiveCard,
  openAddPlayerSheet,
  closeAddPlayerSheet,
  addPlayerToSession,
  toggleSessionPanel,
  suggestNextMatch,
  undoSessionMatch,
  redoSessionMatch,
  closeUndoConfirmSheet,
  confirmUndoSession,
  saveAndRematch,
  openSessionSummary,
  closeSessionSummary,
  confirmEndSession,
  openRivalryScreen,
  openShareMatchPoster,
  openHomeFilterSheet,
  openCmpDateSheet,
  savePlayerPhoto,
  removePlayerPhoto,
  openPlayerReportCard,
  _podiumSetPeriod,
  _reignSetPeriod,
  _timelineSetPeriod,
  _openPodiumDrill,
  _podiumDrillGoTo,
  _closePodiumDrill,
});

function setHistoryDateFilter(value) {
  filterMatchTab(value || "all");
}

// ── LIVE SCORING MODE ──────────────────────────────────────
let _liveScoreA = 0,
  _liveScoreB = 0;
const _liveSlots = { a1: null, a2: null, b1: null, b2: null };
let _liveActiveSlot = null;
let _livePoints = []; // point history for momentum graph
// Tennis-style scoring
let _liveGameMode = 4; // 4 = race to 4 (no diff), 6 = race to 6 (±2 / TB)
let _liveGamePtsA = 0; // 0..3 = 0/15/30/40 (then deuce/adv handled below)
let _liveGamePtsB = 0;
let _liveAdv = null; // 'a' | 'b' | null
let _liveMatchEnded = false;
let _livePointUndoStack = []; // each entry: snapshot of {gpA,gpB,adv,sA,sB,ended}
let _sessionPendingCount = 0; // matches saved locally but not yet synced to Firestore
let _sessionMatchHistory = [];    // matches logged this session (for stats / undo / rematch)
let _sessionRedoStack = [];       // matches popped by undo, available for redo
let _sessionTimerInterval = null; // setInterval handle for elapsed-time display
let _sessionPanelOpen = false;    // whether the session stats panel is expanded

function openLiveMode() {
  if (!window.isAdmin) { showToast("Create Session is admin only", "🔒"); return; }
  _liveScoreA = 0;
  _liveScoreB = 0;
  _livePoints = [];
  _liveGamePtsA = 0;
  _liveGamePtsB = 0;
  _liveAdv = null;
  _liveMatchEnded = false;
  _livePointUndoStack = [];
  _liveSlots.a1 = _liveSlots.a2 = _liveSlots.b1 = _liveSlots.b2 = null;
  const today = todayISO();
  const dateEl = document.getElementById("live-date");
  if (dateEl) dateEl.value = today;
  const notesEl = document.getElementById("live-notes");
  if (notesEl) notesEl.value = "";
  const savedMode = parseInt(localStorage.getItem("padel_live_mode") || "4", 10);
  _liveGameMode = savedMode === 6 ? 6 : 4;
  _liveSyncModeButtons();
  _updateLiveDisplay();
  _updateLiveWinProb(); _updateLiveEloPreview();
  _updateLiveMomentum();
  _liveSyncGameDisplay();
  ["a1", "a2", "b1", "b2"].forEach((s) => _renderLiveSlot(s));
  _syncLiveSessionBar();
  goTo("live");
}

function setLiveGameMode(mode) {
  if (mode !== 4 && mode !== 6) return;
  if (_liveGameMode === mode) return;
  _liveGameMode = mode;
  try {
    localStorage.setItem("padel_live_mode", String(mode));
  } catch (e) {}
  // Reset everything on mode change
  _liveScoreA = 0;
  _liveScoreB = 0;
  _liveGamePtsA = 0;
  _liveGamePtsB = 0;
  _liveAdv = null;
  _liveMatchEnded = false;
  _livePoints = [];
  _livePointUndoStack = [];
  _liveSyncModeButtons();
  _updateLiveDisplay();
  _updateLiveWinProb(); _updateLiveEloPreview();
  _updateLiveMomentum();
  _liveSyncGameDisplay();
}

function _liveSyncModeButtons() {
  document.querySelectorAll(".live-mode-btn").forEach((b) => {
    b.classList.toggle("active", parseInt(b.dataset.mode, 10) === _liveGameMode);
  });
}

function _livePointLabel(team) {
  if (_liveAdv === team) return "AD";
  if (_liveAdv && _liveAdv !== team) return "40";
  const pts = team === "a" ? _liveGamePtsA : _liveGamePtsB;
  return ["0", "15", "30", "40"][pts] || "0";
}

function _liveGameStateLabel() {
  if (_liveMatchEnded) {
    const winner = _liveScoreA > _liveScoreB ? "RED" : "BLUE";
    return { text: `MATCH — ${winner} WINS`, cls: "match-point" };
  }
  // Match point check
  const a = _liveScoreA,
    b = _liveScoreB;
  const target = _liveGameMode;
  let aMatchPt = false,
    bMatchPt = false;
  if (target === 4) {
    aMatchPt = a === 3;
    bMatchPt = b === 3;
  } else {
    aMatchPt = (a >= 5 && a - b >= 1) || a === 6;
    bMatchPt = (b >= 5 && b - a >= 1) || b === 6;
  }
  const aGamePt =
    _liveAdv === "a" ||
    (_liveGamePtsA === 3 && _liveGamePtsB < 3) ||
    (_liveGamePtsA === 3 && _liveGamePtsB === 3 && _liveAdv === "a");
  const bGamePt =
    _liveAdv === "b" ||
    (_liveGamePtsB === 3 && _liveGamePtsA < 3) ||
    (_liveGamePtsB === 3 && _liveGamePtsA === 3 && _liveAdv === "b");
  if (aMatchPt && aGamePt) return { text: "MATCH POINT — RED", cls: "match-point" };
  if (bMatchPt && bGamePt) return { text: "MATCH POINT — BLUE", cls: "match-point" };
  if (_liveAdv === "a") return { text: "ADVANTAGE RED", cls: "" };
  if (_liveAdv === "b") return { text: "ADVANTAGE BLUE", cls: "" };
  if (_liveGamePtsA === 3 && _liveGamePtsB === 3) return { text: "DEUCE", cls: "" };
  if (aGamePt) return { text: "GAME POINT — RED", cls: "" };
  if (bGamePt) return { text: "GAME POINT — BLUE", cls: "" };
  return { text: "", cls: "" };
}

function _liveSyncGameDisplay() {
  const a = document.getElementById("live-pt-val-a");
  const b = document.getElementById("live-pt-val-b");
  const st = document.getElementById("live-game-state");
  if (a) a.textContent = _livePointLabel("a");
  if (b) b.textContent = _livePointLabel("b");
  if (st) {
    const lbl = _liveGameStateLabel();
    st.textContent = lbl.text;
    st.className = "live-game-state" + (lbl.cls ? " " + lbl.cls : "");
  }
}

function _liveHaptic(ms) {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(ms);
    } catch (e) {}
  }
}

function liveAddPoint(team) {
  if (_liveMatchEnded) return;
  // Snapshot for undo
  _livePointUndoStack.push({
    gpA: _liveGamePtsA,
    gpB: _liveGamePtsB,
    adv: _liveAdv,
    sA: _liveScoreA,
    sB: _liveScoreB,
    ended: _liveMatchEnded,
    points: [..._livePoints],
  });
  if (_livePointUndoStack.length > 100) _livePointUndoStack.shift();
  _liveHaptic(8);
  // Advantage handling
  if (_liveAdv === team) {
    _liveWinGame(team);
    return;
  }
  if (_liveAdv && _liveAdv !== team) {
    _liveAdv = null;
    _liveSyncGameDisplay();
    return;
  }
  // Deuce becomes advantage
  if (_liveGamePtsA === 3 && _liveGamePtsB === 3) {
    _liveAdv = team;
    _liveSyncGameDisplay();
    return;
  }
  // Normal progression
  if (team === "a") _liveGamePtsA++;
  else _liveGamePtsB++;
  const ptsT = team === "a" ? _liveGamePtsA : _liveGamePtsB;
  const ptsO = team === "a" ? _liveGamePtsB : _liveGamePtsA;
  if (ptsT >= 4 && ptsT - ptsO >= 2) {
    _liveWinGame(team);
    return;
  }
  _liveSyncGameDisplay();
}

function _liveWinGame(team) {
  if (team === "a") _liveScoreA++;
  else _liveScoreB++;
  _liveGamePtsA = 0;
  _liveGamePtsB = 0;
  _liveAdv = null;
  _livePoints.push({ team, a: _liveScoreA, b: _liveScoreB });
  _liveHaptic([20, 30, 20]);
  // Match-win check
  if (_liveCheckMatchWin()) {
    _liveMatchEnded = true;
    _liveHaptic([50, 80, 50]);
    openMatchSaveSheet();
  }
  _updateLiveDisplay();
  _updateLiveWinProb(); _updateLiveEloPreview();
  _updateLiveMomentum();
  _liveSyncGameDisplay();
}

function _liveCheckMatchWin() {
  const a = _liveScoreA,
    b = _liveScoreB;
  if (_liveGameMode === 4) {
    return a >= 4 || b >= 4;
  }
  if (a >= 6 && a - b >= 2) return true;
  if (b >= 6 && b - a >= 2) return true;
  if (a === 7 || b === 7) return true; // 7-5 or 7-6 (tiebreak)
  return false;
}

function liveUndoPoint() {
  const snap = _livePointUndoStack.pop();
  if (!snap) return;
  _liveGamePtsA = snap.gpA;
  _liveGamePtsB = snap.gpB;
  _liveAdv = snap.adv;
  _liveScoreA = snap.sA;
  _liveScoreB = snap.sB;
  _liveMatchEnded = snap.ended;
  _livePoints = snap.points;
  _liveHaptic(8);
  _updateLiveDisplay();
  _updateLiveWinProb(); _updateLiveEloPreview();
  _updateLiveMomentum();
  _liveSyncGameDisplay();
}

// Enhancement 12: substitute player mid-match
function substituteLivePlayer(slot) {
  openLivePlayerSheet(slot);
}

function _renderLiveSlot(slot) {
  const p = _liveSlots[slot];
  const nameEl = document.getElementById(`live-name-${slot}`);
  const avatarEl = document.getElementById(`live-avatar-${slot}`);
  const slotEl = document.getElementById(`live-slot-${slot}`);
  if (!nameEl || !avatarEl) return;
  if (p) {
    nameEl.textContent = p;
    avatarEl.textContent = playerInitials(p);
    avatarEl.style.background = playerColor(p);
    avatarEl.style.color = "#fff";
    slotEl?.classList.add("live-slot-filled");
    // Enhancement 10: show ELO under name
    const eloEl = document.getElementById(`live-elo-${slot}`);
    if (eloEl) {
      const elo = _memoElo()[p] || 1000;
      eloEl.textContent = `ELO ${elo}`;
      eloEl.style.display = "block";
    }
  } else {
    nameEl.textContent = "TAP TO SELECT";
    avatarEl.textContent = "?";
    avatarEl.style.background = "rgba(255,255,255,0.06)";
    avatarEl.style.color = "var(--muted)";
    slotEl?.classList.remove("live-slot-filled");
    const eloEl = document.getElementById(`live-elo-${slot}`);
    if (eloEl) eloEl.style.display = "none";
  }
}

function openLivePlayerSheet(slot) {
  _liveActiveSlot = slot;
  const overlay = document.getElementById("live-sheet-overlay");
  const sheet = document.getElementById("live-sheet");
  const list = document.getElementById("live-sheet-list");
  const title = document.getElementById("live-sheet-title");
  if (!overlay || !sheet || !list) return;
  const corner = slot.startsWith("a") ? "RED CORNER" : "BLUE CORNER";
  const pos = slot.endsWith("1") ? "PLAYER 1" : "PLAYER 2";
  if (title) title.textContent = `${corner} — ${pos}`;
  const taken = Object.entries(_liveSlots)
    .filter(([k, v]) => k !== slot && v)
    .map(([, v]) => v);
  const sessionPlayers = _liveSessionData?.sessionActive && (_liveSessionData?.sessionPlayers?.length >= 2)
    ? _liveSessionData.sessionPlayers
    : null;
  const players = (sessionPlayers || getAllPlayerNamesFromMatches());
  const clearBtn = `<button class="live-sheet-item live-sheet-item-clear" onclick="selectLivePlayer(null,${jsArg(slot)})">
      <span class="live-sheet-item-av" style="background:rgba(255,70,70,0.18);color:#ff5555">✕</span>
      <span class="live-sheet-item-name">CLEAR SLOT</span>
    </button>`;
  list.innerHTML = clearBtn + players
    .map((p) => {
      const isTaken = taken.includes(p);
      const isCurrent = _liveSlots[slot] === p;
      return `<button class="live-sheet-item${isCurrent ? " live-sheet-item-selected" : ""}${isTaken ? " live-sheet-item-taken" : ""}"
      onclick="${isTaken ? "" : `selectLivePlayer(${jsArg(p)},${jsArg(slot)})`}"
      ${isTaken ? "disabled" : ""}>
      ${sheetAv(p)}
      <span class="live-sheet-item-name">${escHtml(p)}</span>
      ${isCurrent ? '<span class="live-sheet-check">✓</span>' : ""}
    </button>`;
    })
    .join("");
  overlay.classList.add("live-sheet-open");
  sheet.classList.add("live-sheet-open");
}

function selectLivePlayer(name, slot) {
  _liveSlots[slot] = name;
  _renderLiveSlot(slot);
  closeLivePlayerSheet();
  _liveScoreA = 0; _liveScoreB = 0;
  _liveGamePtsA = 0; _liveGamePtsB = 0;
  _liveAdv = null; _liveMatchEnded = false;
  _livePoints = []; _livePointUndoStack = [];
  _updateLiveDisplay(); _liveSyncGameDisplay(); _updateLiveWinProb(); _updateLiveEloPreview(); _updateLiveMomentum();
  _renderSittingOut();
  _checkRematchWarning();
  const { a1, a2, b1, b2 } = _liveSlots;
  if (a1 && a2 && b1 && b2) openMatchConfirmSheet();
}

function closeLivePlayerSheet() {
  document
    .getElementById("live-sheet-overlay")
    ?.classList.remove("live-sheet-open");
  document.getElementById("live-sheet")?.classList.remove("live-sheet-open");
  _liveActiveSlot = null;
}

function _updateLiveDisplay() {
  const sa = document.getElementById("live-score-a");
  const sb = document.getElementById("live-score-b");
  if (sa) {
    sa.textContent = _liveScoreA;
    sa.className =
      "live-score-giant" +
      (_liveScoreA > _liveScoreB ? " live-score-lead" : "");
  }
  if (sb) {
    sb.textContent = _liveScoreB;
    sb.className =
      "live-score-giant" +
      (_liveScoreB > _liveScoreA ? " live-score-lead" : "");
  }
}

function liveAdjustScore(team, delta) {
  const cur = team === "a" ? _liveScoreA : _liveScoreB;
  const next = Math.max(0, cur + delta);
  const actualDelta = next - cur;
  if (team === "a") _liveScoreA = next;
  else _liveScoreB = next;
  if (actualDelta > 0) {
    _livePoints.push({ team, a: _liveScoreA, b: _liveScoreB });
  } else if (actualDelta < 0) {
    for (let i = _livePoints.length - 1; i >= 0; i--) {
      if (_livePoints[i].team === team) {
        _livePoints.splice(i, 1);
        break;
      }
    }
    let cA = 0, cB = 0;
    _livePoints.forEach((p) => {
      if (p.team === "a") cA++;
      else cB++;
      p.a = cA;
      p.b = cB;
    });
  }
  // Reset current-game points whenever the set score changes
  _liveGamePtsA = 0;
  _liveGamePtsB = 0;
  _liveAdv = null;
  _liveSyncGameDisplay();
  _updateLiveDisplay();
  _updateLiveWinProb(); _updateLiveEloPreview();
  _updateLiveMomentum();
  // Always prompt to save when win condition is met
  if (actualDelta !== 0 && _liveCheckMatchWin()) {
    _liveMatchEnded = true;
    _liveHaptic([50, 80, 50]);
    openMatchSaveSheet();
  }
}

// 5A: Live Win Probability Meter
function _updateLiveWinProb() {
  const wrap = document.getElementById("live-prob-wrap");
  if (!wrap) return;
  const { a1, a2, b1, b2 } = _liveSlots;
  if (!a1 || !a2 || !b1 || !b2) {
    wrap.style.display = "none";
    return;
  }
  wrap.style.display = "";
  const eloMap = _memoElo();
  const avgA = ((eloMap[a1] || 1000) + (eloMap[a2] || 1000)) / 2;
  const avgB = ((eloMap[b1] || 1000) + (eloMap[b2] || 1000)) / 2;
  const baseProb = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
  // Tilt probability toward leading team based on score gap
  const total = _liveScoreA + _liveScoreB;
  const scoreTilt =
    total > 0 ? ((_liveScoreA - _liveScoreB) / (total + 4)) * 0.25 : 0;
  const probA = Math.min(0.97, Math.max(0.03, baseProb + scoreTilt));
  const probB = 1 - probA;
  const pA = Math.round(probA * 100);
  const pB = 100 - pA;
  const barA = document.getElementById("live-prob-bar-a");
  const barB = document.getElementById("live-prob-bar-b");
  const lblA = document.getElementById("live-prob-lbl-a");
  const lblB = document.getElementById("live-prob-lbl-b");
  const fill = document.getElementById("live-prob-fill");
  if (barA) barA.textContent = `${pA}%`;
  if (barB) barB.textContent = `${pB}%`;
  if (lblA)
    lblA.textContent = (
      a1.split(" ")[0] +
      " & " +
      a2.split(" ")[0]
    ).toUpperCase();
  if (lblB)
    lblB.textContent = (
      b1.split(" ")[0] +
      " & " +
      b2.split(" ")[0]
    ).toUpperCase();
  if (fill) {
    fill.style.width = pA + "%";
    const col =
      pA > 55
        ? "var(--live-red)"
        : pA < 45
          ? "var(--live-blue)"
          : "var(--theme)";
    fill.style.background = col;
  }
}

function _updateLiveEloPreview() {
  const el = document.getElementById("live-elo-preview");
  if (!el) return;
  const { a1, a2, b1, b2 } = _liveSlots;
  if (!a1 || !a2 || !b1 || !b2) { el.style.display = "none"; return; }
  const eloMap = _memoElo();
  const avgA = ((eloMap[a1] || 1000) + (eloMap[a2] || 1000)) / 2;
  const avgB = ((eloMap[b1] || 1000) + (eloMap[b2] || 1000)) / 2;
  const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
  const expB = 1 - expA;
  const dAwin  = Math.round(32 * (1 - expA));
  const dAlose = Math.round(32 * (0 - expA));
  const dBwin  = Math.round(32 * (1 - expB));
  const dBlose = Math.round(32 * (0 - expB));
  el.style.display = "";
  const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  set("lep-win-a",  `+${dAwin}`);
  set("lep-lose-a", `${dAlose}`);
  set("lep-win-b",  `+${dBwin}`);
  set("lep-lose-b", `${dBlose}`);
}

// 5B: Live Momentum Graph
function _updateLiveMomentum() {
  const wrap = document.getElementById("live-momentum-wrap");
  if (!wrap) return;
  if (_livePoints.length < 2) {
    wrap.style.display = "none";
    return;
  }
  wrap.style.display = "";
  const W = 280,
    H = 60,
    mid = H / 2;
  const pts = _livePoints;
  const n = pts.length;
  const maxAdv = Math.max(...pts.map((p) => Math.abs(p.a - p.b)), 1);
  const scale = (mid - 6) / maxAdv;
  const xStep = W / Math.max(n - 1, 1);
  let path = `M 0 ${mid}`;
  pts.forEach((p, i) => {
    const adv = p.a - p.b;
    const y = mid - adv * scale;
    path += ` L ${(i * xStep).toFixed(1)} ${y.toFixed(1)}`;
  });
  const lastPt = pts[n - 1];
  const lastAdv = lastPt.a - lastPt.b;
  const lineCol =
    lastAdv > 0
      ? "var(--live-red)"
      : lastAdv < 0
        ? "var(--live-blue)"
        : "var(--theme)";
  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <line x1="0" y1="${mid}" x2="${W}" y2="${mid}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <path d="${path}" fill="none" stroke="${lineCol}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${((n - 1) * xStep).toFixed(1)}" cy="${(mid - lastAdv * scale).toFixed(1)}" r="4" fill="${lineCol}"/>
  </svg>`;
  const chart = document.getElementById("live-momentum-chart");
  if (chart) chart.innerHTML = svg;
}

function endLiveMatch() {
  const { a1, a2, b1, b2 } = _liveSlots;
  const date = todayISO();
  const notes = document.getElementById("live-notes")?.value.trim() || "";
  if (!a1 || !a2 || !b1 || !b2) {
    showToast("Select all 4 players first", "❌");
    return;
  }
  if (new Set([a1, a2, b1, b2]).size < 4) {
    showToast("All 4 players must be different", "❌");
    return;
  }
  if (_liveScoreA === 0 && _liveScoreB === 0) {
    showToast("Score must be > 0", "❌");
    return;
  }
  const match = {
    teamA: [a1, a2],
    teamB: [b1, b2],
    scoreA: _liveScoreA,
    scoreB: _liveScoreB,
    date,
  };
  if (notes) match.note = notes;
  allMatches.push(match);
  const eventMsg = `${a1} & ${a2} ${_liveScoreA}–${_liveScoreB} ${b1} & ${b2}`;
  if (_liveSessionData?.sessionActive) {
    _sessionMatchHistory.push({ teamA: [a1, a2], teamB: [b1, b2], scoreA: _liveScoreA, scoreB: _liveScoreB, date });
    _sessionRedoStack = []; // new match invalidates redo history
    _liveSessionData = { ..._liveSessionData, currentMatch: null };
    // Buffer locally — don't write to Firestore until SYNC or End Session
    _sessionPendingCount++;
    _updateSyncBadge();
    _syncLiveSessionBar();
    if (_sessionPanelOpen) _updateSessionPanel();
    document.getElementById("live-undo-match-btn")?.style.setProperty("display", "");
    document.getElementById("live-redo-match-btn")?.style.setProperty("display", "none");
    _saveSessionState(); // Enhancement 13: persist session for resume
    _invalidateEloMemo();
    if (window.appCache) window.appCache.save(allMatches, players, playerAliasMap, nextPlayerId);
    try { localStorage.setItem("padel_matches", JSON.stringify(allMatches)); } catch(e) {}
  } else {
    saveCloudData();
  }
  renderHome();
  renderCompact();
  renderModernMatches();
  showToast(`Saved! ${eventMsg}`, "🎾");
  _showLiveEventBanner({ type: "match_end", msg: `Match saved: ${eventMsg}`, teamA: [a1, a2], teamB: [b1, b2], scoreA: _liveScoreA, scoreB: _liveScoreB });
  // Reset everything for next match including player slots
  _liveScoreA = 0; _liveScoreB = 0;
  _liveGamePtsA = 0; _liveGamePtsB = 0;
  _liveAdv = null; _liveMatchEnded = false;
  _livePoints = []; _livePointUndoStack = [];
  _liveSlots.a1 = _liveSlots.a2 = _liveSlots.b1 = _liveSlots.b2 = null;
  ["a1", "a2", "b1", "b2"].forEach((s) => _renderLiveSlot(s));
  _updateLiveDisplay(); _liveSyncGameDisplay(); _updateLiveWinProb(); _updateLiveEloPreview(); _updateLiveMomentum();
  _renderSittingOut();
  _checkRematchWarning();
  // Stay on live page — do NOT call goTo("live") here as it would corrupt prevPage
}

function _updateSyncBadge() {
  const el = document.getElementById("live-sync-count");
  if (!el) return;
  if (_sessionPendingCount > 0) {
    el.textContent = _sessionPendingCount;
    el.style.display = "";
  } else {
    el.style.display = "none";
  }
}

async function syncSession() {
  if (_sessionPendingCount === 0) { showToast("Nothing to sync", "✅"); return; }
  const count = _sessionPendingCount;
  const wasForced = _forcedOffline;
  _forcedOffline = false; // one-shot push — bypass forced offline
  await saveCloudData();
  _forcedOffline = wasForced;
  _sessionPendingCount = 0;
  _sessionRedoStack = []; // sync is a checkpoint — redo history is committed and cleared
  _updateSyncBadge();
  _saveSessionState();
  // Hide UNDO/REDO since nothing is pending after the checkpoint
  document.getElementById("live-undo-match-btn")?.style.setProperty("display", "none");
  document.getElementById("live-redo-match-btn")?.style.setProperty("display", "none");
  showToast(`Synced ${count} match${count !== 1 ? "es" : ""} to cloud`, "☁️");
}

// ── MATCH INTRO OVERLAY ────────────────────────────────────
let _mioTimers = [];
let _mioFinalize = null;
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
  const m = allMatches[idx];
  if (!m) return;
  // Cancel any in-flight animations from a previous opening
  _mioTimers.forEach((id) => clearTimeout(id));
  _mioTimers = [];
  _mioFinalize = null;

  const _amE = activeMatches();
  const _upToInclE = new Set(allMatches.slice(0, idx + 1));
  const _upToBeforeE = new Set(allMatches.slice(0, idx));
  const priorElo = computeElo(_amE.filter(m => _upToBeforeE.has(m)));
  const afterElo = computeElo(_amE.filter(m => _upToInclE.has(m)));
  const aWon = m.scoreA > m.scoreB;

  // Pre-match individual and pair ranks
  const indivRanked = Object.entries(priorElo).sort((a, b) => b[1] - a[1]);
  const allPairs = getPairStats();
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
  const _sortedForNum = [...allMatches].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const _matchNum = _sortedForNum.indexOf(m) + 1;
  document.getElementById("mio-date-bar").textContent =
    `${fmtDate(m.date).toUpperCase()} · MATCH #${_matchNum}`;

  const rankA = mkRankLabel(m.teamA);
  const rankB = mkRankLabel(m.teamB);
  const rankAEl = document.getElementById("mio-rank-a");
  const rankBEl = document.getElementById("mio-rank-b");
  rankAEl.textContent = rankA;
  rankAEl.style.visibility = rankA ? "visible" : "hidden";
  rankBEl.textContent = rankB;
  rankBEl.style.visibility = rankB ? "visible" : "hidden";

  document.getElementById("mio-name-a").innerHTML = nameA.replace(
    " & ",
    "<br>& ",
  );
  document.getElementById("mio-name-b").innerHTML = nameB.replace(
    " & ",
    "<br>& ",
  );
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
  _amE.filter(m => _upToBeforeE.has(m)).forEach((pm) => {
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
      const winNumEl = h2hEl.querySelector(aWon ? ".mio-h2h-num-a" : ".mio-h2h-num-b");
      const newVal = aWon ? h2hAfterA : h2hAfterB;
      const oldVal = aWon ? h2hWinsA : h2hWinsB;
      if (winNumEl && newVal > oldVal) {
        winNumEl.textContent = newVal;
        winNumEl.classList.add("mio-count-flash");
        const plus = document.createElement("span");
        plus.className = "mio-float-plus";
        plus.textContent = "+1";
        winNumEl.parentElement.appendChild(plus);
        _mioSched(() => { winNumEl.classList.remove("mio-count-flash"); plus.remove(); }, 950);
      }
    }, 900);
  }

  // Individual player H2H grid (all 4 cross-matchups)
  const pvpEl = document.getElementById("mio-pvp-section");
  if (pvpEl && m.teamA.length >= 2 && m.teamB.length >= 2) {
    const priorMatches = _amE.filter(m => _upToBeforeE.has(m));
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
        const numEl = row.querySelector(aWon ? ".mio-pvp-num-a" : ".mio-pvp-num-b");
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
            _mioSched(() => { numEl.classList.remove("mio-count-flash"); plus.remove(); }, 950);
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
    const priorMs = _amE.filter(m => _upToBeforeE.has(m));
    [...m.teamA, ...m.teamB].forEach((p) => {
      const pPrior = priorMs.filter((pm) => [...(pm.teamA || []), ...(pm.teamB || [])].includes(p));
      if (!pPrior.length) return;
      let sk = 0, st = null;
      for (let i = pPrior.length - 1; i >= 0; i--) {
        const pm = pPrior[i];
        const inA2 = (pm.teamA || []).includes(p);
        const won2 = inA2 ? pm.scoreA > pm.scoreB : pm.scoreB > pm.scoreA;
        if (st === null) { st = won2; sk = 1; }
        else if (won2 === st) sk++;
        else break;
      }
      const inA3 = (m.teamA || []).includes(p);
      const won3 = inA3 ? aWon : !aWon;
      if (st !== null && won3 === st && sk >= 2) {
        ctxParts.push(`🔥 ${normPlayer(p)}'s ${st ? "win" : "loss"} streak → ${sk + 1}`);
      } else if (st !== null && won3 !== st && sk >= 3) {
        ctxParts.push(`💥 ${normPlayer(p)}'s ${sk}-${st ? "W" : "L"} streak ended`);
      }
    });

    // ELO tier cross: check if any player crossed a tier boundary
    const ELO_TIERS = [{ t: 900, n: "BRONZE" }, { t: 1000, n: "SILVER" }, { t: 1100, n: "GOLD" }, { t: 1200, n: "PLATINUM" }];
    [...m.teamA, ...m.teamB].forEach((p) => {
      const pre = priorElo[p] || 1000;
      const post = afterElo[p] || 1000;
      ELO_TIERS.forEach(({ t, n }) => {
        if (pre < t && post >= t) ctxParts.push(`⭐ ${normPlayer(p)} reached ${n}`);
        else if (pre >= t && post < t) ctxParts.push(`📉 ${normPlayer(p)} dropped below ${n}`);
      });
    });

    // Last meeting reminder
    const tkA2 = [...m.teamA].sort().join("|");
    const tkB2 = [...m.teamB].sort().join("|");
    const lastMeeting = [..._amE.filter(m => _upToBeforeE.has(m))].reverse().find((pm) => {
      const pmA2 = [...(pm.teamA || [])].sort().join("|");
      const pmB2 = [...(pm.teamB || [])].sort().join("|");
      return (pmA2 === tkA2 && pmB2 === tkB2) || (pmA2 === tkB2 && pmB2 === tkA2);
    });
    if (lastMeeting) {
      const lmAWon = lastMeeting.scoreA > lastMeeting.scoreB;
      const lmA = [...lastMeeting.teamA].sort().join("|");
      const lastWinnerName = lmA === tkA2 ? nameA : nameB;
      ctxParts.push(`📅 Last meeting: ${fmtDate(lastMeeting.date)} · ${lastMeeting.scoreA}–${lastMeeting.scoreB} (${lastWinnerName.split("<br>").join(" ")} won)`);
    }

    // Relative performance vs team averages
    const teamAvgScore = (players) => {
      const ms = _amE.filter(m => _upToBeforeE.has(m)).filter((pm) =>
        players.every((p) => (pm.teamA || []).includes(p)) ||
        players.every((p) => (pm.teamB || []).includes(p))
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
    if (avgA2 !== null && m.scoreA > avgA2 + 0.4) ctxParts.push(`📈 ${nameA.split("<br>").join(" ")} above avg (${avgA2.toFixed(1)})`);
    else if (avgA2 !== null && m.scoreA < avgA2 - 0.4) ctxParts.push(`📉 ${nameA.split("<br>").join(" ")} below avg (${avgA2.toFixed(1)})`);
    if (avgB2 !== null && m.scoreB > avgB2 + 0.4) ctxParts.push(`📈 ${nameB.split("<br>").join(" ")} above avg (${avgB2.toFixed(1)})`);
    else if (avgB2 !== null && m.scoreB < avgB2 - 0.4) ctxParts.push(`📉 ${nameB.split("<br>").join(" ")} below avg (${avgB2.toFixed(1)})`);

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
    document
      .querySelectorAll(".mio-float-plus")
      .forEach((el) => el.remove());
    document
      .querySelectorAll(".mio-count-flash")
      .forEach((el) => el.classList.remove("mio-count-flash"));
  };
}

function closeMatchIntro() {
  _mioTimers.forEach((id) => clearTimeout(id));
  _mioTimers = [];
  _mioFinalize = null;
  document
    .querySelectorAll(".mio-float-plus")
    .forEach((el) => el.remove());
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

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMatchIntro();
});

// Feature 4B: Card tilt parallax on home leaderboard cards
(function initCardTilt() {
  let _tc = null; // currently tilting card

  function _tApply(card, cx, cy) {
    const r = card.getBoundingClientRect();
    const px = (cx - r.left) / r.width;
    const py = (cy - r.top) / r.height;
    const rx = (py - 0.5) * 14;
    const ry = (px - 0.5) * -14;
    card.classList.remove("tilt-reset");
    card.style.transition = "box-shadow 0.08s ease";
    card.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`;
    card.style.boxShadow = `0 24px 48px rgba(0,0,0,0.55), 0 0 30px rgba(var(--theme-rgb),0.16)`;
  }

  function _tReset(card) {
    card.classList.add("tilt-reset");
    card.style.transform = "";
    card.style.boxShadow = "";
    card.style.transition = "";
    setTimeout(() => card.classList.remove("tilt-reset"), 460);
  }

  document.addEventListener(
    "touchstart",
    (e) => {
      const card = e.target.closest(".pc");
      if (card) _tc = card;
    },
    { passive: true },
  );

  document.addEventListener(
    "touchmove",
    (e) => {
      if (!_tc || _nd.active) {
        if (_tc) {
          _tReset(_tc);
          _tc = null;
        }
        return;
      }
      _tApply(_tc, e.touches[0].clientX, e.touches[0].clientY);
    },
    { passive: true },
  );

  document.addEventListener(
    "touchend",
    () => {
      if (_tc) {
        _tReset(_tc);
        _tc = null;
      }
    },
    { passive: true },
  );

  document.addEventListener(
    "touchcancel",
    () => {
      if (_tc) {
        _tReset(_tc);
        _tc = null;
      }
    },
    { passive: true },
  );
})();


// ── PLAYER REPORT CARD ────────────────────────────────────────
async function openPlayerReportCard(name) {
  if (!window.html2canvas) { showToast("Capture not available", "❌"); return; }
  const modal = document.getElementById("player-detail-modal");
  if (!modal) { showToast("Open player detail first", "❌"); return; }
  showToast("Capturing...", "📊");
  try {
    const inner = modal.querySelector(".analytics-inner");
    const canvas = await window.html2canvas(inner || modal, {
      backgroundColor: "#030309",
      scale: 2,
      useCORS: true,
      logging: false,
    });
    canvas.toBlob((blob) => {
      if (!blob) { showToast("Capture failed", "❌"); return; }
      window._shareBlob = blob;
      const prevImg = document.getElementById("share-preview-img");
      if (prevImg) {
        if (prevImg.src.startsWith("blob:")) URL.revokeObjectURL(prevImg.src);
        prevImg.src = URL.createObjectURL(blob);
      }
      document.getElementById("share-preview-sheet")?.classList.add("open");
    }, "image/png");
  } catch (e) {
    showToast("Capture failed", "❌");
  }
}

// ── SESSION TIMER ────────────────────────────────────────────
function _startSessionTimer() {
  _stopSessionTimer();
  _updateSessionTimer();
  _sessionTimerInterval = setInterval(_updateSessionTimer, 1000);
}
function _stopSessionTimer() {
  if (_sessionTimerInterval) { clearInterval(_sessionTimerInterval); _sessionTimerInterval = null; }
}
function _updateSessionTimer() {
  const el = document.getElementById("live-session-timer");
  if (!el || !_liveSessionData?.sessionStartedAt) return;
  const sec = Math.floor((Date.now() - new Date(_liveSessionData.sessionStartedAt).getTime()) / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  el.textContent = h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ── SITTING-OUT STRIP ────────────────────────────────────────
function _renderSittingOut() {
  const el = document.getElementById("live-sittingout-strip");
  if (!el) return;
  if (!_liveSessionData?.sessionActive) { el.style.display = "none"; return; }
  const sessionPlayers = _liveSessionData.sessionPlayers || [];
  const playing = new Set(Object.values(_liveSlots).filter(Boolean));
  const sitting = sessionPlayers.filter(p => !playing.has(p));
  if (sitting.length === 0) { el.style.display = "none"; return; }
  el.style.display = "";
  el.innerHTML = `<span class="sittingout-label">SITTING OUT</span>` +
    sitting.map(p => `<span class="sittingout-chip">${escHtml(p.split(" ")[0])}</span>`).join("");
}

// ── REMATCH WARNING ──────────────────────────────────────────
function _checkRematchWarning() {
  const { a1, a2, b1, b2 } = _liveSlots;
  const el = document.getElementById("live-rematch-warning");
  if (!el) return;
  if (!a1 || !a2 || !b1 || !b2) { el.style.display = "none"; return; }
  const sA = [a1, a2].sort().join("|"), sB = [b1, b2].sort().join("|");
  const prev = _sessionMatchHistory.find(m => {
    const mA = [...m.teamA].sort().join("|"), mB = [...m.teamB].sort().join("|");
    return (mA === sA && mB === sB) || (mA === sB && mB === sA);
  });
  if (prev) {
    el.style.display = "";
    el.textContent = `⚠️ Rematch — this pairing played ${prev.scoreA}–${prev.scoreB} earlier this session`;
  } else {
    el.style.display = "none";
  }
}

// ── SESSION STATS PANEL ──────────────────────────────────────
function _buildSessionLeaderboard() {
  const sessionPlayers = _liveSessionData?.sessionPlayers || [];
  if (!sessionPlayers.length || !_sessionMatchHistory.length)
    return '<div style="font-size:11px;color:var(--muted);padding:8px 0;text-align:center">No matches yet</div>';
  const stats = {};
  sessionPlayers.forEach(p => stats[p] = { w: 0, l: 0, m: 0 });
  _sessionMatchHistory.forEach(mt => {
    const aWon = mt.scoreA > mt.scoreB;
    (aWon ? mt.teamA : mt.teamB).forEach(p => { if (stats[p]) { stats[p].w++; stats[p].m++; } });
    (aWon ? mt.teamB : mt.teamA).forEach(p => { if (stats[p]) { stats[p].l++; stats[p].m++; } });
  });
  const sorted = Object.entries(stats).sort((a, b) => {
    const diff = (b[1].m ? b[1].w / b[1].m : 0) - (a[1].m ? a[1].w / a[1].m : 0);
    return diff !== 0 ? diff : b[1].m - a[1].m;
  });
  const counts = sorted.map(([, s]) => s.m);
  const maxM = Math.max(...counts), minM = Math.min(...counts);
  const fairWarn = (maxM - minM) >= 2 && sorted.length >= 3
    ? `<div class="sess-fairness-warn">⚠️ ${sorted.filter(([,s]) => s.m === maxM).map(([n]) => n.split(' ')[0]).join(', ')} played ${maxM - minM} more than others</div>`
    : '';
  const rows = sorted.map(([name, s]) => {
    const pct = s.m ? Math.round(s.w / s.m * 100) : 0;
    return `<div class="sess-ldr-row">
      <div class="sess-ldr-name">${escHtml(name.split(' ')[0])}</div>
      <div class="sess-ldr-stats">${s.w}W ${s.l}L</div>
      <div class="sess-ldr-barwrap"><div class="sess-ldr-bar" style="width:${pct}%"></div></div>
      <div class="sess-ldr-count">×${s.m}</div>
    </div>`;
  }).join('');
  // Enhancement 11: full undo stack — show all session matches with undo buttons
  const histRows = [..._sessionMatchHistory].reverse().map((mt, ri) => {
    const i = _sessionMatchHistory.length - 1 - ri;
    const aWon = mt.scoreA > mt.scoreB;
    const tA = mt.teamA.map(p => p.split(' ')[0]).join(' & ');
    const tB = mt.teamB.map(p => p.split(' ')[0]).join(' & ');
    const isLast = i === _sessionMatchHistory.length - 1;
    return `<div class="sess-hist-row${isLast ? ' sess-hist-last' : ''}">
      <span class="sess-hist-teams">${escHtml(tA)} <span class="sess-hist-score ${aWon ? 'p' : 'n'}">${mt.scoreA}–${mt.scoreB}</span> ${escHtml(tB)}</span>
      ${isLast ? `<button class="sess-hist-undo-btn" onclick="undoSessionMatch()">↶</button>` : ''}
    </div>`;
  }).join('');
  const histHtml = histRows ? `<div class="sess-hist-label">MATCH LOG</div><div class="sess-hist-list">${histRows}</div>` : '';
  return fairWarn + rows + histHtml;
}

function _updateSessionPanel() {
  const el = document.getElementById("live-session-leaderboard");
  if (el) el.innerHTML = _buildSessionLeaderboard();
}

function toggleSessionPanel() {
  _sessionPanelOpen = !_sessionPanelOpen;
  const panel = document.getElementById("live-session-panel");
  if (!panel) return;
  panel.style.display = _sessionPanelOpen ? "" : "none";
  const btn = document.getElementById("sess-panel-toggle-btn");
  if (btn) btn.classList.toggle("active", _sessionPanelOpen);
  if (_sessionPanelOpen) _updateSessionPanel();
}

// ── AUTO-ROTATION — SUGGEST NEXT MATCH ──────────────────────
function _mkEloTeams(pick4, eloMap, alt) {
  const s = [...pick4].sort((a, b) => (eloMap[b] || 1000) - (eloMap[a] || 1000));
  const teamA = alt ? [s[0], s[2]] : [s[0], s[3]];
  const teamB = alt ? [s[1], s[3]] : [s[1], s[2]];
  const avgA = ((eloMap[teamA[0]] || 1000) + (eloMap[teamA[1]] || 1000)) / 2;
  const avgB = ((eloMap[teamB[0]] || 1000) + (eloMap[teamB[1]] || 1000)) / 2;
  return { teamA, teamB, avgA, avgB };
}

function suggestNextMatch() {
  const sessionPlayers = _liveSessionData?.sessionPlayers || [];
  if (sessionPlayers.length < 4) { showToast("Need 4+ players in session", "❌"); return; }
  const eloMap = _memoElo();
  const counts = {};
  sessionPlayers.forEach(p => counts[p] = 0);
  _sessionMatchHistory.forEach(m => {
    [...m.teamA, ...m.teamB].forEach(p => { if (p in counts) counts[p]++; });
  });
  const sorted = [...sessionPlayers].sort((a, b) => counts[a] - counts[b] || a.localeCompare(b));
  const pick4 = sorted.slice(0, 4);
  const suggestions = [
    _mkEloTeams(pick4, eloMap, false), // snake: best+worst vs 2nd+3rd
    sorted.length >= 8
      ? _mkEloTeams(sorted.slice(4, 8), eloMap, false) // next 4 players
      : _mkEloTeams(pick4, eloMap, true),               // alt pairing of same 4
  ];
  _showSuggestSheet(suggestions);
}

function _showSuggestSheet(suggestions) {
  const sheet = document.getElementById("suggest-sheet");
  const body = document.getElementById("suggest-sheet-body");
  if (!sheet || !body) return;
  body.innerHTML = suggestions.map((s, i) => {
    const diff = Math.abs(s.avgA - s.avgB).toFixed(0);
    return `<div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:12px;margin-bottom:10px">
      <div style="font-size:9px;font-weight:800;letter-spacing:0.1em;color:var(--muted);margin-bottom:8px">GAME ${i + 1}</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <div style="flex:1;text-align:center">
          <div style="font-size:13px;font-weight:800">${escHtml(s.teamA[0])}</div>
          <div style="font-size:11px;color:var(--muted)">${escHtml(s.teamA[1])}</div>
          <div style="font-size:8px;color:var(--accent);margin-top:3px">${Math.round(s.avgA)} avg</div>
        </div>
        <div style="font-size:13px;font-weight:900;color:var(--muted)">VS</div>
        <div style="flex:1;text-align:center">
          <div style="font-size:13px;font-weight:800">${escHtml(s.teamB[0])}</div>
          <div style="font-size:11px;color:var(--muted)">${escHtml(s.teamB[1])}</div>
          <div style="font-size:8px;color:var(--accent);margin-top:3px">${Math.round(s.avgB)} avg</div>
        </div>
      </div>
      ${diff > 30 ? `<div style="font-size:8px;color:var(--gold);text-align:center;margin-bottom:8px">Δ${diff} ELO gap</div>` : ""}
      <button onclick="window._applySuggestion(${i})" style="width:100%;padding:8px;background:var(--accent);color:#000;font-size:11px;font-weight:900;border:none;border-radius:6px;cursor:pointer">▶ PLAY THIS</button>
    </div>`;
  }).join("");
  window._matchSuggestions = suggestions;
  document.getElementById("suggest-sheet-overlay").style.display = "block";
  sheet.classList.add("live-sheet-open");
}

function _closeSuggestSheet() {
  document.getElementById("suggest-sheet")?.classList.remove("live-sheet-open");
  const ov = document.getElementById("suggest-sheet-overlay");
  if (ov) ov.style.display = "none";
}
window._closeSuggestSheet = _closeSuggestSheet;

window._applySuggestion = function(idx) {
  const s = window._matchSuggestions?.[idx];
  if (!s) return;
  _liveSlots.a1 = s.teamA[0]; _liveSlots.a2 = s.teamA[1];
  _liveSlots.b1 = s.teamB[0]; _liveSlots.b2 = s.teamB[1];
  _liveScoreA = 0; _liveScoreB = 0;
  _liveGamePtsA = 0; _liveGamePtsB = 0;
  _liveAdv = null; _liveMatchEnded = false;
  _livePoints = []; _livePointUndoStack = [];
  ["a1","a2","b1","b2"].forEach(sl => _renderLiveSlot(sl));
  _updateLiveDisplay(); _liveSyncGameDisplay(); _updateLiveWinProb(); _updateLiveEloPreview(); _updateLiveMomentum();
  _renderSittingOut(); _checkRematchWarning();
  _closeSuggestSheet();
};

// ── UNDO LAST SESSION MATCH ──────────────────────────────────
function undoSessionMatch() {
  if (!_sessionPendingCount) { showToast("Nothing to undo — all matches are synced", "🔒"); return; }
  if (!_sessionMatchHistory.length) { showToast("No match to undo", "❌"); return; }
  const last = _sessionMatchHistory[_sessionMatchHistory.length - 1];
  // Show confirmation sheet with match details
  const body = document.getElementById("undo-confirm-body");
  if (body) {
    body.innerHTML = `
      <div style="margin:6px 0 14px;font-size:13px;font-weight:800">
        ${escHtml(last.teamA.join(" & "))}
        <span style="color:var(--muted);font-weight:700;margin:0 8px">${last.scoreA}–${last.scoreB}</span>
        ${escHtml(last.teamB.join(" & "))}
      </div>
      <div style="font-size:10px;color:var(--muted)">${last.date || ""}</div>`;
  }
  document.getElementById("undo-confirm-overlay")?.style.setProperty("display", "block");
  document.getElementById("undo-confirm-sheet")?.classList.add("live-sheet-open");
}

function closeUndoConfirmSheet() {
  document.getElementById("undo-confirm-overlay")?.style.setProperty("display", "none");
  document.getElementById("undo-confirm-sheet")?.classList.remove("live-sheet-open");
}

function confirmUndoSession() {
  closeUndoConfirmSheet();
  if (!_sessionMatchHistory.length) return;
  const last = _sessionMatchHistory[_sessionMatchHistory.length - 1];
  const key = _mkMatchKey(last);
  const idx = allMatches.findIndex(m => _mkMatchKey(m) === key);
  if (idx !== -1) allMatches.splice(idx, 1);
  _sessionMatchHistory.pop();
  _sessionRedoStack.push(last);
  if (_sessionPendingCount > 0) _sessionPendingCount--;
  _updateSyncBadge();
  _liveSlots.a1 = last.teamA[0]; _liveSlots.a2 = last.teamA[1];
  _liveSlots.b1 = last.teamB[0]; _liveSlots.b2 = last.teamB[1];
  ["a1","a2","b1","b2"].forEach(s => _renderLiveSlot(s));
  _updateLiveDisplay(); _liveSyncGameDisplay(); _updateLiveWinProb(); _updateLiveEloPreview(); _updateLiveMomentum();
  _syncLiveSessionBar();
  if (_sessionPanelOpen) _updateSessionPanel();
  _renderSittingOut();
  _checkRematchWarning();
  document.getElementById("live-undo-match-btn")?.style.setProperty("display", _sessionPendingCount > 0 ? "" : "none");
  document.getElementById("live-redo-match-btn")?.style.setProperty("display", _sessionRedoStack.length > 0 ? "" : "none");
  _invalidateEloMemo();
  _saveSessionState();
  renderHome(); renderCompact(); renderModernMatches();
  showToast("Last match undone ↶", "✅");
}

// ── REDO LAST UNDONE SESSION MATCH ───────────────────────────
function redoSessionMatch() {
  if (!_sessionRedoStack.length) { showToast("Nothing to redo", "❌"); return; }
  const match = _sessionRedoStack.pop();
  allMatches.push({ ...match });
  _sessionMatchHistory.push(match);
  _sessionPendingCount++;
  _updateSyncBadge();
  _liveSlots.a1 = match.teamA[0]; _liveSlots.a2 = match.teamA[1];
  _liveSlots.b1 = match.teamB[0]; _liveSlots.b2 = match.teamB[1];
  ["a1","a2","b1","b2"].forEach(s => _renderLiveSlot(s));
  _updateLiveDisplay(); _liveSyncGameDisplay(); _updateLiveWinProb(); _updateLiveEloPreview(); _updateLiveMomentum();
  _syncLiveSessionBar();
  if (_sessionPanelOpen) _updateSessionPanel();
  _renderSittingOut();
  _checkRematchWarning();
  document.getElementById("live-undo-match-btn")?.style.setProperty("display", "");
  document.getElementById("live-redo-match-btn")?.style.setProperty("display", _sessionRedoStack.length > 0 ? "" : "none");
  _invalidateEloMemo();
  _saveSessionState();
  renderHome(); renderCompact(); renderModernMatches();
  showToast("Match redone ↷", "✅");
}

// ── SAVE + REMATCH ───────────────────────────────────────────
function saveAndRematch() {
  confirmSaveMatch();
  // endLiveMatch() pushed to _sessionMatchHistory — restore those players
  if (_sessionMatchHistory.length > 0) {
    const last = _sessionMatchHistory[_sessionMatchHistory.length - 1];
    _liveSlots.a1 = last.teamA[0]; _liveSlots.a2 = last.teamA[1];
    _liveSlots.b1 = last.teamB[0]; _liveSlots.b2 = last.teamB[1];
    ["a1","a2","b1","b2"].forEach(s => _renderLiveSlot(s));
    _updateLiveDisplay(); _liveSyncGameDisplay(); _updateLiveWinProb(); _updateLiveEloPreview(); _updateLiveMomentum();
    _renderSittingOut();
    _checkRematchWarning();
  }
}

// ── SESSION SUMMARY SHEET ────────────────────────────────────
function openSessionSummary() {
  if (!_liveSessionData?.sessionActive) return;
  const sessionPlayers = _liveSessionData.sessionPlayers || [];
  const elapsed = _liveSessionData.sessionStartedAt
    ? Math.floor((Date.now() - new Date(_liveSessionData.sessionStartedAt).getTime()) / 1000) : 0;
  const h = Math.floor(elapsed / 3600);
  const m2 = Math.floor((elapsed % 3600) / 60);
  const dur = elapsed < 60 ? `<1m` : h > 0 ? `${h}h ${m2}m` : `${m2}m`;
  const stats = {};
  sessionPlayers.forEach(p => stats[p] = { w: 0, l: 0 });
  _sessionMatchHistory.forEach(mt => {
    const aWon = mt.scoreA > mt.scoreB;
    (aWon ? mt.teamA : mt.teamB).forEach(p => { if (stats[p]) stats[p].w++; });
    (aWon ? mt.teamB : mt.teamA).forEach(p => { if (stats[p]) stats[p].l++; });
  });
  const sorted = Object.entries(stats).sort((a, b) => b[1].w - a[1].w || a[1].l - b[1].l);
  const mvp = sorted[0];
  const playersHtml = sorted.map(([name, s]) =>
    `<div class="sess-sum-player">${sheetAvSm(name)}<span class="sess-sum-pname">${escHtml(name)}</span><span class="sess-sum-wl">${s.w}W–${s.l}L</span></div>`
  ).join('');
  const matchesHtml = _sessionMatchHistory.length === 0
    ? '<div style="font-size:11px;color:var(--muted);padding:8px 0">No matches played</div>'
    : _sessionMatchHistory.map((mt, i) => {
        const aWon = mt.scoreA > mt.scoreB;
        return `<div class="sess-sum-match">
          <div class="sess-sum-match-num">${i + 1}</div>
          <div class="sess-sum-match-teams">${escHtml(mt.teamA.join(' & '))} <span class="sess-sum-vs">vs</span> ${escHtml(mt.teamB.join(' & '))}</div>
          <div class="sess-sum-match-score" style="color:${aWon ? 'var(--green)' : 'var(--red)'}">${mt.scoreA}–${mt.scoreB}</div>
        </div>`;
      }).join('');
  const bodyEl = document.getElementById("session-summary-body");
  if (bodyEl) bodyEl.innerHTML = `
    <div class="sess-sum-meta">
      <div class="sess-sum-stat"><div class="sess-sum-val">${_sessionMatchHistory.length}</div><div class="sess-sum-lbl">MATCHES</div></div>
      <div class="sess-sum-stat"><div class="sess-sum-val">${dur}</div><div class="sess-sum-lbl">DURATION</div></div>
      ${mvp ? `<div class="sess-sum-stat"><div class="sess-sum-val">${escHtml(mvp[0].split(' ')[0])}</div><div class="sess-sum-lbl">MVP · ${mvp[1].w}W</div></div>` : ''}
    </div>
    <div class="sess-sum-section-title">PLAYERS</div>
    <div class="sess-sum-players">${playersHtml}</div>
    <div class="sess-sum-section-title">MATCHES</div>
    <div class="sess-sum-matches">${matchesHtml}</div>`;
  document.getElementById("session-summary-overlay")?.classList.add("live-sheet-open");
  document.getElementById("session-summary-sheet")?.classList.add("live-sheet-open");
}

function closeSessionSummary() {
  document.getElementById("session-summary-overlay")?.classList.remove("live-sheet-open");
  document.getElementById("session-summary-sheet")?.classList.remove("live-sheet-open");
}

async function confirmEndSession() {
  closeSessionSummary();
  _stopSessionTimer();
  if (_sessionPendingCount > 0) {
    await saveCloudData();
    _sessionPendingCount = 0;
    _updateSyncBadge();
  }
  _liveSessionData = null;
  _sessionMatchHistory = [];
  _sessionRedoStack = [];
  _sessionPanelOpen = false;
  _clearSessionState(); // Enhancement 13: clear persisted session
  _syncLiveSessionBar();
  _renderSessionActiveCard();
  _liveHaptic([30, 60, 30]);
  _notifyLiveEvent("session_end", "Session ended");
  _showLiveEventBanner({ type: "session_end", msg: "Session ended" });
  switchMainTab("compact");
}

// ── SESSION ──────────────────────────────────────────────────
let _liveSessionData = null;
let _sessionSetupSelected = new Set();

function _syncLiveSessionBar() {
  const d = _liveSessionData;
  const active = !!d?.sessionActive;
  const sessionBar = document.getElementById("live-session-bar");
  const startBar = document.getElementById("live-start-session-bar");
  if (sessionBar) sessionBar.style.display = active ? "" : "none";
  if (startBar) startBar.style.display = active ? "none" : "";
  if (active) {
    const chipsEl = document.getElementById("live-session-players");
    if (chipsEl) {
      const counts = {};
      (d.sessionPlayers || []).forEach(p => counts[p] = 0);
      _sessionMatchHistory.forEach(m => {
        [...m.teamA, ...m.teamB].forEach(p => { if (p in counts) counts[p]++; });
      });
      chipsEl.innerHTML = (d.sessionPlayers || []).map(p =>
        `<span class="live-session-chip">${escHtml(p.split(" ")[0])}${counts[p] > 0 ? `<span class="sess-chip-count"> ×${counts[p]}</span>` : ''}</span>`
      ).join("");
    }
  }
}

function openSessionSetup() {
  const players = getAllPlayerNamesFromMatches();
  _sessionSetupSelected = new Set();
  const list = document.getElementById("session-setup-list");
  if (!list) return;
  list.innerHTML = players.map(p => `
    <label class="tb-player-chip">
      <input type="checkbox" onchange="window._sspToggle(${jsArg(p)}, this.checked)">
      <span class="tb-chip-name">${escHtml(p)}</span>
    </label>`).join("");
  document.getElementById("session-setup-overlay")?.classList.add("live-sheet-open");
  document.getElementById("session-setup-sheet")?.classList.add("live-sheet-open");
}

window._sspToggle = function(name, checked) {
  if (checked) _sessionSetupSelected.add(name);
  else _sessionSetupSelected.delete(name);
};

function sessionSetupSelectAll() {
  _sessionSetupSelected = new Set(getAllPlayerNamesFromMatches());
  document.querySelectorAll("#session-setup-list input[type=checkbox]").forEach(cb => { cb.checked = true; });
}

function sessionSetupSelectNone() {
  _sessionSetupSelected = new Set();
  document.querySelectorAll("#session-setup-list input[type=checkbox]").forEach(cb => { cb.checked = false; });
}

function closeSessionSetup() {
  document.getElementById("session-setup-overlay")?.classList.remove("live-sheet-open");
  document.getElementById("session-setup-sheet")?.classList.remove("live-sheet-open");
}

// Enhancement 13: session pause/resume via localStorage
const _SESSION_SAVE_KEY = "padel_session_state";
function _saveSessionState() {
  try {
    if (!_liveSessionData?.sessionActive) return;
    localStorage.setItem(_SESSION_SAVE_KEY, JSON.stringify({
      session: _liveSessionData,
      history: _sessionMatchHistory,
      pendingCount: _sessionPendingCount,
      redoStack: _sessionRedoStack,
      savedAt: new Date().toISOString(),
    }));
  } catch (e) {}
}

// Re-attach locally-buffered matches (in padel_matches) that aren't yet in allMatches (cloud data).
// Called after restoring a session on page load/refresh.
function _reattachPendingMatches() {
  try {
    const localRaw = localStorage.getItem("padel_matches");
    if (!localRaw) return;
    const localMatches = JSON.parse(localRaw);
    const cloudKeys = new Set(allMatches.map(_mkMatchKey));
    const pending = localMatches.filter(m => !cloudKeys.has(_mkMatchKey(m)));
    if (!pending.length) { _sessionPendingCount = 0; return; }
    allMatches = [...allMatches, ...pending].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    _sessionPendingCount = pending.length;
    _invalidateEloMemo();
    if (window.appCache) window.appCache.save(allMatches, players, playerAliasMap, nextPlayerId);
  } catch (e) {}
}
function _clearSessionState() {
  try { localStorage.removeItem(_SESSION_SAVE_KEY); } catch (e) {}
}
function _renderSessionActiveCard() {
  const wrap = document.getElementById("session-active-wrap");
  if (!wrap) return;
  if (!_liveSessionData?.sessionActive) {
    wrap.innerHTML = "";
    return;
  }
  const players = (_liveSessionData.sessionPlayers || []).join(", ") || "—";
  const matchCount = _sessionMatchHistory.length;
  const startedAt = _liveSessionData.sessionStartedAt;
  let durationStr = "";
  if (startedAt) {
    const mins = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
    durationStr = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }
  wrap.innerHTML = `<div class="session-active-card" onclick="switchMainTab('live')">
    <div class="sac-pulse"></div>
    <div class="sac-body">
      <div class="sac-title"><span class="sac-dot"></span>SESSION ACTIVE</div>
      <div class="sac-players">${escHtml(players)}</div>
      <div class="sac-meta">
        <span>${matchCount} match${matchCount !== 1 ? "es" : ""} played</span>
        ${durationStr ? `<span>· ${durationStr}</span>` : ""}
        <span class="sac-go">Go to Session →</span>
      </div>
    </div>
  </div>`;
}

function checkResumeSession() {
  try {
    const saved = localStorage.getItem(_SESSION_SAVE_KEY);
    if (!saved) return;
    const { session, history, pendingCount, redoStack } = JSON.parse(saved);
    if (!session?.sessionActive) return;
    _liveSessionData = session;
    _sessionMatchHistory = history || [];
    _sessionRedoStack = redoStack || [];
    _sessionPendingCount = pendingCount || 0;
    if (_sessionPendingCount > 0) _reattachPendingMatches();
    _sessionPanelOpen = false;
    _syncLiveSessionBar();
    _updateSyncBadge();
    _startSessionTimer();
    _renderSessionActiveCard();
    document.getElementById("live-undo-match-btn")?.style.setProperty("display", _sessionPendingCount > 0 ? "" : "none");
    document.getElementById("live-redo-match-btn")?.style.setProperty("display", _sessionRedoStack.length > 0 ? "" : "none");
  } catch (e) {}
}
function resumeSession() {
  try {
    const saved = localStorage.getItem(_SESSION_SAVE_KEY);
    if (!saved) return;
    const { session, history, pendingCount, redoStack } = JSON.parse(saved);
    _liveSessionData = session;
    _sessionMatchHistory = history || [];
    _sessionRedoStack = redoStack || [];
    _sessionPendingCount = pendingCount || 0;
    if (_sessionPendingCount > 0) _reattachPendingMatches();
    _sessionPanelOpen = false;
    _syncLiveSessionBar();
    _updateSyncBadge();
    _startSessionTimer();
    _renderSessionActiveCard();
    document.getElementById("live-undo-match-btn")?.style.setProperty("display", _sessionPendingCount > 0 ? "" : "none");
    document.getElementById("live-redo-match-btn")?.style.setProperty("display", _sessionRedoStack.length > 0 ? "" : "none");
    showToast("Session resumed!", "✅");
  } catch (e) { showToast("Could not resume session", "❌"); }
}
function discardResumeSession() {
  _clearSessionState();
  _renderSessionActiveCard();
}

function confirmSessionStart() {
  const players = [..._sessionSetupSelected];
  if (players.length < 2) { showToast("Select at least 2 players", "❌"); return; }
  closeSessionSetup();
  const now = new Date().toISOString();
  _liveSessionData = { sessionActive: true, sessionPlayers: players, sessionStartedAt: now, currentMatch: null };
  _sessionPendingCount = 0;
  _sessionMatchHistory = [];
  _sessionRedoStack = [];
  _sessionPanelOpen = false;
  _updateSyncBadge();
  _syncLiveSessionBar();
  _startSessionTimer();
  _saveSessionState();
  _renderSessionActiveCard();
  _liveHaptic([20, 50, 20]);
  _notifyLiveEvent("session_start", `Session started · ${players.length} players`);
  _showLiveEventBanner({ type: "session_start", msg: `Session started · ${players.length} players` });
  _requestNotifPermission();
}

async function endLiveSession() {
  openSessionSummary();
}

function openAddPlayerSheet() {
  const list = document.getElementById("add-player-list");
  if (!list) return;
  const current = _liveSessionData?.sessionPlayers || [];
  const available = Object.keys(aliasMap).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })).filter(p => !current.includes(p));
  if (!available.length) { showToast("All players already in session", "✅"); return; }
  list.innerHTML = available.map(p => `
    <button class="live-sheet-item" onclick="addPlayerToSession(${jsArg(p)})">
      ${sheetAv(p)}
      <span class="live-sheet-item-name">${escHtml(p)}</span>
    </button>`).join("");
  document.getElementById("add-player-overlay")?.classList.add("live-sheet-open");
  document.getElementById("add-player-sheet")?.classList.add("live-sheet-open");
}

function closeAddPlayerSheet() {
  document.getElementById("add-player-overlay")?.classList.remove("live-sheet-open");
  document.getElementById("add-player-sheet")?.classList.remove("live-sheet-open");
}

function addPlayerToSession(name) {
  closeAddPlayerSheet();
  const players = [...(_liveSessionData?.sessionPlayers || [])];
  if (players.includes(name)) return;
  players.push(name);
  _liveSessionData = { ..._liveSessionData, sessionPlayers: players };
  _syncLiveSessionBar();
  _renderSittingOut();
  _saveSessionState();
  showToast(`${name} added`, "✅");
}

function _notifyLiveEvent(type, msg) {
  const isEnd = type === "match_end" || type === "session_end";
  _liveHaptic(isEnd ? [30, 60, 30] : [15, 30, 15]);
  const icons = { session_start: "🎾", session_end: "🏁", match_start: "▶️", match_end: "✅", player_added: "➕" };
  showToast(msg, icons[type] || "🎾", 3500);
  if (document.visibilityState !== "visible" && "Notification" in window && Notification.permission === "granted") {
    try { new Notification("Ekta Padel 🎾", { body: msg, icon: "/icons/icon.svg" }); } catch (e) {}
  }
}

function _requestNotifPermission() {
  if (!("Notification" in window) || Notification.permission !== "default") return;
  Notification.requestPermission().catch(() => {});
}

// ── MATCH CONFIRM SHEET ────────────────────────────────────
// ── DUPLICATE MATCH CONFIRM SHEET ────────────────────────────
// ── PLAYER CRUD ──────────────────────────────────────────────
let _editingPlayerId = null;

function openPlayerEditSheet(id) {
  _editingPlayerId = id || null;
  const isNew = !id;
  const p = isNew ? { name: "", email: "", isGuest: false } : (players[id] || {});
  const aliases = isNew ? [] : (playerAliasMap[id] || []);
  const { first, last } = isNew ? { first: null, last: null } : getPlayerDateRange(p.name);

  document.getElementById("pes-title").textContent = isNew ? "ADD PLAYER" : "EDIT PLAYER";
  document.getElementById("pes-name").value = p.name || "";
  document.getElementById("pes-aliases").value = aliases.join(", ");
  document.getElementById("pes-email").value = p.email || "";
  document.getElementById("pes-guest").checked = !!p.isGuest;
  document.getElementById("pes-first").textContent = first ? fmtDate(first) : "—";
  document.getElementById("pes-last").textContent = last ? fmtDate(last) : "—";
  document.getElementById("pes-delete-btn").style.display = isNew ? "none" : "block";

  document.getElementById("player-edit-overlay").classList.add("live-sheet-open");
  document.getElementById("player-edit-sheet").classList.add("live-sheet-open");
  setTimeout(() => document.getElementById("pes-name").focus(), 120);
}
window.openPlayerEditSheet = openPlayerEditSheet;

function closePlayerEditSheet() {
  document.getElementById("player-edit-overlay").classList.remove("live-sheet-open");
  document.getElementById("player-edit-sheet").classList.remove("live-sheet-open");
  _editingPlayerId = null;
}
window.closePlayerEditSheet = closePlayerEditSheet;

function savePlayerEdit() {
  const name = document.getElementById("pes-name").value.trim();
  const aliasesRaw = document.getElementById("pes-aliases").value.trim();
  const email = document.getElementById("pes-email").value.trim();
  const isGuest = document.getElementById("pes-guest").checked;

  if (!name) { alert("Display name is required"); return; }

  const aliases = aliasesRaw
    ? aliasesRaw.split(",").map((a) => a.trim()).filter(Boolean)
    : [];

  const id = _editingPlayerId || nextPlayerId++;
  const existing = players[id] || {};
  players[id] = { ...existing, id, name, email, isGuest };
  playerAliasMap[id] = aliases;
  rebuildNameMaps();
  saveCloudData();
  closePlayerEditSheet();
  renderNamesTable();
}
window.savePlayerEdit = savePlayerEdit;

function deletePlayerEntry() {
  if (!_editingPlayerId) return;
  const p = players[_editingPlayerId];
  if (!confirm(`Delete player "${p?.name}"?`)) return;
  delete players[_editingPlayerId];
  delete playerAliasMap[_editingPlayerId];
  rebuildNameMaps();
  saveCloudData();
  closePlayerEditSheet();
  renderNamesTable();
}
window.deletePlayerEntry = deletePlayerEntry;

let _dupConfirmCallback = null;
function showDupConfirmSheet(msg, onYes) {
  _dupConfirmCallback = onYes;
  const msgEl = document.getElementById("dup-confirm-msg");
  if (msgEl) msgEl.textContent = msg;
  const yesBtn = document.getElementById("dup-confirm-yes");
  if (yesBtn) {
    yesBtn.onclick = () => {
      const cb = _dupConfirmCallback;
      closeDupConfirmSheet();
      if (typeof cb === "function") cb();
    };
  }
  document.getElementById("dup-confirm-overlay")?.classList.add("live-sheet-open");
  document.getElementById("dup-confirm-sheet")?.classList.add("live-sheet-open");
}
function closeDupConfirmSheet() {
  document.getElementById("dup-confirm-overlay")?.classList.remove("live-sheet-open");
  document.getElementById("dup-confirm-sheet")?.classList.remove("live-sheet-open");
  _dupConfirmCallback = null;
}
window.closeDupConfirmSheet = closeDupConfirmSheet;

function openMatchConfirmSheet() {
  const { a1, a2, b1, b2 } = _liveSlots;
  const el = document.getElementById("match-confirm-matchup");
  if (el) {
    el.innerHTML = `<div class="mcm-wrap">
      <div class="mcm-corner mcm-corner-a">
        <div class="mcm-label">RED CORNER</div>
        <div class="mcm-name">${escHtml(a1?.split(" ")[0] || "—")}</div>
        <div class="mcm-name">${escHtml(a2?.split(" ")[0] || "—")}</div>
      </div>
      <div class="mcm-vs">VS</div>
      <div class="mcm-corner mcm-corner-b">
        <div class="mcm-label">BLUE CORNER</div>
        <div class="mcm-name">${escHtml(b1?.split(" ")[0] || "—")}</div>
        <div class="mcm-name">${escHtml(b2?.split(" ")[0] || "—")}</div>
      </div>
    </div>`;
  }
  document.getElementById("match-confirm-overlay")?.classList.add("live-sheet-open");
  document.getElementById("match-confirm-sheet")?.classList.add("live-sheet-open");
}

function closeMatchConfirmSheet() {
  document.getElementById("match-confirm-overlay")?.classList.remove("live-sheet-open");
  document.getElementById("match-confirm-sheet")?.classList.remove("live-sheet-open");
}

function confirmStartMatch() {
  closeMatchConfirmSheet();
}

// ── MATCH SAVE SHEET (race-to-N prompt) ───────────────────
function openMatchSaveSheet() {
  const el = document.getElementById("match-save-result");
  const { a1, a2, b1, b2 } = _liveSlots;
  if (el) {
    const aWon = _liveScoreA > _liveScoreB;
    const winner = aWon
      ? `${a1?.split(" ")[0] || "?"} & ${a2?.split(" ")[0] || "?"}`
      : `${b1?.split(" ")[0] || "?"} & ${b2?.split(" ")[0] || "?"}`;
    el.innerHTML = `<div class="msr-result">
      <div class="msr-score">${_liveScoreA} — ${_liveScoreB}</div>
      <div class="msr-winner">🏆 ${escHtml(winner)}</div>
    </div>`;
  }
  const rematchBtn = document.getElementById("live-save-rematch-btn");
  if (rematchBtn) rematchBtn.style.display = _liveSessionData?.sessionActive ? "" : "none";
  document.getElementById("match-save-overlay")?.classList.add("live-sheet-open");
  document.getElementById("match-save-sheet")?.classList.add("live-sheet-open");
}

function closeMatchSaveSheet() {
  document.getElementById("match-save-overlay")?.classList.remove("live-sheet-open");
  document.getElementById("match-save-sheet")?.classList.remove("live-sheet-open");
}

function confirmSaveMatch() {
  closeMatchSaveSheet();
  endLiveMatch();
}

function keepPlayingMatch() {
  closeMatchSaveSheet();
  _liveMatchEnded = false;
  showToast("Keep playing!", "🎾");
}

// ── LIVE BANNER (full-page, session/match events) ─────────
let _liveBannerTimer = null;

function showLiveBanner(type, title, subtitle, data) {
  const el = document.getElementById("live-banner-overlay");
  if (!el) return;
  clearTimeout(_liveBannerTimer);
  el.className = `live-banner-overlay live-banner-${type}`;
  el.innerHTML = _buildBannerContent(type, title, subtitle, data);
  el.style.display = "flex";
  _liveBannerTimer = setTimeout(() => closeLiveBanner(), 3000);
}

function _buildBannerContent(type, title, subtitle, data) {
  if ((type === "match_start" || type === "match_end_ufc") && data?.teamA) {
    const { teamA, teamB, scoreA, scoreB } = data;
    const isEnd = type === "match_end_ufc";
    const aWon = isEnd ? scoreA > scoreB : null;
    const aAvatars = teamA.map(p => `<div class="lbf-avatar" style="background:${playerColor(p)}">${playerInitials(p)}</div>`).join("");
    const bAvatars = teamB.map(p => `<div class="lbf-avatar" style="background:${playerColor(p)}">${playerInitials(p)}</div>`).join("");
    return `<div class="live-banner-ufc">
      <div class="live-banner-corner-a${isEnd && !aWon ? " live-banner-corner-dim" : ""}">
        <div class="live-banner-corner-label">RED CORNER</div>
        <div class="lbf-avatars">${aAvatars}</div>
        ${teamA.map(p => `<div class="live-banner-player">${escHtml(p.split(" ")[0])}</div>`).join("")}
        ${isEnd ? `<div class="live-banner-corner-score${aWon ? " lbf-score-win" : " lbf-score-lose"}">${scoreA}</div>` : ""}
        ${isEnd && aWon ? `<div class="lbf-trophy">🏆</div>` : ""}
      </div>
      <div class="live-banner-vs-col">
        <div class="lbf-event-top">${isEnd ? "FINAL" : "🎾"}</div>
        <div class="live-banner-vs-text">VS</div>
        <div class="live-banner-event-label">${isEnd ? `${scoreA}–${scoreB}` : "MATCH STARTING"}</div>
        <div class="live-banner-tap-inline">TAP TO CLOSE</div>
      </div>
      <div class="live-banner-corner-b${isEnd && aWon ? " live-banner-corner-dim" : ""}">
        <div class="live-banner-corner-label">BLUE CORNER</div>
        <div class="lbf-avatars">${bAvatars}</div>
        ${teamB.map(p => `<div class="live-banner-player">${escHtml(p.split(" ")[0])}</div>`).join("")}
        ${isEnd ? `<div class="live-banner-corner-score${!aWon ? " lbf-score-win" : " lbf-score-lose"}">${scoreB}</div>` : ""}
        ${isEnd && !aWon ? `<div class="lbf-trophy">🏆</div>` : ""}
      </div>
    </div>`;
  }
  const isStart = type === "session_start";
  return `<div class="live-banner-session live-banner-session-${type}">
    <div class="lbs-particles">${Array.from({length:12},(_,i)=>`<div class="lbs-particle lbs-p${i}"></div>`).join("")}</div>
    <div class="lbs-ring"></div>
    <div class="live-banner-icon-big">${isStart ? "🎾" : "🏁"}</div>
    <div class="live-banner-title">${escHtml(title)}</div>
    ${subtitle ? `<div class="live-banner-subtitle">${escHtml(subtitle)}</div>` : ""}
    <div class="live-banner-tap-inline">TAP TO CLOSE</div>
  </div>`;
}

function closeLiveBanner() {
  clearTimeout(_liveBannerTimer);
  const el = document.getElementById("live-banner-overlay");
  if (!el) return;
  el.classList.add("live-banner-out");
  setTimeout(() => {
    el.style.display = "none";
    el.classList.remove("live-banner-out");
  }, 350);
}

function _showLiveEventBanner(event) {
  const { type, msg } = event;
  const onLivePage = document.getElementById("pg-live")?.classList.contains("active");
  if (type === "match_start") {
    const cm = _liveSessionData?.currentMatch;
    if (cm?.teamA && !onLivePage) {
      showLiveBanner("match_start", "MATCH STARTING", msg, { teamA: cm.teamA, teamB: cm.teamB });
    }
    return;
  }
  if (type === "match_end") {
    if (!onLivePage && event.teamA) {
      showLiveBanner("match_end_ufc", "MATCH OVER", msg, { teamA: event.teamA, teamB: event.teamB, scoreA: event.scoreA, scoreB: event.scoreB });
    }
    return;
  }
  if (type === "session_start") {
    showLiveBanner("session_start", "SESSION STARTED!", msg);
    return;
  }
  if (type === "session_end") {
    showLiveBanner("session_end", "SESSION ENDED", msg);
    return;
  }
}


window.openMatchConfirmSheet = openMatchConfirmSheet;
window.closeMatchConfirmSheet = closeMatchConfirmSheet;
window.confirmStartMatch = confirmStartMatch;
window.openMatchSaveSheet = openMatchSaveSheet;
window.closeMatchSaveSheet = closeMatchSaveSheet;
window.confirmSaveMatch = confirmSaveMatch;
window.keepPlayingMatch = keepPlayingMatch;
window.showLiveBanner = showLiveBanner;
window.closeLiveBanner = closeLiveBanner;
