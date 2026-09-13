"use strict";

// Visual regression: drives the app in headless Chrome (via
// scripts/_test-harness.js) at a fixed mobile viewport, screenshots a
// handful of key views, and diffs each against a committed baseline PNG
// (tests/visual-baselines/*.png) using pixelmatch.
//
// Run: node scripts/visual-regression.js            (compare against baselines)
//      node scripts/visual-regression.js --update-baselines   (write new baselines)
//
// First run (no baselines committed yet) always "creates" rather than
// compares — commit tests/visual-baselines/*.png once you're happy with how
// the views look, and future runs will catch unintended visual drift.
const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");
const pixelmatch = require("pixelmatch").default || require("pixelmatch");
const { launch, evaluate } = require("./_test-harness.js");

const BASELINE_DIR = path.join(__dirname, "..", "tests", "visual-baselines");
const DIFF_DIR = path.join(__dirname, "..", "tests", "visual-diffs");
const UPDATE = process.argv.includes("--update-baselines");
// Fraction of pixels allowed to differ before a view is flagged — small
// enough to catch real regressions, loose enough to absorb anti-aliasing/
// font-hinting noise between Chrome builds.
const DIFF_THRESHOLD = 0.005;

const VIEWPORT = { width: 390, height: 844 }; // a common mobile size

const VIEWS = [
  {
    name: "home",
    label: "Home (Detailed)",
    setup: async (client) => {
      // Already the default active page after boot.
      await evaluate(client, `1`);
    },
  },
  {
    name: "summary",
    label: "Summary (ALL TIME)",
    setup: async (client) => {
      await evaluate(client, `switchMainTab("compact", true);`);
      await evaluate(client, `document.getElementById("cmpSel").value = "all"; onCmpFilter();`);
      await new Promise((r) => setTimeout(r, 350));
    },
  },
  {
    name: "statistics",
    label: "Statistics",
    setup: async (client) => {
      await evaluate(client, `switchMainTab("analytics", true);`);
      await new Promise((r) => setTimeout(r, 500));
    },
  },
  {
    name: "history",
    label: "History",
    setup: async (client) => {
      await evaluate(client, `switchMainTab("history", true);`);
      await evaluate(client, `setHistoryDateFilter && setHistoryDateFilter("all");`);
      await new Promise((r) => setTimeout(r, 350));
    },
  },
  {
    name: "player-detail",
    label: "Player Detail modal",
    setup: async (client) => {
      await evaluate(client, `openPlayerDetail("Ankit");`);
      await new Promise((r) => setTimeout(r, 350));
    },
  },
];

async function captureView(client, view) {
  await view.setup(client);
  const { data } = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  return Buffer.from(data, "base64");
}

function loadPng(buf) {
  return PNG.sync.read(buf);
}

async function main() {
  fs.mkdirSync(BASELINE_DIR, { recursive: true });
  fs.mkdirSync(DIFF_DIR, { recursive: true });
  // Clear stale diffs from a previous failing run so old failures don't
  // linger and look like new ones.
  for (const f of fs.readdirSync(DIFF_DIR)) fs.unlinkSync(path.join(DIFF_DIR, f));

  const h = await launch();
  const results = [];
  try {
    await h.client.send("Emulation.setDeviceMetricsOverride", {
      width: VIEWPORT.width,
      height: VIEWPORT.height,
      deviceScaleFactor: 1,
      mobile: true,
    });
    // Force animations off and a fixed font scale so screenshots are
    // deterministic across runs/machines — re-seed then reload since these
    // prefs are read once at boot.
    await evaluate(h.client, `
      localStorage.setItem("anim_level", "off");
      localStorage.setItem("padel_font_scale", "1");
    `);
    await h.client.send("Page.navigate", { url: (await evaluate(h.client, "location.href")) });
    await new Promise((r) => setTimeout(r, 1200));

    for (const view of VIEWS) {
      const pngBuf = await captureView(h.client, view);
      const baselinePath = path.join(BASELINE_DIR, `${view.name}.png`);

      if (UPDATE || !fs.existsSync(baselinePath)) {
        fs.writeFileSync(baselinePath, pngBuf);
        results.push({ view, status: UPDATE ? "updated" : "created" });
        continue;
      }

      const current = loadPng(pngBuf);
      const baseline = loadPng(fs.readFileSync(baselinePath));
      if (current.width !== baseline.width || current.height !== baseline.height) {
        results.push({
          view,
          status: "fail",
          reason: `size mismatch: baseline ${baseline.width}x${baseline.height}, current ${current.width}x${current.height}`,
        });
        fs.writeFileSync(path.join(DIFF_DIR, `${view.name}-current.png`), pngBuf);
        continue;
      }

      const { width, height } = current;
      const diff = new PNG({ width, height });
      const diffPixels = pixelmatch(
        current.data,
        baseline.data,
        diff.data,
        width,
        height,
        { threshold: 0.1 },
      );
      const totalPixels = width * height;
      const diffFraction = diffPixels / totalPixels;

      if (diffFraction > DIFF_THRESHOLD) {
        fs.writeFileSync(path.join(DIFF_DIR, `${view.name}-diff.png`), PNG.sync.write(diff));
        fs.writeFileSync(path.join(DIFF_DIR, `${view.name}-current.png`), pngBuf);
        results.push({
          view,
          status: "fail",
          reason: `${diffPixels} px differ (${(diffFraction * 100).toFixed(2)}%, threshold ${(DIFF_THRESHOLD * 100).toFixed(2)}%)`,
        });
      } else {
        results.push({ view, status: "pass", reason: `${diffPixels} px differ (${(diffFraction * 100).toFixed(3)}%)` });
      }
    }
  } finally {
    await h.close();
  }

  console.log("");
  let anyFail = false;
  results.forEach(({ view, status, reason }) => {
    if (status === "pass") {
      console.log(`  \x1b[32m✓\x1b[0m ${view.label}: ${reason}`);
    } else if (status === "created") {
      console.log(`  \x1b[36m+\x1b[0m ${view.label}: baseline created (first run)`);
    } else if (status === "updated") {
      console.log(`  \x1b[36m↻\x1b[0m ${view.label}: baseline updated`);
    } else {
      anyFail = true;
      console.log(`  \x1b[31m✗\x1b[0m ${view.label}: ${reason}`);
      console.log(`      diff written to tests/visual-diffs/${view.name}-diff.png`);
    }
  });
  console.log("");
  if (anyFail) {
    console.log("\x1b[1mVisual regression FAILED — see tests/visual-diffs/ for diff images.\x1b[0m");
    process.exit(1);
  }
  console.log("\x1b[1mVisual regression: all views match their baseline.\x1b[0m");
  process.exit(0);
}

main().catch((e) => {
  console.error("HARNESS ERROR:", e);
  process.exit(2);
});
