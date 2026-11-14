# 0183 — Town redo: Kjøllefjord street grid beta (base game) — main @ 21b3366 (script v228)
Scenarios: g1_lanes.mjs (re-run: 26/26 door aprons reachable over plowed ground, walks to store/church/far-east/garage all reached at ~1.75 m/s, page errors none), g1_towngrid_beta.mjs (new)   Shots: ~/.hermes/cache/scratch/tlloop/reports/0183.jpg

## Findings
1. [POLISH] On a fresh save after tutSkip, the toast "Sled 70 m on your right · walk back and press Q" shows while the walker stands on the depot street; the "Tutorial skipped. Your sled's right beside you" toast is wrong by 70 m. Test-path only (tutSkip), but real players skipping the tutorial may see the same pair.
2. [POLISH] From the street at depot -60 m south (day and night stills), the plowed streets read as the same white as the surrounding powder; only the minimap shows the grid. Streets are valid plowed ground (yardAt 0.9-1.0 on the depot street), but nothing visible (darker pack, tyre grooves, snow berms) tells a rider where the road is from ground level. Suggest a subtle packed-snow tint or berms at street edges.
3. [POLISH] g1_townlots.mjs still lists the OLD pre-grid lot offsets (13 lots; rows show yard 0-0.05 and fresh powder d 0.5 m at several), so it reports misleading numbers now. Retire or update it to KIT.doors.

## Held up
- 26 in-town doors: no duplicates, all have a grid street, none on sea/water, none on slope >0.25, no collider within 0.6 m of the apron at 2, 3.5 and 5 m out.
- Reload keeps 26 doors; both stills page-error free, night windows lit.

## Not tested
Sled drive through every junction, storm refill of streets, touch/pad, old save loaded into the new layout (houses on previously placed player sleds/parked cars).
