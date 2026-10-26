
# 0050 — Verify v112 shoulder slide: walking away from a door + turning on the spot (G3/G1) — main @ 0d66edf
Scenario: tools/playtest/scenarios/g3_camshoulder_dynamic.mjs (new)   Shots: ~/.hermes/cache/scratch/tlloop/reports/0050.jpg

## Verified since last time
- v112 (0d66edf, over-the-shoulder camera when `camState.wallK < 0.6`, offset eased via `camState.shK` at
  6/s) handles both dynamics the backlog item flagged as unchecked, cleanly.
- **Walking away from a door**: placed on foot 1.5 m out from a town door facing away (wallK settles ~0.31–0.36,
  shK ~0.49–0.81), then held W for 6 game-s walking straight out. `shK`/`wallK` sampled every ~0.3 game-s show a
  smooth monotonic decay with no reversal or overshoot: `0.277 → 0.082 → 0.012 → 0.002 → 0 → 0` as `wallK` climbed
  `0.60 → 0.68 → 0.78 → 0.92 → 1.0`. Max step-to-step change 0.195 (over ~0.3 game-s, i.e. a smooth ease, not a
  pop) across two runs. Stills 00 (settled, shoulder-slid) → 01 (6 game-s out, fully centred) show the transition
  visually: wall/house behind at 00, open yard and a distant rider silhouette at 01, no jump cut.
- **Turning on the spot at a door with the slide on**: same door-adjacent spot, held D for a 180°+ turn
  (yaw −0.15 → −5.42 rad across samples, i.e. just over a full extra half-turn in this run). `shK` eased down in
  lock-step with `wallK` rising as the rider swung away from facing the wall: `0.813 → 0.750 → 0.648 → 0.261 →
  0.117 → 0.035 → 0.004`, `wallK` `0.32 → 0.36 → 0.44 → 0.75 → 0.91 → 0.98 → 1.0`. No jump/overshoot — the offset
  just rides the same wallK-driven ease the static case uses, confirming it isn't special-cased per-input. Stills
  02 (pre-turn, slid) → 03 (post-turn, centred, now facing the house close up) show a clean, readable frame
  throughout.
- Checked actual on-screen framing (not just the `wk`/head-NDC numbers from the static scenario): at high shK the
  head sits visibly left-of-centre (~33–37% from the left edge, vs 50% centred) with terrain/buildings readable
  on the right — same direction and same ballpark as v112's own report (NDC −0.47 ≈ 26.5% from left), the gap
  explained by this scenario's wider 1.5 m standoff vs v112's 1.0 m (farther from the wall → `wallK` less extreme
  → `shK` doesn't reach its own max in these samples).

## Findings
(none — both backlog-flagged dynamics behave as intended, no new bug)

## Ideas
- Recommend closing the "walking away from a door (smooth ease-out?) / turning on the spot with the slide on"
  half of the G3/G1 follow-up item on the backlog — both verified clean with numbers. The remaining unchecked
  piece from that same item is narrow gaps between two houses (second `camWallClip` interaction at an
  already-slid spot); worth a dedicated scenario if the builder wants the item fully closed, but low priority
  since the mechanism (wallK-driven ease, not input-specific) now looks robust to two different player actions.
- `g3_camshoulder_dynamic.mjs` reuses the static scenario's placement code; a natural follow-up is sampling
  `hx` (head NDC x) alongside `shK`/`wallK` in future runs instead of inferring screen position from vision, to
  get an exact number instead of an eyeballed percent.
