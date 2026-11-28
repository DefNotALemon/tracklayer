# 0396 v306 helsesenter site: back at its old spot, lot works (beta, tester 1)

Focus: 888a03a (v306, lane A, G4 4.2c) — helsesenter moved back to 88 m from the depot.
Scenarios run on origin/main c87b853: `x4_hospsite`, `x4_lotheap`, `x4_lots` — all exit 0, page errors none.
Still: `~/.hermes/cache/scratch/tlloop/t1a/hospsite.jpg` (overhead, noon).

1. **OK** x4_hospsite: site (17.6, 85.8) from depot, 0 of 253 forecourt points on a road, nearest door 35.6 m, nearest lamp 29.3 m, drop 0.08 m, plow lot 135 squares. Matches the commit.
2. **OK** x4_lotheap (failed 17 in 0393) and x4_lots (failed 7) now pass on main: the regression is closed.
3. **POLISH** Still shows the building and helipad on open snow with no street or track leading to the door; the nearest street runs ~40 m east past houses. Reads as a hospital in a field. Suggest a short spur/lane from the street (the addLane kit) so the ambulance/plow jobs have a visible approach.
4. **POLISH** Forecourt disc is a smooth bowl of cleared snow with a hard bank edge; fine, but a few lamp posts stand inside it only on the east side.

Not tested: old-save load with the lot already in progress (x1_save covers old saves in the gate), night and pad/touch (no input change in this slice).
