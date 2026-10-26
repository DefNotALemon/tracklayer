# 0058 — Verify v121 garage name boards (G3) — main @ c3b62eb

Scenario: tools/playtest/scenarios/g3_garage_sign.mjs (forecourt 3/4, post sign square-on, roll-door board
square-on, 34 m ride-in approach; Nov noon + 21:00)
Shots: ~/.hermes/cache/scratch/tlloop/reports/0058.jpg

## Findings (most important first)

1. [G3][info] v121 garage name boards VERIFIED working as landed. renderer.info at the forecourt view: 636
   draw calls, exact match to the builder's claimed 636 (was 634 before). The forecourt post sign
   ("NORDKINN SKUTER & SERVICE") and the over-door board ("NORDKINN / SKUTER & SERVICE / SLEDS · PARTS ·
   KIT · REPAIRS") both read crisp and correctly oriented from the forecourt approach, no longer blank —
   confirms 0056 F5 is closed.
2. [G3][info] Readable at all four tested distances/angles (forecourt, post square-on, door square-on, and
   the 34 m ride-in approach) at both Nov noon and 21:00. At the ride-in distance the door board is small
   but legible; the post sign reads clearly. No garbling, no blur-to-illegible at range.
3. [G3][info] Night glow (0.2) looks right: both boards sit in the scene without blowing out, readable
   against the dark building, no halo/bloom artifact; matches the builder's "cut from 0.3 after first
   looking too bright" note — correct call, the lower value reads natural.
4. [G3][info] No z-fighting, no floating edges — post board sits flush on its timber frame, door board
   flush over the roll door with consistent shading on both faces (checked front/back via the forecourt and
   post views, which see opposite faces).
5. [G3][low] Post sign's top "NORDKINN SKUTER & SERVICE" band is noticeably smaller/thinner than the main
   door board's text at the same real-world letter height spec — at the 34 m ride-in distance it's legible
   but faint compared to the door board's bold red band. Not a bug, just lower contrast; a tester approaching
   from the post side specifically (not tested here) might miss it before getting close.
6. [G3][low] `page errors: none`, scenario exit 0 both passes. No regression to earlier G3 landings spotted
   in the surrounding scene (other building facades, signs from 0119–0120 still correct in frame).

## Verified since last time
- v121 garage name boards (`garageSignTex()`, both post faces + over-door board): WORKS, matches the landed
  description. 0056 F5 (blank forecourt panel) is resolved. No stills looked worse than before.

## Ideas
- Backlog's next buildings item: fuel stations/cabins (`buildStations`/`buildFuelCabins`) still unchecked —
  no facade/signage pass has touched them per 0054–0057's running note.
- House roof eaves (0053 F1: no projecting fascia at gable ends) and low-sun roofline fascia reading as a
  flat paint line (0054 F4) are both still open and untouched since first flagged.
- Would be worth a dedicated approach-from-the-post-side still (closer, not just the square-on post shot)
  to confirm the thinner top band reads from the angle a player riding past on the shore road would actually see.
