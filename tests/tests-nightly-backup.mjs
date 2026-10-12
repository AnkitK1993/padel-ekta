// tests-nightly-backup.mjs — the Firestore → backup-file conversion used by the
// nightly GitHub Actions backup. Run: node tests/tests-nightly-backup.mjs
import { decodeFields, toBackup, problemsWith, sameData, canonical, leagueDate } from "../scripts/nightly-backup.mjs";

let pass = 0,
  fail = 0;
function ok(name, cond, detail) {
  if (cond) {
    process.stdout.write(`  \x1b[32m✓\x1b[0m ${name}\n`);
    pass++;
  } else {
    process.stdout.write(`  \x1b[31m✗\x1b[0m ${name}\n    \x1b[33m${detail || ""}\x1b[0m\n`);
    fail++;
  }
}

// A slice of a real Firestore REST response for padel/main.
const fields = {
  matches: {
    arrayValue: {
      values: [
        {
          mapValue: {
            fields: {
              date: { stringValue: "2026-05-08" },
              id: { stringValue: "m1" },
              teamA: { arrayValue: { values: [{ stringValue: "Ankit" }, { stringValue: "Sachin" }] } },
              teamB: { arrayValue: { values: [{ stringValue: "Nilesh" }, { stringValue: "Rahul M" }] } },
              scoreA: { integerValue: "2" },
              scoreB: { integerValue: "4" },
            },
          },
        },
      ],
    },
  },
  players: {
    mapValue: {
      fields: {
        1: { mapValue: { fields: { id: { integerValue: "1" }, name: { stringValue: "Ankit" }, isGuest: { booleanValue: false }, email: { stringValue: "" } } } },
      },
    },
  },
  playerAliasMap: { mapValue: { fields: { 1: { arrayValue: {} } } } },
  nextPlayerId: { integerValue: "26" },
  seasons: {
    arrayValue: {
      values: [{ mapValue: { fields: { id: { stringValue: "s2" }, name: { stringValue: "Season 2" }, start: { stringValue: "2026-06-01" }, end: { nullValue: null } } } }],
    },
  },
  ratio: { doubleValue: 0.5 },
};

console.log("\n\x1b[36m── Firestore → plain JSON ───────────────────────────\x1b[0m");
const doc = decodeFields(fields);
ok("integers become numbers", doc.matches[0].scoreA === 2 && doc.nextPlayerId === 26);
ok("arrays and maps decode", doc.matches[0].teamA.join() === "Ankit,Sachin" && doc.players[1].name === "Ankit");
ok("an empty array decodes to []", Array.isArray(doc.playerAliasMap[1]) && doc.playerAliasMap[1].length === 0);
ok("null and booleans and doubles decode", doc.seasons[0].end === null && doc.players[1].isGuest === false && doc.ratio === 0.5);

console.log("\n\x1b[36m── backup file ──────────────────────────────────────\x1b[0m");
const b = toBackup(doc, "2026-10-13T00:00:00Z");
ok("in the app's backup format (Restore can load it)", b.format === "ekta-padel-backup" && Array.isArray(b.matches) && b.players && b.seasons.length === 1);
ok("a healthy backup has no problems", problemsWith(b).length === 0, problemsWith(b).join());
ok("no matches is a problem", problemsWith(toBackup({ players: { 1: {} } }, "x")).includes("no matches"));
ok("a malformed match is a problem", problemsWith(toBackup({ matches: [{ teamA: [] }], players: { 1: {} } }, "x")).some((p) => p.includes("malformed")));
const shuffled = toBackup(decodeFields(JSON.parse(JSON.stringify(fields))), "2026-10-14T00:00:00Z");
shuffled.matches = shuffled.matches.map((m) => Object.fromEntries(Object.entries(m).reverse()));
ok("same data in another key order (and another export time) counts as unchanged", sameData(b, shuffled));
ok("a changed score counts as changed", !sameData(b, { ...b, matches: [{ ...b.matches[0], scoreA: 3 }] }));
ok("keys are written sorted", Object.keys(canonical({ b: 1, a: { d: 1, c: 2 } })).join() === "a,b" && Object.keys(canonical({ a: { d: 1, c: 2 } }).a).join() === "c,d");
ok("files are named by the league's (IST) day", leagueDate(new Date("2026-10-12T20:00:00Z")) === "2026-10-13");

console.log(`\n\x1b[1mNightly backup: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`);
process.exit(fail ? 1 : 0);
