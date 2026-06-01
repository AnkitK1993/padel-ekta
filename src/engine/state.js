// ── SHARED MUTABLE APP STATE ───────────────────────────────
// A single object whose properties hold the app's core mutable data. Living on
// an object (rather than module-level `let`s) means any module can both READ
// and REASSIGN the data through the same reference — ES `import` bindings are
// read-only, so a plain `export let` could not be reassigned from app.js.
//
// Migration is incremental: globals move onto `state` one at a time, each a
// separately verified commit. Property names are deliberately chosen to NOT
// collide with the persisted Firestore/localStorage schema keys.
export const state = {
  matches: [], // was the module-level `allMatches` array
  seasons: [], // was the module-level `seasons` array (user-defined date ranges)
  nameMap: {}, // alias/token → canonical player name
  aliasMap: {}, // canonical player name → [aliases]
  players: {}, // roster: { [id]: { id, name, email, image, isGuest } }
};
