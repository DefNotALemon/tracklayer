# 0029 — Verify v89 (G1): town lanes route round obstacles — main @ 84980a4 (code 84980a4, script v89)

Scenario: `tools/playtest/scenarios/g1_lanesob.mjs` + `g1_lanes.mjs` (both unchanged, existing). Shots:
`~/.hermes/cache/scratch/tlloop/reports/0029_town.jpg` (day/day-west/night sheet), `0029_lot9.jpg` (lot9 lane
overhead). Raw stills: `~/.hermes/cache/scratch/tlloop/0029/`, `0029b/`.

Focus: verify the builder's latest landing (07:35 pass, "Town lanes go round obstacles", G1, hash 84980a4,
v89) — the only landing since report 0028, and G1 had the fewest of the last 3 reports (0026 G2, 0027 G2,
0028 G3), so both rules point here.

## Findings

1. [G1][info][confirms landing] **`g1_lanesob.mjs` reproduces v89's numbers exactly.** 1 of 15 lanes still
   touches an obstacle, and only 1 of 83 samples on that one lane (a grid-corner graze at depot+(17, 2.3),
   obstacle radius 1.5) — matches PROGRESS's claimed "1/15 lanes, 1 sample" exactly. Before v89 it was 8/14
   lanes, 73 blocked samples; that regression stays fixed.

2. [G1][info][confirms landing] **lot9 walk (depot yard edge → the yellow house west of the depot, past the
   pier freight shed) reached cleanly**: 71.8 m in 27.0 s, avg **2.66 m/s** — matches the claimed "72 m in
   27.1 s at 2.66 m/s" within run-to-run noise. Before v89 this route was STUCK at 32 m against the shed.

3. [G1][info][confirms landing] **`g1_lanes.mjs` straight-line walks also reproduce**: lot0 2.66, lot11
   2.65, lot3 2.64, lot9 2.66 m/s (claimed 2.65/2.65/2.64/2.65 — all within noise). Mean plowed share of the
   15 depot→door routes is **91%**, matching PROGRESS exactly (expected drop from 96% pre-v89, since lanes
   now bend around obstacles instead of running straight).

4. [G1][info][visual check, looks correct] **Judged the lot9 overhead still with vision**: a faint light
   plowed path winds between the depot-side buildings and visibly curves away from the large shed on the
   right rather than crossing it — consistent with the numbers. As PROGRESS already notes, the lane itself
   is too faint to read at a normal glance; this isn't a new issue, just confirms the "numbers carry it"
   call was the right one for this pass (no stronger lane visual texture needed yet).

5. [G1][low][unchanged, as expected] **6 of 15 depot→door routes still show a straight-line gap (min yard
   < 0.5)**: lot0 (0), lot6 (0.44), lot8 (0), lot9 (0), lot10 (0.22), church (0). This is the `g1_lanes.mjs`
   straight-line metric, separate from the lane-routing fix — those doors were never meant to have a
   straight plowed line to them (the player follows the lane's own bent path, which v89 fixed). Not a
   regression, just noting it reads oddly in isolation; the scenario's own comment already explains why.

## Suggested next step
v89 is solid, no regressions found. Backlog's top item (G3 daylight slice 8 oval hollows, macro camera
check) and the G2 long-haul warmth item (report 0027 F3) are next up for the builder; nothing new to add
from this pass.
