# 0080 — verify v145 ski obstacle slide: downhill trunk hits, wall slide, chase-cam visual (G1) — main @ 9bfa0ec

Follow-up to the top backlog item left by v145 (ski obstacle slide, report 0078): `g1_ski_forest` is now
0/9 stuck, but three asks were left unjudged — a trunk hit while skiing fast downhill (thud threshold
`sq > 0.55` at `sp > 3.5 m/s`), skis sliding along a house wall (`o.ax` tangent), and how the sidestep
looks from the normal chase camera at glide speed.

Scenario: `tools/playtest/scenarios/g1_ski_v145_verify.mjs` (new, committed with this report), three parts.
Shots: `~/.hermes/cache/scratch/tlloop/reports/0080.jpg` (11-still contact sheet: before/contact, wall
before/after, 7 chase-cam frames through a stand).

## Findings

1. **[G1][low, closed] Downhill trunk hits land exactly one thud per contact, no pin.** 4 trees on the
   steepest forest slopes the map has near spawn (grade 0.55, the max candidates found — nothing steeper
   exists in a flat-enough, non-sea search) hit at `sp` 7.70–8.83 m/s on approach. Every run: `thuds: 1`,
   `lastThudSp` 8.0–8.8 — one square hit registers (the `bumpT` 1.2 s cooldown + `sp *= 0.3` fires), then
   the obSlide tangent takes over and the skier glides clear instead of re-pinning. No "stuck" case, no
   repeated thud spam. Stills (A_before/A_contact) show a normal standing/gliding pose before and after,
   no clipping. The threshold isn't too forgiving (a real downhill hit at 8 m/s does register — toast
   "Into the birch. Ow." fires since `sp > 7` in all 4) and isn't too harsh (one hit, then you're free, not
   stuck forever like pre-v142 footStep was). No action needed.
2. **[G1][low, closed] Skiing along a house wall behaves like the on-foot version.** `g1_wallslide`-style
   trial (same red shore-road house, FOOT.ski=true) at 0/20/35/50/65° off square: 0° and 20° stay in
   gentle contact (`minPen` 0.02 / 0.00 m) and slide 0–2.1 m along the wall in 6 s; 35° slides 8.87 m along
   with `minPen` 0.19 (closest, real contact); 50°/65° drift away from the wall entirely (`minPen` 1.87/3.30,
   i.e. the ski line clears the house after the initial graze) rather than clipping through it — expected,
   since a shallower approach angle means less of the stride actually points at the wall. Stills
   (B_wall20_before/after) show the skier flush against the wall at the end, no visible penetration or
   stutter. Matches the on-foot wall-slide behavior (report history, `g1_wallslide`) since v145 ported the
   same `obSlide` tangent code that already handles buildings' `o.ax` discs. No action needed.
3. **[G1][low, closed] Chase-camera sidestep reads as a normal ski glide, not a sideways shuffle.** 7
   frames through the densest flat stand (same stand as 0078's worst case) at the game's own default chase
   camera, 1–8 mph: the skier's pose stays upright with poles trailing naturally in every frame, weaving
   between trunks without any visible stutter-step or sideways slide artifact. At this camera distance the
   figure is small (~15 px tall) so a sub-pixel jitter wouldn't show, but nothing readable as "glitchy"
   appears across the sequence. No action needed.

## Verified since last time
- v145 (ski obstacle slide, 359b1f6/9bfa0ec): confirmed per all three findings above — the backlog item's
  three open sub-asks are all clean. Recommend closing the v145 backlog item entirely.

## Ideas
- None of the three asks turned up a bug. If Lemon wants a harder stress test later: the map's steepest
  tree-adjacent slope found here was only grade 0.55 (~29°) — a purpose-built steeper test slope (if one
  exists elsewhere on the map) would push the thud speed higher than 8.8 m/s and could be worth a spot check.
