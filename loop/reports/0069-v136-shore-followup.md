# 0069 — v136 shore-slide follow-up: spot 3 stuck spot, skiing, and the quay/pier edge (G1) — main @ 977795b

Scenario: tools/playtest/scenarios/g1_shore_followup.mjs (new, committed with this report)
Shots: ~/.hermes/cache/scratch/tlloop/reports/0069.jpg (contact sheet: a_spot3_stuck, b_ski_spot0, c_quay_edge)

## Verified since last time
- v136 shore slide (977795b) holds up for **skiing**, not just walking (shoreSlide feeds both footStep and
  skiStep, but 0068's own test only exercised the on-foot case). Spot 0/1, 45° both sides, 5 game-s each on
  skis: along-shore 2.97–12.99 m (walking's equivalent numbers in report 0068/PROGRESS were 2.73–5.13 m avg) —
  skis glide along the shore line at least as well as walking, no stop, no sea entry in any of the 4 runs.
- The quay/pier edge (not a natural beach — the `QUAY`/pier slab built by `placeQuay()`) also slides cleanly:
  walked 8 game-s along the pier's water-side edge near the freight/fish-buyer shed, covered 12.79 m (~1.6
  m/s), never entered the sea, no stall. The "walk the quay edge toward a door" backlog ask is clean.

## Findings
1. [G1][none — closes the backlog item] **Spot 3 (-1409,-326) 45° side −1 is NOT a shoreSlide bug.** Instrumented
   `shoreSlide`'s own math at that exact spot and angle: the 12-tap ring finds 3 wet taps (a clean, consistent
   shore normal, length 2.73 before normalize — nothing degenerate), the computed slide target is **not** wet
   (`slidWet: false`), and `into` is positive — every condition for a successful slide is met, `shoreSlide`
   would return a valid point. The actual 5 game-s walk still only covers 0.65 m total (0.46 m along-shore),
   because **the terrain at that exact point is a steep slope**: `slopeAt(x,z,2)` reads **1.32** there (a grade
   of ~1.3, i.e. ~53°, near-cliff) vs. the other shore spots' gentle beach grades. `obNear` is clear at 3 and 6 m
   (no obstacle). Walking (and presumably riding) is independently slowed to near-zero on grades that steep —
   that's the walking-on-slopes system doing its job, nothing to do with the shore fix. The backlog's "concave
   corner?" guess was wrong; it's a cliff the search script happened to place a spot on. No fix needed from the
   shore-slide side; if Lemon wants steep-shore walking specifically addressed that's a separate G1 slopes item,
   not a follow-up to v136.
2. [G1][info] Skiing along the shore moves noticeably *faster* than the walking numbers for the same spots/angles
   in 0068 (e.g. spot 1 45° side 1: skis 12.99 m vs walking's reported avg in the 2.7–5.1 m/5s range) — expected
   (skis are faster on packed/trench terrain generally) and not itself a problem, just confirming the mechanic
   generalizes rather than being a footStep-only patch.
3. [G1][none] No visual glitches in any of the 3 stills: walker/skier stay upright and on the surface, no
   clipping into terrain or the pier structure, no camera inside geometry.

## Ideas
- Backlog's remaining shore item can be closed; replace with (separate, low-priority) "walking speed on >1.0
  grade slopes near the shore reads as near-total-stop — is that the intended slope-speed curve, or does the
  curve need a look at very steep local grades specifically (not just general hillsides)?" if Lemon ever wants
  cliff-edge walking looked at.
- `g1_shore_followup.mjs`'s spot-finder is identical to `g1_shore.mjs`'s; if a future pass wants a flatter/less
  steep shore test spot, filter candidates by `slopeAt(px, pz, 2) < 0.5` when building the spot list.
