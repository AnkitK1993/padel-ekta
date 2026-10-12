// ── SYNC MERGE ─────────────────────────────────────────────
// Combining this device's unsynced changes with the cloud copy. Matches are
// matched by id (every saved match carries one); a match with no id
// counterpart is still recognised by its content key, so an old copy whose id
// was assigned separately on each device isn't counted twice.
//
//   - in both            → this device's version (it holds the unsynced edit)
//   - only in the cloud  → kept (added on another device), unless this device
//                          deleted it (it's in the local trash)
//   - only on this device → kept (added here while offline)
//
// Pure: no DOM, no app state.

export function mergeLocalIntoCloud({ cloud = [], local = [], deletedIds = [], keyOf }) {
  const localById = new Map(local.filter((m) => m.id).map((m) => [m.id, m]));
  const deleted = new Set(deletedIds.filter(Boolean));
  const cloudIds = new Set(cloud.map((m) => m.id).filter(Boolean));
  const cloudKeys = new Set(cloud.map(keyOf));

  const out = [];
  let edited = 0;
  let removed = 0;
  cloud.forEach((m) => {
    if (m.id && deleted.has(m.id) && !localById.has(m.id)) {
      removed++;
      return;
    }
    const mine = m.id ? localById.get(m.id) : null;
    if (mine) {
      if (keyOf(mine) !== keyOf(m)) edited++;
      out.push(mine);
    } else out.push(m);
  });
  const added = local.filter(
    (m) => !(m.id && cloudIds.has(m.id)) && !cloudKeys.has(keyOf(m)),
  );
  out.push(...added);
  // Date order; same-day matches keep their relative order (stable sort).
  out.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  return { matches: out, added: added.length, edited, removed };
}

// Local roster entries win over the cloud's (same id); aliases are unioned.
export function mergeRoster({ cloudPlayers = {}, localPlayers = {}, cloudAliases = {}, localAliases = {}, cloudNextId = 1, localNextId = 1 }) {
  const players = { ...cloudPlayers, ...localPlayers };
  const aliases = {};
  new Set([...Object.keys(cloudAliases), ...Object.keys(localAliases)]).forEach((id) => {
    aliases[id] = [...new Set([...(cloudAliases[id] || []), ...(localAliases[id] || [])])];
  });
  return { players, aliases, nextId: Math.max(cloudNextId || 1, localNextId || 1) };
}
