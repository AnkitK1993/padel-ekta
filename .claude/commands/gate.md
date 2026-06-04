---
description: Run the full verification gate (unit/golden/americano + handler-audit, browser smoke, css coverage)
---

Run the project's full verification gate and report results concisely. Run each,
capturing pass/fail:

1. `npm test` — unit + golden + americano + handler-audit
2. `npm run test:browser` — offline startup, lazy routes, add-match, seasons,
   the analytics interactive-handler net, and the analytics output snapshot
3. `npm run css:coverage`

Then summarise in a few lines:
- unit / golden / americano pass counts (and the handler-audit line)
- the analytics snapshot hash — it MUST be `4a96a30`; if it differs, flag it
  loudly as either an intentional analytics-output change (needs re-baselining in
  scripts/browser-smoke.js) or a regression to investigate
- browser smoke pass/fail
- css:coverage exit code

If anything is red, lead with that and show the relevant output. Don't bury a
failure under the passing lines.