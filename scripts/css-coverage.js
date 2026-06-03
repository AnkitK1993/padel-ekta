"use strict";

// ─────────────────────────────────────────────────────────────
// CSS dead-code finder.
//
// Drives headless Chrome over CDP, turns on CSS rule-usage tracking,
// then exhaustively exercises the app (every tab + a safe auto-click
// sweep of every [onclick] element + curated openers for things the
// sweep can't reach). Whatever CSS rule never matched a real element
// is a candidate for removal.
//
// SAFETY FILTERS (a rule is only reported as "high-confidence dead" if):
//   • it is a class selector (contains .foo)
//   • none of its classes appear inside @media / @supports / @keyframes
//   • it has no interaction pseudo-class (:hover/:focus/…) that headless
//     can't trigger
//   • none of its class names appear as a string literal anywhere in
//     app.js / index.html (catches dynamically-built class names)
//
// Anything failing those filters is listed under "review" instead.
// This script REMOVES NOTHING — it only prints a report.
// ─────────────────────────────────────────────────────────────

// Requires Node 22.4+ — drives Chrome over CDP using the built-in global
// `WebSocket`, which only became available without a flag in 22.4.
if (typeof WebSocket === "undefined") {
  console.error(
    `This script needs Node 22.4+ (global WebSocket). You are on ${process.version}.`,
  );
  process.exit(1);
}

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");

// Richer seed than the smoke test so more analytics sections render.
const NAMES = ["Ankit", "Rahul", "Sahil", "Puneet", "Ojas", "Mahir"];
const SEED_PLAYERS = {};
NAMES.forEach((n, i) => (SEED_PLAYERS[i + 1] = { id: i + 1, name: n }));
const SEED_MATCHES = (() => {
  const out = [];
  // 24 matches across 8 dates, rotating partners/opponents.
  for (let d = 0; d < 8; d++) {
    const day = `2026-05-${String(10 + d).padStart(2, "0")}`;
    for (let k = 0; k < 3; k++) {
      const a = NAMES[(d + k) % 6];
      const b = NAMES[(d + k + 1) % 6];
      const c = NAMES[(d + k + 2) % 6];
      const e = NAMES[(d + k + 3) % 6];
      const sa = (d + k) % 2 === 0 ? 4 : 2;
      const sb = sa === 4 ? (k % 2 ? 0 : 2) : 4;
      out.push({ date: day, teamA: [a, b], teamB: [c, e], scoreA: sa, scoreB: sb });
    }
  }
  return out;
})();

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean);
  const hit = candidates.find((p) => fs.existsSync(p));
  if (!hit)
    throw new Error("Chrome/Edge not found. Set CHROME_PATH to run this tool.");
  return hit;
}

function contentType(filePath) {
  return (
    {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".ico": "image/x-icon",
    }[path.extname(filePath).toLowerCase()] || "application/octet-stream"
  );
}

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    let filePath = path.resolve(ROOT, `.${decodeURIComponent(url.pathname)}`);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory())
      filePath = path.join(filePath, "index.html");
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": contentType(filePath) });
      res.end(data);
    });
  });
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function listen(server) {
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve(server.address().port)),
  );
}

async function getJson(url, tries = 50) {
  let lastError;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    await delay(150);
  }
  throw lastError;
}

function connectCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const handlers = [];
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
      return;
    }
    if (msg.method) handlers.forEach((h) => h(msg));
  });
  return new Promise((resolve, reject) => {
    ws.addEventListener("open", () =>
      resolve({
        on: (fn) => handlers.push(fn),
        send(method, params = {}) {
          const callId = ++id;
          ws.send(JSON.stringify({ id: callId, method, params }));
          return new Promise((res, rej) => pending.set(callId, { resolve: res, reject: rej }));
        },
        close: () => ws.close(),
      }),
    );
    ws.addEventListener("error", reject, { once: true });
  });
}

async function waitFor(client, expression, label, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const r = await client.send("Runtime.evaluate", {
      returnByValue: true,
      expression,
    });
    if (r.result && r.result.value) return true;
    await delay(150);
  }
  return false; // non-fatal: coverage continues
}

async function evaluate(client, expression, awaitPromise = false) {
  const r = await client.send("Runtime.evaluate", {
    awaitPromise,
    returnByValue: true,
    expression,
  });
  return r.result ? r.result.value : undefined;
}

// Parse every style rule (incl. those nested in @media) from a stylesheet's
// text, preserving exact character offsets so we can match them against the
// used-ranges CDP reports. Skips @keyframes step rules and string/comment spans.
function parseRules(text) {
  const rules = [];
  const stack = [];
  let i = 0;
  const n = text.length;
  let preludeStart = -1;
  while (i < n) {
    const c = text[i];
    if (c === "/" && text[i + 1] === "*") {
      const e = text.indexOf("*/", i + 2);
      i = e === -1 ? n : e + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      const q = c;
      i++;
      while (i < n && text[i] !== q) {
        if (text[i] === "\\") i++;
        i++;
      }
      i++;
      continue;
    }
    if (c === "{") {
      const ps = preludeStart < 0 ? i : preludeStart;
      const prelude = text.slice(ps, i);
      const trimmed = prelude.trim();
      const firstNonWs = ps + (prelude.length - prelude.trimStart().length);
      if (trimmed.startsWith("@")) {
        const at = trimmed.slice(1).split(/[\s({]/)[0].toLowerCase();
        if (["media", "supports", "document", "-moz-document"].includes(at))
          stack.push("media");
        else if (at === "keyframes" || at === "-webkit-keyframes")
          stack.push("keyframes");
        else stack.push("other");
      } else {
        if (!stack.includes("keyframes") && trimmed.length)
          rules.push({
            selStart: firstNonWs,
            selector: trimmed.replace(/\s+/g, " "),
            inMedia: stack.includes("media"),
          });
        stack.push("rulebody");
      }
      preludeStart = -1;
      i++;
      continue;
    }
    if (c === "}") {
      stack.pop();
      preludeStart = -1;
      i++;
      continue;
    }
    if (preludeStart < 0 && !/\s/.test(c)) preludeStart = i;
    i++;
  }
  return rules;
}

// In-page helpers, stringified and run repeatedly.
const PAGE_HELPERS = `
  window.__danger = /delet|clear|purge|remov|export|import|logout|signout|sign-out|reset|wipe|trash|undo/i;
  window.__sweep = function(){
    let n=0;
    document.querySelectorAll('[onclick]').forEach(el=>{
      const code=el.getAttribute('onclick')||'';
      if(window.__danger.test(code)) return;
      try{ el.click(); n++; }catch(e){}
    });
    return n;
  };
  window.__closeAll = function(){
    document.querySelectorAll('.open,.show').forEach(e=>{
      try{ e.classList.remove('open','show'); }catch(_){}
    });
  };
  true;
`;

async function main() {
  const browserPath = findBrowser();
  const server = createServer();
  const appPort = await listen(server);
  const debugPort = 9800 + Math.floor(Math.random() * 400);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "padel-cov-"));
  const chrome = spawn(
    browserPath,
    [
      "--headless=new",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      "--disable-gpu",
      // Required on CI runners (see browser-smoke.js for rationale).
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  let client;
  try {
    const targets = await getJson(`http://127.0.0.1:${debugPort}/json/list`);
    const page = targets.find((t) => t.type === "page") || targets[0];
    client = await connectCdp(page.webSocketDebuggerUrl);

    await client.send("Runtime.enable");
    await client.send("Page.enable");
    await client.send("DOM.enable");
    await client.send("CSS.enable");

    // Auto-dismiss any native dialog so blind clicks can't hang us.
    client.on((msg) => {
      if (msg.method === "Page.javascriptDialogOpening")
        client.send("Page.handleJavaScriptDialog", { accept: false }).catch(() => {});
    });

    // Track which stylesheet is styles.css.
    const sheetIds = new Set();
    client.on((msg) => {
      if (
        msg.method === "CSS.styleSheetAdded" &&
        (msg.params.header.sourceURL || "").includes("styles.css")
      )
        sheetIds.add(msg.params.header.styleSheetId);
    });

    // Mobile viewport (the app's primary target).
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });

    await client.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `
        window.alert=function(){}; window.confirm=function(){return true;}; window.prompt=function(){return null;};
        localStorage.setItem("padel_forced_offline","1");
        localStorage.setItem("padel_cache_v5", JSON.stringify({
          ts: Date.now(),
          matches: ${JSON.stringify(SEED_MATCHES)},
          players: ${JSON.stringify(SEED_PLAYERS)},
          playerAliasMap: ${JSON.stringify(Object.fromEntries(Object.keys(SEED_PLAYERS).map((k) => [k, []])))},
          nextPlayerId: ${NAMES.length + 1}
        }));
      `,
    });

    await client.send("CSS.startRuleUsageTracking");
    await client.send("Page.navigate", { url: `http://127.0.0.1:${appPort}/index.html` });
    await waitFor(
      client,
      `document.body.classList.contains("splash-done") && document.querySelectorAll("#board .pc").length >= 4`,
      "startup",
    );
    await evaluate(client, PAGE_HELPERS);
    await evaluate(client, `window.isAdmin = true; try{updateAdminUI&&updateAdminUI(window.__user);}catch(e){}`);

    const tabs = ["home", "compact", "history", "analytics", "add"];
    for (const tab of tabs) {
      await evaluate(client, `try{switchMainTab(${JSON.stringify(tab)}, true);}catch(e){}`);
      await delay(500);
      // two sweep passes (clicks open things; reopening reveals more)
      await evaluate(client, `window.__sweep();`);
      await delay(350);
      await evaluate(client, `window.__sweep();`);
      await delay(350);
      await evaluate(client, `window.__closeAll();`);
      await delay(150);
    }

    // Admin sub-tabs on the Add page.
    for (const it of ["names", "manage", "matches"]) {
      await evaluate(client, `try{switchITab(${JSON.stringify(it)});}catch(e){}`);
      await delay(300);
      await evaluate(client, `window.__sweep(); window.__closeAll();`);
      await delay(200);
    }

    // Curated openers the click-sweep can't reach (need arguments / state).
    const A = JSON.stringify(NAMES[0]);
    const B = JSON.stringify(NAMES[1]);
    const curated = [
      `switchMainTab("analytics", true)`,
      `openPlayerDetail(${A})`,
      `openPlayerDetail(${B})`,
      `openH2HDetail(${A}, ${B})`,
      `openRivalryScreen(${A}, ${B})`,
      `openPlayerCompare && openPlayerCompare()`,
      `renderH2HDeepDive && renderH2HDeepDive()`,
      `openSimSheet && openSimSheet()`,
      `runMatchSimulator && runMatchSimulator()`,
      `openPredictSheet && openPredictSheet()`,
      `runMatchPrediction && runMatchPrediction()`,
      `openWhatIfPlayerSheet && openWhatIfPlayerSheet()`,
      `renderWhatIfSection && renderWhatIfSection(${A})`,
      `openEloProbSheet && openEloProbSheet()`,
      `openEloTLOverlaySheet && openEloTLOverlaySheet()`,
      `openWeeklyDigest && openWeeklyDigest()`,
      `openDigestPlayerSheet && openDigestPlayerSheet()`,
      `openAnaSearch && openAnaSearch()`,
      `openMatchIntro && openMatchIntro(0)`,
      `openSessionHighlights && openSessionHighlights("2026-05-10")`,
      `showToast && showToast("coverage","✅")`,
      `showUndoToast && showUndoToast("coverage", function(){})`,
      `openThemePicker && openThemePicker()`,
      `toggleHamburgerMenu && toggleHamburgerMenu()`,
      `openGlobalSearch && openGlobalSearch()`,
      `openSummaryShare && openSummaryShare()`,
      `openShareCard && openShareCard(0)`,
      `openModernAddModal && openModernAddModal()`,
      `openNameAddModal && openNameAddModal()`,
      `openFabModal && openFabModal()`,
      `openLiveMode && openLiveMode()`,
      `openSessionSetup && openSessionSetup()`,
    ];
    for (const expr of curated) {
      await evaluate(client, `try{ ${expr}; }catch(e){}`);
      await delay(250);
      await evaluate(client, `window.__sweep();`);
      await delay(150);
      await evaluate(client, `window.__closeAll();`);
      await delay(100);
    }

    // Live mode interactions (score buttons render live-specific styles).
    await evaluate(
      client,
      `try{
        openLiveMode&&openLiveMode();
      }catch(e){}`,
    );
    await delay(500);
    await evaluate(client, `window.__sweep(); window.__closeAll();`);
    await delay(300);

    // ── Collect coverage ──
    const { ruleUsage } = await client.send("CSS.stopRuleUsageTracking");
    if (!sheetIds.size) throw new Error("styles.css stylesheet id never captured");

    // NOTE: stopRuleUsageTracking lists rules that WERE used. Unused rules are
    // simply absent. So we build the used INTERVALS, then enumerate every rule
    // ourselves and call a rule unused if its offset is in no used interval.
    const sheetId = [...sheetIds][0];
    const { text } = await client.send("CSS.getStyleSheetText", { styleSheetId: sheetId });

    const usedIntervals = ruleUsage
      .filter((u) => u.styleSheetId === sheetId && u.used)
      .map((u) => [u.startOffset, u.endOffset])
      .sort((a, b) => a[0] - b[0]);
    const isUsed = (off) =>
      usedIntervals.some(([s, e]) => off >= s && off < e);

    const allRules = parseRules(text);

    const PSEUDO =
      /:(hover|active|focus|focus-visible|focus-within|target|visited|checked|disabled|enabled|valid|invalid|placeholder-shown|autofill)/;

    // Source corpus for the "dynamically built class name" filter.
    // Must include every file that can set a class on an element. The app is
    // split across many ES modules under src/ (engine/, ui/) + features/, so
    // walk those dirs recursively plus index.html — a hardcoded list goes stale
    // on every module split/reorg and yields false "dead" positives. Test
    // files and the tests/ dir are excluded so they can't mask an unused class.
    const corpusFiles = ["index.html"];
    // Root-level .js (app.js, utils.js, sw.js) — non-recursive.
    try {
      for (const f of fs.readdirSync(ROOT))
        if (f.endsWith(".js") && !/^tests/.test(f)) corpusFiles.push(f);
    } catch (e) {}
    // App-code dirs — recursive (NOT scripts/ or tests/, which aren't runtime).
    const walkJs = (dir) => {
      let entries = [];
      try {
        entries = fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true });
      } catch (e) {
        return;
      }
      for (const e of entries) {
        const r = path.join(dir, e.name);
        if (e.isDirectory()) walkJs(r);
        else if (e.name.endsWith(".js")) corpusFiles.push(r);
      }
    };
    walkJs("src");
    walkJs("features");
    const corpus = corpusFiles
      .map((f) => {
        try {
          return fs.readFileSync(path.join(ROOT, f), "utf8");
        } catch (e) {
          return "";
        }
      })
      .join("\n");
    const classInSource = (cls) =>
      new RegExp("[\"'`\\s.]" + cls.replace(/[-]/g, "\\-") + "\\b").test(corpus);

    const deadHigh = [];
    const review = [];
    let usedRules = 0;
    for (const rule of allRules) {
      if (isUsed(rule.selStart)) {
        usedRules++;
        continue;
      }
      const selector = rule.selector;
      const classes = [...selector.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((x) => x[1]);
      const reasons = [];
      if (!classes.length) reasons.push("no-class-selector");
      if (rule.inMedia) reasons.push("inside-@media");
      if (PSEUDO.test(selector)) reasons.push("interaction-pseudo");
      const builtInSource = classes.filter(classInSource);
      if (builtInSource.length)
        reasons.push("class-in-source:" + builtInSource.join(","));
      if (reasons.length) review.push({ selector, reasons });
      else deadHigh.push({ selector, classes });
    }

    const report = {
      summary: {
        rulesParsed: allRules.length,
        used: usedRules,
        unused: allRules.length - usedRules,
        highConfidenceDead: deadHigh.length,
        review: review.length,
      },
      highConfidenceDead: deadHigh.map((d) => d.selector).sort(),
      review: review.map((r) => `${r.selector}   [${r.reasons.join("; ")}]`).sort(),
    };
    const outFile = path.join(ROOT, "css-coverage-report.json");
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

    console.log("── CSS COVERAGE ──────────────────────────────");
    console.log(JSON.stringify(report.summary, null, 2));
    console.log(`\nHIGH-CONFIDENCE DEAD (${deadHigh.length}):`);
    report.highConfidenceDead.forEach((s) => console.log("  " + s));
    console.log(`\nFull report (incl. ${review.length} review items) → css-coverage-report.json`);
  } finally {
    if (client) client.close();
    chrome.kill();
    server.close();
  }
}

main().catch((err) => {
  console.error(err.stack || err.message || err);
  process.exit(1);
});
