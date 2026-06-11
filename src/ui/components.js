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
import { escHtml, playerColor, playerInitials } from "./format.js";

/** @typedef {"primary"|"ghost"|"danger"} ButtonVariant */
/** @typedef {"sm"|"md"|"lg"} Size */
/** @typedef {"neutral"|"theme"|"success"|"warning"|"danger"} Tone */

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

// ── Badge / chip ───────────────────────────────────────────────
/**
 * Small status pill. Non-interactive by default; pass onClick to make it a
 * real <button> (never a clickable <span> — keyboard users can't reach those).
 * @param {Object} o
 * @param {string} o.label             Visible text (escaped).
 * @param {Tone}   [o.tone="neutral"]
 * @param {string} [o.icon]            Decorative leading glyph (aria-hidden).
 * @param {string} [o.onClick]         Makes the badge an interactive chip.
 * @param {boolean} [o.selected=false] Pressed state for filter chips
 *                                     (renders aria-pressed when interactive).
 * @param {string} [o.id]
 * @returns {string} HTML
 */
export function badge({
  label = "",
  tone = "neutral",
  icon = "",
  onClick = "",
  selected = false,
  id = "",
} = {}) {
  const cls = [
    "ui-badge",
    `ui-badge-${tone}`,
    onClick && "ui-badge-chip",
    selected && "ui-badge-on",
  ]
    .filter(Boolean)
    .join(" ");
  const ic = icon ? `<span aria-hidden="true">${icon}</span>` : "";
  const inner = `${ic}<span>${escHtml(label)}</span>`;
  if (onClick) {
    return (
      `<button type="button" class="${cls}"` +
      (id ? ` id="${_attr(id)}"` : "") +
      ` onclick="${_attr(onClick)}" aria-pressed="${selected ? "true" : "false"}">` +
      inner +
      `</button>`
    );
  }
  return `<span class="${cls}"${id ? ` id="${_attr(id)}"` : ""}>${inner}</span>`;
}

// ── Avatar ─────────────────────────────────────────────────────
/**
 * Player avatar: photo when available, else deterministic initials + colour
 * (same name → same look every render; uses playerColor/playerInitials).
 * Meaningful image: alt = name. Initials fallback: aria-hidden glyph + sr-only
 * name, so screen readers always hear exactly one name.
 * @param {Object} o
 * @param {string} o.name              Player display name (required).
 * @param {string} [o.src]             Photo URL (escaped). Falls back to initials.
 * @param {Size}   [o.size="md"]       sm=24px, md=34px, lg=48px.
 * @returns {string} HTML
 */
export function avatar({ name = "", src = "", size = "md" } = {}) {
  const cls = `ui-avatar ui-avatar-${size}`;
  if (src) {
    return `<img class="${cls}" src="${_attr(src)}" alt="${_attr(name)}" loading="lazy" decoding="async">`;
  }
  const safe = name || "?";
  return (
    `<span class="${cls}" style="background:${playerColor(safe)}1f;color:${playerColor(safe)}">` +
    `<span aria-hidden="true">${escHtml(playerInitials(safe))}</span>` +
    `<span class="ui-sr-only">${escHtml(safe)}</span></span>`
  );
}

// ── Card ───────────────────────────────────────────────────────
/**
 * Content card with optional header (title + badge + trailing action).
 * The body is RAW HTML (it's a container — callers compose other primitives
 * into it); title/badge text are escaped.
 * @param {Object} o
 * @param {string} [o.title]           Header text (escaped).
 * @param {string} [o.badgeText]       Small label rendered beside the title.
 * @param {string} o.body              Inner HTML (NOT escaped — container slot).
 * @param {string} [o.headerAction]    Inner HTML for a trailing header control.
 * @param {boolean} [o.flush=false]    Remove body padding (edge-to-edge lists).
 * @param {string} [o.id]
 * @returns {string} HTML
 */
export function card({
  title = "",
  badgeText = "",
  body = "",
  headerAction = "",
  flush = false,
  id = "",
} = {}) {
  const head =
    title || badgeText || headerAction
      ? `<div class="ui-card-head">` +
        (badgeText ? badge({ label: badgeText, tone: "theme" }) : "") +
        (title ? `<h3 class="ui-card-title">${escHtml(title)}</h3>` : "") +
        (headerAction ? `<div class="ui-card-action">${headerAction}</div>` : "") +
        `</div>`
      : "";
  return (
    `<section class="ui-card${flush ? " ui-card-flush" : ""}"` +
    (id ? ` id="${_attr(id)}"` : "") +
    `>${head}<div class="ui-card-body">${body}</div></section>`
  );
}

// ── Stat tile ──────────────────────────────────────────────────
/**
 * Single value+label stat cell ("12 · Played"). Compose into statRow().
 * @param {Object} o
 * @param {string|number} o.value
 * @param {string} o.label
 * @param {Tone}   [o.tone="neutral"]
 * @returns {string} HTML
 */
export function statTile({ value = "—", label = "", tone = "neutral" } = {}) {
  return (
    `<div class="ui-stat">` +
    `<div class="ui-stat-val ui-tone-${tone}">${escHtml(String(value))}</div>` +
    `<div class="ui-stat-lbl">${escHtml(label)}</div></div>`
  );
}

/**
 * Responsive row of stat tiles. Wraps on narrow screens (flex, not grid, so
 * any count of tiles shares space evenly).
 * @param {Array<Parameters<typeof statTile>[0]>} tiles
 * @returns {string} HTML
 */
export function statRow(tiles = []) {
  if (!tiles.length) return "";
  return `<div class="ui-stat-row">${tiles.map(statTile).join("")}</div>`;
}

// ── Progress bar ───────────────────────────────────────────────
/**
 * Determinate progress bar with a real progressbar role. Values are clamped
 * to [0, max]; max defaults to 100. label is announced (aria-label).
 * @param {Object} o
 * @param {number} o.value
 * @param {number} [o.max=100]
 * @param {string} [o.label="Progress"]  Accessible name (required for SR).
 * @param {Tone}   [o.tone="theme"]
 * @param {boolean} [o.showValue=false]  Render "value/max" text beside the bar.
 * @returns {string} HTML
 */
export function progressBar({
  value = 0,
  max = 100,
  label = "Progress",
  tone = "theme",
  showValue = false,
} = {}) {
  const mx = Number(max) > 0 ? Number(max) : 100;
  const v = Math.min(mx, Math.max(0, Number(value) || 0));
  const pct = (v / mx) * 100;
  const txt = showValue
    ? `<span class="ui-progress-txt">${escHtml(String(v))}/${escHtml(String(mx))}</span>`
    : "";
  return (
    `<div class="ui-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${mx}" aria-valuenow="${v}" aria-label="${_attr(label)}">` +
    `<div class="ui-progress-track"><div class="ui-progress-fill ui-tone-bg-${tone}" style="width:${pct.toFixed(1)}%"></div></div>` +
    txt +
    `</div>`
  );
}

// ── Segmented control ──────────────────────────────────────────
/**
 * Mutually-exclusive option group (sort pills, period switchers). Renders a
 * radiogroup of real buttons; the active option carries aria-checked.
 * onSelect receives the option key: onSelect="setPeriod" → setPeriod('week').
 * @param {Object} o
 * @param {Array<{key:string,label:string}>} o.options
 * @param {string} o.value             Currently-selected key.
 * @param {string} o.onSelect          Global fn NAME (called with the key).
 * @param {string} [o.ariaLabel="Options"]  Group label for screen readers.
 * @param {Size}   [o.size="md"]
 * @returns {string} HTML
 */
export function segmented({
  options = [],
  value = "",
  onSelect = "",
  ariaLabel = "Options",
  size = "md",
} = {}) {
  if (!options.length) return "";
  const btns = options
    .map(({ key, label }) => {
      const on = key === value;
      return (
        `<button type="button" role="radio" aria-checked="${on ? "true" : "false"}"` +
        ` class="ui-seg-btn${on ? " ui-seg-on" : ""}"` +
        (onSelect ? ` onclick="${_attr(`${onSelect}(${JSON.stringify(String(key))})`)}"` : "") +
        `>${escHtml(label)}</button>`
      );
    })
    .join("");
  return `<div class="ui-seg ui-seg-${size}" role="radiogroup" aria-label="${_attr(ariaLabel)}">${btns}</div>`;
}

// ── Form field ─────────────────────────────────────────────────
/**
 * Labeled input with optional hint/error line. The <label> is always real and
 * always wired (for=id). With error set, the input is marked aria-invalid and
 * described by the error line (aria-describedby), which is role="alert".
 * @param {Object} o
 * @param {string} o.id                Required — wires label→input.
 * @param {string} o.label
 * @param {string} [o.type="text"]
 * @param {string} [o.value]
 * @param {string} [o.placeholder]
 * @param {string} [o.hint]            Muted helper line below the input.
 * @param {string} [o.error]           Error line (replaces hint, role=alert).
 * @param {string} [o.onInput]         Inline handler expression.
 * @param {Object} [o.inputAttrs]      Extra attrs, e.g. {min:1,max:99,inputmode:"numeric"}.
 * @returns {string} HTML
 */
export function field({
  id = "",
  label = "",
  type = "text",
  value = "",
  placeholder = "",
  hint = "",
  error = "",
  onInput = "",
  inputAttrs = {},
} = {}) {
  if (!id) {
    try {
      console.warn("field: missing id — label can't be associated with input");
    } catch (e) {}
    id = `ui-field-${Math.random().toString(36).slice(2, 8)}`;
  }
  const descId = `${id}-desc`;
  const extra = Object.entries(inputAttrs)
    .map(([k, v]) => ` ${_attr(k)}="${_attr(v)}"`)
    .join("");
  const below = error
    ? `<div class="ui-field-error" id="${_attr(descId)}" role="alert">${escHtml(error)}</div>`
    : hint
      ? `<div class="ui-field-hint" id="${_attr(descId)}">${escHtml(hint)}</div>`
      : "";
  return (
    `<div class="ui-field">` +
    `<label class="ui-field-label" for="${_attr(id)}">${escHtml(label)}</label>` +
    `<input class="ui-field-input${error ? " ui-field-input-err" : ""}" id="${_attr(id)}" type="${_attr(type)}"` +
    (value !== "" ? ` value="${_attr(value)}"` : "") +
    (placeholder ? ` placeholder="${_attr(placeholder)}"` : "") +
    (onInput ? ` oninput="${_attr(onInput)}"` : "") +
    (error ? ` aria-invalid="true"` : "") +
    (below ? ` aria-describedby="${_attr(descId)}"` : "") +
    extra +
    `>` +
    below +
    `</div>`
  );
}

// ── Toggle switch ──────────────────────────────────────────────
/**
 * Accessible on/off switch built on a real checkbox (so it works with forms,
 * labels, and assistive tech for free) styled as a switch via CSS.
 * @param {Object} o
 * @param {string} o.id                Required — wires label→input.
 * @param {string} o.label
 * @param {boolean} [o.checked=false]
 * @param {string} [o.onChange]        Inline handler expression; `this.checked`
 *                                     is available, e.g. "setX(this.checked)".
 * @param {boolean} [o.disabled=false]
 * @returns {string} HTML
 */
export function toggle({
  id = "",
  label = "",
  checked = false,
  onChange = "",
  disabled = false,
} = {}) {
  if (!id) {
    try {
      console.warn("toggle: missing id — label can't be associated with input");
    } catch (e) {}
    id = `ui-toggle-${Math.random().toString(36).slice(2, 8)}`;
  }
  return (
    `<label class="ui-toggle${disabled ? " ui-toggle-disabled" : ""}" for="${_attr(id)}">` +
    `<span class="ui-toggle-label">${escHtml(label)}</span>` +
    `<input type="checkbox" id="${_attr(id)}" role="switch"` +
    (checked ? " checked" : "") +
    (disabled ? " disabled" : "") +
    (onChange ? ` onchange="${_attr(onChange)}"` : "") +
    `><span class="ui-toggle-track" aria-hidden="true"><span class="ui-toggle-thumb"></span></span></label>`
  );
}

// ── Bottom sheet scaffold ──────────────────────────────────────
/**
 * Modal bottom-sheet shell: backdrop + panel + titled header with a close
 * button. Returns HTML only — the caller owns mounting/removal (the app's
 * sheets are created and destroyed per open). role="dialog" + aria-modal +
 * aria-labelledby are pre-wired; the close button is a real labeled button
 * and the backdrop also dismisses.
 *
 * NOTE on focus: callers that keep a sheet open across renders should move
 * focus into the panel after mounting (el.querySelector('.ui-sheet-close').focus()).
 * @param {Object} o
 * @param {string} o.id                Required — used for dismissal targeting.
 * @param {string} o.title             Header text (escaped).
 * @param {string} o.body              Inner HTML (container slot, not escaped).
 * @param {string} [o.onClose]         Extra expression run on dismiss (after remove).
 * @param {string} [o.footer]          Optional footer HTML (e.g. action buttons).
 * @returns {string} HTML
 */
export function sheet({ id = "", title = "", body = "", onClose = "", footer = "" } = {}) {
  if (!id) {
    try {
      console.warn("sheet: missing id — dismissal needs a stable element id");
    } catch (e) {}
    id = `ui-sheet-${Math.random().toString(36).slice(2, 8)}`;
  }
  const titleId = `${id}-title`;
  const dismiss = `document.getElementById('${_attr(id)}')?.remove()${onClose ? `;${onClose}` : ""}`;
  return (
    `<div class="ui-sheet" id="${_attr(id)}">` +
    `<div class="ui-sheet-backdrop" onclick="${_attr(dismiss)}"></div>` +
    `<div class="ui-sheet-panel" role="dialog" aria-modal="true" aria-labelledby="${_attr(titleId)}">` +
    `<div class="ui-sheet-head">` +
    `<h2 class="ui-sheet-title" id="${_attr(titleId)}">${escHtml(title)}</h2>` +
    iconButton({ icon: "✕", ariaLabel: "Close", size: "sm", onClick: dismiss }) +
    `</div>` +
    `<div class="ui-sheet-body">${body}</div>` +
    (footer ? `<div class="ui-sheet-foot">${footer}</div>` : "") +
    `</div></div>`
  );
}
