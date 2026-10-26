
# 0049 — Verify v111 turn ramp at a door with the real chase camera + stick-steer twitch check (G1) — main @ 60bac72
Scenario: tools/playtest/scenarios/g1_turn_door.mjs (new)   Shots: ~/.hermes/cache/scratch/tlloop/reports/0049.jpg

## Verified since last time
- v111 (60bac72, held-turn ramp 2.2 → 3.6 rad/s over 0.12–0.45 s) at a town door with the REAL chase camera
  (camMode 0, not the sideCam override): standing 1.5 m out from a house door (depth 7 m, so standoff `D.d/2+1.5`),
  holding D for a 90° turn takes **0.58 game-s** (matches g1_turn.mjs's "facing a door 90° off" number of
  ~0.54 s). Stills 00/01/02 (before / mid-turn / after) show the rider readable and centred through the whole
  turn, terrain and the neighbouring red house visible, camera never fills with a flat wall — v110's
  `camWallClip` holds at this (third, previously-unsampled) door too, not just the two from report 0048.
- Open backlog worry ("is gamepad/touch stick steering, same ramp, twitchy for a small deflection?"): `TC.steer`
  feeds `FOOT.turn` the same way a gamepad axis does (readInput, `analog` var), so it's testable without a real
  pad by forcing `TC.on = TC.active = true; TC.steer = <v>`. Held 0.5 s (past the 0.45 s ramp window) at
  **steer 0.15** (barely over the 0.12 deadzone) the rider turns at **~0.35 rad/s**; at **steer 0.95** (full push)
  **~2.28–2.41 rad/s**. Ratio big/small **6.47–6.56**, matching the deflection ratio itself (0.95/0.15 = 6.33)
  within run-to-run noise. **Not twitchy**: the ramp multiplies the turn rate by the same factor regardless of
  stick magnitude, so a tiny nudge still turns slowly (it just ramps a little faster than before, same as a tiny
  keyboard tap did pre-v111) — it doesn't snap a small nudge up toward full-speed spin. No fix needed here.

## Findings
(none — this pass is a clean verification + a data-backed close on the open worry, not a new bug)

## Ideas
- Harness pitfall for future door scenarios: a fixed standoff distance (e.g. 2 m) from a door's centre clips the
  camera into the wall on any building deeper than ~3 m (first attempt this pass stood 2 m from a 7 m-deep
  house and got a flat tan wall-fill on every still). Always scale standoff off `D.d/2` like `g3_camwall.mjs`
  does (`D.d/2 + 1.0` foot / `+2.2` sled); used `+1.5` here for the foot case and it was clean. Worth noting in
  the `tracklayer` skill's testing pitfalls so the next door-based scenario doesn't rediscover it.
- Recommend closing both open low-priority G1 items this report touches: "turning on the spot at a door with
  camera following" (0048's item carried this forward; now verified clean) and the stick-twitchiness half of
  "pivot same in powder/hard pack... gamepad/touch stick steering feels twitchy" (data above closes the stick
  half; the powder-vs-hard-pack half is still untested and could be a smaller follow-up item).
