import { _lightFingerprint } from "./src/domain/fingerprint.js";
import { computeStats, _normScores, ratingToSr } from "./src/domain/stats.js";
import { computeMatchASSDeltas, computeASS, computeASSTimeline } from "./src/domain/ass.js";
import {
  hasSeasonScoringReference,
  computeSeasonScoringASS,
  SEASON_SCORING_MODES,
  SEASON_SCORING_LABELS,
  SEASON_SCORING_DESCRIPTIONS,
} from "./src/domain/season-scoring.js";
import {
  computeGlicko2,
  computeGlicko2Full,
  computeMatchGlicko2Deltas,
} from "./src/domain/glicko2.js";
import {
  computeOpenSkill,
  computeOpenSkillFull,
  computeMatchOpenSkillDeltas,
  ordinal as _openSkillOrdinal,
} from "./src/domain/openskill.js";
import {
  computeFairShare,
  computeMatchFairShareDeltas,
} from "./src/domain/fairshare.js";
import {
  computeEPFull,
  computeEPTimeline,
  computeMatchEPDeltas,
  computeEPUpsets,
  computeEPProjection,
  EP_SHRINKAGE,
} from "./src/domain/ep.js";
import {
  ratingDistribution,
  competitivenessOverTime,
  ratingsByMonth,
  favouriteWinCurve,
  marginBuckets,
  fatigueByMatchOfDay,
  nemesisBunny,
  partnerLoyalty,
  attendanceStreaks,
  hallOfFameRecords,
  buildMilestoneTimeline,
  weightedMvpScore,
  streakSegments,
  rollingWinPct,
  waterfallTopMoves,
} from "./src/domain/records.js";
import {
  initParserDeps,
  parseBlock,
  parseDateHdr,
} from "./src/domain/parser.js";
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
import { buildHudGaugeSvg, getFormSparkline } from "./src/ui/charts.js";
import { state } from "./src/domain/state.js";
import {
  todayISO,
  weekISO,
  weekendRange,
  monthISO,
  lastWeekRange,
} from "./src/domain/dates.js";
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
  resolveAnimLevel,
  setAnimLevelRaw,
  getSmoothMode,
  setSmoothMode,
  getBatterySaverPref,
  setBatterySaver,
  getNotifEnabled,
  setNotifEnabled,
  getForcedOffline,
  setForcedOffline,
  getScreenshotAsk,
  setScreenshotAsk,
  getAnaHideEmpty,
  setAnaHideEmpty,
  getRankDeltaDays,
  setRankDeltaDays,
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
} from "./src/domain/selectors.js";
import {
  seasonNeedsRollover,
  computeSeasonRiserFaller,
  orderSeasonsByStart,
} from "./src/domain/season-stats.js";
import {
  initHistorySummaryDeps,
  buildHistorySummary,
} from "./src/ui/render-history-summary.js";
import { initBadgesDeps, computeBadges } from "./src/domain/badges.js";
import {
  initPairsDeps,
  getPairKey,
  getPairStats,
  getHeadToHeadStats,
  pairInMatch,
  playersOpposed,
} from "./src/domain/pairs.js";
import {
  initXpDeps,
  xpThreshold,
  getPlayerLevel,
  getPrestigeTier,
  computePlayerXP,
} from "./src/domain/xp.js";
import {
  initPlayerAnalyticsDeps,
  computeAchievements,
  computeArchetype,
  computePlayerForm,
  computePowerRankings,
  computeChemistryScores,
  computeAnalyticsPageData,
  computePartnerOpponentMatrix,
  computeOpponentBreakdown,
  computePartnerBreakdownWhenOpposed,
  computeAvgOpponentEloGap,
} from "./src/domain/player-analytics.js";
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
import {
  initPlayerDetailDeps,
  openPlayerDetail,
  streakCalDayClick,
  _dowDayRecord,
  openPlayerDetailCompare,
} from "./features/player-detail.js";
import {
  openSeasonAwardsReveal,
  seasonRevealNext,
  seasonRevealPrev,
  closeSeasonReveal,
  openPersonalSeasonRecap,
} from "./features/season-reveal.js";
import {
  openMatchIntro,
  closeMatchIntro,
  mioSkipAnimation,
  initMatchIntroDeps,
} from "./features/match-intro.js";
import { openPairDetail } from "./features/pair-detail.js";
import {
  initH2HDeps,
  computeH2HStreak,
  openH2HDetail,
  openRivalryScreen,
  renderH2HDeepDive,
} from "./features/h2h.js";
import { openShareMatchPoster, initSharePosterDeps } from "./features/share-poster.js";
import { openWeeklyDigest, initWeeklyDigestDeps } from "./features/weekly-digest.js";
import {
  openThemePicker,
  closeThemePicker,
  pickTheme,
} from "./features/theme-picker.js";
import {
  openGlobalSearch,
  closeGlobalSearch,
  _globalSearchInput,
} from "./features/global-search.js";
import { fireConfetti } from "./features/confetti.js";
import { checkMilestones, _checkAnniversaries } from "./features/milestones.js";
import {
  computeSessionStreak,
  autoSaveWeeklySnap,
  getPrevWeekRankMap,
} from "./features/weekly-stats.js";

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
import { homeFilterKey, compactFilterKey } from "./src/app/filter-state.js";
import {
  init as initCloudRepo,
  saveCloudData as _cloudRepoSave,
  trySyncNow as _cloudRepoSync,
  buildCloudPayload,
  setPendingSync,
  hasPendingSync,
  getLastLocalSaveTime,
  checkDocSize as _checkDocSize,
} from "./src/app/cloud-repo.js";
import {
  initMemoStoreDeps,
  memoStats,
  memoStatPlayerNames,
  memoPairStats,
  memoASS,
  memoASSHistory,
  memoASSPeaks,
  memoASSLows,
  invalidateAll as _invalidateAllMemos,
  clearAnalyticsCache as _clearAnalyticsCache,
  reignCache as _reignCache,
  rankPeriodCache as _rankPeriodCache,
} from "./src/app/memo-store.js";
import {
  loadDeletedMatches,
  saveDeletedMatches as _saveDeletedMatches,
} from "./src/infra/match-store.js";
import { sessionState, resetSessionState } from "./src/app/session-state.js";

// ── BACKWARD-COMPAT BRIDGES ──────────────────────────────────
// Internal functions that have been extracted to domain/app modules.
// The thin wrappers below keep every existing call site in app.js working
// without touching its 500 call sites — each line is a single indirection
// that the JS engine inlines at steady state.
//
// Naming convention:
//   Functions moved to src/domain/players.js    → delegate via _normPlayer etc.
//   Functions moved to src/infra/match-store.js → now imported directly above.
//   Functions moved to src/app/memo-store.js    → delegate via memoASS etc.
//   Functions moved to src/app/cloud-repo.js    → delegate via _cloudRepo*.
//
// These wrappers exist ONLY for the transition period. When app.js is further
// split into page modules (see ARCHITECTURE.md roadmap), each page module will
// import from the canonical source directly and the wrappers can be removed.

function normPlayer(name) {
  return _normPlayer(name);
}
function rebuildNameMaps() {
  return _rebuildNameMaps(state.players, playerAliasMap);
}
function getAllPlayerNamesFromMatches() {
  return _getAllPlayerNames(state.matches);
}
function _memoStats() {
  return memoStats();
}
function _statPlayerNames() {
  return memoStatPlayerNames();
}
function _memoPairStats() {
  return memoPairStats();
}
function _memoASS() {
  return memoASS();
}
function _memoASSHistory() {
  return memoASSHistory();
}
function _memoASSPeaks() {
  return memoASSPeaks();
}
function _memoASSLows() {
  return memoASSLows();
}

// ── MASTER SCORING MODE ─────────────────────────────────────
// ASS (Ankit Scoring System) is the sole scoring system. These wrappers are
// kept so the ~200 existing call sites app-wide (home cards, summary
// leaderboard, analytics, history deltas) don't need touching individually.
const _scoringMode = "ass";

function _activeScoreMap() {
  return _statsRatingMap(activeMatches());
}
// Statistics-page timeline, following the scoring picker. activeMatches() is
// itself memoised and returns a stable reference until invalidated, so using
// it as part of the cache key recomputes exactly once per data or system
// change rather than once per section that asks for it.
let _statsTimelineCache = null;
function _activeTimeline() {
  const ms = activeMatches();
  if (
    _statsTimelineCache &&
    _statsTimelineCache.system === _scoringSystem &&
    _statsTimelineCache.matches === ms
  )
    return _statsTimelineCache.tl;
  const tl = _statsTimeline(ms);
  _statsTimelineCache = { system: _scoringSystem, matches: ms, tl };
  return tl;
}
function _activeHistory() {
  return _activeTimeline().history;
}
function _activePeaks() {
  return _activeTimeline().peaks;
}
function _activeLows() {
  return _activeTimeline().lows;
}
function _activeStats() {
  const assMap = _memoASS();
  return _memoStats()
    .slice()
    .sort((a, b) => (assMap[b.name] || 0) - (assMap[a.name] || 0));
}
function _scoringLabel() {
  // Statistics section titles follow the Summary tab's picker, so "ASS
  // Rankings" and the ASS leaderboard always mean the same engine.
  return SCORING_SYSTEM_LABELS[_scoringSystem] || "ASS";
}
function saveCloudData(opts) {
  return _cloudRepoSave(opts);
}
// NOTE: saveCloudData is reassigned ~1150 lines below once _lastLocalSaveTime
// and _invalidateEloMemo are available. That version is the one callers use.
function _trySyncNow() {
  return _cloudRepoSync();
}
function _setPendingSync(flag) {
  return setPendingSync(flag);
}
function _hasPendingSync() {
  return hasPendingSync();
}

// Filter-state bridges: keep old bare variable names working.
// app.js accesses these as mutable variables; reading through getters is
// equivalent. The setters at each mutation site already update the filter
// objects in filter-state.js. Remaining direct reads use the bridged getters.
function _homeFilterKey() {
  return homeFilterKey();
}
function _compactFilterKey() {
  return compactFilterKey();
}

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
      // ✅ Check if page is still active (fix race condition on page switch)
      const stillActive = document.querySelector(".page.active")?.id === id;
      if (!stillActive) {
        _ptrRefreshing = false;
        return;
      }

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
    if (
      e.touches &&
      e.touches.length > 1 &&
      typeof e.scale === "number" &&
      e.scale !== 1
    )
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

// ── STATE ──────────────────────────────────────────────────
// allMatches now lives in shared state.matches (./state.js)
// nameMap now lives in shared state (./state.js)
// aliasMap now lives in shared state (./state.js)
// Source-of-truth player roster (replaces aliasMap/nameMap as stored data)
// players now lives in shared state.players (./state.js) // { [id]: { id, name, email, image, isGuest } }
let playerAliasMap = {}; // { [id]: [alias1, alias2, ...] }
let nextPlayerId = 1;

// ✅ PERFORMANCE: Batch localStorage reads at init time (not scattered throughout)
const _INIT_STORAGE = (() => {
  const cache = {};
  try {
    const keys = [
      "padel_active_season",
      "padel_seasons",
      "summaryMode",
      "padel-exclude-players",
      "padel_cmp_hidden_cols_v3",
      "padel_cmp_col_migrate_v5",
      "smooth_mode",
    ];
    keys.forEach((k) => {
      cache[k] = localStorage.getItem(k);
    });
  } catch (e) {}
  return cache;
})();

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
  _activeSeasonId = _INIT_STORAGE["padel_active_season"] || "all";
  state.seasons = JSON.parse(_INIT_STORAGE["padel_seasons"] || "[]") || [];
} catch (e) {}
_applyAutoSeason(); // override with the ongoing season if auto-select is on
let _dataVersion = 0;
let _homeRenderedVersion = -1,
  _homeRenderedFilter = "";
let _compactRenderedVersion = -1,
  _compactRenderedFilter = "";
// ASS is the sole scoring system — no more Summary-tab-local mode toggle.
const _summaryMode = "ass";
let _matchDeltaWindow = "alltime"; // "alltime" | "today"
let _topGainersWindow = "today"; // "alltime" | "today" — HIGHLIGHTS card's Top Points Gainers
// Season-carryover scoring variant for the Summary tab leaderboard — "reset"
// (default, unchanged behaviour), "flip", or "fair". Only takes
// effect on the ALL TIME view of a season that has a valid reference (prior)
// season; every other surface keeps using the canonical per-season computeASS.
let _seasonScoringMode = "reset";
try {
  const _stored = localStorage.getItem("padel_season_scoring_mode");
  if (_stored && SEASON_SCORING_MODES.includes(_stored)) _seasonScoringMode = _stored;
} catch (e) {}

// Summary-tab scoring SYSTEM — "ep" (default), "ass", "glicko2", "openskill"
// or "fairshare". Independent of _seasonScoringMode: the Flip/Fair
// season-carryover variants are ASS-CLASSIC-specific and only apply when this
// is "ass" (the picker hides them otherwise, and a stored format preference is
// preserved and simply re-applies if ASS CLASSIC is selected again).
// The stored keys are deliberately left alone: "ass" still means the original
// margin×opponent-strength engine (the archived Season 1 snapshot records
// scoringMode "ass", and the Flip/Fair season formats are built on its maths),
// while "ep" is the 0-based Earned Points engine. Only the DISPLAY names swap —
// Earned Points now carries the house name and the original becomes CLASSIC.
const SCORING_SYSTEMS = ["ep", "ass", "glicko2", "openskill", "fairshare"];
const SCORING_SYSTEM_LABELS = { ass: "ASS CLASSIC", glicko2: "GLICKO-2", openskill: "OPENSKILL", fairshare: "FAIR SHARE", ep: "ASS" };
// Systems that fill the extra numeric column beside the rating — a "±"
// confidence band for Glicko-2/OpenSkill, total points earned for EP (whose
// headline number is a per-match average, so the total is worth surfacing).
const SCORING_SYSTEMS_WITH_CONFIDENCE = ["glicko2", "openskill", "ep"];
// 0-based systems: no 1000 baseline, and the headline number is small enough
// that the decimal carries real ordering information.
const SCORING_SYSTEMS_ZERO_BASED = ["ep"];
// SR is a friendly band. The default converter (ratingToSr) subtracts a
// fixed 700 baseline, which only makes sense for the 1000-centred engines —
// a 0-based rating put through it lands the entire field around −11.
//
// For 0-based systems, SR is instead a MIN-MAX scale over the current field:
// whoever has the lowest rating in `ratingMap` reads 1.0, the highest reads
// 10.0, everyone else spaced proportionally between. This mirrors ratings
// (green above the middle, red below) rather than a fixed absolute scale —
// a top scorer's 10.0 reflects being best in THIS field right now, not a
// fixed skill benchmark, so it isn't meant to compare across seasons/filters.
function _minMaxSrFn(ratingMap) {
  const vals = Object.values(ratingMap || {}).filter(Number.isFinite);
  if (!vals.length) return () => 0;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min;
  return (rating) => {
    if (!Number.isFinite(rating)) return 0;
    if (range <= 0) return 10;
    return parseFloat((1 + (9 * (rating - min)) / range).toFixed(2));
  };
}
function _srFnForSystem(system, ratingMap) {
  return SCORING_SYSTEMS_ZERO_BASED.includes(system)
    ? _minMaxSrFn(ratingMap)
    : ratingToSr;
}
// Stand-in rating for a player missing from the active system's map — the
// baseline for 1000-centred engines, zero for the 0-based ones (where 1000
// would sort an unrated player straight to the top).
function _ratingDefault(system = _scoringSystem) {
  return SCORING_SYSTEMS_ZERO_BASED.includes(system) ? 0 : 1000;
}
let _scoringSystem = "ep";
try {
  const _storedSys = localStorage.getItem("padel_scoring_system");
  // A device still carrying the OLD default ("ass") predates the rename, when
  // picking "ASS" meant "the house system" rather than this specific engine.
  // The house name now belongs to Earned Points, so move those devices across
  // once — otherwise the new default would never reach anyone who has ever
  // opened the picker. Runs at most once; deliberately choosing ASS CLASSIC
  // afterwards writes "ass" again and sticks, and every other system is left
  // untouched.
  if (_storedSys === "ass" && !localStorage.getItem("padel_scoring_renamed_v1")) {
    localStorage.setItem("padel_scoring_renamed_v1", "1");
    localStorage.setItem("padel_scoring_system", "ep");
  } else if (_storedSys && SCORING_SYSTEMS.includes(_storedSys)) {
    _scoringSystem = _storedSys;
  }
} catch (e) {}

// Dispatchers so renderCompact() (and the FIRST/LAST window helper) don't
// need a system-specific branch at every call site. `full` returns the raw
// per-system detail object ({r,rd,vol} / {mu,sigma} / null for ASS, which has
// no confidence concept) so the flat rating + the "±" confidence column can
// both be derived from ONE engine walk instead of two.
// EP needs the full cross-season history alongside whatever window is being
// scored: points restart at 0 every season/filter, but loss accountability is
// driven by CAREER games, so a veteran must not read as a rookie just because
// the leaderboard is scoped to this month.
function _epCareerMatches() {
  return withoutGuestMatches(state.matches);
}
function _fullRatingForSystem(system, matches) {
  if (system === "glicko2") return computeGlicko2Full(matches);
  if (system === "openskill") return computeOpenSkillFull(matches);
  if (system === "ep") return computeEPFull(matches, _epCareerMatches());
  return null;
}
function _flatRatingForSystem(system, matches, full) {
  if (system === "glicko2") {
    const out = {};
    Object.keys(full).forEach((n) => (out[n] = full[n].r));
    return out;
  }
  if (system === "openskill") {
    const out = {};
    Object.keys(full).forEach((n) => (out[n] = full[n].mu));
    return out;
  }
  if (system === "ep") {
    const out = {};
    Object.keys(full).forEach((n) => (out[n] = full[n].score));
    return out;
  }
  if (system === "fairshare") return computeFairShare(matches);
  return computeASS(matches);
}
// "±" confidence band shown next to the rating for Glicko-2/OpenSkill — RD for
// Glicko-2 (its own native uncertainty unit), ±3σ for OpenSkill (its own
// recommended conservative-estimate offset). null for ASS (no such concept).
function _confidenceForSystem(system, full) {
  if (!full) return null;
  const out = {};
  if (system === "glicko2") {
    Object.keys(full).forEach((n) => (out[n] = Math.round(full[n].rd)));
  } else if (system === "openskill") {
    Object.keys(full).forEach((n) => (out[n] = Math.round(3 * full[n].sigma)));
  } else if (system === "ep") {
    Object.keys(full).forEach((n) => (out[n] = full[n].ep));
  }
  return out;
}
function _matchDeltasForSystem(system, matches) {
  if (system === "glicko2") return computeMatchGlicko2Deltas(matches);
  if (system === "openskill") return computeMatchOpenSkillDeltas(matches);
  if (system === "fairshare") return computeMatchFairShareDeltas(matches);
  if (system === "ep") return computeMatchEPDeltas(matches, _epCareerMatches());
  return computeMatchASSDeltas(matches);
}

// ── STATISTICS PAGE RATING SOURCE ───────────────────────────
// The Statistics page follows whichever engine the Summary tab's picker has
// selected, so a section titled "<system> Rankings" always means the same
// number as the leaderboard. The sections whose maths was ASS CLASSIC's
// specifically (Win Probability, Biggest Upsets, Underdog Leaderboard, Match
// Simulator, Rating Projection, What-If Simulator) were removed entirely
// rather than pinned — see docs/ass-classic-scoring.md for what they did and
// why they didn't just rewire onto the new engine. The internal ELO walk
// behind Prediction Accuracy is left alone: that models match outcomes, not
// the displayed rating.
function _statsLabel() {
  return SCORING_SYSTEM_LABELS[_scoringSystem];
}
function _statsRatingMap(matches) {
  return _flatRatingForSystem(
    _scoringSystem,
    matches,
    _fullRatingForSystem(_scoringSystem, matches),
  );
}
function _statsSrFn(ratingMap) {
  return _srFnForSystem(_scoringSystem, ratingMap);
}
function _statsDefault() {
  return _ratingDefault(_scoringSystem);
}
// Ratings display as whole numbers on the 1000-centred engines, but the
// 0-based ones need a decimal — a 0.4 gap there is a real placing difference,
// and unrounded floats would otherwise render as 44.36065573770492.
// Badge thresholds are expressed on the 1000-centred scale. An engine whose
// field spans ~50 points needs the underdog margin scaled to match, or the
// upset badges can never fire.
function _statsBadgeOpts() {
  const zero = SCORING_SYSTEMS_ZERO_BASED.includes(_scoringSystem);
  return {
    ratingFn: _statsRatingMap,
    baseline: _statsDefault(),
    underdogGap: zero ? 2 : 30,
    ratingLabel: _statsLabel(),
  };
}
// Every "ASS" (EP) number shown anywhere in the app funnels through this
// one function — the display is doubled here (e.g. a 46.7 rating prints as
// 93.4) so the doubled figure is what the user sees consistently everywhere:
// leaderboard, Player Detail, History, Match Intro, Session Dashboard, etc.
// Doubling is a pure linear scale-up, so every value BUILT from ratings via
// addition/subtraction/averaging (deltas, peaks/lows, projections, "vs
// average" coloring, min-max SR) stays internally consistent whether it's
// doubled once here at print time or if each input were doubled beforehand.
const _ASS_DISPLAY_MULT = 2;
function _statsFmt(v) {
  if (v == null || !Number.isFinite(v)) return "—";
  return SCORING_SYSTEMS_ZERO_BASED.includes(_scoringSystem)
    ? (v * _ASS_DISPLAY_MULT).toFixed(2)
    : String(Math.round(v));
}
// Generic running-total timeline for the engines that don't ship one. Every
// delta map exposes the same { playerDeltas } shape, so accumulating them from
// the system's baseline reproduces what a bespoke timeline would walk.
function _timelineFromDeltas(matches, deltaMap, base) {
  const running = {};
  const history = {};
  const peaks = {};
  const lows = {};
  [...matches]
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .forEach((m) => {
      const entry = deltaMap.get(m);
      if (!entry) return;
      const aWon = m.scoreA > m.scoreB;
      const record = (p, won, opponent, mine, theirs) => {
        if (!(p in running)) {
          running[p] = base;
          history[p] = [];
          peaks[p] = base;
          lows[p] = base;
        }
        const d = entry.playerDeltas[p] || 0;
        running[p] += d;
        history[p].push({
          date: m.date,
          elo: running[p],
          delta: d,
          won,
          opponent,
          scoreA: mine,
          scoreB: theirs,
        });
        if (running[p] > peaks[p]) peaks[p] = running[p];
        if (running[p] < lows[p]) lows[p] = running[p];
      };
      (m.teamA || []).forEach((p) =>
        record(p, aWon, (m.teamB || []).join(" & "), m.scoreA, m.scoreB),
      );
      (m.teamB || []).forEach((p) =>
        record(p, !aWon, (m.teamA || []).join(" & "), m.scoreB, m.scoreA),
      );
    });
  return { history, peaks, lows };
}
function _statsTimeline(matches) {
  if (_scoringSystem === "ass") return computeASSTimeline(matches);
  if (_scoringSystem === "ep")
    return computeEPTimeline(matches, _epCareerMatches());
  return _timelineFromDeltas(
    matches,
    _matchDeltasForSystem(_scoringSystem, matches),
    1000,
  );
}
// Upsets (weaker team won), following the picker where a bespoke temporal
// walk exists for the active engine. `ep` gets its own (computeEPUpsets,
// same career-aware internal walk that prices every match). Every other
// system falls back to the classic ASS walk (_computeUpsets) — there's no
// equivalent per-match temporal model for Glicko-2/OpenSkill/Fair Share in
// this codebase, so that's a known limitation, not a picker bug: the
// important case (the new default, "ep") is fully accurate.
function _statsUpsets(matches) {
  if (_scoringSystem === "ep") return computeEPUpsets(matches, _epCareerMatches());
  return _computeUpsets(matches).map((u) => ({ ...u, gap: u.assGap }));
}

// System-agnostic win probability, used by anything that needs to compare
// two teams live (Live Win Probability Meter, Auto-Rotation team suggester).
// Rather than a fixed 400-point ELO-logistic divisor — calibrated to a
// 1000-centred scale and nearly flat on a 0-based engine's small score
// range — this works off each player's SR, which is ALREADY on a common
// ~0-10 band for every engine (computeStats' srFn: the 1000-centred
// engines' fixed (rating-700)/60, or the 0-based engines' per-field
// min-max). 400 ELO points is the classic ~91%-favourite benchmark; on the
// SR scale that's 400/60 ≈ 6.67 SR points, so the divisor here reproduces
// the same "feel" regardless of which engine is active.
const _SR_LOGISTIC_DIVISOR = 400 / 60;
function _statsTeamSr(players, ratingMap, srFn) {
  if (!players.length) return 0;
  const vals = players.map((p) => srFn(ratingMap[p] ?? _statsDefault()));
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}
// Returns team A's win probability (0-1) given two rosters, scoped to the
// full active player pool so a 0-based engine's min-max SR is computed
// against everyone, not just these 4 — otherwise two closely-matched
// players would always land at opposite ends of a synthetic 1-10 range.
function _statsWinProb(teamA, teamB) {
  const ratingMap = _statsRatingMap(activeMatches());
  const srFn = _statsSrFn(ratingMap);
  const srA = _statsTeamSr(teamA, ratingMap, srFn);
  const srB = _statsTeamSr(teamB, ratingMap, srFn);
  return 1 / (1 + Math.pow(10, (srB - srA) / _SR_LOGISTIC_DIVISOR));
}
let _addRenderedVersion = -1;
let _anaRenderedVersion = -1;
let _anaRenderedFilter = "";
let _histRenderedVersion = -1,
  _histRenderedFilter = "";
let _excludedPlayers = new Set(
  (() => {
    try {
      return JSON.parse(_INIT_STORAGE["padel-exclude-players"] || "[]");
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
let _pvpLow = 20,
  _pvpHigh = 32; // partner % color thresholds: red ≤ low, low < orange ≤ high, green > high
let cmpSortKey = "ass";
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
  { key: "ass", label: "ASS" },
];
function _loadCmpHiddenCols() {
  try {
    const s = _INIT_STORAGE["padel_cmp_hidden_cols_v3"];
    if (s) return new Set(JSON.parse(s));
  } catch (e) {}
  return new Set([]);
}
let _cmpHiddenCols = _loadCmpHiddenCols();
// One-time migration (v5): always show both ELO and ASS columns by default,
// regardless of the active scoring toggle. Clears any previously-hidden
// scoring column from saved state.
if (!_INIT_STORAGE["padel_cmp_col_migrate_v5"]) {
  _cmpHiddenCols.delete("elo");
  _cmpHiddenCols.delete("ass");
  localStorage.setItem(
    "padel_cmp_hidden_cols_v3",
    JSON.stringify([..._cmpHiddenCols]),
  );
  localStorage.setItem("padel_cmp_col_migrate_v5", "1");
}
let prevPage = "home";
let lastMatchSnapshot = null;
let _forcedOffline = getForcedOffline();
let _firestoreUnsub = null;
let _emailTimer = null;

// ── Live/session state — now owned by src/app/session-state.js ─────────
// The imported sessionState object holds the data; the legacy bare-variable
// names below alias its fields so the 200+ call sites in app.js keep
// compiling without renaming. When a page module is extracted for the
// live-session feature, it will import from session-state.js directly and
// these aliases can be removed.
let _liveSessionData = null; // aliased separately — set by loadCloudData
const _liveSlots = { a1: null, a2: null, b1: null, b2: null };
let _liveScoreA = 0;
let _liveScoreB = 0;
let _liveActiveSlot = null;
let _liveRaceTo = 4; // "race to" threshold: 4 or 6

// sessionState field aliases — call sites use these bare names; they read/write
// through to the canonical sessionState object so resetSessionState() stays atomic.
// Arrays/Sets are aliased by reference (mutations propagate automatically).
// Scalar aliases use Object.defineProperty so ++ / = writes propagate too.
Object.defineProperty(globalThis, "_sessionMatchHistory", {
  get() {
    return sessionState.matchHistory;
  },
  set(v) {
    sessionState.matchHistory = v;
  },
  configurable: true,
});
Object.defineProperty(globalThis, "_sessionRedoStack", {
  get() {
    return sessionState.redoStack;
  },
  set(v) {
    sessionState.redoStack = v;
  },
  configurable: true,
});
Object.defineProperty(globalThis, "_sessionPendingCount", {
  get() {
    return sessionState.pendingCount;
  },
  set(v) {
    sessionState.pendingCount = v;
  },
  configurable: true,
});
Object.defineProperty(globalThis, "_sessionPanelOpen", {
  get() {
    return sessionState.panelOpen;
  },
  set(v) {
    sessionState.panelOpen = v;
  },
  configurable: true,
});
// _sessionSetupSelected — reassigned at mutation sites; use property alias via globalThis
Object.defineProperty(globalThis, "_sessionSetupSelected", {
  get() {
    return sessionState.setupSelected;
  },
  set(v) {
    sessionState.setupSelected = v;
  },
  configurable: true,
});
// Timer interval handle for the session elapsed-time display — scalar, direct let.
let _sessionTimerInterval = null;
let _sdashShowGuests = true; // scoreboard guest-filter toggle
let _sessSortCol = "sr"; // active sort column key
let _sessSortDir = "desc"; // "asc" | "desc"

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
    if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA"))
      return true;
  } catch (e) {}
  return false;
};
const _animLevel0 = resolveAnimLevel();
if (_animLevel0 === "medium" || _animLevel0 === "off")
  document.body.classList.add("no-cascade");
if (_animLevel0 === "off") document.body.classList.add("no-anim");
// Smooth mode: default ON if no saved pref
{
  if (_INIT_STORAGE["smooth_mode"] === null) setSmoothMode(true);
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
// Deleted matches now live in src/infra/match-store.js.
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
  const trimmed = deletedMatches.filter(
    (d) => (d.deletedAt || "") >= cutoffISO,
  );
  deletedMatches.length = 0;
  trimmed.forEach((m) => deletedMatches.push(m));
  _saveDeletedMatches(deletedMatches);
}
// Provide the old names so no call site changes.
const DELETED_KEY = "padel_deleted"; // kept for any external tooling references
function saveDeletedMatches() {
  _saveDeletedMatchesTrimmed();
}

// ── STATS/ASS MEMO ─────────────────────────────────────────
// All ASS/stats memoisation is now owned by src/app/memo-store.js.
// _reignCache / _rankPeriodCache are imported at the top of this file as
// named exports from memo-store.js; references in the analytics/rank sections
// below continue to work via those bound names.
// Getters (not the objects) so the parser always sees the current maps —
// nameMap/aliasMap are reassigned on data load.
initParserDeps(
  () => state.nameMap,
  () => state.aliasMap,
  todayISO,
);
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
initHistorySummaryDeps({
  normPlayer,
  getPairStats,
  memoAss: _memoASS,
  ratingMap: (ms) => _statsRatingMap(ms),
  ratingDefault: () => _statsDefault(),
  ratingFmt: (v) => _statsFmt(v),
  ratingLabel: () => _statsLabel(),
  // TODAY needs a genuinely blind score for EP — computeEPFull always warms
  // from the full career (_epCareerMatches()) regardless of the matches it's
  // handed, so a "fresh session" has to explicitly hand itself as its own
  // career too. Every other engine's own ratingMap is already blind-by
  // -construction when given only `ms`, so it's reused as-is.
  freshRatingMapFn: (ms) =>
    _scoringSystem === "ep"
      ? _flatRatingForSystem("ep", ms, computeEPFull(ms, ms))
      : _statsRatingMap(ms),
  topGainersWindow: () => _topGainersWindow,
});
// Share match poster — same rating-picker contract as everywhere else.
initSharePosterDeps({
  ratingMap: (ms) => _statsRatingMap(ms),
  ratingDefault: () => _statsDefault(),
  ratingFmt: (v) => _statsFmt(v),
});
initWeeklyDigestDeps({
  ratingMap: (ms) => _statsRatingMap(ms),
  ratingDefault: () => _statsDefault(),
  ratingFmt: (v) => _statsFmt(v),
  ratingLabel: () => _statsLabel(),
});
// Award badges: pure compute, fed the stats/ass/pair + date helpers it needs.
// Pairs engine — normPlayer injected; getPairStats/etc. now exported from pairs.js.
initPairsDeps({ normPlayer });
// XP / Level / Prestige — computePlayerXP needs normPlayer + activeMatches +
// the three match-type helpers (isFireMatch/isDominating/isZero) from render-match-rows.
initXpDeps({
  normPlayer,
  activeMatches,
  isFireMatch,
  isDominatingMatch,
  isZeroMatch,
});
// Analytics section builders — HTML generators for the Statistics page.
initBadgesDeps({
  computeStats,
  computeElo: computeASS,
  getPairStats,
  lastWeekRange,
  fmtDate,
});
// Player analytics (form/archetype/power/chemistry/stories/achievements).
initPlayerAnalyticsDeps({ getPairStats, toLocalISODate });
// Player detail modal — needs playerAvatar which accesses the photoMap in app.js.
initPlayerDetailDeps({
  playerAvatar,
  getScoringMode: () => _scoringMode,
  // Follow the Summary tab's scoring picker, so a player's card and their
  // detail sheet never disagree about what their rating is.
  ratingMap: (ms) => _statsRatingMap(ms),
  ratingHistory: () => _activeHistory(),
  ratingPeaks: () => _activePeaks(),
  ratingLows: () => _activeLows(),
  srFn: (ratingMap) => _statsSrFn(ratingMap),
  ratingDefault: () => _statsDefault(),
  ratingFmt: (v) => _statsFmt(v),
  ratingLabel: () => _statsLabel(),
  matchDeltasFn: (ms) => _matchDeltasForSystem(_scoringSystem, ms),
});
// H2H modals — same playerAvatar dependency.
initH2HDeps({ playerAvatar });
// Match Intro overlay — same "follow the Summary tab's picker" contract as
// Player Detail's rating accessors above.
initMatchIntroDeps({
  ratingMap: (ms) => _statsRatingMap(ms),
  ratingDefault: () => _statsDefault(),
  ratingFmt: (v) => _statsFmt(v),
  ratingLabel: () => _statsLabel(),
  isZeroBased: () => SCORING_SYSTEMS_ZERO_BASED.includes(_scoringSystem),
});

// ── One-time module initialisations ────────────────────────
// memo-store needs the app-level data-version counter and ELO config.
initMemoStoreDeps({
  getDataVersion: () => _dataVersion,
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
// _memoASS / _memoStats / _memoPairStats / _memoASSHistory / _memoASSPeaks /
// _memoASSLows — backward-compat bridges at top of file delegate to them.

function _invalidateStatsMemo() {
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
    container.innerHTML = loadingState({
      message: "Loading analytics…",
      size: "lg",
    });
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
    _invalidateStatsMemo();
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
        _ensureMatchIds(incoming);
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
            _invalidateStatsMemo();
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
        _invalidateStatsMemo();
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

// ── MATCH IDS ────────────────────────────────────────────────
// Every match created from here on gets a permanent unique id, so undo/edit/
// delete/reorder can target the exact match instead of a content hash (two
// identical-score rematches in one session used to resolve to the wrong entry).
function _genMatchId() {
  return "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
// Backfills `.id` on any match loaded from before this feature existed.
// Mutates in place; returns true if any id was newly assigned.
function _ensureMatchIds(matches) {
  let changed = false;
  (matches || []).forEach((m) => {
    if (!m.id) {
      m.id = _genMatchId();
      changed = true;
    }
  });
  return changed;
}

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
    _ensureMatchIds(state.matches);
    state.players = pls;
    playerAliasMap = pam;
    nextPlayerId = npid || 1;
    rebuildNameMaps();
    _invalidateStatsMemo();
    autoSaveWeeklySnap();
    if (window.appCache)
      window.appCache.save(
        state.matches,
        state.players,
        playerAliasMap,
        nextPlayerId,
      );

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
  if (window.isAdmin)
    setTimeout(_maybeBackup, 6000); // once data has loaded
  else {
    if (_emailTimer) {
      clearTimeout(_emailTimer);
      _emailTimer = null;
    }
    if (_driveBackupTimer) {
      clearTimeout(_driveBackupTimer);
      _driveBackupTimer = null;
    }
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
  if (scToggle) scToggle.checked = getScreenshotAsk();
  const rdSel = document.getElementById("rankDeltaDaysSel");
  if (rdSel) rdSel.value = String(getRankDeltaDays());
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
  // Re-render session panel so admin action buttons appear after auth resolves
  if (_sessionPanelOpen) _updateSessionPanel();
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
  } else if (curPage?.id === "pg-analytics") {
    // Leaving Statistics — it's load-on-demand only, so drop its cached
    // computations rather than let them sit in memory until data changes.
    _clearAnalyticsCache();
    _anaRenderedVersion = -1;
    _anaRenderedFilter = "";
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
      _swipeCard.classList.remove(
        "swipe-revealed",
        "swipe-revealed-r",
        "swiping",
      );
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
    const todayMatches = state.matches.filter((m) => m.date === todayISO());
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
  _checkDocSize(_buildCloudPayload());
  renderBackupHealthCard();
  renderStorageBreakdownCard();
  renderPlayerMergeCard();
  renderASSFormulaCard();
  renderAuditLogCard();
}

// ── ADMIN AUDIT LOG ──────────────────────────────────────────
// Lightweight local log of admin mutations — not a full undo history, just
// a "what happened and when" trail for the Manage tab.
const ADMIN_LOG_KEY = "padel_admin_audit_log";
function logAdminAction(action, detail) {
  let log = [];
  try {
    log = JSON.parse(localStorage.getItem(ADMIN_LOG_KEY)) || [];
  } catch (e) {}
  log.unshift({ action, detail, at: new Date().toISOString() });
  if (log.length > 100) log.length = 100;
  try {
    localStorage.setItem(ADMIN_LOG_KEY, JSON.stringify(log));
  } catch (e) {}
}
function renderAuditLogCard() {
  const el = document.getElementById("audit-log-body");
  if (!el) return;
  let log = [];
  try {
    log = JSON.parse(localStorage.getItem(ADMIN_LOG_KEY)) || [];
  } catch (e) {}
  if (!log.length) {
    el.innerHTML =
      '<div class="sub" style="padding:8px">No admin actions logged yet.</div>';
    return;
  }
  const rows = log
    .slice(0, 20)
    .map((e) => {
      const d = new Date(e.at);
      const when = isNaN(d)
        ? ""
        : d.toLocaleString("en-GB", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          });
      return `<div style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
        <div style="font-size:10px;flex:1"><b>${escHtml(e.action)}</b> ${escHtml(e.detail || "")}</div>
        <div style="font-size:9px;color:var(--muted);flex-shrink:0">${when}</div>
      </div>`;
    })
    .join("");
  el.innerHTML = rows;
}

// ── BACKUP HEALTH DASHBOARD ──────────────────────────────────
function renderBackupHealthCard() {
  const el = document.getElementById("backup-health-body");
  if (!el) return;
  const emailDate = localStorage.getItem("padel_last_backup");
  const driveDate = localStorage.getItem(_DRIVE_BACKUP_KEY);
  const today = todayISO();
  const daysSince = (d) =>
    d ? Math.round((new Date(today) - new Date(d)) / 86400000) : null;
  const statusOf = (days) =>
    days == null
      ? { col: "var(--red)", label: "Never" }
      : days === 0
        ? { col: "var(--green)", label: "Today" }
        : days <= 3
          ? { col: "var(--gold)", label: `${days}d ago` }
          : { col: "var(--red)", label: `${days}d ago` };
  const eStat = statusOf(daysSince(emailDate));
  const dStat = statusOf(daysSince(driveDate));
  const kb = window._docSizeKB || 0;
  const row = (
    icon,
    label,
    stat,
  ) => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
    <span style="font-size:16px">${icon}</span>
    <span style="flex:1;font-size:11px;font-weight:700">${label}</span>
    <span style="width:8px;height:8px;border-radius:50%;background:${stat.col};flex-shrink:0"></span>
    <span style="font-size:10px;font-weight:800;color:${stat.col};width:52px;text-align:right">${stat.label}</span>
  </div>`;
  el.innerHTML =
    row("📧", "Email Backup", eStat) +
    row("☁️", "Drive Backup", dStat) +
    `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:10px;color:var(--muted)"><span>Cloud doc size</span><span>${kb} KB</span></div>`;
}

// ── STORAGE BREAKDOWN DONUT ──────────────────────────────────
function renderStorageBreakdownCard() {
  const el = document.getElementById("storage-breakdown-body");
  if (!el) return;
  const payload = _buildCloudPayload();
  const sizeOf = (v) => {
    try {
      return new Blob([JSON.stringify(v)]).size;
    } catch (e) {
      return 0;
    }
  };
  const parts = [
    { label: "Matches", bytes: sizeOf(payload.matches), col: "#5cd0ff" },
    {
      label: "Players",
      bytes: sizeOf(payload.players) + sizeOf(payload.playerAliasMap),
      col: "#a78bfa",
    },
    { label: "Seasons", bytes: sizeOf(payload.seasons), col: "#f5c842" },
    { label: "Photos", bytes: sizeOf(photoMap), col: "#ff7a3d" },
  ].filter((p) => p.bytes > 0);
  if (!parts.length) {
    el.innerHTML = '<div class="sub" style="padding:8px">No data yet.</div>';
    return;
  }
  const total = parts.reduce((s, p) => s + p.bytes, 0) || 1;
  let offset = 0;
  const R = 34,
    C = 2 * Math.PI * R;
  const segs = parts
    .map((p) => {
      const len = (p.bytes / total) * C;
      const seg = `<circle cx="42" cy="42" r="${R}" fill="none" stroke="${p.col}" stroke-width="14" stroke-dasharray="${len.toFixed(1)} ${(C - len).toFixed(1)}" stroke-dashoffset="${(-offset).toFixed(1)}" transform="rotate(-90 42 42)"/>`;
      offset += len;
      return seg;
    })
    .join("");
  const legend = parts
    .map(
      (p) =>
        `<div style="display:flex;align-items:center;gap:6px;font-size:10px;padding:3px 0"><span style="width:9px;height:9px;border-radius:2px;background:${p.col};flex-shrink:0"></span><span style="flex:1">${p.label}</span><span style="color:var(--muted)">${Math.round(p.bytes / 1024)} KB</span></div>`,
    )
    .join("");
  el.innerHTML = `<div style="display:flex;align-items:center;gap:14px">
    <svg width="84" height="84" viewBox="0 0 84 84" style="flex-shrink:0">${segs}</svg>
    <div style="flex:1">${legend}</div>
  </div>
  <div style="text-align:center;font-size:9px;color:var(--muted);margin-top:6px">${Math.round(total / 1024)} KB total</div>`;
}

// ── DATA HEALTH CHECK ────────────────────────────────────────
window.runDataHealthCheck = function () {
  const el = document.getElementById("data-health-body");
  if (!el) return;
  const issues = [];
  const seen = new Map();
  state.matches.forEach((m, i) => {
    const key = _mkMatchKey(m);
    if (seen.has(key)) {
      issues.push({
        type: "dup",
        msg: `Duplicate: ${(m.teamA || []).join("/")} vs ${(m.teamB || []).join("/")} on ${fmtDate(m.date)}`,
        idx: i,
      });
    } else seen.set(key, i);
  });
  state.matches.forEach((m, i) => {
    const a = Number(m.scoreA),
      b = Number(m.scoreB);
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0 || a === b) {
      issues.push({
        type: "score",
        msg: `Bad score ${m.scoreA}-${m.scoreB}: ${(m.teamA || []).join("/")} vs ${(m.teamB || []).join("/")} on ${fmtDate(m.date)}`,
        idx: i,
      });
    }
  });
  const playedNames = new Set();
  state.matches.forEach((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => playedNames.add(p)),
  );
  Object.values(state.players).forEach((p) => {
    if (!p.isGuest && !playedNames.has(p.name)) {
      issues.push({
        type: "orphan",
        msg: `${p.name} is in the roster but has 0 matches`,
        idx: null,
      });
    }
  });
  if (!issues.length) {
    el.innerHTML = `<div style="text-align:center;padding:12px;color:var(--green);font-size:12px;font-weight:700">✅ No issues found</div>`;
    return;
  }
  const rows = issues
    .slice(0, 20)
    .map(
      (
        iss,
      ) => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span style="font-size:14px;flex-shrink:0">${iss.type === "dup" ? "🧬" : iss.type === "score" ? "⚠️" : "👻"}</span>
        <span style="flex:1;font-size:10px">${escHtml(iss.msg)}</span>
        ${iss.idx != null ? `<button onclick="deleteMatchByIndex(${iss.idx});runDataHealthCheck()" style="font-size:9px;padding:3px 7px;border-radius:6px;border:1px solid rgba(240,80,80,0.4);background:rgba(240,80,80,0.1);color:var(--red);cursor:pointer;flex-shrink:0">Delete</button>` : ""}
      </div>`,
    )
    .join("");
  el.innerHTML = `<div style="font-size:10px;color:var(--muted);margin-bottom:6px">${issues.length} issue(s) found</div>${rows}`;
};

// ── PLAYER MERGE TOOL ─────────────────────────────────────────
function renderPlayerMergeCard() {
  const el = document.getElementById("player-merge-body");
  if (!el) return;
  const names = Object.values(state.players)
    .map((p) => p.name)
    .sort();
  if (names.length < 2) {
    el.innerHTML =
      '<div class="sub" style="padding:8px">Need at least 2 players.</div>';
    return;
  }
  const opts = names
    .map((n) => `<option value="${escHtml(n)}">${escHtml(n)}</option>`)
    .join("");
  el.innerHTML = `
    <div style="font-size:10px;color:var(--muted);margin-bottom:8px">Merge a duplicate player into another — rewrites all match history, then removes the duplicate from the roster.</div>
    <select id="merge-from-sel" class="hist-select compact-select" style="width:100%;margin-bottom:6px"><option value="">Merge this player…</option>${opts}</select>
    <select id="merge-into-sel" class="hist-select compact-select" style="width:100%;margin-bottom:8px"><option value="">…into this player</option>${opts}</select>
    <button class="btn-danger" onclick="mergePlayers()" style="width:100%">🔗 Merge</button>
    <div id="merge-msg" class="msg" style="margin-top:6px"></div>`;
}
window.mergePlayers = function () {
  const fromName = document.getElementById("merge-from-sel")?.value;
  const intoName = document.getElementById("merge-into-sel")?.value;
  const msgEl = document.getElementById("merge-msg");
  if (!fromName || !intoName || fromName === intoName) {
    if (msgEl) {
      msgEl.textContent = "Pick two different players.";
      msgEl.className = "msg err show";
    }
    return;
  }
  if (
    !window.confirm(
      `Merge "${fromName}" into "${intoName}"? This rewrites all match history and cannot be undone.`,
    )
  )
    return;
  let rewritten = 0;
  state.matches.forEach((m) => {
    let changed = false;
    m.teamA = (m.teamA || []).map((p) => {
      if (p === fromName) {
        changed = true;
        return intoName;
      }
      return p;
    });
    m.teamB = (m.teamB || []).map((p) => {
      if (p === fromName) {
        changed = true;
        return intoName;
      }
      return p;
    });
    if (changed) rewritten++;
  });
  deletedMatches.forEach((m) => {
    m.teamA = (m.teamA || []).map((p) => (p === fromName ? intoName : p));
    m.teamB = (m.teamB || []).map((p) => (p === fromName ? intoName : p));
  });
  const fromEntry = Object.entries(state.players).find(
    ([, p]) => p.name === fromName,
  );
  if (fromEntry) {
    const [fromId] = fromEntry;
    delete state.players[fromId];
    delete playerAliasMap[fromId];
  }
  rebuildNameMaps();
  logAdminAction(
    "Merge Players",
    `${fromName} → ${intoName} (${rewritten} matches)`,
  );
  saveCloudData();
  commit();
  refreshManage();
  renderNamesTable();
  if (msgEl) {
    msgEl.textContent = `Merged — ${rewritten} match(es) rewritten.`;
    msgEl.className = "msg ok show";
  }
};

// ── ASS FORMULA EDITOR (sandbox preview only — does not alter live scoring) ──
function _previewASS(matches, params) {
  const {
    marginWeight,
    baseWeight,
    multClampMin,
    multClampMax,
    partnerTaxWeight,
  } = params;
  const elo = {},
    ass = {};
  [...matches]
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .forEach((m) => {
      const allP = [...(m.teamA || []), ...(m.teamB || [])];
      allP.forEach((p) => {
        if (!(p in elo)) elo[p] = 1000;
        if (!(p in ass)) ass[p] = 1000;
      });
      const margin = Math.abs(m.scoreA - m.scoreB);
      const total = m.scoreA + m.scoreB;
      const quality = marginWeight * margin + baseWeight * total;
      const aWon = m.scoreA > m.scoreB;
      const avgEloA =
        m.teamA.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamA.length, 1);
      const avgEloB =
        m.teamB.reduce((s, p) => s + elo[p], 0) / Math.max(m.teamB.length, 1);
      const expA = 1 / (1 + Math.pow(10, (avgEloB - avgEloA) / 400));
      const eloDA = Math.round(32 * ((aWon ? 1 : 0) - expA));
      const eloDB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
      m.teamA.forEach((p) => {
        const partner = m.teamA.find((pp) => pp !== p);
        const partnerElo = partner ? elo[partner] : elo[p];
        const mult = Math.max(
          multClampMin,
          Math.min(
            multClampMax,
            1 +
              (avgEloB - elo[p]) / 400 -
              (partnerTaxWeight * (partnerElo - elo[p])) / 400,
          ),
        );
        ass[p] += aWon
          ? Math.round(quality * mult)
          : -Math.round(quality / mult);
      });
      m.teamB.forEach((p) => {
        const partner = m.teamB.find((pp) => pp !== p);
        const partnerElo = partner ? elo[partner] : elo[p];
        const mult = Math.max(
          multClampMin,
          Math.min(
            multClampMax,
            1 +
              (avgEloA - elo[p]) / 400 -
              (partnerTaxWeight * (partnerElo - elo[p])) / 400,
          ),
        );
        ass[p] += !aWon
          ? Math.round(quality * mult)
          : -Math.round(quality / mult);
      });
      m.teamA.forEach((p) => {
        elo[p] += eloDA;
      });
      m.teamB.forEach((p) => {
        elo[p] += eloDB;
      });
    });
  return ass;
}
function _assCfgRow(id, label, val, min, max, step) {
  return `<div>
    <div style="font-size:9px;color:var(--muted);margin-bottom:3px">${label}</div>
    <input id="${id}" type="number" value="${val}" min="${min}" max="${max}" step="${step}" class="mei-input" style="width:100%">
  </div>`;
}
function renderASSFormulaCard() {
  const el = document.getElementById("ass-formula-config");
  if (!el) return;
  el.innerHTML = `
    <div style="font-size:10px;color:var(--muted);margin-bottom:10px">Sandbox only — adjust weights to preview how the leaderboard would reorder. Doesn't change the live ASS system.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      ${_assCfgRow("assf-margin", "MARGIN WEIGHT", 4, 0, 10, 0.5)}
      ${_assCfgRow("assf-base", "GAME-COUNT WEIGHT", 1, 0, 3, 0.1)}
      ${_assCfgRow("assf-clampmin", "MULT CLAMP MIN", 0.5, 0.1, 1, 0.1)}
      ${_assCfgRow("assf-clampmax", "MULT CLAMP MAX", 2.0, 1, 4, 0.1)}
    </div>
    <button onclick="previewASSFormula()" style="width:100%;padding:8px;border-radius:10px;border:1px solid rgba(var(--theme-rgb),0.4);background:rgba(var(--theme-rgb),0.12);color:var(--theme);font-weight:700;font-size:11px;cursor:pointer">Preview Leaderboard</button>
    <div id="ass-formula-preview" style="margin-top:10px"></div>`;
}
window.previewASSFormula = function () {
  const el = document.getElementById("ass-formula-preview");
  if (!el) return;
  const params = {
    marginWeight:
      parseFloat(document.getElementById("assf-margin")?.value) || 4,
    baseWeight: parseFloat(document.getElementById("assf-base")?.value) || 0,
    multClampMin:
      parseFloat(document.getElementById("assf-clampmin")?.value) || 0.5,
    multClampMax:
      parseFloat(document.getElementById("assf-clampmax")?.value) || 2.0,
    partnerTaxWeight: 0.5,
  };
  const am2 = activeMatches();
  const currentAss = computeASS(am2);
  const previewAss = _previewASS(am2, params);
  const currentRank = Object.entries(currentAss)
    .sort((a, b) => b[1] - a[1])
    .map(([n]) => n);
  const previewRanked = Object.entries(previewAss).sort((a, b) => b[1] - a[1]);
  const rows = previewRanked
    .slice(0, 12)
    .map(([name, score], i) => {
      const oldRank = currentRank.indexOf(name) + 1;
      const newRank = i + 1;
      const diff = oldRank - newRank;
      const arrow =
        diff > 0
          ? `<span style="color:var(--green)">▲${diff}</span>`
          : diff < 0
            ? `<span style="color:var(--red)">▼${Math.abs(diff)}</span>`
            : `<span style="color:var(--muted)">–</span>`;
      return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
        <div style="width:22px;font-size:10px;color:var(--muted)">#${newRank}</div>
        <div style="flex:1;font-size:11px;font-weight:700">${escHtml(name)}</div>
        <div style="font-size:11px;font-weight:800;color:var(--theme)">${Math.round(score)}</div>
        <div style="font-size:10px;width:32px;text-align:right">${arrow}</div>
      </div>`;
    })
    .join("");
  el.innerHTML = `<div style="font-size:9px;color:var(--muted);margin-bottom:6px">Preview vs current ASS ranking</div>${rows}`;
};

// ── DATE HELPERS ───────────────────────────────────────────
// todayISO/weekISO/weekendRange/monthISO/lastWeekRange → ./src/domain/dates.js

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
    // Defaults ON (unset key) so leaderboards show the current season out of
    // the box — only an explicit "0" (user turned the toggle off) disables it.
    return localStorage.getItem("padel_season_auto") !== "0";
  } catch (e) {
    return true;
  }
}
// The season whose range contains today; if several overlap, the latest-starting
// one wins (most specific/current). null when none is ongoing.
function _currentOngoingSeason() {
  const t = todayISO();
  const inRange = state.seasons.filter((s) => _inSeason(s, t));
  if (!inRange.length) return null;
  return inRange.sort((a, b) =>
    (b.start || "").localeCompare(a.start || ""),
  )[0];
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
  document
    .querySelectorAll("[data-mf]")
    .forEach((b) => b.classList.remove("on"));
  document.querySelector('[data-mf="all"]')?.classList.add("on");
  document.getElementById("matchDr")?.classList.remove("show");
  const mdp = document.getElementById("matchDayPicker");
  if (mdp) mdp.style.display = "none";
  const mf = document.getElementById("matchFrom");
  const mt = document.getElementById("matchTo");
  if (mf) mf.value = "";
  if (mt) mt.value = "";
  // Statistics page keeps its own date filter; reset it when the global
  // season changes so a fresh season opens on the full range.
  viewState.anaDateFilter = "all";
  viewState.anaDateFrom = "";
  viewState.anaDateTo = "";
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
  // renderHome() never touches #compare-card (it's populated on-demand, not
  // part of the normal home render) — so an already-open comparison would
  // otherwise keep showing the previous season's numbers after switching.
  const _cmpCard = document.getElementById("compare-card");
  if (_cmpCard && _cmpCard.dataset.mode === "result" && viewState.cmpPlayerA && viewState.cmpPlayerB) {
    openPlayerCompare(viewState.cmpPlayerA, viewState.cmpPlayerB, viewState.cmpDateFilter);
  }
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
// Invalidation: _invalidateStatsMemo() (called on every data mutation) nulls _amMemo,
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

// getPairKey → src/domain/pairs.js

// getPairStats → src/domain/pairs.js

// pairInMatch → src/domain/pairs.js

// playersOpposed → src/domain/pairs.js

// getHeadToHeadStats → src/domain/pairs.js

// ── ADD MATCHES ────────────────────────────────────────────
// ── VOICE SCORE ENTRY ────────────────────────────────────────
// Converts loose spoken match phrases ("Ankit Puneet beat Ram Raghav six
// four") into the app's own match-line grammar (P1 P2 vs P3 P4 Score-Score)
// and drops it into the textarea. Name resolution is NOT done here — the
// existing parseBlock/alias system already handles that when the line is
// previewed/added, so this only has to get the grammar right.
function _parseVoiceMatch(transcript) {
  const NUM_WORDS = {
    zero: 0,
    oh: 0,
    love: 0,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
    twenty: 20,
  };
  const SEPARATORS = [
    "beat",
    "beats",
    "defeated",
    "def",
    "vs",
    "versus",
    "against",
    "v",
  ];
  const text = transcript
    .toLowerCase()
    .trim()
    .replace(/[.,!?]/g, "");
  const tokens = text.split(/\s+/).filter(Boolean);
  const sepIdx = tokens.findIndex((t) => SEPARATORS.includes(t));
  if (sepIdx < 1) return null;
  const teamATokens = tokens.slice(0, sepIdx);
  const rightTokens = tokens.slice(sepIdx + 1);

  // Homophones ("to"→2, "for"→4) are only trusted in the trailing score
  // window, so a name accidentally shaped like a number elsewhere is untouched.
  const toNum = (t, allowHomophone) => {
    if (/^\d+$/.test(t)) return parseInt(t, 10);
    if (t in NUM_WORDS) return NUM_WORDS[t];
    if (allowHomophone && (t === "to" || t === "too")) return 2;
    if (allowHomophone && t === "for") return 4;
    return null;
  };
  const nameTokens = rightTokens.slice();
  const scoreTokens = [];
  while (scoreTokens.length < 2 && nameTokens.length) {
    const n = toNum(nameTokens[nameTokens.length - 1], true);
    if (n == null) break;
    scoreTokens.unshift(n);
    nameTokens.pop();
  }
  if (scoreTokens.length < 2 || !teamATokens.length || !nameTokens.length)
    return null;
  const titleCase = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const teamA = teamATokens.map(titleCase).join(" ");
  const teamB = nameTokens.map(titleCase).join(" ");
  return `${teamA} vs ${teamB} ${scoreTokens[0]}-${scoreTokens[1]}`;
}
window.startVoiceMatchEntry = function () {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = document.getElementById("voice-entry-btn");
  if (!SR) {
    showToast("Voice entry isn't supported in this browser", "⚠️");
    return;
  }
  if (window._voiceRecognition) {
    window._voiceRecognition.stop();
    return;
  }
  const rec = new SR();
  rec.lang = "en-US";
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  window._voiceRecognition = rec;
  if (btn) {
    btn.style.background = "rgba(240,80,80,0.15)";
    btn.style.borderColor = "rgba(240,80,80,0.5)";
    btn.style.color = "var(--red)";
    btn.textContent = "🎙️ Listening… (tap to stop)";
  }
  rec.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    const line = _parseVoiceMatch(transcript);
    const ta = document.getElementById("matchTA");
    if (ta && line) {
      const sep = ta.value && !ta.value.endsWith("\n") ? "\n" : "";
      ta.value = ta.value + sep + line;
      previewMatchImport();
      showToast(`Heard: "${transcript}"`, "🎤");
    } else {
      showToast(
        `Couldn't parse "${transcript}" — try "P1 P2 beat P3 P4 six four"`,
        "⚠️",
      );
    }
  };
  rec.onerror = () => showToast("Voice entry error — try again", "⚠️");
  rec.onend = () => {
    window._voiceRecognition = null;
    if (btn) {
      btn.style.background = "rgba(var(--theme-rgb),0.08)";
      btn.style.borderColor = "rgba(var(--theme-rgb),0.35)";
      btn.style.color = "var(--theme)";
      btn.textContent = "🎤 Voice Entry";
    }
  };
  try {
    rec.start();
  } catch (e) {
    showToast("Could not start voice entry", "⚠️");
  }
};

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
    `${m.date}|${[...(m.teamA || [])].sort()}|${[...(m.teamB || [])].sort()}|${m.scoreA}-${m.scoreB}`;
  const dbCounts = new Map();
  state.matches.forEach((m) => {
    const k = _mk(m);
    dbCounts.set(k, (dbCounts.get(k) || 0) + 1);
  });
  const seenCounts = new Map();
  let silentSkipCount = 0,
    askCount = 0;

  const rows = parsed.slice(0, 5).map((m) => {
    const k = _mk(m);
    const seen = seenCounts.get(k) || 0;
    seenCounts.set(k, seen + 1);
    const inDb = dbCounts.get(k) || 0;
    const badP =
      new Set([...m.teamA, ...m.teamB]).size < m.teamA.length + m.teamB.length;
    let tag = "",
      warn = false;
    if (badP) {
      tag = " · repeated player!";
      warn = true;
    } else if (seen < inDb) {
      tag = " · already exists (skip)";
      silentSkipCount++;
    } else if (inDb > 0) {
      tag = " · exists — will ask";
      warn = true;
      askCount++;
    }
    return `<div class="preview-row"><span>${m.date} · ${m.teamA.join(" & ")} vs ${m.teamB.join(" & ")}</span><strong class="${warn ? "preview-warn" : ""}">${m.scoreA}-${m.scoreB}${tag}</strong></div>`;
  });
  // Finish counting for rows not shown — mirror the visible loop exactly:
  // repeated-player rows are tallied under dupPlayers, not skip/ask.
  parsed.slice(5).forEach((m) => {
    const k = _mk(m);
    const seen = seenCounts.get(k) || 0;
    seenCounts.set(k, seen + 1);
    const inDb = dbCounts.get(k) || 0;
    const badP =
      new Set([...m.teamA, ...m.teamB]).size < m.teamA.length + m.teamB.length;
    if (badP) return;
    if (seen < inDb) silentSkipCount++;
    else if (inDb > 0) askCount++;
  });

  const newCount =
    parsed.length - silentSkipCount - askCount - dupPlayers.length;
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
    if (seen < inDb) {
      skipCount++;
      continue;
    } // prefilled/dup → silent skip
    if (inDb > 0)
      toConfirm.push(m); // new occurrence of same key → ask
    else toAdd.push(m); // new match (different score or teams) → add
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
    _ensureMatchIds(list);
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
    if (!toConfirm.length) {
      _commit(toAdd);
      return;
    }
    const m = toConfirm.shift();
    const label = `${m.teamA.join(" & ")} vs ${m.teamB.join(" & ")} ${m.scoreA}–${m.scoreB} (${m.date})`;
    showDupConfirmSheet(
      `This match already exists:\n${label}\nIs this a new genuine match?`,
      () => {
        toAdd.push(m);
        _processQueue();
      }, // Yes → include and continue
      () => {
        skipCount++;
        _processQueue();
      }, // No  → skip and continue
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

  // Block any alias that would end up pointing at two different players —
  // either two display names in THIS batch sharing an alias, or a batch
  // alias colliding with an existing player not touched by this import.
  // Left unchecked, whichever entry rebuildNameMaps() processes last wins
  // silently, misattributing future text-paste matches with no visible error.
  const aliasOwner = {}; // alias (lowercased) -> display name that claims it
  const collisions = [];
  Object.entries(importMap).forEach(([displayName, aliases]) => {
    aliases.forEach((a) => {
      const key = a.toLowerCase();
      if (aliasOwner[key] && aliasOwner[key] !== displayName) {
        collisions.push(
          `"${a}" claimed by both "${aliasOwner[key]}" and "${displayName}"`,
        );
      } else {
        aliasOwner[key] = displayName;
      }
    });
  });
  Object.values(state.players).forEach((p) => {
    if (importMap[p.name]) return; // this player is itself being updated — fine
    (playerAliasMap[p.id] || []).forEach((a) => {
      const key = a.toLowerCase();
      if (aliasOwner[key] && aliasOwner[key] !== p.name) {
        collisions.push(
          `"${a}" in this import already belongs to existing player "${p.name}"`,
        );
      }
    });
  });
  if (collisions.length) {
    if (eEl) {
      eEl.innerHTML =
        "Alias collision — nothing imported:<br>" +
        collisions.map(escHtml).join("<br>");
      eEl.classList.add("show");
    }
    return;
  }

  // Merge into players: update existing by name, add new
  Object.entries(importMap).forEach(([displayName, aliases]) => {
    const existing = Object.values(state.players).find(
      (p) => p.name === displayName,
    );
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
  Object.values(state.players).forEach((p) => {
    registryByName[p.name] = p;
  });
  const allNames = [
    ...new Set([
      ...Object.keys(registryByName),
      ...getAllPlayerNamesFromMatches(),
    ]),
  ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  const badge = document.getElementById("names-count-badge");
  if (badge) badge.textContent = allNames.length;

  if (!allNames.length) {
    table.innerHTML = `<div style="text-align:center;padding:40px 0 16px;color:var(--muted);font-size:13px">No players yet. Tap + ADD PLAYER to get started.</div>`;
    return;
  }

  table.innerHTML = allNames
    .map((name) => {
      const p = registryByName[name];
      const aliases = p ? playerAliasMap[p.id] || [] : [];
      const { first, last } = _getPlayerDateRange(name, state.matches);
      const initials = (name || "?")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      const photo = photoMap[name];

      const avatarInner = photo
        ? `<img src="${photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`
        : `<span style="font-weight:800;font-size:13px;color:#000">${escHtml(initials)}</span>`;
      const photoControls =
        window.isAdmin && p
          ? `<div style="display:flex;gap:4px;margin-top:3px;justify-content:center">
          <button onclick="savePlayerPhoto(${jsArg(name)})" title="Upload photo" style="font-size:12px;background:none;border:none;cursor:pointer;padding:0;line-height:1;opacity:0.5">📷</button>
          ${photo ? `<button onclick="removePlayerPhoto(${jsArg(name)})" title="Remove photo" style="font-size:10px;background:none;border:none;cursor:pointer;padding:0;color:var(--muted);line-height:1">✕</button>` : ""}
        </div>`
          : "";

      const guestBadge = p?.isGuest
        ? `<span style="font-size:8px;padding:1px 6px;border-radius:8px;background:rgba(255,165,0,0.15);color:orange;font-weight:800;letter-spacing:0.06em">GUEST</span>`
        : "";

      const mappingChips = aliases.length
        ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px">${aliases
            .map(
              (a) =>
                `<span style="font-size:9px;font-weight:700;letter-spacing:0.05em;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.18);color:var(--accent);border-radius:5px;padding:2px 7px">${escHtml(a)}</span>`,
            )
            .join("")}</div>`
        : "";

      const dateRange =
        first || last
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
    })
    .join("");
}

function setScreenshotChoiceSetting(val) {
  setScreenshotAsk(val);
}

function setRankDeltaWindow(days) {
  setRankDeltaDays(days);
  renderCompact();
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
  logAdminAction("Clear Matches", `${state.matches.length} matches removed`);
  state.matches = [];
  lastMatchSnapshot = null;
  document.getElementById("undoAddBtn").style.display = "none";
  saveCloudData();
  commit();
  refreshManage();
}
function clearNames() {
  if (!confirm("Clear all players?")) return;
  logAdminAction(
    "Clear Aliases",
    `${Object.keys(state.players).length} players removed`,
  );
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
        {
          matches: state.matches,
          players: state.players,
          playerAliasMap,
          nextPlayerId,
        },
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
// page refresh). Throws a user-readable Error on failure so callers can show
// a specific message rather than silently failing.
async function _ensureDriveToken() {
  if (_driveAccessToken) return true;
  if (!auth.currentUser) throw new Error("not-signed-in");
  try {
    const result = await signInWithPopup(auth, provider);
    _driveAccessToken =
      GoogleAuthProvider.credentialFromResult(result)?.accessToken || null;
    if (!_driveAccessToken) throw new Error("no-token");
    return true;
  } catch (e) {
    if (
      e?.code === "auth/popup-blocked" ||
      e?.code === "auth/popup-closed-by-user"
    ) {
      throw new Error("popup-blocked");
    }
    if (
      e?.message === "not-signed-in" ||
      e?.message === "no-token" ||
      e?.message === "popup-blocked"
    )
      throw e;
    throw new Error("reauth-failed");
  }
}

// Upload backup directly to Google Drive.
async function backupToDrive() {
  const blob = new Blob([JSON.stringify(_backupPayload(), null, 2)], {
    type: "application/json",
  });
  const filename = _backupFilename();
  try {
    await _ensureDriveToken();
  } catch (e) {
    showToast(
      e?.message === "not-signed-in"
        ? "Sign in to use Drive backup"
        : "Sign out and sign back in to enable Drive access",
      "⚠️",
    );
    return;
  }
  showToast("Uploading to Drive…", "☁️");
  try {
    const link = await _uploadToDrive(blob, filename);
    // Retain the newest backup per day for the last 7 days (prunes same-day dups).
    _pruneDriveBackups(7).catch(() => {});
    logAdminAction("Drive Backup", filename);
    showToast("Saved to Drive!", "✅");
    const el = document.getElementById("expOk");
    if (el) {
      el.innerHTML = `Saved! <a href="${escHtml(link)}" target="_blank"
        style="color:var(--theme);text-decoration:underline">Open in Drive ↗</a>`;
      el.classList.add("show");
      setTimeout(() => {
        el.classList.remove("show");
        el.innerHTML = "";
      }, 8000);
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
  // Desktop Chrome/Edge (Windows included) also report canShare({files:...})
  // as true, routing this "Export" action through the OS share sheet instead
  // of a real download — on Windows that sheet has no "save file" option, so
  // the export silently produces nothing in Downloads. This button means
  // "save a backup file", not "share", so only use Web Share on touch
  // devices, where a direct download is the one that's often unreliable.
  const isTouchDevice = !window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (
    isTouchDevice &&
    navigator.share &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator
      .share({
        files: [file],
        title: "Ekta Padel Backup",
        text: `Full backup — ${state.matches.length} matches`,
      })
      .catch(() => {});
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
async function exportBackupFile() {
  return backupToDrive();
}

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
    const r = await fetch(
      "https://www.googleapis.com/drive/v3/files?fields=id",
      {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: _DRIVE_FOLDER_NAME,
          mimeType: "application/vnd.google-apps.folder",
        }),
      },
    );
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
    try {
      errMsg = JSON.parse(body)?.error?.message || errMsg;
    } catch {}
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
  const existingSeasonIds = new Set(state.seasons.map((s) => s.id));
  const newSeasonCount = Array.isArray(data.seasons)
    ? data.seasons.filter((s) => s.id && !existingSeasonIds.has(s.id)).length
    : 0;
  const knownNames = new Set(Object.values(state.players).map((p) => p.name));
  const newPlayerNames = new Set();
  newMatches.forEach((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
      if (!knownNames.has(p)) newPlayerNames.add(p);
    }),
  );
  const dates = newMatches
    .map((m) => m.date)
    .filter(Boolean)
    .sort();
  const dateRange = dates.length
    ? dates[0] === dates[dates.length - 1]
      ? fmtDate(dates[0])
      : `${fmtDate(dates[0])} – ${fmtDate(dates[dates.length - 1])}`
    : "—";
  _showRestoreDiffSheet({
    newMatchCount: newMatches.length,
    skipped,
    newSeasonCount,
    newPlayerNames: [...newPlayerNames],
    dateRange,
    data,
  });
  return true;
}

// Restore diff preview: shows exactly what an import would change (new
// matches, date range, new players, seasons) before touching any data —
// the actual merge only runs if the user taps Apply.
function _showRestoreDiffSheet({
  newMatchCount,
  skipped,
  newSeasonCount,
  newPlayerNames,
  dateRange,
  data,
}) {
  document.getElementById("restore-diff-sheet")?.remove();
  const sheet = document.createElement("div");
  sheet.id = "restore-diff-sheet";
  sheet.className = "live-sheet-wrap live-sheet-open";
  const row = (label, val, col) =>
    `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)"><span style="font-size:11px;color:var(--muted)">${label}</span><span style="font-size:12px;font-weight:800;color:${col || "var(--text)"}">${val}</span></div>`;
  sheet.innerHTML = `
    <div class="live-sheet-overlay" onclick="document.getElementById('restore-diff-sheet')?.remove()"></div>
    <div class="live-sheet">
      <div class="live-sheet-handle"></div>
      <div style="font-size:13px;font-weight:800;padding:4px 0 12px;letter-spacing:0.04em">📥 IMPORT PREVIEW</div>
      ${row("New matches", `+${newMatchCount}`, "var(--green)")}
      ${skipped ? row("Duplicates skipped", skipped) : ""}
      ${row("Date range", escHtml(dateRange))}
      ${newPlayerNames.length ? row("New players", `+${newPlayerNames.length} (${escHtml(newPlayerNames.slice(0, 5).join(", "))}${newPlayerNames.length > 5 ? "…" : ""})`, "var(--green)") : ""}
      ${newSeasonCount ? row("Seasons merged", `+${newSeasonCount}`) : ""}
      <div style="font-size:9px;color:var(--muted);margin:10px 0 4px">This merges into your existing data — nothing is deleted or overwritten.</div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn-s" style="flex:1" onclick="document.getElementById('restore-diff-sheet')?.remove()">Cancel</button>
        <button class="btn-p" style="flex:1" onclick="window._commitImportDiff()">Apply Import</button>
      </div>
    </div>`;
  document.body.appendChild(sheet);
  window._pendingImportData = data;
}
window._commitImportDiff = function () {
  const data = window._pendingImportData;
  document.getElementById("restore-diff-sheet")?.remove();
  window._pendingImportData = null;
  if (data) _commitImportedData(data);
};

function _commitImportedData(data) {
  const incomingMatches = data.matches || data.allMatches;
  const existingKeys = new Set(state.matches.map(_mkMatchKey));
  const newMatches = incomingMatches.filter(
    (m) => !existingKeys.has(_mkMatchKey(m)),
  );
  _ensureMatchIds(newMatches);

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
    const newSeasons = data.seasons.filter(
      (s) => s.id && !existingIds.has(s.id),
    );
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
  logAdminAction("Import Data", `${added} matches added`);
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
      alert(
        "This file doesn't look like an Ekta Padel backup (no matches array).",
      );
      return;
    }
    _applyImportedData(data);
  };
  input.click();
}

// List backup files the app previously uploaded (drive.file scope only sees
// files this app created) and let the admin pick one to restore from.
async function importFromDrive() {
  try {
    await _ensureDriveToken();
  } catch (e) {
    if (e?.message === "not-signed-in") {
      showToast("Sign in first to access Drive backups", "⚠️");
    } else if (e?.message === "popup-blocked") {
      showToast(
        "Popup blocked — sign out and sign in again to refresh Drive access",
        "⚠️",
      );
    } else {
      showToast("Sign out and sign back in to enable Drive access", "⚠️");
    }
    return;
  }
  showToast("Fetching Drive backups…", "☁️");
  let files;
  try {
    const q = encodeURIComponent(
      "name contains 'ekta-padel-backup' and mimeType='application/json' and trashed=false",
    );
    const resp = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=createdTime desc&fields=files(id,name,createdTime,size)&pageSize=10`,
      { headers: { Authorization: `Bearer ${_driveAccessToken}` } },
    );
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      if (resp.status === 401 || resp.status === 403) {
        _driveAccessToken = null;
        showToast("Drive session expired — sign out and sign in again", "⚠️");
        return;
      }
      let msg = `HTTP ${resp.status}`;
      try {
        msg = JSON.parse(body)?.error?.message || msg;
      } catch {}
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
      ${files
        .map((f, i) => {
          const d = new Date(f.createdTime).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
          const kb = f.size ? `${Math.round(f.size / 1024)} KB` : "";
          return `<button class="live-sheet-item" onclick="
          document.getElementById('drive-pick-sheet')?.remove();
          _downloadDriveBackup(${JSON.stringify(f.id)},${JSON.stringify(f.name)})
        " style="flex-direction:column;align-items:flex-start;gap:2px">
          <span style="display:flex;align-items:center;gap:6px;width:100%">
            <span style="font-size:10px;font-weight:800;color:var(--muted);width:18px">#${i + 1}</span>
            <span style="font-weight:700;font-size:12px;flex:1">${escHtml(f.name.replace("ekta-padel-backup-", "").replace(".json", ""))}</span>
            ${kb ? `<span style="font-size:9px;color:var(--muted)">${kb}</span>` : ""}
          </span>
          <span style="font-size:10px;color:var(--muted);margin-left:24px">${d}</span>
        </button>`;
        })
        .join("")}
      <button class="live-sheet-item" style="color:var(--muted);margin-top:4px"
        onclick="document.getElementById('drive-pick-sheet')?.remove()">Cancel</button>
    </div>`;
  document.body.appendChild(sheet);
}

async function _downloadDriveBackup(fileId, filename) {
  try {
    await _ensureDriveToken();
  } catch {
    showToast("Sign out and sign back in to re-enable Drive access", "⚠️");
    return;
  }
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
  // The "±" confidence column only has meaning for Glicko-2/OpenSkill — driven
  // by the active scoring system, not a user-togglable column preference.
  table.classList.toggle("hide-col-conf", !SCORING_SYSTEMS_WITH_CONFIDENCE.includes(_scoringSystem));
  const confTh = document.getElementById("cmp-conf-th");
  if (confTh) {
    confTh.textContent =
      _scoringSystem === "glicko2"
        ? "±RD"
        : _scoringSystem === "openskill"
          ? "±3σ"
          : _scoringSystem === "ep"
            ? "TOTAL"
            : "";
  }
  const assTh = document.getElementById("cmp-ass-th");
  if (assTh) {
    const prevArrow = assTh.querySelector(".sort-arrow");
    const arrowText = prevArrow ? prevArrow.textContent : "";
    const arrowActive = prevArrow ? prevArrow.classList.contains("active") : false;
    assTh.innerHTML = `${SCORING_SYSTEM_LABELS[_scoringSystem]} <span class="sort-arrow${arrowActive ? " active" : ""}" id="sort-ass">${arrowText}</span>`;
  }
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

// getSRRatingClass now lives in ./format.js.

// _hudGaugeId + buildHudGaugeSvg now live in ./charts.js.

let _renderHomeGen = 0;
function renderHome() {
  _homeRenderedVersion = _dataVersion;
  _homeRenderedFilter = `${homeFilter}|${homeFrom || ""}|${homeTo || ""}`;
  _renderSeasonQuickSwitch();
  const filtered = filterMatches(homeFilter, homeFrom, homeTo);
  // When filter is "all" (no date range), filtered === activeMatches() content —
  // use the memoised results to avoid redundant full-dataset walks.
  const _isAllFilter = homeFilter === "all" && !homeFrom && !homeTo;
  const homeASSMap =
    _isAllFilter && _scoringSystem === "ass"
      ? _memoASS()
      : _statsRatingMap(filtered);
  // SR (the gauge/rating on every card) and the card ordering both follow ASS.
  // computeStats already sorts by SR desc, so this orders cards by ASS too.
  const stats = computeStats(filtered, homeASSMap, _statsSrFn(homeASSMap));
  const totalG = filtered.reduce((s, m) => s + m.scoreA + m.scoreB, 0);
  const uniqD = new Set(filtered.map((m) => m.date)).size;
  const board = document.getElementById("board");
  if (!stats.length) {
    board.innerHTML = emptyState({
      card: true,
      icon: "🏓",
      title: "No matches yet",
      message: "Tap + Add to log your first match.",
      action: {
        label: "Add Matches",
        onClick: "goTo('add')",
        variant: "primary",
      },
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

  // Score deltas (recent-5 and 30-day trend) for the card badges, from ASS.
  const _histAll = _activeHistory();
  const _thirtyAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  })();
  const assDeltaMap = {};
  const monthlyAssDeltaMap = {};
  stats.forEach((p) => {
    const hist = _histAll[p.name] || [];
    if (!hist.length) {
      assDeltaMap[p.name] = null;
      monthlyAssDeltaMap[p.name] = null;
      return;
    }
    const cur = hist[hist.length - 1].elo;
    // Last-5 trend: ASS now vs ASS just before this player's last 5 matches.
    const base5 =
      hist.length > 5 ? hist[hist.length - 6].elo : _statsDefault();
    assDeltaMap[p.name] = Math.round(cur - base5);
    // 30-day trend: ASS now vs ASS just before the first match in the window.
    const idx30 = hist.findIndex((h) => (h.date || "") >= _thirtyAgo);
    monthlyAssDeltaMap[p.name] =
      idx30 === -1
        ? null
        : Math.round(cur - (idx30 > 0 ? hist[idx30 - 1].elo : _statsDefault()));
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
    const eld = assDeltaMap[p.name];
    const mEld = monthlyAssDeltaMap[p.name];
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
    const playerBadges = computeBadges(
      p.name,
      p,
      homeASSMap,
      filtered,
      stats,
      _statsBadgeOpts(),
    );
    const badgePillsHtml =
      playerBadges.length
        ? `<div class="card-badge-row">${playerBadges.map((b) => `<span class="card-badge-pill" title="${b.desc}">${b.icon} ${b.label}</span>`).join("")}</div>`
        : "";

    // Component-system primitives shared by both card variants
    const srBar = progressBar({
      value: p.sr,
      max: maxSR,
      label: `SR score: ${p.sr.toFixed(2)}`,
    });
    const statsRow = statRow([
      { value: p.mp, label: "Played" },
      {
        value: `${p.mw}W–${p.ml}L`,
        label: "Record",
        tone: p.mw > p.ml ? "success" : p.mw < p.ml ? "danger" : "neutral",
      },
      { value: `${p.winPct.toFixed(0)}%`, label: "Win %" },
      {
        value: `${p.gw}–${p.gl} ${ds}`,
        label: "G Diff",
        tone: p.diff > 0 ? "success" : p.diff < 0 ? "danger" : "neutral",
      },
      {
        value: `${p.gamePct.toFixed(0)}%`,
        label: "G%",
        tone: p.gamePct >= 50 ? "success" : "danger",
      },
    ]);

    if (document.body.classList.contains("holo-mode")) {
      const corners = `<span class="holo-corner holo-corner-tl"></span><span class="holo-corner holo-corner-tr"></span><span class="holo-corner holo-corner-bl"></span><span class="holo-corner holo-corner-br"></span>`;
      return `<div class="pc ${rc} holo-pc" style="--card-index:${i}" onclick="openPlayerDetail(${jsArg(p.name)})">${corners}<div class="glow"></div><div class="ct"><div class="rb">${ri}</div><div class="ct-nameblock"><div class="pname-elo-row"><span class="pname">${escHtml(p.name)}</span><span class="pname-elo">${_statsFmt(homeASSMap[p.name] ?? _statsDefault())}</span>${mkLvlRow(p.name)}</div></div><div class="skill-block"><div class="mini-gauge-wrap">${buildHudGaugeSvg(p.sr, cardRatingClass)}<div class="sr-val hud-sr-val ${cardRatingClass}" data-final="${p.sr.toFixed(2)}">${p.sr.toFixed(2)}</div></div></div></div>${srBar}${statsRow}${sparklineHtml}</div>`;
    }
    return `<div class="pc ${rc}" style="--card-index:${i}" onclick="openPlayerDetail(${jsArg(p.name)})"><div class="glow"></div><div class="ct"><div class="rb">${ri}</div><div class="ct-nameblock"><div class="pname-elo-row"><span class="pname">${escHtml(p.name)}</span><span class="pname-elo">${_statsFmt(homeASSMap[p.name] ?? _statsDefault())}</span>${mkLvlRow(p.name)}</div></div><div class="skill-block"><div class="mini-gauge-wrap"><div class="sr-ring ${cardRatingClass}" style="--speed-angle:${cardAngle}deg;--target-angle:${cardAngle}deg"><div class="gauge"><div class="needle"></div></div><div class="sr-val" data-final="${p.sr.toFixed(2)}">${p.sr.toFixed(2)}</div></div></div></div></div>${srBar}${statsRow}${sparklineHtml}</div>`;
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
function _computeLbWindowStats(baseMatches, system) {
  const playerNames = new Set();
  baseMatches.forEach((m) => {
    (m.teamA || []).forEach((p) => playerNames.add(p));
    (m.teamB || []).forEach((p) => playerNames.add(p));
  });
  const statsList = [];
  const assMap = {};
  const confMap = {};
  for (const playerName of playerNames) {
    const pm = _getPlayerWindowMatches(playerName, baseMatches, _lbWindow);
    const pFull = _fullRatingForSystem(system, pm);
    const pRatingMap = _flatRatingForSystem(system, pm, pFull);
    // SR derives from the active system's rating over the windowed matches.
    const pStats = computeStats(pm, pRatingMap, _srFnForSystem(system, pRatingMap));
    const ps = pStats.find((s) => s.name === playerName);
    if (ps) {
      statsList.push(ps);
      assMap[playerName] = pRatingMap[playerName];
      if (pFull) {
        const pConf = _confidenceForSystem(system, pFull);
        confMap[playerName] = pConf[playerName];
      }
    }
  }
  return { stats: statsList, assMap, confMap };
}

function _renderLbWindowBar() {
  const bar = document.getElementById("lbWindowBar");
  if (!bar) return;
  const mode = _lbWindow ? _lbWindow.mode : "all";
  const count = _lbWindow ? _lbWindow.count : 10;
  const chip =
    mode !== "all"
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

function toggleMatchDeltaWindow(win) {
  _matchDeltaWindow = win;
  document
    .querySelectorAll(".mdw-btn")
    .forEach((b) => b.classList.toggle("active", b.dataset.window === win));
  document.body.classList.add("no-cascade");
  renderCompact();
  document.body.classList.remove("no-cascade");
}

function toggleTopGainersWindow(win) {
  _topGainersWindow = win;
  document.body.classList.add("no-cascade");
  renderCompact();
  document.body.classList.remove("no-cascade");
}

// Manual "Remove Cache" admin action — drops the Statistics page's in-memory
// memo results so the next open recomputes from scratch instead of reusing
// whatever was last computed (mirrors the automatic clear in switchMainTab()).
window.removeStatsCache = function removeStatsCache() {
  _clearAnalyticsCache();
  _anaRenderedVersion = -1;
  _anaRenderedFilter = "";
  if (document.querySelector(".page.active")?.id === "pg-analytics") {
    renderAnalyticsPage();
  }
  const btn = document.getElementById("remove-cache-btn");
  if (btn) {
    const original = btn.textContent;
    btn.textContent = "✓ Cache Cleared";
    setTimeout(() => {
      btn.textContent = original;
    }, 1500);
  }
};

// ── RENDER COMPACT ─────────────────────────────────────────
// _sweepNeedle -> ./render-anim.js

// runSpeedometerSweep -> ./render-anim.js

function renderCompact() {
  _compactRenderedVersion = _dataVersion;
  _compactRenderedFilter = `${cmpFilter}|${cmpFrom || ""}|${cmpTo || ""}|${cmpSortKey}|${cmpSortAsc}|${[..._excludedPlayers].sort().join(",")}|${_lbWindow ? `${_lbWindow.mode}:${_lbWindow.count}` : "none"}|${_summaryMode}|${_seasonScoringMode}|${_scoringSystem}`;
  _updateExcludeBtn();
  _renderSeasonQuickSwitch();
  _updateSeasonScoringBadge();
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
  const _isCmpAllFilter = cmpFilter === "all" && !cmpFrom && !cmpTo;
  // Season-carryover scoring (Flip/Fair) is ASS-specific and only makes
  // sense on the full, undated ALL TIME view of a season with a real prior
  // season to draw from — FIRST/LAST windows, narrower date filters, and the
  // other scoring systems always fall back to a plain per-season computation.
  const _cmpSeason = _activeSeason();
  const _hasScoringRef =
    _scoringSystem === "ass" &&
    !_lbWindow &&
    _isCmpAllFilter &&
    hasSeasonScoringReference(state.seasons, _cmpSeason);
  const _effSeasonScoringMode = _hasScoringRef ? _seasonScoringMode : "reset";
  let _cmpASSMap, _cmpConfMap, stats;
  if (_lbWindow) {
    // FIRST/LAST window: recompute the active system's rating and SR over
    // each player's windowed matches so both reflect the chosen window (not
    // the all-time set).
    const r = _computeLbWindowStats(filtered, _scoringSystem);
    _cmpASSMap = r.assMap;
    _cmpConfMap = r.confMap;
    stats = r.stats;
  } else if (_scoringSystem !== "ass") {
    const _full = _fullRatingForSystem(_scoringSystem, filtered);
    _cmpASSMap = _flatRatingForSystem(_scoringSystem, filtered, _full);
    _cmpConfMap = _confidenceForSystem(_scoringSystem, _full);
    stats = computeStats(
      filtered,
      _cmpASSMap,
      _srFnForSystem(_scoringSystem, _cmpASSMap),
    );
  } else if (_effSeasonScoringMode === "reset") {
    _cmpASSMap = _isCmpAllFilter ? _memoASS() : computeASS(filtered);
    stats = computeStats(filtered, _cmpASSMap);
  } else {
    _cmpASSMap = computeSeasonScoringASS(
      _effSeasonScoringMode,
      withoutGuestMatches(state.matches),
      filtered,
      state.seasons,
      _cmpSeason,
    );
    stats = computeStats(filtered, _cmpASSMap);
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
    ass: (a, b) =>
      (_cmpASSMap[a.name] ?? _ratingDefault()) -
      (_cmpASSMap[b.name] ?? _ratingDefault()),
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

  // All-time rank map — built with the same sort key and same scoring system
  // as the current view, using competition ranking, so the delta is always
  // like-for-like.
  const _allTimeRankMap = {};
  {
    const _atAss =
      _scoringSystem === "ass"
        ? _memoASS()
        : _flatRatingForSystem(_scoringSystem, activeMatches(), _fullRatingForSystem(_scoringSystem, activeMatches()));
    // For the score column substitute the all-time map; other columns reuse sortFns.
    const _atSort =
      cmpSortKey === "ass"
        ? (a, b) =>
            (_atAss[a.name] ?? _ratingDefault()) -
            (_atAss[b.name] ?? _ratingDefault())
        : sortFns[cmpSortKey] || sortFns.sr;
    const _atAll = [
      ...computeStats(
        activeMatches(),
        _atAss,
        _srFnForSystem(_scoringSystem, _atAss),
      ),
    ].sort((a, b) => {
      const cmp = _atSort(a, b);
      if (cmp !== 0) return cmpSortAsc ? cmp : -cmp;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
    _atAll.forEach((p, i) => {
      _allTimeRankMap[p.name] =
        i > 0 && _atSort(_atAll[i - 1], p) === 0
          ? _allTimeRankMap[_atAll[i - 1].name]
          : i + 1;
    });
  }

  // This-month rank map — used only in ALL TIME view to compute the ▲▼ delta.
  // Built with the same sort key, scoring system and competition ranking as
  // the current leaderboard, so the delta exactly matches the rank gap if the
  // user switches to the THIS MONTH filter.
  const _recentRankMap = {};
  if (cmpFilter === "all") {
    const _mMonth = filterMatches("month");
    if (_mMonth.length > 0) {
      const _mAss =
        _scoringSystem === "ass"
          ? computeASS(_mMonth)
          : _flatRatingForSystem(_scoringSystem, _mMonth, _fullRatingForSystem(_scoringSystem, _mMonth));
      const _mStats = computeStats(
        _mMonth,
        _mAss,
        _srFnForSystem(_scoringSystem, _mAss),
      );
      const _mSortFn =
        cmpSortKey === "ass"
          ? (a, b) =>
              (_mAss[a.name] ?? _ratingDefault()) -
              (_mAss[b.name] ?? _ratingDefault())
          : cmpSortKey === "sr"
            ? (a, b) => a.sr - b.sr
            : sortFns[cmpSortKey] || ((a, b) => a.sr - b.sr);
      const _mSorted = [..._mStats].sort((a, b) => {
        const cmp = _mSortFn(a, b);
        if (cmp !== 0) return cmpSortAsc ? cmp : -cmp;
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      });
      _mSorted.forEach((p, i) => {
        _recentRankMap[p.name] =
          i > 0 && _mSortFn(_mSorted[i - 1], p) === 0
            ? _recentRankMap[_mSorted[i - 1].name]
            : i + 1;
      });
    }
  }
  // 0-based systems have no 1000 line to colour against, so the field's own
  // median is the reference — above it is green, below it is red.
  const _zeroBased = SCORING_SYSTEMS_ZERO_BASED.includes(_scoringSystem);
  const _ratingMid = (() => {
    if (!_zeroBased) return 1000;
    const vals = sorted.map((p) => _cmpASSMap[p.name] || 0).sort((a, b) => a - b);
    return vals.length ? vals[Math.floor(vals.length / 2)] : 0;
  })();
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
    const momentumBadge = getMomentumBadge(p.name);
    const animClass = "";
    const allTimeRank = _allTimeRankMap[p.name];
    let rankDelta = "";
    if (cmpFilter === "all") {
      const recentRank = _recentRankMap[p.name];
      if (allTimeRank && recentRank) {
        const diff = allTimeRank - recentRank;
        if (diff > 0)
          rankDelta = `<span class="wk-rank-delta wk-up">▲${diff}</span>`;
        else if (diff < 0)
          rankDelta = `<span class="wk-rank-delta wk-down">▼${Math.abs(diff)}</span>`;
      }
    } else if (allTimeRank) {
      const diff = allTimeRank - rank;
      if (diff > 0)
        rankDelta = `<span class="wk-rank-delta wk-up">▲${diff}</span>`;
      else if (diff < 0)
        rankDelta = `<span class="wk-rank-delta wk-down">▼${Math.abs(diff)}</span>`;
    }
    const assRaw = _cmpASSMap[p.name] ?? (_zeroBased ? 0 : 1000);
    // _statsFmt doubles the display for the ASS (EP) system — sorting/
    // coloring below still key off the real, undoubled assRaw so rank order
    // and above/below-average coloring stay correct.
    const assVal = _statsFmt(assRaw);
    const _scoreColor = (v) =>
      v > _ratingMid ? "var(--green)" : v < _ratingMid ? "var(--red)" : "var(--muted)";
    const assColHtml = `<span style="font-weight:700;color:${_scoreColor(assRaw)}">${assVal}</span>`;
    const confVal = _cmpConfMap ? _cmpConfMap[p.name] : null;
    // "±" only makes sense for the uncertainty-band systems; EP puts its
    // running points total in this column, which is a plain number.
    const confColHtml =
      confVal != null ? (_zeroBased ? `${confVal}` : `±${confVal}`) : "";
    return `<tr class="${rc}${animClass}" data-key="${escHtml(p.name)}" style="cursor:pointer" onclick="openPlayerDetail(${jsArg(p.name)})"><td>${ri}</td><td>${escHtml(p.name.toUpperCase())}${rankDelta}</td><td data-col="mp">${p.mp}</td><td data-col="record"><span class="rec-cell ${mc}">${p.mw}–${p.ml}</span></td><td data-col="winPct">${p.winPct.toFixed(0)}%</td><td data-col="gw" class="tp">${p.gw}</td><td data-col="gl" class="tn">${p.gl}</td><td data-col="gamePct" class="${gc}">${p.gamePct.toFixed(0)}%</td><td data-col="conf">${confColHtml}</td><td data-col="ass" class="cmp-ass-cell">${assColHtml}</td></tr>`;
  });

  _cmpLeaderHtmls = leaderRowHtmls;
  _cmpFiltered = filtered;

  // Delta walk base: ALL TIME uses the full active-season trajectory so each
  // match's delta reflects its true historical ASS context. TODAY starts
  // fresh and walks only today's matches (session-relative). Fair never
  // resets — its whole premise is continuous, true-strength-weighted deltas —
  // so it always walks the complete cross-season history regardless of window.
  const _allActive = activeMatches();
  const _deltaMatches =
    _matchDeltaWindow === "today"
      ? _allActive.filter((m) => m.date === todayISO())
      : _allActive;
  const matchEloDeltas =
    _scoringSystem === "ass" && _effSeasonScoringMode === "fair"
      ? computeMatchASSDeltas(withoutGuestMatches(state.matches))
      : // EP always warms its internal ELO/maturity walk from the FULL career
        // (that's the point of the engine — see _epCareerMatches), so passing
        // it the "today" window alone left every match's delta identical to
        // ALL TIME: only which matches got a pill at all changed, never their
        // value. TODAY needs its own fresh, career-blind walk (mirroring
        // every other engine's reset) to actually show something different.
        _scoringSystem === "ep" && _matchDeltaWindow === "today"
        ? computeMatchEPDeltas(_deltaMatches, _deltaMatches)
        : _matchDeltasForSystem(_scoringSystem, _deltaMatches);

  // Sync MATCHES PLAYED header controls
  const _deltaLbl = document.getElementById("cmp-delta-mode-lbl");
  if (_deltaLbl) _deltaLbl.textContent = SCORING_SYSTEM_LABELS[_scoringSystem];
  document
    .querySelectorAll(".mdw-btn")
    .forEach((b) =>
      b.classList.toggle("active", b.dataset.window === _matchDeltaWindow),
    );
  const reversedMatches = [...filtered].reverse();

  const cmpMatchesEl = document.getElementById("cmpMatches");
  const matchesHeader = cmpMatchesEl.previousElementSibling;

  // Animate the staggered entrance only on the FIRST paint of the table.
  // Subsequent renders (sort / filter) reconcile in place via morphList so the
  // table reorders smoothly instead of re-playing the whole cascade.
  const _firstPaint = !tbody.querySelector("tr[data-key]");
  if (
    _firstPaint &&
    splashDone &&
    !document.body.classList.contains("no-cascade")
  ) {
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
        cmpMatchesEl.innerHTML = emptyState({
          card: true,
          size: "sm",
          icon: "🏓",
          message: "No matches found",
        });
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
      cmpMatchesEl.innerHTML = emptyState({
        card: true,
        size: "sm",
        icon: "🏓",
        message: "No matches found",
      });
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
    ass: ["sort-ass"],
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

// buildSummaryMatchRow → ./render-match-rows.js
// buildSummaryMatchRows → ./render-match-rows.js

// Heavy precompute for the history feed: one chronological ASS walk yielding
// per-match ASS deltas + pre-match pair ranks, plus the pair-vs-pair H2H map.
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
  const cur = {}; // each player's rating right before the match being walked
  const _mcDefault = _statsDefault();
  const allPairsList = _memoPairStats(); // all pairs ever formed
  const sortedForPrecompute = [...state.matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  // Follows the active scoring picker — was hardcoded to classic ASS, so
  // every History card's rating pill and pre-match pair rank stayed on the
  // 1000-baseline engine regardless of which system was selected. Reads off
  // the same per-system timeline Statistics/Player Detail use (not a naive
  // running sum of raw match deltas) because for a shrinkage-based engine
  // (EP) the raw per-match delta is on a different scale than the displayed
  // score — summing it directly would blow the pill's numbers up into the
  // thousands instead of showing the real, bounded leaderboard score.
  const timeline = _statsTimeline(sortedForPrecompute).history;
  const idxByPlayer = {};
  sortedForPrecompute.forEach((m) => {
    [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
      if (!(p in cur)) cur[p] = _mcDefault;
    });
    // Rank all pairs by their avg rating right now (before this match)
    matchPairRankMap.set(
      m,
      new Map(
        allPairsList
          .map((p) => ({
            key: p.key,
            avgElo:
              p.players.reduce((s, n) => s + (cur[n] ?? _mcDefault), 0) /
              p.players.length,
          }))
          .sort((a, b) => b.avgElo - a.avgElo)
          .map(({ key }, i) => [key, i + 1]),
      ),
    );
    const mData = {};
    [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
      const hist = timeline[p] || [];
      const idx = idxByPlayer[p] ?? 0;
      const entry = hist[idx];
      const before = cur[p] ?? _mcDefault;
      const after = entry ? entry.elo : before;
      mData[p] = { delta: after - before, after };
      cur[p] = after;
      idxByPlayer[p] = idx + 1;
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
    return `<span class="elo-delta-pill ${cls}"><span class="elo-pname">${escHtml(short)}</span><span class="elo-pval">${_statsFmt(d.after)}</span><span class="elo-parrow">${arrow}${_statsFmt(Math.abs(d.delta))}</span></span>`;
  };

  const mkTeamBlock = (players, won, score, hasZeroEmoji, preMatchRankMap) => {
    const winCls = won ? "winner" : "";
    const scoreCls = won ? "win" : "";
    const crown = won ? "👑 " : "";
    const rank = preMatchRankMap?.get(getPairKey(players));
    const rankHtml = rank
      ? `<div class="team-pair-rank">${escHtml(_statsLabel())} #${rank}</div>`
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
      <button class="cal-nav" onclick="calNav(-1)" aria-label="Previous month" title="Previous month">‹</button>
      <span class="cal-month-lbl">${monthName}</span>
      <button class="cal-nav" onclick="calNav(1)" aria-label="Next month" title="Next month">›</button>
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
    const h2hEloHist = _memoASSHistory();
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
              <div style="font-size:9px;font-weight:800;letter-spacing:0.1em;color:var(--muted);margin-bottom:6px">ASS IMPACT FROM THIS RIVALRY</div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                  <div style="font-size:16px;font-weight:900">${fmtEloImpact(h2hP1Impact)}</div>
                  <div style="font-size:9px;color:var(--muted)">${escHtml(h2hFilterA.toUpperCase())}</div>
                </div>
                <div style="font-size:9px;color:var(--muted)">ASS GAINED / LOST</div>
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

  // Windowing: reset to the default window whenever the result set (filters)
  // changes; "show older" keeps the same signature so the expanded window
  // survives its re-render. matches is chronological-ascending, so the
  // newest _histWindow are the tail; buildMatchCards reverses to newest-first.
  const _winSig = _histFilterKey();
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
  const featureCards = Array.from(tmpAll.querySelectorAll(".pair-stats-card"));
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
      setTimeout(
        () => {
          if (_renderModernGen !== _gen) return;
          histList.appendChild(moreBtn);
        },
        (allAnimated.length + 1) * 100,
      );
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
  _invalidateStatsMemo();
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
  else if (mode === "eloTLOverlay") {
    _eloTLSetOverlay(value);
  } else if (mode === "cmpplayerA") {
    viewState.cmpPlayerA = value;
    _updateCmpSlots();
  } else if (mode === "cmpplayerB") {
    viewState.cmpPlayerB = value;
    _updateCmpSlots();
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
    document.getElementById("cmpLabelA").textContent =
      viewState.cmpPlayerA || "P1";
    aBtn.classList.toggle("h2h-slot-filled", !!viewState.cmpPlayerA);
  }
  if (bBtn) {
    document.getElementById("cmpLabelB").textContent =
      viewState.cmpPlayerB || "P2";
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
  const matches = [...state.matches];
  const addList = document.getElementById("add-match-list");
  if (!addList) return;
  addList.innerHTML = buildMatchCards(matches, true);
  addList
    .querySelectorAll(".team-score[data-final], .motd-score[data-final]")
    .forEach((el) => {
      el.textContent = el.dataset.final || "0";
    });
}

function _removeMatchFromTA(m) {
  const ta = document.getElementById("matchTA");
  if (!ta) return;
  const target = matchToEditableLine(m).trim();
  const lines = ta.value.split("\n");
  const filtered = lines.filter((l) => l.trim() !== target);
  if (filtered.length === lines.length) return; // line not found
  // Remove orphaned date headers (a header with no match lines before the next header/end)
  const cleaned = [];
  for (let i = 0; i < filtered.length; i++) {
    if (parseDateHdr(filtered[i].trim())) {
      let hasMatch = false;
      for (let j = i + 1; j < filtered.length; j++) {
        const nt = filtered[j].trim();
        if (!nt) continue;
        if (parseDateHdr(nt)) break;
        hasMatch = true;
        break;
      }
      if (hasMatch) cleaned.push(filtered[i]);
    } else {
      cleaned.push(filtered[i]);
    }
  }
  ta.value = cleaned.join("\n");
  if (ta.value.trim() && !ta.value.endsWith("\n")) ta.value += "\n";
  previewMatchImport();
}

function deleteMatchByIndex(i) {
  const removed = state.matches.splice(i, 1)[0];
  if (!removed) return;
  logAdminAction(
    "Delete Match",
    `${(removed.teamA || []).join("/")} vs ${(removed.teamB || []).join("/")} on ${fmtDate(removed.date)}`,
  );
  removed.deletedAt = todayISO();
  deletedMatches.unshift(removed);
  _removeMatchFromTA(removed);
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
  logAdminAction(
    "Restore Match",
    `${(m.teamA || []).join("/")} vs ${(m.teamB || []).join("/")} on ${fmtDate(m.date)}`,
  );
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
      <button onclick="restoreMatch(${i})" aria-label="Restore match" title="Restore match" style="font-size:10px;font-weight:700;padding:4px 8px;border-radius:8px;border:1px solid rgba(var(--theme-rgb),0.3);background:transparent;color:var(--theme);cursor:pointer">↩</button>
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
      <button class="mei-close" onclick="closeMatchEdit()" aria-label="Close" title="Close">✕</button>
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
        <button class="mei-close" onclick="closeMatchEdit()" aria-label="Close" title="Close">✕</button>
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
  const candidate = {
    id: _genMatchId(),
    teamA,
    teamB,
    scoreA: sA,
    scoreB: sB,
    date,
  };

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
  const eloMap = _statsRatingMap(activeMatches());
  const elo = _statsFmt(eloMap[name] ?? _statsDefault());
  const eloLbl = _statsLabel();
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

  const allRanked = computeStats(activeMatches(), eloMap, _statsSrFn(eloMap));
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
            <span style="color:#4a4a6a;font-size:10px;font-weight:600">${elo} ${escHtml(eloLbl)}</span>
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
  const eloNow = _memoASS();
  const eloAt = computeASS(
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
  const stats = computeStats(ms, computeASS(ms));
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
    ${mover ? statRow("⚡", `Biggest ${_scoringLabel()} Gain`, mover.name, `+${mover.gain > 0 ? mover.gain : 0}`) : ""}
    ${hotPlayer ? statRow("🔥", "Hot Streak", hotPlayer.name, `${hotPlayer.curStreak} in a row`) : ""}
    ${wkPairs ? statRow("🤝", "Best Pair", wkPairs.players.join(" & "), `${wkPairs.wins}W ${wkPairs.winPct}%`) : ""}
    ${stats[0] ? statRow("📊", "Top Performer", stats[0].name, `SR ${stats[0].sr.toFixed(2)}`) : ""}
  </div>`;
}

function renderDigestCard(filter, player) {
  viewState.digestFilter = filter || viewState.digestFilter;
  viewState.digestPlayer =
    player !== undefined ? player : viewState.digestPlayer;
  const content = document.getElementById("digest-content");
  if (content)
    content.innerHTML = _buildDigestContent(
      viewState.digestFilter,
      viewState.digestPlayer,
    );
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
  const players = sortPlayersGuestsLast(_statPlayerNames());
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

function _pairsHeaderHtml() {
  const arrow = (col) => {
    if (viewState.pairSort.key !== col)
      return '<span style="opacity:0.25;font-size:7px;margin-left:2px">◇</span>';
    return `<span style="font-size:7px;margin-left:2px">${viewState.pairSort.dir < 0 ? "▼" : "▲"}</span>`;
  };
  return `<div class="chem-header">
    <div class="chem-rank">RANK</div>
    <div class="chem-elo-rank chem-sort-hd" onclick="sortPairsBy('eloRank')">${_scoringLabel()}${arrow("eloRank")}</div>
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
  const toShow = viewState.pairsShowAll
    ? sorted
    : sorted.slice(0, PAIRS_PAGE_LIMIT);
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
  const eloAfter = computeASS(_amD.filter((m) => (m.date || "") <= date));
  const eloBefore = computeASS(_amD.filter((m) => (m.date || "") < date));
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
      <button onclick="document.getElementById('session-highlights-modal').remove()" aria-label="Close" title="Close" style="background:rgba(255,255,255,0.06);border:none;color:var(--muted);font-size:14px;border-radius:8px;width:28px;height:28px;cursor:pointer">✕</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
      <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:8px;text-align:center"><div style="font-size:14px;font-weight:800;color:var(--theme)">${sortedMs.length}</div><div style="font-size:9px;color:var(--muted);font-weight:700">MATCHES</div></div>
      <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:8px;text-align:center"><div style="font-size:14px;font-weight:800;color:var(--theme)">${players.length}</div><div style="font-size:9px;color:var(--muted);font-weight:700">PLAYERS</div></div>
      <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:8px;text-align:center"><div style="font-size:11px;font-weight:800;color:var(--accent)">${mvp}</div><div style="font-size:9px;color:var(--muted);font-weight:700">🏆 MVP</div></div>
    </div>
    ${closest ? `<div style="font-size:10px;font-weight:700;color:var(--muted);margin-bottom:6px">🔥 CLOSEST GAME</div><div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:8px 12px;margin-bottom:12px;font-size:12px;font-weight:700">${closest.teamA.map((p) => p.split(" ")[0]).join("&")} ${closest.scoreA}–${closest.scoreB} ${closest.teamB.map((p) => p.split(" ")[0]).join("&")}</div>` : ""}
    <div style="font-size:10px;font-weight:700;color:var(--muted);margin-bottom:6px">ALL MATCHES</div>
    <div style="margin-bottom:12px">${matchRows}</div>
    <div style="font-size:10px;font-weight:700;color:var(--muted);margin-bottom:6px">⚡ ASS CHANGES</div>
    <div>${gainRows}</div>
  </div>`;
  document.body.appendChild(overlay);
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
  const eloMap = _memoASS();
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
  let low = _pvpLow,
    high = _pvpHigh;
  let dragging = null;

  function grad() {
    return `linear-gradient(to right,#f04f4f 0%,#f04f4f ${low}%,#f5c842 ${low}%,#f5c842 ${high}%,#36d47e ${high}%,#36d47e 100%)`;
  }
  function render() {
    const bar = document.getElementById("pvp-rng-bar");
    const tl = document.getElementById("pvp-rng-tl");
    const th = document.getElementById("pvp-rng-th");
    if (bar) bar.style.background = grad();
    if (tl) tl.style.left = low + "%";
    if (th) th.style.left = high + "%";
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
  el.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px";

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
    return Math.round(
      Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
    );
  }
  function onMove(clientX) {
    if (!dragging) return;
    const p = getPct(clientX);
    if (dragging === "l") low = Math.max(0, Math.min(p, high - 1));
    else high = Math.max(low + 1, Math.min(p, 100));
    render();
  }

  const tl = document.getElementById("pvp-rng-tl");
  const th = document.getElementById("pvp-rng-th");
  tl.addEventListener("mousedown", (e) => {
    dragging = "l";
    e.preventDefault();
  });
  th.addEventListener("mousedown", (e) => {
    dragging = "h";
    e.preventDefault();
  });
  tl.addEventListener(
    "touchstart",
    (e) => {
      dragging = "l";
      e.preventDefault();
    },
    { passive: false },
  );
  th.addEventListener(
    "touchstart",
    (e) => {
      dragging = "h";
      e.preventDefault();
    },
    { passive: false },
  );

  const mmov = (e) => onMove(e.clientX);
  const tmov = (e) => {
    e.preventDefault();
    onMove(e.touches[0].clientX);
  };
  const mup = () => {
    dragging = null;
  };
  document.addEventListener("mousemove", mmov);
  document.addEventListener("touchmove", tmov, { passive: false });
  document.addEventListener("mouseup", mup);
  document.addEventListener("touchend", mup);

  function cleanup() {
    document.removeEventListener("mousemove", mmov);
    document.removeEventListener("touchmove", tmov);
    document.removeEventListener("mouseup", mup);
    document.removeEventListener("touchend", mup);
  }
  window._pvpRangeApply = () => {
    _pvpLow = low;
    _pvpHigh = high;
    el.remove();
    cleanup();
    _refreshPairMatrix();
  };
  window._pvpRangeClose = () => {
    el.remove();
    cleanup();
  };
  el.onclick = (e) => {
    if (e.target === el) window._pvpRangeClose();
  };
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
  const _allTimeElo = _memoASS();
  const players = Object.keys(played).sort(
    (a, b) =>
      (_allTimeElo[b] || 1000) - (_allTimeElo[a] || 1000) || a.localeCompare(b),
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
          const clickAttrs = `data-pa="${escHtml(a)}" data-pb="${escHtml(b)}" onclick="_openPairDetail(this)"`;
          if (mode === "count") {
            return `<td class="pvp-td pog-td-click" ${clickAttrs} title="${escHtml(`${a} & ${b} · partnered ${d.partnered}, opposed ${d.opposed} — tap for details`)}"><span style="color:var(--green);font-weight:800">${d.partnered}</span><span style="color:var(--muted);font-size:8px;margin:0 1px">/</span><span style="color:var(--red);font-weight:800">${d.opposed}</span></td>`;
          }
          const pct = Math.round((d.partnered / both) * 100);
          const cls =
            pct >= _pvpHigh
              ? "pvp-win"
              : pct > _pvpLow
                ? "pvp-even"
                : "pvp-loss";
          return `<td class="pvp-td pog-td-click ${cls}" ${clickAttrs} title="${escHtml(`${a} & ${b} · partnered ${d.partnered}/${both} (${pct}%), opposed ${d.opposed}/${both} (${100 - pct}%) — tap for details`)}">${pct}%<sub class="pvp-total">${both}</sub></td>`;
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

  const rangeBtn =
    mode === "pct"
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

// ── Partner/Opponent Grid: cell drill-down popup ─────────────────────────
// Tapping a grid cell shows how often A & B partnered/opposed; tapping the
// partnered percentage inside that drills down into which opponents they
// faced (and how often) across those partnered matches.
function _openPairDetail(el) {
  const a = el.dataset.pa;
  const b = el.dataset.pb;
  document.getElementById("pair-detail-popup")?.remove();
  const wrap = document.createElement("div");
  wrap.id = "pair-detail-popup";
  wrap.setAttribute("role", "dialog");
  wrap.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px";
  wrap.onclick = (e) => {
    if (e.target === wrap) _closePairDetail();
  };
  document.body.appendChild(wrap);
  _renderPairDetailSummary(a, b);
}

function _closePairDetail() {
  document.getElementById("pair-detail-popup")?.remove();
}

function _pairDetailMatches() {
  return filterMatches(viewState.pairMatrixPeriod);
}

function _pairDetailCard(inner) {
  return `<div style="background:var(--bg-card,#12121c);border:1px solid rgba(var(--theme-rgb),0.25);border-radius:18px;padding:20px;max-width:360px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,0.6);max-height:80vh;overflow-y:auto">${inner}</div>`;
}

function _renderPairDetailSummary(a, b) {
  const wrap = document.getElementById("pair-detail-popup");
  if (!wrap) return;
  const matches = _pairDetailMatches();
  const matrix = computePartnerOpponentMatrix(matches, normPlayer);
  const d = (matrix[normPlayer(a)] && matrix[normPlayer(a)][normPlayer(b)]) || {
    partnered: 0,
    opposed: 0,
  };
  const both = d.partnered + d.opposed;
  const pct = both ? Math.round((d.partnered / both) * 100) : 0;

  wrap.innerHTML = _pairDetailCard(`
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
      <div>
        <div style="font-size:13px;font-weight:900;color:var(--text)">${escHtml(a)} &amp; ${escHtml(b)}</div>
        <div style="font-size:9px;color:var(--muted);margin-top:3px">${both} match${both === 1 ? "" : "es"} together this period</div>
      </div>
      <button onclick="_closePairDetail()" aria-label="Close" style="background:none;border:none;color:var(--muted);font-size:18px;line-height:1;cursor:pointer;padding:0 2px">✕</button>
    </div>
    <button data-pa="${escHtml(a)}" data-pb="${escHtml(b)}" onclick="_renderPairDetailBreakdownEl(this)" ${d.partnered ? "" : "disabled"} style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:rgba(54,212,126,0.1);border:1px solid rgba(54,212,126,0.3);border-radius:12px;margin-bottom:8px;cursor:${d.partnered ? "pointer" : "default"};opacity:${d.partnered ? 1 : 0.5}">
      <span style="font-size:11px;font-weight:700;color:var(--text)">🤝 Partnered</span>
      <span style="display:flex;align-items:center;gap:6px">
        <span style="font-size:16px;font-weight:900;color:#36d47e">${pct}%</span>
        <span style="font-size:10px;color:var(--muted)">(${d.partnered})</span>
        ${d.partnered ? '<span style="font-size:12px;color:var(--muted)">›</span>' : ""}
      </span>
    </button>
    <button data-pa="${escHtml(a)}" data-pb="${escHtml(b)}" onclick="_renderOpposedPartnerBreakdownEl(this)" ${d.opposed ? "" : "disabled"} style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:rgba(240,80,80,0.08);border:1px solid rgba(240,80,80,0.22);border-radius:12px;cursor:${d.opposed ? "pointer" : "default"};opacity:${d.opposed ? 1 : 0.5}">
      <span style="font-size:11px;font-weight:700;color:var(--text)">⚔️ Opposed</span>
      <span style="display:flex;align-items:center;gap:6px">
        <span style="font-size:16px;font-weight:900;color:#f04f4f">${100 - pct}%</span>
        <span style="font-size:10px;color:var(--muted)">(${d.opposed})</span>
        ${d.opposed ? '<span style="font-size:12px;color:var(--muted)">›</span>' : ""}
      </span>
    </button>
    ${d.partnered || d.opposed ? `<div style="font-size:9px;color:var(--muted);margin-top:12px;text-align:center">Tap a row to see the detail</div>` : ""}
  `);
}

function _renderPairDetailBreakdown(a, b) {
  const wrap = document.getElementById("pair-detail-popup");
  if (!wrap) return;
  const matches = _pairDetailMatches();
  const { total, breakdown } = computeOpponentBreakdown(matches, a, b, normPlayer);

  const rows = breakdown
    .map(
      (o) => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
        <span style="flex:1;font-size:11px;font-weight:700;color:var(--text)">${escHtml(o.name)}</span>
        <div style="flex:2;height:6px;border-radius:3px;background:rgba(255,255,255,0.08);overflow:hidden">
          <div style="height:100%;width:${o.pct}%;background:var(--accent);border-radius:3px"></div>
        </div>
        <span style="font-size:11px;font-weight:900;color:var(--accent);min-width:34px;text-align:right">${o.pct}%</span>
        <span style="font-size:9px;color:var(--muted);min-width:16px;text-align:right">${o.count}</span>
      </div>`,
    )
    .join("");

  wrap.innerHTML = _pairDetailCard(`
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
      <div>
        <div style="font-size:13px;font-weight:900;color:var(--text)">Faced while ${escHtml(a)} &amp; ${escHtml(b)} partnered</div>
        <div style="font-size:9px;color:var(--muted);margin-top:3px">${total} partnered match${total === 1 ? "" : "es"} this period</div>
      </div>
      <button onclick="_closePairDetail()" aria-label="Close" style="background:none;border:none;color:var(--muted);font-size:18px;line-height:1;cursor:pointer;padding:0 2px">✕</button>
    </div>
    ${rows || `<div style="font-size:11px;color:var(--muted);padding:10px 0">No opponent data.</div>`}
    <button data-pa="${escHtml(a)}" data-pb="${escHtml(b)}" onclick="_renderPairDetailSummaryEl(this)" style="width:100%;margin-top:14px;padding:10px;background:rgba(var(--theme-rgb),0.1);border:1px solid rgba(var(--theme-rgb),0.25);border-radius:10px;font-size:11px;font-weight:700;color:var(--text);cursor:pointer">‹ Back</button>
  `);
}

function _renderPairDetailBreakdownEl(el) {
  _renderPairDetailBreakdown(el.dataset.pa, el.dataset.pb);
}

function _renderPairDetailSummaryEl(el) {
  _renderPairDetailSummary(el.dataset.pa, el.dataset.pb);
}

// Drill-down for the "Opposed" side: when A & B were on opposite teams, who
// was A's partner, and how often.
function _renderOpposedPartnerBreakdown(a, b) {
  const wrap = document.getElementById("pair-detail-popup");
  if (!wrap) return;
  const matches = _pairDetailMatches();
  const { total, breakdown } = computePartnerBreakdownWhenOpposed(
    matches,
    a,
    b,
    normPlayer,
  );

  const rows = breakdown
    .map(
      (o) => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
        <span style="flex:1;font-size:11px;font-weight:700;color:var(--text)">${escHtml(o.name)}</span>
        <div style="flex:2;height:6px;border-radius:3px;background:rgba(255,255,255,0.08);overflow:hidden">
          <div style="height:100%;width:${o.pct}%;background:var(--accent);border-radius:3px"></div>
        </div>
        <span style="font-size:11px;font-weight:900;color:var(--accent);min-width:34px;text-align:right">${o.pct}%</span>
        <span style="font-size:9px;color:var(--muted);min-width:16px;text-align:right">${o.count}</span>
      </div>`,
    )
    .join("");

  wrap.innerHTML = _pairDetailCard(`
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
      <div>
        <div style="font-size:13px;font-weight:900;color:var(--text)">${escHtml(a)}'s partner vs ${escHtml(b)}</div>
        <div style="font-size:9px;color:var(--muted);margin-top:3px">${total} opposed match${total === 1 ? "" : "es"} this period</div>
      </div>
      <button onclick="_closePairDetail()" aria-label="Close" style="background:none;border:none;color:var(--muted);font-size:18px;line-height:1;cursor:pointer;padding:0 2px">✕</button>
    </div>
    ${rows || `<div style="font-size:11px;color:var(--muted);padding:10px 0">No partner data.</div>`}
    <button data-pa="${escHtml(a)}" data-pb="${escHtml(b)}" onclick="_renderPairDetailSummaryEl(this)" style="width:100%;margin-top:14px;padding:10px;background:rgba(var(--theme-rgb),0.1);border:1px solid rgba(var(--theme-rgb),0.25);border-radius:10px;font-size:11px;font-weight:700;color:var(--text);cursor:pointer">‹ Back</button>
  `);
}

function _renderOpposedPartnerBreakdownEl(el) {
  _renderOpposedPartnerBreakdown(el.dataset.pa, el.dataset.pb);
}

// ── Avg Opponent ASS Gap leaderboard ──────────────────────────────────────
function _eloGapSetPeriod(btn, period) {
  viewState.eloGapPeriod = period;
  _refreshEloGap();
}
function _refreshEloGap() {
  const box = document.getElementById("elo-gap-box");
  if (box) box.innerHTML = _secBody(() => _eloGapInner());
}
function _buildEloGapHtml() {
  return `<div class="ana-card" style="padding:10px 8px" id="elo-gap-box">${_eloGapInner()}</div>`;
}
function _eloGapInner() {
  const period = viewState.eloGapPeriod || "all";
  const matches = filterMatches(period);

  const periodPills =
    `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">` +
    [
      ["today", "DAILY"],
      ["week", "WEEKLY"],
      ["weekend", "WEEKEND"],
      ["month", "MONTHLY"],
      ["all", "ALL TIME"],
    ]
      .map(
        ([v, l]) =>
          `<button class="digest-filter-btn${period === v ? " active" : ""}" onclick="_eloGapSetPeriod(this,'${v}')">${l}</button>`,
      )
      .join("") +
    `</div>`;

  // ASS ratings scoped to this filter's own matches (all-time filter reuses
  // the memoized all-time map — same convention as the Home ASS map at
  // _isAllFilter ? _memoASS() : computeASS(filtered)).
  const assMap = period === "all" ? _memoASS() : computeASS(matches);
  const rows = computeAvgOpponentEloGap(matches, assMap);

  if (!rows.length)
    return `${periodPills}<div style="color:var(--muted);font-size:12px;padding:10px 0">No matches in this period.</div>`;

  // Rank on the ASS leaderboard for this same period.
  const rankOrder = Object.entries(assMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
  const rankOf = (name) => {
    const i = rankOrder.indexOf(name);
    return i === -1 ? null : i + 1;
  };

  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.avgGap)));
  const header = `<div style="display:flex;align-items:center;gap:10px;padding:0 0 6px;font-size:8px;font-weight:800;letter-spacing:0.05em;color:var(--muted);text-transform:uppercase">
    <span style="width:18px;text-align:center">#</span>
    <span style="flex:1.2">Player</span>
    <span style="width:26px;text-align:center">Rank</span>
    <span style="min-width:40px;text-align:right">ASS</span>
    <span style="flex:2;text-align:center">ASS Gap</span>
    <span style="min-width:46px;text-align:right">Avg</span>
    <span style="min-width:42px;text-align:right">In Favor</span>
    <span style="min-width:16px;text-align:right">MP</span>
  </div>`;
  const body = rows
    .map((r, i) => {
      const positive = r.avgGap >= 0;
      const barPct = Math.round((Math.abs(r.avgGap) / maxAbs) * 100);
      const color = positive ? "#f04f4f" : "#36d47e";
      const sign = positive ? "+" : "";
      const rank = rankOf(r.name);
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
        <span style="width:18px;text-align:center;font-size:9px;color:var(--muted)">${i + 1}</span>
        <span style="flex:1.2;font-size:11px;font-weight:700;color:var(--text)">${escHtml(r.name)}</span>
        <span style="width:26px;text-align:center;font-size:10px;font-weight:800;color:var(--accent)">${rank ? "#" + rank : "—"}</span>
        <span style="min-width:40px;text-align:right;font-size:10px;font-weight:700;color:var(--text)">${Math.round(assMap[r.name] ?? 1000)}</span>
        <div style="flex:2;height:6px;border-radius:3px;background:rgba(255,255,255,0.08);overflow:hidden">
          <div style="height:100%;width:${barPct}%;background:${color};border-radius:3px"></div>
        </div>
        <span style="font-size:11px;font-weight:900;color:${color};min-width:46px;text-align:right">${sign}${Math.round(r.avgGap)}</span>
        <span style="font-size:10px;font-weight:700;color:var(--text);min-width:42px;text-align:right">${r.favorablePct}%</span>
        <span style="font-size:9px;color:var(--muted);min-width:16px;text-align:right">${r.matches}</span>
      </div>`;
    })
    .join("");

  return `${periodPills}
    <div style="font-size:9px;color:var(--muted);margin-bottom:8px;line-height:1.5"><strong style="color:#f04f4f">Positive</strong> = faced tougher opponents on average (combined ASS higher than their own team). <strong style="color:#36d47e">Negative</strong> = faced weaker opponents. Avg = avg ASS points. In Favor = % of matches where the player's own team had the higher combined ASS. Rank = ASS leaderboard position for this period.</div>
    ${header}
    ${body}`;
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
    .filter(
      (m) =>
        (m.teamA || []).includes(playerName) ||
        (m.teamB || []).includes(playerName),
    )
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
    title.textContent =
      slot === "lb"
        ? `${modeLabel} GAMES — LEADERBOARD`
        : `${modeLabel} GAMES — P${slot}`;
  }
  const numEl = document.getElementById("cmp-count-num");
  if (numEl) numEl.textContent = _cmpPickerCount;
  document
    .getElementById("cmp-count-overlay")
    ?.classList.add("live-sheet-open");
  document.getElementById("cmp-count-sheet")?.classList.add("live-sheet-open");
}

function _cmpCountPickerClose() {
  document
    .getElementById("cmp-count-overlay")
    ?.classList.remove("live-sheet-open");
  document
    .getElementById("cmp-count-sheet")
    ?.classList.remove("live-sheet-open");
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
    // FIRST/LAST window works over all-time data — reset date filter to ALL TIME
    cmpFilter = "all";
    cmpFrom = null;
    cmpTo = null;
    const sel = document.getElementById("cmpSel");
    if (sel) sel.value = "all";
    const dr = document.getElementById("cmpDr");
    if (dr) dr.style.display = "none";
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

// ── SCORING PICKER (Summary tab badge) ──────────────────────
// Tapping #summary-mode-badge opens a sheet with two sections: which SYSTEM
// computes the rating (ASS / Glicko-2 / OpenSkill), and — only under ASS,
// where it has a well-defined meaning — which season-carryover FORMAT to use
// (Reset/Flip/Fair). Format options with no valid reference season
// (e.g. the very first season, or "ALL SEASONS") are shown disabled —
// selecting one is a no-op in that case and renderCompact() silently falls
// back to Reset regardless of the stored preference, so nothing breaks if a
// season boundary later changes.
const SCORING_SYSTEM_BLURBS = {
  ass: "The original: match quality (margin + games) times an opponent-strength multiplier, starting everyone at 1000. Kept for the Flip/Fair season formats and for comparison.",
  glicko2: "Chess.com/Lichess's algorithm: a rating plus a confidence band that narrows the more you play.",
  openskill: "An open alternative to Xbox's TrueSkill, built for team games — tracks a skill estimate and how sure it is per player.",
  fairshare: "Individual points, doubles-aware: since opponents target the weaker partner, that player's rating swings more (both up and down) than a stronger partner's — same team result, split by who the match really rode on.",
  ep: "No free 1000 to sit on. Everyone starts at 0 and earns from every match — wins always pay, losses pay too while you're new, and only start costing once you have 50 games behind you. Ranked on points per match, so showing up counts but mileage alone can't buy a top spot.",
};

function _scoringSystemPickerRows() {
  return SCORING_SYSTEMS.map((sys) => {
    const selected = _scoringSystem === sys;
    return `<button class="live-sheet-item${selected ? " live-sheet-item-selected" : ""}" onclick="_setScoringSystem('${sys}')">
      <div style="flex:1;text-align:left;font-size:12px;font-weight:800">${selected ? "✓ " : ""}${SCORING_SYSTEM_LABELS[sys]}</div>
    </button>`;
  }).join("");
}

function _seasonScoringPickerRows() {
  const season = _activeSeason();
  const hasRef = hasSeasonScoringReference(state.seasons, season);
  return SEASON_SCORING_MODES.map((mode) => {
    const disabled = mode !== "reset" && !hasRef;
    const selected = _seasonScoringMode === mode;
    return `<button class="live-sheet-item${selected ? " live-sheet-item-selected" : ""}" ${disabled ? "disabled" : `onclick="_setSeasonScoringMode('${mode}')"`}>
      <div style="flex:1;text-align:left;font-size:12px;font-weight:800">${selected ? "✓ " : ""}${SEASON_SCORING_LABELS[mode]}</div>
    </button>`;
  }).join("");
}

function _renderScoringPickerSheet() {
  const list = document.getElementById("season-scoring-list");
  if (!list) return;
  const season = _activeSeason();
  const showFormats = _scoringSystem === "ass";
  const hasRef = hasSeasonScoringReference(state.seasons, season);
  list.innerHTML = `
    <div class="live-sheet-section-lbl">SCORING SYSTEM</div>
    ${_scoringSystemPickerRows()}
    ${
      showFormats
        ? `<div class="live-sheet-section-lbl" style="margin-top:10px">SEASON FORMAT</div>${_seasonScoringPickerRows()}`
        : `<div class="live-sheet-section-lbl" style="margin-top:10px">SEASON FORMAT</div><div style="font-size:10px;color:var(--muted);padding:4px 10px 2px">Season formats (Flip/Fair) are ASS-only for now.</div>`
    }
  `;
  const note = document.getElementById("season-scoring-note");
  if (note) note.style.display = showFormats && !hasRef ? "block" : "none";
}

function openSeasonScoringPicker() {
  _renderScoringPickerSheet();
  document.getElementById("season-scoring-overlay")?.classList.add("live-sheet-open");
  document.getElementById("season-scoring-sheet")?.classList.add("live-sheet-open");
}

function closeSeasonScoringPicker() {
  document.getElementById("season-scoring-overlay")?.classList.remove("live-sheet-open");
  document.getElementById("season-scoring-sheet")?.classList.remove("live-sheet-open");
}

function _setScoringSystem(sys) {
  if (!SCORING_SYSTEMS.includes(sys)) return;
  _scoringSystem = sys;
  try {
    localStorage.setItem("padel_scoring_system", sys);
  } catch (e) {}
  _renderScoringPickerSheet();
  _updateSeasonScoringBadge();
  document.body.classList.add("no-cascade");
  const tbody = document.getElementById("cmpBody");
  if (tbody) tbody.innerHTML = "";
  renderCompact();
  document.body.classList.remove("no-cascade");
}

function _setSeasonScoringMode(mode) {
  if (!SEASON_SCORING_MODES.includes(mode)) return;
  _seasonScoringMode = mode;
  try {
    localStorage.setItem("padel_season_scoring_mode", mode);
  } catch (e) {}
  closeSeasonScoringPicker();
  _updateSeasonScoringBadge();
  document.body.classList.add("no-cascade");
  const tbody = document.getElementById("cmpBody");
  if (tbody) tbody.innerHTML = "";
  renderCompact();
  document.body.classList.remove("no-cascade");
}

// ── SCORING INFO POPUP (ⓘ icon beside the badge) ────────────
// Plain-language explainer for every system and season format, each with a
// worked numeric example — a floating popup (not the picker sheet) so
// tapping ⓘ never accidentally changes a selection.
const SCORING_SYSTEM_EXAMPLES = {
  ass: `<b>Example:</b> a 6–3 win (margin 3, 9 games total) has "quality" 4×3+9 = 21. If the teams were evenly matched, the winners each gain about +21 and the losers each lose about +21. Beating a much stronger average-rated team can push a win up toward +30–40; beating a much weaker team can shrink it down toward +10 or less.`,
  glicko2: `<b>Example:</b> two brand-new players (rating 1000, confidence band ±350) play their first match. The winner might jump to about 1050 with their band narrowing to ±290 — the system is a little more sure of them now. After 20+ matches, that band can shrink under ±100, so each new result moves the rating much less than it did on day one.`,
  openskill: `<b>Example:</b> a proven veteran (low uncertainty) partners a total newcomer (high uncertainty) and they win. The newcomer's rating jumps a lot — the system has a lot left to learn about them — while the veteran's barely moves, since their skill is already well established.`,
  fairshare: `<b>Example:</b> a 1300-rated player and a 700-rated player team up and beat two 1000-rated players; the win is worth 18 points to the team. Because Puneet (700) is the weaker partner, he gets the bigger share: <b>Puneet +26, Ankit +10</b> (average 18 — the team total either way). Had they LOST instead, Puneet would drop more too — <b>Puneet −35, Ankit −13</b> — the split always favours whichever partner the match rode on more, win or lose.`,
  ep: `<b>Example:</b> a 60-game veteran partners a 10-game newcomer against two solid regulars. Win it 4–1 and <b>both bank about +110</b> — pairing with a weaker player makes the team an underdog, so the win is worth more, not less. Lose it 2–4 and the two part ways: the veteran takes <b>−10</b> (50 games in, losses count), while the newcomer still earns <b>+14</b> (still in their first 50). Same team, same match — the difference is how long each has been playing. A 4–0 pays about 40% more than a 4–3.`,
};

const SEASON_SCORING_EXAMPLES = {
  reset: `<b>Example:</b> you finished last season at 1400. This season you (and everyone else) start over at exactly 1000, as if last season never happened.`,
  flip: `<b>Example:</b> you finished last season at 650 → this season you start at 2000−650 = <b>1350</b>. A player who finished at 1200 instead starts at 2000−1200 = <b>800</b>. From there, matches play out normally on top of that new starting point.`,
  fair: `<b>Example:</b> a player who's really 1300-strength (all-time) beats a 700-strength player for 5 points in the season's first match. Their season score becomes 1000+5 = <b>1005</b> (not 1305) — match points are earned using true strength, but credited on a clean 1000 season baseline.`,
};

function _scoringInfoHtml() {
  const sysRows = SCORING_SYSTEMS.map((sys) => `
    <div class="scoring-info-row">
      <div class="scoring-info-title">${SCORING_SYSTEM_LABELS[sys]}</div>
      <div class="scoring-info-body">${SCORING_SYSTEM_BLURBS[sys]}</div>
      <div class="scoring-info-example">${SCORING_SYSTEM_EXAMPLES[sys] || ""}</div>
    </div>`).join("");
  const fmtRows = SEASON_SCORING_MODES.map((mode) => `
    <div class="scoring-info-row">
      <div class="scoring-info-title">${SEASON_SCORING_LABELS[mode]}</div>
      <div class="scoring-info-body">${SEASON_SCORING_DESCRIPTIONS[mode]}</div>
      <div class="scoring-info-example">${SEASON_SCORING_EXAMPLES[mode] || ""}</div>
    </div>`).join("");
  return `
    <div class="scoring-info-section-lbl">SCORING SYSTEMS</div>
    ${sysRows}
    <div class="scoring-info-section-lbl" style="margin-top:12px">SEASON FORMATS <span style="font-weight:600;color:var(--muted);text-transform:none;letter-spacing:0">(ASS only)</span></div>
    ${fmtRows}
    <div style="font-size:9px;color:var(--muted);padding:10px 10px 2px;line-height:1.5">Every system starts new players at 1000. "±" columns show how confident the system is — a wide band means "not proven yet," and it narrows the more a player plays.</div>
  `;
}

// Floating popup (same pattern as the H2H / shutout-drill modals) rather than
// a bottom sheet, so it reads like a reference card, not a picker.
function openScoringInfoSheet() {
  document.getElementById("scoring-info-modal")?.remove();
  const modal = document.createElement("div");
  modal.id = "scoring-info-modal";
  modal.className = "h2h-modal-overlay";
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  modal.innerHTML = `<div class="h2h-modal-card" style="max-height:82vh;display:flex;flex-direction:column">
    <div class="h2h-modal-header">
      <span class="h2h-modal-title">ⓘ HOW SCORING WORKS</span>
      <button class="h2h-modal-close" onclick="document.getElementById('scoring-info-modal').remove()" aria-label="Close" title="Close">✕</button>
    </div>
    <div style="overflow-y:auto;flex:1;padding:2px 4px 4px">${_scoringInfoHtml()}</div>
  </div>`;
  document.body.appendChild(modal);
}

function closeScoringInfoSheet() {
  document.getElementById("scoring-info-modal")?.remove();
}

// Reflects the badge's text/subscript with the effective mode — falls back to
// showing RESET when the active season has no valid reference, even if a
// different mode is stored, so the badge never claims an inactive variant.
function _updateSeasonScoringBadge() {
  const badge = document.getElementById("summary-mode-badge");
  if (!badge) return;
  const sysLabel = SCORING_SYSTEM_LABELS[_scoringSystem];
  if (_scoringSystem !== "ass") {
    badge.innerHTML = sysLabel;
    return;
  }
  const season = _activeSeason();
  const hasRef = hasSeasonScoringReference(state.seasons, season);
  const effective = hasRef ? _seasonScoringMode : "reset";
  badge.innerHTML =
    effective === "reset"
      ? sysLabel
      : `${sysLabel}<span class="smt-mode-sub">${SEASON_SCORING_LABELS[effective]}</span>`;
}

function _cmpWindowCtrlHtml(slot) {
  const w = slot === "A" ? viewState.cmpWindowA : viewState.cmpWindowB;
  const mode = w ? w.mode : "all";
  const count = w ? w.count : 10;
  const justify = slot === "B" ? "justify-content:flex-end;" : "";
  const chip =
    mode !== "all"
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
  const players = sortPlayersGuestsLast(_statPlayerNames());
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
  const matchesA = _getPlayerWindowMatches(
    nameA,
    baseMatches,
    viewState.cmpWindowA,
  );
  const eloMapA = _statsRatingMap(matchesA);
  const statsA = computeStats(matchesA, eloMapA, _statsSrFn(eloMapA));
  const sA = statsA.find((s) => s.name === nameA);

  const matchesB = _getPlayerWindowMatches(
    nameB,
    baseMatches,
    viewState.cmpWindowB,
  );
  const eloMapB = _statsRatingMap(matchesB);
  const statsB = computeStats(matchesB, eloMapB, _statsSrFn(eloMapB));
  const sB = statsB.find((s) => s.name === nameB);

  if (!sA || !sB) return;

  // Shutout wins/losses over each player's own (independent) match window —
  // a shutout is any match where the loser scored 0, same definition the
  // Statistics → Scores → Shutouts leaderboard uses.
  const _shutoutCounts = (name, matches) => {
    let sw = 0,
      sl = 0;
    matches.forEach((m) => {
      const inA = (m.teamA || []).includes(name);
      const inB = (m.teamB || []).includes(name);
      // _getPlayerWindowMatches("all") returns the FULL date-range match set,
      // not just this player's own matches (computeStats elsewhere handles
      // that correctly by only touching players present in each match) — so
      // this must skip any match the player wasn't actually in, or it
      // misattributes other players' shutouts to them.
      if (!inA && !inB) return;
      const myScore = inA ? m.scoreA : m.scoreB;
      const oppScore = inA ? m.scoreB : m.scoreA;
      if (myScore === 0) sl++;
      else if (oppScore === 0) sw++;
    });
    return { sw, sl };
  };
  const shutoutA = _shutoutCounts(nameA, matchesA);
  const shutoutB = _shutoutCounts(nameB, matchesB);

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
    !w || w.mode === "all"
      ? null
      : `${w.mode === "first" ? "FIRST" : "LAST"} ${w.count}`;
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
        <span class="cmp-inline-title">⚡ Battle Stats</span>
        <button class="cmp-inline-close" onclick="document.getElementById('compare-card').style.display='none';document.getElementById('compare-card').innerHTML=''" aria-label="Close comparison" title="Close comparison">×</button>
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
          ${row("Shutout Wins", shutoutA.sw, shutoutB.sw)}
          ${row("Shutout Losses", shutoutA.sl, shutoutB.sl, false)}
          ${row("Skill Rating", sA.sr.toFixed(2), sB.sr.toFixed(2))}
          ${row(_statsLabel(), _statsFmt(eloMapA[nameA] ?? _statsDefault()), _statsFmt(eloMapB[nameB] ?? _statsDefault()))}
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
  const players = sortPlayersGuestsLast(_statPlayerNames());
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
        <span class="cmp-inline-title">⚡ Battle Stats</span>
        <button class="cmp-inline-close" onclick="document.getElementById('compare-card').style.display='none';document.getElementById('compare-card').innerHTML=''" aria-label="Close comparison" title="Close comparison">×</button>
      </div>
      ${_cmpSelectorHtml()}
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
    elo: "ASS",
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
    viewState.anaSearchIdx = Math.min(
      viewState.anaSearchIdx + 1,
      items.length - 1,
    );
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
  if (
    viewState.anaActiveCat !== "all" &&
    el.dataset.cat !== viewState.anaActiveCat
  )
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
// xpThreshold → src/domain/xp.js

// computePlayerXP → src/domain/xp.js

// getPlayerLevel → src/domain/xp.js

// getPrestigeTier → src/domain/xp.js

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

// computeBadges → src/domain/badges.js (injected via initBadgesDeps)

// ══════════════════════════════════════════════════════════════
// ── PHASE 1: PLAYER FORM ENGINE ───────────────────────────────
// ══════════════════════════════════════════════════════════════

// computePlayerForm → src/domain/player-analytics.js

// ── PLAY STYLE ARCHETYPE ──────────────────────────────────────
// computeArchetype → src/domain/player-analytics.js

// ── SMART POWER RANKINGS ──────────────────────────────────────
// computePowerRankings → src/domain/player-analytics.js

// ── PARTNERSHIP CHEMISTRY SCORE ───────────────────────────────
// computeChemistryScores → src/domain/player-analytics.js

// ── ACHIEVEMENTS (new additions beyond computeBadges) ─────────
// computeAchievements → src/domain/player-analytics.js

// ── SEASON AWARDS ─────────────────────────────────────────────
// Award set for one period (a month or a user-defined season). `priorMs` is the
// matches before the period start, used for the Most-Improved ELO delta. This is
// the single source for the per-period cards — it folds in the awards that used
// to live in the separate "Monthly Awards" section (Most Consistent, Most Feared)
// so the two are unified into one section.
function _periodAwards(ms, priorMs) {
  const eloMap = _statsRatingMap(ms);
  // MVP ranks by ASS rating — same metric as the Monthly Recap Player of the
  // Month, so the two awards never disagree on who tops the period.
  const assMap = _statsRatingMap(ms);
  const stats = computeStats(ms, assMap, _statsSrFn(assMap)).filter((p) => p.mp >= 2);
  const pairs = getPairStats(ms).filter((p) => p.played >= 2);
  const mvp = stats[0] || null;
  const topPair = pairs[0] || null;
  const ironMan = stats.length
    ? [...stats].sort((a, b) => b.mp - a.mp)[0]
    : null;
  const priorEloMap =
    priorMs && priorMs.length && stats.length > 1
      ? _statsRatingMap(priorMs)
      : null;
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
function buildEloTimelineHtml(filterKey) {
  filterKey = filterKey || viewState.eloTLFilter || "all";
  viewState.eloTLFilter = filterKey;
  const history = _activeHistory();
  const eloNow = _statsRatingMap(activeMatches());
  const players = Object.keys(history)
    .filter((p) => (history[p] || []).length >= 2)
    .sort(
      (a, b) =>
        (eloNow[b] ?? _statsDefault()) - (eloNow[a] ?? _statsDefault()),
    );
  if (!players.length)
    return `<div class="sub" style="padding:8px">No ${escHtml(_statsLabel())} data yet.</div>`;
  if (!viewState.eloTLPlayer || !history[viewState.eloTLPlayer])
    viewState.eloTLPlayer = players[0];
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
    if (
      viewState.eloTLOverlay &&
      viewState.eloTLOverlay !== name &&
      history[viewState.eloTLOverlay]
    ) {
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
    const netStr =
      netChange > 0
        ? `+${_statsFmt(netChange)}`
        : netChange < 0
          ? `-${_statsFmt(Math.abs(netChange))}`
          : _statsFmt(0);
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
        <text x="${x.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="8" font-weight="900" fill="${fill}">${label} ${_statsFmt(pts[i].elo)}</text>
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
        <div style="font-size:12px;font-weight:800;color:${netCol}">${netStr} ${escHtml(_statsLabel())}</div>
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
          <text x="${toX(pts.length - 1).toFixed(1)}" y="${(toY(lastElo) - 7).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="900" fill="${col}">${_statsFmt(lastElo)}</text>
        </svg>
      </div>
      <div id="elo-tl-detail"></div>`;
  }
  // Build overlay selector
  const overlaySelector = `<div style="display:flex;align-items:center;gap:6px;margin:6px 0">
    <button class="filter-fab-btn${viewState.eloTLOverlay ? " filter-fab-active" : ""}" onclick="openEloTLOverlaySheet()" style="flex:1;text-align:left"><span>${viewState.eloTLOverlay || "+ COMPARE WITH…"}</span></button>
    ${viewState.eloTLOverlay ? `<button class="elo-tl-clear" onclick="_eloTLSetOverlay('')" aria-label="Clear overlay" title="Clear overlay">✕</button>` : ""}
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
  const history = _activeHistory();
  const players = sortPlayersGuestsLast(
    Object.keys(history).filter((p) => p !== viewState.eloTLPlayer),
  );
  list.innerHTML =
    `<div class="live-sheet-item" onclick="selectFilterItem('')"><div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--muted)">—</div><span>None</span></div>` +
    players
      .map((p) => {
        const sel =
          p === viewState.eloTLOverlay ? " live-sheet-item-selected" : "";
        return `<div class="live-sheet-item${sel}" onclick="selectFilterItem(${jsArg(p)})">${sheetAvSm(p)}<span>${escHtml(p)}</span></div>`;
      })
      .join("");
  const overlay = document.getElementById("filter-sheet-overlay");
  const sheet = document.getElementById("filter-sheet");
  if (overlay) overlay.classList.add("live-sheet-open");
  if (sheet) sheet.classList.add("live-sheet-open");
}

function _rerenderEloTLSection() {
  // Target the History Chart section's stable wrapper directly.
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
      <span style="color:var(--muted)">ASS: <strong style="color:var(--fg)">${p.elo}</strong></span>
      <span style="font-weight:700;color:${dCol}">${dStr}</span>
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
      const eloMap = _statsRatingMap(b.matches);
      const statsArr = computeStats(b.matches, eloMap, _statsSrFn(eloMap));
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
  // Reign follows the active scoring system (ELO or ASS). Cache per mode.
  const isAss = _scoringMode === "ass";
  const fp = _lightFingerprint(allM) + "|" + (isAss ? "ass" : "elo");
  if (_reignCache[fp]) return _reignCache[fp];

  // All distinct match days sorted chronologically
  const allDates = [...new Set(allM.map((m) => m.date).filter(Boolean))].sort();
  if (allDates.length < 2)
    return '<div style="color:var(--muted);font-size:12px;padding:8px 0">Need at least 2 match days with 3+ players.</div>';

  // Current ALL TIME rank (latest snapshot = full history) in the active system.
  const eloMap = isAss ? _memoASS() : _memoASS();
  const eloRanking = Object.entries(eloMap).sort((a, b) => b[1] - a[1]);
  const eloRankOf = {};
  eloRanking.forEach(([name], i) => {
    eloRankOf[name] = i + 1;
  });

  // For each match day compute cumulative rank up to that day, then tally
  // how many days each player held each rank position. We read each player's
  // running rating from the active-system history (ELO or ASS), advancing a
  // per-player pointer across dates so the walk stays O(matches).
  const sorted = [...allM].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  const histAll = isAss ? _memoASSHistory() : _memoASSHistory();
  const histNames = Object.keys(histAll);
  const runElo = {}; // running rating per player, as of the current date
  const ptr = {};
  histNames.forEach((n) => {
    ptr[n] = 0;
  });
  let maxRank = 1;
  const tally = {};
  allDates.forEach((date) => {
    // Advance each player's running rating to their last entry on/before this date
    histNames.forEach((n) => {
      const h = histAll[n] || [];
      while (ptr[n] < h.length && (h[ptr[n]].date || "") <= date) {
        runElo[n] = h[ptr[n]].elo;
        ptr[n]++;
      }
    });
    const dayMatches = sorted.filter((m) => m.date === date);
    if (dayMatches.length < 2) return; // skip days with fewer than 2 matches
    const dayPlayers = new Set(
      dayMatches.flatMap((m) => [...(m.teamA || []), ...(m.teamB || [])]),
    );
    // Rank by current running rating in the active scoring system
    const ranked = Object.entries(runElo).sort((a, b) => b[1] - a[1]);
    let qualRank = 0;
    ranked.forEach(([name]) => {
      if (!dayPlayers.has(name)) return;
      qualRank++;
      if (!tally[name]) tally[name] = { name, rankCounts: {}, days: 0 };
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
    <div style="font-size:9px;color:var(--muted);margin-bottom:8px;font-weight:600;letter-spacing:0.04em">ALL TIME · ${allDates.length} MATCH DAYS · ASS</div>
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
  const eloMapTl = computeASS(activeMatches());
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
        <button onclick="_closePodiumDrill()" aria-label="Close" title="Close" style="background:rgba(255,255,255,0.08);border:none;border-radius:50%;width:28px;height:28px;color:var(--text);font-size:14px;cursor:pointer;flex-shrink:0;margin-top:2px">✕</button>
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
        <button onclick="_closePodiumDrill()" aria-label="Close" title="Close" style="background:rgba(255,255,255,0.08);border:none;border-radius:50%;width:28px;height:28px;color:var(--text);font-size:14px;cursor:pointer;flex-shrink:0;margin-top:2px">✕</button>
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
        <button onclick="_closePodiumDrill()" aria-label="Close" title="Close" style="background:rgba(255,255,255,0.08);border:none;border-radius:50%;width:28px;height:28px;color:var(--text);font-size:14px;cursor:pointer;flex-shrink:0;margin-top:2px">✕</button>
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
  const rankings = computePowerRankings(activeMatches(), _activeScoreMap());
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
        <div style="font-size:8px;color:var(--muted);font-weight:700">${p.formEmoji} ${p.winPct}%W · ${_scoringLabel()} ${_statsFmt(p.elo)}</div>
      </div>
    </div>`;
    })
    .join("");
  return `<div class="ana-card" style="padding:10px 12px">
    <div style="font-size:9px;color:var(--muted);margin-bottom:10px">Composite: ${_scoringLabel()} 40% · Form 30% · Win Quality 20% · Activity 10% · Arrows vs last week</div>
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
  const players = sortPlayersGuestsLast(_statPlayerNames());
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

function runMatchPrediction() {
  const teamA = [viewState.predictPlayerA, viewState.predictPartnerA].filter(
    Boolean,
  );
  const teamB = [viewState.predictPlayerB, viewState.predictPartnerB].filter(
    Boolean,
  );
  const res = document.getElementById("predict-result");
  if (!res) return;
  if (!teamA.length || !teamB.length) {
    res.innerHTML =
      '<div style="color:var(--red);font-size:11px;padding:4px">Select at least one player per team.</div>';
    return;
  }
  const eloMap = _memoASS();
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
        <div style="display:flex;align-items:center;gap:8px">
          <button onclick="event.stopPropagation();window._showMonthReport('${s.month}')" style="font-size:10px;font-weight:700;color:var(--theme);background:rgba(var(--theme-rgb),0.12);border:1px solid rgba(var(--theme-rgb),0.25);border-radius:6px;padding:3px 8px;cursor:pointer">📊 Report</button>
          <div style="font-size:11px;color:var(--muted)">▼</div>
        </div>
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
          <button onclick="event.stopPropagation();window._showPlayerMonthReport(${jsArg(s.month)},${jsArg(p.name)})" aria-label="View month report" title="View month report" style="font-size:9px;background:rgba(255,255,255,0.06);border:none;color:var(--muted);border-radius:5px;padding:2px 6px;cursor:pointer">📋</button>
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

  // Precompute row data
  window._streakData = stats.map((p) => {
    const recentN = Math.min(p.results.length, 10);
    const recentW = p.results.slice(-recentN).filter((r) => r.won).length;
    const mtmDelta =
      p.mp >= 5 ? Math.round((recentW / recentN - p.mw / p.mp) * 100) : null;

    // Bounce-back: % of loss streaks snapped in 1 match; avg W/L streak lengths
    let lossStreaks = 0,
      bounced = 0,
      inLoss = false,
      lossLen = 0;
    let wRuns = 0,
      wTotal = 0,
      lRuns = 0,
      lTotal = 0,
      runType = null,
      runLen = 0;
    p.results.forEach((r) => {
      // bounce-back
      if (!r.won) {
        if (!inLoss) {
          inLoss = true;
          lossLen = 1;
          lossStreaks++;
        } else lossLen++;
      } else if (inLoss) {
        if (lossLen === 1) bounced++;
        inLoss = false;
        lossLen = 0;
      }
      // avg streak lengths
      const t = r.won ? "W" : "L";
      if (t === runType) {
        runLen++;
      } else {
        if (runType === "W") {
          wRuns++;
          wTotal += runLen;
        } else if (runType === "L") {
          lRuns++;
          lTotal += runLen;
        }
        runType = t;
        runLen = 1;
      }
    });
    if (runType === "W") {
      wRuns++;
      wTotal += runLen;
    } else if (runType === "L") {
      lRuns++;
      lTotal += runLen;
    }
    const bbPct =
      lossStreaks > 0 ? Math.round((bounced / lossStreaks) * 100) : null;
    const avgWStreak =
      wRuns > 0 ? parseFloat((wTotal / wRuns).toFixed(1)) : null;
    const avgLStreak =
      lRuns > 0 ? parseFloat((lTotal / lRuns).toFixed(1)) : null;

    return {
      name: p.name,
      curStreak: p.curStreak,
      curType: p.curType,
      curSigned: p.curType === "W" ? p.curStreak : -p.curStreak,
      bestWinStreak: p.bestWinStreak,
      bestLossStreak: p.bestLossStreak || 0,
      mtmDelta,
      bbPct,
      avgWStreak,
      avgLStreak,
    };
  });

  if (!window._streakState)
    window._streakState = { col: "curSigned", dir: "desc" };

  const PG =
    "grid-template-columns:minmax(80px,1fr) 52px 48px 48px 44px 36px 36px 36px";
  const HDR = `display:grid;${PG};padding:5px 4px 7px;border-bottom:1px solid var(--border);font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);`;
  const NH =
    "text-align:center;cursor:pointer;white-space:nowrap;overflow:hidden";
  const header = `<div style="${HDR}">
    <div onclick="window._streakSort('name')" style="cursor:pointer;white-space:nowrap">Player</div>
    <div onclick="window._streakSort('curSigned')" style="${NH}">Streak</div>
    <div onclick="window._streakSort('bestWinStreak')" style="${NH};color:var(--green)">Best W</div>
    <div onclick="window._streakSort('bestLossStreak')" style="${NH};color:var(--red)">Worst L</div>
    <div onclick="window._streakSort('mtmDelta')" style="${NH}">Mtm</div>
    <div onclick="window._streakSort('bbPct')" style="${NH}">BB%</div>
    <div onclick="window._streakSort('avgWStreak')" style="${NH};color:var(--green)">Avg W</div>
    <div onclick="window._streakSort('avgLStreak')" style="${NH};color:var(--red)">Avg L</div>
  </div>`;

  // Render initial body inline (same logic as _renderStreakTable)
  const { col, dir } = window._streakState;
  const asc = dir === "asc";
  const CEL = `display:grid;${PG};align-items:center;padding:6px 4px;border-bottom:1px solid rgba(255,255,255,0.04);font-size:11px;font-weight:700;`;
  const initSorted = [...window._streakData].sort((a, b) => {
    const av = a[col],
      bv = b[col];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (col === "name")
      return asc ? av.localeCompare(bv) : bv.localeCompare(av);
    return asc ? av - bv : bv - av;
  });
  const bodyRows = initSorted
    .map((r) => {
      const onW = r.curType === "W";
      const sCol = onW ? "var(--green)" : "var(--red)";
      const ico = onW ? "🔥" : "❄️";
      const mtmCol =
        r.mtmDelta > 0
          ? "var(--green)"
          : r.mtmDelta < 0
            ? "var(--red)"
            : "var(--muted)";
      const mtmStr =
        r.mtmDelta == null
          ? "—"
          : (r.mtmDelta > 0 ? "+" : "") + r.mtmDelta + "%";
      const bbCol =
        r.bbPct == null
          ? "var(--muted)"
          : r.bbPct >= 70
            ? "var(--green)"
            : r.bbPct >= 40
              ? "var(--gold)"
              : "var(--red)";
      const bbStr = r.bbPct == null ? "—" : r.bbPct + "%";
      return `<div style="${CEL}">
      <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(r.name)}</div>
      <div style="color:${sCol};text-align:center">${ico} ${onW ? "W" : "L"}${r.curStreak}</div>
      <div style="color:var(--green);text-align:center">${r.bestWinStreak}</div>
      <div style="color:var(--red);text-align:center">${r.bestLossStreak}</div>
      <div style="color:${mtmCol};text-align:center">${mtmStr}</div>
      <div style="color:${bbCol};text-align:center">${bbStr}</div>
      <div style="color:var(--green);text-align:center">${r.avgWStreak ?? "—"}</div>
      <div style="color:var(--red);text-align:center">${r.avgLStreak ?? "—"}</div>
    </div>`;
    })
    .join("");

  return `<div class="ana-card" style="padding:8px 12px;overflow-x:auto">${header}<div id="streak-body">${bodyRows}</div></div>`;
}

// ── WIN RATE CALCULATOR ─────────────────────────────────────
// Returns {mp, mw} for a player across given matches (already sorted).
function _wrcStats(name, ms) {
  let mp = 0,
    mw = 0;
  ms.forEach((m) => {
    const inA = (m.teamA || []).some((p) => normPlayer(p) === name);
    const inB = (m.teamB || []).some((p) => normPlayer(p) === name);
    if (!inA && !inB) return;
    const aWon = m.scoreA > m.scoreB;
    mp++;
    if ((inA && aWon) || (inB && !aWon)) mw++;
  });
  return { mp, mw };
}

// Change in W% over last N matches vs overall (null if fewer than N matches).
function _wrcDelta(name, sorted, n) {
  const pms = sorted.filter((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].some(
      (p) => normPlayer(p) === name,
    ),
  );
  if (pms.length < n) return null;
  const overall = _wrcStats(name, pms);
  const recent = _wrcStats(name, pms.slice(-n));
  const overallWR = overall.mw / overall.mp;
  const recentWR = recent.mw / n;
  return Math.round((recentWR - overallWR) * 100); // signed integer pp
}

function _buildWinRateCalcHtml() {
  const ms = [...activeMatches()].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  const players = getAllPlayerNamesFromMatches();

  // Build per-player stats row
  const rows = players
    .map((name) => {
      const { mp, mw } = _wrcStats(name, ms);
      if (mp === 0) return null;
      const wr = Math.round((mw / mp) * 100);
      const d10 = _wrcDelta(name, ms, 10);
      const d20 = _wrcDelta(name, ms, 20);
      const d30 = _wrcDelta(name, ms, 30);
      const d40 = _wrcDelta(name, ms, 40);
      return { name, mp, mw, ml: mp - mw, wr, d10, d20, d30, d40 };
    })
    .filter(Boolean)
    .sort((a, b) => b.wr - a.wr || b.mp - a.mp);

  const fmtDelta = (d) => {
    if (d === null) return `<span class="wrc-d-na">—</span>`;
    const sign = d > 0 ? "+" : "";
    const cls = d > 0 ? "wrc-d-pos" : d < 0 ? "wrc-d-neg" : "wrc-d-zero";
    return `<span class="${cls}">${sign}${d}%</span>`;
  };

  const tableRows = rows
    .map(
      (r, i) =>
        `<tr class="wrc-tr" onclick="wrcSelectPlayer(${jsArg(r.name)})" data-name="${escHtml(r.name)}">
      <td class="wrc-td-rank">${i + 1}</td>
      <td class="wrc-td-name">${escHtml(r.name)}</td>
      <td class="wrc-td-mp">${r.mp}</td>
      <td class="wrc-td-wr">${r.wr}%</td>
      <td class="wrc-td-d">${fmtDelta(r.d10)}</td>
      <td class="wrc-td-d">${fmtDelta(r.d20)}</td>
      <td class="wrc-td-d">${fmtDelta(r.d30)}</td>
      <td class="wrc-td-d">${fmtDelta(r.d40)}</td>
    </tr>`,
    )
    .join("");

  return `<div class="wrc-card">
    <div class="wrc-tbl-wrap">
      <table class="wrc-tbl">
        <thead>
          <tr>
            <th>#</th>
            <th style="text-align:left">PLAYER</th>
            <th>MP</th>
            <th>W%</th>
            <th>Δ10</th>
            <th>Δ20</th>
            <th>Δ30</th>
            <th>Δ40</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  </div>`;
}

let _wrcSelectedPlayer = null;

function wrcSelectPlayer(name) {
  _wrcSelectedPlayer = name;

  // Inject popup if not already in DOM
  if (!document.getElementById("wrc-popup-overlay")) {
    const overlay = document.createElement("div");
    overlay.id = "wrc-popup-overlay";
    overlay.className = "wrc-popup-overlay";
    overlay.onclick = wrcCloseCalc;
    overlay.innerHTML = `
      <div class="wrc-popup" onclick="event.stopPropagation()">
        <div class="wrc-popup-top">
          <div class="wrc-popup-title" id="wrc-calc-header"></div>
          <button class="wrc-popup-close" onclick="wrcCloseCalc()" aria-label="Close" title="Close">✕</button>
        </div>
        <div class="wrc-cur-stats" id="wrc-cur-stats">
          <div class="wrc-stat"><div class="wrc-stat-val" id="wrc-cur-mp">—</div><div class="wrc-stat-lbl">PLAYED</div></div>
          <div class="wrc-stat"><div class="wrc-stat-val" id="wrc-cur-w">—</div><div class="wrc-stat-lbl">WINS</div></div>
          <div class="wrc-stat"><div class="wrc-stat-val" id="wrc-cur-l">—</div><div class="wrc-stat-lbl">LOSSES</div></div>
          <div class="wrc-stat wrc-stat-hl"><div class="wrc-stat-val" id="wrc-cur-wr">—</div><div class="wrc-stat-lbl">CURRENT W%</div></div>
        </div>
        <div class="wrc-ctrl">
          <div class="wrc-ctrl-top">
            <span class="wrc-ctrl-label">TARGET WIN RATE</span>
            <span class="wrc-ctrl-val" id="wrc-target-val">—</span>
          </div>
          <input type="range" class="wrc-slider" id="wrc-target" min="1" max="100" step="1" oninput="wrcOnSlider()">
        </div>
        <div class="wrc-ctrl">
          <div class="wrc-ctrl-top">
            <span class="wrc-ctrl-label">WIN RATE IN FUTURE GAMES</span>
            <span class="wrc-ctrl-val" id="wrc-future-val">—</span>
          </div>
          <input type="range" class="wrc-slider" id="wrc-future" min="1" max="100" step="1" oninput="wrcOnSlider()">
        </div>
        <div class="wrc-result" id="wrc-result"></div>
      </div>`;
    document.body.appendChild(overlay);
  }

  document.getElementById("wrc-calc-header").textContent = name;
  const ms = activeMatches();
  const { mp, mw } = _wrcStats(name, ms);
  const ml = mp - mw;
  const wr = mp > 0 ? Math.round((mw / mp) * 100) : 0;
  document.getElementById("wrc-cur-mp").textContent = mp;
  document.getElementById("wrc-cur-w").textContent = mw;
  document.getElementById("wrc-cur-l").textContent = ml;
  document.getElementById("wrc-cur-wr").textContent = `${wr}%`;

  const tSlider = document.getElementById("wrc-target");
  if (tSlider) {
    tSlider.min = Math.min(wr + 1, 99);
    tSlider.max = 99;
    tSlider.value = Math.min(wr + 5, 95);
  }
  const fSlider = document.getElementById("wrc-future");
  if (fSlider) {
    fSlider.min = wr + 1;
    fSlider.max = 100;
    fSlider.value = Math.min(Math.max(80, wr + 10), 100);
  }

  document.getElementById("wrc-popup-overlay").classList.add("wrc-popup-open");
  wrcOnSlider();
}

function wrcCloseCalc() {
  document
    .getElementById("wrc-popup-overlay")
    ?.classList.remove("wrc-popup-open");
}

function wrcOnSlider() {
  const name = _wrcSelectedPlayer;
  const resEl = document.getElementById("wrc-result");
  if (!name || !resEl) return;
  const targetSlider = document.getElementById("wrc-target");
  const futureSlider = document.getElementById("wrc-future");
  const targetWR = parseInt(targetSlider?.value || 0) / 100;
  let futureWR = parseInt(futureSlider?.value || 0) / 100;
  // Clamp future above target
  if (futureWR <= targetWR) {
    const clamped = Math.min(Math.round(targetWR * 100) + 1, 100);
    if (futureSlider) futureSlider.value = clamped;
    futureWR = clamped / 100;
  }
  document.getElementById("wrc-target-val").textContent =
    `${Math.round(targetWR * 100)}%`;
  document.getElementById("wrc-future-val").textContent =
    `${Math.round(futureWR * 100)}%`;

  const ms = activeMatches();
  const { mp, mw } = _wrcStats(name, ms);
  const numerator = targetWR * mp - mw;
  const n = numerator <= 0 ? 0 : Math.ceil(numerator / (futureWR - targetWR));

  if (n === 0) {
    resEl.innerHTML = `<div class="wrc-achieved">🎉 Already at or above ${Math.round(targetWR * 100)}%!</div>`;
    return;
  }
  const newMp = mp + n;
  const futureWins = Math.round(n * futureWR);
  const futureLosses = n - futureWins;
  const newW = mw + futureWins;
  const newL = newMp - newW;
  const newWR = Math.round((newW / newMp) * 100);

  // Rating gain estimate — follows the active scoring picker. Rather than a
  // fixed ELO-logistic formula (K=32, /400 — calibrated to a 1000-centred
  // scale), this uses the active engine's OWN historical average delta for
  // this player: their average points earned on a win vs. a loss, from the
  // same per-match timeline every "follows the picker" section already uses.
  // Zero-based engines (whose displayed number is an average, not a running
  // total) fold the projected total back through the same games+SHRINKAGE
  // denominator; 1000-centred engines just add the projected change.
  const ratingMap = _statsRatingMap(activeMatches());
  const myRating = ratingMap[name] ?? _statsDefault();
  const hist = _statsTimeline(activeMatches()).history[name] || [];
  const avgOf = (rows) =>
    rows.length ? rows.reduce((s, h) => s + h.delta, 0) / rows.length : 0;
  const avgWinDelta = avgOf(hist.filter((h) => h.won));
  const avgLossDelta = avgOf(hist.filter((h) => !h.won));
  const projectedChange = futureWins * avgWinDelta + futureLosses * avgLossDelta;
  const zeroBased = SCORING_SYSTEMS_ZERO_BASED.includes(_scoringSystem);
  let finalRating, ratingGain;
  if (zeroBased) {
    const full = computeEPFull(activeMatches(), _epCareerMatches())[name] || {
      ep: 0,
      games: 0,
    };
    const projTotal = full.ep + projectedChange;
    const projGames = full.games + n;
    finalRating = projTotal / (projGames + EP_SHRINKAGE);
    ratingGain = finalRating - myRating;
  } else {
    finalRating = myRating + projectedChange;
    ratingGain = projectedChange;
  }
  const ratingLbl = _statsLabel();
  const ratingSign = ratingGain >= 0 ? "+" : "";
  const ratingCol =
    ratingGain > 0
      ? "var(--green)"
      : ratingGain < 0
        ? "var(--red)"
        : "var(--muted)";

  resEl.innerHTML = `
    <div class="wrc-result-hero">
      <span class="wrc-result-n">${n}</span>
      <span class="wrc-result-n-label">matches needed</span>
    </div>
    <div class="wrc-result-grid">
      <div class="wrc-rg-cell"><div class="wrc-rg-label">NEW TOTAL</div><div class="wrc-rg-val">${newMp}</div></div>
      <div class="wrc-rg-cell wrc-rg-win"><div class="wrc-rg-label">NEW WINS</div><div class="wrc-rg-val">${newW}</div></div>
      <div class="wrc-rg-cell wrc-rg-lose"><div class="wrc-rg-label">NEW LOSSES</div><div class="wrc-rg-val">${newL}</div></div>
      <div class="wrc-rg-cell wrc-rg-hl"><div class="wrc-rg-label">FINAL W%</div><div class="wrc-rg-val">${newWR}%</div></div>
      <div class="wrc-rg-cell" style="grid-column:span 2">
        <div class="wrc-rg-label">${escHtml(ratingLbl)} GAIN</div>
        <div class="wrc-rg-val" style="color:${ratingCol}">${ratingSign}${_statsFmt(ratingGain)} → ${_statsFmt(finalRating)}</div>
      </div>
    </div>`;
}
window.wrcSelectPlayer = wrcSelectPlayer;
window.wrcCloseCalc = wrcCloseCalc;
window.wrcOnSlider = wrcOnSlider;

// Biggest upsets: replays both ELO and ASS match-by-match, capturing pre-match
// scores per player. Records any match where either gap > 0.
function _computeUpsets(matches = activeMatches()) {
  const ms = [...matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  // `elo` here is a private strength-walk helper feeding the ASS partner/
  // opponent multiplier below — mirrors ass.js's own internal computation.
  const elo = {},
    ass = {};
  const seed = (n) => {
    if (!(n in elo)) elo[n] = 1000;
    if (!(n in ass)) ass[n] = 1000;
  };
  const upsets = [];
  ms.forEach((m) => {
    const tA = m.teamA || [],
      tB = m.teamB || [];
    [...tA, ...tB].forEach(seed);

    // Snapshot pre-match ASS ratings for every player in this match
    const preAss = {};
    [...tA, ...tB].forEach((p) => {
      preAss[p] = ass[p];
    });

    const avgEloA = tA.reduce((s, p) => s + elo[p], 0) / Math.max(tA.length, 1);
    const avgEloB = tB.reduce((s, p) => s + elo[p], 0) / Math.max(tB.length, 1);
    const avgAssA = tA.reduce((s, p) => s + ass[p], 0) / Math.max(tA.length, 1);
    const avgAssB = tB.reduce((s, p) => s + ass[p], 0) / Math.max(tB.length, 1);
    const aWon = m.scoreA > m.scoreB;
    const winners = aWon ? tA : tB;
    const losers = aWon ? tB : tA;
    const assGap = Math.round(aWon ? avgAssB - avgAssA : avgAssA - avgAssB);

    // Advance ASS (uses pre-match strength walk for the partner multiplier, same as ass.js)
    const margin = Math.abs(m.scoreA - m.scoreB);
    const quality = 4 * margin + (m.scoreA + m.scoreB);
    tA.forEach((p) => {
      const partner = tA.find((pp) => pp !== p);
      const pElo = partner ? elo[partner] : elo[p];
      const mult = Math.max(
        0.5,
        Math.min(
          2.0,
          1 + (avgEloB - elo[p]) / 400 - (0.5 * (pElo - elo[p])) / 400,
        ),
      );
      ass[p] += aWon ? Math.round(quality * mult) : -Math.round(quality / mult);
    });
    tB.forEach((p) => {
      const partner = tB.find((pp) => pp !== p);
      const pElo = partner ? elo[partner] : elo[p];
      const mult = Math.max(
        0.5,
        Math.min(
          2.0,
          1 + (avgEloA - elo[p]) / 400 - (0.5 * (pElo - elo[p])) / 400,
        ),
      );
      ass[p] += !aWon
        ? Math.round(quality * mult)
        : -Math.round(quality / mult);
    });

    // Advance the internal strength walk
    const expA = 1 / (1 + Math.pow(10, (avgEloB - avgEloA) / 400));
    const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
    const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
    tA.forEach((p) => (elo[p] += dA));
    tB.forEach((p) => (elo[p] += dB));

    if (assGap > 0)
      upsets.push({
        date: m.date,
        assGap,
        winners,
        losers,
        sw: Math.max(m.scoreA, m.scoreB),
        sl: Math.min(m.scoreA, m.scoreB),
        preAss,
      });
  });
  return upsets;
}

window._streakSort = function (col) {
  if (!window._streakState)
    window._streakState = { col: "curSigned", dir: "desc" };
  if (window._streakState.col === col) {
    window._streakState.dir =
      window._streakState.dir === "desc" ? "asc" : "desc";
  } else {
    window._streakState.col = col;
    window._streakState.dir = col === "name" ? "asc" : "desc";
  }
  window._renderStreakTable();
};

window._renderStreakTable = function () {
  const el = document.getElementById("streak-body");
  if (!el || !window._streakData || !window._streakState) return;
  const { col, dir } = window._streakState;
  const asc = dir === "asc";
  const PG =
    "grid-template-columns:minmax(80px,1fr) 52px 48px 48px 44px 36px 36px 36px";
  const CEL = `display:grid;${PG};align-items:center;padding:6px 4px;border-bottom:1px solid rgba(255,255,255,0.04);font-size:11px;font-weight:700;`;
  const sorted = [...window._streakData].sort((a, b) => {
    const av = a[col],
      bv = b[col];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (col === "name")
      return asc ? av.localeCompare(bv) : bv.localeCompare(av);
    return asc ? av - bv : bv - av;
  });
  el.innerHTML = sorted
    .map((r) => {
      const onW = r.curType === "W";
      const sCol = onW ? "var(--green)" : "var(--red)";
      const ico = onW ? "🔥" : "❄️";
      const mtmCol =
        r.mtmDelta > 0
          ? "var(--green)"
          : r.mtmDelta < 0
            ? "var(--red)"
            : "var(--muted)";
      const mtmStr =
        r.mtmDelta == null
          ? "—"
          : (r.mtmDelta > 0 ? "+" : "") + r.mtmDelta + "%";
      const bbCol =
        r.bbPct == null
          ? "var(--muted)"
          : r.bbPct >= 70
            ? "var(--green)"
            : r.bbPct >= 40
              ? "var(--gold)"
              : "var(--red)";
      const bbStr = r.bbPct == null ? "—" : r.bbPct + "%";
      return `<div style="${CEL}">
      <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(r.name)}</div>
      <div style="color:${sCol};text-align:center">${ico} ${onW ? "W" : "L"}${r.curStreak}</div>
      <div style="color:var(--green);text-align:center">${r.bestWinStreak}</div>
      <div style="color:var(--red);text-align:center">${r.bestLossStreak}</div>
      <div style="color:${mtmCol};text-align:center">${mtmStr}</div>
      <div style="color:${bbCol};text-align:center">${bbStr}</div>
      <div style="color:var(--green);text-align:center">${r.avgWStreak ?? "—"}</div>
      <div style="color:var(--red);text-align:center">${r.avgLStreak ?? "—"}</div>
    </div>`;
    })
    .join("");
};

window._synSort = function (col) {
  if (!window._synState) window._synState = { col: "delta", dir: "desc" };
  if (window._synState.col === col) {
    window._synState.dir = window._synState.dir === "desc" ? "asc" : "desc";
  } else {
    window._synState.col = col;
    window._synState.dir =
      col === "player" || col === "partner" ? "asc" : "desc";
  }
  window._renderSynTable();
};

window._synSetPlayer = function (name) {
  if (!window._synState)
    window._synState = { col: "delta", dir: "desc", player: "" };
  window._synState.player = name;
  document.querySelectorAll(".syn-filter-pill").forEach((b) => {
    b.classList.toggle("lsst-active", b.dataset.player === name);
  });
  window._renderSynTable();
};

window._renderSynTable = function () {
  const el = document.getElementById("syn-body");
  if (!el || !window._synData || !window._synState) return;
  const { col, dir, player } = window._synState;
  const asc = dir === "asc";
  const pg = "grid-template-columns:1fr 1fr 34px 46px 50px 52px";
  const CEL = `display:grid;${pg};align-items:center;padding:7px 4px;border-bottom:1px solid rgba(255,255,255,0.04);font-size:11px;font-weight:700;`;
  const base = player
    ? window._synData.filter((r) => r.player === player)
    : window._synData;
  const sorted = [...base].sort((a, b) => {
    const av = a[col],
      bv = b[col];
    if (col === "player" || col === "partner")
      return asc ? av.localeCompare(bv) : bv.localeCompare(av);
    return asc ? av - bv : bv - av;
  });
  el.innerHTML = sorted.length
    ? sorted
        .map((r) => {
          const col2 =
            r.delta > 5
              ? "var(--green)"
              : r.delta < -5
                ? "var(--red)"
                : "var(--muted)";
          const sign = r.delta >= 0 ? "+" : "";
          const sc = r.scoreDelta || 0;
          const scCol =
            sc > 0 ? "var(--green)" : sc < 0 ? "var(--red)" : "var(--muted)";
          const scSign = sc >= 0 ? "+" : "";
          return `<div style="${CEL}">
          <div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(r.player)}</div>
          <div style="color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">+ ${escHtml(r.partner)}</div>
          <div style="text-align:center">${r.played}</div>
          <div style="text-align:center">${r.pairPct.toFixed(0)}%</div>
          <div style="text-align:center;color:${col2}">${sign}${r.delta.toFixed(0)}%</div>
          <div style="text-align:center;color:${scCol}">${scSign}${sc}</div>
        </div>`;
        })
        .join("")
    : `<div style="padding:10px 4px;font-size:11px;color:var(--muted)">No data for this player.</div>`;
};

window._bstatSort = function (col) {
  if (!window._bstatState) window._bstatState = { col: "sr", dir: "desc" };
  if (window._bstatState.col === col) {
    window._bstatState.dir = window._bstatState.dir === "desc" ? "asc" : "desc";
  } else {
    window._bstatState.col = col;
    window._bstatState.dir = "desc";
  }
  window._renderBstatTable();
};

window._renderBstatTable = function () {
  const el = document.getElementById("bstat-body");
  if (!el || !window._bstatData || !window._bstatState) return;
  const { col, dir } = window._bstatState;
  const asc = dir === "asc";
  const TP = "rgba(96,165,250,0.07)",
    TS = "rgba(52,211,153,0.07)";
  const TO = "rgba(251,191,36,0.07)",
    TC = "rgba(248,113,113,0.07)";
  const TM = "rgba(167,139,250,0.07)",
    FRZ = "var(--surface)";
  const CEL =
    "padding:7px 6px;font-size:11px;font-weight:700;text-align:center;border-bottom:1px solid rgba(255,255,255,0.03);";
  const FRZX =
    "position:sticky;left:0;z-index:2;border-right:1px solid var(--border);";
  const d = (val, bg, c2 = "var(--text)", frz = false) =>
    `<div style="${CEL}background:${frz ? FRZ : bg};color:${c2};${frz ? FRZX : ""}">${val}</div>`;
  const sorted = [...window._bstatData].sort((a, b) => {
    const av = a[col],
      bv = b[col];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (col === "name")
      return asc ? av.localeCompare(bv) : bv.localeCompare(av);
    return asc ? av - bv : bv - av;
  });
  el.innerHTML = sorted
    .map((r) =>
      [
        d(r.name, null, "var(--text)", true),
        d(r.winPct.toFixed(0) + "%", TP, r.wCol),
        d(r.sr.toFixed(2), TP),
        d(r.avgG.toFixed(1), TS),
        d((r.avgMgn >= 0 ? "+" : "") + r.avgMgn.toFixed(1), TS, r.mCol),
        d(r.gLost.toFixed(1), TS),
        d(r.oppSR.toFixed(2), TO),
        d(r.vsTop != null ? r.vsTop + "%" : "—", TO),
        d(r.firePct + "%", TC),
        d(r.clutchPct != null ? r.clutchPct + "%" : "—", TC),
        d(r.domPct != null ? r.domPct + "%" : "—", TC),
        d(r.prtns, TM),
      ].join(""),
    )
    .join("");
};

// Rating waterfall: a player's N biggest single-match rating swings, rendered
// as a running waterfall from their first swing to their latest.
function _buildWaterfallHtml(name) {
  const hist = _activeHistory()[name] || [];
  const moves = waterfallTopMoves(hist, 8);
  if (!moves.length)
    return '<div class="sub" style="padding:8px">Not enough data.</div>';
  let running = moves[0].elo - moves[0].delta;
  const seq = [{ label: "Start", val: running }];
  moves.forEach((m) => {
    running += m.delta;
    seq.push({ label: fmtDate(m.date), val: running, delta: m.delta });
  });
  const vals = seq.map((s) => s.val);
  const minV = Math.min(...vals),
    maxV = Math.max(...vals);
  const range = Math.max(maxV - minV, 1);
  const W = 300,
    H = 160,
    PAD = 24;
  const colW = (W - PAD * 2) / seq.length;
  const y = (v) => H - PAD - ((v - minV) / range) * (H - PAD * 2);
  const bars = seq
    .map((s, i) => {
      const x = PAD + i * colW;
      const isFirst = i === 0;
      const prevVal = isFirst ? s.val : seq[i - 1].val;
      const yTop = y(Math.max(s.val, prevVal));
      const yBot = y(Math.min(s.val, prevVal));
      const col = isFirst
        ? "var(--muted)"
        : s.delta >= 0
          ? "#36d47e"
          : "#f04f4f";
      const h = Math.max(2, yBot - yTop);
      return `<rect x="${(x + 2).toFixed(1)}" y="${yTop.toFixed(1)}" width="${(colW - 4).toFixed(1)}" height="${h.toFixed(1)}" fill="${col}"><title>${s.label}: ${isFirst ? Math.round(s.val) : (s.delta >= 0 ? "+" : "") + s.delta}</title></rect>`;
    })
    .join("");
  const labels = seq
    .map((s, i) => {
      const x = PAD + i * colW + colW / 2;
      return `<text x="${x.toFixed(1)}" y="${H - 4}" font-size="6" fill="var(--muted)" text-anchor="middle">${i === 0 ? "START" : s.delta >= 0 ? "+" + s.delta : s.delta}</text>`;
    })
    .join("");
  return `<div>
    <div style="font-size:9px;color:var(--muted);margin-bottom:6px">${escHtml(name)}'s biggest single-match rating swings</div>
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px">${bars}${labels}</svg>
  </div>`;
}
window._renderWaterfall = function (name) {
  const el = document.getElementById("waterfall-body");
  if (el) el.innerHTML = _buildWaterfallHtml(name);
};

// Steps the Ratings Race bars through each month's snapshot, animating bar
// width via CSS transition. Frame data travels on the button's data-race attr
// so this stays a pure DOM walker with no closure over render-time state.
window._playRatingsRace = function (btn) {
  let data;
  try {
    data = JSON.parse(btn.dataset.race);
  } catch (e) {
    return;
  }
  const { names, frames, maxScore } = data;
  if (!frames || !frames.length) return;
  btn.disabled = true;
  btn.textContent = "▶ Playing…";
  const monthLbl = document.getElementById("race-month-lbl");
  let i = 0;
  const step = () => {
    const f = frames[i];
    if (monthLbl) monthLbl.textContent = f.month;
    names.forEach((n, idx) => {
      const val = f.scores[idx];
      const pct = Math.min(100, (val / maxScore) * 100);
      const barEl = document.getElementById(`race-bar-${idx}`);
      const valEl = document.getElementById(`race-val-${idx}`);
      if (barEl) barEl.style.width = pct.toFixed(1) + "%";
      if (valEl) valEl.textContent = val;
    });
    i++;
    if (i < frames.length) setTimeout(step, 650);
    else {
      btn.disabled = false;
      btn.textContent = "▶ Play Race";
    }
  };
  step();
};

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
    return { s, elo: computeASS(sm), stats: computeStats(sm) };
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
            e >= 1030
              ? "var(--green)"
              : e <= 970
                ? "var(--red)"
                : "var(--text)";
          return `<td style="text-align:center;padding:4px 6px"><div style="font-size:12px;font-weight:800;color:${col}">${e}</div><div style="font-size:8px;color:var(--muted)">${st.mw}-${st.ml}</div></td>`;
        })
        .join("");
      return `<tr><td style="text-align:left;padding:4px 6px;font-size:11px;font-weight:700;position:sticky;left:0;background:var(--surface);white-space:nowrap">${escHtml(name)}</td>${cells}</tr>`;
    })
    .join("");
  return `<div class="ana-card" style="padding:8px"><div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%"><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table></div><div style="font-size:9px;color:var(--muted);margin-top:6px">Season ASS per player (W–L below). — = didn't play that season.</div></div>`;
}

// A trophy strip of each archived season's Champion. Only reads
// archivedSnapshot (frozen at archiveSeason() time) — nothing here
// recomputes standings. Tapping a card reopens the same celebratory reveal
// the 🎉 button in the Seasons sheet does.
function _buildHallOfFameHtml() {
  const champions = state.seasons
    .filter((s) => s.archived && s.archivedSnapshot?.standings?.length)
    .sort((a, b) => (b.start || "").localeCompare(a.start || ""));
  if (!champions.length)
    return '<div class="sub" style="padding:8px">No seasons archived yet — archive a finished season (📦 in 🗓️ Seasons) to start your Hall of Fame.</div>';
  const cards = champions
    .map((s) => {
      const champ = s.archivedSnapshot.standings[0];
      return `<div class="hof-card" onclick="openSeasonAwardsReveal(${jsArg(s.id)})">
        <div class="hof-trophy">🏆</div>
        <div class="hof-season-name">${escHtml(s.name)}</div>
        <div class="hof-champ-name">${escHtml(champ.name)}</div>
        <div class="hof-champ-meta">${champ.mw}W–${champ.ml}L · SR ${champ.sr.toFixed(2)}</div>
      </div>`;
    })
    .join("");
  return `<div class="hof-strip">${cards}</div>`;
}

// Rank/ASS delta between two seasons for every player common to both.
// Defaults to the two most recent seasons; with 3+ seasons defined, two
// dropdowns let the user pick any pair. Cross-season (bypasses
// activeMatches()), same withoutGuestMatches(state.matches) base
// _buildSeasonComparisonHtml uses.
function _buildSeasonRiserFallerHtml() {
  if (state.seasons.length < 2)
    return '<div class="sub" style="padding:8px">Define at least 2 Seasons (🗓️ in the menu) to see who rose and fell.</div>';
  const ordered = orderSeasonsByStart(state.seasons);
  const defaultB = ordered[ordered.length - 1];
  const defaultA = ordered[ordered.length - 2];
  const seasonA =
    state.seasons.find((s) => s.id === viewState.riserFallerFrom) || defaultA;
  const seasonB =
    state.seasons.find((s) => s.id === viewState.riserFallerTo) || defaultB;
  const selStyle =
    "flex:1;padding:6px 8px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:11px;font-weight:700";
  const optsHtml = (selectedId) =>
    ordered
      .map(
        (s) =>
          `<option value="${jsArg(s.id)}"${s.id === selectedId ? " selected" : ""}>${escHtml(s.name)}</option>`,
      )
      .join("");
  const picker =
    ordered.length > 2
      ? `<div style="display:flex;gap:8px;align-items:center;padding:4px 0 10px">
          <select style="${selStyle}" onchange="setRiserFallerFrom(this.value)">${optsHtml(seasonA.id)}</select>
          <span style="font-size:11px;color:var(--muted)">→</span>
          <select style="${selStyle}" onchange="setRiserFallerTo(this.value)">${optsHtml(seasonB.id)}</select>
        </div>`
      : "";
  const _allM = withoutGuestMatches(state.matches);
  // Follows the active scoring picker — was hardcoded to classic ASS.
  const movers = computeSeasonRiserFaller(
    _allM,
    seasonA,
    seasonB,
    (ms) => _statsRatingMap(ms),
    _statsDefault(),
  );
  if (!movers.length)
    return `${picker}<div class="sub" style="padding:8px">No players played both ${escHtml(seasonA.name)} and ${escHtml(seasonB.name)}.</div>`;
  const rows = movers
    .map((m) => {
      const arrow = m.rankDelta > 0 ? "▲" : m.rankDelta < 0 ? "▼" : "•";
      const arrowCol =
        m.rankDelta > 0 ? "var(--green)" : m.rankDelta < 0 ? "var(--red)" : "var(--muted)";
      const assStr = m.assDelta > 0 ? `+${_statsFmt(m.assDelta)}` : _statsFmt(m.assDelta);
      const assCol =
        m.assDelta > 0 ? "var(--green)" : m.assDelta < 0 ? "var(--red)" : "var(--muted)";
      return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
        <span style="width:14px;text-align:center;color:${arrowCol};font-weight:800">${arrow}</span>
        <span style="flex:1;font-size:11px;font-weight:700">${escHtml(m.name)}</span>
        <span style="font-size:10px;color:var(--muted)">#${m.rankA}→#${m.rankB}</span>
        <span style="font-size:11px;font-weight:800;color:${assCol};min-width:44px;text-align:right">${assStr}</span>
      </div>`;
    })
    .join("");
  return `${picker}<div style="font-size:9px;color:var(--muted);margin-bottom:6px">${escHtml(seasonA.name)} → ${escHtml(seasonB.name)} · ${escHtml(_statsLabel())} change</div>${rows}`;
}
function setRiserFallerFrom(id) {
  viewState.riserFallerFrom = id;
  renderAnalyticsPage();
}
function setRiserFallerTo(id) {
  viewState.riserFallerTo = id;
  renderAnalyticsPage();
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
          : `<span style="color:var(--red)">-${_statsFmt(Math.abs(r.fromPeak))}</span>`;
      const flStr =
        r.fromLow === 0
          ? `<span style="color:var(--muted);font-size:9px">LOW</span>`
          : `<span style="color:var(--green)">+${_statsFmt(r.fromLow)}</span>`;
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
      <div style="text-align:center;font-size:11px;font-weight:800">${_statsFmt(r.current)}</div>
      <div style="text-align:center;font-size:11px;font-weight:800;color:var(--gold)">${_statsFmt(r.peak)}</div>
      <div style="text-align:center;font-size:9px">${fpStr}</div>
      <div style="text-align:center;font-size:11px;font-weight:800;color:var(--red)">${_statsFmt(r.low)}</div>
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

// ── ASS RATING PROJECTION ───────────────────────────────────
// Rebuilt on the new ASS (EP) engine's own logic — see computeEPProjection
// in src/domain/ep.js. Always computed from EP data regardless of which
// system is active in the Summary tab picker (same convention the removed
// ASS-CLASSIC-only sections used): the title says which engine, so the
// numbers never disagree with it.
window._assProj = {
  formN: 10,
  futureM: 20,
  sortCol: "currentRank",
  sortAsc: true,
};

window._assProjAdj = function (type, delta) {
  const state = window._assProj;
  if (!state) return;
  if (type === "form") {
    state.formN = Math.max(1, state.formN + delta);
    const el = document.getElementById("assproj-form-n");
    if (el) el.textContent = state.formN;
  } else {
    state.futureM = Math.max(1, state.futureM + delta);
    const el = document.getElementById("assproj-future-n");
    if (el) el.textContent = state.futureM;
  }
  window._renderAssProjTable();
};

window._assProjSort = function (col) {
  const state = window._assProj;
  if (!state) return;
  if (state.sortCol === col) {
    state.sortAsc = !state.sortAsc;
  } else {
    state.sortCol = col;
    state.sortAsc = col === "name";
  }
  window._renderAssProjTable();
};

window._renderAssProjTable = function () {
  const tableEl = document.getElementById("assproj-table");
  if (!tableEl) return;
  const { formN, futureM, sortCol, sortAsc } = window._assProj;
  const ratingLbl = SCORING_SYSTEM_LABELS.ep;
  const am2 = activeMatches();
  const rows = computeEPProjection(am2, _epCareerMatches(), formN, futureM).filter(
    (r) => r.games >= 3,
  );
  if (!rows.length) {
    tableEl.innerHTML =
      '<div class="sub" style="padding:8px">Not enough data (need 3+ matches).</div>';
    return;
  }
  const sorted = [...rows].sort((a, b) => {
    if (sortCol === "name") {
      return sortAsc
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    }
    const va = a[sortCol],
      vb = b[sortCol];
    return sortAsc ? va - vb : vb - va;
  });
  const arrow = (c) => (sortCol === c ? (sortAsc ? " ↑" : " ↓") : "");
  const pg = "grid-template-columns:32px 1fr 52px 52px 60px 40px 50px";
  const rowsHtml = sorted
    .map((r) => {
      const deltaCol =
        r.avgDelta > 0
          ? "var(--green)"
          : r.avgDelta < 0
            ? "var(--red)"
            : "var(--muted)";
      const rankArrow =
        r.rankDiff > 0
          ? `<span style="color:var(--green)">▲${r.rankDiff}</span>`
          : r.rankDiff < 0
            ? `<span style="color:var(--red)">▼${Math.abs(r.rankDiff)}</span>`
            : `<span style="color:var(--muted)">—</span>`;
      return `<div class="lrace-row" style="${pg}">
        <div class="lrace-rank">#${r.currentRank}</div>
        <div class="lrace-name">${escHtml(r.name)}</div>
        <div style="text-align:center;font-weight:700">${r.currentScore.toFixed(2)}</div>
        <div style="text-align:center;font-weight:700;color:${deltaCol}">${r.avgDelta > 0 ? "+" : ""}${r.avgDelta.toFixed(1)}</div>
        <div style="text-align:center;font-weight:800">${r.projScore.toFixed(2)}</div>
        <div style="text-align:center">#${r.projRank}</div>
        <div style="text-align:center">${rankArrow}</div>
      </div>`;
    })
    .join("");
  const hdr = `<div class="lrace-header" style="${pg}">
    <span></span>
    <span style="cursor:pointer" onclick="window._assProjSort('name')">Player${arrow("name")}</span>
    <span style="cursor:pointer;text-align:center" onclick="window._assProjSort('currentScore')">${escHtml(ratingLbl)}${arrow("currentScore")}</span>
    <span style="cursor:pointer;text-align:center" onclick="window._assProjSort('avgDelta')">Avg Δ${arrow("avgDelta")}</span>
    <span style="cursor:pointer;text-align:center" onclick="window._assProjSort('projScore')">After ${futureM}${arrow("projScore")}</span>
    <span style="cursor:pointer;text-align:center" onclick="window._assProjSort('projRank')">#New${arrow("projRank")}</span>
    <span style="text-align:center">Δ Rank</span>
  </div>`;
  tableEl.innerHTML = hdr + rowsHtml;
};

function _showShutoutMatches(name, type) {
  document.getElementById("shutout-drill-modal")?.remove();
  const data = window._shutoutMatchData || {};
  const matches =
    (type === "win" ? data.wins?.[name] : data.losses?.[name]) || [];
  const title =
    type === "win"
      ? `${name} — Shutout Wins (W×0)`
      : `${name} — Shutout Losses (L×0)`;
  const col = type === "win" ? "var(--green)" : "var(--red)";
  const rows = [...matches]
    .reverse()
    .map((m) => {
      const idx = state.matches.indexOf(m);
      return buildSummaryMatchRow(m, "", idx >= 0 ? idx : null);
    })
    .join("");
  const body = matches.length
    ? `<div class="smr-list">${rows}</div>`
    : `<div style="padding:20px;text-align:center;color:var(--muted)">No matches found.</div>`;
  const modal = document.createElement("div");
  modal.id = "shutout-drill-modal";
  modal.className = "h2h-modal-overlay";
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  modal.innerHTML = `<div class="h2h-modal-card" style="max-height:80vh;display:flex;flex-direction:column">
    <div class="h2h-modal-header">
      <span class="h2h-modal-title" style="color:${col}">💀 ${escHtml(title)}</span>
      <button class="h2h-modal-close" onclick="document.getElementById('shutout-drill-modal').remove()" aria-label="Close" title="Close">✕</button>
    </div>
    <div style="font-size:10px;color:var(--muted);padding:6px 14px 4px">${matches.length} match${matches.length !== 1 ? "es" : ""} — tap a row to view details</div>
    <div style="overflow-y:auto;flex:1;padding:4px 8px 12px">${body}</div>
  </div>`;
  document.body.appendChild(modal);
}

const _ANA_DATE_OPTS = [
  { v: "all", l: "ALL TIME" },
  { v: "today", l: "TODAY" },
  { v: "week", l: "WEEK" },
  { v: "weekend", l: "WEEKEND" },
  { v: "lastweek", l: "LAST WEEK" },
  { v: "month", l: "MONTH" },
  { v: "range", l: "RANGE" },
];

function _analyticsDateFilterLabel(f, from, to) {
  if (f === "today") return "Today";
  if (f === "week") return "This week";
  if (f === "weekend") return "Weekend";
  if (f === "lastweek") return "Last week";
  if (f === "month") return "This month";
  if (f === "range") {
    if (from && to) return `${fmtDate(from)} → ${fmtDate(to)}`;
    if (from) return `From ${fmtDate(from)}`;
    if (to) return `Until ${fmtDate(to)}`;
    return "Custom range";
  }
  return "All dates";
}

function _analyticsApplyDateFilter(base, f, from, to) {
  if (f === "all") return base;
  const t = todayISO(),
    sw = weekISO(),
    swe = t,
    sm = monthISO(),
    wr = weekendRange(),
    lwr = lastWeekRange();
  return base.filter((m) => {
    if (f === "all") return true;
    if (f === "today") return m.date === t;
    if (f === "week") return m.date >= sw && m.date <= swe;
    if (f === "weekend") return m.date >= wr.from && m.date <= wr.to;
    if (f === "month") return m.date >= sm && m.date <= t;
    if (f === "lastweek") return m.date >= lwr.from && m.date <= lwr.to;
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

function _analyticsMatches() {
  return _analyticsApplyDateFilter(
    activeMatches(),
    viewState.anaDateFilter || "all",
    viewState.anaDateFrom || "",
    viewState.anaDateTo || "",
  );
}

// Shared by the Analytics season-pill row and the Home/Compact quick-switch
// row (_homeSeasonPillHtml) — one place builds the "ALL SEASONS" + one pill
// per season option list, newest-start-first.
function _seasonPillOptions() {
  const activeSeason = _activeSeason();
  const activeId = activeSeason ? activeSeason.id : "all";
  const seasons = [...state.seasons].sort((a, b) =>
    (b.start || "").localeCompare(a.start || ""),
  );
  const opts = [
    {
      id: "all",
      label: "ALL SEASONS",
      title: "Show stats across every season",
    },
    ...seasons.map((s) => ({
      id: s.id,
      label: s.name || "Season",
      title: _seasonRangeLabel(s),
    })),
  ];
  return { activeId, opts };
}
// `idAttr` is only given to the Analytics row (id="ana-season-row" is an
// existing, possibly-referenced anchor) — Home/Compact mount two copies of
// this markup into two different containers, so the pill row itself stays
// id-less there to avoid a duplicate-DOM-id.
function _seasonPillsHtml(rowClass, idAttr) {
  const { activeId, opts } = _seasonPillOptions();
  return `<div class="ana-filter-row ${rowClass}"${idAttr ? ` id="${idAttr}"` : ""}>${opts
    .map(
      (o) =>
        `<button class="ana-filter-pill${activeId === o.id ? " active" : ""}" onclick="setSeason(${jsArg(o.id)})" title="${escHtml(o.title)}">${escHtml(o.label)}</button>`,
    )
    .join("")}</div>`;
}
function _analyticsSeasonControlsHtml() {
  return _seasonPillsHtml("ana-season-row", "ana-season-row");
}
// Season quick-switch pill row for Home/Compact — hidden entirely when the
// group has no seasons defined (nothing to switch between).
function _homeSeasonPillHtml() {
  if (!state.seasons.length) return "";
  return _seasonPillsHtml("home-season-row");
}
function _renderSeasonQuickSwitch() {
  const html = _homeSeasonPillHtml();
  const h = document.getElementById("homeSeasonRow");
  if (h) h.innerHTML = html;
  const c = document.getElementById("compactSeasonRow");
  if (c) c.innerHTML = html;
}

function _analyticsDateControlsHtml() {
  const f = viewState.anaDateFilter || "all";
  const pills = _ANA_DATE_OPTS
    .map(
      (o) =>
        `<button class="ana-filter-pill${f === o.v ? " active" : ""}" onclick="_anaSetDateFilter(${jsArg(o.v)})">${o.l}</button>`,
    )
    .join("");
  const range =
    f === "range"
      ? `<div class="ana-toolbar ana-date-toolbar">
        <input class="ana-date-input" type="date" value="${escHtml(viewState.anaDateFrom || "")}" onchange="_anaSetDateRange('from', this.value)" aria-label="From date">
        <span class="ana-date-range-sep">→</span>
        <input class="ana-date-input" type="date" value="${escHtml(viewState.anaDateTo || "")}" onchange="_anaSetDateRange('to', this.value)" aria-label="To date">
        <button class="ana-filter-pill" onclick="_anaSetDateFilter('all')">CLEAR</button>
      </div>`
      : "";
  return `<div class="ana-filter-row ana-date-row" id="ana-date-row">${pills}</div>${range}`;
}

function _anaSetDateFilter(v) {
  viewState.anaDateFilter = v || "all";
  if (viewState.anaDateFilter !== "range") {
    viewState.anaDateFrom = "";
    viewState.anaDateTo = "";
  }
  renderAnalyticsPage();
}

function _anaSetDateRange(which, value) {
  if (which === "from") viewState.anaDateFrom = value || "";
  else if (which === "to") viewState.anaDateTo = value || "";
  if (viewState.anaDateFilter !== "range") viewState.anaDateFilter = "range";
  renderAnalyticsPage();
}

function renderAnalyticsPage() {
  const container = document.getElementById("analytics-page-content");
  if (!container) return;
  // Statistics page always recomputes fresh on open (no cached-render skip) —
  // its underlying memo values (memoStats/memoASS/pair/reign/rank) are cleared
  // as soon as the user navigates away, in switchMainTab().
  const _anaRenderedKey = `${_activeSeasonId}|${viewState.anaDateFilter || "all"}|${viewState.anaDateFrom || ""}|${viewState.anaDateTo || ""}|${viewState.anaActiveCat || "all"}|${getAnaHideEmpty() ? 1 : 0}`;
  // Statistics run over the season-scoped, GUEST-EXCLUDED set — never raw
  // state.matches — so players marked as guest don't appear in any stat.
  const am = _analyticsMatches();
  if (!am.length) {
    container.innerHTML = emptyState({
      icon: "📊",
      title: "No matches in this view",
      message: `Try a different season or date filter. Current scope: ${_analyticsDateFilterLabel(viewState.anaDateFilter || "all", viewState.anaDateFrom || "", viewState.anaDateTo || "")}.`,
      action: { label: "Add match", onClick: "switchMainTab('add')" },
    });
    _anaRenderedVersion = _dataVersion;
    _anaRenderedFilter = _anaRenderedKey;
    return;
  }

  // ── DATA COLLECTION + DERIVED (pure, moved to player-analytics.js) ─────────
  const {
    stats,
    shutoutWins,
    shutoutLosses,
    highestMargins,
    partnerships,
    teamMatchups,
    monthlyStats,
    dateCounts,
    scoreDist,
    rivalryCount,
    closeWins,
    closePlayed,
    mostActive,
    topWinRate,
    topStreak,
    mostShutoutWinsEntry,
    maxLosses,
    mostShutoutLosses,
    biggestWin,
    bestPartnership,
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
  // Shutout match lists for drill-down (clicking W×0 / L×0 counts)
  const _shutoutWinMatchesByPlayer = {};
  const _shutoutLossMatchesByPlayer = {};
  sortedM.forEach((m) => {
    [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
      (matchesByPlayer[p] || (matchesByPlayer[p] = [])).push(m);
    });
    if (m.date) matchCountByDate[m.date] = (matchCountByDate[m.date] || 0) + 1;
    const aWon = m.scoreA > m.scoreB;
    [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
      const inA = (m.teamA || []).includes(p);
      const won = inA ? aWon : !aWon;
      const myScore = inA ? m.scoreA : m.scoreB;
      const oppScore = inA ? m.scoreB : m.scoreA;
      if (won && oppScore === 0) {
        (
          _shutoutWinMatchesByPlayer[p] || (_shutoutWinMatchesByPlayer[p] = [])
        ).push(m);
      }
      if (!won && myScore === 0) {
        (
          _shutoutLossMatchesByPlayer[p] ||
          (_shutoutLossMatchesByPlayer[p] = [])
        ).push(m);
      }
    });
  });
  window._shutoutMatchData = {
    wins: _shutoutWinMatchesByPlayer,
    losses: _shutoutLossMatchesByPlayer,
  };

  // ── RATING ─────────────────────────────────────────────
  // Follows the Summary tab's scoring picker, so every section fed by this
  // map reports the same numbers the leaderboard does.
  const eloMap = _statsRatingMap(am);
  // One getPairStats(am) pass, reused by every section below that needs it
  // (pair leaderboard, pair form, pair chemistry matrix) instead of each
  // recomputing pair stats over the full match history separately.
  const _pairStatsAm = getPairStats(am);
  const pairLeaderboard = _pairStatsAm.slice(0, 8);
  const playersByMatches = _h2hSortPlayers([
    ...new Set(
      am.flatMap((m) =>
        [...(m.teamA || []), ...(m.teamB || [])].filter(Boolean),
      ),
    ),
  ]);
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

  const compList = computeStats(am, eloMap, _statsSrFn(eloMap));
  if (_scoringMode === "ass") {
    compList.sort((a, b) => (eloMap[b.name] || 0) - (eloMap[a.name] || 0));
  }
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
  const _qwScoreMap = eloMap;
  // Both ELO and ASS are anchored at 1000, so an unmapped player falls back to
  // the 1000 baseline (previously ASS wrongly used 0, deflating the average).
  const _qwFallback = _statsDefault();
  const qualityWins = {};
  am.forEach((m) => {
    const winners = m.scoreA > m.scoreB ? m.teamA : m.teamB;
    const losers = m.scoreA > m.scoreB ? m.teamB : m.teamA;
    const loserAvgScore =
      losers.reduce((s, p) => s + (_qwScoreMap[p] ?? _qwFallback), 0) /
      (losers.length || 1);
    winners.forEach((p) => {
      if (!qualityWins[p]) qualityWins[p] = { total: 0, count: 0 };
      qualityWins[p].total += loserAvgScore;
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

  // Hardest single win = match with highest combined opponent score
  let _hardestWinMatch = null,
    _hardestCombinedScore = -Infinity;
  am.forEach((m) => {
    const _aw = m.scoreA > m.scoreB;
    const _losers2 = _aw ? m.teamB : m.teamA;
    const _combScore = _losers2.reduce(
      (s, p) => s + (_qwScoreMap[p] ?? _qwFallback),
      0,
    );
    if (_combScore > _hardestCombinedScore) {
      _hardestCombinedScore = _combScore;
      _hardestWinMatch = m;
    }
  });
  const _qwLabel = _scoringLabel();
  const _hardestWinCallout = _hardestWinMatch
    ? (() => {
        const _aw2 = _hardestWinMatch.scoreA > _hardestWinMatch.scoreB;
        const _w = (
          _aw2 ? _hardestWinMatch.teamA : _hardestWinMatch.teamB
        ).join(" & ");
        const _l = (
          _aw2 ? _hardestWinMatch.teamB : _hardestWinMatch.teamA
        ).join(" & ");
        return `<div style="background:rgba(var(--theme-rgb),0.08);border:1px solid rgba(var(--theme-rgb),0.18);border-radius:10px;padding:10px 12px;margin-bottom:10px"><div style="font-size:8px;font-weight:700;color:var(--gold);letter-spacing:0.08em;margin-bottom:5px">💎 HARDEST WIN · OPP ${_qwLabel} ${Math.round(_hardestCombinedScore)}</div><div style="font-size:12px;font-weight:800">${_w} <span style="color:var(--green)">beat</span> ${_l}</div><div style="font-size:10px;color:var(--muted);margin-top:3px">${fmtDate(_hardestWinMatch.date)} · ${_hardestWinMatch.scoreA}–${_hardestWinMatch.scoreB}</div></div>`;
      })()
    : "";

  // Determine dynamic thresholds for quality label (percentile-based in ASS mode)
  const _qwScores = qualityRanked.map((p) => p.score);
  const _qwMed = _qwScores.length
    ? _qwScores[Math.floor(_qwScores.length / 2)]
    : _qwFallback;
  // Percentile bands rather than a fixed ±30 around the median: the cutoffs
  // have to mean the same thing whether the active engine spans ~600–1350 or
  // ~0–55, and ±30 on a 0-based scale would swallow the entire field.
  const _qwSorted = [..._qwScores].sort((a, b) => a - b);
  const _qwPct = (q) =>
    _qwSorted.length
      ? _qwSorted[Math.min(_qwSorted.length - 1, Math.floor(_qwSorted.length * q))]
      : _qwFallback;
  const _qwHigh = _qwPct(0.75);
  const _qwLow = _qwPct(0.25);

  // grid: Rank | Player | Wins | Avg Opp score
  const qualGrid = "grid-template-columns:40px 1fr 44px 72px";
  const qualityRankHtml = qualityRanked.length
    ? `<div style="font-size:9px;color:var(--muted);margin-bottom:8px">Average ${_qwLabel} of defeated opponents — higher = tougher competition</div>` +
      `<div class="lrace-header" style="${qualGrid}"><span>Rank</span><span>Player</span><span>Wins</span><span>Avg ${_qwLabel}</span></div>` +
      qualityRanked
        .map((p, i) => {
          const col =
            p.score >= _qwHigh
              ? "var(--green)"
              : p.score <= _qwLow
                ? "var(--red)"
                : "var(--muted)";
          const lbl =
            p.score >= _qwHigh
              ? "💎 ELITE"
              : p.score <= _qwLow
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
  const rivalry =
    rivalA && rivalB ? getHeadToHeadStats(rivalA, rivalB, am) : null;

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
  const _preWkArr = am.filter((m) => (m.date || "") < wkFrom);
  // Rank 1wk-ago using the same scoring mode as current
  const rank1wk = (() => {
    if (_scoringMode === "ass") {
      const assMap1wk = computeASS(_preWkArr);
      return Object.entries(assMap1wk)
        .sort((a, b) => b[1] - a[1])
        .reduce((o, [name], i) => ({ ...o, [name]: i + 1 }), {});
    }
    return computeStats(_preWkArr, computeASS(_preWkArr)).reduce(
      (o, p, i) => ({ ...o, [p.name]: i + 1 }),
      {},
    );
  })();
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
  const pairFormData = _pairStatsAm
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
  // Net ASS/ELO delta per (player, partner) — accumulated across all 2v2 matches
  const pairNetDelta = {};
  if (_scoringMode === "ass") {
    const _assMatchDeltas = computeMatchASSDeltas(sortedM);
    sortedM.forEach((m) => {
      const info = _assMatchDeltas.get(m);
      if (!info) return;
      [m.teamA, m.teamB].forEach((team) => {
        if (team.length !== 2) return;
        team.forEach((p) => {
          const partner = team.find((pp) => pp !== p);
          pairNetDelta[`${p}|||${partner}`] =
            (pairNetDelta[`${p}|||${partner}`] || 0) +
            (info.playerDeltas[p] || 0);
        });
      });
    });
  } else {
    const _runElo = {};
    sortedM.forEach((m) => {
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
        if (!(p in _runElo)) _runElo[p] = 1000;
      });
      const aWon = m.scoreA > m.scoreB;
      const avgA =
        m.teamA.reduce((s, p) => s + _runElo[p], 0) /
        Math.max(m.teamA.length, 1);
      const avgB =
        m.teamB.reduce((s, p) => s + _runElo[p], 0) /
        Math.max(m.teamB.length, 1);
      const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
      const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
      const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
      if (m.teamA.length === 2) {
        m.teamA.forEach((p) => {
          const partner = m.teamA.find((pp) => pp !== p);
          pairNetDelta[`${p}|||${partner}`] =
            (pairNetDelta[`${p}|||${partner}`] || 0) + dA;
        });
      }
      if (m.teamB.length === 2) {
        m.teamB.forEach((p) => {
          const partner = m.teamB.find((pp) => pp !== p);
          pairNetDelta[`${p}|||${partner}`] =
            (pairNetDelta[`${p}|||${partner}`] || 0) + dB;
        });
      }
      m.teamA.forEach((p) => {
        _runElo[p] += dA;
      });
      m.teamB.forEach((p) => {
        _runElo[p] += dB;
      });
    });
  }

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
        scoreDelta: Math.round(pairNetDelta[`${pA}|||${pB}`] || 0),
      });
    }
    if (overallWinRate[pB] !== undefined) {
      synergyRows.push({
        player: pB,
        partner: pA,
        pairPct,
        delta: pairPct - overallWinRate[pB],
        played: pd.played,
        scoreDelta: Math.round(pairNetDelta[`${pB}|||${pA}`] || 0),
      });
    }
  });
  window._synData = synergyRows;
  if (!window._synState)
    window._synState = { col: "delta", dir: "desc", player: "" };
  else window._synState.player = ""; // reset filter on analytics re-render
  const synergyHtml = (() => {
    if (!synergyRows.length)
      return '<div class="sub" style="padding:8px">Not enough data.</div>';

    const synPlayers = [...new Set(synergyRows.map((r) => r.player))].sort();
    const pillWrap =
      "display:flex;gap:5px;overflow-x:auto;padding-bottom:8px;margin-bottom:6px;-webkit-overflow-scrolling:touch;scrollbar-width:none;";
    const pillStyle = "flex:none;padding:5px 10px;font-size:9px;"; // extends .lsst-btn
    const fab =
      `<div style="${pillWrap}">` +
      `<button class="lsst-btn lsst-active syn-filter-pill" data-player="" onclick="window._synSetPlayer('')" style="${pillStyle}">All</button>` +
      synPlayers
        .map(
          (p) =>
            `<button class="lsst-btn syn-filter-pill" data-player="${escHtml(p)}" onclick="window._synSetPlayer('${escHtml(p)}')" style="${pillStyle}">${escHtml(p)}</button>`,
        )
        .join("") +
      `</div>`;

    const pg = "grid-template-columns:1fr 1fr 34px 46px 50px 52px";
    const HDR = `display:grid;${pg};padding:5px 4px 7px;border-bottom:1px solid var(--border);font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);`;
    const scoreColLabel = `Δ ${_scoringLabel()}`;
    const header = `<div style="${HDR}">
      <div onclick="window._synSort('player')" style="cursor:pointer">Player</div>
      <div onclick="window._synSort('partner')" style="cursor:pointer">Partner</div>
      <div onclick="window._synSort('played')" style="text-align:center;cursor:pointer">MP</div>
      <div onclick="window._synSort('pairPct')" style="text-align:center;cursor:pointer">Win%</div>
      <div onclick="window._synSort('delta')" style="text-align:center;cursor:pointer">Δ Win%</div>
      <div onclick="window._synSort('scoreDelta')" style="text-align:center;cursor:pointer">${scoreColLabel}</div>
    </div>`;

    const { col, dir } = window._synState;
    const asc = dir === "asc";
    const CEL = `display:grid;${pg};align-items:center;padding:7px 4px;border-bottom:1px solid rgba(255,255,255,0.04);font-size:11px;font-weight:700;`;
    const sorted = [...synergyRows].sort((a, b) => {
      const av = a[col],
        bv = b[col];
      if (col === "player" || col === "partner")
        return asc ? av.localeCompare(bv) : bv.localeCompare(av);
      return asc ? av - bv : bv - av;
    });
    const bodyRows = sorted
      .map((r) => {
        const col2 =
          r.delta > 5
            ? "var(--green)"
            : r.delta < -5
              ? "var(--red)"
              : "var(--muted)";
        const sign = r.delta >= 0 ? "+" : "";
        const sc = r.scoreDelta || 0;
        const scCol =
          sc > 0 ? "var(--green)" : sc < 0 ? "var(--red)" : "var(--muted)";
        const scSign = sc >= 0 ? "+" : "";
        return `<div style="${CEL}">
        <div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(r.player)}</div>
        <div style="color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">+ ${escHtml(r.partner)}</div>
        <div style="text-align:center">${r.played}</div>
        <div style="text-align:center">${r.pairPct.toFixed(0)}%</div>
        <div style="text-align:center;color:${col2}">${sign}${r.delta.toFixed(0)}%</div>
        <div style="text-align:center;color:${scCol}">${scSign}${sc}</div>
      </div>`;
      })
      .join("");
    return `${fab}${header}<div id="syn-body">${bodyRows}</div>`;
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
      p.players.reduce((s, n) => s + (eloMap[n] ?? _statsDefault()), 0) /
      p.players.length,
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

  // ── SCORING RANKINGS (ELO or ASS depending on master toggle) ──────────
  const _scLabel = _scoringLabel();
  const { from: wkFromElo } = lastWeekRange();
  // Build active score map + pre-week score map for change calc.
  // eloMap (above) is already computeASS(am) — reuse it instead of a second
  // full pass over the same dataset.
  const _scMapNow = eloMap;
  const _scFallback = _statsDefault();
  const _preWkArrElo = am.filter((m) => (m.date || "") < wkFromElo);
  const _scMapPre = _statsRatingMap(_preWkArrElo);
  const eloRanked = Object.entries(_scMapNow).sort((a, b) => b[1] - a[1]);
  const preWkRanked = Object.entries(_scMapPre).sort((a, b) => b[1] - a[1]);
  const maxEloVal = eloRanked[0]?.[1] ?? _scFallback;
  const minEloVal = eloRanked[eloRanked.length - 1]?.[1] ?? _scFallback;
  const eloRange = Math.max(1, maxEloVal - minEloVal);
  const _scSortedVals = eloRanked.map(([, v]) => v).sort((a, b) => a - b);
  const _scMid = _scSortedVals.length
    ? _scSortedVals[Math.floor(_scSortedVals.length / 2)]
    : _scFallback;
  const eloPeaks = _activePeaks();
  const eloHistoryAll = _activeHistory();
  const eloHtml = eloRanked.length
    ? `<div class="ana-card elo-leaderboard-card" style="padding:10px 12px">${eloRanked
        .map(([pname, ev], i) => {
          const change = ev - (_scMapPre[pname] ?? _scFallback);
          const changeStr =
            change > 0
              ? `<span style="color:var(--green)">+${_statsFmt(change)}</span>`
              : change < 0
                ? `<span style="color:var(--red)">-${_statsFmt(Math.abs(change))}</span>`
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
          // Colour against the middle of the field: there is no 1000 line to
          // sit above or below on a 0-based engine.
          const _midVal = _scMid;
          const col =
            ev > _scMid
              ? "var(--green)"
              : ev < _scMid
                ? "var(--red)"
                : "var(--theme)";
          const peak = eloPeaks[pname] ?? ev;
          const fromPeak = ev - peak;
          const fromPeakStr =
            fromPeak === 0
              ? `<span style="color:var(--green);font-size:8px">▲ PEAK</span>`
              : `<span style="color:var(--red);font-size:8px">-${_statsFmt(Math.abs(fromPeak))}</span>`;
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
              <div class="elo-val">${_statsFmt(ev)}</div>
              <div class="elo-change" style="margin-top:2px">${changeStr}</div>
            </div>
            <div style="flex-shrink:0;width:50px;text-align:right;border-left:1px solid rgba(255,255,255,0.06);padding-left:5px">
              <div style="font-size:7px;color:var(--muted);letter-spacing:0.08em">PEAK</div>
              <div style="font-size:11px;font-weight:800">${_statsFmt(peak)}</div>
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
      <div style="font-size:9px;color:var(--muted);margin-bottom:10px">Lower deviation = more consistent ASS swings per match.</div>
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
    ...new Set(_pairStatsAm.flatMap((p) => p.players)),
  ].sort();
  const pairMatrixHtml = (() => {
    if (pairMatrixPlayers.length < 2)
      return '<div class="sub" style="padding:8px">Need more pair data.</div>';
    const pairLookup = {};
    _pairStatsAm.forEach((p) => {
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
    const pbStats = computeStats(am).filter((p) => p.mp >= 3);
    if (!pbStats.length)
      return '<div class="sub" style="padding:8px">Not enough data.</div>';
    const rows = pbStats.map((p) => {
      const playerMs = matchesByPlayer[p.name] || [];
      // Longest win streak ever = bestWinStreak from computeStats
      const longestWS = p.bestWinStreak;
      // Biggest win margin
      let biggestMargin = 0,
        biggestScore = "",
        biggestWinDate = null;
      playerMs.forEach((m) => {
        const inA = (m.teamA || []).includes(p.name);
        const own = inA ? m.scoreA : m.scoreB;
        const opp = inA ? m.scoreB : m.scoreA;
        if (own > opp && own - opp > biggestMargin) {
          biggestMargin = own - opp;
          biggestScore = `${own}-${opp}`;
          biggestWinDate = m.date || null;
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
      const bestDayEntry = Object.entries(byDate).sort(
        (a, b) => b[1].wins - a[1].wins || b[1].played - a[1].played,
      )[0];
      const bestDay = bestDayEntry ? bestDayEntry[1] : null;
      const bestDayDate = bestDayEntry ? bestDayEntry[0] : null;
      const mostMatchesDay = Object.entries(byDate).sort(
        (a, b) => b[1].played - a[1].played,
      )[0];
      let mostDayStr = "—",
        mostDayDate = null;
      if (mostMatchesDay) {
        const [mdDate, mdData] = mostMatchesDay;
        const totalOnDay = matchCountByDate[mdDate] || 0;
        mostDayStr = `${mdData.played}/${totalOnDay}`;
        mostDayDate = mdDate;
      }
      const BT =
        "background:none;border:none;color:inherit;font:inherit;cursor:pointer;padding:0;text-align:center;";
      const dayBtn = (label, date) =>
        date
          ? `<button style="${BT}" onclick="window._goToSummaryDay('${date}')" title="View ${date} in Summary">${label}</button>`
          : `<span>${label}</span>`;
      return `<div class="pb-row">
        <div class="pb-name">${escHtml(p.name)}</div>
        <div class="pb-stat" title="Longest win streak">🔥${longestWS}W</div>
        <div class="pb-stat" title="Biggest win">${biggestScore ? dayBtn(`💥${biggestScore}`, biggestWinDate) : "—"}</div>
        <div class="pb-stat" title="Best day wins">${bestDay ? dayBtn(`⭐${bestDay.wins}W/${bestDay.played}`, bestDayDate) : "—"}</div>
        <div class="pb-stat" title="Most matches in a day">${mostDayStr !== "—" ? dayBtn(`📅${mostDayStr}`, mostDayDate) : "—"}</div>
      </div>`;
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
    const eloMapFull = _statsRatingMap(activeMatches());
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

  // ── DIGEST CARD ────────────────────────────────────────
  viewState.digestFilter = "week";
  viewState.digestPlayer = "";
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

  // ── NEW SECTIONS DATA ──────────────────────────────────

  // 1a: Battle Stats — frozen Player column + scrollable data columns
  const _playerStatsTableHtml = (() => {
    if (!compList.length)
      return '<div class="sub" style="padding:8px">No data.</div>';

    // Top-half SR set for "vs Top" metric
    const _sortedBySR = [...compList].sort((a, b) => b.sr - a.sr);
    const _topHalfSet = new Set(
      _sortedBySR
        .slice(0, Math.ceil(_sortedBySR.length / 2))
        .map((q) => q.name),
    );

    // Precompute per-player stats; stored on window so _renderBstatTable can re-sort
    window._bstatData = compList
      .filter((p) => p.mp >= 1)
      .map((p) => {
        const pms = matchesByPlayer[p.name] || [];
        const mp = pms.length || 1;
        let normGW = 0,
          normGL = 0,
          normMgn = 0,
          oppSRSum = 0;
        let thPlayed = 0,
          thWins = 0,
          fireCnt = 0;
        let clutchP = 0,
          clutchW = 0,
          totWins = 0,
          domWins = 0;

        pms.forEach((m) => {
          const inA = (m.teamA || []).includes(p.name);
          const rawPS = inA ? m.scoreA : m.scoreB;
          const rawOS = inA ? m.scoreB : m.scoreA;
          const f = Math.max(rawPS, rawOS) > 4 ? 4 / Math.max(rawPS, rawOS) : 1;
          normGW += rawPS * f;
          normGL += rawOS * f;
          normMgn += (rawPS - rawOS) * f;

          const opps = inA ? m.teamB || [] : m.teamA || [];
          const won = rawPS > rawOS;

          if (opps.length)
            oppSRSum +=
              opps.reduce(
                (s, op) => s + _statsSrFn(eloMap)(eloMap[op] ?? _statsDefault()),
                0,
              ) / opps.length;

          if (opps.some((op) => _topHalfSet.has(op))) {
            thPlayed++;
            if (won) thWins++;
          }
          if (isFireMatch(m)) fireCnt++;
          if (Math.abs(m.scoreA - m.scoreB) === 1) {
            clutchP++;
            if (won) clutchW++;
          }
          if (won) {
            totWins++;
            if (isDominatingMatch(m)) domWins++;
          }
        });

        const mgnV = normMgn / mp;
        const wPct = p.winPct;
        return {
          name: p.name,
          winPct: wPct,
          sr: p.sr,
          avgG: normGW / mp,
          avgMgn: mgnV,
          gLost: normGL / mp,
          oppSR: oppSRSum / mp,
          vsTop: thPlayed > 0 ? Math.round((thWins / thPlayed) * 100) : null,
          firePct: Math.round((fireCnt / mp) * 100),
          clutchPct: clutchP > 0 ? Math.round((clutchW / clutchP) * 100) : null,
          domPct: totWins > 0 ? Math.round((domWins / totWins) * 100) : null,
          prtns: Object.keys(stats[p.name]?.teammates || {}).length,
          wCol:
            wPct >= 60
              ? "var(--green)"
              : wPct <= 40
                ? "var(--red)"
                : "var(--text)",
          mCol:
            mgnV > 0
              ? "var(--green)"
              : mgnV < 0
                ? "var(--red)"
                : "var(--muted)",
        };
      });

    if (!window._bstatState) window._bstatState = { col: "sr", dir: "desc" };

    // Column group background tints
    const TP = "rgba(96,165,250,0.07)",
      TS = "rgba(52,211,153,0.07)";
    const TO = "rgba(251,191,36,0.07)",
      TC = "rgba(248,113,113,0.07)";
    const TM = "rgba(167,139,250,0.07)",
      FRZ = "var(--surface)";

    const COLS =
      "max-content 44px 44px 44px 54px 44px 54px 50px 44px 54px 44px 44px";
    const HDR =
      "padding:5px 6px;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);border-bottom:1px solid var(--border);text-align:center;white-space:nowrap;cursor:pointer;";
    const CEL =
      "padding:7px 6px;font-size:11px;font-weight:700;text-align:center;border-bottom:1px solid rgba(255,255,255,0.03);";
    const FRZX =
      "position:sticky;left:0;z-index:2;border-right:1px solid var(--border);";

    const h = (label, col, bg, frz = false) =>
      `<div onclick="window._bstatSort('${col}')" style="${HDR}background:${frz ? FRZ : bg};${frz ? FRZX + "z-index:3;" : ""}">${label}</div>`;
    const d = (val, bg, col = "var(--text)", frz = false) =>
      `<div style="${CEL}background:${frz ? FRZ : bg};color:${col};${frz ? FRZX : ""}">${val}</div>`;

    const headers = [
      h("Player", "name", null, true),
      h("Win%", "winPct", TP),
      h("SR", "sr", TP),
      h("Avg G", "avgG", TS),
      h("Avg Mgn", "avgMgn", TS),
      h("G Lost", "gLost", TS),
      h("Opp SR", "oppSR", TO),
      h("vs Top", "vsTop", TO),
      h("Fire%", "firePct", TC),
      h("Clutch%", "clutchPct", TC),
      h("Dom%", "domPct", TC),
      h("Prtns", "prtns", TM),
    ].join("");

    // Render initial sorted rows (same logic as _renderBstatTable)
    const { col, dir } = window._bstatState;
    const asc = dir === "asc";
    const initSorted = [...window._bstatData].sort((a, b) => {
      const av = a[col],
        bv = b[col];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (col === "name")
        return asc ? av.localeCompare(bv) : bv.localeCompare(av);
      return asc ? av - bv : bv - av;
    });
    const initRows = initSorted
      .map((r) =>
        [
          d(r.name, null, "var(--text)", true),
          d(r.winPct.toFixed(0) + "%", TP, r.wCol),
          d(r.sr.toFixed(2), TP),
          d(r.avgG.toFixed(1), TS),
          d((r.avgMgn >= 0 ? "+" : "") + r.avgMgn.toFixed(1), TS, r.mCol),
          d(r.gLost.toFixed(1), TS),
          d(r.oppSR.toFixed(2), TO),
          d(r.vsTop != null ? r.vsTop + "%" : "—", TO),
          d(r.firePct + "%", TC),
          d(r.clutchPct != null ? r.clutchPct + "%" : "—", TC),
          d(r.domPct != null ? r.domPct + "%" : "—", TC),
          d(r.prtns, TM),
        ].join(""),
      )
      .join("");

    return `<div class="ana-card" style="padding:8px 12px">
      <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
        <div style="display:grid;grid-template-columns:${COLS};min-width:max-content">
          ${headers}<div id="bstat-body" style="display:contents">${initRows}</div>
        </div>
      </div>
    </div>`;
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
          opp.reduce((s, p) => s + (eloMap[p] ?? _statsDefault()), 0) /
          opp.length;
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
      `<div class="ana-card" style="padding:8px 12px"><div class="lrace-header" style="${pg2}"><span>Pair</span><span>Played</span><span>Win%</span><span>vs ASS</span><span>Streak</span></div>` +
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
      // Player of the Month = top of the leaderboard for that month
      const moMatches = sortedM.filter((m) => (m.date || "").startsWith(mo));
      if (!moMatches.length) return;
      const moScores = _statsRatingMap(moMatches);
      const moPlayers = Object.entries(moScores)
        .filter(([p]) => monthlyStats[mo]?.[p]?.m > 0)
        .sort(
          (a, b) =>
            (moScores[b[0]] ?? _statsDefault()) -
            (moScores[a[0]] ?? _statsDefault()),
        );
      if (moPlayers.length) {
        const topPlayer = moPlayers[0][0];
        const topScore = Math.round(moScores[topPlayer] ?? _statsDefault());
        const moStats = monthlyStats[mo][topPlayer];
        potmMap[mo] = {
          name: topPlayer,
          score: topScore,
          matches: moStats?.m || 0,
        };
      }
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
              `<div style="background:rgba(var(--theme-rgb),0.1);border:1px solid rgba(var(--theme-rgb),0.2);border-radius:8px;padding:6px 10px;cursor:pointer" onclick="window._showMonthReport('${mo}')"><div style="font-size:8px;color:var(--gold);font-weight:700;letter-spacing:0.06em">${moN2[parseInt(mo.slice(5))]} POTM</div><div style="font-size:11px;font-weight:800">${d.name.split(" ")[0]}</div><div style="font-size:9px;color:var(--muted)">${d.score} · ${d.matches}P</div><div style="font-size:8px;color:var(--theme);margin-top:3px;font-weight:700">📊 Report</div></div>`,
          )
          .join("") +
        `</div>`
      : "";
    const hdrs = lastMos
      .map(
        (mo) =>
          `<th style="text-align:center;color:var(--muted);font-weight:600;font-size:9px;padding:0 4px 6px;cursor:pointer" onclick="window._showMonthReport('${mo}')" title="View ${moN2[parseInt(mo.slice(5))]} report">${moN2[parseInt(mo.slice(5))]}<br><span style="font-size:7px;opacity:0.6">📊</span></th>`,
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
              pct >= 61
                ? "var(--green)"
                : pct >= 45
                  ? "var(--gold)"
                  : "var(--red)";
            const bg =
              pct >= 61
                ? "rgba(54,212,126,0.12)"
                : pct >= 45
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

  // HIGH LOW table (mode-aware: ELO or ASS)
  const _eloLows = _activeLows();
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
        ${mkH("current", "NOW", `Sort by current ${_scLabel}`)}
        ${mkH("peak", "PEAK", `Sort by peak ${_scLabel}`)}
        ${mkH("fromPeak", "↓PEAK", `Sort by distance from peak ${_scLabel}`)}
        ${mkH("low", "LOW", `Sort by lowest ${_scLabel}`)}
        ${mkH("fromLow", "↑LOW", `Sort by recovery from low ${_scLabel}`)}
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
    const hist = _statsTimeline(am).history;
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
    return `<div class="ana-card"><div style="display:flex;gap:4px;overflow-x:auto;padding-bottom:2px">${cells}</div><div style="font-size:9px;color:var(--muted);margin-top:8px;text-align:center">Avg ASS gained per win by day — higher = more upsets / ASS at stake</div></div>`;
  })();

  // ── DOW × PLAYER GAIN MATRIX (active scoring mode) ─────────
  const _dowPlayerMatrixHtml = (() => {
    const hist = _activeHistory();
    const scLbl = _scoringLabel();
    const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    // Players ranked by active score (compList is already sorted this way)
    const players = compList.map((p) => p.name);
    // Build [day][player] = net delta sum
    const matrix = Array.from({ length: 7 }, () => ({}));
    players.forEach((pname) => {
      (hist[pname] || []).forEach((e) => {
        if (!e.date) return;
        const d = new Date(e.date + "T00:00:00").getDay();
        matrix[d][pname] = (matrix[d][pname] || 0) + e.delta;
      });
    });
    // Find max abs value for color intensity
    let maxAbs = 1;
    players.forEach((pname) => {
      DAY.forEach((_, d) => {
        const v = matrix[d][pname];
        if (v !== undefined && Math.abs(v) > maxAbs) maxAbs = Math.abs(v);
      });
    });
    const cellCol = (v) => {
      if (!v) return "rgba(255,255,255,0.04)";
      const intensity = Math.min(1, Math.abs(v) / maxAbs);
      return v > 0
        ? `rgba(72,199,116,${(0.12 + 0.55 * intensity).toFixed(2)})`
        : `rgba(245,87,87,${(0.12 + 0.55 * intensity).toFixed(2)})`;
    };
    // Rows = players (ranked), Columns = days of week
    const thStyle =
      "padding:4px 5px;font-size:8px;font-weight:700;letter-spacing:0.04em;color:var(--muted);text-align:center;border-bottom:1px solid rgba(255,255,255,0.07);white-space:nowrap";
    const tdStyle = (v) =>
      `padding:5px 4px;text-align:center;font-size:9px;font-weight:700;background:${cellCol(v)};color:${v > 0 ? "var(--green)" : v < 0 ? "var(--red)" : "var(--muted)"};font-variant-numeric:tabular-nums`;
    const headerRow = `<tr><th style="${thStyle};text-align:left">Player</th>${DAY.map((d) => `<th style="${thStyle}">${d}</th>`).join("")}</tr>`;
    const dataRows = players
      .map((pname, i) => {
        const nameCell = `<td style="padding:5px 6px;font-size:9px;font-weight:700;white-space:nowrap;color:var(--text)">#${i + 1} ${escHtml(pname)}</td>`;
        const dayCells = DAY.map((_, d) => {
          const v = matrix[d][pname];
          const disp = v === undefined ? "—" : v > 0 ? `+${v}` : `${v}`;
          return `<td style="${tdStyle(v)}">${disp}</td>`;
        }).join("");
        return `<tr style="border-bottom:1px solid rgba(255,255,255,0.04)">${nameCell}${dayCells}</tr>`;
      })
      .join("");
    return `<div class="ana-card" style="padding:8px 6px">
      <div style="font-size:9px;color:var(--muted);margin-bottom:6px">Net ${scLbl} per player per day — ranked by current ${scLbl} score</div>
      <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
        <table style="width:100%;border-collapse:collapse;table-layout:auto">
          <thead>${headerRow}</thead>
          <tbody>${dataRows}</tbody>
        </table>
      </div>
    </div>`;
  })();


  // ── SHUTOUT LEADERBOARD ─────────────────────────────────────
  const _shutoutRows = compList
    .filter((p) => p.mp >= 3)
    .map((p) => {
      const sw = shutoutWins[p.name] || 0;
      const sl = shutoutLosses[p.name] || 0;
      const swPct = p.mp > 0 ? Math.round((sw / p.mp) * 100) : 0;
      const slPct = p.mp > 0 ? Math.round((sl / p.mp) * 100) : 0;
      return { name: p.name, sw, sl, swPct, slPct };
    });
  window._shutoutSortCol = window._shutoutSortCol || "sw";
  window._shutoutSortAsc = window._shutoutSortAsc ?? false;

  window._shutoutSort = function (col) {
    if (window._shutoutSortCol === col) {
      window._shutoutSortAsc = !window._shutoutSortAsc;
    } else {
      window._shutoutSortCol = col;
      window._shutoutSortAsc = col === "name";
    }
    const asc = window._shutoutSortAsc;
    const sorted = [..._shutoutRows].sort((a, b) => {
      const va = a[col],
        vb = b[col];
      if (col === "name")
        return asc ? va.localeCompare(vb) : vb.localeCompare(va);
      return asc ? va - vb : vb - va;
    });
    const pg = "grid-template-columns:minmax(80px,1fr) 44px 44px 58px 58px";
    const body = document.getElementById("shutout-body");
    if (body)
      body.innerHTML = sorted
        .map(
          (r) => `
      <div class="lrace-row" style="${pg}">
        <div class="lrace-name">${escHtml(r.name)}</div>
        <div style="text-align:center;font-weight:700;color:var(--green);${r.sw > 0 ? "cursor:pointer;text-decoration:underline dotted" : ""}" ${r.sw > 0 ? `onclick="_showShutoutMatches(${jsArg(r.name)},'win')"` : ""}>${r.sw}</div>
        <div style="text-align:center;font-weight:700;color:var(--red);${r.sl > 0 ? "cursor:pointer;text-decoration:underline dotted" : ""}" ${r.sl > 0 ? `onclick="_showShutoutMatches(${jsArg(r.name)},'loss')"` : ""}>${r.sl}</div>
        <div style="text-align:center;font-weight:600;color:var(--green)">${r.swPct}%</div>
        <div style="text-align:center;font-weight:600;color:var(--red)">${r.slPct}%</div>
      </div>`,
        )
        .join("");
    // Update header arrows
    ["name", "sw", "sl", "swPct", "slPct"].forEach((c) => {
      const el = document.getElementById(`shutout-hdr-${c}`);
      if (el)
        el.textContent =
          c === window._shutoutSortCol ? (asc ? " ▲" : " ▼") : "";
    });
  };

  const _shutoutLeaderboardHtml = (() => {
    if (!_shutoutRows.length)
      return '<div class="sub" style="padding:8px">Not enough data.</div>';
    const sc = window._shutoutSortCol;
    const asc = window._shutoutSortAsc;
    const sorted = [..._shutoutRows].sort((a, b) => {
      const va = a[sc],
        vb = b[sc];
      if (sc === "name")
        return asc ? va.localeCompare(vb) : vb.localeCompare(va);
      return asc ? va - vb : vb - va;
    });
    const pg = "grid-template-columns:minmax(80px,1fr) 44px 44px 58px 58px";
    const arrow = (c) => (sc === c ? (asc ? " ▲" : " ▼") : "");
    const hdr = (c, label, col) =>
      `<span style="text-align:center;color:${col};cursor:pointer" onclick="_shutoutSort('${c}')">${label}<span id="shutout-hdr-${c}" style="font-size:8px">${arrow(c)}</span></span>`;
    return (
      `<div class="ana-card" style="padding:8px 12px">
      <div style="font-size:9px;color:var(--muted);margin-bottom:8px">Shutout = opponent/you scored 0. % = of total matches played. Tap column to sort.</div>
      <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
        <div style="min-width:284px">
          <div class="lrace-header" style="${pg}">
            <span style="cursor:pointer" onclick="_shutoutSort('name')">Player<span id="shutout-hdr-name" style="font-size:8px">${arrow("name")}</span></span>
            ${hdr("sw", "W×0", "var(--green)")}
            ${hdr("sl", "L×0", "var(--red)")}
            ${hdr("swPct", "W×0 %", "var(--green)")}
            ${hdr("slPct", "L×0 %", "var(--red)")}
          </div>
          <div id="shutout-body">` +
      sorted
        .map(
          (r) => `
          <div class="lrace-row" style="${pg}">
            <div class="lrace-name">${escHtml(r.name)}</div>
            <div style="text-align:center;font-weight:700;color:var(--green);${r.sw > 0 ? "cursor:pointer;text-decoration:underline dotted" : ""}" ${r.sw > 0 ? `onclick="_showShutoutMatches(${jsArg(r.name)},'win')"` : ""}>${r.sw}</div>
            <div style="text-align:center;font-weight:700;color:var(--red);${r.sl > 0 ? "cursor:pointer;text-decoration:underline dotted" : ""}" ${r.sl > 0 ? `onclick="_showShutoutMatches(${jsArg(r.name)},'loss')"` : ""}>${r.sl}</div>
            <div style="text-align:center;font-weight:600;color:var(--green)">${r.swPct}%</div>
            <div style="text-align:center;font-weight:600;color:var(--red)">${r.slPct}%</div>
          </div>`,
        )
        .join("") +
      `</div>
        </div>
      </div>
    </div>`
    );
  })();

  // ── PLAYER FORM LEADERBOARD ─────────────────────────────────
  // Same per-player Form metrics shown on the player-detail card, laid out as a
  // sortable table across every player (min 3 matches).
  const _formRows = compList
    .map((p) => {
      const f = computePlayerForm(p.name, am);
      if (!f) return null;
      return {
        name: p.name,
        score: f.score,
        formEmoji: f.formEmoji,
        winPct10: f.winPct10,
        avgMargin10: f.avgMargin10,
        momentumDelta: f.momentumDelta,
        pressureScore: f.pressureScore,
      };
    })
    .filter(Boolean);
  window._playerFormSortCol = window._playerFormSortCol || "score";
  window._playerFormSortAsc = window._playerFormSortAsc ?? false;
  const _formPg =
    "grid-template-columns:minmax(72px,1fr) 56px 48px 52px 52px 52px";
  const _formRowHtml = (r) => `
      <div class="lrace-row" style="${_formPg}">
        <div class="lrace-name">${escHtml(r.name)}</div>
        <div style="text-align:center;font-weight:800">${r.formEmoji} ${r.score.toFixed(1)}</div>
        <div style="text-align:center;font-weight:600">${r.winPct10}%</div>
        <div style="text-align:center;font-weight:600;color:${r.avgMargin10 >= 0 ? "var(--green)" : "var(--red)"}">${r.avgMargin10 > 0 ? "+" : ""}${r.avgMargin10}</div>
        <div style="text-align:center;font-weight:600;color:${r.momentumDelta > 0 ? "var(--green)" : r.momentumDelta < 0 ? "var(--red)" : "var(--muted)"}">${r.momentumDelta > 0 ? "+" : ""}${r.momentumDelta}</div>
        <div style="text-align:center;font-weight:600;color:${r.pressureScore >= 70 ? "var(--green)" : r.pressureScore >= 50 ? "var(--gold)" : "var(--red)"}">${r.pressureScore}%</div>
      </div>`;
  const _formSortRows = (col, asc) =>
    [..._formRows].sort((a, b) => {
      const va = a[col],
        vb = b[col];
      if (col === "name")
        return asc ? va.localeCompare(vb) : vb.localeCompare(va);
      return asc ? va - vb : vb - va;
    });
  window._playerFormSort = function (col) {
    if (window._playerFormSortCol === col) {
      window._playerFormSortAsc = !window._playerFormSortAsc;
    } else {
      window._playerFormSortCol = col;
      window._playerFormSortAsc = col === "name";
    }
    const asc = window._playerFormSortAsc;
    const body = document.getElementById("player-form-body");
    if (body)
      body.innerHTML = _formSortRows(col, asc).map(_formRowHtml).join("");
    [
      "name",
      "score",
      "winPct10",
      "avgMargin10",
      "momentumDelta",
      "pressureScore",
    ].forEach((c) => {
      const el = document.getElementById(`pform-hdr-${c}`);
      if (el)
        el.textContent =
          c === window._playerFormSortCol ? (asc ? " ▲" : " ▼") : "";
    });
  };
  const _playerFormLeaderboardHtml = (() => {
    if (!_formRows.length)
      return '<div class="sub" style="padding:8px">Not enough data (need 3+ matches).</div>';
    const sc = window._playerFormSortCol;
    const asc = window._playerFormSortAsc;
    const arrow = (c) => (sc === c ? (asc ? " ▲" : " ▼") : "");
    const hdr = (c, label) =>
      `<span style="text-align:center;cursor:pointer" onclick="_playerFormSort('${c}')">${label}<span id="pform-hdr-${c}" style="font-size:8px">${arrow(c)}</span></span>`;
    return (
      `<div class="ana-card" style="padding:8px 12px">
      <div style="font-size:9px;color:var(--muted);margin-bottom:8px">Form over recent matches. W%10 = last-10 win rate · Marg = avg margin last 10 · Mom = momentum (last 5 vs prev 5) · Pres = close-match win %. Tap column to sort.</div>
      <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
        <div style="min-width:384px">
          <div class="lrace-header" style="${_formPg}">
            <span style="cursor:pointer" onclick="_playerFormSort('name')">Player<span id="pform-hdr-name" style="font-size:8px">${arrow("name")}</span></span>
            ${hdr("score", "Form")}
            ${hdr("winPct10", "W%10")}
            ${hdr("avgMargin10", "Marg")}
            ${hdr("momentumDelta", "Mom")}
            ${hdr("pressureScore", "Pres")}
          </div>
          <div id="player-form-body">` +
      _formSortRows(sc, asc).map(_formRowHtml).join("") +
      `</div>
        </div>
      </div>
    </div>`
    );
  })();

  const allSecs = [
    {
      key: "predacc",
      cat: "elo",
      title: "🎯 Prediction Accuracy",
      body: predAccHtml,
    },
    {
      key: "ratingproj",
      cat: "elo",
      title: `📈 Rating Projection (${SCORING_SYSTEM_LABELS.ep})`,
      body: (() => {
        const formN = window._assProj?.formN || 10;
        const futureM = window._assProj?.futureM || 20;
        return `<div class="ana-card" style="padding:10px 12px">
          <div class="ep-controls">
            <div class="ep-ctrl-group">
              <div class="ep-ctrl-label">FORM WINDOW</div>
              <div class="ep-stepper">
                <button class="ep-step-btn" onclick="window._assProjAdj('form',-5)" aria-label="Decrease form window" title="Decrease form window">−</button>
                <span class="ep-step-val" id="assproj-form-n">${formN}</span>
                <span class="ep-step-unit">games</span>
                <button class="ep-step-btn" onclick="window._assProjAdj('form',5)" aria-label="Increase form window" title="Increase form window">+</button>
              </div>
            </div>
            <div class="ep-ctrl-divider"></div>
            <div class="ep-ctrl-group">
              <div class="ep-ctrl-label">PROJECT AHEAD</div>
              <div class="ep-stepper">
                <button class="ep-step-btn" onclick="window._assProjAdj('future',-10)" aria-label="Decrease matches to project ahead" title="Decrease matches to project ahead">−</button>
                <span class="ep-step-val" id="assproj-future-n">${futureM}</span>
                <span class="ep-step-unit">matches</span>
                <button class="ep-step-btn" onclick="window._assProjAdj('future',10)" aria-label="Increase matches to project ahead" title="Increase matches to project ahead">+</button>
              </div>
            </div>
          </div>
          <div style="font-size:9px;color:var(--muted);margin:8px 0">Projects each player's leaderboard score forward from their average points earned over their last FORM WINDOW matches. A simple rate projection — it doesn't re-simulate future opponents or maturity.</div>
          <div id="assproj-table"></div>
        </div>`;
      })(),
    },
    {
      key: "awards",
      cat: "records",
      title: "🏅 Awards Board",
      body: `<div class="awards-grid">${scard("🏃", "Most Active", mostActive?.name, `${mostActive?.matches || 0} matches played`)}${awardsHtml}${scard("🏆", "Best Win Rate", topWinRate?.name, `${topWinRate ? Math.round((topWinRate.wins / topWinRate.matches) * 100) : 0}% (${topWinRate?.wins || 0}W–${topWinRate?.losses || 0}L)`)}${scard("🔥", "Longest Streak", topStreak?.name, `${topStreak?.bestStreak || 0} consecutive wins`)}${scard("⚔️", "Most Dominant", destroyer?.name, `+${destroyer?.avgMargin?.toFixed(1) || 0} avg margin`)}</div>`,
    },
    {
      key: "personalbests",
      cat: "records",
      title: "📈 Personal Bests",
      body: personalBestsHtml,
    },
    {
      key: "currentform",
      cat: "players",
      title: "🔥 Current Form",
      body: `<div class="ana-card" style="padding:8px 12px"><div class="ftable-header"><span>#</span><span>Player</span><span>Last 10</span><span>Win%</span><span>Streak</span></div>${ftHtml}</div>`,
    },
    {
      key: "streaklb",
      cat: "players",
      title: "🏅 Streak Leaderboard",
      body: _buildStreakLeaderboardHtml(),
    },
    {
      key: "streaktl",
      cat: "players",
      title: "📊 Streak Timeline",
      body: (() => {
        const names = playersByMatches.slice(0, 12);
        if (!names.length)
          return '<div class="sub" style="padding:8px">No data.</div>';
        const rows = names
          .map((n) => {
            const segs = streakSegments(sortedM, n);
            if (!segs.length) return "";
            const total = segs.reduce((s, g) => s + g.length, 0) || 1;
            const bars = segs
              .map((g) => {
                const w = (g.length / total) * 100;
                const col =
                  g.type === "W"
                    ? "rgba(54,212,126,0.75)"
                    : "rgba(240,80,80,0.6)";
                return `<div style="width:${w.toFixed(2)}%;background:${col};height:100%" title="${g.type === "W" ? "Won" : "Lost"} ${g.length} in a row (${fmtDate(g.startDate)}–${fmtDate(g.endDate)})"></div>`;
              })
              .join("");
            return `<div style="margin-bottom:8px">
              <div style="font-size:10px;font-weight:700;margin-bottom:3px">${escHtml(n)}</div>
              <div style="display:flex;height:14px;border-radius:4px;overflow:hidden;background:rgba(255,255,255,0.03)">${bars}</div>
            </div>`;
          })
          .join("");
        return `<div class="ana-card" style="padding:10px 12px">
          <div style="font-size:9px;color:var(--muted);margin-bottom:8px">Win (green) / loss (red) streak segments across each player's career, left = earliest</div>
          ${rows}
        </div>`;
      })(),
    },
    {
      key: "powerrank",
      cat: "players",
      title: "⚡ Power Rankings",
      body: _buildPowerRankingsHtml(),
    },
    {
      key: "lbrace",
      cat: "players",
      title: "🏁 Leaderboard Race",
      body: `<div class="ana-card" style="padding:8px 12px"><div class="lrace-header"><span>Rank</span><span>Player</span><span>Last Wk.</span><span>Trend</span></div>${lrHtml}</div>`,
    },
    {
      key: "podium",
      cat: "players",
      title: "🥇 Podium Tracker",
      body: `<div>
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
      key: "antipodium",
      cat: "players",
      title: "🪣 Anti-Podium Tracker",
      body: `<div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
          <button class="digest-filter-btn active" onclick="_antiPodiumSetPeriod(this,'today')">DAILY</button>
          <button class="digest-filter-btn" onclick="_antiPodiumSetPeriod(this,'week')">WEEKLY</button>
          <button class="digest-filter-btn" onclick="_antiPodiumSetPeriod(this,'weekend')">WEEKEND</button>
          <button class="digest-filter-btn" onclick="_antiPodiumSetPeriod(this,'month')">MONTHLY</button>
        </div>
        <div class="antipodium-content">${_secBody(() => _buildAntiPodiumTrackerHtml("today"))}</div>
      </div>`,
    },
    {
      key: "rankreign",
      cat: "players",
      title: "👑 Rank Reign",
      body: _secBody(() => _buildRankReignHtml()),
    },
    {
      key: "ranktimeline",
      cat: "players",
      title: "📈 Rank Timeline",
      body: _secBody(() => _buildRankTimelineHtml("today")),
    },
    {
      key: "lbreplay",
      cat: "players",
      title: "🎬 Leaderboard Replay",
      body: _buildLeaderboardReplayHtml(),
    },
    {
      key: "clutch",
      cat: "players",
      title: "🎯 Clutch Rankings",
      body: `<div class="ana-card" style="padding:8px 12px">${clutchRankHtml}${_antiClutchHtml}</div>`,
    },
    {
      key: "clutchtrends",
      cat: "players",
      title: "📈 Clutch Trends",
      body: clutchTrendHtml,
    },
    {
      key: "quality",
      cat: "players",
      title: "💎 Quality Rankings",
      body: `<div class="ana-card" style="padding:8px 12px">${_hardestWinCallout}${qualityRankHtml}</div>`,
    },
    {
      key: "dominance",
      cat: "players",
      title: "💪 Dominance Rankings",
      body: _dominanceHtml,
    },
    {
      key: "carry",
      cat: "players",
      title: "🚀 Carry Rankings",
      body: carryHtml,
    },
    {
      key: "consistency",
      cat: "players",
      title: "📐 Consistency Rankings",
      body: `<div class="ana-card" style="padding:8px 12px">${consistencyRankHtml}</div>`,
    },
    {
      key: "assvolatility",
      cat: "players",
      title: "📉 ASS Volatility",
      body: eloVolatilityHtml,
    },
    {
      key: "playerform",
      cat: "players",
      title: "🔥 Player Form",
      body: _playerFormLeaderboardHtml,
    },
    {
      key: "scoredist",
      cat: "activity",
      title: "📊 Score Distribution",
      body: `<div class="ana-card">${_sdCallout}${sdHtml}</div>`,
    },
    {
      key: "scoreheatmap",
      cat: "activity",
      title: "🗓️ Score Heatmap",
      body: _scoreHeatmapHtml,
    },
    {
      key: "margintrend",
      cat: "activity",
      title: "📉 Margin Trend",
      body: _scoreMargTrendHtml,
    },
    {
      key: "shutouts",
      cat: "activity",
      title: "💀 Shutout Leaderboard",
      body: _shutoutLeaderboardHtml,
    },
    {
      key: "rivalspotlight",
      cat: "players",
      title: "🔥 Rivalry Spotlight",
      body: `<div class="ana-card">${rivalHtml}</div>`,
    },
    {
      key: "rivalmatrix",
      cat: "players",
      title: "🧮 Rivalry Matrix",
      body: `<div class="ana-card" style="padding:10px 8px"><div style="font-size:9px;color:var(--muted);margin-bottom:8px">Win % of <strong style="color:var(--accent)">row</strong> vs column. — = never met.</div>${matrixHtml}</div>`,
    },
    {
      key: "h2h",
      cat: "players",
      title: "⚔️ Head-to-Head",
      body: (() => {
            const enc = {};
            am.forEach((m) => {
              const tA = m.teamA || [],
                tB = m.teamB || [];
              const aWon = m.scoreA > m.scoreB;
              tA.forEach((a) => {
                tB.forEach((b) => {
                  const sorted = [normPlayer(a), normPlayer(b)].sort();
                  const key = sorted.join(" vs ");
                  if (!enc[key])
                    enc[key] = {
                      total: 0,
                      wins0: 0,
                      p0: sorted[0],
                      p1: sorted[1],
                    };
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
                  p0pct >= 60
                    ? "var(--green)"
                    : p0pct <= 40
                      ? "var(--red)"
                      : "var(--muted)";
                const col1 =
                  p0pct <= 40
                    ? "var(--green)"
                    : p0pct >= 60
                      ? "var(--red)"
                      : "var(--muted)";
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
    {
      key: "partnergrid",
      cat: "players",
      title: "🤝 Partner / Opponent Grid",
      body: _buildPairMatrixHtml(),
    },
    {
      key: "elogap",
      cat: "players",
      title: "⚖️ Avg Opponent ASS Gap",
      body: _buildEloGapHtml(),
    },
    {
      key: "dowvolume",
      cat: "activity",
      title: "📅 Day-of-Week Volume",
      body: dowHtml,
    },
    {
      key: "dowwinpct",
      cat: "activity",
      title: "📅 Day-of-Week Win %",
      body: _dowPlayerHtml,
    },
    {
      key: "dowassgain",
      cat: "activity",
      title: "📅 Day-of-Week ASS Gain",
      body: _eloDowHtml,
    },
    {
      key: "dowmatrix",
      cat: "activity",
      title: "📅 Day-of-Week Matrix",
      body: _dowPlayerMatrixHtml,
    },
    {
      key: "toppairs",
      cat: "pairs",
      title: "🏅 Top Pairs",
      body: _pairLeaderboardHtml,
    },
    {
      key: "allpairs",
      cat: "pairs",
      title: "📋 All Pairs",
      body: `<div class="ana-card" style="padding:10px 12px">${allPairsHtml}</div>`,
    },
    {
      key: "pairsynergy",
      cat: "pairs",
      title: "🧪 Pair Synergy",
      body: `<div class="ana-card" style="padding:10px 12px"><div style="font-size:9px;color:var(--muted);margin-bottom:6px">How much win% changes when paired with each partner (vs solo avg)</div>${synergyHtml}</div>`,
    },
    {
      key: "pairform",
      cat: "pairs",
      title: "🔥 Pair Form",
      body: `<div class="ana-card" style="padding:10px 12px">${pfHtml}</div>`,
    },
    {
      key: "assrankings",
      cat: "elo",
      title: `⚡ ${_scLabel} Rankings`,
      body: eloHtml,
    },
    {
      key: "asshistory",
      cat: "elo",
      title: `📈 ${_scLabel} History`,
      body: `<div id="elo-tl-section">${buildEloTimelineHtml("all")}</div>`,
    },
    {
      key: "asspeaklow",
      cat: "elo",
      title: `🔝 ${_scLabel} Peak / Low`,
      body: _peakEloHtml,
    },
    {
      key: "chemmatrix",
      cat: "pairs",
      title: "🧪 Chemistry Matrix",
      body: pairMatrixHtml,
    },
    {
      key: "chemlb",
      cat: "pairs",
      title: "🧪 Chemistry Leaderboard",
      body: _buildChemistryLeaderboardHtml(),
    },
    {
      key: "pairedh2h",
      cat: "pairs",
      title: "🤝 Paired Head-to-Head",
      body: `<div class="ana-card" style="padding:8px 12px">${pairedH2HHtml}</div>`,
    },
    {
      // Keeps key "calendar" — the lazy-render wiring in toggleAnaSection /
      // the first-paint rAF are both keyed on this section existing.
      key: "calendar",
      cat: "activity",
      title: "📅 Match Calendar",
      body: `<div id="match-calendar" class="match-calendar"></div>`,
    },
    {
      key: "sessions",
      cat: "activity",
      title: "📅 Session Log",
      body: sessHtml,
    },
    ...(uniqueMonths.length >= 1
      ? [
          {
            key: "monthlystats",
            cat: "activity",
            title: "📊 Monthly Stats",
            body: _monthlyStatsTableHtml,
          },
        ]
      : []),
    {
      key: "playerstats",
      cat: "players",
      title: "⚔️ Battle Stats",
      body: _playerStatsTableHtml,
    },
    {
      key: "absencetracker",
      cat: "players",
      title: "👻 Absence Tracker",
      body: _absenceTrackerHtml,
    },
    {
      key: "seasonmode",
      cat: "records",
      // Driven by user-defined Seasons when any exist, else auto monthly buckets.
      title: state.seasons.length ? "🏆 Season Awards" : "📅 Monthly Recap",
      body: _buildSeasonModeHtml(),
    },
    {
      key: "seasoncompare",
      cat: "records",
      title: "🆚 Season Comparison",
      body: _buildSeasonComparisonHtml(),
    },
    {
      key: "hof",
      cat: "records",
      title: "🏆 Hall of Fame",
      body: _buildHallOfFameHtml(),
    },
    {
      key: "seasonmovers",
      cat: "records",
      title: "📈 Season Risers & Fallers",
      body: _buildSeasonRiserFallerHtml(),
    },
    // ── NEW SECTIONS ───────────────────────────────────────────
    {
      key: "winratecalc",
      cat: "players",
      title: "🎯 Win Rate Calculator",
      body: _buildWinRateCalcHtml(),
    },
    {
      key: "ratingdist",
      cat: "elo",
      title: "📊 Rating Distribution",
      body: (() => {
        const scoreMap = eloMap;
        const _distVals = Object.values(scoreMap);
        const _distSpread = _distVals.length
          ? Math.max(..._distVals) - Math.min(..._distVals)
          : 0;
        // ~10 bars across whatever range the active engine actually spans,
        // rounded to a readable step.
        const _distBucket = Math.max(
          1,
          Math.round(Math.max(_distSpread, 1) / 10) || 1,
        );
        const { entries, buckets } = ratingDistribution(scoreMap, _distBucket);
        if (!entries.length)
          return '<div class="sub" style="padding:8px">No data.</div>';
        const rows = buckets
          .map((b) => {
            const chips = b.players
              .map(
                (p) =>
                  `<span title="${escHtml(p.name)}: ${p.score}" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:${playerColor(p.name)};color:#fff;font-size:8px;font-weight:800;margin:1px">${playerInitials(p.name)}</span>`,
              )
              .join("");
            return `<div style="margin-bottom:8px">
              <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--muted);margin-bottom:3px"><span>${b.from}–${b.to}</span><span>${b.players.length}</span></div>
              <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:4px 6px;min-height:26px;display:flex;flex-wrap:wrap;align-items:center">${chips || '<span style="font-size:9px;color:var(--muted)">—</span>'}</div>
            </div>`;
          })
          .join("");
        return `<div class="ana-card" style="padding:10px 12px"><div style="font-size:9px;color:var(--muted);margin-bottom:8px">${_scLabel} spread across the group — how tight or spread out the league is</div>${rows}</div>`;
      })(),
    },
    {
      key: "competitiveness",
      cat: "elo",
      title: "📉 League Competitiveness",
      body: (() => {
        const scoreFn = _statsRatingMap;
        const series = competitivenessOverTime(sortedM, scoreFn).filter(
          (s) => s.n >= 2,
        );
        if (series.length < 2)
          return '<div class="sub" style="padding:8px">Need more months of data.</div>';
        const W = 300,
          H = 130,
          PAD = 26;
        const maxSD = Math.max(...series.map((s) => s.stddev), 10);
        const pts = series.map((s, i) => {
          const x = PAD + (i / Math.max(series.length - 1, 1)) * (W - PAD * 2);
          const y = H - PAD - (s.stddev / maxSD) * (H - PAD * 2 - 10);
          return { x, y, s };
        });
        const path = pts
          .map(
            (p, i) =>
              `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`,
          )
          .join(" ");
        const dots = pts
          .map(
            (p) =>
              `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="var(--theme)"><title>${p.s.month}: σ${p.s.stddev}</title></circle>`,
          )
          .join("");
        const step = Math.ceil(pts.length / 6) || 1;
        const labels = pts
          .filter((_, i) => i % step === 0)
          .map(
            (p) =>
              `<text x="${p.x.toFixed(1)}" y="${H - 6}" font-size="7" fill="var(--muted)" text-anchor="middle">${p.s.month.slice(2)}</text>`,
          )
          .join("");
        const trend =
          series[series.length - 1].stddev < series[0].stddev
            ? "The field is tightening — ratings are converging."
            : "The field is spreading out — a gap is forming.";
        return `<div class="ana-card" style="padding:10px 12px">
          <div style="font-size:9px;color:var(--muted);margin-bottom:8px">Std-dev of ${_scLabel} ratings by month — lower = tighter competition</div>
          <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px">
            <path d="${path}" fill="none" stroke="var(--theme)" stroke-width="2"/>
            ${dots}${labels}
          </svg>
          <div style="font-size:10px;color:var(--muted);text-align:center;margin-top:4px">${trend}</div>
        </div>`;
      })(),
    },
    {
      key: "activitystacked",
      cat: "activity",
      title: "📶 Activity Over Time",
      body: (() => {
        const months = uniqueMonths.slice(-12);
        if (months.length < 2)
          return '<div class="sub" style="padding:8px">Need more months of data.</div>';
        const topPlayers = playersByMatches.slice(0, 8);
        const W = 300,
          H = 150,
          PAD = 8;
        const maxTotal = Math.max(
          ...months.map((mo) =>
            topPlayers.reduce((s, p) => s + (monthlyStats[mo]?.[p]?.m || 0), 0),
          ),
          1,
        );
        const colW = (W - PAD * 2) / months.length;
        const areas = topPlayers
          .map((p, pi) => {
            const col = playerColor(p);
            const topPts = [],
              botPts = [];
            months.forEach((mo, mi) => {
              const x = PAD + mi * colW + colW / 2;
              let below = 0;
              for (let k = 0; k < pi; k++)
                below += monthlyStats[mo]?.[topPlayers[k]]?.m || 0;
              const val = monthlyStats[mo]?.[p]?.m || 0;
              const yTop = H - PAD - ((below + val) / maxTotal) * (H - PAD * 2);
              const yBot = H - PAD - (below / maxTotal) * (H - PAD * 2);
              topPts.push(`${x.toFixed(1)},${yTop.toFixed(1)}`);
              botPts.unshift(`${x.toFixed(1)},${yBot.toFixed(1)}`);
            });
            return `<polygon points="${topPts.join(" ")} ${botPts.join(" ")}" fill="${col}" opacity="0.55" stroke="${col}" stroke-width="0.5"/>`;
          })
          .join("");
        const legend = topPlayers
          .map(
            (p) =>
              `<span style="display:inline-flex;align-items:center;gap:4px;font-size:9px;color:var(--muted);margin-right:8px"><span style="width:8px;height:8px;border-radius:2px;background:${playerColor(p)};display:inline-block"></span>${escHtml(p.split(" ")[0])}</span>`,
          )
          .join("");
        return `<div class="ana-card" style="padding:10px 12px">
          <div style="font-size:9px;color:var(--muted);margin-bottom:8px">Matches played per month, stacked by player (top 8 by volume)</div>
          <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px">${areas}</svg>
          <div style="margin-top:8px;display:flex;flex-wrap:wrap">${legend}</div>
        </div>`;
      })(),
    },
    {
      key: "favwincurve",
      cat: "elo",
      title: "🎯 Favourite-Wins Curve",
      body: (() => {
        const curve = favouriteWinCurve(sortedM);
        if (!curve.length)
          return '<div class="sub" style="padding:8px">No data.</div>';
        const rows = curve
          .map((b) => {
            const col =
              b.pct >= 70
                ? "var(--green)"
                : b.pct >= 55
                  ? "var(--gold)"
                  : "var(--red)";
            return `<div style="margin-bottom:8px">
              <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px"><span style="color:var(--muted)">Gap ${b.label}</span><span style="font-weight:800;color:${col}">${b.pct}%</span></div>
              <div style="height:8px;background:rgba(255,255,255,0.05);border-radius:4px;overflow:hidden"><div style="width:${b.pct}%;height:100%;background:${col}"></div></div>
              <div style="font-size:8px;color:var(--muted);margin-top:2px">${b.total} matches</div>
            </div>`;
          })
          .join("");
        return `<div class="ana-card" style="padding:10px 12px">
          <div style="font-size:9px;color:var(--muted);margin-bottom:8px">Win% of the pre-match favourite, by rating gap — higher = the rating system predicts outcomes well</div>
          ${rows}
        </div>`;
      })(),
    },
    {
      key: "marginhist",
      cat: "records",
      title: "💢 Margin of Victory",
      body: (() => {
        const buckets = marginBuckets(am);
        const maxC = Math.max(...buckets.map((b) => b.count), 1);
        const rows = buckets
          .map(
            (b) =>
              `<div class="sdist-row"><div class="sdist-lbl">${b.margin} games</div><div class="sdist-bar-wrap"><div class="sdist-bar" style="width:${((b.count / maxC) * 100).toFixed(0)}%"></div></div><div class="sdist-count">${b.count}</div></div>`,
          )
          .join("");
        const blowouts = buckets
          .filter((b) => ["4", "5+"].includes(b.margin))
          .reduce((s, b) => s + b.count, 0);
        const nailbiters = buckets
          .filter((b) => ["0", "1"].includes(b.margin))
          .reduce((s, b) => s + b.count, 0);
        return `<div class="ana-card" style="padding:10px 12px">
          <div style="display:flex;gap:8px;margin-bottom:10px">
            <div style="flex:1;background:rgba(54,212,126,0.08);border-radius:8px;padding:8px;text-align:center"><div style="font-size:8px;color:var(--muted)">NAIL-BITERS (±1)</div><div style="font-size:18px;font-weight:900;color:var(--green)">${nailbiters}</div></div>
            <div style="flex:1;background:rgba(240,80,80,0.08);border-radius:8px;padding:8px;text-align:center"><div style="font-size:8px;color:var(--muted)">BLOWOUTS (4+)</div><div style="font-size:18px;font-weight:900;color:var(--red)">${blowouts}</div></div>
          </div>
          ${rows}
        </div>`;
      })(),
    },
    {
      key: "formclass",
      cat: "players",
      title: "🌟 Form vs Class",
      body: (() => {
        const formMap = {};
        formTable.forEach((f) => {
          formMap[f.name] = f.pct;
        });
        const pts = compList
          .filter((p) => formMap[p.name] != null)
          .map((p) => ({ name: p.name, cls: p.sr, form: formMap[p.name] }));
        if (pts.length < 3)
          return '<div class="sub" style="padding:8px">Need more data.</div>';
        const minCls = Math.min(...pts.map((p) => p.cls)),
          maxCls = Math.max(...pts.map((p) => p.cls));
        const clsRange = Math.max(maxCls - minCls, 0.1);
        const W = 280,
          H = 220,
          PAD = 30;
        const cx = (v) => PAD + ((v - minCls) / clsRange) * (W - PAD * 2);
        const cy = (v) => H - PAD - (v / 100) * (H - PAD * 2);
        const midX = cx((minCls + maxCls) / 2),
          midY = cy(50);
        const dots = pts
          .map((p) => {
            const x = cx(p.cls),
              y = cy(p.form);
            return `<g><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="${playerColor(p.name)}" opacity="0.85"/><text x="${x.toFixed(1)}" y="${(y + 2.5).toFixed(1)}" font-size="7" fill="#fff" text-anchor="middle" font-weight="700">${playerInitials(p.name)}</text><title>${escHtml(p.name)}: SR ${p.cls.toFixed(1)} · Form ${p.form}%</title></g>`;
          })
          .join("");
        return `<div class="ana-card" style="padding:10px 12px">
          <div style="font-size:9px;color:var(--muted);margin-bottom:8px">Class (all-time SR) vs Form (last-10 win%) — four quadrants: stars, sleepers, overperformers, strugglers</div>
          <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px">
            <line x1="${PAD}" y1="${midY.toFixed(1)}" x2="${W - PAD}" y2="${midY.toFixed(1)}" stroke="rgba(255,255,255,0.1)" stroke-dasharray="3 3"/>
            <line x1="${midX.toFixed(1)}" y1="${PAD}" x2="${midX.toFixed(1)}" y2="${H - PAD}" stroke="rgba(255,255,255,0.1)" stroke-dasharray="3 3"/>
            <text x="${W - PAD}" y="${PAD - 4}" font-size="7" fill="var(--muted)" text-anchor="end">IN-FORM STARS</text>
            <text x="${PAD}" y="${PAD - 4}" font-size="7" fill="var(--muted)" text-anchor="start">OVERPERFORMERS</text>
            <text x="${W - PAD}" y="${H - PAD + 10}" font-size="7" fill="var(--muted)" text-anchor="end">SLEEPING GIANTS</text>
            <text x="${PAD}" y="${H - PAD + 10}" font-size="7" fill="var(--muted)" text-anchor="start">STRUGGLING</text>
            ${dots}
          </svg>
        </div>`;
      })(),
    },
    {
      key: "nemesisbunny",
      cat: "players",
      title: "😈 Nemesis & Bunny",
      body: (() => {
        const nb = nemesisBunny(am, 3);
        const rows = playersByMatches
          .filter((p) => nb[p] && (nb[p].nemesis || nb[p].bunny))
          .map((p) => {
            const { nemesis, bunny } = nb[p];
            return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
              <div style="flex:1;font-size:11px;font-weight:700">${escHtml(p)}</div>
              ${nemesis ? `<div style="font-size:9px;color:var(--red);text-align:right;width:96px">😈 ${escHtml(nemesis.opp.split(" ")[0])} <span style="color:var(--muted)">(${Math.round(nemesis.pct * 100)}%)</span></div>` : '<div style="font-size:9px;color:var(--muted);width:96px;text-align:right">—</div>'}
              ${bunny ? `<div style="font-size:9px;color:var(--green);text-align:right;width:96px">🐰 ${escHtml(bunny.opp.split(" ")[0])} <span style="color:var(--muted)">(${Math.round(bunny.pct * 100)}%)</span></div>` : '<div style="font-size:9px;color:var(--muted);width:96px;text-align:right">—</div>'}
            </div>`;
          })
          .join("");
        if (!rows)
          return '<div class="sub" style="padding:8px">Need 3+ meetings between players.</div>';
        return `<div class="ana-card" style="padding:10px 12px">
          <div style="display:flex;font-size:8px;color:var(--muted);font-weight:700;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06)"><div style="flex:1">PLAYER</div><div style="width:96px;text-align:right">NEMESIS</div><div style="width:96px;text-align:right">BUNNY</div></div>
          ${rows}
        </div>`;
      })(),
    },
    {
      key: "underdogboard",
      cat: "records",
      title: `🐺 Underdog Leaderboard (${SCORING_SYSTEM_LABELS.ep})`,
      body: (() => {
        const upsets = computeEPUpsets(am, _epCareerMatches());
        const agg = {};
        upsets.forEach((u) => {
          if (u.gap <= 0) return;
          u.winners.forEach((p) => {
            if (!agg[p]) agg[p] = { count: 0, maxGap: 0 };
            agg[p].count++;
            agg[p].maxGap = Math.max(agg[p].maxGap, u.gap);
          });
        });
        const ranked = Object.entries(agg).sort(
          (a, b) => b[1].count - a[1].count || b[1].maxGap - a[1].maxGap,
        );
        if (!ranked.length)
          return '<div class="sub" style="padding:8px">No upset wins yet.</div>';
        const rows = ranked
          .slice(0, 12)
          .map(
            ([name, d], i) =>
              `<div class="lrace-row" style="grid-template-columns:34px 1fr 60px 70px"><div class="lrace-rank">#${i + 1}</div><div class="lrace-name">${escHtml(name)}</div><div class="lrace-1mo">${d.count}</div><div class="lrace-delta" style="color:var(--green)">+${d.maxGap}</div></div>`,
          )
          .join("");
        return `<div class="ana-card" style="padding:10px 12px">
          <div style="font-size:9px;color:var(--muted);margin-bottom:6px">Wins where the internal strength walk (the same one that prices every ${escHtml(SCORING_SYSTEM_LABELS.ep)} match) had you as the underdog.</div>
          <div class="lrace-header" style="grid-template-columns:34px 1fr 60px 70px"><span>Rank</span><span>Player</span><span>Upsets</span><span>Best Gap</span></div>
          ${rows}
        </div>`;
      })(),
    },
    {
      key: "partnerloyalty",
      cat: "pairs",
      title: "💞 Partner Loyalty",
      body: (() => {
        const loyalty = partnerLoyalty(am, 3);
        if (!loyalty.length)
          return '<div class="sub" style="padding:8px">Need more doubles data.</div>';
        const rows = loyalty
          .slice(0, 12)
          .map((p) => {
            const col =
              p.pct >= 70
                ? "var(--green)"
                : p.pct <= 30
                  ? "var(--gold)"
                  : "var(--muted)";
            return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
              <div style="flex:1;font-size:11px;font-weight:700">${escHtml(p.name)}</div>
              <div style="font-size:9px;color:var(--muted)">with ${escHtml((p.topPartner || "").split(" ")[0])}</div>
              <div style="font-size:11px;font-weight:800;color:${col};width:36px;text-align:right">${p.pct}%</div>
            </div>`;
          })
          .join("");
        return `<div class="ana-card" style="padding:10px 12px">
          <div style="font-size:9px;color:var(--muted);margin-bottom:8px">% of doubles matches played with their single most-frequent partner</div>
          ${rows}
        </div>`;
      })(),
    },
    {
      key: "hallfame",
      cat: "records",
      title: "🏛️ Hall of Fame",
      body: (() => {
        const hof = hallOfFameRecords(am, players, _statsTimeline(am).history);
        if (!hof)
          return '<div class="sub" style="padding:8px">No data yet.</div>';
        const item = (
          icon,
          label,
          value,
          sub,
        ) => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
          <div style="font-size:20px;width:30px;text-align:center">${icon}</div>
          <div style="flex:1">
            <div style="font-size:9px;color:var(--muted);font-weight:700;letter-spacing:0.06em;text-transform:uppercase">${label}</div>
            <div style="font-size:13px;font-weight:800">${value}</div>
            ${sub ? `<div style="font-size:9px;color:var(--muted)">${sub}</div>` : ""}
          </div>
        </div>`;
        const rows = [
          hof.biggestWin
            ? item(
                "💥",
                "Biggest Win Ever",
                hof.biggestWin.score,
                `${escHtml(hof.biggestWin.winners.join(" & "))} vs ${escHtml(hof.biggestWin.losers.join(" & "))} · ${fmtDate(hof.biggestWin.date)}`,
              )
            : "",
          hof.longestStreak
            ? item(
                "🔥",
                "Longest Win Streak",
                `${hof.longestStreak.bestStreak} matches`,
                escHtml(hof.longestStreak.name),
              )
            : "",
          hof.mostInDay
            ? item(
                "📅",
                "Most Matches in a Day",
                `${hof.mostInDay.n} matches`,
                `${escHtml(hof.mostInDay.name)} · ${fmtDate(hof.mostInDay.date)}`,
              )
            : "",
          hof.peakAss
            ? item(
                "🏆",
                "Highest ASS Ever",
                `${Math.round(hof.peakAss.val)}`,
                `${escHtml(hof.peakAss.name)} · ${fmtDate(hof.peakAss.date)}`,
              )
            : "",
          item(
            "🎾",
            "Total Matches Played",
            `${hof.totalMatches}`,
            `across ${hof.totalDays} playing days`,
          ),
        ].join("");
        return `<div class="ana-card" style="padding:10px 12px">${rows}</div>`;
      })(),
    },
    {
      key: "milestonetimeline",
      cat: "records",
      title: "🕰️ Milestone Timeline",
      body: (() => {
        const events = buildMilestoneTimeline(sortedM).slice(-25).reverse();
        if (!events.length)
          return '<div class="sub" style="padding:8px">No milestones yet.</div>';
        const rows = events
          .map(
            (
              e,
            ) => `<div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
          <div style="font-size:16px;width:24px;text-align:center;flex-shrink:0">${e.icon}</div>
          <div style="flex:1">
            <div style="font-size:11px;font-weight:700">${escHtml(e.text)}</div>
            <div style="font-size:9px;color:var(--muted)">${fmtDate(e.date)}</div>
          </div>
        </div>`,
          )
          .join("");
        return `<div class="ana-card" style="padding:10px 12px;max-height:340px;overflow-y:auto">${rows}</div>`;
      })(),
    },
    {
      key: "attendancestreaks",
      cat: "activity",
      title: "📌 Attendance Streaks",
      body: (() => {
        const streaks = attendanceStreaks(am).filter(
          (s) => s.sessionsPlayed >= 3,
        );
        if (!streaks.length)
          return '<div class="sub" style="padding:8px">Need more session history.</div>';
        const rows = streaks
          .slice(0, 12)
          .map((s, i) => {
            const col =
              s.current >= 3
                ? "var(--green)"
                : s.current > 0
                  ? "var(--gold)"
                  : "var(--muted)";
            return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
              <div style="width:20px;font-size:10px;color:var(--muted)">#${i + 1}</div>
              <div style="flex:1;font-size:11px;font-weight:700">${escHtml(s.name)}</div>
              <div style="font-size:11px;font-weight:800;color:${col}">${s.current} 🔥</div>
              <div style="font-size:9px;color:var(--muted);width:60px;text-align:right">best ${s.best}</div>
            </div>`;
          })
          .join("");
        return `<div class="ana-card" style="padding:10px 12px">
          <div style="font-size:9px;color:var(--muted);margin-bottom:8px">Consecutive group sessions attended — current streak vs personal best</div>
          ${rows}
        </div>`;
      })(),
    },
    {
      key: "weightedmvp",
      cat: "players",
      title: "🏅 Weighted MVP Formula",
      body: (() => {
        const scoreMap = eloMap;
        const upsets = _statsUpsets(am);
        const upsetCounts = {};
        upsets.forEach((u) => {
          if (u.gap > 0)
            u.winners.forEach((p) => {
              upsetCounts[p] = (upsetCounts[p] || 0) + 1;
            });
        });
        const attendance = {};
        am.forEach((m) => {
          [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
            (attendance[p] || (attendance[p] = new Set())).add(m.date);
          });
        });
        const input = compList.map((p) => ({
          name: p.name,
          ratingGain: (scoreMap[p.name] ?? _statsDefault()) - _statsDefault(),
          winPct: p.winPct,
          attendance: attendance[p.name] ? attendance[p.name].size : 0,
          upsets: upsetCounts[p.name] || 0,
        }));
        const ranked = weightedMvpScore(input);
        if (!ranked.length)
          return '<div class="sub" style="padding:8px">No data.</div>';
        const _mvpLbl = _scoringLabel();
        const _mvpPg =
          "grid-template-columns:24px minmax(70px,1fr) 56px 46px 44px 44px 44px";
        const rows = ranked
          .slice(0, 10)
          .map((p, i) => {
            const rg = p.ratingGain;
            const rgCol =
              rg > 0 ? "var(--green)" : rg < 0 ? "var(--red)" : "var(--muted)";
            return `<div class="lrace-row" style="${_mvpPg}">
          <div style="text-align:center;font-size:10px;color:var(--muted)">#${i + 1}</div>
          <div class="lrace-name">${escHtml(p.name)}</div>
          <div style="text-align:center;font-weight:700;color:${rgCol}">${rg > 0 ? "+" : ""}${_statsFmt(rg)}</div>
          <div style="text-align:center;font-weight:600">${Math.round(p.winPct)}%</div>
          <div style="text-align:center;font-weight:600">${p.attendance}</div>
          <div style="text-align:center;font-weight:600;color:var(--gold)">${p.upsets}</div>
          <div style="text-align:center;font-size:13px;font-weight:900;color:var(--theme)">${p.composite}</div>
        </div>`;
          })
          .join("");
        return `<div class="ana-card" style="padding:10px 12px">
          <div style="font-size:9px;color:var(--muted);margin-bottom:8px">Composite score: rating gain 40% · win% 30% · attendance 20% · upsets 10% (normalized 0-100). ${_mvpLbl} Δ = rating gained, Days = sessions attended.</div>
          <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
            <div style="min-width:346px">
              <div class="lrace-header" style="${_mvpPg}">
                <span>#</span>
                <span>Player</span>
                <span style="text-align:center">${_mvpLbl} Δ</span>
                <span style="text-align:center">Win%</span>
                <span style="text-align:center">Days</span>
                <span style="text-align:center">Ups</span>
                <span style="text-align:center">MVP</span>
              </div>
              ${rows}
            </div>
          </div>
        </div>`;
      })(),
    },
    {
      key: "badgegallery",
      cat: "players",
      title: "🎖️ Badge Gallery",
      body: (() => {
        const eloMapAll = _statsRatingMap(activeMatches());
        const holders = {};
        playersByMatches.forEach((name) => {
          const badges = computeBadges(
            name,
            null,
            eloMapAll,
            am,
            compList,
            _statsBadgeOpts(),
          );
          badges.forEach((b) => {
            if (!holders[b.label])
              holders[b.label] = { icon: b.icon, desc: b.desc, players: [] };
            holders[b.label].players.push(name);
          });
        });
        const labels = Object.keys(holders);
        if (!labels.length)
          return '<div class="sub" style="padding:8px">No badges earned yet.</div>';
        const rows = labels
          .map((label) => {
            const h = holders[label];
            const chips = h.players
              .map(
                (p) =>
                  `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,0.05);border-radius:14px;padding:3px 9px;font-size:10px;font-weight:700;margin:2px">${escHtml(p)}</span>`,
              )
              .join("");
            return `<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"><span style="font-size:16px">${h.icon}</span><span style="font-size:11px;font-weight:800">${escHtml(label)}</span><span style="font-size:8px;color:var(--muted)">${escHtml(h.desc || "")}</span></div>
              <div>${chips}</div>
            </div>`;
          })
          .join("");
        return `<div class="ana-card" style="padding:10px 12px">${rows}</div>`;
      })(),
    },
    {
      key: "ratingsrace",
      cat: "elo",
      title: "🏁 Ratings Race",
      body: (() => {
        const months = uniqueMonths.slice(-12);
        if (months.length < 3)
          return '<div class="sub" style="padding:8px">Need more months of history.</div>';
        const scoreFn = _statsRatingMap;
        const frames = ratingsByMonth(sortedM, scoreFn, months);
        const finalScores = frames[frames.length - 1].scores;
        const topNames = Object.entries(finalScores)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([n]) => n);
        if (!topNames.length)
          return '<div class="sub" style="padding:8px">No data.</div>';
        const _raceFloor = SCORING_SYSTEMS_ZERO_BASED.includes(_scoringSystem)
          ? 0
          : 1200;
        const maxScore = Math.max(
          ...frames.flatMap((f) =>
            topNames.map((n) => f.scores[n] ?? _statsDefault()),
          ),
          _raceFloor,
        );
        const bars = topNames
          .map((n, i) => {
            const val = Math.round(frames[0].scores[n] ?? _statsDefault());
            const pct = Math.min(100, (val / maxScore) * 100);
            return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
              <div style="width:52px;font-size:9px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(n.split(" ")[0])}</div>
              <div style="flex:1;height:16px;background:rgba(255,255,255,0.04);border-radius:4px;overflow:hidden"><div id="race-bar-${i}" style="height:100%;width:${pct.toFixed(1)}%;background:${playerColor(n)};transition:width 0.6s ease;border-radius:4px"></div></div>
              <div id="race-val-${i}" style="width:36px;text-align:right;font-size:10px;font-weight:800;color:var(--muted)">${val}</div>
            </div>`;
          })
          .join("");
        const raceData = escHtml(
          JSON.stringify({
            names: topNames,
            frames: frames.map((f) => ({
              month: f.month,
              scores: topNames.map((n) =>
                Math.round(f.scores[n] ?? _statsDefault()),
              ),
            })),
            maxScore,
          }),
        );
        return `<div class="ana-card" style="padding:10px 12px">
          <div style="font-size:9px;color:var(--muted);margin-bottom:6px">${_scLabel} ratings, month by month — top 8 players by current rating</div>
          <div id="race-month-lbl" style="font-size:10px;font-weight:800;color:var(--theme);margin-bottom:8px;text-align:center">${frames[0].month}</div>
          <div id="race-bars">${bars}</div>
          <button data-race="${raceData}" onclick="window._playRatingsRace(this)" style="width:100%;margin-top:10px;padding:8px;border-radius:10px;border:1px solid rgba(var(--theme-rgb),0.4);background:rgba(var(--theme-rgb),0.12);color:var(--theme);font-weight:700;font-size:11px;cursor:pointer">▶ Play Race</button>
        </div>`;
      })(),
    },
    {
      key: "ratingsmultiples",
      cat: "elo",
      title: "🔬 Ratings Small Multiples",
      body: (() => {
        const hist = _activeHistory();
        const names = playersByMatches
          .filter((n) => (hist[n] || []).length >= 3)
          .slice(0, 16);
        if (!names.length)
          return '<div class="sub" style="padding:8px">Need more match history.</div>';
        const W = 100,
          H = 40,
          PAD = 3;
        const cards = names
          .map((n) => {
            const h = hist[n];
            const vals = h.map((pt) => pt.elo);
            const min = Math.min(...vals),
              max = Math.max(...vals);
            const range = Math.max(max - min, 1);
            const pts = vals
              .map((v, i) => {
                const x =
                  PAD + (i / Math.max(vals.length - 1, 1)) * (W - PAD * 2);
                const y = H - PAD - ((v - min) / range) * (H - PAD * 2);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(" ");
            const last = vals[vals.length - 1],
              first = vals[0];
            const col = last >= first ? "#36d47e" : "#f04f4f";
            return `<div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:6px">
              <div style="font-size:9px;font-weight:700;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(n.split(" ")[0])}</div>
              <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px"><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2"/></svg>
              <div style="font-size:9px;color:var(--muted);text-align:right">${Math.round(last)}</div>
            </div>`;
          })
          .join("");
        return `<div class="ana-card" style="padding:10px 12px"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${cards}</div></div>`;
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
  if (!hasAnaCollapsedPref()) saveAnaCollapsed(new Set(validKeys));
  const collapsed = getAnaCollapsed();

  // ALL/FAVS stay pinned first and HIDDEN stays pinned last (they're
  // meta-filters, not topics); the actual topic categories in between are
  // kept alphabetically sorted by their label.
  const _catBase = [
    { id: "all", label: "ALL" },
    { id: "favs", label: "★ FAVS" },
    ...[
      { id: "elo", label: _scLabel },
      { id: "players", label: "PLAYERS" },
      { id: "pairs", label: "PAIRS" },
      { id: "records", label: "RECORDS" },
      { id: "activity", label: "ACTIVITY" },
    ].sort((a, b) => a.label.localeCompare(b.label)),
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

  const _hideEmptyOn = getAnaHideEmpty();
  const _hideEmptyToggle = `<div class="ana-toolbar"><button class="ana-hideempty-btn${_hideEmptyOn ? " active" : ""}" onclick="toggleAnaHideEmpty()">${_hideEmptyOn ? "☑" : "☐"} Hide empty</button></div>`;
  container.classList.toggle("ana-hide-empty", _hideEmptyOn);

  const sectionsHtml = orderedKeys
    .map((key) => {
      const def = allSecs.find((s) => s.key === key);
      if (!def) return "";
      return {
        key,
        cat: def.cat,
        html: makeSec(key, def.title, def.body, collapsed.has(key), def.cat),
      };
    })
    .filter(Boolean);

  const isDesktopDashboard =
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    window.innerWidth >= 1100;

  if (!isDesktopDashboard) {
    container.innerHTML =
      filterPillsHtml +
      _analyticsSeasonControlsHtml() +
      _analyticsDateControlsHtml() +
      _hideEmptyToggle +
      sectionsHtml.map((sec) => sec.html).join("");
  } else {
    const leftKeys = new Set([
      "awards",
      "personalbests",
      "currentform",
      "streaklb",
      "streaktl",
      "playerform",
      "scoredist",
      "scoreheatmap",
      "margintrend",
      "shutouts",
      "consistency",
      "assvolatility",
    ]);
    const rightKeys = new Set([
      "powerrank",
      "seasonmovers",
      "lbrace",
      "podium",
      "antipodium",
      "rankreign",
      "ranktimeline",
      "lbreplay",
      "clutch",
      "clutchtrends",
      "quality",
      "dominance",
      "carry",
      "rivalspotlight",
      "rivalmatrix",
      "h2h",
      "dowvolume",
      "dowwinpct",
      "dowassgain",
      "dowmatrix",
      "toppairs",
      "allpairs",
      "pairsynergy",
      "pairform",
      "assrankings",
      "asshistory",
      "asspeaklow",
      "winprob",
      "chemmatrix",
      "chemlb",
      "pairedh2h",
    ]);
    const fullKeys = new Set(["partnergrid", "elogap", "hof"]);
    const leftHtml = [];
    const rightHtml = [];
    const fullHtml = [];
    sectionsHtml.forEach((sec) => {
      if (fullKeys.has(sec.key)) fullHtml.push(sec.html);
      else if (rightKeys.has(sec.key)) rightHtml.push(sec.html);
      else leftHtml.push(sec.html);
    });
    container.innerHTML = `
      ${filterPillsHtml}
      ${_analyticsSeasonControlsHtml()}
      ${_analyticsDateControlsHtml()}
      ${_hideEmptyToggle}
      <div class="ana-dashboard">
        <div class="ana-col ana-col-left">${leftHtml.join("")}</div>
        <div class="ana-col ana-col-right">${rightHtml.join("")}</div>
        <div class="ana-wide-stack">${fullHtml.join("")}</div>
      </div>
    `;
  }

  _anaRenderedVersion = _dataVersion;
  _anaRenderedFilter = _anaRenderedKey;

  // Re-apply active category filter after re-render
  anaFilterCategory(viewState.anaActiveCat, true);

  if (!collapsed.has("calendar"))
    requestAnimationFrame(() => renderMatchCalendar());

  requestAnimationFrame(() => window._renderHiLoTable?.());
  requestAnimationFrame(() => window._renderAssProjTable?.());

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
      {
        matches: state.matches,
        players: state.players,
        playerAliasMap,
        nextPlayerId,
      },
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
          (removeParents
            ? `&removeParents=${encodeURIComponent(removeParents)}`
            : "") +
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
  if (_driveBackupTimer) {
    clearTimeout(_driveBackupTimer);
    _driveBackupTimer = null;
  }
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
    document.addEventListener(
      "padel-data-ready",
      () => {
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
      },
      { once: true },
    );
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

// Expose globals
window._goToSummaryDay = function (date) {
  cmpFilter = "day";
  cmpFrom = date;
  cmpTo = null;
  const sel = document.getElementById("cmpSel");
  if (sel) sel.value = "day";
  const dp = document.getElementById("cmpDayPicker");
  if (dp) dp.classList.add("show");
  const di = document.getElementById("cmpDayInput");
  if (di) di.value = date;
  const dr = document.getElementById("cmpDr");
  if (dr) dr.classList.remove("show");
  renderCompact();
  goTo("compact");
};

window._mReportText = "";

window._showPlayerMonthReport = function (mo, playerName) {
  document.getElementById("player-month-report-modal")?.remove();
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
  const [year, monthNum] = mo.split("-");
  const moLabel = `${moN2[parseInt(monthNum)]} ${year}`;

  const allMs = activeMatches()
    .filter(
      (m) =>
        (m.date || "").startsWith(mo) &&
        [...(m.teamA || []), ...(m.teamB || [])].includes(playerName),
    )
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  if (!allMs.length) return;

  let mp = 0,
    mw = 0,
    gw = 0,
    gl = 0;
  let bestWin = null,
    bestLoss = null;
  let run = 0,
    maxWStreak = 0;
  const results = [];
  const oppRecord = {}; // key: sorted opp team string → {w, l}

  allMs.forEach((m) => {
    const inA = (m.teamA || []).includes(playerName);
    const myScore = inA ? m.scoreA : m.scoreB;
    const oppScore = inA ? m.scoreB : m.scoreA;
    const won = myScore > oppScore;
    const margin = Math.abs(myScore - oppScore);
    const partner = (inA ? m.teamA : m.teamB)
      .filter((x) => x !== playerName)
      .join(" & ");
    const oppTeam = (inA ? m.teamB : m.teamA).join(" & ");

    mp++;
    gw += myScore;
    gl += oppScore;
    if (won) {
      mw++;
      run++;
      maxWStreak = Math.max(maxWStreak, run);
      if (!bestWin || margin > bestWin.margin)
        bestWin = {
          margin,
          score: `${myScore}-${oppScore}`,
          partner,
          opp: oppTeam,
          date: m.date,
        };
    } else {
      run = 0;
      if (!bestLoss || margin > bestLoss.margin)
        bestLoss = {
          margin,
          score: `${myScore}-${oppScore}`,
          partner,
          opp: oppTeam,
          date: m.date,
        };
    }
    results.push(won ? "W" : "L");
    if (!oppRecord[oppTeam]) oppRecord[oppTeam] = { w: 0, l: 0 };
    if (won) oppRecord[oppTeam].w++;
    else oppRecord[oppTeam].l++;
  });

  const winPct = Math.round((mw / mp) * 100);
  const winCol =
    winPct >= 61 ? "var(--green)" : winPct >= 45 ? "var(--gold)" : "var(--red)";
  const oppEntries = Object.entries(oppRecord).sort(
    (a, b) => b[1].w + b[1].l - (a[1].w + a[1].l),
  );

  // ── WhatsApp text ─────────────────────────────────────────
  const lines = [];
  lines.push(`🎾 *${playerName.toUpperCase()} — ${moLabel.toUpperCase()}* 🎾`);
  lines.push("");
  lines.push(`📊 *RECORD*`);
  lines.push(`${mw}W-${mp - mw}L · ${winPct}% · ${mp} matches`);
  lines.push(
    `Games: ${gw}–${gl} (${Math.round((gw / (gw + gl)) * 100)}% game win rate)`,
  );
  lines.push("");
  if (bestWin) {
    lines.push(`🔥 *BEST WIN*`);
    lines.push(
      `${bestWin.score}${bestWin.partner ? ` with ${bestWin.partner}` : ""} vs ${bestWin.opp} (${fmtDate(bestWin.date)})`,
    );
    lines.push("");
  }
  if (bestLoss) {
    lines.push(`😬 *WORST LOSS*`);
    lines.push(
      `${bestLoss.score}${bestLoss.partner ? ` with ${bestLoss.partner}` : ""} vs ${bestLoss.opp} (${fmtDate(bestLoss.date)})`,
    );
    lines.push("");
  }
  if (maxWStreak >= 2) {
    lines.push(`📈 *BEST STREAK*`);
    lines.push(`${maxWStreak} wins in a row`);
    lines.push("");
  }
  lines.push(`🆚 *VS OPPONENTS*`);
  oppEntries.forEach(([opp, rec]) => {
    const tot = rec.w + rec.l;
    lines.push(
      `• ${opp}: ${rec.w}W-${rec.l}L (${Math.round((rec.w / tot) * 100)}%)`,
    );
  });
  lines.push("");
  lines.push(`_via EktaPadel 🏓_`);
  window._mReportText = lines.join("\n");

  // ── HTML ──────────────────────────────────────────────────
  const formHtml = results
    .slice(-15)
    .map(
      (r) =>
        `<span class="fd fd-lg ${r === "W" ? "fd-w" : "fd-l"}">${r}</span>`,
    )
    .join("");

  const oppHtml = oppEntries
    .map(([opp, rec]) => {
      const tot = rec.w + rec.l;
      const pct = Math.round((rec.w / tot) * 100);
      const col =
        pct >= 60 ? "var(--green)" : pct <= 40 ? "var(--red)" : "var(--muted)";
      return `<div class="chem-row"><div class="chem-names" style="font-size:10px">${escHtml(opp)}</div><div class="chem-wl">${rec.w}–${rec.l}</div><div class="chem-bar-wrap"><div class="chem-bar" style="width:${pct}%;background:${col}"></div></div><div class="chem-pct" style="color:${col}">${pct}%</div></div>`;
    })
    .join("");

  const card = (title, content) =>
    `<div class="ana-card" style="padding:10px 12px;margin-bottom:8px"><div style="font-size:9px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">${title}</div>${content}</div>`;

  const overviewGrid = `
    <div class="ov-grid" style="grid-template-columns:repeat(3,1fr);margin-top:4px">
      <div class="ov-cell"><div class="ov-val" style="color:${winCol}">${winPct}%</div><div class="ov-lbl">Win Rate</div></div>
      <div class="ov-cell"><div class="ov-val">${mw}W-${mp - mw}L</div><div class="ov-lbl">Record</div></div>
      <div class="ov-cell"><div class="ov-val">${mp}</div><div class="ov-lbl">Played</div></div>
      <div class="ov-cell"><div class="ov-val p">${gw}</div><div class="ov-lbl">Games Won</div></div>
      <div class="ov-cell"><div class="ov-val n">${gl}</div><div class="ov-lbl">Games Lost</div></div>
      <div class="ov-cell"><div class="ov-val ${maxWStreak >= 3 ? "p" : ""}">${maxWStreak}W</div><div class="ov-lbl">Best Streak</div></div>
    </div>`;

  const highLowHtml = [
    bestWin
      ? `<div class="chem-row"><span style="font-size:16px">🔥</span><div><div style="font-size:11px;font-weight:700">Best Win: ${bestWin.score}</div><div style="font-size:9px;color:var(--muted)">${bestWin.partner ? `with ${escHtml(bestWin.partner)} · ` : ""}vs ${escHtml(bestWin.opp)} · ${fmtDate(bestWin.date)}</div></div></div>`
      : "",
    bestLoss
      ? `<div class="chem-row"><span style="font-size:16px">😬</span><div><div style="font-size:11px;font-weight:700">Worst Loss: ${bestLoss.score}</div><div style="font-size:9px;color:var(--muted)">${bestLoss.partner ? `with ${escHtml(bestLoss.partner)} · ` : ""}vs ${escHtml(bestLoss.opp)} · ${fmtDate(bestLoss.date)}</div></div></div>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const html = `<div id="player-month-report-modal" style="position:fixed;inset:0;z-index:1000;background:var(--bg);overflow-y:auto;-webkit-overflow-scrolling:touch">
    <div style="max-width:480px;margin:0 auto;padding:16px 12px 88px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
        <button onclick="document.getElementById('player-month-report-modal').remove()" aria-label="Back" title="Back" style="background:rgba(255,255,255,0.08);border:none;color:var(--text);width:32px;height:32px;border-radius:50%;font-size:14px;cursor:pointer;flex-shrink:0">←</button>
        <div>
          <div style="font-size:16px;font-weight:900;letter-spacing:0.04em">${escHtml(playerName)}</div>
          <div style="font-size:10px;color:var(--muted)">${moLabel}</div>
        </div>
      </div>
      ${card("📊 Overview", overviewGrid)}
      ${highLowHtml ? card("🎯 Highs & Lows", highLowHtml) : ""}
      ${card("📋 Form", `<div style="display:flex;gap:4px;flex-wrap:wrap">${formHtml}</div>`)}
      ${oppHtml ? card("🆚 vs Opponents", oppHtml) : ""}
    </div>
    <div style="position:fixed;bottom:0;left:0;right:0;background:var(--surface);border-top:1px solid var(--border);padding:12px 16px;display:flex;gap:8px">
      <button id="mr-copy-btn" onclick="window._copyMonthReport()" style="flex:1;padding:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:10px;color:var(--text);font-size:12px;font-weight:700;cursor:pointer">📋 Copy Text</button>
      <button onclick="window._shareMonthWhatsApp()" style="flex:1;padding:10px;background:#25D366;border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer">📲 WhatsApp</button>
    </div>
  </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
};

window._copyMonthReport = function () {
  if (!window._mReportText) return;
  navigator.clipboard?.writeText(window._mReportText).then(() => {
    const btn = document.getElementById("mr-copy-btn");
    if (btn) {
      btn.textContent = "✓ Copied!";
      setTimeout(() => {
        btn.textContent = "📋 Copy Text";
      }, 2000);
    }
  });
};

window._shareMonthWhatsApp = function () {
  if (!window._mReportText) return;
  window.open(
    "https://wa.me/?text=" + encodeURIComponent(window._mReportText),
    "_blank",
  );
};

window._showMonthReport = function (mo) {
  document.getElementById("month-report-modal")?.remove();
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
  const [year, monthNum] = mo.split("-");
  const moLabel = `${moN2[parseInt(monthNum)]} ${year}`;

  const allMs = activeMatches()
    .filter((m) => (m.date || "").startsWith(mo))
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  if (!allMs.length) return;

  // Rating computed over just this month's matches, following the active
  // scoring picker — POTM and the standings leaderboard rank by rating,
  // not win%.
  const _moAss = _statsRatingMap(allMs);
  const _moDefault = _statsDefault();
  const _moLbl = _statsLabel();

  // ── Per-player accumulation ──────────────────────────────
  const P = {};
  const mkp = (n) =>
    (P[n] = P[n] || {
      mp: 0,
      mw: 0,
      gw: 0,
      gl: 0,
      bestWin: null,
      bestLoss: null,
      results: [],
    });

  const byDate = {};
  let closestM = null,
    bigWinM = null;
  let fireCount = 0,
    shutouts = 0;

  allMs.forEach((m) => {
    const aWon = m.scoreA > m.scoreB;
    const margin = Math.abs(m.scoreA - m.scoreB);
    if (m.date) byDate[m.date] = (byDate[m.date] || 0) + 1;
    if (!closestM || margin < Math.abs(closestM.scoreA - closestM.scoreB))
      closestM = m;
    if (!bigWinM || margin > Math.abs(bigWinM.scoreA - bigWinM.scoreB))
      bigWinM = m;
    if (m.scoreA === 0 || m.scoreB === 0) shutouts++;
    if (isFireMatch(m)) fireCount++;

    [
      [m.teamA, m.teamB, aWon],
      [m.teamB, m.teamA, !aWon],
    ].forEach(([mine, theirs, won]) => {
      mine.forEach((p) => {
        const ps = mkp(p);
        ps.mp++;
        ps.gw += won
          ? Math.max(m.scoreA, m.scoreB)
          : Math.min(m.scoreA, m.scoreB);
        ps.gl += won
          ? Math.min(m.scoreA, m.scoreB)
          : Math.max(m.scoreA, m.scoreB);
        if (won) {
          ps.mw++;
          if (!ps.bestWin || margin > ps.bestWin.margin) {
            ps.bestWin = {
              margin,
              label: `${Math.max(m.scoreA, m.scoreB)}-${Math.min(m.scoreA, m.scoreB)}`,
              partner: mine.filter((x) => x !== p).join(" & "),
              opp: theirs.join(" & "),
              date: m.date,
            };
          }
        } else {
          if (!ps.bestLoss || margin > ps.bestLoss.margin) {
            ps.bestLoss = {
              margin,
              label: `${Math.min(m.scoreA, m.scoreB)}-${Math.max(m.scoreA, m.scoreB)}`,
              partner: mine.filter((x) => x !== p).join(" & "),
              opp: theirs.join(" & "),
              date: m.date,
            };
          }
        }
        ps.results.push(won ? "W" : "L");
      });
    });
  });

  // Max win streak per player this month
  Object.values(P).forEach((ps) => {
    let run = 0,
      max = 0;
    ps.results.forEach((r) => {
      if (r === "W") {
        run++;
        max = Math.max(max, run);
      } else run = 0;
    });
    ps.maxWStreak = max;
  });

  const standings = Object.entries(P)
    .map(([name, ps]) => ({
      name,
      ...ps,
      winPct: Math.round((ps.mw / ps.mp) * 100),
      ass: _moAss[name] ?? _moDefault,
    }))
    .sort((a, b) => b.ass - a.ass || b.mp - a.mp);

  const potm = standings.find((p) => p.mp >= 2) || standings[0];
  const medals = ["🥇", "🥈", "🥉"];
  const [topDay, topDayCount] =
    Object.entries(byDate).sort((a, b) => b[1] - a[1])[0] || [];
  const streaker = [...standings].sort(
    (a, b) => b.maxWStreak - a.maxWStreak,
  )[0];
  const bottom = [...standings].sort(
    (a, b) => a.winPct - b.winPct || a.mp - b.mp,
  );
  const nailCount = allMs.filter(
    (m) => Math.abs(m.scoreA - m.scoreB) === 1,
  ).length;

  // ── WhatsApp text ────────────────────────────────────────
  const lines = [];
  lines.push(`🎾 *PADEL MONTHLY REPORT — ${moLabel.toUpperCase()}* 🎾`);
  lines.push("");
  if (potm) {
    lines.push(`🏆 *PLAYER OF THE MONTH*`);
    lines.push(
      `${potm.name} — ${_statsFmt(potm.ass)} ${_moLbl} (${potm.mw}W-${potm.mp - potm.mw}L)`,
    );
    lines.push("");
  }
  lines.push(`📊 *STANDINGS*`);
  standings.forEach((p, i) => {
    lines.push(
      `${medals[i] || `${i + 1}.`} ${p.name} — ${_statsFmt(p.ass)} ${_moLbl} (${p.mw}W-${p.mp - p.mw}L)`,
    );
  });
  lines.push("");
  lines.push(`🔥 *HIGHLIGHTS*`);
  if (bigWinM) {
    const bw = bigWinM.scoreA > bigWinM.scoreB;
    const wT = (bw ? bigWinM.teamA : bigWinM.teamB).join(" & ");
    const lT = (bw ? bigWinM.teamB : bigWinM.teamA).join(" & ");
    lines.push(
      `• Biggest result: ${wT} ${Math.max(bigWinM.scoreA, bigWinM.scoreB)}-${Math.min(bigWinM.scoreA, bigWinM.scoreB)} vs ${lT} (${fmtDate(bigWinM.date)})`,
    );
  }
  if (streaker && streaker.maxWStreak >= 3) {
    lines.push(
      `• ${streaker.name} went on a ${streaker.maxWStreak}-match winning streak`,
    );
  }
  if (shutouts > 0) lines.push(`• ${shutouts} shutout result(s) (4-0)`);
  if (fireCount > 0) lines.push(`• ${fireCount} 🔥 fire match(es) played`);
  lines.push("");
  lines.push(`📉 *TOUGH MONTH*`);
  if (bottom[0] && bottom[0].winPct < 40) {
    lines.push(
      `• ${bottom[0].name} — ${bottom[0].mw}W-${bottom[0].mp - bottom[0].mw}L (${bottom[0].winPct}%)`,
    );
    if (
      bottom[1] &&
      bottom[1].winPct < 40 &&
      bottom[1].name !== bottom[0].name
    ) {
      lines.push(
        `• ${bottom[1].name} — ${bottom[1].mw}W-${bottom[1].mp - bottom[1].mw}L (${bottom[1].winPct}%)`,
      );
    }
  } else {
    lines.push(`• Everyone held their own this month! 💪`);
  }
  lines.push("");
  lines.push(`🎯 *BY THE NUMBERS*`);
  lines.push(`• Matches played: ${allMs.length}`);
  lines.push(`• Active days: ${Object.keys(byDate).length}`);
  lines.push(`• Players: ${standings.length}`);
  if (topDay)
    lines.push(`• Busiest day: ${fmtDate(topDay)} (${topDayCount} matches)`);
  if (nailCount > 0) lines.push(`• Nail-biters (±1 margin): ${nailCount} 💓`);
  lines.push(`_via EktaPadel 🏓_`);
  window._mReportText = lines.join("\n");

  // ── HTML helpers ─────────────────────────────────────────
  const card = (title, content) =>
    `<div class="ana-card" style="padding:10px 12px;margin-bottom:8px"><div style="font-size:9px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">${title}</div>${content}</div>`;

  // Standings — styled like the Summary tab leaderboard (medal-tinted rows,
  // bold uppercase names, accent rating badge). Same data as before: rank,
  // name, ELO, W-L, win%, ASS — just restyled to match the app's leaderboard look.
  const _medalBg = [
    "linear-gradient(90deg, rgba(255,190,0,0.16), rgba(255,190,0,0.02))",
    "linear-gradient(90deg, rgba(0,220,255,0.10), rgba(0,220,255,0.02))",
    "linear-gradient(90deg, rgba(180,90,255,0.10), rgba(180,90,255,0.02))",
  ];
  const _medalBorder = [
    "rgba(255,190,0,0.4)",
    "rgba(0,220,255,0.35)",
    "rgba(180,90,255,0.35)",
  ];
  const standHtml = standings
    .map((p, i) => {
      const isTop3 = i < 3;
      const rowBg = isTop3
        ? _medalBg[i]
        : i % 2 === 1
          ? "rgba(255,255,255,0.025)"
          : "transparent";
      const rankHtml = medals[i]
        ? `<span style="font-size:17px">${medals[i]}</span>`
        : `<span style="font-size:15px;font-weight:800;color:rgba(255,255,255,0.4)">${i + 1}</span>`;
      const wl = p.mw - (p.mp - p.mw);
      const wlColor =
        wl > 0 ? "var(--green)" : wl < 0 ? "var(--red)" : "var(--muted)";
      const isLast = i === standings.length - 1;
      return `<div style="display:flex;align-items:center;gap:10px;margin:0 -12px;padding:9px 12px;background:${rowBg};border-left:3px solid ${isTop3 ? _medalBorder[i] : "transparent"};border-bottom:${isLast ? "none" : "1px solid rgba(255,255,255,0.05)"};${isLast ? "border-radius:0 0 14px 14px" : ""};cursor:pointer" onclick="window._showPlayerMonthReport(${jsArg(mo)},${jsArg(p.name)})">
      <div style="width:24px;text-align:center;flex-shrink:0">${rankHtml}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:800;letter-spacing:0.01em;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(p.name.toUpperCase())}</div>
        <div style="font-size:9px;color:var(--muted);margin-top:2px;white-space:nowrap">⚡ ${_statsFmt(p.ass)} ${escHtml(_moLbl)}&nbsp;&nbsp;·&nbsp;&nbsp;<span style="color:${wlColor}">${p.mw}W–${p.mp - p.mw}L</span>&nbsp;&nbsp;·&nbsp;&nbsp;${p.winPct}%</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:16px;font-weight:900;color:var(--theme)">${p.ass}</div>
        <div style="font-size:7px;font-weight:700;letter-spacing:0.1em;color:var(--muted)">ASS</div>
      </div>
      <div style="font-size:11px;color:var(--muted);flex-shrink:0">›</div>
    </div>`;
    })
    .join("");

  // Highlights
  const highRows = [];
  if (potm)
    highRows.push(
      `<div class="chem-row"><span style="font-size:16px">🏆</span><div><div style="font-size:11px;font-weight:700">${escHtml(potm.name)} — POTM</div><div style="font-size:9px;color:var(--muted)">${_statsFmt(potm.ass)} ${escHtml(_moLbl)} · ${potm.mw}W-${potm.mp - potm.mw}L in ${potm.mp} games</div></div></div>`,
    );
  if (bigWinM) {
    const bw = bigWinM.scoreA > bigWinM.scoreB;
    const wT = (bw ? bigWinM.teamA : bigWinM.teamB).join(" & ");
    highRows.push(
      `<div class="chem-row"><span style="font-size:16px">💥</span><div><div style="font-size:11px;font-weight:700">Biggest Result: ${Math.max(bigWinM.scoreA, bigWinM.scoreB)}-${Math.min(bigWinM.scoreA, bigWinM.scoreB)}</div><div style="font-size:9px;color:var(--muted)">${escHtml(wT)} · ${fmtDate(bigWinM.date)}</div></div></div>`,
    );
  }
  if (streaker && streaker.maxWStreak >= 3)
    highRows.push(
      `<div class="chem-row"><span style="font-size:16px">🔥</span><div><div style="font-size:11px;font-weight:700">${escHtml(streaker.name)}: ${streaker.maxWStreak}-match streak</div><div style="font-size:9px;color:var(--muted)">Best winning run of the month</div></div></div>`,
    );
  if (shutouts > 0)
    highRows.push(
      `<div class="chem-row"><span style="font-size:16px">💀</span><div><div style="font-size:11px;font-weight:700">${shutouts} Shutout result(s)</div><div style="font-size:9px;color:var(--muted)">Games ending 4-0</div></div></div>`,
    );
  if (fireCount > 0)
    highRows.push(
      `<div class="chem-row"><span style="font-size:16px">🔥</span><div><div style="font-size:11px;font-weight:700">${fireCount} Fire Match(es)</div><div style="font-size:9px;color:var(--muted)">High-intensity, closely fought games</div></div></div>`,
    );

  // Lows
  const lowRows = [];
  bottom.slice(0, 2).forEach((p) => {
    if (p.winPct < 45)
      lowRows.push(
        `<div class="chem-row"><span style="font-size:16px">📉</span><div><div style="font-size:11px;font-weight:700">${escHtml(p.name)}: ${p.winPct}%</div><div style="font-size:9px;color:var(--muted)">${p.mw}W-${p.mp - p.mw}L · ${p.mp} matches</div></div></div>`,
      );
  });
  const worstLossP = standings
    .filter((p) => p.bestLoss)
    .sort((a, b) => b.bestLoss.margin - a.bestLoss.margin)[0];
  if (worstLossP?.bestLoss)
    lowRows.push(
      `<div class="chem-row"><span style="font-size:16px">😬</span><div><div style="font-size:11px;font-weight:700">${escHtml(worstLossP.name)}: Lost ${worstLossP.bestLoss.label}</div><div style="font-size:9px;color:var(--muted)">vs ${escHtml(worstLossP.bestLoss.opp)} · ${fmtDate(worstLossP.bestLoss.date)}</div></div></div>`,
    );
  if (!lowRows.length)
    lowRows.push(
      `<div style="font-size:11px;color:var(--muted);text-align:center;padding:8px 0">Everyone held their own! 💪</div>`,
    );

  // Numbers
  const numRows = [
    `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span style="font-size:11px;color:var(--muted)">Total matches</span><span style="font-size:11px;font-weight:700">${allMs.length}</span></div>`,
    `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span style="font-size:11px;color:var(--muted)">Playing days</span><span style="font-size:11px;font-weight:700">${Object.keys(byDate).length}</span></div>`,
    `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span style="font-size:11px;color:var(--muted)">Players active</span><span style="font-size:11px;font-weight:700">${standings.length}</span></div>`,
  ];
  if (topDay)
    numRows.push(
      `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span style="font-size:11px;color:var(--muted)">Busiest day</span><span style="font-size:11px;font-weight:700">${fmtDate(topDay)} (${topDayCount})</span></div>`,
    );
  if (nailCount > 0)
    numRows.push(
      `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span style="font-size:11px;color:var(--muted)">Nail-biters (±1)</span><span style="font-size:11px;font-weight:700">${nailCount} 💓</span></div>`,
    );
  if (fireCount > 0)
    numRows.push(
      `<div style="display:flex;justify-content:space-between;padding:4px 0"><span style="font-size:11px;color:var(--muted)">🔥 Fire matches</span><span style="font-size:11px;font-weight:700">${fireCount}</span></div>`,
    );

  const html = `<div id="month-report-modal" style="position:fixed;inset:0;z-index:999;background:var(--bg);overflow-y:auto;-webkit-overflow-scrolling:touch">
    <div style="max-width:480px;margin:0 auto;padding:16px 12px 88px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="font-size:16px;font-weight:900;letter-spacing:0.04em">📊 ${moLabel.toUpperCase()}</div>
        <button onclick="document.getElementById('month-report-modal').remove()" aria-label="Close" title="Close" style="background:rgba(255,255,255,0.08);border:none;color:var(--text);width:32px;height:32px;border-radius:50%;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
      </div>
      ${card("📊 Standings", standHtml)}
      ${highRows.length ? card("🔥 Highlights", highRows.join("")) : ""}
      ${card("📉 Lows", lowRows.join(""))}
      ${card("🎯 By the Numbers", numRows.join(""))}
    </div>
    <div style="position:fixed;bottom:0;left:0;right:0;background:var(--surface);border-top:1px solid var(--border);padding:12px 16px;display:flex;gap:8px">
      <button id="mr-copy-btn" onclick="window._copyMonthReport()" style="flex:1;padding:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:10px;color:var(--text);font-size:12px;font-weight:700;cursor:pointer">📋 Copy Text</button>
      <button onclick="window._shareMonthWhatsApp()" style="flex:1;padding:10px;background:#25D366;border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer">📲 WhatsApp</button>
    </div>
  </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
};

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
  setRankDeltaWindow,
  setAnimLevel,
  adjustFontScale,
  resetFontScale,
  toggleSmoothMode,
  toggleBatterySaver,
  toggleMatchNotifications,
  toggleAnaHideEmpty,
  openSeasonSheet,
  closeSeasonSheet,
  setSeason,
  setSeasonAuto,
  openSeasonEditor,
  closeSeasonEditor,
  saveSeasonFromEditor,
  deleteSeasonFromEditor,
  archiveSeason,
  viewSeasonArchive,
  dismissSeasonRollover,
  setRiserFallerFrom,
  setRiserFallerTo,
  openSeasonAwardsReveal,
  seasonRevealNext,
  seasonRevealPrev,
  closeSeasonReveal,
  openPersonalSeasonRecap,
  toggleOfflineMode,
  renderHome,
  renderCompact,
  toggleMatchDeltaWindow,
  toggleTopGainersWindow,
  setCmpSort,
  _anaSetDateFilter,
  _anaSetDateRange,
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
  computeBadges,
  openPlayerDetail,
  openPlayerDetailCompare,
  openPairDetail,
  sortPairsBy,
  openH2HDetail,
  onHomeFilterChange,
  prefillMatchTADate,
  renderH2HDeepDive,
  selectEloTLPlayer,
  filterEloTimeline,
  showEloMatchDetail,
  _togglePairForm,
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
  _showAllPairs,
  openSessionHighlights,
  renderDigestCard,
  openDigestPlayerSheet,
  openCmpSheet,
  _cmpSetDate,
  _cmpSetWindow,
  _cmpCountPickerOpen,
  _cmpCountPickerClose,
  _cmpCountStep,
  _cmpCountApply,
  openSeasonScoringPicker,
  closeSeasonScoringPicker,
  _setSeasonScoringMode,
  _setScoringSystem,
  openScoringInfoSheet,
  closeScoringInfoSheet,
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

  openThemePicker,
  closeThemePicker,
  pickTheme,
  fireConfetti,
  streakCalDayClick,
  _h2hSetSort,
  _eloTLSetOverlay,
  _showShutoutMatches,
  openEloTLOverlaySheet,
  openMatchIntro,
  closeMatchIntro,
  mioSkipAnimation,
  showUndoToast,
  computeH2HStreak,
  openLiveMode,
  openLivePlayerSheet,
  selectLivePlayer,
  closeLivePlayerSheet,
  liveAdjustScore,
  setLiveRaceTo,
  dismissRacePrompt,
  endLiveMatch,
  _commitSaveMatch,
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
  openPlayerPickerSheet,
  closePlayerPickerSheet,
  openAddPlayerSheet,
  closeAddPlayerSheet,
  addPlayerToSession,
  openRemovePlayerSheet,
  closeRemovePlayerSheet,
  removePlayerFromSession,
  toggleSessionPanel,
  suggestNextMatch,
  undoSessionMatch,
  redoSessionMatch,
  deleteSessionMatch,
  editSessionMatch,
  saveSessionMatchEdit,
  moveSessionMatch,
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
  _openPairDetail,
  _closePairDetail,
  _renderPairDetailSummary,
  _renderPairDetailBreakdown,
  _renderPairDetailBreakdownEl,
  _renderPairDetailSummaryEl,
  _renderOpposedPartnerBreakdownEl,
  _eloGapSetPeriod,
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
  _updateLiveDisplay();
  _updateLiveWinProb();
  _updateLiveEloPreview();
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
    const eloEl = document.getElementById(`live-elo-${slot}`);
    if (eloEl) {
      const score = _statsFmt(_statsRatingMap(activeMatches())[p] ?? _statsDefault());
      eloEl.textContent = `${_statsLabel()} ${score}`;
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
  const players = (sessionPlayers || getAllPlayerNamesFromMatches())
    .slice()
    .sort((a, b) => a.localeCompare(b));
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
  document
    .getElementById("live-race-4")
    ?.classList.toggle("live-race-pill-active", _liveRaceTo === 4);
  document
    .getElementById("live-race-6")
    ?.classList.toggle("live-race-pill-active", _liveRaceTo === 6);
}

function _showRaceReachedPrompt() {
  const overlay = document.getElementById("live-race-overlay");
  if (!overlay) return;
  const title = document.getElementById("live-race-modal-title");
  if (title) title.textContent = `RACE TO ${_liveRaceTo} REACHED`;
  const matchup = document.getElementById("live-race-modal-matchup");
  if (matchup) {
    const { a1, a2, b1, b2 } = _liveSlots;
    const aWon = _liveScoreA > _liveScoreB;
    const na1 = normPlayer(a1) || "?",
      na2 = normPlayer(a2) || "?";
    const nb1 = normPlayer(b1) || "?",
      nb2 = normPlayer(b2) || "?";
    const winTeam = aWon ? `${na1} & ${na2}` : `${nb1} & ${nb2}`;
    const loseTeam = aWon ? `${nb1} & ${nb2}` : `${na1} & ${na2}`;
    const winScore = aWon ? _liveScoreA : _liveScoreB;
    const loseScore = aWon ? _liveScoreB : _liveScoreA;
    matchup.innerHTML = `
      <div class="msr-matchup">
        <div class="msr-side msr-win">
          <div class="msr-side-label">🏆 WINNER</div>
          <div class="msr-side-name">${escHtml(winTeam)}</div>
          <div class="msr-side-score msr-score-win">${winScore}</div>
        </div>
        <div class="msr-divider">–</div>
        <div class="msr-side msr-lose">
          <div class="msr-side-label">LOST</div>
          <div class="msr-side-name">${escHtml(loseTeam)}</div>
          <div class="msr-side-score msr-score-lose">${loseScore}</div>
        </div>
      </div>`;
  }
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
  const baseProb = _statsWinProb([a1, a2], [b1, b2]);
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
    lblA.textContent = (normPlayer(a1) + " & " + normPlayer(a2)).toUpperCase();
  if (lblB)
    lblB.textContent = (normPlayer(b1) + " & " + normPlayer(b2)).toUpperCase();
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
  // Runs a hypothetical 4-2 match through the ACTUAL active engine (not a
  // generic K=32 heuristic), appended onto real history so maturity/partner
  // effects are correctly in play. Mirrored 2-4 gives the "if you lose"
  // side. This is what genuinely happens when the match is saved, for
  // whichever system is selected — not an approximation of it.
  const base = activeMatches();
  const previewDeltas = (scoreA, scoreB) => {
    const synth = { date: todayISO(), teamA: [a1, a2], teamB: [b1, b2], scoreA, scoreB };
    const withSynth = [...base, synth];
    const d = _matchDeltasForSystem(_scoringSystem, withSynth).get(synth);
    return d ? d.playerDeltas : {};
  };
  const winDeltas = previewDeltas(4, 2);
  const loseDeltas = previewDeltas(2, 4);
  const teamAvg = (deltas, players) => {
    const vals = players.map((p) => deltas[p]).filter((v) => v != null);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  };
  el.style.display = "";
  const set = (id, val) => {
    const e = document.getElementById(id);
    if (e) e.textContent = val;
  };
  const fmt = (v) => (v == null ? "—" : `${v > 0 ? "+" : ""}${_statsFmt(v)}`);
  set("lep-win-a", fmt(teamAvg(winDeltas, [a1, a2])));
  set("lep-lose-a", fmt(teamAvg(loseDeltas, [a1, a2])));
  set("lep-win-b", fmt(teamAvg(winDeltas, [b1, b2])));
  set("lep-lose-b", fmt(teamAvg(loseDeltas, [b1, b2])));
}

function endLiveMatch() {
  dismissRacePrompt();
  const { a1, a2, b1, b2 } = _liveSlots;
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
  // Show confirmation popup — actual save happens in confirmSaveMatch()
  openMatchSaveSheet();
}

function _commitSaveMatch() {
  const { a1, a2, b1, b2 } = _liveSlots;
  const date = todayISO();
  const match = {
    id: _genMatchId(),
    teamA: [a1, a2],
    teamB: [b1, b2],
    scoreA: _liveScoreA,
    scoreB: _liveScoreB,
    date,
  };
  state.matches.push(match);
  mirrorMatchToEditor(match);
  const eventMsg = `${a1} & ${a2} ${_liveScoreA}–${_liveScoreB} ${b1} & ${b2}`;
  if (_liveSessionData?.sessionActive) {
    _sessionMatchHistory.push({
      id: match.id,
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
    _invalidateStatsMemo();
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
  // Reset for next match
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
    return (
      cs.display !== "none" &&
      cs.visibility !== "hidden" &&
      el.offsetParent !== null
    );
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
        if (_tc) {
          _tReset(_tc);
          _tc = null;
        }
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
        (p) => `<span class="sittingout-chip">${escHtml(normPlayer(p))}</span>`,
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
  // Session standings follow ASS, computed over just this session's matches
  // so the points start fresh at 1000.
  const _sessScoreMap = computeASS(_sessionMatchHistory);
  const _sessScoreLbl = "ASS";
  const _sessScore = (n) => Math.round(_sessScoreMap[n] ?? 1000);
  const sorted = Object.entries(stats).sort((a, b) => {
    const sd = _sessScore(b[0]) - _sessScore(a[0]);
    if (sd !== 0) return sd;
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
          .map(([n]) => normPlayer(n))
          .join(", ")} played ${maxM - minM} more than others</div>`
      : "";
  const rows = sorted
    .map(([name, s]) => {
      const pct = s.m ? Math.round((s.w / s.m) * 100) : 0;
      const sc = _sessScore(name);
      const scCol =
        sc > 1000 ? "var(--green)" : sc < 1000 ? "var(--red)" : "var(--muted)";
      return `<div class="sess-ldr-row">
      <div class="sess-ldr-name">${escHtml(normPlayer(name))}</div>
      <div class="sess-ldr-stats">${s.w}W ${s.l}L</div>
      <div class="sess-ldr-barwrap"><div class="sess-ldr-bar" style="width:${pct}%"></div></div>
      <div class="sess-ldr-score" style="color:${scCol}">${sc}<span class="sess-ldr-score-lbl">${_sessScoreLbl}</span></div>
      <div class="sess-ldr-count">×${s.m}</div>
    </div>`;
    })
    .join("");
  // Match log — show match numbers, with admin edit/delete/reorder controls
  const total = _sessionMatchHistory.length;
  const histRows = _sessionMatchHistory
    .map((mt, i) => {
      const aWon = mt.scoreA > mt.scoreB;
      const tA = mt.teamA.map(normPlayer).join(" & ");
      const tB = mt.teamB.map(normPlayer).join(" & ");
      const isLast = i === total - 1;
      const adminBtns = window.isAdmin
        ? `<div class="sess-hist-actions">
            <button class="sess-hist-move-btn" onclick="moveSessionMatch(${i},-1)" ${i === 0 ? "disabled" : ""} aria-label="Move match up" title="Move up">↑</button>
            <button class="sess-hist-move-btn" onclick="moveSessionMatch(${i},1)" ${i === total - 1 ? "disabled" : ""} aria-label="Move match down" title="Move down">↓</button>
            <button class="sess-hist-edit-btn" onclick="editSessionMatch(${i})" aria-label="Edit match" title="Edit match">✏</button>
            <button class="sess-hist-del-btn" onclick="deleteSessionMatch(${i})" aria-label="Delete match" title="Delete match">🗑</button>
           </div>`
        : "";
      return `<div class="sess-hist-row${isLast ? " sess-hist-last" : ""}">
      <span class="sess-hist-num">#${i + 1}</span>
      <span class="sess-hist-teams">${escHtml(tA)} <span class="sess-hist-score ${aWon ? "p" : "n"}">${mt.scoreA}–${mt.scoreB}</span> ${escHtml(tB)}</span>
      ${isLast ? `<button class="sess-hist-undo-btn" onclick="undoSessionMatch()" aria-label="Undo last match" title="Undo last match">↶</button>` : ""}
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

window.toggleSdashGuests = function () {
  _sdashShowGuests = !_sdashShowGuests;
  const btn = document.getElementById("sdash-guest-toggle");
  if (btn) btn.classList.toggle("live-sess-act-active", _sdashShowGuests);
  _renderLiveSessionDashboard();
};

window._sessSortBy = function (col) {
  if (_sessSortCol === col) {
    _sessSortDir = _sessSortDir === "desc" ? "asc" : "desc";
  } else {
    _sessSortCol = col;
    _sessSortDir = "desc";
  }
  _renderLiveSessionDashboard();
};

// ── AUTO-ROTATION — SUGGEST NEXT MATCH ──────────────────────
function _mkEloTeams(pick4, eloMap, alt) {
  const def = _statsDefault();
  const s = [...pick4].sort(
    (a, b) => (eloMap[b] ?? def) - (eloMap[a] ?? def),
  );
  const teamA = alt ? [s[0], s[2]] : [s[0], s[3]];
  const teamB = alt ? [s[1], s[3]] : [s[1], s[2]];
  const avgA = ((eloMap[teamA[0]] ?? def) + (eloMap[teamA[1]] ?? def)) / 2;
  const avgB = ((eloMap[teamB[0]] ?? def) + (eloMap[teamB[1]] ?? def)) / 2;
  return { teamA, teamB, avgA, avgB };
}

function suggestNextMatch() {
  const sessionPlayers = _liveSessionData?.sessionPlayers || [];
  if (sessionPlayers.length < 4) {
    showToast("Need 4+ players in session", "❌");
    return;
  }
  const scoreMap = _statsRatingMap(activeMatches());
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
    _mkEloTeams(pick4, scoreMap, false), // snake: best+worst vs 2nd+3rd
    sorted.length >= 8
      ? _mkEloTeams(sorted.slice(4, 8), scoreMap, false) // next 4 players
      : _mkEloTeams(pick4, scoreMap, true), // alt pairing of same 4
  ];
  _showSuggestSheet(suggestions);
}

function _showSuggestSheet(suggestions) {
  const sheet = document.getElementById("suggest-sheet");
  const body = document.getElementById("suggest-sheet-body");
  if (!sheet || !body) return;
  const scoreLbl = _scoringLabel(); // "ELO" or "ASS"
  const baseMatches = activeMatches();
  body.innerHTML = suggestions
    .map((s, i) => {
      const expA = _statsWinProb(s.teamA, s.teamB);
      const probA = Math.round(expA * 100);
      const probB = 100 - probA;
      const synthWin = {
        date: todayISO(),
        teamA: s.teamA,
        teamB: s.teamB,
        scoreA: 4,
        scoreB: 2,
      };
      const synthLose = {
        date: todayISO(),
        teamA: s.teamA,
        teamB: s.teamB,
        scoreA: 2,
        scoreB: 4,
      };
      const winDeltas =
        _matchDeltasForSystem(_scoringSystem, [...baseMatches, synthWin]).get(
          synthWin,
        )?.playerDeltas || {};
      const loseDeltas =
        _matchDeltasForSystem(_scoringSystem, [...baseMatches, synthLose]).get(
          synthLose,
        )?.playerDeltas || {};
      const teamAvg = (deltas, players) => {
        const vals = players
          .map((p) => deltas[p])
          .filter((v) => Number.isFinite(v));
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      };
      const dAwin = teamAvg(winDeltas, s.teamA);
      const dAlose = teamAvg(loseDeltas, s.teamA);
      const dBwin = teamAvg(loseDeltas, s.teamB);
      const dBlose = teamAvg(winDeltas, s.teamB);
      const favA = probA >= probB;
      return `<div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:12px;margin-bottom:10px">
      <div style="font-size:9px;font-weight:800;letter-spacing:0.1em;color:var(--muted);margin-bottom:8px">GAME ${i + 1}</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <div style="flex:1;text-align:center">
          <div style="font-size:13px;font-weight:800">${escHtml(s.teamA[0])}</div>
          <div style="font-size:11px;color:var(--muted)">${escHtml(s.teamA[1])}</div>
          <div style="font-size:8px;color:var(--accent);margin-top:3px">${_statsFmt(s.avgA)} ${scoreLbl} avg</div>
        </div>
        <div style="font-size:13px;font-weight:900;color:var(--muted)">VS</div>
        <div style="flex:1;text-align:center">
          <div style="font-size:13px;font-weight:800">${escHtml(s.teamB[0])}</div>
          <div style="font-size:11px;color:var(--muted)">${escHtml(s.teamB[1])}</div>
          <div style="font-size:8px;color:var(--accent);margin-top:3px">${_statsFmt(s.avgB)} ${scoreLbl} avg</div>
        </div>
      </div>
      <div style="margin-bottom:8px">
        <div style="display:flex;font-size:9px;font-weight:900;border-radius:5px;overflow:hidden;letter-spacing:0.04em">
          <div style="flex:${probA};background:var(--live-red,#c0392b);padding:4px 6px;color:#fff;text-align:center">${probA}%${favA ? " ★" : ""}</div>
          <div style="flex:${probB};background:var(--live-blue,#2980b9);padding:4px 6px;color:#fff;text-align:center">${favA ? "" : "★ "}${probB}%</div>
        </div>
        <div style="display:flex;font-size:7px;color:var(--muted);margin-top:2px;justify-content:space-between;padding:0 2px">
          <span>WIN CHANCE</span><span>WIN CHANCE</span>
        </div>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:10px">
        <div style="flex:1;background:rgba(255,255,255,0.04);border-radius:6px;padding:6px 8px">
          <div style="font-size:7px;font-weight:800;letter-spacing:0.06em;color:var(--muted);margin-bottom:3px">${scoreLbl} IF WIN / LOSE</div>
          <div style="font-size:11px;font-weight:800">
            <span style="color:var(--green)">+${_statsFmt(dAwin)}</span>
            <span style="color:var(--muted);font-weight:400"> / </span>
            <span style="color:var(--red)">${dAlose < 0 ? "-" : ""}${_statsFmt(Math.abs(dAlose))}</span>
          </div>
          <div style="font-size:7px;color:var(--muted);margin-top:2px">${escHtml(normPlayer(s.teamA[0]))} & ${escHtml(normPlayer(s.teamA[1]))}</div>
        </div>
        <div style="flex:1;background:rgba(255,255,255,0.04);border-radius:6px;padding:6px 8px">
          <div style="font-size:7px;font-weight:800;letter-spacing:0.06em;color:var(--muted);margin-bottom:3px">${scoreLbl} IF WIN / LOSE</div>
          <div style="font-size:11px;font-weight:800">
            <span style="color:var(--green)">+${_statsFmt(dBwin)}</span>
            <span style="color:var(--muted);font-weight:400"> / </span>
            <span style="color:var(--red)">${dBlose < 0 ? "-" : ""}${_statsFmt(Math.abs(dBlose))}</span>
          </div>
          <div style="font-size:7px;color:var(--muted);margin-top:2px">${escHtml(normPlayer(s.teamB[0]))} & ${escHtml(normPlayer(s.teamB[1]))}</div>
        </div>
      </div>
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
  const idx = state.matches.findIndex((m) => m.id === last.id);
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
  _syncLiveSessionBar();
  if (_sessionPanelOpen) _updateSessionPanel();
  _renderSittingOut();
  _checkRematchWarning();
  document
    .getElementById("live-undo-match-btn")
    ?.style.setProperty(
      "display",
      _sessionMatchHistory.length > 0 ? "" : "none",
    );
  document
    .getElementById("live-redo-match-btn")
    ?.style.setProperty("display", _sessionRedoStack.length > 0 ? "" : "none");
  _invalidateStatsMemo();
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
  const stateIdx = state.matches.findIndex((m) => m.id === mt.id);
  if (stateIdx !== -1) state.matches.splice(stateIdx, 1);
  _sessionMatchHistory.splice(histIdx, 1);
  if (_sessionPendingCount > 0) _sessionPendingCount--;
  _invalidateStatsMemo();
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
  const stateIdx = state.matches.findIndex((m) => m.id === mt.id);
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
        <button class="mei-close" onclick="closeMatchEdit()" aria-label="Close" title="Close">✕</button>
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
  const show = (msg) => {
    errEl.textContent = msg;
    errEl.style.display = "block";
  };
  if (!a1 || !b1) return show("Select at least P1 for each team.");
  if (isNaN(sa) || isNaN(sb)) return show("Enter valid scores.");
  if (sa === sb) return show("Scores cannot be equal.");
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
  // Sync the session history entry
  const hist = _sessionMatchHistory[histIdx];
  if (hist) {
    hist.date = m.date;
    hist.teamA = [...teamA];
    hist.teamB = [...teamB];
    hist.scoreA = sa;
    hist.scoreB = sb;
    if (note) hist.note = note;
    else delete hist.note;
  }
  _invalidateStatsMemo();
  _saveSessionState();
  saveCloudData();
  closeMatchEdit();
  commit();
  if (_sessionPanelOpen) _updateSessionPanel();
}

// ── REORDER A SESSION MATCH (admin) ─────────────────────────
// direction: -1 = move earlier (up), +1 = move later (down)
function moveSessionMatch(histIdx, direction) {
  const targetIdx = histIdx + direction;
  if (targetIdx < 0 || targetIdx >= _sessionMatchHistory.length) return;

  // Swap in history
  const tmp = _sessionMatchHistory[histIdx];
  _sessionMatchHistory[histIdx] = _sessionMatchHistory[targetIdx];
  _sessionMatchHistory[targetIdx] = tmp;

  // Mirror the swap in state.matches (session matches only)
  const idA = _sessionMatchHistory[histIdx].id;
  const idB = _sessionMatchHistory[targetIdx].id;
  const idxA = state.matches.findIndex((m) => m.id === idA);
  const idxB = state.matches.findIndex((m) => m.id === idB);
  if (idxA !== -1 && idxB !== -1) {
    const tmpM = state.matches[idxA];
    state.matches[idxA] = state.matches[idxB];
    state.matches[idxB] = tmpM;
  }

  // ELO depends on match order — invalidate and re-commit
  _invalidateStatsMemo();
  _saveSessionState();
  saveCloudData();
  commit();
  if (_sessionPanelOpen) _updateSessionPanel();
  _renderLiveSessionDashboard();
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
  _invalidateStatsMemo();
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
  const _smTotal = _sessionMatchHistory.length;
  const matchesHtml =
    _smTotal === 0
      ? '<div style="font-size:11px;color:var(--muted);padding:8px 0">No matches played</div>'
      : _sessionMatchHistory
          .map((mt, i) => {
            const aWon = mt.scoreA > mt.scoreB;
            const adminBtns = window.isAdmin
              ? `<div class="sess-hist-actions">
                  <button class="sess-hist-move-btn" onclick="moveSessionMatch(${i},-1);openSessionSummary()" ${i === 0 ? "disabled" : ""} aria-label="Move match up" title="Move up">↑</button>
                  <button class="sess-hist-move-btn" onclick="moveSessionMatch(${i},1);openSessionSummary()" ${i === _smTotal - 1 ? "disabled" : ""} aria-label="Move match down" title="Move down">↓</button>
                </div>`
              : "";
            return `<div class="sess-sum-match">
          <div class="sess-sum-match-num">${i + 1}</div>
          <div class="sess-sum-match-teams">${escHtml(mt.teamA.map(normPlayer).join(" & "))} <span class="sess-sum-vs">vs</span> ${escHtml(mt.teamB.map(normPlayer).join(" & "))}</div>
          <div class="sess-sum-match-score" style="color:${aWon ? "var(--green)" : "var(--red)"}">${mt.scoreA}–${mt.scoreB}</div>
          ${adminBtns}
        </div>`;
          })
          .join("");
  const bodyEl = document.getElementById("session-summary-body");
  if (bodyEl)
    bodyEl.innerHTML = `
    <div class="sess-sum-meta">
      <div class="sess-sum-stat"><div class="sess-sum-val">${_sessionMatchHistory.length}</div><div class="sess-sum-lbl">MATCHES</div></div>
      <div class="sess-sum-stat"><div class="sess-sum-val">${dur}</div><div class="sess-sum-lbl">DURATION</div></div>
      ${mvp ? `<div class="sess-sum-stat"><div class="sess-sum-val">${escHtml(normPlayer(mvp[0]))}</div><div class="sess-sum-lbl">MVP · ${mvp[1].w}W</div></div>` : ""}
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

window._openSessionMatchIntro = function (histIdx) {
  const mt = _sessionMatchHistory[histIdx];
  if (!mt) return;
  const idx = state.matches.findIndex((m) => m.id === mt.id);
  if (idx >= 0) openMatchIntro(idx);
};

function _renderLiveSessionDashboard() {
  const el = document.getElementById("live-session-dashboard");
  if (!el) return;
  if (!_liveSessionData?.sessionActive) {
    el.style.display = "none";
    return;
  }
  const wasHidden = el.style.display === "none";
  el.style.display = "";

  if (_sessionMatchHistory.length === 0) {
    el.innerHTML = `
      <div class="live-sdash-section">SCOREBOARD</div>
      <div style="text-align:center;padding:14px 0 8px;color:var(--muted);font-size:11px;letter-spacing:0.05em">Save a match to see standings</div>`;
    return;
  }

  // Scroll into view when the first match is saved
  if (wasHidden || _sessionMatchHistory.length === 1)
    requestAnimationFrame(() =>
      el.scrollIntoView({ behavior: "smooth", block: "nearest" }),
    );

  // Apply guest filter
  const guestSet = new Set(
    Object.values(state.players)
      .filter((p) => p.isGuest)
      .map((p) => p.name),
  );
  const history =
    _sdashShowGuests || !guestSet.size
      ? _sessionMatchHistory
      : _sessionMatchHistory.filter(
          (m) => ![...m.teamA, ...m.teamB].some((p) => guestSet.has(p)),
        );

  // Session score: everyone starts at the active system's baseline, computed
  // from today's session matches only (resets fresh each session).
  const sessionASSMap = _statsRatingMap(history);
  const _sessDefault = _statsDefault();
  const _sessSrFn = _statsSrFn(sessionASSMap);
  const rawStats = computeStats(history, sessionASSMap, _sessSrFn);
  const effectiveSortCol = _sessSortCol === "elo" ? "ass" : _sessSortCol;
  const getSortVal = (p) => {
    switch (effectiveSortCol) {
      case "name":
        return p.name.toLowerCase();
      case "mp":
        return p.mp;
      case "wl":
        return p.mw;
      case "wpct":
        return p.mp > 0 ? p.mw / p.mp : 0;
      case "gw":
        return p.gw;
      case "gl":
        return p.gl;
      case "gpct":
        return p.gw + p.gl > 0 ? p.gw / (p.gw + p.gl) : 0;
      case "ass":
        return sessionASSMap[p.name] ?? _sessDefault;
      case "sr":
      default:
        return _sessSrFn(sessionASSMap[p.name] ?? _sessDefault);
    }
  };
  const stats = [...rawStats].sort((a, b) => {
    const va = getSortVal(a),
      vb = getSortVal(b);
    if (typeof va === "string") {
      const c = va.localeCompare(vb);
      return _sessSortDir === "desc" ? -c : c;
    }
    return _sessSortDir === "desc" ? vb - va : va - vb;
  });
  const rankColor = (i) =>
    i === 0
      ? "var(--gold,#f5c842)"
      : i === 1
        ? "#c0c0c0"
        : i === 2
          ? "#cd7f32"
          : "var(--muted)";
  const thASS = `<th onclick="window._sessSortBy('ass')" style="cursor:pointer">${escHtml(_statsLabel())}</th>`;
  const tableRows = stats
    .map((p, i) => {
      const ml = p.mp - p.mw;
      const winPct = p.mp > 0 ? Math.round((p.mw / p.mp) * 100) : 0;
      const total = p.gw + p.gl;
      const gamePct = total > 0 ? Math.round((p.gw / total) * 100) : 0;
      const assRaw = sessionASSMap[p.name] ?? _sessDefault;
      const ass = _statsFmt(assRaw);
      const sr = _sessSrFn(assRaw).toFixed(2);
      const assCol =
        assRaw > _sessDefault
          ? "var(--green)"
          : assRaw < _sessDefault
            ? "var(--red)"
            : "var(--text)";
      return `<tr class="live-sdash-tr">
      <td style="color:${rankColor(i)};font-weight:900">${i + 1}</td>
      <td class="live-sdash-td-name">${sheetAvSm(p.name)}<span>${escHtml(normPlayer(p.name))}</span></td>
      <td>${p.mp}</td>
      <td style="white-space:nowrap">${p.mw}–${ml}</td>
      <td>${winPct}%</td>
      <td>${p.gw}</td>
      <td>${p.gl}</td>
      <td>${gamePct}%</td>
      <td style="color:${assCol}">${ass}</td>
      <td style="color:var(--accent)">${sr}</td>
    </tr>`;
    })
    .join("");
  // Build all-time ELO delta map keyed by match id (session objs ≠ state.matches refs).
  // Use state.matches (not activeMatches) so guest-involving matches are included.
  const _atDeltaMap = new Map();
  const _avgTeamDelta = (deltas, team) => {
    const vals = (team || [])
      .map((p) => deltas?.[p])
      .filter((v) => Number.isFinite(v));
    return vals.length
      ? vals.reduce((a, b) => a + b, 0) / vals.length
      : undefined;
  };
  _matchDeltasForSystem(_scoringSystem, state.matches).forEach((d, m) => {
    const dA = _avgTeamDelta(d.playerDeltas, m.teamA);
    const dB = _avgTeamDelta(d.playerDeltas, m.teamB);
    _atDeltaMap.set(m.id, { dA, dB });
  });
  const matchesHtml = history
    .map((mt, i) => {
      const aWon = mt.scoreA > mt.scoreB;
      const histIdx = _sessionMatchHistory.indexOf(mt);
      const delta = _atDeltaMap.get(mt.id);
      const fmtD = (d) =>
        d == null || !Number.isFinite(d)
          ? ""
          : `<span class="ssm-elo" style="color:${d >= 0 ? "var(--green)" : "var(--red)"}">${d >= 0 ? "+" : ""}${_statsFmt(d)}</span>`;
      const teamAStr = escHtml(mt.teamA.map(normPlayer).join(" & "));
      const teamBStr = escHtml(mt.teamB.map(normPlayer).join(" & "));
      return `<div class="smr-wrap">
        <div class="smr-inner ssm-row" onclick="window._openSessionMatchIntro(${histIdx})">
          <div class="ssm-side ssm-side-a"><span class="ssm-names">${teamAStr}</span></div>
          ${delta ? fmtD(delta.dA) : ""}
          <div class="ssm-score" style="color:${aWon ? "var(--green)" : "var(--red)"}">${mt.scoreA}–${mt.scoreB}</div>
          ${delta ? fmtD(delta.dB) : ""}
          <div class="ssm-side ssm-side-b"><span class="ssm-names">${teamBStr}</span></div>
        </div>
        <div class="smr-edit-reveal" onclick="event.stopPropagation();editSessionMatch(${histIdx})" title="Edit">✏️</div>
        <div class="swipe-delete-reveal" onclick="event.stopPropagation();deleteSessionMatch(${histIdx})" title="Delete">🗑</div>
      </div>`;
    })
    .join("");
  el.innerHTML = `
    <div class="live-sdash-section">SCOREBOARD</div>
    <div class="live-sdash-table-wrap">
      <table class="live-sdash-table">
        <thead><tr>
          <th>#</th><th onclick="window._sessSortBy('name')" style="cursor:pointer">PLAYER</th><th onclick="window._sessSortBy('mp')" style="cursor:pointer">MP</th><th onclick="window._sessSortBy('wl')" style="cursor:pointer">W–L</th><th onclick="window._sessSortBy('wpct')" style="cursor:pointer">W%</th>
          <th onclick="window._sessSortBy('gw')" style="cursor:pointer">GW</th><th onclick="window._sessSortBy('gl')" style="cursor:pointer">GL</th><th onclick="window._sessSortBy('gpct')" style="cursor:pointer">G%</th>${thASS}<th onclick="window._sessSortBy('sr')" style="cursor:pointer">SR</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
    <div class="live-sdash-section" style="margin-top:14px">MATCHES PLAYED</div>
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
            `<span class="live-session-chip">${escHtml(normPlayer(p))}${counts[p] > 0 ? `<span class="sess-chip-count"> ×${counts[p]}</span>` : ""}</span>`,
        )
        .join("");
    }
  }
}

function openSessionSetup() {
  const guestNames = new Set(
    Object.values(state.players)
      .filter((p) => p.isGuest)
      .map((p) => p.name),
  );
  const players = getAllPlayerNamesFromMatches()
    .slice()
    .sort((a, b) => {
      const ag = guestNames.has(a) ? 1 : 0;
      const bg = guestNames.has(b) ? 1 : 0;
      return ag !== bg ? ag - bg : a.localeCompare(b);
    });
  _sessionSetupSelected = new Set();
  const list = document.getElementById("session-setup-list");
  if (!list) return;
  const eloMap = _statsRatingMap(activeMatches());
  const eloDefault = _statsDefault();
  list.innerHTML = players
    .map((p) => {
      const isGuest = guestNames.has(p);
      const elo = _statsFmt(eloMap[p] ?? eloDefault);
      const photo = photoMap[p];
      const av = photo
        ? `<img src="${photo}" class="ssp-av" style="object-fit:cover" alt="">`
        : `<span class="ssp-av" style="background:${playerColor(p)}">${playerInitials(p)}</span>`;
      const guestTag = isGuest
        ? `<span class="ssp-guest-tag">GUEST</span>`
        : "";
      return `<label class="ssp-row">
        <input type="checkbox" class="ssp-cb" onchange="window._sspToggle(${jsArg(p)}, this.checked)">
        ${av}
        <span class="ssp-meta">
          <span class="ssp-name">${escHtml(p)}</span>
          <span class="ssp-elo">${guestTag}${_scoringLabel()} ${elo}</span>
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
  _renderSeasonRolloverBanner();
  const autoT = document.getElementById("season-auto-toggle");
  if (autoT) autoT.checked = _isAutoSeasonEnabled();
  document.getElementById("season-overlay")?.classList.add("live-sheet-open");
  document.getElementById("season-sheet")?.classList.add("live-sheet-open");
}
// Admin-only nudge: a season ended and nothing (including a not-yet-started
// one) covers today, so the group is currently "between seasons." Dismissal
// is keyed by the specific ended-season id, not a blanket flag, so it
// reappears the next time a DIFFERENT season ends without a follow-up.
function _renderSeasonRolloverBanner() {
  const el = document.getElementById("season-rollover-banner");
  if (!el) return;
  if (!window.isAdmin || !seasonNeedsRollover(state.seasons, todayISO())) {
    el.style.display = "none";
    return;
  }
  const lastEnded = [...state.seasons]
    .filter((s) => s.end && s.end < todayISO())
    .sort((a, b) => (b.end || "").localeCompare(a.end || ""))[0];
  if (!lastEnded) {
    el.style.display = "none";
    return;
  }
  let dismissedFor = null;
  try {
    dismissedFor = localStorage.getItem("padel_rollover_dismissed");
  } catch (e) {}
  if (dismissedFor === lastEnded.id) {
    el.style.display = "none";
    return;
  }
  el.style.display = "";
  el.innerHTML = `
    <div class="season-rollover-text"><strong>${escHtml(lastEnded.name)}</strong> ended ${escHtml(fmtDate(lastEnded.end))} and no new season is defined yet.</div>
    <div class="season-rollover-actions">
      <button class="season-rollover-new" onclick="openSeasonEditor()">+ New Season</button>
      <button class="season-rollover-dismiss" onclick="dismissSeasonRollover(${jsArg(lastEnded.id)})">Dismiss</button>
    </div>`;
}
function dismissSeasonRollover(seasonId) {
  try {
    localStorage.setItem("padel_rollover_dismissed", seasonId);
  } catch (e) {}
  _renderSeasonRolloverBanner();
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
      ${admin && s.end && !s.archived ? `<button class="season-row-edit" title="Archive this season" onclick="event.stopPropagation();archiveSeason(${jsArg(s.id)})">📦</button>` : ""}
      ${s.archived ? `<button class="season-row-edit" title="View frozen snapshot" onclick="event.stopPropagation();viewSeasonArchive(${jsArg(s.id)})">🔒</button>` : ""}
      ${s.archived ? `<button class="season-row-edit" title="Celebrate this season" onclick="event.stopPropagation();openSeasonAwardsReveal(${jsArg(s.id)})">🎉</button>` : ""}
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
// ── SEASON ARCHIVER ───────────────────────────────────────────
// Freezes a finished season's final table + awards into an immutable
// snapshot stored on the season object, so re-opening it never recomputes
// (and stays stable even if match history or scoring config changes later).
function archiveSeason(id) {
  if (!window.isAdmin) {
    showToast("Admin only", "🔒");
    return;
  }
  const s = state.seasons.find((x) => x.id === id);
  if (!s) return;
  const ms = activeMatches().filter((m) => _inSeason(s, m.date));
  if (!ms.length) {
    showToast("No matches in this season", "⚠️");
    return;
  }
  const priorMs = s.start
    ? activeMatches().filter((m) => (m.date || "") < s.start)
    : [];
  const awards = _periodAwards(ms, priorMs);
  const scoreMap = _scoringMode === "ass" ? computeASS(ms) : computeASS(ms);
  const standings = computeStats(ms, scoreMap);
  s.archived = true;
  s.archivedAt = todayISO();
  s.archivedSnapshot = {
    matches: ms.length,
    mvp: awards.mvp
      ? { name: awards.mvp.name, mp: awards.mvp.mp, mw: awards.mvp.mw }
      : null,
    topPair: awards.topPair
      ? { players: awards.topPair.players, winPct: awards.topPair.winPct }
      : null,
    mostImproved: awards.mostImproved
      ? { name: awards.mostImproved.name }
      : null,
    ironMan: awards.ironMan
      ? { name: awards.ironMan.name, mp: awards.ironMan.mp }
      : null,
    standings: standings
      .slice(0, 20)
      .map((p) => ({ name: p.name, mp: p.mp, mw: p.mw, ml: p.ml, sr: p.sr })),
    scoringMode: _scoringMode,
  };
  _persistSeasons();
  saveCloudData();
  logAdminAction("Archive Season", s.name);
  showToast(`${s.name} archived`, "📦");
  _renderSeasonList();
}
function viewSeasonArchive(id) {
  const s = state.seasons.find((x) => x.id === id);
  if (!s || !s.archivedSnapshot) return;
  const snap = s.archivedSnapshot;
  document.getElementById("season-archive-modal")?.remove();
  const rows = snap.standings
    .map(
      (
        p,
        i,
      ) => `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
        <div style="width:20px;font-size:10px;color:var(--muted)">#${i + 1}</div>
        <div style="flex:1;font-size:11px;font-weight:700">${escHtml(p.name)}</div>
        <div style="font-size:9px;color:var(--muted)">${p.mw}W-${p.ml}L</div>
        <div style="font-size:11px;font-weight:800;color:var(--theme)">${p.sr.toFixed(2)}</div>
      </div>`,
    )
    .join("");
  const html = `<div id="season-archive-modal" style="position:fixed;inset:0;z-index:1000;background:var(--bg);overflow-y:auto;-webkit-overflow-scrolling:touch">
    <div style="max-width:480px;margin:0 auto;padding:16px 12px 40px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
        <button onclick="document.getElementById('season-archive-modal').remove()" aria-label="Back" title="Back" style="background:rgba(255,255,255,0.08);border:none;color:var(--text);width:32px;height:32px;border-radius:50%;font-size:14px;cursor:pointer">←</button>
        <div>
          <div style="font-size:16px;font-weight:900">📦 ${escHtml(s.name)}</div>
          <div style="font-size:10px;color:var(--muted)">Archived ${fmtDate(s.archivedAt)} · frozen snapshot, ${snap.matches} matches</div>
        </div>
      </div>
      <div class="ana-card" style="padding:10px 12px;margin-bottom:8px">
        ${snap.mvp ? `<div class="chem-row"><span style="font-size:16px">🥇</span><div><div style="font-size:11px;font-weight:700">MVP: ${escHtml(snap.mvp.name)}</div><div style="font-size:9px;color:var(--muted)">${snap.mvp.mw}W / ${snap.mvp.mp}P</div></div></div>` : ""}
        ${snap.topPair ? `<div class="chem-row"><span style="font-size:16px">🤝</span><div><div style="font-size:11px;font-weight:700">Top Pair: ${escHtml(snap.topPair.players.join(" & "))}</div><div style="font-size:9px;color:var(--muted)">${snap.topPair.winPct}% win rate</div></div></div>` : ""}
        ${snap.ironMan ? `<div class="chem-row"><span style="font-size:16px">💪</span><div><div style="font-size:11px;font-weight:700">Iron Man: ${escHtml(snap.ironMan.name)}</div><div style="font-size:9px;color:var(--muted)">${snap.ironMan.mp} matches</div></div></div>` : ""}
        ${snap.mostImproved ? `<div class="chem-row"><span style="font-size:16px">📈</span><div><div style="font-size:11px;font-weight:700">Most Improved: ${escHtml(snap.mostImproved.name)}</div></div></div>` : ""}
      </div>
      <div class="ana-card" style="padding:10px 12px">
        <div style="font-size:9px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Final Standings</div>
        ${rows}
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
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

// One-time bridge for a session paused before real match IDs existed: match
// each id-less history entry back to its state.matches entry by content and
// adopt that id, so undo/edit/delete/reorder work immediately on resume.
function _migrateSessionHistoryIds() {
  _sessionMatchHistory.forEach((mt) => {
    if (mt.id) return;
    const key = _mkMatchKey(mt);
    const m = state.matches.find((x) => _mkMatchKey(x) === key);
    mt.id = m ? m.id : _genMatchId();
  });
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
    _migrateSessionHistoryIds();
    _sessionPanelOpen = false;
    _syncLiveSessionBar();
    _startSessionTimer();
    _renderSessionActiveCard();
    document
      .getElementById("live-undo-match-btn")
      ?.style.setProperty(
        "display",
        _sessionMatchHistory.length > 0 ? "" : "none",
      );
    document
      .getElementById("live-redo-match-btn")
      ?.style.setProperty(
        "display",
        _sessionRedoStack.length > 0 ? "" : "none",
      );
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
    _migrateSessionHistoryIds();
    _sessionPanelOpen = false;
    _syncLiveSessionBar();
    _startSessionTimer();
    _renderSessionActiveCard();
    document
      .getElementById("live-undo-match-btn")
      ?.style.setProperty(
        "display",
        _sessionMatchHistory.length > 0 ? "" : "none",
      );
    document
      .getElementById("live-redo-match-btn")
      ?.style.setProperty(
        "display",
        _sessionRedoStack.length > 0 ? "" : "none",
      );
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
  _renderLiveSessionDashboard();
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

function openPlayerPickerSheet() {
  document.getElementById("spa-overlay")?.classList.add("open");
  document.getElementById("spa-modal")?.classList.add("open");
}
function closePlayerPickerSheet() {
  document.getElementById("spa-overlay")?.classList.remove("open");
  document.getElementById("spa-modal")?.classList.remove("open");
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

function openRemovePlayerSheet() {
  const list = document.getElementById("remove-player-list");
  if (!list) return;
  const current = _liveSessionData?.sessionPlayers || [];
  if (!current.length) {
    showToast("No players in session", "ℹ️");
    return;
  }
  const inSlot = new Set(Object.values(_liveSlots).filter(Boolean));
  list.innerHTML = current
    .map((p) => {
      const busy = inSlot.has(p);
      return `<button class="live-sheet-item${busy ? " live-sheet-item-disabled" : ""}" ${busy ? "disabled" : `onclick="removePlayerFromSession(${jsArg(p)})"`}>
        ${sheetAv(p)}
        <span class="live-sheet-item-name">${escHtml(normPlayer(p))}</span>
        ${busy ? `<span style="font-size:10px;color:var(--text-muted);margin-left:auto;flex-shrink:0">in match</span>` : ""}
      </button>`;
    })
    .join("");
  document
    .getElementById("remove-player-overlay")
    ?.classList.add("live-sheet-open");
  document
    .getElementById("remove-player-sheet")
    ?.classList.add("live-sheet-open");
}

function closeRemovePlayerSheet() {
  document
    .getElementById("remove-player-overlay")
    ?.classList.remove("live-sheet-open");
  document
    .getElementById("remove-player-sheet")
    ?.classList.remove("live-sheet-open");
}

function removePlayerFromSession(name) {
  closeRemovePlayerSheet();
  const players = (_liveSessionData?.sessionPlayers || []).filter(
    (p) => p !== name,
  );
  _liveSessionData = { ..._liveSessionData, sessionPlayers: players };
  _syncLiveSessionBar();
  _renderSittingOut();
  _saveSessionState();
  showToast(`${normPlayer(name)} removed from session`, "✅");
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
  const players = [...(latestMatch?.teamA || []), ...(latestMatch?.teamB || [])]
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
    Notification.requestPermission()
      .then((perm) => {
        if (perm !== "granted") {
          setNotifEnabled(false);
          if (cb) cb.checked = false;
          showToast("Notifications blocked by browser", "⚠️");
        }
      })
      .catch(() => {});
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
  const p = isNew
    ? { name: "", email: "", isGuest: false }
    : state.players[id] || {};
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

  // Block a name/alias that already belongs to a DIFFERENT player — silently
  // letting this through means every future text-paste match using that
  // token gets attributed to whichever player was processed last by
  // rebuildNameMaps(), misattributing match history with no visible error.
  const collision = Object.values(state.players).find((p) => {
    if (p.id === id) return false;
    const tokens = [p.name, ...(playerAliasMap[p.id] || [])].map((t) =>
      t.toLowerCase(),
    );
    return [name, ...aliases].some((t) => tokens.includes(t.toLowerCase()));
  });
  if (collision) {
    alert(
      `"${name}"/alias already used by "${collision.name}" — pick a different name or alias.`,
    );
    return;
  }

  const existing = state.players[id] || {};

  // Guest → regular player: their guest-era matches are about to start
  // counting toward stats/rankings. Offer a clean slate instead.
  if (existing.isGuest && !isGuest) {
    const canonical = existing.name;
    const involves = (m) =>
      [...(m.teamA || []), ...(m.teamB || [])].some(
        (rp) => normPlayer(rp) === canonical,
      );
    const affected = state.matches.filter(involves).length;
    if (
      affected > 0 &&
      confirm(
        `"${canonical}" is no longer a guest.\n\nDelete the ${affected} match${affected !== 1 ? "es" : ""} they played as a guest?\n\nYes = erase that match history. No = keep it (they'll now count toward stats).`,
      )
    ) {
      logAdminAction(
        "Delete Guest Matches",
        `${canonical} (+${affected} matches removed)`,
      );
      for (let i = state.matches.length - 1; i >= 0; i--) {
        if (involves(state.matches[i])) {
          const [removed] = state.matches.splice(i, 1);
          _removeMatchFromTA(removed);
        }
      }
      if (Array.isArray(deletedMatches)) {
        const before = deletedMatches.length;
        deletedMatches = deletedMatches.filter((m) => !involves(m));
        if (deletedMatches.length !== before) saveDeletedMatches();
      }
    }
  }

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
  if (!p) return;
  const canonical = p.name;
  const editingId = _editingPlayerId;
  // A match belongs to this player if any team member resolves (via aliases)
  // to their canonical name. Computed while the alias maps are still intact.
  const involves = (m) =>
    [...(m.teamA || []), ...(m.teamB || [])].some(
      (rp) => normPlayer(rp) === canonical,
    );
  const affected = state.matches.filter(involves).length;
  if (
    !confirm(
      `Delete player "${canonical}" and ALL their data?\n\nThis removes ${affected} match${affected !== 1 ? "es" : ""} they played in, plus their name from every dropdown, as if they never existed. You'll have a few seconds to undo.`,
    )
  )
    return;
  logAdminAction(
    "Delete Player",
    `${canonical} (+${affected} matches removed)`,
  );

  // Snapshot everything this mutates, in enough detail to fully restore it —
  // player deletion cascades across matches/trash/aliases/photo, so (unlike
  // a single match) this needs its own restore logic rather than reusing
  // deleteMatchByIndex's single-index undo.
  const playerSnapshot = { ...p };
  const aliasSnapshot = playerAliasMap[editingId]
    ? [...playerAliasMap[editingId]]
    : undefined;
  const hadPhoto = Object.prototype.hasOwnProperty.call(photoMap, canonical);
  const photoSnapshot = hadPhoto ? photoMap[canonical] : undefined;
  // Removed matches, sorted ascending by original index — restoring them back
  // in that same ascending order (via sequential splice-insert) reproduces
  // the original array exactly, since each insert only shifts positions AT
  // OR AFTER itself, which matches indices recorded for the not-yet-restored
  // (higher) ones.
  const removedMatches = [];
  for (let i = 0; i < state.matches.length; i++) {
    if (involves(state.matches[i])) removedMatches.push({ index: i, match: state.matches[i] });
  }
  const purgedFromTrash = Array.isArray(deletedMatches)
    ? deletedMatches.filter(involves)
    : [];

  // Hard-remove every match involving the player (reverse splice keeps indices valid).
  for (let i = state.matches.length - 1; i >= 0; i--) {
    if (involves(state.matches[i])) {
      const [removed] = state.matches.splice(i, 1);
      _removeMatchFromTA(removed);
    }
  }
  // Purge any of their matches lingering in the trash so nothing references them.
  if (Array.isArray(deletedMatches) && purgedFromTrash.length) {
    deletedMatches = deletedMatches.filter((m) => !involves(m));
    saveDeletedMatches();
  }
  delete state.players[editingId];
  delete playerAliasMap[editingId];
  if (hadPhoto) {
    delete photoMap[canonical];
    _savePhotosToCloud();
  }
  rebuildNameMaps();
  saveCloudData();
  commit();
  closePlayerEditSheet();
  renderNamesTable();

  showUndoToast(
    `Deleted ${escHtml(canonical)} (${affected} match${affected !== 1 ? "es" : ""})`,
    () => {
      state.players[editingId] = playerSnapshot;
      if (aliasSnapshot) playerAliasMap[editingId] = aliasSnapshot;
      removedMatches.forEach(({ index, match }) => {
        state.matches.splice(index, 0, match);
      });
      if (purgedFromTrash.length) {
        deletedMatches = [...purgedFromTrash, ...deletedMatches];
        saveDeletedMatches();
      }
      if (hadPhoto) {
        photoMap[canonical] = photoSnapshot;
        _savePhotosToCloud();
      }
      rebuildNameMaps();
      saveCloudData();
      commit();
      renderNamesTable();
      logAdminAction("Undo Delete Player", canonical);
    },
    8000,
  );
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
        <div class="mcm-name">${escHtml(normPlayer(a1) || "—")}</div>
        <div class="mcm-name">${escHtml(normPlayer(a2) || "—")}</div>
      </div>
      <div class="mcm-vs">VS</div>
      <div class="mcm-corner mcm-corner-b">
        <div class="mcm-label">BLUE CORNER</div>
        <div class="mcm-name">${escHtml(normPlayer(b1) || "—")}</div>
        <div class="mcm-name">${escHtml(normPlayer(b2) || "—")}</div>
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
    const na1 = normPlayer(a1) || "?",
      na2 = normPlayer(a2) || "?";
    const nb1 = normPlayer(b1) || "?",
      nb2 = normPlayer(b2) || "?";
    const winTeam = aWon ? `${na1} & ${na2}` : `${nb1} & ${nb2}`;
    const loseTeam = aWon ? `${nb1} & ${nb2}` : `${na1} & ${na2}`;
    const winScore = aWon ? _liveScoreA : _liveScoreB;
    const loseScore = aWon ? _liveScoreB : _liveScoreA;
    el.innerHTML = `<div class="msr-result">
      <div class="msr-matchup">
        <div class="msr-side msr-win">
          <div class="msr-side-label">🏆 WINNER</div>
          <div class="msr-side-name">${escHtml(winTeam)}</div>
          <div class="msr-side-score msr-score-win">${winScore}</div>
        </div>
        <div class="msr-divider">–</div>
        <div class="msr-side msr-lose">
          <div class="msr-side-label">LOST</div>
          <div class="msr-side-name">${escHtml(loseTeam)}</div>
          <div class="msr-side-score msr-score-lose">${loseScore}</div>
        </div>
      </div>
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
  _commitSaveMatch();
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
        ${teamA.map((p) => `<div class="live-banner-player">${escHtml(normPlayer(p))}</div>`).join("")}
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
        ${teamB.map((p) => `<div class="live-banner-player">${escHtml(normPlayer(p))}</div>`).join("")}
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
