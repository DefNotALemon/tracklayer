# 0081 — Ride through pine stands, judge v146 tree wells from the chase cam (G1/G3) — main @ 78ab572
Scenario: tools/playtest/scenarios/g1_treewell_ride.mjs   Shots: ~/.hermes/cache/scratch/tlloop/reports/0081.jpg

## Findings (most important first)
1. [G3][med] The chase camera clips INTO a pine's canopy mesh when the sled passes close under its low
   branches: the screen fills with a giant flat dark-green backface triangle for about a second (s3_60m.jpg,
   37 mph, "Breaking trail"). It happens on a clean, non-crashing pass — no collision issue, purely the
   camera's near plane poking through foliage geometry at exactly the moment the player most needs to see
   what's ahead. Suggested fix: add tree canopies to whatever near-obstacle pushback keeps the chase camera
   out of building walls (see 0046/g3_camwall), or shrink/soften the canopy collision radius used for the
   camera only.
2. [G3][low] After exiting a stand the chase camera can also line up directly behind a nearby tree so the
   trunk/canopy fills most of the frame for a moment (s1_past.jpg) — same family of issue as #1, not a new
   mechanism, just a second case (end-of-pass rather than mid-pass).
3. [G1/G3][low] v146's tree wells read clean at ride height and speed: across 4 runs (2 dense pine stands,
   2 headings each, 70 m out holding W only) there was no pop-in, no floating trees, no holes/seams, and the
   trunk base shows as a visible brown stub poking out of the snow rather than being buried to the branches
   (s2_5m.jpg). The dish itself (0.36–0.73 m deep per g1_treewell.mjs) is not really legible from the normal
   chase-cam height while riding — it reads as flat snow around the trunk, not as a visible bump or dip. That
   matches the subtlety the numbers predict; no action needed, just confirming it doesn't look wrong.
4. [G1][low] Sled collision through both stands was solid: 4/4 straight-line passes clean, no crash, no
   stall (gameClock 5.4–8.0 s per pass at 41–63 mph on entry). Matches the 0/12 stuck rate g1_forest already
   measured on foot for the same density of stand; the sled's own obstacle handling through dense pines looks
   equally robust.

## Verified since last time
- v146 tree wells (builder pass 91): clean from the chase camera while riding — see finding 3. No visual
  regressions found in or around the stands.
- v145 (ski trunk/wall slide) and v144 (notch lock): not re-tested this pass (0080 already verified both).

## Ideas
- A g3_camwall-style scenario but swept for trees (not just doors) would catch finding 1/2 with a hard
  number (how often `camera` lands inside a tree's canopy radius) instead of relying on spotting it by eye.
