// ── WEEKLY DIGEST OVERLAY ──────────────────────────────────
// Share card summarising the week's highlights. Uses window.showToast
// (already on window from app.js) for the single toast notification.
import { state } from "../src/engine/state.js";
import { activeMatches } from "../src/engine/selectors.js";
import { computeElo } from "../src/engine/elo.js";
import { computeStats } from "../src/engine/stats.js";
import { getPairStats } from "../src/engine/pairs.js";
import { todayISO, weekISO, lastWeekRange } from "../src/engine/dates.js";

export function openWeeklyDigest() {
  document.getElementById("share-card-overlay")?.remove();
  const { from: wkFrom, to: wkTo } = lastWeekRange();
  const _amWk = activeMatches();
  const wkMatches = _amWk.filter(
    (m) => (m.date || "") >= wkFrom && (m.date || "") <= wkTo,
  );
  const thisWkMatches = _amWk.filter(
    (m) => (m.date || "") >= weekISO() && (m.date || "") <= todayISO(),
  );
  const useMatches = thisWkMatches.length >= 3 ? thisWkMatches : wkMatches;
  const label = thisWkMatches.length >= 3 ? "This Week" : "Last Week";
  if (useMatches.length < 2) {
    window.showToast("Not enough matches this week yet", "📋");
    return;
  }

  const eloNow = computeElo(_amWk);
  const eloPre = computeElo(
    _amWk.filter(
      (m) => (m.date || "") < (thisWkMatches.length >= 3 ? weekISO() : wkFrom),
    ),
  );
  const stats = computeStats(useMatches, computeElo(useMatches));

  // Most wins
  const topWinner = [...stats].sort((a, b) => b.mw - a.mw)[0];
  // Biggest ELO mover
  const mover = Object.keys(eloNow)
    .map((p) => ({ name: p, gain: (eloNow[p] || 1000) - (eloPre[p] || 1000) }))
    .filter((p) =>
      useMatches.some((m) =>
        [...(m.teamA || []), ...(m.teamB || [])].includes(p.name),
      ),
    )
    .sort((a, b) => b.gain - a.gain)[0];
  // Biggest upset
  const runElo2 = {};
  let biggestUpset = null;
  [...state.matches]
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .forEach((m) => {
      [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => {
        if (!(p in runElo2)) runElo2[p] = 1000;
      });
      const avgA =
        m.teamA.reduce((s, p) => s + runElo2[p], 0) /
        Math.max(m.teamA.length, 1);
      const avgB =
        m.teamB.reduce((s, p) => s + runElo2[p], 0) /
        Math.max(m.teamB.length, 1);
      const aWon = m.scoreA > m.scoreB;
      const gap = aWon ? avgB - avgA : avgA - avgB;
      if (
        useMatches.includes(m) &&
        gap > 30 &&
        (!biggestUpset || gap > biggestUpset.gap)
      ) {
        biggestUpset = {
          m,
          gap: Math.round(gap),
          winner: aWon ? m.teamA : m.teamB,
          loser: aWon ? m.teamB : m.teamA,
        };
      }
      const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
      const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
      const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));
      m.teamA.forEach((p) => {
        runElo2[p] = (runElo2[p] || 1000) + dA;
      });
      m.teamB.forEach((p) => {
        runElo2[p] = (runElo2[p] || 1000) + dB;
      });
    });
  // Best pair
  const wkPairs = getPairStats(useMatches).filter((p) => p.played >= 2)[0];
  // Hot streak player
  const hotPlayer = stats
    .filter((p) => p.curType === "W" && p.curStreak >= 2)
    .sort((a, b) => b.curStreak - a.curStreak)[0];

  const accentCol = "#18d7ff";
  const statRow = (icon, label2, val, sub) =>
    `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
      <div style="font-size:20px;width:28px;text-align:center;flex-shrink:0">${icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:10px;font-weight:700;color:#4a4a6a;letter-spacing:0.06em;text-transform:uppercase">${label2}</div>
        <div style="font-size:13px;font-weight:900;color:#eeeae4;margin-top:1px">${val}</div>
      </div>
      <div style="font-size:10px;color:#4a4a6a;text-align:right;flex-shrink:0">${sub}</div>
    </div>`;

  const card = `
    <div style="background:linear-gradient(160deg,#0d0d1a,#11111f,#0a0a15);border-radius:24px;border:1px solid rgba(255,255,255,0.08);width:100%;max-width:340px;box-shadow:0 8px 60px rgba(0,0,0,0.7);position:relative;overflow:hidden">
      <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 20% 0%,${accentCol}18 0%,transparent 55%);pointer-events:none"></div>
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,${accentCol},transparent)"></div>
      <div style="padding:20px 22px 16px">
        <div style="font-size:10px;font-weight:800;color:${accentCol};letter-spacing:0.14em;margin-bottom:4px">WEEKLY DIGEST</div>
        <div style="font-size:20px;font-weight:900;color:#f0ecff;line-height:1.1">${label}</div>
        <div style="font-size:11px;color:#4a4a6a;margin-top:4px">${useMatches.length} matches · ${[...new Set(useMatches.flatMap((m) => [...m.teamA, ...m.teamB]))].length} players</div>
      </div>
      <div style="margin:0 16px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:4px 12px">
        ${topWinner ? statRow("🏆", "Top Winner", topWinner.name, `${topWinner.mw}W–${topWinner.ml}L`) : ""}
        ${mover && mover.gain > 0 ? statRow("📈", "Biggest Mover", mover.name, `+${mover.gain} ELO`) : ""}
        ${hotPlayer ? statRow("🔥", "On Fire", hotPlayer.name, `${hotPlayer.curStreak}-match win streak`) : ""}
        ${wkPairs ? statRow("🤝", "Best Duo", wkPairs.key, `${wkPairs.winPct}% · ${wkPairs.played}g`) : ""}
        ${biggestUpset ? statRow("⚡", "Biggest Upset", biggestUpset.winner.map((p) => p.split(" ")[0]).join(" & ") + " won", `+${biggestUpset.gap} ELO gap`) : ""}
      </div>
      <div style="margin:0 16px 20px;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)"></div>
      <div style="padding:0 22px 20px;display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:6px">
          <div style="width:18px;height:18px;border-radius:5px;background:${accentCol};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;color:#000">P</div>
          <div style="font-size:11px;font-weight:800;letter-spacing:0.08em;color:${accentCol}">PADEL EKTA</div>
        </div>
        <div style="font-size:9px;color:#3a3a5a;font-weight:600">${todayISO()}</div>
      </div>
    </div>`;

  const shareLines = [
    `PADEL EKTA — ${label} Digest`,
    `${useMatches.length} matches played`,
    topWinner
      ? `🏆 Top Winner: ${topWinner.name} (${topWinner.mw}W–${topWinner.ml}L)`
      : "",
    mover && mover.gain > 0
      ? `📈 Biggest Mover: ${mover.name} (+${mover.gain} ELO)`
      : "",
    hotPlayer
      ? `🔥 On Fire: ${hotPlayer.name} (${hotPlayer.curStreak}-match streak)`
      : "",
    wkPairs ? `🤝 Best Duo: ${wkPairs.key} (${wkPairs.winPct}%)` : "",
    biggestUpset
      ? `⚡ Biggest Upset: ${biggestUpset.winner.map((p) => p.split(" ")[0]).join(" & ")} (+${biggestUpset.gap} ELO gap)`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  window._shareDigest = () => {
    if (navigator.share) {
      navigator
        .share({ title: "Padel Ekta Weekly Digest", text: shareLines })
        .catch(() => {});
    } else {
      navigator.clipboard
        ?.writeText(shareLines)
        .then(() => window.showToast("Copied to clipboard!", "📋"))
        .catch(() => window.showToast("Screenshot to share", "📸"));
    }
  };

  const overlay = document.createElement("div");
  overlay.id = "share-card-overlay";
  overlay.className = "share-overlay";
  overlay.innerHTML = `
    <div class="share-overlay-bg" onclick="document.getElementById('share-card-overlay').remove()"></div>
    <div class="share-overlay-inner">
      <div class="share-overlay-hint">📸 Screenshot or share</div>
      ${card}
      <div style="display:flex;gap:8px;width:100%;max-width:340px">
        <button class="share-close-btn" style="flex:1" onclick="document.getElementById('share-card-overlay').remove()">Close</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}
