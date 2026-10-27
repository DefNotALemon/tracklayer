# 0078 — cross-country skiing through forest stands: skiStep has no obstacle-clear logic (G1) — main @ 082ecc8
Scenario: tools/playtest/scenarios/g1_ski_forest.mjs (new, committed with this report).
Shots: ~/.hermes/cache/scratch/tlloop/reports/0078.jpg (contact sheet, stuck run t=0/12/18/24/30/36/end)

Follow-up to reports 0072/0074's open item: footStep got a tangent-sidestep fix in v141/v142 (stuck 6/12 → 0/12
in a forest stand, report 0074), but skiing uses a separate function (`skiStep`) with a different, simpler
obstacle response — flagged then as unverified. Ran the same test as `g1_forest.mjs` (3 densest flat tree
stands on the map, 3 headings each, 15 m out holding W through the centre, 40 game-s cap) but on Turski
cross-country skis instead of on foot.

## Findings (most important first)
1. [G1][high] **Skiing can get permanently pinned on a single trunk face — the sidestep fix never reached
   `skiStep`.** Stand (-2270, 3537), heading 0.3 rad: stuck (never got 15 m past centre), stall **28.36 s**
   of the 40 s cap (`minSp` 0.18 m/s), `collapses` (speed halving while still holding forward) **10** times.
   Contact sheet 0078.jpg shows the skier parked flush against a trunk from t=12 onward, completely static
   for the rest of the run — not sidestepping or sliding along the trunk at all, just leaning on it. Root
   cause: `skiStep` resolves obstacles with the plain `footBlock` radial snap (push `nx,nz` straight out to
   the circle `r+0.36` around the obstacle centre, tracklayer.js:11574-11588) and nothing else — no tangent
   slide, no `F.obSide` latch, no release-when-clear logic like `footStep` got in v142. When the ski's forward
   velocity points roughly at the trunk centre, the snap keeps re-clamping you to the same point on the
   circle every frame instead of deflecting you along the tangent, so you just stand still pressed into the
   bark. On foot this exact geometry is now 0/12 stuck (report 0074); on skis it's broken again.
2. [G1][med] Even where it isn't fully stuck, skiing through a stand is rougher than walking: 9 runs, 1 stuck,
   mean stall **7.29 s** per run (vs footStep's 0.00 s in the equivalent 0074 test) and 23 speed-collapse
   events across 9 runs (vs 0 flips reported for footStep in 0074 — different metric, but the collapses are a
   direct symptom of the same repeated-snap behaviour: speed halves on frames where the clamp bites, then
   the kick animation accelerates again, then it bites again). Max single-run stall 28.36 s, min 0.35 s
   (heading 2.4 rad at the first stand threaded a gap cleanly both runs — geometry-dependent, same as the old
   footStep bug).
3. [G1][low] Pass times where it does get through are comparable to or better than walking (mean 16.56 s for
   the runs that finished vs footStep's 23.8 s/30m in 0074's denser stands — not an apples-to-apples stand set,
   but skis are clearly not slower once past an obstacle) — this is purely an obstacle-collision bug, not a
   general ski-in-forest pace problem.

## Verified since last time
- v143 (toast cap/eviction, report 0075 F1) already confirmed in report 0077; nothing new on it this pass.

## Ideas
- Cheapest fix: reuse `footStep`'s tangent-sidestep/`obSide`-latch logic for `skiStep` too (it already has
  `F.turn`/`F.yaw` to steer with), or at minimum give `skiStep` its own light deflection: when `footBlock`
  reports `hit` and the post-snap position barely moved along the ski's heading, nudge `F.yaw` a few degrees
  toward whichever side has clearer space (same probe `g1_obround.mjs`/`g1_forest.mjs` already use) rather
  than just re-clamping the raw position every frame.
