import {
  generateAmericano,
  americanoFairness,
  nextMexicanoRound,
  nextAmericanoRound,
} from "./src/engine/americano.js";
import {
  initEloDeps,
  computeElo,
  computeEloHistory,
  computeEloPeaks,
  computeEloLows,
  _lightFingerprint,
  clearEloCache,
} from "./src/engine/elo.js";
import { computeStats, _normScores, eloToSr } from "./src/engine/stats.js";
import { initParserDeps, parseBlock, parseDateHdr } from "./src/engine/parser.js";
import {
  escHtml,
  jsArg,
  toLocalISODate,
  fmtDate,
  playerColor,
  playerInitials,
  getSRRatingClass,
  _rankColor,
  _rankBg,
} from "./src/ui/format.js";
import { buildHudGaugeSvg } from "./src/ui/charts.js";
import { state } from "./src/engine/state.js";
import {
  todayISO,
  weekISO,
  weekendRange,
  monthISO,
  lastWeekRange,
} from "./src/engine/dates.js";
import {
  getAnaPillOrder,
  saveAnaPillOrder,
  getAnaFavs,
  saveAnaFavs,
  getAnaHidden,
  saveAnaHidden,
  getAnaOrder,
  saveAnaOrder,
  getAnaCollapsed,
  saveAnaCollapsed,
  hasAnaCollapsedPref,
} from "./src/infra/ana-prefs.js";
import { viewState } from "./src/ui/view-state.js";
import {
  emptyState,
  loadingState,
  errorState,
  badge,
  statRow,
  progressBar,
} from "./src/ui/components.js";
import {
  getAnimLevelRaw,
  resolveAnimLevel,
  setAnimLevelRaw,
  getSmoothMode,
  setSmoothMode,
  getBatterySaverPref,
  hasBatterySaverPref,
  setBatterySaver,
  getNotifEnabled,
  setNotifEnabled,
  getForcedOffline,
  setForcedOffline,
  getScreenshotAsk,
  setScreenshotAsk,
  getAnaHideEmpty,
  setAnaHideEmpty,
  getFontScale,
  setFontScale,
  FONT_SCALE_MIN,
  FONT_SCALE_MAX,
} from "./src/infra/app-prefs.js";
import {
  isFireMatch,
  isDominatingMatch,
  isZeroMatch,
  buildMatchRowHtml,
  buildCompactMatchRows,
  buildSummaryMatchRow,
  buildSummaryMatchRows,
} from "./src/ui/render-match-rows.js";
import {
  initSelectorsDeps,
  activeMatches,
  historyMatches,
  withoutGuestMatches,
  filterMatches,
  filterHistoryMatches,
  _activeSeason,
  _inSeason,
  _seasonMatchCount,
  invalidateAmMemo,
} from "./src/engine/selectors.js";
import {
  initHistorySummaryDeps,
  buildHistorySummary,
} from "./src/ui/render-history-summary.js";
import { initBadgesDeps, computeBadges } from "./src/engine/badges.js";
import {
  initPairsDeps,
  getPairKey,
  getPairStats,
  getHeadToHeadStats,
  pairInMatch,
  playersOpposed,
} from "./src/engine/pairs.js";
import {
  initXpDeps,
  xpThreshold,
  getPlayerLevel,
  getPrestigeTier,
  computePlayerXP,
} from "./src/engine/xp.js";
import {
  initPlayerAnalyticsDeps,
  computeAchievements,
  computeArchetype,
  computePlayerForm,
  computePowerRankings,
  computeChemistryScores,
  computeMatchStories,
  computeAnalyticsPageData,
  computePartnerOpponentMatrix,
} from "./src/engine/player-analytics.js";
import {
  morphList,
  animateGauges,
  animateXpRow,
  animateSrVal,
  _sweepNeedle,
  runSpeedometerSweep,
} from "./src/ui/render-anim.js";
import {
  db,
  auth,
  provider,
  doc,
  setDoc,
  onSnapshot,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
} from "./src/infra/cloud/firebase.js";
import {
  _buildLeaderboardReplayHtml,
  _replayUpdate,
  _replayStep,
  _replayJumpToMatch,
  _replayJumpToDate,
  _replaySetSpeed,
  _replayToggleLoop,
  _replayToggleReverse,
  _replaySetSpotlight,
  _replayPlay,
  _replayReset,
} from "./features/replay.js";

// ── New architecture modules ───────────────────────────────────
import {
  normPlayer as _normPlayer,
  rebuildNameMaps as _rebuildNameMaps,
  migrateAliasMapToPlayers,
  getAllPlayerNames as _getAllPlayerNames,
  sortPlayersGuestsLast,
  normalizedScoreline,
  sameMatch,
  getPlayerDateRange as _getPlayerDateRange,
} from "./src/domain/players.js";
import {
  historyFilters,
  homeFilters,
  compactFilters,
  renderGen,
  homeFilterKey,
  compactFilterKey,
  historyFilterKey,
  historyActiveFilterCount,
} from "./src/app/filter-state.js";
import {
  init as initCloudRepo,
  saveCloudData as _cloudRepoSave,
  loadCloudData as _cloudRepoLoad,
  trySyncNow as _cloudRepoSync,
  buildCloudPayload,
  setPendingSync,
  hasPendingSync,
  scheduleDocSizeCheck,
  getLastLocalSaveTime,
  checkDocSize as _checkDocSize,
} from "./src/app/cloud-repo.js";
import {
  initMemoStoreDeps,
  memoElo,
  memoEloHistory,
  memoEloPeaks,
  memoEloLows,
  memoStats,
  memoStatPlayerNames,
  memoPairStats,
  invalidateAll as _invalidateAllMemos,
  reignCache as _reignCache,
  rankPeriodCache as _rankPeriodCache,
} from "./src/app/memo-store.js";
import {
  loadDeletedMatches,
  saveDeletedMatches as _saveDeletedMatches,
  loadEloConfig,
  saveEloConfig,
  getEloDecayParams,
  loadSeasonsLocal,
  saveSeasonsLocal,
  loadPhotosLocal,
  savePhotosLocal,
} from "./src/infra/match-store.js";
import {
  sessionState,
  liveScore,
  americanoState,
  resetSessionState,
  resetLiveScore,
  resetAmericanoState,
} from "./src/app/session-state.js";

// ── BACKWARD-COMPAT BRIDGES ──────────────────────────────────
// Internal functions that have been extracted to domain/app modules.
// The thin wrappers below keep every existing call site in app.js working
// without touching its 500 call sites — each line is a single indirection
// that the JS engine inlines at steady state.
//
// Naming convention:
//   Functions moved to src/domain/players.js    → delegate via _normPlayer etc.
//   Functions moved to src/infra/match-store.js → now imported directly above.
//   Functions moved to src/app/memo-store.js    → delegate via memoElo etc.
//   Functions moved to src/app/cloud-repo.js    → delegate via _cloudRepo*.
//
// These wrappers exist ONLY for the transition period. When app.js is further
// split into page modules (see ARCHITECTURE.md roadmap), each page module will
// import from the canonical source directly and the wrappers can be removed.

function normPlayer(name)                   { return _normPlayer(name); }
function rebuildNameMaps()                  { return _rebuildNameMaps(state.players, playerAliasMap); }
function getAllPlayerNamesFromMatches()      { return _getAllPlayerNames(state.matches); }
function _memoElo(decay = false)            { return memoElo(decay); }
function _memoEloHistory()                  { return memoEloHistory(); }
function _memoEloPeaks()                    { return memoEloPeaks(); }
function _memoEloLows()                     { return memoEloLows(); }
function _memoStats()                       { return memoStats(); }
function _statPlayerNames()                 { return memoStatPlayerNames(); }
function _memoPairStats()                   { return memoPairStats(); }
function saveCloudData(opts) { return _cloudRepoSave(opts); }
// NOTE: saveCloudData is reassigned ~1150 lines below once _lastLocalSaveTime
// and _invalidateEloMemo are available. That version is the one callers use.
function _trySyncNow()                      { return _cloudRepoSync(); }
function _setPendingSync(flag)              { return setPendingSync(flag); }
function _hasPendingSync()                  { return hasPendingSync(); }

// Filter-state bridges: keep old bare variable names working.
// app.js accesses these as mutable variables; reading through getters is
// equivalent. The setters at each mutation site already update the filter
// objects in filter-state.js. Remaining direct reads use the bridged getters.
function _homeFilterKey()    { return homeFilterKey(); }
function _compactFilterKey() { return compactFilterKey(); }

// Firebase init + db/auth/provider singletons live in src/infra/cloud/firebase.js
// (imported at top). ADMIN_EMAIL + the Drive token stay here as app state.
const ADMIN_EMAIL = "ankit.konchady@gmail.com";
let _driveAccessToken = null; // set on sign-in, cleared on sign-out

// ── ON-DEMAND EXTERNAL LIBS ───────────────────────────────
// html2canvas (~150 KB) and emailjs are only needed for occasional admin
// actions (screenshots, backup email). Loading them lazily keeps them off the
// critical path for every viewer; the call sites await _ensure* before use.
const _scriptPromises = {};
function _loadScript(src) {
  if (_scriptPromises[src]) return _scriptPromises[src];
  _scriptPromises[src] = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => {
      delete _scriptPromises[src]; // allow a later retry
      reject(new Error("Failed to load " + src));
    };
    document.head.appendChild(s);
  });
  return _scriptPromises[src];
}
async function _ensureHtml2Canvas() {
  if (window.html2canvas) return true;
  try {
    await _loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
    );
  } catch (e) {
    return false;
  }
  return !!window.html2canvas;
}
async function _ensureEmailjs() {
  if (typeof emailjs !== "undefined") return true;
  try {
    await _loadScript(
      "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js",
    );
  } catch (e) {
    return false;
  }
  return typeof emailjs !== "undefined";
}

// ── ERROR-LOG FIRESTORE MIRROR ────────────────────────────
// utils.js captures uncaught errors into a localStorage ring buffer; here we
// best-effort mirror them to errors/{clientId} so real-world breakage on any
// device reaches the maintainer. Per-device doc = no cross-client clobbering.
// Fire-and-forget; silently no-ops if security rules disallow the write.
function _clientId() {
  let id = null;
  try {
    id = localStorage.getItem("padel_client_id");
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("padel_client_id", id);
    }
  } catch (e) {}
  return id || "anon";
}
let _errFlushT = null;
function _flushErrorLog() {
  try {
    const log = (window.getErrorLog && window.getErrorLog()) || [];
    if (!log.length) return;
    setDoc(doc(db, "errors", _clientId()), {
      entries: log.slice(-50),
      email: (window.isAdmin && ADMIN_EMAIL) || (auth.currentUser?.email ?? ""),
      updated: Date.now(),
    }).catch(() => {});
  } catch (e) {}
}
window.__onAppError = function () {
  clearTimeout(_errFlushT);
  _errFlushT = setTimeout(_flushErrorLog, 4000);
};
// Flush anything captured before app.js finished initialising.
setTimeout(_flushErrorLog, 3000);

// ── AUTOMATED DAILY BACKUP ────────────────────────────────
// Admin-only, throttled to once/day: snapshots the full dataset to
// backups/{YYYY-MM-DD} so a bad sync or an accidental "Clear all" stays
// recoverable. Fire-and-forget; no-ops if not admin, no data yet, already
// backed up today, or the write is blocked by security rules.
async function _maybeBackup() {
  try {
    if (!window.isAdmin) return;
    if (!Array.isArray(state.matches) || !state.matches.length) return;
    const today = todayISO();
    if (localStorage.getItem("padel_last_backup") === today) return;
    await setDoc(doc(db, "backups", today), {
      ts: Date.now(),
      matches: state.matches,
      players: state.players,
      playerAliasMap,
      nextPlayerId,
      seasons: state.seasons,
    });
    localStorage.setItem("padel_last_backup", today);
  } catch (e) {}
}

// ── KEYED DOM RECONCILE (incremental rendering) ───────────────
// Patch `container`'s children to match the children parsed from `html`,
// reusing existing nodes by data-key. Unchanged rows keep their identity —
// so the container isn't wiped (scroll/focus preserved) and untouched rows
// don't re-run entrance animations. Returns the nodes that were added/changed.
// Uses <template> so table rows (<tr>) parse correctly out of context.
// _syncAttrs -> ./render-anim.js
// morphList -> ./render-anim.js

// ── HTML ESCAPE ───────────────────────────────────────────────
// escHtml, jsArg, toLocalISODate, fmtDate (+ MONTHS_SHORT) now live in
// ./format.js — imported at the top of this file.

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
  const scroller = page.querySelector(".page-body-scroll") || page;
  if (scroller.scrollTop > 0) return null;
  return scroller;
}

function _ptrStart(e) {
  if (_ptrRefreshing) return;
  if (e.touches.length > 1) return; // ignore pinch-zoom (multi-touch)
  const t = _ptrTarget(e);
  if (!t) return;
  _ptrStartY = e.touches[0].clientY;
  _ptrDelta = 0;
  _ptrPulling = true;
}

function _ptrMove(e) {
  if (!_ptrPulling || _ptrRefreshing) return;
  // A second finger landed → it's a pinch-zoom, not a pull. Abandon the pull
  // (don't preventDefault) so the browser can zoom normally.
  if (e.touches.length > 1) {
    _ptrPulling = false;
    _ptrDelta = 0;
    const _ind = document.getElementById("ptr-indicator");
    if (_ind) {
      _ind.classList.remove("armed");
      _ind.style.transform = "translate(-50%, -60px)";
      _ind.style.opacity = 0;
    }
    return;
  }
  const dy = e.touches[0].clientY - _ptrStartY;
  if (dy < 0) return;
  _ptrDelta = Math.min(dy * 0.55, 120);
  const ind = document.getElementById("ptr-indicator");
  const lbl = document.getElementById("ptr-label");
  if (!ind) return;
  ind.style.transform = `translate(-50%, ${Math.min(_ptrDelta, 80) - 60}px)`;
  ind.style.opacity = Math.min(_ptrDelta / 60, 1);
  if (lbl)
    lbl.textContent =
      _ptrDelta >= _PTR_THRESHOLD ? "RELEASE TO REFRESH" : "PULL TO REFRESH";
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
        try {
          navigator.vibrate(20);
        } catch (e) {}
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

// ── BLOCK PINCH-ZOOM (prevents a mobile crash) ──────────────
// iOS Safari ignores the viewport's maximum-scale, so pinch-zoom still fires.
// Zooming forces WebKit to re-rasterize the app's heavy backdrop-filter blur
// (49 blur layers + the full-screen ambient blobs) at the magnified scale, which
// OOM-crashes the tab. The supported way to enlarge the UI is the hamburger's
// "Text Size" control. gesturestart/gesturechange/gestureend are iOS-only; on
// Android/Chrome maximum-scale already disables pinch-zoom. Double-tap zoom is
// covered by the iOS gesture block + the viewport meta.
["gesturestart", "gesturechange", "gestureend"].forEach((evt) =>
  document.addEventListener(evt, (e) => e.preventDefault(), { passive: false }),
);
// Belt-and-suspenders for browsers that surface pinch as a 2-finger touchmove
// with a scale: cancel it so no zoom (and no blur re-raster) occurs.
document.addEventListener(
  "touchmove",
  (e) => {
    if (e.touches && e.touches.length > 1 && typeof e.scale === "number" && e.scale !== 1)
      e.preventDefault();
  },
  { passive: false },
);
// Defence-in-depth: should a zoom happen anyway (a pinch the block missed, or
// browser zoom), strip the heavy blur (body.zoomed → see styles.css) so there's
// nothing for WebKit to OOM on at scale. visualViewport.scale tracks page zoom.
(function _initZoomBlurGuard() {
  const vv = window.visualViewport;
  if (!vv) return;
  let _raf = 0;
  const sync = () => {
    cancelAnimationFrame(_raf);
    _raf = requestAnimationFrame(() => {
      document.body.classList.toggle("zoomed", vv.scale > 1.02);
    });
  };
  vv.addEventListener("resize", sync, { passive: true });
  vv.addEventListener("scroll", sync, { passive: true });
})();

// ── HEAT/BATTERY: freeze all CSS animations while the app is backgrounded ──
// The body.app-bg class drives a CSS rule that pauses every animation
// (including the fixed ambient orbs). Stops the GPU churning while the screen
// is off or the user is in another app/tab.
document.addEventListener("visibilitychange", () => {
  document.body.classList.toggle("app-bg", document.hidden);
});

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
  const cur =
    typeof window.getThemeIdx === "function" ? window.getThemeIdx() : -1;
  grid.innerHTML = themes
    .map((t, i) => {
      const modeClass = t.mode ? ` tp-swatch-${t.mode}` : "";
      // Themed modes get a bespoke swatch via .tp-dot-{mode}; plain themes use hex.
      const dot = t.mode
        ? `<span class="tp-dot tp-dot-${t.mode}"></span>`
        : `<span class="tp-dot" style="background:${t.hex}"></span>`;
      return `<button class="tp-swatch${i === cur ? " tp-swatch-active" : ""}${modeClass}" onclick="pickTheme(${i})" style="--sw:${t.hex};--sw-rgb:${t.r},${t.g},${t.b}">
          ${dot}
          <span class="tp-name">${t.name}</span>
        </button>`;
    })
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
  if (!state.matches || !state.matches.length) return;
  const today = new Date();
  const tMM = String(today.getMonth() + 1).padStart(2, "0");
  const tDD = String(today.getDate()).padStart(2, "0");
  const tY = today.getFullYear();
  let seen = "";
  try {
    seen = sessionStorage.getItem("padel_anniv_shown") || "";
  } catch (e) {}
  const firstSeen = {};
  for (const m of state.matches) {
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
    state.matches
      .filter((m) => {
        if (sB === null) return m.scoreA === sA || m.scoreB === sA;
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
        const idx = state.matches.indexOf(m);
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
    state.matches
      .filter((m) => (m.date || "").startsWith(datePrefix))
      .slice(-10)
      .reverse()
      .forEach((m) => {
        const idx = state.matches.indexOf(m);
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
// allMatches now lives in shared state.matches (./state.js)
// nameMap now lives in shared state (./state.js)
// aliasMap now lives in shared state (./state.js)
// Source-of-truth player roster (replaces aliasMap/nameMap as stored data)
// players now lives in shared state.players (./state.js) // { [id]: { id, name, email, image, isGuest } }
let playerAliasMap = {}; // { [id]: [alias1, alias2, ...] }
let nextPlayerId = 1;
// ── SEASONS ────────────────────────────────────────────────
// User-defined date ranges. Each: { id, name, start:"YYYY-MM-DD", end:"YYYY-MM-DD"|null }.
// `seasons` is shared config (persisted in the cloud doc alongside matches).
// `_activeSeasonId` is a per-device VIEW preference ("all" = no filter) kept in
// localStorage — selecting one globally scopes every analytical surface (home,
// compact, history, analytics, ELO, XP, stats) to that range via activeMatches().
// seasons now lives in shared state.seasons (./state.js)
let _activeSeasonId = "all";
// When enabled (per-device), the ongoing season (the one whose range contains
// today) is auto-selected on launch instead of restoring the last manual pick.
let _seasonManuallySet = false;
try {
  _activeSeasonId = localStorage.getItem("padel_active_season") || "all";
  state.seasons = JSON.parse(localStorage.getItem("padel_seasons") || "[]") || [];
} catch (e) {}
_applyAutoSeason(); // override with the ongoing season if auto-select is on
let _dataVersion = 0;
let _homeRenderedVersion = -1,
  _homeRenderedFilter = "";
let _compactRenderedVersion = -1,
  _compactRenderedFilter = "";
let _addRenderedVersion = -1;
let _anaRenderedVersion = -1;
let _histRenderedVersion = -1,
  _histRenderedFilter = "";
let _excludedPlayers = new Set(
  (() => {
    try {
      return JSON.parse(localStorage.getItem("padel-exclude-players") || "[]");
    } catch (e) {
      return [];
    }
  })(),
);
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
let _lbWindow = null; // { mode:"first"|"last", count:N } or null — per-player game window
let _pvpLow = 20, _pvpHigh = 32; // partner % color thresholds: red ≤ low, low < orange ≤ high, green > high
let cmpSortKey = "sr";
let cmpSortAsc = false;
let cmpRecordSortMode = "wins";
let _cmpLeaderHtmls = [];
let _cmpFiltered = [];
const _CMP_TOGGLE_COLS = [
  { key: "mp", label: "MP" },
  { key: "record", label: "W–L" },
  { key: "winPct", label: "W%" },
  { key: "gw", label: "GW" },
  { key: "gl", label: "GL" },
  { key: "gamePct", label: "G%" },
  { key: "elo", label: "ELO" },
];
function _loadCmpHiddenCols() {
  try {
    const s = localStorage.getItem("padel_cmp_hidden_cols_v3");
    if (s) return new Set(JSON.parse(s));
  } catch (e) {}
  return new Set([]);
}
let _cmpHiddenCols = _loadCmpHiddenCols();
let prevPage = "home";
let lastMatchSnapshot = null;
let _forcedOffline = getForcedOffline();
let _firestoreUnsub = null;
let _emailTimer = null;

// ── Live/session state — now owned by src/app/session-state.js ─────────
// The imported objects (sessionState / liveScore / americanoState) hold the
// data; the legacy bare-variable names below alias their fields so the 200+
// call sites in app.js keep compiling without renaming.  When a page module
// is extracted for the live-session feature, it will import from session-state.js
// directly and these aliases can be removed.
let _liveSessionData        = null; // aliased separately — set by loadCloudData
const _liveSlots            = { a1: null, a2: null, b1: null, b2: null };
// liveScore fields — all accesses in app.js use the binding below:
const _liveScoreProxy       = liveScore;
let _liveScoreA             = 0; // kept for the rare direct += writes; synced via liveScore.scoreA
let _liveScoreB             = 0;
let _liveActiveSlot         = null;
let _liveRaceTo             = 4; // "race to" threshold: 4 or 6

// sessionState field aliases — call sites use these bare names; they read/write
// through to the canonical sessionState object so resetSessionState() stays atomic.
// Arrays/Sets are aliased by reference (mutations propagate automatically).
// Scalar aliases use Object.defineProperty so ++ / = writes propagate too.
Object.defineProperty(globalThis, "_sessionMatchHistory", {
  get() { return sessionState.matchHistory; },
  set(v) { sessionState.matchHistory = v; },
  configurable: true,
});
Object.defineProperty(globalThis, "_sessionRedoStack", {
  get() { return sessionState.redoStack; },
  set(v) { sessionState.redoStack = v; },
  configurable: true,
});
Object.defineProperty(globalThis, "_sessionPendingCount", {
  get() { return sessionState.pendingCount; },
  set(v) { sessionState.pendingCount = v; },
  configurable: true,
});
Object.defineProperty(globalThis, "_sessionPanelOpen", {
  get() { return sessionState.panelOpen; },
  set(v) { sessionState.panelOpen = v; },
  configurable: true,
});
// _sessionSetupSelected — reassigned at mutation sites; use property alias via globalThis
Object.defineProperty(globalThis, "_sessionSetupSelected", {
  get() { return sessionState.setupSelected; },
  set(v) { sessionState.setupSelected = v; },
  configurable: true,
});
// Timer interval handle for the session elapsed-time display — scalar, direct let.
let _sessionTimerInterval = null;

let _analyticsFeaturePromise = null;
let _liveFeaturePromise = null;
window.isAdmin = false;
// Used by the service-worker update flow (index.html) to decide whether it's
// safe to auto-reload for a new build, so the user is never yanked mid-action.
window.isAppBusy = function () {
  try {
    if (_liveSessionData && _liveSessionData.sessionActive) return true;
    if (document.querySelector(".modal.show, .sheet.open, .overlay.open"))
      return true;
    const ae = document.activeElement;
    if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")) return true;
  } catch (e) {}
  return false;
};
const _animLevel0 = resolveAnimLevel();
if (_animLevel0 === "medium" || _animLevel0 === "off")
  document.body.classList.add("no-cascade");
if (_animLevel0 === "off") document.body.classList.add("no-anim");
// Smooth mode: default ON if no saved pref
{
  if (localStorage.getItem("smooth_mode") === null) setSmoothMode(true);
  if (getSmoothMode()) {
    document.body.classList.add("smooth-mode");
    const _smCb = document.getElementById("smooth-mode-toggle");
    if (_smCb) _smCb.checked = true;
  }
}
// Restore saved text-size scale (CSS zoom). _applyFontScale is hoisted.
_applyFontScale(getFontScale());
// Battery Saver: default ON if no saved pref.
{
  const _bsPref = getBatterySaverPref();
  if (_bsPref === "1" || _bsPref == null) {
    document.body.classList.add("battery-saver");
    const _bsCb = document.getElementById("battery-saver-toggle");
    if (_bsCb) _bsCb.checked = true;
    if (_bsPref == null) setBatterySaver(true);
  }
}
// Restore notification toggle state on load.
{
  const _notifEnabled = getNotifEnabled();
  if (_notifEnabled) {
    const _ncb = document.getElementById("notif-toggle");
    if (_ncb) _ncb.checked = true;
  }
}
// Deleted matches + ELO config now live in src/infra/match-store.js.
// The module-level variable remains here so the 20+ mutation sites in app.js
// (splice/unshift/push) keep working without change.
let deletedMatches = [];
function _loadDeletedMatchesInto() {
  const loaded = loadDeletedMatches();
  deletedMatches.length = 0;
  loaded.forEach((m) => deletedMatches.push(m));
}
function _saveDeletedMatchesTrimmed() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffISO = toLocalISODate(cutoff);
  const trimmed = deletedMatches.filter((d) => (d.deletedAt || "") >= cutoffISO);
  deletedMatches.length = 0;
  trimmed.forEach((m) => deletedMatches.push(m));
  _saveDeletedMatches(deletedMatches);
}
// Provide the old names so no call site changes.
const DELETED_KEY = "padel_deleted"; // kept for any external tooling references
function saveDeletedMatches() { _saveDeletedMatchesTrimmed(); }

// ELO config: loadEloConfig / saveEloConfig / getEloDecayParams → match-store.js
// saveEloConfig imported above — add the invalidation side-effect here:
const _saveEloConfigBase = saveEloConfig;
function _saveEloConfigWithInvalidate(cfg) {
  _saveEloConfigBase(cfg);
  _invalidateEloMemo();
}
// Reassign for all in-file callers that expect the side-effectful version.
// (applyEloConfig / resetEloConfig call saveEloConfig — they now go through this.)

const ELO_DEFAULTS = { perWeek: 4, graceDays: 28, maxDecay: 300, floor: 900 };

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

// ── ELO MEMO ─────────────────────────────────────────────
// All ELO/stats memoisation is now owned by src/app/memo-store.js.
// _reignCache / _rankPeriodCache are imported at the top of this file as
// named exports from memo-store.js; references in the analytics/rank sections
// below continue to work via those bound names.
initEloDeps(getEloDecayParams, todayISO);
// Getters (not the objects) so the parser always sees the current maps —
// nameMap/aliasMap are reassigned on data load.
initParserDeps(() => state.nameMap, () => state.aliasMap, todayISO);
// Selectors read state.* directly but need app.js's per-device view prefs
// (reassigned here) and date helpers — injected as getters/functions.
initSelectorsDeps({
  getDataVersion: () => _dataVersion,
  getActiveSeasonId: () => _activeSeasonId,
  getExcludedPlayers: () => _excludedPlayers,
  getSessionGuestUnexcluded: () => _sessionGuestUnexcluded,
  todayISO,
  weekISO,
  monthISO,
  weekendRange,
  lastWeekRange,
});
// History summary card needs three still-in-app helpers (hoisted decls).
initHistorySummaryDeps({ normPlayer, getPairStats, memoElo: _memoElo });
// Award badges: pure compute, fed the stats/elo/pair + date helpers it needs.
// Pairs engine — normPlayer injected; getPairStats/etc. now exported from pairs.js.
initPairsDeps({ normPlayer });
// XP / Level / Prestige — computePlayerXP needs normPlayer + activeMatches +
// the three match-type helpers (isFireMatch/isDominating/isZero) from render-match-rows.
initXpDeps({ normPlayer, activeMatches, isFireMatch, isDominatingMatch, isZeroMatch });
// Analytics section builders — HTML generators for the Statistics page.
initBadgesDeps({ computeStats, computeElo, getPairStats, lastWeekRange, fmtDate });
// Player analytics (form/archetype/power/chemistry/stories/achievements).
initPlayerAnalyticsDeps({ getPairStats, toLocalISODate });

// ── One-time module initialisations ────────────────────────
// memo-store needs the app-level data-version counter and ELO config.
initMemoStoreDeps({
  getDataVersion: () => _dataVersion,
  getEloDecayParams,
  todayISO,
});

// cloud-repo needs access to current state for payload building and conflict checks.
initCloudRepo({
  getMatches: () => state.matches,
  getPlayers: () => state.players,
  getPlayerAliasMap: () => playerAliasMap,
  getNextPlayerId: () => nextPlayerId,
  getSeasons: () => state.seasons,
  isAdmin: () => !!window.isAdmin,
  isForcedOffline: () => _forcedOffline,
  isSessionBuffering: () => !!_liveSessionData?.sessionActive,
  showToast,
  appCache: window.appCache || null,
  mkMatchKey: _mkMatchKey,
});

// All memo functions now live in src/app/memo-store.js.
// _memoElo / _memoStats / _memoPairStats / _memoEloHistory / _memoEloPeaks /
// _memoEloLows — backward-compat bridges at top of file delegate to them.

function _invalidateEloMemo() {
  _invalidateAllMemos();
}

let _anaObserver = null;

function _handleFeatureLoadError(name, err) {
  console.error(`${name} feature failed to load:`, err);
  showToast(`${name} could not load`, "❌");
  // Replace the stuck "Loading…" placeholder with an actionable error state so a
  // failed lazy import (e.g. flaky network) is recoverable, not a dead spinner.
  if (name === "Analytics") {
    _analyticsFeaturePromise = null; // drop the rejected import so Retry re-fetches
    const c = document.getElementById("analytics-page-content");
    if (c)
      c.innerHTML = errorState({
        title: "Couldn't load Analytics",
        message: "Check your connection and try again.",
        retry: { onClick: "switchMainTab('analytics')" },
      });
  }
}

function _loadAnalyticsFeature() {
  if (!_analyticsFeaturePromise) {
    _analyticsFeaturePromise = import("./features/analytics.js");
  }
  return _analyticsFeaturePromise;
}

function renderAnalyticsFeature() {
  const container = document.getElementById("analytics-page-content");
  if (container && !container.innerHTML.trim()) {
    container.innerHTML = loadingState({ message: "Loading analytics…", size: "lg" });
  }
  return _loadAnalyticsFeature()
    .then((feature) =>
      feature.mountAnalyticsFeature({
        renderAnalyticsPage,
        afterRender: () => setTimeout(applyAnalyticsAnimations, 0),
      }),
    )
    .catch((err) => _handleFeatureLoadError("Analytics", err));
}

// Pre-render analytics in the background so the tab opens instantly.
// Runs only when the user is NOT already on the analytics tab and the
// rendered version is stale. Uses requestIdleCallback (with a 10s timeout
// fallback) to avoid competing with primary UI work.
let _anaPrefetchScheduled = false;
function _scheduleAnalyticsPrefetch() {
  if (_anaPrefetchScheduled) return;
  // Battery-saver: skip the speculative background render of the Statistics page
  // (the heaviest render in the app) — it runs on every data load/sync even for
  // users who never open the tab. In saver mode we render lazily on first open
  // instead, trading a one-time open cost for no wasted background CPU/battery.
  if (document.body.classList.contains("battery-saver")) return;
  _anaPrefetchScheduled = true;
  const run = () => {
    _anaPrefetchScheduled = false;
    if (document.querySelector(".page.active")?.id === "pg-analytics") return;
    if (_anaRenderedVersion === _dataVersion) return;
    renderAnalyticsPage();
  };
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(run, { timeout: 10000 });
  } else {
    setTimeout(run, 3000);
  }
}

function _loadLiveFeature() {
  if (!_liveFeaturePromise) {
    _liveFeaturePromise = import("./features/live-session.js");
  }
  return _liveFeaturePromise;
}

function openLiveMode() {
  return _loadLiveFeature()
    .then((feature) =>
      feature.openLiveSessionFeature({
        openLiveMode: _openLiveModeImpl,
      }),
    )
    .catch((err) => _handleFeatureLoadError("Live session", err));
}

// ── SAVE / SYNC — delegated to src/app/cloud-repo.js ────────
// cloud-repo.js owns all Firestore I/O, debouncing, pending-sync tracking,
// and the doc-size guard. saveCloudData / _trySyncNow / _setPendingSync /
// _hasPendingSync are imported at the top of this file.
//
// The two app-level effects that must still happen here (memo invalidation +
// version bump) are applied before delegating to the repo:
let _lastLocalSaveTime = 0; // kept here; cloud-repo.js reads via getLastLocalSaveTime()

function _buildCloudPayload() {
  return buildCloudPayload();
}

// Override the imported saveCloudData so callers in app.js get the
// invalidation + version bump they expect.
{
  const _repoSave = _cloudRepoSave;
  // eslint-disable-next-line no-func-assign — intentional bridge
  saveCloudData = function saveCloudData(opts) {
    _lastLocalSaveTime = Date.now(); // arm conflict-suppression window for ALL mutation paths
    _invalidateEloMemo();
    _dataVersion++;
    return _repoSave(opts);
  };
}

function toggleOfflineMode(on) {
  _forcedOffline = on;
  if (on) {
    setForcedOffline(true);
    if (_firestoreUnsub) {
      _firestoreUnsub();
      _firestoreUnsub = null;
    }
    _setPendingSync(true);
    showToast("Offline mode ON — tap SYNC to push manually", "✈️");
  } else {
    setForcedOffline(false);
    _resubscribeFirestore();
    showToast("Online mode — reconnecting to cloud", "☁️");
  }
  const toggle = document.getElementById("offline-mode-toggle");
  if (toggle) toggle.checked = on;
}

function _resubscribeFirestore() {
  if (_firestoreUnsub) {
    _firestoreUnsub();
    _firestoreUnsub = null;
  }
  try {
    _firestoreUnsub = onSnapshot(
      doc(db, "padel", "main"),
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        _ingestSeasons(d.seasons);
        let pls, pam, npid;
        if (
          d.players &&
          typeof d.players === "object" &&
          Object.keys(d.players).length > 0
        ) {
          pls = d.players;
          pam = d.playerAliasMap || {};
          npid = d.nextPlayerId || 1;
        } else {
          const mig = migrateAliasMapToPlayers(d.aliasMap || {});
          pls = mig.players;
          pam = mig.playerAliasMap;
          npid = mig.nextPlayerId;
        }
        const incoming = d.matches || [];
        const _sessionBuffering = !!_liveSessionData?.sessionActive;
        const _hadOfflineEdits = _hasPendingSync() && !_sessionBuffering;
        if (_hadOfflineEdits) {
          // Offline mode: find matches added locally while offline, push merged set to cloud
          const cloudKeys = new Set(incoming.map(_mkMatchKey));
          const offlineAdditions = state.matches.filter(
            (m) => !cloudKeys.has(_mkMatchKey(m)),
          );
          if (offlineAdditions.length > 0) {
            state.matches = [...incoming, ...offlineAdditions].sort((a, b) =>
              (a.date || "").localeCompare(b.date || ""),
            );
            // Keep local player roster (may have new names added offline)
            // push merged data back to Firestore
            state.players = pls;
            playerAliasMap = pam;
            nextPlayerId = npid;
            rebuildNameMaps();
            _invalidateEloMemo();
            saveCloudData();
            showToast(
              `Pushed ${offlineAdditions.length} offline match${offlineAdditions.length !== 1 ? "es" : ""} to cloud ☁️`,
            );
            _setPendingSync(false);
            renderHome();
            renderCompact();
            refreshManage();
            return;
          } else {
            state.matches = incoming;
          }
        } else {
          state.matches = incoming;
        }
        state.players = pls;
        playerAliasMap = pam;
        nextPlayerId = npid;
        rebuildNameMaps();
        _invalidateEloMemo();
        _setPendingSync(false);
        renderHome();
        renderCompact();
        refreshManage();
      },
      (err) => {
        console.error("Firestore re-subscribe error:", err);
      },
    );
  } catch (e) {
    console.error("Re-subscribe failed:", e);
  }
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
        try {
          localStorage.setItem("padel_photos", JSON.stringify(photoMap));
        } catch (_) {}
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
  } catch (e) {
    console.error("Photo save failed:", e);
  }
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
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const s = Math.min(img.width, img.height);
      ctx.drawImage(
        img,
        (img.width - s) / 2,
        (img.height - s) / 2,
        s,
        s,
        0,
        0,
        128,
        128,
      );
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

  const localCount = state.matches.length;
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
      { ...cloudPls, ...state.players },
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
    resolveFn(state.matches, state.players, playerAliasMap, nextPlayerId, true);
    showToast("Keeping local data", "📱");
  };
}

// ── SESSION STREAK ──────────────────────────────────────────
function computeSessionStreak() {
  if (!state.matches.length) return 0;
  const getMonday = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    const dow = d.getDay();
    d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    return toLocalISODate(d);
  };
  const weeks = [
    ...new Set(
      activeMatches()
        .filter((m) => m.date)
        .map((m) => getMonday(m.date)),
    ),
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
  if (!state.matches.length) return;
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  const weekOf = toLocalISODate(monday);
  const existing = getWeeklySnaps().find((s) => s.weekOf === weekOf);
  if (existing) return; // already snapped this week
  const stats = _memoStats();
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
    if (
      d.players &&
      typeof d.players === "object" &&
      Object.keys(d.players).length > 0
    ) {
      return {
        pls: d.players,
        pam: d.playerAliasMap || {},
        npid: d.nextPlayerId || 1,
      };
    }
    // Old format — migrate on the fly (data not yet saved in new format)
    const migrated = migrateAliasMapToPlayers(d.aliasMap || {});
    return {
      pls: migrated.players,
      pam: migrated.playerAliasMap,
      npid: migrated.nextPlayerId,
    };
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
    const _recentSave = Date.now() - _lastLocalSaveTime < 15000;
    const _sessionBuffering = !!_liveSessionData?.sessionActive;
    if (
      !skipConflict &&
      !isFirstLoad &&
      !_recentSave &&
      !_sessionBuffering &&
      state.matches.length > 0
    ) {
      const cloudKeys = new Set(matches.map(_mkMatchKey));
      const localOnly = state.matches.filter(
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

    // Captured BEFORE state.matches is reassigned below — the notification
    // diff in the non-first-load branch needs the pre-update count.
    const _prevMatchCount = state.matches.length;

    state.matches = matches;
    state.players = pls;
    playerAliasMap = pam;
    nextPlayerId = npid || 1;
    rebuildNameMaps();
    _invalidateEloMemo();
    autoSaveWeeklySnap();
    if (window.appCache)
      window.appCache.save(state.matches, state.players, playerAliasMap, nextPlayerId);

    const _onAddPage = () =>
      document.querySelector(".page.active")?.id === "pg-add";
    if (isFirstLoad) {
      const activePageId = document.querySelector(".page.active")?.id;
      if (activePageId === "pg-home") {
        renderHome();
      } else if (activePageId === "pg-history") {
        renderModernMatches();
        populateHistoryPlayerChips();
      } else if (activePageId === "pg-analytics") {
        renderAnalyticsFeature();
      } else if (_onAddPage()) {
        refreshManage();
        renderAddMatches();
        prefillMatchTADate();
        renderNamesTable();
      } else {
        renderCompact();
      }
      fired = true;
      window.dismissSplash("Ready ✓");
      document.dispatchEvent(new CustomEvent("padel-data-ready"));
      setTimeout(_checkAnniversaries, 1800);
      setTimeout(checkResumeSession, 800); // Enhancement 13: show session resume banner if saved state exists
      // Pre-render analytics in background after primary tab settles
      if (activePageId !== "pg-analytics") _scheduleAnalyticsPrefetch();
    } else {
      // Genuine new data from Firestore — notify if new matches arrived and the
      // user has opted in to notifications and the page is backgrounded.
      const prevCount = _prevMatchCount;
      const newCount = matches.length;
      if (newCount > prevCount && getNotifEnabled()) {
        const added = newCount - prevCount;
        _sendMatchNotification(added, matches[matches.length - 1]);
      }
      // Genuine new data from Firestore: fade board out, re-render, fade back in — no blur flash
      const board = document.getElementById("board");
      if (board) {
        board.style.transition = "opacity 0.15s ease";
        board.style.opacity = "0";
      }
      setTimeout(function () {
        renderHome();
        renderCompact();
        if (_onAddPage()) {
          refreshManage();
          if (_addRenderedVersion !== _dataVersion) renderAddMatches();
          renderNamesTable();
        }
        if (board) {
          // Suppress the per-card keyframe animation for live updates
          board.querySelectorAll(".pc").forEach(function (c) {
            c.style.animation = "none";
            c.style.opacity = "1";
            c.style.transform = "none";
          });
          board.style.opacity = "1";
        }
        // Re-invalidate analytics cache after Firestore update; pre-render in background
        _scheduleAnalyticsPrefetch();
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
        _ingestSeasons(d.seasons);
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

// animateGauges -> ./render-anim.js

// ── AUTH ───────────────────────────────────────────────────
document.getElementById("loginBtn").addEventListener("click", async () => {
  try {
    if (auth.currentUser) {
      _driveAccessToken = null;
      await signOut(auth);
      closeHamburgerMenu();
      return;
    }
    const result = await signInWithPopup(auth, provider);
    _driveAccessToken =
      GoogleAuthProvider.credentialFromResult(result)?.accessToken || null;
    closeHamburgerMenu();
  } catch (err) {
    if (err.code === "auth/popup-blocked")
      await signInWithRedirect(auth, provider);
    else alert(err.message);
  }
});

getRedirectResult(auth)
  .then((result) => {
    if (result) {
      _driveAccessToken =
        GoogleAuthProvider.credentialFromResult(result)?.accessToken || null;
    }
  })
  .catch(console.error);

let _authInitialFired = false;
// Enhancement 21: offline indicator
function _updateOfflineIndicator() {
  const el = document.getElementById("offline-indicator");
  if (!el) return;
  el.style.display = navigator.onLine ? "none" : "flex";
}
window.addEventListener("online", () => {
  _updateOfflineIndicator();
  _trySyncNow();
});
window.addEventListener("offline", _updateOfflineIndicator);
_updateOfflineIndicator();
_setPendingSync(_hasPendingSync());

onAuthStateChanged(auth, (user) => {
  const wasAdmin = window.isAdmin;
  window.isAdmin = !!user && user.email === ADMIN_EMAIL;
  updateAdminUI(user);
  if (window.isAdmin) scheduleAutoEmail();
  if (window.isAdmin) _scheduleDriveBackup();
  if (window.isAdmin) setTimeout(_maybeBackup, 6000); // once data has loaded
  else {
    if (_emailTimer) { clearTimeout(_emailTimer); _emailTimer = null; }
    if (_driveBackupTimer) { clearTimeout(_driveBackupTimer); _driveBackupTimer = null; }
  }
  // Skip re-render on the initial auth state resolution at startup —
  // loadCloudData() already handles the first render. Only re-render
  // when auth genuinely changes (user logs in or out mid-session).
  if (!_authInitialFired) {
    _authInitialFired = true;
    return;
  }
  if (state.matches.length) {
    renderHome();
    renderCompact();
  }
});

function updateAdminUI(user) {
  updateSeasonHamburgerUI();
  const scToggle = document.getElementById("screenshotChoiceToggle");
  if (scToggle)
    scToggle.checked = getScreenshotAsk();
  const _al = resolveAnimLevel();
  document
    .querySelectorAll(".anim-seg-btn")
    .forEach((b) => b.classList.toggle("active", b.dataset.val === _al));
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
  if (_leavingPage === "pg-compact" && id !== "compact")
    _sessionGuestUnexcluded.clear();
  prevPage = (_leavingPage || "pg-home").replace("pg-", "");
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("pg-" + id).classList.add("active");
  document.getElementById("fab").style.display =
    id === "add" && window.isAdmin ? "flex" : "none";
  if (id === "home") {
    const fk = `${homeFilter}|${homeFrom || ""}|${homeTo || ""}`;
    if (_homeRenderedVersion !== _dataVersion || _homeRenderedFilter !== fk)
      renderHome();
  }
  if (id === "compact") {
    const fk = `${cmpFilter}|${cmpFrom || ""}|${cmpTo || ""}|${cmpSortKey}|${cmpSortAsc}`;
    if (
      _compactRenderedVersion !== _dataVersion ||
      _compactRenderedFilter !== fk
    )
      renderCompact();
  }
  if (id === "history") {
    if (
      _histRenderedVersion !== _dataVersion ||
      _histRenderedFilter !== _histFilterKey()
    )
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

  // Render content for the new page — skip if data + filter haven't changed.
  // Compact gets fullMode re-render so its cascade plays while the page is visible.
  if (id === "home") {
    const fk = `${homeFilter}|${homeFrom || ""}|${homeTo || ""}`;
    if (_homeRenderedVersion !== _dataVersion || _homeRenderedFilter !== fk)
      renderHome();
  }
  if (id === "compact") {
    const fk = `${cmpFilter}|${cmpFrom || ""}|${cmpTo || ""}|${cmpSortKey}|${cmpSortAsc}`;
    const fullMode =
      document.body.classList.contains("splash-done") &&
      !document.body.classList.contains("no-cascade");
    if (
      _compactRenderedVersion !== _dataVersion ||
      _compactRenderedFilter !== fk ||
      fullMode
    )
      renderCompact();
  }
  if (id === "history") {
    if (
      _histRenderedVersion !== _dataVersion ||
      _histRenderedFilter !== _histFilterKey()
    )
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
    renderAnalyticsFeature();
  }
  if (id === "add") {
    refreshManage();
    if (_addRenderedVersion !== _dataVersion) renderAddMatches();
    prefillMatchTADate();
  }

  // ── Directional slide animation (pure visual layer on top of correct DOM state) ──
  // Skipped entirely when the user has Animations: Off (body.no-anim): the slide
  // momentarily paints the new page at its final spot before jumping it off-screen
  // to slide in, which reads as a flicker — not wanted when motion is disabled.
  const curIdx = mainTabOrder.indexOf(curPage?.id.replace("pg-", ""));
  const nextIdx = mainTabOrder.indexOf(id);
  const canSlide =
    !skipAnim &&
    !document.body.classList.contains("no-anim") &&
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

const mainTabOrder = ["home", "compact", "history", "analytics"];

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
    // Swipe actions (delete / edit) are admin-only, so only arm the gesture for
    // admins — non-admins can still TAP a row to open the match overlay.
    const card = window.isAdmin
      ? e.target.closest(".match-card") || e.target.closest(".smr-wrap")
      : null;
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
    const inner = _swipeCard.querySelector(".match-card-inner, .smr-inner");
    // Right-swipe → edit is offered on Summary rows only.
    const _canEditSwipe = _swipeCard.classList.contains("smr-wrap");
    if (dx < 0) {
      // Left swipe → reveal delete (right side)
      const reveal = Math.min(72, Math.abs(dx));
      if (inner) {
        inner.style.transform = `translateX(${-reveal}px)`;
        _swipeCard.classList.add("swiping");
      }
      _swipeCard.classList.toggle("swipe-revealed", reveal >= 52);
      _swipeCard.classList.remove("swipe-revealed-r");
    } else if (dx > 0 && _canEditSwipe) {
      // Right swipe → reveal edit (left side)
      const reveal = Math.min(72, dx);
      if (inner) {
        inner.style.transform = `translateX(${reveal}px)`;
        _swipeCard.classList.add("swiping");
      }
      _swipeCard.classList.toggle("swipe-revealed-r", reveal >= 52);
      _swipeCard.classList.remove("swipe-revealed");
    } else {
      if (inner) inner.style.transform = "";
      _swipeCard.classList.remove("swipe-revealed", "swipe-revealed-r", "swiping");
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
    } else if (card.classList.contains("swipe-revealed-r")) {
      if (inner) {
        inner.style.transition = "transform 0.25s ease";
        inner.style.transform = "translateX(72px)";
      }
    } else {
      card.classList.remove("swipe-revealed", "swipe-revealed-r", "swiping");
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
    const todayMatches = state.matches.filter(m => m.date === todayISO());
    let text = todayDMYY() + "\n";
    if (todayMatches.length) {
      text += todayMatches.map(matchToEditableLine).join("\n") + "\n";
    }
    ta.value = text;
    ta.selectionStart = ta.selectionEnd = ta.value.length;
    previewMatchImport();
  }
}

// ── MIRROR SAVED MATCHES INTO THE ADD-MATCHES EDITOR ───────
// Convert an ISO date (YYYY-MM-DD) to the D/M/YY header format.
function _isoToDMYY(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return todayDMYY();
  const [, y, mo, d] = m;
  return `${+d}/${+mo}/${y.slice(2)}`;
}

// Pick a single-word token for a player that parseMatchLine can resolve back
// to this player (prefer a space-free alias; fall back to the display name).
function _playerToken(name) {
  const aliases = state.aliasMap[name] || [];
  const single = aliases.find((a) => a && !/\s/.test(a));
  if (single) return single;
  if (!/\s/.test(name)) return name; // single-word display name resolves to itself
  return name.split(/\s+/)[0]; // best effort for multi-word names without aliases
}

// Render a saved match as an editable line, e.g. "Ank God vs RaM Vin 4-3".
function matchToEditableLine(m) {
  const ta = (m.teamA || []).map(_playerToken);
  const tb = (m.teamB || []).map(_playerToken);
  return `${ta.join(" ")} vs ${tb.join(" ")} ${m.scoreA}-${m.scoreB}`;
}

// Append a saved match into the Add Matches textarea as editable text,
// grouped under a D/M/YY date header. Does NOT commit — purely a mirror.
function mirrorMatchToEditor(m) {
  const ta = document.getElementById("matchTA");
  if (!ta || !m) return;
  const val = ta.value.replace(/\s+$/, ""); // drop trailing blank lines
  const lines = val ? val.split("\n") : [];
  // Find the most recent date header already in the box.
  let lastHdrIso = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    const iso = parseDateHdr(lines[i].trim());
    if (iso) {
      lastHdrIso = iso;
      break;
    }
  }
  const parts = [];
  if (val) parts.push(val);
  if (lastHdrIso !== m.date) parts.push(_isoToDMYY(m.date));
  parts.push(matchToEditableLine(m));
  ta.value = parts.join("\n") + "\n";
  ta.selectionStart = ta.selectionEnd = ta.value.length;
  previewMatchImport();
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
  const days = new Set(state.matches.map((m) => m.date)).size;
  document.getElementById("manageInfo").innerHTML =
    `Matches: <strong>${state.matches.length}</strong><br>Days: <strong>${days}</strong><br>Players mapped: <strong>${Object.keys(state.aliasMap).length}</strong>`;
  renderEmailStatus();
  renderTrash();
  renderEloConfigCard();
  _checkDocSize(_buildCloudPayload());
}

// ── DATE HELPERS ───────────────────────────────────────────
// todayISO/weekISO/weekendRange/monthISO/lastWeekRange → ./src/engine/dates.js

// parseDateHdr, parseBlock (+ internal resolve/resolveInitial/parseMatchLine)
// now live in ./parser.js, imported at the top of this file. App-state deps
// (nameMap, aliasMap, todayISO) are injected via initParserDeps() at startup.

// ── PLAYER AVATARS ─────────────────────────────────────────
// _AV_COLORS, playerColor, playerInitials now live in ./format.js.
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
  if (photo)
    return `<img src="${photo}" class="live-sheet-item-av" style="object-fit:cover" alt="">`;
  return `<span class="live-sheet-item-av" style="background:${playerColor(name)}">${playerInitials(name)}</span>`;
}
function sheetAvSm(name) {
  const photo = photoMap[name];
  if (photo)
    return `<img src="${photo}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;flex-shrink:0" alt="">`;
  return `<div style="width:24px;height:24px;border-radius:50%;background:${playerColor(name)};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;flex-shrink:0">${playerInitials(name)}</div>`;
}

// ── SEASON HELPERS ─────────────────────────────────────────
// The currently-selected season object, or null when "ALL SEASONS".
// _activeSeason → ./selectors.js
// True when `dateStr` (YYYY-MM-DD) falls inside the season's range. An empty
// end means open-ended (ongoing). Inclusive on both bounds.
// _inSeason → ./selectors.js
// Count matches in a season range (ignores guest exclusion — raw range size).
// _seasonMatchCount → ./selectors.js
// ── AUTO-SELECT ONGOING SEASON (per-device) ────────────────
function _isAutoSeasonEnabled() {
  try {
    return localStorage.getItem("padel_season_auto") === "1";
  } catch (e) {
    return false;
  }
}
// The season whose range contains today; if several overlap, the latest-starting
// one wins (most specific/current). null when none is ongoing.
function _currentOngoingSeason() {
  const t = todayISO();
  const inRange = state.seasons.filter((s) => _inSeason(s, t));
  if (!inRange.length) return null;
  return inRange.sort((a, b) => (b.start || "").localeCompare(a.start || ""))[0];
}
// When auto-select is on, point _activeSeasonId at the ongoing season (or "all").
// Used at launch and when fresh cloud seasons arrive (unless the user has made a
// manual pick this session). Does not render — callers handle that.
function _applyAutoSeason() {
  if (!_isAutoSeasonEnabled()) return;
  const og = _currentOngoingSeason();
  _activeSeasonId = og ? og.id : "all";
  try {
    localStorage.setItem("padel_active_season", _activeSeasonId);
  } catch (e) {}
}
// Per-device toggle. Turning it on immediately jumps to the ongoing season.
function setSeasonAuto(on) {
  try {
    localStorage.setItem("padel_season_auto", on ? "1" : "0");
  } catch (e) {}
  if (on) {
    const og = _currentOngoingSeason();
    setSeason(og ? og.id : "all");
    _seasonManuallySet = false; // keep auto-driven for later cloud updates
    showToast(
      og ? `Season: ${og.name}` : "No ongoing season → All Seasons",
      "🗓️",
    );
  }
}
// Reset the per-tab date sub-filters to "all" and sync their controls. Called
// when entering a specific season so the WHOLE season range is shown — otherwise
// Compact/History (which default to "today") would render empty for a past
// season, contradicting "show all data for that range".
function _resetSubFiltersForSeason() {
  // Home (Detailed)
  homeFilter = "all";
  homeFrom = null;
  homeTo = null;
  const homeSel = document.getElementById("homeFilterSel");
  if (homeSel) homeSel.value = "all";
  document.getElementById("homeDrRow")?.classList.remove("show");
  _syncHomeFilterLabel();
  // Compact (Summary)
  cmpFilter = "all";
  cmpFrom = null;
  cmpTo = null;
  const cmpSel = document.getElementById("cmpSel");
  if (cmpSel) cmpSel.value = "all";
  document.getElementById("cmpDr")?.classList.remove("show");
  document.getElementById("cmpDayPicker")?.classList.remove("show");
  // History — matchTabFilter drives renderModernMatches; the visible control is
  // the #histDateFilter select (the [data-mf] chips are a legacy fallback).
  matchTabFilter = "all";
  const hdf = document.getElementById("histDateFilter");
  if (hdf) hdf.value = "all";
  document.querySelectorAll("[data-mf]").forEach((b) => b.classList.remove("on"));
  document.querySelector('[data-mf="all"]')?.classList.add("on");
  document.getElementById("matchDr")?.classList.remove("show");
  const mdp = document.getElementById("matchDayPicker");
  if (mdp) mdp.style.display = "none";
  const mf = document.getElementById("matchFrom");
  const mt = document.getElementById("matchTo");
  if (mf) mf.value = "";
  if (mt) mt.value = "";
}
// Switch the active season (id, or "all"). Persists the view preference and
// re-renders everything via the standard commit() path (bumps _dataVersion,
// invalidates the ELO memo, re-renders the active page; other pages re-render
// lazily on their next navigation through the version gates).
function setSeason(id) {
  const next = id || "all";
  _seasonManuallySet = true; // a manual pick suppresses auto re-selection this session
  // Entering a specific season resets the date sub-filters so its full range
  // shows (no empty "today" view); leaving to ALL SEASONS keeps the current view.
  if (next !== "all" && next !== _activeSeasonId) _resetSubFiltersForSeason();
  _activeSeasonId = next;
  try {
    localStorage.setItem("padel_active_season", _activeSeasonId);
  } catch (e) {}
  commit();
  // Analytics isn't covered by renderActivePage(); refresh it if it's showing.
  if (document.querySelector(".page.active")?.id === "pg-analytics")
    renderAnalyticsFeature();
  updateSeasonHamburgerUI();
  // If the picker is open, move the active highlight without closing it.
  if (
    document
      .getElementById("season-sheet")
      ?.classList.contains("live-sheet-open")
  )
    _renderSeasonList();
}
// Replace the in-memory season list from a cloud/cache payload and mirror to
// localStorage so the next cold boot has it instantly (before Firestore resolves).
function _ingestSeasons(arr) {
  if (!Array.isArray(arr)) return;
  state.seasons = arr;
  // Auto-select: re-point at the ongoing season once real cloud seasons arrive,
  // unless the user has manually chosen one this session.
  if (_isAutoSeasonEnabled() && !_seasonManuallySet) {
    const og = _currentOngoingSeason();
    const want = og ? og.id : "all";
    if (want !== _activeSeasonId) {
      _activeSeasonId = want;
      try {
        localStorage.setItem("padel_active_season", want);
      } catch (e) {}
      updateSeasonHamburgerUI();
    }
  }
  // If the selected season was deleted elsewhere, fall back to ALL.
  if (
    _activeSeasonId !== "all" &&
    !state.seasons.some((s) => s.id === _activeSeasonId)
  ) {
    _activeSeasonId = "all";
    try {
      localStorage.setItem("padel_active_season", "all");
    } catch (e) {}
    updateSeasonHamburgerUI();
  }
  try {
    localStorage.setItem("padel_seasons", JSON.stringify(state.seasons));
  } catch (e) {}
}

// ── GUEST FILTER ────────────────────────────────────────────
// activeMatches() is called 80+ times per render. The result only changes when
// the data mutates, the active season changes, or the guest/exclude set changes —
// so memoize the filtered array and skip the O(matches) passes when nothing moved.
// Invalidation: _invalidateEloMemo() (called on every data mutation) nulls _amMemo,
// and the key carries the season id + exclusion set (exclusion toggles re-render
// without touching _dataVersion / the ELO memo). Callers treat the result as
// read-only — the no-filter path has always returned the shared `state.matches`.
// activeMatches → ./selectors.js

// ── FILTER ─────────────────────────────────────────────────
// filterMatches → ./selectors.js

// computeStats, _normScores, eloToSr now live in ./stats.js (pure module,
// imported at the top of this file alongside the ELO engine).

// ── MOMENTUM BADGE ─────────────────────────────────────────
function getMomentumBadge(playerName) {
  // Get last 3 matches for this player, in chronological order
  const playerMatches = state.matches
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


// getPairKey → src/engine/pairs.js

// getPairStats → src/engine/pairs.js

// pairInMatch → src/engine/pairs.js

// playersOpposed → src/engine/pairs.js

// getHeadToHeadStats → src/engine/pairs.js

function getPlayerDetail(name) {
  const matches = activeMatches().filter((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].some(
      (p) => normPlayer(p) === name,
    ),
  );
  const stats = _memoStats().find(
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
  const dupPlayers = parsed.filter(
    (m) =>
      new Set([...m.teamA, ...m.teamB]).size < m.teamA.length + m.teamB.length,
  );

  // Count-based: same logic as addMatches() so preview matches actual behaviour
  const _mk = (m) =>
    `${m.date}|${[...(m.teamA||[])].sort()}|${[...(m.teamB||[])].sort()}|${m.scoreA}-${m.scoreB}`;
  const dbCounts = new Map();
  state.matches.forEach((m) => { const k=_mk(m); dbCounts.set(k,(dbCounts.get(k)||0)+1); });
  const seenCounts = new Map();
  let silentSkipCount = 0, askCount = 0;

  const rows = parsed.slice(0, 5).map((m) => {
    const k = _mk(m);
    const seen = seenCounts.get(k) || 0;
    seenCounts.set(k, seen + 1);
    const inDb = dbCounts.get(k) || 0;
    const badP = new Set([...m.teamA,...m.teamB]).size < m.teamA.length + m.teamB.length;
    let tag = "", warn = false;
    if (badP) { tag = " · repeated player!"; warn = true; }
    else if (seen < inDb) { tag = " · already exists (skip)"; silentSkipCount++; }
    else if (inDb > 0) { tag = " · exists — will ask"; warn = true; askCount++; }
    return `<div class="preview-row"><span>${m.date} · ${m.teamA.join(" & ")} vs ${m.teamB.join(" & ")}</span><strong class="${warn ? "preview-warn" : ""}">${m.scoreA}-${m.scoreB}${tag}</strong></div>`;
  });
  // Finish counting for rows not shown — mirror the visible loop exactly:
  // repeated-player rows are tallied under dupPlayers, not skip/ask.
  parsed.slice(5).forEach((m) => {
    const k = _mk(m);
    const seen = seenCounts.get(k) || 0;
    seenCounts.set(k, seen + 1);
    const inDb = dbCounts.get(k) || 0;
    const badP = new Set([...m.teamA, ...m.teamB]).size < m.teamA.length + m.teamB.length;
    if (badP) return;
    if (seen < inDb) silentSkipCount++;
    else if (inDb > 0) askCount++;
  });

  const newCount = parsed.length - silentSkipCount - askCount - dupPlayers.length;
  box.innerHTML = `
    <div>
      <strong style="color:var(--text)">${parsed.length}</strong> parsed ·
      <strong style="color:var(--green)">${newCount < 0 ? 0 : newCount}</strong> new ·
      <strong>${silentSkipCount}</strong> existing (skip) ·
      ${askCount ? `<strong class="preview-warn">${askCount}</strong> will ask ·` : ""}
      <strong class="${errors.length ? "preview-warn" : ""}">${errors.length}</strong> error(s)
      ${dupPlayers.length ? `· <strong class="preview-warn">${dupPlayers.length}</strong> repeated player(s)` : ""}
    </div>
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
  // Count-based duplicate detection.
  // Key = date + sorted teams + score. If the textarea has ≤N occurrences of a
  // key already present N times in the DB, those are the prefilled/known entries
  // and are silently skipped. If the textarea has MORE occurrences than the DB,
  // the extras are genuinely new — same teams+score on same day → ask per line.
  const _mk = (m) =>
    `${m.date}|${[...(m.teamA || [])].sort()}|${[...(m.teamB || [])].sort()}|${m.scoreA}-${m.scoreB}`;
  const dbCounts = new Map();
  state.matches.forEach((m) => {
    const k = _mk(m);
    dbCounts.set(k, (dbCounts.get(k) || 0) + 1);
  });

  const seenCounts = new Map();
  const toAdd = [];
  const toConfirm = []; // same key already in DB but extra occurrence → ask per-line
  let skipCount = 0;

  for (const m of parsed) {
    const k = _mk(m);
    const seen = seenCounts.get(k) || 0;
    seenCounts.set(k, seen + 1);
    const inDb = dbCounts.get(k) || 0;
    if (seen < inDb) { skipCount++; continue; } // prefilled/dup → silent skip
    if (inDb > 0) toConfirm.push(m);           // new occurrence of same key → ask
    else toAdd.push(m);                          // new match (different score or teams) → add
  }

  function _commit(list) {
    if (!list.length) {
      if (skipCount) {
        oEl.textContent = `${skipCount} match${skipCount > 1 ? "es" : ""} already existed — nothing new added.`;
        oEl.classList.add("show");
        setTimeout(() => oEl.classList.remove("show"), 3000);
      }
      return;
    }
    const prevSnapshot = [...state.matches];
    lastMatchSnapshot = prevSnapshot;
    let step = [...prevSnapshot];
    for (const m of list) {
      const next = [...step, m];
      checkMilestones(step, next);
      step = next;
    }
    state.matches.push(...list);
    _lastLocalSaveTime = Date.now();
    saveCloudData();
    document.getElementById("matchTA").value = "";
    prefillMatchTADate();
    let msg = `Added ${list.length} match${list.length > 1 ? "es" : ""}.`;
    if (skipCount) msg += ` (${skipCount} already existed, skipped)`;
    oEl.textContent = msg;
    oEl.classList.add("show");
    document.getElementById("undoAddBtn").style.display = "block";
    setTimeout(() => oEl.classList.remove("show"), 2500);
    commit();
  }

  // Process per-line confirmations sequentially, then commit everything.
  (function _processQueue() {
    if (!toConfirm.length) { _commit(toAdd); return; }
    const m = toConfirm.shift();
    const label = `${m.teamA.join(" & ")} vs ${m.teamB.join(" & ")} ${m.scoreA}–${m.scoreB} (${m.date})`;
    showDupConfirmSheet(
      `This match already exists:\n${label}\nIs this a new genuine match?`,
      () => { toAdd.push(m); _processQueue(); },  // Yes → include and continue
      () => { skipCount++; _processQueue(); },     // No  → skip and continue
    );
  })();
}

function undoLastAdd() {
  if (!lastMatchSnapshot) return;
  state.matches = lastMatchSnapshot;
  lastMatchSnapshot = null;
  saveCloudData();
  commit();
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
      if (parsed.nameMap && typeof parsed.nameMap === "object")
        parsed = parsed.nameMap;
      Object.entries(parsed).forEach(([alias, display]) => {
        if (typeof alias !== "string" || typeof display !== "string") return;
        const a = alias.trim(),
          d = display.trim();
        if (!a || !d) return;
        if (!importMap[d]) importMap[d] = [];
        if (!importMap[d].includes(a)) importMap[d].push(a);
      });
    } catch (e) {
      if (eEl) {
        eEl.innerHTML = "Invalid JSON — check format";
        eEl.classList.add("show");
      }
      return;
    }
  } else {
    raw.split("\n").forEach((line, i) => {
      const t = line.trim();
      if (!t) return;
      const idx = t.indexOf("-");
      if (idx < 1) {
        errs.push(`Line ${i + 1}`);
        return;
      }
      const display = t.slice(0, idx).trim();
      const aliases = t
        .slice(idx + 1)
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      if (!display || !aliases.length) {
        errs.push(`Line ${i + 1}`);
        return;
      }
      importMap[display] = aliases;
    });
    if (errs.length && eEl) {
      eEl.innerHTML = `${errs.length} line(s) skipped`;
      eEl.classList.add("show");
    }
  }

  // Merge into players: update existing by name, add new
  Object.entries(importMap).forEach(([displayName, aliases]) => {
    const existing = Object.values(state.players).find((p) => p.name === displayName);
    if (existing) {
      playerAliasMap[existing.id] = aliases;
    } else {
      const id = nextPlayerId++;
      state.players[id] = {
        id,
        name: displayName,
        email: "",
        image: "",
        isGuest: false,
      };
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
    ta.value = Object.values(state.players)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => `${p.name} - ${(playerAliasMap[p.id] || []).join(", ")}`)
      .join("\n");
  }
}

function editNameEntry(displayName) {
  // Legacy shim — find player by name and open the edit sheet
  const p = Object.values(state.players).find((x) => x.name === displayName);
  if (p) openPlayerEditSheet(p.id);
}

function renderNamesTable() {
  const table = document.getElementById("names-table");
  if (!table) return;

  // Merge formal registry with all players derived from match data
  const registryByName = {};
  Object.values(state.players).forEach((p) => { registryByName[p.name] = p; });
  const allNames = [...new Set([
    ...Object.keys(registryByName),
    ...getAllPlayerNamesFromMatches(),
  ])].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  const badge = document.getElementById("names-count-badge");
  if (badge) badge.textContent = allNames.length;

  if (!allNames.length) {
    table.innerHTML = `<div style="text-align:center;padding:40px 0 16px;color:var(--muted);font-size:13px">No players yet. Tap + ADD PLAYER to get started.</div>`;
    return;
  }

  table.innerHTML = allNames.map((name) => {
    const p = registryByName[name];
    const aliases = p ? (playerAliasMap[p.id] || []) : [];
    const { first, last } = _getPlayerDateRange(name, state.matches);
    const initials = (name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    const photo = photoMap[name];

    const avatarInner = photo
      ? `<img src="${photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`
      : `<span style="font-weight:800;font-size:13px;color:#000">${escHtml(initials)}</span>`;
    const photoControls = window.isAdmin && p
      ? `<div style="display:flex;gap:4px;margin-top:3px;justify-content:center">
          <button onclick="savePlayerPhoto(${jsArg(name)})" title="Upload photo" style="font-size:12px;background:none;border:none;cursor:pointer;padding:0;line-height:1;opacity:0.5">📷</button>
          ${photo ? `<button onclick="removePlayerPhoto(${jsArg(name)})" title="Remove photo" style="font-size:10px;background:none;border:none;cursor:pointer;padding:0;color:var(--muted);line-height:1">✕</button>` : ""}
        </div>`
      : "";

    const guestBadge = p?.isGuest
      ? `<span style="font-size:8px;padding:1px 6px;border-radius:8px;background:rgba(255,165,0,0.15);color:orange;font-weight:800;letter-spacing:0.06em">GUEST</span>`
      : "";

    const mappingChips = aliases.length
      ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px">${
          aliases.map((a) =>
            `<span style="font-size:9px;font-weight:700;letter-spacing:0.05em;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.18);color:var(--accent);border-radius:5px;padding:2px 7px">${escHtml(a)} → ${escHtml(name)}</span>`
          ).join("")
        }</div>`
      : "";

    const dateRange = (first || last)
      ? `<div style="font-size:9px;color:var(--muted);margin-top:4px;letter-spacing:0.03em">${first ? fmtDate(first) : "—"} → ${last ? fmtDate(last) : "—"}</div>`
      : "";

    const emailLine = p?.email
      ? `<div style="font-size:9px;color:var(--muted);margin-top:2px">✉ ${escHtml(p.email)}</div>`
      : "";

    const actionBtn = p
      ? `<button onclick="openPlayerEditSheet(${p.id})" style="flex-shrink:0;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:var(--text);font-size:10px;font-weight:700;letter-spacing:0.08em;padding:6px 13px;border-radius:7px;cursor:pointer;white-space:nowrap">EDIT</button>`
      : `<button onclick="openPlayerEditSheet(null)" style="flex-shrink:0;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);color:var(--accent);font-size:10px;font-weight:700;letter-spacing:0.08em;padding:6px 13px;border-radius:7px;cursor:pointer;white-space:nowrap">+ ADD</button>`;

    return `<div style="display:flex;align-items:center;gap:12px;padding:11px 13px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;margin-bottom:7px">
      <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">
        <div style="width:38px;height:38px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">${avatarInner}</div>
        ${photoControls}
      </div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span style="font-weight:800;font-size:14px;color:var(--text);letter-spacing:0.03em">${escHtml(name)}</span>
          ${guestBadge}
        </div>
        ${mappingChips}${dateRange}${emailLine}
      </div>
      ${actionBtn}
    </div>`;
  }).join("");
}

function setScreenshotChoiceSetting(val) {
  setScreenshotAsk(val);
}

// Smooth Mode (architecture #4): opt-in scroll/paint smoothness via the
// body.smooth-mode CSS class. Persisted; reflected in the hamburger toggle.
function toggleSmoothMode(on) {
  const enabled =
    on === undefined ? !document.body.classList.contains("smooth-mode") : !!on;
  document.body.classList.toggle("smooth-mode", enabled);
  try {
    setSmoothMode(enabled);
  } catch (e) {}
  const cb = document.getElementById("smooth-mode-toggle");
  if (cb) cb.checked = enabled;
}

function setAnimLevel(val) {
  setAnimLevelRaw(val);
  document.body.classList.toggle(
    "no-cascade",
    val === "medium" || val === "off",
  );
  document.body.classList.toggle("no-anim", val === "off");
  document
    .querySelectorAll(".anim-seg-btn")
    .forEach((b) => b.classList.toggle("active", b.dataset.val === val));
}

// ── TEXT SIZE ───────────────────────────────────────────────
// App-wide text/UI scaling via CSS `zoom` on the root element. The app's CSS is
// px-based (so root font-size wouldn't cascade); `zoom` scales text + layout
// proportionally and is well-supported in mobile WebKit/Blink. Persisted; the
// hamburger "Text Size" A−/A+ buttons step it. (Distinct from pinch-zoom.)
function _applyFontScale(v) {
  // zoom:"" (not "1") so the default state has no inline override at all.
  document.documentElement.style.zoom = v === 1 ? "" : String(v);
  const el = document.getElementById("font-scale-readout");
  if (el) el.textContent = Math.round(v * 100) + "%";
}
function adjustFontScale(delta) {
  let v = Math.round((getFontScale() + delta) * 100) / 100;
  v = Math.max(FONT_SCALE_MIN, Math.min(FONT_SCALE_MAX, v));
  setFontScale(v);
  _applyFontScale(v);
}
function resetFontScale() {
  setFontScale(1);
  _applyFontScale(1);
}

// Battery Saver: kills the GPU-heavy decorative work (ambient orbs, every
// backdrop blur, the holo glow/sweep loops) while KEEPING smooth UI
// transitions — distinct from "Animations: Off" which removes all motion but
// leaves the expensive static blurs running. Persisted; auto-enables on low
// battery only while the user has never set it manually.
function _applyBatterySaver(on) {
  document.body.classList.toggle("battery-saver", on);
  const cb = document.getElementById("battery-saver-toggle");
  if (cb) cb.checked = on;
}
function toggleBatterySaver(on) {
  const enabled =
    on === undefined
      ? !document.body.classList.contains("battery-saver")
      : !!on;
  try {
    setBatterySaver(enabled);
  } catch (e) {}
  _applyBatterySaver(enabled);
}

function clearMatches() {
  if (!confirm("Clear all match data?")) return;
  state.matches = [];
  lastMatchSnapshot = null;
  document.getElementById("undoAddBtn").style.display = "none";
  saveCloudData();
  commit();
  refreshManage();
}
function clearNames() {
  if (!confirm("Clear all players?")) return;
  state.players = {};
  playerAliasMap = {};
  nextPlayerId = 1;
  rebuildNameMaps();
  saveCloudData();
  refreshManage();
  renderNamesTable();
}
function exportData() {
  navigator.clipboard
    .writeText(
      JSON.stringify(
        { matches: state.matches, players: state.players, playerAliasMap, nextPlayerId },
        null,
        2,
      ),
    )
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
  state.matches.forEach((m) => {
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

// ── BACKUP / RESTORE (round-trip file + Google Drive) ──────
// The backup envelope is a versioned superset of the Firestore payload:
// it includes seasons (which the old clipboard exportData() omitted) and
// a format tag so importBackupFile can validate before merging.
function _backupPayload() {
  return {
    format: "ekta-padel-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    matches: state.matches,
    players: state.players,
    playerAliasMap,
    nextPlayerId,
    seasons: state.seasons,
  };
}

function _backupFilename() {
  const d = new Date().toISOString().slice(0, 10);
  return `ekta-padel-backup-${d}.json`;
}

// Try to get a fresh Drive access token if we don't have one (e.g. after a
// page refresh). Triggers a silent re-auth popup — the user has already
// consented to the drive.file scope, so this is usually instant.
async function _ensureDriveToken() {
  if (_driveAccessToken) return true;
  if (!auth.currentUser) return false;
  try {
    const result = await signInWithPopup(auth, provider);
    _driveAccessToken =
      GoogleAuthProvider.credentialFromResult(result)?.accessToken || null;
    return !!_driveAccessToken;
  } catch (e) {
    return false;
  }
}

// Upload backup directly to Google Drive.
async function backupToDrive() {
  const blob = new Blob([JSON.stringify(_backupPayload(), null, 2)], {
    type: "application/json",
  });
  const filename = _backupFilename();
  const hasToken = await _ensureDriveToken();
  if (!hasToken) {
    showToast("Sign in to use Drive backup", "⚠️");
    return;
  }
  showToast("Uploading to Drive…", "☁️");
  try {
    const link = await _uploadToDrive(blob, filename);
    // Retain the newest backup per day for the last 7 days (prunes same-day dups).
    _pruneDriveBackups(7).catch(() => {});
    showToast("Saved to Drive!", "✅");
    const el = document.getElementById("expOk");
    if (el) {
      el.innerHTML = `Saved! <a href="${escHtml(link)}" target="_blank"
        style="color:var(--theme);text-decoration:underline">Open in Drive ↗</a>`;
      el.classList.add("show");
      setTimeout(() => { el.classList.remove("show"); el.innerHTML = ""; }, 8000);
    }
  } catch (e) {
    const msg = e?.message || String(e);
    console.error("Drive upload failed:", msg, e);
    showToast(`Drive error: ${msg}`, "⚠️");
  }
}

// Download backup JSON file to device.
async function exportJsonFile() {
  const blob = new Blob([JSON.stringify(_backupPayload(), null, 2)], {
    type: "application/json",
  });
  const filename = _backupFilename();
  const file = new File([blob], filename, { type: "application/json" });
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: "Ekta Padel Backup",
      text: `Full backup — ${state.matches.length} matches`,
    }).catch(() => {});
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  const el = document.getElementById("expOk");
  if (el) {
    el.textContent = "Downloaded!";
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2500);
  }
}

// Keep the old name as an alias so any saved bookmarks / existing calls still work.
async function exportBackupFile() { return backupToDrive(); }

// Find-or-create the app-owned Drive folder that holds every backup. Under the
// drive.file scope the app can only see files/folders IT created, so this folder
// MUST be created by the app (a folder made elsewhere would be invisible here).
// Cached in localStorage to avoid re-querying on every upload; re-resolves if the
// cached folder was trashed/removed. Returns null on any failure — callers then
// fall back to the Drive root so a backup never fails just because foldering did.
const _DRIVE_FOLDER_KEY = "padel_drive_folder_id";
const _DRIVE_FOLDER_NAME = "Ekta Padel Backups";
let _driveFolderId = null;
async function _ensureDriveBackupFolder() {
  if (!_driveAccessToken) return null;
  const auth = { Authorization: `Bearer ${_driveAccessToken}` };
  // 1) Cached id — confirm it still exists and isn't trashed.
  const cached = _driveFolderId || localStorage.getItem(_DRIVE_FOLDER_KEY);
  if (cached) {
    try {
      const r = await fetch(
        `https://www.googleapis.com/drive/v3/files/${cached}?fields=id,trashed`,
        { headers: auth },
      );
      if (r.ok) {
        const d = await r.json();
        if (!d.trashed) return (_driveFolderId = d.id);
      }
    } catch {}
  }
  // 2) Search for an existing app-created folder by name.
  try {
    const q = encodeURIComponent(
      `mimeType='application/vnd.google-apps.folder' and name='${_DRIVE_FOLDER_NAME}' and trashed=false`,
    );
    const r = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&pageSize=1`,
      { headers: auth },
    );
    if (r.ok) {
      const { files = [] } = await r.json();
      if (files[0]) {
        localStorage.setItem(_DRIVE_FOLDER_KEY, files[0].id);
        return (_driveFolderId = files[0].id);
      }
    }
  } catch {}
  // 3) Create it.
  try {
    const r = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: _DRIVE_FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder",
      }),
    });
    if (r.ok) {
      const d = await r.json();
      localStorage.setItem(_DRIVE_FOLDER_KEY, d.id);
      return (_driveFolderId = d.id);
    }
  } catch {}
  return null;
}

// Upload a Blob to Drive using the multipart upload API, into the app's backup
// folder. Returns the web-view link of the created file.
async function _uploadToDrive(blob, filename) {
  const folderId = await _ensureDriveBackupFolder();
  const metadata = {
    name: filename,
    mimeType: "application/json",
    description: `Ekta Padel backup — ${state.matches.length} matches, exported ${new Date().toLocaleDateString()}`,
    ...(folderId ? { parents: [folderId] } : {}),
  };
  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
  );
  form.append("file", blob);
  const resp = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${_driveAccessToken}` },
      body: form,
    },
  );
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    let errMsg = `HTTP ${resp.status}`;
    try { errMsg = JSON.parse(body)?.error?.message || errMsg; } catch {}
    console.error("Drive API error", resp.status, body);
    // Token expired/invalid → clear so next call triggers re-auth
    if (resp.status === 401 || resp.status === 403) _driveAccessToken = null;
    throw new Error(errMsg);
  }
  const data = await resp.json();
  return data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`;
}

// ── Shared import logic ─────────────────────────────────────
// Used by both importData (paste) and importBackupFile (file picker).
function _applyImportedData(data) {
  const incomingMatches = data.matches || data.allMatches;
  if (!Array.isArray(incomingMatches)) {
    alert("JSON must include a matches array.");
    return false;
  }
  const existingKeys = new Set(state.matches.map(_mkMatchKey));
  const newMatches = incomingMatches.filter(
    (m) => !existingKeys.has(_mkMatchKey(m)),
  );
  if (newMatches.length === 0) {
    alert("All matches already exist — nothing new to import.");
    return false;
  }
  const skipped = incomingMatches.length - newMatches.length;
  const seasonCount = Array.isArray(data.seasons) ? data.seasons.length : 0;
  const msg =
    `Merge: ${newMatches.length} new match${newMatches.length !== 1 ? "es" : ""} will be added` +
    (skipped ? ` (${skipped} duplicate${skipped !== 1 ? "s" : ""} skipped)` : "") +
    (seasonCount ? `, ${seasonCount} season${seasonCount !== 1 ? "s" : ""} merged` : "") +
    ". Continue?";
  if (!window.confirm(msg)) return false;

  // Merge matches
  const merged = [...state.matches, ...newMatches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  state.matches = merged;

  // Merge players / aliases
  if (data.players && typeof data.players === "object") {
    state.players = { ...state.players, ...data.players };
    playerAliasMap = { ...playerAliasMap, ...(data.playerAliasMap || {}) };
    if (data.nextPlayerId > nextPlayerId) nextPlayerId = data.nextPlayerId;
    rebuildNameMaps();
  } else if (data.aliasMap || data.nameMap) {
    state.aliasMap = { ...state.aliasMap, ...(data.aliasMap || {}) };
    state.nameMap = { ...state.nameMap, ...(data.nameMap || {}) };
  }

  // Merge seasons (dedup by id)
  if (Array.isArray(data.seasons) && data.seasons.length) {
    const existingIds = new Set(state.seasons.map((s) => s.id));
    const newSeasons = data.seasons.filter((s) => s.id && !existingIds.has(s.id));
    if (newSeasons.length) {
      state.seasons = [...state.seasons, ...newSeasons].sort((a, b) =>
        (a.start || "").localeCompare(b.start || ""),
      );
      _persistSeasons();
    }
  }

  lastMatchSnapshot = null;
  document.getElementById("undoAddBtn").style.display = "none";
  saveCloudData();
  commit();
  refreshManage();
  renderNamesTable();
  const added = newMatches.length;
  showToast(
    `Import complete: ${added} match${added !== 1 ? "es" : ""} added.`,
    "✅",
  );
  return true;
}

// File-picker import — accepts the versioned backup format OR the old
// clipboard JSON so either file can be dragged in.
function importBackupFile() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch {
      alert("Could not parse file — make sure it's a valid JSON backup.");
      return;
    }
    // Validate it's a recognisable backup
    if (!data.matches && !data.allMatches) {
      alert("This file doesn't look like an Ekta Padel backup (no matches array).");
      return;
    }
    _applyImportedData(data);
  };
  input.click();
}

// List backup files the app previously uploaded (drive.file scope only sees
// files this app created) and let the admin pick one to restore from.
async function importFromDrive() {
  const hasToken = await _ensureDriveToken();
  if (!hasToken) {
    showToast("Sign in first to access Drive backups", "⚠️");
    return;
  }
  showToast("Fetching Drive backups…", "☁️");
  let files;
  try {
    const q = encodeURIComponent(
      "name contains 'ekta-padel-backup' and mimeType='application/json' and trashed=false",
    );
    const resp = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=createdTime desc&fields=files(id,name,createdTime)&pageSize=20`,
      { headers: { Authorization: `Bearer ${_driveAccessToken}` } },
    );
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      if (resp.status === 401 || resp.status === 403) _driveAccessToken = null;
      let msg = `HTTP ${resp.status}`;
      try { msg = JSON.parse(body)?.error?.message || msg; } catch {}
      throw new Error(msg);
    }
    files = (await resp.json()).files || [];
  } catch (e) {
    console.error("Drive list failed:", e);
    showToast(`Drive error: ${e.message}`, "⚠️");
    return;
  }
  if (!files.length) {
    showToast("No backups found in Drive", "📂");
    return;
  }
  // Build a simple pick-sheet
  const existing = document.getElementById("drive-pick-sheet");
  if (existing) existing.remove();
  const sheet = document.createElement("div");
  sheet.id = "drive-pick-sheet";
  sheet.className = "live-sheet-wrap live-sheet-open";
  sheet.innerHTML = `
    <div class="live-sheet-overlay" onclick="document.getElementById('drive-pick-sheet')?.remove()"></div>
    <div class="live-sheet">
      <div class="live-sheet-handle"></div>
      <div style="font-size:13px;font-weight:800;padding:4px 0 12px;letter-spacing:0.04em">
        ☁️ RESTORE FROM DRIVE
      </div>
      ${files.map(f => {
        const d = new Date(f.createdTime).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" });
        return `<button class="live-sheet-item" onclick="
          document.getElementById('drive-pick-sheet')?.remove();
          _downloadDriveBackup(${JSON.stringify(f.id)},${JSON.stringify(f.name)})
        " style="flex-direction:column;align-items:flex-start;gap:2px">
          <span style="font-weight:700;font-size:12px">${escHtml(f.name)}</span>
          <span style="font-size:10px;color:var(--muted)">${d}</span>
        </button>`;
      }).join("")}
      <button class="live-sheet-item" style="color:var(--muted);margin-top:4px"
        onclick="document.getElementById('drive-pick-sheet')?.remove()">Cancel</button>
    </div>`;
  document.body.appendChild(sheet);
}

async function _downloadDriveBackup(fileId, filename) {
  const hasToken = await _ensureDriveToken();
  if (!hasToken) { showToast("Token expired — sign in again", "⚠️"); return; }
  showToast(`Downloading ${filename}…`, "☁️");
  try {
    const resp = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${_driveAccessToken}` } },
    );
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = JSON.parse(await resp.text());
    if (!data.matches && !data.allMatches)
      throw new Error("File doesn't look like an Ekta Padel backup.");
    _applyImportedData(data);
  } catch (e) {
    console.error("Drive download failed:", e);
    showToast(`Download failed: ${e.message}`, "⚠️");
  }
}

// Legacy paste-import — kept for backwards compat; now delegates to the
// shared merge so it also picks up seasons from old clipboard exports.
function importData() {
  const raw = prompt(
    "Paste JSON export data to import (matches + players + aliases):",
  );
  if (!raw) return;
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    alert("Invalid JSON — paste the full contents of an export file.");
    return;
  }
  _applyImportedData(data);
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


function _saveExcludedPlayers() {
  try {
    localStorage.setItem(
      "padel-exclude-players",
      JSON.stringify([..._excludedPlayers]),
    );
  } catch (e) {}
}

function _updateExcludeBtn() {
  const btn = document.getElementById("cmpExcludeBtn");
  if (!btn) return;
  const guestCount = Object.values(state.players).filter(
    (p) => p.isGuest && !_sessionGuestUnexcluded.has(p.name),
  ).length;
  const n = guestCount + _excludedPlayers.size;
  btn.classList.toggle("ss-eq-btn-on", n > 0);
  btn.innerHTML = n > 0 ? `🚫<span class="ss-exc-badge">${n}</span>` : "🚫";
}

function openExcludeSheet() {
  const overlay = document.getElementById("exclude-sheet-overlay");
  const sheet = document.getElementById("exclude-sheet");
  const list = document.getElementById("exclude-sheet-list");
  if (!overlay || !sheet || !list) return;
  const guestNames = new Set(
    Object.values(state.players)
      .filter((p) => p.isGuest)
      .map((p) => p.name),
  );
  // Collect all names — guests first (pre-checked), then non-guests
  const guestSorted = [...guestNames].sort((a, b) => a.localeCompare(b));
  const nonGuestNames = new Set();
  state.matches.forEach((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
      const n = state.nameMap[p] || p;
      if (!guestNames.has(n)) nonGuestNames.add(n);
    }),
  );
  Object.values(state.players).forEach((p) => {
    if (!p.isGuest) nonGuestNames.add(state.nameMap[p.name] || p.name);
  });
  const nonGuestSorted = [...nonGuestNames]
    .filter((n) => n)
    .sort((a, b) => a.localeCompare(b));

  const makeItem = (p, isGuest) => {
    const on = isGuest
      ? !_sessionGuestUnexcluded.has(p)
      : _excludedPlayers.has(p);
    const guestTag = isGuest
      ? `<span style="font-size:9px;color:var(--muted);margin-left:auto;padding-right:4px;flex-shrink:0">GUEST</span>`
      : "";
    return `<button class="live-sheet-item${on ? " live-sheet-item-selected" : ""}" onclick="toggleExcludePlayer(${jsArg(p)})">
      ${sheetAv(p)}
      <span class="live-sheet-item-name">${escHtml(p)}</span>
      ${guestTag}
      ${on ? '<span class="live-sheet-check">✓</span>' : ""}
    </button>`;
  };

  const rows = [
    ...guestSorted.map((p) => makeItem(p, true)),
    ...(guestSorted.length && nonGuestSorted.length
      ? [`<div class="exc-divider"></div>`]
      : []),
    ...nonGuestSorted.map((p) => makeItem(p, false)),
  ];
  list.innerHTML = rows.join("");
  overlay.classList.add("live-sheet-open");
  sheet.classList.add("live-sheet-open");
}

function toggleExcludePlayer(name) {
  const isGuest = Object.values(state.players).some(
    (p) => p.isGuest && p.name === name,
  );
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
    list.querySelectorAll(".live-sheet-item").forEach((btn) => {
      const nameEl = btn.querySelector(".live-sheet-item-name");
      if (!nameEl || nameEl.textContent !== name) return;
      const on = isGuest
        ? !_sessionGuestUnexcluded.has(name)
        : _excludedPlayers.has(name);
      btn.classList.toggle("live-sheet-item-selected", on);
      const existing = btn.querySelector(".live-sheet-check");
      if (on && !existing)
        btn.insertAdjacentHTML(
          "beforeend",
          '<span class="live-sheet-check">✓</span>',
        );
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
  Object.values(state.players)
    .filter((p) => p.isGuest)
    .forEach((p) => _sessionGuestUnexcluded.add(p.name));
  _updateExcludeBtn();
  renderCompact();
  closeExcludeSheet();
}

function closeExcludeSheet() {
  document
    .getElementById("exclude-sheet-overlay")
    ?.classList.remove("live-sheet-open");
  document.getElementById("exclude-sheet")?.classList.remove("live-sheet-open");
}

function openColSheet() {
  _renderColChips();
  document
    .getElementById("col-sheet-overlay")
    ?.classList.add("live-sheet-open");
  document.getElementById("col-sheet")?.classList.add("live-sheet-open");
}
function closeColSheet() {
  document
    .getElementById("col-sheet-overlay")
    ?.classList.remove("live-sheet-open");
  document.getElementById("col-sheet")?.classList.remove("live-sheet-open");
}
function _renderColChips() {
  const list = document.getElementById("col-chip-list");
  if (!list) return;
  const chips = _CMP_TOGGLE_COLS
    .map(
      (c) =>
        `<button class="col-chip${_cmpHiddenCols.has(c.key) ? "" : " col-chip--on"}" onclick="toggleCmpCol(${jsArg(c.key)})">${escHtml(c.label)}</button>`,
    )
    .join("");
  const showAll =
    _cmpHiddenCols.size > 0
      ? `<button class="ss-exc-clear-btn" onclick="showAllCmpCols()">SHOW ALL</button>`
      : "";
  list.innerHTML = chips + showAll;
}
function showAllCmpCols() {
  _cmpHiddenCols.clear();
  try {
    localStorage.setItem("padel_cmp_hidden_cols_v3", JSON.stringify([]));
  } catch (e) {}
  _applyCmpColClasses();
  _renderColChips();
}
function toggleCmpCol(key) {
  if (_cmpHiddenCols.has(key)) _cmpHiddenCols.delete(key);
  else _cmpHiddenCols.add(key);
  try {
    localStorage.setItem(
      "padel_cmp_hidden_cols_v3",
      JSON.stringify([..._cmpHiddenCols]),
    );
  } catch (e) {}
  _applyCmpColClasses();
  _renderColChips();
}
function _applyCmpColClasses() {
  const table = document.querySelector(".cmp");
  if (!table) return;
  _CMP_TOGGLE_COLS.forEach((c) =>
    table.classList.toggle(`hide-col-${c.key}`, _cmpHiddenCols.has(c.key)),
  );
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
  const pMatches = state.matches
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

// getSRRatingClass now lives in ./format.js.

// _hudGaugeId + buildHudGaugeSvg now live in ./charts.js.

let _renderHomeGen = 0;
function renderHome() {
  _homeRenderedVersion = _dataVersion;
  _homeRenderedFilter = `${homeFilter}|${homeFrom || ""}|${homeTo || ""}`;
  const filtered = filterMatches(homeFilter, homeFrom, homeTo);
  const homeEloMapFull = computeElo(filtered);
  const stats = computeStats(filtered, homeEloMapFull);
  const totalG = filtered.reduce((s, m) => s + m.scoreA + m.scoreB, 0);
  const uniqD = new Set(filtered.map((m) => m.date)).size;
  const board = document.getElementById("board");
  if (!stats.length) {
    board.innerHTML = emptyState({
      card: true,
      icon: "🏓",
      title: "No matches yet",
      message: "Tap + Add to log your first match.",
      action: { label: "Add Matches", onClick: "goTo('add')", variant: "primary" },
    });
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

  // ELO deltas (recent-5 and 30-day trend) for the card badges.
  // Derived from a SINGLE ELO-history pass instead of recomputing the whole
  // ladder once per player per metric (was ~22 full computeElo() calls + 22
  // fingerprint-string allocations per home render — heavy GC churn on mobile).
  // The history holds each player's running ELO after every match, so a recent
  // delta is just (current ELO − ELO at the start of the window).
  const _histAll = computeEloHistory(filtered);
  const _thirtyAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  })();
  const eloDeltaMap = {};
  const monthlyEloDeltaMap = {};
  stats.forEach((p) => {
    const hist = _histAll[p.name] || [];
    if (!hist.length) {
      eloDeltaMap[p.name] = null;
      monthlyEloDeltaMap[p.name] = null;
      return;
    }
    const cur = hist[hist.length - 1].elo;
    // Last-5 trend: ELO now vs ELO just before this player's last 5 matches.
    const base5 = hist.length > 5 ? hist[hist.length - 6].elo : 1000;
    eloDeltaMap[p.name] = Math.round(cur - base5);
    // 30-day trend: ELO now vs ELO just before the first match in the window.
    const idx30 = hist.findIndex((h) => (h.date || "") >= _thirtyAgo);
    monthlyEloDeltaMap[p.name] =
      idx30 === -1
        ? null
        : Math.round(cur - (idx30 > 0 ? hist[idx30 - 1].elo : 1000));
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
    const eldHtml =
      mEld !== null && mEld !== undefined
        ? badge({
            label: `${mEld > 0 ? "▲" : mEld < 0 ? "▼" : "–"}${Math.abs(mEld)}`,
            tone: mEld > 0 ? "success" : mEld < 0 ? "danger" : "neutral",
          })
        : eld !== null && eld !== undefined
          ? badge({
              label: `${eld > 0 ? "▲" : eld < 0 ? "▼" : ""}${eld > 0 ? "+" : ""}${eld}`,
              tone: eld > 0 ? "success" : eld < 0 ? "danger" : "neutral",
            })
          : "";
    // streak chip
    const streakChip =
      p.curStreak > 0
        ? badge({
            label: `${p.curStreak}${p.curType}`,
            icon: p.curType === "W" ? "🔥" : "❄️",
            tone: p.curType === "W" ? "success" : "warning",
          })
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

    // Component-system primitives shared by both card variants
    const srBar = progressBar({ value: p.sr, max: maxSR, label: `SR score: ${p.sr.toFixed(2)}` });
    const statsRow = statRow([
      { value: p.mp, label: "Played" },
      { value: `${p.mw}W–${p.ml}L`, label: "Record", tone: p.mw > p.ml ? "success" : p.mw < p.ml ? "danger" : "neutral" },
      { value: `${p.winPct.toFixed(0)}%`, label: "Win %" },
      { value: `${p.gw}–${p.gl} ${ds}`, label: "G Diff", tone: p.diff > 0 ? "success" : p.diff < 0 ? "danger" : "neutral" },
      { value: `${p.gamePct.toFixed(0)}%`, label: "G%", tone: p.gamePct >= 50 ? "success" : "danger" },
    ]);

    if (document.body.classList.contains("holo-mode")) {
      const corners = `<span class="holo-corner holo-corner-tl"></span><span class="holo-corner holo-corner-tr"></span><span class="holo-corner holo-corner-bl"></span><span class="holo-corner holo-corner-br"></span>`;
      return `<div class="pc ${rc} holo-pc" style="--card-index:${i}" onclick="openPlayerDetail(${jsArg(p.name)})">${corners}<div class="glow"></div><div class="ct"><div class="rb">${ri}</div><div class="ct-nameblock"><div class="pname-elo-row"><span class="pname">${escHtml(p.name)}</span><span class="pname-elo">${homeEloMap[p.name] || 1000}</span>${mkLvlRow(p.name)}</div></div><div class="skill-block"><div class="mini-gauge-wrap">${buildHudGaugeSvg(p.sr, cardRatingClass)}<div class="sr-val hud-sr-val ${cardRatingClass}" data-final="${p.sr.toFixed(2)}">${p.sr.toFixed(2)}</div></div></div></div>${srBar}${statsRow}${sparklineHtml}</div>`;
    }
    return `<div class="pc ${rc}" style="--card-index:${i}" onclick="openPlayerDetail(${jsArg(p.name)})"><div class="glow"></div><div class="ct"><div class="rb">${ri}</div><div class="ct-nameblock"><div class="pname-elo-row"><span class="pname">${escHtml(p.name)}</span><span class="pname-elo">${homeEloMap[p.name] || 1000}</span>${mkLvlRow(p.name)}</div></div><div class="skill-block"><div class="mini-gauge-wrap"><div class="sr-ring ${cardRatingClass}" style="--speed-angle:${cardAngle}deg;--target-angle:${cardAngle}deg"><div class="gauge"><div class="needle"></div></div><div class="sr-val" data-final="${p.sr.toFixed(2)}">${p.sr.toFixed(2)}</div></div></div></div></div>${srBar}${statsRow}${sparklineHtml}</div>`;
  });

  _renderSessionActiveCard();

  if (
    document.body.classList.contains("splash-done") &&
    !document.body.classList.contains("no-cascade")
  ) {
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
        card
          .querySelectorAll(".holo-gauge-val[data-final]")
          .forEach((el) => animateSrVal(el, 220 + i * 60));
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
    board
      .querySelectorAll(".holo-gauge-val[data-final]")
      .forEach((el) => animateSrVal(el, 300));
  }
}

// animateXpRow -> ./render-anim.js

// animateSrVal -> ./render-anim.js

// ── LEADERBOARD GAME-WINDOW HELPERS ────────────────────────
function _computeLbWindowStats(baseMatches) {
  const playerNames = new Set();
  baseMatches.forEach((m) => {
    (m.teamA || []).forEach((p) => playerNames.add(p));
    (m.teamB || []).forEach((p) => playerNames.add(p));
  });
  const statsList = [];
  const eloMap = {};
  for (const playerName of playerNames) {
    const pm = _getPlayerWindowMatches(playerName, baseMatches, _lbWindow);
    const pEloMap = computeElo(pm);
    const pStats = computeStats(pm, pEloMap);
    const ps = pStats.find((s) => s.name === playerName);
    if (ps) {
      statsList.push(ps);
      eloMap[playerName] = pEloMap[playerName];
    }
  }
  return { stats: statsList, eloMap };
}

function _renderLbWindowBar() {
  const bar = document.getElementById("lbWindowBar");
  if (!bar) return;
  const mode = _lbWindow ? _lbWindow.mode : "all";
  const count = _lbWindow ? _lbWindow.count : 10;
  const chip = mode !== "all"
    ? `<button class="cmp-count-chip" style="margin-left:2px" onclick="_lbSetWindow('${mode}')">${count}</button>`
    : "";
  bar.innerHTML = `<div style="display:flex;gap:4px;align-items:center;padding:4px 12px 6px">
    <span style="font-size:9px;font-weight:700;color:var(--muted);letter-spacing:0.1em;flex-shrink:0">GAMES</span>
    <button class="digest-filter-btn${mode === "all" ? " active" : ""}" onclick="_lbSetWindow('all')" style="padding:2px 7px;font-size:9px">ALL</button>
    <button class="digest-filter-btn${mode === "first" ? " active" : ""}" onclick="_lbSetWindow('first')" style="padding:2px 7px;font-size:9px">FIRST</button>
    <button class="digest-filter-btn${mode === "last" ? " active" : ""}" onclick="_lbSetWindow('last')" style="padding:2px 7px;font-size:9px">LAST</button>
    ${chip}
  </div>`;
}

function _lbSetWindow(mode) {
  if (mode === "all") {
    _lbWindow = null;
    _renderLbWindowBar();
    document.body.classList.add("no-cascade");
    const _t = document.getElementById("cmpBody");
    if (_t) _t.innerHTML = "";
    renderCompact();
    document.body.classList.remove("no-cascade");
  } else {
    _cmpCountPickerOpen("lb", mode);
  }
}

// ── RENDER COMPACT ─────────────────────────────────────────
// _sweepNeedle -> ./render-anim.js

// runSpeedometerSweep -> ./render-anim.js

function renderCompact() {
  _compactRenderedVersion = _dataVersion;
  _compactRenderedFilter = `${cmpFilter}|${cmpFrom || ""}|${cmpTo || ""}|${cmpSortKey}|${cmpSortAsc}|${[..._excludedPlayers].sort().join(",")}|${_lbWindow ? `${_lbWindow.mode}:${_lbWindow.count}` : "none"}`;
  _updateExcludeBtn();
  const _cmpDateLbl = document.getElementById("cmpDateLabel");
  if (_cmpDateLbl) {
    const _LBL_MONTHS = [
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
    const _fmtLbl = (iso) => {
      const [, m, d] = iso.split("-");
      return `${parseInt(d)} ${_LBL_MONTHS[parseInt(m)]}`;
    };
    const _cmpLblMap = {
      all: "ALL TIME",
      today: "TODAY",
      week: "THIS WEEK",
      lastweek: "LAST WEEK",
      weekend: "WEEKEND",
      month: "THIS MONTH",
      range: "RANGE",
      day: "DAY",
    };
    if (cmpFilter === "day" && cmpFrom)
      _cmpDateLbl.textContent = _fmtLbl(cmpFrom);
    else if (cmpFilter === "range" && cmpFrom && cmpTo)
      _cmpDateLbl.textContent = `${_fmtLbl(cmpFrom)}–${_fmtLbl(cmpTo)}`;
    else
      _cmpDateLbl.textContent =
        _cmpLblMap[cmpFilter] || cmpFilter.toUpperCase();
  }
  _renderLbWindowBar();
  const filtered = filterMatches(cmpFilter, cmpFrom, cmpTo);
  let _cmpEloMap, stats;
  if (_lbWindow) {
    const r = _computeLbWindowStats(filtered);
    _cmpEloMap = r.eloMap;
    stats = r.stats;
  } else {
    _cmpEloMap = computeElo(filtered);
    stats = computeStats(filtered, _cmpEloMap);
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
    sr: (a, b) => {
      // Compare at display precision (SR 2dp, G% 0dp) so two players that
      // look identical on screen resolve to a real tie instead of being
      // split by sub-pixel float noise. Order: SR -> G% -> GW.
      return (
        Math.round(a.sr * 100) - Math.round(b.sr * 100) ||
        Math.round(a.gamePct) - Math.round(b.gamePct) ||
        a.gw - b.gw
      );
    },
  };
  const sorted = [...stats].sort((a, b) => {
    const cmp = sortFns[cmpSortKey](a, b);
    if (cmp !== 0) return cmpSortAsc ? cmp : -cmp;
    return a.name.localeCompare(b.name, undefined, {
      sensitivity: "base",
    });
  });
  // Competition ranking (1-2-2-4): players the active sort treats as equal
  // share a rank — for the default SR sort that means identical SR, G% and GW
  // — and the next distinct player skips the tied positions (two 4ths -> 6th).
  const _cmpRankByName = {};
  sorted.forEach((p, i) => {
    _cmpRankByName[p.name] =
      i > 0 && sortFns[cmpSortKey](sorted[i - 1], p) === 0
        ? _cmpRankByName[sorted[i - 1].name]
        : i + 1;
  });
  const maxSR = sorted.length ? sorted[0].sr || 1 : 1;
  const fname = {
    all: "All Time",
    today: "Today",
    week: "This Week",
    lastweek: "Last Week",
    weekend: "Weekend",
    month: "This Month",
    range: "Custom Range",
    day: "Selected Day",
  };
  const _lbWinLabel = _lbWindow
    ? ` &nbsp;·&nbsp; ${_lbWindow.mode === "first" ? "FIRST" : "LAST"} <strong>${_lbWindow.count}</strong> per player`
    : "";
  document.getElementById("cmpMeta").innerHTML =
    `<strong>${stats.length}</strong> players &nbsp;·&nbsp; <strong>${filtered.length}</strong> matches &nbsp;·&nbsp; ${fname[cmpFilter]}${_lbWinLabel}`;
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
  const srSorted = [...sorted].sort((a, b) => b.sr - a.sr);
  const srRankMap = {};
  srSorted.forEach((p, j) => {
    srRankMap[p.name] = j + 1;
  });
  const leaderRowHtmls = sorted.map((p, i) => {
    const rank = _cmpRankByName[p.name];
    const rc = rank === 1 ? "rg" : rank === 2 ? "rs" : rank === 3 ? "rb2" : "";
    const ri =
      rank === 1
        ? "🥇"
        : rank === 2
          ? "🥈"
          : rank === 3
            ? "🥉"
            : `<span class="rn">${rank}</span>`;
    const mc = p.mw > p.ml ? "p" : p.mw < p.ml ? "n" : "m";
    const gc = p.gamePct >= 50 ? "tp" : "tn";
    const displaySR = p.sr;
    const normalizedSR = Math.max(0, Math.min(10, displaySR));
    const ratingClass = getSRRatingClass(normalizedSR);
    const momentumBadge = getMomentumBadge(p.name);
    const animClass = "";
    const prevRank = prevRankMap[p.name];
    const curRank = rank;
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
    return `<tr class="${rc}${animClass}" data-key="${escHtml(p.name)}" style="cursor:pointer" onclick="openPlayerDetail(${jsArg(p.name)})"><td>${ri}</td><td>${escHtml(p.name.toUpperCase())}${rankDelta}</td><td data-col="mp">${p.mp}</td><td data-col="record"><span class="rec-cell ${mc}">${p.mw}–${p.ml}</span></td><td data-col="winPct">${p.winPct.toFixed(0)}%</td><td data-col="gw" class="tp">${p.gw}</td><td data-col="gl" class="tn">${p.gl}</td><td data-col="gamePct" class="${gc}">${p.gamePct.toFixed(0)}%</td><td data-col="elo" class="cmp-elo-cell">${eloVal}</td><td><span class="sr-pill-val ${ratingClass}" data-final="${displaySR.toFixed(2)}" style="color:${_rankColor(srRankMap[p.name], sorted.length)};font-weight:800;font-size:12px">${displaySR.toFixed(2)}</span></td></tr>`;
  });

  _cmpLeaderHtmls = leaderRowHtmls;
  _cmpFiltered = filtered;

  // ELO deltas are always computed over the ALL-TIME (active-season) trajectory,
  // not the current date filter — so a match's "+12/−8" reflects its real ELO
  // impact regardless of whether Today/This Week/etc. is selected. The map is
  // keyed by match identity, so the filtered rows below still resolve their own
  // delta from the full walk.
  const matchEloDeltas = _computeMatchEloDeltas(activeMatches());
  const reversedMatches = [...filtered].reverse();

  const cmpMatchesEl = document.getElementById("cmpMatches");
  const matchesHeader = cmpMatchesEl.previousElementSibling;

  // Animate the staggered entrance only on the FIRST paint of the table.
  // Subsequent renders (sort / filter) reconcile in place via morphList so the
  // table reorders smoothly instead of re-playing the whole cascade.
  const _firstPaint = !tbody.querySelector("tr[data-key]");
  if (_firstPaint && splashDone && !document.body.classList.contains("no-cascade")) {
    tbody.innerHTML = "";
    cmpMatchesEl.innerHTML = "";
    matchesHeader.style.opacity = "0";
    matchesHeader.style.transform = "translateY(14px)";
    matchesHeader.style.transition =
      "opacity 0.38s cubic-bezier(0.22,1,0.36,1), transform 0.38s cubic-bezier(0.22,1,0.36,1)";

    leaderRowHtmls.forEach((html, i) => {
      setTimeout(() => {
        tbody.insertAdjacentHTML("beforeend", html);
        const srEl = tbody.lastElementChild.querySelector(
          ".sr-pill-val[data-final]",
        );
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
        .map((m) =>
          buildSummaryMatchRow(
            m,
            " card-anim",
            state.matches.indexOf(m),
            matchEloDeltas,
          ),
        );
      const restRows = reversedMatches
        .slice(animCount)
        .map((m) =>
          buildSummaryMatchRow(m, "", state.matches.indexOf(m), matchEloDeltas),
        );
      animRows.forEach((html, i) => {
        setTimeout(
          () => {
            list.insertAdjacentHTML("beforeend", html);
          },
          matchStartDelay + i * 100,
        );
      });
      if (restRows.length) {
        setTimeout(
          () => {
            list.insertAdjacentHTML("beforeend", restRows.join(""));
          },
          matchStartDelay + animCount * 100,
        );
      }
      const summaryHtml = buildHistorySummary(filtered, cmpFilter);
      if (summaryHtml) {
        setTimeout(
          () => {
            cmpMatchesEl.insertAdjacentHTML("beforeend", summaryHtml);
            setTimeout(_animEloCounts, 80);
          },
          matchStartDelay + animCount * 100 + 100,
        );
      }
    } else {
      setTimeout(() => {
        cmpMatchesEl.innerHTML = emptyState({ card: true, size: "sm", icon: "🏓", message: "No matches found" });
      }, matchStartDelay);
    }
  } else {
    matchesHeader.style.cssText = "";
    // Incremental reconcile: reuse unchanged rows, only animate new/changed SR.
    const _touched = morphList(tbody, leaderRowHtmls.join(""));
    _touched.forEach((row) => {
      const el =
        row.querySelector && row.querySelector(".sr-pill-val[data-final]");
      if (el) animateSrVal(el, 0);
    });
    const _nc = document.body.classList.contains("no-cascade");
    const initRows = reversedMatches.map((m, i) =>
      buildSummaryMatchRow(
        m,
        i < 10 && !_nc ? " card-anim" : "",
        state.matches.indexOf(m),
        matchEloDeltas,
      ),
    );
    if (initRows.length) {
      cmpMatchesEl.innerHTML =
        `<div class="smr-list">${initRows.join("")}</div>` +
        buildHistorySummary(filtered, cmpFilter);
      setTimeout(_animEloCounts, 80);
    } else {
      cmpMatchesEl.innerHTML = emptyState({ card: true, size: "sm", icon: "🏓", message: "No matches found" });
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
  document
    .querySelectorAll("#cmpHead th")
    .forEach((th) => th.classList.remove("cmp-th-sort-active"));
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
// isFireMatch → ./render-match-rows.js

// isDominatingMatch → ./render-match-rows.js

// isZeroMatch → ./render-match-rows.js

// buildMatchRowHtml → ./render-match-rows.js

// buildCompactMatchRows → ./render-match-rows.js

function _computeMatchEloDeltas(matches) {
  const elo = {};
  const map = new Map();
  [...matches]
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .forEach((m) => {
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
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
      map.set(m, { dA, dB });
      m.teamA.forEach((p) => {
        elo[p] = (elo[p] || 1000) + dA;
      });
      m.teamB.forEach((p) => {
        elo[p] = (elo[p] || 1000) + dB;
      });
    });
  return map;
}
// buildSummaryMatchRow → ./render-match-rows.js
// buildSummaryMatchRows → ./render-match-rows.js

// Heavy precompute for the history feed: one chronological ELO walk yielding
// per-match ELO deltas + pre-match pair ranks, plus the pair-vs-pair H2H map.
// Depends only on state.matches, so it's memoized on (_dataVersion, array
// identity). buildMatchCards runs on every history render/filter and this walk
// is O(matches × pairs) — recomputing it each time was a mobile hot spot.
let _mcPrecompMemo = null;
function _matchCardPrecompute() {
  if (
    _mcPrecompMemo &&
    _mcPrecompMemo.version === _dataVersion &&
    _mcPrecompMemo.matchesRef === state.matches
  )
    return _mcPrecompMemo;
  const eloMatchMap = new Map();
  const matchPairRankMap = new Map(); // match → Map(pairKey → pre-match rank)
  const elo = {};
  const allPairsList = _memoPairStats(); // all pairs ever formed
  [...state.matches]
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .forEach((m) => {
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
        if (!(p in elo)) elo[p] = 1000;
      });
      // Rank all pairs by their avg ELO right now (before this match)
      matchPairRankMap.set(
        m,
        new Map(
          allPairsList
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
  // Enhancement 8: pre-compute pair-vs-pair H2H records
  const pvpMap = {};
  state.matches.forEach((hm) => {
    const pa = (hm.teamA || []).slice().sort().join("&");
    const pb = (hm.teamB || []).slice().sort().join("&");
    if (!pa || !pb) return;
    const key = pa <= pb ? `${pa}|${pb}` : `${pb}|${pa}`;
    if (!pvpMap[key]) pvpMap[key] = { a: 0, b: 0, aFirst: pa <= pb };
    const aWonH = hm.scoreA > hm.scoreB;
    const paFirst = pvpMap[key].aFirst;
    if (paFirst ? aWonH : !aWonH) pvpMap[key].a++;
    else pvpMap[key].b++;
  });
  _mcPrecompMemo = {
    version: _dataVersion,
    matchesRef: state.matches,
    eloMatchMap,
    matchPairRankMap,
    pvpMap,
  };
  return _mcPrecompMemo;
}

function buildMatchCards(matches, showAdmin) {
  if (!matches.length)
    return emptyState({ card: true, icon: "🏓", message: "No matches found" });
  // Memoized: per-match ELO deltas, pre-match pair ranks, pair-vs-pair H2H.
  const {
    eloMatchMap,
    matchPairRankMap,
    pvpMap: _pvpMap,
  } = _matchCardPrecompute();
  const mkEloPill = (p, eloData) => {
    const d = eloData[p];
    if (!d) return "";
    const display = normPlayer(p);
    const short =
      Object.keys(state.nameMap).find(
        (k) => state.nameMap[k] === display && k.length === 3,
      ) || display.slice(0, 3).toUpperCase();
    const cls = d.delta >= 0 ? "elo-gain" : "elo-loss";
    const arrow = d.delta >= 0 ? "↑" : "↓";
    return `<span class="elo-delta-pill ${cls}"><span class="elo-pname">${escHtml(short)}</span><span class="elo-pval">${d.after}</span><span class="elo-parrow">${arrow}${Math.abs(d.delta)}</span></span>`;
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
        <span class="team-p1 ${winCls}">${crown}${escHtml(players[0])}</span>
        <span class="team-amp">&</span>
        <span class="team-p2 ${winCls}">${escHtml(players[1])}${p2Suffix}</span>
        <div class="team-score ${scoreCls}" data-final="${score}">0</div>
        ${rankHtml}
      </div>`;
    }
    const label = escHtml(players[0] || "") + (hasZeroEmoji ? " 😭" : "");
    return `<div class="team-block">
      <div class="team-name ${winCls}">${crown}${label}</div>
      <div class="team-score ${scoreCls}" data-final="${score}">0</div>
      ${rankHtml}
    </div>`;
  };

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
      const realIdx = state.matches.indexOf(m);

      // Event badges — Enhancement 7: title tooltips
      const badges = [];
      if (isFire)
        badges.push(
          `<span class="event-badge fire" title="Close match: margin of 1 game">🔥 FIRE MATCH</span>`,
        );
      if (isDominating)
        badges.push(
          `<span class="event-badge dominate" title="Dominant performance: 4-1, 6-1, or 6-2">💀 DOMINATING</span>`,
        );
      if (isZero)
        badges.push(
          `<span class="event-badge zero" title="One team scored 0 games">😂 ZERO SE HAAR GAYE!</span>`,
        );

      const delay = Math.min(index * 0.1, 1); // Staggered delay up to 1s

      // Enhancement 8: pair-vs-pair H2H record badge
      const _pa8 = (m.teamA || []).slice().sort().join("&");
      const _pb8 = (m.teamB || []).slice().sort().join("&");
      const _pvpKey = _pa8 <= _pb8 ? `${_pa8}|${_pb8}` : `${_pb8}|${_pa8}`;
      const _pvp = _pvpMap[_pvpKey];
      let pvpHtml = "";
      if (_pvp && _pvp.a + _pvp.b >= 2) {
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
  const dp = document.getElementById("matchDayPicker");
  if (dr) {
    dr.style.display = "";
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
  if (dp) {
    if (f === "day") {
      // Explicit flex — .dr-wrap defaults to display:none, and (unlike the range
      // picker) the day picker doesn't get the .show class, so an empty inline
      // display would fall back to none and the date input would stay hidden.
      dp.style.display = "flex";
      const di = document.getElementById("matchDayInput");
      if (di && !di.value) di.value = todayISO();
    } else {
      dp.style.display = "none";
    }
  }
  const hdf = document.getElementById("histDateFilter");
  if (hdf && hdf.value !== f) hdf.value = f;
  renderModernMatches();
}

// ── MATCH OF THE DAY + BIGGEST UPSET ──────────────────────

// buildMatchOfTheDay (MOTD / Thriller / Biggest Upset cards) removed — History shows only filtered matches.

// buildHistorySummary → ./render-history-summary.js

function toggleMatchesSection() {
  const list =
    document.querySelector("#cmpMatches .smr-list") ||
    document.querySelector("#cmpMatches .cmp-match-rows");
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
    const heatOpacity = hasMatch
      ? (0.15 + (count / _calMaxCount) * 0.55).toFixed(2)
      : "0";
    const heatStyle = hasMatch
      ? ` style="background:rgba(var(--theme-rgb),${heatOpacity})"`
      : "";
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

// History-feed windowing: render only the most recent _histWindow matches and
// reveal older ones in batches via a "show older" button. Fail-safe — when the
// filtered set is <= the window, rendering is byte-identical to no windowing.
const _HIST_WINDOW_DEFAULT = 60;
const _HIST_WINDOW_BATCH = 60;
let _histWindow = _HIST_WINDOW_DEFAULT;
let _histWindowKey = null;
function _histShowMore() {
  _histWindow += _HIST_WINDOW_BATCH;
  renderModernMatches();
}

let _renderModernGen = 0;
function renderModernMatches() {
  // Generation token: any later render invalidates a still-running first-paint
  // cascade, so stale setTimeout callbacks (which append cards + run the score
  // count-up) bail instead of clobbering/duplicating the freshly-rendered feed.
  // Without this, a re-render mid-cascade (commit / Firebase snapshot / filter)
  // could make the Thriller & Upset feature cards intermittently fail to load.
  const _gen = ++_renderModernGen;
  const query = (
    document.getElementById("modern-match-search")?.value || ""
  ).toLowerCase();
  const mfrom =
    matchTabFilter === "range"
      ? document.getElementById("matchFrom")?.value || null
      : matchTabFilter === "day"
        ? document.getElementById("matchDayInput")?.value || todayISO()
        : null;
  const mto =
    matchTabFilter === "range"
      ? document.getElementById("matchTo")?.value || null
      : null;
  // History is a raw log → guest-inclusive (filterHistoryMatches), unlike the
  // stats-facing Summary which uses the guest-excluded filterMatches.
  let matches = filterHistoryMatches(matchTabFilter, mfrom, mto);
  if (query) {
    const q = query.toLowerCase();
    matches = matches.filter((m) => {
      const players = [...(m.teamA || []), ...(m.teamB || [])].map((p) =>
        (state.nameMap[p] || p).toLowerCase(),
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
  const histPlayerLower = histPlayerFilter.toLowerCase();
  if (histPlayerFilter) {
    matches = matches.filter((m) =>
      [...m.teamA, ...m.teamB].some(
        (p) => (state.nameMap[p] || p).toLowerCase() === histPlayerLower,
      ),
    );
  }
  // Outcome filter (requires a player to be selected)
  if (histOutcomeFilter !== "all" && histPlayerFilter) {
    matches = matches.filter((m) => {
      const inA = m.teamA.some(
        (p) => (state.nameMap[p] || p).toLowerCase() === histPlayerLower,
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
  const histList = document.getElementById("modern-match-list");

  // Windowing: reset to the default window whenever the result set (filters +
  // search) changes; "show older" keeps the same signature so the expanded
  // window survives its re-render. matches is chronological-ascending, so the
  // newest _histWindow are the tail; buildMatchCards reverses to newest-first.
  const _winSig = _histFilterKey() + "|" + query;
  if (_winSig !== _histWindowKey) {
    _histWindow = _HIST_WINDOW_DEFAULT;
    _histWindowKey = _winSig;
  }
  const _windowed =
    matches.length > _histWindow
      ? matches.slice(matches.length - _histWindow)
      : matches;
  const _hidden = matches.length - _windowed.length;
  const _moreBtnHtml =
    _hidden > 0
      ? `<button class="hist-show-more" data-key="hist-more" onclick="_histShowMore()">↓ Show older matches · ${_hidden} more</button>`
      : "";

  // Parse all content into a temp container. The History feed is the filtered
  // match list plus, when a pair/h2h filter is active, that pair's stats card.
  const tmpAll = document.createElement("div");
  tmpAll.innerHTML = summary + buildMatchCards(_windowed, true) + _moreBtnHtml;
  const moreBtn = tmpAll.querySelector(".hist-show-more");

  // Collect feature cards first, then match cards. The only feature card left
  // is the pair/h2h stats card (shown when those filters are active).
  const featureCards = Array.from(
    tmpAll.querySelectorAll(".pair-stats-card"),
  );
  const matchCards = Array.from(tmpAll.querySelectorAll(".match-card"));
  const emptyEl = tmpAll.querySelector(".ui-empty");

  // Stable keys so re-renders (filter changes) reconcile in place instead of
  // wiping + re-animating the whole feed. Match cards key on their state.matches
  // index (stable across filters); feature cards key on their type.
  featureCards.forEach((el) => {
    el.setAttribute("data-key", "feat-pair-stats");
  });
  matchCards.forEach((el) =>
    el.setAttribute(
      "data-key",
      "m" + (el.getAttribute("data-match-idx") || ""),
    ),
  );

  const _noCascade = document.body.classList.contains("no-cascade");
  const _firstPaint = !histList.querySelector("[data-key]");

  if (_firstPaint && !_noCascade) {
    // First paint: staggered entrance cascade (feature + first 10 animated).
    histList.innerHTML = "";
    const allAnimated = [...featureCards, ...matchCards.slice(0, 10)];
    const instant = matchCards.slice(10);
    allAnimated.forEach((el, i) => {
      el.style.opacity = "0";
      el.style.animation = "none";
      setTimeout(() => {
        if (_renderModernGen !== _gen) return; // a newer render superseded this
        el.style.animation = "";
        el.style.opacity = "";
        el.classList.add("card-anim");
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
      }, i * 100);
    });
    if (instant.length) {
      setTimeout(() => {
        if (_renderModernGen !== _gen) return; // superseded by a newer render
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
    if (moreBtn) {
      setTimeout(() => {
        if (_renderModernGen !== _gen) return;
        histList.appendChild(moreBtn);
      }, (allAnimated.length + 1) * 100);
    }
  } else {
    // Re-render (or no-cascade): reconcile in place. Resolve final scores up
    // front (no count-up), then morph — unchanged cards keep their DOM so the
    // feed reorders/filters without flicker and scroll position is preserved.
    const ordered = [...featureCards, ...matchCards];
    ordered.forEach((el) => {
      el.querySelectorAll(
        ".team-score[data-final], .motd-score[data-final]",
      ).forEach((s) => {
        s.textContent = s.dataset.final || "0";
      });
    });
    if (ordered.length) {
      const touched = morphList(
        histList,
        ordered.map((el) => el.outerHTML).join("") +
          (moreBtn ? moreBtn.outerHTML : ""),
      );
      // Don't replay entrance animations when filtering reveals many cards.
      touched.forEach((el) => {
        if (el.style) el.style.animation = "none";
      });
    } else {
      histList.innerHTML =
        (emptyEl ? emptyEl.outerHTML : "") + (moreBtn ? moreBtn.outerHTML : "");
    }
  }
  populateHistoryPlayerChips();
  populateHistoryAdvancedFilters();
  _updateHistFilterBadge();
  _histRenderedVersion = _dataVersion;
  _histRenderedFilter = _histFilterKey();
}

// Identity key for the history feed's current filter set — lets navigation
// skip a re-render when neither the data nor the filters changed.
function _histFilterKey() {
  return [
    matchTabFilter,
    histPlayerFilter || "",
    histOutcomeFilter,
    histMarginFilter,
    histPairFilter || "",
    h2hFilterA || "",
    h2hFilterB || "",
    histScorelineFilter || "",
  ].join("|");
}

// ── COMMIT — single mutation→render path ──────────────────
// Call after any change to the match/player data. Bumps the data version (so
// every other page re-renders lazily on its next navigation via the version
// gates) and immediately re-renders only the page the user is looking at —
// replacing the old "render all four tabs eagerly" bursts.
function renderActivePage() {
  const id = document.querySelector(".page.active")?.id;
  if (id === "pg-home") renderHome();
  else if (id === "pg-compact") renderCompact();
  else if (id === "pg-history") renderModernMatches();
  else if (id === "pg-add") renderAddMatches();
}
function commit() {
  _dataVersion++;
  _invalidateEloMemo();
  renderActivePage();
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
    const target = [...groups].find(
      (g) =>
        g.dataset.date === dateStr ||
        g.querySelector(`[data-date="${dateStr}"]`),
    );
    const firstCard = document.querySelector(
      `.match-card[data-date="${dateStr}"]`,
    );
    const scrollTarget = target || firstCard;
    if (scrollTarget)
      scrollTarget.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// Long-press match card → quick-action sheet (Share, Edit, Delete)
let _lpTimer = null,
  _lpCard = null;
document.addEventListener("pointerdown", (e) => {
  const card = e.target.closest(".match-card");
  if (!card || e.target.closest("button, .swipe-delete-reveal")) return;
  _lpCard = card;
  _lpTimer = setTimeout(() => {
    const idx2 = parseInt(card.dataset.matchIdx, 10);
    if (!isNaN(idx2)) _openMatchQuickActions(idx2, card);
  }, 600);
});
document.addEventListener("pointerup", () => {
  clearTimeout(_lpTimer);
  _lpCard = null;
});
document.addEventListener("pointermove", (e) => {
  if (_lpCard) {
    clearTimeout(_lpTimer);
    _lpCard = null;
  }
});

function _openMatchQuickActions(idx2, cardEl) {
  document.getElementById("match-quick-sheet")?.remove();
  const m = state.matches[idx2];
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
      ${window.isAdmin ? `<button class="mqs-btn mqs-btn-danger" onclick="deleteMatchByIndex(${idx2});document.getElementById('match-quick-sheet').remove()">🗑 Delete Match</button>` : ""}
      <button class="mqs-btn mqs-btn-cancel" onclick="document.getElementById('match-quick-sheet').remove()">Cancel</button>
    </div>`;
  document.body.appendChild(sheet);
  requestAnimationFrame(() =>
    sheet.querySelector(".mqs-panel").classList.add("open"),
  );
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
  const pairs = _memoPairStats();
  const q = (query || "").toLowerCase().trim();
  const filtered = q
    ? pairs.filter((p) => p.key.toLowerCase().includes(q))
    : pairs;
  list.innerHTML = [
    !q
      ? `<button class="live-sheet-item${!histPairFilter ? " live-sheet-item-selected" : ""}" onclick="selectFilterItem('')">
      <span class="live-sheet-item-name">ALL PAIRS</span>
      ${!histPairFilter ? '<span class="live-sheet-check">✓</span>' : ""}
    </button>`
      : "",
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
    document.getElementById("hist-pair-label").textContent = histPairFilter
      ? histPairFilter.toUpperCase()
      : "ALL PAIRS";
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
    // Guest-inclusive: the History player filter lists anyone who played a match
    // in this view (guests included), matching the guest-inclusive match list.
    const names = new Set();
    historyMatches().forEach((m) =>
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) =>
        names.add(state.nameMap[p] || p),
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
  document
    .getElementById("filter-sheet-overlay")
    ?.classList.remove("live-sheet-open");
  document.getElementById("filter-sheet")?.classList.remove("live-sheet-open");
  const searchWrap = document.getElementById("filter-sheet-search-wrap");
  const searchInput = document.getElementById("filter-sheet-search");
  if (searchWrap) searchWrap.style.display = "none";
  if (searchInput) searchInput.value = "";
  _filterSheetMode = null;
}

function _filterDateHint(v) {
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
  const fmt = (iso) => {
    const [, m, d] = iso.split("-");
    return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]}`;
  };
  const today = todayISO();
  if (v === "week") return `${fmt(weekISO())} – ${fmt(today)}`;
  if (v === "lastweek") {
    const { from, to } = lastWeekRange();
    return `${fmt(from)} – ${fmt(to)}`;
  }
  if (v === "month") return `${fmt(monthISO())} – ${fmt(today)}`;
  if (v === "today") return fmt(today);
  if (v === "day")
    return cmpFrom ? `Selected: ${fmt(cmpFrom)}` : "Tap to pick a day";
  if (v === "range")
    return cmpFrom && cmpTo
      ? `${fmt(cmpFrom)} – ${fmt(cmpTo)}`
      : "Tap to set a range";
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
  { v: "all", l: "ALL TIME", icon: "⏱" },
  { v: "today", l: "TODAY", icon: "📅" },
  { v: "week", l: "THIS WEEK", icon: "📆" },
  { v: "lastweek", l: "LAST WEEK", icon: "⬅️" },
  { v: "weekend", l: "WEEKEND", icon: "🏖" },
  { v: "month", l: "THIS MONTH", icon: "🗓" },
  { v: "range", l: "DATE RANGE", icon: "📏" },
];
const _HOME_LBL_MAP = {
  all: "ALL TIME",
  today: "TODAY",
  week: "THIS WEEK",
  lastweek: "LAST WEEK",
  weekend: "WEEKEND",
  month: "THIS MONTH",
  range: "DATE RANGE",
};

function _syncHomeFilterLabel() {
  const lbl = document.getElementById("homeFilterLabel");
  if (lbl)
    lbl.textContent = _HOME_LBL_MAP[homeFilter] || homeFilter.toUpperCase();
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
  document
    .getElementById("filter-sheet-overlay")
    ?.classList.add("live-sheet-open");
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
    if (value !== "range") {
      homeFrom = null;
      homeTo = null;
      renderHome();
    }
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
    viewState.eloProbP1 = value;
    _updateEloProbSlots();
  } else if (mode === "eloprobp2") {
    viewState.eloProbP2 = value;
    _updateEloProbSlots();
  } else if (mode === "cmpplayerA") {
    viewState.cmpPlayerA = value;
    _updateCmpSlots();
  } else if (mode === "cmpplayerB") {
    viewState.cmpPlayerB = value;
    _updateCmpSlots();
  } else if (mode && mode.startsWith("sim_")) {
    const slot = mode.split("_")[1];
    if (slot === "a1") viewState.simA1 = value;
    else if (slot === "a2") viewState.simA2 = value;
    else if (slot === "b1") viewState.simB1 = value;
    else if (slot === "b2") viewState.simB2 = value;
    _simUpdateSlots();
  } else if (mode && mode.startsWith("predict_")) {
    const slot = mode.split("_")[1];
    if (slot === "a1") viewState.predictPlayerA = value;
    else if (slot === "a2") viewState.predictPartnerA = value;
    else if (slot === "b1") viewState.predictPlayerB = value;
    else if (slot === "b2") viewState.predictPartnerB = value;
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
    document.getElementById("cmpLabelA").textContent = viewState.cmpPlayerA || "P1";
    aBtn.classList.toggle("h2h-slot-filled", !!viewState.cmpPlayerA);
  }
  if (bBtn) {
    document.getElementById("cmpLabelB").textContent = viewState.cmpPlayerB || "P2";
    bBtn.classList.toggle("h2h-slot-filled", !!viewState.cmpPlayerB);
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

function renderAddMatches() {
  _addRenderedVersion = _dataVersion;
  const query = (
    document.getElementById("add-match-search")?.value || ""
  ).toLowerCase();
  // Field-based search (names/score/date/note) — same semantics as the History
  // search. The old JSON.stringify(m) per match re-serialized the whole row on
  // every keystroke and also matched JSON key names ("scoreA", "teamB"...).
  let matches = query
    ? state.matches.filter((m) => {
        const players = [...(m.teamA || []), ...(m.teamB || [])];
        if (
          players.some((p) => (state.nameMap[p] || p).toLowerCase().includes(query))
        )
          return true;
        if (
          `${m.scoreA}-${m.scoreB}`.includes(query) ||
          `${m.scoreB}-${m.scoreA}`.includes(query)
        )
          return true;
        if ((m.date || "").includes(query)) return true;
        if ((m.note || "").toLowerCase().includes(query)) return true;
        return false;
      })
    : [...state.matches];
  const addList = document.getElementById("add-match-list");
  if (!addList) return;
  addList.innerHTML = buildMatchCards(matches, true);
  addList
    .querySelectorAll(".team-score[data-final], .motd-score[data-final]")
    .forEach((el) => {
      el.textContent = el.dataset.final || "0";
    });
}

function deleteMatchByIndex(i) {
  const removed = state.matches.splice(i, 1)[0];
  if (!removed) return;
  removed.deletedAt = todayISO();
  deletedMatches.unshift(removed);
  saveDeletedMatches();
  saveCloudData();
  commit();
  renderTrash();
  showUndoToast("Match deleted", () => {
    deletedMatches.shift();
    state.matches.splice(i, 0, removed);
    delete removed.deletedAt;
    saveDeletedMatches();
    saveCloudData();
    commit();
    renderTrash();
  });
}

function restoreMatch(i) {
  const m = deletedMatches.splice(i, 1)[0];
  if (!m) return;
  delete m.deletedAt;
  state.matches.push(m);
  saveDeletedMatches();
  saveCloudData();
  commit();
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
    el.innerHTML = emptyState({
      icon: "🗑️",
      message: "Trash is empty.",
      size: "sm",
    });
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
  // The standalone edit modal (openEditMatch) — animate out, then remove.
  const modal = document.getElementById("match-edit-modal");
  if (modal) {
    modal.querySelector(".mem-panel")?.classList.remove("open");
    setTimeout(() => modal.remove(), 220);
  }
}

function editMatchByIndex(i, btn) {
  const m = state.matches[i];
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

// Self-contained edit modal — works from anywhere (Summary/History match-intro
// overlay, History long-press sheet) since it doesn't anchor to a card like
// editMatchByIndex does. Reuses the exact field IDs that saveMatchEdit reads.
function openEditMatch(idx) {
  const m = state.matches[idx];
  if (!m) return;
  closeMatchEdit();
  const players = getAllPlayerNamesFromMatches();
  const opts = (val) =>
    players
      .map(
        (p) =>
          `<option value="${escHtml(p)}"${p === val ? " selected" : ""}>${escHtml(p)}</option>`,
      )
      .join("");
  const ov = document.createElement("div");
  ov.id = "match-edit-modal";
  ov.className = "match-edit-modal";
  ov.innerHTML = `
    <div class="mem-backdrop" onclick="closeMatchEdit()"></div>
    <div class="mem-panel">
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
        <button class="mei-save" onclick="saveMatchEdit(${idx})">Save Changes</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  requestAnimationFrame(() =>
    requestAnimationFrame(() =>
      ov.querySelector(".mem-panel")?.classList.add("open"),
    ),
  );
}

function saveMatchEdit(i) {
  const m = state.matches[i];
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
  if (date && date > todayISO())
    return show("Match date cannot be in the future.");
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
  commit();
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
  grid.innerHTML = displayNames
    .map((name) => {
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
    })
    .join("");
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
  const m = state.matches[idx];
  if (!m) return;
  // Swap teams: winners become team B, losers become team A
  const newA = (m.teamB || []).map((p) => state.nameMap[p] || p);
  const newB = (m.teamA || []).map((p) => state.nameMap[p] || p);
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

  if (!display) {
    alert("Display name is required");
    return;
  }

  const aliases = aliasesText
    ? aliasesText
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)
    : [];

  const id = nextPlayerId++;
  state.players[id] = { id, name: display, email, isGuest };
  playerAliasMap[id] = aliases;
  rebuildNameMaps();
  saveCloudData();
  commit(); // guest flag affects which matches are "active" → recompute stats
  closeNameAddModal();
  renderNamesTable();

  document.getElementById("name-display").value = "";
  document.getElementById("name-aliases").value = "";
  if (document.getElementById("name-email"))
    document.getElementById("name-email").value = "";
  if (document.getElementById("name-guest"))
    document.getElementById("name-guest").checked = false;
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
    const prevSnapshot = [...state.matches];
    lastMatchSnapshot = prevSnapshot;
    if (note) candidate.note = note;
    state.matches.push(candidate);
    checkMilestones(prevSnapshot, state.matches);
    _lastLocalSaveTime = Date.now();
    saveCloudData();
    mirrorMatchToEditor(candidate);
    closeModernAddModal();
    commit();
  }

  // Exact duplicate
  if (state.matches.some((old) => sameMatch(old, candidate))) {
    showDupConfirmSheet("This match already exists. Add anyway?", _doSave);
    return;
  }
  // Same-day same-teams (different score)
  const sameDayConflict = state.matches.some(
    (old) =>
      old.date === candidate.date &&
      [...(old.teamA || [])].sort().join("|") === [...teamA].sort().join("|") &&
      [...(old.teamB || [])].sort().join("|") === [...teamB].sort().join("|"),
  );
  if (sameDayConflict) {
    showDupConfirmSheet(
      "These teams already played on this date. Add anyway?",
      _doSave,
    );
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
    openMatchIntro(idx);
  }
}

// ── PLAYER DETAIL SECTION BUILDERS ───────────────────────────────────────────
// Each function is extracted from the openPlayerDetail IIFE it replaces.
// They call app.js globals directly (state, _memoElo, activeMatches, etc.)
// so no additional imports are needed.

function _pdBuildRadarHtml(name, form) {
  const eloMap = _memoElo();
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
  const { first: _firstGameDate } = _getPlayerDateRange(name, activeMatches());
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
  const allEloMap = _memoElo();
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

  // ── ELO TIMELINE CHART ─────────────────────────────────
  const eloTimelineHtml = _pdBuildEloTimelineHtml(name);

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
    return last8
      .map((m) => {
        const inA4 = (m.teamA || []).includes(name);
        const won4 = inA4 ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
        const partner =
          (inA4 ? m.teamA || [] : m.teamB || [])
            .filter((p) => p !== name)
            .map((p) => p.split(" ")[0])
            .join(" & ") || "—";
        const opp = (inA4 ? m.teamB || [] : m.teamA || [])
          .map((p) => p.split(" ")[0])
          .join(" & ");
        const score = inA4
          ? `${m.scoreA}–${m.scoreB}`
          : `${m.scoreB}–${m.scoreA}`;
        const eld = eloAfterEach[pdSortedAll14.indexOf(m)];
        const eloDeltaStr = eld
          ? `${eld.delta >= 0 ? "+" : ""}${eld.delta}`
          : "";
        const eloDeltaCol = eld?.delta >= 0 ? "var(--green)" : "var(--red)";
        const scoreColor = won4 ? "var(--green)" : "var(--red)";
        const _miIdx = state.matches.indexOf(m);
        return `<div class="ana-card det-match-card"${_miIdx >= 0 ? ` onclick="document.getElementById('player-detail-modal')?.remove();openMatchIntro(${_miIdx})" style="cursor:pointer"` : ""}>
        <div class="det-match-result" style="color:${scoreColor}">${won4 ? "W" : "L"}</div>
        <div class="det-match-body">
          <div class="det-match-score">${score}</div>
          <div class="sub">${fmtDate(m.date).replace(/\s\d{4}$/, "")} · w/ ${escHtml(partner)} · vs ${escHtml(opp)}</div>
        </div>
        ${eld ? `<div style="font-size:11px;font-weight:700;color:${eloDeltaCol};flex-shrink:0">${eloDeltaStr}</div>` : ""}
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
    const pairStats = _memoPairStats()
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
    const peakEloVal = _memoEloPeaks()[name] || playerElo;
    const lowEloVal = _memoEloLows()[name] || playerElo;
    // Tap Best Win / Worst Loss to open that match in the UFC overlay.
    const bwIdx = biggestWinMatch ? state.matches.indexOf(biggestWinMatch) : -1;
    const wlIdx = worstLossMatch ? state.matches.indexOf(worstLossMatch) : -1;
    const bwTap = bwIdx >= 0 ? ` onclick="openMatchIntro(${bwIdx})" style="cursor:pointer"` : "";
    const wlTap = wlIdx >= 0 ? ` onclick="openMatchIntro(${wlIdx})" style="cursor:pointer"` : "";
    return `<div class="ana-card"><span class="badge">Career Highs</span><div class="det-streak-row" style="flex-wrap:wrap;gap:10px;margin-top:8px"><div class="det-streak-cell"${bwTap}><div class="det-streak-val" style="color:var(--green)">${biggestWin2 || "—"}</div><div class="sub">Best Win${bwIdx >= 0 ? " ›" : ""}</div></div><div class="det-streak-div"></div><div class="det-streak-cell"${wlTap}><div class="det-streak-val" style="color:var(--red)">${worstLoss2 || "—"}</div><div class="sub">Worst Loss${wlIdx >= 0 ? " ›" : ""}</div></div><div class="det-streak-div"></div><div class="det-streak-cell"><div class="det-streak-val" style="color:var(--green)">${longestWS}W</div><div class="sub">Best Streak</div></div><div class="det-streak-div"></div><div class="det-streak-cell"><div class="det-streak-val" style="color:var(--gold)">${peakEloVal}</div><div class="sub">Peak ELO</div></div><div class="det-streak-div"></div><div class="det-streak-cell"><div class="det-streak-val" style="color:var(--red)">${lowEloVal}</div><div class="sub">Low ELO</div></div>${bestDay2 ? `<div class="det-streak-div"></div><div class="det-streak-cell"><div class="det-streak-val">${bestDay2[1].w}W/${bestDay2[1].p}</div><div class="sub">Best Day</div></div>` : ""}</div></div>`;
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
    const allStats2 = _memoStats();
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
                <div class="analytics-title" style="display:flex;align-items:center;gap:10px"><div class="pd-av-wrap">${playerAvatar(name, 64)}</div><span>${escHtml(name)}</span></div>
                <button class="analytics-close" aria-label="Close" onclick="document.getElementById('player-detail-modal').remove()">✕</button>
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

// 4D: Shareable Match Poster
function openShareMatchPoster(matchIdx) {
  document.getElementById("share-card-overlay")?.remove();
  const m = state.matches[matchIdx];
  if (!m) return;
  const _amSlice = activeMatches();
  const _upToIncl = new Set(state.matches.slice(0, matchIdx + 1));
  const _upToBefore = new Set(state.matches.slice(0, matchIdx));
  const eloMap = computeElo(_amSlice.filter((m) => _upToIncl.has(m)));
  const eloMapBefore = computeElo(_amSlice.filter((m) => _upToBefore.has(m)));
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

let _shareBlob = null,
  _shareLabel = "",
  _shareCaption = "";

// Human-readable caption for the share sheet / WhatsApp text. Kept separate
// from _shareLabel (which is reused as a filename token, so it stays free of
// spaces and apostrophes).
function _leaderboardCaption(filter) {
  const m = {
    all: "All-Time",
    today: "Today's",
    week: "This Week's",
    lastweek: "Last Week's",
    weekend: "Weekend",
    month: "This Month's",
    range: "Custom Range",
  };
  return `${m[filter] || "Summary"} Leaderboard`;
}

async function openSummaryShare() {
  if (!(await _ensureHtml2Canvas())) {
    showToast("Capture not available", "❌");
    return;
  }
  const askChoice = getScreenshotAsk();
  if (askChoice) {
    document
      .getElementById("screenshot-choice-overlay")
      ?.classList.add("live-sheet-open");
    document
      .getElementById("screenshot-choice-sheet")
      ?.classList.add("live-sheet-open");
  } else {
    // Default: TODAY → leaderboard + matches; all other filters → leaderboard only
    doSummaryScreenshot(cmpFilter === "today");
  }
}

function closeScreenshotChoiceSheet() {
  document
    .getElementById("screenshot-choice-overlay")
    ?.classList.remove("live-sheet-open");
  document
    .getElementById("screenshot-choice-sheet")
    ?.classList.remove("live-sheet-open");
}

async function doSummaryScreenshot(includeMatches) {
  if (!(await _ensureHtml2Canvas())) {
    showToast("Capture not available", "❌");
    return;
  }
  closeScreenshotChoiceSheet();
  showToast("Capturing…", "📸");
  const captureEl = document.querySelector("#pg-compact .cmp-body-scroll");
  if (!captureEl) {
    showToast("No data to capture", "❌");
    return;
  }

  // Flush staggered leaderboard rows if animation still in progress
  if (_cmpLeaderHtmls.length) {
    const tbody = document.getElementById("cmpBody");
    if (tbody) tbody.innerHTML = _cmpLeaderHtmls.join("");
  }
  // Flush SR pill counter animations to final values
  captureEl.querySelectorAll(".sr-pill-val[data-final]").forEach((el) => {
    el.textContent = el.dataset.final;
  });

  // Always hide HIGHLIGHTS card
  const highlights = captureEl.querySelectorAll(".hist-summary-card");
  highlights.forEach((el) => (el.style.display = "none"));

  // Optionally hide matches section
  const matchesHeader = captureEl.querySelector(".cmp-matches-header");
  const matchesBody = document.getElementById("cmpMatches");
  if (!includeMatches) {
    if (matchesHeader) matchesHeader.style.display = "none";
    if (matchesBody) matchesBody.style.display = "none";
  }

  const fnameMap = {
    all: "AllTime",
    today: "Today",
    week: "ThisWeek",
    lastweek: "LastWeek",
    weekend: "Weekend",
    month: "ThisMonth",
    range: "Custom",
  };
  _shareLabel = fnameMap[cmpFilter] || "Summary";
  _shareCaption = _leaderboardCaption(cmpFilter);
  const restore = () => {
    highlights.forEach((el) => (el.style.display = ""));
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
  if (img && img.src.startsWith("blob:")) {
    URL.revokeObjectURL(img.src);
    img.src = "";
  }
  _shareBlob = null;
}

async function doShareWhatsApp() {
  if (!_shareBlob) return;
  const file = new File([_shareBlob], `EktaPadel-${_shareLabel}.png`, {
    type: "image/png",
  });
  if (
    navigator.share &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator
      .share({
        files: [file],
        title: "Ekta Padel",
        text: _shareCaption || `${_shareLabel} Leaderboard`,
      })
      .catch(() => {});
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

// Build a shareable deep-link to the current leaderboard state.
// Anyone opening the URL lands on the Summary tab with the same season + filter.
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
  if (!(await _ensureHtml2Canvas())) {
    showToast("Capture not available", "❌");
    return;
  }
  showToast("Capturing…", "📸");
  const snapEl = document.getElementById("snap-content");
  if (!snapEl) return;
  const fnameMap = {
    all: "AllTime",
    today: "Today",
    week: "ThisWeek",
    lastweek: "LastWeek",
    weekend: "Weekend",
    month: "ThisMonth",
    range: "Custom",
  };
  _shareLabel = fnameMap[cmpFilter] || "Summary";
  _shareCaption = _leaderboardCaption(cmpFilter);
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
  viewState.digestFilter = filter || viewState.digestFilter;
  viewState.digestPlayer = player !== undefined ? player : viewState.digestPlayer;
  const content = document.getElementById("digest-content");
  if (content)
    content.innerHTML = _buildDigestContent(viewState.digestFilter, viewState.digestPlayer);
  // Update active filter button
  document
    .querySelectorAll(".digest-filter-btn")
    .forEach((b) =>
      b.classList.toggle("active", b.dataset.f === viewState.digestFilter),
    );
  // Update player label
  const lbl = document.getElementById("digest-player-label");
  if (lbl) lbl.textContent = viewState.digestPlayer || "ALL PLAYERS";
  const btn = document.getElementById("digest-player-btn");
  if (btn) btn.classList.toggle("filter-fab-active", !!viewState.digestPlayer);
}

function openDigestPlayerSheet() {
  _filterSheetMode = "digestplayer";
  const el = document.getElementById("filter-sheet-title");
  if (el) el.textContent = "SELECT PLAYER";
  const list = document.getElementById("filter-sheet-list");
  if (!list) return;
  const players = sortPlayersGuestsLast(
    _statPlayerNames(),
  );
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
  [...state.matches]
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
    if (viewState.pairSort.key !== col)
      return '<span style="opacity:0.25;font-size:7px;margin-left:2px">◇</span>';
    return `<span style="font-size:7px;margin-left:2px">${viewState.pairSort.dir < 0 ? "▼" : "▲"}</span>`;
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
  const { key, dir } = viewState.pairSort;
  const sorted = [...viewState.pairsData].sort((a, b) => {
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
  const toShow = viewState.pairsShowAll ? sorted : sorted.slice(0, PAIRS_PAGE_LIMIT);
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
    !viewState.pairsShowAll && moreCount > 0
      ? `<div onclick="_showAllPairs()" style="text-align:center;padding:10px;font-size:11px;font-weight:700;color:var(--theme);cursor:pointer;border-top:1px solid var(--border)">SHOW ${moreCount} MORE ▼</div>`
      : "";
  return rowsHtml + showMoreHtml;
}
function _showAllPairs() {
  viewState.pairsShowAll = true;
  const el = document.getElementById("all-pairs-table");
  if (el) el.innerHTML = _pairsHeaderHtml() + _pairsSortedRows();
}

function sortPairsBy(key) {
  if (viewState.pairSort.key === key) {
    viewState.pairSort.dir *= -1;
  } else {
    viewState.pairSort.key = key;
    viewState.pairSort.dir = key === "eloRank" || key === "name" ? 1 : -1;
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
      return `<div class="chem-row"><div class="chem-names" style="font-size:10px">${escHtml(opp)}</div><div class="chem-wl">${rec.w}–${rec.l}</div><div class="chem-bar-wrap"><div class="chem-bar" style="width:${pct}%;background:${col}"></div></div><div class="chem-pct" style="color:${col}">${pct}%</div></div>`;
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
        .toUpperCase()}</div><div class="chem-names" style="font-size:10px">vs ${escHtml(opp)}</div><div style="font-size:11px;font-weight:800;color:${won ? "var(--green)" : "var(--red)"};flex-shrink:0">${pScore}–${oScore}</div></div>`;
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
                  <div style="margin-top:8px">${oppHtml || emptyState({ inline: true, message: "No data." })}</div>
                </div>

              </div>
              <div style="margin-top:20px;font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Recent Matches</div>
              <div class="ana-card" style="padding:8px 12px">${recentHtml || emptyState({ inline: true, message: "No matches." })}</div>
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
  const aliases = state.aliasMap?.[name];

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

function _h2hSortPlayers(players) {
  if (!Array.isArray(players)) return [];
  const eloMap = _memoElo();
  // One O(matches) pass for everyone's played/won counts — the old per-player
  // scan was O(players × matches) and ran on every analytics render AND every
  // sort-pill click.
  const matchCount = {};
  const winsCount = {};
  activeMatches().forEach((m) => {
    const aWon = m.scoreA > m.scoreB;
    (m.teamA || []).forEach((p) => {
      matchCount[p] = (matchCount[p] || 0) + 1;
      if (aWon) winsCount[p] = (winsCount[p] || 0) + 1;
    });
    (m.teamB || []).forEach((p) => {
      matchCount[p] = (matchCount[p] || 0) + 1;
      if (!aWon) winsCount[p] = (winsCount[p] || 0) + 1;
    });
  });
  const winPct = {};
  players.forEach((p) => {
    winPct[p] = matchCount[p] > 0 ? (winsCount[p] || 0) / matchCount[p] : 0;
  });
  const sorted = [...players];
  if (viewState.h2hMatrixSort === "matches") {
    sorted.sort(
      (a, b) =>
        (matchCount[b] || 0) - (matchCount[a] || 0) ||
        (eloMap[b] || 0) - (eloMap[a] || 0),
    );
  } else if (viewState.h2hMatrixSort === "winrate") {
    sorted.sort(
      (a, b) =>
        (winPct[b] || 0) - (winPct[a] || 0) ||
        (matchCount[b] || 0) - (matchCount[a] || 0),
    );
  } else if (viewState.h2hMatrixSort === "name") {
    return sortPlayersGuestsLast(sorted);
  }
  return sorted;
}

function _h2hSetSort(key) {
  viewState.h2hMatrixSort = key;
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

  // Build the head-to-head matrix in ONE O(matches) pass. The old path called
  // getHeadToHeadStats (itself an O(matches) filter) for every player pair —
  // O(players² × matches), e.g. 20 players × 500 matches ≈ 200k scans per open.
  // winsVs[a][b] = times a's team beat b's; metVs[a][b] = times a & b opposed.
  const playerSet = new Set(players);
  const winsVs = {};
  const metVs = {};
  const _bump = (obj, a, b) => {
    (obj[a] || (obj[a] = {}))[b] = (obj[a][b] || 0) + 1;
  };
  activeMatches().forEach((m) => {
    const A = (m.teamA || []).map(normPlayer).filter((p) => playerSet.has(p));
    const B = (m.teamB || []).map(normPlayer).filter((p) => playerSet.has(p));
    if (!A.length || !B.length) return;
    const aWon = m.scoreA > m.scoreB;
    A.forEach((a) =>
      B.forEach((b) => {
        _bump(metVs, a, b);
        _bump(metVs, b, a);
        if (aWon) _bump(winsVs, a, b);
        else _bump(winsVs, b, a);
      }),
    );
  });
  const matrix = {};
  players.forEach((a) => {
    matrix[a] = {};
    players.forEach((b) => {
      if (a === b) {
        matrix[a][b] = null;
        return;
      }
      const total = (metVs[a] && metVs[a][b]) || 0;
      matrix[a][b] =
        total > 0 ? { wins: (winsVs[a] && winsVs[a][b]) || 0, total } : null;
    });
  });

  const colHeaders = players
    .map(
      (p) =>
        `<th class="pvp-th" title="${p}">${getMatrixAlias(state.aliasMap[p])}</th>`,
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
      return `<tr><td class="pvp-row-hdr pvp-row-hdr-click" title="${escHtml(a)}" onclick="_h2hHighlightRow(this.closest('tr'))">${escHtml(getMatrixAlias(state.aliasMap[a]))}</td>${cells}</tr>`;
    })
    .join("");

  // Legend: alias → full name, two per line
  const legend = players
    .map(
      (p) =>
        `<span class="pvp-legend-item"><strong>${escHtml(getMatrixAlias(state.aliasMap[p]))}</strong> ${escHtml(p.toUpperCase())}</span>`,
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
  all.forEach((r) => {
    r.classList.remove("pvp-row-highlight", "pvp-dimmed");
  });
  if (!isHighlighted) {
    tr.classList.add("pvp-row-highlight");
    all.forEach((r) => {
      if (r !== tr) r.classList.add("pvp-dimmed");
    });
  }
}

// ── PARTNER / OPPONENT MATRIX ─────────────────────────────────
// Player×player grid: how often each pair were teammates vs opponents, over the
// chosen period. COUNT mode shows 🤝partnered / ⚔️opposed; PARTNER% mode shows
// the likelihood they teamed up when both played (rest of the time = opponents).

function _pvpRangeOpen() {
  document.getElementById("pvp-range-popup")?.remove();
  let low = _pvpLow, high = _pvpHigh;
  let dragging = null;

  function grad() {
    return `linear-gradient(to right,#f04f4f 0%,#f04f4f ${low}%,#f5c842 ${low}%,#f5c842 ${high}%,#36d47e ${high}%,#36d47e 100%)`;
  }
  function render() {
    const bar = document.getElementById("pvp-rng-bar");
    const tl  = document.getElementById("pvp-rng-tl");
    const th  = document.getElementById("pvp-rng-th");
    if (bar) bar.style.background = grad();
    if (tl)  tl.style.left  = low  + "%";
    if (th)  th.style.left  = high + "%";
    const rl = document.getElementById("pvp-rng-rl");
    const ol = document.getElementById("pvp-rng-ol");
    const gl = document.getElementById("pvp-rng-gl");
    if (rl) rl.textContent = `0 – ${low}%`;
    if (ol) ol.textContent = `${low + 1} – ${high}%`;
    if (gl) gl.textContent = `${high + 1} – 100%`;
  }

  const el = document.createElement("div");
  el.id = "pvp-range-popup";
  el.setAttribute("role", "dialog");
  el.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px";

  el.innerHTML = `
    <div style="background:var(--bg-card,#12121c);border:1px solid rgba(var(--theme-rgb),0.25);border-radius:18px;padding:20px;max-width:340px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,0.6)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
        <div>
          <div style="font-size:13px;font-weight:900;color:var(--text);letter-spacing:0.04em">COLOR RANGE</div>
          <div style="font-size:9px;color:var(--muted);margin-top:3px">Drag handles to set thresholds</div>
        </div>
        <button onclick="window._pvpRangeClose()" aria-label="Close" style="background:none;border:none;color:var(--muted);font-size:18px;line-height:1;cursor:pointer;padding:0 2px">✕</button>
      </div>

      <div id="pvp-rng-track" style="position:relative;height:40px;margin:4px 0 8px;user-select:none">
        <div id="pvp-rng-bar" style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);height:14px;border-radius:7px;box-shadow:inset 0 2px 4px rgba(0,0,0,0.35)"></div>
        <div id="pvp-rng-tl" style="position:absolute;top:50%;width:26px;height:26px;border-radius:50%;background:#fff;border:3px solid #f04f4f;box-shadow:0 2px 10px rgba(0,0,0,0.45);transform:translate(-50%,-50%);cursor:grab;touch-action:none;z-index:2"></div>
        <div id="pvp-rng-th" style="position:absolute;top:50%;width:26px;height:26px;border-radius:50%;background:#fff;border:3px solid #36d47e;box-shadow:0 2px 10px rgba(0,0,0,0.45);transform:translate(-50%,-50%);cursor:grab;touch-action:none;z-index:2"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--muted);margin-bottom:18px"><span>0%</span><span>100%</span></div>

      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:rgba(240,80,80,0.1);border:1px solid rgba(240,80,80,0.22);border-radius:9px">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:11px;height:11px;border-radius:50%;background:#f04f4f;flex-shrink:0"></div>
            <span style="font-size:11px;font-weight:700;color:var(--text)">Red</span>
          </div>
          <span id="pvp-rng-rl" style="font-size:12px;font-weight:900;color:#f04f4f"></span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:rgba(245,200,66,0.08);border:1px solid rgba(245,200,66,0.18);border-radius:9px">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:11px;height:11px;border-radius:50%;background:#f5c842;flex-shrink:0"></div>
            <span style="font-size:11px;font-weight:700;color:var(--text)">Orange</span>
          </div>
          <span id="pvp-rng-ol" style="font-size:12px;font-weight:900;color:#f5c842"></span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:rgba(54,212,126,0.08);border:1px solid rgba(54,212,126,0.18);border-radius:9px">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:11px;height:11px;border-radius:50%;background:#36d47e;flex-shrink:0"></div>
            <span style="font-size:11px;font-weight:700;color:var(--text)">Green</span>
          </div>
          <span id="pvp-rng-gl" style="font-size:12px;font-weight:900;color:#36d47e"></span>
        </div>
      </div>

      <button onclick="window._pvpRangeApply()" style="width:100%;padding:13px;background:var(--theme,#7c5cbf);color:#fff;border:none;border-radius:11px;font-size:13px;font-weight:900;letter-spacing:0.06em;cursor:pointer">APPLY</button>
    </div>`;

  document.body.appendChild(el);
  render();

  const track = document.getElementById("pvp-rng-track");
  function getPct(clientX) {
    const rect = track.getBoundingClientRect();
    return Math.round(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
  }
  function onMove(clientX) {
    if (!dragging) return;
    const p = getPct(clientX);
    if (dragging === "l") low  = Math.max(0, Math.min(p, high - 1));
    else                  high = Math.max(low + 1, Math.min(p, 100));
    render();
  }

  const tl = document.getElementById("pvp-rng-tl");
  const th = document.getElementById("pvp-rng-th");
  tl.addEventListener("mousedown",  (e) => { dragging = "l"; e.preventDefault(); });
  th.addEventListener("mousedown",  (e) => { dragging = "h"; e.preventDefault(); });
  tl.addEventListener("touchstart", (e) => { dragging = "l"; e.preventDefault(); }, { passive: false });
  th.addEventListener("touchstart", (e) => { dragging = "h"; e.preventDefault(); }, { passive: false });

  const mmov = (e) => onMove(e.clientX);
  const tmov = (e) => { e.preventDefault(); onMove(e.touches[0].clientX); };
  const mup  = () => { dragging = null; };
  document.addEventListener("mousemove", mmov);
  document.addEventListener("touchmove",  tmov, { passive: false });
  document.addEventListener("mouseup",   mup);
  document.addEventListener("touchend",  mup);

  function cleanup() {
    document.removeEventListener("mousemove", mmov);
    document.removeEventListener("touchmove",  tmov);
    document.removeEventListener("mouseup",   mup);
    document.removeEventListener("touchend",  mup);
  }
  window._pvpRangeApply = () => {
    _pvpLow = low; _pvpHigh = high;
    el.remove(); cleanup();
    _refreshPairMatrix();
  };
  window._pvpRangeClose = () => { el.remove(); cleanup(); };
  el.onclick = (e) => { if (e.target === el) window._pvpRangeClose(); };
}

function _pairMatrixSetPeriod(btn, period) {
  viewState.pairMatrixPeriod = period;
  _refreshPairMatrix();
}
function _pairMatrixSetMode(btn, mode) {
  viewState.pairMatrixMode = mode;
  _refreshPairMatrix();
}
function _refreshPairMatrix() {
  const box = document.getElementById("pair-matrix-box");
  if (box) box.innerHTML = _secBody(() => _pairMatrixInner());
}

function _buildPairMatrixHtml() {
  return `<div class="ana-card" style="padding:10px 8px" id="pair-matrix-box">${_pairMatrixInner()}</div>`;
}

function _pairMatrixInner() {
  const period = viewState.pairMatrixPeriod;
  const mode = viewState.pairMatrixMode;
  const matches = filterMatches(period); // season-scoped, guest-excluded, date-filtered

  const periodPills =
    `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">` +
    [
      ["today", "DAILY"],
      ["week", "WEEKLY"],
      ["weekend", "WEEKEND"],
      ["month", "MONTHLY"],
      ["all", "ALL TIME"],
    ]
      .map(
        ([v, l]) =>
          `<button class="digest-filter-btn${period === v ? " active" : ""}" onclick="_pairMatrixSetPeriod(this,'${v}')">${l}</button>`,
      )
      .join("") +
    `</div>`;
  const modePills =
    `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">` +
    [
      ["count", "🤝/⚔️ COUNT"],
      ["pct", "PARTNER %"],
    ]
      .map(
        ([v, l]) =>
          `<button class="digest-filter-btn${mode === v ? " active" : ""}" onclick="_pairMatrixSetMode(this,'${v}')">${l}</button>`,
      )
      .join("") +
    `</div>`;

  // Players in this period, ordered by all-time ELO rank (desc) then name.
  const played = {};
  matches.forEach((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
      const n = normPlayer(p);
      played[n] = (played[n] || 0) + 1;
    }),
  );
  const _allTimeElo = _memoElo();
  const players = Object.keys(played).sort(
    (a, b) => (_allTimeElo[b] || 1000) - (_allTimeElo[a] || 1000) || a.localeCompare(b),
  );

  const caption =
    mode === "count"
      ? `Each cell — <strong style="color:var(--green)">🤝 partnered</strong> / <strong style="color:var(--red)">⚔️ opposed</strong> (times the <strong style="color:var(--accent)">row</strong> player teamed with / faced the column player). — = never both played.`
      : `% = how often the <strong style="color:var(--accent)">row</strong> &amp; column players were <strong style="color:var(--green)">PARTNERS</strong> when both played that period (the rest = opponents). <sub>n</sub> = matches both played.`;

  if (players.length < 2)
    return `${periodPills}${modePills}<div style="color:var(--muted);font-size:12px;padding:10px 0">Need at least 2 players with matches in this period.</div>`;

  const matrix = computePartnerOpponentMatrix(matches, normPlayer);

  const colHeaders = players
    .map(
      (p) =>
        `<th class="pvp-th" title="${escHtml(p)}">${getMatrixAlias(state.aliasMap[p])}</th>`,
    )
    .join("");

  const rows = players
    .map((a) => {
      const cells = players
        .map((b) => {
          if (a === b) return `<td class="pvp-td pvp-self">·</td>`;
          const d = (matrix[a] && matrix[a][b]) || { partnered: 0, opposed: 0 };
          const both = d.partnered + d.opposed;
          if (!both) return `<td class="pvp-td pvp-none">—</td>`;
          if (mode === "count") {
            return `<td class="pvp-td" title="${escHtml(`${a} & ${b} · partnered ${d.partnered}, opposed ${d.opposed}`)}"><span style="color:var(--green);font-weight:800">${d.partnered}</span><span style="color:var(--muted);font-size:8px;margin:0 1px">/</span><span style="color:var(--red);font-weight:800">${d.opposed}</span></td>`;
          }
          const pct = Math.round((d.partnered / both) * 100);
          const cls = pct >= _pvpHigh ? "pvp-win" : pct > _pvpLow ? "pvp-even" : "pvp-loss";
          return `<td class="pvp-td ${cls}" title="${escHtml(`${a} & ${b} · partnered ${d.partnered}/${both} (${pct}%), opposed ${d.opposed}/${both} (${100 - pct}%)`)}">${pct}%<sub class="pvp-total">${both}</sub></td>`;
        })
        .join("");
      return `<tr><td class="pvp-row-hdr pvp-row-hdr-click" title="${escHtml(a)}" onclick="_h2hHighlightRow(this.closest('tr'))">${escHtml(getMatrixAlias(state.aliasMap[a]))}</td>${cells}</tr>`;
    })
    .join("");

  const legend = players
    .map(
      (p) =>
        `<span class="pvp-legend-item"><strong>${escHtml(getMatrixAlias(state.aliasMap[p]))}</strong> ${escHtml(p.toUpperCase())}</span>`,
    )
    .join("");

  const rangeBtn = mode === "pct"
    ? `<div style="display:flex;align-items:center;justify-content:flex-end;margin-bottom:6px">
        <button onclick="_pvpRangeOpen()" style="display:flex;align-items:center;gap:5px;background:rgba(var(--theme-rgb),0.1);border:1px solid rgba(var(--theme-rgb),0.25);border-radius:8px;padding:5px 10px;font-size:10px;font-weight:700;color:var(--text);cursor:pointer;letter-spacing:0.04em">
          <span style="font-size:12px">⚙</span> COLOR RANGE
          <span style="background:rgba(240,80,80,0.2);color:#f04f4f;border-radius:3px;padding:1px 4px;font-size:9px">≤${_pvpLow}%</span>
          <span style="background:rgba(245,200,66,0.15);color:#f5c842;border-radius:3px;padding:1px 4px;font-size:9px">${_pvpLow + 1}–${_pvpHigh}%</span>
          <span style="background:rgba(54,212,126,0.15);color:#36d47e;border-radius:3px;padding:1px 4px;font-size:9px">≥${_pvpHigh + 1}%</span>
        </button>
      </div>`
    : "";

  return `${periodPills}${modePills}${rangeBtn}
    <div style="font-size:9px;color:var(--muted);margin-bottom:8px;line-height:1.5">${caption}</div>
    <div class="pvp-wrap">
      <div class="pvp-scroll-wrap">
        <table class="pvp-table">
          <thead><tr><th class="pvp-corner"></th>${colHeaders}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="pvp-legend">${legend}</div>
    </div>`;
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

// Returns baseMatches filtered to a player's first or last N games.
// window = null means "use all base matches unchanged".
function _getPlayerWindowMatches(playerName, baseMatches, window) {
  if (!window || window.mode === "all") return baseMatches;
  const playerMatches = baseMatches
    .filter((m) => (m.teamA || []).includes(playerName) || (m.teamB || []).includes(playerName))
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const count = Math.max(1, window.count || 10);
  const slice =
    window.mode === "first"
      ? playerMatches.slice(0, count)
      : playerMatches.slice(-count);
  const matchSet = new Set(slice);
  return baseMatches.filter((m) => matchSet.has(m));
}

let _cmpPickerSlot = null;
let _cmpPickerMode = null;
let _cmpPickerCount = 10;

function _cmpCountPickerOpen(slot, mode) {
  _cmpPickerSlot = slot;
  _cmpPickerMode = mode;
  if (slot === "lb") {
    _cmpPickerCount = _lbWindow?.count || 10;
  } else {
    const key = slot === "A" ? "cmpWindowA" : "cmpWindowB";
    _cmpPickerCount = viewState[key]?.count || 10;
  }
  const title = document.getElementById("cmp-count-title");
  if (title) {
    const modeLabel = mode === "first" ? "FIRST" : "LAST";
    title.textContent = slot === "lb"
      ? `${modeLabel} GAMES — LEADERBOARD`
      : `${modeLabel} GAMES — P${slot}`;
  }
  const numEl = document.getElementById("cmp-count-num");
  if (numEl) numEl.textContent = _cmpPickerCount;
  document.getElementById("cmp-count-overlay")?.classList.add("live-sheet-open");
  document.getElementById("cmp-count-sheet")?.classList.add("live-sheet-open");
}

function _cmpCountPickerClose() {
  document.getElementById("cmp-count-overlay")?.classList.remove("live-sheet-open");
  document.getElementById("cmp-count-sheet")?.classList.remove("live-sheet-open");
}

function _cmpCountStep(delta) {
  _cmpPickerCount = Math.max(1, Math.min(999, _cmpPickerCount + delta));
  const numEl = document.getElementById("cmp-count-num");
  if (numEl) numEl.textContent = _cmpPickerCount;
}

function _cmpCountApply() {
  if (!_cmpPickerSlot || !_cmpPickerMode) return;
  if (_cmpPickerSlot === "lb") {
    _lbWindow = { mode: _cmpPickerMode, count: _cmpPickerCount };
    _cmpCountPickerClose();
    _renderLbWindowBar();
    // Clear tbody so morphList inserts all rows fresh rather than diffing
    // against stale outerHTML — guarantees the table reflects the new window.
    document.body.classList.add("no-cascade");
    const _lbTbody = document.getElementById("cmpBody");
    if (_lbTbody) _lbTbody.innerHTML = "";
    renderCompact();
    document.body.classList.remove("no-cascade");
  } else {
    const key = _cmpPickerSlot === "A" ? "cmpWindowA" : "cmpWindowB";
    viewState[key] = { mode: _cmpPickerMode, count: _cmpPickerCount };
    _cmpCountPickerClose();
    const container = document.getElementById("cmpWinCtrl" + _cmpPickerSlot);
    if (container) container.outerHTML = _cmpWindowCtrlHtml(_cmpPickerSlot);
  }
}

function _cmpSetWindow(slot, mode) {
  if (mode === "all") {
    const key = slot === "A" ? "cmpWindowA" : "cmpWindowB";
    viewState[key] = null;
    const container = document.getElementById("cmpWinCtrl" + slot);
    if (container) container.outerHTML = _cmpWindowCtrlHtml(slot);
  } else {
    _cmpCountPickerOpen(slot, mode);
  }
}

function _cmpWindowCtrlHtml(slot) {
  const w = slot === "A" ? viewState.cmpWindowA : viewState.cmpWindowB;
  const mode = w ? w.mode : "all";
  const count = w ? w.count : 10;
  const justify = slot === "B" ? "justify-content:flex-end;" : "";
  const chip = mode !== "all"
    ? `<button class="cmp-count-chip" onclick="_cmpCountPickerOpen('${slot}','${mode}')">${count}</button>`
    : "";
  return `<div id="cmpWinCtrl${slot}" style="display:flex;gap:3px;align-items:center;flex:1;${justify}">
    <button class="digest-filter-btn${mode === "all" ? " active" : ""}" onclick="_cmpSetWindow('${slot}','all')" style="padding:2px 6px;font-size:9px">ALL</button>
    <button class="digest-filter-btn${mode === "first" ? " active" : ""}" onclick="_cmpSetWindow('${slot}','first')" style="padding:2px 6px;font-size:9px">FIRST</button>
    <button class="digest-filter-btn${mode === "last" ? " active" : ""}" onclick="_cmpSetWindow('${slot}','last')" style="padding:2px 6px;font-size:9px">LAST</button>
    ${chip}
  </div>`;
}

function _cmpSelectorHtml() {
  const datePills = CMP_DATE_OPTS.map(
    (o) =>
      `<button class="digest-filter-btn${o.v === viewState.cmpDateFilter ? " active" : ""}" onclick="_cmpSetDate('${o.v}')">${o.l}</button>`,
  ).join("");
  return `
    <div class="cmp-inline-selectors">
      <button class="h2h-slot-btn${viewState.cmpPlayerA ? " h2h-slot-filled" : ""}" id="cmpSlotA" onclick="openCmpSheet('A')" style="flex:1">
        <span id="cmpLabelA" style="font-size:12px;font-weight:800">${viewState.cmpPlayerA || "P1"}</span>
      </button>
      <span class="cmp-inline-vs">VS</span>
      <button class="h2h-slot-btn${viewState.cmpPlayerB ? " h2h-slot-filled" : ""}" id="cmpSlotB" onclick="openCmpSheet('B')" style="flex:1">
        <span id="cmpLabelB" style="font-size:12px;font-weight:800">${viewState.cmpPlayerB || "P2"}</span>
      </button>
    </div>
    <div style="display:flex;align-items:center;gap:4px;margin:4px 0">
      ${_cmpWindowCtrlHtml("A")}
      <div style="width:28px;flex-shrink:0"></div>
      ${_cmpWindowCtrlHtml("B")}
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
  const taken = slot === "A" ? viewState.cmpPlayerB : viewState.cmpPlayerA;
  const selected = slot === "A" ? viewState.cmpPlayerA : viewState.cmpPlayerB;
  const players = sortPlayersGuestsLast(
    _statPlayerNames(),
  );
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
  viewState.cmpDateFilter = v;
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

function triggerCompare() {
  const a = viewState.cmpPlayerA;
  const b = viewState.cmpPlayerB;
  const dateF = viewState.cmpDateFilter || "all";
  if (!a || !b || a === b) {
    showToast("Select two different players", "⚠️", 2000);
    return;
  }
  openPlayerCompare(a, b, dateF);
}

function openPlayerCompare(nameA, nameB, dateFilter = "all") {
  const card = document.getElementById("compare-card");
  if (!card) return;
  const baseMatches = filterMatches(dateFilter);

  // Compute each player's stats from their own game window (independent)
  const matchesA = _getPlayerWindowMatches(nameA, baseMatches, viewState.cmpWindowA);
  const eloMapA = computeElo(matchesA);
  const statsA = computeStats(matchesA, eloMapA);
  const sA = statsA.find((s) => s.name === nameA);

  const matchesB = _getPlayerWindowMatches(nameB, baseMatches, viewState.cmpWindowB);
  const eloMapB = computeElo(matchesB);
  const statsB = computeStats(matchesB, eloMapB);
  const sB = statsB.find((s) => s.name === nameB);

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

  const _winLabel = (w) =>
    !w || w.mode === "all" ? null : `${w.mode === "first" ? "FIRST" : "LAST"} ${w.count}`;
  const labelA = _winLabel(viewState.cmpWindowA);
  const labelB = _winLabel(viewState.cmpWindowB);
  const hasWindow = labelA || labelB;
  const centerLabel = hasWindow
    ? `${labelA || "ALL"} · ${labelB || "ALL"}`
    : CMP_DATE_OPTS.find((o) => o.v === dateFilter)?.l || "ALL TIME";

  viewState.cmpPlayerA = nameA;
  viewState.cmpPlayerB = nameB;
  viewState.cmpDateFilter = dateFilter;
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
          <div style="text-align:left">
            <div class="cmp-name">${nameA.split(" ")[0]}</div>
            ${labelA ? `<div style="font-size:9px;color:var(--accent);font-weight:700">${labelA}</div>` : ""}
          </div>
          <div class="cmp-vs-tag">${centerLabel}</div>
          <div style="text-align:right">
            <div class="cmp-name">${nameB.split(" ")[0]}</div>
            ${labelB ? `<div style="font-size:9px;color:var(--accent);font-weight:700">${labelB}</div>` : ""}
          </div>
        </div>
        <div class="cmp-rows">
          ${row("Matches", sA.mp, sB.mp)}
          ${row("Wins", sA.mw, sB.mw)}
          ${row("Losses", sA.mp - sA.mw, sB.mp - sB.mw, false)}
          ${row("Win %", sA.winPct.toFixed(0) + "%", sB.winPct.toFixed(0) + "%")}
          ${row("Games Won", sA.gw, sB.gw)}
          ${row("Games Lost", sA.gl, sB.gl, false)}
          ${row("Game %", sA.gamePct.toFixed(0) + "%", sB.gamePct.toFixed(0) + "%")}
          ${row("Skill Rating", sA.sr.toFixed(2), sB.sr.toFixed(2))}
          ${row("ELO", eloMapA[nameA] || 1000, eloMapB[nameB] || 1000)}
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
  const players = sortPlayersGuestsLast(
    _statPlayerNames(),
  );
  const opts =
    `<option value="">P1</option>` +
    players
      .map((p) => `<option value="${escHtml(p)}">${escHtml(p)}</option>`)
      .join("");
  const optsB =
    `<option value="">P2</option>` +
    players
      .map((p) => `<option value="${escHtml(p)}">${escHtml(p)}</option>`)
      .join("");
  viewState.cmpPlayerA = "";
  viewState.cmpPlayerB = "";
  viewState.cmpDateFilter = "all";
  viewState.cmpWindowA = null;
  viewState.cmpWindowB = null;
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
// Analytics view-preference persistence lives in src/infra/ana-prefs.js
// (getAna*/saveAna*/hasAnaCollapsedPref imported at top of file). The toggle*
// handlers below are controller logic and stay here.

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
  if (viewState.anaActiveCat === "favs") anaFilterCategory("favs", true);
}

function toggleAnaHidden(key, e) {
  e.stopPropagation();
  const hidden = getAnaHidden();
  const idx = hidden.indexOf(key);
  if (idx === -1) hidden.push(key);
  else hidden.splice(idx, 1);
  saveAnaHidden(hidden);
  const isNowHidden = idx === -1;
  const sec = document.querySelector(`.ana-sec[data-key="${key}"]`);
  if (sec) {
    if (isNowHidden) sec.dataset.hidden = "true";
    else delete sec.dataset.hidden;
    const btn = sec.querySelector(".ana-hide-btn");
    if (btn) {
      btn.classList.toggle("active", isNowHidden);
      btn.title = isNowHidden ? "Unhide" : "Hide";
      btn.textContent = isNowHidden ? "+" : "−";
    }
  }
  anaFilterCategory(viewState.anaActiveCat, true);
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

function openAnaSearch() {
  const overlay = document.getElementById("ana-search-overlay");
  const input = document.getElementById("ana-sov-input");
  if (!overlay) return;
  overlay.classList.add("active");
  document.getElementById("ana-sov-results").innerHTML = "";
  viewState.anaSearchIdx = -1;
  setTimeout(() => input && input.focus(), 60);
}

function closeAnaSearch() {
  const overlay = document.getElementById("ana-search-overlay");
  if (overlay) overlay.classList.remove("active");
  const input = document.getElementById("ana-sov-input");
  if (input) input.value = "";
  document.getElementById("ana-sov-results").innerHTML = "";
  viewState.anaSearchIdx = -1;
}

function anaSearchInput(q) {
  const res = document.getElementById("ana-sov-results");
  if (!res) return;
  viewState.anaSearchIdx = -1;
  const query = (q || "").trim().toLowerCase();
  if (!query) {
    res.innerHTML = "";
    return;
  }

  const matches = viewState.anaSections.filter(
    (s) =>
      s.title
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .includes(query) || s.key.toLowerCase().includes(query),
  );

  if (!matches.length) {
    res.innerHTML = `<div class="ana-sov-empty">No sections found</div>`;
    return;
  }

  const catLabel = {
    activity: "Activity",
    players: "Players",
    records: "Records",
    elo: "ELO",
    rivals: "Rivals",
  };
  res.innerHTML = matches
    .slice(0, 8)
    .map(
      (s, i) =>
        `<div class="ana-sov-item" data-key="${s.key}" style="animation-delay:${i * 40}ms"
      onmousedown="anaSearchSelect('${s.key}')">
      <span class="ana-sov-item-icon">${s.title.match(/^\p{Emoji}/u)?.[0] || "📋"}</span>
      <span class="ana-sov-item-title">${s.title.replace(/^\p{Emoji}\s*/u, "")}</span>
      <span class="ana-sov-item-cat">${catLabel[s.cat] || s.cat}</span>
    </div>`,
    )
    .join("");
}

function anaSearchKey(e) {
  const items = document.querySelectorAll(".ana-sov-item");
  if (e.key === "Escape") {
    closeAnaSearch();
    return;
  }
  if (e.key === "ArrowDown") {
    viewState.anaSearchIdx = Math.min(viewState.anaSearchIdx + 1, items.length - 1);
  } else if (e.key === "ArrowUp") {
    viewState.anaSearchIdx = Math.max(viewState.anaSearchIdx - 1, 0);
  } else if (e.key === "Enter" && viewState.anaSearchIdx >= 0) {
    const key = items[viewState.anaSearchIdx]?.dataset.key;
    if (key) anaSearchSelect(key);
    return;
  } else return;
  items.forEach((el, i) =>
    el.classList.toggle("ana-sov-item-focus", i === viewState.anaSearchIdx),
  );
  e.preventDefault();
}

function anaSearchSelect(key) {
  closeAnaSearch();
  const el = document.querySelector(`.ana-sec[data-key="${key}"]`);
  if (!el) return;
  if (viewState.anaActiveCat !== "all" && el.dataset.cat !== viewState.anaActiveCat)
    anaFilterCategory("all", true);
  if (el.classList.contains("collapsed")) toggleAnaSection(key);
  setTimeout(
    () => el.scrollIntoView({ behavior: "smooth", block: "start" }),
    80,
  );
  el.classList.remove("ana-sec-highlight");
  void el.offsetWidth;
  el.classList.add("ana-sec-highlight");
  setTimeout(() => el.classList.remove("ana-sec-highlight"), 1800);
}

function anaFilterCategory(cat, skipPillUpdate) {
  viewState.anaActiveCat = cat;
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
// xpThreshold → src/engine/xp.js

// computePlayerXP → src/engine/xp.js

// getPlayerLevel → src/engine/xp.js

// getPrestigeTier → src/engine/xp.js

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

// computeBadges → src/engine/badges.js (injected via initBadgesDeps)

// ══════════════════════════════════════════════════════════════
// ── PHASE 1: PLAYER FORM ENGINE ───────────────────────────────
// ══════════════════════════════════════════════════════════════

// computePlayerForm → src/engine/player-analytics.js

// ── PLAY STYLE ARCHETYPE ──────────────────────────────────────
// computeArchetype → src/engine/player-analytics.js

// ── SMART POWER RANKINGS ──────────────────────────────────────
// computePowerRankings → src/engine/player-analytics.js

// ── PARTNERSHIP CHEMISTRY SCORE ───────────────────────────────
// computeChemistryScores → src/engine/player-analytics.js

// ── MATCH STORY CARDS ─────────────────────────────────────────
// computeMatchStories → src/engine/player-analytics.js

// ── ACHIEVEMENTS (new additions beyond computeBadges) ─────────
// computeAchievements → src/engine/player-analytics.js

// ── SEASON AWARDS ─────────────────────────────────────────────
// Award set for one period (a month or a user-defined season). `priorMs` is the
// matches before the period start, used for the Most-Improved ELO delta. This is
// the single source for the per-period cards — it folds in the awards that used
// to live in the separate "Monthly Awards" section (Most Consistent, Most Feared)
// so the two are unified into one section.
function _periodAwards(ms, priorMs) {
  const eloMap = computeElo(ms);
  const stats = computeStats(ms, eloMap).filter((p) => p.mp >= 2);
  const pairs = getPairStats(ms).filter((p) => p.played >= 2);
  const mvp = stats[0] || null;
  const topPair = pairs[0] || null;
  const ironMan = stats.length
    ? [...stats].sort((a, b) => b.mp - a.mp)[0]
    : null;
  const priorEloMap =
    priorMs && priorMs.length && stats.length > 1 ? computeElo(priorMs) : null;
  const mostImproved = priorEloMap
    ? [...stats].sort(
        (a, b) =>
          (eloMap[b.name] || 1000) -
          (priorEloMap[b.name] || 1000) -
          ((eloMap[a.name] || 1000) - (priorEloMap[a.name] || 1000)),
      )[0]
    : null;
  // Most Consistent (≥3 matches): lowest std-dev of per-match game share.
  const mostConsistent =
    stats
      .filter((p) => p.mp >= 3)
      .map((p) => {
        const pm = ms.filter((m) =>
          [...(m.teamA || []), ...(m.teamB || [])].includes(p.name),
        );
        const gp = pm.map((m) => {
          const inA = (m.teamA || []).includes(p.name);
          const gw = inA ? m.scoreA : m.scoreB;
          const gl = inA ? m.scoreB : m.scoreA;
          return gw + gl > 0 ? gw / (gw + gl) : 0.5;
        });
        const mean = gp.reduce((s, v) => s + v, 0) / gp.length;
        const sd = Math.sqrt(
          gp.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / gp.length,
        );
        return { name: p.name, sd };
      })
      .sort((a, b) => a.sd - b.sd)[0] || null;
  // Most Feared (≥3 matches): highest win rate.
  const mostFeared =
    stats.filter((p) => p.mp >= 3).sort((a, b) => b.winPct - a.winPct)[0] ||
    null;
  return {
    players: stats,
    pairs,
    mvp,
    topPair,
    ironMan,
    mostImproved,
    mostConsistent,
    mostFeared,
  };
}
// Bucket the (already season/guest-scoped) matches by each user-defined Season.
// Empty seasons are dropped; newest-starting season first.
function _computeManualSeasonAwards(matches) {
  return state.seasons
    .map((season) => {
      const ms = matches.filter((m) => _inSeason(season, m.date));
      if (!ms.length) return null;
      const priorMs = season.start
        ? matches.filter((m) => (m.date || "") < season.start)
        : [];
      return {
        month: season.id,
        monthName: season.name,
        rangeLabel: _seasonRangeLabel(season),
        start: season.start || "",
        matches: ms.length,
        ..._periodAwards(ms, priorMs),
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.start || "").localeCompare(a.start || ""));
}
// Award cards (MVP / Top Pair / Iron Man / standings) per period. When the user
// has defined Seasons, those are the buckets (unifying the two "season" ideas);
// otherwise it falls back to auto monthly buckets.
function computeSeasons(matches) {
  if (!matches.length) return [];
  if (state.seasons.length) return _computeManualSeasonAwards(matches);
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
      const priorMs = sorted.filter((m) => (m.date || "") < month + "-01");
      const [yr, mo] = month.split("-");
      const monthName = new Date(+yr, +mo - 1, 1).toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
      return {
        month,
        monthName,
        matches: ms.length,
        ..._periodAwards(ms, priorMs),
      };
    })
    .reverse();
}

// ── GENERIC IN-CARD SUB-TABS (merged analytics sections) ──────
// Build a tabbed body from [{label, html}]. Used to fold several same-topic
// sections into one card. Panels are scoped to their own .ana-sec-body so
// multiple tabbed sections coexist without id/selector collisions.
function _tabbedSection(tabs) {
  const bar = `<div class="ana-subtabs">${tabs
    .map(
      (t, i) =>
        `<button class="ana-subtab${i === 0 ? " active" : ""}" onclick="_anaSubTab(this,${i})">${t.label}</button>`,
    )
    .join("")}</div>`;
  const panels = `<div class="ana-subtab-panels">${tabs
    .map(
      (t, i) =>
        `<div data-subtab="${i}"${i === 0 ? "" : ' style="display:none"'}>${t.html}</div>`,
    )
    .join("")}</div>`;
  return bar + panels;
}
// Toggle the Hide-empty view (CSS hides .ana-sec.is-empty under .ana-hide-empty).
function toggleAnaHideEmpty() {
  const on = !getAnaHideEmpty();
  try {
    setAnaHideEmpty(on);
  } catch (e) {}
  const c = document.getElementById("analytics-page-content");
  if (c) c.classList.toggle("ana-hide-empty", on);
  const btn = c?.querySelector(".ana-hideempty-btn");
  if (btn) {
    btn.classList.toggle("active", on);
    btn.textContent = (on ? "☑" : "☐") + " Hide empty";
  }
}
// Heuristic: a section is "empty" when its body strips down to a short
// empty-state message (used by the Hide-empty toggle to declutter small data).
function _secIsEmpty(body) {
  const text = String(body)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length > 60) return false;
  return /need |not enough|no matches|no data|no upsets|no season|define seasons|within reach|no milestones/i.test(
    text,
  );
}
function _anaSubTab(btn, tab) {
  const body = btn.closest(".ana-sec-body");
  if (!body) return;
  const panelWrap = body.querySelector(".ana-subtab-panels");
  if (panelWrap)
    panelWrap.querySelectorAll(":scope > [data-subtab]").forEach((p) => {
      p.style.display = p.dataset.subtab === String(tab) ? "" : "none";
    });
  btn.parentElement
    ?.querySelectorAll(".ana-subtab")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
}

function _simUpdateSlots() {
  const slots = { a1: viewState.simA1, a2: viewState.simA2, b1: viewState.simB1, b2: viewState.simB2 };
  Object.entries(slots).forEach(([k, v]) => {
    const lbl = document.getElementById(`sim-label-${k}`);
    const btn = document.getElementById(`sim-slot-${k}`);
    if (lbl) lbl.textContent = v || "—";
    if (btn) btn.classList.toggle("h2h-slot-filled", !!v);
  });
}

function runMatchSimulator() {
  const a1 = viewState.simA1;
  const a2 = viewState.simA2;
  const b1 = viewState.simB1;
  const b2 = viewState.simB2;
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
  filterKey = filterKey || viewState.eloTLFilter || "all";
  viewState.eloTLFilter = filterKey;
  const history = _memoEloHistory();
  const eloNow = _memoElo();
  const players = Object.keys(history)
    .filter((p) => (history[p] || []).length >= 2)
    .sort((a, b) => (eloNow[b] || 1000) - (eloNow[a] || 1000));
  if (!players.length)
    return '<div class="sub" style="padding:8px">No ELO data yet.</div>';
  if (!viewState.eloTLPlayer || !history[viewState.eloTLPlayer]) viewState.eloTLPlayer = players[0];
  const name = viewState.eloTLPlayer;
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
  viewState.eloTLPts = pts;
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
    if (viewState.eloTLOverlay && viewState.eloTLOverlay !== name && history[viewState.eloTLOverlay]) {
      let rawOpts = [...history[viewState.eloTLOverlay]];
      if (filterKey === "3m") {
        const c = new Date(now);
        c.setMonth(c.getMonth() - 3);
        rawOpts = rawOpts.filter((p) => (p.date || "") >= toLocalISODate(c));
      } else if (filterKey === "1m") {
        const c = new Date(now);
        c.setMonth(c.getMonth() - 1);
        rawOpts = rawOpts.filter((p) => (p.date || "") >= toLocalISODate(c));
      } else if (filterKey === "1w") {
        const c = new Date(now);
        c.setDate(c.getDate() - 7);
        rawOpts = rawOpts.filter((p) => (p.date || "") >= toLocalISODate(c));
      } else if (filterKey === "thisweek") {
        rawOpts = rawOpts.filter((p) => (p.date || "") >= thisMondayStr);
      } else if (filterKey === "lastweek") {
        rawOpts = rawOpts.filter(
          (p) =>
            (p.date || "") >= lastMondayStr && (p.date || "") <= lastSundayStr,
        );
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
    const H = Math.max(
      100,
      Math.min(220, pt + pb + Math.round(combinedRange * 0.6)),
    );
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
        ? annot(peakIdx, "▲", "var(--gold)") +
          annot(troughIdx, "▼", "var(--red)")
        : "";

    // Overlay: 2nd player line (uses pre-computed overlayPts)
    let overlayHtml = "";
    if (overlayPts.length >= 2) {
      const overlayCol = playerColor(viewState.eloTLOverlay);
      const overlayPoly = overlayPts
        .map(
          (p, i) =>
            `${toX((i / Math.max(overlayPts.length - 1, 1)) * (pts.length - 1)).toFixed(1)},${toY(p.elo).toFixed(1)}`,
        )
        .join(" ");
      overlayHtml = `<polyline points="${overlayPoly}" fill="none" stroke="${overlayCol}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="4 3" opacity="0.85"/>
        <text x="${(toX(pts.length - 1) - 4).toFixed(1)}" y="${(toY(overlayPts[overlayPts.length - 1].elo) - 5).toFixed(1)}" text-anchor="end" font-size="9" font-weight="800" fill="${overlayCol}">${viewState.eloTLOverlay}</text>`;
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
    <button class="filter-fab-btn${viewState.eloTLOverlay ? " filter-fab-active" : ""}" onclick="openEloTLOverlaySheet()" style="flex:1;text-align:left"><span>${viewState.eloTLOverlay || "+ COMPARE WITH…"}</span></button>
    ${viewState.eloTLOverlay ? `<button class="elo-tl-clear" onclick="_eloTLSetOverlay('')">✕</button>` : ""}
  </div>`;
  return `<div class="ana-card" style="padding:10px 12px">
    <div class="elo-tl-players">${chips}</div>
    <div class="elo-tl-filters">${pills}</div>
    ${overlaySelector}
    ${chartHtml}
  </div>`;
}

function _eloTLSetOverlay(name) {
  viewState.eloTLOverlay = name || "";
  _rerenderEloTLSection();
}

function openEloTLOverlaySheet() {
  _filterSheetMode = "eloTLOverlay";
  const el = document.getElementById("filter-sheet-title");
  if (el) el.textContent = "COMPARE WITH";
  const list = document.getElementById("filter-sheet-list");
  if (!list) return;
  const history = _memoEloHistory();
  const players = sortPlayersGuestsLast(
    Object.keys(history).filter((p) => p !== viewState.eloTLPlayer),
  );
  list.innerHTML =
    `<div class="live-sheet-item" onclick="selectFilterItem('')"><div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--muted)">—</div><span>None</span></div>` +
    players
      .map((p) => {
        const sel = p === viewState.eloTLOverlay ? " live-sheet-item-selected" : "";
        return `<div class="live-sheet-item${sel}" onclick="selectFilterItem(${jsArg(p)})">${sheetAvSm(p)}<span>${escHtml(p)}</span></div>`;
      })
      .join("");
  const overlay = document.getElementById("filter-sheet-overlay");
  const sheet = document.getElementById("filter-sheet");
  if (overlay) overlay.classList.add("live-sheet-open");
  if (sheet) sheet.classList.add("live-sheet-open");
}

function _rerenderEloTLSection() {
  // ELO History Chart is a tab inside the merged "⚡ ELO" section; target its
  // stable wrapper rather than a top-level section body.
  const el = document.getElementById("elo-tl-section");
  if (el) el.innerHTML = buildEloTimelineHtml(viewState.eloTLFilter);
}

function selectEloTLPlayer(name) {
  viewState.eloTLPlayer = name;
  _rerenderEloTLSection();
}

function filterEloTimeline(key) {
  viewState.eloTLFilter = key;
  _rerenderEloTLSection();
}

function showEloMatchDetail(idx) {
  const p = viewState.eloTLPts[idx];
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
      viewState.eloProbP1 || "P1";
    aBtn.classList.toggle("h2h-slot-filled", !!viewState.eloProbP1);
  }
  if (bBtn) {
    document.getElementById("eloProb-label-p2").textContent =
      viewState.eloProbP2 || "P2";
    bBtn.classList.toggle("h2h-slot-filled", !!viewState.eloProbP2);
  }
  if (viewState.eloProbP1 && viewState.eloProbP2 && viewState.eloProbP1 !== viewState.eloProbP2) calcEloWinProb();
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
  const taken = slot === "p1" ? viewState.eloProbP2 : viewState.eloProbP1;
  const selected = slot === "p1" ? viewState.eloProbP1 : viewState.eloProbP2;
  const players = sortPlayersGuestsLast(
    _statPlayerNames(),
  );
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
  const players = sortPlayersGuestsLast(
    _statPlayerNames(),
  );
  list.innerHTML = players
    .map((p) => {
      const sel = p === viewState.whatIfPlayer ? " live-sheet-item-selected" : "";
      return `<div class="live-sheet-item${sel}" onclick="selectFilterItem(${jsArg(p)})">${sheetAvSm(p)}<span>${escHtml(p)}</span></div>`;
    })
    .join("");
  const overlay = document.getElementById("filter-sheet-overlay");
  const sheet = document.getElementById("filter-sheet");
  if (overlay) overlay.classList.add("live-sheet-open");
  if (sheet) sheet.classList.add("live-sheet-open");
}

function calcEloWinProb() {
  const p1 = viewState.eloProbP1;
  const p2 = viewState.eloProbP2;
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

// ── WHAT-IF SIMULATOR STATE ────────────────────────────────

function renderWhatIfSection(playerName) {
  viewState.whatIfPlayer = playerName;
  viewState.whatIfToggles = {};
  viewState.whatIfFlips = {};
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
  const playerMatches = state.matches
    .map((m, i) => ({ m, i }))
    .filter(({ m }) =>
      [...(m.teamA || []), ...(m.teamB || [])].includes(playerName),
    );
  playerMatches.forEach(({ i }) => {
    viewState.whatIfToggles[i] = true;
    viewState.whatIfFlips[i] = false;
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
        const flipped = !!viewState.whatIfFlips[i];
        const effectiveWon = flipped ? !baseWon : baseWon;
        const excluded = viewState.whatIfToggles[i] === false;
        const partner = (inA ? m.teamA : m.teamB)
          .filter((p) => p !== playerName)
          .join(" & ");
        const opp = (inA ? m.teamB : m.teamA).join(" & ");
        return `<div class="whatif-row${excluded ? " wi-excluded" : ""}${flipped ? " wi-flipped" : ""}">
        <div class="wi-outcome-dot" style="background:${effectiveWon ? "var(--green)" : "var(--red)"}"></div>
        <div class="wi-match-info">
          <span class="wi-date">${fmtDate(m.date)}</span>
          <span class="wi-vs">w/ ${escHtml(partner || "—")} vs ${escHtml(opp)}</span>
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
  viewState.whatIfToggles[idx] = viewState.whatIfToggles[idx] === false ? true : false;
  if (viewState.whatIfToggles[idx] === false) viewState.whatIfFlips[idx] = false; // can't flip excluded
  _refreshWhatIfRows();
}

function toggleWhatIfFlip(idx) {
  viewState.whatIfFlips[idx] = !viewState.whatIfFlips[idx];
  _refreshWhatIfRows();
}

function whatIfFlipAllLosses() {
  const eloMap = _memoElo();
  state.matches.forEach((m, i) => {
    if (!viewState.whatIfToggles.hasOwnProperty(i)) return;
    const inA = (m.teamA || []).includes(viewState.whatIfPlayer);
    const won = (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
    if (!won && viewState.whatIfToggles[i] !== false) viewState.whatIfFlips[i] = true;
  });
  _refreshWhatIfRows();
}

function whatIfReset() {
  Object.keys(viewState.whatIfToggles).forEach((i) => {
    viewState.whatIfToggles[i] = true;
    viewState.whatIfFlips[i] = false;
  });
  _refreshWhatIfRows();
  document.getElementById("whatif-result").innerHTML = "";
}

function _refreshWhatIfRows() {
  if (!viewState.whatIfPlayer) return;
  const playerMatches = state.matches
    .map((m, i) => ({ m, i }))
    .filter(({ m }) =>
      [...(m.teamA || []), ...(m.teamB || [])].includes(viewState.whatIfPlayer),
    );
  _renderWhatIfRows(viewState.whatIfPlayer, playerMatches);
}

function recomputeWhatIfElo() {
  const resultEl = document.getElementById("whatif-result");
  if (!resultEl || !viewState.whatIfPlayer) return;
  // Build the modified match list
  const whatIfMatches = state.matches
    .filter((m, i) => viewState.whatIfToggles[i] !== false)
    .map((m) => {
      const i = state.matches.indexOf(m);
      if (viewState.whatIfFlips[i]) {
        // Flip: swap scores so the outcome reverses
        return { ...m, scoreA: m.scoreB, scoreB: m.scoreA };
      }
      return m;
    });
  const actualElo = _memoElo()[viewState.whatIfPlayer] || 1000;
  const whatIfElo = computeElo(whatIfMatches)[viewState.whatIfPlayer] || 1000;
  const diff = whatIfElo - actualElo;
  const col =
    diff > 0 ? "var(--green)" : diff < 0 ? "var(--red)" : "var(--muted)";
  const sign = diff > 0 ? "+" : "";
  // Rank change
  const actualRanked = Object.entries(_memoElo()).sort((a, b) => b[1] - a[1]);
  const whatIfRanked = Object.entries(computeElo(whatIfMatches)).sort(
    (a, b) => b[1] - a[1],
  );
  const actualRank = actualRanked.findIndex(([n]) => n === viewState.whatIfPlayer) + 1;
  const whatIfRank = whatIfRanked.findIndex(([n]) => n === viewState.whatIfPlayer) + 1;
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
  const excluded = Object.values(viewState.whatIfToggles).filter((v) => !v).length;
  const flipped = Object.values(viewState.whatIfFlips).filter((v) => v).length;
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

function _secBody(fn) {
  try {
    return fn();
  } catch (e) {
    console.error("[Analytics section error]", e);
    return `<div style="color:var(--muted);font-size:11px;padding:8px 0">Section unavailable — <code style="font-size:10px">${escHtml(String(e))}</code></div>`;
  }
}

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
    if (!buckets[key])
      buckets[key] = { key, matches: [], from: m.date, to: m.date };
    buckets[key].matches.push(m);
    if (m.date < buckets[key].from) buckets[key].from = m.date;
    if (m.date > buckets[key].to) buckets[key].to = m.date;
  });

  const _shortMonths = [
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
  const result = Object.values(buckets)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((b, idx) => {
      const distinct = new Set(
        b.matches.flatMap((m) => [...(m.teamA || []), ...(m.teamB || [])]),
      );
      let label;
      if (periodType === "week") {
        const parts = fmtDate(b.key)
          .replace(/^\w+,\s*/, "")
          .replace(/\s\d{4}$/, "");
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
      if (distinct.size < _MIN_RANK_PLAYERS)
        return {
          key: b.key,
          from: b.from,
          to: b.to,
          label,
          ranks: [],
          totalPlayers: 0,
          idx,
        };
      // Period must have at least 2 matches played (session minimum)
      if (b.matches.length < 2)
        return {
          key: b.key,
          from: b.from,
          to: b.to,
          label,
          ranks: [],
          totalPlayers: 0,
          idx,
        };
      const eloMap = computeElo(b.matches);
      const statsArr = computeStats(b.matches, eloMap);
      if (statsArr.length < _MIN_RANK_PLAYERS)
        return {
          key: b.key,
          from: b.from,
          to: b.to,
          label,
          ranks: [],
          totalPlayers: 0,
          idx,
        };
      const ranks = statsArr.map((p, i) => ({
        name: p.name,
        rank: i + 1,
        trueRank: i + 1,
        sr: p.sr,
        mp: p.mp,
      }));
      return {
        key: b.key,
        from: b.from,
        to: b.to,
        label,
        ranks,
        totalPlayers: statsArr.length,
        idx,
      };
    });

  return (_rankPeriodCache[fp] = result);
}

// _rankColor, _rankBg now live in ./format.js.

function _buildPodiumTrackerHtml(periodType) {
  const periods = _computeRankPeriods(periodType);
  const validPeriods = periods.filter((p) => p.ranks.length > 0);
  if (validPeriods.length < 2)
    return '<div style="color:var(--muted);font-size:12px;padding:8px 0">Need at least 2 periods with 3+ players.</div>';

  let maxRank = 3;
  const tally = {};
  validPeriods.forEach((p) => {
    p.ranks.forEach((r) => {
      if (!tally[r.name])
        tally[r.name] = {
          name: r.name,
          g: 0,
          s: 0,
          b: 0,
          periodsPlayed: 0,
          extra: {},
        };
      tally[r.name].periodsPlayed++;
      if (r.rank === 1) tally[r.name].g++;
      else if (r.rank === 2) tally[r.name].s++;
      else if (r.rank === 3) tally[r.name].b++;
      else {
        tally[r.name].extra[r.rank] = (tally[r.name].extra[r.rank] || 0) + 1;
      }
      if (r.rank > maxRank) maxRank = r.rank;
    });
  });

  const extraRanks = Array.from({ length: maxRank - 3 }, (_, i) => i + 4);

  const rows = Object.values(tally)
    .map((p) => ({
      ...p,
      podiums: p.g + p.s + p.b,
      podiumRate:
        p.periodsPlayed >= _MIN_RANK_PERIODS
          ? (p.g + p.s + p.b) / p.periodsPlayed
          : 0,
    }))
    .filter((p) => p.periodsPlayed >= _MIN_RANK_PERIODS)
    .sort((a, b) => b.g - a.g || b.s - a.s || b.b - a.b);

  if (!rows.length)
    return '<div style="color:var(--muted);font-size:12px;padding:8px 0">Not enough data yet.</div>';

  const _stickyTh = `position:sticky;left:0;z-index:2;background:var(--surface2)`;
  const _stickyTd = `position:sticky;left:0;z-index:1;background:var(--card)`;
  const _th = `font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;padding:5px 10px;text-align:center;white-space:nowrap;border-bottom:1px solid rgba(255,255,255,0.08)`;
  const _td = `padding:6px 10px;text-align:center;font-weight:800;font-size:11px;white-space:nowrap`;

  const mkD = (count, rankVal, name) =>
    count > 0
      ? `<span style="cursor:pointer;border-bottom:1px dotted currentColor" onclick="_openPodiumDrill(${jsArg(name)},${typeof rankVal === "number" ? rankVal : jsArg(rankVal)},${jsArg(periodType)})">${count}</span>`
      : `<span style="color:rgba(255,255,255,0.18)">${count}</span>`;

  const thead = `<tr>
    <th style="${_th};${_stickyTh};text-align:left">Player</th>
    <th style="${_th}">🥇</th>
    <th style="${_th}">🥈</th>
    <th style="${_th}">🥉</th>
    <th style="${_th}">Podiums</th>
    <th style="${_th}">%</th>
    ${extraRanks.map((n) => `<th style="${_th}">#${n}</th>`).join("")}
  </tr>`;

  const tbody = rows
    .map(
      (r) => `<tr>
    <td style="${_td};${_stickyTd};text-align:left;font-weight:700">${escHtml(r.name)}</td>
    <td style="${_td};color:${_rankColor(1, maxRank)}">${mkD(r.g, 1, r.name)}</td>
    <td style="${_td};color:${_rankColor(2, maxRank)}">${mkD(r.s, 2, r.name)}</td>
    <td style="${_td};color:${_rankColor(3, maxRank)}">${mkD(r.b, 3, r.name)}</td>
    <td style="${_td}">${mkD(r.podiums, "podiums", r.name)}<span style="font-size:9px;color:var(--muted)"> /${r.periodsPlayed}</span></td>
    <td style="${_td};color:var(--theme);text-align:right">${r.periodsPlayed >= _MIN_RANK_PERIODS ? (r.podiumRate * 100).toFixed(0) + "%" : "—"}</td>
    ${extraRanks.map((n) => `<td style="${_td};color:${_rankColor(n, maxRank)}">${mkD(r.extra?.[n] || 0, n, r.name)}</td>`).join("")}
  </tr>`,
    )
    .join("");

  return `<div class="ana-card" style="padding:8px 12px;overflow-x:auto;-webkit-overflow-scrolling:touch">
    <table style="border-collapse:separate;border-spacing:0;width:max-content;min-width:100%">
      <thead>${thead}</thead>
      <tbody>${tbody}</tbody>
    </table>
  </div>`;
}

function _buildAntiPodiumTrackerHtml(periodType) {
  const periods = _computeRankPeriods(periodType);
  const validPeriods = periods.filter((p) => p.ranks.length > 0);
  if (validPeriods.length < 2)
    return '<div style="color:var(--muted);font-size:12px;padding:8px 0">Need at least 2 periods with 3+ players.</div>';

  const tally = {};
  validPeriods.forEach((p) => {
    const total = p.totalPlayers;
    p.ranks.forEach((r) => {
      if (!tally[r.name])
        tally[r.name] = { name: r.name, l: 0, sl: 0, periodsPlayed: 0 };
      tally[r.name].periodsPlayed++;
      if (r.trueRank === total) tally[r.name].l++;
      else if (r.trueRank === total - 1) tally[r.name].sl++;
    });
  });

  const rows = Object.values(tally)
    .map((p) => ({
      ...p,
      bottom2: p.l + p.sl,
      bottom2Rate:
        p.periodsPlayed >= _MIN_RANK_PERIODS
          ? (p.l + p.sl) / p.periodsPlayed
          : 0,
    }))
    .filter((p) => p.periodsPlayed >= _MIN_RANK_PERIODS)
    .sort((a, b) => b.l - a.l || b.sl - a.sl);

  if (!rows.length)
    return '<div style="color:var(--muted);font-size:12px;padding:8px 0">Not enough data yet.</div>';

  const _stickyTh = `position:sticky;left:0;z-index:2;background:var(--surface2)`;
  const _stickyTd = `position:sticky;left:0;z-index:1;background:var(--card)`;
  const _th = `font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;padding:5px 10px;text-align:center;white-space:nowrap;border-bottom:1px solid rgba(255,255,255,0.08)`;
  const _td = `padding:6px 10px;text-align:center;font-weight:800;font-size:11px;white-space:nowrap`;
  const _dim = `<span style="color:rgba(255,255,255,0.18)">0</span>`;
  const mkA = (count, pos, name) =>
    count > 0
      ? `<span style="cursor:pointer;border-bottom:1px dotted currentColor" onclick="_openAntiPodiumDrill(${jsArg(name)},${jsArg(pos)},${jsArg(periodType)})">${count}</span>`
      : _dim;

  const thead = `<tr>
    <th style="${_th};${_stickyTh};text-align:left">Player</th>
    <th style="${_th}">🪣 Last</th>
    <th style="${_th}">😬 2nd Last</th>
    <th style="${_th}">Bottom 2</th>
    <th style="${_th}">%</th>
  </tr>`;

  const tbody = rows
    .map(
      (r) => `<tr>
    <td style="${_td};${_stickyTd};text-align:left;font-weight:700">${escHtml(r.name)}</td>
    <td style="${_td};color:#ff3b3b">${mkA(r.l, "last", r.name)}</td>
    <td style="${_td};color:rgba(255,140,0,0.9)">${mkA(r.sl, "secondlast", r.name)}</td>
    <td style="${_td}">${mkA(r.bottom2, "bottom2", r.name)}<span style="font-size:9px;color:var(--muted)"> /${r.periodsPlayed}</span></td>
    <td style="${_td};color:var(--theme);text-align:right">${(r.bottom2Rate * 100).toFixed(0)}%</td>
  </tr>`,
    )
    .join("");

  return `<div class="ana-card" style="padding:8px 12px;overflow-x:auto;-webkit-overflow-scrolling:touch">
    <table style="border-collapse:separate;border-spacing:0;width:max-content;min-width:100%">
      <thead>${thead}</thead>
      <tbody>${tbody}</tbody>
    </table>
  </div>`;
}

function _buildRankReignHtml() {
  const allM = activeMatches();
  const fp = _lightFingerprint(allM);
  if (_reignCache[fp]) return _reignCache[fp];

  // All distinct match days sorted chronologically
  const allDates = [...new Set(allM.map((m) => m.date).filter(Boolean))].sort();
  if (allDates.length < 2)
    return '<div style="color:var(--muted);font-size:12px;padding:8px 0">Need at least 2 match days with 3+ players.</div>';

  // Current ALL TIME ELO rank (latest snapshot = full history)
  const eloMap = computeElo(allM);
  const eloRanking = Object.entries(eloMap).sort((a, b) => b[1] - a[1]);
  const eloRankOf = {};
  eloRanking.forEach(([name], i) => {
    eloRankOf[name] = i + 1;
  });

  // For each match day compute cumulative rank up to that day, then tally
  // how many days each player held each rank position.
  // INCREMENTAL: walk matches chronologically once, applying ELO as we go
  // rather than recomputing computeElo(snap) from scratch for every date.
  // Reduces O(days × matches) → O(matches) — critical for large datasets.
  const sorted = [...allM].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  const runElo = {}; // incremental ELO map
  const runMp = {}, runMw = {}, runGw = {}, runGl = {}; // for SR proxy rank
  let mIdx = 0; // pointer into sorted[]
  let maxRank = 1;
  const tally = {};
  allDates.forEach((date) => {
    // Advance the incremental ELO up to (and including) this date
    while (mIdx < sorted.length && (sorted[mIdx].date || "") <= date) {
      const m = sorted[mIdx++];
      const players = [...(m.teamA || []), ...(m.teamB || [])];
      players.forEach((p) => { if (!(p in runElo)) runElo[p] = 1000; });
      const aWon = m.scoreA > m.scoreB;
      const avgA = (m.teamA || []).reduce((s, p) => s + runElo[p], 0) / Math.max((m.teamA || []).length, 1);
      const avgB = (m.teamB || []).reduce((s, p) => s + runElo[p], 0) / Math.max((m.teamB || []).length, 1);
      const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
      const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
      const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
      (m.teamA || []).forEach((p) => {
        runElo[p] = (runElo[p] || 1000) + dA;
        runMp[p] = (runMp[p] || 0) + 1; runMw[p] = (runMw[p] || 0) + (aWon ? 1 : 0);
        runGw[p] = (runGw[p] || 0) + m.scoreA; runGl[p] = (runGl[p] || 0) + m.scoreB;
      });
      (m.teamB || []).forEach((p) => {
        runElo[p] = (runElo[p] || 1000) + dB;
        runMp[p] = (runMp[p] || 0) + 1; runMw[p] = (runMw[p] || 0) + (!aWon ? 1 : 0);
        runGw[p] = (runGw[p] || 0) + m.scoreB; runGl[p] = (runGl[p] || 0) + m.scoreA;
      });
    }
    const dayMatches = sorted.filter((m) => m.date === date);
    if (dayMatches.length < 2) return; // skip days with fewer than 2 matches
    const dayPlayers = new Set(
      dayMatches.flatMap((m) => [...(m.teamA || []), ...(m.teamB || [])]),
    );
    // Rank by current incremental ELO (same criterion as computeStats uses)
    const ranked = Object.entries(runElo).sort((a, b) => b[1] - a[1]);
    let qualRank = 0;
    ranked.forEach(([name]) => {
      if (!dayPlayers.has(name)) return;
      qualRank++;
      if (!tally[name])
        tally[name] = { name, rankCounts: {}, days: 0 };
      tally[name].days++;
      tally[name].rankCounts[qualRank] =
        (tally[name].rankCounts[qualRank] || 0) + 1;
      if (qualRank > maxRank) maxRank = qualRank;
    });
  });

  const rows = Object.values(tally)
    .filter((p) => p.days >= _MIN_RANK_PERIODS)
    .sort((a, b) => {
      const ra = eloRankOf[a.name] ?? 9999;
      const rb = eloRankOf[b.name] ?? 9999;
      return ra !== rb ? ra - rb : a.name.localeCompare(b.name);
    });

  if (!rows.length)
    return '<div style="color:var(--muted);font-size:12px;padding:8px 0">Not enough data yet.</div>';

  const rankCols = Array.from({ length: maxRank }, (_, i) => i + 1);
  const rankEmoji = (r) =>
    r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : `#${r}`;
  const rankColor = (r) => _rankColor(r, maxRank);
  const eloRankColor = (r) => _rankColor(r, eloRanking.length);

  const _sTh = `position:sticky;left:0;z-index:2;background:var(--surface2)`;
  const _sTd = `position:sticky;left:0;z-index:1;background:var(--card)`;
  const _th = `font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;padding:5px 10px;text-align:center;white-space:nowrap;border-bottom:1px solid rgba(255,255,255,0.08)`;
  const _td = `padding:6px 10px;text-align:center;font-weight:800;font-size:11px;white-space:nowrap`;

  const thead = `<tr>
    <th style="${_th};${_sTh};text-align:left">Player</th>
    <th style="${_th}">Rank</th>
    <th style="${_th}">Days</th>
    ${rankCols.map((r) => `<th style="${_th}">${rankEmoji(r)}</th>`).join("")}
  </tr>`;

  const tbody = rows
    .map((row) => {
      const eloRank = eloRankOf[row.name];
      const eloCell = eloRank
        ? `<td style="${_td};color:${eloRankColor(eloRank)};font-size:13px">#${eloRank}</td>`
        : `<td style="${_td};color:var(--muted)">—</td>`;
      const daysCell = `<td style="${_td};color:var(--theme)">${row.days}</td>`;
      const cells = rankCols
        .map((r) => {
          const cnt = row.rankCounts[r] || 0;
          return `<td style="${_td};color:${cnt > 0 ? rankColor(r) : "rgba(255,255,255,0.15)"}" title="${cnt} day${cnt !== 1 ? "s" : ""} at ${rankEmoji(r)}">${cnt > 0 ? cnt : "—"}</td>`;
        })
        .join("");
      return `<tr>
      <td style="${_td};${_sTd};text-align:left;font-weight:700">${escHtml(row.name)}</td>
      ${eloCell}${daysCell}${cells}
    </tr>`;
    })
    .join("");

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
  const validPeriods = allPeriods.filter((p) => p.ranks.length > 0);
  const _tlPills = (
    active,
  ) => `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
    <button class="digest-filter-btn${active === "today" ? " active" : ""}" onclick="_timelineSetPeriod(this,'today')">DAILY</button>
    <button class="digest-filter-btn${active === "week" ? " active" : ""}" onclick="_timelineSetPeriod(this,'week')">WEEKLY</button>
    <button class="digest-filter-btn${active === "weekend" ? " active" : ""}" onclick="_timelineSetPeriod(this,'weekend')">WEEKEND</button>
    <button class="digest-filter-btn${active === "month" ? " active" : ""}" onclick="_timelineSetPeriod(this,'month')">MONTHLY</button>
  </div>`;
  if (validPeriods.length < 2)
    return `<div>${_tlPills(periodType)}<div style="color:var(--muted);font-size:12px;padding:8px 0">Need at least 2 periods with 3+ players.</div></div>`;

  const periods = validPeriods.slice(-maxPeriods);
  const playerSet = new Set();
  periods.forEach((p) => p.ranks.forEach((r) => playerSet.add(r.name)));

  const lookup = {};
  periods.forEach((p) => {
    lookup[p.key] = {};
    p.ranks.forEach((r) => {
      lookup[p.key][r.name] = r.rank;
    });
  });

  // Current ALL TIME ELO rank
  const eloMapTl = computeElo(activeMatches());
  const eloRankOfTl = {};
  Object.entries(eloMapTl)
    .sort((a, b) => b[1] - a[1])
    .forEach(([name], i) => {
      eloRankOfTl[name] = i + 1;
    });

  const players = [...playerSet]
    .map((name) => ({
      name,
      eloRank: eloRankOfTl[name] ?? 9999,
    }))
    .sort((a, b) =>
      a.eloRank !== b.eloRank
        ? a.eloRank - b.eloRank
        : a.name.localeCompare(b.name),
    );

  let tlMaxRank = 1;
  periods.forEach((p) =>
    p.ranks.forEach((r) => {
      if (r.rank > tlMaxRank) tlMaxRank = r.rank;
    }),
  );

  const eloRankColor = (r) => _rankColor(r, players.length);
  const _stickyTh = `position:sticky;left:0;z-index:2;background:var(--surface2)`;
  const _stickyTd = `position:sticky;left:0;z-index:1;background:var(--card)`;
  const _th = `font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;padding:5px 8px;text-align:center;white-space:nowrap;border-bottom:1px solid rgba(255,255,255,0.08)`;
  const _rankTd = `padding:6px 8px;text-align:center;font-weight:800;font-size:11px;white-space:nowrap`;

  const headerCells = periods
    .map((p) => `<th class="rhtl-th-period">${escHtml(p.label)}</th>`)
    .join("");
  const bodyRows = players
    .map((pl) => {
      const eloRank = eloRankOfTl[pl.name];
      const rankCell = eloRank
        ? `<td style="${_rankTd};color:${eloRankColor(eloRank)}">#${eloRank}</td>`
        : `<td style="${_rankTd};color:var(--muted)">—</td>`;
      return (
        `<tr>
      <td class="rhtl-td-name" style="${_stickyTd};font-weight:700;cursor:pointer;text-decoration:underline dotted" onclick="_openRankCalendar(${jsArg(pl.name)},${jsArg(periodType)})">${escHtml(pl.name)}</td>
      ${rankCell}` +
        periods
          .map((p) => {
            const r = lookup[p.key][pl.name];
            const cellStyle =
              r != null
                ? `background:${_rankBg(r, tlMaxRank)};color:${_rankColor(r, tlMaxRank)}`
                : `background:transparent;color:rgba(255,255,255,0.12)`;
            return `<td class="rhtl-cell" style="${cellStyle}" title="${r != null ? "#" + r + " · " + escHtml(p.label) : "Did not play"}">${r != null ? r : "—"}</td>`;
          })
          .join("") +
        "</tr>"
      );
    })
    .join("");

  const legend = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
    <span style="font-size:9px;color:var(--muted)">#1</span>
    <div style="flex:1;height:5px;border-radius:3px;background:linear-gradient(to right,hsl(120,70%,55%),hsl(60,70%,55%),hsl(0,70%,55%))"></div>
    <span style="font-size:9px;color:var(--muted)">#${tlMaxRank}</span>
    <span style="font-size:9px;color:rgba(255,255,255,0.25);margin-left:6px">— absent</span>
  </div>`;

  return `<div>${_tlPills(periodType)}
    <div class="ana-card" style="padding:10px 12px">
      ${legend}
      <div class="rhtl-wrap" style="overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%">
        <table class="rhtl-table" style="width:max-content;min-width:100%">
          <thead><tr><th class="rhtl-th-name" style="${_stickyTh}">Player</th><th style="${_th}">Rank</th>${headerCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
      <div style="font-size:9px;color:var(--muted);margin-top:8px">Rank within each ${periodType === "week" ? "week" : "month"} based on all matches in that period. Showing last ${periods.length}.</div>
    </div>
  </div>`;
}

function _podiumSetPeriod(btn, type) {
  btn
    .closest("div")
    .querySelectorAll(".digest-filter-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  const content =
    btn.closest("[class]")?.parentElement?.querySelector(".podium-content") ||
    btn.parentElement?.nextElementSibling;
  if (content)
    content.innerHTML = _secBody(() => _buildPodiumTrackerHtml(type));
}
function _antiPodiumSetPeriod(btn, type) {
  btn
    .closest("div")
    .querySelectorAll(".digest-filter-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  const content =
    btn
      .closest("[class]")
      ?.parentElement?.querySelector(".antipodium-content") ||
    btn.parentElement?.nextElementSibling;
  if (content)
    content.innerHTML = _secBody(() => _buildAntiPodiumTrackerHtml(type));
}
function _reignSetPeriod(btn, type) {
  btn
    .closest("div")
    .querySelectorAll(".digest-filter-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  const content =
    btn.closest("[class]")?.parentElement?.querySelector(".reign-content") ||
    btn.parentElement?.nextElementSibling;
  if (content) content.innerHTML = _secBody(() => _buildRankReignHtml(type));
}
function _timelineSetPeriod(btn, type) {
  const body =
    btn.closest(".ana-sec-body") ||
    btn.closest(".ana-card")?.parentElement ||
    btn.parentElement?.parentElement;
  if (body) body.innerHTML = _secBody(() => _buildRankTimelineHtml(type));
}

function _openPodiumDrill(playerName, rankVal, periodType) {
  const periods = _computeRankPeriods(periodType);
  const matching = periods.filter((p) => {
    if (!p.ranks.length) return false;
    const r = p.ranks.find((x) => x.name === playerName);
    if (!r) return false;
    return rankVal === "podiums" ? r.rank <= 3 : r.rank === rankVal;
  });
  if (!matching.length) return;

  const medalEmoji =
    rankVal === 1
      ? "🥇"
      : rankVal === 2
        ? "🥈"
        : rankVal === 3
          ? "🥉"
          : rankVal === "podiums"
            ? "🏅"
            : `#${rankVal}`;
  const rankLabel =
    rankVal === "podiums" ? "Podium Finishes" : `#${rankVal} Finishes`;
  const periodLabel =
    { today: "Daily", week: "Weekly", weekend: "Weekend", month: "Monthly" }[
      periodType
    ] || periodType;
  const _fmtD = (iso) => {
    if (!iso) return "";
    const [, m, d] = iso.split("-");
    return (
      parseInt(d) +
      " " +
      [
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
      ][parseInt(m)]
    );
  };

  const renderItem = (p) => {
    const r = p.ranks.find((x) => x.name === playerName);
    const medal =
      r.rank === 1
        ? "🥇"
        : r.rank === 2
          ? "🥈"
          : r.rank === 3
            ? "🥉"
            : `#${r.rank}`;
    const sub =
      periodType === "week" || periodType === "month"
        ? `<span style="color:var(--muted);font-size:9px;display:block;margin-top:1px">${_fmtD(p.from)} – ${_fmtD(p.to)}</span>`
        : "";
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
       </button>`
    : "";

  let overlay = document.getElementById("podium-drill-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "podium-drill-overlay";
    document.body.appendChild(overlay);
  }
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
  let filter,
    from,
    to = null;
  if (periodType === "today") {
    filter = "day";
    from = key;
  } else if (periodType === "week") {
    filter = "range";
    from = key;
    const d = new Date(key + "T00:00:00");
    d.setDate(d.getDate() + 6);
    to = toLocalISODate(d);
  } else if (periodType === "weekend") {
    filter = "range";
    from = key;
    const d = new Date(key + "T00:00:00");
    d.setDate(d.getDate() + 1);
    to = toLocalISODate(d);
  } else {
    filter = "range";
    from = key + "-01";
    const [y, m] = key.split("-");
    to = toLocalISODate(new Date(parseInt(y), parseInt(m), 0));
  }
  cmpFilter = filter;
  cmpFrom = from;
  cmpTo = to;
  const dr = document.getElementById("cmpDr");
  const dp = document.getElementById("cmpDayPicker");
  const sel = document.getElementById("cmpSel");
  if (sel) sel.value = filter;
  if (filter === "day") {
    if (dp) {
      dp.classList.add("show");
      const di = document.getElementById("cmpDayInput");
      if (di) di.value = from;
    }
    if (dr) dr.classList.remove("show");
  } else {
    if (dr) {
      dr.classList.add("show");
      const cf = document.getElementById("cmpFrom"),
        ct = document.getElementById("cmpTo");
      if (cf) cf.value = from;
      if (ct) ct.value = to || "";
    }
    if (dp) dp.classList.remove("show");
  }
  switchMainTab("compact");
}

function _openAntiPodiumDrill(playerName, bottomPos, periodType) {
  const periods = _computeRankPeriods(periodType);
  const matching = periods.filter((p) => {
    if (!p.ranks.length) return false;
    const r = p.ranks.find((x) => x.name === playerName);
    if (!r) return false;
    const total = p.totalPlayers;
    if (bottomPos === "last") return r.trueRank === total;
    if (bottomPos === "secondlast") return r.trueRank === total - 1;
    if (bottomPos === "bottom2") return r.trueRank >= total - 1;
    return false;
  });
  if (!matching.length) return;

  const posEmoji =
    bottomPos === "last" ? "🪣" : bottomPos === "secondlast" ? "😬" : "📉";
  const posLabel =
    bottomPos === "last"
      ? "Last Place Finishes"
      : bottomPos === "secondlast"
        ? "2nd Last Finishes"
        : "Bottom 2 Finishes";
  const periodLabel =
    { today: "Daily", week: "Weekly", weekend: "Weekend", month: "Monthly" }[
      periodType
    ] || periodType;
  const _fmtD = (iso) => {
    if (!iso) return "";
    const [, m, d] = iso.split("-");
    return (
      parseInt(d) +
      " " +
      [
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
      ][parseInt(m)]
    );
  };

  const renderItem = (p) => {
    const r = p.ranks.find((x) => x.name === playerName);
    const total = p.totalPlayers;
    const icon = r.trueRank === total ? "🪣" : "😬";
    const rankBadge = `<span style="font-size:10px;color:var(--muted)">#${r.trueRank}/${total}</span>`;
    const sub =
      periodType === "week" || periodType === "month"
        ? `<span style="color:var(--muted);font-size:9px;display:block;margin-top:1px">${_fmtD(p.from)} – ${_fmtD(p.to)}</span>`
        : "";
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);cursor:pointer;-webkit-tap-highlight-color:transparent"
        onclick="_podiumDrillGoTo(${jsArg(p.key)},${jsArg(periodType)})">
      <span style="font-size:18px;line-height:1;flex-shrink:0">${icon}</span>
      <span style="flex:1;font-size:12px;font-weight:700;line-height:1.4">${escHtml(p.label)}${sub}</span>
      ${rankBadge}
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
       </button>`
    : "";

  let overlay = document.getElementById("podium-drill-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "podium-drill-overlay";
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `<div style="position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:flex-end" onclick="_closePodiumDrill()">
    <div style="background:var(--card);border-radius:16px 16px 0 0;width:100%;max-height:65vh;overflow-y:auto;padding:20px 16px 36px;box-sizing:border-box" onclick="event.stopPropagation()">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
        <div>
          <div style="font-size:14px;font-weight:800">${escHtml(playerName)} ${posEmoji} ${posLabel}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:3px">${periodLabel} · ${matching.length} period${matching.length !== 1 ? "s" : ""}</div>
        </div>
        <button onclick="_closePodiumDrill()" style="background:rgba(255,255,255,0.08);border:none;border-radius:50%;width:28px;height:28px;color:var(--text);font-size:14px;cursor:pointer;flex-shrink:0;margin-top:2px">✕</button>
      </div>
      ${head}${moreBlock}
    </div>
  </div>`;
  overlay.style.display = "block";
}

function _closePodiumDrill() {
  const el = document.getElementById("podium-drill-overlay");
  if (el) el.style.display = "none";
}

// ── RANK CALENDAR (Timeline player tap) ───────────────────────

function _openRankCalendar(playerName, periodType) {
  const allPeriods = _computeRankPeriods(periodType);
  // Build full lookup over ALL periods (not capped to 10)
  const rankMap = {};
  let maxRank = 1;
  allPeriods.forEach((p) => {
    const r = p.ranks.find((x) => x.name === playerName);
    if (r) {
      rankMap[p.key] = { rank: r.rank, label: p.label, from: p.from, to: p.to };
      if (r.rank > maxRank) maxRank = r.rank;
    }
  });

  const totalPeriods = Object.keys(rankMap).length;
  if (!totalPeriods) return;

  const periodLabel =
    { today: "Daily", week: "Weekly", weekend: "Weekend", month: "Monthly" }[
      periodType
    ] || periodType;
  const body =
    periodType === "today"
      ? _rankCalDailyHtml(rankMap, maxRank)
      : periodType === "week"
        ? _rankCalWeeklyHtml(rankMap, allPeriods, maxRank)
        : periodType === "weekend"
          ? _rankCalWeekendHtml(rankMap, allPeriods, maxRank)
          : _rankCalMonthlyHtml(rankMap, allPeriods, maxRank);

  let overlay = document.getElementById("podium-drill-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "podium-drill-overlay";
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `<div style="position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:flex-end" onclick="_closePodiumDrill()">
    <div style="background:var(--card);border-radius:16px 16px 0 0;width:100%;max-height:75vh;overflow-y:auto;padding:20px 16px 40px;box-sizing:border-box" onclick="event.stopPropagation()">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
        <div>
          <div style="font-size:14px;font-weight:800">${escHtml(playerName)} — Rank History</div>
          <div style="font-size:10px;color:var(--muted);margin-top:3px">${periodLabel} · ${totalPeriods} period${totalPeriods !== 1 ? "s" : ""} played</div>
        </div>
        <button onclick="_closePodiumDrill()" style="background:rgba(255,255,255,0.08);border:none;border-radius:50%;width:28px;height:28px;color:var(--text);font-size:14px;cursor:pointer;flex-shrink:0;margin-top:2px">✕</button>
      </div>
      ${body}
    </div>
  </div>`;
  overlay.style.display = "block";
}

// Daily: full monthly calendar grid (Mon–Sun columns)
function _rankCalDailyHtml(rankMap, maxRank) {
  const _SM = [
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
  const DOW_H = ["M", "T", "W", "T", "F", "S", "S"];

  // Group keys by YYYY-MM
  const byMonth = {};
  Object.keys(rankMap)
    .sort()
    .forEach((key) => {
      const ym = key.slice(0, 7);
      if (!byMonth[ym]) byMonth[ym] = {};
      byMonth[ym][key] = rankMap[key];
    });

  const _cell = (rank, label) => {
    if (rank == null)
      return `<td style="width:36px;height:30px;border-radius:4px;text-align:center;vertical-align:middle;font-size:9px;font-weight:800;color:rgba(255,255,255,0.12)">—</td>`;
    const bg = _rankBg(rank, maxRank);
    const col = _rankColor(rank, maxRank);
    const em = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "";
    return `<td title="${label || ""}" style="width:36px;height:30px;border-radius:4px;background:${bg};color:${col};text-align:center;vertical-align:middle;font-size:10px;font-weight:800">${em || "#" + rank}</td>`;
  };

  return Object.entries(byMonth)
    .sort()
    .reverse()
    .map(([ym, days]) => {
      const [y, mo] = ym.split("-");
      const firstDow = (new Date(+y, +mo - 1, 1).getDay() + 6) % 7; // Mon=0
      const daysInMonth = new Date(+y, +mo, 0).getDate();
      const cells = [];
      for (let i = 0; i < firstDow; i++) cells.push(`<td></td>`);
      for (let d = 1; d <= daysInMonth; d++) {
        const key = `${y}-${mo}-${String(d).padStart(2, "0")}`;
        const data = days[key];
        cells.push(_cell(data?.rank ?? null, data?.label));
      }
      while (cells.length % 7) cells.push(`<td></td>`);
      const rows = [];
      for (let i = 0; i < cells.length; i += 7)
        rows.push(`<tr style="gap:3px">${cells.slice(i, i + 7).join("")}</tr>`);
      return `<div style="margin-bottom:18px">
      <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.06em">${_SM[+mo]} ${y}</div>
      <table style="border-collapse:separate;border-spacing:3px">
        <thead><tr>${DOW_H.map((d) => `<th style="font-size:9px;color:var(--muted);font-weight:600;width:36px;text-align:center;padding-bottom:4px">${d}</th>`).join("")}</tr></thead>
        <tbody>${rows.join("")}</tbody>
      </table>
    </div>`;
    })
    .join("");
}

// Weekly: calendar-style grid grouped by month, highlighting the week range
function _rankCalWeeklyHtml(rankMap, allPeriods, maxRank) {
  // Show all weeks as cards grouped by month of the week-start
  const _SM = [
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
  const byMonth = {};
  allPeriods
    .filter((p) => rankMap[p.key])
    .forEach((p) => {
      const ym = p.key.slice(0, 7);
      if (!byMonth[ym]) byMonth[ym] = [];
      byMonth[ym].push(p);
    });

  const _card = (p) => {
    const d = rankMap[p.key];
    const bg = _rankBg(d.rank, maxRank);
    const col = _rankColor(d.rank, maxRank);
    const em =
      d.rank === 1 ? "🥇" : d.rank === 2 ? "🥈" : d.rank === 3 ? "🥉" : "";
    const [, fm, fd] = (p.from || p.key).split("-");
    const [, tm, td] = (p.to || p.key).split("-");
    const range = `${+fd} ${_SM[+fm]}${fm !== tm ? " – " + td + " " + _SM[+tm] : ""}`;
    return `<div style="background:${bg};border-radius:8px;padding:7px 10px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:10px;color:var(--muted)">${range}</span>
      <span style="font-size:13px;font-weight:800;color:${col}">${em || "#" + d.rank}</span>
    </div>`;
  };

  return Object.entries(byMonth)
    .sort()
    .reverse()
    .map(([ym, periods]) => {
      const [y, mo] = ym.split("-");
      return `<div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.06em">${_SM[+mo]} ${y}</div>
      ${periods.map(_card).join("")}
    </div>`;
    })
    .join("");
}

// Weekend: same as weekly style but grouping by month of the Saturday
function _rankCalWeekendHtml(rankMap, allPeriods, maxRank) {
  return _rankCalWeeklyHtml(rankMap, allPeriods, maxRank); // same layout, different labels
}

// Monthly: year-grouped grid of month tiles
function _rankCalMonthlyHtml(rankMap, allPeriods, maxRank) {
  const _SM = [
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
  const byYear = {};
  allPeriods
    .filter((p) => rankMap[p.key])
    .forEach((p) => {
      const y = p.key.slice(0, 4);
      if (!byYear[y]) byYear[y] = [];
      byYear[y].push(p);
    });

  const _tile = (p) => {
    const d = rankMap[p.key];
    const bg = _rankBg(d.rank, maxRank);
    const col = _rankColor(d.rank, maxRank);
    const em =
      d.rank === 1 ? "🥇" : d.rank === 2 ? "🥈" : d.rank === 3 ? "🥉" : "";
    const mo = p.key.slice(5, 7);
    return `<div style="background:${bg};border-radius:8px;padding:8px;text-align:center;min-width:52px">
      <div style="font-size:10px;color:var(--muted);font-weight:600">${_SM[+mo]}</div>
      <div style="font-size:13px;font-weight:800;color:${col};margin-top:3px">${em || "#" + d.rank}</div>
    </div>`;
  };

  return Object.entries(byYear)
    .sort()
    .reverse()
    .map(([y, periods]) => {
      return `<div style="margin-bottom:18px">
      <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.06em">${y}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${periods.map(_tile).join("")}</div>
    </div>`;
    })
    .join("");
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
        if (diff > 0)
          movement = `<span class="pr-mvmt pr-mvmt-up">↑${diff}</span>`;
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

// predict/sim selector view-state → viewState (src/ui/view-state.js)

function _buildMatchPredictHtml() {
  const players = _statPlayerNames();
  if (players.length < 2)
    return '<div class="sub" style="padding:8px">Need at least 2 players.</div>';
  return `<div class="ana-card" style="padding:12px">
    <div style="font-size:10px;color:var(--muted);margin-bottom:12px">Pick two teams — get win probability, expected score, and chemistry rating.</div>
    <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;margin-bottom:10px">
      <div>
        <div style="font-size:9px;font-weight:700;color:var(--muted);margin-bottom:4px">TEAM A</div>
        <button class="h2h-slot-btn${viewState.predictPlayerA ? " h2h-slot-filled" : ""}" id="pred-slot-a1" onclick="openPredictSheet('a1')" style="width:100%;margin-bottom:6px">
          <span style="font-size:9px;color:var(--muted);display:block">P1</span>
          <span id="pred-label-a1" style="font-size:11px;font-weight:800">${viewState.predictPlayerA || "—"}</span>
        </button>
        <button class="h2h-slot-btn${viewState.predictPartnerA ? " h2h-slot-filled" : ""}" id="pred-slot-a2" onclick="openPredictSheet('a2')" style="width:100%">
          <span style="font-size:9px;color:var(--muted);display:block">P2</span>
          <span id="pred-label-a2" style="font-size:11px;font-weight:800">${viewState.predictPartnerA || "—"}</span>
        </button>
      </div>
      <div style="font-size:14px;font-weight:900;color:var(--muted)">VS</div>
      <div>
        <div style="font-size:9px;font-weight:700;color:var(--muted);margin-bottom:4px">TEAM B</div>
        <button class="h2h-slot-btn${viewState.predictPlayerB ? " h2h-slot-filled" : ""}" id="pred-slot-b1" onclick="openPredictSheet('b1')" style="width:100%;margin-bottom:6px">
          <span style="font-size:9px;color:var(--muted);display:block">P1</span>
          <span id="pred-label-b1" style="font-size:11px;font-weight:800">${viewState.predictPlayerB || "—"}</span>
        </button>
        <button class="h2h-slot-btn${viewState.predictPartnerB ? " h2h-slot-filled" : ""}" id="pred-slot-b2" onclick="openPredictSheet('b2')" style="width:100%">
          <span style="font-size:9px;color:var(--muted);display:block">P2</span>
          <span id="pred-label-b2" style="font-size:11px;font-weight:800">${viewState.predictPartnerB || "—"}</span>
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
    viewState.predictPlayerA,
    viewState.predictPartnerA,
    viewState.predictPlayerB,
    viewState.predictPartnerB,
  ].filter((v, i) => v && ["a1", "a2", "b1", "b2"][i] !== slot);
  const players = sortPlayersGuestsLast(
    _statPlayerNames(),
  );
  const selected =
    slot === "a1"
      ? viewState.predictPlayerA
      : slot === "a2"
        ? viewState.predictPartnerA
        : slot === "b1"
          ? viewState.predictPlayerB
          : viewState.predictPartnerB;
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
  const taken = { a1: viewState.simA1, a2: viewState.simA2, b1: viewState.simB1, b2: viewState.simB2 };
  const current = taken[slot];
  const others = Object.entries(taken)
    .filter(([k]) => k !== slot)
    .map(([, v]) => v)
    .filter(Boolean);
  const players = sortPlayersGuestsLast(
    _statPlayerNames(),
  );
  list.innerHTML =
    `<div class="live-sheet-item" onclick="selectFilterItem('')"><div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--muted)">—</div><span>None</span></div>` +
    players
      .map((p) => {
        const dis = others.includes(p)
          ? ' style="opacity:0.3;pointer-events:none"'
          : "";
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
  const teamA = [viewState.predictPlayerA, viewState.predictPartnerA].filter(Boolean);
  const teamB = [viewState.predictPlayerB, viewState.predictPartnerB].filter(Boolean);
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
  const showMoreBtn =
    remaining > 0
      ? `<button class="story-show-more" onclick="_storyShowMore(this,'all')">Show More (${remaining} more)</button>`
      : "";
  return `<div class="ana-card" style="padding:10px 12px">
    <div class="story-chips">${chips}</div>
    <div class="story-cards-wrap">${cards}</div>
    <div class="story-more-wrap">${showMoreBtn}</div>
  </div>`;
}

function _storyFilter(filter, btn) {
  const wrap = btn.parentElement;
  if (wrap)
    wrap
      .querySelectorAll(".story-chip")
      .forEach((b) => b.classList.toggle("active", b === btn));
  const card = btn.closest(".ana-card");
  if (!card) return;
  const allCards = [...card.querySelectorAll(".story-card")];
  let shown = 0;
  allCards.forEach((c) => {
    const matches = filter === "all" || c.dataset.type === filter;
    if (matches && shown < 5) {
      c.style.display = "";
      shown++;
    } else c.style.display = "none";
  });
  const matching = allCards.filter(
    (c) => filter === "all" || c.dataset.type === filter,
  ).length;
  const moreWrap = card.querySelector(".story-more-wrap");
  if (moreWrap) {
    const rem = matching - 5;
    moreWrap.innerHTML =
      rem > 0
        ? `<button class="story-show-more" onclick="_storyShowMore(this,'${filter}')">Show More (${rem} more)</button>`
        : "";
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
  const buckets = computeSeasons(activeMatches());
  if (!buckets.length)
    return '<div class="sub" style="padding:8px">No matches in any season yet.</div>';
  const cards = buckets
    .map(
      (s) => `
    <div class="season-card" onclick="this.classList.toggle('season-open')">
      <div class="season-card-header">
        <div>
          <div style="font-size:13px;font-weight:800">${escHtml(s.monthName)}</div>
          <div style="font-size:9px;color:var(--muted)">${s.rangeLabel ? escHtml(s.rangeLabel) + " · " : ""}${s.matches} matches · ${s.players.length} players</div>
        </div>
        <div style="font-size:11px;color:var(--muted)">▼</div>
      </div>
      <div class="season-card-body">
        ${s.mvp ? `<div class="season-award"><span class="season-award-icon">🥇</span><div><div style="font-size:9px;color:var(--gold);font-weight:700">MVP</div><div style="font-size:12px;font-weight:800">${s.mvp.name}</div><div style="font-size:9px;color:var(--muted)">${s.mvp.mw}W ${s.mvp.mp}P ${Math.round((s.mvp.mw / s.mvp.mp) * 100)}%</div></div></div>` : ""}
        ${s.topPair ? `<div class="season-award"><span class="season-award-icon">🤝</span><div><div style="font-size:9px;color:var(--theme);font-weight:700">TOP PAIR</div><div style="font-size:12px;font-weight:800">${s.topPair.players.join(" & ")}</div><div style="font-size:9px;color:var(--muted)">${s.topPair.wins}W ${s.topPair.played}P ${s.topPair.winPct}%</div></div></div>` : ""}
        ${s.mostImproved ? `<div class="season-award"><span class="season-award-icon">📈</span><div><div style="font-size:9px;color:var(--green);font-weight:700">MOST IMPROVED</div><div style="font-size:12px;font-weight:800">${escHtml(s.mostImproved.name)}</div></div></div>` : ""}
        ${s.ironMan ? `<div class="season-award"><span class="season-award-icon">💪</span><div><div style="font-size:9px;color:var(--green);font-weight:700">IRON MAN</div><div style="font-size:12px;font-weight:800">${s.ironMan.name}</div><div style="font-size:9px;color:var(--muted)">${s.ironMan.mp} matches</div></div></div>` : ""}
        ${s.mostConsistent ? `<div class="season-award"><span class="season-award-icon">🎯</span><div><div style="font-size:9px;color:var(--theme);font-weight:700">MOST CONSISTENT</div><div style="font-size:12px;font-weight:800">${escHtml(s.mostConsistent.name)}</div><div style="font-size:9px;color:var(--muted)">${(s.mostConsistent.sd * 100).toFixed(1)}% std dev</div></div></div>` : ""}
        ${s.mostFeared ? `<div class="season-award"><span class="season-award-icon">👹</span><div><div style="font-size:9px;color:var(--red);font-weight:700">MOST FEARED</div><div style="font-size:12px;font-weight:800">${escHtml(s.mostFeared.name)}</div><div style="font-size:9px;color:var(--muted)">${s.mostFeared.winPct.toFixed(0)}% win rate</div></div></div>` : ""}
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

// ── NEW STATISTICS FEATURES ───────────────────────────────────
// All read the season/guest-scoped active set (except Season Comparison, which
// is inherently cross-season and reads state.matches).

// Everyone's CURRENT win/loss streak, ranked (hot streaks first).
function _buildStreakLeaderboardHtml() {
  const stats = _memoStats().filter((p) => p.mp >= 1);
  if (!stats.length)
    return '<div class="sub" style="padding:8px">No matches yet.</div>';
  const sorted = [...stats].sort((a, b) => {
    const av = a.curType === "W" ? a.curStreak : -a.curStreak;
    const bv = b.curType === "W" ? b.curStreak : -b.curStreak;
    return bv - av || b.bestWinStreak - a.bestWinStreak;
  });
  const rows = sorted
    .map((p, i) => {
      const onW = p.curType === "W";
      const col = onW ? "var(--green)" : "var(--red)";
      const ico = onW ? "🔥" : "❄️";
      return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span style="font-size:11px;font-weight:800;color:var(--muted);width:20px">#${i + 1}</span>
        <span style="width:22px;height:22px;border-radius:50%;background:${playerColor(p.name)};display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:#fff;flex-shrink:0">${playerInitials(p.name)}</span>
        <span style="flex:1;font-size:12px;font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(p.name)}</span>
        <span style="font-size:12px;font-weight:800;color:${col}">${ico} ${onW ? "W" : "L"}${p.curStreak}</span>
        <span style="font-size:9px;color:var(--muted);width:54px;text-align:right">best W${p.bestWinStreak}</span>
      </div>`;
    })
    .join("");
  return `<div class="ana-card" style="padding:8px 12px">${rows}</div>`;
}

// Biggest ELO upsets: lower-rated team beating a higher-rated one. Recomputes
// ELO match-by-match (same engine as elo.js) to capture pre-match ratings.
function _buildBiggestUpsetsHtml() {
  const ms = [...activeMatches()].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  const elo = {};
  const seed = (n) => {
    if (!(n in elo)) elo[n] = 1000;
  };
  const upsets = [];
  ms.forEach((m) => {
    const tA = m.teamA || [],
      tB = m.teamB || [];
    [...tA, ...tB].forEach(seed);
    const avgA = tA.reduce((s, p) => s + elo[p], 0) / Math.max(tA.length, 1);
    const avgB = tB.reduce((s, p) => s + elo[p], 0) / Math.max(tB.length, 1);
    const aWon = m.scoreA > m.scoreB;
    const winAvg = aWon ? avgA : avgB;
    const loseAvg = aWon ? avgB : avgA;
    const gap = loseAvg - winAvg; // >0 → the underdog won
    const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
    const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
    const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
    tA.forEach((p) => (elo[p] += dA));
    tB.forEach((p) => (elo[p] += dB));
    if (gap > 0)
      upsets.push({
        date: m.date,
        gap: Math.round(gap),
        winners: aWon ? tA : tB,
        losers: aWon ? tB : tA,
        sw: Math.max(m.scoreA, m.scoreB),
        sl: Math.min(m.scoreA, m.scoreB),
      });
  });
  upsets.sort((a, b) => b.gap - a.gap);
  const top = upsets.slice(0, 8);
  if (!top.length)
    return '<div class="sub" style="padding:8px">No upsets yet — the favourites have held.</div>';
  const cards = top
    .map(
      (u) => `<div class="ana-card" style="padding:10px 12px;margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:12px;font-weight:800;color:var(--green)">${escHtml(u.winners.join(" & "))}</span>
        <span style="font-size:13px;font-weight:800">${u.sw}–${u.sl}</span>
        <span style="font-size:12px;font-weight:800;color:var(--muted)">${escHtml(u.losers.join(" & "))}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--muted)">
        <span>+${u.gap} ELO underdog gap</span>
        <span>${fmtDate(u.date)}</span>
      </div>
    </div>`,
    )
    .join("");
  return cards;
}

// Players closest to their next round-number milestone (matches / wins of 25).
function _buildUpcomingMilestonesHtml() {
  const stats = computeStats(activeMatches());
  if (!stats.length)
    return '<div class="sub" style="padding:8px">No matches yet.</div>';
  const nextMul = (v, step) => Math.ceil((v + 1) / step) * step;
  const items = [];
  stats.forEach((p) => {
    const nm = nextMul(p.mp, 25);
    items.push({ name: p.name, to: nm - p.mp, target: nm, kind: "matches", icon: "🎯" });
    const nw = nextMul(p.mw, 25);
    items.push({ name: p.name, to: nw - p.mw, target: nw, kind: "wins", icon: "🏆" });
  });
  const near = items
    .filter((i) => i.to <= 8)
    .sort((a, b) => a.to - b.to)
    .slice(0, 12);
  if (!near.length)
    return '<div class="sub" style="padding:8px">No milestones within reach (8) yet.</div>';
  const rows = near
    .map(
      (i) => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
      <span style="font-size:15px">${i.icon}</span>
      <span style="flex:1;font-size:12px;font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(i.name)}</span>
      <span style="font-size:13px;font-weight:800;color:var(--theme)">${i.to}</span>
      <span style="font-size:10px;color:var(--muted)">from ${i.target} ${i.kind}</span>
    </div>`,
    )
    .join("");
  return `<div class="ana-card" style="padding:8px 12px">${rows}</div>`;
}

// Compare every player's ELO across the user-defined Seasons (cross-season).
function _buildSeasonComparisonHtml() {
  if (!state.seasons.length)
    return '<div class="sub" style="padding:8px">Define Seasons (🗓️ in the menu) to compare players across them.</div>';
  const ordered = [...state.seasons].sort((a, b) =>
    (a.start || "").localeCompare(b.start || ""),
  );
  // Cross-season, but still exclude guest players from the comparison.
  const _allM = withoutGuestMatches(state.matches);
  const perSeason = ordered.map((s) => {
    const sm = _allM.filter((m) => _inSeason(s, m.date));
    return { s, elo: computeElo(sm), stats: computeStats(sm) };
  });
  const totals = {};
  _allM.forEach((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].forEach(
      (p) => (totals[p] = (totals[p] || 0) + 1),
    ),
  );
  const playersSorted = Object.keys(totals)
    .sort((a, b) => totals[b] - totals[a])
    .slice(0, 12);
  if (!playersSorted.length)
    return '<div class="sub" style="padding:8px">No matches in any season.</div>';
  const th = `<th style="text-align:left;padding:4px 6px;font-size:9px;color:var(--muted);position:sticky;left:0;background:var(--surface)">Player</th>${ordered
    .map(
      (s) =>
        `<th style="padding:4px 6px;font-size:9px;color:var(--muted);white-space:nowrap">${escHtml(s.name)}</th>`,
    )
    .join("")}`;
  const rows = playersSorted
    .map((name) => {
      const cells = perSeason
        .map((ps) => {
          const st = ps.stats.find((x) => x.name === name);
          if (!st)
            return `<td style="text-align:center;padding:4px 6px;color:var(--muted)">—</td>`;
          const e = Math.round(ps.elo[name] || 1000);
          const col =
            e >= 1030 ? "var(--green)" : e <= 970 ? "var(--red)" : "var(--text)";
          return `<td style="text-align:center;padding:4px 6px"><div style="font-size:12px;font-weight:800;color:${col}">${e}</div><div style="font-size:8px;color:var(--muted)">${st.mw}-${st.ml}</div></td>`;
        })
        .join("");
      return `<tr><td style="text-align:left;padding:4px 6px;font-size:11px;font-weight:700;position:sticky;left:0;background:var(--surface);white-space:nowrap">${escHtml(name)}</td>${cells}</tr>`;
    })
    .join("");
  return `<div class="ana-card" style="padding:8px"><div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%"><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table></div><div style="font-size:9px;color:var(--muted);margin-top:6px">Season ELO per player (W–L below). — = didn't play that season.</div></div>`;
}

// Radar overlay comparing 2 players across 5 normalized axes.
function _radarSvg(stats, aName, bName) {
  const A = stats.find((p) => p.name === aName),
    B = stats.find((p) => p.name === bName);
  if (!A || !B) return "";
  const maxConsist = Math.max(...stats.map((p) => p.consistency || 0), 1);
  const axes = [
    { label: "Win%", v: (p) => p.winPct },
    { label: "Game%", v: (p) => p.gamePct },
    { label: "ELO", v: (p) => (p.sr / 10) * 100 },
    { label: "Activity", v: (p) => p.act * 100 },
    {
      label: "Consist.",
      v: (p) =>
        p.consistency == null
          ? 50
          : Math.max(0, 100 - (p.consistency / maxConsist) * 100),
    },
  ];
  const cx = 130,
    cy = 120,
    R = 84,
    N = axes.length;
  const pt = (i, frac) => {
    const ang = -Math.PI / 2 + (i / N) * 2 * Math.PI;
    return [cx + Math.cos(ang) * R * frac, cy + Math.sin(ang) * R * frac];
  };
  let grid = "";
  [0.25, 0.5, 0.75, 1].forEach((f) => {
    grid += `<polygon points="${axes.map((_, i) => pt(i, f).join(",")).join(" ")}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
  });
  let spokes = "",
    labels = "";
  axes.forEach((ax, i) => {
    const [x, y] = pt(i, 1);
    spokes += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(255,255,255,0.08)"/>`;
    const [lx, ly] = pt(i, 1.2);
    labels += `<text x="${lx}" y="${ly}" font-size="8" fill="var(--muted)" text-anchor="middle" dominant-baseline="middle">${ax.label}</text>`;
  });
  const poly = (p, color) =>
    `<polygon points="${axes.map((ax, i) => pt(i, Math.max(0, Math.min(1, ax.v(p) / 100))).join(",")).join(" ")}" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="2"/>`;
  const colA = playerColor(aName),
    colB = playerColor(bName);
  return `<svg viewBox="0 0 260 248" width="100%" style="max-width:300px;display:block;margin:0 auto">${grid}${spokes}${labels}${poly(B, colB)}${poly(A, colA)}</svg>
    <div style="display:flex;justify-content:center;gap:16px;margin-top:4px">
      <span style="font-size:11px;font-weight:700;color:${colA}">● ${escHtml(aName)}</span>
      <span style="font-size:11px;font-weight:700;color:${colB}">● ${escHtml(bName)}</span>
    </div>`;
}
function _buildRadarCompareHtml() {
  const stats = _memoStats().filter((p) => p.mp >= 3);
  if (stats.length < 2)
    return '<div class="sub" style="padding:8px">Need 2+ players with 3+ matches.</div>';
  const byElo = [...stats].sort((a, b) => b.sr - a.sr);
  if (
    !window._radarSel ||
    !stats.find((p) => p.name === window._radarSel.a) ||
    !stats.find((p) => p.name === window._radarSel.b)
  )
    window._radarSel = { a: byElo[0].name, b: byElo[1].name };
  const opts = (sel) =>
    stats
      .map(
        (p) =>
          `<option value="${escHtml(p.name)}"${p.name === sel ? " selected" : ""}>${escHtml(p.name)}</option>`,
      )
      .join("");
  const selStyle =
    "flex:1;min-width:0;padding:7px 8px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:12px;font-weight:700";
  return `<div class="ana-card" style="padding:12px">
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <select onchange="_radarPick('a',this.value)" style="${selStyle}">${opts(window._radarSel.a)}</select>
      <select onchange="_radarPick('b',this.value)" style="${selStyle}">${opts(window._radarSel.b)}</select>
    </div>
    <div id="radar-box">${_radarSvg(stats, window._radarSel.a, window._radarSel.b)}</div>
  </div>`;
}
function _radarPick(slot, name) {
  window._radarSel = window._radarSel || {};
  window._radarSel[slot] = name;
  const box = document.getElementById("radar-box");
  if (!box) return;
  const stats = _memoStats().filter((p) => p.mp >= 3);
  box.innerHTML = _radarSvg(stats, window._radarSel.a, window._radarSel.b);
}



window._renderHiLoTable = function () {
  const el = document.getElementById("hi-lo-elo-body");
  if (!el || !window._hiLoData) return;
  const { col, asc } = window._hiLoSort;
  const pg3 = "grid-template-columns:22px 1fr 44px 44px 48px 44px 48px 46px";
  const sorted = [...window._hiLoData].sort((a, b) => {
    const av = col === "name" ? a.name : a[col];
    const bv = col === "name" ? b.name : b[col];
    if (col === "name")
      return asc ? av.localeCompare(bv) : bv.localeCompare(av);
    return asc ? av - bv : bv - av;
  });
  el.innerHTML = sorted
    .map((r, i) => {
      const fpStr =
        r.fromPeak === 0
          ? `<span style="color:var(--green);font-size:9px;font-weight:800">PEAK</span>`
          : `<span style="color:var(--red)">${r.fromPeak}</span>`;
      const flStr =
        r.fromLow === 0
          ? `<span style="color:var(--muted);font-size:9px">LOW</span>`
          : `<span style="color:var(--green)">+${r.fromLow}</span>`;
      const dots = (r.pts5 || [])
        .map(
          (pt) =>
            `<span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:${pt.won ? "var(--green)" : "var(--red)"}"></span>`,
        )
        .join("");
      const momStr =
        r.momAvg > 0
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
    })
    .join("");
  document.querySelectorAll(".hilo-hdr").forEach((h) => {
    const c = h.dataset.col;
    const base = h.title.replace(/^Sort by /, "").toUpperCase();
    const isActive = c === col;
    h.style.color = isActive ? "var(--theme)" : "";
    const arrow = isActive ? (asc ? " ↑" : " ↓") : "";
    h.textContent = h.textContent.replace(/ [↑↓]$/, "") + arrow;
  });
};

window._hiLoSortBy = function (col) {
  if (!window._hiLoSort) return;
  if (window._hiLoSort.col === col) {
    window._hiLoSort.asc = !window._hiLoSort.asc;
  } else {
    window._hiLoSort = { col, asc: col === "name" };
  }
  window._renderHiLoTable();
};

// ── ELO PROJECTION ─────────────────────────────────────────────
window._eloProj = {
  formN: 10,
  futureM: 20,
  sortCol: "currentRank",
  sortAsc: true,
};

window._eloprojAdj = function (type, delta) {
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

window._eloprojSort = function (col) {
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

window._renderEloProjTable = function () {
  const tableEl = document.getElementById("eloproj-table");
  if (!tableEl) return;
  const { formN, futureM, sortCol, sortAsc } = window._eloProj;
  const eloMap = _memoElo();
  const histAll = _memoEloHistory();
  if (!histAll || !eloMap) return;

  const ranked = Object.entries(eloMap).sort((a, b) => b[1] - a[1]);
  if (!ranked.length) {
    tableEl.innerHTML =
      '<div class="sub" style="padding:8px">No ELO data.</div>';
    return;
  }

  const currentRankMap = {};
  ranked.forEach(([name], i) => {
    currentRankMap[name] = i + 1;
  });

  const projData = ranked.map(([name, currentElo]) => {
    const hist = histAll[name] || [];
    const slice = hist.slice(-formN);
    const avgDelta = slice.length
      ? slice.reduce((s, p) => s + p.delta, 0) / slice.length
      : 0;
    const projElo = Math.round(currentElo + avgDelta * futureM);
    return {
      name,
      currentElo,
      avgDelta,
      projElo,
      currentRank: currentRankMap[name],
    };
  });

  const projSorted = [...projData].sort((a, b) => b.projElo - a.projElo);
  const projRankMap = {};
  projSorted.forEach((p, i) => {
    projRankMap[p.name] = i + 1;
  });

  // Attach projRank and rankDiff then sort display order
  projData.forEach((p) => {
    p.projRank = projRankMap[p.name];
    p.rankDiff = p.currentRank - p.projRank;
  });

  const sortFn = {
    currentRank: (a, b) => a.currentRank - b.currentRank,
    name: (a, b) => a.name.localeCompare(b.name),
    currentElo: (a, b) => b.currentElo - a.currentElo,
    avgDelta: (a, b) => b.avgDelta - a.avgDelta,
    projElo: (a, b) => b.projElo - a.projElo,
    projRank: (a, b) => a.projRank - b.projRank,
    rankDiff: (a, b) => b.rankDiff - a.rankDiff,
  };
  const cmp = sortFn[sortCol] || sortFn.currentRank;
  projData.sort(sortAsc ? cmp : (a, b) => cmp(b, a));

  const pg = "grid-template-columns:28px 1fr 50px 52px 70px 36px 40px";
  const arrow = (col) => (sortCol === col ? (sortAsc ? " ▲" : " ▼") : "");

  const rows = projData
    .map((p) => {
      const rankEl =
        p.rankDiff > 0
          ? `<span class="ep-rank-up">▲${p.rankDiff}</span>`
          : p.rankDiff < 0
            ? `<span class="ep-rank-dn">▼${Math.abs(p.rankDiff)}</span>`
            : `<span class="ep-rank-eq">—</span>`;
      const avgSign = p.avgDelta >= 0 ? "+" : "";
      const avgCol =
        p.avgDelta > 0
          ? "var(--green)"
          : p.avgDelta < 0
            ? "var(--red)"
            : "var(--muted)";
      const projDiff = p.projElo - p.currentElo;
      const projSign = projDiff >= 0 ? "+" : "";
      const projDiffCol =
        projDiff > 0
          ? "var(--green)"
          : projDiff < 0
            ? "var(--red)"
            : "var(--muted)";
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
    })
    .join("");

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
  // Skip full re-render if data hasn't changed since last render
  if (
    _anaRenderedVersion === _dataVersion &&
    container.querySelector(".ana-sec")
  )
    return;
  // Statistics run over the season-scoped, GUEST-EXCLUDED set — never raw
  // state.matches — so players marked as guest don't appear in any stat.
  const am = activeMatches();
  if (!am.length) {
    container.innerHTML = emptyState({
      icon: "📊",
      title: "No matches yet",
      message: "Add a match to start tracking stats and rankings.",
      action: { label: "Add match", onClick: "switchMainTab('add')" },
    });
    return;
  }

  // ── DATA COLLECTION + DERIVED (pure, moved to player-analytics.js) ─────────
  const {
    stats, shutoutWins, shutoutLosses, highestMargins, partnerships, teamMatchups,
    monthlyStats, dateCounts, scoreDist, rivalryCount, closeWins, closePlayed,
    mostActive, topWinRate, topStreak, mostShutoutWinsEntry,
    maxLosses, mostShutoutLosses, biggestWin, bestPartnership,
  } = computeAnalyticsPageData(am);
  // Two locals the render body still needs (the data fn derives them internally
  // but returns only the rolled-up stats): the player list and sorted matches.
  const players = Object.values(stats);
  const sortedM = [...am].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );

  // Reusable indexes built in ONE pass, so the section builders below don't each
  // re-filter sortedM per player/date (those were O(players × matches) loops).
  // matchesByPlayer preserves sortedM's chronological order (callers slice tails).
  const matchesByPlayer = {};
  const matchCountByDate = {};
  sortedM.forEach((m) => {
    [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
      (matchesByPlayer[p] || (matchesByPlayer[p] = [])).push(m);
    });
    if (m.date) matchCountByDate[m.date] = (matchCountByDate[m.date] || 0) + 1;
  });

  // ── ELO ────────────────────────────────────────────────
  const eloMap = _memoElo(true);
  const pairLeaderboard = _memoPairStats().slice(0, 8);
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
          `<button class="h2h-sort-pill${viewState.h2hMatrixSort === k ? " active" : ""}" onclick="_h2hSetSort('${k}')">${l}</button>`,
      )
      .join("")}
  </div>`;
  const matrixHtml = `<div id="h2h-matrix-wrap">
    ${matrixSortBar}
    <div id="h2h-matrix-inner">${buildH2HMatrixCompact(playersByMatches)}</div>
  </div>`;

  const compList = _memoStats();
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
  const _antiClutchHtml =
    _antiClutchRows.length >= 2
      ? `<div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.07)"><div style="font-size:9px;font-weight:700;color:var(--muted);letter-spacing:0.08em;margin-bottom:6px">😰 ANTI-CLUTCH</div>` +
        _antiClutchRows
          .map(
            (p, i) =>
              `<div class="lrace-row" style="${clutchGrid}"><div class="lrace-rank">#${i + 1}</div><div class="lrace-name">${p.name}</div><div class="lrace-1mo">${p.wins}–${p.played - p.wins}</div><div class="lrace-delta" style="color:var(--red)">${p.pct}% <span style="font-size:9px">CHOKER</span></div></div>`,
          )
          .join("") +
        `</div>`
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
          [...consistencyStats]
            .reverse()
            .slice(0, 3)
            .map(
              (p, i) =>
                `<div class="lrace-row" style="${conGrid}"><div class="lrace-rank">#${i + 1}</div><div class="lrace-name">${p.name}</div><div class="lrace-1mo">${p.mp}</div><div class="lrace-delta" style="color:var(--red)">±${p.consistency} <span style="font-size:9px">VOLATILE</span></div></div>`,
            )
            .join("") +
          `</div>`
        : "")
    : '<div class="sub" style="padding:8px">Need 3+ matches per player.</div>';

  // ── QUALITY WINS (OPPONENT STRENGTH WEIGHTING) ───────────
  const eloMapFull = _memoElo();
  const qualityWins = {};
  am.forEach((m) => {
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
  let _hardestWinMatch = null,
    _hardestCombinedElo = 0;
  am.forEach((m) => {
    const _aw = m.scoreA > m.scoreB;
    const _losers2 = _aw ? m.teamB : m.teamA;
    const _combElo = _losers2.reduce((s, p) => s + (eloMapFull[p] || 1000), 0);
    if (_combElo > _hardestCombinedElo) {
      _hardestCombinedElo = _combElo;
      _hardestWinMatch = m;
    }
  });
  const _hardestWinCallout = _hardestWinMatch
    ? (() => {
        const _aw2 = _hardestWinMatch.scoreA > _hardestWinMatch.scoreB;
        const _w = (
          _aw2 ? _hardestWinMatch.teamA : _hardestWinMatch.teamB
        ).join(" & ");
        const _l = (
          _aw2 ? _hardestWinMatch.teamB : _hardestWinMatch.teamA
        ).join(" & ");
        return `<div style="background:rgba(var(--theme-rgb),0.08);border:1px solid rgba(var(--theme-rgb),0.18);border-radius:10px;padding:10px 12px;margin-bottom:10px"><div style="font-size:8px;font-weight:700;color:var(--gold);letter-spacing:0.08em;margin-bottom:5px">💎 HARDEST WIN · OPP ELO ${_hardestCombinedElo}</div><div style="font-size:12px;font-weight:800">${_w} <span style="color:var(--green)">beat</span> ${_l}</div><div style="font-size:10px;color:var(--muted);margin-top:3px">${fmtDate(_hardestWinMatch.date)} · ${_hardestWinMatch.scoreA}–${_hardestWinMatch.scoreB}</div></div>`;
      })()
    : "";

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
  const rivalry = rivalA && rivalB ? getHeadToHeadStats(rivalA, rivalB, activeMatches()) : null;

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
      if (lastDot)
        for (let si = dots.length - 1; si >= 0 && dots[si] === lastDot; si--)
          strk++;
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
  const pairFormData = _memoPairStats()
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
    '<div class="sub" style="padding:8px">' +
    (_activeSeason()
      ? "This season spans a single month — switch to ALL SEASONS (🗓️ in the menu) to see the multi-month trend."
      : "Need matches across 2+ months to chart a win-rate trend.") +
    "</div>";
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
      <div class="hm-stat"><div class="hm-stat-val">${am.length}</div><div class="hm-stat-lbl">Total Matches</div></div>
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
    ? (
        _allMarginsRaw.reduce((s, v) => s + v, 0) / _allMarginsRaw.length
      ).toFixed(1)
    : "—";
  const _sdCallout = _topScore
    ? `<div style="display:flex;gap:8px;margin-bottom:10px"><div style="flex:1;background:rgba(var(--theme-rgb),0.08);border-radius:8px;padding:8px;text-align:center"><div style="font-size:8px;color:var(--muted);letter-spacing:0.06em;margin-bottom:3px">MOST COMMON SCORE</div><div style="font-size:20px;font-weight:900;color:var(--theme)">${_topScore[0]}</div><div style="font-size:9px;color:var(--muted)">${_topScore[1]}× · ${Math.round((_topScore[1] / am.length) * 100)}%</div></div><div style="flex:1;background:rgba(var(--theme-rgb),0.08);border-radius:8px;padding:8px;text-align:center"><div style="font-size:8px;color:var(--muted);letter-spacing:0.06em;margin-bottom:3px">AVG MARGIN</div><div style="font-size:20px;font-weight:900;color:var(--accent)">${_avgMarginOverall}</div><div style="font-size:9px;color:var(--muted)">games per match</div></div></div>`
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
        const skBadge =
          p.streak >= 2
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
    let best = null,
      bestDiff = -Infinity;
    for (const p of pNames) {
      const overall = stats[p].wins / stats[p].matches;
      const pMatches = matchesByPlayer[p] || [];
      const recent = pMatches.slice(-10);
      if (recent.length < 3) continue;
      const recWins = recent.filter((m) =>
        (m.scoreA > m.scoreB ? m.teamA || [] : m.teamB || []).includes(p),
      ).length;
      const recentRate = recWins / recent.length;
      const diff = recentRate - overall;
      if (diff > bestDiff) {
        bestDiff = diff;
        best = p;
      }
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

  viewState.pairSort = { key: "winPct", dir: -1 };
  viewState.pairsShowAll = false;
  viewState.pairsData = allPairsRanked.map(([key, p]) => ({
    key,
    players: p.players,
    wins: p.wins,
    played: p.played,
    eloRank: pairEloRankMap.get(key) || 9999,
    chem: pairChemMap.get(key) || 0,
  }));

  const allPairsHtml = viewState.pairsData.length
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
    ? (am.length / totalSessions).toFixed(1)
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
    .map(
      (p) =>
        `<option value="${escHtml(p)}">${escHtml(p.toUpperCase())}</option>`,
    )
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
    ...new Set(_memoPairStats().flatMap((p) => p.players)),
  ].sort();
  const pairMatrixHtml = (() => {
    if (pairMatrixPlayers.length < 2)
      return '<div class="sub" style="padding:8px">Need more pair data.</div>';
    const pairLookup = {};
    _memoPairStats().forEach((p) => {
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

  // (The former "Monthly Awards" section is now unified into the per-period
  // "Season Awards" / "Monthly Recap" cards — see computeSeasons/_periodAwards.)

  // ── PERSONAL BESTS ─────────────────────────────────────
  const personalBestsHtml = (() => {
    const pbStats = computeStats(activeMatches()).filter((p) => p.mp >= 3);
    if (!pbStats.length)
      return '<div class="sub" style="padding:8px">Not enough data.</div>';
    const rows = pbStats.map((p) => {
      const playerMs = matchesByPlayer[p.name] || [];
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
        const totalOnDay = matchCountByDate[mdDate] || 0;
        mostDayStr = `${mdData.played}/${totalOnDay}`;
      }
      return `<div class="pb-row"><div class="pb-name">${p.name}</div><div class="pb-stat" title="Longest win streak">🔥${longestWS}W</div><div class="pb-stat" title="Biggest win">${biggestScore ? `💥${biggestScore}` : "—"}</div><div class="pb-stat" title="Best day wins">⭐${bestDay ? `${bestDay.wins}W/${bestDay.played}` : "—"}</div><div class="pb-stat" title="Most matches in a day">📅${mostDayStr}</div></div>`;
    });
    return `<div class="ana-card" style="padding:10px 12px"><div class="pb-header"><div class="pb-name">Player</div><div class="pb-stat">Best Streak</div><div class="pb-stat">Best Win</div><div class="pb-stat">Best Day</div><div class="pb-stat">Most/Day</div></div>${rows.join("")}</div>`;
  })();

  // ── SCORE PREDICTION ACCURACY ─────────────────────────
  const predAccHtml = (() => {
    if (am.length < 5)
      return '<div class="sub" style="padding:8px">Need more matches.</div>';
    const sorted2 = [...am].sort((a, b) =>
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
          <button class="h2h-slot-btn${viewState.simA1 ? " h2h-slot-filled" : ""}" id="sim-slot-a1" onclick="openSimSheet('a1')" style="width:100%;margin-bottom:6px">
            <span style="font-size:9px;color:var(--muted);display:block">P1</span>
            <span id="sim-label-a1" style="font-size:11px;font-weight:800">${viewState.simA1 || "—"}</span>
          </button>
          <button class="h2h-slot-btn${viewState.simA2 ? " h2h-slot-filled" : ""}" id="sim-slot-a2" onclick="openSimSheet('a2')" style="width:100%">
            <span style="font-size:9px;color:var(--muted);display:block">P2</span>
            <span id="sim-label-a2" style="font-size:11px;font-weight:800">${viewState.simA2 || "—"}</span>
          </button>
        </div>
        <div class="sim-vs">VS</div>
        <div>
          <div class="sim-team-label" style="color:var(--red);font-size:9px;font-weight:700;margin-bottom:4px">TEAM B</div>
          <button class="h2h-slot-btn${viewState.simB1 ? " h2h-slot-filled" : ""}" id="sim-slot-b1" onclick="openSimSheet('b1')" style="width:100%;margin-bottom:6px">
            <span style="font-size:9px;color:var(--muted);display:block">P1</span>
            <span id="sim-label-b1" style="font-size:11px;font-weight:800">${viewState.simB1 || "—"}</span>
          </button>
          <button class="h2h-slot-btn${viewState.simB2 ? " h2h-slot-filled" : ""}" id="sim-slot-b2" onclick="openSimSheet('b2')" style="width:100%">
            <span style="font-size:9px;color:var(--muted);display:block">P2</span>
            <span id="sim-label-b2" style="font-size:11px;font-weight:800">${viewState.simB2 || "—"}</span>
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
    const playerList = _statPlayerNames();
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
    const playerList = _statPlayerNames();
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
    const topPlayers = playerList
      .filter(
        (p) => byPlayer[p] && Object.values(byPlayer[p]).some((d) => d.p >= 1),
      )
      .sort((a, b) => a.localeCompare(b));
    if (!topPlayers.length)
      return '<div class="sub" style="padding:10px 8px">Not enough clutch matches.</div>';
    // Enhancement 20: unified clutch summary table
    const clutchSummary = (() => {
      const totals = {};
      sortedM.forEach((m) => {
        if (Math.abs(m.scoreA - m.scoreB) > 1) return;
        const aWon20 = m.scoreA > m.scoreB;
        const process20 = (players, won) =>
          players.forEach((p) => {
            if (!totals[p]) totals[p] = { w: 0, p: 0 };
            totals[p].p++;
            if (won) totals[p].w++;
          });
        process20(m.teamA || [], aWon20);
        process20(m.teamB || [], !aWon20);
      });
      const summaryRows = Object.entries(totals)
        .filter(([, d]) => d.p >= 2)
        .sort((a, b) => b[1].w / b[1].p - a[1].w / a[1].p)
        .map(([p, d]) => {
          const pct = Math.round((d.w / d.p) * 100);
          const col =
            pct >= 60
              ? "var(--green)"
              : pct <= 40
                ? "var(--red)"
                : "var(--gold)";
          const rating = pct >= 60 ? "CLUTCH" : pct <= 40 ? "CHOKER" : "STEADY";
          return `<tr><td style="font-size:11px;font-weight:700;padding:5px 0;color:${playerColor(p)}">${p}</td><td style="text-align:center;font-size:10px;color:var(--muted)">${d.w}W–${d.p - d.w}L</td><td style="text-align:center;font-size:11px;font-weight:800;color:${col}">${pct}%</td><td style="text-align:center;font-size:9px;font-weight:700;color:${col}">${rating}</td></tr>`;
        })
        .join("");
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

    return (
      clutchSummary +
      `<div class="ana-card" style="padding:12px;overflow-x:auto">
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
    </div>`
    );
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
  viewState.digestFilter = "week";
  viewState.digestPlayer = "";
  viewState.eloProbP1 = "";
  viewState.eloProbP2 = "";
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
    if (!compList.length)
      return '<div class="sub" style="padding:8px">No data.</div>';
    const pg = "grid-template-columns:1fr 44px 60px 54px 60px";
    return (
      `<div class="ana-card" style="padding:8px 12px"><div class="lrace-header" style="${pg}"><span>Player</span><span>Avg G</span><span>Shutout%</span><span>Partners</span><span>Avg Margin</span></div>` +
      compList
        .filter((p) => p.mp >= 1)
        .map((p) => {
          const avgG = (p.ngw / p.mp).toFixed(1);
          const shutRate =
            stats[p.name]?.wins > 0
              ? Math.round(
                  ((shutoutWins[p.name] || 0) / stats[p.name].wins) * 100,
                ) + "%"
              : "—";
          const partDiv = Object.keys(stats[p.name]?.teammates || {}).length;
          const avgM =
            p.avgMargin != null
              ? (p.avgMargin >= 0 ? "+" : "") + p.avgMargin.toFixed(1)
              : "—";
          const mc =
            p.avgMargin > 0
              ? "var(--green)"
              : p.avgMargin < 0
                ? "var(--red)"
                : "var(--muted)";
          return `<div class="lrace-row" style="${pg}"><div class="lrace-name">${p.name}</div><div style="text-align:center;font-weight:700">${avgG}</div><div style="text-align:center;font-weight:700">${shutRate}</div><div style="text-align:center;font-weight:700">${partDiv}</div><div style="text-align:center;font-weight:700;color:${mc}">${avgM}</div></div>`;
        })
        .join("") +
      `</div>`
    );
  })();

  // 1b: Pair Leaderboard Top 10 with streak + against quality
  const _pairLeaderboardHtml = (() => {
    const pairAQ = {},
      pairStrk = {};
    // Build a pair-key → matches index in this same pass, so the per-partnership
    // loop below is an O(1) lookup instead of re-filtering sortedM per pair
    // (was O(pairs × matches), and pairs grows ~quadratically with players).
    const matchesByPairKey = {};
    sortedM.forEach((m) => {
      if (m.teamA.length !== 2 || m.teamB.length !== 2) return;
      const tkA = [...m.teamA].sort().join(" & "),
        tkB = [...m.teamB].sort().join(" & ");
      (matchesByPairKey[tkA] || (matchesByPairKey[tkA] = [])).push(m);
      (matchesByPairKey[tkB] || (matchesByPairKey[tkB] = [])).push(m);
      [tkA, tkB].forEach((tk, ti) => {
        const opp = ti === 0 ? m.teamB : m.teamA;
        if (!pairAQ[tk]) pairAQ[tk] = { t: 0, c: 0 };
        pairAQ[tk].t +=
          opp.reduce((s, p) => s + (eloMap[p] || 1000), 0) / opp.length;
        pairAQ[tk].c++;
      });
    });
    Object.entries(partnerships).forEach(([key, pd]) => {
      const pms = matchesByPairKey[key] || [];
      let sk = 0,
        st = null;
      for (let i = pms.length - 1; i >= 0; i--) {
        const m = pms[i];
        const ak = [...m.teamA].sort().join(" & ");
        const won = ak === key ? m.scoreA > m.scoreB : m.scoreB > m.scoreA;
        if (st === null) {
          st = won ? "W" : "L";
          sk = 1;
        } else if ((won && st === "W") || (!won && st === "L")) sk++;
        else break;
      }
      pairStrk[key] = { sk, st };
    });
    const top10 = Object.entries(partnerships)
      .filter(([, pd]) => pd.played >= 2)
      .sort(
        (a, b) =>
          b[1].wins / b[1].played - a[1].wins / a[1].played ||
          b[1].played - a[1].played,
      )
      .slice(0, 10);
    if (!top10.length)
      return '<div class="sub" style="padding:8px">Need 2+ games per pair.</div>';
    const pg2 = "grid-template-columns:1fr 44px 52px 54px 54px";
    return (
      `<div class="ana-card" style="padding:8px 12px"><div class="lrace-header" style="${pg2}"><span>Pair</span><span>Played</span><span>Win%</span><span>vs ELO</span><span>Streak</span></div>` +
      top10
        .map(([key, pd], i) => {
          const pct = Math.round((pd.wins / pd.played) * 100);
          const col =
            pct >= 60
              ? "var(--green)"
              : pct <= 40
                ? "var(--red)"
                : "var(--muted)";
          const aq = pairAQ[key]
            ? Math.round(pairAQ[key].t / pairAQ[key].c)
            : "—";
          const s = pairStrk[key];
          const sStr = s?.sk >= 1 ? `${s.sk}${s.st}` : "—";
          const sCol =
            s?.st === "W"
              ? "var(--green)"
              : s?.st === "L"
                ? "var(--red)"
                : "var(--muted)";
          const shortKey = pd.players.map((p) => p.split(" ")[0]).join(" & ");
          return `<div class="lrace-row" style="${pg2}"><div class="lrace-name" style="font-size:10px">#${i + 1} ${shortKey}</div><div style="text-align:center;font-weight:700">${pd.played}</div><div style="text-align:center;font-weight:700;color:${col}">${pct}%</div><div style="text-align:center;font-weight:700;font-size:10px">${aq}</div><div style="text-align:center;font-weight:700;color:${sCol}">${sStr}</div></div>`;
        })
        .join("") +
      `</div>`
    );
  })();

  // 1c: Monthly Stats Table
  const _monthlyStatsTableHtml = (() => {
    if (!uniqueMonths.length)
      return '<div class="sub" style="padding:8px">No monthly data yet.</div>';
    const moN2 = [
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
    const lastMos = uniqueMonths.slice(-6);
    const potmMap = {};
    lastMos.forEach((mo) => {
      const allEntries = Object.entries(monthlyStats[mo] || {});
      const maxM = Math.max(...allEntries.map(([, d]) => d.m), 0);
      const threshold = Math.max(1, Math.round(maxM * 0.3));
      const ps2 = allEntries.filter(([, d]) => d.m >= threshold);
      if (!ps2.length) return;
      const top = ps2.sort((a, b) => b[1].w / b[1].m - a[1].w / a[1].m)[0];
      if (top)
        potmMap[mo] = {
          name: top[0],
          pct: Math.round((top[1].w / top[1].m) * 100),
          matches: top[1].m,
        };
    });
    const trendArrows = {};
    if (lastMos.length >= 2) {
      playersByMatches.forEach((p) => {
        const [prev, curr] = lastMos
          .slice(-2)
          .map((mo) => monthlyStats[mo]?.[p]);
        if (prev?.m >= 2 && curr?.m >= 2) {
          const d = curr.w / curr.m - prev.w / prev.m;
          trendArrows[p] = d > 0.1 ? "↑" : d < -0.1 ? "↓" : "→";
        }
      });
    }
    const activePs = playersByMatches.filter((p) =>
      lastMos.some((mo) => monthlyStats[mo]?.[p]?.m > 0),
    );
    if (!activePs.length)
      return '<div class="sub" style="padding:8px">No data.</div>';
    const potmHtml2 = Object.keys(potmMap).length
      ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">` +
        Object.entries(potmMap)
          .map(
            ([mo, d]) =>
              `<div style="background:rgba(var(--theme-rgb),0.1);border:1px solid rgba(var(--theme-rgb),0.2);border-radius:8px;padding:6px 10px"><div style="font-size:8px;color:var(--gold);font-weight:700;letter-spacing:0.06em">${moN2[parseInt(mo.slice(5))]} POTM</div><div style="font-size:11px;font-weight:800">${d.name.split(" ")[0]}</div><div style="font-size:9px;color:var(--muted)">${d.pct}% · ${d.matches}P</div></div>`,
          )
          .join("") +
        `</div>`
      : "";
    const hdrs = lastMos
      .map(
        (mo) =>
          `<th style="text-align:center;color:var(--muted);font-weight:600;font-size:9px;padding:0 4px 6px">${moN2[parseInt(mo.slice(5))]}</th>`,
      )
      .join("");
    const bodyRows2 = activePs
      .map((p) => {
        const cells2 = lastMos
          .map((mo) => {
            const d = monthlyStats[mo]?.[p];
            if (!d || !d.m)
              return `<td style="text-align:center;color:var(--muted);font-size:10px">—</td>`;
            const pct = Math.round((d.w / d.m) * 100);
            const col =
              pct >= 70
                ? "var(--green)"
                : pct >= 40
                  ? "var(--gold)"
                  : "var(--red)";
            const bg =
              pct >= 70
                ? "rgba(54,212,126,0.12)"
                : pct >= 40
                  ? "rgba(241,196,15,0.1)"
                  : "rgba(240,79,79,0.12)";
            return `<td style="text-align:center;font-size:10px;font-weight:700;color:${col};background:${bg};border-radius:4px;padding:2px 3px">${pct}%<br><span style="font-size:8px;color:var(--muted);font-weight:600">${d.w}W–${d.m - d.w}L</span></td>`;
          })
          .join("");
        const arr = trendArrows[p];
        const arrCol =
          arr === "↑"
            ? "var(--green)"
            : arr === "↓"
              ? "var(--red)"
              : "var(--muted)";
        const arrSpan = arr
          ? `<span style="font-size:10px;color:${arrCol};margin-left:3px">${arr}</span>`
          : "";
        return `<tr><td style="font-size:11px;font-weight:700;padding:4px 6px 4px 0;white-space:nowrap">${p}${arrSpan}</td>${cells2}</tr>`;
      })
      .join("");
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
    if (!eloRanked.length)
      return '<div class="sub" style="padding:8px">No data.</div>';
    const pg3 = "grid-template-columns:22px 1fr 44px 44px 48px 44px 48px 46px";
    const mkH = (col, label, tip) =>
      `<span class="hilo-hdr" data-col="${col}" onclick="_hiLoSortBy('${col}')" title="${tip}" style="text-align:center;cursor:pointer;user-select:none">${label}</span>`;
    return `<div class="ana-card" style="padding:8px 10px">
      <div class="lrace-header" style="${pg3};font-size:8px">
        <span style="color:var(--muted)">#</span>
        ${mkH("name", "PLAYER", "Sort by player name")}
        ${mkH("current", "NOW", "Sort by current ELO")}
        ${mkH("peak", "PEAK", "Sort by peak ELO")}
        ${mkH("fromPeak", "↓PEAK", "Sort by distance from peak")}
        ${mkH("low", "LOW", "Sort by lowest ELO")}
        ${mkH("fromLow", "↑LOW", "Sort by recovery from low")}
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
    const activeDays = [0, 1, 2, 3, 4, 5, 6].filter((d) =>
      Object.values(byP).some((v) => v[d].p > 0),
    );
    if (!activeDays.length)
      return '<div class="sub" style="padding:8px">Not enough data.</div>';
    const hdrs2 = activeDays
      .map(
        (d) =>
          `<th style="text-align:center;color:var(--muted);font-weight:600;font-size:9px;padding:0 4px 6px">${DAY2[d]}</th>`,
      )
      .join("");
    const rows2 = playersByMatches
      .filter((p) => byP[p])
      .map((p) => {
        const cells3 = activeDays
          .map((d) => {
            const dd = byP[p][d];
            if (!dd.p)
              return `<td style="text-align:center;color:var(--muted);font-size:10px">—</td>`;
            const pct = Math.round((dd.w / dd.p) * 100);
            const col =
              pct >= 60
                ? "var(--green)"
                : pct <= 40
                  ? "var(--red)"
                  : "var(--gold)";
            return `<td onclick="_dowDayRecord(${jsArg(p)},${d})" title="${dd.w}W–${dd.p - dd.w}L · tap for record" style="text-align:center;font-size:10px;font-weight:700;color:${col};cursor:pointer">${pct}%</td>`;
          })
          .join("");
        return `<tr><td style="font-size:11px;font-weight:700;padding:4px 6px 4px 0;white-space:nowrap">${p}</td>${cells3}</tr>`;
      })
      .join("");
    return `<div class="ana-card" style="padding:12px;overflow-x:auto"><div style="font-size:9px;color:var(--muted);margin-bottom:8px">Win % per player per day of week</div><table style="width:100%;border-collapse:collapse;font-size:10px"><thead><tr><th style="text-align:left;color:var(--muted);font-weight:600;font-size:9px;padding-bottom:6px">Player</th>${hdrs2}</tr></thead><tbody>${rows2}</tbody></table></div>`;
  })();

  // 2: Score Margin Trend (avg margin per month)
  const _scoreMargTrendHtml = (() => {
    if (uniqueMonths.length < 2)
      return '<div class="sub" style="padding:8px">Need matches across 2+ months.</div>';
    const moMargins = {};
    sortedM.forEach((m) => {
      const mo = (m.date || "").slice(0, 7);
      if (!mo) return;
      if (!moMargins[mo]) moMargins[mo] = { total: 0, count: 0 };
      moMargins[mo].total += Math.abs(m.scoreA - m.scoreB);
      moMargins[mo].count++;
    });
    const moN3 = [
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
    const pts = uniqueMonths
      .map((mo) => ({
        mo,
        avg: moMargins[mo] ? moMargins[mo].total / moMargins[mo].count : null,
      }))
      .filter((p) => p.avg !== null);
    if (pts.length < 2)
      return '<div class="sub" style="padding:8px">Not enough data.</div>';
    const W = 300,
      H = 90,
      pl = 30,
      pr = 8,
      pt2 = 8,
      pb = 18,
      cW = W - pl - pr,
      cH = H - pt2 - pb;
    const maxA = Math.max(...pts.map((p) => p.avg)) + 0.5;
    const minA = Math.max(0, Math.min(...pts.map((p) => p.avg)) - 0.5);
    const toX2 = (i) => pl + (i / (pts.length - 1 || 1)) * cW;
    const toY2 = (v) => pt2 + (1 - (v - minA) / (maxA - minA || 1)) * cH;
    const polyline2 = pts
      .map((p, i) => `${toX2(i).toFixed(1)},${toY2(p.avg).toFixed(1)}`)
      .join(" ");
    const xLbls = pts
      .map(
        (p, i) =>
          `<text x="${toX2(i).toFixed(1)}" y="${H - 3}" text-anchor="middle" font-size="7" fill="rgba(255,255,255,0.35)">${moN3[parseInt(p.mo.slice(5))]}</text>`,
      )
      .join("");
    const circles2 = pts
      .map(
        (p, i) =>
          `<circle cx="${toX2(i).toFixed(1)}" cy="${toY2(p.avg).toFixed(1)}" r="2.5" fill="var(--theme)"><title>${p.mo}: ${p.avg.toFixed(1)}</title></circle>`,
      )
      .join("");
    const lastAvg = pts[pts.length - 1].avg,
      prevAvg = pts[pts.length - 2]?.avg;
    const trend =
      lastAvg < prevAvg - 0.1
        ? "getting tighter"
        : lastAvg > prevAvg + 0.1
          ? "more one-sided"
          : "steady";
    return `<div class="ana-card" style="padding:12px"><div style="font-size:9px;color:var(--muted);margin-bottom:6px">Average score margin per month — ${trend}</div><div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block;overflow:visible"><polyline points="${polyline2}" fill="none" stroke="var(--theme)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${circles2}${xLbls}</svg></div></div>`;
  })();

  // 2: Dominance Index
  const _dominanceHtml = (() => {
    const beatenCounts = {};
    sortedM.forEach((m) => {
      const aWon2 = m.scoreA > m.scoreB;
      const winners = aWon2 ? m.teamA : m.teamB;
      const losers = aWon2 ? m.teamB : m.teamA;
      winners.forEach((w) => {
        if (!beatenCounts[w]) beatenCounts[w] = {};
        losers.forEach((l) => {
          beatenCounts[w][l] = (beatenCounts[w][l] || 0) + 1;
        });
      });
    });
    if (!Object.keys(beatenCounts).length)
      return '<div class="sub" style="padding:8px">No data.</div>';
    window._domCounts = beatenCounts;
    window._domShowBeaten = function (playerName, minN) {
      const n = Math.max(1, +minN || 1);
      const oppCounts = window._domCounts?.[playerName] || {};
      const beaten = Object.entries(oppCounts)
        .filter(([, c]) => c >= n)
        .sort((a, b) => b[1] - a[1]);
      if (!beaten.length) return;
      document.getElementById("dom-beaten-popup")?.remove();
      const lbl = n === 1 ? "at least once" : `${n}+ times`;
      const rows = beaten
        .map(
          ([opp, c]) =>
            `<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
              <span style="font-size:12px;font-weight:700;color:var(--text)">${escHtml(opp)}</span>
              <span style="font-size:14px;font-weight:900;color:var(--theme)">${c}×</span>
            </div>`,
        )
        .join("");
      const el = document.createElement("div");
      el.id = "dom-beaten-popup";
      el.setAttribute("role", "dialog");
      el.style.cssText =
        "position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px";
      el.onclick = (e) => {
        if (e.target === el) el.remove();
      };
      el.innerHTML = `<div style="background:var(--bg-card,#12121c);border:1px solid rgba(var(--theme-rgb),0.25);border-radius:16px;padding:16px;max-width:320px;width:100%;max-height:70vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.5)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:4px">
          <div>
            <div style="font-size:13px;font-weight:900;color:var(--text)">${escHtml(playerName)}</div>
            <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em;margin-top:2px">beaten ${lbl}</div>
          </div>
          <button onclick="document.getElementById('dom-beaten-popup').remove()" aria-label="Close" style="background:none;border:none;color:var(--muted);font-size:18px;line-height:1;cursor:pointer;padding:0 2px">✕</button>
        </div>
        <div style="font-size:24px;font-weight:900;color:var(--theme);margin-bottom:10px">${beaten.length} opponent${beaten.length !== 1 ? "s" : ""}</div>
        <div style="overflow-y:auto;flex:1">${rows}</div>
      </div>`;
      document.body.appendChild(el);
    };
    window._domRebuild = function (minN) {
      const n = Math.max(1, Math.floor(+minN) || 1);
      const pg = "grid-template-columns:40px 1fr 60px";
      const lbl = n === 1 ? "beaten at least once" : `beaten ${n}+ times`;
      const rows = Object.entries(beatenCounts)
        .map(([p, opp]) => ({
          name: p,
          count: Object.values(opp).filter((c) => c >= n).length,
        }))
        .filter((r) => r.count > 0)
        .sort((a, b) => b.count - a.count);
      const el = document.getElementById("dominance-card");
      if (!el) return;
      el.querySelector(".dom-desc").textContent = `Distinct opponents ${lbl}`;
      el.querySelector(".dom-rows").innerHTML = rows.length
        ? rows
            .map(
              (r, i) =>
                `<div class="lrace-row" style="${pg}"><div class="lrace-rank">#${i + 1}</div><div class="lrace-name">${escHtml(r.name)}</div><div style="text-align:center;font-weight:800;color:var(--theme);cursor:pointer;text-decoration:underline dotted" onclick="window._domShowBeaten(${jsArg(r.name)},${n})" title="Tap to see opponents">${r.count}</div></div>`,
            )
            .join("")
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
      <div class="dom-rows">${initRows.map((r, i) => `<div class="lrace-row" style="${pg4}"><div class="lrace-rank">#${i + 1}</div><div class="lrace-name">${escHtml(r.name)}</div><div style="text-align:center;font-weight:800;color:var(--theme);cursor:pointer;text-decoration:underline dotted" onclick="window._domShowBeaten(${jsArg(r.name)},1)" title="Tap to see opponents">${r.count}</div></div>`).join("")}</div>
    </div>`;
  })();

  // 2: Most One-Sided Rivalries
  const _oneSidedHtml = (() => {
    const rivalries = Object.entries(teamMatchups)
      .filter(([, v]) => v.played >= 3)
      .map(([, v]) => {
        const tkA = v.teamA.join(" & "),
          tkB = v.teamB.join(" & ");
        const wA = v.wins[tkA] || 0,
          wB = v.wins[tkB] || 0;
        const dom = Math.max(wA, wB),
          sub = Math.min(wA, wB);
        const domTeam = wA >= wB ? v.teamA : v.teamB;
        const subTeam = wA >= wB ? v.teamB : v.teamA;
        return { domTeam, subTeam, dom, sub, played: v.played };
      })
      .filter((r) => r.dom > r.sub)
      .sort((a, b) => b.dom / b.played - a.dom / a.played || b.dom - a.dom)
      .slice(0, 5);
    if (!rivalries.length)
      return '<div class="sub" style="padding:8px">Need 3+ meetings between same teams with a clear leader.</div>';
    return (
      `<div class="ana-card" style="padding:10px 12px">` +
      rivalries
        .map((r) => {
          const domPct = Math.round((r.dom / r.played) * 100);
          const short = (t) => t.map((p) => p.split(" ")[0]).join(" & ");
          return `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)"><div><div style="font-size:11px;font-weight:700">${short(r.domTeam)} <span style="color:var(--green)">dominate</span></div><div style="font-size:9px;color:var(--muted);margin-top:2px">vs ${short(r.subTeam)}</div></div><div style="text-align:right"><div style="font-size:16px;font-weight:900;color:var(--green)">${r.dom}–${r.sub}</div><div style="font-size:9px;color:var(--muted)">${r.played}g · ${domPct}%</div></div></div>`;
        })
        .join("") +
      `</div>`
    );
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
    const bodyRows3 = scores
      .map((hi) => {
        const cells4 = scores
          .map((lo) => {
            if (lo > hi)
              return `<td style="background:transparent;padding:4px 5px"></td>`;
            const cnt = grid3[`${hi}_${lo}`] || 0;
            const bg =
              cnt === 0
                ? "rgba(255,255,255,0.04)"
                : `rgba(var(--theme-rgb),${Math.max(0.12, (cnt / maxG) * 0.8).toFixed(2)})`;
            return `<td style="text-align:center;background:${bg};border-radius:3px;padding:4px;font-size:9px;font-weight:700;color:${cnt ? "var(--text)" : "transparent"}">${cnt || ""}</td>`;
          })
          .join("");
        return `<tr><td style="font-size:9px;color:var(--muted);font-weight:700;padding:2px 6px 2px 0">${hi}</td>${cells4}</tr>`;
      })
      .join("");
    return `<div class="ana-card" style="padding:12px;overflow-x:auto"><div style="font-size:9px;color:var(--muted);margin-bottom:8px">Score frequency — win score (row) vs loss score (col). 4-2 and 2-4 counted together.</div><table style="border-collapse:separate;border-spacing:3px"><thead>${header}</thead><tbody>${bodyRows3}</tbody></table></div>`;
  })();

  // ── ABSENCE TRACKER ────────────────────────────────────────
  const _absenceTrackerHtml = (() => {
    if (!sortedM.length)
      return '<div class="sub" style="padding:12px">No data.</div>';
    const todayStr3 = todayISO();
    const todayD = new Date(todayStr3 + "T00:00:00");
    const firstDate3 = {},
      lastDate3 = {};
    sortedM.forEach((m) => {
      [...m.teamA, ...m.teamB].forEach((p) => {
        if (!firstDate3[p] || m.date < firstDate3[p]) firstDate3[p] = m.date;
        if (!lastDate3[p] || m.date > lastDate3[p]) lastDate3[p] = m.date;
      });
    });
    const rows3 = Object.keys(lastDate3)
      .map((p) => {
        const days3 = Math.round(
          (todayD - new Date(lastDate3[p] + "T00:00:00")) / 86400000,
        );
        const missed = sortedM.filter((m) => m.date > lastDate3[p]).length;
        return {
          name: p,
          first: firstDate3[p],
          last: lastDate3[p],
          days: days3,
          missed,
        };
      })
      .sort((a, b) => b.days - a.days);
    const fmtShort = (s) => (s ? fmtDate(s).replace(/ \d{4}$/, "") : "—");
    const rowsHtml3 = rows3
      .map((r) => {
        const col =
          r.days === 0
            ? "var(--green)"
            : r.days <= 7
              ? "var(--accent)"
              : r.days <= 30
                ? "#ffb340"
                : "var(--red)";
        const lbl =
          r.days === 0 ? "Today" : r.days === 1 ? "1 day" : r.days + " days";
        return `<tr class="abt-row">
        <td class="abt-name">${escHtml(r.name)}</td>
        <td class="abt-date">${fmtShort(r.first)}</td>
        <td class="abt-date">${fmtShort(r.last)}</td>
        <td class="abt-days" style="color:${col}">${lbl}</td>
        <td class="abt-matches">${r.missed}</td>
      </tr>`;
      })
      .join("");
    return `<div class="ana-card" style="padding:0;overflow:hidden"><table class="abt-table"><thead><tr><th>Player</th><th>First</th><th>Last</th><th>Days</th><th>Missed</th></tr></thead><tbody>${rowsHtml3}</tbody></table></div>`;
  })();

  // ── RENDER ─────────────────────────────────────────────
  const favKeys = getAnaFavs();
  const hiddenKeys = getAnaHidden();
  const makeSec = (key, title, body, col, cat) => {
    const isFav = favKeys.includes(key);
    const isHid = hiddenKeys.includes(key);
    const emptyCls = _secIsEmpty(body) ? " is-empty" : "";
    return `<div class="ana-sec${col ? " collapsed" : ""}${emptyCls}" data-key="${key}" data-cat="${cat || "all"}"${isHid ? ' data-hidden="true"' : ""}>
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

  // Avg ELO gained per win, by weekday — extracted so the Day-of-Week section
  // can fold Volume / Win% / ELO Gain into one tabbed card.
  const _eloDowHtml = (() => {
    const hist = _memoEloHistory();
    const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const byDay = Array.from({ length: 7 }, () => ({
      wSum: 0,
      wCnt: 0,
      lSum: 0,
      lCnt: 0,
    }));
    Object.values(hist).forEach((entries) => {
      entries.forEach((e) => {
        if (!e.date || e.delta === 0) return;
        const d = new Date(e.date + "T00:00:00").getDay();
        if (e.delta > 0) {
          byDay[d].wSum += e.delta;
          byDay[d].wCnt++;
        } else {
          byDay[d].lSum += Math.abs(e.delta);
          byDay[d].lCnt++;
        }
      });
    });
    const wAvgs = byDay.map((d) => (d.wCnt ? d.wSum / d.wCnt : null));
    const maxW = Math.max(...wAvgs.filter((v) => v !== null), 1);
    const cells = DAY.map((dayName, i) => {
      const avg = wAvgs[i];
      const cnt = byDay[i].wCnt + byDay[i].lCnt;
      if (avg === null)
        return `<div style="flex:1;min-width:38px;padding:8px 4px;text-align:center;background:rgba(255,255,255,0.04);border-radius:8px"><div style="font-size:10px;color:var(--muted)">—</div><div style="font-size:8px;color:rgba(255,255,255,0.3);margin-top:4px">${dayName}</div><div style="font-size:7px;color:var(--muted)">0g</div></div>`;
      const intensity = Math.min(1, avg / maxW);
      const bg = `rgba(72,199,116,${(0.1 + 0.7 * intensity).toFixed(2)})`;
      return `<div style="flex:1;min-width:38px;padding:8px 4px;text-align:center;background:${bg};border-radius:8px">
            <div style="font-size:11px;font-weight:800;color:var(--green)">+${avg.toFixed(1)}</div>
            <div style="font-size:8px;color:rgba(255,255,255,0.5);margin-top:3px">${dayName}</div>
            <div style="font-size:7px;color:rgba(255,255,255,0.35)">${cnt}g</div>
          </div>`;
    }).join("");
    return `<div class="ana-card"><div style="display:flex;gap:4px;overflow-x:auto;padding-bottom:2px">${cells}</div><div style="font-size:9px;color:var(--muted);margin-top:8px;text-align:center">Avg ELO gained per win by day — higher = more upsets / ELO at stake</div></div>`;
  })();

  const allSecs = [
    {
      key: "predacc",
      cat: "records",
      title: "🔮 Predict & Simulate",
      body: _tabbedSection([
        { label: "Predict", html: _buildMatchPredictHtml() },
        { label: "Accuracy", html: predAccHtml },
        { label: "Match Sim", html: simulatorHtml },
        { label: "What-If", html: whatIfHtml },
        {
          label: "ELO Projection",
          html: (() => {
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
      ]),
    },
    {
      key: "awards",
      cat: "records",
      title: "🏅 Awards & Records",
      body: _tabbedSection([
        {
          label: "Awards Board",
          html: `<div class="awards-grid">${scard("🏃", "Most Active", mostActive?.name, `${mostActive?.matches || 0} matches played`)}${awardsHtml}${scard("🏆", "Best Win Rate", topWinRate?.name, `${topWinRate ? Math.round((topWinRate.wins / topWinRate.matches) * 100) : 0}% (${topWinRate?.wins || 0}W–${topWinRate?.losses || 0}L)`)}${scard("🔥", "Longest Streak", topStreak?.name, `${topStreak?.bestStreak || 0} consecutive wins`)}${scard("⚔️", "Most Dominant", destroyer?.name, `+${destroyer?.avgMargin?.toFixed(1) || 0} avg margin`)}</div>`,
        },
        { label: "Personal Bests", html: personalBestsHtml },
      ]),
    },
    {
      key: "form",
      cat: "players",
      title: "🔥 Form & Streaks",
      body: _tabbedSection([
        {
          label: "Current Form",
          html: `<div class="ana-card" style="padding:8px 12px"><div class="ftable-header"><span>#</span><span>Player</span><span>Last 10</span><span>Win%</span><span>Streak</span></div>${ftHtml}</div>`,
        },
        { label: "Streak Leaderboard", html: _buildStreakLeaderboardHtml() },
      ]),
    },
    {
      key: "lrace",
      cat: "players",
      title: "🏆 Standings",
      body: _tabbedSection([
        { label: "Power", html: _buildPowerRankingsHtml() },
        {
          label: "Race",
          html: `<div class="ana-card" style="padding:8px 12px"><div class="lrace-header"><span>Rank</span><span>Player</span><span>Last Wk.</span><span>Trend</span></div>${lrHtml}</div>`,
        },
        {
          label: "🥇 Podium",
          html: `<div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
          <button class="digest-filter-btn active" onclick="_podiumSetPeriod(this,'today')">DAILY</button>
          <button class="digest-filter-btn" onclick="_podiumSetPeriod(this,'week')">WEEKLY</button>
          <button class="digest-filter-btn" onclick="_podiumSetPeriod(this,'weekend')">WEEKEND</button>
          <button class="digest-filter-btn" onclick="_podiumSetPeriod(this,'month')">MONTHLY</button>
        </div>
        <div class="podium-content">${_secBody(() => _buildPodiumTrackerHtml("today"))}</div>
      </div>`,
        },
        {
          label: "🪣 Anti-Podium",
          html: `<div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
          <button class="digest-filter-btn active" onclick="_antiPodiumSetPeriod(this,'today')">DAILY</button>
          <button class="digest-filter-btn" onclick="_antiPodiumSetPeriod(this,'week')">WEEKLY</button>
          <button class="digest-filter-btn" onclick="_antiPodiumSetPeriod(this,'weekend')">WEEKEND</button>
          <button class="digest-filter-btn" onclick="_antiPodiumSetPeriod(this,'month')">MONTHLY</button>
        </div>
        <div class="antipodium-content">${_secBody(() => _buildAntiPodiumTrackerHtml("today"))}</div>
      </div>`,
        },
        { label: "Reign", html: _secBody(() => _buildRankReignHtml()) },
        {
          label: "Timeline",
          html: _secBody(() => _buildRankTimelineHtml("today")),
        },
        { label: "Replay", html: _buildLeaderboardReplayHtml() },
      ]),
    },
    {
      key: "clutchrank",
      cat: "players",
      title: "🎯 Performance",
      body: _tabbedSection([
        { label: "Clutch", html: `<div class="ana-card" style="padding:8px 12px">${clutchRankHtml}${_antiClutchHtml}</div>` },
        { label: "Clutch Trends", html: clutchTrendHtml },
        { label: "Quality", html: `<div class="ana-card" style="padding:8px 12px">${_hardestWinCallout}${qualityRankHtml}</div>` },
        { label: "Dominance", html: _dominanceHtml },
        { label: "Carry", html: carryHtml },
      ]),
    },
    {
      key: "consistency",
      cat: "players",
      title: "📐 Consistency",
      body: _tabbedSection([
        { label: "Rankings", html: `<div class="ana-card" style="padding:8px 12px">${consistencyRankHtml}</div>` },
        { label: "ELO Volatility", html: eloVolatilityHtml },
      ]),
    },
    {
      // Always present — winChartHtml carries a helpful note when the active
      // data spans fewer than 2 months (e.g. a single-month season) instead of
      // the whole section silently disappearing.
      key: "winrate",
      cat: "activity",
      title: "📈 Win Rate Over Time",
      body: `<div class="ana-card">${winChartHtml}</div>`,
    },
    {
      key: "score",
      cat: "activity",
      title: "📊 Scores",
      body: _tabbedSection([
        { label: "Distribution", html: `<div class="ana-card">${_sdCallout}${sdHtml}</div>` },
        { label: "Heatmap", html: _scoreHeatmapHtml },
        { label: "Margin Trend", html: _scoreMargTrendHtml },
      ]),
    },
    {
      key: "rivalry",
      cat: "players",
      title: "🔥 Rivalries",
      body: _tabbedSection([
        { label: "Spotlight", html: `<div class="ana-card">${rivalHtml}</div>` },
        {
          label: "Matrix",
          html: `<div class="ana-card" style="padding:10px 8px"><div style="font-size:9px;color:var(--muted);margin-bottom:8px">Win % of <strong style="color:var(--accent)">row</strong> vs column. — = never met.</div>${matrixHtml}</div>`,
        },
        {
          label: "Head-to-Head",
          html: (() => {
            const enc = {};
            activeMatches().forEach((m) => {
              const tA = m.teamA || [],
                tB = m.teamB || [];
              const aWon = m.scoreA > m.scoreB;
              tA.forEach((a) => {
                tB.forEach((b) => {
                  const sorted = [normPlayer(a), normPlayer(b)].sort();
                  const key = sorted.join(" vs ");
                  if (!enc[key])
                    enc[key] = { total: 0, wins0: 0, p0: sorted[0], p1: sorted[1] };
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
            return rivals
              .map((r) => {
                const p0w = r.wins0,
                  p1w = r.total - r.wins0;
                const p0pct = Math.round((p0w / r.total) * 100);
                const col0 =
                  p0pct >= 60 ? "var(--green)" : p0pct <= 40 ? "var(--red)" : "var(--muted)";
                const col1 =
                  p0pct <= 40 ? "var(--green)" : p0pct >= 60 ? "var(--red)" : "var(--muted)";
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
              })
              .join("");
          })(),
        },
      ]),
    },
    {
      key: "partnergrid",
      cat: "players",
      title: "🤝 Partner / Opponent Grid",
      body: _buildPairMatrixHtml(),
    },
    {
      key: "dayofweek",
      cat: "activity",
      title: "📅 Day-of-Week",
      body: _tabbedSection([
        { label: "Volume", html: dowHtml },
        { label: "Win %", html: _dowPlayerHtml },
        { label: "ELO Gain", html: _eloDowHtml },
      ]),
    },
    {
      key: "pairs",
      cat: "pairs",
      title: "🤝 Pairs",
      body: _tabbedSection([
        { label: "Top 10", html: _pairLeaderboardHtml },
        { label: "All Pairs", html: `<div class="ana-card" style="padding:10px 12px">${allPairsHtml}</div>` },
        {
          label: "Synergy",
          html: `<div class="ana-card" style="padding:10px 12px"><div style="font-size:9px;color:var(--muted);margin-bottom:6px">How much win% changes when paired with each partner (vs solo avg)</div>${synergyHtml}</div>`,
        },
        {
          label: "Form",
          html: `<div class="ana-card" style="padding:10px 12px">${pfHtml}</div>`,
        },
      ]),
    },
    {
      key: "elo",
      cat: "elo",
      title: "⚡ ELO",
      body: _tabbedSection([
        { label: "Rankings", html: eloHtml },
        {
          label: "History Chart",
          html: `<div id="elo-tl-section">${buildEloTimelineHtml("all")}</div>`,
        },
        { label: "Peak / Low", html: _peakEloHtml },
        { label: "Win Probability", html: eloWinProbHtml },
      ]),
    },
    {
      key: "pairmatrix",
      cat: "pairs",
      title: "🧪 Pair Chemistry",
      body: _tabbedSection([
        { label: "Matrix", html: pairMatrixHtml },
        { label: "Leaderboard", html: _buildChemistryLeaderboardHtml() },
        {
          label: "H2H Records",
          html: `<div class="ana-card" style="padding:8px 12px">${pairedH2HHtml}</div>`,
        },
      ]),
    },
    {
      key: "milestones",
      cat: "records",
      title: "🎖️ Milestones",
      body: _tabbedSection([
        { label: "Achieved", html: milestoneHtml },
        { label: "Upcoming", html: _buildUpcomingMilestonesHtml() },
      ]),
    },
    {
      // Keeps key "calendar" so the lazy-render wiring in toggleAnaSection /
      // the first-paint rAF (both keyed on "calendar") still fires when this
      // card is expanded. Calendar is the first tab so it's visible on expand.
      key: "calendar",
      cat: "activity",
      title: "📅 Activity",
      body: _tabbedSection([
        {
          label: "Calendar",
          html: `<div id="match-calendar" class="match-calendar"></div>`,
        },
        { label: "Sessions", html: sessHtml },
        ...(uniqueMonths.length >= 1
          ? [{ label: "Monthly", html: _monthlyStatsTableHtml }]
          : []),
      ]),
    },
    {
      key: "playerstats",
      cat: "players",
      title: "📊 Compare Players",
      body: _tabbedSection([
        { label: "Deep Dive", html: _playerStatsTableHtml },
        { label: "Radar", html: _buildRadarCompareHtml() },
      ]),
    },
    {
      key: "absencetracker",
      cat: "players",
      title: "👻 Absence Tracker",
      body: _absenceTrackerHtml,
    },
    // ── NEW PHASE 1-5 SECTIONS ─────────────────────────────────
    {
      key: "storyfeed",
      cat: "records",
      title: "📰 Match Stories",
      body: _buildStoryFeedHtml(),
    },
    {
      key: "seasonmode",
      cat: "records",
      // Driven by user-defined Seasons when any exist, else auto monthly buckets.
      // (Distinct from the separate "Monthly Awards" section above.)
      title: state.seasons.length ? "🏆 Seasons" : "📅 Monthly Recap",
      body: _tabbedSection([
        {
          label: state.seasons.length ? "Awards" : "Recap",
          html: _buildSeasonModeHtml(),
        },
        { label: "Comparison", html: _buildSeasonComparisonHtml() },
      ]),
    },
    // ── NEW SECTIONS ───────────────────────────────────────────
    {
      key: "biggestupsets",
      cat: "records",
      title: "💥 Biggest Upsets",
      body: _buildBiggestUpsetsHtml(),
    },
  ];

  const storedOrder = getAnaOrder();
  const validKeys = allSecs.map((s) => s.key);
  const orderedKeys = [
    ...storedOrder.filter((k) => validKeys.includes(k)),
    ...validKeys.filter((k) => !storedOrder.includes(k)),
  ];
  // Collapse all sections by default on first visit (no stored state yet)
  if (!hasAnaCollapsedPref()) saveAnaCollapsed(new Set(validKeys));
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
        `<button class="ana-filter-pill${viewState.anaActiveCat === c.id ? " active" : ""}"
        data-cat="${c.id}"
        onpointerdown="_pillPointerDown(event,'${c.id}')"
        oncontextmenu="event.preventDefault()">${c.label}</button>`,
    )
    .join("")}</div>`;

  // Cache sections for search autocomplete
  viewState.anaSections = allSecs.map((s) => ({
    key: s.key,
    title: s.title,
    cat: s.cat,
  }));

  // Season context banner — every section already respects the active season
  // via activeMatches(); this makes the scope explicit at the top of the page.
  const _seasonForBanner = _activeSeason();
  const _seasonBanner = _seasonForBanner
    ? `<div class="ana-season-banner">🗓️ <strong>${escHtml(_seasonForBanner.name)}</strong> <span style="opacity:.65">· ${escHtml(_seasonRangeLabel(_seasonForBanner))}</span></div>`
    : "";
  const _hideEmptyOn = getAnaHideEmpty();
  const _hideEmptyToggle = `<div class="ana-toolbar"><button class="ana-hideempty-btn${_hideEmptyOn ? " active" : ""}" onclick="toggleAnaHideEmpty()">${_hideEmptyOn ? "☑" : "☐"} Hide empty</button></div>`;
  container.classList.toggle("ana-hide-empty", _hideEmptyOn);

  container.innerHTML =
    filterPillsHtml +
    _seasonBanner +
    _hideEmptyToggle +
    orderedKeys
      .map((key) => {
        const def = allSecs.find((s) => s.key === key);
        if (!def) return "";
        return makeSec(key, def.title, def.body, collapsed.has(key), def.cat);
      })
      .join("");

  _anaRenderedVersion = _dataVersion;

  // Re-apply active category filter after re-render
  anaFilterCategory(viewState.anaActiveCat, true);

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
    pillRow.addEventListener(
      "wheel",
      (e) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          pillRow.scrollLeft += e.deltaY;
        }
      },
      { passive: false },
    );
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
  el.innerHTML = `${sentText} &nbsp;·&nbsp; Manual only — tap “Send Backup Now”`;
}

// MANUAL ONLY — by construction. Email is sent solely by the "Send Backup Now"
// button. There is intentionally NO automatic / isAuto path: the old daily
// auto-send (which once fired ~18 duplicate emails in a minute) is gone and
// cannot be re-triggered programmatically, because the function takes no "auto"
// argument and nothing calls it except the button's onclick. The re-entrancy
// guard additionally stops a rapid double-tap from sending twice.
let _emailSending = false;
async function sendBackupEmail() {
  if (_emailSending) {
    showToast("Backup already sending…", "⏳");
    return false;
  }
  _emailSending = true;
  const btn = document.getElementById("send-email-btn");
  const btnLabel = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Sending…";
  }
  try {
    if (!(await _ensureEmailjs())) {
      showToast("EmailJS not loaded", "❌");
      return false;
    }
    const { serviceId, templateId, publicKey, recipientEmail } = emailConfig;
    if (!serviceId || !templateId || !publicKey || !recipientEmail) {
      showToast("Complete email config first", "⚠️");
      return false;
    }
    const todayStr = todayISO();
    const jsonData = JSON.stringify(
      { matches: state.matches, players: state.players, playerAliasMap, nextPlayerId },
      null,
      2,
    );

    await emailjs.send(
      serviceId,
      templateId,
      {
        to_email: recipientEmail,
        from_name: "Ekta Padel",
        subject: `Padel Backup — ${todayStr}`,
        send_type: "📤 Manual backup",
        match_count: state.matches.length,
        backup_date: todayStr,
        json_data: jsonData,
      },
      publicKey,
    );

    localStorage.setItem("padel_last_email", todayStr);
    renderEmailStatus();
    showToast("Backup email sent!", "📧");
    return true;
  } catch (err) {
    console.error("Backup email error:", err);
    showToast("Email failed — check config", "❌");
    return false;
  } finally {
    _emailSending = false;
    if (btn) {
      btn.disabled = false;
      btn.textContent = btnLabel;
    }
  }
}

// Automatic 1 pm email backup was removed — email is now MANUAL ONLY (the
// "Send Backup Now" button → sendBackupEmail(false)). This is kept as a no-op
// that cancels any timer a previously-running build may have scheduled, so the
// auto-send stops the moment this build loads. Daily Drive backup is separate
// (_scheduleDriveBackup) and unaffected.
function scheduleAutoEmail() {
  if (_emailTimer) {
    clearTimeout(_emailTimer);
    _emailTimer = null;
  }
}

// ── AUTO DRIVE BACKUP ────────────────────────────────────────
// Fires at 13:00 daily (same window as the email backup) when the admin
// is signed in and has a valid Drive token. Uses its own localStorage
// key so it's independent of the email scheduler — either can be
// unconfigured without affecting the other.
const _DRIVE_BACKUP_KEY = "padel_last_drive_backup";

async function _maybeAutoDriveBackup() {
  if (!window.isAdmin) return;
  if (!_driveAccessToken) return; // no token this session — skip silently
  const today = todayISO();
  if (localStorage.getItem(_DRIVE_BACKUP_KEY) === today) return;
  // Claim the slot before the async work to prevent multi-tab race.
  localStorage.setItem(_DRIVE_BACKUP_KEY, today);
  try {
    const blob = new Blob([JSON.stringify(_backupPayload(), null, 2)], {
      type: "application/json",
    });
    await _uploadToDrive(blob, _backupFilename());
    // Retain the newest backup per day for the last 7 days (prunes same-day dups).
    _pruneDriveBackups(7).catch(() => {});
  } catch (e) {
    // Release the slot so it can retry if the page is reloaded today.
    localStorage.removeItem(_DRIVE_BACKUP_KEY);
    console.warn("Auto Drive backup failed:", e?.message || e);
  }
}

// Day-aware retention for app-created Drive backups: keep the newest file per
// calendar day across the most-recent `keep` days; delete older same-day
// duplicates and anything beyond that window. Retention is by DAY, not file
// count — so several backups in one day no longer shrink the recovery window.
async function _pruneDriveBackups(keep = 7) {
  if (!_driveAccessToken) return;
  const folderId = await _ensureDriveBackupFolder();
  const q = encodeURIComponent(
    "name contains 'ekta-padel-backup' and mimeType='application/json' and trashed=false",
  );
  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,createdTime,parents)&orderBy=createdTime desc&pageSize=100`,
    { headers: { Authorization: `Bearer ${_driveAccessToken}` } },
  );
  if (!resp.ok) return;
  const { files = [] } = await resp.json();
  // Sort newest-first defensively (don't rely solely on the API's orderBy).
  files.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
  // Day-aware retention: keep the NEWEST file per calendar day, for the newest
  // `keep` days. Prunes both older same-day duplicates (multi-device auto-backups
  // + manual uploads pile several up per day) AND days beyond the newest `keep`.
  // Gives a real `keep`-DAY recovery window instead of `keep` files (which, with
  // multiple backups a day, only covered ~2 days of history).
  const dayOf = (f) => {
    const m = /(\d{4}-\d{2}-\d{2})/.exec(f.name || "");
    return m ? m[1] : (f.createdTime || "").slice(0, 10);
  };
  const keepIds = new Set();
  const keptDays = new Set();
  for (const f of files) {
    const day = dayOf(f);
    if (keptDays.has(day)) continue; // older duplicate of a day already kept
    if (keptDays.size >= keep) continue; // beyond the newest `keep` days
    keptDays.add(day);
    keepIds.add(f.id);
  }
  const stale = files.filter((f) => !keepIds.has(f.id));
  await Promise.all(
    stale.map((f) =>
      fetch(`https://www.googleapis.com/drive/v3/files/${f.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${_driveAccessToken}` },
      }).catch(() => {}),
    ),
  );
  // Consolidate: move any surviving keeper that lives outside the backup folder
  // (e.g. legacy uploads that landed in the Drive root) into it. Best-effort —
  // a failed move just leaves that file where it is; it's still a valid backup.
  let _moved = 0;
  if (folderId) {
    const strays = files.filter(
      (f) => keepIds.has(f.id) && !(f.parents || []).includes(folderId),
    );
    await Promise.all(
      strays.map((f) => {
        const removeParents = (f.parents || []).join(",");
        const url =
          `https://www.googleapis.com/drive/v3/files/${f.id}?addParents=${folderId}` +
          (removeParents ? `&removeParents=${encodeURIComponent(removeParents)}` : "") +
          `&fields=id`;
        _moved++;
        return fetch(url, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${_driveAccessToken}` },
        }).catch(() => {});
      }),
    );
  }
  if (stale.length || _moved)
    console.log(
      `Drive: pruned ${stale.length}, moved ${_moved} into folder — keeping newest-per-day across ${keptDays.size} day(s)`,
    );
}

// Piggyback on the email scheduler's 13:00 target so both run at the
// same time. Called from scheduleAutoEmail's timer path and startup.
let _driveBackupTimer = null;
function _scheduleDriveBackup() {
  if (_driveBackupTimer) { clearTimeout(_driveBackupTimer); _driveBackupTimer = null; }
  if (!window.isAdmin) return;

  const now = new Date();
  const today = todayISO();
  const target = new Date(now);
  target.setHours(13, 0, 0, 0);

  // Already past 13:00 today and not yet backed up → run now.
  if (localStorage.getItem(_DRIVE_BACKUP_KEY) !== today && now >= target) {
    _maybeAutoDriveBackup().then(() => _scheduleDriveBackup());
    return;
  }

  // Already backed up today → schedule for 13:00 tomorrow.
  if (localStorage.getItem(_DRIVE_BACKUP_KEY) === today) {
    target.setDate(target.getDate() + 1);
  }

  _driveBackupTimer = setTimeout(() => {
    _maybeAutoDriveBackup().then(() => _scheduleDriveBackup());
  }, target - now);
}

// ── DEEP-LINK PARAM HANDLING ────────────────────────────────
// Honour ?tab=summary&season=xyz&filter=today links (still supported for any
// previously-shared URLs, though the in-app "copy link" button was removed).
{
  const _p = new URLSearchParams(location.search);
  const _tab = _p.get("tab");
  const _pSeason = _p.get("season");
  const _pFilter = _p.get("filter");
  if (_tab === "summary") {
    // Defer until data + splash are ready so the tab switch doesn't race startup.
    document.addEventListener("padel-data-ready", () => {
      // Let the initial render settle before switching tab.
      setTimeout(() => {
        if (_pSeason) setSeason(_pSeason);
        if (_pFilter) {
          cmpFilter = _pFilter;
          const el = document.getElementById("cmpFilter");
          if (el) el.value = _pFilter;
        }
        switchMainTab("compact", true);
      }, 100);
    }, { once: true });
  }
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
  exportBackupFile,
  backupToDrive,
  exportJsonFile,
  setScreenshotChoiceSetting,
  setAnimLevel,
  adjustFontScale,
  resetFontScale,
  toggleSmoothMode,
  toggleBatterySaver,
  toggleMatchNotifications,
  openAmericanoSheet,
  closeAmericano,
  setAmericanoMode,
  americanoAddGuest,
  americanoSelectAll,
  americanoSelectNone,
  generateAmericanoSchedule,
  americanoBack,
  _anaSubTab,
  _radarPick,
  toggleAnaHideEmpty,
  openSeasonSheet,
  closeSeasonSheet,
  setSeason,
  setSeasonAuto,
  openSeasonEditor,
  closeSeasonEditor,
  saveSeasonFromEditor,
  deleteSeasonFromEditor,
  toggleOfflineMode,
  renderHome,
  renderCompact,
  setCmpSort,
  renderModernMatches,
  _histShowMore,
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
  _storyShowMore,
  _downloadDriveBackup,
  _dowDayRecord,
  editMatchByIndex,
  openEditMatch,
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
  importBackupFile,
  importFromDrive,
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
  _lbSetWindow,
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
  renderDigestCard,
  openDigestPlayerSheet,
  openWhatIfPlayerSheet,
  openEloProbSheet,
  _updateEloProbSlots,
  openCmpSheet,
  _cmpSetDate,
  _cmpSetWindow,
  _cmpCountPickerOpen,
  _cmpCountPickerClose,
  _cmpCountStep,
  _cmpCountApply,
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
  setLiveRaceTo,
  dismissRacePrompt,
  endLiveMatch,
  openSessionSetup,
  closeSessionSetup,
  sessionSetupSelectAll,
  sessionSetupSelectNone,
  confirmSessionStart,
  endLiveSession,
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
  deleteSessionMatch,
  editSessionMatch,
  saveSessionMatchEdit,
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
  _antiPodiumSetPeriod,
  _reignSetPeriod,
  _timelineSetPeriod,
  _pairMatrixSetPeriod,
  _pairMatrixSetMode,
  _pvpRangeOpen,
  _h2hHighlightRow,
  _openPodiumDrill,
  _openAntiPodiumDrill,
  _podiumDrillGoTo,
  _closePodiumDrill,
  _openRankCalendar,
});

function setHistoryDateFilter(value) {
  filterMatchTab(value || "all");
}

// ── LIVE SCORING MODE ──────────────────────────────────────

function _openLiveModeImpl() {
  if (!window.isAdmin) {
    showToast("Create Session is admin only", "🔒");
    return;
  }
  _liveScoreA = 0;
  _liveScoreB = 0;
  _liveRaceTo = 4;
  _liveSlots.a1 = _liveSlots.a2 = _liveSlots.b1 = _liveSlots.b2 = null;
  const today = todayISO();
  const dateEl = document.getElementById("live-date");
  if (dateEl) dateEl.value = today;
  const notesEl = document.getElementById("live-notes");
  if (notesEl) notesEl.value = "";
  _updateLiveDisplay();
  _updateLiveWinProb();
  _updateLiveEloPreview();
  _updateLiveMomentum();
  _syncRaceToggleUI();
  const _dashEl = document.getElementById("live-session-dashboard");
  if (_dashEl) _dashEl.style.display = "none";
  ["a1", "a2", "b1", "b2"].forEach((s) => _renderLiveSlot(s));
  _syncLiveSessionBar();
  goTo("live");
}

function _liveHaptic(ms) {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(ms);
    } catch (e) {}
  }
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
  const sessionPlayers =
    _liveSessionData?.sessionActive &&
    _liveSessionData?.sessionPlayers?.length >= 2
      ? _liveSessionData.sessionPlayers
      : null;
  const players = (sessionPlayers || getAllPlayerNamesFromMatches()).slice().sort((a, b) => a.localeCompare(b));
  const clearBtn = `<button class="live-sheet-item live-sheet-item-clear" onclick="selectLivePlayer(null,${jsArg(slot)})">
      <span class="live-sheet-item-av" style="background:rgba(255,70,70,0.18);color:#ff5555">✕</span>
      <span class="live-sheet-item-name">CLEAR SLOT</span>
    </button>`;
  list.innerHTML =
    clearBtn +
    players
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
  _liveScoreA = 0;
  _liveScoreB = 0;
  _updateLiveDisplay();
  _updateLiveWinProb();
  _updateLiveEloPreview();
  _updateLiveMomentum();
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
  if (team === "a") _liveScoreA = next;
  else _liveScoreB = next;
  _updateLiveDisplay();
  _updateLiveWinProb();
  _updateLiveEloPreview();
  if (delta > 0 && next === _liveRaceTo) _showRaceReachedPrompt();
}

function setLiveRaceTo(n) {
  _liveRaceTo = n;
  _syncRaceToggleUI();
}

function _syncRaceToggleUI() {
  document.getElementById("live-race-4")?.classList.toggle("live-race-pill-active", _liveRaceTo === 4);
  document.getElementById("live-race-6")?.classList.toggle("live-race-pill-active", _liveRaceTo === 6);
}

function _showRaceReachedPrompt() {
  const overlay = document.getElementById("live-race-overlay");
  if (!overlay) return;
  const title = document.getElementById("live-race-modal-title");
  const score = document.getElementById("live-race-modal-score");
  if (title) title.textContent = `RACE TO ${_liveRaceTo} REACHED`;
  if (score) score.textContent = `${_liveScoreA} — ${_liveScoreB}`;
  overlay.style.display = "flex";
}

function dismissRacePrompt() {
  const overlay = document.getElementById("live-race-overlay");
  if (overlay) overlay.style.display = "none";
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
  if (!a1 || !a2 || !b1 || !b2) {
    el.style.display = "none";
    return;
  }
  const eloMap = _memoElo();
  const avgA = ((eloMap[a1] || 1000) + (eloMap[a2] || 1000)) / 2;
  const avgB = ((eloMap[b1] || 1000) + (eloMap[b2] || 1000)) / 2;
  const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
  const expB = 1 - expA;
  const dAwin = Math.round(32 * (1 - expA));
  const dAlose = Math.round(32 * (0 - expA));
  const dBwin = Math.round(32 * (1 - expB));
  const dBlose = Math.round(32 * (0 - expB));
  el.style.display = "";
  const set = (id, val) => {
    const e = document.getElementById(id);
    if (e) e.textContent = val;
  };
  set("lep-win-a", `+${dAwin}`);
  set("lep-lose-a", `${dAlose}`);
  set("lep-win-b", `+${dBwin}`);
  set("lep-lose-b", `${dBlose}`);
}

function _updateLiveMomentum() {
  const wrap = document.getElementById("live-momentum-wrap");
  if (wrap) wrap.style.display = "none";
}

function endLiveMatch() {
  dismissRacePrompt();
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
  state.matches.push(match);
  mirrorMatchToEditor(match);
  const eventMsg = `${a1} & ${a2} ${_liveScoreA}–${_liveScoreB} ${b1} & ${b2}`;
  if (_liveSessionData?.sessionActive) {
    _sessionMatchHistory.push({
      teamA: [a1, a2],
      teamB: [b1, b2],
      scoreA: _liveScoreA,
      scoreB: _liveScoreB,
      date,
    });
    _sessionRedoStack = []; // new match invalidates redo history
    _liveSessionData = { ..._liveSessionData, currentMatch: null };
    _syncLiveSessionBar();
    if (_sessionPanelOpen) _updateSessionPanel();
    document
      .getElementById("live-undo-match-btn")
      ?.style.setProperty("display", "");
    document
      .getElementById("live-redo-match-btn")
      ?.style.setProperty("display", "none");
    _saveSessionState();
    _invalidateEloMemo();
  }
  saveCloudData(); // always persist — offline handled automatically by cloud-repo
  commit();
  showToast(`Saved! ${eventMsg}`, "🎾");
  _showLiveEventBanner({
    type: "match_end",
    msg: `Match saved: ${eventMsg}`,
    teamA: [a1, a2],
    teamB: [b1, b2],
    scoreA: _liveScoreA,
    scoreB: _liveScoreB,
  });
  // Reset everything for next match including player slots
  _liveScoreA = 0;
  _liveScoreB = 0;
  _liveSlots.a1 = _liveSlots.a2 = _liveSlots.b1 = _liveSlots.b2 = null;
  ["a1", "a2", "b1", "b2"].forEach((s) => _renderLiveSlot(s));
  _updateLiveDisplay();
  _updateLiveWinProb();
  _updateLiveEloPreview();
  _renderSittingOut();
  _checkRematchWarning();
  _renderLiveSessionDashboard();
  // Stay on live page — do NOT call goTo("live") here as it would corrupt prevPage
}


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
  const allPairs = _memoPairStats();
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
      openEditMatch(idx);
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

// Global Escape-to-close. Closes the topmost open dialog. Each bottom-sheet
// has a backdrop overlay whose existing onclick already runs the correct close
// (with any state cleanup), so Esc reuses that tested path rather than guessing.
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  // Richest modals first — these manage their own teardown.
  if (document.getElementById("player-detail-modal")) {
    document.getElementById("player-detail-modal").remove();
    return;
  }
  const mi = document.getElementById("match-intro-overlay");
  if (mi && mi.classList.contains("active")) {
    closeMatchIntro();
    return;
  }
  // Any visible bottom-sheet backdrop — trigger its own close handler.
  const overlays = [
    ...document.querySelectorAll(
      ".live-sheet-overlay, .ana-search-overlay, .modern-modal",
    ),
  ].filter((el) => {
    const cs = getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden" && el.offsetParent !== null;
  });
  const top = overlays[overlays.length - 1];
  if (top && typeof top.onclick === "function") top.click();
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
      // Never engage on a multi-touch gesture (pinch-zoom): applying 3D tilt
      // transforms to cards while the browser is zooming forces huge composited
      // layers and crashes mobile WebKit. Leave pinch entirely to the browser.
      if (e.touches.length > 1) {
        if (_tc) { _tReset(_tc); _tc = null; }
        return;
      }
      const card = e.target.closest(".pc");
      if (card) _tc = card;
    },
    { passive: true },
  );

  document.addEventListener(
    "touchmove",
    (e) => {
      // Bail (and undo any in-progress tilt) the moment a second finger lands,
      // so a pinch-zoom started over a card doesn't leave a 3D-transformed layer.
      if (!_tc || _nd.active || e.touches.length > 1) {
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
  if (!(await _ensureHtml2Canvas())) {
    showToast("Capture not available", "❌");
    return;
  }
  const modal = document.getElementById("player-detail-modal");
  if (!modal) {
    showToast("Open player detail first", "❌");
    return;
  }
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
      if (!blob) {
        showToast("Capture failed", "❌");
        return;
      }
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
  if (_sessionTimerInterval) {
    clearInterval(_sessionTimerInterval);
    _sessionTimerInterval = null;
  }
}
function _updateSessionTimer() {
  const el = document.getElementById("live-session-timer");
  if (!el || !_liveSessionData?.sessionStartedAt) return;
  const sec = Math.floor(
    (Date.now() - new Date(_liveSessionData.sessionStartedAt).getTime()) / 1000,
  );
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  el.textContent =
    h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── SITTING-OUT STRIP ────────────────────────────────────────
function _renderSittingOut() {
  const el = document.getElementById("live-sittingout-strip");
  if (!el) return;
  if (!_liveSessionData?.sessionActive) {
    el.style.display = "none";
    return;
  }
  const sessionPlayers = _liveSessionData.sessionPlayers || [];
  const playing = new Set(Object.values(_liveSlots).filter(Boolean));
  const sitting = sessionPlayers.filter((p) => !playing.has(p));
  if (sitting.length === 0) {
    el.style.display = "none";
    return;
  }
  el.style.display = "";
  el.innerHTML =
    `<span class="sittingout-label">SITTING OUT</span>` +
    sitting
      .map(
        (p) =>
          `<span class="sittingout-chip">${escHtml(p.split(" ")[0])}</span>`,
      )
      .join("");
}

// ── REMATCH WARNING ──────────────────────────────────────────
function _checkRematchWarning() {
  const { a1, a2, b1, b2 } = _liveSlots;
  const el = document.getElementById("live-rematch-warning");
  if (!el) return;
  if (!a1 || !a2 || !b1 || !b2) {
    el.style.display = "none";
    return;
  }
  const sA = [a1, a2].sort().join("|"),
    sB = [b1, b2].sort().join("|");
  const prev = _sessionMatchHistory.find((m) => {
    const mA = [...m.teamA].sort().join("|"),
      mB = [...m.teamB].sort().join("|");
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
    return emptyState({ inline: true, message: "No matches yet" });
  const stats = {};
  sessionPlayers.forEach((p) => (stats[p] = { w: 0, l: 0, m: 0 }));
  _sessionMatchHistory.forEach((mt) => {
    const aWon = mt.scoreA > mt.scoreB;
    (aWon ? mt.teamA : mt.teamB).forEach((p) => {
      if (stats[p]) {
        stats[p].w++;
        stats[p].m++;
      }
    });
    (aWon ? mt.teamB : mt.teamA).forEach((p) => {
      if (stats[p]) {
        stats[p].l++;
        stats[p].m++;
      }
    });
  });
  const sorted = Object.entries(stats).sort((a, b) => {
    const diff =
      (b[1].m ? b[1].w / b[1].m : 0) - (a[1].m ? a[1].w / a[1].m : 0);
    return diff !== 0 ? diff : b[1].m - a[1].m;
  });
  const counts = sorted.map(([, s]) => s.m);
  const maxM = Math.max(...counts),
    minM = Math.min(...counts);
  const fairWarn =
    maxM - minM >= 2 && sorted.length >= 3
      ? `<div class="sess-fairness-warn">⚠️ ${sorted
          .filter(([, s]) => s.m === maxM)
          .map(([n]) => n.split(" ")[0])
          .join(", ")} played ${maxM - minM} more than others</div>`
      : "";
  const rows = sorted
    .map(([name, s]) => {
      const pct = s.m ? Math.round((s.w / s.m) * 100) : 0;
      return `<div class="sess-ldr-row">
      <div class="sess-ldr-name">${escHtml(name.split(" ")[0])}</div>
      <div class="sess-ldr-stats">${s.w}W ${s.l}L</div>
      <div class="sess-ldr-barwrap"><div class="sess-ldr-bar" style="width:${pct}%"></div></div>
      <div class="sess-ldr-count">×${s.m}</div>
    </div>`;
    })
    .join("");
  // Enhancement 11: full undo stack — show all session matches with undo/edit/delete buttons
  const histRows = [..._sessionMatchHistory]
    .reverse()
    .map((mt, ri) => {
      const i = _sessionMatchHistory.length - 1 - ri;
      const aWon = mt.scoreA > mt.scoreB;
      const tA = mt.teamA.map((p) => p.split(" ")[0]).join(" & ");
      const tB = mt.teamB.map((p) => p.split(" ")[0]).join(" & ");
      const isLast = i === _sessionMatchHistory.length - 1;
      const adminBtns = window.isAdmin
        ? `<div class="sess-hist-actions">
            <button class="sess-hist-edit-btn" onclick="editSessionMatch(${i})">✏</button>
            <button class="sess-hist-del-btn" onclick="deleteSessionMatch(${i})">🗑</button>
           </div>`
        : "";
      return `<div class="sess-hist-row${isLast ? " sess-hist-last" : ""}">
      <span class="sess-hist-teams">${escHtml(tA)} <span class="sess-hist-score ${aWon ? "p" : "n"}">${mt.scoreA}–${mt.scoreB}</span> ${escHtml(tB)}</span>
      ${isLast ? `<button class="sess-hist-undo-btn" onclick="undoSessionMatch()">↶</button>` : ""}
      ${adminBtns}
    </div>`;
    })
    .join("");
  const histHtml = histRows
    ? `<div class="sess-hist-label">MATCH LOG</div><div class="sess-hist-list">${histRows}</div>`
    : "";
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
  const s = [...pick4].sort(
    (a, b) => (eloMap[b] || 1000) - (eloMap[a] || 1000),
  );
  const teamA = alt ? [s[0], s[2]] : [s[0], s[3]];
  const teamB = alt ? [s[1], s[3]] : [s[1], s[2]];
  const avgA = ((eloMap[teamA[0]] || 1000) + (eloMap[teamA[1]] || 1000)) / 2;
  const avgB = ((eloMap[teamB[0]] || 1000) + (eloMap[teamB[1]] || 1000)) / 2;
  return { teamA, teamB, avgA, avgB };
}

function suggestNextMatch() {
  const sessionPlayers = _liveSessionData?.sessionPlayers || [];
  if (sessionPlayers.length < 4) {
    showToast("Need 4+ players in session", "❌");
    return;
  }
  const eloMap = _memoElo();
  const counts = {};
  sessionPlayers.forEach((p) => (counts[p] = 0));
  _sessionMatchHistory.forEach((m) => {
    [...m.teamA, ...m.teamB].forEach((p) => {
      if (p in counts) counts[p]++;
    });
  });
  const sorted = [...sessionPlayers].sort(
    (a, b) => counts[a] - counts[b] || a.localeCompare(b),
  );
  const pick4 = sorted.slice(0, 4);
  const suggestions = [
    _mkEloTeams(pick4, eloMap, false), // snake: best+worst vs 2nd+3rd
    sorted.length >= 8
      ? _mkEloTeams(sorted.slice(4, 8), eloMap, false) // next 4 players
      : _mkEloTeams(pick4, eloMap, true), // alt pairing of same 4
  ];
  _showSuggestSheet(suggestions);
}

function _showSuggestSheet(suggestions) {
  const sheet = document.getElementById("suggest-sheet");
  const body = document.getElementById("suggest-sheet-body");
  if (!sheet || !body) return;
  body.innerHTML = suggestions
    .map((s, i) => {
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
    })
    .join("");
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

window._applySuggestion = function (idx) {
  const s = window._matchSuggestions?.[idx];
  if (!s) return;
  _liveSlots.a1 = s.teamA[0];
  _liveSlots.a2 = s.teamA[1];
  _liveSlots.b1 = s.teamB[0];
  _liveSlots.b2 = s.teamB[1];
  _liveScoreA = 0;
  _liveScoreB = 0;
  ["a1", "a2", "b1", "b2"].forEach((sl) => _renderLiveSlot(sl));
  _updateLiveDisplay();
  _updateLiveWinProb();
  _updateLiveEloPreview();
  _renderSittingOut();
  _checkRematchWarning();
  _closeSuggestSheet();
};

// ── UNDO LAST SESSION MATCH ──────────────────────────────────
function undoSessionMatch() {
  if (!_sessionMatchHistory.length) {
    showToast("No match to undo", "❌");
    return;
  }
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
  document
    .getElementById("undo-confirm-overlay")
    ?.style.setProperty("display", "block");
  document
    .getElementById("undo-confirm-sheet")
    ?.classList.add("live-sheet-open");
}

function closeUndoConfirmSheet() {
  document
    .getElementById("undo-confirm-overlay")
    ?.style.setProperty("display", "none");
  document
    .getElementById("undo-confirm-sheet")
    ?.classList.remove("live-sheet-open");
}

function confirmUndoSession() {
  closeUndoConfirmSheet();
  if (!_sessionMatchHistory.length) return;
  const last = _sessionMatchHistory[_sessionMatchHistory.length - 1];
  const key = _mkMatchKey(last);
  const idx = state.matches.findIndex((m) => _mkMatchKey(m) === key);
  if (idx !== -1) state.matches.splice(idx, 1);
  _sessionMatchHistory.pop();
  _sessionRedoStack.push(last);
  _liveSlots.a1 = last.teamA[0];
  _liveSlots.a2 = last.teamA[1];
  _liveSlots.b1 = last.teamB[0];
  _liveSlots.b2 = last.teamB[1];
  ["a1", "a2", "b1", "b2"].forEach((s) => _renderLiveSlot(s));
  _updateLiveDisplay();
  _updateLiveWinProb();
  _updateLiveEloPreview();
  _updateLiveMomentum();
  _syncLiveSessionBar();
  if (_sessionPanelOpen) _updateSessionPanel();
  _renderSittingOut();
  _checkRematchWarning();
  document
    .getElementById("live-undo-match-btn")
    ?.style.setProperty("display", _sessionMatchHistory.length > 0 ? "" : "none");
  document
    .getElementById("live-redo-match-btn")
    ?.style.setProperty("display", _sessionRedoStack.length > 0 ? "" : "none");
  _invalidateEloMemo();
  _saveSessionState();
  commit();
  saveCloudData({ immediate: true }); // persist removal immediately
  _renderLiveSessionDashboard();
  showToast("Last match undone ↶", "✅");
}

// ── DELETE A SESSION MATCH (admin) ──────────────────────────
function deleteSessionMatch(histIdx) {
  const mt = _sessionMatchHistory[histIdx];
  if (!mt) return;
  const key = _mkMatchKey(mt);
  const stateIdx = state.matches.findIndex((m) => _mkMatchKey(m) === key);
  if (stateIdx !== -1) state.matches.splice(stateIdx, 1);
  _sessionMatchHistory.splice(histIdx, 1);
  if (_sessionPendingCount > 0) _sessionPendingCount--;
  _updateSyncBadge();
  _invalidateEloMemo();
  _saveSessionState();
  saveCloudData();
  commit();
  if (_sessionPanelOpen) _updateSessionPanel();
  _updateLiveDisplay();
  _updateLiveWinProb();
  _updateLiveEloPreview();
  showToast("Match removed from session", "🗑");
}

// ── EDIT A SESSION MATCH (admin) ─────────────────────────────
function editSessionMatch(histIdx) {
  const mt = _sessionMatchHistory[histIdx];
  if (!mt) return;
  const key = _mkMatchKey(mt);
  const stateIdx = state.matches.findIndex((m) => _mkMatchKey(m) === key);
  if (stateIdx === -1) {
    showToast("Cannot find match to edit", "❌");
    return;
  }
  // Open the standard edit modal, but wire save to also sync session history
  closeMatchEdit();
  const players = getAllPlayerNamesFromMatches();
  const opts = (val) =>
    players
      .map(
        (p) =>
          `<option value="${escHtml(p)}"${p === val ? " selected" : ""}>${escHtml(p)}</option>`,
      )
      .join("");
  const m = state.matches[stateIdx];
  const ov = document.createElement("div");
  ov.id = "match-edit-modal";
  ov.className = "match-edit-modal";
  ov.innerHTML = `
    <div class="mem-backdrop" onclick="closeMatchEdit()"></div>
    <div class="mem-panel">
      <div class="mei-header">
        <span class="mei-title">✏ EDIT SESSION MATCH</span>
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
        <button class="mei-save" onclick="saveSessionMatchEdit(${stateIdx},${histIdx})">Save Changes</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  requestAnimationFrame(() =>
    requestAnimationFrame(() =>
      ov.querySelector(".mem-panel")?.classList.add("open"),
    ),
  );
}

function saveSessionMatchEdit(stateIdx, histIdx) {
  const m = state.matches[stateIdx];
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
  const show = (msg) => { errEl.textContent = msg; errEl.style.display = "block"; };
  if (!a1 || !b1) return show("Select at least P1 for each team.");
  if (isNaN(sa) || isNaN(sb)) return show("Enter valid scores.");
  if (sa === sb) return show("Scores cannot be equal.");
  if (date && date > todayISO()) return show("Match date cannot be in the future.");
  const teamA = [a1, a2].filter(Boolean);
  const teamB = [b1, b2].filter(Boolean);
  if (teamA.length !== teamB.length) return show("Both teams must have the same size.");
  if (new Set([...teamA, ...teamB]).size < teamA.length + teamB.length)
    return show("All players in a match must be different.");
  m.date = date || m.date;
  m.teamA = teamA;
  m.teamB = teamB;
  m.scoreA = sa;
  m.scoreB = sb;
  if (note) m.note = note; else delete m.note;
  // Sync the session history entry
  const hist = _sessionMatchHistory[histIdx];
  if (hist) {
    hist.date = m.date;
    hist.teamA = [...teamA];
    hist.teamB = [...teamB];
    hist.scoreA = sa;
    hist.scoreB = sb;
    if (note) hist.note = note; else delete hist.note;
  }
  _invalidateEloMemo();
  _saveSessionState();
  saveCloudData();
  closeMatchEdit();
  commit();
  if (_sessionPanelOpen) _updateSessionPanel();
}

// ── REDO LAST UNDONE SESSION MATCH ───────────────────────────
function redoSessionMatch() {
  if (!_sessionRedoStack.length) {
    showToast("Nothing to redo", "❌");
    return;
  }
  const match = _sessionRedoStack.pop();
  state.matches.push({ ...match });
  _sessionMatchHistory.push(match);
  _liveSlots.a1 = match.teamA[0];
  _liveSlots.a2 = match.teamA[1];
  _liveSlots.b1 = match.teamB[0];
  _liveSlots.b2 = match.teamB[1];
  ["a1", "a2", "b1", "b2"].forEach((s) => _renderLiveSlot(s));
  _updateLiveDisplay();
  _updateLiveWinProb();
  _updateLiveEloPreview();
  _updateLiveMomentum();
  _syncLiveSessionBar();
  if (_sessionPanelOpen) _updateSessionPanel();
  _renderSittingOut();
  _checkRematchWarning();
  document
    .getElementById("live-undo-match-btn")
    ?.style.setProperty("display", "");
  document
    .getElementById("live-redo-match-btn")
    ?.style.setProperty("display", _sessionRedoStack.length > 0 ? "" : "none");
  _invalidateEloMemo();
  _saveSessionState();
  commit();
  saveCloudData(); // persist redo to cloud
  _renderLiveSessionDashboard();
  showToast("Match redone ↷", "✅");
}

// ── SAVE + REMATCH ───────────────────────────────────────────
function saveAndRematch() {
  confirmSaveMatch();
  // endLiveMatch() pushed to _sessionMatchHistory — restore those players
  if (_sessionMatchHistory.length > 0) {
    const last = _sessionMatchHistory[_sessionMatchHistory.length - 1];
    _liveSlots.a1 = last.teamA[0];
    _liveSlots.a2 = last.teamA[1];
    _liveSlots.b1 = last.teamB[0];
    _liveSlots.b2 = last.teamB[1];
    ["a1", "a2", "b1", "b2"].forEach((s) => _renderLiveSlot(s));
    _updateLiveDisplay();
    _updateLiveWinProb();
    _updateLiveEloPreview();
    _renderSittingOut();
    _checkRematchWarning();
  }
}

// ── SESSION SUMMARY SHEET ────────────────────────────────────
function openSessionSummary() {
  if (!_liveSessionData?.sessionActive) return;
  const sessionPlayers = _liveSessionData.sessionPlayers || [];
  const elapsed = _liveSessionData.sessionStartedAt
    ? Math.floor(
        (Date.now() - new Date(_liveSessionData.sessionStartedAt).getTime()) /
          1000,
      )
    : 0;
  const h = Math.floor(elapsed / 3600);
  const m2 = Math.floor((elapsed % 3600) / 60);
  const dur = elapsed < 60 ? `<1m` : h > 0 ? `${h}h ${m2}m` : `${m2}m`;
  const stats = {};
  sessionPlayers.forEach((p) => (stats[p] = { w: 0, l: 0 }));
  _sessionMatchHistory.forEach((mt) => {
    const aWon = mt.scoreA > mt.scoreB;
    (aWon ? mt.teamA : mt.teamB).forEach((p) => {
      if (stats[p]) stats[p].w++;
    });
    (aWon ? mt.teamB : mt.teamA).forEach((p) => {
      if (stats[p]) stats[p].l++;
    });
  });
  const sorted = Object.entries(stats).sort(
    (a, b) => b[1].w - a[1].w || a[1].l - b[1].l,
  );
  const mvp = sorted[0];
  const playersHtml = sorted
    .map(
      ([name, s]) =>
        `<div class="sess-sum-player">${sheetAvSm(name)}<span class="sess-sum-pname">${escHtml(name)}</span><span class="sess-sum-wl">${s.w}W–${s.l}L</span></div>`,
    )
    .join("");
  const matchesHtml =
    _sessionMatchHistory.length === 0
      ? '<div style="font-size:11px;color:var(--muted);padding:8px 0">No matches played</div>'
      : _sessionMatchHistory
          .map((mt, i) => {
            const aWon = mt.scoreA > mt.scoreB;
            return `<div class="sess-sum-match">
          <div class="sess-sum-match-num">${i + 1}</div>
          <div class="sess-sum-match-teams">${escHtml(mt.teamA.join(" & "))} <span class="sess-sum-vs">vs</span> ${escHtml(mt.teamB.join(" & "))}</div>
          <div class="sess-sum-match-score" style="color:${aWon ? "var(--green)" : "var(--red)"}">${mt.scoreA}–${mt.scoreB}</div>
        </div>`;
          })
          .join("");
  const bodyEl = document.getElementById("session-summary-body");
  if (bodyEl)
    bodyEl.innerHTML = `
    <div class="sess-sum-meta">
      <div class="sess-sum-stat"><div class="sess-sum-val">${_sessionMatchHistory.length}</div><div class="sess-sum-lbl">MATCHES</div></div>
      <div class="sess-sum-stat"><div class="sess-sum-val">${dur}</div><div class="sess-sum-lbl">DURATION</div></div>
      ${mvp ? `<div class="sess-sum-stat"><div class="sess-sum-val">${escHtml(mvp[0].split(" ")[0])}</div><div class="sess-sum-lbl">MVP · ${mvp[1].w}W</div></div>` : ""}
    </div>
    <div class="sess-sum-section-title">PLAYERS</div>
    <div class="sess-sum-players">${playersHtml}</div>
    <div class="sess-sum-section-title">MATCHES</div>
    <div class="sess-sum-matches">${matchesHtml}</div>`;
  document
    .getElementById("session-summary-overlay")
    ?.classList.add("live-sheet-open");
  document
    .getElementById("session-summary-sheet")
    ?.classList.add("live-sheet-open");
}

function closeSessionSummary() {
  document
    .getElementById("session-summary-overlay")
    ?.classList.remove("live-sheet-open");
  document
    .getElementById("session-summary-sheet")
    ?.classList.remove("live-sheet-open");
}

function _renderLiveSessionDashboard() {
  const el = document.getElementById("live-session-dashboard");
  if (!el) return;
  if (!_liveSessionData?.sessionActive || _sessionMatchHistory.length === 0) {
    el.style.display = "none";
    return;
  }
  el.style.display = "";
  // Session ELO: everyone starts at 1000, computed from today's session matches only
  const sessionEloMap = computeElo(_sessionMatchHistory);
  const stats = computeStats(_sessionMatchHistory, sessionEloMap)
    .sort((a, b) => (b.sr || 0) - (a.sr || 0) || (b.mw || 0) - (a.mw || 0));
  const rankColor = (i) =>
    i === 0 ? "var(--gold,#f5c842)" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "var(--muted)";
  const tableRows = stats.map((p, i) => {
    const ml = p.mp - p.mw;
    const winPct = p.mp > 0 ? Math.round((p.mw / p.mp) * 100) : 0;
    const total = p.gw + p.gl;
    const gamePct = total > 0 ? Math.round((p.gw / total) * 100) : 0;
    const elo = Math.round(sessionEloMap[p.name] || 1000);
    const sr = eloToSr(sessionEloMap[p.name] || 1000).toFixed(2);
    return `<tr class="live-sdash-tr">
      <td style="color:${rankColor(i)};font-weight:900">${i + 1}</td>
      <td class="live-sdash-td-name">${sheetAvSm(p.name)}<span>${escHtml(p.name.split(" ")[0])}</span></td>
      <td>${p.mp}</td>
      <td style="white-space:nowrap">${p.mw}–${ml}</td>
      <td>${winPct}%</td>
      <td>${p.gw}</td>
      <td>${p.gl}</td>
      <td>${gamePct}%</td>
      <td>${elo}</td>
      <td style="color:var(--accent)">${sr}</td>
    </tr>`;
  }).join("");
  const matchesHtml = [..._sessionMatchHistory].reverse()
    .map((mt, i) => {
      const num = _sessionMatchHistory.length - i;
      const aWon = mt.scoreA > mt.scoreB;
      return `<div class="sess-sum-match">
        <div class="sess-sum-match-num">${num}</div>
        <div class="sess-sum-match-teams">${escHtml(mt.teamA.map(n => n.split(" ")[0]).join(" & "))} <span class="sess-sum-vs">vs</span> ${escHtml(mt.teamB.map(n => n.split(" ")[0]).join(" & "))}</div>
        <div class="sess-sum-match-score" style="color:${aWon ? "var(--green)" : "var(--red)"}">${mt.scoreA}–${mt.scoreB}</div>
      </div>`;
    })
    .join("");
  el.innerHTML = `
    <div class="live-sdash-section">LEADERBOARD</div>
    <div class="live-sdash-table-wrap">
      <table class="live-sdash-table">
        <thead><tr>
          <th>#</th><th>PLAYER</th><th>MP</th><th>W–L</th><th>W%</th>
          <th>GW</th><th>GL</th><th>G%</th><th>ELO</th><th>SR</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
    <div class="live-sdash-section" style="margin-top:14px">MATCHES</div>
    <div class="sess-sum-matches">${matchesHtml}</div>`;
}

async function confirmEndSession() {
  closeSessionSummary();
  _stopSessionTimer();
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
      (d.sessionPlayers || []).forEach((p) => (counts[p] = 0));
      _sessionMatchHistory.forEach((m) => {
        [...m.teamA, ...m.teamB].forEach((p) => {
          if (p in counts) counts[p]++;
        });
      });
      chipsEl.innerHTML = (d.sessionPlayers || [])
        .map(
          (p) =>
            `<span class="live-session-chip">${escHtml(p.split(" ")[0])}${counts[p] > 0 ? `<span class="sess-chip-count"> ×${counts[p]}</span>` : ""}</span>`,
        )
        .join("");
    }
  }
}

function openSessionSetup() {
  const guestNames = new Set(
    Object.values(state.players).filter((p) => p.isGuest).map((p) => p.name),
  );
  const players = getAllPlayerNamesFromMatches().slice().sort((a, b) => {
    const ag = guestNames.has(a) ? 1 : 0;
    const bg = guestNames.has(b) ? 1 : 0;
    return ag !== bg ? ag - bg : a.localeCompare(b);
  });
  _sessionSetupSelected = new Set();
  const list = document.getElementById("session-setup-list");
  if (!list) return;
  const eloMap = _memoElo();
  list.innerHTML = players
    .map((p) => {
      const isGuest = guestNames.has(p);
      const elo = Math.round(eloMap[p] || 1000);
      const photo = photoMap[p];
      const av = photo
        ? `<img src="${photo}" class="ssp-av" style="object-fit:cover" alt="">`
        : `<span class="ssp-av" style="background:${playerColor(p)}">${playerInitials(p)}</span>`;
      const guestTag = isGuest ? `<span class="ssp-guest-tag">GUEST</span>` : "";
      return `<label class="ssp-row">
        <input type="checkbox" class="ssp-cb" onchange="window._sspToggle(${jsArg(p)}, this.checked)">
        ${av}
        <span class="ssp-meta">
          <span class="ssp-name">${escHtml(p)}</span>
          <span class="ssp-elo">${guestTag}ELO ${elo}</span>
        </span>
        <span class="ssp-check-ring"></span>
      </label>`;
    })
    .join("");
  document
    .getElementById("session-setup-overlay")
    ?.classList.add("live-sheet-open");
  document
    .getElementById("session-setup-sheet")
    ?.classList.add("live-sheet-open");
}

window._sspToggle = function (name, checked) {
  if (checked) _sessionSetupSelected.add(name);
  else _sessionSetupSelected.delete(name);
};

function sessionSetupSelectAll() {
  _sessionSetupSelected = new Set(getAllPlayerNamesFromMatches());
  document
    .querySelectorAll("#session-setup-list input[type=checkbox]")
    .forEach((cb) => {
      cb.checked = true;
    });
}

function sessionSetupSelectNone() {
  _sessionSetupSelected = new Set();
  document
    .querySelectorAll("#session-setup-list input[type=checkbox]")
    .forEach((cb) => {
      cb.checked = false;
    });
}

function closeSessionSetup() {
  document
    .getElementById("session-setup-overlay")
    ?.classList.remove("live-sheet-open");
  document
    .getElementById("session-setup-sheet")
    ?.classList.remove("live-sheet-open");
}

// ── AMERICANO / MATCHUP GENERATOR (UI) ────────────────────
let _americanoPlayers = [];
let _americanoSelected = new Set();
let _americanoSchedule = null;
let _americanoScores = {}; // "round-match" -> {a, b}
let _americanoMode = "americano"; // "americano" | "mexicano"
let _americanoSitCount = {}; // sit-out rotation tracking (both modes)
let _americanoPartnerCounts = {}; // cumulative partnership counts (Americano mode)
let _americanoOpponentCounts = {}; // cumulative opponent counts (Americano mode)
let _amCurrentTab = "schedule";
let _amDateFilter = "today";
let _amRemovedPlayers = new Set();
let _americanoCourts = 1;
let _amEndConfirmPending = false;
const _AM_SESSION_KEY = "padel_am_session";
const _AM_ROSTER_KEY = "padel_am_roster";
let _americanoLastPlayers = [];
// Americano-only persistent player roster — completely separate from the main app.
// Never reads from state.matches or state.players.
let _amRoster = [];
function _amLoadRoster() {
  try { _amRoster = JSON.parse(localStorage.getItem(_AM_ROSTER_KEY) || "[]"); } catch (e) { _amRoster = []; }
}
function _amSaveRoster() {
  try { localStorage.setItem(_AM_ROSTER_KEY, JSON.stringify(_amRoster)); } catch (e) {}
}
function _amRosterAdd(name) {
  if (!name || _amRoster.some((p) => p.toLowerCase() === name.toLowerCase())) return;
  _amRoster.push(name);
  _amSaveRoster();
}

// ── AMERICANO SESSION HISTORY ────────────────────────────
// Separate from the main app — stores past Americano sessions for career stats.
const _AM_HISTORY_KEY = "padel_am_history";
function _amLoadHistory() {
  try { return JSON.parse(localStorage.getItem(_AM_HISTORY_KEY) || "[]"); } catch (e) { return []; }
}
function _amSaveToHistory(session) {
  try {
    const hist = _amLoadHistory();
    hist.unshift(session);
    localStorage.setItem(_AM_HISTORY_KEY, JSON.stringify(hist.slice(0, 100)));
  } catch (e) {}
}
function _amCareerStats() {
  const stats = {};
  _amLoadHistory().forEach((session) => {
    (session.standings || []).forEach((s) => {
      if (!stats[s.name]) stats[s.name] = { sessions: 0, matches: 0, wins: 0, pts: 0, ga: 0 };
      stats[s.name].sessions++;
      stats[s.name].matches += s.played || 0;
      stats[s.name].wins += s.won || 0;
      stats[s.name].pts += s.pts || 0;
      stats[s.name].ga += s.ga || 0;
    });
  });
  return Object.entries(stats)
    .map(([name, s]) => ({ name, ...s, losses: s.matches - s.wins }))
    .sort((a, b) => b.pts - a.pts || b.wins - a.wins || a.name.localeCompare(b.name));
}

function openAmericanoSheet() {
  _amLoadRoster();
  _americanoPlayers = [..._amRoster];
  if (!document.getElementById("americano-list")) return;
  document.getElementById("americano-sheet")?.classList.add("live-sheet-open");
  // Try to restore saved session
  if (_amRestoreSession()) return;
  // Fresh start → show career home screen
  _americanoSelected = new Set();
  _americanoSchedule = null;
  _americanoScores = {};
  _americanoSitCount = {};
  _americanoPartnerCounts = {};
  _americanoOpponentCounts = {};
  _americanoLastPlayers = [];
  _amRemovedPlayers = new Set();
  _showAmHome();
}
// Render the player chips sorted alphabetically, preserving current selection.
function _renderAmericanoList() {
  const list = document.getElementById("americano-list");
  if (!list) return;
  const sorted = [..._americanoPlayers].sort((a, b) => a.localeCompare(b));
  list.innerHTML = sorted
    .map((p) => `
    <label class="tb-player-chip">
      <input type="checkbox"${_americanoSelected.has(p) ? " checked" : ""} onchange="window._amToggle(${jsArg(p)}, this.checked)">
      <span class="tb-chip-name">${escHtml(p)}</span>
    </label>`)
    .join("");
}
window._amToggle = function (name, on) {
  if (on) _americanoSelected.add(name);
  else _americanoSelected.delete(name);
};
// ── AUTOCOMPLETE ─────────────────────────────────────────
window.amGuestAutocomplete = function() {
  const inp = document.getElementById("americano-guest-input");
  const list = document.getElementById("am-autocomplete-list");
  if (!list || !inp) return;
  const q = inp.value.trim().toLowerCase();
  if (!q) { list.style.display = "none"; return; }
  const matches = _amRoster.filter((p) => p.toLowerCase().includes(q));
  if (!matches.length) { list.style.display = "none"; return; }
  list.innerHTML = matches.slice(0, 6).map((p) =>
    `<div class="am-autocomplete-item" onclick="amGuestSelect(${jsArg(p)})">
      <span class="am-autocomplete-av" style="background:${playerColor(p)}">${playerInitials(p)}</span>
      <span>${escHtml(p)}</span>
    </div>`
  ).join("");
  list.style.display = "";
};
window.amGuestSelect = function(name) {
  const inp = document.getElementById("americano-guest-input");
  if (inp) inp.value = name;
  document.getElementById("am-autocomplete-list").style.display = "none";
  americanoAddGuest();
};

// Add a player — shows a confirmation popup with ADD / EDIT options.
function americanoAddGuest() {
  const inp = document.getElementById("americano-guest-input");
  const raw = (inp?.value || "").trim();
  if (!raw) return;
  document.getElementById("am-autocomplete-list").style.display = "none";
  const existing = _amRoster.find((p) => p.toLowerCase() === raw.toLowerCase());
  const initialName = existing || raw;
  const isNew = !existing;
  const sheet = document.getElementById("americano-sheet");
  if (!sheet) return;
  document.getElementById("am-add-player-overlay")?.remove();
  const ov = document.createElement("div");
  ov.id = "am-add-player-overlay";
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = `
    <div id="am-add-player-sheet">
      <div class="am-edit-handle"></div>
      <div class="am-add-player-card">
        <span class="am-add-player-av" id="am-add-av" style="background:${playerColor(initialName)}">${playerInitials(initialName)}</span>
        <div class="am-add-player-info">
          <input id="am-add-name-inp" class="am-add-name-inp" value="${escHtml(initialName)}" autocomplete="off"
            oninput="window._amAddPreview(this.value)"
            onkeydown="if(event.key==='Enter')window._amConfirmAddPlayer()">
          <div class="am-add-player-tag${isNew ? " am-add-player-tag-new" : ""}">${isNew ? "✦ new player — will be saved to roster" : "✓ existing player"}</div>
        </div>
      </div>
      <div class="am-edit-actions">
        <button class="am-edit-btn am-edit-save" onclick="window._amConfirmAddPlayer()">＋ ADD</button>
        <button class="am-edit-btn" style="background:rgba(255,255,255,0.07);color:var(--text)" onclick="window._amEditPlayerName()">✏ EDIT</button>
        <button class="am-edit-btn am-edit-cancel" onclick="document.getElementById('am-add-player-overlay')?.remove()">✕</button>
      </div>
    </div>`;
  sheet.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add("am-edit-open"));
}
window._amAddPreview = function(val) {
  const name = (val || "").trim() || "?";
  const av = document.getElementById("am-add-av");
  if (av) { av.textContent = playerInitials(name); av.style.background = playerColor(name); }
  const tag = document.querySelector(".am-add-player-tag");
  if (tag) {
    const exists = _amRoster.some((p) => p.toLowerCase() === name.toLowerCase());
    tag.className = "am-add-player-tag" + (exists ? "" : " am-add-player-tag-new");
    tag.textContent = exists ? "✓ existing player" : "✦ new player — will be saved to roster";
  }
};
window._amEditPlayerName = function() {
  const inp = document.getElementById("am-add-name-inp");
  if (!inp) return;
  inp.focus();
  inp.select();
};
window._amConfirmAddPlayer = function() {
  const name = (document.getElementById("am-add-name-inp")?.value || "").trim();
  if (!name) return;
  const existing = _americanoPlayers.find((p) => p.toLowerCase() === name.toLowerCase());
  if (existing) {
    _americanoSelected.add(existing);
  } else {
    _americanoPlayers.push(name);
    _americanoSelected.add(name);
    _amRosterAdd(name);
  }
  const inp = document.getElementById("americano-guest-input");
  if (inp) inp.value = "";
  document.getElementById("am-add-player-overlay")?.remove();
  _renderAmericanoList();
  showToast(`${name} added`, "✅");
};
function closeAmericano() {
  document
    .getElementById("americano-overlay")
    ?.classList.remove("live-sheet-open");
  document
    .getElementById("americano-sheet")
    ?.classList.remove("live-sheet-open");
}

// ── SEASONS UI ─────────────────────────────────────────────
function _genSeasonId() {
  return "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
// Human label for a season's range, e.g. "1 Jan 2026 → 31 Mar 2026" / "… → now".
function _seasonRangeLabel(s) {
  const from = s.start ? fmtDate(s.start) : "start";
  const to = s.end ? fmtDate(s.end) : "now";
  return `${from} → ${to}`;
}
// Update the hamburger button label to reflect the active season.
function updateSeasonHamburgerUI() {
  const btn = document.getElementById("season-hmenu-btn");
  if (!btn) return;
  const s = _activeSeason();
  btn.textContent = `🗓️ SEASON: ${s ? s.name : "All"}`;
}
function openSeasonSheet() {
  _seasonShowList();
  _renderSeasonList();
  const autoT = document.getElementById("season-auto-toggle");
  if (autoT) autoT.checked = _isAutoSeasonEnabled();
  document.getElementById("season-overlay")?.classList.add("live-sheet-open");
  document.getElementById("season-sheet")?.classList.add("live-sheet-open");
}
function closeSeasonSheet() {
  document
    .getElementById("season-overlay")
    ?.classList.remove("live-sheet-open");
  document.getElementById("season-sheet")?.classList.remove("live-sheet-open");
}
function _seasonShowList() {
  document.getElementById("season-list-view").style.display = "";
  document.getElementById("season-edit-view").style.display = "none";
}
// Render the ALL SEASONS option + one row per season. Admin sees edit pencils
// and the NEW SEASON button; everyone can tap a row to switch the view.
function _renderSeasonList() {
  const list = document.getElementById("season-list");
  if (!list) return;
  const admin = !!window.isAdmin;
  const rowAll = `
    <button class="season-row${_activeSeasonId === "all" ? " active" : ""}" onclick="setSeason('all')">
      <span class="season-row-radio"></span>
      <span class="season-row-main">
        <span class="season-row-name">All Seasons</span>
        <span class="season-row-meta">${state.matches.length} match${state.matches.length !== 1 ? "es" : ""} · no date filter</span>
      </span>
    </button>`;
  const rows = state.seasons
    .map((s) => {
      const active = _activeSeasonId === s.id;
      const cnt = _seasonMatchCount(s);
      return `
    <div class="season-row${active ? " active" : ""}" onclick="setSeason(${jsArg(s.id)})">
      <span class="season-row-radio"></span>
      <span class="season-row-main">
        <span class="season-row-name">${escHtml(s.name)}</span>
        <span class="season-row-meta">${_seasonRangeLabel(s)} · ${cnt} match${cnt !== 1 ? "es" : ""}</span>
      </span>
      ${admin ? `<button class="season-row-edit" title="Edit" onclick="event.stopPropagation();openSeasonEditor(${jsArg(s.id)})">✏️</button>` : ""}
    </div>`;
    })
    .join("");
  list.innerHTML =
    rowAll +
    rows +
    (!state.seasons.length && !admin
      ? `<div style="padding:18px 4px;text-align:center;color:var(--text-muted);font-size:12px">No seasons defined yet.</div>`
      : "");
  const adminActions = document.getElementById("season-admin-actions");
  if (adminActions) adminActions.style.display = admin ? "" : "none";
}
// Open the add/edit form. No id = new season.
function openSeasonEditor(id) {
  const s = id ? state.seasons.find((x) => x.id === id) : null;
  document.getElementById("season-edit-id").value = s ? s.id : "";
  document.getElementById("season-edit-name").value = s ? s.name : "";
  document.getElementById("season-edit-start").value = s ? s.start || "" : "";
  document.getElementById("season-edit-end").value = s ? s.end || "" : "";
  document.getElementById("season-delete-btn").style.display = s ? "" : "none";
  document.getElementById("season-list-view").style.display = "none";
  document.getElementById("season-edit-view").style.display = "";
}
function closeSeasonEditor() {
  _seasonShowList();
  _renderSeasonList();
}
// Persist the editor form into the seasons list + cloud.
function saveSeasonFromEditor() {
  if (!window.isAdmin) {
    showToast("Admin only", "🔒");
    return;
  }
  const id = document.getElementById("season-edit-id").value;
  const name = document.getElementById("season-edit-name").value.trim();
  const start = document.getElementById("season-edit-start").value;
  const end = document.getElementById("season-edit-end").value;
  if (!name) {
    showToast("Name required", "⚠️");
    return;
  }
  if (!start) {
    showToast("Start date required", "⚠️");
    return;
  }
  if (end && end < start) {
    showToast("End is before start", "⚠️");
    return;
  }
  if (id) {
    const s = state.seasons.find((x) => x.id === id);
    if (s) {
      s.name = name;
      s.start = start;
      s.end = end || null;
    }
  } else {
    state.seasons.push({ id: _genSeasonId(), name, start, end: end || null });
  }
  // Newest first by start date.
  state.seasons.sort((a, b) => (b.start || "").localeCompare(a.start || ""));
  _persistSeasons();
  saveCloudData();
  // If the edited season is the active one, the range may have changed → re-render.
  if (_activeSeasonId === id) commit();
  closeSeasonEditor();
  updateSeasonHamburgerUI();
  showToast(id ? "Season updated" : "Season added", "🗓️");
}
function deleteSeasonFromEditor() {
  if (!window.isAdmin) return;
  const id = document.getElementById("season-edit-id").value;
  if (!id) return;
  const s = state.seasons.find((x) => x.id === id);
  if (!confirm(`Delete season "${s ? s.name : ""}"? Matches are not affected.`))
    return;
  state.seasons = state.seasons.filter((x) => x.id !== id);
  const wasActive = _activeSeasonId === id;
  if (wasActive) _activeSeasonId = "all";
  _persistSeasons();
  saveCloudData();
  if (wasActive) commit();
  closeSeasonEditor();
  updateSeasonHamburgerUI();
  showToast("Season deleted", "🗑");
}
function _persistSeasons() {
  try {
    localStorage.setItem("padel_seasons", JSON.stringify(state.seasons));
    localStorage.setItem("padel_active_season", _activeSeasonId);
  } catch (e) {}
}
function _americanoShowSetup() {
  document.getElementById("americano-setup").style.display = "";
  document.getElementById("americano-result").style.display = "none";
  document.getElementById("am-bottom-bar").style.display = "none";
}

// ── AMERICANO HOME (career leaderboard + ADMIN) ───────────
function _showAmHome() {
  document.getElementById("americano-setup").style.display = "none";
  document.getElementById("americano-result").style.display = "";
  document.getElementById("am-bottom-bar").style.display = "";
  document.getElementById("am-home-tab-bar").style.display = "";
  document.getElementById("am-tab-bar").style.display = "none";
  document.getElementById("am-home-tab-lb")?.classList.add("active");
  document.getElementById("am-home-tab-admin")?.classList.remove("active");
  _renderAmCareerLeaderboard();
}
function _showAmSession() {
  document.getElementById("am-home-tab-bar").style.display = "none";
  document.getElementById("am-tab-bar").style.display = "";
}
window.amSwitchHomeTab = function(tab) {
  document.getElementById("am-home-tab-lb")?.classList.toggle("active", tab === "leaderboard");
  document.getElementById("am-home-tab-admin")?.classList.toggle("active", tab === "admin");
  if (tab === "leaderboard") _renderAmCareerLeaderboard();
  else _renderAmAdminTab();
};
window.amShowCreateSession = function() {
  _americanoSelected = new Set();
  _americanoPlayers = [..._amRoster].sort((a, b) => a.localeCompare(b));
  _renderAmericanoList();
  _americanoShowSetup();
  setAmericanoMode(_americanoMode);
};

function _renderAmCareerLeaderboard() {
  const container = document.getElementById("americano-result");
  if (!container) return;
  const stats = _amCareerStats();
  const hist = _amLoadHistory();
  const MEDALS = ["🥇", "🥈", "🥉"];
  const CARD_CLS = ["am-lb-card-1", "am-lb-card-2", "am-lb-card-3"];
  const rows = stats.map((s, i) => {
    const wp = s.matches ? Math.round(100 * s.wins / s.matches) : 0;
    const gd = s.pts - s.ga;
    const gdStr = gd > 0 ? `+${gd}` : `${gd}`;
    const gdColor = gd > 0 ? "var(--accent,#00cc64)" : gd < 0 ? "#ff5555" : "var(--text-muted)";
    const cardCls = i < 3 ? CARD_CLS[i] : "am-lb-card-rest";
    const rankEl = i < 3 ? `<div class="am-lb-card-rank">${MEDALS[i]}</div>` : `<div class="am-lb-card-rank-num">${i + 1}</div>`;
    return `<div class="am-lb-card ${cardCls}">
      ${rankEl}
      <span class="am-lb-card-av" style="background:${playerColor(s.name)}">${playerInitials(s.name)}</span>
      <div class="am-lb-card-info">
        <div class="am-lb-card-name">${escHtml(s.name)}</div>
        <div class="am-lb-card-stats">
          <span>${s.sessions}S</span>
          <span>${s.matches}P</span>
          <span style="color:var(--accent,#00cc64)">${s.wins}W</span>
          <span style="color:#ff5555">${s.losses}L</span>
          ${s.matches ? `<span class="am-lb-win-badge">${wp}%</span>` : ""}
        </div>
      </div>
      <div class="am-lb-card-pts">
        <div class="am-lb-card-pts-val">${s.pts}</div>
        <div class="am-lb-pts-label">PTS</div>
        <div class="am-lb-card-gd" style="color:${gdColor}">${gdStr}</div>
      </div>
    </div>`;
  }).join("");
  const meta = hist.length
    ? `<div class="am-career-meta">${hist.length} session${hist.length !== 1 ? "s" : ""} · ${_amRoster.length} players</div>`
    : "";
  const empty = !stats.length
    ? `<div class="am-career-empty">
        <div class="am-career-empty-icon">🎾</div>
        <div class="am-career-empty-title">No sessions yet</div>
        <div class="am-career-empty-sub">Create your first session below</div>
      </div>`
    : "";
  container.innerHTML =
    `<div class="am-stand-hdr" style="margin-bottom:4px">🏆 ALL-TIME LEADERBOARD</div>` +
    meta + empty + rows +
    `<div style="height:14px"></div>
    <button class="am-create-session-btn-large" onclick="amShowCreateSession()">＋ CREATE NEW SESSION</button>
    <div style="height:8px"></div>`;
}

function _renderAmAdminTab() {
  const container = document.getElementById("americano-result");
  if (!container) return;
  const sorted = [..._amRoster].sort((a, b) => a.localeCompare(b));
  const hist = _amLoadHistory();
  const statsMap = {};
  hist.forEach((session) => {
    (session.standings || []).forEach((s) => {
      if (!statsMap[s.name]) statsMap[s.name] = { sessions: 0, matches: 0, wins: 0, pts: 0 };
      statsMap[s.name].sessions++;
      statsMap[s.name].matches += s.played || 0;
      statsMap[s.name].wins += s.won || 0;
      statsMap[s.name].pts += s.pts || 0;
    });
  });
  if (!sorted.length) {
    container.innerHTML = `<div class="am-career-empty">
      <div class="am-career-empty-icon">👥</div>
      <div class="am-career-empty-title">No players yet</div>
      <div class="am-career-empty-sub">Players are added when you create a session</div>
    </div>`;
    return;
  }
  const rows = sorted.map((name, idx) => {
    const s = statsMap[name] || { sessions: 0, matches: 0, wins: 0, pts: 0 };
    const wp = s.matches ? Math.round(100 * s.wins / s.matches) : 0;
    const playerSessions = hist.filter((h) => h.standings?.some((x) => x.name === name));
    const histHtml = playerSessions.length
      ? playerSessions.map((h) => {
          const ps = h.standings?.find((x) => x.name === name);
          const rank = h.standings ? h.standings.findIndex((x) => x.name === name) + 1 : "-";
          return `<div class="am-admin-session-row">
            <span class="am-admin-session-date">${h.date || "-"}</span>
            <span>#${rank} rank</span>
            <span style="color:var(--theme)">${ps?.pts || 0}pts</span>
            <span>${ps?.played || 0}P ${ps?.won || 0}W</span>
          </div>`;
        }).join("")
      : `<div class="am-admin-no-hist">No sessions recorded yet</div>`;
    return `<div class="am-admin-player-card">
      <div class="am-admin-player-row" onclick="window._amTogglePlayerHistory(${idx})">
        <span class="am-lb-card-av" style="background:${playerColor(name)}">${playerInitials(name)}</span>
        <div class="am-admin-info">
          <div class="am-admin-name">${escHtml(name)}</div>
          <div class="am-admin-stats">${s.sessions} sessions · ${s.matches} matches · ${wp}% win rate · ${s.pts} pts</div>
        </div>
        <div class="am-admin-actions" onclick="event.stopPropagation()">
          <button class="am-admin-edit-btn" onclick="window._amStartRename(${jsArg(name)})">✏</button>
          <button id="am-del-${idx}" class="am-admin-del-btn" onclick="window._amDeletePlayer(${jsArg(name)},${idx})">🗑</button>
        </div>
      </div>
      <div class="am-admin-history" id="am-admin-hist-${idx}" style="display:none">${histHtml}</div>
    </div>`;
  }).join("");
  container.innerHTML = `<div class="am-stand-hdr" style="margin-bottom:10px">⚙️ PLAYER MANAGEMENT</div>` + rows + `<div style="height:8px"></div>`;
}
window._amTogglePlayerHistory = function(idx) {
  const el = document.getElementById("am-admin-hist-" + idx);
  if (el) el.style.display = el.style.display === "none" ? "" : "none";
};
window._amDeletePlayer = function(name, idx) {
  const btn = document.getElementById("am-del-" + idx);
  if (!btn) return;
  if (btn._confirmPending) {
    clearTimeout(btn._confirmTimer);
    _amRoster = _amRoster.filter((p) => p !== name);
    _amSaveRoster();
    showToast(`${name} removed from roster`, "🗑");
    _renderAmAdminTab();
  } else {
    btn._confirmPending = true;
    btn.textContent = "CONFIRM?";
    btn.style.cssText += ";background:rgba(255,60,60,0.25);color:#ff5555;font-size:11px;padding:6px 8px";
    btn._confirmTimer = setTimeout(() => {
      btn._confirmPending = false;
      btn.textContent = "🗑";
      btn.style.cssText = btn.style.cssText.replace(/background[^;]*;|color[^;]*;|font-size[^;]*;|padding[^;]*;/g, "");
      btn.textContent = "🗑";
    }, 3000);
  }
};
window._amStartRename = function(name) {
  const sheet = document.getElementById("americano-sheet");
  if (!sheet) return;
  document.getElementById("am-rename-overlay")?.remove();
  const ov = document.createElement("div");
  ov.id = "am-rename-overlay";
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = `
    <div id="am-rename-sheet">
      <div class="am-edit-handle"></div>
      <div class="am-edit-title">RENAME PLAYER</div>
      <div style="padding:4px 20px 0">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">Current name: ${escHtml(name)}</div>
        <input id="am-rename-input" class="am-rename-input" value="${escHtml(name)}" autocomplete="off"
          onkeydown="if(event.key==='Enter')window._amConfirmRename(${jsArg(name)},this.value)">
      </div>
      <div class="am-edit-actions">
        <button class="am-edit-btn am-edit-save" onclick="window._amConfirmRename(${jsArg(name)},document.getElementById('am-rename-input').value)">✓ SAVE</button>
        <button class="am-edit-btn am-edit-cancel" onclick="document.getElementById('am-rename-overlay')?.remove()">✕</button>
      </div>
    </div>`;
  sheet.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add("am-edit-open"));
  setTimeout(() => { document.getElementById("am-rename-input")?.focus(); document.getElementById("am-rename-input")?.select(); }, 240);
};
window._amConfirmRename = function(oldName, newName) {
  newName = (newName || "").trim();
  if (!newName || newName === oldName) { document.getElementById("am-rename-overlay")?.remove(); return; }
  if (_amRoster.some((p) => p !== oldName && p.toLowerCase() === newName.toLowerCase())) {
    showToast("A player with that name already exists", "⚠️"); return;
  }
  const idx = _amRoster.indexOf(oldName);
  if (idx >= 0) _amRoster[idx] = newName;
  _amSaveRoster();
  try {
    const hist = _amLoadHistory();
    hist.forEach((s) => {
      if (s.players) s.players = s.players.map((p) => p === oldName ? newName : p);
      if (s.standings) s.standings.forEach((x) => { if (x.name === oldName) x.name = newName; });
    });
    localStorage.setItem(_AM_HISTORY_KEY, JSON.stringify(hist));
  } catch (e) {}
  if (_americanoLastPlayers?.length) {
    _americanoLastPlayers = _americanoLastPlayers.map((p) => p === oldName ? newName : p);
    _amSaveSession();
  }
  document.getElementById("am-rename-overlay")?.remove();
  showToast(`Renamed: ${oldName} → ${newName}`, "✅");
  _renderAmAdminTab();
};
function americanoBack() {
  localStorage.removeItem(_AM_SESSION_KEY);
  _americanoSchedule = null;
  _americanoScores = {};
  _americanoSitCount = {};
  _americanoPartnerCounts = {};
  _americanoOpponentCounts = {};
  _americanoLastPlayers = [];
  _amRemovedPlayers = new Set();
  _showAmHome();
}
window.americanoBack = americanoBack;
function setAmericanoMode(mode) {
  _americanoMode = mode === "mexicano" ? "mexicano" : "americano";
  document.getElementById("am-mode-americano")?.classList.toggle("on", _americanoMode === "americano");
  document.getElementById("am-mode-mexicano")?.classList.toggle("on", _americanoMode === "mexicano");
  const hint = document.getElementById("am-mode-hint");
  if (hint)
    hint.textContent =
      _americanoMode === "mexicano"
        ? "Standings-driven — top players matched each round (1st+4th vs 2nd+3rd)"
        : "Greedy rotation — minimises repeat partners & opponents, infinite rounds";
  const gen = document.getElementById("am-generate-btn");
  if (gen) gen.textContent = "🎲 START ROUND 1";
}
function americanoSelectAll() {
  _americanoSelected = new Set(_americanoPlayers);
  _renderAmericanoList();
}
function americanoSelectNone() {
  _americanoSelected = new Set();
  _renderAmericanoList();
}
function _americanoShuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function generateAmericanoSchedule() {
  let players = [..._americanoSelected];
  if (players.length < 4) {
    showToast("Pick at least 4 players", "❌");
    return;
  }
  players = _americanoShuffle([...players]);
  _americanoLastPlayers = players;
  _americanoScores = {};
  _americanoSitCount = {};
  _americanoPartnerCounts = {};
  _americanoOpponentCounts = {};
  _americanoCourts = Math.max(1, parseInt(document.getElementById("americano-courts")?.value, 10) || 1);
  const upfront = _americanoMode === "mexicano" ? 1 : 5;
  _americanoSchedule = [];
  try {
    for (let n = 0; n < upfront; n++) {
      let rnd;
      if (_americanoMode === "mexicano") {
        rnd = nextMexicanoRound(players, _americanoSitCount, _americanoCourts);
      } else {
        rnd = nextAmericanoRound(players, _americanoPartnerCounts, _americanoOpponentCounts, _americanoSitCount, _americanoCourts);
      }
      (rnd.sittingOut || []).forEach(
        (p) => (_americanoSitCount[p] = (_americanoSitCount[p] || 0) + 1),
      );
      _americanoSchedule.push({ round: n + 1, ...rnd });
    }
  } catch (e) {
    showToast(e.message || "Could not generate", "❌");
    return;
  }
  document.getElementById("americano-setup").style.display = "none";
  document.getElementById("americano-result").style.display = "";
  document.getElementById("am-bottom-bar").style.display = "";
  document.getElementById("americano-sheet").scrollTop = 0;
  _showAmSession();
  amSwitchTab("schedule");
  _amSaveSession();
}
function _initAmericanoTouchHandlers() {
  const result = document.getElementById("americano-result");
  if (!result || result._amHandlers) return;
  result._amHandlers = true;
  let _ty = 0, _twh = null;
  result.addEventListener("touchstart", (e) => {
    const w = e.target.closest(".am-score-row");
    if (!w) return;
    _ty = e.touches[0].clientY;
    _twh = w;
  }, { passive: true });
  result.addEventListener("touchmove", (e) => {
    if (_twh) e.preventDefault();
  }, { passive: false });
  result.addEventListener("touchend", (e) => {
    if (!_twh) return;
    const dy = _ty - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 8)
      window._amAdjust(+_twh.dataset.r, +_twh.dataset.i, _twh.dataset.side, dy > 0 ? 1 : -1);
    _twh = null;
  }, { passive: true });
  result.addEventListener("wheel", (e) => {
    const w = e.target.closest(".am-score-row");
    if (!w) return;
    e.preventDefault();
    window._amAdjust(+w.dataset.r, +w.dataset.i, w.dataset.side, e.deltaY < 0 ? 1 : -1);
  }, { passive: false });
}

// ── AMERICANO SESSION PERSISTENCE ──────────────────────────
function _amSaveSession() {
  try {
    localStorage.setItem(_AM_SESSION_KEY, JSON.stringify({
      schedule: _americanoSchedule,
      scores: _americanoScores,
      sitCount: _americanoSitCount,
      partnerCounts: _americanoPartnerCounts,
      opponentCounts: _americanoOpponentCounts,
      players: _americanoLastPlayers,
      removed: [..._amRemovedPlayers],
      mode: _americanoMode,
      points: parseInt(document.getElementById("americano-points")?.value, 10) || 21,
      courts: _americanoCourts,
    }));
  } catch (e) {}
}
function _amRestoreSession() {
  try {
    const raw = localStorage.getItem(_AM_SESSION_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d.schedule || !d.players || d.players.length < 4) return false;
    _americanoSchedule = d.schedule;
    _americanoScores = d.scores || {};
    _americanoSitCount = d.sitCount || {};
    _americanoPartnerCounts = d.partnerCounts || {};
    _americanoOpponentCounts = d.opponentCounts || {};
    _americanoLastPlayers = d.players;
    _amRemovedPlayers = new Set(d.removed || []);
    _americanoMode = d.mode || "americano";
    _americanoCourts = d.courts || 1;
    const pts = document.getElementById("americano-points");
    if (pts) pts.value = d.points || 21;
    const cts = document.getElementById("americano-courts");
    if (cts) cts.value = _americanoCourts;
    document.getElementById("americano-setup").style.display = "none";
    document.getElementById("americano-result").style.display = "";
    document.getElementById("am-bottom-bar").style.display = "";
    _showAmSession();
    amSwitchTab("schedule");
    return true;
  } catch (e) { return false; }
}

// ── AMERICANO TAB SYSTEM ─────────────────────────────────
function amSwitchTab(tab) {
  _amCurrentTab = tab;
  ["schedule", "leaderboard", "players"].forEach((t) => {
    document.getElementById("am-tab-" + t)?.classList.toggle("active", t === tab);
  });
  if (tab === "schedule") _renderAmScheduleTab();
  else if (tab === "leaderboard") _renderAmLeaderboardTab();
  else if (tab === "players") _renderAmPlayersTab();
}
window.amSwitchTab = amSwitchTab;

function amSwitchDateFilter(f) {
  _amDateFilter = f;
  _renderAmLeaderboardTab();
}
window.amSwitchDateFilter = amSwitchDateFilter;

// ── AUTO-EXTEND: keep 5 unplayed matches in the schedule ─
function _amEnsureUpcoming() {
  if (!_americanoSchedule || !_americanoLastPlayers) return;
  const active = _americanoLastPlayers.filter((p) => !_amRemovedPlayers.has(p));
  if (active.length < 4) return;
  let unplayed = _americanoSchedule.reduce(
    (sum, rnd, r) =>
      sum + rnd.matches.filter((_, i) => !_americanoScores[r + "-" + i]).length,
    0,
  );
  while (unplayed < 5) {
    try {
      let next;
      if (_americanoMode === "mexicano") {
        const ordered = _americanoStandings().map((s) => s.name);
        next = nextMexicanoRound(ordered, _americanoSitCount, _americanoCourts);
      } else {
        next = nextAmericanoRound(active, _americanoPartnerCounts, _americanoOpponentCounts, _americanoSitCount, _americanoCourts);
      }
      (next.sittingOut || []).forEach(
        (p) => (_americanoSitCount[p] = (_americanoSitCount[p] || 0) + 1),
      );
      _americanoSchedule.push({ round: _americanoSchedule.length + 1, ...next });
      unplayed += next.matches.length;
    } catch { break; }
  }
}

// ── SCHEDULE TAB ─────────────────────────────────────────
function _renderAmScheduleTab() {
  const container = document.getElementById("americano-result");
  if (!container) return;
  _amEnsureUpcoming();
  const schedule = _americanoSchedule || [];
  const total = parseInt(document.getElementById("americano-points")?.value, 10) || 21;
  const defA = 10, defB = 10;
  const av = (n) =>
    `<span class="am-av" style="background:${playerColor(n)}">${playerInitials(n)}</span>`;
  const isPlayed = (r, i) => !!_americanoScores[r + "-" + i];
  const teamRow = (team, r, i, side) => {
    const sc = _americanoScores[r + "-" + i] || {};
    const val = sc[side] != null ? sc[side] : (side === "a" ? defA : defB);
    return `<div class="am-mrow"><span class="am-team">${av(team[0])}${av(team[1])}<span class="am-pair">${escHtml(team[0])} &amp; ${escHtml(team[1])}</span></span><div class="am-score-row" data-r="${r}" data-i="${i}" data-side="${side}"><button class="am-score-btn am-score-minus" onclick="window._amAdjust(${r},${i},'${side}',-1)">−</button><span class="am-sw-val">${val}</span><button class="am-score-btn am-score-plus" onclick="window._amAdjust(${r},${i},'${side}',1)">+</button></div></div>`;
  };
  const multiCourt = schedule.some((r) => r.matches.length > 1);
  const renderMatch = (m, r, i, played) =>
    `<div class="am-match${played ? " am-match-played" : " am-match-upcoming"}">
      ${multiCourt ? `<div class="am-court">C${i + 1}</div>` : ""}
      <div class="am-match-teams">${teamRow(m.teamA, r, i, "a")}${teamRow(m.teamB, r, i, "b")}</div>
      <button class="am-edit-btn-inline${played ? "" : " am-edit-btn-score"}" onclick="window._amOpenMatchEdit(${r},${i})">✏ ${played ? "EDIT" : "SCORE"}</button>
    </div>`;
  const renderRound = (rnd, r, labelSuffix = "") => {
    const matches = rnd.matches.map((m, i) => renderMatch(m, r, i, isPlayed(r, i))).join("");
    const sit = rnd.sittingOut?.length
      ? `<div class="am-sit">🪑 ${rnd.sittingOut.map(escHtml).join(", ")}</div>` : "";
    return `<div class="am-round"><div class="am-round-hdr">ROUND ${rnd.round}${labelSuffix}</div>${matches}${sit}</div>`;
  };

  const playedIdx = schedule.map((_, r) => r).filter((r) => schedule[r].matches.some((_, i) => isPlayed(r, i)));
  const upcomingIdx = schedule.map((_, r) => r).filter((r) => schedule[r].matches.every((_, i) => !isPlayed(r, i)));

  // Show only the last completed round inline; older history is in the leaderboard tab
  const lastPlayedHtml = playedIdx.length
    ? renderRound(schedule[playedIdx[playedIdx.length - 1]], playedIdx[playedIdx.length - 1],
        playedIdx.length > 1 ? ` <span class="am-rnd-badge am-rnd-badge-done">DONE</span>` : ` <span class="am-rnd-badge am-rnd-badge-done">DONE</span>`)
    : "";
  const olderCount = playedIdx.length - 1;
  const olderChip = olderCount > 0
    ? `<div class="am-older-chip">+ ${olderCount} earlier round${olderCount !== 1 ? "s" : ""} — see Leaderboard</div>`
    : "";

  const upcomingHtml = upcomingIdx.length
    ? `<div class="am-upcoming-hdr">UPCOMING — ${upcomingIdx.length} round${upcomingIdx.length !== 1 ? "s" : ""}</div>${upcomingIdx.map((r) => renderRound(schedule[r], r)).join("")}`
    : `<div style="text-align:center;padding:18px 0;color:var(--text-muted);font-size:11px;letter-spacing:0.05em">All rounds completed</div>`;

  const f = americanoFairness(_americanoLastPlayers, schedule);
  const summary = `<div class="am-summary">${_americanoLastPlayers.length} players · ${schedule.length} round${schedule.length !== 1 ? "s" : ""} · sit-outs ${f.minSits}–${f.maxSits}</div>`;
  container.innerHTML = summary + olderChip + lastPlayedHtml + upcomingHtml;
  _initAmericanoTouchHandlers();
}

// ── MATCH EDIT SHEET ─────────────────────────────────────
let _amEditTarget = null;
window._amOpenMatchEdit = function(r, i) {
  const m = _americanoSchedule?.[r]?.matches?.[i];
  if (!m) return;
  const sc = _americanoScores[r + "-" + i] || {};
  const played = sc.a != null;
  const sheet = document.getElementById("americano-sheet");
  if (!sheet) return;
  // Remove any stale overlay
  document.getElementById("am-match-edit-overlay")?.remove();
  const teamLabel = (t) => t.map(escHtml).join(" &amp; ");
  const overlay = document.createElement("div");
  overlay.id = "am-match-edit-overlay";
  overlay.onclick = (e) => { if (e.target === overlay) window._amCloseMatchEdit(); };
  overlay.innerHTML = `
    <div id="am-match-edit-sheet">
      <div class="am-edit-handle"></div>
      <div class="am-edit-title">ROUND ${(r + 1)} · EDIT SCORE</div>
      <div class="am-edit-body">
        <div class="am-edit-team-row">
          <div class="am-edit-team-name">${teamLabel(m.teamA)}</div>
          <input type="number" id="am-edit-score-a" class="am-edit-score-input" min="0" max="99" inputmode="numeric" value="${played ? sc.a : ""}">
        </div>
        <div class="am-edit-divider">VS</div>
        <div class="am-edit-team-row">
          <div class="am-edit-team-name">${teamLabel(m.teamB)}</div>
          <input type="number" id="am-edit-score-b" class="am-edit-score-input" min="0" max="99" inputmode="numeric" value="${played ? sc.b : ""}">
        </div>
      </div>
      <div class="am-edit-actions">
        <button class="am-edit-btn am-edit-save" onclick="window._amSaveMatchEdit()">✓ SAVE</button>
        ${played ? `<button class="am-edit-btn am-edit-delete" onclick="window._amDeleteMatchEdit()">🗑 DELETE</button>` : ""}
        <button class="am-edit-btn am-edit-cancel" onclick="window._amCloseMatchEdit()">✕</button>
      </div>
    </div>`;
  _amEditTarget = { r, i };
  sheet.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("am-edit-open"));
  document.getElementById("am-edit-score-a")?.focus();
};
window._amCloseMatchEdit = function() {
  const ov = document.getElementById("am-match-edit-overlay");
  if (!ov) return;
  ov.classList.remove("am-edit-open");
  setTimeout(() => ov.remove(), 220);
  _amEditTarget = null;
};
window._amSaveMatchEdit = function() {
  if (!_amEditTarget) return;
  const { r, i } = _amEditTarget;
  const a = parseInt(document.getElementById("am-edit-score-a")?.value, 10);
  const b = parseInt(document.getElementById("am-edit-score-b")?.value, 10);
  if (isNaN(a) || isNaN(b) || a < 0 || b < 0) { showToast("Enter valid scores", "❌"); return; }
  _americanoScores[r + "-" + i] = { a, b };
  window._amCloseMatchEdit();
  _amEnsureUpcoming();
  _amSaveSession();
  amSwitchTab(_amCurrentTab);
};
window._amDeleteMatchEdit = function() {
  if (!_amEditTarget) return;
  const { r, i } = _amEditTarget;
  delete _americanoScores[r + "-" + i];
  window._amCloseMatchEdit();
  _amEnsureUpcoming();
  _amSaveSession();
  amSwitchTab(_amCurrentTab);
};

// ── LEADERBOARD TAB ───────────────────────────────────────
function _renderAmLeaderboardTab() {
  const container = document.getElementById("americano-result");
  if (!container) return;
  const st = _americanoStandings();
  const hasScores = st.some((s) => s.played > 0);
  const MEDALS = ["🥇", "🥈", "🥉"];
  const CARD_CLS = ["am-lb-card-1", "am-lb-card-2", "am-lb-card-3"];

  const rows = hasScores
    ? st.map((s, i) => {
        const l = s.played - s.won;
        const wp = s.played ? Math.round(100 * s.won / s.played) : 0;
        const gd = s.pts - s.ga;
        const gdStr = gd > 0 ? `+${gd}` : `${gd}`;
        const gdColor = gd > 0 ? "var(--accent,#00cc64)" : gd < 0 ? "#ff5555" : "var(--text-muted)";
        const cardCls = i < 3 ? CARD_CLS[i] : "am-lb-card-rest";
        const rankEl = i < 3
          ? `<div class="am-lb-card-rank">${MEDALS[i]}</div>`
          : `<div class="am-lb-card-rank-num">${i + 1}</div>`;
        return `<div class="am-lb-card ${cardCls}">
          ${rankEl}
          <span class="am-lb-card-av" style="background:${playerColor(s.name)}">${playerInitials(s.name)}</span>
          <div class="am-lb-card-info">
            <div class="am-lb-card-name">${escHtml(s.name)}</div>
            <div class="am-lb-card-stats">
              <span>${s.played}P</span>
              <span style="color:var(--accent,#00cc64)">${s.won}W</span>
              <span style="color:#ff5555">${l}L</span>
              ${s.played ? `<span class="am-lb-win-badge">${wp}%</span>` : ""}
            </div>
          </div>
          <div class="am-lb-card-pts">
            <div class="am-lb-card-pts-val">${s.pts}</div>
            <div class="am-lb-pts-label">PTS</div>
            <div class="am-lb-card-gd" style="color:${gdColor}">${gdStr}</div>
          </div>
        </div>`;
      }).join("")
    : `<div style="text-align:center;padding:24px 0;color:var(--text-muted);font-size:12px;letter-spacing:0.05em">Enter match scores to see standings</div>`;

  // Match history
  const played = [];
  (_americanoSchedule || []).forEach((rnd, r) => {
    rnd.matches.forEach((m, i) => {
      const sc = _americanoScores[r + "-" + i];
      if (!sc || sc.a == null) return;
      played.push({ round: rnd.round, r, i, teamA: m.teamA, teamB: m.teamB, a: sc.a, b: sc.b });
    });
  });
  const historyHtml = played.length
    ? `<div class="am-stand-hdr" style="margin:18px 0 8px">MATCH HISTORY</div>` +
      played.slice().reverse().map((m) => {
        const aWon = m.a > m.b, bWon = m.b > m.a;
        return `<div class="am-hist-row" onclick="window._amOpenMatchEdit(${m.r},${m.i})" style="cursor:pointer">
          <span class="am-hist-rnd">R${m.round}</span>
          <span class="am-hist-team${aWon ? " am-hist-win" : ""}">${m.teamA.map(escHtml).join(" &amp; ")}</span>
          <div class="am-hist-score-wrap"><span class="am-hist-score">${m.a} – ${m.b}</span></div>
          <span class="am-hist-team${bWon ? " am-hist-win" : ""}" style="text-align:right">${m.teamB.map(escHtml).join(" &amp; ")}</span>
        </div>`;
      }).join("")
    : "";

  container.innerHTML =
    `<div class="am-stand-hdr">🏆 LEADERBOARD</div>` +
    rows + historyHtml;
}

// ── PLAYERS TAB ───────────────────────────────────────────
function _renderAmPlayersTab() {
  const container = document.getElementById("americano-result");
  if (!container) return;
  const playedByPlayer = {};
  (_americanoSchedule || []).forEach((rnd, r) => {
    rnd.matches.forEach((m, i) => {
      if (!_americanoScores[r + "-" + i]) return;
      [...m.teamA, ...m.teamB].forEach((p) => {
        playedByPlayer[p] = (playedByPlayer[p] || 0) + 1;
      });
    });
  });
  const rows = _americanoLastPlayers.map((p) => {
    const isRemoved = _amRemovedPlayers.has(p);
    const gp = playedByPlayer[p] || 0;
    return `<div class="am-player-row${isRemoved ? " am-player-removed" : ""}">
      <span class="am-player-av" style="background:${playerColor(p)}">${playerInitials(p)}</span>
      <span class="am-player-name">${escHtml(p)}</span>
      <span class="am-player-meta">${gp}G${isRemoved ? " · OUT" : ""}</span>
      ${!isRemoved
        ? `<button class="am-player-remove" onclick="window._amRemovePlayer(${jsArg(p)})">✕</button>`
        : `<button class="am-player-remove" style="background:rgba(0,200,100,0.12);color:#00cc64" onclick="window._amReAddPlayer(${jsArg(p)})">↩</button>`}
    </div>`;
  }).join("");
  const hasAnyScore = Object.keys(_americanoScores).length > 0;
  const restartBtn = !hasAnyScore
    ? `<button onclick="americanoBack()" style="display:block;width:100%;padding:10px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text-muted);border-radius:10px;cursor:pointer;font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:0.1em;margin-top:8px">↩ CHANGE PLAYERS</button>`
    : "";
  container.innerHTML = `<div style="padding:4px 0 8px">
    <div class="am-stand-hdr">PLAYERS (${_americanoLastPlayers.length - _amRemovedPlayers.size} active)</div>
    ${rows}
    <div class="am-add-player-row">
      <input id="am-new-player-input" type="text" placeholder="Add player…" autocomplete="off"
        onkeydown="if(event.key==='Enter'){event.preventDefault();amAddPlayerConfirm();}"
        style="flex:1;min-width:0;padding:7px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:13px"/>
      <button class="tb-btn tb-btn-balance" onclick="amAddPlayerConfirm()">✓ ADD</button>
    </div>
  </div>
  ${restartBtn}
  <button class="am-end-session-btn" id="am-end-btn" onclick="amEndSession()">■ END SESSION</button>
  <div style="height:6px"></div>`;
}
window.amAddPlayerConfirm = function() {
  const inp = document.getElementById("am-new-player-input");
  const name = (inp?.value || "").trim();
  if (!name) return;
  const existing = _americanoLastPlayers.find((p) => p.toLowerCase() === name.toLowerCase());
  if (existing) {
    if (_amRemovedPlayers.has(existing)) {
      _amRemovedPlayers.delete(existing);
      showToast(`${existing} re-added to session`, "✅");
    } else {
      showToast(`${existing} is already in the session`, "⚠️");
      return;
    }
  } else {
    _americanoLastPlayers.push(name);
    _americanoSitCount[name] = 0;
    _americanoPartnerCounts[name] = {};
    _americanoOpponentCounts[name] = {};
    _amRosterAdd(name);
    showToast(`${name} added — will play soon`, "✅");
  }
  if (inp) inp.value = "";
  _amSaveSession();
  _renderAmPlayersTab();
};
window._amRemovePlayer = function(name) {
  const hasPlayed = (_americanoSchedule || []).some((rnd, r) =>
    rnd.matches.some((m, i) =>
      _americanoScores[r + "-" + i] &&
      (m.teamA.includes(name) || m.teamB.includes(name)),
    ),
  );
  if (hasPlayed) {
    _amRemovedPlayers.add(name);
    showToast(`${name} removed from upcoming rounds`, "ℹ️");
  } else {
    _americanoLastPlayers = _americanoLastPlayers.filter((p) => p !== name);
    delete _americanoSitCount[name];
    delete _americanoPartnerCounts[name];
    delete _americanoOpponentCounts[name];
    showToast(`${name} removed`, "✅");
  }
  _amSaveSession();
  _renderAmPlayersTab();
};
window._amReAddPlayer = function(name) {
  _amRemovedPlayers.delete(name);
  showToast(`${name} re-added to upcoming rounds`, "✅");
  _amSaveSession();
  _renderAmPlayersTab();
};
window.amEndSession = function() {
  const btn = document.getElementById("am-end-btn");
  if (!_amEndConfirmPending) {
    _amEndConfirmPending = true;
    if (btn) { btn.textContent = "■ TAP AGAIN TO CONFIRM END"; btn.style.background = "rgba(255,80,80,0.3)"; }
    setTimeout(() => {
      _amEndConfirmPending = false;
      if (btn) { btn.textContent = "■ END SESSION"; btn.style.background = ""; }
    }, 3000);
    return;
  }
  _amEndConfirmPending = false;
  const played = (_americanoSchedule || []).reduce((n, rnd, r) =>
    n + rnd.matches.filter((_, i) => {
      const sc = _americanoScores[r + "-" + i];
      return sc && sc.a != null && !(sc.a === 10 && sc.b === 10);
    }).length, 0);
  // Save session to career history before clearing
  if (played > 0) {
    _amSaveToHistory({
      id: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      mode: _americanoMode,
      players: [..._americanoLastPlayers],
      standings: _americanoStandings(),
    });
  }
  localStorage.removeItem(_AM_SESSION_KEY);
  _americanoSchedule = null;
  _americanoScores = {};
  _americanoSitCount = {};
  _americanoPartnerCounts = {};
  _americanoOpponentCounts = {};
  _americanoLastPlayers = [];
  _amRemovedPlayers = new Set();
  _showAmHome();
  showToast(`Session ended · ${played} match${played !== 1 ? "es" : ""} played`, "✅");
};

// Live standings from whatever scores have been entered so far. Americano
// scoring: each player banks the points their team scored, every round.
function _americanoStandings() {
  const pts = {}, ga = {}, played = {}, won = {};
  (_americanoSchedule || []).forEach((rnd, r) => {
    rnd.matches.forEach((m, i) => {
      const sc = _americanoScores[r + "-" + i];
      if (!sc || (sc.a == null && sc.b == null)) return;
      const a = +sc.a || 0, b = +sc.b || 0;
      m.teamA.forEach((p) => {
        pts[p]    = (pts[p]    || 0) + a;
        ga[p]     = (ga[p]     || 0) + b;
        played[p] = (played[p] || 0) + 1;
        if (a > b) won[p] = (won[p] || 0) + 1;
      });
      m.teamB.forEach((p) => {
        pts[p]    = (pts[p]    || 0) + b;
        ga[p]     = (ga[p]     || 0) + a;
        played[p] = (played[p] || 0) + 1;
        if (b > a) won[p] = (won[p] || 0) + 1;
      });
    });
  });
  return _americanoLastPlayers
    .map((p) => ({
      name: p,
      pts:    pts[p]    || 0,
      ga:     ga[p]     || 0,
      played: played[p] || 0,
      won:    won[p]    || 0,
    }))
    .sort((x, y) => y.pts - x.pts || y.won - x.won || (y.pts - y.ga) - (x.pts - x.ga) || x.name.localeCompare(y.name));
}

// Scroll-wheel score picker: adjust one team's score by delta, mirror the other.
window._amAdjust = function (r, i, side, delta) {
  const k = r + "-" + i;
  if (!_americanoScores[k]) _americanoScores[k] = {};
  const total = parseInt(document.getElementById("americano-points")?.value, 10) || 21;
  const defA = 10;
  const defB = 10;
  const sc = _americanoScores[k];
  const curA = sc.a != null ? sc.a : defA;
  const curB = sc.b != null ? sc.b : defB;
  let newA, newB;
  if (side === "a") {
    newA = Math.max(0, Math.min(total, curA + delta));
    newB = total - newA;
  } else {
    newB = Math.max(0, Math.min(total, curB + delta));
    newA = total - newB;
  }
  _americanoScores[k] = { a: newA, b: newB };
  // Patch value spans immediately for instant feedback
  const aEl = document.querySelector(`.am-score-row[data-r="${r}"][data-i="${i}"][data-side="a"]`);
  const bEl = document.querySelector(`.am-score-row[data-r="${r}"][data-i="${i}"][data-side="b"]`);
  if (aEl) aEl.querySelector(".am-sw-val").textContent = newA;
  if (bEl) bEl.querySelector(".am-sw-val").textContent = newB;
  // Mark the match card as played
  aEl?.closest(".am-match")?.classList.replace("am-match-upcoming", "am-match-played");
  // Debounced: ensure upcoming matches, save, full re-render
  clearTimeout(window._amAdjust._t);
  window._amAdjust._t = setTimeout(() => {
    _amEnsureUpcoming();
    _amSaveSession();
    const sheet = document.getElementById("americano-sheet");
    const sy = sheet?.scrollTop || 0;
    amSwitchTab(_amCurrentTab);
    requestAnimationFrame(() => { if (sheet) sheet.scrollTop = sy; });
  }, 600);
};

// Enhancement 13: session pause/resume via localStorage
const _SESSION_SAVE_KEY = "padel_session_state";
function _saveSessionState() {
  try {
    if (!_liveSessionData?.sessionActive) return;
    localStorage.setItem(
      _SESSION_SAVE_KEY,
      JSON.stringify({
        session: _liveSessionData,
        history: _sessionMatchHistory,
        redoStack: _sessionRedoStack,
        savedAt: new Date().toISOString(),
      }),
    );
  } catch (e) {}
}

function _clearSessionState() {
  try {
    localStorage.removeItem(_SESSION_SAVE_KEY);
  } catch (e) {}
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
    const mins = Math.floor(
      (Date.now() - new Date(startedAt).getTime()) / 60000,
    );
    durationStr =
      mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
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
    const { session, history, redoStack } = JSON.parse(saved);
    if (!session?.sessionActive) return;
    _liveSessionData = session;
    _sessionMatchHistory = history || [];
    _sessionRedoStack = redoStack || [];
    _sessionPanelOpen = false;
    _syncLiveSessionBar();
    _startSessionTimer();
    _renderSessionActiveCard();
    document
      .getElementById("live-undo-match-btn")
      ?.style.setProperty("display", _sessionMatchHistory.length > 0 ? "" : "none");
    document
      .getElementById("live-redo-match-btn")
      ?.style.setProperty("display", _sessionRedoStack.length > 0 ? "" : "none");
  } catch (e) {}
}
function resumeSession() {
  try {
    const saved = localStorage.getItem(_SESSION_SAVE_KEY);
    if (!saved) return;
    const { session, history, redoStack } = JSON.parse(saved);
    _liveSessionData = session;
    _sessionMatchHistory = history || [];
    _sessionRedoStack = redoStack || [];
    _sessionPanelOpen = false;
    _syncLiveSessionBar();
    _startSessionTimer();
    _renderSessionActiveCard();
    document
      .getElementById("live-undo-match-btn")
      ?.style.setProperty("display", _sessionMatchHistory.length > 0 ? "" : "none");
    document
      .getElementById("live-redo-match-btn")
      ?.style.setProperty("display", _sessionRedoStack.length > 0 ? "" : "none");
    showToast("Session resumed!", "✅");
  } catch (e) {
    showToast("Could not resume session", "❌");
  }
}
function discardResumeSession() {
  _clearSessionState();
  _renderSessionActiveCard();
}

function confirmSessionStart() {
  const players = [..._sessionSetupSelected];
  if (players.length < 2) {
    showToast("Select at least 2 players", "❌");
    return;
  }
  closeSessionSetup();
  const now = new Date().toISOString();
  _liveSessionData = {
    sessionActive: true,
    sessionPlayers: players,
    sessionStartedAt: now,
    currentMatch: null,
  };
  _sessionMatchHistory = [];
  _sessionRedoStack = [];
  _sessionPanelOpen = false;
  _syncLiveSessionBar();
  _startSessionTimer();
  _saveSessionState();
  _renderSessionActiveCard();
  _liveHaptic([20, 50, 20]);
  _notifyLiveEvent(
    "session_start",
    `Session started · ${players.length} players`,
  );
  _showLiveEventBanner({
    type: "session_start",
    msg: `Session started · ${players.length} players`,
  });
  _requestNotifPermission();
}

async function endLiveSession() {
  openSessionSummary();
}

function openAddPlayerSheet() {
  const list = document.getElementById("add-player-list");
  if (!list) return;
  const current = _liveSessionData?.sessionPlayers || [];
  const available = Object.keys(state.aliasMap)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .filter((p) => !current.includes(p));
  if (!available.length) {
    showToast("All players already in session", "✅");
    return;
  }
  list.innerHTML = available
    .map(
      (p) => `
    <button class="live-sheet-item" onclick="addPlayerToSession(${jsArg(p)})">
      ${sheetAv(p)}
      <span class="live-sheet-item-name">${escHtml(p)}</span>
    </button>`,
    )
    .join("");
  document
    .getElementById("add-player-overlay")
    ?.classList.add("live-sheet-open");
  document.getElementById("add-player-sheet")?.classList.add("live-sheet-open");
}

function closeAddPlayerSheet() {
  document
    .getElementById("add-player-overlay")
    ?.classList.remove("live-sheet-open");
  document
    .getElementById("add-player-sheet")
    ?.classList.remove("live-sheet-open");
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
  const icons = {
    session_start: "🎾",
    session_end: "🏁",
    match_start: "▶️",
    match_end: "✅",
    player_added: "➕",
  };
  showToast(msg, icons[type] || "🎾", 3500);
  if (
    document.visibilityState !== "visible" &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    try {
      new Notification("Ekta Padel 🎾", { body: msg, icon: "/icons/icon.svg" });
    } catch (e) {}
  }
}

function _requestNotifPermission() {
  if (!("Notification" in window) || Notification.permission !== "default")
    return;
  Notification.requestPermission().catch(() => {});
}

// ── MATCH NOTIFICATIONS ────────────────────────────────────
// Shows a local notification (via SW if available, falls back to
// Notification API) when new matches arrive from Firestore while the
// app is backgrounded or in a different tab.
function _sendMatchNotification(count, latestMatch) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  // Don't notify if the page is visible — the live update already visible.
  if (!document.hidden) return;
  const players = [
    ...(latestMatch?.teamA || []),
    ...(latestMatch?.teamB || []),
  ]
    .map((p) => normPlayer(p).split(" ")[0])
    .join(", ");
  const body =
    count === 1
      ? `New match added${players ? `: ${players}` : ""}`
      : `${count} new matches added`;
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "SHOW_NOTIFICATION",
      title: "Ekta Padel 🎾",
      body,
    });
  } else {
    try {
      new Notification("Ekta Padel 🎾", {
        body,
        icon: "/padel-ekta/icons/icon.svg",
      });
    } catch (e) {}
  }
}

function toggleMatchNotifications(on) {
  try {
    setNotifEnabled(on);
  } catch (e) {}
  const cb = document.getElementById("notif-toggle");
  if (cb) cb.checked = on;
  if (on && "Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().then((perm) => {
      if (perm !== "granted") {
        setNotifEnabled(false);
        if (cb) cb.checked = false;
        showToast("Notifications blocked by browser", "⚠️");
      }
    }).catch(() => {});
  }
  showToast(on ? "Match notifications on 🔔" : "Match notifications off 🔕");
}

// ── MATCH CONFIRM SHEET ────────────────────────────────────
// ── DUPLICATE MATCH CONFIRM SHEET ────────────────────────────
// ── PLAYER CRUD ──────────────────────────────────────────────
let _editingPlayerId = null;

function openPlayerEditSheet(id) {
  _editingPlayerId = id || null;
  const isNew = !id;
  const p = isNew ? { name: "", email: "", isGuest: false } : state.players[id] || {};
  const aliases = isNew ? [] : playerAliasMap[id] || [];
  const { first, last } = isNew
    ? { first: null, last: null }
    : _getPlayerDateRange(p.name, state.matches);

  document.getElementById("pes-title").textContent = isNew
    ? "ADD PLAYER"
    : "EDIT PLAYER";
  document.getElementById("pes-name").value = p.name || "";
  document.getElementById("pes-aliases").value = aliases.join(", ");
  document.getElementById("pes-email").value = p.email || "";
  document.getElementById("pes-guest").checked = !!p.isGuest;
  document.getElementById("pes-first").textContent = first
    ? fmtDate(first)
    : "—";
  document.getElementById("pes-last").textContent = last ? fmtDate(last) : "—";
  document.getElementById("pes-delete-btn").style.display = isNew
    ? "none"
    : "block";

  document
    .getElementById("player-edit-overlay")
    .classList.add("live-sheet-open");
  document.getElementById("player-edit-sheet").classList.add("live-sheet-open");
  setTimeout(() => document.getElementById("pes-name").focus(), 120);
}
window.openPlayerEditSheet = openPlayerEditSheet;

function closePlayerEditSheet() {
  document
    .getElementById("player-edit-overlay")
    .classList.remove("live-sheet-open");
  document
    .getElementById("player-edit-sheet")
    .classList.remove("live-sheet-open");
  _editingPlayerId = null;
}
window.closePlayerEditSheet = closePlayerEditSheet;

function savePlayerEdit() {
  const name = document.getElementById("pes-name").value.trim();
  const aliasesRaw = document.getElementById("pes-aliases").value.trim();
  const email = document.getElementById("pes-email").value.trim();
  const isGuest = document.getElementById("pes-guest").checked;

  if (!name) {
    alert("Display name is required");
    return;
  }

  const aliases = aliasesRaw
    ? aliasesRaw
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)
    : [];

  const id = _editingPlayerId || nextPlayerId++;
  const existing = state.players[id] || {};
  state.players[id] = { ...existing, id, name, email, isGuest };
  playerAliasMap[id] = aliases;
  rebuildNameMaps();
  saveCloudData();
  commit(); // guest flag affects which matches are "active" → recompute stats
  closePlayerEditSheet();
  renderNamesTable();
}
window.savePlayerEdit = savePlayerEdit;

function deletePlayerEntry() {
  if (!_editingPlayerId) return;
  const p = state.players[_editingPlayerId];
  if (!confirm(`Delete player "${p?.name}"?`)) return;
  delete state.players[_editingPlayerId];
  delete playerAliasMap[_editingPlayerId];
  rebuildNameMaps();
  saveCloudData();
  closePlayerEditSheet();
  renderNamesTable();
}
window.deletePlayerEntry = deletePlayerEntry;

let _dupConfirmCallback = null;
let _dupConfirmCancelCb = null;
function showDupConfirmSheet(msg, onYes, onNo) {
  _dupConfirmCallback = onYes;
  _dupConfirmCancelCb = onNo || null;
  const msgEl = document.getElementById("dup-confirm-msg");
  if (msgEl) msgEl.textContent = msg;
  const yesBtn = document.getElementById("dup-confirm-yes");
  if (yesBtn) {
    yesBtn.onclick = () => {
      const cb = _dupConfirmCallback;
      closeDupConfirmSheet(true); // confirmed=true → skip the onNo callback
      if (typeof cb === "function") cb();
    };
  }
  document
    .getElementById("dup-confirm-overlay")
    ?.classList.add("live-sheet-open");
  document
    .getElementById("dup-confirm-sheet")
    ?.classList.add("live-sheet-open");
}
// confirmed=true when user clicked Yes (skip onNo); false/omitted when Cancel/overlay tap
function closeDupConfirmSheet(confirmed = false) {
  document
    .getElementById("dup-confirm-overlay")
    ?.classList.remove("live-sheet-open");
  document
    .getElementById("dup-confirm-sheet")
    ?.classList.remove("live-sheet-open");
  _dupConfirmCallback = null;
  const cancelCb = _dupConfirmCancelCb;
  _dupConfirmCancelCb = null;
  if (!confirmed && typeof cancelCb === "function") cancelCb();
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
  document
    .getElementById("match-confirm-overlay")
    ?.classList.add("live-sheet-open");
  document
    .getElementById("match-confirm-sheet")
    ?.classList.add("live-sheet-open");
}

function closeMatchConfirmSheet() {
  document
    .getElementById("match-confirm-overlay")
    ?.classList.remove("live-sheet-open");
  document
    .getElementById("match-confirm-sheet")
    ?.classList.remove("live-sheet-open");
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
  if (rematchBtn)
    rematchBtn.style.display = _liveSessionData?.sessionActive ? "" : "none";
  document
    .getElementById("match-save-overlay")
    ?.classList.add("live-sheet-open");
  document.getElementById("match-save-sheet")?.classList.add("live-sheet-open");
}

function closeMatchSaveSheet() {
  document
    .getElementById("match-save-overlay")
    ?.classList.remove("live-sheet-open");
  document
    .getElementById("match-save-sheet")
    ?.classList.remove("live-sheet-open");
}

function confirmSaveMatch() {
  closeMatchSaveSheet();
  endLiveMatch();
}

function keepPlayingMatch() {
  closeMatchSaveSheet();
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
    const aAvatars = teamA
      .map(
        (p) =>
          `<div class="lbf-avatar" style="background:${playerColor(p)}">${playerInitials(p)}</div>`,
      )
      .join("");
    const bAvatars = teamB
      .map(
        (p) =>
          `<div class="lbf-avatar" style="background:${playerColor(p)}">${playerInitials(p)}</div>`,
      )
      .join("");
    return `<div class="live-banner-ufc">
      <div class="live-banner-corner-a${isEnd && !aWon ? " live-banner-corner-dim" : ""}">
        <div class="live-banner-corner-label">RED CORNER</div>
        <div class="lbf-avatars">${aAvatars}</div>
        ${teamA.map((p) => `<div class="live-banner-player">${escHtml(p.split(" ")[0])}</div>`).join("")}
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
        ${teamB.map((p) => `<div class="live-banner-player">${escHtml(p.split(" ")[0])}</div>`).join("")}
        ${isEnd ? `<div class="live-banner-corner-score${!aWon ? " lbf-score-win" : " lbf-score-lose"}">${scoreB}</div>` : ""}
        ${isEnd && !aWon ? `<div class="lbf-trophy">🏆</div>` : ""}
      </div>
    </div>`;
  }
  const isStart = type === "session_start";
  return `<div class="live-banner-session live-banner-session-${type}">
    <div class="lbs-particles">${Array.from({ length: 12 }, (_, i) => `<div class="lbs-particle lbs-p${i}"></div>`).join("")}</div>
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
  const onLivePage = document
    .getElementById("pg-live")
    ?.classList.contains("active");
  if (type === "match_start") {
    const cm = _liveSessionData?.currentMatch;
    if (cm?.teamA && !onLivePage) {
      showLiveBanner("match_start", "MATCH STARTING", msg, {
        teamA: cm.teamA,
        teamB: cm.teamB,
      });
    }
    return;
  }
  if (type === "match_end") {
    if (!onLivePage && event.teamA) {
      showLiveBanner("match_end_ufc", "MATCH OVER", msg, {
        teamA: event.teamA,
        teamB: event.teamB,
        scoreA: event.scoreA,
        scoreB: event.scoreB,
      });
    }
    return;
  }
  if (type === "session_start" || type === "session_end") return;
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
