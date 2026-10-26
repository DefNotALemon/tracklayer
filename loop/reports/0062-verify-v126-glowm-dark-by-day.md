# 0062 — Verify v126 glowM dark by day (G3) — main @ 16d1d77
Scenario: tools/playtest/scenarios/g3_glow.mjs   Shots: ~/.hermes/cache/scratch/tlloop/reports/0062.jpg

## Findings (most important first)
1. [G3][low] Fuel pump display face stays a flat grey panel by day (no digits/texture), unchanged by v126 — this
   is the already-known follow-up noted in PROGRESS.md, not a regression. nov_2/3/4.jpg vs night_2/3/4.jpg.
2. [G3][low] The g3_glow.mjs ferry target (i=1, n=100 meshes) actually frames the tackle-shop building's eave
   windows, not the pinned ferry hull itself — camera placement picks the "middle" mesh of that group, which
   lands on a house, not a porthole. Numbers still check out (see Verified below) but if the builder wants to
   specifically eyeball ferry portholes, retarget this shot to a mesh whose top-level parent is the steamer
   object, not the quay building group it shares a scene branch with. nov_1.jpg/night_1.jpg.
3. [G3][low] No seam/pop or double-glow artifacts seen on any of the 5 targets (church, tackle-shop windows,
   3 pump displays) across the noon→night transition. Nothing to fix here.

## Verified since last time
- v126 (KIT.glowM follows houseWinMat day/night colour): reproduced independently. Draw calls 103/103 (matches
  builder's 103→103), triangles 22,060,742 both times (no extra geometry leak). Vision on the contact sheet:
  church/tackle-shop windows read as dark shaded glass at Nov noon (12:02) and warm bright glow at night (21:01);
  same for all 3 fuel pump displays — orange body unchanged, grey display face at noon, lit cream square at
  night. No washed-out or missing glow, no wrong colour. v126 is solid; no regression.
- v125 (lamp globes stop glowing at noon): not independently re-run this pass (g3_lamps.mjs was the builder's own
  verification tool and nothing in v126's work touches lamp heads); flagging it unverified-by-playtest rather
  than re-claiming it clean. Next playtest pass on G3 should run g3_lamps.mjs cold to close that gap.

## Ideas
- Station pump displays: a faint digit/readout decal at day would make the "grey panel" read less blank (low,
  cosmetic, backlog already has this as a leftover).
