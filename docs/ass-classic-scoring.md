# ASS CLASSIC — scoring system reference

This document exists so ASS CLASSIC's calculation is not lost. The engine
code (`src/domain/ass.js`, key `"ass"` in `SCORING_SYSTEMS`) stays in the
codebase and remains selectable from the Summary tab's scoring picker — this
file documents it in case every other surface that referenced it (see
"What was removed" below) needs to be rebuilt later.

## Why it was retired as the default

ASS CLASSIC starts every player at 1000 and lets wins/losses drift the
number from there. That anchor is a gift that only erodes with exposure: a
player who barely plays stays near 1000, while an active player who's
merely mediocre (e.g. 40% win rate over 50 games) can drift below them. On
real league data, a player with 2 matches and 0 wins outranked a player with
12 wins from 30 matches. The replacement, **ASS** (formerly called "EP" /
Earned Points during development — `src/domain/ep.js`), starts everyone at 0
and only earns from matches actually played. See that file's own header
comment and `docs/` (or the git history around the "Add EP (Earned Points)
as a 5th scoring system" commit) for its full design rationale.

## The calculation

Every match produces a **quality** score and a **strength multiplier**, and
every player's delta for that match is one of:

```
Win:  Δ = +round(quality × mult)
Loss: Δ = −round(quality / mult)
```

### Quality (match "contest value")

```
margin  = |scoreA − scoreB|
total   = scoreA + scoreB
quality = 4 × margin + total
```

Weights dominance (margin) four times as heavily as raw game count, so a
6–0 win (quality = 4×6+6 = 30) counts for much more than a 4–3 nailbiter
(quality = 4×1+7 = 11) — the opposite emphasis from the newer ASS engine,
which deliberately weights margin far more lightly.

### Strength multiplier (per player, per match)

An internal ELO walk (K=32, standard logistic expectation) runs alongside
ASS purely to estimate team strength for this multiplier — it is not shown
anywhere and does not affect ASS points directly except through this term.

```
oppBonus   = (avgOppElo − myElo) / 400
partnerTax = (partnerElo − myElo) / 400
mult       = clamp(1 + oppBonus − 0.5 × partnerTax, 0.5, 2.0)
```

- Facing a stronger average opponent raises `mult` (bigger reward for an
  upset win, smaller penalty for an expected loss).
- Having a *stronger* partner than yourself raises `partnerTax`, which
  *lowers* your own `mult` (you get less credit riding a strong partner,
  and are penalised more for a loss alongside one) — the reverse of ASS's
  "carrying a weak partner is never punished" property.
- `mult` is clamped to `[0.5, 2.0]` so no single match's ELO gap can double
  or halve `quality` more than that band.

### Baseline

```
ASS_rating(player) = 1000 + Σ(all deltas for that player)
```

Same `1000` baseline the internal ELO walk uses, which is why
`ratingToSr(rating) = (rating − 700) / 60` was written for this scale — it
assumes 700 is "very bad" and 1300 is "very good," an eight-and-a-half
point-per-SR-unit compression that only makes sense on a 1000-anchored
scale.

### Timeline (History / Peak / Low)

`computeASSTimeline(matches)` walks matches chronologically and returns
`{ history, peaks, lows }`: `history[player]` is an array of
`{ date, elo (running ASS), delta, won, opponent, scoreA, scoreB }` per
match; `peaks`/`lows` are the highest/lowest running value ever reached.
This is what a "Peak/Low" or rating-over-time chart would need if rebuilt.

## Season carryover: Reset / Flip / Fair

These formats (`src/domain/season-scoring.js`) only ever applied to ASS
CLASSIC and remain wired into the Summary tab's own season-scoring picker
(shown only when ASS CLASSIC is the active system, since they need a
well-defined "current rating" to carry over):

- **Reset** — the plain per-season `computeASS(seasonMatches)`, no carryover.
- **Flip** — starts the season at `2000 − referenceSeasonEndRating`
  (inverts the previous season's standings) then adds the new season's net
  ASS change on top.
- **Fair** — starts the season at
  `1000 + (continuousASSNow − continuousASSAtSeasonStart)`, i.e. a
  "how have you performed since the season started" delta measured against
  the *continuous*, all-time ASS walk (not a reset scale), added onto 1000.

`referenceSeasonFor` / `hasSeasonScoringReference` decide whether a valid
prior season exists to base Flip/Fair on; without one, both silently fall
back to Reset. These formats are untouched by this removal — they still
work exactly as before whenever ASS CLASSIC is selected.

## What was removed from the rest of the app (and why it can't just be re-added)

The sections below were **deleted**, not just hidden, because their maths
was ASS CLASSIC's specifically — a 1000-centred ELO logistic, or literal
`computeASS`/pre-match-snapshot walks — and would need real re-derivation
to mean anything on a 0-based scale, not a rewiring like the sections that
now "follow the picker."

| Section (previously in Statistics) | What it computed | Why it doesn't port |
|---|---|---|
| Win Probability | `1 / (1 + 10^((eloB−eloA)/400))` on ASS ratings | The 400-point logistic curve is calibrated to a 1000-centred scale |
| Match Simulator | Same win-probability model, applied to a hypothetical 4-player matchup | Same as above |
| Biggest Upsets | Walked matches re-deriving each player's *pre-match* ASS rating via ASS's own internal ELO+multiplier logic, found the largest "weaker team won" gaps | Reimplements `ass.js`'s internal walk directly, not just its output |
| Underdog Leaderboard | Same pre-match-snapshot walk, aggregated into a per-player upset count/best-gap leaderboard | Same as above |
| Rating Projection | Projects a player's future ASS `quality × mult` trajectory from recent form | Assumes the 1000 baseline and the classic quality/mult shape |
| What-If Simulator | Recomputes `computeASS` over a modified match history (flipped results, excluded matches) to show a counterfactual rating | Literally calls `computeASS`; a counterfactual on the new engine would need its own from-scratch design (career-games maturity makes "what if this loss were a win" ambiguous — maturity would also change) |

Also removed: the "Win Quality" tile in the player detail sheet (labelled
"avg ASS CLASSIC of opponents beaten"), sourced from
`computePlayerForm`'s `winQuality` field
(`src/domain/player-analytics.js`), whose thresholds (`/300`, `>= 1050`)
are hardcoded to the 1000-centred scale.

If any of these are wanted back for the new ASS engine, treat it as a
fresh design exercise per row above, not a restore — the underlying
`ass.js` engine (kept for the Summary tab picker) unblocks re-adding the
first four in their *original*, ASS-CLASSIC-labelled form relatively
cheaply, since none of that engine code was touched.
