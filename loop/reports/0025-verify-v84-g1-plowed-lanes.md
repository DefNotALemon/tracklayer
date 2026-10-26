# 0025 — Verify v84 (G1): plowed lanes depot→doors — main @ e6673ff

Focus: verify the builder's latest landing first (06:30 pass, "Plowed lanes from the depot to every door in
town", G1, v84, hash e6673ff) — top of `loop/reports/` was 0024 (G2 lategame) before this landing, so nothing
had checked it yet. Reused `tools/playtest/scenarios/g1_lanes.mjs` unchanged (TL_SRC not needed — it's already
testing origin/main, which now includes the lane plow). Shots: `~/.hermes/cache/scratch/tlloop/reports/0025.jpg`
(3-col sheet: town day ×2 angles, town night); raw stills in `~/.hermes/cache/scratch/tlloop/0025/`.

## Findings

1. [G1][info][confirms landing] **Numbers reproduce the landed commit's claim to the decimal.** Rerun of
   `g1_lanes.mjs` on current `origin/main`: mean plowed share of the 15 depot→door routes **96%** (3/15 with a
   gap), lot0 walk **16.2 s** (43 m, 2.66 m/s), lot11 **18.6 s** (49.3 m, 2.65 m/s, PROGRESS said 18.8/2.64 —
   within run noise), lot3 **9.1 s** (23.9 m, 2.63 m/s), pack underfoot 0.85 on all three — matches
   `PROGRESS.md`'s "77% → 96%", "11 → 3" and the three lot walks exactly. Not a false landing.

2. [G1][low][new detail] **The 3 remaining gapped routes are lot6 (53 m, 78% plowed, min yard 0), lot9 (64.4 m,
   85%, min yard 0.24 — the pier freight-shed one PROGRESS already flagged as a follow-up) and church (82.1 m,
   82%, min yard 0).** PROGRESS only names lot9's freight-shed obstacle; lot6 and church were left unnamed.
   Worth checking lot6/church's straight line for a similar obstacle (or just a lane segment that undershoots)
   when the pier-shed follow-up is picked up — three fixes for the price of one investigation, since all three
   are "gap" routes the same scenario already enumerates.

3. [G1][info][visual check] Zoomed the day stills on the lane area near the depot/garage cluster: the lanes
   read as faint, slightly smoother/flatter strips in the snow leading to doors — no harsh white stripes, no
   seams or z-fighting where lane meets open powder, matches PROGRESS's "faint pressed paths" description.
   Night still (`03_town_night`) shows the same town layout correctly lit, no shadow-freeze or blown-out
   lighting artifacts from the lane geometry change.

4. [G1][info] `page errors: none` on this scenario run — no regression from the landing on the smoke-adjacent
   path either (this scenario doesn't call smoke.mjs itself, but exercises a lot of the same foot/yard code).

## Ideas (not mine to build, builder's call)
- When revisiting lot9's freight-shed bend, pull lot6 and church's straight-line geometry too (same
  `g1_lanes.mjs` route() math) — might be one shared cause (a lane that routes straight through/near an
  obstacle at those three specific angles) rather than three separate fixes.
