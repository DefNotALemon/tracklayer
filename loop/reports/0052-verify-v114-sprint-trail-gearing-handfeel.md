# 0052 — verify v114 Sprint trail gearing by hand (G2)

Focus: builder's latest landing (v114, 10e69bc, "Sprint 580 SX gets trail gearing"), the backlog follow-up
asking whether the Sprint feels twitchy/over-fast on trail/ice under real steering input (g2_sprint.mjs only
rode yaw-pinned), plus the b58 note that every sled hit 121–137 mph on ice from rest in 14 game-s. New
scenario `tools/playtest/scenarios/g2_sprint_feel.mjs`: holds W and taps A then D every ~0.7 game-s (a mild
"correcting the line" input) on a freshly-cut trail and on lake ice, Sprint vs Summit, tracking lateral
drift off the starting line and crashes; separately rides Ranger/Sprint/Summit/Apex from rest on ice for up
to 14 game-s recording top mph. Stills: `~/.hermes/cache/scratch/tlloop/reports/0052.jpg` (2 panels; a stale
`after.jpg`/kit shots from an unrelated earlier run shared the scratch output dir and were excluded).

## Findings

1. **Harness bug: the "trail" steer test never actually rode a packed trail.** `cutTrail()` rides 8 game-s
   then `steerTest()` re-spawns at the start point and expects a groove, but the HUD in the after-shot
   (`01_trail_steer_end.jpg`) reads **"POWDER · Breaking trail"**, not "TRAIL" — the A/D taps pushed the sled
   off its own narrow groove (or the groove was never wide/straight enough) before the surface label ever
   showed packed. Both Sprint and Summit drifted ~40–43 m sideways over 10 game-s under identical input,
   which is consistent with "both sleds are plowing fresh powder off the groove," not a Sprint-specific
   handling issue. **The trail half of this test is invalid as written; don't trust the 40.82 vs 42.61 m
   numbers.** Fix: sample `P.pack` every tick in `steerTest` and abort/flag the run if it drops below ~0.7,
   or widen/straighten the pre-cut pass (ride it twice, same line) before starting the timer.

2. **Ice steering: Sprint wandered 32 m sideways vs Summit's 2.9 m under the same A/D input — real difference,
   worth a closer look, not yet conclusive.** Neither crashed. This is the one result that could reflect the
   v114 perk (`pw × (1 + 0.25 × hardness)`, hardness = 1 on ice) making the Sprint "grippier"/more responsive
   to the same steering input and genuinely easier to steer sideways off a straight line — or it could be an
   artifact of the scenario's fixed yaw-based "side" axis not accounting for a turn-rate difference between
   the two sleds' mass/drag. Severity: medium if real (could read as "twitchy" exactly like the backlog
   worried); needs a cleaner repeat with P.ice logged every tick and a fixed small steering angle (not a key
   tap) before treating it as a bug.

3. **Ice top-speed spread contradicts the b58 note it followed up on, and looks like a harness artifact, not
   new physics.** Ranger 110, Sprint 115, Summit 79, Apex 90 mph — the two LOWER-powered sleds (Ranger,
   Sprint) out-ran the two HIGHER-powered ones (Summit, Apex) on ice, backwards from every stats table in
   LOOP.md. `iceTopSpeed()` breaks early on `CRASH.on || FOOT.on` but doesn't log why a run ended, so Summit
   and Apex likely clipped something on the lake (shoreline rock, another sled's trench) and got cut short
   before reaching their real top speed, while Ranger/Sprint happened to get a clear 14 s run. **Don't treat
   this spread as a finding about sled balance** — it's most likely 4 independent short runs with different
   luck, not a controlled comparison. Fix for next pass: start all four further from shore, log `crash`/`t`
   alongside `topMph` so a truncated run is visible, and widen the lake start radius so a crash mid-run is
   rare.

4. **Visually nothing broken.** Summit's end-of-trail-test frame (61 mph, breaking-trail dust plume, normal
   upright pose, HUD and minimap consistent) and end-of-ice-test frame (129 mph, "Engine's running hot...
   get off the hardpack" toast, minimap dot moving straight) both look like ordinary high-speed riding, no
   clipping, no stuck/crashed pose. (These frames are Summit's — the scenario only screenshots once per pair
   after both sleds ran, so it overwrote Sprint's frame; noted as a scenario gap, not a game bug.)

## Net

Not a clean verification of v114: the trail half of the harness is broken (never actually tests a packed
trail) and the ice top-speed widening produced likely-truncated runs rather than a real comparison. The one
suggestive result — Sprint wandering 11x further than Summit under identical steering input on ice — is
worth a follow-up with the harness fixed (log `P.pack`/`P.ice`/crash reason every tick, screenshot both
sleds, start ice runs further from shore) before the builder treats the Sprint's trail-gearing perk as a
feel problem. Game-code-wise: v114 itself still looks fine from the earlier yaw-pinned numbers (report
context / PROGRESS v114 entry); this pass neither confirms nor refutes a hand-feel issue.

Scenario: `tools/playtest/scenarios/g2_sprint_feel.mjs` (keep; needs the pack/ice logging + per-sled shot
fixes noted above before its numbers can be trusted). Stills:
`~/.hermes/cache/scratch/tlloop/reports/0052.jpg`.
