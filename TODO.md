# Padel Tracker — Feature Roadmap & Enhancements

> Scope: skip Season, Scheduled Sessions, and Tournament features.
> Generated from codebase scan: `app.js` (13,886 lines · 200+ functions), `styles.css` (12,797 lines), `index.html` (980 lines).

---

## A. Leaderboard Replay — Granular Controls (priority request)

Current state ([app.js:10736-10832](app.js#L10736-L10832)): only **▶ PLAY / ↺ RESET / range slider** with fixed 400ms speed.

### Proposed control bar
```
⏮ FAST BACK   ◀ STEP   ▶/⏸ PLAY   STEP ▶   FAST FWD ⏭     [speed: 0.5x · 1x · 2x · 4x]    ↺ RESET
   -10          -1                    +1       +10
```

### Additional enhancements
- [ ] **Jump-to-date** picker (skip to a specific calendar day)
- [ ] **Jump-to-match-N** number input
- [ ] **Milestone markers** on the slider — small dots where someone became #1, hit 100 matches, biggest upset, etc.
- [ ] **Highlight the delta** — on each step, briefly flash ↑/↓ next to players whose rank changed, with ELO delta number
- [ ] **Per-match caption** under the board ("Match 47: Ankit/Sachin def. Ojo/Mahi 6-3 · Ankit +14 ELO")
- [ ] **Reverse playback** (play backwards through history)
- [ ] **Loop** toggle (auto-restart on reach end)
- [ ] **Spotlight a player** — dim everyone else, fat-line the chosen player's bar across all replay frames
- [ ] **Compare mode** — pin a second leaderboard state (e.g. "3 months ago") side-by-side with the live replay

---

## B. NEW FEATURES — high impact, low scope

1. [ ] **AI Coach Insights** — auto-detected sentence cards on player page:
   - "You win 81% when Sachin is your partner vs 52% otherwise"
   - "You've never lost to Ojo when ELO gap > 50"
   - "Your win rate drops 23% in matches after 8pm"
2. [ ] **Match MVP voting** — one tap after each match to nominate an MVP; aggregated into a "MVP %" stat on each player card
3. [ ] **Match tags** — quick chips: `#night` `#revenge` `#injury-return` `#rain-stopped` — filter History by tag
4. [ ] **Match notes** — free-text per-match field (no current notes field; useful for "wrist sore", "Sachin's birthday match")
5. [ ] **Time-of-day analytics** — capture match time, render a 24h clock heatmap per player
6. [ ] **Court / surface selector** — chip on add-match, then `winRate by court` widget
7. [ ] **Personal Bests page** — auto-tracked records per player: longest streak, biggest win margin, highest ELO peak, fastest 10 wins, most matches in a day. Each tile is shareable.
8. [ ] **Match Prediction game** — *before* a match is logged, anyone in the group can predict the score; later, "Prediction accuracy leaderboard" pops out
9. [ ] **Rivalry Hall of Fame** — pinned top-5 most-played rivalries with mini scoreboard, total games, last result
10. [ ] **ELO Tier badges** — Bronze/Silver/Gold/Platinum/Diamond/Master ring around player avatars based on ELO breakpoints
11. [ ] **Daily Quest** — one random daily challenge ("Win a match without dropping more than 2 games", "Beat your highest-ELO opponent today"). Awards XP.
12. [ ] **Smart challenge prompts** on Home — "Ankit & Ojo haven't played in 17 days. Setup a match?" using existing absence/H2H logic
13. [ ] **Player nicknames/flair** — 1-line tagline ("The Wall", "Smash King"); shown under name on detail page and share posters
14. [ ] **Compatibility recommender** — given a player, recommend the best partner they haven't played with much yet (chemistry score + sample size)
15. [ ] **Voice tag per match** — record 5-sec audio clip (`MediaRecorder` API) stored as base64; plays on long-press of match card
16. [ ] **Photo attachment** — attach one photo per match (compressed); used on match poster share
17. [ ] **Player avatar upload** — replace initials circle with cropped photo across the app
18. [ ] **Global search** (Cmd-K-style overlay) — search players, matches by score, achievements, badges, dates
19. [ ] **Filter presets** — save current History filter combo as a named preset
20. [ ] **Onboarding tour** — first-launch animated 4-step walkthrough (Add → History → Stats → Live)
21. [ ] **Confetti + haptics** on milestones (50/100/250 matches, first win, biggest upset)
22. [ ] **Theme picker** — premade theme presets (Royal Blue, Crimson Red, Forest Green, Cyberpunk, Mono). Optional auto-switch by month.
23. [ ] **Streak Calendar** — GitHub-style contribution heatmap per player showing match days; tap a square for that day's matches
24. [ ] **Player Card 3D flip share** — generated share image: front = stats, back = signature win (canvas)
25. [ ] **What-If ELO++** — "Reset everyone to 1000 and replay all matches" global toggle

---

## C. ENHANCEMENTS to existing features

### Live Scoring ([openLiveMode](app.js#L13306))
- [ ] Haptic vibration + sound on score change
- [ ] "MATCH POINT" / "GAME POINT" indicator banner
- [ ] Auto-detect end of match (first to 6 with 2-game lead) and prompt to save
- [ ] Per-game scoring (track 6-3, 6-4 separately instead of one combined number)
- [ ] Generate a post-match share card directly from Live mode

### Match Intro popup ([openMatchIntro](app.js#L13550))
- [ ] "Skip animation" / fast-forward button
- [ ] "Share intro" — share the whole H2H+PVP intro card as image
- [ ] Tap any stat → drill-down to source matches

### Story Feed ([_buildStoryFeedHtml](app.js#L10671))
- [ ] Filter chips: Upsets · Comebacks · Milestones · Streaks
- [ ] Share single story as image
- [ ] "This day in history" — auto-pin story from same day last year

### Power Rankings ([_buildPowerRankingsHtml](app.js#L10413))
- [ ] Movement arrows (up 2 / down 1) vs last week (uses existing weekly snaps)
- [ ] Tap player → mini sparkline of rank over last 8 weeks

### Chemistry Leaderboard ([_buildChemistryLeaderboardHtml](app.js#L10449))
- [ ] "Anti-Chemistry" section — worst-performing pairs (banter material)

### Match Prediction ([_buildMatchPredictHtml](app.js#L10498), [runMatchPrediction](app.js#L10572))
- [ ] Calibration tracking: "Your predictions are 67% accurate"
- [ ] Save predictions and show win/loss vs actual

### ELO Timeline ([buildEloTimelineHtml](app.js#L9927))
- [ ] Pinch-zoom range
- [ ] Annotate peaks/troughs ("biggest jump", "longest plateau")
- [ ] Overlay 2 players for direct comparison

### History page ([renderModernMatches](app.js#L3931))
- [ ] Pull-to-refresh
- [ ] Long-press match → quick actions sheet (share, copy, edit, delete)
- [ ] Bookmark filter presets (see B-19)
- [ ] "Jump to date" button

### Achievements ([getAchievements](app.js#L2223), [computeAchievements](app.js#L9557))
- [ ] Progress bars on in-progress ones ("47/50 matches")
- [ ] Share unlocked achievement as image

### Match cards ([buildMatchCards](app.js#L3271))
- [ ] Long-press → quick action sheet
- [ ] Group consecutive same-day matches into expandable "Session" cards

### H2H Matrix ([buildH2HMatrix](app.js#L7528))
- [ ] Sort options: by total games, by win rate, by recency
- [ ] Tap row to highlight matchups for that player

### Form Sparkline ([getFormSparkline](app.js#L2719))
- [ ] Tappable → inline expansion of last N matches with mini scores

### Pair Detail ([openPairDetail](app.js#L7173))
- [ ] Predicted record vs every other pair (uses existing chemistry math)

### Weekly Digest ([openWeeklyDigest](app.js#L6821))
- [ ] Audio voiceover mode (Web Speech API)
- [ ] PDF export

### Settings / Manage
- [ ] Bulk-merge duplicate names wizard
- [ ] Data-integrity report (orphan names, duplicate matches detection)
- [ ] Cloud backup history (last 30 daily snapshots)

### Global UX
- [ ] Pull-to-refresh on Home/History
- [ ] Skeleton loaders while Firestore loads
- [ ] Extend undo to: name edits, match edits, filter clears
- [ ] Empty-state illustrations on first-launch screens

---

## D. Quick wins (each small, together transformative)

- [ ] **Search bar** in hamburger menu
- [ ] **"Recent" carousel** on home — last 5 matches at a glance
- [ ] **Match emoji reactions** — tap to react, count shows on card
- [ ] **Copy match as text** — generates `"Ankit/Sachin def. Ojo/Mahi 6-3 (12/05/26)"` for WhatsApp paste
- [ ] **`?date=2026-05-21` URL deep link** — opens History pre-filtered to that day
- [ ] **Animated number counters** everywhere stats change (extend `_animEloCounts` pattern)
- [ ] **Birthday/anniversary toasts** — "1 year since your first match!"

---

_Status: drafted, awaiting review. Nothing implemented yet._
