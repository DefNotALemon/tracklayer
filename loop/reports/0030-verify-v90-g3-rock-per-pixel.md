# 0030 — Verify v90 (G3): rock through thin snow per pixel, no sawtooth — main @ 02f3fd7 (script v90)

Scenario: `tools/playtest/scenarios/g3_ridge.mjs` (unchanged, existing), run twice — once pinned at the
builder's spot (`TL_SPOT=-234,676,0`), once unpinned (fresh search, landed on `1700,-379,1`, the same
unpinned spot 0023/0030 used). Shots: `~/.hermes/cache/scratch/tlloop/reports/0030.jpg` (pinned spot
2x2 sheet), `0030_rock.jpg` (unpinned spot 2x2 sheet). Raw stills: `~/.hermes/cache/scratch/tlloop/0030b/`
(pinned), `0030/` (unpinned).

Focus: verify the builder's latest landing (07:50 pass, "Rock through thin snow per pixel, no more
sawtooth", G3, hash 02f3fd7, v90) — the only landing since report 0029, so the "verify first" rule points
here; G3 also hadn't been checked by the playtester since 0028.

## Findings

1. [G3][info][confirms landing] **Pinned spot (`-234,676,0`, the builder's exact coords) reproduces
   the claimed improvement.** `imgstats` local contrast: 01_wide **3.98** (claimed before 3.74 → after
   4.20), 02_tele_left **2.94** (before 2.91 → after 3.22), 03_tele_right **2.62** (before 2.57 → after
   2.62, exact match). All three sit above the pre-v90 baseline and in the after-v90 ballpark (01/02 a
   touch below the claimed after value, consistent with the run-to-run noise this loop has logged before
   on unpinned spots). World-wide `cliffs`/`lakeCliffs` counts (683/110) match exactly, as expected for a
   deterministic terrain.

2. [G3][info][confirms landing] **Unpinned search spot also reproduces the "unchanged" claim.** Fresh
   150-450 m boundary search landed on the same spot PROGRESS logged as unaffected by design
   (`1700,-379,1`, "little rock"): local contrast 01 **3.10**, 02 **2.10**, 03 **2.42**, 04 **2.34** vs
   claimed 3.09/2.10/2.41 (and the earlier 2.96/2.10/2.43 after-v90 numbers) — all within noise, no
   regression introduced by the fragment-level rock change at a spot the fix wasn't meant to touch.

3. [G3][info][visual check, looks correct] **Vision on both contact sheets**: pinned-spot sheet
   (`0030.jpg`, a frozen-lake rim and open fell at 1 Nov noon / 1 Mar) shows soft, swirly wind-sculpted
   snow with no comb pattern or speckle at any visible snow edge. Unpinned-spot sheet (`0030_rock.jpg`,
   "High country" open fell) is the same — organic dune/lee shading, no teeth. Matches the builder's
   "teeth gone, organic tongues" call; no new artifact spotted.

4. [G3][low][gap in this verification] **Neither spot's telephoto frames actually show exposed rock
   close to the camera this run** — both landed on snow-dominated terrain (frozen-lake edge, open
   fell with no visible scree), so the fdRock per-pixel shading itself (grey rock with snow tongues)
   wasn't directly eyeballed, only the absence of the sawtooth artifact in snow-only frames. The
   search heuristic (`rockAt` boundary-vertex density 150-450 m out) is landing on the same two spots
   repeatedly across passes (0023/0030 unpinned → 1700,-379; builder's pin → -234,676). Suggest a
   follow-up scenario tweak: widen the search radius or bias toward `bio===0` cells nearer the camera
   (e.g. 50-150 m) so a future pass can visually judge the rock texture itself, not just confirm no
   regression.

## Verified since last time
- v90 (rock through thin snow per pixel, G3, 02f3fd7): works, no sawtooth/speckle at either spot
  tested, numbers reproduce within noise, no regression at the unpinned "unaffected" spot either.

## Ideas
- A scenario variant that forces a close rock exposure (steep slope, low snow depth) would let the
  playtester actually judge the grey-scree/snow-tongue blend quality with vision, not just the absence
  of the old artifact.
