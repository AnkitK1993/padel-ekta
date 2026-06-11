// ── PLAYER DOMAIN ──────────────────────────────────────────────────────────
// Pure domain helpers that answer questions about players and the match corpus.
// No DOM, no Firebase, no app-level state — all inputs are parameters.
// app.js owns the mutable state objects; it calls these as pure functions.

import { state } from "../engine/state.js";

// ── Identity helpers ──────────────────────────────────────────
// Resolve a raw player token (alias or canonical name) to the display name.
export function normPlayer(name) {
  return (state.nameMap[name] || name || "").trim();
}

// Rebuild aliasMap + nameMap from the canonical players/playerAliasMap objects.
// Called once after any player-registry mutation.
export function rebuildNameMaps(players, playerAliasMap) {
  state.aliasMap = {};
  state.nameMap = {};
  Object.values(players).forEach((p) => {
    const aliases = playerAliasMap[p.id] || [];
    state.aliasMap[p.name] = aliases;
    aliases.forEach((a) => {
      state.nameMap[a] = p.name;
    });
  });
}

// One-time migration from the old flat aliasMap → structured players/playerAliasMap.
export function migrateAliasMapToPlayers(aMap) {
  const pls = {};
  const pam = {};
  let id = 1;
  Object.keys(aMap || {})
    .sort((a, b) => a.localeCompare(b))
    .forEach((name) => {
      pls[id] = { id, name, email: "", image: "", isGuest: false };
      pam[id] = Array.isArray(aMap[name]) ? [...aMap[name]] : [];
      id++;
    });
  return { players: pls, playerAliasMap: pam, nextPlayerId: id };
}

// ── Roster helpers ─────────────────────────────────────────────
// Alphabetical list of all known player names, guests sorted last.
export function getAllPlayerNames(matches) {
  const names = new Set(Object.values(state.players).map((p) => p.name));
  matches.forEach((m) => {
    [...(m.teamA || []), ...(m.teamB || [])].forEach((p) =>
      names.add(normPlayer(p)),
    );
  });
  return sortPlayersGuestsLast([...names].filter(Boolean));
}

// Sort alphabetically, guests at the end.
export function sortPlayersGuestsLast(names) {
  const guestSet = new Set(
    Object.values(state.players)
      .filter((p) => p.isGuest)
      .map((p) => p.name),
  );
  return [...names].sort((a, b) => {
    const ag = guestSet.has(a), bg = guestSet.has(b);
    if (ag !== bg) return ag ? 1 : -1;
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });
}

// ── Match-level helpers ────────────────────────────────────────
// Canonical "[hi]-[lo]" scoreline (score-order-agnostic).
export function normalizedScoreline(m) {
  const hi = Math.max(Number(m.scoreA), Number(m.scoreB));
  const lo = Math.min(Number(m.scoreA), Number(m.scoreB));
  return `${hi}-${lo}`;
}

// Structural equality for duplicate detection.
export function sameMatch(a, b) {
  if (!a || !b) return false;
  const ta = [...(a.teamA || [])].sort().join("|");
  const tb = [...(a.teamB || [])].sort().join("|");
  const oa = [...(b.teamA || [])].sort().join("|");
  const ob = [...(b.teamB || [])].sort().join("|");
  return (
    a.date === b.date &&
    a.scoreA === b.scoreA &&
    a.scoreB === b.scoreB &&
    ta === oa &&
    tb === ob
  );
}

// Chronological first/last played dates for a display-name player.
export function getPlayerDateRange(playerName, matches) {
  const dates = matches
    .filter((m) =>
      [...(m.teamA || []), ...(m.teamB || [])].some(
        (p) => normPlayer(p) === playerName,
      ),
    )
    .map((m) => m.date)
    .filter(Boolean)
    .sort();
  return { first: dates[0] || null, last: dates[dates.length - 1] || null };
}
