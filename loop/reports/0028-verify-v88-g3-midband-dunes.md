# 0028 — Verify v88 (G3): mid-distance dunes on the open fell — main @ 74c3219 (code 74c3219, script v88)

Scenario: `tools/playtest/scenarios/g3_midband.mjs` (unchanged, existing) + `tools/playtest/bandstats.py` +
`tools/playtest/imgstats.py`. Shots: `~/.hermes/cache/scratch/tlloop/reports/0028.jpg` (sheet of 5). Raw
stills: `~/.hermes/cache/scratch/tlloop/0028/`.

Focus: verify the builder's latest landing (07:25 pass, "Mid-distance dunes on the open fell", G3, hash
74c3219, v88) — the only landing since report 0027, and G3 also had the fewest of the last 3 reports
(0025 G1, 0026 G2, 0027 G2), so both rules point the same way this pass.

## Findings

1. [G3][info][confirms landing] **v88's numbers reproduce on a fresh run.** Same pinned backcountry spot
   from `SPAWN` (`-1637,-1943`, matches PROGRESS). Strip-3 local contrast (horizon → ~30 m band,
   `bandstats.py` column index 2 of 8): Nov backcountry **4.68** (PROGRESS claimed after-value 4.69), March
   **4.28** (claimed 4.29), low fixed camera across the sun **1.10** (claimed 1.11), away from the sun
   **0.27** (claimed 0.25, unchanged — flat light, as expected). All four numbers land within run-to-run
   noise of the builder's claimed after-values. Not a false landing.

2. [G3][info] **Whole-still local contrast (`imgstats.py`) also lines up:** 05 backcountry **3.88** vs
   PROGRESS's claimed 3.42→4.08 (inside the range), 06 March **3.52** matches the claimed 3.52 exactly.
   Saturation is higher on the three low fixed-camera shots (07/08/09: 31–38) than the two game-camera
   shots (05/06: 21–25) — expected, the low camera catches more of the colored sky near the horizon, not a
   regression.

3. [G3][info][visual check, looks good] **Judged the stills with vision at normal and zoomed-in crops.**
   Both the game-camera backcountry shots and the low across-sun fixed-camera shot show visible dune/drift
   shading in the mid band — elongated, wind-stretched diagonal streaks, not the flat wash from before v88.
   At normal contact-sheet size and at a ~2x zoom crop, I did **not** see the "repeated uniform oval blobs"
   LOOP.md's slice-8 follow-up flags — the streaks read as natural, stretched relief. That follow-up may
   only show at full resolution / closer camera distance than this pass used; worth a tighter macro crop
   (e.g. a camera at 20–40 m instead of 120 m look-distance) before deciding it's fixed or still open.

4. [G3][low][unchanged, as expected] Away-from-sun strip-3 contrast stayed flat (0.27, same as before v88)
   under flat lighting — this matches PROGRESS's own note that this view is expected to be unaffected by a
   relief term (no shading gradient without directional light), so it's not a missed spot, just the
   lighting-dependent nature of the effect.

## Suggested next step
Leave the "oval hollows" item on the backlog but note in it that a normal-viewing-distance check (this
report) doesn't show the artifact — the builder should use a closer macro camera (~20–40 m look-distance)
before spending more time stretching the noise term, in case it's already resolved at play distance.
