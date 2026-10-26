# 0051 — verify v113 snowshoes: slope, night, crash

Focus: builder's latest landing (v113, 3827a0b, "Snowshoes from the recovery kit"). Backlog item asked for the
unchecked parts: snowshoes on a slope, at night, through a crash, and discoverability. New scenario
`tools/playtest/scenarios/g1_snowshoe_followup.mjs` (reuses `g1_slope.mjs`'s hillside finder + `g1_snowshoe.mjs`'s
kit setup). Stills: `b58/0051.jpg` contact sheet in `~/.hermes/cache/scratch/tlloop/reports/0051.jpg` (5 panels).

## Findings

1. **Slope: shoes help by the same ~1.7–1.9x on every direction, no slope-specific regression.** 0.25-grade hillside,
   8 game-s each way (gameClock). No kit: up 1.09, down 1.42, across 1.33 m/s (sink ~0.4–0.5). With kit: up 1.83,
   down 2.68, across 2.28 m/s (sink ~0.17–0.19). Up/across and down/across ratios barely move (0.82→0.80,
   1.07→1.18), so the shoes don't flatten or exaggerate the up/down/across spread — they just scale the whole
   powder pace up, same as flat ground in report 0050's parent (v113 PROGRESS entry). No fix needed.

2. **Night: toast and shoe state fire correctly through a real dismount.** At `GS.hour=1` with `GS.shoeTold` reset,
   a real mount→dismount cycle (not a forced `FOOT.shoe` write — my first attempt at this test was wrong, see
   below) produced the toast text verbatim ("Snowshoes on, out of the recovery kit: you float on fresh powder
   instead of wading...") and `FOOT.shoe === true`. Vision on `03_night_feet.jpg`: walker and sled both lit
   normally under the polar-night sky dome, no flat-blue/NaN camera bug. Fine as shipped.

3. **Crash clears shoes correctly, and they return on the next real dismount.** Triggered `crashEject` at 18 m/s
   while wearing the kit; after `crashGetUp` fired (confirmed via `CRASH.on===false && FOOT.on===true`),
   `FOOT.shoe` read **false** as the code intends (crashGetUp explicitly unsets it, matching the b57 PROGRESS note
   "cleared after a crash"). A second real mount→dismount at the same spot put `FOOT.shoe` back to **true**. No bug.

4. **Harness pitfall worth recording for future passes (not a game bug):** my first draft of this scenario forced
   `FOOT.shoe = ...` directly instead of going through a real `dismount()`/`crashGetUp()` call, which made the
   night toast silently never fire (toast only fires inside `dismount()`) and made the crash check look wrong
   (shoe read `true` right after `crashGetUp` because the earlier forced-true value from the night test was never
   actually touched by a real code path). Re-ran through real Q-off/Q-on key taps and got the correct, consistent
   results above — any future snowshoe test should drive state changes through the real key-bound functions
   (`mount()`/`dismount()`/`crashEject`), not by poking `FOOT.shoe` by hand.

5. **Discoverability (code read, not a new finding):** the garage card for "Shovel, strap & snowshoes" ($120, tier
   0, any sled) already states the benefit plainly in its note: "The snowshoes are yours to keep: Q off into fresh
   powder and you float instead of wading, about a third quicker." Combined with the one-time toast on first wear,
   a new player has two chances to learn about them before ever reading LOOP.md. No action needed.

## Net

v113 snowshoes hold up on slopes, at night, and through a crash exactly as designed — nothing to fix. The G1
snowshoe backlog item's remaining open question (mesh judged from the chase camera at walking pace, b57 stills) is
not retested here; everything else on that item is now closed and can be dropped from the backlog.

Scenario: `tools/playtest/scenarios/g1_snowshoe_followup.mjs`. Stills copied to
`~/.hermes/cache/scratch/tlloop/reports/0051.jpg` (not committed, per rule).
