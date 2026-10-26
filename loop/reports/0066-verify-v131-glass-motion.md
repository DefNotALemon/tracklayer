# 0066 — Verify v131 view-dependent glass sheen in motion (G3) — main @ 21ce8de

Scenario: tools/playtest/scenarios/g3_glass_motion.mjs (new, committed with this report)
Shots: ~/.hermes/cache/scratch/tlloop/reports/0066.jpg (contact sheet, 10 views: 5-position lateral sweep on one
house front at Kjøllefjord's Fisk & Friluft station, + 5 different house fronts viewed from the same relative
angle)

## Verified since last time
1. [G3][confirm] v131 (glass lookup slides with the mirrored view ray, replacing v130's fixed top/bottom-only
   gradient) reproduces: sweeping the camera from 6 m left of square-on to 6 m right of square-on across the
   same window shows the reflection changing shape, not just staying as a static top-light/bottom-dark split.
   At dead-center (sweep_C) both panes read as a roughly symmetric top-pale/bottom-dark split (matches the
   square-on view in report 0065). At far-left (sweep_L6, viewing the wall from a shallow angle) the same
   window instead shows a brighter vertical sliver along one edge of the pane rather than a horizontal split —
   confirms the reflection direction actually changes with viewpoint, not just a fixed gradient reused
   everywhere.
2. [G3][none] No seams, flicker, or mirrored/inside-out panes in any of the 5 sweep positions or the 5
   different-building shots; the Oct 26 fix (flip normal to face the eye on inward-normal white-house builds)
   holds up across a white, blue, pale-yellow and two red buildings.
3. [G3][none] Draw calls unaffected: `renderer.info.render.calls` logged at 726 for this scene before the
   sweep (new scenario/new camera path, not directly comparable to g3_glass.mjs's 871 on a different view, but
   stable across the whole run with no spike).

## Findings (most important first)
1. [G3][low] The "repeated stripe down a street" worry from v131's landing note didn't reproduce the way I
   expected, but the test also shows why it's low-risk: 5 different buildings (white, blue, pale-yellow, two
   red) viewed from the *same relative wall angle* all show the *same* sheen position/shape. That's expected
   for a purely view-ray-driven shader (no per-building seed) and reads fine in these stills — but it does mean
   a real street where every house happens to face the same way relative to the player's path (e.g. a straight
   road with houses square to it) could still show a visible "every window lit the same way" repetition as you
   drive past. Not asking for a per-building random offset (adds cost/complexity for a decorative surface,
   matches 0065 F1's call); flagging only so the builder knows this is unverified in an actual real street
   layout (my 5 buildings here are the depot/station cluster, not a single straight residential row — a better
   check would use Gamvik or Mehamn's row housing, which I didn't have time to locate this pass).
2. [G3][none] At the far-left/far-right sweep extremes (6 m lateral offset at 7 m distance — a fairly oblique
   angle a player would only get close to a window), the sheen reads as a thin, almost specular-looking sliver
   rather than a soft gradient; not a bug, just worth a follow-up check at a more typical walking/driving
   distance (12-20 m) and angle rather than this close-range test rig.
3. [G3][none] Scene otherwise clean: siding, trim, door and forecourt detail on all 5 buildings matches prior
   verified landings (v123 roof trim, v129 canopy light, v130 day glass).

## Ideas
- Builder's own next-up items stand (red-house fascia tint). This pass adds: re-run a glass-in-motion check
  on an actual row-housing street (Gamvik/Mehamn) rather than the depot cluster, to settle the repeated-stripe
  question for real; and judge the pump LCD (v127) at normal ride-by distance for moiré, which v131's landing
  note also asked for and nobody has checked yet.
