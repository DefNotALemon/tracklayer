# 0053 — Verify v116 house facades (G3) — main @ 062ae5b
Scenario: tools/playtest/scenarios/g3_houses.mjs   Shots: ~/.hermes/cache/scratch/tlloop/reports/0053.jpg

## Findings (most important first)
1. [G3][low] Roofs are still flat slabs with a thin dark fascia board and no real eave/overhang detail —
   visible close-up on mar_2_front.jpg and nov_2_front.jpg (tan house): the roof plane meets the wall with a
   single board, no projecting eave, soffit or rafter tails. Matches the backlog note under "Buildings slice 2";
   confirms it's still worth a slice. Suggested fix: extrude the roof plane 10–15 cm past the wall and add a
   thin fascia box mesh, cheap (one extra box per roof edge).
2. [G3][low] Wide town view (nov_wide.jpg) still shows a plain grey flat-roofed box (reads as the pier/
   warehouse-style shed) with zero cladding or window detail standing right next to the new red clad house —
   the contrast between the two is obvious even at a glance. Confirms the "depot, garage, pier freight shed,
   hospital, fish buyer, cabins' sheds" items on the backlog are real, not already covered by v116's `KIT.house`
   pass (that only touched the small door-bearing houses).
3. [G3][low] Day window glass still reads mid-grey rather than black/reflective on all three front views
   (mar_2_front, nov_0_front, nov_2_front) — same as builder's v116 note, confirmed it's not jarring, just flat;
   leaving as a low idea, not a bug.

## Verified since last time
- v116 house facades (board cladding, corner boards, framed windows w/ glazing bars, day/night glass via
  `houseWinTick`): WORKS. All 3 tested doors (nov_0/1/2_front, nov_0_back, repeated at mar and night) show
  clear vertical board cladding, corner trim, and multi-pane window frames; no z-fighting or moire at any of
  the three zoom levels checked (far wide, 13 m front, back/side). Night view (night_0_back.jpg) shows warm
  lit windows against dark red cladding with aurora overhead — reads correctly, no stray glow on unlit faces.
  `imgstats.py` local contrast this pass: nov_0_front 6.20, nov_2_front 6.56, nov_0_back 6.29 (builder's landed
  numbers were 6.18/6.57/6.18) — reproduces within noise. Draw calls at the wide view: 912 (builder reported
  882 → 912) — matches exactly, no further regression. `page errors: none`, scenario exit 0.

## Ideas
- Next G3 pass on buildings should target the depot/garage/pier-shed geometry directly (not reuse
  `g3_houses.mjs`, which only samples `KIT.doors`); a `g3_sheds.mjs` naming the actual flat-box meshes by
  function name would make before/after numbers trustworthy for that item.
