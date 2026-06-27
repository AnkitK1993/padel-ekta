// ── SHAREABLE MATCH POSTER ─────────────────────────────────
// Self-contained overlay that generates a visual match result card.
// Pure src/ deps only — no app.js closure state needed.
import { state } from "../src/engine/state.js";
import { activeMatches } from "../src/engine/selectors.js";
import { computeElo } from "../src/engine/elo.js";
import { fmtDate, playerColor, playerInitials } from "../src/ui/format.js";

export function openShareMatchPoster(matchIdx) {
  document.getElementById("share-card-overlay")?.remove();
  const m = state.matches[matchIdx];
  if (!m) return;
  const _amSlice = activeMatches();
  const _upToIncl = new Set(state.matches.slice(0, matchIdx + 1));
  const _upToBefore = new Set(state.matches.slice(0, matchIdx));
  const eloMap = computeElo(_amSlice.filter((m) => _upToIncl.has(m)));
  const eloMapBefore = computeElo(_amSlice.filter((m) => _upToBefore.has(m)));
  const aWon = m.scoreA > m.scoreB;
  const winTeam = aWon ? m.teamA : m.teamB;
  const losTeam = aWon ? m.teamB : m.teamA;
  const winScore = aWon ? m.scoreA : m.scoreB;
  const losScore = aWon ? m.scoreB : m.scoreA;
  const colA = playerColor(m.teamA[0]);
  const colB = playerColor(m.teamB[0]);
  const winCol = aWon ? colA : colB;

  const mkAvatar = (name, size = 36) => {
    const c = playerColor(name);
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${c}33;border:2px solid ${c}66;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.35)}px;font-weight:900;color:${c}">${playerInitials(name)}</div>`;
  };
  const mkEloDelta = (name) => {
    const before = eloMapBefore[name] || 1000;
    const after = eloMap[name] || 1000;
    const d = Math.round(after - before);
    const col = d > 0 ? "#4ade80" : d < 0 ? "#f87171" : "rgba(255,255,255,0.4)";
    return `<span style="font-size:10px;font-weight:700;color:${col}">${d > 0 ? "+" : ""}${d}</span>`;
  };
  const mkTeamRow = (team) =>
    team
      .map(
        (p) =>
          `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      ${mkAvatar(p, 32)}
      <span style="font-size:13px;font-weight:800;color:#f0ecff">${p}</span>
      <span style="margin-left:auto">${mkEloDelta(p)}</span>
    </div>`,
      )
      .join("");

  const card = `
    <div style="background:linear-gradient(160deg,#0d0d1a 0%,#11111f 60%,#0a0a15 100%);border-radius:24px;border:1px solid rgba(255,255,255,0.08);padding:0;width:100%;max-width:340px;box-shadow:0 8px 60px rgba(0,0,0,0.7);position:relative;overflow:hidden">
      <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 20% 0%,${winCol}18 0%,transparent 55%);pointer-events:none"></div>
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,${winCol},transparent)"></div>

      <div style="padding:20px 20px 14px;text-align:center">
        <div style="font-size:9px;font-weight:800;letter-spacing:0.15em;color:var(--muted);margin-bottom:6px">MATCH RESULT · ${fmtDate(m.date)}</div>
        <div style="font-size:46px;font-weight:900;color:#f0ecff;letter-spacing:-0.03em;line-height:1">${winScore}<span style="font-size:28px;color:rgba(255,255,255,0.3)"> – </span>${losScore}</div>
        <div style="font-size:10px;color:${winCol};font-weight:800;letter-spacing:0.08em;margin-top:6px">🏆 ${winTeam.map((p) => p.split(" ")[0]).join(" & ")} WIN</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:1px solid rgba(255,255,255,0.06)">
        <div style="padding:14px 16px;border-right:1px solid rgba(255,255,255,0.06)">
          <div style="font-size:8px;font-weight:700;color:${aWon ? colA : "rgba(255,255,255,0.3)"};letter-spacing:0.1em;margin-bottom:8px">${aWon ? "🏆 WINNERS" : "TEAM A"}</div>
          ${mkTeamRow(m.teamA)}
        </div>
        <div style="padding:14px 16px">
          <div style="font-size:8px;font-weight:700;color:${!aWon ? colB : "rgba(255,255,255,0.3)"};letter-spacing:0.1em;margin-bottom:8px">${!aWon ? "🏆 WINNERS" : "TEAM B"}</div>
          ${mkTeamRow(m.teamB)}
        </div>
      </div>

      <div style="padding:10px 20px 16px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.05)">
        <div style="display:flex;align-items:center;gap:6px">
          <div style="width:16px;height:16px;border-radius:4px;background:${winCol};display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:900;color:#000">P</div>
          <div style="font-size:10px;font-weight:800;letter-spacing:0.08em;color:${winCol}">PADEL EKTA</div>
        </div>
        <div style="font-size:9px;color:rgba(255,255,255,0.2);font-weight:600">ELO changes shown</div>
      </div>
    </div>`;

  const overlay = document.createElement("div");
  overlay.id = "share-card-overlay";
  overlay.className = "share-overlay";
  overlay.innerHTML = `
    <div class="share-overlay-bg" onclick="document.getElementById('share-card-overlay').remove()"></div>
    <div class="share-overlay-inner">
      <div class="share-overlay-hint">📸 Screenshot to share</div>
      ${card}
      <button class="share-close-btn" onclick="document.getElementById('share-card-overlay').remove()">Close</button>
    </div>`;
  document.body.appendChild(overlay);
}
