# 0087 — v148 pine branch tips at ride distance + GFX low FPS in a dense stand (G3) — main @ 9798caf

Scenario: tools/playtest/scenarios/g3_pines_ride.mjs (new, committed with this report)
Shots: ~/.hermes/cache/scratch/tlloop/reports/0087.jpg (contact sheet, 8 stills), 0087_detail.jpg (full-res
near-approach still)

Focus: v148 (pass 95, landed 9798caf) gave pine tiers a jagged drooping-tip hem instead of a lampshade cone
and measured it with close-up stills (7/14/30 m); PROGRESS left two things for the playtester: judge the
tips at real ride distance (the chase cam, not a parked close-up) and check FPS on GFX low in a dense
stand. This pass rides the real (uncustomized) chase camera 45 m into, through and out of the same kind of
dense flat pine stand `g3_pines.mjs` searches for, then sits still in the stand and measures FPS at both
default and `?gfx=low`.

## Findings (most important first)

1. **[G3][info] The branch-tip hem reads at ride distance, but as a zigzag/chevron edge, not visibly
   "drooping branches."** 0087_detail.jpg (near-approach still, large tree ~14 m out while riding at 42
   mph): each tier shows a clear sawtooth silhouette — alternating up/down points — breaking the old flat
   cone edge. It doesn't read as individual hanging branches at this distance/speed (that detail needs the
   7 m static stills v148 already has), but it's a visibly less geometric, more organic tree shape than
   before, consistent across all 6 ride-through stills (ride_01 through ride_05). No popping, no seams
   between tiers, snow caps still sit as smooth scallops distinct from the jagged green hem below (matches
   PROGRESS's open question — the snow caps do read a little too smooth next to the now-jagged green, but
   not badly; low-priority cosmetic, not a regression).
2. **[G3][med] FPS in this dense stand is ~3.2x higher at GFX low than at default (30 fps vs 9.5 fps),
   measured by RAF-count over 2 wall-s sitting still in the stand** (`fps_default` 9.5 @ `{low:false, pr:1,
   treeR:1700}`, `fps_low` 30 @ `{low:true, pr:1, treeR:750}`). Caveat: this is headless Chrome on
   SwiftShader software rendering, so the absolute numbers are not real frame rates on Lemon's hardware —
   but the *relative* gap (treeR 1700 vs 750, i.e. 2.3x more trees drawn at default/high) is a real signal
   that a dense stand is meaningfully heavier at high settings. No prior report has this low/high stand
   comparison on record; flagging as new backlog info rather than a bug (v148 added geometry but didn't
   change LOD/instancing, so this is likely the stand's existing cost, not a v148 regression — can't prove
   that without a before/after on pre-v148 code, which this pass didn't do).
3. **[G3][info] No visual glitches riding through**: no floating tips, no z-fighting between tiers, no
   LOD pop as the stand went from far (ride_01, ~35 m) to inside (ride_04). Sled stayed clear of trunks the
   whole pass (0/1 stuck, mph held 40-43 throughout, matches `g1_forest`/`g3_camtree` pace for this kind of
   stand).

## Verified since last time
- v148 (pass 95, pine branch-tip hem): close-up stills already verified by the builder; this pass adds the
  ride-distance view the builder's own "Next" line asked for. Reads as intended (less boxy), hem detail is
  present but subtler at speed than at a parked 7 m — expected, not a problem.

## Ideas
- If a future pass wants the FPS number to mean something for Lemon's own hardware, it needs a non-headless
  (real GPU) comparison; headless/SwiftShader numbers are only useful as a relative high-vs-low signal.
- Snow-cap scallops could get the same jagged-edge treatment as the green hem now has, if a later G3 pass
  wants full consistency (low priority — not jarring as is).
