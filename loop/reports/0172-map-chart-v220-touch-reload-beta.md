# 0172 — Map chart v220: touch, reload, on foot, whole-map frame spikes — main @ 7a55b17
Scenario: g3_mapchart_touch_reload.mjs (new). Overlaps 0171 (tester 2 took the same part minutes earlier), so I covered what 0171 listed as not covered. Sheet: ~/.hermes/cache/scratch/tlloop/reports/0172.jpg

## Findings
1. [POLISH] Whole-map frame spikes. Median `Map.tick` is ~0 ms and p95 ~1 ms at spans 200-1500, but single ticks spiked to 16 ms (span 200), 63 ms (span 1500) in one run, and p95 was 26.5 ms at span 8192 in a second run (1.6 ms in the first). Headless and noisy, but it hit the whole-map view both times it failed: probably the first `tabTown` pass or `tabTownBuild` (cache rebuild when `KIT.foot.length` changes) landing mid-tick. Suggest building `TT_C` once at init/first open rather than inside the draw.
2. [POLISH] Night: chart paper is full-bright at 23:30 (same as 0171 #1); the glow under towns is the same as by day.
3. [POLISH] Six villages checked at span 240 (Dyfjord, Gamvik, Mehamn, Skjnes +): each shows glow, lots and lanes; they look sparse beside Kjøllefjord, but readable.

## Verified
- Waypoint tap (pointerdown/up) sets WP; town cache has no NaN/inf; after a page reload the chart redraws with the town layer; touch UI on (`SET.touch="on"`) shows the chart with the tablet and buttons unobstructed; on-foot Map open works (no errors). Page errors: none in any run.
- g3_mapchart.mjs rerun: ok.
- Scenario note: a synthetic `click` does not set a waypoint; the handler needs pointerdown+pointerup (test issue, not a bug).
- Headless test terrain read olive-green around the teleport spots in the stills; not map related, not investigated.

No BLOCKER or BUG.
