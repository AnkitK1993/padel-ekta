// ── MATCH-TEXT PARSER ──────────────────────────────────────
// Pure parsing of the admin "add matches" textarea — no DOM, no Firebase.
// Like other engine modules, it receives its app-state dependencies (the alias/name maps and
// today's date) via initParserDeps() so it never reaches into app globals.
// The maps are passed as GETTERS because app.js reassigns nameMap/aliasMap on
// data load — a getter always sees the current object.

let _getNameMap = () => ({});
let _getAliasMap = () => ({});
let _todayISO = () => new Date().toISOString().slice(0, 10);

// ✅ Compile regex patterns once at module load (performance optimization)
const _REGEX_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
const _REGEX_SHORTHAND =
  /^([A-Za-z]{2})([A-Za-z]{2})\s+(?:vs?)\s+([A-Za-z]{2})([A-Za-z]{2})\s+(\d+)\s*[-–]\s*(\d+)$/i;
const _REGEX_ALIAS = /^(\S+)\s+(\S+)\s+(\d+)\s*[-–]\s*(\d+)\s+(\S+)\s+(\S+)$/i;
const _REGEX_STANDARD = /^(.+?)\s+(?:vs|v)\s+(.+?)\s+(\d+)\s*[-–]\s*(\d+)$/i;

export function initParserDeps(getNameMap, getAliasMap, todayFn) {
  if (getNameMap) _getNameMap = getNameMap;
  if (getAliasMap) _getAliasMap = getAliasMap;
  if (todayFn) _todayISO = todayFn;
}

// "D/M/YY" or "D/M/YYYY" date header → ISO "YYYY-MM-DD", else null.
export function parseDateHdr(s) {
  const m = s.trim().match(_REGEX_DATE);
  if (!m) return null;
  let [, d, mo, y] = m;
  const dn = Number(d),
    mn = Number(mo);
  if (dn < 1 || dn > 31 || mn < 1 || mn > 12) return null;
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

// Parse one match line → {match, reason?} where match is {teamA, teamB, scoreA, scoreB} or null on error.
function parseMatchLine(line) {
  line = line.trim().replace(/\s+/g, " ");

  // Shorthand format: NiGo v PaPu 6-1  (2-char initials, no spaces)
  const sh = line.match(_REGEX_SHORTHAND);
  if (sh) {
    const r1 = resolveInitial(sh[1]),
      r2 = resolveInitial(sh[2]);
    const r3 = resolveInitial(sh[3]),
      r4 = resolveInitial(sh[4]);
    const sA = +sh[5],
      sB = +sh[6];
    if (!r1) return { reason: `Player 1 ('${sh[1]}') not found or ambiguous` };
    if (!r2) return { reason: `Player 2 ('${sh[2]}') not found or ambiguous` };
    if (!r3) return { reason: `Player 3 ('${sh[3]}') not found or ambiguous` };
    if (!r4) return { reason: `Player 4 ('${sh[4]}') not found or ambiguous` };
    if (isNaN(sA) || isNaN(sB)) return { reason: `Invalid score: ${sA}-${sB}` };
    if (sA === sB) return { reason: `Scores cannot be equal: ${sA}-${sB}` };
    return {
      match: { teamA: [r1, r2], teamB: [r3, r4], scoreA: sA, scoreB: sB },
    };
  }

  // Alias format: A1 A2 6-2 A3 A4 (no vs, score in the middle)
  const af = line.match(_REGEX_ALIAS);
  if (af) {
    const r1 = resolveInitial(af[1]),
      r2 = resolveInitial(af[2]);
    const r3 = resolveInitial(af[5]),
      r4 = resolveInitial(af[6]);
    const sA = +af[3],
      sB = +af[4];
    if (!r1) return { reason: `Player 1 ('${af[1]}') not found or ambiguous` };
    if (!r2) return { reason: `Player 2 ('${af[2]}') not found or ambiguous` };
    if (!r3) return { reason: `Player 3 ('${af[5]}') not found or ambiguous` };
    if (!r4) return { reason: `Player 4 ('${af[6]}') not found or ambiguous` };
    if (isNaN(sA) || isNaN(sB)) return { reason: `Invalid score: ${sA}-${sB}` };
    if (sA === sB) return { reason: `Scores cannot be equal: ${sA}-${sB}` };
    return {
      match: { teamA: [r1, r2], teamB: [r3, r4], scoreA: sA, scoreB: sB },
    };
  }

  // Standard format: Player1 Player2 vs Player3 Player4 6-1
  const m = line.match(_REGEX_STANDARD);
  if (!m) return { reason: "Could not parse match format" };
  const tA = m[1].trim().split(" ").filter(Boolean),
    tB = m[2].trim().split(" ").filter(Boolean);
  const sA = +m[3],
    sB = +m[4];
  if (tA.length < 1 || tA.length > 2 || tB.length < 1 || tB.length > 2)
    return {
      reason: `Each team must have 1–2 players. Found ${tA.length} vs ${tB.length}.`,
    };
  if (tA.length !== tB.length)
    return {
      reason: `Teams have different player counts: ${tA.length} vs ${tB.length}.`,
    };
  if (isNaN(sA) || isNaN(sB)) return { reason: `Invalid score: ${sA}-${sB}` };
  if (sA === sB) return { reason: `Scores cannot be equal: ${sA}-${sB}` };
  return {
    match: {
      teamA: tA.map(resolve),
      teamB: tB.map(resolve),
      scoreA: sA,
      scoreB: sB,
    },
  };
}

// Parse a whole textarea block: date headers set the active date for the lines
// that follow. Returns { parsed: [{date, ...match}], errors: [{ln, text, reason?}] }.
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
    const result = parseMatchLine(t);
    if (result.match) {
      parsed.push({ date: cur.d, ...result.match });
    } else {
      // ✅ Include error reason for user feedback
      errors.push({ ln: i + 1, text: t, reason: result.reason });
    }
  });
  return { parsed, errors };
}
