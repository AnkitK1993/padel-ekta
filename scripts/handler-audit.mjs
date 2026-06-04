// Static guard: every inline event-handler (onclick=…) referenced in any
// rendered HTML must resolve to a function exposed on the global scope. app.js
// is an ES module, so a module-scoped fn referenced from inline HTML throws
// "X is not defined" at CLICK time — invisible to unit tests and to the
// analytics snapshot (which only sees handlers present in its fixture DOM).
// This catches that whole class at build time. Run: node scripts/handler-audit.mjs
import fs from "fs";
import path from "path";
const read = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return ""; } };
const walk = (d) => fs.existsSync(d) ? fs.readdirSync(d, {withFileTypes:true}).flatMap(e => e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]) : [];
const jsFiles = ["app.js","utils.js",...walk("src").filter(f=>f.endsWith(".js")),...walk("features").filter(f=>f.endsWith(".js"))];
const htmlFiles = ["index.html"];

const EVENTS = "onclick|onchange|oninput|onsubmit|onkeydown|onkeyup|onfocus|onblur|onmousedown|ontouchstart|onpointerdown";
const attrDq = new RegExp("(?:"+EVENTS+")\s*=\s*\"([^\"]*)\"", "g");
const attrSq = new RegExp("(?:"+EVENTS+")\s*=\s*'([^']*)'", "g");
const callRe = /(?:^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g;
const stripInterp = (s) => s.replace(/\$\{[\s\S]*?\}/g, ""); // remove build-time ${...}

const handlers = new Map();
const addCalls = (body, f) => { let c; const clean = stripInterp(body); while ((c = callRe.exec(clean))) { const n=c[1]; if(!handlers.has(n)) handlers.set(n,new Set()); handlers.get(n).add(f); } };
for (const f of [...jsFiles, ...htmlFiles]) {
  const txt = read(f); let m;
  while ((m = attrDq.exec(txt))) addCalls(m[1], f);
  while ((m = attrSq.exec(txt))) addCalls(m[1], f);
}

const exposed = new Set();
const app = read("app.js");
for (const blk of app.matchAll(/Object\.assign\(\s*window\s*,\s*\{([\s\S]*?)\}\s*\)/g))
  for (const id of blk[1].matchAll(/([A-Za-z_$][\w$]*)\s*[,:}\n]/g)) exposed.add(id[1]);
// window.X = anywhere, INCLUDING index.html inline scripts
for (const f of [...jsFiles, ...htmlFiles]) for (const w of read(f).matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)) exposed.add(w[1]);
// utils.js is a classic script => top-level fns/vars are global
const utils = read("utils.js");
for (const fn of utils.matchAll(/^\s{0,8}function\s+([A-Za-z_$][\w$]*)/gm)) exposed.add(fn[1]);
for (const v of utils.matchAll(/^\s{0,8}var\s+([A-Za-z_$][\w$]*)\s*=/gm)) exposed.add(v[1]);

const KW = new Set(["if","for","while","return","typeof","function","new","else","switch","case","catch","void","do","try","throw","delete","instanceof","in","of","await","yield","this","event","true","false","null","undefined","Math","JSON","Object","Array","Number","String","Boolean","Date","window","document","console","parseInt","parseFloat","setTimeout","setInterval","clearTimeout","alert","confirm","prompt","requestAnimationFrame"]);
const missing = [...handlers.entries()].filter(([n]) => !exposed.has(n) && !KW.has(n)).sort();

if (missing.length) {
  console.error("✗ Inline handler(s) referenced but NOT exposed on window (throw on user tap):");
  for (const [n, files] of missing) console.error("    " + n.padEnd(26) + " <- " + [...files].join(", "));
  process.exit(1);
}
console.log(`✓ handler-audit: all ${handlers.size} inline handlers resolve to an exposed global`);
