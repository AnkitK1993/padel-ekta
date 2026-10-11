// tests-precache.mjs — the service worker's offline file list is generated
// from the real import graph, and must stay that way.
// Run: node tests/tests-precache.mjs   (also part of `npm test`)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { build, importsOf, assetsOfHtml } = require("../scripts/gen-precache.js");
const esbuild = require("esbuild");

let pass = 0,
  fail = 0;
function ok(name, cond, detail) {
  if (cond) {
    process.stdout.write(`  \x1b[32m✓\x1b[0m ${name}\n`);
    pass++;
  } else {
    process.stdout.write(`  \x1b[31m✗\x1b[0m ${name}\n    \x1b[33m${detail || ""}\x1b[0m\n`);
    fail++;
  }
}

console.log("\n\x1b[36m── precache.json ───────────────────────────────────────\x1b[0m");

const generated = build();
const committed = JSON.parse(fs.readFileSync(path.join(ROOT, "precache.json"), "utf8")).files;

ok(
  "precache.json is up to date (run: node scripts/gen-precache.js)",
  JSON.stringify(generated) === JSON.stringify(committed),
  `generated ${generated.length} files, committed ${committed.length}`,
);
ok(
  "every precached file exists",
  committed.filter((f) => f !== "").every((f) => fs.existsSync(path.join(ROOT, f))),
);

// Independent oracle: the module graph esbuild itself resolves from app.js.
const meta = await esbuild.build({
  entryPoints: [path.join(ROOT, "app.js")],
  bundle: true,
  write: false,
  metafile: true,
  format: "esm",
  logLevel: "silent",
  external: ["https://*"],
  outdir: path.join(ROOT, "dist-unused"),
});
const graph = Object.keys(meta.metafile.inputs).filter((f) => !f.startsWith("http"));
const missing = graph.filter((f) => !committed.includes(f));
ok(
  `every module in the real import graph is precached (${graph.length} modules)`,
  missing.length === 0,
  `missing: ${missing.join(", ")}`,
);
const jsListed = committed.filter((f) => f.endsWith(".js") && f !== "utils.js");
ok(
  "nothing precached that the app doesn't import",
  jsListed.every((f) => graph.includes(f)),
  jsListed.filter((f) => !graph.includes(f)).join(", "),
);

console.log("\n\x1b[36m── the parser behind it ────────────────────────────────\x1b[0m");
ok(
  "finds static, re-export and dynamic imports; ignores comments and URLs",
  JSON.stringify(
    importsOf(`
      import a from "./a.js";
      import { b } from "../b.js";
      import "./side.js";
      export { c } from "./c.js";
      export * from "./d.js";
      const e = import("./e.js");
      import f from "https://cdn/x.js";
      // import g from "./commented.js";
      /* import h from "./block.js"; */
    `).sort(),
  ) === JSON.stringify(["../b.js", "./a.js", "./c.js", "./d.js", "./e.js", "./side.js"]),
);
ok(
  "reads local assets from HTML and skips external ones",
  JSON.stringify(
    assetsOfHtml(
      `<link rel="stylesheet" href="styles.css"><script src="app.js"></script><img src="https://x/y.png"><a href="#top">`,
    ).sort(),
  ) === JSON.stringify(["app.js", "styles.css"]),
);

console.log(
  `\n\x1b[1mPrecache: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`,
);
process.exit(fail ? 1 : 0);
