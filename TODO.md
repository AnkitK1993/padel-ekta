# Padel Ekta — Feature Roadmap

---

## 📊 New Graphs / Visualizations (1–22)

1. **Rating distribution histogram** — bell-curve of all players' ASS/ELO scores, with each player's avatar marked on the curve. Shows how tight or spread the league is.

2. **League competitiveness over time** — line chart of the rating spread (std-dev between players) per month. Answers "is the group getting closer or is one player running away?"

3. **Animated bar-chart race** — ratings (or total wins) animating month by month from the first match to today. Very shareable.

4. **Activity stacked-area chart** — matches per player per month, stacked. Shows who's playing more/less over time and total group volume.

5. **Global partner network graph** — force-directed web of who plays with whom; edge thickness = matches together, edge color = win% together. The whole group's chemistry on one screen.

6. **Favourite-wins curve** — win% of the higher-rated team bucketed by rating gap (0–25, 25–50, 50–100, 100+). Tells you how predictive the rating system actually is.

7. **Head-to-head matrix heatmap** — grid of every player vs every player as opponents, cell color = win%. One-glance nemesis map.

8. **Margin-of-victory histogram** — global distribution of scorelines (6-0, 6-1, … 7-6). How often are matches blowouts vs nail-biters?

9. **Fatigue curve** — win% and avg games won by Nth match of the day (1st match vs 4th match of a session). Who starts hot, who fades?

10. **Form vs Class quadrant scatter** — X-axis all-time rating, Y-axis last-10-match form. Four quadrants: In-form stars / Sleeping giants / Overperformers / Struggling.

11. **Year-at-a-glance heatmap** — GitHub-style 365-day grid colored by matches played per day, with streak counts.

12. **Multi-player compare** — pick 3–4 players, see overlaid radar + side-by-side stat columns (current H2H deep-dive only does 2).

13. **Nemesis & Bunny board** — for every player: the opponent they lose to most (nemesis) and beat most (bunny), as a fun leaderboard card.

14. **Fair Match Generator** — standalone tool: select any 4+ present players, it proposes the most balanced 2v2 pairings ranked by predicted closeness (live session has auto-balance, but nothing usable outside a session).

15. **Underdog leaderboard** — who wins most often when their team is rated lower. "Giant-killer" ranking.

16. **Partner loyalty stats** — % of matches each player plays with their most frequent partner; most loyal duo vs biggest "floaters."

17. **Hall of Fame / All-time records page** — global one-stop card: biggest win ever, longest win streak ever, most matches in a day, highest rating ever reached, longest rivalry, fastest climb in 30 days, etc.

18. **Milestone timeline** — vertical scrolling history of the group: first match ever, 100th match, first 6-0, each player's debut, record days. The group's story.

19. **Attendance streaks** — consecutive-sessions-attended leaderboard, with current streak and record streak per player.

20. **Season MVP auto-award** — configurable weighted formula (rating gain 40% + win% 30% + attendance 20% + upsets 10%) that crowns an MVP per season/month automatically.

21. **Global badge gallery** — one page showing every badge/achievement in the system and which players hold each (currently badges only visible inside each player's modal).

22. **Clutch leaderboard** — ranking by performance in tight matches only (decided by ≤2 games), separating pressure players from flat-track bullies.

---

## 🔧 Admin / Data Management (23–30)

23. **Data Health Check card** — scans for duplicate matches (same teams+score+date), impossible scores, orphaned aliases, unused guests; shows issues with one-tap fixes. Fits perfectly in the new Manage tab.

24. **Player Merge tool** — merge two roster entries (e.g. "Ram" and "RaM" typo duplicates), rewriting all match history to the surviving name.

25. **Backup health dashboard** — one card: last email backup, last Drive backup, data size trend sparkline, green/amber/red status. Replaces scattered status text.

26. **Restore diff preview** — before restoring a Drive backup, show exactly what would change (+12 matches, −2 players) instead of blind overwrite.

27. **Admin audit log** — local timeline of admin actions: "added 4 matches", "deleted match", "restored from backup", with undo where possible.

28. **Storage breakdown donut chart** — visual split of Firestore usage (matches / photos / roster) instead of the current text readout.

29. **ASS formula editor** — expose the ASS weights (K-factor, margin bonus) as admin sliders with a live preview of how the leaderboard would reorder.

30. **Season archiver** — freeze a finished season into an immutable snapshot page (final table + awards) that never recomputes.

---

## 🎾 Gameplay Tracking (31–34)

31. **Court/venue tracking** — optional venue per session; win% by court, "fortress" and "away-day" stats.

32. **Match tags & notes** — tag matches (friendly / tournament / decider), filter every page by tag.

33. **Session photo gallery** — attach photos to a session date, browsable gallery in History.

34. **Time-of-day tracking** — optional match time; morning vs evening performance splits.

---

## 🎉 Engagement (35–40)

35. **TV / Kiosk mode** — fullscreen auto-rotating dashboard (leaderboard → today's results → form) for a phone propped up courtside.

36. **Prediction league** — players predict winners before a session; prediction-accuracy leaderboard.

37. **Weekly push digest** — one push notification per week: mover of the week, streaks, next session.

38. **QR share card** — generate a QR code opening a read-only snapshot of today's standings for the group chat.

39. **Voice score entry** — dictate "Ankit Puneet beat Ram Raghav six four" → parsed and previewed.

40. **Record-break celebrations** — when an entered match sets a record (new peak, longest streak), auto-detect and fire confetti + toast at entry time.

---

## 📈 Additional Graphs (41–45)

41. **Streak Gantt timeline** — horizontal win/loss streak bars for every player on one time axis.

42. **Ratings small-multiples grid** — every player's rating curve as mini sparklines on one screen.

43. **Rolling 10-match win% chart** — smoothed form lines with multi-player overlay.

44. **Margin scatter calendar** — every match a dot (date × margin), colored by winner; blowout eras vs tight eras at a glance.

45. **Per-player waterfall chart** — the single matches that moved a player's rating most, as a waterfall from 1000 to today.

---

## Implementation Status

- [x] 1 — Rating distribution histogram
- [x] 2 — League competitiveness over time
- [x] 3 — Animated bar-chart race
- [x] 4 — Activity stacked-area chart
- [x] 5 — Global partner network graph (circular layout, not a physics force-directed sim)
- [x] 6 — Favourite-wins curve
- [x] 7 — Head-to-head matrix heatmap (already existed — Stats → Players tab)
- [x] 8 — Margin-of-victory histogram
- [x] 9 — Fatigue curve
- [x] 10 — Form vs Class quadrant scatter
- [x] 11 — Year-at-a-glance heatmap (already existed — Activity Calendar)
- [x] 12 — Multi-player compare
- [x] 13 — Nemesis & Bunny board
- [x] 14 — Fair Match Generator
- [x] 15 — Underdog leaderboard
- [x] 16 — Partner loyalty stats
- [x] 17 — Hall of Fame / All-time records page
- [x] 18 — Milestone timeline
- [x] 19 — Attendance streaks
- [x] 20 — Season MVP auto-award (weighted formula, sits alongside the ASS-ranked MVP)
- [x] 21 — Global badge gallery
- [x] 22 — Clutch leaderboard (already existed — Quality Wins / Anti-Clutch)
- [x] 23 — Data Health Check card
- [x] 24 — Player Merge tool
- [x] 25 — Backup health dashboard
- [x] 26 — Restore diff preview
- [x] 27 — Admin audit log
- [x] 28 — Storage breakdown donut chart
- [x] 29 — ASS formula editor (sandbox preview only, doesn't alter live scoring)
- [x] 30 — Season archiver
- [ ] 31 — Court/venue tracking
- [ ] 32 — Match tags & notes
- [ ] 33 — Session photo gallery
- [ ] 34 — Time-of-day tracking
- [ ] 35 — TV / Kiosk mode
- [ ] 36 — Prediction league
- [ ] 37 — Weekly push digest
- [ ] 38 — QR share card
- [x] 39 — Voice score entry
- [x] 40 — Record-break celebrations
- [x] 41 — Streak Gantt timeline
- [x] 42 — Ratings small-multiples grid
- [x] 43 — Rolling 10-match win% chart
- [x] 44 — Margin scatter calendar
- [x] 45 — Per-player waterfall chart

---

## Backlog Selection

Select features to implement by replying with numbers, e.g.: `1, 7, 14, 23, 35`

---

**Total Features:** 45  
**Categories:** Visualizations (22) · Admin (8) · Gameplay (4) · Engagement (6) · Graphs (5)
