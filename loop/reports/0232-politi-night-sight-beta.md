# 0232 — Politi at night (sight range), beta — main @ aa4433f (v247)
Scenario: new `tools/playtest/scenarios/x15_police_night_break.mjs` (exit 0, page errors none). Headless, keyboard-free puppet driving the longest road lane at 100 km/h, cruiser placed on the lane behind with `TLXP.patrol`. Pad and touch not covered (the Politi has no input of its own); no stills.

## Findings
No BLOCKER or BUG. Verified:
- Day (hour 34, dayFactor 0.99): a cruiser 70 m behind a 100 km/h speeder reaches warn.
- Night (hour 24, dayFactor 0): a cruiser placed 120 m behind never sees you (suspicion 0 the whole run, cruiser ends 538 m back); one placed 55 m behind warns (peak suspicion 7.7, seen 1, `#polHud` shown, warn at 83 m). That matches `sight 170 m x nightK 0.5` = 85 m.

1. POLISH — a cruiser that patrols slowly drops far behind a mild speeder, so the "70 m behind" case is only reliable at 100 km/h. At 76 km/h (21 m/s, just over the 70 limit on a marked road) both cruisers I placed 55-70 m behind fell 340-390 m back within the wait and noticed nothing, day or night. Probably as designed (a patrol car does not chase a car it is not yet suspicious of), but a player just over the limit with a cruiser right on their tail gets no reaction at all. Suggested: say so in the Politi app note or let a cruiser within 60 m speed up to keep its mark.
2. Test note — `TLXP.patrol(i, route, s, dir)` cars drive away at patrol speed: place the cruiser 55-70 m behind and drive at 100 km/h, or the gap opens before suspicion builds. Puppets must set `P.vx/vz` from yaw or the speed check reads 0 (my first run did not and saw nothing).
