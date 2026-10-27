# 0089 — Pine snow caps at ride distance / dark night (G3, follow-up to v150) — main @ 036a79b

**Focus**: verify the builder's latest game landing, v150 (`6fa64cb`, "Pine snow caps sag onto the branch tips in
a ragged edge"). That pass's own next-step note: "playtester judges the caps at ride distance/dark night; a
faint edge-on sliver on tier 2 at 7 m may remain." (The pass after it, the harness disk-cleanup commit `036a79b`,
made no game change — nothing to verify there.)

Scenario: `tools/playtest/scenarios/g3_pines.mjs` (reused as-is: close 7 m / mid 14 m / stand 30 m views, Nov
noon + 21:00, densest flat pine stand, weather pinned). Shots: `~/.hermes/cache/scratch/tlloop/b98/after/`,
sheet copied to `~/.hermes/cache/scratch/tlloop/reports/0089.jpg`.

**Numbers**: render at stand30/noon — calls 346, triangles 25,073,174. Matches v150's landed PROGRESS entry
(346 calls, 25.07M tris) exactly — same tree, same code.

## Findings

1. [G3][low] **Snow caps read as a ragged, drooping branch-tip skirt at all three distances**, not a smooth
   cone. Close-up (7 m, `noon_close7.jpg`) clearly shows a zigzag white edge tucking between individual green
   tips, no lampshade look. At 14 m and the 30 m stand view the zigzag is still legible as a textured edge, not
   flattened to a solid triangle. Matches the builder's intent; no action.
2. [G3][low] **No floating snow, gaps, or z-fighting** at any of the 6 views (3 distances × noon/night). Caps sit
   flush on the green cones in both lighting conditions.
3. [G3][low] **No edge-on sliver found on tier 2 at 7 m** — the open concern from v150's landing note. Zoomed
   crop of the middle tier at close range (`noon_close7.jpg`) shows a clean zigzag silhouette with no stray thin
   white shard poking past the cap edge. That follow-up can close.
4. [G3][low] **Night (21:00) reads clean too**: `night_close7/mid14/stand30` show the same zigzag caps lit by
   the low sky glow + headlamp-adjacent ambient, no flat black silhouette swallowing the detail, no shimmer or
   moiré on the snow edges at any of the three distances.
5. [G3][low] **Ride-distance (14 m/30 m) legibility**: at 30 m the whole stand reads as a believable pine forest
   — caps distinguishable tree to tree, no two trees looking identical/stamped (they're turned per-tier by the
   builder's phase offset). No regression from the pre-v150 lampshade look other than the intended texture gain.

## Verified since last time
- v150 (pine snow caps, ragged branch-tip skirt): confirmed clean at ride distance and at night — **closes the
  item's remaining follow-up** (the tier-2 7 m sliver worry and the ride-distance/night judgement both came back
  clean). Render numbers (346 calls / 25.07M tris) reproduce exactly.

## Ideas
- None — this pine item (v148 → v150 across three builder passes) looks done; no new backlog line needed unless
  a future report finds something at a different stand/season.
