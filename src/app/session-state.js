// ── LIVE SESSION STATE ─────────────────────────────────────────────────────
// Mutable state owned by the live-session feature.
// Previously scattered as bare module-level `let` declarations in the 20k-line
// app.js. Extracting it here:
//   • Makes the live-session feature's memory footprint explicit.
//   • Enables reset() to be called atomically — no risk of a half-cleared state.
//   • Surfaces a clear boundary: app.js owns historical data; session-state.js
//     owns transient in-progress session data.
//
// app.js imports the exported object and mutates its fields directly, so
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
