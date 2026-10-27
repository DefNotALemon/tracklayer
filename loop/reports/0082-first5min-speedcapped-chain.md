# 0082 — First 5 minutes to the Woodsman, speed-capped at ~40 mph (G2) — main @ 64268e9
Scenario: tools/playtest/scenarios/g2_first5min_chain_capped.mjs (new, committed with this report)
Shots: ~/.hermes/cache/scratch/tlloop/reports/0082.jpg

## Findings (most important first)

1. **[G2][med] Even hand-paced (~40 mph cap, not the 45–96 mph straight-line sprint of report 0046),
   a new save reaches the Woodsman's $600 price in gameClock ~185 s (t 2.62 → 187.5) over 4 deliveries —
   still only ~3 game-minutes, 3–5× faster than the loop's 10–15 min first-upgrade target.** Legs: Solbakken
   37.6 game-s/$180, Kjøllefjord quay 28.1 game-s/$124, Utsikten 55.9 game-s/$225 (longest leg, 740 m),
   pickup+Naustbakken 18.4+39.6 game-s/$112. Every delivery toast fired correctly (leg0-3_delivered.jpg),
   no crash, no stuck leg — the auto-nav drove all 4 legs clean at the cap. This confirms the backlog's open
   question from 0046: the earlier "3–4× too fast" read wasn't an artifact of unrealistic 90+ mph sprinting;
   even a realistic cruising speed gets there almost as fast because the per-delivery payouts ($112–225) are
   large relative to distance and the map's named-destination distances (330–740 m) are short. If first-cash-
   upgrade pacing is meant to feel like 10–15 min, the lever is payout-per-job or distance, not player speed.
2. **[G2][low, methodology] The scenario's velocity clamp (reapplied every ~400 ms tick) didn't hold the
   HUD speed at a flat 40 mph — it read 41–47 mph across the open-backcountry/high-country ticks
   (leg3_pick_t16..t96 stills) even though `maxSp` logged exactly 17.88 m/s (40.0 mph) every leg. The
   physics integrates faster than the 400 ms clamp interval, so thrust/terrain can push speed a few mph
   over the cap between checks, especially on the "HIGH COUNTRY" uphill stretch (fastest readings, 44–47
   mph) where the throttle is working hardest. Not a game bug — a harness gap. A future speed-capped
   scenario should clamp inside a faster poll (every `ev` tick ties to wall-time sleep(400); a rAF-level
   hook would hold it tighter) if a stricter number is needed; the current ±7 mph drift doesn't change
   finding 1's conclusion (still far under the straight-line sprint speeds from 0046).
3. **[G2][low] Stills through the capped drive look normal: steady forward lean, trench/powder spray
   consistent with ~40 mph, GPS line on the tablet reads correctly on both pickups (leg0/leg2 tablet
   stills), and the Kjøllefjord quay arrival (leg3_pick_t88/t96) shows the rider walking to the shed door
   cleanly with no clipping.** No visual regressions spotted in 21 stills across day (09:39–13:21 in-game).

## Verified since last time
- v146 tree wells and the chase-camera canopy clip (0081): not re-tested this pass (0081 already covered G1/G3
  for this landing with no further builder change since).

## Ideas
- If the builder wants to retune first-upgrade pacing, the WOODSMAN_PRICE/payout math is cheap to test:
  this scenario's TOTAL_CAP_S=340 budget had headroom (ran 243 s wall / 185 game-s) to try a second save
  with artificially reduced per-job pay and see what payout level lands the chain in the 10–15 min window
  without touching sled speed.
