# Padel Tracker — Feature Roadmap & Enhancements

> Scope: skip Season, Scheduled Sessions, and Tournament features.
> Generated from codebase scan: `app.js` (13,886 lines · 200+ functions), `styles.css` (12,797 lines), `index.html` (980 lines).

---

## A. Leaderboard Replay — Granular Controls (priority request)

Current state: full enhanced control bar shipped.

### Proposed control bar

```
⏮ FAST BACK   ◀ STEP   ▶/⏸ PLAY   STEP ▶   FAST FWD ⏭     [speed: 0.5x · 1x · 2x · 4x]    ↺ RESET
   -10          -1                    +1       +10
```

### Additional enhancements

- [x] **Jump-to-date** picker (skip to a specific calendar day)
- [x] **Jump-to-match-N** number input
- [x] **Milestone markers** on the slider — small dots where someone became #1, hit 100 matches, biggest upset, etc.
- [x] **Highlight the delta** — on each step, briefly flash ↑/↓ next to players whose rank changed, with ELO delta number
- [x] **Per-match caption** under the board ("Match 47: Ankit/Sachin def. Ojo/Mahi 6-3 · Ankit +14 ELO")
- [x] **Reverse playback** (play backwards through history)
- [x] **Loop** toggle (auto-restart on reach end)
- [x] **Spotlight a player** — dim everyone else, fat-line the chosen player's bar across all replay frames
- [ ] **Compare mode** — pin a second leaderboard state (e.g. "3 months ago") side-by-side with the live replay

---

## B. NEW FEATURES — high impact, low scope

4. [ ] **Match notes** — free-text per-match field (no current notes field; useful for "wrist sore", "Sachin's birthday match")
5. [x] **Personal Bests page** — auto-tracked records per player: longest streak, biggest win margin, highest ELO peak, fastest 10 wins, most matches in a day. Each tile is shareable.
6. [x] **Rivalry Hall of Fame** — pinned top-5 most-played rivalries with mini scoreboard, total games, last result
7. [x] **ELO Tier badges** — Bronze/Silver/Gold/Platinum/Diamond/Master ring around player avatars based on ELO breakpoints
8. [ ] **Player nicknames/flair** — 1-line tagline ("The Wall", "Smash King"); shown under name on detail page and share posters
9. [ ] **Compatibility recommender** — given a player, recommend the best partner they haven't played with much yet (chemistry score + sample size)
10. [x] **Global search** (Cmd-K-style overlay) — search players, matches by score, achievements, badges, dates
11. [ ] **Filter presets** — save current History filter combo as a named preset
12. [ ] **Onboarding tour** — first-launch animated 4-step walkthrough (Add → History → Stats → Live)
13. [x] **Confetti + haptics** on milestones (50/100/250 matches, first win, biggest upset)
14. [x] **Theme picker** — premade theme presets (Royal Blue, Crimson Red, Forest Green, Cyberpunk, Mono). Optional auto-switch by month.
15. [x] **Streak Calendar** — GitHub-style contribution heatmap per player showing match days; tap a square for that day's matches
16. [ ] **Player Card 3D flip share** — generated share image: front = stats, back = signature win (canvas)
17. [ ] **What-If ELO++** — "Reset everyone to 1000 and replay all matches" global toggle (effectively covered by Leaderboard Replay)

---

## C. ENHANCEMENTS to existing features

### Live Scoring ([openLiveMode](app.js#L13306))

- [x] Implement Lawn Tennis Style scoring. Ask whether match is a Race to 4 or Race to 6, default it to 4. If race to 4, No difference of 2. If Race to 6 then difference of 2 or tie breaker.
- [x] Add game score incrementer as well, tapping on red team side should add values like 15,30, 40. Same to applied on Blue team side. 40 - 40 should be deuce, Then Advantage and game.
- [x] Haptic vibration + sound on score change
- [x] "MATCH POINT" / "GAME POINT" indicator banner
- [x] Auto-detect end of match (first to 6 with 2-game lead) and prompt to save
- [ ] Per-game scoring (track 6-3, 6-4 separately instead of one combined number)
- [ ] Generate a post-match share card directly from Live mode

### Match Intro popup ([openMatchIntro](app.js#L13550))

- [x] "Skip animation" / fast-forward button
- [ ] "Share intro" — share the whole H2H+PVP intro card as image
- [ ] Tap any stat → drill-down to source matches

### Story Feed ([\_buildStoryFeedHtml](app.js#L10671))

- [x] Filter chips: Upsets · Comebacks · Milestones · Streaks
- [ ] Share single story as image
- [ ] "This day in history" — auto-pin story from same day last year

### Power Rankings ([\_buildPowerRankingsHtml](app.js#L10413))

- [x] Movement arrows (up 2 / down 1) vs last week (uses existing weekly snaps)
- [ ] Tap player → mini sparkline of rank over last 8 weeks

### Chemistry Leaderboard ([\_buildChemistryLeaderboardHtml](app.js#L10449))

- [x] "Anti-Chemistry" section — worst-performing pairs (banter material)

### Match Prediction ([\_buildMatchPredictHtml](app.js#L10498), [runMatchPrediction](app.js#L10572))

- [ ] Calibration tracking: "Your predictions are 67% accurate"
- [ ] Save predictions and show win/loss vs actual

### ELO Timeline ([buildEloTimelineHtml](app.js#L9927))

- [ ] Pinch-zoom range (existing 7 date-range pills cover this cleanly)
- [x] Annotate peaks/troughs ("biggest jump", "longest plateau")
- [x] Overlay 2 players for direct comparison

### History page ([renderModernMatches](app.js#L3931))

- [x] Pull-to-refresh
- [ ] Long-press match → quick actions sheet (share, copy, edit, delete)
- [ ] Bookmark filter presets (see B-19)
- [ ] "Jump to date" button

### Achievements ([getAchievements](app.js#L2223), [computeAchievements](app.js#L9557))

- [x] Progress bars on in-progress ones ("47/50 matches")
- [ ] Share unlocked achievement as image

### Match cards ([buildMatchCards](app.js#L3271))

- [ ] Long-press → quick action sheet
- [ ] Group consecutive same-day matches into expandable "Session" cards

### H2H Matrix ([buildH2HMatrix](app.js#L7528))

- [x] Sort options: by total games, by win rate, by recency (matches / win% / name pills)
- [ ] Tap row to highlight matchups for that player

### Form Sparkline ([getFormSparkline](app.js#L2719))

- [ ] Tappable → inline expansion of last N matches with mini scores

### Pair Detail ([openPairDetail](app.js#L7173))

- [ ] Predicted record vs every other pair (uses existing chemistry math)

### Global UX

- [x] Pull-to-refresh on Home/History (also on Summary)
- [ ] Skeleton loaders while Firestore loads (splash already covers it; PTR re-render is instant from cache)
- [ ] Extend undo to: name edits, match edits, filter clears
- [ ] Empty-state illustrations on first-launch screens

---

## D. Quick wins (each small, together transformative)

- [x] **Search bar** in hamburger menu
- [ ] **"Recent" carousel** on home — last 5 matches at a glance
- [ ] **Match emoji reactions** — tap to react, count shows on card
- [ ] **Animated number counters** everywhere stats change (extend `_animEloCounts` pattern)
- [x] **Birthday/anniversary toasts** — "1 year since your first match!"

---

## Status

**Done so far:** 30 items across A/B/C/D shipped over 14 commits.
**Bonus:** along the way, fixed `applyAnalyticsAnimations` ReferenceError, live-mode notes data-loss bug, momentum-graph desync bug, and removed ~80 lines of dead code (see commits `03beb81` and `ecd98ae`).

**Recent batch (this session):**
- Confetti canvas helper + haptics on milestones (B-13)
- Theme Picker overlay with 11 themes including the 5 new ones (B-14)
- GitHub-style Activity Calendar on every player detail (B-15)
- Achievement progress bars (wired computeAchievements that was unused)
- H2H matrix MATCHES / WIN % / NAME sort pills
- Pull-to-refresh on Home / Summary / History
- ELO Timeline peak ▲ / trough ▼ annotations + 2-player overlay compare
