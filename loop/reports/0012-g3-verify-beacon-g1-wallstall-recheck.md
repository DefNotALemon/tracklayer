# 0012 — Verify v69 guide-beacon fix (G3) + G1 wall-stall recheck — main @ c91d357

Scenarios: tools/playtest/scenarios/g3_beacon.mjs (existing), tools/playtest/scenarios/g1_yards.mjs (existing)
Shots: /tmp/tlout0012/sheet.jpg (also ~/.hermes/cache/scratch/tlloop/reports/0012.jpg)

## Verified since last time
- v69 "guide beacons are soft light columns" (c91d357): **partially confirmed, new issue at long range**.
  g3_beacon.mjs ran clean (smoke-equivalent, page errors: none) at the depot across 120/350/1200 m, night
  and day, weather pinned. At 120 m and 350 m the beacon reads exactly as the landing describes: a soft
  glowing column rooted at the depot, bright and wide at the base, tapering upward with no hard cut — big
  improvement over the old flat grey bar from report 0010 (vision on night_0120.jpg/night_0350.jpg). But at
  1200 m (1.2 km, still well within where players travel) the beacon has collapsed to a thin, perfectly
  straight hairline that stays a constant hard width/brightness from the village roofline all the way to
  the top edge of the frame with no visible taper (night_1200.jpg and day_1200.jpg both show this; cropped
  zoom at x≈660-700, y=60-220 of night_1200.jpg confirms no fade within that span). It reads less like "the
  old bug, smaller" and more like a thin wire or laser sticking straight up out of the village — likely the
  pillar's on-screen width falls below where the `view·normal²` falloff has enough pixels to look graded, so
  it degrades to a hard-edged single-pixel-ish line instead of vanishing into a point of light. Not a
  regression from pre-v69 (that bug was *wide* and close-range only), but it's a new, separate artifact the
  fix introduced at distance. Scenario and both full stills are in the outdir; recommend the builder look at
  either fading the pillar's overall opacity by distance-to-camera (on top of the existing silhouette fade)
  or capping its visible top height.

## Findings
1. [G3][med, new] Beacon at 1.2 km is a hard, non-fading, constant-width vertical hairline from roofline to
   top of frame (both night_1200.jpg and day_1200.jpg) — looks like a thin wire/laser, not a glow. 120 m and
   350 m views are good (soft, tapering, confirms v69's claim). Likely needs a distance-based opacity fade
   added on top of the existing silhouette fade, since the pillar is already sub-several-pixels wide at this
   range so the falloff has no room to read as soft.
2. [G1][low, re-confirmed, no change] "shore-rd old aim" wall-stall item (LOOP.md backlog) still reproduces
   exactly: g1_yards.mjs walking 12 m toward the shore-road house at yaw -1.2 (off-centre aim into the wall)
   covers 8.1 m in 14.08 s = **0.58 m/s**, vs the squared-on door approach for the same house at 2.44 m/s and
   every other town spot at 2.44-2.55 m/s. Numbers match the backlog's cited 0.58 m/s exactly — still open,
   still accurate, no regression, no new info to add.
3. [G1][info] All other town-yard walk checks (depot yard, garage forecourt, squared-on shore-road house,
   Strandbu home, Mehamn village) are 2.44-2.55 m/s for 10 m, consistent with prior baselines — packed-snow
   movement is fine and unaffected by recent landings.
4. [G2][info] Groomer-wording item (top of backlog, triaged in 0011) not in scope this pass — no new
   evidence either way; still the next thing the builder should take.

## Ideas
- For the 1.2 km beacon hairline: measure half-max pixel width of the column at a few camera distances
  (not just 120/350/1200) to find the range where it crosses from "soft column" to "hard line" — that's
  where a distance fade should start kicking in.
