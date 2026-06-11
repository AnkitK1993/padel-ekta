// ── UI COMPONENT TESTS ─────────────────────────────────────────
// The component layer is pure (HTML string in/out), so it tests in Node with
// no DOM. Coverage focus: XSS escaping, accessibility contracts (roles, aria,
// label wiring), edge cases (empty input, clamping), and API stability.
import {
  button,
  iconButton,
  emptyState,
  errorState,
  skeleton,
  spinner,
  loadingState,
  badge,
  avatar,
  card,
  statTile,
  statRow,
  progressBar,
  segmented,
  field,
  toggle,
  sheet,
} from "../src/ui/components.js";

let pass = 0,
  fail = 0;
function t(name, cond) {
  if (cond) {
    pass++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    fail++;
    console.log(`  \x1b[31m✗ ${name}\x1b[0m`);
  }
}
function group(name) {
  console.log(`\n\x1b[36m── ${name} ────────────────────\x1b[0m`);
}

const XSS = `<img src=x onerror="alert(1)">`;

// ── button ───────────────────────────────────────────────────
group("button");
t("renders a real <button> with type", button({ label: "Go" }).startsWith('<button type="button"'));
t("escapes label (XSS)", !button({ label: XSS }).includes("<img"));
t("escapes onClick attr quotes", !button({ label: "x", onClick: `f("a")` }).includes(`onclick="f("`));
t("disabled drops onclick + sets aria-disabled", (() => {
  const h = button({ label: "x", onClick: "f()", disabled: true });
  return !h.includes("onclick") && h.includes('aria-disabled="true"') && h.includes("disabled");
})());
t("variant + size + full classes", (() => {
  const h = button({ label: "x", variant: "danger", size: "lg", full: true });
  return h.includes("ui-btn-danger") && h.includes("ui-btn-lg") && h.includes("ui-btn-full");
})());
t("md size adds no size class", !button({ label: "x" }).includes("ui-btn-md"));
t("icon is aria-hidden", button({ label: "x", icon: "⚡" }).includes('aria-hidden="true">⚡'));

// ── iconButton ───────────────────────────────────────────────
group("iconButton");
t("requires + renders aria-label", iconButton({ icon: "✕", ariaLabel: "Close" }).includes('aria-label="Close"'));
t("falls back to generic label when missing", iconButton({ icon: "✕" }).includes('aria-label="Button"'));
t("icon wrapped aria-hidden", iconButton({ icon: "✕", ariaLabel: "x" }).includes('<span aria-hidden="true">✕</span>'));

// ── emptyState / errorState ──────────────────────────────────
group("empty / error states");
t("emptyState has role=status", emptyState({ message: "none" }).includes('role="status"'));
t("emptyState escapes message", !emptyState({ message: XSS }).includes("<img"));
t("emptyState inline is minimal", (() => {
  const h = emptyState({ message: "n", inline: true });
  return h.includes("ui-empty-inline") && !h.includes("ui-empty-icon");
})());
t("emptyState card class composes", emptyState({ message: "n", card: true, size: "sm" }).includes("ui-empty-card") && emptyState({ message: "n", card: true, size: "sm" }).includes("ui-empty-sm"));
t("emptyState action renders a button", emptyState({ message: "n", action: { label: "Add", onClick: "go()" } }).includes("ui-btn"));
t("errorState has role=alert", errorState({}).includes('role="alert"'));
t("errorState retry default label", errorState({ retry: { onClick: "r()" } }).includes("Retry"));

// ── skeleton / spinner / loadingState ────────────────────────
group("loading primitives");
t("skeleton group aria-hidden", skeleton({}).includes('aria-hidden="true"'));
t("skeleton count repeats", (skeleton({ count: 3 }).match(/ui-skeleton"/g) || []).length === 3);
t("skeleton count clamps to ≥1", (skeleton({ count: 0 }).match(/ui-skeleton"/g) || []).length === 1);
t("spinner has sr-only label", spinner({}).includes("ui-sr-only") && spinner({}).includes("Loading"));
t("loadingState aria-busy + live", (() => {
  const h = loadingState({});
  return h.includes('aria-busy="true"') && h.includes('aria-live="polite"');
})());
t("loadingState rows → skeletons not spinner", (() => {
  const h = loadingState({ rows: 4 });
  return h.includes("ui-skeleton") && !h.includes("ui-spinner");
})());

// ── badge ────────────────────────────────────────────────────
group("badge");
t("static badge is a span", badge({ label: "MVP" }).startsWith("<span"));
t("interactive badge is a real button", badge({ label: "x", onClick: "f()" }).startsWith("<button"));
t("interactive badge has aria-pressed", badge({ label: "x", onClick: "f()", selected: true }).includes('aria-pressed="true"'));
t("escapes label", !badge({ label: XSS }).includes("<img"));
t("tone class applied", badge({ label: "x", tone: "danger" }).includes("ui-badge-danger"));

// ── avatar ───────────────────────────────────────────────────
group("avatar");
t("photo variant: <img> with alt=name", (() => {
  const h = avatar({ name: "Ankit", src: "p.jpg" });
  return h.startsWith("<img") && h.includes('alt="Ankit"') && h.includes('loading="lazy"');
})());
t("initials fallback has sr-only name", (() => {
  const h = avatar({ name: "Ankit Konchady" });
  return h.includes("AK") && h.includes("ui-sr-only") && h.includes("Ankit Konchady");
})());
t("deterministic: same name → same html", avatar({ name: "Bob" }) === avatar({ name: "Bob" }));
t("escapes src attr", !avatar({ name: "x", src: `" onerror="alert(1)` }).includes('onerror="alert'));
t("empty name doesn't crash", avatar({}).includes("ui-avatar"));

// ── card ─────────────────────────────────────────────────────
group("card");
t("renders <section> with body slot raw", card({ body: "<b>hi</b>" }).includes("<b>hi</b>"));
t("title escaped + uses heading", (() => {
  const h = card({ title: XSS, body: "x" });
  return h.includes("<h3") && !h.includes("<img");
})());
t("no header when no title/badge/action", !card({ body: "x" }).includes("ui-card-head"));
t("flush modifier", card({ body: "x", flush: true }).includes("ui-card-flush"));

// ── stat tiles ───────────────────────────────────────────────
group("statTile / statRow");
t("tile renders value + label", (() => {
  const h = statTile({ value: 12, label: "Played" });
  return h.includes(">12<") && h.includes("Played");
})());
t("default value em-dash", statTile({ label: "x" }).includes("—"));
t("statRow empty → empty string", statRow([]) === "");
t("statRow maps tiles", (statRow([{ value: 1, label: "a" }, { value: 2, label: "b" }]).match(/ui-stat"/g) || []).length === 2);

// ── progressBar ──────────────────────────────────────────────
group("progressBar");
t("has progressbar role + aria values", (() => {
  const h = progressBar({ value: 30, max: 100, label: "XP" });
  return h.includes('role="progressbar"') && h.includes('aria-valuenow="30"') && h.includes('aria-label="XP"');
})());
t("clamps value above max", progressBar({ value: 150, max: 100 }).includes('aria-valuenow="100"'));
t("clamps negative to 0", progressBar({ value: -5 }).includes('aria-valuenow="0"'));
t("zero/invalid max falls back to 100", progressBar({ value: 10, max: 0 }).includes('aria-valuemax="100"'));
t("NaN value treated as 0", progressBar({ value: "abc" }).includes('aria-valuenow="0"'));
t("showValue renders text", progressBar({ value: 3, max: 10, showValue: true }).includes("3/10"));

// ── segmented ────────────────────────────────────────────────
group("segmented");
const segOpts = [{ key: "week", label: "Week" }, { key: "month", label: "Month" }];
t("radiogroup + radios", (() => {
  const h = segmented({ options: segOpts, value: "week", onSelect: "setP" });
  return h.includes('role="radiogroup"') && (h.match(/role="radio"/g) || []).length === 2;
})());
t("active option aria-checked", segmented({ options: segOpts, value: "month", onSelect: "f" }).includes('aria-checked="true"'));
t("onSelect receives quoted key", segmented({ options: segOpts, value: "week", onSelect: "setP" }).includes("setP(&quot;week&quot;)"));
t("empty options → empty string", segmented({ options: [] }) === "");
t("group aria-label", segmented({ options: segOpts, value: "week", ariaLabel: "Period" }).includes('aria-label="Period"'));

// ── field ────────────────────────────────────────────────────
group("field");
t("label wired to input via for/id", (() => {
  const h = field({ id: "nm", label: "Name" });
  return h.includes('for="nm"') && h.includes('id="nm"');
})());
t("missing id generates one (label still wired)", (() => {
  const h = field({ label: "X" });
  const m = h.match(/for="(ui-field-\w+)"/);
  return !!m && h.includes(`id="${m[1]}"`);
})());
t("error → aria-invalid + describedby + role=alert", (() => {
  const h = field({ id: "e", label: "E", error: "Required" });
  return h.includes('aria-invalid="true"') && h.includes('aria-describedby="e-desc"') && h.includes('role="alert"');
})());
t("hint without error → describedby, no alert", (() => {
  const h = field({ id: "h", label: "H", hint: "Optional" });
  return h.includes('aria-describedby="h-desc"') && !h.includes('role="alert"');
})());
t("extra inputAttrs rendered + escaped", field({ id: "n", label: "N", inputAttrs: { min: 1, max: 99 } }).includes('min="1"'));
t("escapes value", !field({ id: "v", label: "V", value: XSS }).includes("<img"));

// ── toggle ───────────────────────────────────────────────────
group("toggle");
t("checkbox with role=switch inside label", (() => {
  const h = toggle({ id: "t1", label: "Dark" });
  return h.includes('type="checkbox"') && h.includes('role="switch"') && h.includes('for="t1"');
})());
t("checked attribute", toggle({ id: "t", label: "x", checked: true }).includes(" checked"));
t("disabled state + class", (() => {
  const h = toggle({ id: "t", label: "x", disabled: true });
  return h.includes(" disabled") && h.includes("ui-toggle-disabled");
})());
t("track is aria-hidden (checkbox carries semantics)", toggle({ id: "t", label: "x" }).includes('aria-hidden="true"'));

// ── sheet ────────────────────────────────────────────────────
group("sheet");
t("dialog semantics: role + modal + labelledby→title id", (() => {
  const h = sheet({ id: "s1", title: "Filters", body: "x" });
  return (
    h.includes('role="dialog"') &&
    h.includes('aria-modal="true"') &&
    h.includes('aria-labelledby="s1-title"') &&
    h.includes('id="s1-title"')
  );
})());
t("backdrop + close button both dismiss by id", (() => {
  // The expression lives in an attribute, so quotes are HTML-escaped (&#39;);
  // the browser unescapes them before evaluating the handler.
  const h = sheet({ id: "s2", title: "T", body: "x" });
  return (h.match(/getElementById\(&#39;s2&#39;\)\?\.remove\(\)/g) || []).length === 2;
})());
t("onClose chained after remove", sheet({ id: "s3", title: "T", body: "x", onClose: "cb()" }).includes("remove();cb()"));
t("title escaped, body raw", (() => {
  const h = sheet({ id: "s4", title: XSS, body: "<b>k</b>" });
  return !h.includes("<img") && h.includes("<b>k</b>");
})());
t("footer slot renders only when given", (() => {
  return !sheet({ id: "s5", title: "T", body: "x" }).includes("ui-sheet-foot") &&
    sheet({ id: "s6", title: "T", body: "x", footer: "f" }).includes("ui-sheet-foot");
})());

// ── summary ──────────────────────────────────────────────────
console.log(`\n\x1b[1mComponents: ${pass}/${pass + fail} passed\x1b[0m  (${fail} failed)`);
if (fail > 0) process.exit(1);
