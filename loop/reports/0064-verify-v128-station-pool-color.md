# 0064 — Verify v128 station pool color/opacity match (G3) — main @ e461479

Scenario: tools/playtest/scenarios/g3_stations.mjs (existing; reused as-is)
Shots: ~/.hermes/cache/scratch/tlloop/reports/0064.jpg (contact sheet, all 10 views)

## Verified since last time
1. [G3][confirm] v128 (station forecourt light pool recoloured 0xff7a2a → 0xe0601a to match the street lamp
   pools, opacity 0.45 → 0.6) reproduces independently. `imgstats.py`: night_pump mean/local **109.8/5.03**
   (builder claimed 109.5/5.02), night_canopy 95.9/4.62, night_q34 77.7/4.14 — all within noise of the landed
   numbers. Draw calls 538 (nov_q34 `info_q34` log), matching the claimed no-regression. Vision on night_q34
   and night_pump: the under-canopy pool now reads the same warm pale cream-orange as the two street lamp
   pools flanking the forecourt — no washed-white or over-bright patch, soft edges, blends with the lit pump
   displays and kiosk window glow. This closes report 0059's finding #3 (pool colour mismatch) cleanly.
2. [G3][none] Pump LCD readout (v127) still reads clean at both noon and night in this run — "$60.39 / L24.65
   / $/L2.45", no mirroring, no z-fight with the bezel. No regression from the v128 pool change.
3. [G3][none] Kiosk roofline (v121/v123 trim work): zoomed the gable peak at noon — ridge cap sits flush
   against the barge boards with no visible gap, contradicting report 0063 F2's read at a different angle/
   distance (that one was likely closer-range/different lighting). Not re-opening that finding, just noting
   it isn't reproducible from this station's default kiosk view.

## Findings (most important first)
1. [G3][low] Canopy underside (soffit) is still a flat, unlit near-white plane at night (night_canopy.jpg:
   soffit holds roughly the same pale tone as it does at noon, mean 95.9 vs nov 166.0 — the drop is almost
   entirely the dark sky behind it, the panel itself barely dims) while everything below it (pump LCDs, the
   two lamp pools, kiosk window) now takes day/night grading. This reconfirms report 0063 F1 exactly; still
   unaddressed. Low priority (a soffit, not a light source, doesn't glow wrongly) but it's now the one
   visibly un-graded surface left in the station scene and the backlog item already flags it as a likely
   one-line fix (same pattern as houseWinTick/lampHeadMat) — good small slice for the builder.
2. [G3][none] No other regressions across the 10-view sheet (q34/canopy/pump/kiosk/disp × nov/night):
   building siding, windows, and trim read consistent with reports 0062/0063's last-verified state.

## Ideas
- Next G3 slice: wire the canopy soffit material into the same day/night grading chain as houseWinTick /
  lampHeadMat (one line, per the 0063 idea) — cheap, closes the station-lighting backlog item's last open
  thread besides the fascia tint and day-glass work already noted.
