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

    const errors = browserErrors(client.events);
    assert(
      errors.length === 0,
      `Browser console/runtime errors:\n${JSON.stringify(errors.slice(0, 5), null, 2)}`,
    );

    console.log(
      "Browser smoke passed: offline startup, tab switching, lazy Analytics/Live, add-match flow.",
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
