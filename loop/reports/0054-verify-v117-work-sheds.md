# 0054 — Verify v117 work sheds (garage, freight, fish buyer) (G3) — main @ 87d82a0
Scenario: tools/playtest/scenarios/g3_sheds.mjs   Shots: ~/.hermes/cache/scratch/tlloop/reports/0054.jpg

## Findings (most important first)
1. [G3][info] v117 work sheds VERIFIED working as landed. Garage (dark corrugated cladding + light ribbed
   gable, white fascia roof edge, grey roll door with horizontal panel lines, framed service window, concrete
   plinth), pier freight shed (red board cladding, white curb, white fascia, 2 framed windows + door visible
   in frame, matches builder's "7 framed windows, framed slide door" description from other angles) and fish
   buyer shed (white/grey corrugated cladding, blue door, framed window, FISKEMOTTAK sign) all read clearly
   at the 13–14 m door-side distance the scenario frames them at. No z-fighting, no moire, no floating trim on
   any of the 9 stills (3 buildings × Nov noon / March noon / 20:00).
2. [G3][info] Night glass confirmed correct on the garage (night_garage.jpg): the one service window glows
   warm yellow, the rest of the dark cladding stays dark, no stray glow on the roll door or roof. Matches
   `houseWinTick` behaviour already verified for houses in report 0053.
3. [G3][low] draw-call count reproduces exactly: `info_quay` 877 (builder landed 869 → 877) — no regression.
4. [G3][low] The garage/freight-shed roofline (nov_freight.jpg, zoomed) shows a thin projecting fascia edge
   but it's hard to tell apart from a flush join at noon overhead sun — no shadow line under the eave to
   confirm real 3D depth vs. a painted edge. Not clearly wrong, just worth a grazing-light (low sun) still
   next time someone works roofs, to see whether the soffit casts any shadow at all.
5. [G3][low] Backlog's "still plain: hospital, village/cabin sheds, depot itself" note was not re-verified
   this pass (out of scope for g3_sheds.mjs, which only names the 3 buildings v117 touched) — still an open
   item, not confirmed stale.

## Verified since last time
- v117 work sheds (`workShed()`, `shedMetalTex`, `houseWinMat` service windows): WORKS, matches the landed
  description exactly. `page errors: none`, scenario exit 0, numbers reproduce (draw calls 877).

## Ideas
- Next G3 buildings slice: hospital, village/cabin sheds, or the depot itself (backlog already lists these).
  A grazing-light (dawn/dusk sun angle, not the fixed noon/20:00 this scenario uses) pass on the sheds' rooflines
  would settle whether the fascia reads as a real 3D overhang or a flat paint line.
