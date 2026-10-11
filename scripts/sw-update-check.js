"use strict";

// End-to-end test of the offline/update flow in a real browser, with two
// "deploys" served from a temp directory:
//
//   1. First visit: the service worker precaches EVERY module in
//      precache.json and records the build it holds.
//   2. A new deploy (changed module + a new file, new build stamp): an update
//      check downloads the whole new set, swaps it in, tells the page
//      (NEW_BUILD -> "tap to refresh" banner) and replies to the caller.
//   3. A second check finds nothing to do.
//   4. A deploy where one file fails to download is NOT applied: the cache
//      stays on the previous build, entirely intact (no half-updated app).
//   5. The page can say which build it is running.
//
//   node scripts/sw-update-check.js
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");
const {
  ROOT,
  findBrowser,
  connectCdp,
  getJson,
  listen,
  delay,
  waitFor,
  evaluate,
  FIREBASE_STUB,
  CONTENT_TYPES,
} = require("./_test-harness.js");
const { build } = require("./gen-precache.js");

let pass = 0;
let fail = 0;
function ok(label, cond, detail) {
  if (cond) pass++;
  else {
    fail++;
    process.stdout.write(`  \x1b[31m✗\x1b[0m ${label}${detail ? `\n      \x1b[33m${detail}\x1b[0m` : ""}\n`);
  }
}

// --dist tests the PRODUCTION build (minified sw.js and modules in dist/)
// instead of the source tree: `npm run build && node scripts/sw-update-check.js --dist`
const SRC = process.argv.includes("--dist") ? path.join(ROOT, "dist") : ROOT;

function copyFile(rel, dest) {
  const to = path.join(dest, rel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(path.join(SRC, rel), to);
}

async function main() {
  // The "site": exactly the files a deploy would ship.
  const site = fs.mkdtempSync(path.join(os.tmpdir(), "padel-sw-site-"));
  const files = build().filter((f) => f !== "");
  [...files, "sw.js", "precache.json"].forEach((f) => copyFile(f, site));
  const stamp = (ms) => {
    fs.writeFileSync(path.join(site, "buildinfo.json"), JSON.stringify({ v: ms }));
    const html = fs.readFileSync(path.join(SRC, "index.html"), "utf8").replace(/__BUILD__/g, String(ms));
    fs.writeFileSync(path.join(site, "index.html"), html);
  };
  const buildA = Date.now();
  stamp(buildA);

  let failFile = null; // path the server should 500 on (simulates a dropped download)
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname === "/src/infra/cloud/firebase.js") {
      res.writeHead(200, { "Content-Type": "text/javascript" });
      return res.end(FIREBASE_STUB);
    }
    if (failFile && url.pathname === failFile) {
      res.writeHead(500);
      return res.end("boom");
    }
    let p = path.join(site, decodeURIComponent(url.pathname));
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
    fs.readFile(p, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end("nf");
      }
      res.writeHead(200, {
        "Content-Type": CONTENT_TYPES[path.extname(p).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(data);
    });
  });
  const port = await listen(server);

  const debugPort = 9500 + Math.floor(Math.random() * 400);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "padel-sw-chrome-"));
  const chrome = spawn(
    findBrowser(),
    [
      "--headless=new",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  let client;
  try {
    const targets = await getJson(`http://127.0.0.1:${debugPort}/json/list`);
    client = await connectCdp((targets.find((t) => t.type === "page") || targets[0]).webSocketDebuggerUrl);
    await client.send("Runtime.enable");
    await client.send("Page.enable");
    await client.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `localStorage.setItem("padel_forced_offline", "1");`,
    });
    await client.send("Page.navigate", { url: `http://127.0.0.1:${port}/index.html` });
    await waitFor(client, 'document.body.classList.contains("splash-done")', "app boot", 30000);
    await waitFor(
      client,
      `navigator.serviceWorker.controller !== null`,
      "service worker controlling the page",
      30000,
    );

    const cacheState = () =>
      evaluate(
        client,
        `(async () => {
          const names = await caches.keys();
          const staticName = names.find((n) => n.startsWith("ekta-padel-static") && !n.endsWith("-staging"));
          const c = await caches.open(staticName);
          const keys = (await c.keys()).map((r) => new URL(r.url).pathname);
          const stamp = await (await c.match("/__buildv__"))?.text();
          const peek = async (p) => (await (await c.match(p))?.text()) || null;
          return { names, keys, stamp, dates: await peek("/src/domain/dates.js") };
        })()`,
      );
    const check = () =>
      evaluate(
        client,
        `new Promise((resolve) => {
          const ch = new MessageChannel();
          ch.port1.onmessage = (e) => resolve(e.data);
          navigator.serviceWorker.controller.postMessage({ type: "CHECK_UPDATE" }, [ch.port2]);
        })`,
      );

    // ── 1. first visit precaches everything ─────────────────────────────
    const need = files.map((f) => "/" + f);
    let st = await cacheState();
    const missing = need.filter((f) => !st.keys.includes(f));
    ok(`first visit: all ${need.length} precache files are cached`, missing.length === 0, `missing: ${missing.join(", ")}`);
    ok("first visit: cache records the build it holds", st.stamp === String(buildA), `stamp ${st.stamp}`);
    ok("only one static cache exists after install", st.names.filter((n) => n.startsWith("ekta-padel-static")).length === 1, st.names.join(","));

    // ── 5. the page knows which build it runs ───────────────────────────
    const label = await evaluate(client, `window.appBuildLabel()`);
    ok("page reports its build (not 'dev')", label !== "dev" && /\d/.test(label), label);
    ok(
      "menu shows the build",
      (await evaluate(client, `document.getElementById("build-label").textContent`)).includes("Build "),
    );

    // ── 3a. nothing new yet ─────────────────────────────────────────────
    let r = await check();
    ok("no new deploy: check reports up to date", r && r.updated === false && r.error === false, JSON.stringify(r));

    // ── 2. a new deploy arrives ─────────────────────────────────────────
    const buildB = buildA + 86400000;
    const datesPath = path.join(site, "src/domain/dates.js");
    fs.writeFileSync(datesPath, fs.readFileSync(datesPath, "utf8") + "\n/* build B marker */\n");
    fs.writeFileSync(path.join(site, "src/domain/brand-new.js"), "export const x = 1;\n");
    const pc = JSON.parse(fs.readFileSync(path.join(site, "precache.json"), "utf8"));
    pc.files = [...pc.files, "src/domain/brand-new.js"].sort();
    fs.writeFileSync(path.join(site, "precache.json"), JSON.stringify(pc));
    stamp(buildB);

    r = await check();
    ok("new deploy: check downloads and applies it", r && r.updated === true && r.error === false, JSON.stringify(r));
    st = await cacheState();
    ok("new deploy: changed module is the new one", (st.dates || "").includes("build B marker"));
    ok("new deploy: a file added in the new build is cached", st.keys.includes("/src/domain/brand-new.js"));
    ok("new deploy: cache records the new build", st.stamp === String(buildB), `stamp ${st.stamp}`);
    ok("new deploy: no staging cache left behind", !st.names.some((n) => n.endsWith("-staging")), st.names.join(","));
    await waitFor(client, `!!document.getElementById("update-banner")`, "update banner", 5000).catch(() => {});
    ok(
      "new deploy: the page shows the 'tap to refresh' banner",
      await evaluate(client, `!!document.getElementById("update-banner")`),
    );

    // ── 3b. already applied ─────────────────────────────────────────────
    r = await check();
    ok("after applying: a second check finds nothing to do", r && r.updated === false && r.error === false, JSON.stringify(r));

    // ── 4. a deploy that fails to download is not applied ───────────────
    const buildC = buildB + 86400000;
    fs.writeFileSync(datesPath, fs.readFileSync(datesPath, "utf8") + "\n/* build C marker */\n");
    stamp(buildC);
    failFile = "/src/domain/stats.js";
    r = await check();
    ok("failed download: reported as an error, not applied", r && r.updated === false && r.error === true, JSON.stringify(r));
    st = await cacheState();
    ok("failed download: cache still holds build B in full", st.stamp === String(buildB) && !(st.dates || "").includes("build C marker") && st.keys.includes("/src/domain/stats.js"), `stamp ${st.stamp}`);
    ok("failed download: staging cache cleaned up", !st.names.some((n) => n.endsWith("-staging")), st.names.join(","));
    failFile = null;
    r = await check();
    ok("download recovers on the next check", r && r.updated === true, JSON.stringify(r));

    // ── reload: the running build is now the new one ────────────────────
    await client.send("Page.reload");
    await waitFor(client, 'document.body.classList.contains("splash-done")', "boot after update", 30000);
    const after = await evaluate(client, `document.querySelector('meta[name="app-build"]').content`);
    ok("after the update the page runs the new build", after === String(buildC), after);
  } finally {
    try {
      client && client.close();
    } catch (e) {}
    try {
      chrome.kill();
    } catch (e) {}
    server.close();
    await delay(400); // let Chrome finish writing its profile before removing it
    for (const dir of [userDataDir, site]) {
      try {
        fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      } catch (e) {
        // best-effort: a leftover temp dir must not fail the check
      }
    }
  }

  console.log(`\n\x1b[1mService worker updates: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
