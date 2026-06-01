// ── RENDER ANIMATION / DOM UTILITIES ───────────────────────
// Self-contained DOM helpers used by the board/leaderboard renderers: keyed
// list reconciliation (morphList) and the entrance/value animations. No app
// state, no other-module deps — they operate purely on the DOM nodes passed in.

// Reconcile a container's children against fresh HTML, reusing nodes by
// data-key so unchanged rows aren't recreated. Returns the touched nodes.
export function morphList(container, html) {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  const newNodes = Array.from(tpl.content.children);
  const existing = new Map();
  for (const el of Array.from(container.children)) {
    const k = el.getAttribute("data-key");
    if (k != null && !existing.has(k)) existing.set(k, el);
  }
  const touched = [];
  const finalNodes = [];
  let prev = null;
  for (const newEl of newNodes) {
    const key = newEl.getAttribute("data-key");
    let node = key != null ? existing.get(key) : null;
    if (node) {
      if (node.outerHTML !== newEl.outerHTML) {
        _syncAttrs(node, newEl);
        node.innerHTML = newEl.innerHTML;
        touched.push(node);
      }
    } else {
      node = newEl;
      touched.push(node);
    }
    const target = prev ? prev.nextSibling : container.firstChild;
    if (target !== node) container.insertBefore(node, target);
    prev = node;
    finalNodes.push(node);
  }
  const keep = new Set(finalNodes);
  for (const el of Array.from(container.children))
    if (!keep.has(el)) el.remove();
  return touched;
}

function _syncAttrs(target, src) {
  for (const a of Array.from(target.attributes))
    if (!src.hasAttribute(a.name)) target.removeAttribute(a.name);
  for (const a of Array.from(src.attributes))
    if (target.getAttribute(a.name) !== a.value)
      target.setAttribute(a.name, a.value);
}

// Stagger the SR gauge needles to their target angle.
export function animateGauges() {
  const gauges = document.querySelectorAll(".sr-ring");

  const noCascade = document.body.classList.contains("no-cascade");
  gauges.forEach((g, i) => {
    const target = getComputedStyle(g).getPropertyValue("--target-angle");
    setTimeout(
      () => {
        g.style.setProperty("--speed-angle", target);
      },
      noCascade ? 0 : i * 80,
    );
  });
}

// Grow an XP progress bar from 0 to its data-pct width.
export function animateXpRow(el, delay = 300) {
  const barEl = el.querySelector(".xp-bar-fill[data-pct]");
  if (!barEl) return;
  const finalPct = parseInt(barEl.dataset.pct, 10);
  barEl.style.transition = "none";
  barEl.style.width = "0%";
  setTimeout(() => {
    void barEl.offsetWidth;
    barEl.style.transition = `width ${Math.max(500, finalPct * 7)}ms ease-out`;
    barEl.style.width = `${finalPct}%`;
  }, delay);
}

// Count an SR value up from 0 to its data-final.
export function animateSrVal(el, delay = 200) {
  const target = parseFloat(el.dataset.final);
  if (isNaN(target)) return;
  let cur = 0;
  const step = target / 15;
  const tick = () => {
    cur = Math.min(cur + step, target);
    el.textContent = cur.toFixed(2);
    if (cur < target) setTimeout(tick, 33);
  };
  setTimeout(tick, delay);
}

// Sweep a gauge needle to its angle (with a rev-limit shake when maxed).
export function _sweepNeedle(needle) {
  const ring = needle.closest(".sr-ring");
  if (!ring) return;
  const isRevLimit = ring.classList.contains("rev-limit");
  if (isRevLimit) ring.classList.remove("rev-limit");
  const targetDeg =
    parseFloat(getComputedStyle(ring).getPropertyValue("--speed-angle")) || 0;
  needle.animate(
    [
      { transform: "translateX(-50%) rotate(-90deg)" },
      { transform: "translateX(-50%) rotate(90deg)", offset: 0.62 },
      { transform: `translateX(-50%) rotate(${-90 + targetDeg}deg)` },
    ],
    {
      duration: 2200,
      easing: "cubic-bezier(0.22,1.15,0.36,1)",
      fill: "forwards",
    },
  );
  if (isRevLimit) {
    // Fire shortly after cardSlideUp (420ms) so shake is visible on page load
    setTimeout(() => {
      if (!document.body.contains(ring)) return;
      ring.classList.add("rev-limit");
      const card = ring.closest(".pc");
      if (card) {
        card.animate(
          [
            { transform: "translateX(0px)" },
            { transform: "translateX(-5px)" },
            { transform: "translateX(5px)" },
            { transform: "translateX(-4px)" },
            { transform: "translateX(4px)" },
            { transform: "translateX(-3px)" },
            { transform: "translateX(3px)" },
            { transform: "translateX(-1px)" },
            { transform: "translateX(0px)" },
          ],
          { duration: 500, easing: "ease-in-out", composite: "add" },
        );
      }
    }, 450);
  }
}

export function runSpeedometerSweep() {
  requestAnimationFrame(() => {
    document.querySelectorAll(".needle").forEach(_sweepNeedle);
  });
}
