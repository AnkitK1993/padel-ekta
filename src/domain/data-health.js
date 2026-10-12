// ── DATA HEALTH ────────────────────────────────────────────
// Pure integrity checks over the stored league data. Matches reference players
// by NAME (a deliberate, long-standing design: names are what the match
// parser, the backups and the Firestore document all speak), so a typo or a
// stray space silently creates a "new player" that every screen then ranks.
// Rather than migrating live data to IDs, this module makes name drift visible:
// unknown names (with a "did you mean"), look-alike roster names, malformed
// matches, duplicate entries, impossible dates, overlapping seasons, and the
// out-of-date-order entries that same-day tie-breaking silently depends on.
//
// Pure: no DOM, no app state. checkDataHealth() takes plain data and returns
// issues; the Admin "Data Health Check" card renders them.
import { cleanPlayerName } from "./players.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SEVERITY_ORDER = { error: 0, warn: 1, info: 2 };
// A real calendar day ("2026-02-31" parses, rolled over to 3 March, so check
// the parts survive the round trip).
function _realDate(iso) {
  const [y, mo, d] = iso.split("-").map(Number);
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
}

// Case/space/punctuation/diacritic-insensitive form of a name.
export function normalizeName(n) {
  return String(n ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function editDistance(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[n];
}

function nearestName(name, candidates) {
  const target = normalizeName(name);
  let best = null;
  let bestD = Infinity;
  for (const c of candidates) {
    const d = editDistance(target, normalizeName(c));
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  // Only suggest when it is plausibly the same name (a slip, not a stranger).
  const limit = Math.max(1, Math.floor(target.length / 4));
  return best !== null && bestD <= limit ? best : null;
}

const describe = (m) =>
  `${(m.teamA || []).join(" & ")} vs ${(m.teamB || []).join(" & ")} ${m.scoreA}–${m.scoreB} (${m.date || "no date"})`;

// matches:  [{ id?, date, teamA:[], teamB:[], scoreA, scoreB }]
// players:  { [id]: { name, isGuest } }   (the roster)
// aliasMap: { [id]: [alias, …] }           (short names used when parsing)
// seasons:  [{ id, name, start, end|null }]
// today:    "YYYY-MM-DD" (injected so the check stays pure and testable)
export function checkDataHealth({
  matches = [],
  players = {},
  aliasMap = {},
  seasons = [],
  today = "",
} = {}) {
  const issues = [];
  const add = (severity, kind, message, extra = {}) =>
    issues.push({ severity, kind, message, ...extra });

  const roster = Object.values(players);
  const rosterNames = roster.map((p) => p.name);
  const rosterSet = new Set(rosterNames);

  // ── roster ───────────────────────────────────────────────────────────
  // Names saved before the name rule existed may still carry characters it
  // now rejects (markup, separators); they still work, but rename them.
  rosterNames.forEach((n) => {
    const r = cleanPlayerName(n);
    if (!r.ok && n) add("warn", "name-chars", `Roster name ${r.error} — rename it in Manage → Players`, { name: n });
  });
  const byNorm = new Map();
  rosterNames.forEach((n) => {
    const k = normalizeName(n);
    if (!byNorm.has(k)) byNorm.set(k, []);
    byNorm.get(k).push(n);
  });
  byNorm.forEach((names) => {
    if (names.length > 1)
      add("warn", "roster-lookalike", `Roster has look-alike names: ${names.map((n) => `"${n}"`).join(" and ")} — likely the same person`, { names });
  });
  const longNames = rosterNames.filter((n) => normalizeName(n).length >= 5);
  for (let i = 0; i < longNames.length; i++) {
    for (let j = i + 1; j < longNames.length; j++) {
      const a = normalizeName(longNames[i]);
      const b = normalizeName(longNames[j]);
      // "Rahul G" / "Rahul M": a one-letter surname initial is how two people
      // with the same first name are kept apart, not a typo.
      const initialOnly = (n) => /^\S+ \S$/.test(n.trim());
      if (initialOnly(longNames[i]) && initialOnly(longNames[j])) continue;
      if (a !== b && editDistance(a, b) === 1) {
        add("info", "roster-similar", `Roster names "${longNames[i]}" and "${longNames[j]}" differ by one letter — check they are two different people`, { names: [longNames[i], longNames[j]] });
      }
    }
  }
  const aliasOwner = new Map();
  Object.entries(aliasMap || {}).forEach(([id, list]) => {
    (list || []).forEach((alias) => {
      const k = normalizeName(alias);
      if (aliasOwner.has(k) && aliasOwner.get(k) !== id)
        add("error", "alias-collision", `Alias "${alias}" is used by two different players (ids ${aliasOwner.get(k)} and ${id}) — the parser can't tell them apart`);
      else aliasOwner.set(k, id);
    });
  });

  // ── matches ──────────────────────────────────────────────────────────
  const seenIds = new Map();
  const seenKeys = new Map();
  const unknown = new Map(); // name -> [idx]
  const messy = new Map(); // name -> [idx]
  const played = new Set();
  let outOfOrder = 0;
  let firstOutOfOrder = null;
  let noSeason = 0;

  matches.forEach((m, idx) => {
    const tag = { matchIdx: idx, matchId: m.id };

    // shape
    const A = m.teamA || [];
    const B = m.teamB || [];
    if (!A.length || !B.length || A.length > 2 || B.length > 2)
      add("error", "team-size", `A team has ${!A.length || !B.length ? "no" : "too many"} players: ${describe(m)}`, tag);
    else if (A.length !== B.length)
      add("warn", "team-size", `Uneven teams (${A.length} v ${B.length}): ${describe(m)}`, tag);
    else if (A.length === 1)
      add("info", "singles", `Singles match: ${describe(m)}`, tag);

    const all = [...A, ...B];
    if (new Set(all.map(normalizeName)).size !== all.length)
      add("error", "player-twice", `A player appears twice in one match: ${describe(m)}`, tag);

    // names
    all.forEach((name) => {
      played.add(name);
      if (typeof name !== "string" || !name.trim()) {
        add("error", "name-empty", `Empty player name: ${describe(m)}`, tag);
        return;
      }
      if (name !== name.trim() || /\s{2,}/.test(name)) {
        if (!messy.has(name)) messy.set(name, []);
        messy.get(name).push(idx);
      }
      if (rosterNames.length && !rosterSet.has(name)) {
        if (!unknown.has(name)) unknown.set(name, []);
        unknown.get(name).push(idx);
      }
    });

    // score
    const a = m.scoreA;
    const b = m.scoreB;
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0)
      add("error", "score-invalid", `Invalid score ${a}–${b}: ${describe(m)}`, tag);
    else if (a === b)
      add("warn", "score-tie", `Tied score ${a}–${b} (no winner): ${describe(m)}`, tag);

    // date
    if (!DATE_RE.test(m.date || "") || !_realDate(m.date))
      add("error", "date-invalid", `Missing or malformed date "${m.date ?? ""}": ${describe(m)}`, tag);
    else {
      if (today && m.date > today)
        add("warn", "date-future", `Match dated in the future (${m.date}): ${describe(m)}`, tag);
      if (seasons.length && !seasons.some((s) => (!s.start || m.date >= s.start) && (!s.end || m.date <= s.end)))
        noSeason++;
    }

    // ids / duplicates
    if (m.id !== undefined && m.id !== null && m.id !== "") {
      if (seenIds.has(m.id))
        add("error", "id-duplicate", `Two matches share the id ${m.id}: ${describe(m)}`, tag);
      else seenIds.set(m.id, idx);
    }
    const key = `${m.date}|${[...A].sort().join(",")}|${[...B].sort().join(",")}|${a}-${b}`;
    if (seenKeys.has(key))
      add("warn", "duplicate-match", `Possible double entry (same teams, score and day): ${describe(m)}`, { ...tag, firstIdx: seenKeys.get(key) });
    else seenKeys.set(key, idx);

    // order
    if (idx > 0 && DATE_RE.test(m.date || "") && DATE_RE.test(matches[idx - 1].date || "") && m.date < matches[idx - 1].date) {
      outOfOrder++;
      if (!firstOutOfOrder) firstOutOfOrder = { idx, date: m.date, prev: matches[idx - 1].date };
    }
  });

  unknown.forEach((idxs, name) => {
    const hint = nearestName(name, rosterNames);
    add(
      "warn",
      "name-unknown",
      `"${name}" plays in ${idxs.length} match${idxs.length > 1 ? "es" : ""} but isn't on the roster${hint ? ` — did you mean "${hint}"?` : ""}`,
      { name, suggestion: hint, matchIdxs: idxs },
    );
  });
  messy.forEach((idxs, name) => {
    add("warn", "name-whitespace", `Name "${name}" has stray spaces (${idxs.length} match${idxs.length > 1 ? "es" : ""}) — it is a different "player" from "${name.trim().replace(/\s+/g, " ")}"`, { name, matchIdxs: idxs });
  });

  if (outOfOrder)
    add(
      "info",
      "out-of-order",
      `${outOfOrder} match${outOfOrder > 1 ? "es are" : " is"} stored out of date order (first: ${firstOutOfOrder.date} after ${firstOutOfOrder.prev}). Ratings sort by date, but matches on the same day follow entry order.`,
      { count: outOfOrder, matchIdx: firstOutOfOrder.idx },
    );
  if (noSeason)
    add("info", "no-season", `${noSeason} match${noSeason > 1 ? "es fall" : " falls"} outside every defined season`, { count: noSeason });

  roster.forEach((p) => {
    if (!p.isGuest && !played.has(p.name))
      add("info", "roster-orphan", `${p.name} is on the roster but has no matches`, { name: p.name });
  });

  // ── seasons ──────────────────────────────────────────────────────────
  const dated = seasons.filter((s) => s.start);
  seasons.forEach((s) => {
    if (s.start && s.end && s.start > s.end)
      add("error", "season-range", `Season "${s.name}" ends (${s.end}) before it starts (${s.start})`, { seasonId: s.id });
  });
  for (let i = 0; i < dated.length; i++) {
    for (let j = i + 1; j < dated.length; j++) {
      const x = dated[i];
      const y = dated[j];
      const xEnd = x.end || "9999-12-31";
      const yEnd = y.end || "9999-12-31";
      if (x.start <= yEnd && y.start <= xEnd)
        add("warn", "season-overlap", `Seasons "${x.name}" and "${y.name}" overlap — a match on a shared day is counted in both`, { seasonIds: [x.id, y.id] });
    }
  }

  issues.sort(
    (p, q) =>
      SEVERITY_ORDER[p.severity] - SEVERITY_ORDER[q.severity] ||
      p.kind.localeCompare(q.kind),
  );
  const count = (s) => issues.filter((i) => i.severity === s).length;
  return {
    issues,
    errors: count("error"),
    warnings: count("warn"),
    infos: count("info"),
    ok: issues.every((i) => i.severity === "info"),
  };
}

// Plain-text report (for "copy report" / a bug report to the admin).
export function formatHealthReport(result) {
  if (!result.issues.length) return "Data health: no issues found.";
  const head = `Data health: ${result.errors} error(s), ${result.warnings} warning(s), ${result.infos} note(s)`;
  const tag = { error: "ERROR", warn: "WARN ", info: "NOTE " };
  return [head, ...result.issues.map((i) => `${tag[i.severity]} ${i.message}`)].join("\n");
}
