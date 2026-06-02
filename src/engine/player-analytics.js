// ── PLAYER ANALYTICS (pure compute) ────────────────────────
// Form, archetype, power rankings, pair chemistry, match stories and the
// achievements ladder. All pure given their match-array inputs; the engine
// stat helpers are imported directly, the two app/ui-side helpers (getPairStats,
// toLocalISODate) are injected via initPlayerAnalyticsDeps to keep this module
// free of app/DOM coupling (same pattern as badges.js).
import { computeElo, computeEloHistory } from "./elo.js";
import { computeStats } from "./stats.js";

let _getPairStats, _toLocalISODate;
export function initPlayerAnalyticsDeps(deps) {
  _getPairStats = deps.getPairStats;
  _toLocalISODate = deps.toLocalISODate;
}

export function computePlayerForm(name, matches) {
  const sorted = [...matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  const playerMs = sorted.filter((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].includes(name),
  );
  if (playerMs.length < 3) return null;

  const eloMap = computeElo(matches);
  const last10 = playerMs.slice(-10);
  const prev10 = playerMs.slice(-20, -10);

  // Win % last 10
  const wins10 = last10.filter((m) => {
    const inA = (m.teamA || []).includes(name);
    return (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
  }).length;
  const winPct10 = last10.length > 0 ? wins10 / last10.length : 0;

  // Average margin last 10
  const avgMargin10 =
    last10.reduce((s, m) => {
      const inA = (m.teamA || []).includes(name);
      const myScore = inA ? m.scoreA : m.scoreB;
      const theirScore = inA ? m.scoreB : m.scoreA;
      return s + (myScore - theirScore);
    }, 0) / Math.max(last10.length, 1);

  // Win quality: avg opponent ELO in last 10 wins
  let qualSum = 0,
    qualCount = 0;
  last10.forEach((m) => {
    const inA = (m.teamA || []).includes(name);
    const won = (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
    if (!won) return;
    const opps = inA ? m.teamB || [] : m.teamA || [];
    opps.forEach((opp) => {
      qualSum += eloMap[opp] || 1000;
      qualCount++;
    });
  });
  const winQuality = qualCount > 0 ? qualSum / qualCount : 1000;

  // Pressure (close match win %, diff ≤ 2)
  const closeMs = playerMs.filter((m) => Math.abs(m.scoreA - m.scoreB) <= 2);
  const closeWins = closeMs.filter((m) => {
    const inA = (m.teamA || []).includes(name);
    return (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
  }).length;
  const pressureScore = closeMs.length >= 3 ? closeWins / closeMs.length : 0.5;

  // Momentum: compare last 5 vs previous 5 win %
  const last5 = playerMs.slice(-5);
  const prev5 = playerMs.slice(-10, -5);
  const w5 = last5.filter((m) => {
    const inA = (m.teamA || []).includes(name);
    return (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
  }).length;
  const wp5 = prev5.filter((m) => {
    const inA = (m.teamA || []).includes(name);
    return (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
  }).length;
  const momentumDelta =
    last5.length > 0 && prev5.length > 0
      ? (w5 / last5.length - wp5 / prev5.length) * 100
      : 0;

  // Composite form score 0–10
  const formScore = Math.min(
    10,
    Math.max(
      0,
      winPct10 * 4 +
        Math.min(1, Math.max(0, (avgMargin10 + 5) / 10)) * 2.5 +
        Math.min(1, (winQuality - 900) / 300) * 2 +
        pressureScore * 1.5,
    ),
  );

  // Labels
  const momentumLabel =
    momentumDelta > 8
      ? "Rising ↑"
      : momentumDelta < -8
        ? "Falling ↓"
        : "Stable →";
  const momentumColor =
    momentumDelta > 8
      ? "var(--green)"
      : momentumDelta < -8
        ? "var(--red)"
        : "var(--muted)";
  const pressureLabel =
    pressureScore >= 0.7 ? "Elite" : pressureScore >= 0.5 ? "Solid" : "Shaky";
  const pressureColor =
    pressureScore >= 0.7
      ? "var(--green)"
      : pressureScore >= 0.5
        ? "var(--gold)"
        : "var(--red)";
  const formEmoji =
    formScore >= 8
      ? "🔥"
      : formScore >= 6
        ? "⚡"
        : formScore >= 4
          ? "😐"
          : "❄️";

  return {
    score: Math.round(formScore * 10) / 10,
    formEmoji,
    winPct10: Math.round(winPct10 * 100),
    avgMargin10: Math.round(avgMargin10 * 10) / 10,
    momentumDelta: Math.round(momentumDelta),
    momentumLabel,
    momentumColor,
    pressureScore: Math.round(pressureScore * 100),
    pressureLabel,
    pressureColor,
    closeMatches: closeMs.length,
    last10count: last10.length,
    winQuality: Math.round(winQuality),
  };
}

export function computeArchetype(name, matches) {
  const sorted = [...matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  const playerMs = sorted.filter((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].includes(name),
  );
  if (playerMs.length < 5) return null;

  const eloMap = computeElo(matches);
  const wins = playerMs.filter((m) => {
    const inA = (m.teamA || []).includes(name);
    return (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
  });
  const winPct = wins.length / playerMs.length;

  // Close match win %
  const close = playerMs.filter((m) => Math.abs(m.scoreA - m.scoreB) <= 2);
  const closeWinPct =
    close.length > 0
      ? close.filter((m) => {
          const inA = (m.teamA || []).includes(name);
          return (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
        }).length / close.length
      : 0.5;

  // Avg margin
  const avgMargin =
    playerMs.reduce((s, m) => {
      const inA = (m.teamA || []).includes(name);
      return s + ((inA ? m.scoreA : m.scoreB) - (inA ? m.scoreB : m.scoreA));
    }, 0) / playerMs.length;

  // Streak volatility (how often streak direction changes)
  let changes = 0;
  for (let i = 1; i < playerMs.length; i++) {
    const prev = playerMs[i - 1],
      cur = playerMs[i];
    const prevWon = (prev.teamA || []).includes(name)
      ? prev.scoreA > prev.scoreB
      : prev.scoreB > prev.scoreA;
    const curWon = (cur.teamA || []).includes(name)
      ? cur.scoreA > cur.scoreB
      : cur.scoreB > cur.scoreA;
    if (prevWon !== curWon) changes++;
  }
  const volatility = changes / Math.max(playerMs.length - 1, 1);

  // Win quality (avg opponent ELO in wins)
  let qualSum = 0,
    qualCount = 0;
  wins.forEach((m) => {
    const opps = (m.teamA || []).includes(name) ? m.teamB || [] : m.teamA || [];
    opps.forEach((opp) => {
      qualSum += eloMap[opp] || 1000;
      qualCount++;
    });
  });
  const winQuality = qualCount > 0 ? qualSum / qualCount : 1000;

  // Classify
  if (closeWinPct >= 0.65 && close.length >= 4)
    return {
      label: "Clutch Player",
      icon: "🧊",
      desc: "Thrives under pressure, wins the close ones",
      color: "#00c8ff",
    };
  if (avgMargin >= 2.5 && winPct >= 0.6)
    return {
      label: "Finisher",
      icon: "🎯",
      desc: "Wins decisively, rarely drops close sets",
      color: "#00ff9d",
    };
  if (winQuality >= 1050 && wins.length >= 5)
    return {
      label: "Giant Slayer",
      icon: "⚔️",
      desc: "Elevates against strong opponents",
      color: "var(--gold)",
    };
  if (volatility < 0.35 && winPct >= 0.55)
    return {
      label: "Consistent",
      icon: "🛡",
      desc: "Rock-solid, rarely goes on bad runs",
      color: "#b44dff",
    };
  if (volatility > 0.55)
    return {
      label: "Streaky",
      icon: "🎲",
      desc: "Runs hot and cold — dangerous on a good day",
      color: "#ff9d00",
    };
  if (winPct >= 0.65)
    return {
      label: "Aggressor",
      icon: "🔥",
      desc: "High win rate, dominates most matchups",
      color: "#ff2d78",
    };
  return {
    label: "Balanced",
    icon: "⚖️",
    desc: "Well-rounded, no glaring weakness",
    color: "var(--muted)",
  };
}

export function computePowerRankings(matches) {
  const eloMap = computeElo(matches);
  const stats = computeStats(matches, eloMap);
  if (!stats.length) return [];

  const maxElo = Math.max(...Object.values(eloMap));
  const minElo = Math.min(...Object.values(eloMap));
  const eloRange = Math.max(maxElo - minElo, 1);

  const sorted = [...matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  const maxMp = Math.max(...stats.map((s) => s.mp), 1);

  return stats
    .map((p) => {
      const form = computePlayerForm(p.name, matches);
      const eloNorm = ((eloMap[p.name] || 1000) - minElo) / eloRange;
      const formNorm = form ? form.score / 10 : p.mw / Math.max(p.mp, 1);
      const activityNorm = p.mp / maxMp;

      // Win quality: avg ELO of opponents beaten
      let qualSum = 0,
        qualCount = 0;
      sorted
        .filter((m) =>
          [...(m.teamA || []), ...(m.teamB || [])].includes(p.name),
        )
        .forEach((m) => {
          const inA = (m.teamA || []).includes(p.name);
          const won =
            (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
          if (!won) return;
          const opps = inA ? m.teamB || [] : m.teamA || [];
          opps.forEach((opp) => {
            qualSum += eloMap[opp] || 1000;
            qualCount++;
          });
        });
      const winQualNorm =
        qualCount > 0 ? Math.min(1, (qualSum / qualCount - 900) / 400) : 0;

      const score =
        eloNorm * 0.4 + formNorm * 0.3 + winQualNorm * 0.2 + activityNorm * 0.1;

      return {
        name: p.name,
        score: Math.round(score * 1000) / 10,
        elo: eloMap[p.name] || 1000,
        winPct: Math.round((p.mw / Math.max(p.mp, 1)) * 100),
        mp: p.mp,
        form: form ? form.score : null,
        formEmoji: form ? form.formEmoji : "—",
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function computeChemistryScores(matches) {
  const eloMap = computeElo(matches);
  const pairs = _getPairStats(matches).filter((p) => p.played >= 3);
  if (!pairs.length) return [];

  const maxPlayed = Math.max(...pairs.map((p) => p.played), 1);
  const allElos = Object.values(eloMap);
  const avgElo =
    allElos.reduce((s, v) => s + v, 0) / Math.max(allElos.length, 1);

  return pairs
    .map((p) => {
      const [n1, n2] = p.players;
      const avgMargin = p.played ? (p.gf - p.ga) / p.played : 0;
      const winPctNorm = p.winPct / 100;
      const marginNorm = Math.min(1, Math.max(0, (avgMargin + 5) / 10));
      const activityNorm = p.played / maxPlayed;

      // vs-strong: wins against above-average ELO opponents
      const sorted = [...matches].sort((a, b) =>
        (a.date || "").localeCompare(b.date || ""),
      );
      let strongWins = 0,
        strongPlayed = 0;
      sorted.forEach((m) => {
        const inA =
          (m.teamA || []).includes(n1) && (m.teamA || []).includes(n2);
        const inB =
          (m.teamB || []).includes(n1) && (m.teamB || []).includes(n2);
        if (!inA && !inB) return;
        const opps = inA ? m.teamB || [] : m.teamA || [];
        const oppAvgElo =
          opps.reduce((s, op) => s + (eloMap[op] || 1000), 0) /
          Math.max(opps.length, 1);
        if (oppAvgElo < avgElo) return;
        strongPlayed++;
        const aWon = m.scoreA > m.scoreB;
        if ((inA && aWon) || (inB && !aWon)) strongWins++;
      });
      const vsStrongNorm = strongPlayed >= 2 ? strongWins / strongPlayed : 0.5;

      const chemScore =
        winPctNorm * 0.4 +
        marginNorm * 0.25 +
        vsStrongNorm * 0.25 +
        activityNorm * 0.1;
      const score10 = Math.min(10, Math.round(chemScore * 10 * 10) / 10);
      const tier =
        score10 >= 8.5 ? "S" : score10 >= 7 ? "A" : score10 >= 5.5 ? "B" : "C";
      const tierColor =
        tier === "S"
          ? "var(--gold)"
          : tier === "A"
            ? "var(--green)"
            : tier === "B"
              ? "var(--theme)"
              : "var(--muted)";

      return {
        players: p.players,
        played: p.played,
        wins: p.wins,
        winPct: p.winPct,
        avgMargin,
        score: score10,
        tier,
        tierColor,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function computeMatchStories(matches) {
  if (matches.length < 2) return [];
  const sorted = [...matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  const stories = [];
  const eloHistory = {};
  const streaks = {};

  sorted.forEach((m, idx) => {
    const allP = [...(m.teamA || []), ...(m.teamB || [])];
    allP.forEach((p) => {
      if (!(p in eloHistory)) eloHistory[p] = 1000;
      if (!(p in streaks)) streaks[p] = { type: null, count: 0 };
    });

    const aWon = m.scoreA > m.scoreB;
    const avgA =
      m.teamA.reduce((s, p) => s + eloHistory[p], 0) /
      Math.max(m.teamA.length, 1);
    const avgB =
      m.teamB.reduce((s, p) => s + eloHistory[p], 0) /
      Math.max(m.teamB.length, 1);
    const expA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
    const dA = Math.round(32 * ((aWon ? 1 : 0) - expA));
    const dB = Math.round(32 * ((aWon ? 0 : 1) - (1 - expA)));

    const prevElos = { ...eloHistory };

    m.teamA.forEach((p) => {
      eloHistory[p] = (eloHistory[p] || 1000) + dA;
    });
    m.teamB.forEach((p) => {
      eloHistory[p] = (eloHistory[p] || 1000) + dB;
    });

    // Update streaks
    [...m.teamA, ...m.teamB].forEach((p) => {
      const won =
        (m.teamA.includes(p) && aWon) || (m.teamB.includes(p) && !aWon);
      const type = won ? "W" : "L";
      if (streaks[p].type === type) streaks[p].count++;
      else {
        streaks[p].type = type;
        streaks[p].count = 1;
      }
    });

    const date = m.date;

    // Story: Upset (lower ELO team wins)
    const eloDiff = Math.abs(avgA - avgB);
    if (eloDiff >= 60) {
      const upsetTeam =
        aWon && avgA < avgB ? m.teamA : !aWon && avgB < avgA ? m.teamB : null;
      const favoriteTeam = upsetTeam === m.teamA ? m.teamB : m.teamA;
      if (upsetTeam) {
        stories.push({
          icon: "😱",
          type: "upset",
          text: `${upsetTeam.join(" & ")} upset ${favoriteTeam.join(" & ")} (+${Math.round(eloDiff)} ELO gap)`,
          date,
          score: `${m.scoreA}–${m.scoreB}`,
          matchIdx: idx,
        });
      }
    }

    // Story: ELO milestone (1050, 1100, 1150, 1200)
    allP.forEach((p) => {
      [1050, 1100, 1150, 1200, 1250].forEach((milestone) => {
        if (prevElos[p] < milestone && eloHistory[p] >= milestone) {
          stories.push({
            icon: "🏆",
            type: "milestone",
            text: `${p} crossed ELO ${milestone} for the first time!`,
            date,
            score: `ELO ${Math.round(eloHistory[p])}`,
            matchIdx: idx,
          });
        }
      });
    });

    // Story: Shutout (X–0)
    if (m.scoreA === 0 || m.scoreB === 0) {
      const winner = aWon ? m.teamA : m.teamB;
      const loser = aWon ? m.teamB : m.teamA;
      stories.push({
        icon: "💀",
        type: "shutout",
        text: `${winner.join(" & ")} shut out ${loser.join(" & ")} ${m.scoreA}–${m.scoreB}`,
        date,
        score: `${m.scoreA}–${m.scoreB}`,
        matchIdx: idx,
      });
    }
  });

  // Story: Longest win streak per player (all-time)
  const allStats = computeStats(matches);
  allStats.forEach((p) => {
    if (p.bestWinStreak >= 7) {
      stories.push({
        icon: "🔥",
        type: "streak",
        text: `${p.name} holds the all-time record: ${p.bestWinStreak}-match win streak`,
        date: null,
        score: `${p.bestWinStreak} wins`,
        matchIdx: null,
      });
    }
  });

  // Most recent stories first, limit 30
  return stories.reverse().slice(0, 30);
}

export function computeAchievements(name, matches) {
  const sorted = [...matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  const playerMs = sorted.filter((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].includes(name),
  );
  const eloMap = computeElo(matches);
  const eloHistory = computeEloHistory(matches);
  const pts = eloHistory[name] || [];
  const allStats = computeStats(matches, eloMap);
  const ps = allStats.find((p) => p.name === name);
  if (!ps) return [];

  const ach = [];
  const add = (icon, label, desc, unlocked, progress = null) =>
    ach.push({ icon, label, desc, unlocked, progress });

  const wins = playerMs.filter((m) => {
    const inA = (m.teamA || []).includes(name);
    return (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
  });
  const closeMs = playerMs.filter((m) => Math.abs(m.scoreA - m.scoreB) <= 2);
  const closeWins = closeMs.filter((m) => {
    const inA = (m.teamA || []).includes(name);
    return (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
  });

  // Ice Cold — win 5 close games
  add(
    "🧊",
    "Ice Cold",
    "Win 5 close games (≤2 pt diff)",
    closeWins.length >= 5,
    `${Math.min(closeWins.length, 5)}/5`,
  );

  // King Slayer — beat the #1 ranked player
  const ranked = allStats;
  const topPlayer = ranked[0]?.name;
  const beatTop =
    topPlayer &&
    topPlayer !== name &&
    wins.some((m) => {
      const opps = (m.teamA || []).includes(name)
        ? m.teamB || []
        : m.teamA || [];
      return opps.includes(topPlayer);
    });
  add("👑", "King Slayer", `Beat the #1 ranked player`, beatTop);

  // Untouchable — 10-win streak
  add(
    "⚡",
    "Untouchable",
    "Achieve a 10-match win streak",
    ps.bestWinStreak >= 10,
    `${Math.min(ps.bestWinStreak, 10)}/10`,
  );

  // Wall — concede ≤10 pts in a match
  const wallMatch = playerMs.some((m) => {
    const inA = (m.teamA || []).includes(name);
    const conceded = inA ? m.scoreB : m.scoreA;
    const myScore = inA ? m.scoreA : m.scoreB;
    return myScore > conceded && conceded === 0;
  });
  add("🛡", "Wall", "Win a match conceding 0 games", wallMatch);

  // Sharpshooter — 75%+ win rate (min 10 matches)
  const winPct = ps.mp >= 10 ? Math.round((ps.mw / ps.mp) * 100) : 0;
  add(
    "🎯",
    "Sharpshooter",
    "80%+ win rate (min 10 matches)",
    ps.mp >= 10 && winPct >= 80,
    ps.mp >= 10 ? `${winPct}%` : `${ps.mp}/10 played`,
  );

  // On Fire — 5-match win streak
  add(
    "🔥",
    "On Fire",
    "Win 5 matches in a row",
    ps.bestWinStreak >= 5,
    `${Math.min(ps.bestWinStreak, 5)}/5`,
  );

  // Diamond — reach ELO 1200
  const peakElo =
    pts.length > 0 ? Math.max(...pts.map((p) => p.elo)) : eloMap[name] || 1000;
  add(
    "💎",
    "Diamond",
    "Reach ELO 1200",
    peakElo >= 1200,
    `Peak: ${Math.round(peakElo)}`,
  );

  // Chemistry Lab — 10 wins with same partner
  const partnerWins = ps.partnerWins || {};
  const bestPartnerWins = Math.max(0, ...Object.values(partnerWins));
  const bestPartnerName =
    Object.keys(partnerWins).find((k) => partnerWins[k] === bestPartnerWins) ||
    null;
  add(
    "🤝",
    "Chemistry Lab",
    "Win 10 matches with the same partner",
    bestPartnerWins >= 10,
    bestPartnerName ? `${bestPartnerWins}/10 with ${bestPartnerName}` : "0/10",
  );

  // Climber — rise 5+ ranks in a month
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const monthAgoStr = _toLocalISODate(monthAgo);
  const oldMs = matches.filter((m) => (m.date || "") < monthAgoStr);
  const oldRank = computeStats(oldMs).findIndex((p) => p.name === name) + 1;
  const curRank = allStats.findIndex((p) => p.name === name) + 1;
  const rankRise = oldRank > 0 && curRank > 0 ? oldRank - curRank : 0;
  add(
    "⬆️",
    "Climber",
    "Rise 5+ ranks in a month",
    rankRise >= 5,
    rankRise > 0 ? `+${rankRise} ranks` : "—",
  );

  // Comeback Kid — win 3 close matches from behind concept (close wins)
  add(
    "😤",
    "Comeback Kid",
    "Win 3 tense close matches",
    closeWins.length >= 3,
    `${Math.min(closeWins.length, 3)}/3`,
  );

  // Upset Artist — beat 3 higher-ELO opponents in a row
  let consecUpsets = 0,
    maxConsecUpsets = 0;
  playerMs.forEach((m) => {
    const inA = (m.teamA || []).includes(name);
    const won = (inA && m.scoreA > m.scoreB) || (!inA && m.scoreB > m.scoreA);
    if (!won) {
      consecUpsets = 0;
      return;
    }
    const myTeam = inA ? m.teamA : m.teamB;
    const oppTeam = inA ? m.teamB : m.teamA;
    const myAvg =
      myTeam.reduce((s, p) => s + (eloMap[p] || 1000), 0) / myTeam.length;
    const oppAvg =
      oppTeam.reduce((s, p) => s + (eloMap[p] || 1000), 0) / oppTeam.length;
    if (oppAvg > myAvg + 20) {
      consecUpsets++;
      maxConsecUpsets = Math.max(maxConsecUpsets, consecUpsets);
    } else consecUpsets = 0;
  });
  add(
    "🎲",
    "Upset Artist",
    "Beat 3 higher-ELO opponents in a row",
    maxConsecUpsets >= 3,
    `${Math.min(maxConsecUpsets, 3)}/3`,
  );

  // Regular — play every week for 4 weeks
  const weeks = new Set(
    playerMs
      .map((m) => {
        if (!m.date) return null;
        const d = new Date(m.date + "T00:00:00");
        const jan1 = new Date(d.getFullYear(), 0, 1);
        return `${d.getFullYear()}-${Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7)}`;
      })
      .filter(Boolean),
  );
  add(
    "📅",
    "Regular",
    "Play at least once a week for 4 weeks",
    weeks.size >= 4,
    `${Math.min(weeks.size, 4)}/4 weeks`,
  );

  // Season MVP placeholder — top SR in any month
  const monthStats = {};
  matches.forEach((m) => {
    const mo = (m.date || "").slice(0, 7);
    if (!monthStats[mo]) monthStats[mo] = [];
    monthStats[mo].push(m);
  });
  const isMVP = Object.values(monthStats).some((ms) => {
    const st = computeStats(ms);
    return st.length && st[0].name === name;
  });
  add("🥇", "Season MVP", "Finish #1 in any month", isMVP);

  return ach;
}

// ── Analytics page data prep ───────────────────────────────
// Pure data computation for renderAnalyticsPage. Returns a single object
// with all derived stats so the renderer only handles HTML building.
export function computeAnalyticsPageData(matches) {
  const stats = {}, shutoutWins = {}, shutoutLosses = {};
  const highestMargins = [], partnerships = {}, teamMatchups = {};
  const monthlyStats = {}, dateCounts = {}, scoreDist = {}, rivalryCount = {};
  const closeWins = {}, closePlayed = {};

  const sortedM = [...matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );

  sortedM.forEach((m) => {
    const aWon = m.scoreA > m.scoreB;
    const winners = aWon ? m.teamA : m.teamB;
    const losers  = aWon ? m.teamB : m.teamA;
    const winScore = aWon ? m.scoreA : m.scoreB;
    const loseScore = aWon ? m.scoreB : m.scoreA;
    const margin = Math.abs(m.scoreA - m.scoreB);

    [...m.teamA, ...m.teamB].forEach((p) => {
      if (!stats[p])
        stats[p] = { name: p, wins: 0, losses: 0, matches: 0, streak: 0, bestStreak: 0, teammates: {} };
    });
    winners.forEach((p) => {
      stats[p].wins++; stats[p].matches++; stats[p].streak++;
      if (stats[p].streak > stats[p].bestStreak) stats[p].bestStreak = stats[p].streak;
    });
    losers.forEach((p) => { stats[p].losses++; stats[p].matches++; stats[p].streak = 0; });

    if (loseScore === 0) {
      winners.forEach((p) => { shutoutWins[p]  = (shutoutWins[p]  || 0) + 1; });
      losers.forEach( (p) => { shutoutLosses[p] = (shutoutLosses[p] || 0) + 1; });
    }
    winners.forEach((p) => highestMargins.push({ player: p, margin, score: `${winScore}-${loseScore}` }));

    if (m.teamA.length === 2 && m.teamB.length === 2) {
      const addP = (t, won, ownScore, oppScore) => {
        const key = [...t].sort().join(" & ");
        if (!partnerships[key])
          partnerships[key] = { players: [...t].sort(), wins: 0, played: 0, diff: 0, gw: 0, gt: 0 };
        partnerships[key].played++;
        partnerships[key].gw += ownScore;
        partnerships[key].gt += ownScore + oppScore;
        if (won) { partnerships[key].wins++; partnerships[key].diff += margin; }
        else       partnerships[key].diff -= margin;
      };
      addP(m.teamA, aWon,  m.scoreA, m.scoreB);
      addP(m.teamB, !aWon, m.scoreB, m.scoreA);
      const tkA = [...m.teamA].sort().join(" & ");
      const tkB = [...m.teamB].sort().join(" & ");
      const mk  = [tkA, tkB].sort().join(" vs ");
      if (!teamMatchups[mk])
        teamMatchups[mk] = { teamA: [...m.teamA].sort(), teamB: [...m.teamB].sort(), wins: { [tkA]: 0, [tkB]: 0 }, played: 0, matches: [] };
      teamMatchups[mk].played++;
      teamMatchups[mk].wins[aWon ? tkA : tkB]++;
      teamMatchups[mk].matches.push(m);
    }
    if (m.teamA.length === 2) {
      const [a, b] = m.teamA;
      stats[a].teammates[b] = (stats[a].teammates[b] || 0) + 1;
      stats[b].teammates[a] = (stats[b].teammates[a] || 0) + 1;
    }
    if (m.teamB.length === 2) {
      const [a, b] = m.teamB;
      stats[a].teammates[b] = (stats[a].teammates[b] || 0) + 1;
      stats[b].teammates[a] = (stats[b].teammates[a] || 0) + 1;
    }

    const mo = (m.date || "").substring(0, 7);
    if (mo) {
      if (!monthlyStats[mo]) monthlyStats[mo] = {};
      m.teamA.forEach((p) => {
        if (!monthlyStats[mo][p]) monthlyStats[mo][p] = { w: 0, m: 0 };
        monthlyStats[mo][p].m++; if (aWon) monthlyStats[mo][p].w++;
      });
      m.teamB.forEach((p) => {
        if (!monthlyStats[mo][p]) monthlyStats[mo][p] = { w: 0, m: 0 };
        monthlyStats[mo][p].m++; if (!aWon) monthlyStats[mo][p].w++;
      });
    }
    if (m.date) dateCounts[m.date] = (dateCounts[m.date] || 0) + 1;

    const hi = Math.max(m.scoreA, m.scoreB), lo = Math.min(m.scoreA, m.scoreB);
    scoreDist[`${hi}-${lo}`] = (scoreDist[`${hi}-${lo}`] || 0) + 1;

    m.teamA.forEach((a) =>
      m.teamB.forEach((b) => {
        const k = [a, b].sort().join("|");
        rivalryCount[k] = (rivalryCount[k] || 0) + 1;
      }),
    );

    if (margin <= 1) {
      winners.forEach((p) => { closeWins[p]  = (closeWins[p]  || 0) + 1; closePlayed[p] = (closePlayed[p] || 0) + 1; });
      losers.forEach( (p) => { closePlayed[p] = (closePlayed[p] || 0) + 1; });
    }
  });

  const players = Object.values(stats);
  const mostActive         = [...players].sort((a, b) => b.matches - a.matches)[0];
  const topWinRate         = [...players].filter((p) => p.matches >= 3).sort((a, b) => b.wins / b.matches - a.wins / a.matches)[0];
  const topStreak          = [...players].sort((a, b) => b.bestStreak - a.bestStreak)[0];
  const mostShutoutWinsEntry = Object.entries(shutoutWins).sort((a, b) => b[1] - a[1])[0];
  const maxLosses          = Math.max(...Object.values(shutoutLosses), 0);
  const mostShutoutLosses  = Object.entries(shutoutLosses).filter(([, v]) => v === maxLosses).map(([k]) => k);
  const biggestWin         = [...highestMargins].sort((a, b) => b.margin - a.margin)[0];
  const bestPartnership    = Object.values(partnerships)
    .filter((p) => p.played >= 2)
    .sort((a, b) => {
      const wd = b.wins / b.played - a.wins / a.played;
      if (Math.abs(wd) > 1e-9) return wd;
      const pd = b.played - a.played;
      if (pd !== 0) return pd;
      return b.gw / b.gt - a.gw / a.gt;
    })[0];

  return {
    stats, shutoutWins, shutoutLosses, highestMargins, partnerships, teamMatchups,
    monthlyStats, dateCounts, scoreDist, rivalryCount, closeWins, closePlayed,
    mostActive, topWinRate, topStreak, mostShutoutWinsEntry,
    maxLosses, mostShutoutLosses, biggestWin, bestPartnership,
  };
}
