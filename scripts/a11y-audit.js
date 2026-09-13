"use strict";

// Accessibility audit: drives the app in headless Chrome (via
// scripts/_test-harness.js) and runs axe-core against a handful of key
// views — Home, Summary, Statistics, History, Player Detail modal, and the
// Admin Names table — reporting every violation found.
//
// Run: node scripts/a11y-audit.js
// Exit code is non-zero only when a violation of --fail-on (default:
// "critical,serious") is found, so this can gate CI without also failing on
// every minor/moderate nit; run with `--fail-on=` (empty) to report only.
const fs = require("node:fs");
const path = require("node:path");
const { launch, evaluate } = require("./_test-harness.js");

const AXE_SOURCE = fs.readFileSync(
  require.resolve("axe-core/axe.min.js"),
  "utf8",
);

const FAIL_ON = (() => {
  const arg = process.argv.find((a) => a.startsWith("--fail-on="));
  const raw = arg ? arg.slice("--fail-on=".length) : "critical,serious";
  return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
})();

// axe-core rules that are well-known false positives / out of scope for a
// single-page app snapshot (e.g. "region" fires on transient toast/overlay
// markup that's legitimately outside any landmark). Kept short and each
// entry commented — this is a deliberate allowlist, not a blanket suppression.
const IGNORE_RULES = new Set([
  // Chrome's headless viewport + our CSS custom-property theming can report
  // borderline contrast ratios that render fine in a real browser; treated
  // as a known limitation of automated contrast checking against computed
  // styles rather than actual rendered pixels.
]);

async function runAxeOn(client, viewLabel) {
  await evaluate(client, AXE_SOURCE);
  const result = await evaluate(
    client,
    `axe.run(document, { resultTypes: ["violations"] }).then(r => JSON.stringify(r.violations))`,
  );
  const violations = JSON.parse(result).filter((v) => !IGNORE_RULES.has(v.id));
  return violations.map((v) => ({ ...v, view: viewLabel }));
}

async function main() {
  const h = await launch();
  const allViolations = [];
  try {
    console.log("Auditing Home (Detailed)...");
    allViolations.push(...(await runAxeOn(h.client, "Home")));

    console.log("Auditing Summary...");
    await evaluate(h.client, `switchMainTab("compact", true);`);
    await evaluate(h.client, `document.getElementById("cmpSel").value = "all"; onCmpFilter();`);
    await new Promise((r) => setTimeout(r, 300));
    allViolations.push(...(await runAxeOn(h.client, "Summary")));

    console.log("Auditing Statistics...");
    await evaluate(h.client, `switchMainTab("analytics", true);`);
    await new Promise((r) => setTimeout(r, 400));
    allViolations.push(...(await runAxeOn(h.client, "Statistics")));

    console.log("Auditing History...");
    await evaluate(h.client, `switchMainTab("history", true);`);
    await evaluate(h.client, `setHistoryDateFilter && setHistoryDateFilter("all");`);
    await new Promise((r) => setTimeout(r, 300));
    allViolations.push(...(await runAxeOn(h.client, "History")));

    console.log("Auditing Player Detail modal...");
    await evaluate(h.client, `openPlayerDetail("Ankit");`);
    await new Promise((r) => setTimeout(r, 300));
    allViolations.push(...(await runAxeOn(h.client, "Player Detail modal")));
    await evaluate(h.client, `document.getElementById("player-detail-modal")?.remove();`);

    console.log("Auditing Admin Names table...");
    await evaluate(h.client, `
      window.isAdmin = true;
      renderNamesTable && renderNamesTable();
      openNameAddModal();
    `);
    await new Promise((r) => setTimeout(r, 300));
    allViolations.push(...(await runAxeOn(h.client, "Admin Names")));
    await evaluate(h.client, `closeNameAddModal && closeNameAddModal();`);
  } finally {
    await h.close();
  }

  console.log("");
  if (!allViolations.length) {
    console.log("\x1b[32m✓ No accessibility violations found across audited views.\x1b[0m");
    process.exit(0);
  }

  const byImpact = { critical: [], serious: [], moderate: [], minor: [] };
  allViolations.forEach((v) => {
    (byImpact[v.impact] || (byImpact[v.impact] = [])).push(v);
  });

  ["critical", "serious", "moderate", "minor"].forEach((impact) => {
    const list = byImpact[impact] || [];
    if (!list.length) return;
    const color = impact === "critical" ? 31 : impact === "serious" ? 33 : 36;
    console.log(`\x1b[${color}m── ${impact.toUpperCase()} (${list.length}) ──────────────────\x1b[0m`);
    list.forEach((v) => {
      console.log(`  [${v.view}] ${v.id}: ${v.help}`);
      console.log(`    ${v.nodes.length} element(s), e.g. ${v.nodes[0]?.target?.join(" ") || "?"}`);
    });
    console.log("");
  });

  const total = allViolations.length;
  const failCount = allViolations.filter((v) => FAIL_ON.has(v.impact)).length;
  console.log(
    `\x1b[1m${total} total violation(s) across ${new Set(allViolations.map((v) => v.view)).size} view(s); ${failCount} at fail-on severity (${[...FAIL_ON].join(", ") || "none"}).\x1b[0m`,
  );
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("HARNESS ERROR:", e);
  process.exit(2);
});
