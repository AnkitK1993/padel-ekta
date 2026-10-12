// ── QUIET ERROR LOG ─────────────────────────────────────────
// Many operations here are allowed to fail without stopping the app —
// localStorage in a private window or when full, a corrupt cached value, a
// share sheet the user dismissed, an optional browser API. Those used to be
// swallowed by empty `catch {}` blocks, which also hid real bugs inside the
// same try. noteError() keeps the app running but leaves a trace: each
// distinct place logs once per session (a warning, not an error, so the
// console isn't flooded and nothing user-facing changes).
const _seen = new Set();

export function noteError(where, err) {
  const key = `${where}|${(err && err.name) || typeof err}`;
  if (_seen.has(key)) return;
  _seen.add(key);
  try {
    console.warn(`[ekta] ${where}:`, err);
  } catch (_) {
    // console itself unavailable — nothing more we can do
  }
}

// For tests: how many distinct places have reported.
export function noteErrorCount() {
  return _seen.size;
}
