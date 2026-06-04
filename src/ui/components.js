// ── UI PRIMITIVES · reusable, accessible, zero-dependency ──────
// A small production-grade component layer for a no-build vanilla PWA. Each
// primitive is a PURE function that returns an HTML string (the same contract
// as the rest of src/ui/), so it composes into any innerHTML template and adds
// no runtime, no framework, no bundler. The goal is consistency: one place that
// owns how empty / loading / error states, buttons and spinners look and how
// they expose themselves to assistive tech.
//
// Conventions
//   • Text inputs are HTML-escaped (escHtml) — safe to pass user/player data.
//   • Interactive handlers are inline-handler EXPRESSION strings (e.g.
//     onClick: "doThing('a')"), matching the app's window-exposed handler model.
//   • Accessibility is built in, not bolted on: status/alert roles + aria-live
//     for async states, enforced labels on icon-only controls, real <button>s,
//     44px min touch targets and focus-visible rings (see styles.css .ui-*).
//   • Motion respects the app's reduced-motion switches (body.no-anim /
//     .battery-saver) and the OS prefers-reduced-motion — all handled in CSS.
import { escHtml } from "./format.js";

/** @typedef {"primary"|"ghost"|"danger"} ButtonVariant */
/** @typedef {"sm"|"md"|"lg"} Size */

const _attr = (v) => escHtml(String(v)); // attribute-safe (escHtml escapes quotes)

// ── Button ─────────────────────────────────────────────────────
/**
 * Themed button. Renders a real <button> (keyboard + screen-reader friendly).
 * @param {Object} o
 * @param {string}  o.label            Visible text (escaped).
 * @param {ButtonVariant} [o.variant="primary"]
 * @param {Size}    [o.size="md"]
 * @param {string}  [o.icon]           Leading icon/emoji (decorative, aria-hidden).
 * @param {string}  [o.onClick]        Inline handler expression, e.g. "save()".
 * @param {boolean} [o.full=false]     Stretch to container width.
 * @param {boolean} [o.disabled=false]
 * @param {"button"|"submit"} [o.type="button"]
 * @param {string}  [o.ariaLabel]      Override accessible name (else uses label).
 * @param {string}  [o.id]
 * @returns {string} HTML
 */
export function button({
  label = "",
  variant = "primary",
  size = "md",
  icon = "",
  onClick = "",
  full = false,
  disabled = false,
  type = "button",
  ariaLabel = "",
  id = "",
} = {}) {
  const cls = [
    "ui-btn",
    `ui-btn-${variant}`,
    size !== "md" && `ui-btn-${size}`,
    full && "ui-btn-full",
  ]
    .filter(Boolean)
    .join(" ");
  const ic = icon
    ? `<span class="ui-btn-ico" aria-hidden="true">${icon}</span>`
    : "";
  return (
    `<button type="${type}" class="${cls}"` +
    (id ? ` id="${_attr(id)}"` : "") +
    (onClick && !disabled ? ` onclick="${_attr(onClick)}"` : "") +
    (disabled ? ` disabled aria-disabled="true"` : "") +
    (ariaLabel ? ` aria-label="${_attr(ariaLabel)}"` : "") +
    `>${ic}<span class="ui-btn-label">${escHtml(label)}</span></button>`
  );
}

// ── Icon button ────────────────────────────────────────────────
/**
 * Icon-only button. An accessible name is REQUIRED — without visible text the
 * control is invisible to screen readers; we fall back to a generic label and
 * warn in dev rather than ship an unlabeled control.
 * @param {Object} o
 * @param {string}  o.icon
 * @param {string}  o.ariaLabel        Required accessible name.
 * @param {string}  [o.onClick]
 * @param {Size}    [o.size="md"]
 * @param {boolean} [o.disabled=false]
 * @param {string}  [o.id]
 * @returns {string} HTML
 */
export function iconButton({
  icon = "",
  ariaLabel = "",
  onClick = "",
  size = "md",
  disabled = false,
  id = "",
} = {}) {
  if (!ariaLabel) {
    try {
      console.warn("iconButton: missing ariaLabel — icon-only controls need one");
    } catch (e) {}
    ariaLabel = "Button";
  }
  const cls = ["ui-btn", "ui-btn-icon", size !== "md" && `ui-btn-${size}`]
    .filter(Boolean)
    .join(" ");
  return (
    `<button type="button" class="${cls}"` +
    (id ? ` id="${_attr(id)}"` : "") +
    (onClick && !disabled ? ` onclick="${_attr(onClick)}"` : "") +
    (disabled ? ` disabled aria-disabled="true"` : "") +
    ` aria-label="${_attr(ariaLabel)}">` +
    `<span aria-hidden="true">${icon}</span></button>`
  );
}

// ── Empty / zero-data state ────────────────────────────────────
/**
 * Consistent empty state for "no data yet" / "nothing matches the filter".
 * Announced to screen readers via role="status". Optional call-to-action.
 * @param {Object} o
 * @param {string} [o.icon="📭"]       Decorative glyph (aria-hidden).
 * @param {string} [o.title]           Short bold heading (escaped).
 * @param {string} o.message           Body line (escaped).
 * @param {{label:string,onClick:string,variant?:ButtonVariant}} [o.action]
 * @param {Size}   [o.size="md"]        "sm" for cards, "lg" for full pages.
 * @param {boolean} [o.inline=false]    Minimal 1-line muted label (no icon) for
 *                                      tight in-card slots where a full block
 *                                      would be too heavy. Still role="status".
 * @param {boolean} [o.card=false]      Prominent card chrome (gradient + border +
 *                                      blur + shadow) for full-page/standalone
 *                                      empty states. Composes with size.
 * @returns {string} HTML
 */
export function emptyState({
  icon = "📭",
  title = "",
  message = "",
  action = null,
  size = "md",
  inline = false,
  card = false,
} = {}) {
  if (inline) {
    return `<div class="ui-empty-inline" role="status">${escHtml(message)}</div>`;
  }
  const head = title ? `<div class="ui-empty-title">${escHtml(title)}</div>` : "";
  const msg = message ? `<div class="ui-empty-msg">${escHtml(message)}</div>` : "";
  const cta = action
    ? button({
        label: action.label,
        variant: action.variant || "ghost",
        size: "sm",
        onClick: action.onClick,
      })
    : "";
  return (
    `<div class="ui-empty ui-empty-${size}${card ? " ui-empty-card" : ""}" role="status">` +
    `<div class="ui-empty-icon" aria-hidden="true">${icon}</div>` +
    head +
    msg +
    (cta ? `<div class="ui-empty-action">${cta}</div>` : "") +
    `</div>`
  );
}

// ── Error / edge-case state ────────────────────────────────────
/**
 * Failure state (load/render error). Uses role="alert" so it interrupts, and
 * offers a retry affordance. Distinct from emptyState (which is "no data", not
 * "something went wrong").
 * @param {Object} o
 * @param {string} [o.title="Something went wrong"]
 * @param {string} [o.message]
 * @param {{label?:string,onClick:string}} [o.retry]
 * @returns {string} HTML
 */
export function errorState({
  title = "Something went wrong",
  message = "",
  retry = null,
} = {}) {
  const msg = message ? `<div class="ui-empty-msg">${escHtml(message)}</div>` : "";
  const cta = retry
    ? button({
        label: retry.label || "Retry",
        variant: "ghost",
        size: "sm",
        icon: "↻",
        onClick: retry.onClick,
      })
    : "";
  return (
    `<div class="ui-empty ui-empty-error" role="alert">` +
    `<div class="ui-empty-icon" aria-hidden="true">⚠️</div>` +
    `<div class="ui-empty-title">${escHtml(title)}</div>` +
    msg +
    (cta ? `<div class="ui-empty-action">${cta}</div>` : "") +
    `</div>`
  );
}

// ── Skeleton placeholder ───────────────────────────────────────
/**
 * Shimmer placeholder block(s) for content that is loading. Decorative
 * (aria-hidden) — pair with an aria-live status (see loadingState). Shimmer is
 * disabled under reduced-motion / battery-saver via CSS.
 * @param {Object} [o]
 * @param {string} [o.width="100%"]
 * @param {string} [o.height="14px"]
 * @param {string} [o.radius="8px"]
 * @param {number} [o.count=1]         Repeat N stacked bars.
 * @returns {string} HTML
 */
export function skeleton({
  width = "100%",
  height = "14px",
  radius = "8px",
  count = 1,
} = {}) {
  const one = `<div class="ui-skeleton" style="width:${_attr(width)};height:${_attr(height)};border-radius:${_attr(radius)}"></div>`;
  return (
    `<div class="ui-skeleton-group" aria-hidden="true">` +
    one.repeat(Math.max(1, count | 0)) +
    `</div>`
  );
}

// ── Spinner ────────────────────────────────────────────────────
/**
 * Accessible spinner with a screen-reader label.
 * @param {Object} [o]
 * @param {Size}   [o.size="md"]
 * @param {string} [o.label="Loading"]
 * @returns {string} HTML
 */
export function spinner({ size = "md", label = "Loading" } = {}) {
  return (
    `<span class="ui-spinner ui-spinner-${size}" role="status">` +
    `<span class="ui-spinner-ring" aria-hidden="true"></span>` +
    `<span class="ui-sr-only">${escHtml(label)}</span></span>`
  );
}

// ── Loading state ──────────────────────────────────────────────
/**
 * Loading region: a spinner + message, or N skeleton rows. Marked
 * aria-busy="true" with an aria-live status so SR users hear the transition.
 * @param {Object} [o]
 * @param {string} [o.message="Loading…"]
 * @param {number} [o.rows=0]          >0 → render skeleton rows instead of spinner.
 * @param {Size}   [o.size="md"]
 * @returns {string} HTML
 */
export function loadingState({ message = "Loading…", rows = 0, size = "md" } = {}) {
  const body =
    rows > 0
      ? skeleton({ count: rows, height: "18px" })
      : `<div class="ui-loading-inner">${spinner({ size })}<span class="ui-loading-msg">${escHtml(message)}</span></div>`;
  return `<div class="ui-loading ui-loading-${size}" role="status" aria-live="polite" aria-busy="true">${body}</div>`;
}
