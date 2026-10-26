# 0020 — G1 quay/corner/shoreline walking — main @ 303b6ee

Focus: verified the builder's latest landing (v78, low-fuel warning spam fix) first, then rotated to G1
per 0019's note (no fresh G1 pass since 0016/0015). Scenario: `tools/playtest/scenarios/g1_town_quay.mjs`
(reused, no code change). Sheet: `~/.hermes/cache/scratch/tlloop/reports/0020.jpg` (4 stills, 2x2).

## Verified since last time
- v78 low-fuel warning spam fix (2900ee2): reran `g2_lowfuel_warn.mjs` independently against current
  main. Frontier/Aurora low-warn toasts at quay **0**, garage **0** (claimed 16→0 / 5→0 and 24→0 / 32→0 —
  reproduces the "0 after" half exactly; the 0 floor can't show the "before" count on a single post-fix
  run, but it matches the claimed outcome). Backcountry **1/1** both sleds (unchanged, as claimed). Left
  the quay still low → exactly **1** warning out there (unchanged, as claimed). `page errors: none`.

## Findings (most important first)

1. [G2/G1][medium][new] The "shore road" sample point used by `g1_town_quay.mjs` (-1250,-420, a bit out
   from the depot seed, labelled "still town") is actually deep unpacked snow: **pack 0.08, depth 0.58 m**,
   walking it at **1.56 m/s** — barely above open-powder pace, not a packed road. If this spot is reachable
   on a normal walk from the quay to nearby buildings, new players get a "packed town" expectation from the
   quay core (pack 0.85) that breaks a few steps later. Suggest: either widen the plowed/packed footprint
   around the depot a bit further out, or confirm this exact point is genuinely off-path (in which case no
   fix needed, just note it so the next pass doesn't re-flag it).

2. [G1][low][info] Quay core (pack 0.85) walked **2.32 m/s** over 20 m from a standing start — about 15%
   under the footStep target formula's steady state (`lerp(0.57,1,0.85)*2.9 ≈ 2.71 m/s`). Likely just the
   start-up accel ramp diluting a 20 m/8.7 s average rather than a real issue; LOOP.md's own 30 m powder
   baseline shows a similar gap between instantaneous and distance-averaged pace. Flagging as info, not a
   bug — worth a longer sample distance next time to separate ramp-up from steady state.

3. [G1][low][info] Walking straight into a small obstacle (r=0.6, a sign/post near the quay) from 6 m out
   stopped **1.08 m** from its center vs the push-out formula's **~0.96 m** — about 12 cm further than
   expected, consistent with v73's wedge→slide redesign (the walker slides along rather than hard-stopping
   exactly at the push-out radius). Not a snag, no jitter, no stall; just a looser stop than the old formula
   predicts. Not actionable on its own.

4. [G1][info][inconclusive] The quay-edge shoreline check didn't reach the shore in the 6 s test window:
   walked 9.25 m while still moving at FOOT.sp 2.70 and `isSea=false` at the end. The nearest-sea search can
   return a point well past 9 m from the depot seed, so this scenario's fixed 6 s cap is too short to judge
   "clean stop at the shoreline, no snag/jitter" — the behavior itself is unverified, not confirmed bad.
   Fix for next pass: extend the walk duration or start closer to the detected shore point.

5. [vision][scenario bug][info] Three of the four stills (`01_corner_setup`, `02_corner_after`,
   `03_quay_edge`) show empty snow/sky with no walker, building corner, or shoreline in frame — the
   `sideCam([ob.x, 1, ob.z])` target coordinate isn't landing the camera on the action (quay_core, shot with
   plain `sideCam()` with no target arg, frames correctly). This is a camera-aim bug in the scenario itself,
   not a game visual issue — can't be used to judge G1/G3 visuals until fixed. Not filing as a backlog item
   since it's test tooling, not the game; next pass touching this scenario should fix the `sideCam` call to
   use default framing or a correct look target.

6. [G3][confirmed, no regression] `00_quay_core.jpg`: lighting, snow, and building textures read normal at
   09:38 game time; the quay toast sequence shows correctly ("Kjøllefjord quay. Warm up and refuel." →
   "Nordkinn Fisk & Friluft: rods, reels, line, augers and bait. Stop and press E." → "Welcome to
   Kjøllefjord. Next ferry sails 21:00."). No regression from the recent G3 sky-sheen/drift-shading
   landings visible here.

## Ideas
- Re-check the depot's packed/plowed footprint radius (finding 1) — low effort, could be a quick G1 win if
  the shore-road point really is meant to read as "town".
- Fix `g1_town_quay.mjs`'s `sideCam` target args (finding 5) before relying on its stills again.
- Next playtester pass: G2 (progression) hasn't had a fresh ladder/earn-rate check since 0014; G3 daylight
  slice 7 (warm sunlit faces) is queued if the builder lands it first.
