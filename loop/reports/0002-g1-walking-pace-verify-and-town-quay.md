# 0002 — verify v58 walking pace, then G1 town/quay check — main @ 31a0364
Scenarios: tools/playtest/scenarios/g1_walk30.mjs (rerun), tools/playtest/scenarios/g1_town_quay.mjs (new)
Shots: ~/.hermes/cache/scratch/tlloop/reports/0002.jpg (contact sheet)

Focus: verify the builder's v58 landing (walking pace in powder) reproduces, then check the G1 backlog
item "town/quay walking (plowed, pack≈1 → should be 2.9 m/s since v58)".

## Verified since last time
- **v58 powder pace landing reproduces exactly.** Reran `g1_walk30.mjs` fresh: powder 30 m **19.3 s**,
  avg **1.56 m/s** (PROGRESS claimed 19.3 s / 1.56) at depth 0.49 m; trench 25 m **11.0 s**, avg **2.29 m/s**
  (claimed 2.23, within location noise) — matches the landed numbers. No regression.

## Findings (most important first)

1. [G1][high] **"Town/quay" ground is not plowed — the backlog item's premise is wrong.** Measured at the
   depot/quay seed `(-1300,-385)` and 65 m along the shore road: `pack` (the hard-pack term `footStep` reads)
   is **0** in both spots, with fresh powder depth 0.53 m and 0.63 m respectively — statistically the same as
   open-backcountry powder (0.49 m in the verify run above). Walking speed there is **1.31 m/s** (quay core,
   20 m) and **1.55 m/s** (shore road, 20 m), not the 2.9 m/s hard-pack figure the backlog note assumes.
   Code-confirmed why: `pack` only comes from `depthAt`/`freshAt` (snow physically thinner than what fell) or
   from the player's own trench (`footPath`); the quay's `clear: 150` field (and every other site's `clear`)
   is only a placement-avoidance radius for obstacle generation (`obNear`/`SITES.some` at lines ~4078-4081),
   not a snow-clearing/plowing mechanic — nothing in the game ever plows or packs the ground at town. The HUD
   even reads "POWDER · Breaking trail" standing right at the quay door (see `00_quay_core.jpg`). Suggested
   fix: either (a) correct LOOP.md's backlog note — there's no "should be 2.9 m/s" regression to fix, since
   town was never plowed — or (b) if Lemon wants a plowed-town feel, that's a new feature (a `pack=1` patch
   baked into the save near town/road sites), not a bugfix to `footStep`.

2. [G1][low] **Obstacle collision at the quay is clean.** Walked straight at the nearest obstacle object to
   the depot (r=0.6, a post/sign near the shop) from 6 m out; stopped **0.96 m** from its center against an
   expected `r + 0.36` = **0.96 m**, exact match, no jitter over 5 s of holding W. Confirms report 0001's
   generic-obstacle finding holds for town furniture too.

3. [G1][low] **Quay/water edge stop is clean, no snag.** Walked straight toward the nearest sea cell from the
   depot seed for 6 s; ended on dry land each run (`isSea` false) with `sp` still 1.55 (not frozen/stuttering
   against the boundary) — no edge-case clipping into the fjord.

4. [G1][info] **Shore road (20 m, depth 0.63 m) measured faster (1.55 m/s) than the quay core itself (20 m,
   depth 0.53 m) at 1.31 m/s**, backwards from what the depth-only model predicts (shallower snow should be
   quicker). Likely a short-window artifact — 20 m includes the acceleration ramp from a standstill, and the
   quay-core start point is close to dock/shop geometry that may nudge the path — rather than a real slow
   spot; worth a longer-distance recheck (40-50 m) away from any structures before anyone chases it as a bug.

## Ideas
- A real "plowed road/town" pack mechanic (finding 1) would also make the G1 "walking easier to traverse"
  goal land somewhere a player notices constantly (every job start/end), more than the open-backcountry tweaks
  so far — worth floating to Lemon via LOOP.md Owner notes if he wants it, since it's a feature call, not a bug.
- Next walking pass: the inland-hillside slope test still owed from report 0001 (steepest spot found that run
  was a coastal bank, not a real hill).
