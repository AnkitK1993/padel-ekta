# Padel Tracker — Feature & Enhancement Backlog

---

## 1. STATISTICS PAGE — Enhancements to Existing Sections

### 1a. Player Stats Table (main leaderboard section)

- [ ] Add **Avg Games Scored** column — total games scored ÷ matches played
- [ ] Add **Shutout Rate** column — % of wins that were clean-sheet (opponent scored 0)
- [ ] Add **Partner Diversity** column — count of unique partners played with
- [ ] Add **Avg Margin** column — average winning/losing margin per match (signed)

### 1b. Partnerships Table

- [ ] Show **top 10 pairs** (currently shows only the best pair as a callout)
- [ ] Add **current win streak** per pair
- [ ] Add **"Against Quality"** column — average ELO of opponents they've faced together
- [ ] Add **total games played together** alongside win/loss count

### 1c. Monthly Stats

- [ ] Add **"Player of the Month"** callout per month (highest win rate, min 5 matches)
- [ ] Add **trend arrow** next to each player (↑ improving / ↓ declining vs previous month)
- [ ] Colour-code cells by win rate (dark green ≥ 70%, amber 40–69%, red < 40%)

### 1d. Score Distribution

- [ ] Add **most common winning score** callout ("4-2 is the most common result")
- [ ] Add **average margin** stat
- [ ] Replace plain list with a **horizontal bar chart** showing relative frequencies

### 1e. Clutch Performance Table

- [ ] Add **"Anti-Clutch"** bottom section — worst performers in close matches
- [ ] Show explicit **close-match W–L record** alongside the %, not just %
- [ ] Add a minimum-match filter control (currently hard-coded at ≥ 3)

### 1f. H2H Matrix

- [ ] **Colour-code cells** by win rate — green > 60%, red < 40%, neutral 40–60%
- [ ] **Tap a row** to highlight all cells in that row (dim others)
- [ ] Show **total matches** in each cell as a subscript alongside the W–L

### 1g. Form Table (last 10 matches per player)

- [ ] Add a **trend sparkline** mini-chart alongside the W/L dots (already computed in `getFormSparkline`)
- [ ] Add **current streak count** badge at end of each row

### 1h. Consistency Rankings

- [ ] Add **"Most Volatile"** bottom section (highest std-dev = most unpredictable player)
- [ ] Show the actual std-dev value alongside the rank

### 1i. Quality Wins

- [ ] Add **"Hardest Win"** callout — single match with highest combined opponent ELO
- [ ] Show average opponent ELO rather than just a ranking

---

## 2. STATISTICS PAGE — New Sections

- [ ] **Peak ELO Tracker** — Table: Player | Peak ELO | Date Achieved | Current ELO | Delta from Peak
- [ ] **Day-of-Week Analysis** — Win rate per player broken down by Mon/Tue/Wed etc. (grid table)
- [ ] **Score Margin Trend** — Line chart of average match margin per month — shows if competition is getting tighter or more one-sided over time
- [ ] **Partner Chemistry Rankings** — For each player: their best, worst, and most-played partners with win rates (expandable per player)
- [ ] **Dominance Index** — Number of distinct opponents beaten at least once; who has the widest range of wins
- [ ] **Most One-Sided Rivalries** — Team matchups with ≥ 3 meetings where one team has won all or nearly all (e.g. "Ankit+Sachin vs Ojo+Mahi — 6W 0L")
- [ ] **Score Heatmap Grid** — Visual grid where rows = games scored, cols = games conceded; each cell shows how often that exact score occurred (e.g. 4-0, 4-1, 4-2, 3-4 etc.)
- [ ] **Longest Absence / Active Streak** — "Ankit has played in every session for the last N weeks" or "Ojo last played X days ago"

---

## 3. MATCH CARD POPUP — Enhancements

Currently shows: date, teams, scores, pre-match rank + ELO + level, team H2H, individual 4-player cross-records, ELO deltas, event badges, match note.

- [ ] **Match number context** — "Match #47 all-time" / "47th match in this group" shown in the date bar
- [ ] **Streak context line** — "This extended Ankit's win streak to 5" or "This ended Sachin's 3-game run"
- [ ] **Margin context** — "5th biggest winning margin by this team all-time" if noteworthy
- [ ] **ELO tier cross** — If a player crossed a tier boundary (e.g. into GOLD) with this match, show a badge: "Ankit → GOLD ★"
- [ ] **Last meeting reminder** — "Last time these teams met: 12 Mar · 4-2" (one line, under the H2H bar)
- [ ] **Relative performance indicator** — Was each team's score above or below their average? A small "above avg ↑" / "below avg ↓" tag per side

---

## 4. PLAYER DETAIL MODAL — Enhancements

Currently shows: Form engine, Archetype, Radar (6 axes: Win Rate, ELO, Clutch, Form, Activity, Margin), Achievements, basic stats, Activity Calendar.

- [ ] **Recent match log** — Last 5 matches as a mini-table: Date | Partner | Opponents | Score | ELO delta — concise and scannable
- [ ] **vs. All Opponents breakdown** — Collapsible table: one row per opponent, showing W–L record and avg margin vs them specifically
- [ ] **All Partners ranked** — Collapsible table: every partner played with, sorted by win rate, showing games played together
- [ ] **Personal Records section** — "Career Highs": biggest win margin, worst loss, longest streak, best month win%, highest ELO ever, most matches in a single day
- [ ] **ELO mini-timeline** — A small version of the existing ELO Timeline chart embedded in the modal (last 20 matches), so the player's rating arc is visible without leaving the modal
- [ ] **Monthly win-rate sparkline** — Small 6-month bar or line chart showing month-by-month win rate trend
- [ ] **Strengths / Weaknesses tags** — 2–3 auto-generated tags from archetype + stats (e.g. "Clutch performer", "Best with Sachin", "Struggles vs Ojo")

---

## 5. Quick Wins

- [ ] **Match notes field in Add Match modal** — free-text box saved with each match (the `m.note` field exists in the data model; just add the UI input)
- [ ] **"Jump to date" button on History page** — tap a date chip to scroll to that date in the match list
- [ ] **Long-press match card** → quick-action sheet (Share, Edit, Delete) on History page

---

_Review this list and confirm which items to implement._
