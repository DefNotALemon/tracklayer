# 0001 — slope, obstacle & turn feel on foot (G1) — main @ 92e2810
Scenario: tools/playtest/scenarios/g1_walking_terrain.mjs   Shots: ~/.hermes/cache/scratch/tlloop/reports/0001.jpg

First-ever pass of this loop (no prior reports/PROGRESS entries to verify). Focus: G1, the parts of
"walking easier to traverse" not covered by `smoke.mjs`'s flat-powder baseline — slopes, obstacle snagging,
and turn-on-the-spot rate.

## Findings (most important first)

1. [G1][med] **Slope has zero effect on walking speed/effort** — code-confirmed and measured. `footStep()`
   (tracklayer.js ~10601) computes `wade`/`tgt` purely from snow depth (`depthAt`/`freshAt`) at the foot's
   cell; it never calls `slopeAt`. Teleported the walker to the steepest nearby bank (`slopeAt`=1.23, a
   near-cliff drop to the fjord at (-1472,-912)) and measured: uphill **1.66 m/s**, downhill **2.41 m/s**,
   vs. a flat dry-snow control at the same spot method **1.04 m/s** (tired 0.42) — i.e. the "steep" spot
   was *faster*, purely because its local snow was shallower, not because slope helped or hurt. G1 explicitly
   calls out "Slopes: walking up/down hills" as a direction to explore; right now there's nothing there.
   Suggested fix: fold `slopeAt(F.x, F.z, 2)` into `wade` the same way depth does (small uphill penalty,
   small downhill bonus, capped so cliffs don't become exploits) — cheap, local change in `footStep`.
   Methodology note: the auto-picked "steepest dry spot" landed on a coastal bank next to open water, not
   an inland hillside (see still `00_slope_setup.jpg`) — the finding (no slope term in the code) holds
   regardless, but a cleaner uphill test would target terrain near the garage/fells, not the shoreline.

2. [G1][low] **Small obstacle collision works correctly.** Walked straight at the nearest tree/rock
   (r=1.5) from 4.5 m out; the walker stopped right at the collision boundary (measured 1.90 m from the
   object center vs. expected `r + 0.36` = 1.86 m) with no stutter, jitter, or clip-through over 5 s of
   holding W. No fix needed. (Stills `01_obstacle_setup.jpg`/`02_obstacle_after.jpg` are close-ups framed
   at the obstacle's center, not the walker — the apparent "inside a building" look in `02` is the test
   camera being too close to a large object's mesh at 4 m, not a gameplay clip; re-frame on `FOOT.x/z` next
   time, not the obstacle, to judge the player's view honestly.)

3. [G1][low] **Turn-on-the-spot rate matches spec exactly.** Held D for ~2.2 s game time; measured yaw rate
   2.20 rad/s against the documented 2.2 rad/s turn rate (LOOP.md G1 notes). Steering feel is consistent
   with intent — nothing to fix here, just confirming the number before anyone "fixes" it by accident.

## Verified since last time
- N/A — first playtester pass of this loop; no builder landings exist yet to verify.

## Ideas
- The steepest reachable non-sea ground near the default spawn is a shoreline bank that drops straight
  into the fjord with no rail/warning and normal walk speed right up to the edge (still `00_slope_setup.jpg`).
  Once slope has real effect (finding 1), this spot becomes a good "don't fall in" stress test; worth a
  dedicated coastline scenario later.
- Next walking pass: pick an inland slope deliberately (e.g. search near `garageSite` or a known hill) so
  "steepest spot found" isn't the coast by default.
