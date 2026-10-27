# 0085 — Walking round tree-well trunks on foot (G1) — main @ 627a385

Scenario: tools/playtest/scenarios/g1_treewell_foot.mjs (new, committed with this report)
Shots: ~/.hermes/cache/scratch/tlloop/reports/0085.jpg (contact sheet, 20 stills)

Focus: the v146 tree-well backlog item (report 0081 rode the sled through and judged it clean) left
"walking round a trunk by hand" unjudged — 0081/0084 covered the sled and the on-foot *camera* clip, but
not the on-foot *walker's* obstacle handling through a dense stand. This pass puts `FOOT.on` into the same
2 dense pine stands used by `g1_treewell.mjs`/`g1_forest.mjs`, 2 headings each, holding W only (no manual
steering — same methodology as the ski/sled obSlide tests in PROGRESS v142–v145: the game's own wall-slide
is what's meant to carry you round a trunk), 16 m approach to clear the stand.

## Findings (most important first)

1. **[G1][info] 0/4 runs stuck, no snagging.** Mean 24.2 game-s to clear ~30 m through 6–7-pine dense
   stands (vs 23.7–24.0 s for the sled doing the same stands per `g1_forest`/report on v146) — walking
   speed through trees tracks open-ground walking pace, no extra friction from the trunks themselves.
   `obSlide`'s wall-slide/notch-lock (built for skis/sled, PROGRESS v142–v145) generalizes cleanly to the
   on-foot walker too; consistent with 0084's finding that the walker's narrower profile interacts with the
   *camera* clip guard more, not less, cleanly.
2. **[G1][info] Close-up trunk rendering is clean at 1 m** (`s0_1m.jpg`, 0085.jpg row1 col2): the walker
   stands right beside a trunk with no clipping, no stretched mesh, no z-fighting. No pine needles/canopy
   visible in that frame, but that's the same framing limit report 0081 already noted for the sled's chase
   cam ("the dish isn't legible from the chase cam, by design") — the on-foot side camera here sits too low
   and close to catch the canopy above a 1 m-away trunk; not a bug, a still-taking limitation of this
   scenario's camera, not the game's.
3. **[G1][low] One still (`s0_1m.jpg`) shows the snow-condition badge reading "PACKED · Plowed yard" while
   the walker is mid-stand in dense pines**, not "powder"/"fresh". Didn't chase this down (would need
   sampling `pack`/`depthAt` at that exact cell, which this pass didn't log) — could be legitimate if that
   particular stand sits at the edge of a yard/lane, or could be a terrain-type misread near trees. Flagging
   for the builder to check with `g1_treewell.mjs`'s own depth sampling (`depthAt` at the stand centres) if
   it wants to follow up; not re-verified as a real bug here.
4. **[G1][info] FOOT.tired reached 0.88–1.00 on 3 of 4 runs** (30 m in ~22–27 game-s) without the stuck/stall
   threshold (3 game-s under 0.25 m/s) ever tripping — i.e. getting winded doesn't equal getting stuck here,
   consistent with the G1 jog/tiredness curve already measured by `g1_jog.mjs` (v96). Not a new finding, just
   confirms the tiredness ramp applies the same inside a stand as in open ground.

## Verified since last time
- v146/v147 tree wells + camera clip (0081, 0083, 0084): now also clean for the walker's *movement* through
  a stand (this pass), on top of the camera-clip coverage 0083/0084 already gave. Combined with those three
  reports, the backlog item's full unjudged list (ride, camera clip at close/night/on-foot, and now walking
  by hand) is covered — nothing left outstanding except the storm-refill question below.

## Ideas
- Storm refill of tree wells ("refill fills a well back only to its own f, so it should stay" per LOOP.md)
  is still unjudged — needs a scenario that stamps a well, advances `GS.storm`/weather, and samples
  `depthAt` at the well core before/after to confirm it refills only to its own local f rather than back to
  open-ground depth.
- If the builder wants to chase finding 3, `g1_treewell.mjs` already has the depth-sampling helper pattern
  to check whether that specific stand's badge/pack reading is a real misclassification.
