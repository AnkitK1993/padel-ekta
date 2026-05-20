# Ekta Padel — Feature Roadmap

> Auto-updated as features ship. ✅ = done · 🔄 = in progress · ⬜ = pending

---

## Phase 1 — Player Intelligence

### 1A. Dynamic Player Form Engine
- ✅ Last-10 form score (weighted win %, margin, opponent ELO) → `/10` rating
- ✅ Momentum indicator (ELO delta: last 5 vs previous 5) → Rising / Falling / Stable
- ✅ Pressure rating (close-match win % where score diff ≤ 2)
- ✅ Confidence score composite
- ✅ Display as form widget on player detail card: `🔥 FORM 8.7/10 · ⚡ MOMENTUM Rising +12%`

### 1B. Play Style Archetypes
- ✅ Auto-assign label per player: Clutch Player / Finisher / Giant Slayer / Consistent / Streaky / Aggressor / Balanced
- ✅ Derive from: close-match %, win margin avg, streak volatility, win quality
- ✅ Show as styled card on player detail modal

### 1C. Radar Chart on Player Profile
- ✅ 6-axis SVG radar: Win Rate · ELO · Clutch · Form · Activity · Margin
- ✅ Embedded in player detail modal

---

## Phase 2 — Team & Match Intelligence

### 2A. Partnership Chemistry Score
- ✅ Composite 0–10 score per pair: win % + avg margin + vs-strong-opponents + activity
- ✅ Tier labels: S / A / B / C
- ✅ Chemistry Leaderboard card in Analytics → Pairs

### 2B. Match Prediction Card
- ✅ Pre-match predictor: pick Team A (P1 + P2) vs Team B (P1 + P2)
- ✅ Win probability (ELO-based team avg)
- ✅ H2H record between the exact teams
- ✅ Expected score (derived from historical matches)
- ✅ Chemistry rating per team
- ✅ Upset alert when ELO underdog has a real chance
- ✅ FAB slot buttons for all 4 player picks

### 2C. Smart Power Rankings
- ✅ Composite score: ELO × 0.4 + form × 0.3 + win quality × 0.2 + activity × 0.1
- ✅ Visual bar chart leaderboard in Analytics → Players

---

## Phase 3 — Narrative & Stories

### 3A. Match Story Cards / Narrative Feed
- ✅ Auto-detect: upsets, ELO milestones (1050/1100/1150/1200/1250), shutouts, all-time win streaks
- ✅ Scrollable story feed card in Analytics → Records

### 3B. Achievements / Badge System
- ✅ 13 achievements: Ice Cold · King Slayer · Untouchable · Wall · Sharpshooter · On Fire · Diamond · Chemistry Lab · Climber · Comeback Kid · Upset Artist · Regular · Season MVP
- ✅ Unlocked badges shown bright, locked shown greyed-out with progress
- ✅ Shown in player detail modal with unlock count

---

## Phase 4 — Visual & Animated Features

### 4A. Animated Leaderboard Replay
- ✅ Timeline slider (match 5 → N)
- ✅ ELO bar chart animates as slider moves
- ✅ Auto-play button (▶ PLAY / ⏸ PAUSE) at 400ms per match
- ✅ Reset button
- ✅ Lives in Analytics → Players

### 4B. Season Mode
- ✅ Auto-groups by calendar month
- ✅ Season card per month (collapsible)
- ✅ Awards: MVP · Top Pair · Iron Man
- ✅ Top-5 standings per month

### 4C. Rivalry Screen
- ✅ Tap any H2H matrix cell → full-screen rivalry card: animated VS, win record, streaks, last 5 results, greatest match

### 4D. Shareable Match Poster Upgrade
- ✅ Share button on every match card → poster with score, both teams, ELO changes per player

---

## Phase 5 — Live Match Enhancements

### 5A. Live Win Probability Meter
- ✅ Real-time win probability bar in live scoring (ELO-based + score tilt)
- ✅ Shows after all 4 players are selected; updates on every point

### 5B. Live Momentum Graph
- ✅ Point-by-point SVG swing chart during live match
- ✅ Tracks each scored point; redraws live with color-coded advantage line

---

## Status Summary

| Phase | Features | Done |
|-------|----------|------|
| 1 — Player Intelligence | 8 | 8 ✅ |
| 2 — Team & Match Intelligence | 8 | 8 ✅ |
| 3 — Narrative & Stories | 20 | 20 ✅ |
| 4 — Visual & Animated | 12 | 12 ✅ |
| 5 — Live Enhancements | 4 | 4 ✅ |
| **Total** | **52** | **52 done · 0 pending** |

---

*Last updated: 2026-05-21 — all 52 features complete*
