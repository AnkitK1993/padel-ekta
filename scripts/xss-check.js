"use strict";

// Canary test for HTML escaping, in a real browser. The name rule
// (players.js cleanPlayerName) stops markup at the UI, but names can still
// arrive through a backup import, an old document or a bug — so every screen
// must render them as text. This seeds players whose names are live markup
// and quote/ampersand traps, opens every main surface, and fails if any of
// it ran as HTML (an injected element appears or its handler fires) or broke
// an inline handler (a script error).
//
//   node scripts/xss-check.js
const { launch, evaluate, waitFor, delay } = require("./_test-harness.js");

const EVIL = `<img src=x data-xss onerror="window.__xss=(window.__xss||0)+1">`;
const QUOTE = `Tom "T" O'Neil`;
const AMP = "Bea & Co";
const NAMES = [EVIL, QUOTE, AMP, "Cal", "Dee", "Eli"];

function league() {
  // Three months, two seasons, every player in plenty of games — enough for
  // the Statistics sections that need history (monthly, seasons, pairs,
  // streaks, form) to actually render.
  const matches = [];
  let n = 0;
  for (let d = 0; d < 80; d++) {
    const dt = new Date(Date.UTC(2025, 5, 1 + d));
    const date = dt.toISOString().slice(0, 10);
    for (let k = 0; k < 3; k++) {
      const r = (j) => NAMES[(d * 3 + k + j) % NAMES.length];
      const A = [r(0), r(1)];
      const B = [r(2), r(3)];
      const aWins = (d + k) % 3 !== 0;
      const lo = (d * 7 + k) % 4;
      matches.push({ id: `x${++n}`, date, teamA: A, teamB: B, scoreA: aWins ? 4 : lo, scoreB: aWins ? lo : 4 });
    }
  }
  const players = {};
  NAMES.forEach((name, i) => (players[i + 1] = { id: i + 1, name, isGuest: false, email: "", image: "" }));
  return { matches, players };
}

let pass = 0;
let fail = 0;
function ok(label, cond, detail) {
  if (cond) pass++;
  else {
    fail++;
    process.stdout.write(`  \x1b[31m✗\x1b[0m ${label}${detail ? `\n      \x1b[33m${detail}\x1b[0m` : ""}\n`);
  }
}

async function main() {
  const { matches, players } = league();
  const aliasMap = {};
  Object.keys(players).forEach((id) => (aliasMap[id] = []));
  const { client, close } = await launch({
    extraLocalStorage: `
      localStorage.setItem("padel_cache_v5", ${JSON.stringify(JSON.stringify({ ts: Date.now(), matches, players, playerAliasMap: aliasMap, nextPlayerId: 7 }))});
      localStorage.setItem("padel_seasons", ${JSON.stringify(JSON.stringify([{ id: "s1", name: "Summer <b data-xss>25</b>", start: "2025-06-01", end: "2025-06-30" }, { id: "s2", name: "Autumn & Co", start: "2025-07-01", end: null }]))});
      window.__consoleErrors = [];
      const __ce = console.error;
      console.error = (...a) => { window.__consoleErrors.push(a.map(String).join(" ").slice(0, 200)); __ce.apply(console, a); };
    `,
  });
  // Anything carrying data-xss in the DOM came from a name/season rendered as
  // markup; __xss counts handlers that actually ran. Both are per surface.
  let firedBefore = 0;
  const injected = async () => {
    const r = await evaluate(client, `({ fired: window.__xss || 0, nodes: [...document.querySelectorAll("[data-xss]")].map((n) => n.tagName + " in " + (n.parentElement && n.parentElement.className)).slice(0, 4) })`);
    const out = { fired: r.fired - firedBefore, nodes: r.nodes };
    firedBefore = r.fired;
    await evaluate(client, `document.querySelectorAll("[data-xss]").forEach((n) => n.remove())`);
    return out;
  };
  const surfaces = [
    ["Home", `window.goTo("home")`],
    ["Summary", `(() => { window.switchMainTab("compact", true); const s = document.getElementById("cmpSel"); s.value = "all"; window.onCmpFilter(); })()`],
    ["History", `(() => { window.switchMainTab("history", true); window.filterMatchTab("all"); })()`],
    ["Match overlay", `window.openMatchIntro(0)`],
    ["Player detail", `(() => { window.closeMatchIntro && window.closeMatchIntro(); window.openPlayerDetail(${JSON.stringify(EVIL)}); })()`],
    ["Head-to-head", `(() => { document.getElementById("player-detail-modal")?.remove(); window.openH2HDetail(${JSON.stringify(EVIL)}, ${JSON.stringify(QUOTE)}); })()`],
    ["Share poster", `(() => { document.getElementById("h2h-detail-modal")?.remove(); window.openShareMatchPoster(0); })()`],
    ["Weekly digest", `(() => { document.getElementById("share-card-overlay")?.remove(); window.openWeeklyDigest(); })()`],
    ["Session highlights", `(() => { document.getElementById("share-card-overlay")?.remove(); window.openSessionHighlights("2025-07-05"); })()`],
    ["Statistics", `(() => { document.getElementById("session-highlights-modal")?.remove(); window.switchMainTab("analytics", true); })()`],
    ["Data health", `window.runDataHealthCheck()`],
    ["Replay", `window._replayUpdate && window._replayUpdate(30)`],
    ["Rivalry screen", `window.openRivalryScreen(${JSON.stringify(EVIL)}, ${JSON.stringify(AMP)})`],
    ["Pair detail", `(() => { document.querySelectorAll(".h2h-modal-overlay,[id$='-modal']").forEach((m) => m.remove()); const key = [${JSON.stringify(EVIL)}, ${JSON.stringify(QUOTE)}].sort().join(" & "); window.openPairDetail(key); })()`],
    ["Personal recap", `(() => { document.querySelectorAll("[id$='-modal']").forEach((m) => m.remove()); window.openPersonalSeasonRecap("s2", ${JSON.stringify(EVIL)}); })()`],
    ["Admin lists", `(() => { document.getElementById("season-reveal-modal")?.remove(); window.isAdmin = true; window.goTo("add"); window.refreshManage && window.refreshManage(); window.renderNamesTable && window.renderNamesTable(); })()`],
  ];
  try {
    for (const [name, js] of surfaces) {
      await evaluate(client, js);
      await delay(name === "Statistics" ? 2500 : 600);
      const r = await injected();
      ok(`${name}: hostile names render as text`, r.fired === 0 && r.nodes.length === 0, JSON.stringify(r));
    }
    // The names must actually be on screen as text (not dropped).
    const shown = await evaluate(client, `(() => { window.switchMainTab("compact", true); return document.body.innerText.includes(${JSON.stringify(EVIL.toUpperCase())}) || document.body.innerText.includes(${JSON.stringify(EVIL)}); })()`);
    ok("the hostile name is displayed literally", shown);
    // Inline handlers built with these names must still work.
    await evaluate(client, `(() => { const tr = [...document.querySelectorAll("#cmpBody tr")].find((t) => t.textContent.includes("O'NEIL")); tr && tr.click(); })()`);
    await delay(500);
    ok("a row for a name with quotes still opens its player sheet", await evaluate(client, `!!document.getElementById("player-detail-modal")`));
    const errs = await evaluate(client, `[...window.__harnessErrors, ...window.__consoleErrors]`);
    ok("no script errors on any surface", errs.length === 0, JSON.stringify(errs).slice(0, 400));
  } finally {
    await close();
  }
  console.log(`\n\x1b[1mEscaping: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
