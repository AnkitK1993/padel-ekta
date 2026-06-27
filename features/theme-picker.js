// ── THEME PICKER OVERLAY ───────────────────────────────────
// Thin controller for the theme selection sheet. Delegates all
// theme logic to window.THEMES / window.getThemeIdx / window.setThemeByIdx
// which are set by the theme loader script in index.html.

export function openThemePicker() {
  const ov = document.getElementById("tp-overlay");
  const grid = document.getElementById("tp-grid");
  if (!ov || !grid) return;
  const themes = window.THEMES || [];
  const cur =
    typeof window.getThemeIdx === "function" ? window.getThemeIdx() : -1;
  grid.innerHTML = themes
    .map((t, i) => {
      const modeClass = t.mode ? ` tp-swatch-${t.mode}` : "";
      const dot = t.mode
        ? `<span class="tp-dot tp-dot-${t.mode}"></span>`
        : `<span class="tp-dot" style="background:${t.hex}"></span>`;
      return `<button class="tp-swatch${i === cur ? " tp-swatch-active" : ""}${modeClass}" onclick="pickTheme(${i})" style="--sw:${t.hex};--sw-rgb:${t.r},${t.g},${t.b}">
          ${dot}
          <span class="tp-name">${t.name}</span>
        </button>`;
    })
    .join("");
  ov.classList.add("open");
}

export function closeThemePicker() {
  document.getElementById("tp-overlay")?.classList.remove("open");
}

export function pickTheme(i) {
  if (typeof window.setThemeByIdx === "function") window.setThemeByIdx(i);
  closeThemePicker();
}
