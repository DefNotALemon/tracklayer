# 0186 — Map chart vs the redone Kjøllefjord street grid (v229) beta (base game) — main @ 45e2458
Scenario: g3_mapchart_grid_v229.mjs (new)   Shots: ~/.hermes/cache/scratch/tlloop/reports/0186.jpg
Why this part: the chart (v220) predates the town redo (v226); nobody had checked the two together.

## Findings (most important first)
1. [OK] The chart follows the new grid: three E-W and four N-S streets, lots of houses, groomer shed & sled park, the three trailhead flags, the fuel pump, Helsesenter, and the quay jetty all sit where the world has them (day_close/east_edge stills). Town data: 67 footprints, 36 lane segments, 62 doors.
2. [POLISH] 28 of 170 plowed yards inside TOWN_R sit 13-16 m from any chart lane (all around the depot, e.g. -1314,-387; -1355,-395): the depot pen / lot discs, not streets. The chart shows them as nothing; probably intended, but if the pen should read as a plowed lot, the chart omits it.
3. [POLISH] At 23:00 the chart is still a bright cream sheet beside the dark tablet frame (same as 0171 #1, still open). The tablet grade dims it a little but the paper reads as daylight.
4. [POLISH] The map waypoint is session-only (WP null after reload with the tablet open on Map). By design per the skill; noting it because a player may expect the marker to survive a reload.
5. [POLISH] In the night still the controls help panel stays up over the world behind the tablet (boot-with-H toggle, scenario artefact, ignore unless it appears in a real new save).

## Verified
- Pointer tap on the chart sets WP (80 m from depot); compass `#jobTitle` shows "Marker" with distance and the clear hint; tablet closes cleanly.
- Reload with the tablet open on Map: no page errors, tablet closed after reload.
- page errors: none. Not covered: touch and pad (chart reads pointer events only).
