// ── GLOBAL SEARCH OVERLAY ──────────────────────────────────
// Searches players, match scorelines, and match dates.
// Calls openPlayerDetail / openMatchIntro via inline onclick strings
// (already on window from their respective feature modules).
import { state } from "../src/engine/state.js";
import { activeMatches } from "../src/engine/selectors.js";
import { escHtml, jsArg, playerColor, playerInitials } from "../src/ui/format.js";

export function openGlobalSearch() {
  const ov = document.getElementById("gs-overlay");
  if (!ov) return;
  ov.classList.add("open");
  const input = document.getElementById("gs-input");
  if (input) {
    input.value = "";
    setTimeout(() => input.focus(), 100);
  }
  _globalSearchInput("");
}

export function closeGlobalSearch() {
  document.getElementById("gs-overlay")?.classList.remove("open");
}

export function _globalSearchInput(q) {
  const results = document.getElementById("gs-results");
  if (!results) return;
  const query = (q || "").trim().toLowerCase();
  if (!query) {
    results.innerHTML = `<div class="gs-empty">Type a player name, score (e.g. <b>6-2</b>), or date (e.g. <b>2026-05-21</b>)</div>`;
    return;
  }
  const out = [];
  // Players
  const players = new Set();
  activeMatches().forEach((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => players.add(p)),
  );
  [...players]
    .filter((p) => p.toLowerCase().includes(query))
    .slice(0, 8)
    .forEach((p) => {
      out.push(
        `<button class="gs-result" onclick="closeGlobalSearch();openPlayerDetail(${jsArg(p)})">
          <span class="gs-result-av" style="background:${playerColor(p)}">${playerInitials(p)}</span>
          <span class="gs-result-name">${escHtml(p)}</span>
          <span class="gs-result-tag">PLAYER</span>
        </button>`,
      );
    });
  // Matches by scoreline
  const scoreM = query.match(/^(\d+)\s*[-–]?\s*(\d+)?$/);
  if (scoreM) {
    const sA = parseInt(scoreM[1], 10);
    const sB = scoreM[2] !== undefined ? parseInt(scoreM[2], 10) : null;
    state.matches
      .filter((m) => {
        if (sB === null) return m.scoreA === sA || m.scoreB === sA;
        return (
          (m.scoreA === sA && m.scoreB === sB) ||
          (m.scoreA === sB && m.scoreB === sA)
        );
      })
      .slice(-10)
      .reverse()
      .forEach((m) => {
        const aWon = m.scoreA > m.scoreB;
        const win = aWon ? m.teamA : m.teamB;
        const idx = state.matches.indexOf(m);
        out.push(
          `<button class="gs-result" onclick="closeGlobalSearch();openMatchIntro(${idx})">
            <span class="gs-result-score">${m.scoreA}-${m.scoreB}</span>
            <span class="gs-result-name">${escHtml(win.join(" & "))} <span class="gs-vs">vs</span> ${escHtml(aWon ? m.teamB.join(" & ") : m.teamA.join(" & "))}</span>
            <span class="gs-result-tag">${m.date || ""}</span>
          </button>`,
        );
      });
  }
  // Matches by date
  const dateM = query.match(/^(\d{4})-?(\d{2})?-?(\d{2})?/);
  if (dateM && !scoreM) {
    const datePrefix = `${dateM[1]}${dateM[2] ? "-" + dateM[2] : ""}${dateM[3] ? "-" + dateM[3] : ""}`;
    state.matches
      .filter((m) => (m.date || "").startsWith(datePrefix))
      .slice(-10)
      .reverse()
      .forEach((m) => {
        const idx = state.matches.indexOf(m);
        out.push(
          `<button class="gs-result" onclick="closeGlobalSearch();openMatchIntro(${idx})">
            <span class="gs-result-score">${m.scoreA}-${m.scoreB}</span>
            <span class="gs-result-name">${escHtml(m.teamA.join(" & "))} <span class="gs-vs">vs</span> ${escHtml(m.teamB.join(" & "))}</span>
            <span class="gs-result-tag">${m.date || ""}</span>
          </button>`,
        );
      });
  }
  results.innerHTML = out.length
    ? out.join("")
    : `<div class="gs-empty">No results for "${escHtml(query)}"</div>`;
}
