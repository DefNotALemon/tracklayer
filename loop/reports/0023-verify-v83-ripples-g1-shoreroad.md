# 0023 — Verify v83 (powder ripples slice 8a) + G1 shore-road path check — main @ 320693f

Scenarios: `tools/playtest/scenarios/g3_day.mjs` (reused, no change), `tools/playtest/scenarios/g1_town_quay.mjs`
(reused, no change) + `tools/playtest/imgstats.py`. Shots: `~/.hermes/cache/scratch/tlloop/reports/0023.jpg`
(g3_day 3-col contact sheet); raw stills in `~/.hermes/cache/scratch/tlloop/0023g3/` and `0023g1/`.

Focus: verify the builder's latest landing (v83, "Powder ripples read in the low sun", 320693f, landed 06:10)
since report 0022, then rotate to G1 (last 3 reports: 0020 G1, 0021 G2, 0022 G3 — G1 due) and resolve the open
question 0020 F1 left on the backlog about the shore-road sample point.

## Verified since last time
- v83 (powder ripples ×2 tilt, 320693f): reran `g3_day.mjs`. Light rig reproduces exactly — Nov-1 noon sun
  `ffb77f` el 4.04°, hemi `95bbff` 0.379, exp 1.05; March noon sun `ffdbb7` el 10.51° — no drift. `imgstats.py`
  local contrast: 06 March backcountry **2.89**, matching the landed claim (2.63 → 2.89) to the decimal. 05 Nov
  backcountry read **3.15** this run vs the landed claim of 2.97 (was 2.71 before v83) — see Finding 2, likely
  run-to-run placement noise rather than a regression (it's still well above the pre-v83 baseline either way).
  Vision on `05_backcountry_day`: a clear diagonal light/shade ripple band is now visible across the mid-ground
  snow ahead of the rider — matches the claimed fix, no grid/seam artifacts, town stills (01–04) unaffected.
  `page errors: none`.

## Findings (most important first)

1. [G1][medium][resolves open question from 0020 F1] The shore-road sample point (-1250,-420) IS on a natural
   walking path, not an off-path outlier: it sits **61 m from the depot seed**, only **12.4–16.3 m** from a
   cluster of five houses (`r=1.5` obstacles at roughly -1243 to -1250, -432 to -436), and **37.8 m** from
   "Nordkinn Skuter & Service". This is squarely on the line a player would walk from the quay/service shop to
   that house cluster. Confirms this run: **pack 0.08, depth 0.58 m, 1.56 m/s** over 20 m — barely above open
   powder (quay core pack 0.85 was 2.3 m/s over the same 20 m this run). Recommend the builder take the
   backlog item as-is (widen the plowed footprint a bit further from the depot, or at least toward this house
   cluster) rather than deferring further — "off-path, no fix needed" is now ruled out.

2. [G3][low][info, not a regression] `imgstats.py` local-contrast on `05_backcountry_day` moved around between
   runs with no code change: 0022 measured 2.70 pre-v83 / this run's post-v83 equivalent position measured
   2.97 in the builder's own verify vs **3.15** here. The scenario's backcountry spot is found by a radius/angle
   search from the player's *current* position (`g3_day.mjs`'s open-ground loop), and the player's start
   position isn't pinned, so the exact backcountry sample point — and its local terrain roughness — differs
   slightly from run to run. Not a bug, but it means slice-8 local-contrast numbers should be read as a range
   (≈2.9–3.2 since v83) rather than a single decimal; pin `P.x/P.z` (or the search's starting angle/seed) in
   the scenario if tighter before/after comparisons are needed later.

3. [G1][low][reproduces, from 0020 F3] Walking straight into the nearest quay obstacle (r=0.6) stopped
   **0.99 m** from its center vs the push-out formula's **~0.96 m** (0020 measured 1.08 m on a different
   obstacle) — consistent slight overshoot from the v73 slide-not-stop behavior. No jitter or snag. Still
   info-only; two passes now show the same small gap, so it's a real (if minor) constant offset in the slide
   formula, not instrument noise — worth a one-line look if the builder is ever in that function for something
   else, not worth a dedicated slice.

4. [G1][low][reproduces, from 0020 F4] The quay-edge-toward-the-sea check again didn't reach actual sea within
   its 6 s window: ended at (-1306.8,-390.4), `sp=2.70` (still moving at speed), `isSea=false`. Same tooling
   gap flagged in 0020 — the scenario's fixed 6 s cap is too short for however far `isSea` actually is from the
   depot seed along that bearing. Not re-filing as a new finding; flagging again so it's clear this is a
   scenario limitation, not an unverified-but-fine behavior worth chasing with more passes.

## Ideas
- If pinning the backcountry sample point in `g3_day.mjs` (see Finding 2), keep the "find genuinely open ground"
  search logic but fix the search's starting angle/seed so repeat runs land on the identical patch — makes
  future slice-8 before/after local-contrast comparisons exact instead of ±0.2 noisy.
- For Finding 1 (shore-road pack), a cheap test to confirm scope before building: query how many other
  house/shop clusters sit 50–70 m from the depot at similarly low pack, so the fix's radius is sized by data
  rather than guessed from one point.
