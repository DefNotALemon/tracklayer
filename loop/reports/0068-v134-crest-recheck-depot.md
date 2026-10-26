# 0068 — v134 crest easing re-check on a second rise + depot-beacon sanity (G1) — main @ bd73629
Scenarios: tools/playtest/scenarios/g1_sledpin_crest_trees.mjs, g1_sledpin_depot.mjs
Shots: ~/.hermes/cache/scratch/tlloop/reports/0068.jpg

## Verified since last time
- v134 (sled-column easing now frame-rate independent, bd73629): re-ran the continuous crest-walk test on a
  **different, bigger** rise than 0044/the builder's own check (59 m over the sight line vs the builder's one
  rise; 450 m out from a fresh spawn). Column lift eases smoothly from 209.4 m down to 0 over the last ~70 m
  before the crest (gameClock 11.8→53.4), max lift-change rate **10.5 m/game-s**, max foot-screen-row change
  **18 px/game-s** — same order of magnitude as the builder's own numbers (11.2 m/game-s, 14 px/game-s) and far
  below anything that would read as a snap. No jump at any sample. Confirms the fix generalizes past the one
  rise it was built/verified on.

## Findings
1. [G1][low, harness] The crest-search in `g1_sledpin_crestcont.mjs`'s pattern doesn't exclude water: a
   first attempt at the "trees near the crest line" variant teleported FOOT onto open water near the quay
   (`isSea` true at the chosen spot). Walking stalled completely — `d` and even `depotDist` stayed frozen
   for the full 75 game-s with no error, which would silently produce a bogus "SUMMARY ... max lift change
   0.3" false pass if unnoticed. Fixed in the new scenario (checks `isSea`/`isWater` along the line and at
   the final spot, fails loud if the start point is wet). Worth the same guard in any future crest/line
   search scenario.
2. [G1][info] Couldn't find a tree-dense crest near the default spawn: two 24-angle × 4-distance searches
   (up to 600 m out) scored 0 tree-hits within 15 m of the walking line every time — the ridgelines near the
   starting depot are open ground, not forested. **The "column over a crest while walking through trees"
   sub-case from the backlog (follow-up to v106/v134) is still unverified**, not because it's broken but
   because this search strategy can't reach it from spawn. Next pass should anchor the search near a known
   forest patch instead of spawn-relative (e.g. walk/teleport well inland first, then search for a rise).
3. [G1][info, positive] Standing near the depot on flat ground (no crest, sled parked 250 m out) at hour 11,
   the sled's guide beam renders as a thin vertical white column visible from well over 200 m away (clearly
   seen in d_depot_start.jpg / e_depot_near.jpg) with no clipping, flicker, or interaction glitch with
   nearby buildings/gas-station signage in frame. Didn't observe the depot's own cargo beacon lit in this
   run (no cargo claimed), so beacon-vs-column overlap specifically is still untested — would need a run
   with `GS.load` populated to force `depot.beacon.visible`.
4. [G1][low, harness] In `g1_sledpin_depot.mjs` the beacon-position screen projection (`depot.beacon`
   unprojected through `camera`) returned nonsense row values (2000–2900, off a 720-tall viewport) even
   though the column/pin projection worked fine with the same math — likely `depot.beacon`'s world position
   isn't what the three.js matrix expects (parented transform vs. world, or the mesh wasn't actually visible
   so renderer skipped updating its matrix). Scenario-only artifact, not a claim about game rendering;
   flagging so a future pass doesn't trust that projection without checking `beacon.visible` and calling
   `updateMatrixWorld` first.

## Ideas
- Re-run the depot-beacon overlap check with actual cargo loaded (`GS.load` populated) so the beacon is
  genuinely lit, and fix the `updateMatrixWorld` issue in the harness before trusting beacon screen position.
- Point the "trees near crest" search at a known forest coordinate (grep the "forest cell with trees round
  it" comment near line 12518 for a usable anchor) instead of searching outward from spawn.
