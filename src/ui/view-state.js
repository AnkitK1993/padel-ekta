// ── ANALYTICS VIEW-STATE · shared mutable namespace ────────────
// A single leaf module (imports nothing) holding the transient, per-view UI
// state of the Analytics page — which filter/sort/period is active, which
// players are picked in each comparator, the what-if toggles, etc. This is NOT
// persisted and NOT domain data; it is ephemeral view state that used to live
// as ~31 scattered module-scope `let`s inside app.js.
//
// Why it exists: the Analytics builders reassign these primitives, and app.js's
// controller reads them too. Holding them as properties on one shared object
// lets the (future) lazily-loaded features/analytics module read and write the
// SAME state as app.js without a circular import back into app.js — which is
// the blocker that prevented code-splitting the analytics page. Mutate in place
// (viewState.x = …); never reassign the object itself.
export const viewState = {
  // Weekly digest card
  digestFilter: "week",
  digestPlayer: "",
  // Head-to-head + partner/opponent matrices
  h2hMatrixSort: "matches",
  pairMatrixPeriod: "all",
  pairMatrixMode: "count",
  // Best-pairs sortable table
  pairSort: { key: "winPct", dir: -1 },
  pairsData: [],
  pairsShowAll: false,
  // Two-player comparison
  cmpPlayerA: "",
  cmpPlayerB: "",
  cmpDateFilter: "all",
  // Section category filter / search / order
  anaActiveCat: "all",
  anaSearchIdx: -1,
  anaSections: [],
  // ELO win-probability calculator
  eloProbP1: "",
  eloProbP2: "",
  // What-if simulator
  whatIfToggles: {}, // matchIdx -> bool (false = excluded)
  whatIfFlips: {}, // matchIdx -> bool (true = flip outcome)
  whatIfPlayer: "",
  // Match predictor
  predictPlayerA: "",
  predictPlayerB: "",
  predictPartnerA: "",
  predictPartnerB: "",
  // 2v2 outcome simulator
  simA1: "",
  simA2: "",
  simB1: "",
  simB2: "",
  // ELO timeline overlay
  eloTLPlayer: "",
  eloTLFilter: "all",
  eloTLOverlay: "",
  eloTLPts: [],
};
