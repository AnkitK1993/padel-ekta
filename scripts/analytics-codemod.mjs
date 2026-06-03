// Temporary dev tool (acorn) — NOT shipped. Drives the analytics code-split:
//   node scripts/analytics-codemod.mjs analyze   → dep inventory + fn bounds
//   node scripts/analytics-codemod.mjs extract    → (later) perform the move
//
// Precedent: the `players` global migration used the same acorn-codemod approach,
// then removed the tooling to keep the project zero-dependency. Do the same here.
import fs from "node:fs";
import * as acorn from "acorn";
import * as walk from "acorn-walk";

const SRC = "app.js";
const code = fs.readFileSync(SRC, "utf8");
const ast = acorn.parse(code, { ecmaVersion: "latest", sourceType: "module" });

// The analytics-page subsystem (curated; excludes the interleaved non-analytics
// builders: _buildCloudPayload, _buildStreakCalendarHtml [player detail],
// _buildDigestContent, _buildSessionLeaderboard, _buildBannerContent).
const ANALYTICS_FNS = new Set([
  "getMatrixAlias", "_h2hSortPlayers", "_h2hSetSort", "buildH2HMatrixCompact",
  "_h2hHighlightRow", "_pairMatrixSetPeriod", "_pairMatrixSetMode",
  "_buildPairMatrixHtml", "_pairMatrixInner", "_tabbedSection", "_anaSubTab",
  "_secBody", "_computeRankPeriods", "_buildPodiumTrackerHtml",
  "_buildAntiPodiumTrackerHtml", "_buildRankReignHtml", "_buildRankTimelineHtml",
  "_antiPodiumSetPeriod", "_reignSetPeriod", "_timelineSetPeriod",
  "_buildPowerRankingsHtml", "_buildChemistryLeaderboardHtml",
  "_buildMatchPredictHtml", "_buildStoryFeedHtml", "_buildSeasonModeHtml",
  "_buildStreakLeaderboardHtml", "_buildBiggestUpsetsHtml",
  "_buildUpcomingMilestonesHtml", "_buildSeasonComparisonHtml",
  "_buildRadarCompareHtml", "_buildLeaderboardReplayHtml", "renderAnalyticsPage",
  "applyAnalyticsAnimations",
]);

// Names app.js imports from ./src/* (the module can import these directly).
const SRC_IMPORTS = new Set();
for (const node of ast.body) {
  if (node.type === "ImportDeclaration" && /^\.\/src\//.test(node.source.value)) {
    for (const s of node.specifiers) SRC_IMPORTS.add(s.local.name);
  }
}

// Top-level function declarations, with byte bounds.
const topFns = new Map();
for (const node of ast.body) {
  if (node.type === "FunctionDeclaration" && node.id) {
    topFns.set(node.id.name, { start: node.start, end: node.end, node });
  }
}

// JS globals + browser APIs that are never deps to inject.
const GLOBALS = new Set([
  "window", "document", "console", "Math", "JSON", "Object", "Array", "String",
  "Number", "Boolean", "Date", "Set", "Map", "WeakMap", "Promise", "RegExp",
  "Error", "parseInt", "parseFloat", "isNaN", "isFinite", "Infinity", "NaN",
  "undefined", "null", "true", "false", "setTimeout", "clearTimeout",
  "setInterval", "clearInterval", "requestAnimationFrame", "requestIdleCallback",
  "localStorage", "navigator", "location", "performance", "structuredClone",
  "Intl", "Symbol", "arguments", "this", "globalThis", "encodeURIComponent",
  "decodeURIComponent", "fetch", "URL", "URLSearchParams", "Blob",
]);

// Collect bound names (params + declarations, all nested scopes flattened) and
// referenced identifiers within a function subtree.
function analyzeFn(node) {
  const bound = new Set();
  const referenced = new Set();
  const addParams = (params) => {
    for (const p of params) collectPatternNames(p, bound);
  };
  walk.full(node, (n) => {
    if (n.type === "VariableDeclarator") collectPatternNames(n.id, bound);
    else if (n.type === "FunctionDeclaration" && n.id) bound.add(n.id.name);
    else if (n.type === "ClassDeclaration" && n.id) bound.add(n.id.name);
    else if (n.type === "CatchClause" && n.param) collectPatternNames(n.param, bound);
    if ((n.type === "FunctionDeclaration" || n.type === "FunctionExpression" || n.type === "ArrowFunctionExpression"))
      addParams(n.params);
  });
  // Referenced identifiers in value position (skip property keys, member props).
  walk.ancestor(node, {
    Identifier(n, _state, ancestors) {
      const parent = ancestors[ancestors.length - 2];
      if (!parent) return;
      if (parent.type === "MemberExpression" && parent.property === n && !parent.computed) return;
      if (parent.type === "Property" && parent.key === n && !parent.computed) return;
      if ((parent.type === "FunctionDeclaration" || parent.type === "FunctionExpression" || parent.type === "ArrowFunctionExpression" || parent.type === "ClassDeclaration") && parent.id === n) return;
      if (parent.type === "VariableDeclarator" && parent.id === n) return;
      referenced.add(n.name);
    },
  });
  return { bound, referenced };
}
function collectPatternNames(pat, out) {
  if (!pat) return;
  switch (pat.type) {
    case "Identifier": out.add(pat.name); break;
    case "ObjectPattern": pat.properties.forEach((p) => collectPatternNames(p.value || p.argument, out)); break;
    case "ArrayPattern": pat.elements.forEach((e) => e && collectPatternNames(e, out)); break;
    case "AssignmentPattern": collectPatternNames(pat.left, out); break;
    case "RestElement": collectPatternNames(pat.argument, out); break;
  }
}

// Attribute every identifier reference in the file to the top-level function
// that encloses it (or "<top>" for module-level code), tagging analytics vs not.
function ownershipCounts() {
  const counts = new Map(); // name → { ana, other }
  walk.ancestor(ast, {
    Identifier(n, _s, ancestors) {
      const parent = ancestors[ancestors.length - 2];
      if (parent) {
        if (parent.type === "MemberExpression" && parent.property === n && !parent.computed) return;
        if (parent.type === "Property" && parent.key === n && !parent.computed) return;
      }
      // enclosing top-level FunctionDeclaration = ancestors[1] when it's a child of Program
      let ownerAnalytics = false;
      const top = ancestors[1];
      if (top && top.type === "FunctionDeclaration" && top.id && ANALYTICS_FNS.has(top.id.name))
        ownerAnalytics = true;
      const c = counts.get(n.name) || { ana: 0, other: 0 };
      if (ownerAnalytics) c.ana++; else c.other++;
      counts.set(n.name, c);
    },
  });
  return counts;
}

// Find identifiers REASSIGNED (= / += / ++ etc.) inside analytics fns. These are
// the only true blockers: if such a symbol is also used outside analytics and is
// a primitive (not an in-place-mutated object), a read-only import won't do — it
// needs to move into the module or use a setter.
function reassignedInAnalytics() {
  const out = new Set();
  for (const name of ANALYTICS_FNS) {
    const fn = topFns.get(name);
    if (!fn) continue;
    walk.full(fn.node, (n) => {
      if (n.type === "AssignmentExpression" && n.left.type === "Identifier") out.add(n.left.name);
      if (n.type === "UpdateExpression" && n.argument.type === "Identifier") out.add(n.argument.name);
    });
  }
  // subtract names locally bound somewhere in those fns (params/decls) — keep only
  // those that are module-scoped (i.e., not declared inside any analytics fn).
  const locallyDeclared = new Set();
  for (const name of ANALYTICS_FNS) {
    const fn = topFns.get(name);
    if (!fn) continue;
    const { bound } = analyzeFn(fn.node);
    bound.forEach((b) => locallyDeclared.add(b));
  }
  return [...out].filter((n) => !ANALYTICS_FNS.has(n));
}

const cmd = process.argv[2] || "analyze";

if (cmd === "writes") {
  const counts = ownershipCounts();
  const reassigned = reassignedInAnalytics();
  console.log("\n── Reassigned inside analytics fns (module would WRITE these) ──");
  for (const d of reassigned.sort()) {
    const c = counts.get(d) || { ana: 0, other: 0 };
    const elsewhere = c.other > 1; // >1 means used beyond its own declaration
    console.log(`${d.padEnd(24)} usedElsewhere=${elsewhere ? "YES(" + c.other + ")" : "no"}  srcImport=${SRC_IMPORTS.has(d)}`);
  }
}

if (cmd === "ownership") {
  // Recompute the app-local dep set (same as analyze).
  const appLocal = new Set();
  for (const name of ANALYTICS_FNS) {
    const fn = topFns.get(name);
    if (!fn) continue;
    const { bound, referenced } = analyzeFn(fn.node);
    for (const r of referenced)
      if (!bound.has(r) && !GLOBALS.has(r) && !ANALYTICS_FNS.has(r) && !SRC_IMPORTS.has(r))
        appLocal.add(r);
  }
  const counts = ownershipCounts();
  const relocate = [], importRead = [];
  for (const d of [...appLocal].sort()) {
    const c = counts.get(d) || { ana: 0, other: 0 };
    // "other" includes the symbol's own declaration site (top-level), so a
    // declared-once analytics-only symbol shows other===1 (its declaration).
    if (c.other <= 1) relocate.push(`${d}`);
    else importRead.push(`${d}(${c.other})`);
  }
  console.log(`\n── RELOCATE into module (analytics-only, ${relocate.length}) ──`);
  console.log(relocate.join("  "));
  console.log(`\n── KEEP in app.js, import/expose (used elsewhere too, ${importRead.length}) ──`);
  console.log(importRead.join("  "));
}

if (cmd === "analyze") {
  const missing = [...ANALYTICS_FNS].filter((n) => !topFns.has(n));
  if (missing.length) console.log("⚠ not found as top-level fns:", missing.join(", "));

  const allDeps = new Map(); // dep name → count of analytics fns referencing it
  for (const name of ANALYTICS_FNS) {
    const fn = topFns.get(name);
    if (!fn) continue;
    const { bound, referenced } = analyzeFn(fn.node);
    for (const r of referenced) {
      if (bound.has(r) || GLOBALS.has(r) || ANALYTICS_FNS.has(r)) continue;
      allDeps.set(r, (allDeps.get(r) || 0) + 1);
    }
  }
  const deps = [...allDeps.entries()].sort((a, b) => b[1] - a[1]);
  const fromSrc = deps.filter(([d]) => SRC_IMPORTS.has(d));
  const appLocal = deps.filter(([d]) => !SRC_IMPORTS.has(d));

  const totalBytes = [...ANALYTICS_FNS].reduce((s, n) => s + (topFns.has(n) ? topFns.get(n).end - topFns.get(n).start : 0), 0);
  console.log(`\nAnalytics fns: ${ANALYTICS_FNS.size}  ·  ~${(totalBytes / 1024).toFixed(0)} KB / ${code.slice(0, ast.end).length ? (totalBytes / code.length * 100).toFixed(1) : "?"}% of app.js\n`);
  console.log(`── IMPORT FROM src/ (${fromSrc.length}) ──`);
  console.log(fromSrc.map(([d, c]) => `${d}(${c})`).join("  "));
  console.log(`\n── INJECT (app-local, ${appLocal.length}) ──`);
  console.log(appLocal.map(([d, c]) => `${d}(${c})`).join("  "));
}
