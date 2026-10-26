# 0038 — Verify v99: walking square into a wall stops the stride (G1) — main @ 5daea16 (script v99)

Focus: verify the builder's latest landing (ce212f9, v99) fixing 0036 F1 (jogging dead-square into a
building left the walker marching on the spot, legs animating, for 41%+ of a 90 s run). Reused
`tools/playtest/scenarios/g1_snag0036.mjs` unchanged (committed with 0036) for the dead-square repro, and
`g1_wallslide2.mjs` to confirm the off-square slide behaviour the fix explicitly says is unchanged. Woodsman,
fresh save, noon, weather pinned calm. Stills `~/.hermes/cache/scratch/tlloop/0038/`; contact sheet
`~/.hermes/cache/scratch/tlloop/reports/0038.jpg` (not retained in the repo).

## Findings

1. [G1][verify][pass] **Dead-square (0° heading vs wall face) jog into a Strandbu wall now stops the
   stride clock.** Same scenario, same spot-finder as 0036: jogged yaw 0 into a building 39.3 m / 40.1 s,
   stalled from t=22.7 s (building reached early this run — spot search returned a closer house than
   0036's 63.3 m case, consistent run-to-run variance in the spot search, not a regression). At the stall:
   **0.0 stride cycles** over the final 17.3 s, `FOOT.sp` still reporting 3.95 (unchanged, as before) but
   **`FOOT.go` 0.00** (the new real-ground-speed signal) and **`FOOT.wind` 0.00** — matches PROGRESS's
   claimed before→after exactly (was 25.2 cycles / wind 0.84 in 0036; now 0.0 / 0.00). Still `01_stall.jpg`:
   walker stands upright, arms at sides, weight square — not a frozen mid-stride pose. The commit's second
   claim ("a jog into a wall no longer burns breath") also checks out: wind sits at 0.00 rather than
   climbing while shoved against the wall.

2. [G1][verify][pass] **Off-square wallslide (the thing v99 explicitly says it didn't touch) is still
   intact.** Ran `g1_wallslide2.mjs` (hospital/freight/buyer, 0/10/20/35/50° off square, 6 game-s each):
   10° along-face distances this pass — hospital 1.61 m, freight 1.70 m, buyer 1.76 m — against PROGRESS's
   quoted "was 1.60/1.71/1.75" baseline and its "unchanged" claim; all three within normal headless-run
   noise (≤0.06 m). 0° cases show ~0 m along-face in all three (the walker doesn't slide when square-on,
   consistent with finding 1), 20–50° cases scale up smoothly as before. No regression from the wall-stand
   change into the slide path.

3. [G1][info] The spot-finder in `g1_snag0036.mjs` is sensitive to which direction around the depot it
   searches first and returns a different building/distance each run (63.3 m in 0036, 39.3 m here) — not a
   bug, just means stall-distance isn't directly comparable run to run; the stride-cycle/go/wind numbers at
   the stall are the stable thing to compare.

4. [info] Both scenario runs: page errors: none, exit 0.

## Ideas
- No new backlog items — this was a straight verification and both checks passed. G1's open items (toast
  hook in `g1_jog_player.mjs`, F3 cooldown-vs-cycle) and the G2/G3 rotation items in LOOP.md stand as the
  next picks.
