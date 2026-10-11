"use strict";

// In-browser consistency invariants: a rating is the SAME number on every
// screen. Complements tests/tests-consistency.mjs (static: no screen may reach
// around the rating service) by checking what is actually printed.
//
//   node scripts/consistency-check.js                       # ep, ass, glicko2 on a synthetic league
//   node scripts/consistency-check.js --all                 # all five systems
//   node scripts/consistency-check.js --systems ep,ass
//   node scripts/consistency-check.js --backup file.json    # a real exported backup instead
//
// Invariants, per scoring system:
//   1. Nothing throws or logs an error while every surface is opened.
//   2. A match's History pills == its overlay (before -> after) == the share
//      poster chips, to the printed digit.
//   3. The Summary leaderboard score of a player == the "after" rating on
//      that player's last match of the season (leaderboard == card).
//   4. The Player Detail sheet shows the leaderboard score for that player.
//   5. Switching systems at runtime repaints Home / History / Summary with
//      exactly what a fresh boot on that system shows.
const fs = require("node:fs");
const path = require("node:path");
const { launch, evaluate, waitFor, delay } = require("./_test-harness.js");

const args = process.argv.slice(2);
const argVal = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const SYSTEMS = args.includes("--all")
  ? ["ep", "ass", "glicko2", "openskill", "fairshare"]
  : (argVal("--systems") || "ep,ass,glicko2").split(",");

// ── Dataset ───────────────────────────────────────────────────────────────
// Deterministic synthetic league (two seasons, 8 players, mixed margins) so
// the check needs no private data. Dates are fixed in the past and the second
// season is open-ended, so it is "the ongoing season" whenever this runs.
function syntheticLeague() {
  let seed = 20260101;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const names = ["Alex", "Bea", "Cal", "Dee", "Eli", "Fay", "Gus", "Hal"];
  // Skill spread so the ratings actually separate.
  const skill = { Alex: 1.4, Bea: 1.1, Cal: 0.6, Dee: 0.2, Eli: 0, Fay: -0.3, Gus: -0.7, Hal: -1.1 };
  const matches = [];
  let n = 0;
  const day = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const play = (date) => {
    const pool = [...names].sort(() => rnd() - 0.5).slice(0, 4);
    const teamA = [pool[0], pool[1]];
    const teamB = [pool[2], pool[3]];
    const str = (t) => t.reduce((s, p) => s + skill[p], 0);
    const pA = 1 / (1 + Math.exp(-(str(teamA) - str(teamB)) * 0.8));
    const aWins = rnd() < pA;
    const loser = Math.floor(rnd() * 4);
    matches.push({
      id: `syn${++n}`,
      date,
      teamA,
      teamB,
      scoreA: aWins ? 4 : loser,
      scoreB: aWins ? loser : 4,
    });
  };
  // Season 1: 2025-03-01 .. 2025-05-31 (every 3rd day, 3 matches)
  for (let d = 0; d < 90; d += 3) {
    const dt = new Date(Date.UTC(2025, 2, 1 + d));
    const date = day(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
    for (let k = 0; k < 3; k++) play(date);
  }
  // Season 2: 2025-06-01 .. (every 3rd day, 3 matches) up to 2025-09-15
  for (let d = 0; d < 107; d += 3) {
    const dt = new Date(Date.UTC(2025, 5, 1 + d));
    const date = day(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
    for (let k = 0; k < 3; k++) play(date);
  }
  // A guest sits in a handful of matches in each season. Guest matches are
  // kept out of the ratings everywhere, so they exercise the "not rated" path.
  [4, 11, 19, 33, 40, 52, 61, 75, 88, 97, 110, 121].forEach((i) => {
    matches[i].teamB = [matches[i].teamB[0], "Zed"];
  });
  const players = {};
  const aliases = {};
  names.forEach((name, i) => {
    players[i + 1] = { id: i + 1, name, isGuest: false, email: "", image: "" };
    aliases[i + 1] = [name.slice(0, 3)];
  });
  players[names.length + 1] = { id: names.length + 1, name: "Zed", isGuest: true, email: "", image: "" };
  aliases[names.length + 1] = ["Zed"];
  return {
    matches,
    players,
    playerAliasMap: aliases,
    nextPlayerId: names.length + 2,
    seasons: [
      { id: "s1", name: "Season 1", start: "2025-03-01", end: "2025-05-31" },
      { id: "s2", name: "Season 2", start: "2025-06-01", end: null },
    ],
  };
}

const dataset = argVal("--backup")
  ? JSON.parse(fs.readFileSync(path.resolve(argVal("--backup")), "utf8"))
  : syntheticLeague();

// ── Helpers ───────────────────────────────────────────────────────────────
let pass = 0;
let fail = 0;
const failures = [];
function ok(label, cond, detail) {
  if (cond) {
    pass++;
  } else {
    fail++;
    failures.push(`${label}${detail ? "  →  " + detail : ""}`);
    process.stdout.write(`  \x1b[31m✗\x1b[0m ${label}${detail ? `\n      \x1b[33m${detail}\x1b[0m` : ""}\n`);
  }
}

const STORAGE = (sys) => `
  localStorage.setItem("padel_cache_v5", ${JSON.stringify(JSON.stringify({
    ts: Date.now(),
    matches: dataset.matches,
    players: dataset.players,
    playerAliasMap: dataset.playerAliasMap,
    nextPlayerId: dataset.nextPlayerId,
  }))});
  localStorage.setItem("padel_seasons", ${JSON.stringify(JSON.stringify(dataset.seasons))});
  localStorage.setItem("padel_scoring_system", ${JSON.stringify(sys)});
  localStorage.setItem("padel_scoring_renamed_v1", "1");
  window.__consoleErrors = [];
  const __ce = console.error;
  console.error = (...a) => {
    window.__consoleErrors.push(a.map((x) => (x && x.stack ? x.stack : String(x))).join(" ").slice(0, 300));
    __ce.apply(console, a);
  };
`;

async function boot(sys) {
  const h = await launch({ extraLocalStorage: STORAGE(sys) });
  await waitFor(h.client, 'document.body.classList.contains("splash-done")', "boot", 30000);
  return h;
}

const errorsOf = (client) =>
  evaluate(client, "[...window.__harnessErrors, ...window.__consoleErrors]");

// Leaderboard rows for the currently selected season: { NAME: "scoreText" }.
async function leaderboard(client) {
  await evaluate(
    client,
    `(() => { window.switchMainTab("compact"); const s = document.getElementById("cmpSel"); s.value = "all"; window.onCmpFilter(); return 1; })()`,
  );
  await waitFor(client, 'document.querySelectorAll("#cmpBody tr:not(.skel-row)").length > 0', "leaderboard rows", 20000);
  return evaluate(
    client,
    `(() => {
      const out = {};
      document.querySelectorAll("#cmpBody tr").forEach((t) => {
        const name = t.children[1].textContent.replace(/[▲▼]\\d+/, "").trim();
        out[name] = t.querySelector('[data-col="ass"]').textContent.trim();
      });
      return out;
    })()`,
  );
}

// First three Home cards. They are appended on a short stagger, so wait for
// them rather than read the board the instant the tab changes.
async function homeCards(client) {
  await evaluate(client, `window.goTo("home")`);
  await waitFor(client, 'document.querySelectorAll("#board .pc").length >= 3', "home cards", 10000);
  await delay(1600); // the rating numbers count up from 0 — read them once settled
  return evaluate(
    client,
    `[...document.querySelectorAll("#board .pc")].slice(0, 3).map((c) => c.innerText.replace(/\\s+/g, " ").trim()).join(" || ")`,
  );
}

async function selectSeason(client, id) {
  await evaluate(client, `window.setSeason(${JSON.stringify(id)})`);
  await delay(250);
}

// Each player's last match (index into state.matches) in a season. Matches
// with a guest are skipped: the leaderboard never counts them, so a guest
// match's rating is not expected to equal the leaderboard score.
const lastMatchIndexes = (client, seasonId) =>
  evaluate(
    client,
    `(async () => {
      const { state } = await import("/src/domain/state.js");
      const { _inSeason } = await import("/src/domain/selectors.js");
      const season = state.seasons.find((s) => s.id === ${JSON.stringify(seasonId)});
      const guests = new Set(Object.values(state.players || {}).filter((p) => p.isGuest).map((p) => p.name));
      const last = {};
      state.matches.forEach((m, i) => {
        if (!_inSeason(season, m.date)) return;
        if ([...m.teamA, ...m.teamB].some((p) => guests.has(p))) return;
        [...m.teamA, ...m.teamB].forEach((p) => {
          const prev = last[p];
          if (prev === undefined || (state.matches[prev].date || "") <= (m.date || "")) last[p] = i;
        });
      });
      return last;
    })()`,
  );

// What the overlay prints for a match: [{ name, old, next }].
const overlayPills = (client, idx) =>
  evaluate(
    client,
    `(() => {
      window.openMatchIntro(${idx});
      const pills = [...document.querySelectorAll("#mio-elo-deltas .mio-delta-pill")].map((p) => {
        const [o, n] = p.querySelector(".mio-delta-range").textContent.split("→").map((x) => x.trim());
        return { name: p.querySelector(".mio-delta-name").textContent.trim(), old: o, next: n };
      });
      return pills;
    })()`,
  );

async function main() {
  const fresh = {}; // system -> what a fresh boot prints (for the runtime-switch check)

  for (const sys of SYSTEMS) {
    console.log(`\n\x1b[36m── ${sys} ─────────────────────────────────────────\x1b[0m`);
    const { client, close } = await boot(sys);
    try {
      const seasons = dataset.seasons.filter((s) => dataset.matches.some((m) => m.date >= s.start && (!s.end || m.date <= s.end)));

      for (const season of seasons) {
        await selectSeason(client, season.id);

        // ── 3. leaderboard == last match "after" ──────────────────────────
        const board = await leaderboard(client);
        const last = await lastMatchIndexes(client, season.id);
        let compared = 0;
        for (const [player, idx] of Object.entries(last)) {
          const shown = board[player.toUpperCase()];
          if (shown === undefined) continue; // hidden/excluded on the board
          const pills = await overlayPills(client, idx);
          const mine = pills.find((p) => p.name.toUpperCase() === player.toUpperCase());
          compared++;
          ok(
            `${sys}/${season.name}: ${player} leaderboard == last-match rating`,
            mine && mine.next === shown,
            `leaderboard ${shown} vs overlay ${mine && mine.next}`,
          );
        }
        ok(`${sys}/${season.name}: compared at least 5 players`, compared >= 5, `compared ${compared}`);

        // A guest match is a plain result: no rating numbers anywhere.
        const guestIdx = await evaluate(
          client,
          `(async () => {
            const { state } = await import("/src/domain/state.js");
            const { _inSeason } = await import("/src/domain/selectors.js");
            const season = state.seasons.find((s) => s.id === ${JSON.stringify(season.id)});
            const guests = new Set(Object.values(state.players || {}).filter((p) => p.isGuest).map((p) => p.name));
            return state.matches.findIndex((m) => _inSeason(season, m.date) && [...m.teamA, ...m.teamB].some((p) => guests.has(p)));
          })()`,
        );
        if (guestIdx >= 0) {
          const g = await evaluate(
            client,
            `(() => {
              window.openMatchIntro(${guestIdx});
              const out = {
                note: !!document.querySelector("#mio-elo-deltas .mio-unrated"),
                pills: document.querySelectorAll("#mio-elo-deltas .mio-delta-pill").length,
              };
              window.closeMatchIntro && window.closeMatchIntro();
              return out;
            })()`,
          );
          ok(`${sys}/${season.name}: guest match #${guestIdx} shows "not counted", no rating pills`, g.note && g.pills === 0, JSON.stringify(g));
          const gp = await evaluate(
            client,
            `(() => {
              window.switchMainTab("history"); window.filterMatchTab("all");
              const c = document.querySelector('#modern-match-list .match-card[data-match-idx="${guestIdx}"]');
              return c ? c.querySelectorAll(".elo-delta-pill").length : -1;
            })()`,
          );
          ok(`${sys}/${season.name}: guest match #${guestIdx} History card has no rating pills`, gp <= 0, `${gp}`);
        }

        // ── 2. pills == overlay == poster for sampled matches ─────────────
        await evaluate(client, `(() => { window.switchMainTab("history"); window.filterMatchTab("all"); return 1; })()`);
        await delay(300);
        const sample = await evaluate(
          client,
          `(() => {
            const cards = [...document.querySelectorAll("#modern-match-list .match-card[data-match-idx]")];
            const pick = [cards[0], cards[Math.floor(cards.length / 2)], cards[cards.length - 1]].filter(Boolean);
            return pick.map((c) => ({
              idx: Number(c.dataset.matchIdx),
              pills: [...c.querySelectorAll(".elo-delta-pill")].map((e) => ({
                after: e.querySelector(".elo-pval").textContent.trim(),
                change: e.querySelector(".elo-parrow").textContent.trim(),
              })),
            }));
          })()`,
        );
        ok(`${sys}/${season.name}: history has cards to sample`, sample.length >= 2, `${sample.length}`);
        for (const card of sample) {
          const over = await overlayPills(client, card.idx);
          const afters = (a) => a.map((x) => x.after ?? x.next).sort().join(",");
          ok(
            `${sys}/${season.name}: match #${card.idx} History pills == overlay (after)`,
            afters(card.pills) === afters(over),
            `${afters(card.pills)} vs ${afters(over)}`,
          );
          await evaluate(client, `window.closeMatchIntro && window.closeMatchIntro()`);

          const posterChips = await evaluate(
            client,
            `(() => {
              window.openShareMatchPoster(${card.idx});
              const o = document.getElementById("share-card-overlay");
              const chips = o ? [...o.querySelectorAll("span")].filter((s) => /^[+-]?\\d+(\\.\\d+)?$/.test(s.textContent.trim()) && s.style.fontSize === "10px").map((s) => s.textContent.trim()) : null;
              o && o.remove();
              return chips;
            })()`,
          );
          const cardChanges = card.pills.map((p) => p.change.replace(/^[↑↓]/, "")).sort();
          const posterAbs = (posterChips || []).map((c) => c.replace(/^[+-]/, "")).sort();
          ok(
            `${sys}/${season.name}: match #${card.idx} History change == poster chips`,
            JSON.stringify(cardChanges) === JSON.stringify(posterAbs),
            `${cardChanges} vs ${posterAbs}`,
          );
        }

        // ── 4. player detail shows the leaderboard score ──────────────────
        const topName = Object.keys(board)[0];
        const displayName = Object.keys(last).find((n) => n.toUpperCase() === topName);
        if (displayName) {
          const pd = await evaluate(
            client,
            `(() => {
              window.openPlayerDetail(${JSON.stringify(displayName)});
              const v = document.getElementById("pd-ass-val");
              const out = v ? v.textContent.trim() : null;
              document.getElementById("player-detail-modal")?.remove();
              return out;
            })()`,
          );
          ok(
            `${sys}/${season.name}: Player Detail rating == leaderboard (${displayName})`,
            pd === board[topName],
            `detail ${pd} vs leaderboard ${board[topName]}`,
          );
        }

        if (season === seasons[seasons.length - 1]) {
          const homeCard = await homeCards(client);
          const pill = await evaluate(
            client,
            `(() => { window.switchMainTab("history"); window.filterMatchTab("all"); const c = document.querySelector("#modern-match-list .match-card[data-match-idx]"); return c ? [...c.querySelectorAll(".elo-delta-pill")].map((e) => e.textContent.trim()).join(" ") : null; })()`,
          );
          fresh[sys] = { board: JSON.stringify(board), homeCard, pill };
        }
      }

      // ── 1. nothing threw while we opened everything ─────────────────────
      await evaluate(client, `(() => { window.switchMainTab("analytics"); return 1; })()`);
      await delay(2500);
      const errs = await errorsOf(client);
      ok(`${sys}: no errors while opening every surface`, errs.length === 0, JSON.stringify(errs).slice(0, 300));
    } finally {
      await close();
    }
  }

  // ── 5. runtime switch == fresh boot ───────────────────────────────────
  if (SYSTEMS.length >= 2) {
    const [from, to] = [SYSTEMS[0], SYSTEMS[1]];
    console.log(`\n\x1b[36m── runtime switch ${from} → ${to} ──────────────────────\x1b[0m`);
    const { client, close } = await boot(from);
    try {
      const season = dataset.seasons[dataset.seasons.length - 1];
      await selectSeason(client, season.id);
      // Paint every tab on the first system, so their guards are populated.
      await leaderboard(client);
      await evaluate(client, `(() => { window.goTo("home"); window.switchMainTab("history"); window.filterMatchTab("all"); return 1; })()`);
      await evaluate(client, `window._setScoringSystem(${JSON.stringify(to)})`);
      await delay(300);
      const board = await leaderboard(client);
      const homeCard = await homeCards(client);
      const pill = await evaluate(
        client,
        `(() => { window.switchMainTab("history"); window.filterMatchTab("all"); const c = document.querySelector("#modern-match-list .match-card[data-match-idx]"); return c ? [...c.querySelectorAll(".elo-delta-pill")].map((e) => e.textContent.trim()).join(" ") : null; })()`,
      );
      ok(`switch ${from}→${to}: Summary == fresh ${to} boot`, JSON.stringify(board) === fresh[to].board);
      ok(`switch ${from}→${to}: Home == fresh ${to} boot`, homeCard === fresh[to].homeCard, `${homeCard} vs ${fresh[to].homeCard}`);
      ok(`switch ${from}→${to}: History == fresh ${to} boot`, pill === fresh[to].pill, `${pill} vs ${fresh[to].pill}`);
      const errs = await errorsOf(client);
      ok(`switch ${from}→${to}: no errors`, errs.length === 0, JSON.stringify(errs).slice(0, 300));
    } finally {
      await close();
    }
  }

  console.log(`\n\x1b[1mConsistency: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
