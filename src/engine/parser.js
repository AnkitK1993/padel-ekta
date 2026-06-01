// ── MATCH-TEXT PARSER ──────────────────────────────────────
// Pure parsing of the admin "add matches" textarea — no DOM, no Firebase.
// Like elo.js, it receives its app-state dependencies (the alias/name maps and
// today's date) via initParserDeps() so it never reaches into app globals.
// The maps are passed as GETTERS because app.js reassigns nameMap/aliasMap on
// data load — a getter always sees the current object.

let _getNameMap = () => ({});
let _getAliasMap = () => ({});
let _todayISO = () => new Date().toISOString().slice(0, 10);

export function initParserDeps(getNameMap, getAliasMap, todayFn) {
  if (getNameMap) _getNameMap = getNameMap;
  if (getAliasMap) _getAliasMap = getAliasMap;
  if (todayFn) _todayISO = todayFn;
}

// "D/M/YY" or "D/M/YYYY" date header → ISO "YYYY-MM-DD", else null.
export function parseDateHdr(s) {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let [, d, mo, y] = m;
  if (y.length === 2) y = "20" + y;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

// Resolve a free-text token to a canonical player name via the alias map.
function resolve(a) {
  const nameMap = _getNameMap();
  const raw = String(a || "").trim();
  if (!raw) return raw;
  if (nameMap[raw]) return nameMap[raw];
  const hit = Object.entries(nameMap).find(
    ([alias]) => alias.toLowerCase() === raw.toLowerCase(),
  );
  return hit ? hit[1] : raw;
}

// Resolve a 2-char initial like "Ni" → full name from aliasMap or nameMap.
function resolveInitial(init) {
  const nameMap = _getNameMap();
  const aliasMap = _getAliasMap();
  const key = String(init || "")
    .trim()
    .toLowerCase();
  if (!key) return null;

  const aliasExact = Object.entries(nameMap).find(
    ([alias]) => alias.toLowerCase() === key,
  );
  if (aliasExact) return aliasExact[1];

  const displayExact = Object.keys(aliasMap).find(
    (name) => name.toLowerCase() === key,
  );
  if (displayExact) return displayExact;

  // Prefix fallback — but only resolve if it's UNAMBIGUOUS. If two different
  // players share the prefix (e.g. "Ra" → both "Rahul M" and "Rahul G"),
  // return null so the line surfaces as a parse error instead of silently
  // being assigned to whichever player happened to come first.
  const aliasPrefixNames = new Set(
    Object.entries(nameMap)
      .filter(([alias]) => alias.toLowerCase().startsWith(key))
      .map(([, name]) => name),
  );
  if (aliasPrefixNames.size === 1) return [...aliasPrefixNames][0];
  if (aliasPrefixNames.size > 1) return null; // ambiguous

  const displayPrefixNames = Object.keys(aliasMap).filter((name) =>
    name.toLowerCase().startsWith(key),
  );
  if (displayPrefixNames.length === 1) return displayPrefixNames[0];
  return null; // none, or ambiguous
}

// Parse one match line → {teamA, teamB, scoreA, scoreB} or null.
function parseMatchLine(line) {
  line = line.trim().replace(/\s+/g, " ");

  // Shorthand format: NiGo v PaPu 6-1  (2-char initials, no spaces)
  const sh = line.match(
    /^([A-Za-z]{2})([A-Za-z]{2})\s+(?:vs?)\s+([A-Za-z]{2})([A-Za-z]{2})\s+(\d+)\s*[-–]\s*(\d+)$/i,
  );
  if (sh) {
    const r1 = resolveInitial(sh[1]),
      r2 = resolveInitial(sh[2]);
    const r3 = resolveInitial(sh[3]),
      r4 = resolveInitial(sh[4]);
    const sA = +sh[5],
      sB = +sh[6];
    if (r1 && r2 && r3 && r4 && !isNaN(sA) && !isNaN(sB) && sA !== sB) {
      return { teamA: [r1, r2], teamB: [r3, r4], scoreA: sA, scoreB: sB };
    }
  }

  // Standard format: Player1 Player2 vs Player3 Player4 6-1
  const m = line.match(/^(.+?)\s+(?:vs|v)\s+(.+?)\s+(\d+)\s*[-–]\s*(\d+)$/i);
  if (!m) return null;
  const tA = m[1].trim().split(" ").filter(Boolean),
    tB = m[2].trim().split(" ").filter(Boolean);
  const sA = +m[3],
    sB = +m[4];
  if (tA.length < 1 || tA.length > 2 || tB.length < 1 || tB.length > 2)
    return null;
  if (tA.length !== tB.length) return null;
  if (isNaN(sA) || isNaN(sB) || sA === sB) return null;
  return {
    teamA: tA.map(resolve),
    teamB: tB.map(resolve),
    scoreA: sA,
    scoreB: sB,
  };
}

// Parse a whole textarea block: date headers set the active date for the lines
// that follow. Returns { parsed: [{date, ...match}], errors: [{ln, text}] }.
export function parseBlock(raw) {
  const parsed = [],
    errors = [],
    cur = { d: _todayISO() };
  raw.split("\n").forEach((line, i) => {
    const t = line.trim();
    if (!t) return;
    const dt = parseDateHdr(t);
    if (dt) {
      cur.d = dt;
      return;
    }
    const m = parseMatchLine(t);
    if (m) parsed.push({ date: cur.d, ...m });
    else errors.push({ ln: i + 1, text: t });
  });
  return { parsed, errors };
}
