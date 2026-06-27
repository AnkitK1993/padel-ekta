// ── WEEKLY STATS & SNAPSHOTS ───────────────────────────────
// Computes the consecutive-weeks-played streak and persists weekly
// rank snapshots in localStorage for "rank change since last week" arrows.
import { state } from "../src/engine/state.js";
import { activeMatches } from "../src/engine/selectors.js";
import { memoStats } from "../src/app/memo-store.js";
import { toLocalISODate } from "../src/ui/format.js";

export function computeSessionStreak() {
  if (!state.matches.length) return 0;
  const getMonday = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    const dow = d.getDay();
    d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    return toLocalISODate(d);
  };
  const weeks = [
    ...new Set(
      activeMatches()
        .filter((m) => m.date)
        .map((m) => getMonday(m.date)),
    ),
  ]
    .sort()
    .reverse();
  if (weeks.length < 2) return weeks.length;
  let streak = 1;
  for (let i = 0; i < weeks.length - 1; i++) {
    const diff = Math.round(
      (new Date(weeks[i] + "T00:00:00") -
        new Date(weeks[i + 1] + "T00:00:00")) /
        86400000,
    );
    if (diff === 7) streak++;
    else break;
  }
  return streak;
}

const SNAP_KEY = "ekta_weekly_snap";

export function getWeeklySnaps() {
  try {
    return JSON.parse(localStorage.getItem(SNAP_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveWeeklySnap(snap) {
  const snaps = getWeeklySnaps();
  const existing = snaps.findIndex((s) => s.weekOf === snap.weekOf);
  if (existing >= 0) snaps[existing] = snap;
  else snaps.unshift(snap);
  snaps.splice(12); // keep last 12 weeks
  try {
    localStorage.setItem(SNAP_KEY, JSON.stringify(snaps));
  } catch {}
}

export function autoSaveWeeklySnap() {
  if (!state.matches.length) return;
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  const weekOf = toLocalISODate(monday);
  const existing = getWeeklySnaps().find((s) => s.weekOf === weekOf);
  if (existing) return; // already snapped this week
  const stats = memoStats();
  const rankMap = {};
  stats.forEach((p, i) => {
    rankMap[p.name] = i + 1;
  });
  saveWeeklySnap({ weekOf, rankMap });
}

export function getPrevWeekRankMap() {
  const snaps = getWeeklySnaps();
  if (snaps.length < 2) return snaps[0]?.rankMap || {};
  return snaps[1].rankMap;
}
