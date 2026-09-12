// ── FINGERPRINT HELPERS ────────────────────────────────────────────────────
// Generic, engine-agnostic hashing helpers used by memo-store.js (and any
// other memoization layer) to build cheap cache keys from a matches array.
// Extracted out of the old elo.js so removing ELO didn't also remove the
// caching primitives that ASS/stats memoization still depends on.

function _fnvField(h, s) {
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.imul(h ^ 0x7c, 16777619); // fold a separator so "ab","c" ≠ "a","bc"
}

export function _matchesFingerprintForCache(matches) {
  const arr = matches || [];
  let h1 = 2166136261;
  let h2 = 0x811c9dc4; // different basis → independent second hash
  for (const m of arr) {
    for (const f of [
      m.date || "",
      (m.teamA || []).join(","),
      (m.teamB || []).join(","),
      `${m.scoreA ?? ""}`,
      `${m.scoreB ?? ""}`,
      m.note || "",
    ]) {
      h1 = _fnvField(h1, f);
      h2 = _fnvField(h2, f);
    }
  }
  return `${arr.length}:${(h1 >>> 0).toString(36)}:${(h2 >>> 0).toString(36)}`;
}

export function _lightFingerprint(matches) {
  const arr = matches || [];
  if (!arr.length) return "0||";
  const last = arr[arr.length - 1];
  return `${arr.length}|${last.date || ""}|${last.scoreA ?? ""}|${last.scoreB ?? ""}`;
}
