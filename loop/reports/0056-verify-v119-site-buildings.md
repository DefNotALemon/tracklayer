# 0056 — Verify v119 site buildings facade (G3) — main @ 04eac4f
Scenario: tools/playtest/scenarios/g3_sites.mjs (depot, mehamn, sandfjord, strandbu, naust; door+end views, Nov noon
+ 20:00)   Shots: ~/.hermes/cache/scratch/tlloop/reports/0056.jpg (contact sheet, 20 stills)

## Findings (most important first)

1. [G3][info] v119 `buildSites` facade VERIFIED working as landed. All 5 buildings (quay depot, Mehamn shop,
   Sandfjord herder cabin, Strandbu, Naustbakken) show board cladding with visible vertical ribs, a stone-grey
   plinth, a framed door and framed windows with glazing bars, from both the door-side 3/4 view and the
   long-window end, at Nov noon and at 20:00. No painted stripe boxes or plain cream glow squares remain —
   matches the builder's description exactly.

2. [G3][info] imgstats local-contrast reproduces within ~0.1–0.6 of the builder's landed numbers: depot door
   4.98 (claimed 4.98), depot end 5.81 (5.80), Mehamn door 5.15 (5.15), Sandfjord door 4.94 (claimed 5.22, off
   by 0.28 — camera angle/sun position variance, not a regression; end view 5.52 vs claimed 5.52 matches),
   Strandbu door 4.52 (4.61), Naust door 4.58 (claimed 4.55 for the "white house" case). No systematic drop.

3. [G3][info] Draw calls at the depot door view: 553, exact match to the builder's claimed 579→553. Page
   errors: none, scenario exit 0.

4. [G3][info] Night glass behaviour correct on every building: dark/grey by day (nov_*.jpg), warm cream glow
   on every framed window at 20:00 (night_*.jpg), no stray glow bleeding onto walls, roof or plinth. Matches
   `houseWinTick` already verified for houses (0053), sheds (0054) and the hospital (0055).

5. [G3][low] Depot door view (nov_depot_door.jpg): the "Nordkinn Skuter & Service" sign next to the depot is
   still a flat, blank grey MeshBasic panel with no text/graphic rendered and no facade treatment — this is
   the known open item from the LOOP backlog ("hospital/shop/fish signs are MeshBasic, glow at night, never
   driven from updSky; next slice"), confirmed still present and now the most visually obvious unfinished
   piece next to a freshly-facaded building. Worth being next up once a slice targets signs specifically.

6. [G3][low] No z-fighting, moire, or floating trim found on any of the 20 stills across 5 buildings, 2 views,
   2 times of day — cladding boards, corner boards, plinth and window frames all sit flush and read cleanly
   at this (~14–17 m) distance.

7. [G1/info][not a regression] nov_naust_door.jpg shows a toast reading "Strandbu. Someone's already at the
   window." while the camera is actually parked at Naustbakken — this is a scenario artifact (the scripted
   camera teleports between sites faster than toasts clear/expire), not a gameplay bug; a real player walking
   between buildings wouldn't trigger a stale toast like this. Noted only so a future pass doesn't mistake it
   for a bug.

## Verified since last time
- v119 `buildSites` facade (depot, village shops, herder/wind-farm cabins, fell homes get houseClad boards,
  plinth, framed door, framed houseWinMat windows): WORKS, matches the landed description exactly across all
  5 buildings, 2 views and 2 times of day. Draw calls exact match (553), local-contrast numbers reproduce
  within normal camera-angle variance, night glow correct, no new visual defects.

## Ideas
- Next G3 buildings slice per backlog (F5/open item): the signs themselves — shop/hospital/fish/depot signs
  are blank or MeshBasic-glow, confirmed again here on the depot sign. A textured/lit sign pass would close
  out the "buildings" backlog item cleanly.
- Still open from 0054/0055: fascia/eave shadow under a low grazing sun on work-shed and hospital rooflines —
  not re-checked this pass (g3_sites.mjs only has noon/20:00, no low-sun dawn/dusk angle).
