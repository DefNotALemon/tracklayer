# 0015 — G1 yards: wall-stall re-check + approach-snow packing — main @ 660a04b
Scenario: tools/playtest/scenarios/g1_yards.mjs (existing, reused, no code change needed)
Shots: 00_depot_yard_day, 01_depot_wide_day, 02_depot_chase_day, 03_home_yard_day, 04_depot_yard_night
Sheet: ~/.hermes/cache/scratch/tlloop/reports/0015.jpg

No new builder landing to verify this pass (HEAD unchanged at 660a04b / v72, matches what 0014 already
verified). Rotated to G1 (last covered 0012, two reports ago vs G2/G3's four since).

## Findings (most important first)
1. [G1][confirmed, still open] The angled wall-stall is unchanged. "shore-rd old aim" (12 m out, yaw −1.2,
   aimed at the house middle rather than square at the door) covers only 8.1 m in the 14 s cap = **0.58 m/s**,
   same as 0012's re-confirm. Every other spot in the same run (depot yard, garage forecourt, the corrected
   shore-road-house approach, Strandbu, Mehamn, even open powder) covers the full 10 m in 3.9–7.3 s =
   1.38–2.55 m/s. `footStep`'s house-wall push (r 1.35 discs) still has no tangential slide component — this
   is the backlog item as filed, not a new bug.
2. [G1][info, numeric] Approach-snow packing before a yard's plowed disc varies by site but doesn't cost much
   walking time at the distances tested. Depot yard, garage forecourt and Mehamn village all read pack 0.85
   at BOTH the 12-m-out start point and the door (their plowed disc already reaches past 12 m). Strandbu home
   starts at pack 0.63 (partial) → 0.85 at the door; the corrected shore-road-house approach starts at pack
   0.31 → 0.85. Despite the softer start snow, both still walked the 10 m in 4.0–4.2 s (2.44–2.52 m/s),
   barely under the fully-plowed spots' 2.54–2.55 m/s — snow depth at these points (0.2–0.31 m) is below
   whatever threshold meaningfully slows the walker. Net: the backlog's "do village yards need to join up"
   question is cosmetic/continuity (patchy packed-snow texture between buildings), not a speed problem, at
   least for Strandbu and the shore-road house; worth narrowing the backlog wording so the builder doesn't
   over-invest in a speed fix that isn't needed.
3. [G3][confirmed again, low] HUD location badge still reads "OPEN BACKCOUNTRY" standing in the depot yard
   (00/01/02, on foot, next to the quay buildings) and at the Strandbu home yard (03) — same bug as 0004 F3 /
   0005 F2, still unfixed, still low priority per backlog.
4. [G3][info] Contact sheet otherwise unremarkable: flat midday overcast light, red-roofed houses read clean
   against snow, night shot (04) at depot yard shows normal exterior lighting, no new visual artifacts in this
   batch of 5 stills.

## Verified since last time
- v72 rank-up nag fix: already verified in 0014, nothing new to check (no landing since).

## Ideas
- Backlog's G1 wall-stall item: still the right next G1 pick for the builder — numbers above are a clean
  repro (0.58 m/s vs 2.4–2.55 m/s baseline, same scenario/row every time).
- Suggest narrowing the "village yards should join up" backlog line: per finding 2, it's a packed-snow
  *texture/continuity* ask, not a walking-speed fix — the numbers don't show a time cost worth chasing.
