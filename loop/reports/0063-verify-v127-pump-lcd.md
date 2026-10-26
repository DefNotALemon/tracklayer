# 0063 — Verify v127 pump LCD readout (G3) — main @ 869df91 (code at d588af0)
Scenario: tools/playtest/scenarios/g3_stations.mjs (existing "disp" view added for v127)
Shots: ~/.hermes/cache/scratch/tlloop/reports/0063.jpg

## Verified since last time
- v127 (fuel pump display gets a readable LCD readout, replacing the flat grey `KIT.glowM` panel): reproduced
  independently. `disp` close view (~1.5 m) at Nov noon and 21:00 both read clean dark digits "$ 60.39 / L 24.65 /
  $/L 2.45" on a pale green-grey LCD background, no mirroring, no z-fight with the pump body or bezel. Night view
  additionally shows the panel backlit (brighter glow) while day is flat-lit, matching the builder's description.
  `q34` info log: calls 538, tris 20,267,120 — matches the builder's claimed 538→538 (no draw-call regression).
  This closes the "pump display digits by day" follow-up that's been sitting in PROGRESS.md since v124/v125/v126.
  Report 0062's finding #1 (flat grey panel) is now resolved.

## Findings (most important first)
1. [G3][low] Canopy roof underside (the big flat triangular soffit over the pumps) reads as a near-white, mostly
   flat-shaded plane at both Nov noon (nov_canopy.jpg, frame mean 165.5) and 21:00 (night_canopy.jpg, frame mean
   95.9 — but that drop is mostly the dark sky/ground behind it, not the underside itself staying lit; the panel's
   own tone barely changes by eye). Everything else in the station scene (lamps, windows, pump displays) now takes
   day/night grading via updSky/houseWinTick; the canopy underside looks like it's still a plain unlit or
   ambient-only material that never got hooked into that chain. Low priority (it's a soffit, not a light source,
   so it doesn't glow wrongly at night like the old bugs did) but worth a `grep -n` for whatever material the
   canopy uses and wiring it the same way if it's MeshBasic/unlit.
2. [G3][low] Kiosk gable ridge cap (the short reddish bar along the roof peak, visible in kiosk/canopy tiles)
   sits slightly proud of the ridge line and doesn't quite meet the barge boards at the gable end — a few cm gap
   visible in both night_kiosk.jpg and nov_kiosk.jpg. Cosmetic only, same family as the roofTrim work (v121);
   not urgent.
3. [G3][none] No regressions found elsewhere in the sheet: forecourt (q34), under-canopy (canopy), and kiosk
   building all look consistent with report 0062's last-verified state; house siding colour varies realistically
   noon vs night, no washed-out or wrong-hue surfaces.

## Ideas
- If the canopy underside turns out to be unlit, the fix is probably one line (same pattern as houseWinTick /
  lampHeadMat) rather than new geometry — cheap next G3 slice once the current buildings-slice-3 backlog item is
  done.
