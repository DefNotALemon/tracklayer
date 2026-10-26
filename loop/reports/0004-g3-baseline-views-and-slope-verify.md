# 0004 — G3 baseline views + verify slope-on-foot landing (G3, G1) — main @ e52bd3d
Scenario: tools/playtest/scenarios/views.mjs (new), tools/playtest/scenarios/g1_slope.mjs (reuse)
Shots: ~/.hermes/cache/scratch/tlloop/reports/0004.jpg (views sheet); slope run not copied (numbers only, matched prior report exactly)

## Verified since last time
- "Hills count on foot" (b2b786a, G1, script v60): re-ran `g1_slope.mjs` unchanged on the same hillside
  (1074,-458, grade 0.25). Numbers landed exactly as the builder logged: up 0.91 m/s (ratio 0.69 vs across),
  down 1.49 m/s (ratio 1.13), across 1.32 m/s, tired 0.32 after 8 s on all three. smoke-equivalent: page
  errors none. Stills (01_uphill/02_downhill/03_across_chase in the slope run) show a normal walking pose on
  the hill; no floating or sinking into the snow on downhill/across. Uphill frame caught a mid-swing leg that
  reads slightly airborne in a single still — not a bug, just the stride phase at capture; worth a second
  look only if a future report catches it consistently. **Confirmed working, no regression.**

## Findings (most important first)
1. [G3][med] Daytime sky is flat, hazy white with no visible sun or color even under "Clear" weather, both
   at the starting settlement and in open backcountry (01_quay_day.jpg, 03_backcountry_day.jpg in the
   sheet). Buildings and snow read with almost no shadow contrast — a flat, washed-out look at a glance,
   exactly the kind of thing Lemon said he notices first. By contrast the 23:00 shot of the same spot
   (02_quay_night.jpg) looks good: visible stars, warm lit windows, a clean headlight beam and shadow under
   the sled. Suggested fix: check `updSky`'s day exposure/fog density and whether a visible sun disc /
   directional shadow is being drawn in daytime — night clearly has the contrast machinery working, day
   doesn't show it. Needs a dedicated before/after pass, not a quick toggle.
2. [G3][low] Sled close-up (04_sled_closeup.jpg) and the on-foot rider (05_rider_on_foot.jpg) both suffer
   the same flat daytime lighting as finding 1: the sled body reads as a smooth, low-contrast plastic shape
   with no shading to separate the hood/seat/track. Likely the same root cause as finding 1, not a separate
   bug — fix the sky/shadow pass and re-shoot these three together.
3. [G3][low] HUD location badge reads "OPEN BACKCOUNTRY" even when parked right next to Kjøllefjord's quay
   buildings with toasts welcoming you to the quay (01/02_quay_*.jpg) — a minor zone-boundary quirk, not
   worth a dedicated fix but note it if anyone touches the quay geofence.
4. [G1][info] Confirmed finding above under "Verified since last time" — not a new issue.

## Ideas
- `views.mjs` is now a reusable fixed-view scenario (title screen not included — `boot()` always launches
  past it into a ride; a title-only shot would need a second boot path that skips `titleLaunch()`). Re-run
  it after any G3 visual pass and diff the sheet.
- Score baseline (1-10, for future comparison): quay day 5, quay night 8, backcountry day 5, sled close-up
  6, rider on foot 6. Night is the bar to match in daytime.
