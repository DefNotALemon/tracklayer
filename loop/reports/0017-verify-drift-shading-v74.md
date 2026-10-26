# 0017 — Verify v74 far-terrain drift shading (G3) — main @ 76a94ea

Scenario: tools/playtest/scenarios/g3_day.mjs (reused, no code change needed), run twice: once against
current main (v74), once against a `git archive 3567c2b` checkout (pre-v74, the commit right before the
drift-shading landing) via `TL_SRC=<archive dir>`, same scenario both times.
Shots: 01–06 each run; sheet (before/after pairs for 05 backcountry, 06 backcountry-march, 02 toward-sun):
~/.hermes/cache/scratch/tlloop/reports/0017.jpg

## Findings (most important first)

1. [G3][verified fix lands, smaller than claimed] `imgstats.py` whole-frame local contrast on the two
   backcountry shots: 05 backcountry **2.50 → 2.67** (+6.8%), 06 backcountry-march **2.41 → 2.56** (+6.2%).
   Direction matches the builder's v74 claim but the delta is much smaller than the terrain-band-crop number
   in PROGRESS (2.45 → 3.22, +31%) — expected, since whole-frame stats here are diluted by sky/HUD/toasts
   exactly as the loop's own pitfall note warns; not a regression, just confirming with a cheaper measurement
   that the direction is real.

2. [G3][confirmed, low] Vision on the sheet: b_after_05 and d_after_06 both show one clear long diagonal
   drift-ridge streak crossing the mid-distance hillside that's absent in a_before_05/c_before_06 (flat wash
   there). The streak reads as a natural wind-carved ridge, not a hard seam/band/grid — no artifact at the
   50 m patch edge, no tiling visible. Matches the builder's description.

3. [G3][info, confirms next backlog item is the right call] Beyond that one dominant streak each far hillside
   is still mostly flat — the multi-scale ripple field described in PROGRESS (90 m swells + 30 m ridges +
   10 m ripples) isn't legible at these viewing distances/resolution, just the biggest ridge. This is exactly
   what backlog item "Daylight slice 5 (saturation + sky glow)" already targets; no new item needed, just a
   data point that slice 5 is still worth doing.

4. [G3][confirmed, no regression] Toward-sun pair (e_before_02/f_after_02, near-village view) is visually
   identical before/after as expected — drift shading only applies to open fell 1.6–3.2 km out, and this shot
   has no far hillside in frame. imgstats: mean/std/sat all within run noise (166.8→165.9 mean, 43.0→43.4
   std). No regression near town from the v74 change.

5. [G3][info] No page errors in either run; HUD, map inset, toast text all render identically before/after
   aside from the ferry clock (run-to-run noise, not the shading change).

## Verified since last time
- v74 far-terrain drift shading (76a94ea): lands as claimed, confirmed on a fresh before/after pair
  (independent commit checkout, not just the builder's own numbers) — direction and visual effect both real,
  no seams/artifacts, no regression near town or in the toward-sun view.

## Ideas
- None new. Backlog's queued "daylight slice 5" (saturation + sky glow) is well-targeted by finding 3 above.
  G1/G3 have both had recent landings; G2 (progression) is due — next pass should rotate there unless the
  builder lands something new to verify first.
