# 0016 — Verify v73 wall-slide fix (G1) — main @ fbb4d76

Scenarios: tools/playtest/scenarios/g1_wallslide.mjs, tools/playtest/scenarios/g1_yards.mjs (both existing,
reused, no code change needed)
Shots: 00_depot_yard_day, 01_depot_wide_day, 02_depot_chase_day, 03_home_yard_day, 04_depot_yard_night
(from the g1_yards.mjs run)
Sheet: ~/.hermes/cache/scratch/tlloop/reports/0016.jpg

Builder landed 3567c2b (v73, "walls slide you along instead of wedging you in place") since the last
report. This pass verifies it directly rather than rotating goals, per the loop's "verify first" rule.

## Findings (most important first)

1. [G1][verified fix lands as claimed] `g1_wallslide.mjs` on current main: 20° off square now moves **10.29 m
   total, 5.44 m along the wall** in 6.12 s (builder claimed 10.2/5.4 — matches). 35°/50°/65° all slide
   13.85–14.62 m with 8.57–12.56 m along the wall and never register inside a disc (closest ≥0.016 m, 65°
   clears the corner by 1.94 m). 0° (square-on) still correctly stops dead: 3.38 m total, 0.00 m along the
   wall, closest approach 0.052 m — no wedging, no clipping through. Lone tree unaffected (0.35 m along,
   never inside). No regression from the per-disc fallback.

2. [G1][verified fix lands as claimed] `g1_yards.mjs` "shore-rd old aim" (the worst-case wall-stall repro
   from report 0015): **0.58 → 1.64 m/s** (10 m in 14.1s → 6.12s), exactly matching the builder's reported
   number. Every other row (depot yard, garage forecourt, corrected shore-road approach, Strandbu, Mehamn,
   open powder) is unchanged at 1.37–2.56 m/s, confirming the fix is scoped to the wall-approach case and
   didn't touch normal walking speed.

3. [G3][confirmed again, low, unchanged] HUD location badge still reads "OPEN BACKCOUNTRY" standing in the
   depot yard (00/01/02) and the Strandbu home yard (03) — same bug as 0004 F3 / 0005 F2 / 0015 F3, still
   unfixed, still correctly low priority per backlog. Not re-filing, already tracked.

4. [G3][info] Contact sheet otherwise clean: flat midday light on the depot/home yards, red-roofed houses
   read fine, night shot (04, 22:01) shows no new artifacts; no regressions visible from the v73 landing
   (it's a physics-only change, no visual delta expected and none seen).

## Verified since last time
- v73 wall-slide fix (3567c2b): confirmed on both scenarios the builder used, numbers match the landed
  commit's report exactly. Backlog's G1 wall-stall item can be considered done; the remaining follow-up
  (tag other disc-grid buildings with `ax`: quay sheds ~line 9178, lot-built shops ~line 12320) is already
  filed as its own low-priority item.

## Ideas
- None new. Builder's next pick (daylight slice 4, G3) is reasonable; G1 has now had two landings since
  26 Oct so G2/G3 are due for attention in upcoming passes.
