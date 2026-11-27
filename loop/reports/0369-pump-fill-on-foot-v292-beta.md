# 0369: 2.2 pump fills the machine after you step out, v292 fix of 0364 #2/#3 (beta, main 01d1cf1)

New `x2_pumpfill_foot_beta.mjs` (ALL OK, page errors none); `x2_truckpump_swap_beta.mjs` rerun, ALL OK. No stills: numbers only.

## What held
- Pickup at Kjøllefjord Drivstoff, step out 0.8 s into the fill (19.3 L): keeps filling on foot to full, one toast "Tank full: 65.0 L ... −$159" (65 x 2.45 = 159.25), litres under the 70 L cap. Cash 500 -> 341, exact.
- No "Pulled off the pump" toast after stepping out (0364 #3 fixed).
- Driving off mid-fill still says "Pulled off the pump: 20.6 L ... −$50".
- 0364 #1 (Q silently blocked at the pump point, yaw 0): Q got out in under 6 game s this time. One run only; the pocket may be gone or flaky, no cause seen.
- Reload mid-fill: seated, fuel sane, no NaN.

## Findings
1. POLISH: the `x2_truckpump_swap_beta` assert "till is the litres that went in" reads 0.00 for 0 L (tank already full by then), so it can't fail. Start it from a lower tank.
2. Not tested: two machines of yours at one pump (sled + truck, nearest swap), pad/touch Q, fuel cabin fill from on foot.

No BLOCKER or BUG.
