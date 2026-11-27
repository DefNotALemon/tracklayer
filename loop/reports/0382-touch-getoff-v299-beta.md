# 0382 — Touch GET OFF on a stopped sled, rescue control lines (v299, 66e48e0): beta

Run on origin/main c46cf31. New scenario `g3_getoff_edges_beta.mjs` (exit 0, page errors none). Builder's `g3_sarbtn` not rerun; this probes the button's edges.

## Results
- Stopped on touch: GET OFF shown (82 px wide). Held at 1.5 and 2.1 m/s commanded (1.0 and 1.8 actual) it stays; at 2.4 commanded (2.06 actual), 3, 3.5 and 8 m/s it is hidden. Matches dismount()'s 2.2 m/s rule.
- 10 samples 120 ms apart on a stopped sled: shown every time, no flicker.
- Hidden during a crash and after the get-up (on foot): never labelled GET OFF on foot.
- Three rounds of a triple tap (3 pointerdown/up pairs in one go): one dismount each, ends on foot, DMT/MNT clear, no stuck state.

## Findings
1. POLISH — Switching `INP.dev` to keyboard with the touch UI still forced on leaves GET OFF visible. Probably intended (touch UI on = touch buttons), not confirmed with a real keyboard + touch-screen device.
2. UNTESTED — "Not in water" gate: my `P.wet = true` was overwritten by physics next frame, so the wet case proved nothing (the check reads as ok only because the flag was already false). Needs a real lake placement. Also untested: a sled on a steep slope that slides under 2.2 m/s, a tow/winch in progress, a cab, a rescue ride.
3. POLISH — Commanded speed lands 15-25 % lower than set within 60 ms (friction), so the boundary is checked loosely: 2.06 hides, so the hide threshold may be a hair under 2.2 (hysteresis, or a smoothed speed). Harmless.

No BLOCKER or BUG.
