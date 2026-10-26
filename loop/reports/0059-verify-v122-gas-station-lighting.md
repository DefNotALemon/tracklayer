# 0059 — Verify v122 gas station forecourts (G3) — main @ 7d2c354
Scenario: tools/playtest/scenarios/g3_stations.mjs   Shots: ~/.hermes/cache/scratch/tlloop/reports/0059.jpg

## Findings (most important first)

1. [G3][info] v122 VERIFIED working as landed. Kjøllefjord station, Nov noon + 21:00, 4 views (ride-in 3/4,
   canopy, pump close, kiosk). renderer.info at the q34 view: 537 draw calls (builder claimed 536), matches.
   imgstats pump-view local contrast 5.15 (builder claimed 5.15 exactly). smoke-equivalent: page errors none,
   scenario exit 0.
2. [G3][med] The forecourt plowing (`addLane`) reads clearly at both times of day: a grey/dirty swept strip
   under the canopy and around the pumps vs white powder beyond its edge, in nov_q34/nov_canopy/night_canopy —
   this part of the landing is solid and visible at normal approach distance.
3. [G3][low] The warm light pool (`stationPool`) is real but very subtle at this moonlit-clear night (no
   aurora, no storm): in night_pump.jpg the ground directly under/around the pump reads as plain cool grey,
   indistinguishable by eye from the plowed strip outside the canopy — no orange cast visible. night_canopy.jpg
   shows a faint lighter patch under the roof but it reads as ambient occlusion/fill more than a warm glow.
   This matches the builder's own note in PROGRESS ("pool is subtle on moonlit nights") — confirmed, not a
   regression, but worth flagging as still-weak rather than closed.
4. [G3][low] Pumps do have some modeled detail (a dark curved nozzle/hose shape at the base, cream display
   panel) — better than "plain box" at close range, but the canopy support posts are still plain smooth grey
   cylinders/boxes with no base plate, conduit or texture, as the backlog already notes.
5. [G3][info] No visual artifacts found: no pink bands, no z-fighting, no glow bleeding onto the pump bodies,
   no hard-edged light pool boundary. Kiosk building (kiosk.jpg) and night signage from v120/v121 still read
   correctly in frame, no regression spotted.
6. [G3][low] Street lamp near the kiosk (night_kiosk.jpg, left edge) is a plain dark post with no light pool
   of its own — backlog already flags "street lamps could get the same pool treatment".

## Verified since last time
- v122 gas station forecourts (plowing + `stationPool` warm decal): WORKS as landed, numbers reproduce exactly
  (draw calls 537, pump local contrast 5.15). Plowing reads clearly; the light-pool half is present but weak
  on a clear moonlit night — not broken, just subtle enough a player may not notice it.

## Ideas
- Backlog's own next items for this station slice (pump/canopy post detail, lamp pools) still stand; this pass
  didn't find anything new to add beyond confirming the pool is genuinely faint, not just "untested at the
  right time" as the builder guessed.
- Worth a storm/aurora-off vs heavy-overcast comparison before strengthening the pool opacity, since clear
  moonlit nights (this scenario's default) are common and the glow should still read then.
