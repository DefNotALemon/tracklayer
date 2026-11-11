# 0092 — Swing (getting on/off the sled, v173) beta test (G2) — main @ 3a22e1c
Scenario: tools/playtest/scenarios/b1_swing_break.mjs (new), b1_swing_santa.mjs (new), g2_swing.mjs (rerun)   Shots: none (state asserts only)

Part tested: the v173 swing (`mount()`/`dismount()`/SWG), the newest landed player-facing change.

## Findings (most important first)
1. [G2][POLISH] Santa's sled: in the all-sleds loop (night, `GS.own.sled = id; restat(); park()`, then Q ~0.5 s later) the first Q did not get off; the next Q then toggled the wrong way (foot=false then true). Re-run alone on Santa twice (0.5 s and 4 s after park) both dismounted fine, so it is a race after swapping to Santa, not a hard bug. Likely the sled still has speed above the 2.2 m/s refusal in `dismount()` (the team) or a leftover flag from the previous sled's mount. Only reachable by hot-swapping sleds, so low priority; if seen live, check `P.vx/vz` right after `restat()` for `team` sleds.
2. [G2][POLISH] Q is silently ignored while a swing runs. A 12-press mash ends in a clean state (no NaN, flags cleared, correct figure), but which side you end on depends on timing (first mash ended riding, second on foot). Fine; no queued input.
3. [G2][POLISH, unverified] Touch: `btn("mount")` reads GET ON and `btn("dismount")` reads GET OFF, but my probe of `#tcQ`/`#tcOn` found them `display:none` right after `SET.touch='on'; setTouchUI()` in headless. Could be my setup (they may show only on a state change) rather than a game bug. Needs a real pointerdown test against the visible button (copy from x2_pickup/x2_use).

## Verified (no problems)
- `g2_swing.mjs` rerun: ALL OK, page errors none (pelvis max <2.0 m/s, planted drift <1 cm, seat clearance 15-20 cm, swings 1.4 s, every sled, yard and powder).
- Real-time keyboard Q on/off, from the left and right side, from 3.3 m (it walks in), refused at 6 m out and at 6 m/s.
- Q mash mid-swing, tablet opened mid-dismount, garage flag set mid-mount, W held right after getting off: no NaN in sled/walker/camera, swing flags cleared, sled roll/dip settled (<0.02), exactly one figure visible.
- Night, all 10 sleds off then on: pass for 9, Santa see finding 1.
- Pad: LB dismounts and mounts; prompt reads "LB" and the on-foot hint reads "LB: get on the sled".
- Reload mid-mount and mid-dismount: loads clean, rider seated on the sled, no walker stuck mid-air or NaN (a mid-swing reload puts you back riding at the sled; acceptable).
- Skis-on mount not exercised (the test had no real xc skis: `FOOT.ski` stayed false).

## Ideas
- Add the touch button press and a skis-on mount to a follow-up beta pass.
