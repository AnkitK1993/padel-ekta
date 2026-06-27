// ── PAIR DETAIL FEATURE MODULE ────────────────────────────────────────────────
// Extracted from app.js: openPairDetail modal with pair stats, form, and history.
// No app.js-specific dependencies — all imports are from stable engine/ui modules.
import { activeMatches } from "../src/engine/selectors.js";
import { badge, emptyState } from "../src/ui/components.js";
import { escHtml, fmtDate } from "../src/ui/format.js";
import { isFireMatch, isDominatingMatch } from "../src/ui/render-match-rows.js";

function openPairDetail(key) {
  document.getElementById("pair-detail-modal")?.remove();
  const players = key.split(" & ");
  const matches = activeMatches().filter(
    (m) =>
      m.teamA.length === 2 &&
      m.teamB.length === 2 &&
      ([...m.teamA].sort().join(" & ") === key ||
        [...m.teamB].sort().join(" & ") === key),
  );
  if (!matches.length) return;

  // ── Core counts ──────────────────────────────────────────
  let wins = 0,
    gw = 0,
    gl = 0,
    totalDiff = 0;
  let curStreak = 0,
    curType = "",
    bestWin = 0,
    bestLoss = 0;
  let winStreak = 0,
    lossStreak = 0,
    maxWinStreak = 0,
    maxLossStreak = 0;
  let fireCount = 0,
    dominatingWins = 0,
    shutoutWins = 0,
    shutoutLosses = 0;
  const form = [],
    oppRecord = {};

  const sorted = [...matches].sort((a, b) => a.date.localeCompare(b.date));
  sorted.forEach((m) => {
    const isPair = [...m.teamA].sort().join(" & ") === key;
    const pScore = isPair ? m.scoreA : m.scoreB;
    const oScore = isPair ? m.scoreB : m.scoreA;
    const won = pScore > oScore;
    const margin = pScore - oScore;
    const opp = [...(isPair ? m.teamB : m.teamA)].sort().join(" & ");

    gw += pScore;
    gl += oScore;
    totalDiff += margin;
    if (won) {
      wins++;
      if (margin > bestWin) bestWin = margin;
    } else {
      if (-margin > bestLoss) bestLoss = -margin;
    }

    form.push(won ? "W" : "L");
    if (!oppRecord[opp]) oppRecord[opp] = { w: 0, l: 0 };
    if (won) oppRecord[opp].w++;
    else oppRecord[opp].l++;

    if (won) {
      winStreak++;
      lossStreak = 0;
      if (winStreak > maxWinStreak) maxWinStreak = winStreak;
    } else {
      lossStreak++;
      winStreak = 0;
      if (lossStreak > maxLossStreak) maxLossStreak = lossStreak;
    }

    if (isFireMatch(m)) fireCount++;
    if (isDominatingMatch(m) && won) dominatingWins++;
    if (pScore === 0) shutoutLosses++;
    if (oScore === 0) shutoutWins++;
  });

  // Current streak
  for (let i = form.length - 1; i >= 0; i--) {
    if (i === form.length - 1) {
      curType = form[i];
      curStreak = 1;
    } else if (form[i] === curType) curStreak++;
    else break;
  }

  const played = matches.length,
    losses = played - wins;
  const winPct = Math.round((wins / played) * 100);
  const gamePct = Math.round((gw / (gw + gl)) * 100);
  const avgDiff = (totalDiff / played).toFixed(1);
  const avgDiffStr = totalDiff >= 0 ? `+${avgDiff}` : avgDiff;
  const firstMatch = sorted[0].date,
    lastMatch = sorted[sorted.length - 1].date;

  // ── Form dots ─────────────────────────────────────────────
  const formHtml = form
    .slice(-10)
    .map(
      (r) =>
        `<span class="fd fd-lg ${r === "W" ? "fd-w" : "fd-l"}">${r}</span>`,
    )
    .join("");

  // ── Opponents ─────────────────────────────────────────────
  const oppHtml = Object.entries(oppRecord)
    .sort((a, b) => b[1].w + b[1].l - (a[1].w + a[1].l))
    .map(([opp, rec]) => {
      const tot = rec.w + rec.l;
      const pct = Math.round((rec.w / tot) * 100);
      const col =
        pct >= 60 ? "var(--green)" : pct <= 40 ? "var(--red)" : "var(--text)";
      return `<div class="chem-row"><div class="chem-names" style="font-size:10px">${escHtml(opp)}</div><div class="chem-wl">${rec.w}–${rec.l}</div><div class="chem-bar-wrap"><div class="chem-bar" style="width:${pct}%;background:${col}"></div></div><div class="chem-pct" style="color:${col}">${pct}%</div></div>`;
    })
    .join("");

  // ── Recent matches ────────────────────────────────────────
  const recentHtml = [...sorted]
    .reverse()
    .slice(0, 6)
    .map((m) => {
      const isPair = [...m.teamA].sort().join(" & ") === key;
      const pScore = isPair ? m.scoreA : m.scoreB;
      const oScore = isPair ? m.scoreB : m.scoreA;
      const won = pScore > oScore;
      const opp = [...(isPair ? m.teamB : m.teamA)].sort().join(" & ");
      return `<div class="chem-row"><div style="font-size:9px;color:var(--muted);flex-shrink:0;width:56px">${fmtDate(
        m.date,
      )
        .replace(/\s+\d{4}$/, "")
        .toUpperCase()}</div><div class="chem-names" style="font-size:10px">vs ${escHtml(opp)}</div><div style="font-size:11px;font-weight:800;color:${won ? "var(--green)" : "var(--red)"};flex-shrink:0">${pScore}–${oScore}</div></div>`;
    })
    .join("");

  const streakCol = curType === "W" ? "var(--green)" : "var(--red)";
  const streakIcon = curType === "W" ? "🔥" : "❄️";

  const html = `
          <div id="pair-detail-modal">
            <div class="analytics-inner">
              <div class="analytics-header">
                <div class="analytics-title" style="font-size:15px">🤝 ${key}</div>
                <button class="analytics-close" onclick="document.getElementById('pair-detail-modal').remove()">✕</button>
              </div>
              <div class="analytics-cards">

                <!-- Overview -->
                <div class="ana-card ov-card">
                  <div class="ov-header">
                    <div class="ov-sr-block">
                      <div class="ov-sr-val" style="color:${winPct >= 60 ? "var(--green)" : winPct <= 40 ? "var(--red)" : "var(--text)"}">${winPct}%</div>
                      <div class="ov-sr-lbl">Win Rate</div>
                    </div>
                    <div class="ov-record-block">
                      <div class="ov-record">${wins}<span class="ov-record-sep">W</span>${losses}<span class="ov-record-sep">L</span></div>
                      <div class="ov-win-pct">${played} matches together</div>
                    </div>
                  </div>
                  <div class="ov-grid" style="margin-top:10px">
                    <div class="ov-cell"><div class="ov-val p">${gw}</div><div class="ov-lbl">Games Won</div></div>
                    <div class="ov-cell"><div class="ov-val n">${gl}</div><div class="ov-lbl">Games Lost</div></div>
                    <div class="ov-cell"><div class="ov-val ${totalDiff >= 0 ? "p" : "n"}">${totalDiff >= 0 ? "+" : ""}${totalDiff}</div><div class="ov-lbl">Game Diff</div></div>
                    <div class="ov-cell"><div class="ov-val">${gamePct}%</div><div class="ov-lbl">Game %</div></div>
                    <div class="ov-cell"><div class="ov-val ${totalDiff >= 0 ? "p" : "n"}">${avgDiffStr}</div><div class="ov-lbl">Avg Margin</div></div>
                    <div class="ov-cell"><div class="ov-val p">+${bestWin}</div><div class="ov-lbl">Best Win</div></div>
                    <div class="ov-cell"><div class="ov-val n">-${bestLoss}</div><div class="ov-lbl">Worst Loss</div></div>
                    <div class="ov-cell"><div class="ov-val">${fireCount}</div><div class="ov-lbl">🔥 Fires</div></div>
                  </div>
                </div>

                <!-- Streaks -->
                <div class="ana-card">
                  <span class="badge">Streaks & Form</span>
                  <div class="ov-grid" style="margin-top:10px;grid-template-columns:repeat(3,1fr)">
                    <div class="ov-cell">
                      <div class="ov-val" style="color:${curStreak > 0 ? streakCol : "var(--muted)"}">${curStreak > 0 ? `${streakIcon} ${curStreak}${curType}` : "—"}</div>
                      <div class="ov-lbl">Current</div>
                    </div>
                    <div class="ov-cell">
                      <div class="ov-val" style="color:var(--green)">${maxWinStreak}W</div>
                      <div class="ov-lbl">Best Streak</div>
                    </div>
                    <div class="ov-cell">
                      <div class="ov-val" style="color:var(--red)">${maxLossStreak}L</div>
                      <div class="ov-lbl">Worst Streak</div>
                    </div>
                    <div class="ov-cell">
                      <div class="ov-val" style="color:var(--green)">${shutoutWins}</div>
                      <div class="ov-lbl">Shutout W</div>
                    </div>
                    <div class="ov-cell">
                      <div class="ov-val" style="color:var(--red)">${shutoutLosses}</div>
                      <div class="ov-lbl">Shutout L</div>
                    </div>
                    <div class="ov-cell">
                      <div class="ov-val">${dominatingWins}</div>
                      <div class="ov-lbl">💀 Dominant W</div>
                    </div>
                  </div>
                  <div style="margin-top:12px">
                    <div style="font-size:9px;font-weight:700;letter-spacing:0.1em;color:var(--muted);text-transform:uppercase;margin-bottom:6px">Recent Form</div>
                    <div style="display:flex;gap:4px;flex-wrap:wrap">${formHtml}</div>
                  </div>
                </div>

                <!-- Timeline -->
                <div class="ana-card">
                  <span class="badge">Timeline</span>
                  <div class="det-streak-row" style="margin-top:10px">
                    <div class="det-streak-cell">
                      <div class="det-streak-val" style="font-size:13px;font-weight:700">${fmtDate(firstMatch)}</div>
                      <div class="sub">First Together</div>
                    </div>
                    <div class="det-streak-div"></div>
                    <div class="det-streak-cell">
                      <div class="det-streak-val" style="font-size:13px;font-weight:700">${fmtDate(lastMatch)}</div>
                      <div class="sub">Last Together</div>
                    </div>
                  </div>
                </div>

                <!-- vs Opponents -->
                <div class="ana-card">
                  <span class="badge">vs Opponents</span>
                  <div style="margin-top:8px">${oppHtml || emptyState({ inline: true, message: "No data." })}</div>
                </div>

              </div>
              <div style="margin-top:20px;font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Recent Matches</div>
              <div class="ana-card" style="padding:8px 12px">${recentHtml || emptyState({ inline: true, message: "No matches." })}</div>
            </div>
          </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
}

export { openPairDetail };
