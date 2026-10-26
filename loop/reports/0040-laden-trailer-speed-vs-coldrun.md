# 0040 — Laden trailer/flatbed speed vs coldRun's formula (G2) — main @ 0816c3e (script v101)

Focus: the two follow-ups PROGRESS flagged after v101 (0039's Ideas) — this one picks the G2 item: `coldRun`'s
`rideS` estimate (`min(12 + 6×power, 10.5×power/drag)`) was fitted on EMPTY sleds (report 0034/`g2_cruise.mjs`,
noted "laden trailers unmeasured, so top sleds keep the old, slower assumption" since v97). The COLD RUN chip
warns players before exactly the long, high-value runs that use a flatbed/trailer (fell, tonne, clean-air),
so an empty-sled formula on a laden leg is the case that matters most. New `tools/playtest/scenarios/g2_ladentow.mjs`
(reuses the `g2_cruise.mjs` yaw-to-target harness on the same Skjånes→Ifjord line, weather pinned calm, noon,
25 game-s per leg): rides Apex/Matriarch/Aurora empty, then towing a realistic cargo kg for the job tier each
one actually hauls (fell 320 kg flatbed, tonne 1000 kg flatbed, clean-air 190 kg trailer), two full passes for
reproducibility. Stills `~/.hermes/cache/scratch/tlloop/0040b/`; contact sheet (Matriarch empty vs tonne-laden)
`~/.hermes/cache/scratch/tlloop/reports/0040.jpg` (not retained in the repo).

## Findings

1. [G2][severity high] **Matriarch towing its own tonne-tier cargo (1000 kg, matches the 920–1050 kg jobs at
   lines ~4906–4909) manages only ~7.0–7.2 m/s, a quarter of what `coldRun` assumes.** Two passes: 7.0 m/s
   (181 m / 25.2 s) and 7.2 m/s (181 m / 25.2 s) vs the formula's 27.0 m/s — `estRatio` **0.26–0.28** both
   times (empty-sled baseline on the same line reproduces the formula fine: 26.1–25.9 m/s, ratio 0.96–0.97).
   Since `coldRun`'s warmth-loss estimate is `rideS_time × cold_rate` and `rideS_time = km/estimate_speed`, a
   4× slower real speed means the actual leg takes ~4× longer than the card assumes and costs roughly 4× the
   warmth the COLD RUN chip's percentage implies. This is exactly the failure mode report 0027 found by hand
   (a clean-air run blacked out at −$2,155 despite a card that looked survivable) — tonne runs are worse than
   clean-air and still use the unladen formula.
2. [G2][severity med] **Apex towing a fell-tier load (320 kg, matches the 260–360 kg jobs at lines ~4888–4890)
   runs at ~12.3–12.4 m/s vs the formula's 24.1 m/s — `estRatio` 0.51, consistent both passes** (empty-sled
   baseline on this sled was noisier run to run, 15.7–19.8 m/s / ratio 0.65–0.82, but still well above the
   laden number either way — the load, not run variance, is the driver).
3. [G2][severity med] **Aurora towing a clean-air load (190 kg, matches the 110–220 kg jobs at lines ~4931–4934)
   runs at 18.6–21.3 m/s vs the formula's 25.4 — `estRatio` 0.73–0.85**, the smallest gap of the three (lighter
   cargo relative to the sled, and Aurora's drag 0.72 is already favourable) but still a consistent 15–27%
   overestimate, matching 0027's finding that a clean-air run under-warned.
4. [G2][info] No crashes or trailer tips in any of the 12 legs (`tipped: false` throughout); the flatbed/trailer
   stayed visually attached with no floating or clipping in the stills (Matriarch empty vs tonne-laden,
   `0040.jpg`) — the laden-slowdown is purely the mass/drag physics (`MASS + TOW.mass` in the thrust balance,
   tracklayer.js ~2982/3010/3022), not a crash or stuck state, so it reads to the player as "sluggish," not
   broken.
5. [info] Scenario-only artifact, not a game bug: the synthetic test cargo objects this scenario pushes into
   `GS.load` omit the `cond`/`hits` fields real contract objects always carry, so the cargo tooltip shows
   "NaN% condition" in the stills — cosmetic, only visible because this is a fake test load; future scenarios
   faking `GS.load` should include `cond: 100, hits: 0` to avoid it. Core speed/ratio numbers are unaffected.
6. [info] Page errors: none, exit 0 both runs (powder/trench baseline unaffected — this scenario doesn't touch
   on-foot code).

## Verified since last time
- No new builder landing since 0039 (v101 is still the latest on main) — this pass took the open measurement
  gap instead of a verification.

## Ideas
- `coldRun` (tracklayer.js ~7307) should fold `bigLoads()` cargo kg into `rideS`, not just use `ST.power/ST.drag`:
  these numbers suggest a load factor roughly `1 / (1 + kg / (sled mass ~550–950))`-ish would get tonne (0.27),
  fell (0.51) and clean-air (0.80) into the right range without a full physics sim on the card — fit it against
  this scenario's numbers before landing. This is the single highest-value G2 fix open right now: it's the
  exact gap that caused 0027's blackout and this pass shows it's worse on tonne than clean-air.
- The other 0039 follow-up (FPS/GPU check of the v100/v101 drift-shadow taps on GFX low vs high) is still open
  for a future pass.
