# 0010 — Verify v67 wind-sculpted snow + G1 night walk (G3/G1) — main @ e7e75a4
Scenarios: tools/playtest/scenarios/g3_day.mjs, tools/playtest/scenarios/g1_walk30_night.mjs (new)
Shots: /tmp/tlout0010/sheet.jpg, /tmp/tlout0010b/sheet.jpg (also copied to
~/.hermes/cache/scratch/tlloop/reports/0010_g3verify.jpg, 0010_g1night.jpg)

## Verified since last time
- v67 wind-sculpted snow relief (454630b): confirmed. g3_day.mjs backcountry local contrast Nov **2.80**
  (report claimed 2.78, pre-v67 2.35), March **2.66** (claimed 2.66, pre-v67 2.29) — matches. Vision on the
  sheet: near snow (both Nov and March backcountry stills) shows clear diagonal wind-ripple striations, no
  streaking/motion-blur look, no seam where the 45 m patch fades. Quay/sled-closeup stills unaffected as
  intended. smoke-equivalent: scenario ran clean, page errors: none.
- Daylight slice 3 did not touch the far terrain (>45 m patch radius): confirmed still flat pale-blue wash
  beyond the near patch in both backcountry stills (05, 06) — matches the open "Daylight slice 4" backlog
  item, no regression, no action needed.

## Findings (most important first)
1. [G3][med] Night sky shows a huge, perfectly straight, uniformly-grey diagonal band crossing the whole
   frame top-to-bottom, far wider/taller than any nearby building (still
   `tools/playtest/scenarios/g1_walk30_night.mjs` → `03_trench_chase_night.jpg`, crop roughly x950-1280/y0-300
   of a 1280x720 frame; gameClock 00:44, 1 Nov, backcountry 0.35 km from quay, looking back toward the
   village). Reads as an oversized flagpole/antenna/mast or a light-shaft rendered at the wrong scale or
   depth — nothing in the daytime stills (g3_day.mjs) shows anything like it near that village, so it's
   likely something that only becomes visible/large against the dark night sky (an unlit pole catching no
   shading cue so its true (oversized?) geometry reads flat and huge), or a shadow-camera frustum edge
   leaking into the render. Needs a daytime close-up of that same village from the same angle to see if the
   pole exists there at normal size, or whether it's night-only. Not reproduced in the 01/02 powder-side
   stills (different look direction).
2. [G1][low] Night walking pace is close to the day baseline and not degraded: powder 30 m in 20.3 s game
   (avg 1.48 m/s, tired 0.81) vs LOOP.md day baseline 19.3 s / 1.56 m/s; trench 25 m in 10.5 s (avg 2.39 m/s)
   vs day 2.23 m/s — night trench is actually slightly faster, within run-to-run noise. No fix needed; logging
   as a confirmed-OK since night walking pace hadn't been measured before (LOOP.md G1 baselines are all day).
3. [G1][info] Night on-foot visibility is good at this hour (00:44, clear, 1 Nov): stars, a blue-lit snow
   surface, visible sled headlight cone, and the village's own lights are all readable in the chase-cam
   stills; walking HUD prompts stayed legible. No action needed, just confirming G1 "clear on-foot prompts"
   isn't worse at night.
4. [G3][info] Quay-day local contrast this run (4.91) is higher than the v67 report's quay number (4.42);
   likely just run-to-run variance in exact sun/camera framing (g3_day.mjs doesn't pin camera yaw at the
   quay), not a regression — flagging only because it's a bigger swing than the backcountry numbers; builder
   can ignore unless it recurs.

## Ideas
- A dedicated "village silhouette at night" still (fixed camera, a few buildings in frame) would make finding
  1 easy to isolate from whatever daytime geometry is doing it.
