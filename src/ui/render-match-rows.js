// ── MATCH-ROW RENDERERS ────────────────────────────────────
// Pure HTML-string builders for match rows (summary list + compact table) and
// the match-classification flags they use. No DOM mutation — callers inject the
// returned strings. Inline onclick handlers (openMatchIntro, deleteMatchByIndex)
// resolve against window at click time, so only their names appear here.
import { escHtml, fmtDate } from "./format.js";
import { state } from "../engine/state.js";

// ── Match classification flags ─────────────────────────────
export function isFireMatch(m) {
  return Math.abs(m.scoreA - m.scoreB) <= 1;
}

export function isDominatingMatch(m) {
  const winnerScore = Math.max(Number(m.scoreA), Number(m.scoreB));
  const loserScore = Math.min(Number(m.scoreA), Number(m.scoreB));
  return (
    (winnerScore === 4 && loserScore === 1) ||
    (winnerScore === 6 && (loserScore === 1 || loserScore === 2))
  );
}

export function isZeroMatch(m) {
  return Number(m.scoreA) === 0 || Number(m.scoreB) === 0;
}

// ── Compact-table row (History) ────────────────────────────
export function buildMatchRowHtml(m, extraClass = "", delay = null, matchIdx = null) {
  const aWon = m.scoreA > m.scoreB;
  const winA = aWon ? "cmr-win" : "cmr-loss";
  const winB = !aWon ? "cmr-win" : "cmr-loss";
  const teamA = (m.teamA || []).join(" & ");
  const teamB = (m.teamB || []).join(" & ");
  const diff = Math.abs(m.scoreA - m.scoreB);
  const badge = isFireMatch(m)
    ? `<span class="cmr-badge cmr-fire" title="Fire match: margin of 1 game">🔥</span>`
    : isDominatingMatch(m)
      ? `<span class="cmr-badge cmr-dom" title="Dominating: 4-1, 6-1, or 6-2">💀</span>`
      : isZeroMatch(m)
        ? `<span class="cmr-badge cmr-zero" title="Zero match: scored 0 games">😂</span>`
        : "";
  const clickable =
    matchIdx !== null
      ? ` style="animation-delay:${delay !== null ? delay : 0}ms;cursor:pointer" onclick="openMatchIntro(${matchIdx})"`
      : delay !== null
        ? ` style="animation-delay:${delay}ms"`
        : "";
  const delBtn =
    window.isAdmin && matchIdx !== null
      ? `<button class="cmr-del-btn" onclick="event.stopPropagation();deleteMatchByIndex(${matchIdx})" title="Delete match">✕</button>`
      : "";
  return `<tr class="cmr-row${extraClass}"${clickable}>
          <td class="cmr-date">${fmtDate(m.date)
            .replace(/\s+\d{4}$/, "")
            .toUpperCase()}</td>
          <td class="cmr-team ${winA}">${teamA}</td>
          <td class="cmr-sc"><span class="cmr-sv ${winA}">${m.scoreA}</span><span class="cmr-dash">–</span><span class="cmr-sv ${winB}">${m.scoreB}</span></td>
          <td class="cmr-team cmr-team-r ${winB}">${teamB}</td>
          <td class="cmr-meta">${badge}${delBtn}</td>
        </tr>`;
}

export function buildCompactMatchRows(matches) {
  if (!matches.length)
    return `<div class="empty" style="padding:20px 0"><div class="ico">🏓</div><p>No matches found</p></div>`;
  return `<table class="cmp-match-rows"><tbody>${[...matches]
    .reverse()
    .map((m) => buildMatchRowHtml(m, "", null, state.matches.indexOf(m)))
    .join("")}</tbody></table>`;
}

// ── Summary-list row (Session Summary) ─────────────────────
export function buildSummaryMatchRow(
  m,
  extraClass = "",
  matchIdx = null,
  eloDeltaMap = null,
) {
  const aWon = m.scoreA > m.scoreB;
  const winA = aWon ? "cmr-win" : "cmr-loss";
  const winB = !aWon ? "cmr-win" : "cmr-loss";
  const teamA = (m.teamA || []).join(" & ");
  const teamB = (m.teamB || []).join(" & ");
  const badge = isFireMatch(m)
    ? `<span class="cmr-badge cmr-fire" title="Fire match: margin of 1 game">🔥</span>`
    : isDominatingMatch(m)
      ? `<span class="cmr-badge cmr-dom" title="Dominating: 4-1, 6-1, or 6-2">💀</span>`
      : isZeroMatch(m)
        ? `<span class="cmr-badge cmr-zero" title="Zero match: scored 0 games">😂</span>`
        : "";
  const clickHandler =
    matchIdx !== null ? `onclick="openMatchIntro(${matchIdx})"` : "";
  const _mkD = (d) =>
    d == null
      ? ""
      : `<span class="smr-ed ${d > 0 ? "smr-ed-pos" : d < 0 ? "smr-ed-neg" : "smr-ed-neu"}">${d > 0 ? "+" : ""}${d}</span>`;
  const eloD = eloDeltaMap?.get(m);
  return `<div class="smr-wrap${extraClass}">
    <div class="smr-inner" ${clickHandler}>
      <span class="cmr-date">${fmtDate(m.date)
        .replace(/\s+\d{4}$/, "")
        .toUpperCase()}</span>
      <span class="cmr-team ${winA}">${escHtml(teamA)}${_mkD(eloD?.dA)}</span>
      <span class="cmr-sc"><span class="cmr-sv ${winA}">${m.scoreA}</span><span class="cmr-dash">–</span><span class="cmr-sv ${winB}">${m.scoreB}</span></span>
      <span class="cmr-team cmr-team-r ${winB}">${escHtml(teamB)}${_mkD(eloD?.dB)}</span>
      <span class="cmr-meta">${badge}</span>
    </div>
    ${
      window.isAdmin && matchIdx !== null
        ? `<div class="smr-edit-reveal" onclick="event.stopPropagation();openEditMatch(${matchIdx})" title="Edit match">✏️</div>` +
          `<div class="swipe-delete-reveal" onclick="event.stopPropagation();deleteMatchByIndex(${matchIdx})" title="Delete match">🗑</div>`
        : ""
    }
  </div>`;
}

export function buildSummaryMatchRows(matches) {
  if (!matches.length)
    return `<div class="empty" style="padding:20px 0"><div class="ico">🏓</div><p>No matches found</p></div>`;
  return `<div class="smr-list">${[...matches]
    .reverse()
    .map((m) => buildSummaryMatchRow(m, "", state.matches.indexOf(m)))
    .join("")}</div>`;
}
