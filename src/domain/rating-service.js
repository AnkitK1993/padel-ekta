// ── RATING SERVICE ─────────────────────────────────────────────────────
// The ONE place that knows which scoring engine is active and how to turn a
// set of matches into ratings, deltas, timelines, SR, labels and printed
// numbers. Every screen goes through `rating` — nothing else may import the
// individual engines (tests/tests-consistency.mjs enforces that), so a screen
// can no longer silently show a different engine than the leaderboard.
//
// There are deliberately NO per-module fallbacks: a missing wiring used to
// default to another engine and quietly show the wrong numbers.
import { computeGlicko2Full, computeMatchGlicko2Deltas } from "./glicko2.js";
import { computeOpenSkillFull, computeMatchOpenSkillDeltas } from "./openskill.js";
import { computeFairShare, computeMatchFairShareDeltas } from "./fairshare.js";
import {
  computeEPFull,
  computeEPTimeline,
  computeMatchEPDeltas,
  computeEPUpsets,
  computeEPProjection,
  EP_SCALE,
  EP_SHRINKAGE,
  MATURITY_GAMES,
} from "./ep.js";
import { computeLeagueFull, computeMatchLeagueDeltas } from "./league.js";
import { computeStats, ratingToSr } from "./stats.js";
import { labMatchupDeltas, labEPFull } from "./scoring-lab.js";
import { withoutGuestMatches, ratedMatches, isRatedMatch, _inSeason } from "./selectors.js";
import { state } from "./state.js";

export const SCORING_SYSTEMS = ["league", "ep", "fair", "fairgap", "glicko2", "openskill", "fairshare"];
// Earned Points ("ep") carries the house name, "ASS". (The original
// margin x opponent-strength engine, ASS CLASSIC, was retired.)
export const SCORING_SYSTEM_LABELS = {
  glicko2: "GLICKO-2",
  openskill: "OPENSKILL",
  fairshare: "FAIR SHARE",
  ep: "ASS",
  fair: "FAIR ASS",
  fairgap: "FAIR ASS GAP",
  league: "LEAGUE",
};
// Systems that fill the extra numeric column beside the rating — a "±"
// confidence band for Glicko-2/OpenSkill, total points earned for EP.
export const SCORING_SYSTEMS_WITH_CONFIDENCE = ["glicko2", "openskill", "ep", "fair", "fairgap", "league"];
// 0-based systems: no 1000 baseline, headline number small enough that the
// decimal carries real ordering information.
export const SCORING_SYSTEMS_ZERO_BASED = ["ep", "fair", "fairgap", "league"];
// Points-based systems: a running total of earned points, a newcomer rule and
// a per-match points entry. "fair" (FAIR ASS) is Fair Matchup Points from the
// Scoring Lab: balanced / stacked team points + partner split, with any match
// that has a newcomer (< 50 career games) scored exactly as ASS. "fairgap"
// (FAIR ASS GAP) is the same with the Lab's gap rule: the teams' combined-ASS
// gap decides balanced (≤ 15) / graded / fully stacked (≥ 30).
export const SCORING_SYSTEMS_POINTS = ["ep", "fair", "fairgap"];
const MATCHUP_SYSTEMS = { fair: {}, fairgap: { gapRule: true, gapBalanced: 15, gapFull: 30 } };
const isMatchup = (s) => Object.hasOwn(MATCHUP_SYSTEMS, s);
const FAIR_SCALE = 2; // FAIR ASS score = 2 × points ÷ (games + 10), like ASS

// LEAGUE (football-style: win % then game difference, 3 points a win) is the
// default.
let _system = "league";
export function setActiveSystem(sys) {
  if (SCORING_SYSTEMS.includes(sys)) _system = sys;
  return _system;
}
export function activeSystem() {
  return _system;
}

// Ratings restart every season, so "the rating at / change from this match"
// only means something inside the window that match is scored in: its season,
// or the un-seasoned remainder for a match outside every season. The window
// holds RATED matches only (no guests, no excluded players) — the very list the
// leaderboard is scored over — so a number read from it can't disagree with the
// leaderboard.
export function scopeKey(m) {
  return state.seasons.find((sn) => _inSeason(sn, m.date))?.id ?? "__none__";
}
export function scopeFor(m, matches = ratedMatches()) {
  const k = scopeKey(m);
  return matches.filter((x) => scopeKey(x) === k);
}

// Per-match detail is cached because one overlay asks for it several ways;
// memo-store's invalidateAll() clears it whenever the data changes.
let _entryCache = new Map();
// rating.map() results per match ARRAY (screens ask for the same window's map
// many times in one render — e.g. once per player). An entry is only reused
// while the array still has the same length and end elements and the career
// history (state.matches) is unchanged; any data change also clears it.
let _mapCache = new WeakMap();
let _careerCounts = null; // { key, counts } — see careerGameCounts()
export function invalidate() {
  _entryCache = new Map();
  _mapCache = new WeakMap();
  _careerCounts = null;
}

// Rated-or-not, every non-guest match a player has ever played (all seasons):
// what the ASS newcomer rule counts.
function careerGameCounts() {
  const career = careerMatches();
  const key = `${state.matches.length}|${career.length}`;
  if (_careerCounts && _careerCounts.key === key && _careerCounts.src === state.matches)
    return _careerCounts.counts;
  const counts = {};
  career.forEach((m) =>
    [...(m.teamA || []), ...(m.teamB || [])].forEach((p) => (counts[p] = (counts[p] || 0) + 1)),
  );
  _careerCounts = { key, src: state.matches, counts };
  return counts;
}
function _mapSig(matches, s) {
  const all = state.matches || [];
  return [s, matches.length, matches[0], matches[matches.length - 1], all, all.length];
}
const _sameSig = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// Career games (all seasons, guest matches excluded like the engine) each
// player had played before match `m` — what the 50-game newcomer flag reads.
export function careerGamesBefore(m) {
  const career = new Set(careerMatches());
  const ordered = [...state.matches].sort((a, b) =>
    (a.date || "").localeCompare(b.date || ""),
  );
  const k = ordered.indexOf(m);
  const counts = {};
  (k >= 0 ? ordered.slice(0, k) : ordered).forEach((x) => {
    if (!career.has(x)) return;
    [...(x.teamA || []), ...(x.teamB || [])].forEach(
      (q) => (counts[q] = (counts[q] || 0) + 1),
    );
  });
  return counts;
}

// EP's expectation/maturity need the full cross-season history alongside
// whatever window is being scored (points restart at 0 each season/filter, but
// the 50-game newcomer flag is CAREER-wide).
export function careerMatches() {
  return withoutGuestMatches(state.matches);
}

// SR is a friendly 1-10 band. ratingToSr subtracts a fixed 700 baseline, which
// only suits the 1000-centred engines; a 0-based rating is min-max scaled over
// the current field instead (lowest reads 1.0, highest 10.0).
function minMaxSrFn(ratingMap, round = true) {
  const vals = Object.values(ratingMap || {}).filter(Number.isFinite);
  if (!vals.length) return () => 0;
  const min = Math.min(...vals);
  const range = Math.max(...vals) - min;
  return (r) => {
    if (!Number.isFinite(r)) return 0;
    if (range <= 0) return 10;
    const sr = 1 + (9 * (r - min)) / range;
    return round ? parseFloat(sr.toFixed(2)) : sr;
  };
}

// Absolute "level" ladders for celebrations and achievements, on each scale's
// own units. The 1000-centred engines share one ladder. The 0-based EP
// score (2 x average points per game) reads very differently, so it has its own:
// calibrated on the real league data so a rung is about as hard to reach as its
// classic counterpart (elite: the top ~15-20% of a season's players; bigGain:
// roughly the largest single-match swing ever recorded once a player has 10+
// games).
const LADDERS = {
  classic: { steps: [1050, 1100, 1150, 1200, 1250, 1300], elite: 1200, bigGain: 50 },
  zeroBased: { steps: [25, 50, 75, 100], elite: 90, bigGain: 10 },
  // LEAGUE's number is a win %.
  league: { steps: [40, 50, 60, 70], elite: 65, bigGain: 10 },
};

// Generic running-total timeline for engines without a bespoke one.
function timelineFromDeltas(matches, deltaMap, base) {
  const running = {};
  const history = {};
  const peaks = {};
  const lows = {};
  [...matches]
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .forEach((m) => {
      const entry = deltaMap.get(m);
      if (!entry) return;
      const aWon = m.scoreA > m.scoreB;
      const record = (p, won, opponent, mine, theirs) => {
        if (!(p in running)) {
          running[p] = base;
          history[p] = [];
          peaks[p] = base;
          lows[p] = base;
        }
        // Engines that round their per-match deltas also report the exact
        // rating after the match (playerAfter); summing rounded deltas would
        // drift from the leaderboard number, so prefer the absolute value.
        const before = running[p];
        const after = entry.playerAfter?.[p];
        running[p] = after !== undefined ? after : before + (entry.playerDeltas[p] || 0);
        const d = running[p] - before;
        history[p].push({
          date: m.date,
          elo: running[p],
          delta: d,
          won,
          opponent,
          scoreA: mine,
          scoreB: theirs,
        });
        if (running[p] > peaks[p]) peaks[p] = running[p];
        if (running[p] < lows[p]) lows[p] = running[p];
      };
      (m.teamA || []).forEach((p) =>
        record(p, aWon, (m.teamB || []).join(" & "), m.scoreA, m.scoreB),
      );
      (m.teamB || []).forEach((p) =>
        record(p, !aWon, (m.teamA || []).join(" & "), m.scoreB, m.scoreA),
      );
    });
  return { history, peaks, lows };
}

// FAIR ASS (or FAIR ASS GAP) per-match entries for `matches`, ranked on each
// season's own ASS.
function fairDeltas(matches, s = "fair") {
  return labMatchupDeltas(matches, careerMatches(), { seasonGames: 0, seasonKey: scopeKey, ...MATCHUP_SYSTEMS[s] });
}
function fairFull(matches, s = "fair") {
  return labEPFull(fairDeltas(matches, s), { scale: FAIR_SCALE });
}
// Running-score timeline for a points system (score after each match =
// scale × points so far ÷ (games so far + shrinkage)), the same shape as ASS's.
function pointsTimeline(matches, deltaMap, scale) {
  const history = {};
  const peaks = {};
  const lows = {};
  const totals = {};
  const played = {};
  [...matches]
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .forEach((m) => {
      const entry = deltaMap.get(m);
      if (!entry) return;
      const aWon = m.scoreA > m.scoreB;
      const record = (p, won, opponent, mine, theirs) => {
        if (!(p in totals)) {
          totals[p] = 0;
          played[p] = 0;
          history[p] = [];
          peaks[p] = -Infinity;
          lows[p] = Infinity;
        }
        const d = entry.playerDeltas[p];
        totals[p] += d;
        played[p]++;
        const score = (scale * totals[p]) / (played[p] + EP_SHRINKAGE);
        history[p].push({ date: m.date, elo: score, delta: d, won, opponent, scoreA: mine, scoreB: theirs });
        if (score > peaks[p]) peaks[p] = score;
        if (score < lows[p]) lows[p] = score;
      };
      (m.teamA || []).forEach((p) => record(p, aWon, (m.teamB || []).join(" & "), m.scoreA, m.scoreB));
      (m.teamB || []).forEach((p) => record(p, !aWon, (m.teamA || []).join(" & "), m.scoreB, m.scoreA));
    });
  return { history, peaks, lows };
}

export const rating = {
  system: () => _system,
  label: (s = _system) => SCORING_SYSTEM_LABELS[s],
  isZeroBased: (s = _system) => SCORING_SYSTEMS_ZERO_BASED.includes(s),
  hasConfidence: (s = _system) => SCORING_SYSTEMS_WITH_CONFIDENCE.includes(s),
  // Header text for the extra numeric column.
  confLabel: (s = _system) =>
    s === "glicko2" ? "±RD" : s === "openskill" ? "±3σ" : SCORING_SYSTEMS_POINTS.includes(s) ? "TOTAL" : s === "league" ? "PTS" : "",
  // Stand-in for a player missing from the map: the baseline for 1000-centred
  // engines, zero for 0-based ones (where 1000 would sort an unrated player top).
  def: (s = _system) => (SCORING_SYSTEMS_ZERO_BASED.includes(s) ? 0 : 1000),
  // Underdog margin for badge thresholds, on the system's own scale.
  underdogGap: (s = _system) =>
    s === "league" ? 10 : isMatchup(s) ? 2 * FAIR_SCALE : SCORING_SYSTEMS_ZERO_BASED.includes(s) ? 2 * EP_SCALE : 30,
  srFn: (ratingMap, s = _system) =>
    SCORING_SYSTEMS_ZERO_BASED.includes(s) ? minMaxSrFn(ratingMap) : ratingToSr,
  // name -> scale-free strength (unrounded 0-10 SR band). For heuristics that
  // compare or threshold ratings ("beat tougher opponents", "above-average
  // opposition"): written in SR units they mean the same on every system, and
  // an unrated player reads as the baseline rather than 0 or 1000.
  strength(ratingMap, s = _system) {
    const def = rating.def(s);
    const toSr = SCORING_SYSTEMS_ZERO_BASED.includes(s)
      ? minMaxSrFn(ratingMap, false)
      : (r) => (r - 700) / 60;
    return (name) => toSr(ratingMap?.[name] ?? def);
  },
  ladder: (s = _system) =>
    s === "league" ? LADDERS.league : SCORING_SYSTEMS_ZERO_BASED.includes(s) ? LADDERS.zeroBased : LADDERS.classic,

  // Raw per-system detail ({r,rd}/{mu,sigma}/{ep,games,score}/null) — one
  // engine walk yields both the flat rating and the confidence column.
  full(matches, s = _system) {
    if (s === "glicko2") return computeGlicko2Full(matches);
    if (s === "openskill") return computeOpenSkillFull(matches);
    if (s === "ep") return computeEPFull(matches, careerMatches());
    if (isMatchup(s)) return fairFull(matches, s);
    if (s === "league") return computeLeagueFull(matches);
    return null;
  },
  flat(matches, full, s = _system) {
    const pick = (key) => {
      const out = {};
      Object.keys(full).forEach((n) => (out[n] = full[n][key]));
      return out;
    };
    if (s === "glicko2") return pick("r");
    if (s === "openskill") return pick("mu");
    if (s === "ep" || isMatchup(s) || s === "league") return pick("score");
    return computeFairShare(matches);
  },
  map(matches, s = _system) {
    const sig = _mapSig(matches, s);
    let bySys = _mapCache.get(matches);
    if (!bySys) _mapCache.set(matches, (bySys = {}));
    const hit = bySys[s];
    if (hit && _sameSig(hit.sig, sig)) return { ...hit.map };
    const map = rating.flat(matches, rating.full(matches, s), s);
    bySys[s] = { sig, map };
    return { ...map };
  },
  // Per-player stats (record, SR, rank order) off a rating map. SR is scaled
  // with the SAME system's band, so a 0-based map can't be read as 1000-centred.
  stats(matches, ratingMap = rating.map(matches), s = _system) {
    return computeStats(matches, ratingMap, rating.srFn(ratingMap, s));
  },
  // The "±" / TOTAL column: RD for Glicko-2, ±3σ for OpenSkill, raw points for EP.
  conf(full, s = _system) {
    if (!full) return null;
    const out = {};
    if (s === "glicko2") Object.keys(full).forEach((n) => (out[n] = Math.round(full[n].rd)));
    else if (s === "openskill")
      Object.keys(full).forEach((n) => (out[n] = Math.round(3 * full[n].sigma)));
    else if (SCORING_SYSTEMS_POINTS.includes(s) || s === "league") Object.keys(full).forEach((n) => (out[n] = full[n].ep));
    return out;
  },
  // EP only: the scoring detail of one match, priced inside the season it was
  // played in — { dA, dB, playerDeltas (raw points), expA (win chance),
  // breakdown (how each award was built) } — or null for the other systems.
  // FAIR ASS: { playerDeltas, dA, dB, matchup } — and, for a match scored as
  // ASS because a newcomer is in it, ASS's own expA / breakdown as well.
  entry(m, s = _system) {
    if (!SCORING_SYSTEMS_POINTS.includes(s)) return null;
    const key = `${s}`;
    if (!_entryCache.has(m)) _entryCache.set(m, {});
    const bySys = _entryCache.get(m);
    if (!(key in bySys))
      bySys[key] =
        (isMatchup(s) ? fairDeltas(scopeFor(m), s) : computeMatchEPDeltas(scopeFor(m), careerMatches())).get(m) ||
        null;
    return bySys[key];
  },
  // EP only: running total points per player over a window ({} -> null elsewhere).
  totals(matches, s = _system) {
    if (!SCORING_SYSTEMS_POINTS.includes(s)) return null;
    const full = isMatchup(s) ? fairFull(matches, s) : computeEPFull(matches, careerMatches());
    const out = {};
    Object.keys(full).forEach((n) => (out[n] = full[n].ep));
    return out;
  },
  // Per-match { playerDeltas } map. `opts.blindElo` (EP only) restarts the
  // expectation level for a "fresh session" view while keeping career counts.
  deltas(matches, s = _system, opts = {}) {
    if (s === "glicko2") return computeMatchGlicko2Deltas(matches);
    if (s === "openskill") return computeMatchOpenSkillDeltas(matches);
    if (s === "fairshare") return computeMatchFairShareDeltas(matches);
    if (isMatchup(s)) return fairDeltas(matches, s);
    if (s === "league") return computeMatchLeagueDeltas(matches);
    return computeMatchEPDeltas(matches, careerMatches(), opts);
  },
  timeline(matches, s = _system) {
    if (s === "ep") return computeEPTimeline(matches, careerMatches());
    if (isMatchup(s)) return pointsTimeline(matches, fairDeltas(matches, s), FAIR_SCALE);
    return timelineFromDeltas(matches, rating.deltas(matches, s), rating.def(s));
  },
  // EP "fresh session" snapshot: expectation restarts level, career counts stay.
  fresh(matches, s = _system) {
    if (s !== "ep") return rating.map(matches, s);
    const full = computeEPFull(matches, careerMatches(), { blindElo: true });
    return rating.flat(matches, full, "ep");
  },
  // EP only (null elsewhere, which have no per-match temporal model): matches
  // where the weaker side won, priced by the same walk that scores every match.
  upsets(matches, s = _system) {
    return s === "ep" ? computeEPUpsets(matches, careerMatches()) : null;
  },
  // EP only: per-player projection of where recent form would take the score.
  projection(matches, formN, futureM, s = _system) {
    return s === "ep"
      ? computeEPProjection(matches, careerMatches(), formN, futureM)
      : null;
  },
  // ASS only: career games (all seasons) a player still needs before a loss
  // starts to cost — the newcomer rule. 0 for a veteran; null on the other
  // systems, which have no such rule.
  gamesUntilVeteran(name, s = _system) {
    if (!SCORING_SYSTEMS_POINTS.includes(s)) return null;
    return Math.max(0, MATURITY_GAMES - (careerGameCounts()[name] || 0));
  },
  maturityGames: () => MATURITY_GAMES,
  // What a match about to be played is worth to each of its players on the
  // active system: the change to their leaderboard number — and on ASS the
  // points it pays — if their side wins and if it loses, for the given score.
  // Priced exactly the way saving it would price it: appended to the rated
  // matches of the season its date falls in. { rated: false } when a guest or
  // an excluded player is in it (it wouldn't count for anyone).
  atStake(teamA, teamB, { date, winScore = 4, loseScore = 2 } = {}, s = _system) {
    const probe = { date, teamA, teamB, scoreA: winScore, scoreB: loseScore };
    if (!isRatedMatch(probe)) return { rated: false };
    const scope = scopeFor(probe);
    const before = rating.full(scope, s);
    const beforeMap = rating.flat(scope, before, s);
    const priced = (m) => {
      const walk = [...scope, m];
      const full = rating.full(walk, s);
      return { full, map: rating.flat(walk, full, s) };
    };
    const aWins = priced(probe);
    const bWins = priced({ ...probe, scoreA: loseScore, scoreB: winScore });
    const def = rating.def(s);
    const line = (p, res) => ({
      change: (res.map[p] ?? def) - (beforeMap[p] ?? def),
      pts: SCORING_SYSTEMS_POINTS.includes(s) ? (res.full[p]?.ep ?? 0) - (before?.[p]?.ep ?? 0) : null,
    });
    const players = {};
    teamA.forEach((p) => (players[p] = { now: beforeMap[p] ?? def, win: line(p, aWins), loss: line(p, bWins) }));
    teamB.forEach((p) => (players[p] = { now: beforeMap[p] ?? def, win: line(p, bWins), loss: line(p, aWins) }));
    return { rated: true, winScore, loseScore, players };
  },
  // EP only: the leaderboard score a running points total over `games` games
  // would produce (what the board prints), for what-if projections.
  scoreFor(total, games, s = _system) {
    return ((isMatchup(s) ? FAIR_SCALE : EP_SCALE) * total) / (games + EP_SHRINKAGE);
  },
  // Numeric rounding to the precision the system prints with (whole numbers,
  // or 2 decimals for the 0-based score).
  round(v, s = _system) {
    return SCORING_SYSTEMS_ZERO_BASED.includes(s)
      ? Math.round(v * 100) / 100
      : Math.round(v);
  },
  // Printed form of a rating OR a rating change.
  fmt(v, s = _system) {
    if (v == null || !Number.isFinite(v)) return "—";
    return SCORING_SYSTEMS_ZERO_BASED.includes(s) ? v.toFixed(2) : String(Math.round(v));
  },
};
