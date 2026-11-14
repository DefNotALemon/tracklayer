# 0169 — Rocks (v219: 24k boulders, buck-or-throw collision) beta — main @ e655300
Lanes B-D have landed nothing yet, so I took the newest landed player-facing change with no report. Reran `g2_rocks.mjs` (ALL PASS, page errors none), then wrote `tools/playtest/scenarios/g2_rocks_break.mjs` (new, 27 asserts, ALL PASS, page errors none). No stills this pass (numbers only).

## Verified
- Field: 30501 rocks in `obGrid` (24001 from `buildRockField` plus the old set), 207 render cells. 0 NaN, 0 in water/sea, 0 within 12 m of a site, 0 within 25 m of spawn, 0 on a parked-car spot, min visible height above snow 0.68 m, 0 on a road bed.
- Walker on foot walking 9 s straight into a rock (r 1.51): stops at 1.96 m from its centre, does not pass through.
- Strikes on flat ground: 10 m/s head-on, 1.2 m and 1.9 m glancing, 13.5 m/s head-on: each registers exactly 1 hit, no NaN in P state (checked every frame), no speed spike, sled ends outside the rock. 24 m/s throws the rider (existing scenario).
- Reload: field rebuilds (24001), no errors.

## Findings
1. [POLISH] 7 of 30501 rocks sit within a tree's radius plus half their own (tree-vs-rock overlap check on the obstacle grid). Cosmetic, invisible in play. Suggested fix: `tryPut` already calls `obNear`; the overlap is probably from the old `buildProps` rocks vs trees, so ignore unless a still shows it.
2. [POLISH] A 14.6 m/s head-on strike (just over `CRASH_AT.rock` 14) did NOT throw the rider (crash false, `hitV` reaches the stone below 14 after drag and snow friction over the 14 m run-up). Fine as designed, but the effective throw line is more like 15-16 m/s of entry speed; if "31 mph" is the intent, the number in the comment is hitV at contact, not entry speed.
3. [POLISH, coverage gap] Not tested: rock strike while towing or with the truck/second vehicle (`VEH.cur`), a boat/ship collision near a shoreline rock, night-time visibility (rock colour `[0.9,0.93,0.98]` top faces may glow like snow under `updSky`), and AI traffic on roads near field edges.

No BLOCKER or BUG found.
