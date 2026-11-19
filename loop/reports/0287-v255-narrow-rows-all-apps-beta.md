# 0287 — v255 narrow-pane rows (0269 fix) in the other tablet apps: Homes, Lights, Police hold at 640x360 to 390x844 — main @ a79e071 (v255)
Scenarios: `x4_plowrows_narrow.mjs` (rerun) and NEW `tools/playtest/scenarios/x4_rows_allapps_narrow_beta.mjs`. The commit says the fix covers "every other app's label / text / chip row", so the new scenario opens every tablet app (hidden ones forced visible) at 640x360, 667x375, 568x320 and 390x844 with touch on, and checks every `.tprow` / `.treup` for a text column under 60 px, a row over 140 px, and a row wider than its pane. Statement rows are planted in Homes (3 history rows with long text), Lights (2), Police (2). Shots: none (numbers only).

## Findings
1. OK — `x4_plowrows_narrow` passes all 5 viewports plus desktop (Streets, Doors, Statements; narrowest text column 149 px at 568x320, tallest row 105 px). Page errors none.
2. OK — the other apps hold. 10 rows scanned at each of the 4 viewports (Homes 3, Lights 2, Police 5): no text column under 60 px, none over 140 px, none sticking out. Page errors none.
3. NOTE (not a game bug) — my first run flagged Homes rows at 238-243 px tall in every viewport. It was my measurement: `getBoundingClientRect` on the dash tablet's 3D-transformed pane inflates a row's box. With `offsetHeight` x scale, the same rows are 33 px (1280x720) and 50 px (640x360). Use `offsetWidth/offsetHeight` for tablet rows in scenarios.
4. POLISH (open gap, not a failure) — the Homes history rows have no chip, so at pane width >= 400 px they show label + text only, as before; below 400 px the label sits alone on its line with an empty right column. Looked fine in numbers; not judged on a still.

## Not covered
Real Estate property rows (Statements, Upkeep: `pr` state did not take my planted `last`, 0 rows), Staff and Boats rows (no staff or boat owned, so no rows), the `.treup` rent-up rows in Jobs, pad focus moving over the narrow rows, a still of each app at 640x360.

## Next for tester 1
Plant a real property (Slettnes lighthouse) and a hired caretaker, then rerun this scenario to cover Real Estate and Staff rows.
