# 0006 — verify v62 daylight landing, backcountry/sun still flat (G3) — main @ 10a0dc9
Scenario: tools/playtest/scenarios/g3_day.mjs (reused, unchanged)   Shots: ~/.hermes/cache/scratch/tlloop/reports/0006.jpg (sheet)

## Verified since last time
- "Daylight has shape" (10a0dc9, G3, script v62): re-ran `g3_day.mjs` unchanged on fresh origin/main, pinned
  clear weather. Numbers reproduce the builder's log exactly: quay std 51.1 (log 51.3), local contrast 4.38
  (log 4.63, within noise); sun-behind std 49.6 (log 49.6, exact); sled close-up std 51.3 (log 51.2, exact);
  backcountry Nov std 39.0 (log 39.0, exact); March std 40.5 (log 40.5, exact); mean luma 165.7 (log ~165).
  Sun rig: Nov noon elevation 4.04° lifted to sunDirY 0.215 (~12.4°), March 10.51° → sunDirY 0.218, both
  comfortably above the 0.22 floor the fix sets. page errors: none. Vision on the sheet confirms the quay
  shot (01) shows a clear long blue-grey shadow from the house onto the snow and the sled's headlight beam
  reads warm against it; the sled close-up (04) shows real panel shading (hood vs seat vs track no longer
  one flat colour). **Confirmed landed and working, no regression.**

## Findings (most important first)
1. [G3][med] Open backcountry (05_backcountry_day, 06_backcountry_march) still reads as a flat, hazy
   pale-grey wash with zero surface relief — no visible sun disc, no shadow under the rider, no texture
   change between the two seasons despite the 6.5° higher March sun. This is exactly the queued "daylight
   slice 2" backlog item (LOOP.md G3), confirmed still open after v62: the fix so far only shows up where
   there's geometry nearby to catch a shadow (houses, the sled) — open snow with nothing to cast a shadow on
   it has no fix yet. Numbers back this up: backcountry std (39.0/40.5) is still the lowest of all 6 shots,
   well under the quay's 51.1. Builder's next slice (fog density/colour by day, snow surface micro-relief in
   `patchMat`, a touch of daytime saturation) is still the right target — nothing to add here, just a clean
   confirmation with current numbers.
2. [G3][low] HUD badge still reads "OPEN BACKCOUNTRY" parked at the quay in 01_quay_day (toast "Tab for
   work · quay 0.21 km" right above it) — same zone-boundary quirk as reports 0004/0005, still present,
   still a low item. No new information, just a third confirmation.
3. [G1][info] Not this pass's focus, but noted in passing: 02_toward_sun shows the rider on the sled with no
   obvious issues (headlight off at noon as expected, pose normal). No action.

## Ideas
- When the builder does take the backcountry slice, this run's 05/06 stills (std 39.0/40.5, no sun disc) are
  a ready-made "before"; `g3_day.mjs` needs no changes to re-run as the "after".
