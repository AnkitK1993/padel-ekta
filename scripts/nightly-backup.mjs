// Nightly backup of the league data, run by .github/workflows/nightly-backup.yml.
//
//   node scripts/nightly-backup.mjs <out-dir>
//
// Reads the leaderboard document (padel/main) through Firestore's REST API —
// it is publicly readable (firestore.rules), so no credentials are needed —
// and writes it in the app's own backup format (the same file "Export" makes,
// so Manage → Data → JSON File → Import can load it):
//
//   <out-dir>/YYYY-MM-DD.json  a full backup, written only when the data changed
//   <out-dir>/latest.json      the newest full backup
//   <out-dir>/status.json      when it last ran / last changed (the app's Backup
//                              Health card reads this)
//
// Dated files older than KEEP_DAYS are dropped from the folder; git history on
// the backups branch still has every version. The run fails (and GitHub emails
// the repo owner) if the data can't be read or doesn't look like the league.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KEEP_DAYS = 60;

// ── Firestore REST values → plain JSON ─────────────────────────────────────
export function decodeValue(v) {
  if (v == null || typeof v !== "object") return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("mapValue" in v) return decodeFields(v.mapValue.fields || {});
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(decodeValue);
  if ("referenceValue" in v) return v.referenceValue;
  if ("geoPointValue" in v) return v.geoPointValue;
  if ("bytesValue" in v) return v.bytesValue;
  return null;
}
export function decodeFields(fields) {
  const out = {};
  Object.entries(fields || {}).forEach(([k, v]) => (out[k] = decodeValue(v)));
  return out;
}

// The app's backup format (see _backupPayload in app.js).
export function toBackup(doc, exportedAt) {
  return {
    format: "ekta-padel-backup",
    version: 1,
    exportedAt,
    source: "nightly backup (GitHub Actions)",
    matches: Array.isArray(doc.matches) ? doc.matches : [],
    players: doc.players && typeof doc.players === "object" ? doc.players : {},
    playerAliasMap: doc.playerAliasMap || {},
    nextPlayerId: doc.nextPlayerId || 1,
    seasons: Array.isArray(doc.seasons) ? doc.seasons : [],
  };
}

// Problems that mean "this isn't the league" — the run fails rather than
// quietly storing something useless.
export function problemsWith(backup) {
  const out = [];
  if (!backup.matches.length) out.push("no matches");
  const bad = backup.matches.filter(
    (m) => !m || !Array.isArray(m.teamA) || !Array.isArray(m.teamB) || !m.teamA.length || !m.teamB.length,
  ).length;
  if (bad) out.push(`${bad} malformed match(es)`);
  if (!Object.keys(backup.players).length) out.push("no players");
  return out;
}

// Deep copy with every object's keys sorted. Firestore returns map fields in
// no fixed order, so this is what makes two reads of the same data compare
// equal — and keeps the nightly git diffs down to what actually changed.
export function canonical(v) {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, canonical(v[k])]),
    );
  return v;
}

// Same data apart from when it was exported?
export function sameData(a, b) {
  if (!a || !b) return false;
  const strip = ({ exportedAt, source, ...rest }) => rest; // eslint-disable-line no-unused-vars
  return JSON.stringify(canonical(strip(a))) === JSON.stringify(canonical(strip(b)));
}

// The league's calendar day (IST), so files are named the way the group thinks.
export function leagueDate(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
}

function firebaseConfig() {
  const src = fs.readFileSync(path.join(ROOT, "src/infra/cloud/firebase.js"), "utf8");
  const pick = (k) => (src.match(new RegExp(`${k}:\\s*"([^"]+)"`)) || [])[1];
  return { projectId: pick("projectId"), apiKey: pick("apiKey") };
}

async function main() {
  const outDir = path.resolve(process.argv[2] || "backups");
  fs.mkdirSync(outDir, { recursive: true });
  const { projectId, apiKey } = firebaseConfig();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/padel/main?key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Firestore read failed: HTTP ${res.status} ${await res.text()}`);
  const now = new Date();
  const backup = toBackup(decodeFields((await res.json()).fields), now.toISOString());
  const problems = problemsWith(backup);
  if (problems.length) throw new Error(`The data doesn't look right: ${problems.join(", ")}`);

  const latestPath = path.join(outDir, "latest.json");
  const previous = fs.existsSync(latestPath) ? JSON.parse(fs.readFileSync(latestPath, "utf8")) : null;
  const statusPath = path.join(outDir, "status.json");
  const status = fs.existsSync(statusPath) ? JSON.parse(fs.readFileSync(statusPath, "utf8")) : {};
  const day = leagueDate(now);
  const changed = !sameData(previous, backup);
  const lines = [];
  if (changed) {
    const json = JSON.stringify(canonical(backup), null, 1) + "\n";
    fs.writeFileSync(path.join(outDir, `${day}.json`), json);
    fs.writeFileSync(latestPath, json);
    status.lastChange = now.toISOString();
    status.file = `${day}.json`;
    lines.push(`Data changed — wrote \`${day}.json\`.`);
    const before = previous ? previous.matches.length : null;
    if (before != null && backup.matches.length < before * 0.8)
      lines.push(`⚠️ Matches dropped from ${before} to ${backup.matches.length}. Earlier backups are kept.`);
  } else {
    lines.push("No changes since the last backup.");
  }
  Object.assign(status, {
    lastRun: now.toISOString(),
    matches: backup.matches.length,
    players: Object.keys(backup.players).length,
    seasons: backup.seasons.length,
  });
  fs.writeFileSync(statusPath, JSON.stringify(status, null, 2) + "\n");

  // Keep the folder small; git history keeps everything.
  const cutoff = leagueDate(new Date(now.getTime() - KEEP_DAYS * 86400000));
  fs.readdirSync(outDir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f) && f.slice(0, 10) < cutoff)
    .forEach((f) => fs.rmSync(path.join(outDir, f)));

  lines.push(`${backup.matches.length} matches · ${status.players} players · ${status.seasons} seasons.`);
  console.log(lines.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Nightly backup\n\n${lines.map((l) => `- ${l}`).join("\n")}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  });
}
