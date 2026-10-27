# 0084 — v147 chase-cam canopy clip on foot: walker offsets + FP-view fallback (G3) — main @ 627a385

Scenarios: tools/playtest/scenarios/g3_camtree_foot.mjs (new, committed with this report)
Shots: ~/.hermes/cache/scratch/tlloop/reports/0084.jpg (contact sheet, 22 stills)

Focus: 0083 verified the v147 canopy-clip fix (`camTreeClip`, tracklayer.js:3533/10042) only for the SLED
chase cam (default + close chase, day + night) and left on-foot/FP open as a follow-up. The camera follows
`FOOT.x/y/z` through the exact same `camTreeClip` call when `FOOT.on`, but a walker's body is far narrower
than a sled and can walk much closer to a trunk — this pass tests that narrower geometry (offsets 0.3/-0.6 m
vs the sled test's 1.5/-1.9 m, 16 m approach vs 55 m) in both chase camera modes, plus whether a true
first-person on-foot view exists at all.

## Findings (most important first)

1. [G3][info] The canopy clip holds for the walker too, at much tighter approach offsets than the sled test
   used: 8 runs (2 stands × 2 offsets × 2 camera modes), 4,895 sampled frames, **0 frames inside a canopy, 0
   frames under 0.3 m**, min clearance exactly **0.60–0.61 m** in every single run (vs 0.57–5.46 m range for
   the sled). The clip's 0.6 m slide-out margin (PROGRESS: "camera inside a canopy + 0.6 m slides straight
   out") is doing the limiting here — the walker's narrow profile pushes the camera into the clip guard far
   more consistently than the sled ever did, and the guard holds it at exactly its floor every time. No
   stuck frames, no dark slab, confirmed visually in the contact sheet (0084.jpg) — every still shows clean
   sightlines between trunks, boxy-but-separated pine canopies, no solid green fill.
2. [G3][info] Confirmed by direct read + a live check: selecting **First person while on foot is not a real
   FP view**. tracklayer.js:3494 routes `(FOOT.on || CRASH.on) && VIEWS[camMode].fp` to `VIEWS[1]` (Close
   chase) instead of `VIEWS[2]` (First person). Live check with `FOOT.on = true; camMode = 2` returned
   `viewUsed: "Close chase"`. This isn't new behaviour from v147 — it's existing canon (VIEWS fallback, line
   3494) — but it means "first-person brushing a pine" from 0083's open list doesn't exist as a distinct
   camera path to test: on foot, First person IS Close chase, already covered by finding 1 and by 0083.
3. [G3][low] Scene quality aside from the clip: the contact sheet's forest stills show the pines as visibly
   boxy stacked cones (LOOP G3 calls out boxy shapes as a known Lemon complaint) and fairly flat midday
   lighting/pastel sky — not a new issue, just a visible reminder that the canopy geometry itself, not only
   its collision/clip behaviour, could use another look sometime under G3.
4. [G3][info] Methodology note for future passes: an early version of this scenario checked the FP fallback
   *before* setting `FOOT.on = true` (the game boots on the sled), which trivially reported "First person"
   with no fallback — looked like a contradiction until re-run with `FOOT.on` set first. Any scenario
   touching the `VIEWS[camMode].fp` fallback must set `FOOT.on`/`CRASH.on` before reading `VIEWS[camMode]`.

## Verified since last time
- v147 (pass 92, chase-cam canopy clip): now confirmed clean for on-foot walking too, at closer offsets than
  sled testing used. Combined with 0083 (sled, close chase, night), the fix is verified across every camera
  mode and both on-foot and on-sled travel. No regressions, nothing to fix.

## Ideas
- G3 pine canopy geometry itself (boxy cone stacks) could be worth a pass independent of the clip fix.
- The 0083 "pin the camera 1.0–1.5 m from a canopy to see the dither texture itself" idea is still open and
  separate from this pass (that needs overriding the clip, not exercising it).
