// ── LIVE SESSION STATE ─────────────────────────────────────────────────────
// All mutable state owned by the live/americano session feature.
// Previously scattered as bare module-level `let` declarations in the 20k-line
// app.js. Extracting them here:
//   • Makes the live-session feature's memory footprint explicit.
//   • Enables reset() to be called atomically — no risk of a half-cleared state.
//   • Surfaces a clear boundary: app.js owns historical data; session-state.js
//     owns transient in-progress session data.
//
// app.js imports the exported objects and mutates their fields directly, so
// all existing call sites continue to work without renaming anything.

// ── Core session ──────────────────────────────────────────────
export const sessionState = {
  data: null,             // { sessionActive, players, ... } | null
  pendingCount: 0,        // matches saved locally, not yet in Firestore
  matchHistory: [],       // matches logged this session (undo / rematch / stats)
  redoStack: [],          // matches popped by undo; available for redo
  timerInterval: null,    // setInterval handle for elapsed-time display
  panelOpen: false,       // whether the session stats panel is expanded
  setupSelected: new Set(),
};

// ── Live point-scoring sub-state ──────────────────────────────
export const liveScore = {
  scoreA: 0,
  scoreB: 0,
  activeSlot: null,       // which slot is being swapped
  points: [],             // point-by-point history (for momentum graph)
  gameMode: 4,            // 4 = race-to-4, 6 = race-to-6 (±2 / TB)
  gamePtsA: 0,            // 0..3 = 0/15/30/40 (deuce/adv handled separately)
  gamePtsB: 0,
  adv: null,              // "a" | "b" | null (advantage in deuce)
  matchEnded: false,
  undoStack: [],          // [{gpA, gpB, adv, sA, sB, ended}] for undo
};

// ── Americano/Mexicano scheduling ─────────────────────────────
export const americanoState = {
  players: [],
  selected: new Set(),
  schedule: null,
  scores: {},             // "round-match" → { a, b }
  mode: "americano",      // "americano" | "mexicano"
  sitCount: {},           // mexicano sit-out rotation tracking
  lastPlayers: [],
};

// ── Atomic reset helpers ───────────────────────────────────────
export function resetSessionState() {
  sessionState.data = null;
  sessionState.pendingCount = 0;
  sessionState.matchHistory = [];
  sessionState.redoStack = [];
  clearInterval(sessionState.timerInterval);
  sessionState.timerInterval = null;
  sessionState.panelOpen = false;
  sessionState.setupSelected = new Set();
}

export function resetLiveScore() {
  liveScore.scoreA = 0;
  liveScore.scoreB = 0;
  liveScore.activeSlot = null;
  liveScore.points = [];
  liveScore.gamePtsA = 0;
  liveScore.gamePtsB = 0;
  liveScore.adv = null;
  liveScore.matchEnded = false;
  liveScore.undoStack = [];
}

export function resetAmericanoState() {
  americanoState.players = [];
  americanoState.selected = new Set();
  americanoState.schedule = null;
  americanoState.scores = {};
  americanoState.mode = "americano";
  americanoState.sitCount = {};
  // intentionally keep lastPlayers — used for rematch detection
}
