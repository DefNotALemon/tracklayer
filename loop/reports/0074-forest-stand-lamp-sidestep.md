# 0074 — v142 round-obstacle sidestep: forest stands + lamp posts (G1) — main @ 003c593
Scenario: tools/playtest/scenarios/g1_forest_lamp.mjs (+ g1_forest_lamp_shot.mjs for stills)   Shots: ~/.hermes/cache/scratch/tlloop/reports/0074.jpg

## Findings (most important first)
1. [G1][med] A forest stand with two trunks only **0.51 m** apart (gap = centre distance − both radii) never
   lets you through: `g1_forest_lamp.mjs` held W straight at the gap from 8 m out, both head-on and 0.3 m
   off-centre — "stuck" both times (12 s cap), hug (dist < r+0.6 to either trunk) 5.55 s and 7.63 s, 4 and 12
   lateral direction-reversals ("dither"). Stills (0074.jpg) show the walker isn't frozen or clipping into a
   trunk: v142's sidestep deflects it sideways and it keeps walking, drifting away from the original heading
   into open snow (sled-distance HUD grows 5→7→9→12 m over the 8 s) without ever crossing the gap or
   resuming its original line. So it's not a freeze/visual bug, it's a navigation one: a gap narrower than
   the walker's clearance makes you walk *past* the stand sideways indefinitely rather than either squeezing
   through, picking one trunk to go around and resuming your line, or stopping with a clear "can't fit here"
   cue. Suggested fix: once the sidestep has cleared one trunk's radius, re-aim the walk vector back at the
   original heading instead of continuing to slide along the summed-normal tangent — the same side-latch
   (`F.obSide`) that fixed single-obstacle dithering should release as soon as `minD` to that one trunk opens
   back up past r+0.6, so the walker corrects back to its intended line instead of drifting through the woods.
2. [G1][low] Wider stands pass clean: gap **1.96 m** (plenty of room) — 0/2 stuck, 0 dither, minD 0.99–1.29 m
   (never grazes either trunk). gap **1.02 m** (tight but walker-width-plus) — 0/2 stuck, 0 dither, minD
   0.73–0.87 m, passes in 5.8–8.3 game-s. So the problem in F1 is specific to sub-~0.6 m gaps, not stands in
   general — v142's fix holds for anything a human would call "a gap you could fit through."
3. [G1][low] Lamp posts beside buildings/lanes (never covered by `g1_obround.mjs`'s "nothing else within 9 m"
   isolation filter) are clean: 3 real lamps, head-on and 0.3 m off-centre, 0/6 stuck, 0 dither, hug 0.63–0.87 s,
   minD 0.66–0.68 m (same ballpark as the lone-obstacle numbers in report 0072/builder v142). The backlog's
   "lamp posts beside a lane" check is closed.

## Verified since last time
- v142 round-obstacle sidestep (0072 F1, landed 11a75ab): confirmed on real lamp posts (not just synthetic
  lone obstacles) — clean. Confirmed on forest stands with normal-sized gaps (≥~1 m) — clean, no dithering.
  New edge case found on sub-0.6 m gaps (finding 1 above): drifts past instead of resuming course; not a
  regression of v142, a gap it didn't anticipate.
- Did not test: gamepad stick input (headless CDP drives keyboard only, no gamepad emulation available in
  this harness) and skiing (`skiStep` has its own, unchanged obstacle code per the builder's note — out of
  scope for this report).

## Ideas
- A "can't fit through, go around" nudge (visual or a soft stop) for sub-clearance gaps might read better
  than silently drifting off course, especially since the player has no indicator their heading changed.
