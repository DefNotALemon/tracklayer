# 0083 — v147 chase-cam/pine-dither follow-up: close chase + night (G3) — main @ 627a385
Scenarios: tools/playtest/scenarios/g3_camtree.mjs (CT_VIEW=1), tools/playtest/scenarios/g3_camtree_night.mjs (new)
Shots: ~/.hermes/cache/scratch/tlloop/reports/0083.jpg

Focus: verify builder pass 92 (v147, landed 21:30 this run cycle — camera-canopy clip fix + breezeMat screen-door
dither within 2.6 m). The builder's own "Next" note asked for: dither in motion, close chase (`CT_VIEW=1`), on foot
in a forest, first person brushing a pine, at night. This pass covers close chase and night; on-foot/FP is left open
(see Ideas).

## Findings (most important first)
1. [G3][info] Close chase camera (`CT_VIEW=1`, tighter trail distance than the default chase) stays clear of pine
   canopies across all 4 runs in both dense stands: 0/4 frames inside a canopy, 0/4 frames under 0.3 m, min
   clearance 0.57–5.46 m over 3,688 sampled frames. Same result as the default chase view in report 0081/PROGRESS
   (v147): the fix generalizes to the tighter camera distance, not just the default one. No regression.
2. [G3][low] At night (`GS.hour = 0`, same two dense stands, same approach angles), riding straight through holding
   W never pushed the camera inside a canopy either — no crash, no stuck frame, bursts of 6 consecutive stills at
   ~130 ms game-interval around the closest point (frames n0/n1/n2/n3) all show clean sightlines between trees, no
   solid dark slab filling the screen (0083.jpg rows 1–5). Nothing to fix; the camera-clip guard is lighting-
   independent as expected (it's a world-space clearance check, not a shader thing), so it holds at night too.
3. [G3][low] Couldn't actually SEE the breezeMat dither pattern itself in a still: the one close-chase frame that
   sampled min 0.6 m (r1, inside the 2.6 m dither band) shows the canopy edge as a smooth pale-green gradient at
   the frame edge, not a visibly dotted/screen-door texture (0083.jpg row 7, top-right). Two explanations that both
   point the same way — either the per-pixel IGN dither is fine-grained enough to read as smooth at 1280×720/JPEG
   (likely, by design per PROGRESS: "stable per-pixel IGN, gone by 0.8 m"), or the chase camera's own clip guard is
   now so effective that it rarely lingers inside 2.6 m long enough for the dither to matter in practice — which
   would mean the dither code is a safety net that's barely ever exercised. Not a bug, just unproven visually;
   worth a dedicated still (force camera to sit at a fixed 1.0 m from a canopy for 2+ s) if the builder wants a
   real before/after on the dither texture itself rather than inferring it from the clearance numbers.
4. [G3][low] No shimmer/crawl artifact visible across the 6-frame night bursts (closest thing to "dither in
   motion" this pass could capture): frame-to-frame the trees look stable, same silhouettes, no popping foliage.
   Consistent with finding 3 — the camera wasn't actually inside the dither band during these runs either.

## Verified since last time
- v147 (pass 92, chase-cam canopy clip + dither): clean at close chase and at night — see findings 1–2. No new
  issues found; the existing fix is robust across camera modes and lighting.

## Ideas
- A scenario that deliberately PINS the camera 1.0–1.5 m from a canopy for a couple of seconds (rather than letting
  the normal chase-cam clip logic push it out) would be the only way to actually judge the dither pattern itself in
  a still, since the fix is now good enough that the camera rarely lingers there during normal play.
- Still open from v147's own follow-up list: on-foot in a forest, and first-person brushing a pine (FOOT.on view,
  not sled chase cam) — different camera path than tested here, left for a future pass.
