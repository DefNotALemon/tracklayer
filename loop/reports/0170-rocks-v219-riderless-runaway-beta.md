# 0170 — rocks (v219) beta: riderless sled runs away backwards after a rock ejection (G1/base game) — main @ 2584fbe
Scenario: tools/playtest/scenarios/g2_rocks_riderless.mjs (new; asserts + prints). Builder's g2_rocks.mjs rerun: ALL PASS. No stills (numbers only).

## Findings (most important first)
1. [BUG] After a rock throws the rider (>14 m/s into the stone) the empty sled stops dead (0.4 m/s at the stone) and then **accelerates by itself backwards**, ~1.5 m/s per second with no input: 18 m/s strike -> 1.4 m/s at +0.8 s, 8.7 at +3.3 s, 13.8 at +5.5 s, 15.6 m/s at +8 s, ending 57 m behind the stone. 22 m/s strike: 0.4 -> 19.7 m/s over ~7 s, 66 m away. On flat ground (slopeAt < 0.03), heading unchanged (yaw 0), throttle/brake untouched. This is the same symptom as Owner note c59833f (sign-aware riderless brake, reverse-speed report): `rockStrike` leaves the sled in the crash state where `physStep` forces brake/zero input, and the reverse-shift logic (`rev = input.brk>0 && !thr && vf<GB_STILL`) takes over. The builder's test only samples +1 s, so it misses it; the first strike in a fresh session (14.8 m/s) did stay at 0, later ones (18, 22) all ran away. Suggested fix: the guard from the skill ("exclude `CRASH.on` from `rev`") + make the riderless brake sign-aware; add a +8 s speed assert to g2_rocks.
2. [POLISH] g2_rocks's "crawl" case: a 3 m/s sled launched 14 m from a stone never reaches it (drag stops it), so low-speed contact is untested by both scenarios. Not a game bug.

## Verified since last time (v219 rocks)
- Field: 30 501 rocks, 0 NaN, 0 floating (max gap of base above snow 1.82 m, from 1/3 sample), 0 within 20 m of a site, 0 inside TOWN_R, none on road bed; 1056 sampled stand on slopes > 0.7 (fine, they're on the fell).
- Reverse into a stone (10 m/s): one hit counted, sled ends 6.2 m from stone, no NaN. Glancing hit (1.6 m off centre, 10 m/s): 1 hit, ends 7.4 m away. 13.5 m/s bucks with no eject; 14.8 m/s ejects. No grind/sticking inside stones in any case.
- Frame time in a rock cell, headless: 43-49 ms avg (no obvious regression).
- Not tested: on-foot walking into a rock (walker collision), pad/touch (no input-dependent change in this slice), old save (field is rebuilt each boot).
