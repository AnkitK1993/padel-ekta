"use strict";

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

function browserErrors(events) {
  return events.filter((event) => {
    if (event.method === "Runtime.exceptionThrown") return true;
    if (
      event.method === "Runtime.consoleAPICalled" &&
      event.params?.type === "error"
    ) {
      return true;
    }
    return (
      event.method === "Log.entryAdded" &&
      event.params?.entry?.level === "error"
    );
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

    // #2: with user-defined Seasons present, the analytics award section is
    // titled "Season Awards" and bucketed by those seasons (the seeded May
    // matches land in the "May 2026" season card), not auto monthly buckets.
    await evaluate(client, `switchMainTab("home", true);`);
    await evaluate(client, `switchMainTab("analytics", true);`);
    await waitFor(
      client,
      `document.getElementById("analytics-page-content")?.innerHTML.includes("Season Awards")`,
      "Analytics shows 'Season Awards' (driven by manual seasons)",
    );
    const awards = await evaluate(client, `(() => {
      const html = document.getElementById("analytics-page-content").innerHTML;
      return {
        hasMay: html.includes("May 2026"),
        hasRecap: html.includes("Monthly Recap"),
        hasOldMonthly: html.includes("Monthly Awards"),
        hasFeared: html.includes("MOST FEARED"),
        hasWinRate: html.includes("Win Rate Over Time"),
        subtabCount: document.querySelectorAll(".ana-subtab").length,
        hasOldAntiPodium: html.includes("Anti-Podium Tracker"),
        hasDayOfWeek: html.includes("Day-of-Week"),
        hasStreakBoard: html.includes("Streak Leaderboard"),
        hasUpsets: html.includes("Biggest Upsets"),
        hasRadar: html.includes("Player Radar Compare"),
        hasSeasonCompare: html.includes("Season Comparison"),
        hasMilestones: html.includes("Upcoming Milestones"),
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
      "hasStreakBoard",
      "hasUpsets",
      "hasRadar",
      "hasSeasonCompare",
      "hasMilestones",
    ])
      assert(awards[k], `Expected new section present: ${k}`);
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

    const errors = browserErrors(client.events);
    assert(
      errors.length === 0,
      `Browser console/runtime errors:\n${JSON.stringify(errors.slice(0, 5), null, 2)}`,
    );

    console.log(
      "Browser smoke passed: offline startup, tab switching, lazy Analytics/Live, add-match flow, seasons filter.",
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
