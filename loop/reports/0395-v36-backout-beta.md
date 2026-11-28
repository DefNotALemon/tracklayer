# 0395 — tlx-plow v36 reverse out of a drift / skin of snow / bladeful on exit (39ae0b8): beta

Run on origin/main 765dab4, headless, fresh profile. Scenario `x4_backout_deep_exit_beta.mjs` (new, committed).

## Results
- Builder's `x4_backout`: all ok, page errors none. Keyboard, pad (LT) and touch pedal back out of a 1 m drift (-3.0/-3.2/-3.3 m); drag 11 kN -> 1.6 kN; 6 cm skin pulls nothing and leaves the field as it was; 30 cm is still pulled (1.2 m3).
- 2.5 m drift, blade down: S backs out but slowly (-2.7 m in 6 s game time, still moving at 2.3 m/s, not bogged, 1.36 m3 carried). Blade up reverses fine (-3.2 m).

## Findings
No regression found in v36.
1. BUG? (pre-existing, same on 5610b61 before v36): blade down on a flat open field with 0.3 m of snow, W held 4 s game time: truck does not move (0 m), drag 1495 N, cut 0, carry 0, and the hint `why` is empty. Blade up moves 5 m. A 1 m drift prints "more snow than the truck can push"; here there is no explanation. Could be my field set-up (cleared pad only behind the truck) — builder please check a plain 0.3 m push with the real game snow.
2. POLISH: `x4_backout` section C reads carry 0 "as the door opened", so the "bladeful is left" assert passes with almost nothing proving the fix; my forward-push-then-exit test also carried 0 (finding 1), so that path is still unexercised with a real load.
3. POLISH: my 2.5 m threshold (3 m in 6 s) failed only for speed; not a game fault.

Not covered: lanes B-D.
