# Ekta Padel — Feature Roadmap

> Auto-updated as features ship. ✅ = done · 🔄 = in progress · ⬜ = pending

---

## Phase 1 — Player Intelligence

### 1A. Dynamic Player Form Engine
- ⬜ Last-10 form score (weighted win %, margin, opponent ELO) → `/10` rating
- ⬜ Momentum indicator (ELO delta: last 5 vs previous 5) → Rising / Falling / Stable
- ⬜ Pressure rating (close-match win % where score diff ≤ 2)
- ⬜ Confidence score composite
- ⬜ Display as form widget on player detail card: `🔥 FORM 8.7/10 · ⚡ MOMENTUM Rising +12%`

### 1B. Play Style Archetypes
- ⬜ Auto-assign label per player: Clutch Player / Finisher / Aggressor / Consistent / Streaky
- ⬜ Derive from: close-match %, win margin avg, streak volatility
- ⬜ Show as badge on player cards and detail modal

### 1C. Radar Chart on Player Profile
- ⬜ 6-axis SVG radar: Win Rate · Clutch · Form · ELO · Consistency · Activity
- ⬜ Embed in player detail modal alongside ELO timeline

---

## Phase 2 — Team & Match Intelligence

### 2A. Partnership Chemistry Score
- ⬜ Composite 0–10 score per pair: win % + avg margin + consistency + vs-strong-opponents
- ⬜ Tier labels: S / A / B / C
- ⬜ Chemistry leaderboard card in Analytics → Pairs

### 2B. Match Prediction Card
- ⬜ Pre-match predictor: pick Team A vs Team B
- ⬜ Win probability (ELO-based team avg)
- ⬜ Expected score (historical avg margin)
- ⬜ Chemistry rating per team (S / A / B tier)
- ⬜ Upset alert when ELO underdog has hot recent form
- ⬜ Replace / sit alongside existing Match Simulator

### 2C. Smart Power Rankings
- ⬜ Composite score: ELO × 0.4 + form × 0.3 + win quality × 0.2 + activity × 0.1
- ⬜ Separate leaderboard card alongside pure ELO

---

## Phase 3 — Narrative & Stories

### 3A. Match Story Cards / Narrative Feed
- ⬜ Auto-detect story events after each match:
  - Streak ended ("Rahul G ended Sachin's 5-match streak")
  - ELO milestone crossed (1100 / 1150 / 1200)
  - Biggest upset of the month
  - First-ever win between two players
  - Comeback win (lost first half, won overall)
  - Best pair chemistry match
- ⬜ Scrollable "story feed" card in Analytics

### 3B. Achievements / Badge System
- ⬜ Define 15+ achievements:
  - 🧊 Ice Cold — win 5 close games (≤2 pt diff)
  - 👑 King Slayer — beat the #1 ranked player
  - ⚡ Untouchable — 10-win streak
  - 🛡 Wall — concede ≤10 pts in a match
  - 🎯 Sharpshooter — 80%+ win rate (min 10 matches)
  - 🔥 On Fire — win 5 in a row
  - 💎 Diamond — reach ELO 1200
  - 🏆 Champion — finish #1 in a season
  - 🤝 Chemistry Lab — 10 wins with same partner
  - ⬆️ Climber — rise 5+ ranks in a month
  - 😤 Comeback Kid — win 3 matches from losing position
  - 🎲 Upset Artist — beat 3 higher-ELO opponents in a row
  - 📅 Regular — play every week for 4 weeks
  - 🌙 Night Owl — (placeholder for session-time tracking)
  - 🥇 Season MVP — top stats in a season
- ⬜ Show unlocked badges on player detail modal
- ⬜ Show locked badges greyed out

---

## Phase 4 — Visual & Animated Features

### 4A. Animated Leaderboard Replay
- ⬜ Timeline slider (match index 0 → N)
- ⬜ Rankings animate as slider moves
- ⬜ "Play" button for auto-playback
- ⬜ Lives in Analytics → Players

### 4B. Season Mode
- ⬜ Define seasons by date range (auto-detect gaps or manual)
- ⬜ Season standings card
- ⬜ Auto-compute season awards: MVP · Top Pair · Most Improved · Iron Man
- ⬜ Season archive in localStorage

### 4C. Rivalry Screen
- ⬜ Tap any H2H entry → full-screen rivalry card
- ⬜ Animated VS header with player colors
- ⬜ Head-to-head record · win trend · longest streaks · last 5 results
- ⬜ "Greatest match" highlight (closest score)

### 4D. Shareable Match Poster Upgrade
- ⬜ Match result poster (winner, score, ELO changes)
- ⬜ MVP card (top performer of session)
- ⬜ Rivalry graphic (two players, H2H record)
- ⬜ Extends existing share-card system

---

## Phase 5 — Live Match Enhancements

### 5A. Live Win Probability Meter
- ⬜ Real-time probability bar based on current score + pre-match ELO
- ⬜ Updates as points are entered in live mode

### 5B. Live Momentum Graph
- ⬜ Point-by-point swing chart during live match
- ⬜ Color-coded runs (team A vs team B)

---

## Status Summary

| Phase | Features | Done |
|-------|----------|------|
| 1 — Player Intelligence | 8 | 0 |
| 2 — Team & Match Intelligence | 8 | 0 |
| 3 — Narrative & Stories | 20 | 0 |
| 4 — Visual & Animated | 12 | 0 |
| 5 — Live Enhancements | 4 | 0 |
| **Total** | **52** | **0** |

---

*Last updated: 2026-05-20*
