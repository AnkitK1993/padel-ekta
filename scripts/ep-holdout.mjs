// Held-out validation of the ASS (Earned Points) tuning constants.
//
//   node scripts/ep-holdout.mjs path/to/backup.json
//
// The constants in src/domain/ep.js were chosen by looking at real seasons.
// This checks they weren't just fitted to the season we looked at: for every
// pair of seasons it TUNES on one (grid search) and TESTS on the other, and
// reports, on the held-out season:
//   - rank agreement with win %  (Spearman, players with 10+ games) — the
//     league's own yardstick for "who is actually good";
//   - next-match prediction: before each match, does the team with the higher
//     current score win? (causal: only earlier matches are used). Compared
//     with a win-% predictor, ASS CLASSIC and a coin flip.
//
// Nothing here changes the app; it only reads the engine with substituted
// constants (ep.js has no imports, so a patched copy runs on its own).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { computeMatchASSDeltas } from "../src/domain/ass.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/ep-holdout.mjs <backup.json>");
  process.exit(2);
}
const backup = JSON.parse(fs.readFileSync(file, "utf8"));
const guests = new Set(Object.values(backup.players || {}).filter((p) => p.isGuest).map((p) => p.name));
const career = backup.matches.filter((m) => ![...m.teamA, ...m.teamB].some((p) => guests.has(p)));
const inSeason = (s, d) => (!s.start || d >= s.start) && (!s.end || d <= s.end);
const seasons = [...(backup.seasons || [])]
  .sort((a, b) => (a.start || "").localeCompare(b.start || ""))
  .map((s) => ({ ...s, matches: career.filter((m) => inSeason(s, m.date || "")) }))
  .filter((s) => s.matches.length >= 40);
if (seasons.length < 2) {
  console.error("need at least two seasons with 40+ rated matches");
  process.exit(2);
}

// ── engine variants ────────────────────────────────────────────────────
const SRC = fs.readFileSync(path.join(ROOT, "src/domain/ep.js"), "utf8");
const KNOBS = ["OPP_W", "VET_LOSS", "LOSS_BASE", "MARGIN_W", "TEAM_SPLIT_MAX_SHIFT", "EP_SHRINKAGE"];
const shipped = {};
for (const k of KNOBS) {
  const m = SRC.match(new RegExp(`(?:export )?const ${k} = ([\\d.]+)`));
  if (!m) throw new Error(`constant ${k} not found in ep.js`);
  shipped[k] = Number(m[1]);
}
const GRID = {
  OPP_W: [0.2, 0.4, 0.6],
  VET_LOSS: [20, 40, 60],
  LOSS_BASE: [0, 10, 20],
  MARGIN_W: [0.2, 0.4, 0.6],
  TEAM_SPLIT_MAX_SHIFT: [0, 0.12, 0.24],
  EP_SHRINKAGE: [5, 10, 20],
};
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ep-holdout-"));
const engines = new Map();
async function engineFor(params) {
  const key = KNOBS.map((k) => params[k]).join("|");
  if (engines.has(key)) return engines.get(key);
  let src = SRC;
  for (const k of KNOBS) src = src.replace(new RegExp(`((?:export )?const ${k} = )[\\d.]+`), `$1${params[k]}`);
  const f = path.join(tmp, `ep-${engines.size}.mjs`);
  fs.writeFileSync(f, src);
  const mod = await import(pathToFileURL(f).href);
  engines.set(key, mod);
  return mod;
}

// ── metrics ────────────────────────────────────────────────────────────
const byDate = (a, b) => (a.date || "").localeCompare(b.date || "");
function spearman(xs, ys) {
  const rank = (v) => {
    const order = v.map((x, i) => [x, i]).sort((a, b) => b[0] - a[0]);
    const r = new Array(v.length);
    order.forEach(([, i], k) => (r[i] = k + 1));
    return r;
  };
  const rx = rank(xs);
  const ry = rank(ys);
  const n = xs.length;
  const d2 = rx.reduce((s, r, i) => s + (r - ry[i]) ** 2, 0);
  return 1 - (6 * d2) / (n * (n * n - 1));
}

// Walk a season once; before each match record each side's current strength
// under several predictors, then score the match. All causal.
function evaluate(season, ep, params) {
  const ordered = [...season.matches].sort(byDate);
  const epDeltas = ep.computeMatchEPDeltas(ordered, career);
  const classic = computeMatchASSDeltas(ordered);
  const tot = {}, games = {}, wins = {}, cls = {};
  const scale = 2; // EP_SCALE: ranking-neutral, kept for readable numbers
  const score = (p) => (games[p] ? (scale * (tot[p] || 0)) / (games[p] + params.EP_SHRINKAGE) : 0);
  const wr = (p) => ((wins[p] || 0) + 1) / ((games[p] || 0) + 2);
  const team = (t, f) => t.reduce((s, p) => s + f(p), 0) / t.length;
  const hits = { ep: [0, 0], winrate: [0, 0], classic: [0, 0] };
  ordered.forEach((m, k) => {
    const aWon = m.scoreA > m.scoreB;
    if (k >= 20 && m.scoreA !== m.scoreB) {
      const judge = (name, a, b) => {
        if (Math.abs(a - b) < 1e-9) return;
        hits[name][1]++;
        if (a > b === aWon) hits[name][0]++;
      };
      judge("ep", team(m.teamA, score), team(m.teamB, score));
      judge("winrate", team(m.teamA, wr), team(m.teamB, wr));
      judge("classic", team(m.teamA, (p) => cls[p] ?? 1000), team(m.teamB, (p) => cls[p] ?? 1000));
    }
    const e = epDeltas.get(m);
    const c = classic.get(m);
    [...m.teamA, ...m.teamB].forEach((p) => {
      tot[p] = (tot[p] || 0) + (e ? e.playerDeltas[p] || 0 : 0);
      games[p] = (games[p] || 0) + 1;
      const won = m.teamA.includes(p) === aWon;
      if (won) wins[p] = (wins[p] || 0) + 1;
      cls[p] = (cls[p] ?? 1000) + (c ? c.playerDeltas[p] || 0 : 0);
    });
  });
  const regulars = Object.keys(games).filter((p) => games[p] >= 10);
  const rho = spearman(regulars.map(score), regulars.map((p) => (wins[p] || 0) / games[p]));
  const acc = (h) => (h[1] ? h[0] / h[1] : NaN);
  return { rho, acc: acc(hits.ep), n: hits.ep[1], baseline: { winrate: acc(hits.winrate), classic: acc(hits.classic) } };
}

function* gridPoints() {
  const keys = Object.keys(GRID);
  const idx = keys.map(() => 0);
  while (true) {
    yield Object.fromEntries(keys.map((k, i) => [k, GRID[k][idx[i]]]));
    let i = 0;
    while (i < keys.length && ++idx[i] === GRID[keys[i]].length) idx[i++] = 0;
    if (i === keys.length) return;
  }
}

const pct = (x) => `${(100 * x).toFixed(1)}%`;

// --try "VET_LOSS=20,EP_SHRINKAGE=5" [--try ...]: evaluate specific variants of
// the shipped constants on every season (no tuning), to weigh a proposal.
const tries = process.argv
  .map((a, i, all) => (a === "--try" ? all[i + 1] : null))
  .filter(Boolean);
const fmtP = (p) => KNOBS.map((k) => `${k}=${p[k]}`).join(" ");

const results = []; // per grid point: { params, bySeason: [{rho, acc}] }
for (const params of gridPoints()) {
  const ep = await engineFor(params);
  results.push({ params, bySeason: seasons.map((s) => evaluate(s, ep, params)) });
}
const shippedEval = seasons.map(async (s) => evaluate(s, await engineFor(shipped), shipped));
const shippedRes = await Promise.all(shippedEval);

console.log(`\nASS (Earned Points) — held-out validation on ${path.basename(file)}`);
console.log(`Seasons: ${seasons.map((s) => `${s.name} (${s.matches.length} rated matches)`).join(", ")}`);
console.log(`Grid: ${results.length} constant combinations. Shipped: ${fmtP(shipped)}\n`);

for (let t = 0; t < seasons.length; t++) {
  for (let h = 0; h < seasons.length; h++) {
    if (t === h) continue;
    // Tune on season t by rank agreement with win % (the league's yardstick),
    // breaking ties by prediction accuracy.
    const best = [...results].sort(
      (a, b) =>
        b.bySeason[t].rho - a.bySeason[t].rho || b.bySeason[t].acc - a.bySeason[t].acc,
    )[0];
    const oracle = [...results].sort((a, b) => b.bySeason[h].rho - a.bySeason[h].rho)[0];
    const H = seasons[h];
    console.log(`Tune on ${seasons[t].name} → test on ${H.name}`);
    console.log(`  tuned constants:   ${fmtP(best.params)}`);
    console.log(`  held-out win% rank agreement:  shipped ${shippedRes[h].rho.toFixed(2)} · tuned-on-other ${best.bySeason[h].rho.toFixed(2)} · best possible ${oracle.bySeason[h].rho.toFixed(2)}`);
    console.log(`  held-out next-match prediction (${shippedRes[h].n} matches): shipped ${pct(shippedRes[h].acc)} · tuned-on-other ${pct(best.bySeason[h].acc)} · win% ${pct(shippedRes[h].baseline.winrate)} · ASS CLASSIC ${pct(shippedRes[h].baseline.classic)} · coin flip 50.0%\n`);
  }
}
for (const t of tries) {
  const params = { ...shipped };
  t.split(",").forEach((kv) => {
    const [k, v] = kv.split("=");
    if (!KNOBS.includes(k)) throw new Error(`unknown constant ${k}`);
    params[k] = Number(v);
  });
  const ep = await engineFor(params);
  console.log(`Variant ${t}:`);
  seasons.forEach((s) => {
    const r = evaluate(s, ep, params);
    console.log(`  ${s.name}: win% rank agreement ${r.rho.toFixed(2)} · next-match prediction ${pct(r.acc)}`);
  });
}
fs.rmSync(tmp, { recursive: true, force: true });
