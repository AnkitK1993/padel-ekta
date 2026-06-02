// ── PLAYER AWARD BADGES ────────────────────────────────────
// Pure badge computation: derives a player's award chips from match data.
// Inputs arrive as args; the few cross-cutting helpers (stats/elo/pairs +
// date helpers) are injected via initBadgesDeps so this module stays free of
// app/DOM coupling (same injector pattern as elo.js / selectors.js).
let _computeStats, _computeElo, _getPairStats, _lastWeekRange, _fmtDate;
export function initBadgesDeps(deps) {
  _computeStats = deps.computeStats;
  _computeElo = deps.computeElo;
  _getPairStats = deps.getPairStats;
  _lastWeekRange = deps.lastWeekRange;
  _fmtDate = deps.fmtDate;
}

export function computeBadges(name, stats, eloMap, allMatchesArr, precomputedStats) {
  const badges = [];
  const allStats = precomputedStats || _computeStats(allMatchesArr);
  const sr = allStats;

  // 👑 King: ranked #1 by SR
  if (sr.length && sr[0].name === name)
    badges.push({ icon: "👑", label: "King", desc: "Ranked #1 overall" });

  // 🔥 On Fire / 🧊 Ice Cold
  const ps = allStats.find((p) => p.name === name);
  if (ps) {
    if (ps.curType === "W" && ps.curStreak >= 5)
      badges.push({
        icon: "🔥",
        label: "On Fire",
        desc: `${ps.curStreak} match win streak`,
      });
    if (ps.curType === "L" && ps.curStreak >= 5)
      badges.push({
        icon: "🧊",
        label: "Ice Cold",
        desc: `${ps.curStreak} match loss streak`,
      });
  }

  // 💪 Ironman: most matches played
  const maxMp = Math.max(...allStats.map((p) => p.mp));
  if (ps && ps.mp === maxMp && maxMp > 0)
    badges.push({
      icon: "💪",
      label: "Ironman",
      desc: `Most matches played (${maxMp})`,
    });

  // 🎯 Sniper: won 2+ matches in a session without conceding any games
  const sessionDates = [
    ...new Set(allMatchesArr.map((m) => m.date).filter(Boolean)),
  ];
  for (const date of sessionDates) {
    const sm = allMatchesArr.filter(
      (m) =>
        m.date === date &&
        [...(m.teamA || []), ...(m.teamB || [])].includes(name),
    );
    let shutoutWins = 0;
    sm.forEach((m) => {
      const inA = (m.teamA || []).includes(name);
      const own = inA ? m.scoreA : m.scoreB;
      const opp = inA ? m.scoreB : m.scoreA;
      if (own > opp && opp === 0) shutoutWins++;
    });
    if (shutoutWins >= 2) {
      badges.push({
        icon: "🎯",
        label: "Sniper",
        desc: "Won 2+ matches X-0 in one session",
      });
      break;
    }
  }

  // 🧗 Climber: biggest positive ELO gain this week
  const { from: wkFrom } = _lastWeekRange();
  const preWkElo = _computeElo(
    allMatchesArr.filter((m) => (m.date || "") < wkFrom),
  );
  const eloGains = allStats.map((p) => ({
    name: p.name,
    gain: (eloMap[p.name] || 1000) - (preWkElo[p.name] || 1000),
  }));
  const topGainer = eloGains.sort((a, b) => b.gain - a.gain)[0];
  if (topGainer && topGainer.name === name && topGainer.gain > 0)
    badges.push({
      icon: "🧗",
      label: "Climber",
      desc: `+${topGainer.gain} ELO this week`,
    });

  // 🦁 Clutch King: best win% in close matches (margin <= 1) with ≥3 close games
  const closeW = {},
    closeP = {};
  allMatchesArr.forEach((m) => {
    if (Math.abs(m.scoreA - m.scoreB) > 1) return;
    const aWon = m.scoreA > m.scoreB;
    [...(m.teamA || [])].forEach((p) => {
      closeP[p] = (closeP[p] || 0) + 1;
      if (aWon) closeW[p] = (closeW[p] || 0) + 1;
    });
    [...(m.teamB || [])].forEach((p) => {
      closeP[p] = (closeP[p] || 0) + 1;
      if (!aWon) closeW[p] = (closeW[p] || 0) + 1;
    });
  });
  const clutchPlayers = Object.keys(closeP).filter((p) => closeP[p] >= 3);
  if (clutchPlayers.length) {
    const best = clutchPlayers.sort(
      (a, b) => (closeW[b] || 0) / closeP[b] - (closeW[a] || 0) / closeP[a],
    )[0];
    if (best === name)
      badges.push({
        icon: "🦁",
        label: "Clutch King",
        desc: `${Math.round(((closeW[name] || 0) / closeP[name]) * 100)}% in close matches`,
      });
  }

  // 🤝 Best Duo: part of pair with highest win% (≥4 games)
  const pairs = _getPairStats(allMatchesArr).filter((p) => p.played >= 4);
  if (pairs.length && pairs[0].players.includes(name))
    badges.push({
      icon: "🤝",
      label: "Best Duo",
      desc: `${pairs[0].winPct}% with ${pairs[0].players.find((p) => p !== name)}`,
    });

  // 🃏 Giant Killer: beaten 2+ players with higher SR
  if (ps) {
    const srMap = {};
    allStats.forEach((p) => {
      srMap[p.name] = p.sr;
    });
    const beatenHigher = new Set();
    allMatchesArr.forEach((m) => {
      const aWon = m.scoreA > m.scoreB;
      const inA = (m.teamA || []).includes(name);
      const inB = (m.teamB || []).includes(name);
      if (!inA && !inB) return;
      const won = (inA && aWon) || (inB && !aWon);
      if (!won) return;
      const opps = inA ? m.teamB || [] : m.teamA || [];
      opps.forEach((opp) => {
        if ((srMap[opp] || 0) > (srMap[name] || 0)) beatenHigher.add(opp);
      });
    });
    if (beatenHigher.size >= 2)
      badges.push({
        icon: "🃏",
        label: "Giant Killer",
        desc: `Beaten ${beatenHigher.size} higher-rated players`,
      });
  }

  // ── MULTI-TIER BADGES ────────────────────────────────────
  // Veteran: matches played
  if (ps) {
    const mp = ps.mp;
    if (mp >= 50)
      badges.push({
        icon: "🎖️",
        label: "Veteran",
        desc: `${mp} matches played`,
        tier: "gold",
      });
    else if (mp >= 25)
      badges.push({
        icon: "🎖️",
        label: "Veteran",
        desc: `${mp} matches played`,
        tier: "silver",
      });
    else if (mp >= 10)
      badges.push({
        icon: "🎖️",
        label: "Veteran",
        desc: `${mp} matches played`,
        tier: "bronze",
      });
  }

  // Win Machine: total wins
  if (ps) {
    const w = ps.mw;
    if (w >= 40)
      badges.push({
        icon: "🏆",
        label: "Win Machine",
        desc: `${w} wins`,
        tier: "gold",
      });
    else if (w >= 20)
      badges.push({
        icon: "🏆",
        label: "Win Machine",
        desc: `${w} wins`,
        tier: "silver",
      });
    else if (w >= 10)
      badges.push({
        icon: "🏆",
        label: "Win Machine",
        desc: `${w} wins`,
        tier: "bronze",
      });
  }

  // Comeback King: most wins after trailing (win with lower score first)
  if (ps) {
    let comebacks = 0;
    const pMatches = allMatchesArr.filter(
      (m) => (m.teamA || []).includes(name) || (m.teamB || []).includes(name),
    );
    pMatches.forEach((m) => {
      const inA = (m.teamA || []).includes(name);
      const myScore = inA ? m.scoreA : m.scoreB;
      const theirScore = inA ? m.scoreB : m.scoreA;
      if (myScore > theirScore && theirScore > 0 && myScore - theirScore <= 2)
        comebacks++;
    });
    if (comebacks >= 10)
      badges.push({
        icon: "💪",
        label: "Comeback King",
        desc: `${comebacks} close wins`,
        tier: "gold",
      });
    else if (comebacks >= 5)
      badges.push({
        icon: "💪",
        label: "Comeback King",
        desc: `${comebacks} close wins`,
        tier: "silver",
      });
    else if (comebacks >= 2)
      badges.push({
        icon: "💪",
        label: "Comeback King",
        desc: `${comebacks} close wins`,
        tier: "bronze",
      });
  }

  // Dominator: wins by 3+ margin
  if (ps) {
    const dominWins = allMatchesArr.filter((m) => {
      const inA = (m.teamA || []).includes(name),
        inB = (m.teamB || []).includes(name);
      if (!inA && !inB) return false;
      const aWon = m.scoreA > m.scoreB;
      return (
        ((inA && aWon) || (inB && !aWon)) && Math.abs(m.scoreA - m.scoreB) >= 3
      );
    }).length;
    if (dominWins >= 20)
      badges.push({
        icon: "💀",
        label: "Dominator",
        desc: `${dominWins} dominant wins`,
        tier: "gold",
      });
    else if (dominWins >= 10)
      badges.push({
        icon: "💀",
        label: "Dominator",
        desc: `${dominWins} dominant wins`,
        tier: "silver",
      });
    else if (dominWins >= 5)
      badges.push({
        icon: "💀",
        label: "Dominator",
        desc: `${dominWins} dominant wins`,
        tier: "bronze",
      });
  }

  // Weekend Warrior: most matches on weekends
  if (ps) {
    const wkMatches = allMatchesArr.filter((m) => {
      if (!m.date) return false;
      const d = new Date(m.date + "T00:00:00").getDay();
      return (
        (d === 0 || d === 6) &&
        [...(m.teamA || []), ...(m.teamB || [])].includes(name)
      );
    }).length;
    if (wkMatches >= 30)
      badges.push({
        icon: "🏖️",
        label: "Weekend Warrior",
        desc: `${wkMatches} weekend matches`,
        tier: "gold",
      });
    else if (wkMatches >= 15)
      badges.push({
        icon: "🏖️",
        label: "Weekend Warrior",
        desc: `${wkMatches} weekend matches`,
        tier: "silver",
      });
    else if (wkMatches >= 5)
      badges.push({
        icon: "🏖️",
        label: "Weekend Warrior",
        desc: `${wkMatches} weekend matches`,
        tier: "bronze",
      });
  }

  // Perfect Day: won all matches in a session
  for (const date of sessionDates) {
    const sm = allMatchesArr.filter(
      (m) =>
        m.date === date &&
        [...(m.teamA || []), ...(m.teamB || [])].includes(name),
    );
    if (sm.length >= 3) {
      const allWon = sm.every((m) => {
        const inA = (m.teamA || []).includes(name);
        return (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
      });
      if (allWon) {
        badges.push({
          icon: "⭐",
          label: "Perfect Day",
          desc: `Won all ${sm.length} on ${_fmtDate(date)}`,
          tier: sm.length >= 5 ? "gold" : sm.length >= 4 ? "silver" : "bronze",
        });
        break;
      }
    }
  }

  // Underdog: won as the lower-ELO team
  if (ps) {
    const eloMapCur = eloMap;
    let underdogWins = 0;
    allMatchesArr.forEach((m) => {
      const inA = (m.teamA || []).includes(name),
        inB = (m.teamB || []).includes(name);
      if (!inA && !inB) return;
      const aWon = m.scoreA > m.scoreB;
      const myWon = (inA && aWon) || (inB && !aWon);
      if (!myWon) return;
      const myTeam = inA ? m.teamA : m.teamB;
      const oppTeam = inA ? m.teamB : m.teamA;
      const myAvg =
        myTeam.reduce((s, p) => s + (eloMapCur[p] || 1000), 0) / myTeam.length;
      const oppAvg =
        oppTeam.reduce((s, p) => s + (eloMapCur[p] || 1000), 0) /
        oppTeam.length;
      if (myAvg < oppAvg - 30) underdogWins++;
    });
    if (underdogWins >= 10)
      badges.push({
        icon: "🐉",
        label: "Underdog",
        desc: `${underdogWins} underdog wins`,
        tier: "gold",
      });
    else if (underdogWins >= 5)
      badges.push({
        icon: "🐉",
        label: "Underdog",
        desc: `${underdogWins} underdog wins`,
        tier: "silver",
      });
    else if (underdogWins >= 2)
      badges.push({
        icon: "🐉",
        label: "Underdog",
        desc: `${underdogWins} underdog wins`,
        tier: "bronze",
      });
  }

  return badges;
}
