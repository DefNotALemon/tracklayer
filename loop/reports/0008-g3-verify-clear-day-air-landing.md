# 0008 — verify v65 "clear-day air" landing (G3) — main @ e766448
Scenario: tools/playtest/scenarios/g3_day.mjs (reused, unchanged)
Shots: ~/.hermes/cache/scratch/tlloop/reports/0008.jpg (sheet), raw stills ~/.hermes/cache/scratch/tlloop/0008/

## Verified since last time
- "Clear-day air: thinner, cool-blue haze" (5085562, G3, script v65): re-ran `g3_day.mjs` unchanged on fresh
  origin/main, pinned clear weather. Sun rig matches the builder's log exactly: fog density 0.00119 (log
  0.00119) at both Nov noon and March noon, fog colour `adb8cd`→`b5c7dd` across the two runs, sunDirY
  0.215/0.218 (log identical). imgstats vs the builder's log: quay std 52.6 (log 52.4), local contrast 4.45
  (log 4.41); backcountry Nov std 40.6 (log 40.2), local 2.80 (log 2.78); backcountry March std 40.9 (log
  40.9, exact), local 2.71 (log 2.71, exact); sled close-up std 51.5 (log ~unchanged from v62's 51.2, matches).
  page errors: none. `grep` confirms `GFX.fogK` (low-preset extra-haze multiplier, previously dead) now has
  a live consumer at tracklayer.js:4570. Vision on the sheet (0008.jpg): quay/toward-sun/sun-behind/sled-closeup
  shots show warm sunlit snow, clean blue-grey sky, long house/sled shadows, no seam between fog and sky colour,
  no artifacts. **Confirmed landed and working, no regression.**

## Findings (most important first)
1. [G3][med] Backcountry (05_backcountry_day, 06_backcountry_march) still reads flat and washed out next to
   the village shots — lowest std/local-contrast of all six (40.6/2.80 and 40.9/2.71 vs quay's 52.6/4.45) and
   visibly almost textureless snow to the horizon, no sun disc, minimal shading under the rider. This is
   exactly the queued "daylight slice 3" item (LOOP.md G3: snow surface relief in `patchMat`, more daytime
   saturation, sun glow away from the sun) — confirmed still open after v65, slice 2 (fog/haze) only moved
   the numbers where there's nearby geometry to light. Nothing new to add; this is the right target still.
2. [G3][low] A tiny village silhouette is visible in the far background of both backcountry stills (05, 06) —
   matches the known `g3_day.mjs` teleport bug noted in the v65 PROGRESS entry (05/06 land ~0.31 km from the
   quay, so "backcountry" is really town edge). Not re-measuring distance this pass since it's already logged
   as part of the slice-3 backlog item with a concrete fix needed in the scenario; flagging only as confirmation
   it's still present so slice 3 doesn't get built/measured against a still that isn't really backcountry.
3. [G3][low] HUD badge at the quay (01_quay_day) still reads "OPEN BACKCOUNTRY" standing right next to the
   buildings — fifth confirmation of the zone-boundary quirk from reports 0004–0007, no new information.
4. [G1][info] Not this pass's focus: village figures/buildings in 01–04 look intact, no regressions from the
   fog/colour change spilling into town rendering.

## Ideas
- When slice 3 lands, fix `g3_day.mjs`'s backcountry teleport first (the candidate-ring loop apparently never
  moves P, or the ride snaps back) so the "after" stills are measured in true backcountry, not town edge —
  otherwise the new relief/saturation work will be judged against the wrong terrain.
