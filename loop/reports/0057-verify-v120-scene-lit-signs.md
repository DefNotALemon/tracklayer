# 0057 — Verify v120 scene-lit signs (G3) — main @ 533c49a
Scenario: tools/playtest/scenarios/g3_signs.mjs (school, pylon, cabin, shop, buyer, hosp, hosph, pad; noon/dusk/night)
Shots: ~/.hermes/cache/scratch/tlloop/reports/0057.jpg

## Findings (most important first)
1. [G3][info] v120 `signMat` VERIFIED working as landed. All 8 signs read clearly at noon, dusk and night with
   no garbling, no black/broken panels, no bright halo or bloom artifact. `signstat.py` night sign/frame ratios
   reproduce within ~0.02–0.07 of the builder's landed numbers: hosp 2.24 (claimed 2.17), shop 2.30 (2.25),
   school 0.52 (0.50), fuel cabin 0.19 (0.19), fuel pylon 0.84 (0.83), fish buyer 0.74 (0.72). No regression.
2. [G3][info] Lit signs (helsesenter board + blue H box, fuel pylon "DRIVSTOFF" price board, helipad H) visibly
   brighten from dusk through night in the stills: the H box goes from a flat blue square at noon to a glowing
   sky-blue box at night; the fuel pylon price board goes from dark navy at noon to a bright glowing orange card
   at dusk/night; the helipad H goes from dull mustard under the noon sun's own shading to a clean saturated gold
   glow at night. Matches the builder's intended glow tiers (H boxes 0.6, pylon 0.55, helsesenter 0.45, helipad 0.12).
3. [G3][info] Unlit signs confirmed correctly inert: the fuel cabin's "DRIVSTOFF 4.00" board looks essentially
   identical in brightness across noon/dusk/night (no glow, by design) — no stray emissive bleed found.
4. [G3][info] School sign ("NORDKINN FRAKT / Sjåførskole") and fish buyer "FISKEMOTTAK" sign both read as subtly
   lit at night vs. shaded at noon, consistent with their low glow values (0.2 and 0.25) — neither looks dead nor
   blown out.
5. [G3][low] `page errors: none`, scenario exit 0. No FPS/draw-call regression check done this pass (not part of
   `g3_signs.mjs`'s own numbers); worth folding into a future G3 pass per the backlog's standing GPU-cost note.
6. [G3][low] Depot/garage name board ("Nordkinn Skuter & Service", report 0056 F5) was not in this scenario's
   building list — still unverified/unbuilt; remains the open buildings item.

## Verified since last time
- v120 scene-lit signs (`signMat`, glow faded in by `houseWinTick`): WORKS, matches the landed description —
  lit signs glow softly from dusk, unlit boards stay flat all day, no artifacts on any of the 24 stills (8
  signs × 3 times of day).

## Ideas
- Next G3 buildings/signs item per backlog: the depot/garage name board itself (0056 F5), and fuel
  cabins/stations generally (still unchecked per 0054/0055/0056 running note).
- A GFX-low-vs-high FPS/draw-call comparison for the new sign materials would close the standing "GPU cost"
  follow-up the backlog keeps asking for on G3 visual slices.
