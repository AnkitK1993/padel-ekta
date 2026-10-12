"use strict";

// Keyboard and zoom checks that axe-core doesn't cover, in a real browser:
//   1. The viewport doesn't block pinch-zoom (WCAG 1.4.4).
//   2. Every named clickable element the app renders can be reached with Tab
//      (nothing with an inline onclick is left unfocusable), on every tab.
//   3. Enter and Space on a focused card/row do what a click does — driven with
//      real key events, not a synthetic .click().
//   4. Pages that aren't on screen can't be tabbed into.
//   5. Pinch-zooming doesn't squash the layout (--app-height tracks the layout
//      viewport, not the zoomed one).
//
//   node scripts/keyboard-check.js
const { launch, evaluate, delay } = require("./_test-harness.js");

let pass = 0;
let fail = 0;
function ok(label, cond, detail) {
  if (cond) pass++;
  else {
    fail++;
    process.stdout.write(`  \x1b[31m✗\x1b[0m ${label}${detail ? `\n      \x1b[33m${detail}\x1b[0m` : ""}\n`);
  }
}

async function press(client, key, code, vk) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk };
  await client.send("Input.dispatchKeyEvent", { type: "keyDown", text: key === "Enter" ? "\r" : key, ...base });
  await client.send("Input.dispatchKeyEvent", { type: "keyUp", ...base });
}

// Elements that carry an onclick, are named, and still can't take focus.
const UNREACHABLE = `(() => {
  const NATIVE = 'a[href],button,input,select,textarea,summary,label,[role="button"],[role="link"],[role="tab"],[role="menuitem"],[role="option"],[tabindex]';
  const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length) && !el.closest("[inert]");
  return [...document.querySelectorAll("[onclick]")]
    .filter((el) => !el.matches(NATIVE))
    .filter(visible)
    .filter((el) => !/event\\.target\\s*===?\\s*this|event\\.target\\.id\\s*===?/.test(el.getAttribute("onclick")))
    .filter((el) => !/backdrop|scrim|overlay/i.test(typeof el.className === "string" ? el.className : ""))
    .filter((el) => (el.textContent || "").trim() || el.getAttribute("aria-label") || el.getAttribute("title"))
    .map((el) => el.tagName.toLowerCase() + (el.className ? "." + String(el.className).split(" ")[0] : "") + " [" + el.getAttribute("onclick").slice(0, 40) + "]")
    .slice(0, 8);
})()`;

async function main() {
  const { client, close } = await launch();
  try {
    await client.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

    // 1. zoom
    const viewport = await evaluate(client, `document.querySelector('meta[name="viewport"]').content`);
    ok("viewport doesn't disable zoom", !/user-scalable\s*=\s*(no|0)/i.test(viewport) && !/maximum-scale\s*=\s*1(\.0)?(?![\d.])/i.test(viewport), viewport);

    // 2. nothing clickable is unreachable, on each tab
    const tabs = [
      ["Home", `window.goTo("home")`],
      ["Summary", `(() => { window.switchMainTab("compact", true); const sel = document.getElementById("cmpSel"); sel.value = "all"; window.onCmpFilter(); })()`],
      ["History", `(() => { window.switchMainTab("history", true); window.filterMatchTab && window.filterMatchTab("all"); })()`],
      ["Statistics", `window.switchMainTab("analytics", true);`],
    ];
    for (const [name, js] of tabs) {
      await evaluate(client, js);
      await delay(name === "Statistics" ? 2500 : 900);
      const orphans = await evaluate(client, UNREACHABLE);
      ok(`${name}: every named clickable element is keyboard-focusable`, orphans.length === 0, orphans.join("; "));
    }

    // 3. Enter / Space activate a focused row like a click does
    await evaluate(client, `(() => { window.switchMainTab("compact", true); const sel = document.getElementById("cmpSel"); sel.value = "all"; window.onCmpFilter(); })()`);
    await delay(900);
    const row = await evaluate(client, `(() => {
      const tr = document.querySelector("#cmpBody tr[onclick]");
      if (!tr) return null;
      tr.focus();
      return { focused: document.activeElement === tr, role: tr.getAttribute("role"), tabindex: tr.getAttribute("tabindex") };
    })()`);
    ok("a leaderboard row can take focus", row && row.focused, JSON.stringify(row));
    await press(client, "Enter", "Enter", 13);
    await delay(500);
    ok("Enter on a focused row opens the player sheet", await evaluate(client, `!!document.getElementById("player-detail-modal")`));
    await evaluate(client, `document.getElementById("player-detail-modal")?.remove()`);

    await evaluate(client, `(() => { const tr = document.querySelector("#cmpBody tr[onclick]"); tr.focus(); })()`);
    await press(client, " ", "Space", 32);
    await delay(500);
    ok("Space on a focused row does the same", await evaluate(client, `!!document.getElementById("player-detail-modal")`));
    await evaluate(client, `document.getElementById("player-detail-modal")?.remove()`);

    // typing in a field must never be hijacked
    const hijack = await evaluate(client, `(() => {
      const sel = document.querySelector("#cmpBody tr[onclick]");
      const input = document.createElement("input");
      input.type = "text";
      sel.appendChild(input);
      window.__hit = 0;
      input.addEventListener("keydown", () => (window.__hit += 1));
      input.focus();
      return document.activeElement === input;
    })()`);
    await press(client, " ", "Space", 32);
    await delay(300);
    ok("Space typed in a nested field is not hijacked", hijack && !(await evaluate(client, `!!document.getElementById("player-detail-modal")`)));

    // 4. off-screen pages are inert
    const inert = await evaluate(client, `[...document.querySelectorAll(".page")].filter((p) => !p.classList.contains("active")).every((p) => p.inert)`);
    ok("pages that aren't on screen are inert (can't be tabbed into)", inert);
    ok("exactly one page is the main landmark", (await evaluate(client, `document.querySelectorAll('.page[role="main"]').length`)) === 1);

    // 5. pinch-zoom doesn't squash the layout
    const before = await evaluate(client, `getComputedStyle(document.documentElement).getPropertyValue("--app-height").trim()`);
    await client.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
    await delay(300);
    const after = await evaluate(client, `window.dispatchEvent(new Event("resize")), getComputedStyle(document.documentElement).getPropertyValue("--app-height").trim()`);
    ok("zoomed in 2x, the app keeps its full layout height", before === after, `${before} -> ${after}`);
  } finally {
    await close();
  }

  console.log(`\n\x1b[1mKeyboard & zoom: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)\n`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
