// ── KEYBOARD + SCREEN-READER ACCESS FOR CLICKABLE ELEMENTS ────────────────
// The UI is built from HTML strings whose cards, rows and chips are <div>/<tr>/
// <span> with inline onclick. Those were invisible to the keyboard (not
// focusable, no Enter/Space) and to screen readers (no role). Rather than
// rewrite hundreds of templates, this one place gives every such element
// tabindex + a role + Enter/Space activation, and keeps doing so for the
// elements the app renders later (a MutationObserver).
//
// Deliberately NOT enhanced: anything already interactive (button, a[href],
// input…), and click-outside-to-dismiss backdrops (`event.target === this`),
// which are not controls — the Escape key / Close button is their keyboard path.

// Things that are already controls (or have been made focusable on purpose).
const NATIVE =
  'a[href],button,input,select,textarea,summary,label,[role="button"],[role="link"],[role="tab"],[role="menuitem"],[role="option"],[role="checkbox"],[role="switch"],[tabindex]';
const BACKDROP = /event\.target\s*===?\s*this|event\.target\.id\s*===?|\be\.target\s*===?\s*this/;
// Table parts and landmarks keep their own role; they only gain tabindex.
const KEEP_ROLE = /^(TR|TD|TH|TABLE|TBODY|THEAD|LI|SECTION|ARTICLE|NAV|MAIN|HEADER|FOOTER)$/;

// Something a person can name: visible text, an aria-label, a tooltip or an
// image alt. A clickable surface with none of those (a dimmed backdrop, a
// decorative hit-area) isn't a control a keyboard or screen-reader user could
// meaningfully operate, so it is left alone rather than announced as an
// unnamed "button".
function hasName(el) {
  return !!(
    (el.textContent || "").trim() ||
    el.getAttribute("aria-label") ||
    el.getAttribute("title") ||
    el.querySelector("img[alt]:not([alt=''])")
  );
}

export function isEnhanceable(el) {
  if (!(el instanceof Element) || !el.hasAttribute("onclick")) return false;
  if (el.matches(NATIVE)) return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  if (BACKDROP.test(el.getAttribute("onclick") || "")) return false;
  if (/backdrop|scrim|overlay/i.test(el.className && el.className.baseVal === undefined ? el.className : "")) return false;
  if (!hasName(el)) return false;
  return true;
}

export function enhanceElement(el) {
  if (!isEnhanceable(el)) return false;
  el.setAttribute("tabindex", "0");
  el.setAttribute("data-kb", "1"); // ours: Enter/Space activation applies
  if (!el.hasAttribute("role") && !KEEP_ROLE.test(el.tagName)) {
    // A control that contains other controls can't itself be a button
    // (nested-interactive) — leave its role and let the inner controls speak.
    if (!el.querySelector(NATIVE)) el.setAttribute("role", "button");
  }
  // An icon-only control needs a name: fall back to its tooltip.
  if (
    el.getAttribute("role") === "button" &&
    !el.hasAttribute("aria-label") &&
    !(el.textContent || "").trim() &&
    el.getAttribute("title")
  ) {
    el.setAttribute("aria-label", el.getAttribute("title"));
  }
  return true;
}

export function enhanceTree(root) {
  if (!root || root.nodeType !== 1) return 0;
  let n = enhanceElement(root) ? 1 : 0;
  root.querySelectorAll("[onclick]").forEach((el) => {
    if (enhanceElement(el)) n++;
  });
  return n;
}

// Enter / Space on a focused clickable element = click, exactly like a button.
function onKeyDown(e) {
  if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
  const el = e.target;
  // Only an element WE made focusable, and only when it is the thing that has
  // focus — never hijack typing in a field or a key pressed on a control
  // nested inside it.
  if (!(el instanceof Element) || !el.hasAttribute("data-kb")) return;
  e.preventDefault(); // Space would otherwise scroll the page
  el.click();
}

// Exactly one page is on screen at a time. Only that one is the "main"
// landmark; the others are made inert — they stay in the DOM (faded out, ready
// for the next tab switch) but can no longer be focused with Tab or read by a
// screen reader, which they otherwise could be even though they're invisible.
export function syncPageLandmarks(doc = document) {
  doc.querySelectorAll(".page").forEach((p) => {
    const active = p.classList.contains("active");
    if (active) p.setAttribute("role", "main");
    else p.removeAttribute("role");
    p.inert = !active;
  });
}

export function initKeyboardAccess(doc = document) {
  if (doc.__kbAccess) return;
  doc.__kbAccess = true;
  syncPageLandmarks(doc);
  const pageObserver = new MutationObserver(() => syncPageLandmarks(doc));
  doc.querySelectorAll(".page").forEach((p) =>
    pageObserver.observe(p, { attributes: true, attributeFilter: ["class"] }),
  );
  enhanceTree(doc.body);
  doc.addEventListener("keydown", onKeyDown);

  // Re-enhance whatever the app renders afterwards, batched per frame.
  const pending = new Set();
  let scheduled = false;
  const flush = () => {
    scheduled = false;
    pending.forEach((node) => {
      if (node.isConnected) enhanceTree(node);
    });
    pending.clear();
  };
  new MutationObserver((records) => {
    for (const r of records) {
      r.addedNodes.forEach((n) => {
        if (n.nodeType === 1) pending.add(n);
      });
      if (r.type === "attributes" && r.target.nodeType === 1) pending.add(r.target);
    }
    if (pending.size && !scheduled) {
      scheduled = true;
      requestAnimationFrame(flush);
    }
  }).observe(doc.body, {
    childList: true,
    subtree: true,
    attributes: true,
    // The app's list reconciler (morphList) syncs an existing node's attributes
    // to freshly rendered HTML, which strips the ones we added — watch for that
    // and put them back.
    attributeFilter: ["onclick", "tabindex", "data-kb", "role"],
  });
}
