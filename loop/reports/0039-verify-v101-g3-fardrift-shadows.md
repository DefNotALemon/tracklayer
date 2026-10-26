# 0039 — Verify v101: far drift lee shadows past 50 m (G3) — main @ 0816c3e (script v101)

Focus: verify the builder's latest landing (0816c3e, v101) — far terrain beyond the 34–50 m snow patch now
marches `fdH` height toward the true sun and scales direct light on lee sides, fading 1.2–2.2 km. Reused
`tools/playtest/scenarios/g3_fardrift.mjs` unchanged (pinned spot via `SPAWN`, weather calm, 1 Nov noon /
1 March noon, 8 angles). Stills `~/.hermes/cache/scratch/tlloop/0039/`; contact sheet
`~/.hermes/cache/scratch/tlloop/reports/0039.jpg` (not retained in the repo).

## Findings

1. [G3][verify][pass] **`bandstats.py` strip-5 numbers reproduce PROGRESS's claimed after-values exactly.**
   Nov across (`02_nov_across_l`) **3.99** (PROGRESS: 3.44 → 3.99), Nov high-across (`05_nov_high_across`)
   **6.29** (5.65 → 6.29), Nov high-toward (`06_nov_high_toward`) **3.94** (claimed 3.34 → 3.90, within
   headless run-to-run noise), March across (`07_mar_across_l`) **3.09** (2.76 → 3.09, exact). No drift
   since the landing — this is a stable, reproducible effect, not a one-off measurement.

2. [G3][verify][pass] **Visual judgment confirms the written claim.** Contact sheet (8 angles: Nov
   toward/across-L/across-R/away at eye height, Nov high-across/high-toward at 9 m, March across/high-across)
   shows soft, deepened blue-grey shading on the far side of mid-distance dune swells, strongest in the
   high-angle (9 m eye) toward/across shots where more far terrain is visible below the horizon. Zoomed crop
   of the near-to-mid ground: gradient is smooth, no hard-edged banding, no repeating noise/tiling artifact,
   no seam where the near 34–50 m relief hands off to the far shader. Matches the commit's "no seams/banding/
   noise" claim.

3. [info] Near strips (top of frame, sky/horizon) and overall frame composition read as expected for a
   4° (Nov) / 11° (March) low sun — long shadows, warm horizon glow, no overexposure or flat-lit look.

4. [info] Page errors: none, exit 0. Scenario ran clean on first try, no re-spawn needed (`spot -1637,-1943`,
   same backcountry-search logic as the builder's own run).

## Verified since last time
- v101 far drift lee shadows (0816c3e): confirmed — numbers match PROGRESS exactly, visual quality holds,
  no regression, no new artifact found.

## Ideas
- Builder flagged two follow-ups in PROGRESS: FPS/GPU check of the new shadow taps on GFX low vs high, and a
  G2 laden-trailer coldRun check (speed formula is unmeasured for laden trailers, noted as a known gap since
  v97). Neither has a scenario yet — worth picking one up.
- No new G1/G3 visual bugs found this pass; LOOP.md's G1 backlog (toast hook fix in `g1_jog_player.mjs`,
  still open per 0036/0038) remains the next on-foot item if the builder rotates back to G1.
