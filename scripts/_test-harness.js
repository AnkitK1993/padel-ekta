"use strict";

// Shared CDP browser harness for scripts/a11y-audit.js and
// scripts/visual-regression.js. Deliberately separate from
// scripts/browser-smoke.js (which is the CI-critical functional smoke test)
// so neither script can regress the other; this one additionally stubs out
// src/infra/cloud/firebase.js's gstatic-hosted imports with a local no-op
// module. That's not just a sandbox workaround — a11y/visual checks render
// UI from local seed data and have no business depending on a live network
// call to Google's CDN or touching real Firestore, so every consumer of this
// harness gets a faster, more deterministic run regardless of environment.
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

const FIREBASE_STUB = `
export const db = {};
export const auth = {};
export const provider = { addScope() {} };
export function doc() { return {}; }
export function setDoc() { return Promise.resolve(); }
export function onSnapshot() { return () => {}; }
export class GoogleAuthProvider { addScope() {} }
export function signInWithPopup() { return Promise.resolve({}); }
export function signInWithRedirect() {}
export function getRedirectResult() { return Promise.resolve(null); }
export function onAuthStateChanged() { return () => {}; }
export function signOut() { return Promise.resolve(); }
`;

const CONTENT_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
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
    throw new Error("Chrome/Edge not found. Set CHROME_PATH to run this script.");
  }
  return hit;
}

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname === "/src/infra/cloud/firebase.js") {
      res.writeHead(200, { "Content-Type": "text/javascript" });
      res.end(FIREBASE_STUB);
      return;
    }
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
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { "Content-Type": CONTENT_TYPES[ext] || "application/octet-stream" });
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

  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });

  return new Promise((resolve, reject) => {
    ws.addEventListener("open", () => {
      resolve({
        send(method, params = {}) {
          const callId = ++id;
          ws.send(JSON.stringify({ id: callId, method, params }));
          return new Promise((res, rej) => {
            pending.set(callId, { resolve: res, reject: rej });
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

async function waitFor(client, expression, label, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await client.send("Runtime.evaluate", { returnByValue: true, expression });
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
    throw new Error(
      result.exceptionDetails.exception?.description || result.exceptionDetails.text,
    );
  }
  return result.result.value;
}

// A small, fixed roster/history used by both a11y and visual-regression
// checks — enough players/matches/seasons to exercise real content in every
// view (Home, Summary — all four scoring systems, Statistics, History,
// Player Detail, season picker) without depending on live data.
const SEED_PLAYERS = {
  1: { id: 1, name: "Ankit" },
  2: { id: 2, name: "Rahul" },
  3: { id: 3, name: "Sahil" },
  4: { id: 4, name: "Puneet" },
  5: { id: 5, name: "Vinit" },
  6: { id: 6, name: "Nilesh" },
};
const _m = (date, a, b, sa, sb) => ({ date, teamA: a, teamB: b, scoreA: sa, scoreB: sb });
const SEED_MATCHES = (() => {
  const names = ["Ankit", "Rahul", "Sahil", "Puneet", "Vinit", "Nilesh"];
  const out = [];
  for (let i = 0; i < 30; i++) {
    const a = names[i % 6],
      b = names[(i + 1) % 6],
      c = names[(i + 2) % 6],
      d = names[(i + 3) % 6];
    const day = String(1 + (i % 27)).padStart(2, "0");
    out.push(_m(`2026-0${1 + (i % 6)}-${day}`, [a, b], [c, d], 6, i % 6));
  }
  return out;
})();

// Launches Chrome, serves the repo (with the Firebase stub), navigates to
// index.html with a seeded offline cache, and waits for the app to finish
// its splash/boot sequence. Returns { client, close() } — call close() when
// done to tear down the browser and HTTP server.
async function launch({ extraLocalStorage = "" } = {}) {
  const browserPath = findBrowser();
  const server = createServer();
  const appPort = await listen(server);
  const debugPort = 9500 + Math.floor(Math.random() * 500);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "padel-harness-"));
  const chrome = spawn(
    browserPath,
    [
      "--headless=new",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      "--force-color-profile=srgb",
      "about:blank",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  const targets = await getJson(`http://127.0.0.1:${debugPort}/json/list`);
  const page = targets.find((t) => t.type === "page") || targets[0];
  const client = await connectCdp(page.webSocketDebuggerUrl);
  await client.send("Runtime.enable");
  await client.send("Page.enable");
  await client.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      window.__harnessErrors = [];
      window.addEventListener("error", e => window.__harnessErrors.push(e.message));
      window.addEventListener("unhandledrejection", e => window.__harnessErrors.push(String(e.reason)));
      localStorage.setItem("padel_forced_offline", "1");
      localStorage.setItem("padel_cache_v5", JSON.stringify({
        ts: Date.now(),
        matches: ${JSON.stringify(SEED_MATCHES)},
        players: ${JSON.stringify(SEED_PLAYERS)},
        playerAliasMap: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
        nextPlayerId: 7
      }));
      ${extraLocalStorage}
    `,
  });
  await client.send("Page.navigate", { url: `http://127.0.0.1:${appPort}/index.html` });
  await waitFor(
    client,
    `document.body.classList.contains("splash-done") && document.querySelectorAll("#board .pc").length >= 4`,
    "offline cached startup",
  );

  return {
    client,
    appPort,
    async close() {
      try {
        client.close();
      } catch (e) {}
      try {
        chrome.kill();
      } catch (e) {}
      try {
        server.close();
      } catch (e) {}
      try {
        fs.rmSync(userDataDir, { recursive: true, force: true });
      } catch (e) {}
    },
  };
}

module.exports = {
  launch,
  evaluate,
  waitFor,
  delay,
  ROOT,
  SEED_PLAYERS,
  SEED_MATCHES,
};
