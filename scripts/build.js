"use strict";

// ─────────────────────────────────────────────────────────────
// Production build: copies the deployable app into dist/, minifying
// every JS and CSS file IN PLACE (same filenames, same relative paths —
// no bundling, no code-splitting). This is deliberate: the app has no
// bundler by design (see project notes on the deferred view-state
// migration), and every import/<script src>/<link href> in the source
// already references the exact filenames minification preserves, so the
// ES module graph and the service worker's path-based cache (sw.js's
// STATIC list + stale-while-revalidate keyed on request.url, not content
// hash) both keep working unmodified.
//
// index.html and manifest.json/icons are copied as-is (not minified) —
// they're a small fraction of payload next to app.js/styles.css, and
// leaving index.html's inline onclick attributes untouched avoids the
// extra risk surface of an HTML minifier for a comparatively small win.
//
// Run: node scripts/build.js  (invoked in CI by the Deploy workflow;
// safe to run locally too — only ever writes into dist/, never touches
// the real source files).
// ─────────────────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");

const EXCLUDE_TOP = new Set([
  ".git",
  "dist",
  "node_modules",
  "tests",
  "scripts",
  ".github",
  ".claude",
  ".vscode",
  "package.json",
  "package-lock.json",
  ".gitignore",
  "css-coverage-report.json",
]);

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function walkFiles(dir, exts) {
  let out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out = out.concat(walkFiles(p, exts));
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(p);
  }
  return out;
}

function main() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // 1. Copy everything except dev-only tooling/config into dist/.
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (EXCLUDE_TOP.has(entry.name)) continue;
    const s = path.join(ROOT, entry.name);
    const d = path.join(DIST, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }

  // 2. Minify every .js file (app.js, sw.js, all of src/ and features/) IN
  // PLACE — same filename, transformed content. No --bundle, so import/
  // export statements are preserved exactly as written.
  //
  // utils.js is deliberately EXCLUDED: it's a classic (non-module) script
  // whose top-level `function name(){}` declarations become implicit
  // window globals — real browser behaviour, unaffected by minification.
  // But scripts/handler-audit.mjs detects those globals via a line-start
  // regex (`^\s{0,8}function\s+`) specifically for utils.js, and a minifier
  // collapsing the file to one line breaks that detection (false positive:
  // "not exposed on window", even though it genuinely still is at runtime).
  // utils.js is only 24KB raw — not worth risking a verification-tooling
  // false positive on every future deploy to save a few KB.
  const jsFiles = [
    path.join(DIST, "app.js"),
    path.join(DIST, "sw.js"),
    ...walkFiles(path.join(DIST, "src"), [".js"]),
    ...walkFiles(path.join(DIST, "features"), [".js"]),
  ].filter((f) => fs.existsSync(f));

  let jsBefore = 0, jsAfter = 0;
  for (const f of jsFiles) {
    const before = fs.readFileSync(f, "utf8");
    const result = esbuild.transformSync(before, {
      loader: "js",
      minify: true,
      target: "es2020",
    });
    fs.writeFileSync(f, result.code);
    jsBefore += before.length;
    jsAfter += result.code.length;
  }

  // 3. Minify styles.css the same way.
  const cssFile = path.join(DIST, "styles.css");
  const cssBefore = fs.readFileSync(cssFile, "utf8");
  const cssResult = esbuild.transformSync(cssBefore, { loader: "css", minify: true });
  fs.writeFileSync(cssFile, cssResult.code);

  console.log(`Built dist/ — ${jsFiles.length} JS files: ${(jsBefore / 1024).toFixed(0)}KB -> ${(jsAfter / 1024).toFixed(0)}KB`);
  console.log(`styles.css: ${(cssBefore.length / 1024).toFixed(0)}KB -> ${(cssResult.code.length / 1024).toFixed(0)}KB`);
}

main();
