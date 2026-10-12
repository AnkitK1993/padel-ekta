// ── ADMIN AUDIT LOG: UNDO + SHARING ────────────────────────
// Log entries can carry an `undo` recipe that reverses the change:
//   { kind: "remove",  ids: [...] }     — undo an add: take those matches out
//   { kind: "restore", match }          — undo a delete: put the match back
//   { kind: "replace", before }         — undo an edit: restore the old version
// The log travels with the cloud document (newest LOG_CAP entries), so an
// action taken on one admin device can be undone from another.
//
// Pure: no DOM, no app state.

export const LOG_CAP = 40;

export function newLogId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// Applies an undo recipe to a match list. Returns { matches, ok, reason }.
// Never throws; `ok` is false when there is nothing left to undo (the match
// was already removed / restored / changed again since).
export function applyUndo(matches, undo) {
  if (!undo || !undo.kind) return { matches, ok: false, reason: "nothing to undo" };
  if (undo.kind === "remove") {
    const ids = new Set(undo.ids || []);
    const out = matches.filter((m) => !ids.has(m.id));
    return out.length === matches.length
      ? { matches, ok: false, reason: "those matches are already gone" }
      : { matches: out, ok: true };
  }
  if (undo.kind === "restore") {
    const m = undo.match;
    if (!m || matches.some((x) => x.id === m.id))
      return { matches, ok: false, reason: "that match is already back" };
    const back = { ...m };
    delete back.deletedAt;
    const out = [...matches, back].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    return { matches: out, ok: true };
  }
  if (undo.kind === "replace") {
    const before = undo.before;
    const i = before ? matches.findIndex((x) => x.id === before.id) : -1;
    if (i < 0) return { matches, ok: false, reason: "that match no longer exists" };
    const out = [...matches];
    out[i] = { ...before };
    return { matches: out, ok: true };
  }
  return { matches, ok: false, reason: "unknown change" };
}

// Union of two logs by id, newest first, capped. An entry marked undone on
// either side stays undone.
export function mergeLogs(a = [], b = [], cap = 100) {
  const byId = new Map();
  [...a, ...b].forEach((e) => {
    if (!e) return;
    const id = e.id || `${e.at}|${e.action}|${e.detail}`;
    const prev = byId.get(id);
    byId.set(id, prev ? { ...prev, ...e, undone: prev.undone || e.undone } : { ...e, id });
  });
  return [...byId.values()].sort((x, y) => (y.at || "").localeCompare(x.at || "")).slice(0, cap);
}
