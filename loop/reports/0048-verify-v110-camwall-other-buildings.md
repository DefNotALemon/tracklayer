# 0048 — Verify v110 camWallClip follow-up: garage and quay shed (circle-footprint buildings) — main @ 0e665a2
Scenario: tools/playtest/scenarios/g3_camwall_other.mjs (new)   Shots: ~/.hermes/cache/scratch/tlloop/reports/0048.jpg

## Verified since last time
- v110 (0e665a2, `camWallClip`): the open follow-up note on the backlog item ("other buildings — depot/quay sheds,
  garage, shops, cabins, church — keep circle footprints, so the camera may still end up just inside them") is
  **not reproduced** at the two concrete non-house buildings in code (garage service shed, quay freight shed; both
  built with plain `addOb` circles, no `.box`). Standing 1.0 m (foot) / 2.2 m (sled) out from each building's door
  face, facing away so the chase camera trails back into the wall — the same setup that found 8/8 clips before v110 —
  now reads `inOb` **0/2 for both foot and sled** at both spots, and the stills are clean (open yard / water / sky
  behind the rider, no screen-filling flat wall). The church is also safe but for a different reason: `buildTown`
  constructs it with `KIT.house(...)` (line ~9317), so it already carries the real `.box` wall test v110 added, not
  a plain circle.
- Read the actual geometry (`buildTown`, tracklayer.js ~9279-9357) rather than guessing: garage circles are `r=1.5`
  on a 2.2 m grid over an 11×8 m footprint; the quay shed's are `r=2.2` on a sparser grid over 9×14 m. Both grids
  are dense/large enough relative to the chase-cam trail distance (4.6–7.8 m) that the camera lands past the far
  edge of the circle coverage before it would overlap a wall — unlike the old house grid (`r=1.35` circles that
  stopped up to 1.5 m short of the actual wall line), which is what v110 was fixing in the first place.

## Findings
(none — this pass is a clean verification, not a new finding)

## Ideas
- The backlog item's "shops, cabins" wording is already covered: village/town cabins and the general store are all
  built through `KIT.house(...)` too, so they inherit `.box`. The only remaining unverified structures with plain
  circle footprints I could find by reading `buildTown`/`buildSites` are the firewood/fuel-drum props (r 0.5–0.9,
  too small to matter) and the coastal ferry's hull obstacles (`ship: true`, at the quay, moving) — worth a quick
  check if the builder wants this item fully closed, but low priority given two real buildings now test clean.
- Recommend closing (or downgrading to very-low) the "G3/G1 follow-up to v110 camera wall clip" backlog item: the
  two concrete non-house buildings named in it don't reproduce the bug, and the rest are either already covered
  via `.box` or too small to clip a camera.
