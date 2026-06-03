"use strict";

// Requires Node 22.4+ — this script drives Chrome over CDP using the built-in
// global `WebSocket`, which only became available without a flag in 22.4.
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
const SEED_MATCHES = [
  {
    date: "2026-05-21",
    teamA: ["Ankit", "Rahul"],
    teamB: ["Sahil", "Puneet"],
    scoreA: 6,
    scoreB: 3,
  },
  {
    date: "2026-05-22",
    teamA: ["Ankit", "Sahil"],
    teamB: ["Rahul", "Puneet"],
    scoreA: 4,
    scoreB: 2,
  },
];

const SEED_PLAYERS = {
  1: { id: 1, name: "Ankit" },
  2: { id: 2, name: "Rahul" },
  3: { id: 3, name: "Sahil" },
  4: { id: 4, name: "Puneet" },
};

// ── Analytics output-snapshot fixture ──────────────────────────────────────
// A rich, fixed dataset (5 players, 14 matches, fixed past dates) used with a
// FROZEN clock to make the analytics page deterministic. The snapshot step
// hashes the normalized analytics HTML so a pure relocation of the analytics
// code (the planned code-split) can be proven to change nothing; a mis-wired
// dependency (wrong number / a section throwing) flips the hash.
const SNAP_PLAYERS = {
  1: { id: 1, name: "Ann" }, 2: { id: 2, name: "Bo" }, 3: { id: 3, name: "Cy" },
  4: { id: 4, name: "Di" }, 5: { id: 5, name: "Eve" },
};
const SNAP_ALIASES = { 1: [], 2: [], 3: [], 4: [], 5: [] };
const _sm = (date, a, b, sa, sb) => ({ date, teamA: a, teamB: b, scoreA: sa, scoreB: sb });
const SNAPSHOT_MATCHES = [
  _sm("2026-05-01", ["Ann", "Bo"], ["Cy", "Di"], 6, 3),
  _sm("2026-05-02", ["Ann", "Cy"], ["Bo", "Di"], 4, 6),
  _sm("2026-05-03", ["Ann", "Di"], ["Bo", "Cy"], 6, 1),
  _sm("2026-05-04", ["Eve", "Ann"], ["Cy", "Di"], 6, 4),
  _sm("2026-05-05", ["Bo", "Eve"], ["Ann", "Cy"], 3, 6),
  _sm("2026-05-06", ["Cy", "Eve"], ["Bo", "Di"], 6, 2),
  _sm("2026-05-07", ["Di", "Eve"], ["Ann", "Bo"], 4, 6),
  _sm("2026-05-08", ["Ann", "Bo"], ["Cy", "Eve"], 6, 5),
  _sm("2026-05-09", ["Ann", "Di"], ["Bo", "Eve"], 2, 6),
  _sm("2026-05-10", ["Cy", "Di"], ["Ann", "Eve"], 6, 3),
  _sm("2026-05-11", ["Bo", "Cy"], ["Di", "Eve"], 6, 4),
  _sm("2026-05-12", ["Ann", "Cy"], ["Bo", "Di"], 5, 6),
  _sm("2026-05-13", ["Ann", "Bo"], ["Di", "Eve"], 6, 2),
  _sm("2026-05-14", ["Cy", "Eve"], ["Ann", "Di"], 4, 6),
];
// Update intentionally when analytics OUTPUT legitimately changes. "PENDING"
// makes the first run print the computed hash without failing.
const ANALYTICS_SNAPSHOT_HASH = "5ae521ac";

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/microsoft-edge",
  ].filter(Boolean);

  const hit = candidates.find((p) => fs.existsSync(p));
  if (!hit) {
    throw new Error(
      "Chrome/Edge not found. Set CHROME_PATH to run browser smoke tests.",
    );
  }
  return hit;
}

function contentType(filePath) {
  return {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
  }[path.extname(filePath).toLowerCase()] || "application/octet-stream";
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

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

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

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJson(url, tries = 50) {
  let lastError;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
      lastError = new Error(`HTTP ${res.status} for ${url}`);
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
  const events = [];

  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
      return;
    }
    if (msg.method) events.push(msg);
  });

  return new Promise((resolve, reject) => {
    ws.addEventListener("open", () => {
      resolve({
        events,
        send(method, params = {}) {
          const callId = ++id;
          ws.send(JSON.stringify({ id: callId, method, params }));
          return new Promise((resolve, reject) => {
            pending.set(callId, { resolve, reject });
          });
        },
        close() {
          ws.close();
        },
      });
    });
    ws.addEventListener("error", reject, { once: true });
  });
}

async function waitFor(client, expression, label, timeoutMs = 7000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await client.send("Runtime.evaluate", {
      returnByValue: true,
      expression,
    });
    if (result.result.value) return;
    await delay(150);
  }
  // Dump any JS console errors to help diagnose timeout cause
  const errors = await client.send("Runtime.evaluate", {
    returnByValue: true,
    expression: `window.__smokeErrors||[]`,
  }).catch(() => ({ result: { value: [] } }));
  if (errors.result.value?.length) console.error("JS errors:", errors.result.value);
  const domErr = await client.send("Runtime.evaluate", {
    returnByValue: true,
    expression: `document.querySelector(".splash")?.textContent||""`,
  }).catch(() => ({ result: { value: "" } }));
  console.error(`Splash state: "${domErr.result.value}"`);
  throw new Error(`Timed out waiting for ${label}`);
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Browser evaluation failed");
  }
  return result.result.value;
}

// Firestore can't reach its backend in the offline test harness — that's by
// design (the app runs forced-offline), so its connection/unavailable logs are
// environmental noise, not app bugs. Everything else is a real error.
function _isBenignNoise(text) {
  return (
    /firestore/i.test(text) &&
    /(could not reach|unavailable|offline|backend|connection failed)/i.test(text)
  );
}
function _eventText(event) {
  if (event.method === "Runtime.exceptionThrown")
    return event.params?.exceptionDetails?.exception?.description ||
      event.params?.exceptionDetails?.text || "";
  if (event.method === "Runtime.consoleAPICalled")
    return (event.params?.args || []).map((a) => a.value || a.description || "").join(" ");
  if (event.method === "Log.entryAdded") return event.params?.entry?.text || "";
  return "";
}

function browserErrors(events) {
  return events.filter((event) => {
    const isErr =
      event.method === "Runtime.exceptionThrown" ||
      (event.method === "Runtime.consoleAPICalled" && event.params?.type === "error") ||
      (event.method === "Log.entryAdded" && event.params?.entry?.level === "error");
    if (!isErr) return false;
    return !_isBenignNoise(_eventText(event));
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const browserPath = findBrowser();
  const server = createServer();
  const appPort = await listen(server);
  const debugPort = 9333 + Math.floor(Math.random() * 500);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "padel-smoke-"));
  const chrome = spawn(
    browserPath,
    [
      "--headless=new",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      "--disable-gpu",
      // Required on CI runners: the Chrome sandbox can't initialise in the
      // GitHub Actions environment, and /dev/shm is too small for the default
      // shared-memory backing. Harmless for an ephemeral localhost test browser.
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
    await client.send("Log.enable");
    await client.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `
        window.__smokeErrors = [];
        window.addEventListener("error", e => window.__smokeErrors.push(e.message));
        window.addEventListener("unhandledrejection", e => window.__smokeErrors.push(String(e.reason)));
        localStorage.setItem("padel_forced_offline", "1");
        localStorage.setItem("padel_cache_v5", JSON.stringify({
          ts: Date.now(),
          matches: ${JSON.stringify(SEED_MATCHES)},
          players: ${JSON.stringify(SEED_PLAYERS)},
          playerAliasMap: { 1: [], 2: [], 3: [], 4: [] },
          nextPlayerId: 5
        }));
      `,
    });

    await client.send("Page.navigate", {
      url: `http://127.0.0.1:${appPort}/index.html`,
    });

    await waitFor(
      client,
      `document.body.classList.contains("splash-done") && document.querySelectorAll("#board .pc").length >= 4`,
      "offline cached startup",
    );
    const startup = await evaluate(client, `(() => ({
      activePage: document.querySelector(".page.active")?.id,
      splashDisplay: getComputedStyle(document.getElementById("app-splash")).display,
      boardCards: document.querySelectorAll("#board .pc").length
    }))()`);
    assert(startup.activePage === "pg-home", "Expected Detailed page on startup");
    assert(startup.splashDisplay === "none", "Expected splash to be dismissed");
    assert(startup.boardCards >= 4, "Expected cached players to render");

    await evaluate(client, `switchMainTab("compact", true);`);
    await waitFor(
      client,
      `document.querySelector(".page.active")?.id === "pg-compact"`,
      "Summary tab",
    );
    await evaluate(client, `
      document.getElementById("cmpSel").value = "all";
      onCmpFilter();
    `);
    await waitFor(
      client,
      `document.querySelectorAll("#cmpBody tr").length >= 4`,
      "Summary all-time rows",
    );

    await evaluate(client, `switchMainTab("history", true);`);
    await waitFor(
      client,
      `document.querySelector(".page.active")?.id === "pg-history"`,
      "History tab",
    );
    await evaluate(client, `
      document.getElementById("histDateFilter").value = "all";
      setHistoryDateFilter("all");
    `);
    await waitFor(
      client,
      `document.getElementById("modern-match-list").innerText.toLowerCase().includes("ankit")`,
      "History match list",
    );
    // "Pick a Day" must reveal the date input (regressed: .dr-wrap is display:none
    // by default and the day picker wasn't being made visible).
    const dayPicker = await evaluate(client, `(() => {
      setHistoryDateFilter("day");
      const dp = document.getElementById("matchDayPicker");
      return { visible: getComputedStyle(dp).display !== "none",
               inputVisible: !!document.getElementById("matchDayInput")?.offsetParent };
    })();`);
    assert(dayPicker.visible && dayPicker.inputVisible, "Pick-a-Day date input did not become visible");
    await evaluate(client, `setHistoryDateFilter("all");`);
    // Windowing fail-safe: with a tiny seed (< window) no "show older" button
    // appears, and invoking _histShowMore re-renders without error (wiring check).
    const win = await evaluate(client, `(() => {
      const before = document.querySelectorAll("#modern-match-list .match-card").length;
      const btnBefore = !!document.querySelector(".hist-show-more");
      let threw = false;
      try { window._histShowMore(); } catch (e) { threw = true; }
      const after = document.querySelectorAll("#modern-match-list .match-card").length;
      return { before, btnBefore, threw, after };
    })()`);
    assert(win.before > 0, "History feed rendered match cards");
    assert(
      !win.btnBefore,
      "No 'show older' button when matches fit in one window (fail-safe)",
    );
    assert(!win.threw, "_histShowMore() runs without error");
    assert(
      win.after > 0,
      "Feed still renders cards after a show-more re-render",
    );

    await evaluate(client, `switchMainTab("analytics", true);`);
    await waitFor(
      client,
      `document.querySelector(".page.active")?.id === "pg-analytics" &&
        document.querySelectorAll("#analytics-page-content .ana-sec").length > 0`,
      "Analytics lazy tab",
    );

    await evaluate(client, `
      window.isAdmin = true;
      openLiveMode();
    `);
    await waitFor(
      client,
      `document.querySelector(".page.active")?.id === "pg-live" &&
        document.getElementById("live-score-a").textContent === "0"`,
      "Live session lazy route",
    );

    await evaluate(client, `
      window.isAdmin = true;
      switchMainTab("add", true);
    `);
    await waitFor(
      client,
      `document.querySelector(".page.active")?.id === "pg-add"`,
      "Add tab",
    );
    await evaluate(client, `
      const ta = document.getElementById("matchTA");
      ta.value = "28/05/2026\\nAnkit Rahul vs Sahil Puneet 6-1";
      previewMatchImport();
      addMatches();
    `);
    await waitFor(
      client,
      `JSON.parse(localStorage.getItem("padel_cache_v5")).matches.length === 3`,
      "Add-match cache update",
    );
    const addState = await evaluate(client, `(() => {
      const cache = JSON.parse(localStorage.getItem("padel_cache_v5"));
      return {
        matchCount: cache.matches.length,
        okText: document.getElementById("mOk").textContent,
        inputValue: document.getElementById("matchTA").value
      };
    })()`);
    assert(addState.matchCount === 3, "Expected add-match flow to save one match");
    assert(addState.okText.includes("Added 1 match"), "Expected add success text");
    assert(
      !addState.inputValue.includes("6-1"),
      "Expected submitted match line to be cleared after add",
    );

    // ── SEASONS: global date-range scoping ──────────────────
    // Admin creates a season whose range contains none of the seeded matches,
    // selects it (home empties out — the empty-state render is synchronous),
    // then switches back to ALL SEASONS (home repopulates via the async card
    // cascade) — proving the activeMatches() season filter is global.
    const seasonPick = await evaluate(client, `(() => {
      window.isAdmin = true;
      openSeasonSheet();
      openSeasonEditor();
      document.getElementById("season-edit-name").value = "Empty Range";
      document.getElementById("season-edit-start").value = "2020-01-01";
      document.getElementById("season-edit-end").value = "2020-12-31";
      saveSeasonFromEditor();
      const list = JSON.parse(localStorage.getItem("padel_seasons") || "[]");
      const sid = list[0] && list[0].id;
      setSeason(sid); renderHome();
      return {
        len: list.length,
        sid,
        emptyCount: document.querySelectorAll("#board .pc").length,
        hamLabel: document.getElementById("season-hmenu-btn").textContent,
        activeLs: localStorage.getItem("padel_active_season"),
      };
    })()`);
    assert(seasonPick.len === 1, "Expected one persisted season");
    assert(
      seasonPick.emptyCount === 0,
      `Expected empty-range season to clear the leaderboard, got ${seasonPick.emptyCount}`,
    );
    assert(
      seasonPick.hamLabel.includes("Empty Range"),
      "Expected hamburger label to reflect the active season",
    );
    assert(
      seasonPick.activeLs === seasonPick.sid,
      "Expected active season id persisted to localStorage",
    );

    await evaluate(client, `setSeason("all"); renderHome();`);
    await waitFor(
      client,
      `document.querySelectorAll("#board .pc").length >= 4`,
      "ALL SEASONS restores the full leaderboard",
    );

    // Entering a populated season must reset the "today"-defaulted Compact &
    // History sub-filters to "all", so the whole season range is shown (not an
    // empty "today" view). Seeded matches are all in May 2026.
    const reset = await evaluate(client, `(() => {
      window.isAdmin = true;
      // Force the sub-filters to "today" first (would render empty for the season).
      const cmpSel = document.getElementById("cmpSel");
      if (cmpSel) { cmpSel.value = "today"; onCmpFilter(); }
      setHistoryDateFilter("today");
      openSeasonSheet();
      openSeasonEditor();
      document.getElementById("season-edit-name").value = "May 2026";
      document.getElementById("season-edit-start").value = "2026-05-01";
      document.getElementById("season-edit-end").value = "2026-05-31";
      saveSeasonFromEditor();
      const may = JSON.parse(localStorage.getItem("padel_seasons") || "[]")
        .find(s => s.name === "May 2026");
      setSeason(may.id);
      const closed = (() => { closeSeasonSheet(); return true; })();
      return {
        cmpVal: document.getElementById("cmpSel").value,
        histVal: document.getElementById("histDateFilter").value,
      };
    })()`);
    assert(
      reset.cmpVal === "all",
      `Expected Compact filter reset to "all" on season select, got "${reset.cmpVal}"`,
    );
    assert(
      reset.histVal === "all",
      `Expected History filter reset to "all" on season select, got "${reset.histVal}"`,
    );

    await evaluate(client, `setSeason("all"); closeSeasonSheet();`);

    // #6 memo correctness: an exclusion toggle changes the active-match set
    // WITHOUT bumping _dataVersion, so the activeMatches() memo must invalidate
    // off its exclusion key. Puneet is in every seeded match → excluding him
    // empties the Summary table; re-including restores it. (renderCompact fills
    // the populated table via an async cascade, so each step uses waitFor.)
    await evaluate(client, `switchMainTab("compact", true);`);
    await evaluate(client, `
      const sel = document.getElementById("cmpSel");
      if (sel) { sel.value = "all"; onCmpFilter(); }
    `);
    await waitFor(
      client,
      `document.querySelectorAll("#cmpBody tr").length >= 4`,
      "Summary populated before exclusion",
    );
    // Tapping a Summary match row must open the match-intro overlay (regressed
    // once when openMatchIntro threw a ReferenceError before reaching .active).
    const tapOpensOverlay = await evaluate(client, `(() => {
      const row = document.querySelector("#cmpMatches .smr-inner");
      if (!row) return false;
      row.click();
      return document.getElementById("match-intro-overlay").classList.contains("active");
    })();`);
    assert(tapOpensOverlay, "Tapping a Summary match did not open the match-intro overlay");
    await evaluate(client, `closeMatchIntro && closeMatchIntro();`);
    // Dynamic column layout: no horizontal scroll, table always fills 100%
    // width. With all columns shown AND with some hidden, the table must
    // not overflow its container.
    const colLayout = await evaluate(client, `(() => {
      const scroll = document.querySelector("#pg-compact .cmp-scroll");
      const table = document.querySelector("#pg-compact table.cmp");
      const cs = (el) => el ? getComputedStyle(el) : null;
      const allColsNoOverflow = table && scroll
        ? table.scrollWidth <= scroll.clientWidth + 2 : false;
      // Hide a few columns then check again
      table && table.classList.add("hide-col-mp", "hide-col-gw", "hide-col-gl");
      const hiddenColsNoOverflow = table && scroll
        ? table.scrollWidth <= scroll.clientWidth + 2 : false;
      // Restore
      table && table.classList.remove("hide-col-mp", "hide-col-gw", "hide-col-gl");
      return {
        scrollX: scroll ? cs(scroll).overflowX : "",
        allColsNoOverflow,
        hiddenColsNoOverflow,
      };
    })()`);
    assert(
      colLayout.scrollX === "hidden",
      `Expected .cmp-scroll overflow-x hidden, got "${colLayout.scrollX}"`,
    );
    assert(
      colLayout.allColsNoOverflow,
      "Expected table to fit within container with all columns shown",
    );
    assert(
      colLayout.hiddenColsNoOverflow,
      "Expected table to still fit when some columns are hidden",
    );

    await evaluate(client, `toggleExcludePlayer("Puneet");`);
    await waitFor(
      client,
      `document.querySelector("#cmpBody td[colspan]") !== null`,
      "exclusion empties the Summary table (memo invalidated)",
    );
    await evaluate(client, `toggleExcludePlayer("Puneet");`);
    await waitFor(
      client,
      `document.querySelectorAll("#cmpBody tr").length >= 4`,
      "re-including restores the Summary table (memo invalidated)",
    );

    // #5: auto-select jumps to the ongoing season (range contains today). Start
    // it TODAY so it's unambiguously the latest-starting ongoing season (wins
    // ties over the earlier "May 2026" season regardless of the VM clock).
    const auto = await evaluate(client, `(() => {
      window.isAdmin = true;
      const today = new Date().toISOString().slice(0, 10);
      openSeasonSheet();
      openSeasonEditor();
      document.getElementById("season-edit-name").value = "Ongoing";
      document.getElementById("season-edit-start").value = today;
      document.getElementById("season-edit-end").value = "";
      saveSeasonFromEditor();
      const ongoing = JSON.parse(localStorage.getItem("padel_seasons") || "[]")
        .find(s => s.name === "Ongoing");
      setSeasonAuto(true);
      const out = {
        autoLs: localStorage.getItem("padel_season_auto"),
        activeLs: localStorage.getItem("padel_active_season"),
        label: document.getElementById("season-hmenu-btn").textContent,
        ongoingId: ongoing && ongoing.id,
      };
      // cleanup: disable auto, back to ALL
      setSeasonAuto(false);
      setSeason("all");
      try { localStorage.removeItem("padel_season_auto"); } catch (e) {}
      closeSeasonSheet();
      return out;
    })()`);
    assert(auto.autoLs === "1", "Expected auto-season preference persisted");
    assert(
      auto.label.includes("Ongoing"),
      `Expected auto-select to jump to the ongoing season, label was "${auto.label}"`,
    );
    assert(
      auto.activeLs === auto.ongoingId,
      "Expected active season to equal the ongoing season id",
    );

    // #2: with user-defined Seasons present, the merged "Seasons" section is
    // bucketed by those seasons (the seeded May matches land in the "May 2026"
    // season card under its Awards tab), not auto monthly buckets.
    await evaluate(client, `switchMainTab("home", true);`);
    await evaluate(client, `switchMainTab("analytics", true);`);
    await waitFor(
      client,
      `!!document.querySelector('.ana-sec[data-key="seasonmode"]')`,
      "Analytics rendered the merged Seasons section",
    );
    const awards = await evaluate(client, `(() => {
      const html = document.getElementById("analytics-page-content").innerHTML;
      const subLabels = (key) =>
        [...document.querySelectorAll('.ana-sec[data-key="' + key + '"] .ana-subtab')]
          .map((b) => b.textContent.trim());
      return {
        hasMay: html.includes("May 2026"),
        hasRecap: html.includes("Monthly Recap"),
        hasOldMonthly: html.includes("Monthly Awards"),
        hasFeared: html.includes("MOST FEARED"),
        hasWinRate: html.includes("Win Rate Over Time"),
        subtabCount: document.querySelectorAll(".ana-subtab").length,
        hasOldAntiPodium: html.includes("Anti-Podium Tracker"),
        hasDayOfWeek: html.includes("Day-of-Week"),
        hasUpsets: html.includes("Biggest Upsets"),
        // Merged sections: these features now live as sub-tabs, not top-level cards.
        hasSeasonCompare: subLabels("seasonmode").includes("Comparison"),
        hasMilestones: subLabels("milestones").includes("Upcoming"),
        eloHasPeakLow: subLabels("elo").includes("Peak / Low"),
        rivalryHasMatrix: subLabels("rivalry").includes("Matrix"),
        formHasStreaks: subLabels("form").includes("Streak Leaderboard"),
        hasRadar: subLabels("playerstats").includes("Radar"),
        standingsHasPower: subLabels("lrace").includes("Power"),
        standingsHasReplay: subLabels("lrace").includes("Replay"),
        perfHasCarry: subLabels("clutchrank").includes("Carry"),
        predictHasSim: subLabels("predacc").includes("Match Sim"),
        pairsHasSynergy: subLabels("pairs").includes("Synergy"),
        chemHasH2H: subLabels("pairmatrix").includes("H2H Records"),
        activityHasSessions: subLabels("calendar").includes("Sessions"),
        awardsHasPB: subLabels("awards").includes("Personal Bests"),
        // Partner/Opponent grid renders and its period/mode toggles are wired.
        partnerGrid: (() => {
          const sec = document.querySelector('.ana-sec[data-key="partnergrid"]');
          if (!sec || !document.getElementById("pair-matrix-box")) return false;
          if (typeof window._pairMatrixSetMode !== "function") return false;
          window._pairMatrixSetMode({}, "pct"); // exercise the re-render path
          return !!document.getElementById("pair-matrix-box");
        })(),
        noOldSecs: ["pvp","peakelo","eloTimeline","eloWinProb","streakboard","upcomingmilestones","seasoncompare",
          "simulator","eloproj","powerrankings","podiumtracker","rankreign","lreplay","qualitywins","dominance","carryfactor","radar","partnership","pairedh2h",
          "session","monthlystats","personalbests"]
          .every((k) => !document.querySelector('.ana-sec[data-key="' + k + '"]')),
        hasHideEmpty: !!document.querySelector(".ana-hideempty-btn"),
        emptyCount: document.querySelectorAll(".ana-sec.is-empty").length,
      };
    })()`);
    assert(awards.hasHideEmpty, "Expected Hide-empty toggle present");
    assert(
      awards.emptyCount > 0,
      "Expected some sections flagged empty with sparse seed data",
    );
    for (const k of [
      "hasUpsets",
      "hasRadar",
      "hasSeasonCompare",
      "hasMilestones",
      "eloHasPeakLow",
      "rivalryHasMatrix",
      "formHasStreaks",
      "standingsHasPower",
      "standingsHasReplay",
      "perfHasCarry",
      "predictHasSim",
      "pairsHasSynergy",
      "chemHasH2H",
      "activityHasSessions",
      "awardsHasPB",
      "partnerGrid",
    ])
      assert(awards[k], `Expected merged section sub-tab present: ${k}`);
    assert(
      awards.noOldSecs,
      "Expected retired standalone analytics sections to be merged away",
    );
    assert(
      awards.subtabCount >= 12,
      `Expected merged sections to render sub-tabs, got ${awards.subtabCount}`,
    );
    assert(
      !awards.hasOldAntiPodium,
      "Expected old 'Anti-Podium Tracker' section to be merged away",
    );
    assert(awards.hasDayOfWeek, "Expected merged 'Day-of-Week' section present");
    // Seeded data is a single month, so this section used to be omitted; it must
    // now always render (with a helpful note) so users can always find it.
    assert(
      awards.hasWinRate,
      "Expected 'Win Rate Over Time' section to render even with one month of data",
    );
    assert(
      awards.hasMay,
      "Expected a 'May 2026' season card in Season Awards",
    );
    assert(
      !awards.hasRecap,
      "Expected the auto 'Monthly Recap' fallback to be replaced by Season Awards",
    );
    assert(
      !awards.hasOldMonthly,
      "Expected the standalone 'Monthly Awards' section to be removed (unified)",
    );
    assert(
      awards.hasFeared,
      "Expected merged awards (e.g. MOST FEARED) inside the season card",
    );

    // Season banner: selecting a season shows its scope at the top of analytics.
    await evaluate(client, `(() => {
      const may = JSON.parse(localStorage.getItem("padel_seasons") || "[]").find(s => s.name === "May 2026");
      setSeason(may.id);
    })()`);
    await evaluate(client, `switchMainTab("home", true);`);
    await evaluate(client, `switchMainTab("analytics", true);`);
    await waitFor(
      client,
      `document.querySelector(".ana-season-banner") !== null`,
      "season context banner shows in analytics",
    );
    await evaluate(client, `setSeason("all"); switchMainTab("home", true);`);

    // ── Smooth Mode: player cards must stay VISIBLE ──
    // (regression: smooth-mode used `animation:none`, which strips the
    //  cardSlideUp forwards-fill and reverts .pc to its opacity:0 base.)
    await evaluate(client, `switchMainTab("home", true);`);
    await waitFor(
      client,
      `document.querySelectorAll("#board .pc").length >= 4`,
      "home cards present",
    );
    const sm = await evaluate(client, `(() => {
      toggleSmoothMode(true);
      const card = document.querySelector("#board .pc");
      const op = getComputedStyle(card).opacity;
      const h = card.offsetHeight;
      toggleSmoothMode(false);
      return { op, h };
    })()`);
    assert(
      sm.op === "1" && sm.h > 0,
      `Smooth mode: cards must stay visible (opacity=${sm.op}, h=${sm.h})`,
    );

    // ── Battery Saver toggle ──────────────────────────────────
    const bs = await evaluate(client, `(() => {
      toggleBatterySaver(true);
      const on = document.body.classList.contains("battery-saver");
      const lsOn = localStorage.getItem("padel_battery_saver");
      toggleBatterySaver(false);
      const off = document.body.classList.contains("battery-saver");
      const lsOff = localStorage.getItem("padel_battery_saver");
      return { on, lsOn, off, lsOff };
    })()`);
    assert(bs.on === true && bs.lsOn === "1", "Battery Saver should enable + persist '1'");
    assert(bs.off === false && bs.lsOff === "0", "Battery Saver should disable + persist '0'");

    // Battery Saver must survive a full reload (sticky persisted setting).
    await evaluate(client, `toggleBatterySaver(true);`);
    await client.send("Page.reload");
    await waitFor(
      client,
      `document.body.classList.contains("splash-done")`,
      "reload startup",
    );
    const bsReload = await evaluate(client, `(() => ({
      ls: localStorage.getItem("padel_battery_saver"),
      cls: document.body.classList.contains("battery-saver"),
    }))()`);
    assert(
      bsReload.ls === "1" && bsReload.cls === true,
      `Battery Saver must persist across reload (got ${JSON.stringify(bsReload)})`,
    );

    // ── ANALYTICS OUTPUT SNAPSHOT (code-split regression guard) ──────────────
    // Reload with the rich fixture + a frozen clock, render analytics, and hash
    // the normalized HTML. This is the safety net for relocating the analytics
    // subsystem: a pure move must keep this hash identical.
    await client.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `
        (function(){
          // Freeze "today" so date-relative output is deterministic, while
          // keeping new Date(arg)/parse working (the app parses match dates).
          var FIXED = Date.parse("2026-06-15T12:00:00");
          var RD = Date;
          function FD(){ return arguments.length ? new RD(...arguments) : new RD(FIXED); }
          FD.now = function(){ return FIXED; };
          FD.parse = RD.parse; FD.UTC = RD.UTC; FD.prototype = RD.prototype;
          window.Date = FD;
        })();
        localStorage.setItem("padel_forced_offline","1");
        localStorage.setItem("padel_battery_saver","0");
        localStorage.removeItem("padel_active_season");
        localStorage.removeItem("padel_seasons");
        localStorage.setItem("padel_cache_v5", JSON.stringify({
          ts: Date.now(), matches: ${JSON.stringify(SNAPSHOT_MATCHES)},
          players: ${JSON.stringify(SNAP_PLAYERS)},
          playerAliasMap: ${JSON.stringify(SNAP_ALIASES)}, nextPlayerId: 6
        }));
      `,
    });
    await client.send("Page.navigate", { url: `http://127.0.0.1:${appPort}/index.html` });
    await waitFor(
      client,
      `document.body.classList.contains("splash-done")`,
      "snapshot fixture startup",
    );
    await evaluate(client, `switchMainTab("analytics", true);`);
    await waitFor(
      client,
      `document.querySelectorAll("#analytics-page-content .ana-sec").length > 5`,
      "snapshot analytics render",
    );
    // Let async sub-renders (charts / count-ups) settle before hashing — without
    // this the hash can be captured mid-render and flake.
    await delay(600);
    const snap = await evaluate(client, `(() => {
      let h = document.getElementById("analytics-page-content").innerHTML;
      // Strip non-semantic volatility: generated ids, svg id-refs, anim delays.
      h = h.replace(/\\sid="[^"]*"/g, "")
           .replace(/url\\(#[^)]*\\)/g, "url(#)")
           .replace(/animation-delay:[^;"']*/g, "");
      let hash = 0x811c9dc5;            // FNV-1a 32-bit
      for (let i = 0; i < h.length; i++) { hash ^= h.charCodeAt(i); hash = (hash * 0x01000193) >>> 0; }
      return { hash: hash.toString(16), len: h.length,
               secs: document.querySelectorAll("#analytics-page-content .ana-sec").length,
               unavailable: (h.match(/Section unavailable/g) || []).length };
    })()`);
    console.log("ANALYTICS SNAPSHOT:", JSON.stringify(snap));
    assert(
      snap.unavailable === 0,
      `Analytics snapshot: ${snap.unavailable} section(s) threw ("Section unavailable")`,
    );
    assert(
      ANALYTICS_SNAPSHOT_HASH === "PENDING" || snap.hash === ANALYTICS_SNAPSHOT_HASH,
      `Analytics output changed: got ${snap.hash} (len ${snap.len}), expected ${ANALYTICS_SNAPSHOT_HASH}. If intentional, update ANALYTICS_SNAPSHOT_HASH; otherwise a refactor altered rendered values.`,
    );

    const errors = browserErrors(client.events);
    assert(
      errors.length === 0,
      `Browser console/runtime errors:\n${JSON.stringify(errors.slice(0, 5), null, 2)}`,
    );

    console.log(
      "Browser smoke passed: offline startup, tab switching, lazy Analytics/Live, add-match flow, seasons filter, analytics snapshot.",
    );
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
