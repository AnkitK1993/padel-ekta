// ── VIEW FILTER STATE ──────────────────────────────────────────────────────
// The single source of truth for every user-chosen filter across all tabs.
// Exporting plain objects (not a class) keeps reads O(1) property accesses;
// callers mutate fields directly on the objects — the same semantics as the
// old module-level lets in app.js, but now namespaced and co-located with the
// render version tokens they guard.

// ── History tab ──────────────────────────────────────────────
export const historyFilters = {
  tab: "today",       // "today" | "week" | "weekend" | "month" | "lastweek" | "range" | "day" | "all"
  from: null,         // YYYY-MM-DD | null
  to: null,           // YYYY-MM-DD | null
  player: "",         // display-name filter (empty = all)
  outcome: "all",     // "all" | "win" | "loss"
  margin: "all",      // "all" | "close" | "dominating" | "zero"
  pair: "",           // pair key (empty = all)
  scoreline: "",      // normalized scoreline string (empty = all)
  h2hA: "",           // head-to-head player A
  h2hB: "",           // head-to-head player B
  h2hActiveSlot: null,
  filterSheetMode: null,
  // Render version tokens — skip DOM rebuild if data + filter unchanged.
  renderedVersion: -1,
  renderedFilter: "",
};

// ── Home (Detailed leaderboard) tab ──────────────────────────
export const homeFilters = {
  filter: "all",
  from: null,
  to: null,
  renderedVersion: -1,
  renderedFilter: "",
};

// ── Summary (Compact leaderboard) tab ────────────────────────
export const compactFilters = {
  filter: "today",
  from: null,
  to: null,
  sortKey: "sr",
  sortAsc: false,
  recordSortMode: "wins",
  renderedVersion: -1,
  renderedFilter: "",
};

// ── Per-tab active render-generation tokens ───────────────────
// Guards against stale async callbacks clobbering a newer render.
export const renderGen = {
  home: 0,
  modern: 0,
};

// ── Filter-string builders ─────────────────────────────────────
// Called by switchMainTab to decide whether a re-render is needed.
export function homeFilterKey() {
  return `${homeFilters.filter}|${homeFilters.from || ""}|${homeFilters.to || ""}`;
}

export function compactFilterKey() {
  return [
    compactFilters.filter,
    compactFilters.from || "",
    compactFilters.to || "",
    compactFilters.sortKey,
    compactFilters.sortAsc,
  ].join("|");
}

export function historyFilterKey() {
  return [
    historyFilters.tab,
    historyFilters.from || "",
    historyFilters.to || "",
    historyFilters.player,
    historyFilters.outcome,
    historyFilters.margin,
    historyFilters.pair,
    historyFilters.scoreline,
    historyFilters.h2hA,
    historyFilters.h2hB,
  ].join("|");
}

// Count active filters on the History tab (used for the filter badge).
export function historyActiveFilterCount() {
  const f = historyFilters;
  return [
    f.tab !== "today",
    !!f.player,
    f.outcome !== "all",
    f.margin !== "all",
    !!f.pair,
    !!(f.h2hA || f.h2hB),
    !!f.scoreline,
  ].filter(Boolean).length;
}
