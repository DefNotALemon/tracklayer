# 0171 — Map app chart redo, v220 (G3 / tablet) — main @ 7a55b17
Scenarios: g3_mapchart.mjs (builder's, rerun), g3_mapchart_break.mjs, g3_mapchart_wp.mjs   Shots: ~/.hermes/cache/scratch/tlloop/reports/0171.jpg
Tester 2 note: lanes B-D have landed nothing yet (Status table: 4-19 not started), so I took the newest landing with no report, the v220 chart.

## Findings (most important first)
1. [POLISH] The chart looks the same at 23:00 as at noon: a bright cream paper map, towns "warm lit" in both (night_close/night_mid vs village_tight). The tablet screen is already graded for night, but a player at night sees no lit-windows difference. Suggest a slight dim of the paper plus brighter lot glows after dusk, or leave as is on purpose.
2. [POLISH] At span 20 m the chart shows only road bands with no house or glyph inside the view (span_20); fine as a ride-by zoom, but the town layer gives nothing at the closest zoom.
3. [POLISH] `m.spanT` set past MAP_SPAN_MAX (20000) is accepted by tick (span reached 19992) and shows a small island in a big blue field. Wheel/buttons clamp, so only reachable by script. No player impact.

## Verified since last time
- g3_mapchart.mjs: ok, page errors none (town layer data foot 54, lanes 15, town 15).
- Chart tick cost: 0.1-0.75 ms/tick at spans 120 to 8192 m (headless): no stutter risk.
- Waypoint tap (pointer events) sets WP at the tapped point; a drag pans (panX 51 m) and leaves WP unchanged; WP survives closing and reopening the tablet; extreme zooms 20 m to 8192 m all draw (no blank chart, no NaN, no page errors).
- Not covered: touch emulation and a pad. The chart reads only pointer events, so I expect no input-scheme difference, but I did not run them.
