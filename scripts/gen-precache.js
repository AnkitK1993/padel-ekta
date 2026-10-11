"use strict";

// Generates precache.json — the list of files the service worker must hold for
// the app to start with no network — by walking the REAL import graph from the
// HTML entry points. The list used to be maintained by hand in sw.js and had
// drifted to 19 of 51 modules; generating it means a new module can never be
// forgotten, and `--check` (run by tests and CI) fails when the file is stale.
//
//   node scripts/gen-precache.js           # (re)write precache.json
//   node scripts/gen-precache.js --check   # exit 1 if precache.json is stale
//
// Paths are relative to the app root ("" is the root URL itself).

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "precache.json");

// The service worker is registered separately and never caches itself;
// buildinfo.json is the update probe and must always come from the network.
const NEVER_CACHE = new Set(["sw.js", "buildinfo.json", "precache.json"]);

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
}

// Relative specifiers imported by a JS module: static imports, re-exports and
// dynamic import("…") with a literal path.
function importsOf(text) {
  const code = stripComments(text);
  const found = new Set();
  const res = [
    /\bimport\s+(?:[^'"()]*?\bfrom\s+)?["']([^"']+)["']/g,
    /\bexport\s+(?:\*|\{[^}]*\})(?:\s+as\s+\w+)?\s+from\s+["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const re of res) {
    let m;
    while ((m = re.exec(code))) found.add(m[1]);
  }
  return [...found].filter((s) => s.startsWith("./") || s.startsWith("../"));
}

// Local files an HTML page pulls in (scripts, stylesheets, icons, manifest).
function assetsOfHtml(text) {
  const out = new Set();
  const re = /\b(?:src|href)\s*=\s*["']([^"'#?]+)(?:[?#][^"']*)?["']/g;
  let m;
  while ((m = re.exec(text))) {
    const ref = m[1];
    if (/^(?:[a-z]+:|\/\/|data:|mailto:|tel:)/i.test(ref)) continue;
    out.add(ref.replace(/^\.\//, ""));
  }
  return [...out];
}

function build() {
  const files = new Set([""]); // the root URL itself
  const queue = [];
  const add = (rel) => {
    if (!rel || NEVER_CACHE.has(rel) || files.has(rel)) return;
    if (!fs.existsSync(path.join(ROOT, rel))) {
      throw new Error(`precache: ${rel} is referenced but does not exist`);
    }
    files.add(rel);
    queue.push(rel);
  };

  add("index.html");
  while (queue.length) {
    const rel = queue.shift();
    const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
    if (rel.endsWith(".html")) {
      assetsOfHtml(text).forEach(add);
    } else if (rel.endsWith(".json") && path.basename(rel) === "manifest.json") {
      const manifest = JSON.parse(text);
      (manifest.icons || []).forEach((i) => add(i.src.replace(/^\.\//, "")));
    } else if (rel.endsWith(".js")) {
      const dir = path.dirname(rel);
      for (const spec of importsOf(text)) {
        add(path.posix.normalize(path.posix.join(dir.split(path.sep).join("/"), spec)));
      }
    }
  }
  return [...files].sort();
}

function serialise(list) {
  return JSON.stringify({ files: list }, null, 2) + "\n";
}

if (require.main === module) {
  const next = serialise(build());
  if (process.argv.includes("--check")) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
    if (cur !== next) {
      console.error(
        "precache.json is stale — a module was added/removed/renamed. Run: node scripts/gen-precache.js",
      );
      process.exit(1);
    }
    console.log(`precache.json is up to date (${JSON.parse(next).files.length} files)`);
  } else {
    fs.writeFileSync(OUT, next);
    console.log(`precache.json: ${JSON.parse(next).files.length} files`);
  }
}

module.exports = { build, importsOf, assetsOfHtml };
